"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  FileText,
  Headphones,
  List,
  Loader2,
  Maximize2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { componiBlocco, type Capitolo, type Lezione, type TipoBlocco } from "@/lib/dati/lezioni";
import { fraseA, frasiConOffset } from "@/lib/frasi";
import { useStudio } from "@/lib/dati/studio";
import { useModalitaLettore } from "@/lib/lettore/modalita";
import { usePosizioneLettura, useSessioneAudio } from "@/lib/audio/sessione";
import { slug } from "@/lib/slug";
import { ScenaBlocco } from "./ScenaBlocco";
import { cn, durata } from "@/lib/ui";

/** Velocità selezionabili nel dock di ascolto. */
const VELOCITA = [1, 1.25, 1.5, 2] as const;

/**
 * Lettore di lezioni, ottimizzato per mobile: la **vista**.
 *
 * Due modalità dello stesso capitolo:
 *
 * - **Leggi**: la lista di blocchi impilati, per consultare e rileggere.
 * - **Ascolta**: una scena con un blocco alla volta e i comandi. La lettura
 *   avanza da sola, parola per parola (karaoke), con la voce oppure — se
 *   l'audio è spento o assente — con un timer stimato.
 *
 * La macchina a stati — blocco attivo, autoplay, karaoke, voce o timer — vive
 * in `lib/audio/sessione.tsx`, montata nel layout: così l'ascolto non si spegne
 * uscendo dalla pagina e la barra flottante può pilotarlo da qualsiasi schermata.
 * Qui resta ciò che si vede: scena, lista, dock e piano della lezione.
 */
