/**
 * Shim per il bundle **client**: `@mintplex-labs/piper-tts-web` (via
 * `@diffusionstudio/piper-wasm`) contiene un ramo Node con
 * `require("fs").readFile(...)` protetto da un check su `process.versions`.
 *
 * Nel browser quel ramo non viene mai eseguito, ma il bundler deve comunque
 * risolverlo: senza questo file la build fallisce con "Can't resolve 'fs'".
 * Qui esportiamo solo ciò che il ramo Node si aspetta, senza implementarlo.
 */

export function readFile() {
  throw new Error("fs non è disponibile nel browser");
}

const fsVuoto = { readFile };

export default fsVuoto;
