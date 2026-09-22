"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  componiBlocco,
  millisecondiStimati,
  testoBlocco,
  type Capitolo,
  type Lezione,
  type TipoBlocco,
} from "@/lib/dati/lezioni";
import { useVoce } from "@/lib/voce/hook";
import { useVoceSilenziosa } from "@/lib/voce/silenzio";
import { useStudio } from "@/lib/dati/studio";
import { useModalitaLettore, segnaVoceUsata } from "@/lib/lettore/modalita";
import { ScenaBlocco } from "./ScenaBlocco";
import { cn, durata } from "@/lib/ui";

/** Velocità selezionabili nel dock di ascolto. */
const VELOCITA = [1, 1.25, 1.5, 2] as const;

/**
 * Lettore di lezioni, ottimizzato per mobile.
 *
 * Due modalità dello stesso capitolo:
 *
 * - **Leggi**: la lista di blocchi impilati, per consultare e rileggere.
 * - **Ascolta**: una scena con un blocco alla volta e i comandi. La lettura
 *   avanza da sola, parola per parola (karaoke), con la voce oppure — se
 *   l'audio è spento o assente — con un timer stimato.
 *
 * Il percorso di avanzamento è unico: sia la voce sia il timer chiamano la
 * stessa `fineBlocco`, quindi l'autoplay non è duplicato.
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
  /** Indice del blocco mostrato/letto; `null` quando nulla è selezionato. */
  const [bloccoAttivo, setBloccoAttivo] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [pianoAperto, setPianoAperto] = useState(false);

  /**
   * Blocco corrente in un ref oltre che nello state: l'avanzamento
   * automatico ne ha bisogno *sincronamente*, leggere lo state lì darebbe un
   * valore vecchio di un render.
   */
  const bloccoRef = useRef<number | null>(null);

  const { modalita, cambiaModalita, audio, setAudio } = useModalitaLettore();

  const {
    parla,
    ferma,
    stato,
    impostaFineLettura,
    prefetch,
    aggiorna,
    impostazioni,
    posizione: posizioneVoce,
    disponibile,
    commutaPausa,
  } = useVoce();
  const { segnaCompletato, segnaAperto, completato, quantiCompletati, stato: studio } =
    useStudio();

  const lezione = lezioni[lezioneIdx];
  const capitolo = lezione?.capitoli[capIdx];

  const inAscolto = modalita === "ascolta";

  // ------------------------------------------------------------- silenzio
  /**
   * Il timer silenzioso è la sorgente della posizione quando la modalità è
   * Leggi, quando l'audio è spento o quando la voce non è disponibile.
   */
  const usaSilenzio = !inAscolto || !audio || !disponibile;
  const fineRef = useRef<() => void>(() => {});
  /**
   * Segnala che la voce va riavviata al prossimo cambio di velocità. Il
   * riavvio avviene in un effetto, così la sintesi usa le impostazioni nuove.
   */
  const riavvioVelocitaRef = useRef(false);
  const silenzio = useVoceSilenziosa(() => fineRef.current());
  // Le funzioni del timer sono stabili: le estraiamo per usarle come
  // dipendenze senza che l'oggetto (che cambia a ogni frame) le destabilizzi.
  const { avvia: avviaSilenzio, pausa: pausaSilenzio, riprendi: riprendiSilenzio, ferma: fermaSilenzio } =
    silenzio;

  const posizioneVoceBase = usaSilenzio ? silenzio.posizione : posizioneVoce;
  /** Offset in caratteri quando la lettura riparte da una parola cliccata. */
  const [offsetKaraoke, setOffsetKaraoke] = useState(0);
  const posizione = posizioneVoceBase + offsetKaraoke;
  /** Lettura in corso, pausa inclusa: la scena mantiene il karaoke. */
  const inCorso = usaSilenzio
    ? silenzio.attivo || silenzio.inPausa
    : stato === "speaking" || stato === "paused";
  /** Lettura che avanza davvero: il play diventa pausa solo qui. */
  const inRiproduzione = usaSilenzio
    ? silenzio.attivo
    : stato === "speaking";

  const leggiBlocco = useCallback(
    (testo: string, tag: string, velocita: number) => {
      if (usaSilenzio) avviaSilenzio(testo, velocita);
      else parla(testo, tag);
    },
    [usaSilenzio, avviaSilenzio, parla]
  );

  /** Riparte dalla prima parola: azzera l'offset del karaoke. */
  const leggiDallInizio = useCallback(
    (testo: string, tag: string, velocita: number) => {
      setOffsetKaraoke(0);
      leggiBlocco(testo, tag, velocita);
    },
    [leggiBlocco]
  );

  const fermaTutto = useCallback(() => {
    fermaSilenzio();
    ferma();
  }, [fermaSilenzio, ferma]);

  // -------------------------------------------------------------- capitolo
  const vaiA = useCallback(
    (li: number, ci: number) => {
      fermaTutto();
      bloccoRef.current = null;
      setBloccoAttivo(null);
      setLezioneIdx(li);
      setCapIdx(ci);
      const l = lezioni[li];
      const c = l?.capitoli[ci];
      if (l && c) segnaAperto(concorsoId, l.materia, c.numero);
    },
    [fermaTutto, lezioni, concorsoId, segnaAperto]
  );

  /** Passa al capitolo successivo, cambiando materia se serve. */
  const capitoloSuccessivo = useCallback(() => {
    const p = posizioneCapitoloDopo(lezioni, lezioneIdx, capIdx);
    if (p) vaiA(p.lezioneIdx, p.capIdx);
  }, [lezioni, lezioneIdx, capIdx, vaiA]);

  const capitoloPrecedente = useCallback(() => {
    if (capIdx > 0) {
      vaiA(lezioneIdx, capIdx - 1);
    } else if (lezioneIdx > 0) {
      const precedente = lezioni[lezioneIdx - 1];
      vaiA(lezioneIdx - 1, precedente.capitoli.length - 1);
    }
  }, [capIdx, lezioneIdx, lezioni, vaiA]);

  // ------------------------------------------------------------ avanzamento
  /**
   * Avvia la lettura del primo blocco di un capitolo, cambiando materia se
   * serve. Non azzera il blocco attivo: serve all'autoplay per proseguire
   * senza interruzioni da un capitolo al successivo.
   */
  const avviaPrimoBlocco = useCallback(
    (li: number, ci: number) => {
      const l = lezioni[li];
      const c = l?.capitoli[ci];
      if (!l || !c || c.blocchi.length === 0) return;
      setLezioneIdx(li);
      setCapIdx(ci);
      bloccoRef.current = 0;
      setBloccoAttivo(0);
      segnaAperto(concorsoId, l.materia, c.numero);
      leggiDallInizio(testoBlocco(c.blocchi[0]), `auto-0`, impostazioni.velocita);
      const dopo = c.blocchi[1];
      if (dopo && !usaSilenzio) prefetch(testoBlocco(dopo));
    },
    [lezioni, concorsoId, segnaAperto, leggiDallInizio, impostazioni.velocita, usaSilenzio, prefetch]
  );

  /**
   * Fine di un blocco: o si passa al successivo (se l'autoplay è attivo) o ci
   * si ferma. È l'unico punto di avanzamento, chiamato sia dalla voce sia dal
   * timer silenzioso.
   */
  const fineBlocco = useCallback(() => {
    if (!capitolo || !lezione) return;
    const corrente = bloccoRef.current;
    if (corrente === null) return;

    const prossimo = corrente + 1;
    if (prossimo < capitolo.blocchi.length) {
      if (!autoplay) {
        setBloccoAttivo(corrente);
        return;
      }
      bloccoRef.current = prossimo;
      setBloccoAttivo(prossimo);
      leggiDallInizio(testoBlocco(capitolo.blocchi[prossimo]), `auto-${prossimo}`, impostazioni.velocita);
      const ancora = capitolo.blocchi[prossimo + 1];
      if (ancora && !usaSilenzio) prefetch(testoBlocco(ancora));
      return;
    }

    // Capitolo finito: va segnato completato, poi si prosegue se richiesto.
    const dopo = capitoloDopo(lezioni, lezioneIdx, capIdx);
    if (dopo && !usaSilenzio) prefetch(testoBlocco(dopo.blocco));
    segnaCompletato(concorsoId, lezione.materia, capitolo.numero);

    const prossimoCapitolo = posizioneCapitoloDopo(lezioni, lezioneIdx, capIdx);
    if (autoplay && prossimoCapitolo) {
      // Oltre il capitolo senza toccare terra: l'ascolto non si interrompe.
      avviaPrimoBlocco(prossimoCapitolo.lezioneIdx, prossimoCapitolo.capIdx);
      return;
    }

    bloccoRef.current = null;
    setBloccoAttivo(null);
  }, [
    capitolo,
    lezione,
    autoplay,
    leggiDallInizio,
    impostazioni.velocita,
    usaSilenzio,
    prefetch,
    lezioni,
    lezioneIdx,
    capIdx,
    segnaCompletato,
    concorsoId,
    avviaPrimoBlocco,
  ]);

  useEffect(() => {
    fineRef.current = fineBlocco;
  }, [fineBlocco]);

  // La voce reale avvisa a fine lettura naturale: stesso percorso del timer.
  useEffect(() => {
    impostaFineLettura(() => fineBlocco());
    return () => impostaFineLettura(null);
  }, [fineBlocco, impostaFineLettura]);

  // Smontaggio: la voce è un sistema esterno da fermare. Nessun setState qui.
  // Dipende solo da `fermaTutto` (stabile): cambiare capitolo non deve
  // interrompere l'audio, altrimenti l'autoplay si spezzerebbe a ogni confine.
  useEffect(() => {
    return () => fermaTutto();
  }, [fermaTutto]);

  // ---------------------------------------------------------------- comandi
  const avvia = useCallback(
    (blocco: number) => {
      if (!capitolo || !lezione) return;
      setAutoplay(true);
      bloccoRef.current = blocco;
      setBloccoAttivo(blocco);
      segnaAperto(concorsoId, lezione.materia, capitolo.numero);
      if (!usaSilenzio) segnaVoceUsata();
      leggiDallInizio(testoBlocco(capitolo.blocchi[blocco]), `auto-${blocco}`, impostazioni.velocita);
      const prossimo = capitolo.blocchi[blocco + 1];
      if (prossimo && !usaSilenzio) prefetch(testoBlocco(prossimo));
    },
    [capitolo, lezione, leggiDallInizio, impostazioni.velocita, usaSilenzio, prefetch, concorsoId, segnaAperto]
  );

  const alternaPausa = useCallback(() => {
    if (usaSilenzio) {
      if (silenzio.attivo) pausaSilenzio();
      else if (silenzio.inPausa) riprendiSilenzio();
      else avvia(bloccoRef.current ?? 0);
      return;
    }
    // La voce ha una pausa nativa: usarla conserva la posizione esatta e
    // lascia il karaoke dov'era. Si riavvia solo da fermi.
    if (stato === "speaking" || stato === "paused") commutaPausa();
    else avvia(bloccoRef.current ?? 0);
  }, [usaSilenzio, silenzio, pausaSilenzio, riprendiSilenzio, stato, commutaPausa, avvia]);

  /**
   * Cambio di velocità a caldo. I motori TTS non cambiano ritmo durante una
   * sintesi: il blocco corrente riparte dall'inizio. Il riavvio avviene in un
   * effetto, così `parla` vede già le impostazioni nuove (chiamarlo subito
   * dopo `aggiorna` userebbe la closure vecchia). Il timer silenzioso invece
   * si riavvia subito: non passa dal hook voce e non ha closure da attendere.
   */
  const cambiaVelocita = useCallback(
    (v: number) => {
      const inCorso = usaSilenzio
        ? silenzio.attivo
        : stato === "speaking" || stato === "paused";
      aggiorna({ velocita: v });
      if (!inCorso) return;
      if (usaSilenzio && capitolo && bloccoRef.current !== null) {
        avviaSilenzio(testoBlocco(capitolo.blocchi[bloccoRef.current]), v);
      } else {
        riavvioVelocitaRef.current = true;
      }
    },
    [aggiorna, usaSilenzio, silenzio, stato, capitolo, avviaSilenzio]
  );

  // Riavvio della voce al cambio velocità: qui `impostazioni.velocita` è già
  // quella nuova, quindi `parla` sintetizza al ritmo giusto.
  useEffect(() => {
    if (!riavvioVelocitaRef.current) return;
    riavvioVelocitaRef.current = false;
    if (bloccoRef.current !== null) avvia(bloccoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impostazioni.velocita]);




  /** Salto manuale: il blocco diventa attivo ma non parte da solo. */
  const vaiAlBlocco = useCallback(
    (blocco: number) => {
      if (!capitolo) return;
      fermaTutto();
      const dentro = Math.max(0, Math.min(blocco, capitolo.blocchi.length - 1));
      bloccoRef.current = dentro;
      setBloccoAttivo(dentro);
    },
    [capitolo, fermaTutto]
  );

  /**
   * Tap su una parola: riparte da lì. Supportato dalla voce nativa
   * (`WebSpeech`) e dal timer; con la voce neurale riparte dall'inizio.
   */
  const riprendiDaParola = useCallback(
    (offset: number) => {
      if (!capitolo || bloccoRef.current === null) return;
      const testo = testoBlocco(capitolo.blocchi[bloccoRef.current]);
      // Il testo viene letto a partire da qui: il karaoke deve sommare
      // l'offset, altrimenti evidenzierebbe le prime parole del blocco.
      setOffsetKaraoke(offset);
      leggiBlocco(
        testo.slice(offset),
        `auto-${bloccoRef.current}#${offset}`,
        impostazioni.velocita
      );
    },
    [capitolo, leggiBlocco, impostazioni.velocita]
  );

  const statoCapitolo = useCallback(
    (materia: string, numero: number) =>
      completato(concorsoId, materia, numero) ? "fatto" : "da-fare",
    [completato, concorsoId]
  );

  /**
   * Cambiare modalità o audio interrompe la lettura: la scena non ha più
   * senso con le vecchie impostazioni. Lo gestiamo qui, nell'evento, invece
   * che con un effetto che reagisce allo stato.
   */
  const interrompi = useCallback(() => {
    fermaTutto();
    bloccoRef.current = null;
    setBloccoAttivo(null);
    setAutoplay(false);
  }, [fermaTutto]);

  const cambiaModalitaSicura = useCallback(
    (m: "leggi" | "ascolta") => {
      interrompi();
      cambiaModalita(m);
    },
    [interrompi, cambiaModalita]
  );

  const alternaAudio = useCallback(() => {
    interrompi();
    setAudio((v) => !v);
  }, [interrompi, setAudio]);

  const durataBlocco = useMemo(
    () => (capitolo && bloccoAttivo !== null ? millisecondiStimati(testoBlocco(capitolo.blocchi[bloccoAttivo]), impostazioni.velocita) : 0),
    [capitolo, bloccoAttivo, impostazioni.velocita]
  );

  if (lezioni.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-sage-300 bg-sage-50 p-4 text-sm text-ink-soft">
        Nessuna lezione disponibile per questo concorso.
      </p>
    );
  }

  if (!lezione || !capitolo) return null;

  const inPreparazione = !usaSilenzio && bloccoAttivo !== null && stato === "idle";
  const progressoCapitolo = ((capIdx + 1) / lezione.capitoli.length) * 100;
  const progressoBlocco =
    bloccoAttivo === null ? 0 : ((bloccoAttivo + 1) / capitolo.blocchi.length) * 100;

  return (
    <div className={cn(inAscolto ? "flex min-h-[70dvh] flex-col" : "pb-24")}>
      {/* ══════════ BARRA PLAYER (sticky) ══════════ */}
      <div className="sticky top-14 z-30 -mx-4 border-b border-sage-200 bg-cream/95 px-3 py-2 backdrop-blur-lg sm:-mx-6 sm:top-16 sm:px-6">
        <div className="flex items-center gap-2.5">
          {inAscolto && (
            <button
              type="button"
              onClick={alternaPausa}
              aria-label={inRiproduzione ? "Pausa" : "Riproduci"}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-95",
                "bg-voce-500 text-white shadow-[var(--shadow-voce)]"
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
                  onAscolta={() => {
                  interrompi();
                  setAudio(true);
                }}
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
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-voce-500 text-white shadow-[var(--shadow-voce)] active:scale-95"
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

                <button
                  type="button"
                  onClick={() => {
                    setAutoplay(false);
                    fermaTutto();
                    setBloccoAttivo(null);
                    bloccoRef.current = null;
                    cambiaModalitaSicura("leggi");
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
                <div className="flex flex-1 gap-1" role="group" aria-label="Velocità di lettura">
                  {VELOCITA.map((v) => {
                    const attiva = Math.abs(impostazioni.velocita - v) < 0.01;
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => cambiaVelocita(v)}
                        aria-pressed={attiva}
                        className={cn(
                          "tnum flex-1 rounded-full py-1.5 text-[12px] font-bold transition",
                          attiva ? "bg-voce-500 text-white" : "bg-voce-50 text-voce-700 hover:bg-voce-100"
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

          <Corpo blocco={blocco} evidenzia={attivo && inRiproduzione} posizione={posizione} />
        </div>
      </div>
    </div>
  );
}

/** Corpo del blocco con evidenziazione a livello di porzione. */
function Corpo({
  blocco,
  evidenzia,
  posizione,
}: {
  blocco: TipoBlocco;
  evidenzia: boolean;
  posizione: number;
}) {
  const { parti } = componiBlocco(blocco);

  const t = (testo: string, inizio: number, fine: number) => {
    if (!evidenzia || posizione <= inizio) return <>{testo}</>;
    if (posizione >= fine) return <span className="text-ink">{testo}</span>;
    const locale = posizione - inizio;
    let a = locale;
    while (a > 0 && !/\s/.test(testo[a - 1])) a--;
    return (
      <>
        <span className="text-ink">{testo.slice(0, a)}</span>
        <span className="rounded bg-brand-100 text-ink">{testo.slice(a)}</span>
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
        className="flex items-center gap-2 rounded-full bg-voce-500 px-5 py-2.5 text-[13px] font-bold text-white shadow-[var(--shadow-voce)] active:scale-95"
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

/**
 * Il capitolo che segue quello indicato, se esiste.
 * Un'unica funzione copre sia il salto di capitolo sia il passaggio di
 * materia: evita di duplicare i confini della struttura delle lezioni.
 */
function posizioneCapitoloDopo(
  lezioni: Lezione[],
  lezioneIdx: number,
  capIdx: number
): { lezioneIdx: number; capIdx: number } | null {
  const lezione = lezioni[lezioneIdx];
  if (!lezione) return null;

  if (capIdx + 1 < lezione.capitoli.length) {
    return { lezioneIdx, capIdx: capIdx + 1 };
  }
  if (lezioneIdx + 1 < lezioni.length) {
    return { lezioneIdx: lezioneIdx + 1, capIdx: 0 };
  }
  return null;
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
    return { materia: lezione.materia, numero: stesso.numero, blocco: stesso.blocchi[0] };
  }

  const prossimaLezione = lezioni[lezioneIdx + 1];
  const primo = prossimaLezione?.capitoli[0];
  if (prossimaLezione && primo) {
    return { materia: prossimaLezione.materia, numero: primo.numero, blocco: primo.blocchi[0] };
  }

  return null;
}
