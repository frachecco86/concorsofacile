import type {
  CallbackSintesi,
  ImpostazioniVoce,
  MotoreVoce,
  OpzioneVoce,
} from "./tipi";

/**
 * Motore basato sulla Web Speech API (`speechSynthesis`).
 *
 * Vantaggi: zero download, zero costi, voci italiane native, latenza bassa.
 * Limiti: la qualità dipende dal sistema operativo e il comportamento di
 * pausa/ripresa varia tra browser (in alcuni il resume è inaffidabile).
 *
 * È il motore predefinito perché rende l'app immediatamente utilizzabile:
 * il quiz è leggibile entro pochi millisecondi dal click.
 */
export class WebSpeechEngine implements MotoreVoce {
  readonly nome = "Voce del dispositivo";
  private vociCache: SpeechSynthesisVoice[] | null = null;
  private vociInAttesa: Promise<SpeechSynthesisVoice[]> | null = null;
  private utteranceCorrente: SpeechSynthesisUtterance | null = null;
  private cbCorrente: CallbackSintesi | null = null;
  private interrotto = false;

  disponibile(): boolean {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof window.SpeechSynthesisUtterance !== "undefined"
    );
  }

  /**
   * Le voci possono popolarsi in modo asincrono (Chrome le carica dopo il
   * primo `voiceschanged`). Aspettiamo con un timeout di sicurezza.
   */
  private async caricaVoci(): Promise<SpeechSynthesisVoice[]> {
    if (!this.disponibile()) return [];
    if (this.vociCache && this.vociCache.length > 0) return this.vociCache;
    if (this.vociInAttesa) return this.vociInAttesa;

    const synth = window.speechSynthesis;

    this.vociInAttesa = new Promise<SpeechSynthesisVoice[]>((resolve) => {
      const leggi = () => synth.getVoices();

      const immediate = leggi();
      if (immediate.length > 0) {
        this.vociCache = immediate;
        resolve(immediate);
        return;
      }

      let risolto = false;
      const completa = () => {
        if (risolto) return;
        risolto = true;
        synth.removeEventListener("voiceschanged", completa);
        const voci = leggi();
        this.vociCache = voci;
        resolve(voci);
      };

      synth.addEventListener("voiceschanged", completa);
      // Alcuni browser non emettono mai l'evento: non blocchiamo la UI.
      window.setTimeout(completa, 1500);
    });

    const voci = await this.vociInAttesa;
    this.vociInAttesa = null;
    return voci;
  }

  async voci(): Promise<OpzioneVoce[]> {
    const voci = await this.caricaVoci();
    return voci.map((v) => {
      const italiana = v.lang?.toLowerCase().startsWith("it");
      return {
        id: v.voiceURI,
        nome: v.name,
        lingua: v.lang,
        italiana,
        // `localService` è una buona approssimazione di qualità/reattività.
        qualita: v.localService ? "media" : "base",
        motore: this.nome,
      } satisfies OpzioneVoce;
    });
  }

  private trovaVoce(id: string | null): SpeechSynthesisVoice | undefined {
    if (!id) return undefined;
    return (this.vociCache ?? window.speechSynthesis.getVoices()).find(
      (v) => v.voiceURI === id
    );
  }

  async parla(
    testo: string,
    impostazioni: ImpostazioniVoce,
    cb?: CallbackSintesi
  ): Promise<void> {
    if (!this.disponibile()) {
      cb?.onErrore?.("La sintesi vocale non è disponibile in questo browser.");
      return;
    }
    if (!testo.trim()) return;

    this.ferma();
    // `ferma()` imposta interrotto: lo azzeriamo per questa nuova lettura.
    this.interrotto = false;
    this.cbCorrente = cb ?? null;

    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(testo);
    const voce = this.trovaVoce(impostazioni.voceId);
    if (voce) {
      u.voice = voce;
      u.lang = voce.lang;
    } else {
      u.lang = "it-IT";
    }
    u.rate = clamp(impostazioni.velocita, 0.5, 3);
    u.pitch = clamp(impostazioni.tono, 0, 2);
    u.volume = clamp(impostazioni.volume, 0, 1);

    u.onstart = () => cb?.onInizio?.();
    u.onend = () => {
      if (!this.interrotto) cb?.onFine?.();
    };
    u.onerror = (e) => {
      // "interrupted"/"canceled" sono normali quando si ferma la lettura.
      if (e.error === "interrupted" || e.error === "canceled") return;
      cb?.onErrore?.(e.error || "Errore di sintesi");
    };
    u.onboundary = (e) => {
      if (e.name === "word") cb?.onParola?.(e.charIndex, e.charLength ?? 0);
    };

    this.utteranceCorrente = u;
    synth.speak(u);
  }

  ferma(): void {
    if (!this.disponibile()) return;
    this.interrotto = true;
    this.cbCorrente = null;
    this.utteranceCorrente = null;
    window.speechSynthesis.cancel();
  }

  pausa(): void {
    if (!this.disponibile()) return;
    window.speechSynthesis.pause();
  }

  riprendi(): void {
    if (!this.disponibile()) return;
    window.speechSynthesis.resume();
  }

  chiudi(): void {
    this.ferma();
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