export function LettoreLezione({
  lezioni,
  concorsoId,
}: {
  lezioni: Lezione[];
  concorsoId: string;
}) {
  const [pianoAperto, setPianoAperto] = useState(false);
  const { modalita, cambiaModalita } = useModalitaLettore();
  const { completato, quantiCompletati, stato: studio } = useStudio();
  /** Posizione del karaoke: contesto separato, cambia a ogni frame. */
  const posizione = usePosizioneLettura();

  const {
    concorsoId: concorsoInSessione,
    lezioni: lezioniCaricate,
    lezioneIdx: lezioneIdxSessione,
    capIdx: capIdxSessione,
    lezione: lezioneSessione,
    capitolo: capitoloSessione,
    bloccoAttivo: bloccoInSessione,
    bloccoRef,
    autoplay,
    setAutoplay,
    usaSilenzio,
    disponibile,
    audio,
    velocita,
    inCorso,
    inRiproduzione,
    inPreparazione,
    durataBlocco,
    carica,
    avvia,
    alternaPausa,
    interrompi,
    vaiA,
    vaiAlBlocco,
    capitoloSuccessivo,
    capitoloPrecedente,
    cambiaVelocita,
    riprendiDaParola,
    alternaAudio,
    apriSchermoIntero,
  } = useSessioneAudio();

  const inAscolto = modalita === "ascolta";

  /**
   * Il motore conosce questo programma solo dopo l'effetto qui sotto. Fino ad
   * allora — e quindi anche nell'HTML statico — la pagina si disegna da sé sul
   * primo capitolo: la lezione non deve nascere vuota in attesa
   * dell'idratazione. Quando la sessione è carica, i valori sono i suoi.
   */
  const delConcorso = concorsoInSessione === concorsoId;
  const lezioneIdx = delConcorso ? lezioneIdxSessione : 0;
  const capIdx = delConcorso ? capIdxSessione : 0;
  const lezione = delConcorso ? lezioneSessione : lezioni[0];
  const capitolo = delConcorso ? capitoloSessione : lezioni[0]?.capitoli[0];
  const bloccoAttivo = delConcorso ? bloccoInSessione : null;

  // Il programma della sessione: la pagina lo consegna al motore globale.
  useEffect(() => {
    carica(concorsoId, lezioni);
  }, [carica, concorsoId, lezioni]);

  /**
   * Ancora iniziale: `/concorso/<id>/#cap-<materia>-<numero>` apre
   * direttamente quella lezione.
   *
   * Serve ai link della scheda concorso e della pagina «Ascolta»: senza
   * questo, qualunque link atterrava sempre sul primo capitolo della prima
   * materia. L'ancora si applica una volta sola per valore: senza il
   * promemoria, ogni cambio di capitolo — o di stato della sessione — la
   * riapplicherebbe, riportando l'utente indietro.
   */
  const hashApplicato = useRef<string | null>(null);
  useEffect(() => {
    // Aspetta che la sessione abbia ricevuto il programma, altrimenti
    // `vaiA` non trova il capitolo da aprire.
    if (lezioniCaricate.length === 0) return;

    const applica = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!hash.startsWith("cap-")) return;
      if (hashApplicato.current === hash) return;

      for (let li = 0; li < lezioni.length; li++) {
        const base = `cap-${slug(lezioni[li].materia)}`;
        if (hash !== base && !hash.startsWith(`${base}-`)) continue;

        const numero =
          hash === base
            ? lezioni[li].capitoli[0]?.numero
            : Number(hash.slice(base.length + 1));
        const ci = lezioni[li].capitoli.findIndex((c) => c.numero === numero);
        if (ci < 0) continue;

        hashApplicato.current = hash;
        vaiA(li, ci);
        window.setTimeout(() => {
          document
            .getElementById(hash)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
        return;
      }
    };

    applica();
    const onHash = () => {
      hashApplicato.current = null;
      applica();
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [lezioniCaricate, lezioni, vaiA]);

  const statoCapitolo = useCallback(
    (materia: string, numero: number) =>
      completato(concorsoId, materia, numero) ? "fatto" : "da-fare",
    [completato, concorsoId]
  );

  /**
   * Cambiare modalità interrompe la lettura: la scena non ha più senso con le
   * vecchie impostazioni. Lo gestiamo qui, nell'evento, invece che con un
   * effetto che reagisce allo stato.
   */
  const cambiaModalitaSicura = useCallback(
    (m: "leggi" | "ascolta") => {
      interrompi();
      cambiaModalita(m);
    },
    [interrompi, cambiaModalita]
  );

  if (lezioni.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-sage-300 bg-sage-50 p-4 text-sm text-ink-soft">
        Nessuna lezione disponibile per questo concorso.
      </p>
    );
  }

  if (!lezione || !capitolo) return null;

  const progressoCapitolo = ((capIdx + 1) / lezione.capitoli.length) * 100;
  const progressoBlocco =
    bloccoAttivo === null ? 0 : ((bloccoAttivo + 1) / capitolo.blocchi.length) * 100;

  return (
    <div className={cn(inAscolto ? "flex min-h-[70dvh] flex-col" : "pb-24")}>
      {/*
        Ancore dei link profondi. Sono elementi vuoti, non titoli: servono solo
        come bersaglio di `scrollIntoView` e per l'URL condivisibile. La
        posizione è compensata dall'altezza della barra fissa.
      */}
      <span
        id={`cap-${slug(lezione.materia)}`}
        aria-hidden="true"
        className="block h-0 scroll-mt-[calc(var(--safe-alto)+var(--h-testata)+72px)]"
      />
      <span
        id={`cap-${slug(lezione.materia)}-${capitolo.numero}`}
        aria-hidden="true"
        className="block h-0 scroll-mt-[calc(var(--safe-alto)+var(--h-testata)+72px)]"
      />

      {/* ══════════ BARRA PLAYER (sticky) ══════════ */}
      <div className="sticky top-[calc(var(--safe-alto)+var(--h-testata))] z-30 -mx-4 border-b border-sage-200 bg-cream/95 px-3 py-2 backdrop-blur-lg sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2.5">
          {inAscolto && (
            <button
              type="button"
              onClick={alternaPausa}
              aria-label={inRiproduzione ? "Pausa" : "Riproduci"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
                "bg-voce-500 text-cream shadow-[var(--shadow-voce)]"
              )}
            >
              {inPreparazione ? (
                <Loader2 size={17} className="animate-spin" />
              ) : inRiproduzione ? (
                <Pause size={17} fill="currentColor" />
              ) : (
                <Play size={17} fill="currentColor" className="ml-0.5" />
              )}
            </button>
          )}

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
              {inAscolto && bloccoAttivo !== null && (
                <>
                  <span className="text-sage-300">·</span>
                  <span className="tnum shrink-0">
                    blocco {bloccoAttivo + 1}/{capitolo.blocchi.length}
                  </span>
                </>
              )}
            </p>
          </div>

          {/* Toggle Leggi / Ascolta */}
          <div
            role="group"
            aria-label="Modalità di lettura"
            className="flex shrink-0 rounded-full bg-sage-100 p-0.5"
          >
            <button
              type="button"
              onClick={() => cambiaModalitaSicura("leggi")}
              aria-pressed={!inAscolto}
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold transition",
                !inAscolto ? "bg-surface text-brand-700 shadow-sm" : "text-ink-muted"
              )}
            >
              <FileText size={13} />
              Leggi
            </button>
            <button
              type="button"
              onClick={() => cambiaModalitaSicura("ascolta")}
              aria-pressed={inAscolto}
              className={cn(
                "flex h-8 items-center gap-1 rounded-full px-2.5 text-[11.5px] font-bold transition",
                inAscolto ? "bg-surface text-voce-700 shadow-sm" : "text-ink-muted"
              )}
            >
              <Headphones size={13} />
              Ascolta
            </button>
          </div>

          {/* Piano della lezione */}
          <button
            type="button"
            onClick={() => setPianoAperto((v) => !v)}
            aria-expanded={pianoAperto}
            aria-label="Piano della lezione"
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition",
              pianoAperto ? "bg-brand-100 text-brand-700" : "text-ink-soft hover:bg-sage-100"
            )}
          >
            <List size={17} />
          </button>
        </div>

        {/* Avanzamento: nel capitolo, oppure nel blocco quando si ascolta */}
        <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-sage-200">
          <motion.div
            className={cn("h-full rounded-full", inAscolto ? "bg-voce-500" : "bg-brand-500")}
            initial={false}
            animate={{ width: `${inAscolto && bloccoAttivo !== null ? progressoBlocco : progressoCapitolo}%` }}
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
            <PianoLezione
              lezioni={lezioni}
              concorsoId={concorsoId}
              lezioneIdx={lezioneIdx}
              capitoloCorrente={capitolo.numero}
              quantiCompletati={quantiCompletati}
              statoCapitolo={statoCapitolo}
              onVai={(li, numero) => {
                vaiA(li, numero - 1);
                setPianoAperto(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════ CONTENUTO: SCENA (Ascolta) O LISTA (Leggi) ══════════ */}
      {inAscolto ? (
        <div className="flex min-h-0 flex-1 flex-col pb-40">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${lezioneIdx}-${capIdx}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="px-1 pt-3">
                <h1 className="font-display text-base font-semibold leading-snug sm:text-lg">
                  {capitolo.titolo}
                </h1>
                <p className="tnum mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-600">
                  Capitolo {capitolo.numero} · {capitolo.blocchi.length} blocchi
                  {!usaSilenzio ? "" : ` · lettura stimata ${durata(durataBlocco)}`}
                </p>
              </div>

              {bloccoAttivo === null ? (
                <AvvioCapitolo
                  usaSilenzio={usaSilenzio}
                  disponibile={disponibile}
                  audio={audio}
                  onAscolta={alternaAudio}
                  onAvvia={() => avvia(0)}
                />
              ) : (
                <ScenaBlocco
                  blocco={capitolo.blocchi[bloccoAttivo]}
                  indice={bloccoAttivo + 1}
                  totale={capitolo.blocchi.length}
                  posizione={posizione}
                  evidenzia={inCorso}
                  onParolaRipeti={!usaSilenzio ? riprendiDaParola : undefined}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      ) : (
        <VistaLeggi
          key={`${lezioneIdx}-${capIdx}`}
          capitolo={capitolo}
          bloccoAttivo={bloccoAttivo}
          posizione={posizione}
          staLeggendo={inRiproduzione}
          usaSilenzio={usaSilenzio}
          disponibile={disponibile}
          onAscolta={(i) => avvia(i)}
        />
      )}

      {/* ══════════ DOCK DI ASCOLTO ══════════ */}
      <AnimatePresence>
        {inAscolto && (
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
                  onClick={() => vaiAlBlocco((bloccoRef.current ?? 0) - 1)}
                  disabled={bloccoAttivo === null || bloccoAttivo === 0}
                  aria-label="Blocco precedente"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 disabled:opacity-30"
                >
                  <SkipBack size={18} />
                </button>

                <button
                  type="button"
                  onClick={alternaPausa}
                  aria-label={inRiproduzione ? "Pausa" : "Riproduci"}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-voce-500 text-cream shadow-[var(--shadow-voce)] active:scale-95"
                >
                  {inPreparazione ? (
                    <Loader2 size={19} className="animate-spin" />
                  ) : inRiproduzione ? (
                    <Pause size={19} fill="currentColor" />
                  ) : (
                    <Play size={19} fill="currentColor" className="ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => vaiAlBlocco((bloccoRef.current ?? -1) + 1)}
                  disabled={bloccoAttivo === null || bloccoAttivo >= capitolo.blocchi.length - 1}
                  aria-label="Blocco successivo"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 disabled:opacity-30"
                >
                  <SkipForward size={18} />
                </button>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">{lezione.materia}</p>
                  <p className="tnum text-[11px] text-ink-muted">
                    {inPreparazione ? (
                      "preparazione…"
                    ) : usaSilenzio ? (
                      "lettura stimata"
                    ) : (
                      <>{bloccoAttivo === null ? "pronto" : `blocco ${bloccoAttivo + 1}/${capitolo.blocchi.length}`}</>
                    )}
                  </p>
                </div>

                {/* Audio on/off: controlla voce oppure silenzio */}
                <button
                  type="button"
                  onClick={alternaAudio}
                  aria-pressed={audio}
                  title={audio ? "Voce attiva" : "Silenzio"}
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
                    audio ? "border-voce-300 bg-voce-50 text-voce-700" : "border-sage-200 text-ink-muted"
                  )}
                >
                  {audio ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                <button
                  type="button"
                  onClick={() => setAutoplay((v) => !v)}
                  aria-pressed={autoplay}
                  title="Riproduzione automatica"
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition",
                    autoplay ? "border-brand-400 bg-brand-50 text-brand-700" : "border-sage-200 text-ink-muted"
                  )}
                >
                  <Repeat size={16} />
                </button>

                {/* Schermo intero: la stessa lettura, in versione podcast (§3B) */}
                <button
                  type="button"
                  onClick={apriSchermoIntero}
                  aria-label="Apri il player a schermo intero"
                  title="Schermo intero"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sage-200 text-ink-soft transition hover:bg-sage-100"
                >
                  <Maximize2 size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => cambiaModalitaSicura("leggi")}
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
                          "tnum flex-1 rounded-full py-1.5 text-[12px] font-bold transition",
                          attiva ? "bg-voce-500 text-cream" : "bg-voce-50 text-voce-700 hover:bg-voce-100"
                        )}
                      >
                        {v === 1 ? "1×" : `${v}×`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigazione capitoli */}
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={capitoloPrecedente}
                  disabled={lezioneIdx === 0 && capIdx === 0}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full bg-sage-100 py-1.5 text-[12px] font-bold text-ink-soft transition hover:bg-sage-200 disabled:opacity-30"
                >
                  <ChevronLeft size={15} />
                  Capitolo
                </button>
                <button
                  type="button"
                  onClick={capitoloSuccessivo}
                  disabled={lezioneIdx === lezioni.length - 1 && capIdx === lezione.capitoli.length - 1}
                  className="flex flex-1 items-center justify-center gap-1 rounded-full bg-sage-100 py-1.5 text-[12px] font-bold text-ink-soft transition hover:bg-sage-200 disabled:opacity-30"
                >
                  Capitolo
                  <ChevronRight size={15} />
                </button>
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

/** Vista "Leggi": la lista di blocchi impilati, per consultare. */
function VistaLeggi({
  capitolo,
  bloccoAttivo,
  posizione,
  staLeggendo,
  usaSilenzio,
  disponibile,
  onAscolta,
}: {
  capitolo: Capitolo;
  bloccoAttivo: number | null;
  posizione: number;
  staLeggendo: boolean;
  usaSilenzio: boolean;
  disponibile: boolean;
  onAscolta: (i: number) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mt-2"
    >
      <h1 className="font-display text-lg font-semibold leading-snug sm:text-xl">
        {capitolo.titolo}
      </h1>
      <p className="tnum mt-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-brand-600">
        Capitolo {capitolo.numero} · {capitolo.minuti.toFixed(1)} min ·{" "}
        {capitolo.blocchi.length} blocchi
      </p>

      <div className="mt-2 space-y-1.5">
        {capitolo.blocchi.map((b, i) => {
          const attivo = bloccoAttivo === i;
          return (
            <Blocco
              key={i}
              blocco={b}
              indice={i + 1}
              attivo={attivo}
              inRiproduzione={attivo && staLeggendo}
              posizione={posizione}
              usaSilenzio={usaSilenzio}
              disponibile={disponibile}
              onAscolta={() => onAscolta(i)}
            />
          );
        })}
      </div>
    </motion.article>
  );
}

/** Un blocco: riga compatta, niente padding inutile. */
function Blocco({
  blocco,
  indice,
  attivo,
  inRiproduzione,
  posizione,
  usaSilenzio,
  disponibile,
  onAscolta,
}: {
  blocco: TipoBlocco;
  indice: number;
  attivo: boolean;
  inRiproduzione: boolean;
  posizione: number;
  usaSilenzio: boolean;
  disponibile: boolean;
  onAscolta: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition",
        attivo ? "border-voce-300 bg-voce-50" : "border-sage-200 bg-surface hover:border-sage-300"
      )}
    >
      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={onAscolta}
          disabled={!disponibile && !usaSilenzio}
          aria-label={`Ascolta il blocco ${indice}`}
          title={
            !disponibile && !usaSilenzio
              ? "Nessuna voce disponibile: attiva il silenzio per la lettura stimata"
              : undefined
          }
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition active:scale-95 disabled:opacity-40",
            attivo
              ? "bg-voce-500 text-cream"
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

          <Corpo blocco={blocco} evidenzia={attivo && inRiproduzione} posizione={posizione} />
        </div>
      </div>
    </div>
  );
}

