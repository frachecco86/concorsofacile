"use client";

import { useCallback, useRef } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Headphones,
  Loader2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { usePosizioneLettura, useSessioneAudio } from "@/lib/audio/sessione";
import { ScenaBlocco } from "./ScenaBlocco";
import { cn } from "@/lib/ui";

/** Velocità disponibili, come nel dock e nella barra. */
const VELOCITA = [1, 1.25, 1.5, 2] as const;

/**
 * Player a schermo intero (§3B).
 *
 * La modalità «in mobilità»: solo lo schema del blocco in corso, comandi grandi
 * e gesture da telefono. Non aggiunge capacità — legge la stessa sessione della
 * barra e del lettore — cambia il *grado di attenzione* che chiede.
 *
 * Gesture:
 * - **doppio tap** ovunque: play/pausa (è il gesto che si fa in tasca);
 * - **swipe orizzontale**: cambia capitolo, avanti a sinistra e indietro a
 *   destra, come un carosello;
 * - i **tasti capitolo** restano perché una gesture che non si vede non è
 *   accessibile a tutti.
 *
 * Il testo del blocco viene da `ScenaBlocco`, lo stesso componente della
 * modalità Ascolta: un solo posto da migliorare per entrambe.
 */
export function PlayerAudio() {
  const {
    schermoIntero,
    chiudiSchermoIntero,
    traccia,
    capitolo,
    lezione,
    bloccoAttivo,
    autoplay,
    setAutoplay,
    usaSilenzio,
    audio,
    velocita,
    inRiproduzione,
    inPreparazione,
    inCorso,
    alternaPausa,
    avvia,
    cambiaVelocita,
    bloccoSuccessivo,
    bloccoPrecedente,
    capitoloSuccessivo,
    capitoloPrecedente,
    riprendiDaParola,
    alternaAudio,
    interrompi,
  } = useSessioneAudio();
  const posizione = usePosizioneLettura();

  /**
   * Doppio tap senza dipendenze: due tocchi entro 320 ms. `touch-action:
   * manipulation` sul contenitore toglie lo zoom da doppio tap del browser,
   * che altrimenti si mangerebbe il gesto.
   */
  const ultimoTocco = useRef(0);
  /** Uno swipe in corso: il suo rilascio non è un tocco da contare. */
  const trascinato = useRef(false);
  const onTocco = useCallback(() => {
    if (trascinato.current) return;
    const ora = Date.now();
    if (ora - ultimoTocco.current < 320) {
      ultimoTocco.current = 0;
      alternaPausa();
      return;
    }
    ultimoTocco.current = ora;
  }, [alternaPausa]);

  /** Swipe orizzontale: avanti (a sinistra) e indietro (a destra). */
  const onSwipe = useCallback(
    (_: unknown, info: PanInfo) => {
      trascinato.current = true;
      ultimoTocco.current = 0;
      // Il tocco che chiude lo swipe non deve valere come metà doppio tap.
      window.setTimeout(() => {
        trascinato.current = false;
      }, 250);
      const soglia = 70;
      if (info.offset.x < -soglia || info.velocity.x < -450) capitoloSuccessivo();
      else if (info.offset.x > soglia || info.velocity.x > 450) capitoloPrecedente();
    },
    [capitoloSuccessivo, capitoloPrecedente]
  );

  const visibile = schermoIntero && capitolo !== undefined && bloccoAttivo !== null;

  return (
    <AnimatePresence>
      {visibile && traccia && lezione && capitolo && bloccoAttivo !== null && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 380, damping: 38 }}
          role="dialog"
          aria-modal="true"
          aria-label={`In ascolto: ${traccia.titolo}`}
          className="pt-safe pb-safe fixed inset-0 z-[70] flex flex-col bg-cream"
          style={{ touchAction: "manipulation" }}
        >
          {/* ══════════ INTESTAZIONE ══════════ */}
          <div className="flex items-center gap-2 px-3 py-2">
            <button
              type="button"
              onClick={chiudiSchermoIntero}
              aria-label="Riduci il player"
              className="tap inline-flex items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100"
            >
              <ChevronDown size={22} />
            </button>

            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[12.5px] font-semibold leading-tight">
                {lezione.materia}
              </p>
              <p className="tnum truncate text-[10.5px] text-ink-muted">
                Capitolo {traccia.indiceCapitolo}/{traccia.totaleCapitoli} · blocco{" "}
                {traccia.indiceBlocco}/{traccia.totaleBlocchi}
              </p>
            </div>

            <button
              type="button"
              onClick={interrompi}
              aria-label="Chiudi la lettura"
              className="tap inline-flex items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100"
            >
              <span className="text-[12px] font-bold">Chiudi</span>
            </button>
          </div>

          {/* ══════════ SCHEMA CENTRALE (swipe per cambiare capitolo) ══════════ */}
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.09}
            onDragEnd={onSwipe}
            onPointerUp={onTocco}
            className="flex min-h-0 flex-1 flex-col px-4"
          >
            <p className="mb-1 flex items-center justify-center gap-1.5 text-center text-[10.5px] uppercase tracking-[0.14em] text-brand-600">
              <Headphones size={11} />
              {inPreparazione ? "preparazione…" : usaSilenzio ? "lettura stimata" : "in ascolto"}
            </p>

            <ScenaBlocco
              blocco={capitolo.blocchi[bloccoAttivo]}
              indice={bloccoAttivo + 1}
              totale={capitolo.blocchi.length}
              posizione={posizione}
              evidenzia={inCorso}
              onParolaRipeti={!usaSilenzio ? riprendiDaParola : undefined}
            />
          </motion.div>

          {/* ══════════ COMANDI ══════════ */}
          <div className="px-4 pb-3">
            <div className="flex items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => bloccoPrecedente()}
                aria-label="Blocco precedente"
                className="tap inline-flex items-center justify-center rounded-full bg-sage-100 text-ink-soft transition hover:bg-sage-200 active:scale-95"
              >
                <SkipBack size={20} />
              </button>

              <button
                type="button"
                onClick={alternaPausa}
                aria-label={inRiproduzione ? "Pausa" : "Riproduci"}
                className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full
                           bg-voce-500 text-cream shadow-[var(--shadow-voce)] transition active:scale-95"
              >
                {inPreparazione ? (
                  <Loader2 size={28} className="animate-spin" />
                ) : inRiproduzione ? (
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" className="ml-1" />
                )}
              </button>

              <button
                type="button"
                onClick={() => bloccoSuccessivo()}
                aria-label="Blocco successivo"
                className="tap inline-flex items-center justify-center rounded-full bg-sage-100 text-ink-soft transition hover:bg-sage-200 active:scale-95"
              >
                <SkipForward size={20} />
              </button>
            </div>

            {/* Capitoli: la stessa cosa dello swipe, ma visibile e annunciabile */}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={capitoloPrecedente}
                className="tap-alto flex flex-1 items-center justify-center gap-1 rounded-full bg-sage-100
                           text-[12px] font-bold text-ink-soft transition hover:bg-sage-200"
              >
                <ChevronLeft size={15} />
                Capitolo
              </button>
              <button
                type="button"
                onClick={capitoloSuccessivo}
                className="tap-alto flex flex-1 items-center justify-center gap-1 rounded-full bg-sage-100
                           text-[12px] font-bold text-ink-soft transition hover:bg-sage-200"
              >
                Capitolo
                <ChevronRight size={15} />
              </button>
            </div>

            {/* Velocità */}
            <div className="mt-2 flex items-center gap-2">
              <span className="shrink-0 text-[10.5px] font-semibold uppercase tracking-wider text-ink-muted">
                Velocità
              </span>
              <div className="flex flex-1 gap-1" role="group" aria-label="Velocità di lettura">
                {VELOCITA.map((v) => {
                  const attiva = Math.abs(velocita - v) < 0.01;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => cambiaVelocita(v)}
                      aria-pressed={attiva}
                      className={cn(
                        "tnum flex-1 rounded-full py-2 text-[12px] font-bold transition",
                        attiva
                          ? "bg-voce-500 text-cream"
                          : "bg-voce-50 text-voce-700 hover:bg-voce-100"
                      )}
                    >
                      {v === 1 ? "1×" : `${v}×`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interruttori: audio, autoplay, blocco successivo automatico */}
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={alternaAudio}
                aria-pressed={audio}
                title={audio ? "Voce attiva" : "Silenzio"}
                className={cn(
                  "tap inline-flex items-center justify-center rounded-full border transition",
                  audio
                    ? "border-voce-300 bg-voce-50 text-voce-700"
                    : "border-sage-200 text-ink-muted"
                )}
              >
                {audio ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>

              <button
                type="button"
                onClick={() => setAutoplay((v) => !v)}
                aria-pressed={autoplay}
                className={cn(
                  "tap inline-flex items-center justify-center rounded-full border transition",
                  autoplay
                    ? "border-brand-400 bg-brand-50 text-brand-700"
                    : "border-sage-200 text-ink-muted"
                )}
                title="Lettura automatica dei blocchi"
              >
                <Repeat size={17} />
              </button>

              <button
                type="button"
                onClick={() => avvia(0)}
                className="tap-alto flex flex-1 items-center justify-center gap-1 rounded-full bg-sage-100
                           text-[12px] font-bold text-ink-soft transition hover:bg-sage-200"
              >
                <SkipBack size={14} />
                Dall&apos;inizio
              </button>
            </div>

            <p className="mt-2 text-center text-[10.5px] text-ink-muted">
              Doppio tocco per la pausa · scorri di lato per cambiare capitolo
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
