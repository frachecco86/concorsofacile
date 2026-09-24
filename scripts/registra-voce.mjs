#!/usr/bin/env node
/**
 * registra-voce.mjs — Registra le lezioni in file audio, una volta per tutte.
 *
 * Perché serve: la voce neurale nel browser (Piper in WASM) impiega 1–3 secondi
 * a sintetizzare un blocco e non può partire prima di averlo finito. Registrare
 * lo stesso audio in fase di build toglie di mezzo il problema: in riproduzione
 * c'è solo un file da leggere, che parte subito, funziona offline e non pesa
 * sulla CPU del telefono.
 *
 * Il testo viene diviso in frasi e ogni frase è sintetizzata a parte: così i
 * tempi di ogni frase sono **noti** (somma delle durate), non stimati. È quello
 * che permette l'evidenziazione per frase esatta e l'avanzamento senza deriva.
 *
 * Uso:
 *   node scripts/registra-voce.mjs                 # la lezione pilota (un capitolo)
 *   node scripts/registra-voce.mjs --tutto         # tutte le lezioni disponibili
 *   node scripts/registra-voce.mjs --materia "Diritto amministrativo" --capitolo 2
 *   node scripts/registra-voce.mjs --forza         # risintetizza anche se il file c'è
 *
 * Le frasi nuove si **aggiungono** a quelle già registrate: il manifest viene
 * riletto e riscritto, non ricostruito.
 *
 * La voce (id del modello e nome) sta in `lib/voce/voce-registrata.ts`: è un
 * dato condiviso con l'app, e i due devono usare lo stesso id o l'audio
 * registrato non verrebbe mai trovato.
 *
 * Il binario Piper, il modello (~89 MB) e l'encoder MP3 finiscono in
 * `~/.cache/concorsofacile-voce/` e si scaricano solo la prima volta. La cache
 * sta fuori dal progetto di proposito: è materiale di build condiviso da tutti
 * i cloni, non roba da mettere in git né da far percorrere al bundler.
 *
 * Va rieseguito quando cambia il testo di una lezione: la chiave di ogni
 * registrazione è l'impronta del testo, quindi un blocco modificato risulta
 * "non registrato" e ricade sulla voce dal vivo, senza servire audio vecchio.
 */

import fs from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir, tmpdir } from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------- costanti
/**
 * La voce con cui si registra: sta in `lib/voce/voce-registrata.ts`, perché è
 * un dato condiviso con l'app. Qui si risolve in `main`.
 */
let VOCE_ID = "";
/** Il modello: "medium" è la stessa voce che l'app usa dal vivo. */
const MODELLO_URL =
  "https://huggingface.co/rhasspy/piper-voices/resolve/main/it/it_IT/paola/medium";
const PIPER_VERSIONE = "2023.11.14-2";
const PIPER_URL = (arch) =>
  `https://github.com/rhasspy/piper/releases/download/${PIPER_VERSIONE}/piper_linux_${arch}.tar.gz`;
/** Silenzio dopo ogni frase, in secondi: è la pausa che si sente nel parlato. */
const SILENZIO_FRASE = 0.2;
/** Bitrate MP3. A 64 kbps la voce è trasparente e pesa ~8 KB al secondo. */
const BITRATE_MP3 = 64;
/**
 * L'encoder MP3 non è una dipendenza del progetto: si scarica nella cache,
 * come Piper.
 *
 * Perché: è uno strumento di **build**, non serve all'app in esecuzione, e
 * tenerlo in `node_modules` significherebbe far entrare il suo albero (e le sue
 * licenze) nel progetto. Così invece il progetto resta senza dipendenze in più.
 */
const ENCODER = { nome: "@breezystack/lamejs", versione: "1.2.7", licenza: "LGPL-3.0" };
const ENCODER_URL = `https://registry.npmjs.org/@breezystack/lamejs/-/lamejs-${ENCODER.versione}.tgz`;

const CACHE = path.join(homedir(), ".cache", "concorsofacile-voce");
const BIN = path.join(CACHE, "piper", "piper");
const ESPEAK = path.join(CACHE, "piper", "espeak-ng-data");
/** Il percorso del modello dipende dall'id della voce: si risolve in `main`. */
let MODELLO = "";

const DEST_AUDIO = path.join(ROOT, "public", "voce-registrata");
const DEST_MANIFEST = path.join(ROOT, "lib", "voce", "registrazioni.json");

