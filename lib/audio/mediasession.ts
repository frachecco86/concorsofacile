"use client";

import { useEffect, useRef } from "react";

/**
 * Integrazione con i comandi di sistema (direttive §3B).
 *
 * Quando la voce legge, il telefono deve mostrare la lezione nella schermata di
 * blocco e rispondere ai tasti delle cuffie, del cruscotto o dell'orologio.
 * Su web l'unico modo è la **MediaSession API**: metadati per il titolo e
 * gestori per le azioni. Niente audio vero in riproduzione — il suono lo
 * produce la sintesi vocale — ma il sistema non lo sa e non gli serve saperlo.
 *
 * Tutto è opzionale per costruzione: dove l'API non c'è (Safari vecchi, HTTP
 * non sicuro, browser da scrivania) le funzioni escono senza fare nulla e
 * l'app resta identica.
 */

/** `true` se la MediaSession è utilizzabile in questo ambiente. */
function mediaSessionDisponibile(): boolean {
  return (
    typeof navigator !== "undefined" &&
    "mediaSession" in navigator &&
    navigator.mediaSession !== null
  );
}

export interface AzioniSistema {
  riprendi: () => void;
  pausa: () => void;
  ferma: () => void;
  /** Blocco successivo (tasto "avanti" delle cuffie). */
  avanti: () => void;
  /** Blocco corrente dall'inizio (tasto "indietro"). */
  indietro: () => void;
  /** Capitolo successivo. */
  capitoloAvanti: () => void;
  /** Capitolo precedente. */
  capitoloIndietro: () => void;
}

export interface StatoMediaSession {
  titolo: string | null;
  artista: string | null;
  album: string | null;
  /** La lettura sta avanzando adesso. */
  inRiproduzione: boolean;
  /** C'è una lettura aperta, anche se in pausa. */
  inCorso: boolean;
  /** Durata stimata del blocco corrente, in millisecondi (0 se ignota). */
  durataMs: number;
  /** Posizione stimata nel blocco corrente, in millisecondi. */
  posizioneMs: number;
  azioni: AzioniSistema;
}

/** Le azioni che proviamo a registrare; il browser ignora quelle che non ha. */
const AZIONI: MediaSessionAction[] = [
  "play",
  "pause",
  "stop",
  "nexttrack",
  "previoustrack",
  "seekforward",
  "seekbackward",
];

/**
 * Tiene allineati schermata di blocco e comandi di sistema allo stato reale
 * della lettura. Le azioni vengono lette da un ref, così i gestori si
 * registrano una volta sola e non a ogni cambio di stato.
 */
export function useMediaSession({
  titolo,
  artista,
  album,
  inRiproduzione,
  inCorso,
  durataMs,
  posizioneMs,
  azioni,
}: StatoMediaSession): void {
  const azioniRef = useRef(azioni);
  useEffect(() => {
    azioniRef.current = azioni;
  });

  // ----------------------------------------------------------- metadati
  useEffect(() => {
    if (!mediaSessionDisponibile() || typeof MediaMetadata === "undefined") return;
    if (!titolo) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: titolo,
      artist: artista ?? "",
      album: album ?? "",
    });
  }, [titolo, artista, album]);

  // ------------------------------------------------------------- azioni
  useEffect(() => {
    if (!mediaSessionDisponibile()) return;
    const ms = navigator.mediaSession;

    /** `setActionHandler` lancia se l'azione non è supportata: la saltiamo. */
    const registra = (azione: MediaSessionAction, gestore: () => void) => {
      try {
        ms.setActionHandler(azione, gestore);
      } catch {
        /* azione non supportata da questo browser */
      }
    };

    registra("play", () => azioniRef.current.riprendi());
    registra("pause", () => azioniRef.current.pausa());
    registra("stop", () => azioniRef.current.ferma());
    registra("nexttrack", () => azioniRef.current.capitoloAvanti());
    registra("previoustrack", () => azioniRef.current.capitoloIndietro());
    // Il nostro "salto" è per blocchi, non a secondi: più onesto mappare
    // avanti/indietro sui blocchi che fingere un salto di 15 secondi.
    registra("seekforward", () => azioniRef.current.avanti());
    registra("seekbackward", () => azioniRef.current.indietro());

    return () => {
      for (const azione of AZIONI) {
        try {
          ms.setActionHandler(azione, null);
        } catch {
          /* niente da pulire */
        }
      }
    };
  }, []);

  // ------------------------------------------------------ stato di lettura
  useEffect(() => {
    if (!mediaSessionDisponibile()) return;
    navigator.mediaSession.playbackState = inRiproduzione
      ? "playing"
      : inCorso
        ? "paused"
        : "none";
  }, [inRiproduzione, inCorso]);

  // ------------------------------------------------------------ posizione
  /**
   * La barra di avanzamento del sistema si aggiorna al massimo una volta al
   * secondo: il karaoke cambia a ogni frame e non ha senso inseguirlo.
   */
  const ultimoAggiornamento = useRef(0);
  useEffect(() => {
    if (!mediaSessionDisponibile()) return;
    if (!inCorso || durataMs <= 0) return;
    const ora = Date.now();
    if (ora - ultimoAggiornamento.current < 900) return;
    ultimoAggiornamento.current = ora;

    const secondi = durataMs / 1000;
    const posizione = Math.max(0, Math.min(posizioneMs, durataMs)) / 1000;
    try {
      navigator.mediaSession.setPositionState({
        duration: secondi,
        position: posizione,
        playbackRate: 1,
      });
    } catch {
      /* posizione rifiutata (durata non valida): non è un problema */
    }
  }, [inCorso, durataMs, posizioneMs]);
}

/**
 * Tiene acceso lo schermo mentre la lezione va avanti (direttive §3B).
 *
 * Il blocco viene rilasciato dal sistema quando la pagina passa in secondo
 * piano: al ritorno va richiesto di nuovo, altrimenti il telefono si spegne a
 * metà capitolo. `wakeLock` esiste solo in contesti sicuri: altrove si prosegue
 * senza, come prima.
 */
export function useSchermoAcceso(attivo: boolean): void {
  useEffect(() => {
    if (!attivo || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;

    let annullato = false;
    let sentinella: WakeLockSentinel | null = null;

    const chiedi = async () => {
      if (annullato || sentinella) return;
      try {
        const nuova = await navigator.wakeLock.request("screen");
        if (annullato) {
          void nuova.release().catch(() => {});
          return;
        }
        sentinella = nuova;
        // Se il sistema lo rilascia da solo (batteria scarica), dimentichiamolo
        // per poterlo richiedere alla prossima occasione.
        nuova.addEventListener("release", () => {
          sentinella = null;
        });
      } catch {
        /* richiesta rifiutata o non supportata: si continua senza */
      }
    };

    void chiedi();
    const onVisibilita = () => {
      if (document.visibilityState === "visible") void chiedi();
    };
    document.addEventListener("visibilitychange", onVisibilita);

    return () => {
      annullato = true;
      document.removeEventListener("visibilitychange", onVisibilita);
      void sentinella?.release().catch(() => {});
      sentinella = null;
    };
  }, [attivo]);
}
