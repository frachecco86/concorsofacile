#!/usr/bin/env node
/**
 * aggiorna-voce.mjs — Allinea le risorse WASM locali della voce neurale
 * (Piper + ONNX Runtime) alle versioni dei pacchetti installati.
 *
 * Perché serve: il pacchetto `@mintplex-labs/piper-tts-web` dichiara nei suoi
 * default un CDN con una versione di ONNX Runtime diversa da quella che usa
 * davvero. Il risultato, a runtime, è:
 *
 *   "no available backend found. ERR: [wasm] TypeError: Failed to fetch
 *    dynamically imported module: .../onnxruntime-web/1.18.0/ort-wasm-...mjs"
 *
 * Servendo i WASM dalla nostra origine il problema sparisce e la voce
 * funziona anche offline (dopo il primo download del modello).
 *
 * Uso:
 *   node scripts/aggiorna-voce.mjs
 *
 * Va rieseguito se si aggiornano `onnxruntime-web` o `piper-tts-web`.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const require = createRequire(import.meta.url);

const DEST_ORT = path.join(ROOT, "public", "voce", "ort");
const DEST_PIPER = path.join(ROOT, "public", "voce", "piper");

const PIPER_WASM_VERSION = "1.0.0";
const PIPER_WASM_BASE = `https://cdn.jsdelivr.net/npm/@diffusionstudio/piper-wasm@${PIPER_WASM_VERSION}/build`;

/**
 * File di ONNX Runtime da servire localmente.
 * `jsep` (WebGPU) è escluso di proposito: pesa ~28 MB e il percorso WASM è
 * più che sufficiente. Tenere i file sotto i 25 MiB permette di stare dentro
 * i limiti per-file di Cloudflare e GitHub Pages.
 */
const FILE_ORT = [
  "ort-wasm-simd-threaded.mjs",
  "ort-wasm-simd-threaded.wasm",
];

const FILE_PIPER = [
  "piper_phonemize.js",
  "piper_phonemize.wasm",
  "piper_phonemize.data",
];

async function esiste(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/** Trova la cartella dist di onnxruntime-web risolvendo il pacchetto. */
async function trovaOrtDist() {
  try {
    const pkg = require.resolve("onnxruntime-web/package.json");
    return path.join(path.dirname(pkg), "dist");
  } catch {
    // pnpm non espone onnxruntime-web alla radice: cerchiamo nello store.
    const pnpm = path.join(ROOT, "node_modules", ".pnpm");
    const voci = await fs.readdir(pnpm);
    const dir = voci.find((v) => v.startsWith("onnxruntime-web@"));
    if (!dir) return null;
    return path.join(pnpm, dir, "node_modules", "onnxruntime-web", "dist");
  }
}

async function scarica(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} per ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
  return buf.length;
}

function mb(n) {
  return (n / 1048576).toFixed(1) + " MB";
}

async function main() {
  await fs.mkdir(DEST_ORT, { recursive: true });
  await fs.mkdir(DEST_PIPER, { recursive: true });

  let errori = 0;

  // --- ONNX Runtime (dai node_modules, nessuna rete) ---
  const ortDist = await trovaOrtDist();
  if (!ortDist || !(await esiste(ortDist))) {
    console.log("✗ onnxruntime-web non trovato in node_modules. Esegui prima: pnpm install");
    errori++;
  } else {
    const versione = JSON.parse(
      await fs.readFile(path.join(path.dirname(ortDist), "package.json"), "utf8")
    ).version;
    console.log(`\nONNX Runtime ${versione} → public/voce/ort/`);
    for (const f of FILE_ORT) {
      const src = path.join(ortDist, f);
      if (!(await esiste(src))) {
        console.log(`  ✗  ${f} mancante in ${ortDist}`);
        errori++;
        continue;
      }
      const dest = path.join(DEST_ORT, f);
      await fs.copyFile(src, dest);
      const size = (await fs.stat(dest)).size;
      console.log(`  ✓  ${f.padEnd(38)} ${mb(size).padStart(9)}`);
    }
  }

  // --- Piper phonemize (dal CDN, versione fissata) ---
  console.log(`\nPiper phonemize ${PIPER_WASM_VERSION} → public/voce/piper/`);
  for (const f of FILE_PIPER) {
    const dest = path.join(DEST_PIPER, f);
    if (await esiste(dest)) {
      const size = (await fs.stat(dest)).size;
      console.log(`  ⏭  ${f.padEnd(38)} ${mb(size).padStart(9)} (già presente)`);
      continue;
    }
    try {
      const size = await scarica(`${PIPER_WASM_BASE}/${f}`, dest);
      console.log(`  ✓  ${f.padEnd(38)} ${mb(size).padStart(9)}`);
    } catch (e) {
      console.log(`  ✗  ${f}: ${e.message}`);
      errori++;
    }
  }

  // Ripulisce il WebGPU da build precedenti: supera i limiti di dimensione
  // per singolo file di alcuni host gratuiti e non è necessario.
  for (const f of ["ort-wasm-simd-threaded.jsep.wasm", "ort-wasm-simd-threaded.jsep.mjs"]) {
    const p = path.join(DEST_ORT, f);
    if (await esiste(p)) {
      await fs.rm(p);
      console.log(`\n🧹 rimosso ${f} (WebGPU, non necessario)`);
    }
  }

  console.log(
    errori === 0
      ? "\n✓ Risorse voce allineate.\n"
      : `\n✗ Completato con ${errori} errori.\n`
  );
  if (errori > 0) process.exit(1);
}

main().catch((e) => {
  console.error("Errore inatteso:", e);
  process.exit(1);
});