// ------------------------------------------------------------------- utilità
const esiste = async (p) => !!(await fs.stat(p).catch(() => null));
const kb = (n) => `${Math.round(n / 1024)} KB`;
const secondi = (n) => `${n.toFixed(1)} s`;

function argomento(nome) {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const haFlag = (nome) => process.argv.includes(`--${nome}`);

/** Nome file leggibile: la cartella dice dove siamo, la chiave dice cosa. */
const slug = (nome) =>
  nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

async function scarica(url, dest, etichetta) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  console.log(`  ✓  ${etichetta.padEnd(34)} ${kb(buf.length).padStart(9)}`);
}

// ------------------------------------------------------------- dipendenze
async function assicuraPiper() {
  if (await esiste(BIN)) return;

  if (process.platform !== "linux") {
    throw new Error(
      `Piper precompilato disponibile qui solo per Linux (sei su ${process.platform}). ` +
        "Su macOS/Windows registra da Linux o dalla CI."
    );
  }
  const arch = process.arch === "arm64" ? "aarch64" : "x86_64";

  console.log(`\nScarico Piper ${PIPER_VERSIONE} (${arch}) → ${CACHE}`);
  await fs.mkdir(CACHE, { recursive: true });
  const tar = path.join(CACHE, "piper.tar.gz");
  await scarica(PIPER_URL(arch), tar, "piper.tar.gz");
  execFileSync("tar", ["xzf", tar, "-C", CACHE]);
  await fs.rm(tar);
  console.log("  ✓  binario estratto");
}

async function assicuraModello() {
  if (await esiste(MODELLO)) return;
  console.log(`\nScarico la voce ${VOCE_ID} → ${CACHE}`);
  await fs.mkdir(CACHE, { recursive: true });
  await scarica(`${MODELLO_URL}/${VOCE_ID}.onnx`, MODELLO, `${VOCE_ID}.onnx`);
  await scarica(
    `${MODELLO_URL}/${VOCE_ID}.onnx.json`,
    `${MODELLO}.json`,
    `${VOCE_ID}.onnx.json`
  );
}

/** Prepara l'encoder MP3 nella cache e restituisce il percorso del modulo. */
async function assicuraEncoder() {
  const dest = path.join(CACHE, "encoder");
  const entry = path.join(dest, "package", "dist", "lamejs.js");
  if (await esiste(entry)) return entry;

  console.log(`\nScarico l'encoder MP3 ${ENCODER.nome}@${ENCODER.versione} → ${CACHE}`);
  console.log(`  · licenza ${ENCODER.licenza} — strumento di build, non entra nell'app`);
  await fs.mkdir(dest, { recursive: true });
  const tar = path.join(CACHE, "encoder.tgz");
  await scarica(ENCODER_URL, tar, "encoder.tgz");
  execFileSync("tar", ["xzf", tar, "-C", dest]);
  await fs.rm(tar);
  return entry;
}

// ------------------------------------------------------------------- WAV
/** Legge un WAV PCM: formato, dati grezzi e durata. */
function leggiWav(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error("non è un WAV");
  let i = 12;
  let formato = null;
  let dati = null;
  while (i + 8 <= buf.length) {
    const id = buf.toString("ascii", i, i + 4);
    const dim = buf.readUInt32LE(i + 4);
    const corpo = buf.subarray(i + 8, i + 8 + dim);
    if (id === "fmt ") {
      formato = {
        canali: corpo.readUInt16LE(2),
        frequenza: corpo.readUInt32LE(4),
        bit: corpo.readUInt16LE(14),
      };
    } else if (id === "data") {
      dati = corpo;
    }
    i += 8 + dim + (dim % 2);
  }
  if (!formato || !dati) throw new Error("WAV senza fmt o data");
  const bytePerCampione = (formato.bit / 8) * formato.canali;
  return { ...formato, dati, secondi: dati.length / bytePerCampione / formato.frequenza };
}

// ------------------------------------------------------------------- MP3
async function codificaMp3(wav, dest) {
  const percorso = process.env.VOCE_ENCODER_PATH ?? (await assicuraEncoder());
  const { Mp3Encoder } = await import(pathToFileURL(percorso).href);

  const campioni = Math.floor(wav.dati.length / 2);
  const pcm = new Int16Array(wav.dati.buffer, wav.dati.byteOffset, campioni);

  const encoder = new Mp3Encoder(wav.canali, wav.frequenza, BITRATE_MP3);
  const parti = [];
  for (let i = 0; i < campioni; i += 1152) {
    const blocco = encoder.encodeBuffer(pcm.subarray(i, i + 1152));
    if (blocco.length) parti.push(Buffer.from(blocco));
  }
  const coda = encoder.flush();
  if (coda.length) parti.push(Buffer.from(coda));

  const mp3 = Buffer.concat(parti);
  await fs.writeFile(dest, mp3);
  return mp3.length;
}

