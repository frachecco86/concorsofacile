#!/usr/bin/env node
/**
 * Genera `lib/versione.generato.ts` dalla storia git.
 *
 * Perché non un hook che committa il bump: git **non permette** di mettere in
 * stage dall'hook `commit-msg` (l'indice è già stato fotografato), e
 * `pre-commit` non vede ancora il messaggio. Un hook non può fare entrambe le
 * cose, quindi il bump finirebbe nel commit successivo — stato che diverge.
 *
 * Generare al momento di `dev`/`build` toglie il problema: la versione è una
 * funzione pura della storia git, non può divergere da essa e non c'è nulla
 * da ricordare.
 *
 * Regola: la versione cresce di 0.1 a ogni commit (schema minor scelto),
 * quindi con N commit la versione è `0.<N>.0`.
 *
 * Uso:
 *   node scripts/versione.mjs          genera il file
 *   node scripts/versione.mjs --stampa  solo stampa, non scrive
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const radice = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const destinazione = resolve(radice, "lib/versione.generato.ts");
const soloStampa = process.argv.includes("--stampa");

/** Esegue git e restituisce stdout, oppure `null` se git non è utilizzabile. */
function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: radice,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

/** Da N commit a "0.N.0": +0.1 per commit, come richiesto. */
function versioneDa(commit) {
  const n = Math.max(1, commit);
  return `0.${n}.0`;
}

/** Titolo breve: prima riga, senza prefissi convenzionali, in maiuscolo iniziale. */
function titoloDa(riga) {
  const t = riga
    .replace(/^(feat|fix|chore|docs|refactor|test|style|perf)(\([^)]*\))?!?:\s*/i, "")
    .trim()
    .slice(0, 90);
  if (!t) return "Aggiornamento";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Voci dell'elenco: le righe "- ..." del corpo del commit, con le eventuali
 * righe di continuazione (indentate) riunite alla voce precedente. Git avvolge
 * i messaggi a 70 colonne, quindi senza questo passaggio le voci sarebbero
 * troncate a metà frase.
 */
function vociDa(corpo) {
  const voci = [];
  for (const riga of corpo.split("\n")) {
    const nuova = riga.match(/^\s*[-*]\s+(.*)$/);
    if (nuova) {
      voci.push(nuova[1].trim());
      continue;
    }
    // Riga indentata che prosegue la voce in corso.
    if (voci.length > 0 && /^\s+\S/.test(riga)) {
      voci[voci.length - 1] = `${voci[voci.length - 1]} ${riga.trim()}`;
      continue;
    }
    // Riga vuota o testo non indentato: il prossimo "- " è una voce nuova.
    voci.push("\u0000"); // segnaposto per interrompere le continuazioni
  }
  return voci.filter((v) => v && v !== "\u0000");
}

/** Rilasci dalla storia git: dal più recente al più vecchio. */
function rilascioDaStoria() {
  // Separatore improbabile in un messaggio: ASCII 0x1f fra i campi.
  const SEP = "\u001f";
  const raw = git(["log", `--pretty=format:%h${SEP}%ad${SEP}%s${SEP}%b${SEP}%x1e`, "--date=short"]);
  if (!raw) return null;

  const commit = raw
    .split("\x1e")
    .map((r) => r.trim())
    .filter(Boolean);

  const totale = commit.length;
  const rilasci = [];
  let indice = totale; // il più recente ha la versione più alta

  for (const blocco of commit) {
    const [hash, data, oggetto, corpo = ""] = blocco.split(SEP);
    const versione = versioneDa(indice);
    const voci = vociDa(corpo);
    rilasci.push({
      versione,
      data,
      titolo: titoloDa(oggetto ?? ""),
      voci: voci.length > 0 ? voci : [titoloDa(oggetto ?? "")],
      hash,
    });
    indice -= 1;
  }

  return { rilasci, totale };
}

const storia = rilascioDaStoria();

// Fallback: senza git (es. build da tarball) si pubblica la versione base.
const rilasci = storia?.rilasci ?? [
  { versione: "0.1.0", data: new Date().toISOString().slice(0, 10), titolo: "Release", voci: ["Build senza storia git"], hash: "" },
];
const corrente = rilasci[0];

const escapa = (s) => JSON.stringify(s);

const contenuto = `// GENERATO DA scripts/versione.mjs — NON MODIFICARE A MANO.
// Rigenerato a ogni \`dev\` e \`build\`; è in .gitignore.
//
// Fonte di verità: la storia git. La versione cresce di 0.1 a ogni commit,
// quindi con N commit la versione è 0.<N>.0.

export const VERSIONE = ${escapa(corrente.versione)};

/** Commit totali considerati (utile in diagnostica). */
export const COMMIT: number = ${storia?.totale ?? 1};

export interface RilascioGenerato {
  versione: string;
  /** Data ISO (YYYY-MM-DD) del commit. */
  data: string;
  titolo: string;
  voci: string[];
  /** Hash abbreviato del commit. */
  hash: string;
}

export const CHANGELOG: RilascioGenerato[] = [
${rilasci
  .map(
    (r) => `  {
    versione: ${escapa(r.versione)},
    data: ${escapa(r.data)},
    titolo: ${escapa(r.titolo)},
    voci: [
${r.voci.map((v) => `      ${escapa(v)},`).join("\n")}
    ],
    hash: ${escapa(r.hash)},
  },`
  )
  .join("\n")}
];
`;

if (soloStampa) {
  process.stdout.write(contenuto);
} else {
  mkdirSync(dirname(destinazione), { recursive: true });
  writeFileSync(destinazione, contenuto);
  console.log(
    `versione.mjs: ${corrente.versione} (${storia?.totale ?? 1} commit) → lib/versione.generato.ts`
  );
}
