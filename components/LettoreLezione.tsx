"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  List as ListIcon,
} from "lucide-react";
import {
  testoCapitolo,
  testoBlocco,
  type Capitolo,
  type Lezione,
  type TipoBlocco,
} from "@/lib/dati/lezioni";
import { useVoce } from "@/lib/voce/hook";
import { PulsanteVoce, ControlliTrasporto } from "./PulsanteVoce";
import { slug } from "./slug";
import { cn } from "@/lib/ui";

/**
 * Lettore di mini-lezioni.
 *
 * Due modalità di ascolto, entrambe esplicite:
 * - **Capitolo intero**: la voce legge tutto di seguito.
 * - **Blocco per blocco**: ogni blocco ha il suo pulsante, per riascoltare
 *   solo un punto.
 *
 * I capitoli già ascoltati restano segnati: è una traccia di avanzamento
 * minima, senza account.
 */
export function LettoreLezione({ lezioni }: { lezioni: Lezione[] }) {
  const [lezioneIdx, setLezioneIdx] = useState(0);
  const [capIdx, setCapIdx] = useState(0);
  const [ascoltati, setAscoltati] = useState<Set<string>>(new Set());
  const { ferma, stato } = useVoce();

  const lezione = lezioni[lezioneIdx];
  const capitolo: Capitolo | undefined = lezione?.capitoli[capIdx];

  /** Chiave stabile per segnare un capitolo come ascoltato. */
  const chiaveCapitolo = lezione && capitolo ? `${lezione.materia}#${capitolo.numero}` : "";

  // Cambio capitolo o materia: la voce precedente va interrotta.
  useEffect(() => {
    ferma();
  }, [lezioneIdx, capIdx, ferma]);

  // Segna come ascoltato quando la voce finisce il capitolo intero.
  const segnaAscoltato = useCallback(() => {
    if (!chiaveCapitolo) return;
    setAscoltati((s) => new Set(s).add(chiaveCapitolo));
  }, [chiaveCapitolo]);

  const vaiA = useCallback(
    (dleta: number) => {
      if (!lezione) return;
      const prossimo = capIdx + dleta;
      if (prossimo >= 0 && prossimo < lezione.capitoli.length) {
        setCapIdx(prossimo);
        return;
      }
      // Fine della materia: passa alla successiva, se c'è.
      const prossimaLezione = lezioneIdx + 1;
      if (dleta > 0 && prossimaLezione < lezioni.length) {
        setLezioneIdx(prossimaLezione);
        setCapIdx(0);
      }
    },
    [lezione, capIdx, lezioneIdx, lezioni.length]
  );

  const totaleCapitoli = useMemo(
    () => lezioni.reduce((s, l) => s + l.capitoli.length, 0),
    [lezioni]
  );

  if (lezioni.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-10 text-center">
        <BookOpen size={30} className="mx-auto text-sage-400" />
        <p className="mt-3 font-medium text-ink-soft">
          Nessuna lezione disponibile per questo concorso.
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Le materie sono elencate nella home: i capitoli sono in preparazione.
        </p>
      </div>
    );
  }

  if (!lezione || !capitolo) return null;

  const fineMateria = capIdx === lezione.capitoli.length - 1;
  const fineTutto = fineMateria && lezioneIdx === lezioni.length - 1;

  return (
    <div className="space-y-6">
      {/* Barra: materia + avanzamento */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-700">
              Materia {lezioneIdx + 1} di {lezioni.length}
            </span>
            <span className="tnum text-xs text-ink-muted">
              capitolo {capIdx + 1}/{lezione.capitoli.length}
            </span>
          </div>
          <h2 className="mt-1.5 font-display text-xl font-semibold leading-tight">
            {lezione.materia}
          </h2>
        </div>
        <ControlliTrasporto />
      </div>

      {/* Selettore materia */}
      {lezioni.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {lezioni.map((l, i) => {
            const fatti = l.capitoli.filter((c) =>
              ascoltati.has(`${l.materia}#${c.numero}`)
            ).length;
            return (
              <button
                key={l.materia}
                type="button"
                onClick={() => {
                  setLezioneIdx(i);
                  setCapIdx(0);
                  // Porta l'attenzione al titolo della materia appena scelta.
                  document
                    .getElementById(`cap-${slug(l.materia)}`)
                    ?.scrollIntoView({ block: "start" });
                }}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-left text-xs font-semibold transition",
                  i === lezioneIdx
                    ? "border-brand-500 bg-brand-500 text-cream"
                    : "border-sage-200 bg-surface text-ink-soft hover:border-brand-300"
                )}
              >
                <span className="block max-w-[16rem] truncate">{l.materia}</span>
                <span
                  className={cn(
                    "tnum block text-[10px] font-medium",
                    i === lezioneIdx ? "text-brand-100" : "text-ink-muted"
                  )}
                >
                  {fatti}/{l.capitoli.length} ascoltati
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Ancore: rendono funzionanti i link dalla tendina della home. */}
      <span id={`cap-${slug(lezione.materia)}`} className="block scroll-mt-24" />
      <span
        id={`cap-${slug(lezione.materia)}-${capitolo.numero}`}
        className="block scroll-mt-24"
      />

      {/* Capitolo corrente */}
      <AnimatePresence mode="wait">
        <motion.article
          key={`${lezioneIdx}-${capIdx}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="paper-grain relative overflow-hidden rounded-[28px] border border-sage-200 bg-surface shadow-[var(--shadow-lift)]"
        >
          <div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-brand-400 to-brand-600" />

          <div className="relative p-6 pl-8 sm:p-8 sm:pl-10">
            <p className="tnum text-xs font-bold uppercase tracking-wider text-brand-600">
              Capitolo {capitolo.numero}
            </p>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-[28px]">
              {capitolo.titolo}
            </h3>

            {/* Ascolta tutto il capitolo */}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <PulsanteVoce
                testo={testoCapitolo(capitolo)}
                tag={chiaveCapitolo}
                dimensione="lg"
                etichetta="Ascolta il capitolo"
              />
              <span className="text-xs text-ink-muted">
                {capitolo.minuti.toFixed(1)} min ·{" "}
                {capitolo.blocchi.length} blocchi
              </span>
              {ascoltati.has(chiaveCapitolo) && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-leaf-100 px-2.5 py-1 text-[11px] font-bold text-leaf-600">
                  <Check size={12} strokeWidth={3} />
                  ascoltato
                </span>
              )}
            </div>

            {/* Blocchi */}
            <div className="mt-7 space-y-5">
              {capitolo.blocchi.map((b, i) => (
                <Blocco
                  key={i}
                  blocco={b}
                  indice={i + 1}
                  tag={`${chiaveCapitolo}#blocco-${i}`}
                  onFine={i === capitolo.blocchi.length - 1 ? segnaAscoltato : undefined}
                />
              ))}
            </div>
          </div>

          {/* Navigazione */}
          <div className="relative flex items-center justify-between gap-3 border-t border-sage-200 bg-sage-50/60 px-6 py-4 pl-8 sm:px-8 sm:pl-10">
            <button
              type="button"
              onClick={() => vaiA(-1)}
              disabled={lezioneIdx === 0 && capIdx === 0}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-ink-soft transition hover:bg-sage-100 disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft size={16} />
              Indietro
            </button>

            <span className="tnum hidden text-xs text-ink-muted sm:block">
              {ascoltati.size}/{totaleCapitoli} capitoli ascoltati
            </span>

            <button
              type="button"
              onClick={() => {
                if (fineTutto) segnaAscoltato();
                vaiA(1);
              }}
              disabled={fineTutto && ascoltati.has(chiaveCapitolo)}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-500 px-5 py-2.5 text-sm font-bold text-cream shadow-[var(--shadow-brand)] transition hover:bg-brand-600 disabled:pointer-events-none disabled:opacity-40"
            >
              {fineTutto ? "Concludi" : fineMateria ? "Materia successiva" : "Avanti"}
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.article>
      </AnimatePresence>

      {/* Se la voce sta leggendo, il testo si evidenzia nel blocco interessato */}
      {stato !== "idle" && (
        <p className="text-center text-xs text-ink-muted">
          La voce sta leggendo. Puoi fermarla o metterla in pausa dai controlli
          in alto.
        </p>
      )}
    </div>
  );
}