// ------------------------------------------------------------------- Piper
/**
 * Sintetizza **tutte** le frasi in un solo processo.
 *
 * Perché in blocco: Piper carica il modello (63 MB) a ogni avvio, e quel
 * caricamento costa più della sintesi stessa. Con `--json-input` una frase è
 * una riga di stdin e un file su disco, quindi il modello si carica una volta
 * per l'intera esecuzione invece di una volta per frase.
 */
function sintetizzaTutto(lavori) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      BIN,
      [
        "-m",
        MODELLO,
        "--espeak_data",
        ESPEAK,
        "--sentence_silence",
        String(SILENZIO_FRASE),
        "--json-input",
        "-q",
      ],
      { stdio: ["pipe", "pipe", "pipe"] }
    );

    let fatti = 0;
    let errore = "";
    let residuo = "";

    proc.stdout.on("data", (pezzo) => {
      residuo += pezzo.toString();
      const righe = residuo.split("\n");
      residuo = righe.pop() ?? "";
      fatti += righe.filter((r) => r.trim()).length;
      if (fatti % 10 === 0 || fatti === lavori.length) {
        process.stdout.write(`\r  ·  sintetizzate ${fatti}/${lavori.length} frasi`);
      }
    });
    proc.stderr.on("data", (pezzo) => {
      errore += pezzo.toString();
    });
    proc.on("error", reject);
    proc.on("close", (codice) => {
      process.stdout.write("\r");
      if (codice === 0) resolve();
      else reject(new Error(errore.trim() || `Piper è uscito con codice ${codice}`));
    });

    for (const lavoro of lavori) {
      proc.stdin.write(JSON.stringify({ text: lavoro.frase, output_file: lavoro.wav }) + "\n");
    }
    proc.stdin.end();
  });
}

