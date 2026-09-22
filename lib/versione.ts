/**
 * Versione dell'app e note di rilascio.
 *
 * La versione **non è scritta a mano**: è una funzione della storia git,
 * generata in `lib/versione.generato.ts` da `scripts/versione.mjs` a ogni
 * `dev` e `build`. Così "ogni commit = +0.1" è vero per costruzione e non
 * esiste uno stato da tenere allineato a mano.
 *
 * Regola: con N commit la versione è `0.N.0` (schema minor), quindi ogni
 * commit aggiunge esattamente 0.1.
 *
 * Questo modulo espone i dati generati e gli helper di formattazione.
 */

import { CHANGELOG, COMMIT, VERSIONE, type RilascioGenerato } from "./versione.generato";

export { CHANGELOG, COMMIT, VERSIONE };
export type { RilascioGenerato };

/** Alias storico: un rilascio è una voce del changelog generato. */
export type Rilascio = RilascioGenerato;

/** Rilascio corrente: la testa dell'elenco, con fallback sicuro. */
export function rilascioCorrente(): Rilascio {
  return (
    CHANGELOG[0] ?? {
      versione: VERSIONE,
      data: "",
      titolo: "Versione corrente",
      voci: [],
      hash: "",
    }
  );
}

/** Sottoinsieme dei rilasci dopo quello indicato (escluso). */
export function rilasciSuccessiviA(versione: string): Rilascio[] {
  const i = CHANGELOG.findIndex((r) => r.versione === versione);
  return i < 0 ? CHANGELOG : CHANGELOG.slice(0, i);
}

/** Data in forma leggibile: "22 settembre 2026". */
export function dataLeggibile(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