/** Un blocco di contenuto, con il suo pulsante di ascolto. */
function Blocco({
  blocco,
  indice,
  tag,
  onFine,
}: {
  blocco: TipoBlocco;
  indice: number;
  tag: string;
  onFine?: () => void;
}) {
  const { testoInLettura, stato, posizione } = useVoce();
  const testo = testoBlocco(blocco);
  const attivo = testoInLettura === testo && (stato === "speaking" || stato === "paused");

  // Il primo blocco porta il numero del blocco; gli altri no.
  const intestazione =
    blocco.tipo === "punti" && blocco.titolo
      ? blocco.titolo
      : blocco.tipo === "definizione"
        ? null
        : null;

  return (
    <div
      className={cn(
        "group/blocco relative rounded-2xl border p-4 transition",
        attivo
          ? "border-voce-300 bg-voce-50/60"
          : "border-transparent hover:border-sage-200 hover:bg-sage-50/50"
      )}
    >
      <div className="flex gap-3">
        <span className="mt-0.5 flex shrink-0 flex-col items-center gap-2">
          <span className="tnum flex h-6 w-6 items-center justify-center rounded-md bg-sage-100 text-[11px] font-bold text-ink-muted">
            {indice}
          </span>
        </span>

        <div className="min-w-0 flex-1">
          {intestazione && (
            <p className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
              <ListIcon size={14} className="text-brand-500" />
              {intestazione}
            </p>
          )}

          <ContenutoBlocco
            blocco={blocco}
            attivo={attivo}
            posizione={posizione}
          />
        </div>

        <div className="shrink-0">
          <PulsanteVoce testo={testo} tag={tag} dimensione="sm" />
        </div>
      </div>

      {/* `onFine` è usato dal lettore per segnare il capitolo; per ora il segna
          avviene a fine capitolo intero, non a fine blocco. */}
      <span hidden>{onFine ? "" : ""}</span>
    </div>
  );
}