// --------------------------------------------------------------- main
async function main() {
  const { LEZIONI, testoBlocco } = await import("../lib/dati/lezioni.ts");
  const { frasiConOffset } = await import("../lib/frasi.ts");
  const { chiaveRegistrazione } = await import("../lib/voce/chiave.ts");
  const { VOCE_REGISTRATA } = await import("../lib/voce/voce-registrata.ts");

  VOCE_ID = VOCE_REGISTRATA.id;
  MODELLO = path.join(CACHE, `${VOCE_ID}.onnx`);

  /** Impronta del testo: la stessa che usa il browser per ritrovarlo. */
  const chiave = (testo) => chiaveRegistrazione(VOCE_ID, testo);

  // Quali lezioni registrare: per difetto la lezione pilota (un capitolo).
  const concorso = argomento("concorso") ?? "comune-cremona-2026";
  const materia = argomento("materia");
  const capitolo = argomento("capitolo") ? Number(argomento("capitolo")) : undefined;
  const tutto = haFlag("tutto");
  const forza = haFlag("forza");

  const scelte = LEZIONI.filter((l) => l.concorsoId === concorso)
    .filter((l) => (materia ? l.materia === materia : true))
    .map((l) => ({
      materia: l.materia,
      capitoli: l.capitoli.filter((c) => (capitolo ? c.numero === capitolo : true)),
    }))
    .filter((l) => l.capitoli.length > 0);

  if (scelte.length === 0) {
    console.error(`Nessuna lezione da registrare per «${concorso}».`);
    process.exit(1);
  }
  if (!tutto && !materia && !capitolo) {
    scelte.splice(1); // solo la prima lezione…
    scelte[0].capitoli.splice(1); // …e solo il suo primo capitolo
  }

  await assicuraPiper();
  await assicuraModello();

  // Manifest esistente: le registrazioni già fatte si conservano.
  let manifest = {};
  if (await esiste(DEST_MANIFEST)) {
    try {
      manifest = JSON.parse(await fs.readFile(DEST_MANIFEST, "utf8"));
    } catch {
      console.log("· manifest precedente illeggibile: lo rifaccio da zero");
    }
  }

  const tmp = await fs.mkdtemp(path.join(tmpdir(), "voce-"));
  const inizio = Date.now();

  // 1. Cosa manca: i blocchi senza registrazione (o tutti, con --forza).
  const daFare = [];
  let saltati = 0;
  let secondiSaltati = 0;
  for (const lezione of scelte) {
    for (const cap of lezione.capitoli) {
      for (const blocco of cap.blocchi) {
        const testo = testoBlocco(blocco);
        const k = chiave(testo);
        const file = `/voce-registrata/${slug(lezione.materia)}/cap-${cap.numero}/${k}.mp3`;
        const dest = path.join(DEST_AUDIO, slug(lezione.materia), `cap-${cap.numero}`, `${k}.mp3`);

        if (!forza && manifest[k] && (await esiste(dest))) {
          saltati++;
          secondiSaltati += manifest[k].durataMs / 1000;
          continue;
        }
        daFare.push({ k, file, dest, testo, frasi: frasiConOffset(testo) });
      }
    }
  }

  console.log(
    `\n${daFare.length} blocchi da registrare` +
      (saltati ? `, ${saltati} già pronti (${secondi(saltati ? secondiSaltati : 0)})` : "")
  );

  let sintesiSec = 0;
  let frasi = 0;
  let byteMp3 = 0;
  let secondiNuovi = 0;

  if (daFare.length > 0) {
    // 2. Sintesi: tutte le frasi di tutti i blocchi, in un solo processo.
    const lavori = [];
    for (const blocco of daFare) {
      blocco.wav = blocco.frasi.map((_, i) => path.join(tmp, `${blocco.k}-${i}.wav`));
      blocco.frasi.forEach((frase, i) => lavori.push({ frase: frase.testo, wav: blocco.wav[i] }));
    }
    const t0 = Date.now();
    await sintetizzaTutto(lavori);
    sintesiSec = (Date.now() - t0) / 1000;

    // 3. Montaggio: le frasi di un blocco diventano un file, con i tempi di
    //    ognuna presi dalla sua durata reale.
    for (const blocco of daFare) {
      const pezzi = [];
      const tempi = [];
      let ms = 0;
      for (let i = 0; i < blocco.frasi.length; i++) {
        const wav = leggiWav(await fs.readFile(blocco.wav[i]));
        pezzi.push(wav.dati);
        tempi.push({
          inizio: blocco.frasi[i].inizio,
          fine: blocco.frasi[i].fine,
          daMs: Math.round(ms),
          aMs: Math.round(ms + wav.secondi * 1000),
        });
        ms += wav.secondi * 1000;
        frasi++;
      }

      const canali = 1;
      const frequenza = 22050;
      const dati = Buffer.concat(pezzi);
      const durataSec = dati.length / (canali * 2) / frequenza;

      await fs.mkdir(path.dirname(blocco.dest), { recursive: true });
      byteMp3 += await codificaMp3({ dati, canali, frequenza, bit: 16 }, blocco.dest);
      manifest[blocco.k] = {
        file: blocco.file,
        durataMs: Math.round(durataSec * 1000),
        frasi: tempi,
      };
      secondiNuovi += durataSec;
    }
  }

  await fs.rm(tmp, { recursive: true, force: true });

  // 4. Manifest: chiavi ordinate, così il diff di git resta leggibile.
  const ordinato = Object.fromEntries(
    Object.keys(manifest)
      .sort()
      .map((k) => [k, manifest[k]])
  );
  await fs.mkdir(path.dirname(DEST_MANIFEST), { recursive: true });
  await fs.writeFile(DEST_MANIFEST, JSON.stringify(ordinato, null, 2) + "\n");

  const chiavi = Object.keys(ordinato);
  const durataTotale = chiavi.reduce((s, k) => s + ordinato[k].durataMs, 0);
  console.log(
    [
      "",
      `✓ Registrate ${daFare.length} porzioni di lezione (${frasi} frasi nuove)`,
      `  audio    ${(secondiNuovi / 60).toFixed(1)} min nuovi · ${(durataTotale / 60000).toFixed(1)} min in catalogo`,
      `  mp3      ${kb(byteMp3)} nuovi (${(byteMp3 / Math.max(secondiNuovi, 1) / 1024).toFixed(1)} KB/s)`,
      `  sintesi  ${secondi(sintesiSec)} di CPU (${secondi((Date.now() - inizio) / 1000)} totali)`,
      `  manifest ${path.relative(ROOT, DEST_MANIFEST)} · ${chiavi.length} voci`,
      "",
    ].join("\n")
  );
}

main().catch((e) => {
  console.error("Errore inatteso:", e);
  process.exit(1);
});
