/**
 * Le frasi di un testo, con la loro posizione.
 *
 * Perché esiste: un blocco si legge **una frase per volta**. Serve alla voce
 * (sintetizzare e riprodurre per frase significa partire subito invece di
 * aspettare tutto il blocco), alle registrazioni (i tempi di ogni frase sono
 * noti mentre si registra) e all'evidenziazione, che è per frase e non per
 * parola: la stima lineare "posizione nel tempo → posizione nel testo" deriva
 * dentro una parola, non dentro una frase.
 *
 * Il modulo è neutro (niente React, niente JSX): lo usano sia l'app sia gli
 * script di build, così le due parti non possono dividere il testo in modo
 * diverso.
 */

/** Una frase e la sua posizione nel testo piatto. */
export interface Frase {
  /** Testo della frase, senza spazi ai bordi. */
  testo: string;
  /** Indice del primo carattere nel testo piatto (incluso). */
  inizio: number;
  /** Indice dopo l'ultimo carattere (escluso): `testo.slice(inizio, fine)` = `testo`. */
  fine: number;
}

/** Caratteri che chiudono una frase. */
const FINE_FRASE = /[.!?;…]/;

/**
 * Divide `testo` in frasi con gli offset nel testo originale.
 *
 * Non usa `split` con lookbehind perché gli offset andrebbero ricostruiti a
 * mano: qui si percorre il testo una volta e si tiene traccia degli indici.
 */
export function frasiConOffset(testo: string): Frase[] {
  const frasi: Frase[] = [];
  let inizio = -1;
  let i = 0;

  const chiudi = (fineGrezza: number) => {
    if (inizio < 0) return;
    let fine = fineGrezza;
    while (fine > inizio && /\s/.test(testo[fine - 1]!)) fine--;
    const spezzone = testo.slice(inizio, fine);
    if (spezzone) frasi.push({ testo: spezzone, inizio, fine });
    inizio = -1;
  };

  while (i < testo.length) {
    const c = testo[i]!;
    if (inizio < 0) {
      if (!/\s/.test(c)) inizio = i;
    } else if (FINE_FRASE.test(c)) {
      // La frase finisce alla punteggiatura: si porta dietro eventuali
      // chiusure doppie ("?!", "…") ma non il testo successivo.
      let fine = i + 1;
      while (fine < testo.length && FINE_FRASE.test(testo[fine]!)) fine++;
      chiudi(fine);
      i = fine;
      continue;
    }
    i++;
  }
  chiudi(testo.length);

  return frasi;
}

/** Solo i testi delle frasi, nell'ordine. */
export function inFrasi(testo: string): string[] {
  return frasiConOffset(testo).map((f) => f.testo);
}

/** La frase che contiene la posizione indicata (indice carattere). */
export function fraseA(frasi: Frase[], posizione: number): Frase | null {
  if (frasi.length === 0) return null;
  for (const frase of frasi) {
    if (posizione < frase.fine) return frase;
  }
  return frasi[frasi.length - 1] ?? null;
}