function ContenutoBlocco({
  blocco,
  attivo,
  posizione,
}: {
  blocco: TipoBlocco;
  attivo: boolean;
  posizione: number;
}) {
  switch (blocco.tipo) {
    case "paragrafo":
      return (
        <p className="text-[15px] leading-relaxed text-ink-soft sm:text-base">
          <Evidenzia testo={blocco.testo} attivo={attivo} posizione={posizione} />
        </p>
      );

    case "definizione":
      return (
        <div className="rounded-xl border border-brand-200 bg-brand-50/70 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-700">
            {blocco.termine}
          </p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">
            <Evidenzia testo={blocco.testo} attivo={attivo} posizione={posizione} />
          </p>
        </div>
      );

    case "punti":
      return (
        <ul className="space-y-2">
          {blocco.voci.map((v, i) => (
            <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-soft">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
              />
              <span>{v}</span>
            </li>
          ))}
        </ul>
      );

    case "nota":
      return (
        <div className="flex gap-3 rounded-xl border border-sun-500/25 bg-sun-100/60 px-4 py-3">
          <Lightbulb size={16} className="mt-0.5 shrink-0 text-sun-600" />
          <p className="text-sm leading-relaxed text-ink-soft">
            <Evidenzia testo={blocco.testo} attivo={attivo} posizione={posizione} />
          </p>
        </div>
      );

    case "esempio":
      return (
        <div className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Esempio
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            <Evidenzia testo={blocco.testo} attivo={attivo} posizione={posizione} />
          </p>
        </div>
      );
  }
}

/** Evidenzia il tratto già letto, quando il blocco è in ascolto. */
function Evidenzia({
  testo,
  attivo,
  posizione,
}: {
  testo: string;
  attivo: boolean;
  posizione: number;
}) {
  if (!attivo) return <>{testo}</>;
  const taglio = Math.max(0, Math.min(posizione, testo.length));
  return (
    <>
      <span className="rounded bg-brand-100 text-ink">{testo.slice(0, taglio)}</span>
      <span>{testo.slice(taglio)}</span>
    </>
  );
}
