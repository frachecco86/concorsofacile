"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, Loader2, Pause, Play, X } from "lucide-react";
import { useSessioneAudio } from "@/lib/audio/sessione";
import { cn } from "@/lib/ui";

/** Velocità disponibili, come nel dock della lezione e nel player. */
const VELOCITA = [1, 1.25, 1.5, 2] as const;

/**
 * Barra audio flottante (§3C).
 *
 * Sta appena sopra la navigazione inferiore, nella zona del pollice, e resta
 * lì mentre si gira per l'app: la lezione continua a leggere anche cambiando
 * pagina, quindi il comando deve restare a portata di mano.
 *
 * Non è un secondo player: è il **telecomando** della sessione. Il tasto con
 * le cuffie apre il player a schermo intero, il titolo riporta al testo della
 * lezione, la velocità si sceglie senza entrare in niente. La velocità occupa
 * una riga sua perché quattro tasti accanto al titolo, su un telefono stretto,
 * diventerebbero quattro bersagli da 20px: qui ognuno è largo un quarto dello
 * schermo.
 *
 * Dove la barra non compare, e perché:
 *
 * - a schermo intero, dove sarebbe un doppione di se stessa;
 * - sul lettore in modalità Ascolta, che ha già il suo dock completo;
 * - quando non c'è un blocco aperto: una barra vuota è solo rumore.
 */
export function BarraAudio() {
  const {
    traccia,
    bloccoAttivo,
    barraVisibile,
    inRiproduzione,
    inPreparazione,
    velocita,
    alternaPausa,
    cambiaVelocita,
    interrompi,
    apriSchermoIntero,
  } = useSessioneAudio();

  const visibile = barraVisibile && traccia !== null && bloccoAttivo !== null;

  return (
    <AnimatePresence>
      {visibile && (
        <motion.div
          initial={{ y: 96, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 36 }}
          className="fixed inset-x-0 bottom-[calc(var(--h-barra-basso)+var(--safe-basso))] z-40
                     border-t border-voce-200 bg-cream/95 backdrop-blur-lg"
        >
          <div className="mx-auto max-w-5xl px-3 py-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={alternaPausa}
                aria-label={inRiproduzione ? "Pausa" : "Riproduci"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                           bg-voce-500 text-cream shadow-[var(--shadow-voce)] transition active:scale-95"
              >
                {inPreparazione ? (
                  <Loader2 size={19} className="animate-spin" />
                ) : inRiproduzione ? (
                  <Pause size={19} fill="currentColor" />
                ) : (
                  <Play size={19} fill="currentColor" className="ml-0.5" />
                )}
              </button>

              {/* Titolo: riporta al testo, che resta la casa della lezione */}
              <Link
                href={traccia.href}
                className="min-w-0 flex-1 rounded-xl px-1 py-1.5 transition hover:bg-sage-100"
              >
                <span className="block truncate text-[13px] font-semibold leading-tight">
                  {traccia.titolo}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-muted">
                  <span className="truncate">{traccia.materia}</span>
                  <span className="text-sage-300">·</span>
                  <span className="tnum shrink-0">
                    blocco {traccia.indiceBlocco}/{traccia.totaleBlocchi}
                  </span>
                </span>
              </Link>

              <button
                type="button"
                onClick={apriSchermoIntero}
                aria-label="Player a schermo intero"
                title="Schermo intero"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                           bg-voce-50 text-voce-700 transition hover:bg-voce-100"
              >
                <Headphones size={18} />
              </button>

              <button
                type="button"
                onClick={interrompi}
                aria-label="Chiudi la lettura"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full
                           text-ink-muted transition hover:bg-sage-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Velocità di lettura */}
            <div className="mt-1 flex items-center gap-2 pb-0.5">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
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
                        "tnum min-h-8 flex-1 rounded-full text-[11.5px] font-bold transition",
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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
