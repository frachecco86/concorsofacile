"use client";

import type { CallbackSintesi } from "./tipi";
import { chiaveRegistrazione } from "./chiave";
import { VOCE_REGISTRATA } from "./voce-registrata";
import dati from "./registrazioni.json";

/**
 * Le lezioni già registrate: si riproducono da file, senza sintesi.
 *
 * Perché: la voce neurale nel browser impiega 1–3 secondi a sintetizzare un
 * blocco e non può partire prima di averlo finito. Un file audio, invece,
 * comincia subito, funziona offline e non consuma CPU del telefono. Le
 * registrazioni nascono dallo stesso motore (Piper, voce Paola): chi ascolta
 * non sente il cambio di sorgente, sente solo che parte all'istante.
 *
 * Qui c'è tutto il lato client: la ricerca per impronta del testo e un
 * riproduttore con lo stesso contratto dei motori di sintesi (`CallbackSintesi`),
 * così il resto dell'app non sa da dove arriva l'audio.
 */

/** Una frase registrata: dove sta nel testo e dove sta nell'audio. */
export interface FraseRegistrata {
  /** Indice del primo carattere della frase nel testo piatto. */
  inizio: number;
  /** Indice dopo l'ultimo carattere. */
  fine: number;
  /** Inizio della frase nell'audio, in millisecondi di riproduzione. */
  daMs: number;
  /** Fine della frase nell'audio, in millisecondi di riproduzione. */
  aMs: number;
}

/** Un blocco registrato: il file e i tempi delle sue frasi. */
export interface Registrazione {
  /** Percorso pubblico del file, senza `basePath` (lo aggiunge il client). */
  file: string;
  /** Durata del blocco, in millisecondi. */
  durataMs: number;
  /** Tempi delle frasi: è ciò che rende esatta l'evidenziazione. */
  frasi: FraseRegistrata[];
}

/**
 * Il catalogo, scritto da `scripts/registra-voce.mjs`.
 * La chiave è l'impronta del testo letto: non c'è modo di servire l'audio di un
 * testo diverso da quello che si sta leggendo.
 */
const REGISTRAZIONI = dati as Record<string, Registrazione>;

/** `basePath` a runtime: su GitHub Pages l'app vive in una sottocartella. */
function conBase(percorso: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${percorso}`;
}

/** La registrazione di questo testo, se esiste. */
export function registrazionePer(testo: string): Registrazione | null {
  const chiave = chiaveRegistrazione(VOCE_REGISTRATA.id, testo);
  return REGISTRAZIONI[chiave] ?? null;
}

export function haRegistrazioni(): boolean {
  return Object.keys(REGISTRAZIONI).length > 0;
}

/**
 * Scalda la cache del browser con l'audio di un capitolo.
 *
 * I file pesano ~8 KB al secondo: un capitolo intero sta in poche centinaia di
 * kilobyte. Scaricarli quando il capitolo si apre significa che il tasto play
 * non deve aspettare nemmeno la rete — che è il punto di tutta la faccenda.
 * Fire-and-forget: se fallisce, il play scaricherà il file come al solito.
 */
export function precaricaRegistrazioni(testi: string[]): void {
  for (const testo of testi) {
    const reg = registrazionePer(testo);
    if (!reg) continue;
    void fetch(conBase(reg.file), { cache: "force-cache" }).catch(() => {
      /* niente rete adesso: si riproverà alla riproduzione */
    });
  }
}

interface Stato {
  audio: HTMLAudioElement | null;
  reg: Registrazione | null;
  cb: CallbackSintesi | null;
  raf: number | null;
  /** Ultima frase annunciata, per non ripetere lo stesso callback a ogni frame. */
  fraseCorrente: number;
  interrotto: boolean;
}

/**
 * Riproduttore delle registrazioni. Uno solo per sessione, come i motori di
 * sintesi: due audio insieme non hanno senso (e si sovrapporrebbero).
 */
class LettoreRegistrazioni {
  private stato: Stato = {
    audio: null,
    reg: null,
    cb: null,
    raf: null,
    fraseCorrente: -1,
    interrotto: false,
  };

  /** C'è una registrazione in riproduzione o in pausa. */
  attivo(): boolean {
    return this.stato.audio !== null;
  }

  suona(reg: Registrazione, velocita: number, cb?: CallbackSintesi): void {
    this.ferma();
    const s = this.stato;
    s.interrotto = false;
    s.cb = cb ?? null;
    s.reg = reg;
    s.fraseCorrente = -1;

    const audio = new Audio(conBase(reg.file));
    s.audio = audio;
    audio.preload = "auto";
    // La velocità è un moltiplicatore di lettura, non un cambio di voce: il
    // browser conserva il tono, quindi 1.25×/1.5×/2× funzionano sul file.
    audio.playbackRate = Math.min(3, Math.max(0.5, velocita));

    // `onplaying` e non `onplay`: dice che l'audio è partito davvero, ed è
    // quello che l'interfaccia deve mostrare.
    audio.onplaying = () => s.cb?.onInizio?.();
    audio.onended = () => {
      const cbCorrente = s.cb;
      this.ferma();
      if (!s.interrotto) cbCorrente?.onFine?.();
    };
    audio.onerror = () => {
      this.ferma();
      cb?.onErrore?.("Registrazione non riproducibile.");
    };

    /*
      Karaoke per frase. Il tempo di riproduzione è reale e i tempi delle frasi
      vengono dalla registrazione stessa: nessuna stima, nessuna deriva. Si
      annuncia solo il cambio di frase — un callback per frame sarebbe lavoro
      inutile per l'interfaccia.
    */
    const osserva = () => {
      if (s.audio !== audio) return;
      const ms = audio.currentTime * 1000;
      const i = fraseA(reg, ms);
      if (i !== s.fraseCorrente) {
        s.fraseCorrente = i;
        const frase = reg.frasi[i];
        if (frase) s.cb?.onParola?.(frase.inizio, frase.fine - frase.inizio);
      }
      if (!audio.ended && !audio.paused) s.raf = requestAnimationFrame(osserva);
    };
    s.raf = requestAnimationFrame(osserva);

    void audio.play().catch(() => cb?.onErrore?.("Riproduzione non riuscita."));
  }

  pausa(): void {
    this.stato.audio?.pause();
  }

  /**
   * Torna all'inizio della frase indicata, dentro la registrazione in corso.
   * È la granularità possibile: l'audio non si rigenera a metà frase.
   */
  riprendiDaFrase(indice: number): void {
    const s = this.stato;
    const frase = s.reg?.frasi[indice];
    if (!s.audio || !frase) return;
    s.fraseCorrente = -1;
    s.audio.currentTime = frase.daMs / 1000;
    if (s.audio.paused) void s.audio.play().catch(() => {});
  }

  riprendi(): void {
    void this.stato.audio?.play();
  }

  ferma(): void {
    const s = this.stato;
    s.interrotto = true;
    if (s.raf !== null) {
      cancelAnimationFrame(s.raf);
      s.raf = null;
    }
    if (s.audio) {
      s.audio.pause();
      s.audio.onplaying = null;
      s.audio.onended = null;
      s.audio.onerror = null;
      s.audio = null;
    }
    s.reg = null;
    s.cb = null;
    s.fraseCorrente = -1;
  }
}

/** Indice della frase che contiene questo istante dell'audio. */
function fraseA(reg: Registrazione, ms: number): number {
  for (let i = 0; i < reg.frasi.length; i++) {
    if (ms < (reg.frasi[i]?.aMs ?? 0)) return i;
  }
  return reg.frasi.length - 1;
}

export const lettoreRegistrazioni = new LettoreRegistrazioni();
