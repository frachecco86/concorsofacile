"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  List,
  Loader2,
  Pause,
  Play,
  Repeat,
  X,
} from "lucide-react";
import {
  testoBlocco,
  type Lezione,
  type TipoBlocco,
} from "@/lib/dati/lezioni";
import { useVoce } from "@/lib/voce/hook";
import { useStudio } from "@/lib/dati/studio";
import { cn } from "@/lib/ui";

/** Velocità selezionabili nel dock di ascolto. */
const VELOCITA = [1, 1.25, 1.5, 2] as const;

/**
 * Lettore di lezioni, ottimizzato per mobile.
 *
 * Architettura (modello "course player"):
 *
 * - **Barra del player fissa** in alto: capitolo corrente, avanzamento,
 *   play/pausa, autoplay. Non scrolla via.
 * - **Piano della lezione** a fisarmonica: si vede subito tutto il programma
 *   in poco spazio, senza padding inutile.
 * - **Autoplay**: legge il capitolo blocco per blocco e passa da solo al
 *   successivo, capitolo dopo capitolo. Pensato per l'ascolto passivo.
 * - **Dock di avanzamento**, visibile solo mentre si ascolta.
 */
export function LettoreLezione({
  lezioni,
  concorsoId,
}: {
  lezioni: Lezione[];
  concorsoId: string;
}) {
  const [lezioneIdx, setLezioneIdx] = useState(0);
  const [capIdx, setCapIdx] = useState(0);
  /** Indice del blocco in lettura; `null` quando la voce è ferma. */
  const [bloccoAttivo, setBloccoAttivo] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [pianoAperto, setPianoAperto] = useState(false);
  /**
   * Blocco attualmente in lettura, in un ref oltre che nello state.
   * L'autoplay ne ha bisogno *sincronamente* quando un blocco finisce:
   * leggere lo state lì darebbe un valore vecchio di un render.
   */
  const bloccoRef = useRef<number | null>(null);

  const { parla, ferma, stato, impostaFineLettura, prefetch, aggiorna, impostazioni } =
    useVoce();
  const { segnaCompletato, segnaAperto, completato, quantiCompletati, stato: studio } =
    useStudio();

  const lezione = lezioni[lezioneIdx];
  const capitolo = lezione?.capitoli[capIdx];

  /**
   * Vai a un capitolo specifico. È un **evento**, non una reazione: ferma la
   * voce, azzera il blocco in lettura e registra dove siamo. Gestirlo qui
   * evita un effect che reagisce al cambio di stato (e il render in più che
   * ne deriverebbe).
   */
  const vaiA = useCallback(
    (li: number, ci: number) => {
      ferma();
      bloccoRef.current = null;
      setBloccoAttivo(null);
      setLezioneIdx(li);
      setCapIdx(ci);
      const l = lezioni[li];
      const c = l?.capitoli[ci];
      if (l && c) segnaAperto(concorsoId, l.materia, c.numero);
    },
    [ferma, lezioni, concorsoId, segnaAperto]
  );

  /** Passa al capitolo successivo, cambiando materia se serve. */
  const capitoloSuccessivo = useCallback(() => {
    if (!lezione) return;
    if (capIdx + 1 < lezione.capitoli.length) {
      vaiA(lezioneIdx, capIdx + 1);
      return;
    }
    if (lezioneIdx + 1 < lezioni.length) {
      vaiA(lezioneIdx + 1, 0);
    }
  }, [lezione, capIdx, lezioneIdx, lezioni.length, vaiA]);

  /** Torna al capitolo precedente. */
  const capitoloPrecedente = useCallback(() => {
    if (capIdx > 0) {
      vaiA(lezioneIdx, capIdx - 1);
    } else if (lezioneIdx > 0) {
      const precedente = lezioni[lezioneIdx - 1];
      vaiA(lezioneIdx - 1, precedente.capitoli.length - 1);
    }
  }, [capIdx, lezioneIdx, lezioni, vaiA]);

  /**
   * Autoplay: quando un blocco finisce, legge il successivo.
   * A fine capitolo lo segna completato e passa avanti.
   */
  useEffect(() => {
    if (!autoplay || !capitolo || !lezione) {
      impostaFineLettura(null);
      return;
    }

    impostaFineLettura(() => {
      // Gli effetti collaterali (parlare, prefetch, segnare) stanno QUI,
      // non dentro un updater di stato: gli updater devono essere puri e
      // React può eseguirli due volte in modalità Strict.
      const prossimo = (bloccoRef.current ?? -1) + 1;

      if (prossimo < capitolo.blocchi.length) {
        bloccoRef.current = prossimo;
        setBloccoAttivo(prossimo);
        // Legge il blocco appena raggiunto e prepara quello dopo ancora.
        parla(testoBlocco(capitolo.blocchi[prossimo]), `auto-${prossimo}`);
        const ancora = capitolo.blocchi[prossimo + 1];
        if (ancora) prefetch(testoBlocco(ancora));
        return;
      }

      // Capitolo finito: prepara il primo blocco del capitolo successivo,
      // così il passaggio non ha attesa.
      const dopo = capitoloDopo(lezioni, lezioneIdx, capIdx);
      if (dopo) prefetch(testoBlocco(dopo.blocco));
      segnaCompletato(concorsoId, lezione.materia, capitolo.numero);
      bloccoRef.current = null;
      setBloccoAttivo(null);
      capitoloSuccessivo();
    });

    return () => impostaFineLettura(null);
  }, [
    autoplay,
    capitolo,
    lezione,
    concorsoId,
    parla,
    prefetch,
    impostaFineLettura,
    segnaCompletato,
    capitoloSuccessivo,
    lezioni,
    lezioneIdx,
    capIdx,
  ]);

  // Smontaggio: la voce è un sistema esterno da fermare. Nessun setState qui.
  useEffect(() => {
    return () => ferma();
  }, [lezioneIdx, capIdx, ferma]);

  const avvia = useCallback(
    (blocco: number) => {
      if (!capitolo || !lezione) return;
      setAutoplay(true);
      bloccoRef.current = blocco;
      setBloccoAttivo(blocco);
      segnaAperto(concorsoId, lezione.materia, capitolo.numero);
      parla(testoBlocco(capitolo.blocchi[blocco]), `auto-${blocco}`);
      // Prepara il blocco successivo: quando ci arriva, l'audio è già pronto.
      const prossimo = capitolo.blocchi[blocco + 1];
      if (prossimo) prefetch(testoBlocco(prossimo));
    },
    [capitolo, lezione, parla, prefetch, concorsoId, segnaAperto]
  );

  const alternaPausa = useCallback(() => {
    if (stato === "speaking") {
      setAutoplay(false);
      ferma();
    } else if (bloccoAttivo !== null) {
      avvia(bloccoAttivo);
    } else {
      avvia(0);
    }
  }, [stato, ferma, bloccoAttivo, avvia]);

  const statoCapitolo = useCallback(
    (materia: string, numero: number) =>
      completato(concorsoId, materia, numero) ? "fatto" : "da-fare",
    [completato, concorsoId]
  );

  if (lezioni.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-sage-300 bg-sage-50 p-4 text-sm text-ink-soft">
        Nessuna lezione disponibile per questo concorso.
      </p>
    );
  }

  if (!lezione || !capitolo) return null;

  const inAscolto = bloccoAttivo !== null && stato !== "idle";
  /**
   * La voce neurale impiega 1-3s a sintetizzare. In quel momento `stato` è
   * ancora "idle": senza un indicatore l'utente crede che non sia successo
   * nulla. Questo flag copre esattamente quella finestra.
   */
  const inPreparazione = bloccoAttivo !== null && stato === "idle";
  const progresso = ((capIdx + 1) / lezione.capitoli.length) * 100;

  return (
    <div className="pb-24">
      {/* ══════════ BARRA PLAYER (sticky) ══════════ */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-sage-200 bg-cream/95 px-3 py-2 backdrop-blur-lg sm:-mx-6 sm:top-16 sm:px-6">
        <div className="flex items-center gap-2.5">
          {/* Play / pausa: il controllo primario */}
          <button
            type="button"
            onClick={alternaPausa}
            aria-label={inAscolto ? "Pausa" : "Ascolta"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
              inAscolto
                ? "bg-voce-500 text-white shadow-[var(--shadow-voce)]"
                : "bg-brand-500 text-white shadow-[var(--shadow-brand)]"
            )}
          >
            {inPreparazione ? (
              <Loader2 size={17} className="animate-spin" />
            ) : inAscolto ? (
              <Pause size={17} fill="currentColor" />
            ) : (
              <Play size={17} fill="currentColor" className="ml-0.5" />
            )}
          </button>

          {/* Titolo del capitolo + avanzamento */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold leading-tight">
              {capitolo.titolo}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[10.5px] text-ink-muted">
              <span className="truncate">{lezione.materia}</span>
              <span className="text-sage-300">·</span>
              <span className="tnum shrink-0">
                {capIdx + 1}/{lezione.capitoli.length}
              </span>
            </p>
          </div>

          {/* Piano della lezione */}
          <button
            type="button"
            onClick={() => setPianoAperto((v) => !v)}
            aria-expanded={pianoAperto}
            aria-label="Piano della lezione"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
              pianoAperto
                ? "bg-brand-100 text-brand-700"
                : "text-ink-soft hover:bg-sage-100"
            )}
          >
            <List size={17} />
          </button>

          {/* Navigazione tra capitoli */}
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={capitoloPrecedente}
              disabled={lezioneIdx === 0 && capIdx === 0}
              aria-label="Capitolo precedente"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={capitoloSuccessivo}
              disabled={
                lezioneIdx === lezioni.length - 1 &&
                capIdx === lezione.capitoli.length - 1
              }
              aria-label="Capitolo successivo"
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Avanzamento nel capitolo */}
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-sage-200">
          <motion.div
            className="h-full rounded-full bg-brand-500"
            initial={false}
            animate={{ width: `${progresso}%` }}
            transition={{ type: "spring", stiffness: 280, damping: 34 }}
          />
        </div>
      </div>

      {/* ══════════ PIANO DELLA LEZIONE (a fisarmonica) ══════════ */}
      <AnimatePresence initial={false}>
        {pianoAperto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 max-h-[45dvh] space-y-0.5 overflow-y-auto rounded-xl border border-sage-200 bg-surface p-1.5">
              {lezioni.map((l, li) => {
                const fatti = quantiCompletati(concorsoId, l.materia);
                return (
                  <div key={l.materia}>
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[12px] font-bold">
                        {l.materia}
                      </span>
                      <span className="tnum shrink-0 text-[10px] text-ink-muted">
                        {fatti}/{l.capitoli.length}
                      </span>
                    </div>
                    {l.capitoli.map((c) => {
                      const attivo = li === lezioneIdx && c.numero === capitolo.numero;
                      return (
                        <button
                          key={c.numero}
                          type="button"
                          onClick={() => {
                            vaiA(li, c.numero - 1);
                            setPianoAperto(false);
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                            attivo ? "bg-brand-50" : "hover:bg-sage-50"
                          )}
                        >
                          {statoCapitolo(l.materia, c.numero) === "fatto" ? (
                            <Check
                              size={13}
                              strokeWidth={3}
                              className="shrink-0 text-leaf-500"
                            />
                          ) : (
                            <Circle size={13} className="shrink-0 text-sage-300" />
                          )}
                          <span
                            className={cn(
                              "min-w-0 flex-1 truncate text-[12px]",
                              attivo ? "font-semibold text-brand-700" : "text-ink-soft"
                            )}
                          >
                            {c.numero}. {c.titolo}
                          </span>
                          <span className="tnum shrink-0 text-[10px] text-ink-muted">
                            {c.minuti.toFixed(1)}′
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ CONTENUTO DEL CAPITOLO ══════════ */}
      <AnimatePresence mode="wait">
        <motion.article
          key={`${lezioneIdx}-${capIdx}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="mt-2"
        >
          <h1 className="font-display text-lg font-semibold leading-snug sm:text-xl">
            {capitolo.titolo}
          </h1>
          <p className="tnum mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-600">
            Capitolo {capitolo.numero} · {capitolo.minuti.toFixed(1)} min · {capitolo.blocchi.length} blocchi
          </p>

          {/* Blocchi, compatti */}
          <div className="mt-2 space-y-1.5">
            {capitolo.blocchi.map((b, i) => {
              const attivo = bloccoAttivo === i;
              return (
                <Blocco
                  key={i}
                  blocco={b}
                  indice={i + 1}
                  attivo={attivo}
                  inRiproduzione={attivo && stato === "speaking"}
                  evidenziaPosizione={attivo ? undefined : undefined}
                  onAscolta={() => avvia(i)}
                />
              );
            })}
          </div>
        </motion.article>
      </AnimatePresence>

      {/* ══════════ DOCK DI ASCOLTO ══════════ */}
      <AnimatePresence>
        {(inAscolto || inPreparazione) && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
            className="fixed inset-x-0 bottom-0 z-40 border-t border-voce-200 bg-cream/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-lg"
          >
            <div className="mx-auto max-w-3xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={alternaPausa}
                  aria-label={stato === "speaking" ? "Pausa" : "Riprendi"}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-voce-500 text-white shadow-[var(--shadow-voce)] active:scale-95"
                >
                  {stato === "speaking" ? (
                    <Pause size={18} fill="currentColor" />
                  ) : (
                    <Play size={18} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {lezione.materia}
                  </p>
                  <p className="tnum text-[11px] text-ink-muted">
                    {inPreparazione ? (
                      <span>preparazione…</span>
                    ) : (
                      <>
                        blocco {bloccoAttivo! + 1}/{capitolo.blocchi.length}
                      </>
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setAutoplay((v) => !v)}
                  aria-pressed={autoplay}
                  title="Riproduzione automatica"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
                    autoplay
                      ? "border-brand-400 bg-brand-50 text-brand-700"
                      : "border-sage-200 text-ink-muted"
                  )}
                >
                  <Repeat size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAutoplay(false);
                    ferma();
                    setBloccoAttivo(null);
                  }}
                  aria-label="Chiudi il lettore"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Velocità di lettura */}
              <div className="mt-2 flex items-center gap-2">
                <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                  Velocità
                </span>
                <div
                  className="flex flex-1 gap-1"
                  role="group"
                  aria-label="Velocità di lettura"
                >
                  {VELOCITA.map((v) => {
                    const attiva =
                      Math.abs(impostazioni.velocita - v) < 0.01;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => aggiorna({ velocita: v })}
                        aria-pressed={attiva}
                        className={cn(
                          "tnum flex-1 rounded-full py-1.5 text-[12px] font-bold transition",
                          attiva
                            ? "bg-voce-500 text-white"
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

      {/* Riprendi, se c'era un capitolo aperto in precedenza */}
      <Riprendi
        ultimo={studio.ultimo}
        concorsoId={concorsoId}
        lezioni={lezioni}
        corrente={{ materia: lezione.materia, capitolo: capitolo.numero }}
        onVai={(materia, numero) => {
          const li = lezioni.findIndex((l) => l.materia === materia);
          if (li >= 0) vaiA(li, numero - 1);
        }}
      />
    </div>
  );
}

/** Un blocco: riga compatta, niente padding inutile. */
function Blocco({
  blocco,
  indice,
  attivo,
  inRiproduzione,
  evidenziaPosizione,
  onAscolta,
}: {
  blocco: TipoBlocco;
  indice: number;
  attivo: boolean;
  inRiproduzione: boolean;
  evidenziaPosizione?: number;
  onAscolta: () => void;
}) {
  const { testoInLettura, posizione } = useVoce();
  const testo = testoBlocco(blocco);
  const evidenzia = inRiproduzione && testoInLettura === testo;

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition",
        attivo
          ? "border-voce-300 bg-voce-50"
          : "border-sage-200 bg-surface hover:border-sage-300"
      )}
    >
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onAscolta}
          aria-label={`Ascolta il blocco ${indice}`}
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition active:scale-95",
            attivo
              ? "bg-voce-500 text-white"
              : "bg-sage-100 text-ink-muted hover:bg-brand-100 hover:text-brand-700"
          )}
        >
          {inRiproduzione ? (
            <Pause size={12} fill="currentColor" />
          ) : (
            <Play size={12} fill="currentColor" className="ml-px" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          {blocco.tipo === "punti" && blocco.titolo && (
            <p className="mb-1 text-[13px] font-bold">{blocco.titolo}</p>
          )}
          {blocco.tipo === "definizione" && (
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-brand-700">
              {blocco.termine}
            </p>
          )}
          {blocco.tipo === "nota" && (
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-sun-600">
              Nota
            </p>
          )}
          {blocco.tipo === "esempio" && (
            <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
              Esempio
            </p>
          )}

          <Corpo
            blocco={blocco}
            evidenzia={evidenzia}
            posizione={posizione}
            evidenziaPosizione={evidenziaPosizione}
          />
        </div>
      </div>
    </div>
  );
}

function Corpo({
  blocco,
  evidenzia,
  posizione,
}: {
  blocco: TipoBlocco;
  evidenzia: boolean;
  posizione: number;
  evidenziaPosizione?: number;
}) {
  const t = (testo: string) =>
    evidenzia ? (
      <>
        <span className="rounded bg-brand-100 text-ink">
          {testo.slice(0, Math.min(posizione, testo.length))}
        </span>
        {testo.slice(Math.min(posizione, testo.length))}
      </>
    ) : (
      <>{testo}</>
    );

  if (blocco.tipo === "punti") {
    return (
      <ul className="space-y-1">
        {blocco.voci.map((v, i) => (
          <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
            <span
              aria-hidden="true"
              className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400"
            />
            <span>{v}</span>
          </li>
        ))}
      </ul>
    );
  }

  const testo =
    blocco.tipo === "paragrafo" ||
    blocco.tipo === "definizione" ||
    blocco.tipo === "nota" ||
    blocco.tipo === "esempio"
      ? blocco.testo
      : "";

  return (
    <p className="text-[13.5px] leading-snug text-ink-soft">{t(testo)}</p>
  );
}

/** Invito a riprendere l'ultimo capitolo, discreto. */
function Riprendi({
  ultimo,
  concorsoId,
  lezioni,
  corrente,
  onVai,
}: {
  ultimo: { concorsoId: string; materia: string; capitolo: number } | null;
  concorsoId: string;
  lezioni: Lezione[];
  corrente: { materia: string; capitolo: number };
  onVai: (materia: string, numero: number) => void;
}) {
  const [nascosto, setNascosto] = useState(false);

  const pertinente =
    !nascosto &&
    !!ultimo &&
    ultimo.concorsoId === concorsoId &&
    !(ultimo.materia === corrente.materia && ultimo.capitolo === corrente.capitolo) &&
    lezioni.some((l) => l.materia === ultimo!.materia);

  if (!pertinente || !ultimo) return null;

  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5">
      <span className="min-w-0 flex-1 text-[12px]">
        <b className="font-semibold">Riprendi</b> da {ultimo.materia}, capitolo{" "}
        {ultimo.capitolo}.
      </span>
      <button
        type="button"
        onClick={() => onVai(ultimo.materia, ultimo.capitolo)}
        className="shrink-0 rounded-full bg-brand-500 px-3.5 py-1.5 text-[12px] font-bold text-cream"
      >
        Vai
      </button>
      <button
        type="button"
        onClick={() => setNascosto(true)}
        aria-label="Chiudi"
        className="shrink-0 text-ink-muted"
      >
        <X size={15} />
      </button>
    </div>
  );
}

/**
 * Il capitolo che segue quello indicato, se esiste.
 * Serve a preriscaldare l'audio del capitolo successivo senza duplicare
 * la logica di avanzamento.
 */
function capitoloDopo(
  lezioni: Lezione[],
  lezioneIdx: number,
  capIdx: number
): { materia: string; numero: number; blocco: TipoBlocco } | null {
  const lezione = lezioni[lezioneIdx];
  if (!lezione) return null;

  const stesso = lezione.capitoli[capIdx + 1];
  if (stesso) {
    return {
      materia: lezione.materia,
      numero: stesso.numero,
      blocco: stesso.blocchi[0],
    };
  }

  const prossimaLezione = lezioni[lezioneIdx + 1];
  const primo = prossimaLezione?.capitoli[0];
  if (prossimaLezione && primo) {
    return {
      materia: prossimaLezione.materia,
      numero: primo.numero,
      blocco: primo.blocchi[0],
    };
  }

  return null;
}
