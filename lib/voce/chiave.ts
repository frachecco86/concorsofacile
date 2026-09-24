/**
 * Impronta di un testo, per ritrovare la sua registrazione.
 *
 * Serve la **stessa** impronta in due posti lontani: lo script che registra
 * l'audio in fase di build (Node) e l'app che lo riproduce (browser). Per
 * questo è un hash scritto a mano e non `crypto`: stesso risultato ovunque,
 * nessuna dipendenza, nessuna versione di algoritmo da tenere allineata.
 *
 * FNV-1a a 64 bit: poche righe, deterministico, e per qualche centinaio di
 * testi le collisioni sono fuori discussione.
 */

/** Versione dell'impronta: cambiare la formula significa rigenerare l'audio. */
export const VERSIONE_CHIAVE = "1";

export function chiaveRegistrazione(voceId: string, testo: string): string {
  let h = 0xcbf29ce484222325n;
  const primo = 0x100000001b3n;
  const maschera = 0xffffffffffffffffn;
  const sorgente = `${VERSIONE_CHIAVE}|${voceId}|${testo}`;

  for (let i = 0; i < sorgente.length; i++) {
    h = ((h ^ BigInt(sorgente.charCodeAt(i))) * primo) & maschera;
  }
  return h.toString(16).padStart(16, "0");
}
