"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Eye, RotateCcw, X } from "lucide-react";
import type { Quiz } from "@/lib/dati/tipi";
import { useVoce } from "@/lib/voce/hook";
import { PulsanteVoce } from "./PulsanteVoce";

type Fase = "domanda" | "risposta";

/**
 * Una card di studio: la domanda in grande, il pulsante voce accanto, la
 * risposta che si rivela. Quando la voce legge, il testo si evidenzia
 * parola per parola grazie all'evento `boundary` del motore.
 */
export function CardQuiz({
  quiz,
  indice,
  totale,
  onRisultato,
  onAvanti,
  onIndietro,
  puoIndietro,
}: {
  quiz: Quiz;
  indice: number;
  totale: number;
  onRisultato: (saputa: boolean) => void;
  onAvanti: () => void;
  onIndietro: () => void;
  puoIndietro: boolean;
}) {
  const [fase, setFase] = useState<Fase>("domanda");
  const { parla, ferma, stato, testoInLettura, posizione } = useVoce();

  const chiave = `quiz-${quiz.numero}`;

  /**
   * Il tempo di risposta parte quando la domanda appare. `Date.now()` va
   * letto in un effect (non durante il render: sarebbe impuro e instabile
   * tra render dello stesso componente).
   */
  const inizioRef = useRef(0);
  useEffect(() => {
    inizioRef.current = Date.now();
    // Interrompe la lettura quando la card lascia la schermata.
    return () => ferma();
  }, [quiz.numero, ferma]);

  /** Testo completo letto dalla voce: domanda e, in fase risposta, la soluzione. */
  const testoLetto = useMemo(() => {
    if (fase === "risposta") {
      return `${quiz.domanda} ... Risposta esatta: ${quiz.risposta}`;
    }
    return quiz.domanda;
  }, [fase, quiz.domanda, quiz.risposta]);

  // Autoplay quando appare un nuovo quiz (la voce è l'anima dell'app).
  useEffect(() => {
    const t = window.setTimeout(() => parla(testoLetto, chiave), 250);
    return () => window.clearTimeout(t);
    // `parla` cambia con le impostazioni: rivogliamo leggere solo al nuovo quiz/fase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.numero, fase]);

  const rivela = useCallback(() => {
    setFase("risposta");
    ferma();
  }, [ferma]);

  const rispondi = useCallback(
    (saputa: boolean) => {
      const tempo = Date.now() - inizioRef.current;
      ferma();
      onRisultato(saputa);
      void tempo;
      onAvanti();
    },
    [ferma, onRisultato, onAvanti]
  );

  // Scorriatoi da tastiera: 1 = la so, 2 = da rivedere, spazio = rivela.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (fase === "domanda") rivela();
        else rispondi(true);
      } else if (e.key === "1" && fase === "risposta") rispondi(true);
      else if (e.key === "2" && fase === "risposta") rispondi(false);
      else if (e.key === "r") parla(testoLetto, chiave);
      else if (e.key === "ArrowRight" && fase === "risposta") rispondi(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fase, rivela, rispondi, parla, testoLetto, chiave]);

  const leggendo =
    testoInLettura === testoLetto && (stato === "speaking" || stato === "paused");

  return (
    <div className="relative">
      {/* Barra progresso sessione */}
      <div className="mb-5 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sage-200">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
            initial={false}
            animate={{ width: `${((indice + 1) / totale) * 100}%` }}
            transition={{ type: "spring", stiffness: 260, damping: 34 }}
          />
        </div>
        <span className="tnum shrink-0 text-sm font-semibold text-ink-muted">
          {indice + 1}
          <span className="text-sage-400"> / {totale}</span>
        </span>
      </div>

      <div className="paper-grain relative overflow-hidden rounded-[28px] border border-sage-200 bg-surface shadow-[var(--shadow-lift)]">
        {/* Banda laterale arancione: identità della card */}
        <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-400 to-brand-600" />

        <div className="relative p-6 pl-8 sm:p-9 sm:pl-11">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${quiz.numero}-${fase}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mb-4 flex items-center gap-3">
                <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                  Domanda {quiz.numero}
                </span>
                {quiz.gruppo > 0 && (
                  <span className="rounded-full bg-sage-100 px-3 py-1 text-[11px] font-semibold text-ink-muted">
                    Argomento {quiz.gruppo}
                  </span>
                )}
              </div>

              <TestoLettura
                testo={quiz.domanda}
                attivo={leggendo && fase === "domanda"}
                posizione={posizione}
                className="font-display text-2xl font-medium leading-[1.4] text-ink sm:text-[28px]"
              />

              <div className="mt-5 flex items-center gap-3">
                <PulsanteVoce
                  testo={testoLetto}
                  tag={chiave}
                  dimensione="lg"
                  etichetta={fase === "domanda" ? "Ascolta la domanda" : "Ascolta tutto"}
                />
                <button
                  type="button"
                  onClick={() => parla(testoLetto, chiave)}
                  aria-label="Rileggi dall'inizio"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sage-200 text-ink-muted transition hover:border-brand-300 hover:text-brand-600 active:scale-95"
                >
                  <RotateCcw size={17} />
                </button>
              </div>

              {/* Risposta */}
              <AnimatePresence>
                {fase === "risposta" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: "auto", marginTop: 24 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="rounded-2xl border border-voce-200 bg-voce-50/70 p-5">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-voce-700">
                          <Check size={14} strokeWidth={3} />
                          Risposta esatta
                        </span>
                        <PulsanteVoce
                          testo={quiz.risposta}
                          tag={`risp-${quiz.numero}`}
                          dimensione="sm"
                        />
                      </div>
                      <TestoLettura
                        testo={quiz.risposta}
                        attivo={
                          stato === "speaking" &&
                          testoInLettura === quiz.risposta &&
                          false
                        }
                        posizione={posizione}
                        className="text-lg font-medium leading-relaxed text-ink sm:text-xl"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Azioni */}
        <div className="relative border-t border-sage-200 bg-sage-50/60 px-6 py-5 pl-8 sm:px-9 sm:pl-11">
          <AnimatePresence mode="wait">
            {fase === "domanda" ? (
              <motion.div
                key="azioni-domanda"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={rivela}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-600 active:scale-[0.98] sm:flex-none"
                >
                  <Eye size={18} strokeWidth={2.4} />
                  Mostra la risposta
                </button>
                <span className="hidden text-xs text-ink-muted sm:block">
                  oppure premi <Tasto>Spazio</Tasto>
                </span>
                {puoIndietro && (
                  <button
                    type="button"
                    onClick={onIndietro}
                    className="ml-auto rounded-full px-4 py-2 text-sm font-medium text-ink-muted transition hover:bg-sage-100 hover:text-ink"
                  >
                    Indietro
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="azioni-risposta"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-wrap items-center gap-3"
              >
                <button
                  type="button"
                  onClick={() => rispondi(false)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-sun-500/30 bg-sun-100 px-5 py-3 text-sm font-bold text-sun-500 transition hover:border-sun-500/60 active:scale-[0.98]"
                >
                  <X size={17} strokeWidth={2.6} />
                  Da rivedere
                  <Tasto>2</Tasto>
                </button>
                <button
                  type="button"
                  onClick={() => rispondi(true)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-leaf-500 px-5 py-3 text-sm font-bold text-white shadow-[0_8px_24px_rgba(47,158,68,0.26)] transition hover:bg-leaf-600 active:scale-[0.98]"
                >
                  <Check size={17} strokeWidth={2.8} />
                  La sapevo
                  <Tasto>1</Tasto>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Tasto({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="ml-1 hidden rounded-md border border-current/25 bg-current/10 px-1.5 py-0.5 text-[10px] font-bold opacity-80 sm:inline-block">
      {children}
    </kbd>
  );
}

/**
 * Testo che si evidenzia mentre viene letto.
 * `posizione` è l'indice del carattere raggiunto dalla voce: dividiamo il
 * testo in "già letto" e "da leggere".
 */
function TestoLettura({
  testo,
  attivo,
  posizione,
  className,
}: {
  testo: string;
  attivo: boolean;
  posizione: number;
  className?: string;
}) {
  if (!attivo) return <p className={className}>{testo}</p>;

  const taglio = Math.max(0, Math.min(posizione, testo.length));
  const letto = testo.slice(0, taglio);
  const resto = testo.slice(taglio);

  return (
    <p className={className} aria-live="polite">
      <span className="rounded bg-brand-100/70 text-ink">{letto}</span>
      <span className="text-ink-soft/70">{resto}</span>
    </p>
  );
}
