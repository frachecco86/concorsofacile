/**
 * La voce con cui sono registrate le lezioni.
 *
 * Un unico posto perché è la chiave di tutto: l'impronta di ogni registrazione
 * contiene l'id della voce (`lib/voce/chiave.ts`), quindi se lo script di build
 * e l'app non usassero lo **stesso** id, l'audio registrato non verrebbe mai
 * trovato. Cambiare voce significa cambiare questo id e rigenerare le
 * registrazioni: le vecchie non vengono più servite, non vanno cancellate a mano.
 *
 * Il modulo è neutro (niente React, niente Node): lo usano sia il browser sia
 * lo script `scripts/registra-voce.mjs`.
 */
export const VOCE_REGISTRATA = {
  /** Id del modello Piper usato per registrare. */
  id: "it_IT-paola-medium",
  /** Nome mostrato all'utente. */
  nome: "Paola",
} as const;
