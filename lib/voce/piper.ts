import type {
  CallbackSintesi,
  ImpostazioniVoce,
  MotoreVoce,
  OpzioneVoce,
} from "./tipi";

/**
 * Motore Piper (VITS esportato in ONNX), eseguito interamente nel browser.
 *
 * Perché esiste: la Web Speech API dipende dalle voci installate nel sistema
 * operativo. Su Linux/desktop minimali (e in alcuni browser) l'elenco è
 * semplicemente vuoto: l'app non avrebbe voce. Piper porta la voce *dentro*
 * l'app: modello scaricato una volta, poi sintesi offline, identica su ogni
 * dispositivo e senza costi per carattere.
 *
 * Modello: `it_IT-paola-medium` (~63 MB) — italiano, qualità media.
 * Licenza MIT (voci Piper originali), quindi utilizzabile commercialmente.
 */

/** Le voci italiane disponibili in Piper. */
const VOCI_ITALIANE: OpzioneVoce[] = [
  {
    id: "it_IT-paola-medium",
    nome: "Paola",
    lingua: "it-IT",
    italiana: true,
    qualita: "media",
    motore: "Voce neurale (Piper)",
  },
  {
    id: "it_IT-riccardo-x_low",
    nome: "Riccardo",
    lingua: "it-IT",
    italiana: true,
    qualita: "base",
    motore: "Voce neurale (Piper)",
  },
];

export const VOCE_PIPER_PREDEFINITA = "it_IT-paola-medium";

/** Stato del download del modello, per dare un feedback onesto all'utente. */
export interface StatoModello {
  fase: "assente" | "scarico" | "pronto" | "errore";
  percentuale: number;
  messaggio?: string;
}

export class PiperEngine implements MotoreVoce {
  readonly nome = "Voce neurale (Piper)";
  private modulo: typeof import("@mintplex-labs/piper-tts-web") | null = null;
  private sessione: import("@mintplex-labs/piper-tts-web").TtsSession | null = null;
  private voceCaricata: string | null = null;
  private audio: HTMLAudioElement | null = null;
  private urlCorrente: string | null = null;
  /** Handle dell'animazione che segue l'avanzamento della lettura. */
  private rafCorrente: number | null = null;
  private interrotto = false;
  private cbCorrente: CallbackSintesi | null = null;

  /** Callback di progresso del download del modello, osservabile dalla UI. */
  onStato: ((s: StatoModello) => void) | null = null;

  disponibile(): boolean {
    if (typeof window === "undefined") return false;
    // Serve WebAssembly + OPFS per la cache dei modelli.
    return (
      typeof WebAssembly !== "undefined" &&
      typeof navigator !== "undefined" &&
      typeof navigator.storage?.getDirectory === "function"
    );
  }

  async voci(): Promise<OpzioneVoce[]> {
    return VOCI_ITALIANE;
  }

  private async caricaModulo() {
    if (this.modulo) return this.modulo;
    this.modulo = await import("@mintplex-labs/piper-tts-web");
    return this.modulo;
  }

  /**
   * Risolve i percorsi delle risorse **servite da ConcorsoFacile stessa**.
   *
   * Il pacchetto, di default, punta a un CDN con una versione di ONNX Runtime
   * diversa da quella che si porta dietro: la sessione fallisce con
   * "no available backend found". Servendo i file WASM dalla nostra origine
   * il problema sparisce e — soprattutto — la voce funziona **offline**.
   */
  private percorsiWasm() {
    const base =
      typeof window !== "undefined" ? window.location.origin : "";
    const percorso = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
    const radice = `${base}${percorso}`;
    return {
      onnxWasm: `${radice}/voce/ort/`,
      piperData: `${radice}/voce/piper/piper_phonemize.data`,
      piperWasm: `${radice}/voce/piper/piper_phonemize.wasm`,
    };
  }

  /**
   * Prepara il modello: primo download (con progresso) e creazione della
   * sessione di inferenza. Le chiamate successive riusano la sessione.
   * Pubblico perché la UI vuole poter dire "sto scaricando la voce" prima
   * ancora che l'utente prema play.
   */
  async prepara(voceId: string): Promise<void> {
    if (this.sessione && this.voceCaricata === voceId) return;

    try {
      const mod = await this.caricaModulo();
      this.onStato?.({ fase: "scarico", percentuale: 0 });
      this.sessione = null;
      this.voceCaricata = null;

      this.sessione = await mod.TtsSession.create({
        voiceId: voceId,
        wasmPaths: this.percorsiWasm(),
        progress: ({ total, loaded }) => {
          const percentuale = total > 0 ? Math.round((loaded / total) * 100) : 0;
          this.onStato?.({ fase: "scarico", percentuale });
        },
      });

      await this.sessione.waitReady;
      this.voceCaricata = voceId;
      this.onStato?.({ fase: "pronto", percentuale: 100 });
    } catch (e) {
      // Esponiamo sempre la causa: "download non riuscito" e basta non è
      // diagnosticabile né per l'utente né per noi.
      this.sessione = null;
      this.voceCaricata = null;
      this.onStato?.({
        fase: "errore",
        percentuale: 0,
        messaggio: messaggioErrore(e),
      });
      throw e;
    }
  }

