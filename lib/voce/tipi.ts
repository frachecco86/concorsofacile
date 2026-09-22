/**
 * Contratto del layer voce di ConcorsoFacile.
 *
 * L'app non conosce il motore TTS: parla solo con `MotoreVoce`. Oggi esiste
 * `WebSpeechEngine` (istantaneo, voci native, zero download). Domani si
 * aggiungono `KokoroEngine` / `PiperEngine` (ONNX in-browser) implementando
 * questa stessa interfaccia, senza toccare l'interfaccia utente.
 */

export type StatoVoce = "idle" | "loading" | "speaking" | "paused";

/** Una voce selezionabile, normalizzata tra motori diversi. */
export interface OpzioneVoce {
  /** Identificatore stabile nel motore (es. `voiceURI` per Web Speech). */
  id: string;
  /** Nome leggibile mostrato all'utente. */
  nome: string;
  /** Codice lingua BCP-47, es. `it-IT`. */
  lingua: string;
  /** `true` quando la voce è italiana (usata per ordinarle). */
  italiana: boolean;
  /** Qualità percepita, se il motore la espone. */
  qualita?: "base" | "media" | "premium";
  /** Motore di provenienza: utile in UI per capire cosa si sta usando. */
  motore: string;
}

/** Impostazioni applicate a ogni sintesi. */
export interface ImpostazioniVoce {
  /** id di `OpzioneVoce`, oppure `null` per la voce di sistema predefinita. */
  voceId: string | null;
  /** Velocità: 1 = normale. */
  velocita: number;
  /** Tono: 1 = normale. */
  tono: number;
  /** Volume: 0–1. */
  volume: number;
}

export const IMPOSTAZIONI_PREDEFINITE: ImpostazioniVoce = {
  voceId: null,
  velocita: 1,
  tono: 1,
  volume: 1,
};

export interface CallbackSintesi {
  onInizio?: () => void;
  onFine?: () => void;
  /** Posizione nel testo (indice carattere) durante la lettura. */
  onParola?: (indiceCarattere: number, lunghezza: number) => void;
  onErrore?: (errore: string) => void;
}

export interface MotoreVoce {
  /** Nome leggibile del motore, per la UI. */
  readonly nome: string;
  /** `true` se il motore è disponibile in questo ambiente. */
  disponibile(): boolean;
  /** Elenco voci. Può risolversi in modo asincrono. */
  voci(): Promise<OpzioneVoce[]>;
  /** Pronuncia il testo. Deve interrompere la sintesi precedente. */
  parla(testo: string, impostazioni: ImpostazioniVoce, cb?: CallbackSintesi): Promise<void>;
  /** Interrompe immediatamente. */
  ferma(): void;
  /** Mette in pausa, se supportato. */
  pausa(): void;
  /** Riprende dalla pausa, se supportato. */
  riprendi(): void;
  /** Rilascia le risorse (utile ai motori WASM). */
  chiudi(): void;
}

/** Sceglie la voce migliore disponibile: italiana, poi qualità, poi nome. */
export function scegliVoceMigliore(voci: OpzioneVoce[]): OpzioneVoce | null {
  if (voci.length === 0) return null;
  const punteggio = (v: OpzioneVoce) => {
    let p = 0;
    if (v.italiana) p += 100;
    if (v.qualita === "premium") p += 20;
    else if (v.qualita === "media") p += 10;
    // Le voci "local" sono più reattive di quelle in rete.
    return p;
  };
  return [...voci].sort((a, b) => punteggio(b) - punteggio(a))[0] ?? null;
}
