#!/usr/bin/env node
/**
 * extract.mjs — Trasforma i doc-definition pdfMake di `concorsi/materie-json/`
 * in JSON leggeri di quiz, pronti per l'app ConcorsoFacile.
 *
 * Uso:
 *   node scripts/extract.mjs                 # tutte le materie "pilota" (PILOT)
 *   node scripts/extract.mjs --all           # tutte le 339 materie
 *   node scripts/extract.mjs --materia 266   # una sola materia per indice
 *   node scripts/extract.mjs --list          # elenca le materie disponibili
 *
 * Output:
 *   data/materie/<id>_<slug>.json   { id, indice, nome, quizCount, quiz: [...] }
 *   data/materie.json               indice leggero di tutte le materie estratte
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.resolve(ROOT, "..", "materie-json");
// I dati finiscono in `public/` perché è l'unica cartella che Next copia
// nell'export statico e che un browser può scaricare via HTTP.
const OUT_DIR = path.resolve(ROOT, "public", "data", "materie");
const OUT_INDEX = path.resolve(ROOT, "public", "data", "materie.json");

/** Materie pilota: poche, rappresentative, leggere. */
const PILOT = [
  "137", // Empatia e intelligenza emotiva
  "049", // Creatività e pensiero divergente
  "168", // Immunologia
  "316", // Tecnica Professionale
  "266", // Primo soccorso
  "036", // Competenze didattiche
  "040", // Comprensione del testo
  "032", // Cittadinanza e Costituzione
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const value = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

// ---------------------------------------------------------------- helpers

const norm = (s) =>
  String(s ?? "")
    .replace(/\u200b/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Estrae il testo "vero" da un nodo qualsiasi del doc-definition. */
function textOf(node) {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return norm(node);
  if (Array.isArray(node)) return norm(node.map(textOf).join(" "));
  if (typeof node === "object") {
    if (typeof node.text === "string") return norm(node.text);
    if (Array.isArray(node.stack)) return norm(node.stack.map(textOf).join(" "));
  }
  return "";
}

function hasImage(node) {
  if (!node || typeof node !== "object") return false;
  if (Array.isArray(node)) return node.some(hasImage);
  if (typeof node.image === "string") return true;
  return Object.values(node).some(hasImage);
}

/**
 * Cerca ricorsivamente la tabella dei quiz: un oggetto con
 * `table.headerRows === 2` e una `body` con almeno 3 righe.
 * Le tabelle possono essere annidate in stack/columns/content.
 */
function findQuizTables(root) {
  const found = [];
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    const t = node.table;
    if (t && Array.isArray(t.body) && t.body.length > 2) {
      found.push(t);
    }
    for (const key of ["stack", "columns", "content", "table", "body"]) {
      if (node[key]) visit(node[key]);
    }
  };
  visit(root);
  return found;
}

/**
 * Da una riga `body` estrae { id, domanda, risposta }.
 * Schema osservato: [id, {text:domanda, colSpan:2}, "", {text:risposta, colSpan:2}, ""]
 * La colonna "ID Ufficiale" riparte da 1 in ogni argomento: NON è univoca nel file.
 */
function parseRow(row) {
  if (!Array.isArray(row) || row.length < 2) return null;

  // Colonna ID: può essere "7", "IA00005", "IB00186"... oppure vuota.
  // Il vero identificatore resta posizionale; l'id è solo un'etichetta.
  const idRaw = row[0];
  const idText = norm(typeof idRaw === "string" ? idRaw : textOf(idRaw));

  // Colonna domanda: primo oggetto con colSpan dopo l'id. Se manca, la riga è
  // un'intestazione di sezione / riga spaziatrice.
  const domandaIdx = row.findIndex(
    (c, i) => i > 0 && c && typeof c === "object" && !Array.isArray(c) && "colSpan" in c && "text" in c
  );
  if (domandaIdx < 0) return null;

  // Colonna risposta: il successivo oggetto con colSpan (dopo domandaIdx).
  let rispostaIdx = -1;
  for (let i = domandaIdx + 1; i < row.length; i++) {
    const c = row[i];
    if (c && typeof c === "object" && !Array.isArray(c) && "colSpan" in c && "text" in c) {
      rispostaIdx = i;
      break;
    }
  }
  if (rispostaIdx < 0) return null;

  const domandaCell = row[domandaIdx];
  const rispostaCell = row[rispostaIdx];

  const domanda = norm(textOf(domandaCell));
  const risposta = norm(textOf(rispostaCell));

  // Righe senza testo utile (spaziatori, immagini pure) vengono scartate.
  if (!domanda || !risposta || risposta.length < 1) return null;

  return {
    // L'id ufficiale resta stringa quando non è numerico (es. "IA00005").
    id: /^\d+$/.test(idText) ? Number(idText) : idText || null,
    domanda,
    risposta,
    ...(hasImage(domandaCell) || hasImage(rispostaCell) ? { immagine: true } : {}),
  };
}

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function titleFromFilename(file) {
  // "266_Primo_soccorso.json" -> { indice: "266", nome: "Primo soccorso" }
  const base = file.replace(/\.json$/, "");
  const m = base.match(/^(\d+)_(.*)$/);
  const indice = m ? m[1] : "000";
  const nome = (m ? m[2] : base).replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return { indice, nome };
}

function listMaterie() {
  return fs
    .readdirSync(SRC)
    .filter((f) => f.endsWith(".json") && !f.includes(".chunks."))
    .map((f) => {
      const { indice, nome } = titleFromFilename(f);
      return { file: f, indice, nome };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "it"));
}

function extractOne(entry) {
  const full = path.join(SRC, entry.file);
  const raw = fs.readFileSync(full, "utf8");
  let doc;
  try {
    doc = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `JSON non valido: ${err.message}` };
  }

  const tables = findQuizTables(doc.content ?? doc);
  if (tables.length === 0) return { ok: false, error: "nessuna tabella quiz trovata" };

  // Una materia è spezzata in PIÙ tabelle (una per argomento/gruppo di pagine),
  // tutte con lo stesso schema: vanno unite, non va scelta solo la più grande.
  // La colonna "ID Ufficiale" riparte da 1 in ogni tabella, quindi il dedup va
  // fatto sul contenuto (domanda + risposta), non sull'id.
  const quiz = [];
  const seen = new Set();
  tables.forEach((table, gruppo) => {
    for (const row of table.body) {
      const parsed = parseRow(row);
      if (!parsed) continue;
      // Scarta intestazioni di sezione ed eventuali righe vuote.
      if (parsed.domanda.length < 8) continue;
      const fingerprint = `${parsed.domanda}\u0000${parsed.risposta}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      quiz.push({ ...parsed, gruppo });
    }
  });

  if (quiz.length === 0) return { ok: false, error: "tabelle trovate ma nessun quiz parsabile" };

  // Numerazione stabile all'interno della materia (gli id ufficiali si ripetono).
  quiz.forEach((q, i) => {
    q.numero = i + 1;
  });

  const gruppi = [...new Set(quiz.map((q) => q.gruppo))].length;
  const id = `${entry.indice}_${slugify(entry.nome)}`;
  const payload = {
    id,
    indice: Number(entry.indice),
    nome: entry.nome,
    quizCount: quiz.length,
    gruppi,
    fonte: entry.file,
    estratto: new Date().toISOString().slice(0, 10),
    quiz,
  };

  const outFile = path.join(OUT_DIR, `${id}.json`);
  fs.writeFileSync(outFile, JSON.stringify(payload));
  return { ok: true, payload, outFile };
}

// ------------------------------------------------------------------- main

function main() {
  if (!fs.existsSync(SRC)) {
    console.error(`✗ Cartella sorgente non trovata: ${SRC}`);
    process.exit(1);
  }

  const all = listMaterie();

  if (flag("--list")) {
    console.log(`${all.length} materie disponibili:\n`);
    for (const m of all) console.log(`  ${m.indice}  ${m.nome}`);
    return;
  }

  const single = value("--materia");
  let targets;
  if (single) {
    targets = all.filter((m) => m.indice === single.padStart(3, "0") || m.indice === single);
  } else if (flag("--all")) {
    targets = all;
  } else {
    targets = all.filter((m) => PILOT.includes(m.indice));
  }

  if (targets.length === 0) {
    console.error("✗ Nessuna materia selezionata. Usa --list per vedere gli indici.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`ConcorsoFacile · estrazione quiz — ${targets.length} materie\n`);

  const index = [];
  let okCount = 0;
  let quizTotal = 0;

  for (const entry of targets) {
    const t0 = Date.now();
    // Salta le materie già estratte (usa --force per rigenerarle).
    const id = `${entry.indice}_${slugify(entry.nome)}`;
    const outFile = path.join(OUT_DIR, `${id}.json`);
    if (!flag("--force") && fs.existsSync(outFile)) {
      try {
        const cached = JSON.parse(fs.readFileSync(outFile, "utf8"));
        index.push({
          id: cached.id,
          indice: cached.indice,
          nome: cached.nome,
          quizCount: cached.quizCount,
        });
        okCount++;
        quizTotal += cached.quizCount;
        console.log(`  ⏭  ${entry.indice} ${entry.nome} — ${cached.quizCount} quiz (già presente)`);
        continue;
      } catch {
        /* rigenera */
      }
    }

    const res = extractOne(entry);
    if (!res.ok) {
      console.log(`  ✗  ${entry.indice} ${entry.nome} — ${res.error}`);
      continue;
    }

    const kb = (fs.statSync(res.outFile).size / 1024).toFixed(0);
    console.log(
      `  ✓  ${entry.indice} ${entry.nome} — ${res.payload.quizCount} quiz · ${kb} KB · ${Date.now() - t0} ms`
    );
    index.push({
      id: res.payload.id,
      indice: res.payload.indice,
      nome: res.payload.nome,
      quizCount: res.payload.quizCount,
    });
    okCount++;
    quizTotal += res.payload.quizCount;
  }

  index.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
  fs.writeFileSync(
    OUT_INDEX,
    JSON.stringify(
      {
        aggiornato: new Date().toISOString(),
        materieTotali: index.length,
        quizTotali: quizTotal,
        materie: index,
      },
      null,
      2
    )
  );

  console.log(
    `\n✓ ${okCount}/${targets.length} materie · ${quizTotal.toLocaleString("it-IT")} quiz totali`
  );
  console.log(`  indice: ${path.relative(ROOT, OUT_INDEX)}`);
}

main();
