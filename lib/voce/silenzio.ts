"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { millisecondiStimati, paroleBlocco, type ParolaTesto } from "@/lib/dati/lezioni";

/**
 * Voce silenziosa: un timer che simula la lettura.
 *
 * Serve a due casi, entrambi legittimi:
 * 1. l'utente ha scelto il silenzio: vuole leggere, non ascoltare;
 * 2. la voce non è disponibile in questo ambiente.
 *
 * Espone la stessa `posizione` (indice carattere) della voce reale, così il
 * karaoke e l'avanzamento automatico funzionano identici: la scena non sa da
 * dove arriva la posizione. La velocità moltiplica il ritmo delle parole.
 */

const INTERVALLO_PAROLA = 60_000 / 150; // 400 ms a 1×, coerente con `stimaMinuti`

export interface VoceSilenziosa {
  /** Indice carattere della parola in corso, come la voce reale. */
  posizione: number;
  /** `true` mentre il timer scorre (non in pausa). */
  attivo: boolean;
  inPausa: boolean;
  avvia: (testo: string, velocita?: number) => void;
  pausa: () => void;
  riprendi: () => void;
  ferma: () => void;
}

export function useVoceSilenziosa(onFine?: () => void): VoceSilenziosa {
  const paroleRef = useRef<ParolaTesto[]>([]);
  const durataRef = useRef(0);
  const inizioRef = useRef(0);
  const trascorsoRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const fineRef = useRef(onFine);

  const [posizione, setPosizione] = useState(0);
  const [attivo, setAttivo] = useState(false);
  const [inPausa, setInPausa] = useState(false);
  /**
   * Numero di sessione di lettura. Avanza a ogni `avvia`/`riprendi` ed è la
   * dipendenza dell'animazione: quando un blocco finisce e ne parte subito un
   * altro, `attivo` resta `true` (React raggruppa gli aggiornamenti) e un
   * effetto su `attivo` non ripartirebbe. La sessione invece cambia sempre.
   */
  const [sessione, setSessione] = useState(0);

  useEffect(() => {
    fineRef.current = onFine;
  }, [onFine]);

  const annullaRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const ferma = useCallback(() => {
    annullaRaf();
    setAttivo(false);
    setInPausa(false);
    setPosizione(0);
  }, [annullaRaf]);

  const avvia = useCallback(
    (testo: string, velocita = 1) => {
      annullaRaf();
      const parole = paroleBlocco(testo);
      paroleRef.current = parole;
      // Il tempo totale segue la stima ufficiale: se la formula cambia, il
      // timer cambia con lei, senza costanti parallele da tenere allineate.
      durataRef.current = Math.max(INTERVALLO_PAROLA, millisecondiStimati(testo, velocita));
      inizioRef.current = performance.now();
      trascorsoRef.current = 0;
      setPosizione(0);
      setInPausa(false);
      setAttivo(true);
      setSessione((s) => s + 1);
    },
    [annullaRaf]
  );

  // Una sola animazione per sessione. `pausa` e `ferma` la interrompono
  // annullando il rAF; `riprendi` apre una sessione nuova.
  useEffect(() => {
    if (paroleRef.current.length === 0) return;

    const passo = () => {
      const parole = paroleRef.current;
      const totale = durataRef.current;
      const t = trascorsoRef.current + (performance.now() - inizioRef.current);

      if (t >= totale) {
        setPosizione(parole[parole.length - 1].fine);
        annullaRaf();
        setAttivo(false);
        setInPausa(false);
        fineRef.current?.();
        return;
      }

      // Indice della parola in corso: la posizione è il suo inizio, così il
      // karaoke evidenzia una parola intera e l'avanzamento è a scatti netti.
      const i = Math.min(parole.length - 1, Math.floor((t / totale) * parole.length));
      setPosizione(parole[i].inizio);
      rafRef.current = requestAnimationFrame(passo);
    };

    rafRef.current = requestAnimationFrame(passo);
    return annullaRaf;
  }, [sessione, annullaRaf]);

  const pausa = useCallback(() => {
    if (rafRef.current !== null) {
      trascorsoRef.current += performance.now() - inizioRef.current;
      inizioRef.current = performance.now();
    }
    annullaRaf();
    setInPausa(true);
    setAttivo(false);
  }, [annullaRaf]);

  const riprendi = useCallback(() => {
    inizioRef.current = performance.now();
    setInPausa(false);
    setAttivo(true);
    setSessione((s) => s + 1);
  }, []);

  // L'oggetto è memoizzato: i consumatori possono metterlo fra le proprie
  // dipendenze (ed effetti/cleanup) senza riattivarsi a ogni render.
  return useMemo<VoceSilenziosa>(
    () => ({ posizione, attivo, inPausa, avvia, pausa, riprendi, ferma }),
    [posizione, attivo, inPausa, avvia, pausa, riprendi, ferma]
  );
}
