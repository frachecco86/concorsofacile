import { WebSpeechEngine } from "./web-speech";
import { PiperEngine, VOCE_PIPER_PREDEFINITA } from "./piper";
import type {
  CallbackSintesi,
  ImpostazioniVoce,
  MotoreVoce,
  OpzioneVoce,
} from "./tipi";

/**
 * Selettore del motore voce.
 *
 * ConcorsoFacile ha due sorgenti di voce e le tiene entrambe:
 *
 * - **Dispositivo** (`speechSynthesis`): istantanea, zero download. Ideale
 *   quando il sistema ha già voci italiane di qualità.
 * - **Neurale** (Piper, ONNX nel browser): modello scaricato una volta, poi
 *   voce identica su ogni dispositivo anche dove il sistema non ne ha nessuna.
 *   È l'unica opzione su Linux minimali e in molti browser desktop.
 *
 * La scelta è dell'utente e viene ricordata. Il motore attivo è sempre uno
 * solo: i pulsanti voce parlano con `MotoreVoce`, non con un'implementazione.
 */

export type IdMotore = "dispositivo" | "neurale";

export interface MotoreSelezionato {
  id: IdMotore;
  nome: string;
  descrizione: string;
}

export const MOTORI: MotoreSelezionato[] = [
  {
    id: "dispositivo",
    nome: "Voce del dispositivo",
    descrizione: "Immediata, nessun download. Dipende dalle voci installate nel sistema.",
  },
  {
    id: "neurale",
    nome: "Voce neurale (Piper)",
    descrizione:
      "Scaricata una volta (~63 MB), poi offline. Identica su ogni dispositivo.",
  },
];

/**
 * I motori accessibili all'utente. `motoreDiPreferenza` indica quale usare
 * quando la scelta salvata non è disponibile in questo ambiente.
 */
export class GestoreVoce {
  private dispositivo = new WebSpeechEngine();
  private neurale = new PiperEngine();
  private attivo: MotoreVoce;
  private idAttivo: IdMotore;

  constructor(preferito: IdMotore = "dispositivo") {
    const scelto = this.normalizzaPreferenza(preferito);
    this.idAttivo = scelto;
    this.attivo = scelto === "neurale" ? this.neurale : this.dispositivo;
  }

  /**
   * Sceglie il motore di partenza in modo onesto: se il dispositivo non ha
   * voci e la voce neurale è utilizzabile, si parte da quella. Altrimenti la
   * Web Speech API resta la scelta migliore perché non fa scaricare nulla.
   */
  private normalizzaPreferenza(preferito: IdMotore): IdMotore {
    if (preferito === "neurale" && this.neurale.disponibile()) return "neurale";
    if (preferito === "dispositivo" && this.dispositivo.disponibile()) {
      // Anche se `speechSynthesis` esiste, potrebbe avere zero voci.
      return "dispositivo";
    }
    if (this.neurale.disponibile()) return "neurale";
    if (this.dispositivo.disponibile()) return "dispositivo";
    return "dispositivo";
  }

  get id(): IdMotore {
    return this.idAttivo;
  }

  get corrente(): MotoreVoce {
    return this.attivo;
  }

  seleziona(id: IdMotore): void {
    if (id === this.idAttivo) return;
    // Interrompe ciò che sta leggendo il motore precedente.
    this.attivo.ferma();
    this.idAttivo = id;
    this.attivo = id === "neurale" ? this.neurale : this.dispositivo;
  }

  /**
   * Voci del motore attivo. Per il motore dispositivo, se non ci sono voci
   * italiane si segnala che la voce neurale è la strada giusta.
   */
  async voci(): Promise<OpzioneVoce[]> {
    return this.attivo.voci();
  }

  /** `true` se il motore dispositivo non ha voci: la voce neurale è l'unica. */
  async dispositivoSenzaVoci(): Promise<boolean> {
    if (!this.dispositivo.disponibile()) return true;
    const voci = await this.dispositivo.voci();
    return voci.length === 0;
  }

  /** Carica (con progresso) il modello neurale della voce indicata. */
  async preparaNeurale(
    voceId: string,
    onStato: (s: import("./piper").StatoModello) => void
  ): Promise<void> {
    this.neurale.onStato = onStato;
    await this.neurale.prepara(voceId);
  }

  parla(
    testo: string,
    impostazioni: ImpostazioniVoce,
    cb?: CallbackSintesi
  ): Promise<void> {
    return this.attivo.parla(testo, impostazioni, cb);
  }

  /**
   * Sintetizza in anticipo il prossimo brano.
   *
   * Ha senso solo per il motore neurale: la Web Speech API è già istantanea
   * e non ha nulla da preriscaldare. Se il motore attivo è il dispositivo,
   * la chiamata non fa nulla.
   */
  prefetch(testo: string, impostazioni: ImpostazioniVoce): void {
    if (this.idAttivo !== "neurale" || !testo.trim()) return;
    this.neurale.prefetch(testo, impostazioni.voceId ?? VOCE_PIPER_PREDEFINITA);
  }

  ferma(): void {
    this.dispositivo.ferma();
    this.neurale.ferma();
  }

  pausa(): void {
    this.attivo.pausa();
  }

  riprendi(): void {
    this.attivo.riprendi();
  }

  chiudi(): void {
    this.dispositivo.chiudi();
    this.neurale.chiudi();
  }

  /** Voci piper disponibili, esposte per la UI di selezione. */
  vociNeurali(): OpzioneVoce[] {
    return [
      {
        id: VOCE_PIPER_PREDEFINITA,
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
  }
}