/** Corpo del blocco: testo con l'evidenziazione della frase in lettura. */
function Corpo({
  blocco,
  evidenzia,
  posizione,
}: {
  blocco: TipoBlocco;
  evidenzia: boolean;
  posizione: number;
}) {
  const { parti, testo: testoTotale } = componiBlocco(blocco);

  // Solo il blocco in lettura ha bisogno delle frasi: gli altri restano testo.
  const frase = evidenzia
    ? fraseA(frasiConOffset(testoTotale), posizione)
    : null;

  const t = (testo: string, inizio: number, fine: number) => {
    if (!frase) return <>{testo}</>;

    const da = Math.max(inizio, frase.inizio);
    const a = Math.min(fine, frase.fine);
    // Frase altrove: o già letta (inchiostro pieno) o ancora da leggere.
    if (a <= da || da >= fine || a <= inizio) {
      return frase.fine <= inizio ? <span className="text-ink">{testo}</span> : <>{testo}</>;
    }

    return (
      <>
        {testo.slice(0, da - inizio) && (
          <span className="text-ink">{testo.slice(0, da - inizio)}</span>
        )}
        <span className="rounded bg-brand-100 text-ink">
          {testo.slice(da - inizio, a - inizio)}
        </span>
        {testo.slice(a - inizio)}
      </>
    );
  };

  if (blocco.tipo === "punti") {
    const punti = parti.filter((p) => p.ruolo === "punto");
    return (
      <ul className="space-y-1">
        {blocco.voci.map((v, i) => {
          const p = punti[i];
          return (
            <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-ink-soft">
              <span
                aria-hidden="true"
                className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-brand-400"
              />
              <span>{p ? t(v, p.inizio, p.fine) : v}</span>
            </li>
          );
        })}
      </ul>
    );
  }

  const p = parti.find((x) => x.ruolo === "testo");
  return (
    <p className="text-[13.5px] leading-snug text-ink-soft">
      {p ? t(p.testo, p.inizio, p.fine) : null}
    </p>
  );
}

