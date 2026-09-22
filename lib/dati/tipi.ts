/** Modello dati condiviso tra server e client. */

export interface Quiz {
  /** Numero progressivo stabile all'interno della materia (1-based). */
  numero: number;
  /** Identificativo ufficiale nel corpus originale: può essere numero o stringa. */
  id: number | string | null;
  domanda: string;
  risposta: string;
  /** Indice della tabella/argomento di origine nel PDF. */
  gruppo: number;
  /** `true` se la domanda o la risposta contengono un'immagine non testuale. */
  immagine?: boolean;
}

export interface Materia {
  id: string;
  indice: number;
  nome: string;
  quizCount: number;
  gruppi: number;
  fonte: string;
  estratto: string;
  quiz: Quiz[];
}

/** Voce leggera dell'indice (senza i quiz). */
export interface MateriaIndice {
  id: string;
  indice: number;
  nome: string;
  quizCount: number;
}

export interface IndiceMaterie {
  aggiornato: string;
  materieTotali: number;
  quizTotali: number;
  materie: MateriaIndice[];
}

/** Risposta di una sessione di studio. */
export interface RispostaSessione {
  numero: number;
  /** `true` se l'utente ha valutato di saperla. */
  saputa: boolean;
  /** Millisecondi impiegati. */
  tempo: number;
}

export interface EsitoSessione {
  materiaId: string;
  materiaNome: string;
  iniziata: string;
  conclusa: string;
  risposte: RispostaSessione[];
  sapute: number;
  totali: number;
}