  async parla(
    testo: string,
    impostazioni: ImpostazioniVoce,
    cb?: CallbackSintesi
  ): Promise<void> {
    if (!this.disponibile()) {
      cb?.onErrore?.("La voce neurale non è disponibile in questo browser.");
      return;
    }

    this.ferma();
    this.interrotto = false;
    this.cbCorrente = cb ?? null;

    const voceId = impostazioni.voceId ?? VOCE_PIPER_PREDEFINITA;

    try {
      await this.prepara(voceId);
      if (this.interrotto) return;

      cb?.onInizio?.();

      // Piper non espone il boundary per parola: leggiamo l'intero testo e
      // simuliamo l'avanzamento in base al tempo di riproduzione, così
      // l'evidenziazione resta fluida.
      console.debug("[concorsofacile:voce] predict", { caratteri: testo.length });
      const blob = await this.sessione!.predict(testo);
      if (this.interrotto || !blob) return;
      console.debug("[concorsofacile:voce] audio pronto", { byte: blob.size, tipo: blob.type });

      const url = URL.createObjectURL(blob);
      this.urlCorrente = url;

      const audio = new Audio(url);
      this.audio = audio;
      // Piper non ha un parametro di velocità: usiamo il rate dell'elemento audio.
      audio.playbackRate = Math.min(2, Math.max(0.5, impostazioni.velocita ?? 1));
      audio.volume = Math.min(1, Math.max(0, impostazioni.volume ?? 1));

      const lunghezza = testo.length;
      // L'avanzamento dell'evidenziazione usa `requestAnimationFrame` invece di
      // `timeupdate`: quest'ultimo scatta ~4 volte al secondo e su alcuni
      // browser resta fermo finché l'audio non entra in `readyState >= 2`.
      const osserva = () => {
        if (!this.audio || this.audio !== audio) return;
        const durata = audio.duration;
        if (Number.isFinite(durata) && durata > 0) {
          const frazione = Math.min(1, audio.currentTime / durata);
          cb?.onParola?.(Math.floor(frazione * lunghezza), 0);
        }
        if (!audio.ended && !audio.paused) {
          this.rafCorrente = requestAnimationFrame(osserva);
        }
      };
      this.rafCorrente = requestAnimationFrame(osserva);
      audio.onended = () => {
        this.pulisciUrl();
        if (!this.interrotto) cb?.onFine?.();
      };
      audio.onerror = () => {
        this.pulisciUrl();
        cb?.onErrore?.("Riproduzione audio non riuscita.");
      };

      await audio.play();
    } catch (e) {
      const messaggio = messaggioErrore(e);
      this.onStato?.({ fase: "errore", percentuale: 0, messaggio });
      cb?.onErrore?.(messaggio);
    }
  }

  private pulisciUrl() {
    if (this.urlCorrente) {
      URL.revokeObjectURL(this.urlCorrente);
      this.urlCorrente = null;
    }
  }

  ferma(): void {
    this.interrotto = true;
    this.cbCorrente = null;
    if (this.rafCorrente !== null) {
      cancelAnimationFrame(this.rafCorrente);
      this.rafCorrente = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
    }
    this.pulisciUrl();
  }

  pausa(): void {
    this.audio?.pause();
  }

  riprendi(): void {
    void this.audio?.play();
  }

  chiudi(): void {
    this.ferma();
    this.sessione = null;
    this.voceCaricata = null;
  }
}

/** Estrae un messaggio leggibile da un errore di qualsiasi forma. */
function messaggioErrore(e: unknown): string {
  if (e instanceof Error) {
    // Gli errori di rete a volte hanno cause annidate più informative.
    const causa = (e as { cause?: unknown }).cause;
    if (causa instanceof Error && causa.message) {
      return `${e.message} (${causa.message})`;
    }
    return e.message || e.name;
  }
  if (typeof e === "string") return e;
  try {
    return JSON.stringify(e);
  } catch {
    return "Errore sconosciuto della voce neurale";
  }
}

/** `true` se il modello per quella voce è già stato scaricato in precedenza. */
export async function voceGiaScaricata(voceId: string): Promise<boolean> {
  if (typeof navigator === "undefined") return false;
  try {
    const mod = await import("@mintplex-labs/piper-tts-web");
    const salvate = await mod.stored();
    return salvate.includes(voceId as never);
  } catch {
    return false;
  }
}