/** Il piano della lezione a fisarmonica: tutte le materie e i capitoli. */
function PianoLezione({
  lezioni,
  concorsoId,
  lezioneIdx,
  capitoloCorrente,
  quantiCompletati,
  statoCapitolo,
  onVai,
}: {
  lezioni: Lezione[];
  concorsoId: string;
  lezioneIdx: number;
  capitoloCorrente: number;
  quantiCompletati: (concorsoId: string, materia?: string) => number;
  statoCapitolo: (materia: string, numero: number) => "fatto" | "da-fare";
  onVai: (lezioneIdx: number, numero: number) => void;
}) {
  return (
    <div className="mt-2 max-h-[45dvh] space-y-0.5 overflow-y-auto rounded-xl border border-sage-200 bg-surface p-1.5">
      {lezioni.map((l, li) => {
        const fatti = quantiCompletati(concorsoId, l.materia);
        return (
          <div key={l.materia}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-[12px] font-bold">{l.materia}</span>
              <span className="tnum shrink-0 text-[10px] text-ink-muted">
                {fatti}/{l.capitoli.length}
              </span>
            </div>
            {l.capitoli.map((c) => {
              const attivo = li === lezioneIdx && c.numero === capitoloCorrente;
              return (
                <button
                  key={c.numero}
                  type="button"
                  onClick={() => onVai(li, c.numero)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition",
                    attivo ? "bg-brand-50" : "hover:bg-sage-50"
                  )}
                >
                  {statoCapitolo(l.materia, c.numero) === "fatto" ? (
                    <Check size={13} strokeWidth={3} className="shrink-0 text-leaf-500" />
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
  );
}

/** Punto di partenza della scena, prima di scegliere un blocco. */
function AvvioCapitolo({
  usaSilenzio,
  disponibile,
  audio,
  onAscolta,
  onAvvia,
}: {
  usaSilenzio: boolean;
  disponibile: boolean;
  audio: boolean;
  onAscolta: (v: boolean) => void;
  onAvvia: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
      <p className="max-w-xs text-[13.5px] leading-snug text-ink-soft">
        {usaSilenzio
          ? "Il testo avanza da solo, parola per parola. Puoi leggere senza audio."
          : "Ascolta il capitolo: il testo scorre con la voce, un blocco alla volta."}
      </p>
      <button
        type="button"
        onClick={onAvvia}
        className="flex items-center gap-2 rounded-full bg-voce-500 px-5 py-2.5 text-[13px] font-bold text-cream shadow-[var(--shadow-voce)] active:scale-95"
      >
        <Play size={16} fill="currentColor" />
        {usaSilenzio ? "Inizia la lettura" : "Inizia l'ascolto"}
      </button>
      {!disponibile && !usaSilenzio && (
        <button
          type="button"
          onClick={() => onAscolta(false)}
          className="text-[12px] font-semibold text-brand-700 underline underline-offset-2"
        >
          Nessuna voce disponibile: leggi in silenzio
        </button>
      )}
      {disponibile && !audio && (
        <button
          type="button"
          onClick={() => onAscolta(true)}
          className="text-[12px] font-semibold text-voce-700 underline underline-offset-2"
        >
          Riattiva la voce
        </button>
      )}
    </div>
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
        <b className="font-semibold">Riprendi</b> da {ultimo.materia}, capitolo {ultimo.capitolo}.
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
