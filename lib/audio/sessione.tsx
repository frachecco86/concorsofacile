"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  millisecondiStimati,
  testoBlocco,
  type Capitolo,
  type Lezione,
  type TipoBlocco,
} from "@/lib/dati/lezioni";
import { CONCORSI } from "@/lib/dati/concorsi";
import { useStudio } from "@/lib/dati/studio";
import { useModalitaLettore, segnaVoceUsata } from "@/lib/lettore/modalita";
import { useVoce } from "@/lib/voce/hook";
import { useVoceSilenziosa } from "@/lib/voce/silenzio";
import {
  lettoreRegistrazioni,
  precaricaRegistrazioni,
  registrazionePer,
} from "@/lib/voce/registrate";
import { slug } from "@/lib/slug";
import { useMediaSession, useSchermoAcceso, type AzioniSistema } from "./mediasession";

/**
 * Sessione audio: il motore di lettura, **fuori dalla pagina della lezione**.
 *
 * Prima il player viveva dentro `LettoreLezione`: uscire dalla pagina fermava
 * la voce e il lettore spariva. Per una barra flottante che accompagna
 * l'utente in tutta l'app — e per i comandi del sistema (direttive §3B/§3C) —
 * il motore deve sopravvivere alla navigazione, quindi sta qui, montato nel
 * layout.
 *
 * La divisione delle responsabilità è netta:
 *
 * - **qui** c'è la macchina a stati (blocco attivo, autoplay, karaoke,
 *   prefetch, media session, schermo acceso);
 * - **nella pagina** c'è la vista (scena, lista, dock, piano della lezione).
 *
 * La posizione nel blocco viaggia in un contesto separato: cambia a ogni
 * frame e chi non la mostra (la barra, il guscio) non deve ridisegnarsi con
 * lei.
 */

/** Cosa sta leggendo la sessione: tutto ciò che serve a barra e sistema. */
export interface Traccia {
  concorsoId: string;
  materia: string;
  titolo: string;
  numero: number;
  /** Collegamento diretto al capitolo, per tornare al testo. */
  href: string;
  indiceCapitolo: number;
  totaleCapitoli: number;
  indiceBlocco: number | null;
  totaleBlocchi: number;
}

interface ValoreSessione {
  /** Concorso del programma attualmente caricato (vuoto se nessuno). */
  concorsoId: string;
  lezioni: Lezione[];
  lezioneIdx: number;
  capIdx: number;
  lezione: Lezione | undefined;
  capitolo: Capitolo | undefined;
  bloccoAttivo: number | null;
  bloccoRef: { current: number | null };
  traccia: Traccia | null;
  autoplay: boolean;
  setAutoplay: (v: boolean | ((p: boolean) => boolean)) => void;
  usaSilenzio: boolean;
  disponibile: boolean;
  audio: boolean;
  velocita: number;
  inCorso: boolean;
  inRiproduzione: boolean;
  inPreparazione: boolean;
  durataBlocco: number;
  schermoIntero: boolean;
  barraVisibile: boolean;
  carica: (concorsoId: string, lezioni: Lezione[]) => void;
  avvia: (blocco: number) => void;
  alternaPausa: () => void;
  fermaTutto: () => void;
  interrompi: () => void;
  vaiA: (lezioneIdx: number, capIdx: number) => void;
  vaiAlBlocco: (blocco: number) => void;
  bloccoSuccessivo: () => void;
  bloccoPrecedente: () => void;
  capitoloSuccessivo: () => void;
  capitoloPrecedente: () => void;
  cambiaVelocita: (v: number) => void;
  riprendiDaParola: (offset: number) => void;
  alternaAudio: () => void;
  apriSchermoIntero: () => void;
  chiudiSchermoIntero: () => void;
}

const Contesto = createContext<ValoreSessione | null>(null);
const ContestoPosizione = createContext(0);

export function FornitoreSessioneAudio({ children }: { children: React.ReactNode }) {
  const [dati, setDati] = useState<{ concorsoId: string; lezioni: Lezione[] } | null>(null);
  const [lezioneIdx, setLezioneIdx] = useState(0);
  const [capIdx, setCapIdx] = useState(0);
  /** Indice del blocco in lettura; `null` quando la sessione è chiusa. */
  const [bloccoAttivo, setBloccoAttivo] = useState<number | null>(null);
  const [autoplay, setAutoplay] = useState(false);
  const [schermoIntero, setSchermoIntero] = useState(false);

  /**
   * Blocco corrente anche in un ref: l'avanzamento automatico ne ha bisogno
   * *sincronamente*, leggere lo state lì darebbe un valore vecchio di un render.
   */
  const bloccoRef = useRef<number | null>(null);

  const percorso = usePathname();
  const { modalita, audio, setAudio } = useModalitaLettore();
  const {
    parla,
    ferma,
    stato,
    tagInLettura,
    impostaFineLettura,
    prefetch,
    aggiorna,
    impostazioni,
    posizione: posizioneVoce,
    disponibile,
    commutaPausa,
  } = useVoce();
  const { segnaCompletato, segnaAperto } = useStudio();

  const lezioni = useMemo(() => dati?.lezioni ?? [], [dati]);
  const concorsoId = dati?.concorsoId ?? "";
  const lezione = lezioni[lezioneIdx];
  const capitolo = lezione?.capitoli[capIdx];
  const inAscolto = modalita === "ascolta";
  const velocita = impostazioni.velocita;

  /** La voce è globale: se parla qualcun altro, la lezione non è "in corso". */
  const miaLetturaRef = useRef(false);

  // ------------------------------------------------------------- sorgente
  /**
   * Il timer silenzioso è la sorgente della posizione quando la modalità è
   * Leggi, quando l'audio è spento o quando la voce non è disponibile.
   */
  const usaSilenzio = !inAscolto || !audio || !disponibile;
  const fineRef = useRef<() => void>(() => {});
  const silenzio = useVoceSilenziosa(() => fineRef.current());
  const {
    avvia: avviaSilenzio,
    pausa: pausaSilenzio,
    riprendi: riprendiSilenzio,
    ferma: fermaSilenzio,
  } = silenzio;

  const posizioneVoceBase = usaSilenzio ? silenzio.posizione : posizioneVoce;
  /** Offset in caratteri quando la lettura riparte da una parola cliccata. */
  const [offsetKaraoke, setOffsetKaraoke] = useState(0);
  const posizione = posizioneVoceBase + offsetKaraoke;

  /**
   * Un altro componente (quiz, anteprima voce) sta usando la sintesi: la
   * sessione non deve né mostrarsi in riproduzione né credere che la fine di
   * quella lettura sia la fine del proprio blocco.
   */
  const voceEsterna =
    !usaSilenzio && stato !== "idle" && !(tagInLettura?.startsWith("auto-") ?? false);
  const inCorso = voceEsterna
    ? false
    : usaSilenzio
      ? silenzio.attivo || silenzio.inPausa
      : stato === "speaking" || stato === "paused";
  const inRiproduzione = voceEsterna
    ? false
    : usaSilenzio
      ? silenzio.attivo
      : stato === "speaking";
  /**
   * La voce è stata chiesta ma non ha ancora iniziato a parlare: il tag in
   * lettura c'è, lo stato è ancora fermo. Il tag distingue la nostra
   * preparazione da quella di altri (un quiz, un'anteprima).
   */
  const inPreparazione =
    !usaSilenzio &&
    bloccoAttivo !== null &&
    stato === "idle" &&
    (tagInLettura?.startsWith("auto-") ?? false);

  /** Chi comanda l'avanzamento: la nostra voce, non quella di altri. */
  useEffect(() => {
    if (stato !== "idle") {
      miaLetturaRef.current = tagInLettura?.startsWith("auto-") ?? false;
    }
  }, [stato, tagInLettura]);

  // ------------------------------------------------------------ comandi
  // L'ordine di definizione segue le dipendenze reali: lettura → fermata →
  // avvio del capitolo → fine blocco → navigazione → comandi utente.
  const leggiBlocco = useCallback(
    (testo: string, tag: string, v: number) => {
      miaLetturaRef.current = !usaSilenzio;
      if (usaSilenzio) avviaSilenzio(testo, v);
      else parla(testo, tag);
    },
    [usaSilenzio, avviaSilenzio, parla]
  );

  /** Riparte dalla prima parola: azzera l'offset del karaoke. */
  const leggiDallInizio = useCallback(
    (testo: string, tag: string, v: number) => {
      setOffsetKaraoke(0);
      leggiBlocco(testo, tag, v);
    },
    [leggiBlocco]
  );

  const fermaTutto = useCallback(() => {
    fermaSilenzio();
    ferma();
    miaLetturaRef.current = false;
  }, [fermaSilenzio, ferma]);

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
      leggiDallInizio(testoBlocco(c.blocchi[0]), "auto-0", velocita);
      const dopo = c.blocchi[1];
      if (dopo && !usaSilenzio) prefetch(testoBlocco(dopo));
    },
    [lezioni, concorsoId, segnaAperto, leggiDallInizio, velocita, usaSilenzio, prefetch]
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
      leggiDallInizio(testoBlocco(capitolo.blocchi[prossimo]), `auto-${prossimo}`, velocita);
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
    // Sessione finita: il player a schermo intero non ha più niente da mostrare.
    setSchermoIntero(false);
  }, [
    capitolo,
    lezione,
    autoplay,
    leggiDallInizio,
    velocita,
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

  /*
    La voce reale avvisa a fine lettura naturale: stesso percorso del timer.
    Il controllo su `miaLetturaRef` tiene fuori le letture altrui (un quiz, una
    voce di prova nel pannello): la loro fine non è la nostra fine.
  */
  useEffect(() => {
    impostaFineLettura(() => {
      if (miaLetturaRef.current) fineBlocco();
    });
    return () => impostaFineLettura(null);
  }, [fineBlocco, impostaFineLettura]);

  // ------------------------------------------------------------ navigazione
  const vaiA = useCallback(
    (li: number, ci: number) => {
      if (li === lezioneIdx && ci === capIdx) return;
      const stavaLeggendo = inCorso;
      fermaTutto();
      bloccoRef.current = null;
      setBloccoAttivo(null);
      setLezioneIdx(li);
      setCapIdx(ci);
      const l = lezioni[li];
      const c = l?.capitoli[ci];
      if (l && c) segnaAperto(concorsoId, l.materia, c.numero);
      // Cambiare capitolo non deve spegnere l'ascolto, tanto meno a schermo
      // intero: se stava leggendo, il nuovo capitolo riparte da solo.
      if (stavaLeggendo && l && c) avviaPrimoBlocco(li, ci);
    },
    [lezioneIdx, capIdx, inCorso, fermaTutto, lezioni, concorsoId, segnaAperto, avviaPrimoBlocco]
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

  // ------------------------------------------------------------ riproduzione
  const avvia = useCallback(
    (blocco: number) => {
      if (!capitolo || !lezione) return;
      setAutoplay(true);
      bloccoRef.current = blocco;
      setBloccoAttivo(blocco);
      segnaAperto(concorsoId, lezione.materia, capitolo.numero);
      if (!usaSilenzio) segnaVoceUsata();
      leggiDallInizio(testoBlocco(capitolo.blocchi[blocco]), `auto-${blocco}`, velocita);
      const prossimo = capitolo.blocchi[blocco + 1];
      if (prossimo && !usaSilenzio) prefetch(testoBlocco(prossimo));
    },
    [
      capitolo,
      lezione,
      leggiDallInizio,
      velocita,
      usaSilenzio,
      prefetch,
      concorsoId,
      segnaAperto,
    ]
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
    const nostra = miaLetturaRef.current && (stato === "speaking" || stato === "paused");
    if (nostra) commutaPausa();
    else avvia(bloccoRef.current ?? 0);
  }, [
    usaSilenzio,
    silenzio.attivo,
    silenzio.inPausa,
    pausaSilenzio,
    riprendiSilenzio,
    stato,
    commutaPausa,
    avvia,
  ]);

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
   * Salto di blocco **senza fermare l'ascolto**: è quello che serve a un
   * player (e ai tasti delle cuffie), dove avanti/indietro non devono
   * interrompere la lettura.
   */
  const bloccoSuccessivo = useCallback(() => {
    if (!capitolo || bloccoRef.current === null) return;
    const prossimo = bloccoRef.current + 1;
    if (prossimo < capitolo.blocchi.length) avvia(prossimo);
  }, [capitolo, avvia]);

  const bloccoPrecedente = useCallback(() => {
    if (!capitolo || bloccoRef.current === null) return;
    avvia(Math.max(0, bloccoRef.current - 1));
  }, [capitolo, avvia]);

  /**
   * Segnala che la voce va riavviata al prossimo cambio di velocità. Il
   * riavvio avviene in un effetto, così la sintesi usa le impostazioni nuove.
   */
  const riavvioVelocitaRef = useRef(false);

  /**
   * Cambio di velocità a caldo. I motori TTS non cambiano ritmo durante una
   * sintesi: il blocco corrente riparte dall'inizio. Il riavvio avviene in un
   * effetto, così `parla` vede già le impostazioni nuove (chiamarlo subito
   * dopo `aggiorna` userebbe la closure vecchia). Il timer silenzioso invece
   * si riavvia subito: non passa dal hook voce e non ha closure da attendere.
   */
  const cambiaVelocita = useCallback(
    (v: number) => {
      const attivo = usaSilenzio
        ? silenzio.attivo || silenzio.inPausa
        : stato === "speaking" || stato === "paused";
      aggiorna({ velocita: v });
      if (!attivo) return;
      if (usaSilenzio && capitolo && bloccoRef.current !== null) {
        avviaSilenzio(testoBlocco(capitolo.blocchi[bloccoRef.current]), v);
      } else {
        riavvioVelocitaRef.current = true;
      }
    },
    [aggiorna, usaSilenzio, silenzio.attivo, silenzio.inPausa, stato, capitolo, avviaSilenzio]
  );

  // Riavvio della voce al cambio velocità: qui `impostazioni.velocita` è già
  // quella nuova, quindi `parla` sintetizza al ritmo giusto.
  useEffect(() => {
    if (!riavvioVelocitaRef.current) return;
    riavvioVelocitaRef.current = false;
    if (bloccoRef.current !== null) avvia(bloccoRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [impostazioni.velocita]);

  /**
   * Tap su una parola o su una frase: si riparte da lì. Supportato dalla voce
   * nativa (`WebSpeech`) e dal timer; con la voce neurale riparte dall'inizio.
   */
  const riprendiDaParola = useCallback(
    (offset: number) => {
      if (!capitolo || bloccoRef.current === null) return;
      const testo = testoBlocco(capitolo.blocchi[bloccoRef.current]);

      /*
        Blocco registrato: si torna all'inizio della frase toccata dentro il
        file — l'audio di una registrazione non si può rigenerare a metà frase,
        quindi la granularità è la frase (la stessa dell'evidenziazione).
        Solo per il blocco che sta suonando: altrimenti vale il percorso normale.
      */
      const reg = registrazionePer(testo);
      if (reg && lettoreRegistrazioni.attivo()) {
        const i = reg.frasi.findIndex((f) => offset >= f.inizio && offset < f.fine);
        if (i >= 0) {
          lettoreRegistrazioni.riprendiDaFrase(i);
          return;
        }
      }

      // Il testo viene letto a partire da qui: il karaoke deve sommare
      // l'offset, altrimenti evidenzierebbe le prime parole del blocco.
      setOffsetKaraoke(offset);
      leggiBlocco(testo.slice(offset), `auto-${bloccoRef.current}#${offset}`, velocita);
    },
    [capitolo, leggiBlocco, velocita]
  );

  /**
   * Chiude la sessione: la voce tace, il blocco si deseleziona, l'autoplay si
   * spegne. È il "chiudi" del player.
   */
  const interrompi = useCallback(() => {
    fermaTutto();
    bloccoRef.current = null;
    setBloccoAttivo(null);
    setAutoplay(false);
    setSchermoIntero(false);
  }, [fermaTutto]);

  /**
   * Audio on/off: interrompe, perché la scena non ha più senso con le vecchie
   * impostazioni. Lo gestiamo nell'evento, non con un effetto che reagisce.
   */
  const alternaAudio = useCallback(() => {
    interrompi();
    setAudio((v) => !v);
  }, [interrompi, setAudio]);

  // --------------------------------------------------- cambio di concorso
  const concorsoRef = useRef<string | null>(null);

  /**
   * La pagina della lezione consegna qui il proprio programma. Si carica una
   * volta per concorso: tornare sulla pagina dello stesso concorso non
   * interrompe l'ascolto in corso, cambiare concorso sì — la voce precedente
   * non ha più niente a che vedere con ciò che si sta guardando.
   */
  const carica = useCallback(
    (id: string, elenco: Lezione[]) => {
      if (concorsoRef.current === id) return;
      concorsoRef.current = id;
      fermaTutto();
      bloccoRef.current = null;
      setBloccoAttivo(null);
      setAutoplay(false);
      setLezioneIdx(0);
      setCapIdx(0);
      setDati({ concorsoId: id, lezioni: elenco });
    },
    [fermaTutto]
  );

  // -------------------------------------------------------------- traccia
  const traccia = useMemo<Traccia | null>(() => {
    if (!lezione || !capitolo) return null;
    return {
      concorsoId,
      materia: lezione.materia,
      titolo: capitolo.titolo,
      numero: capitolo.numero,
      href: `/concorso/${concorsoId}/#cap-${slug(lezione.materia)}-${capitolo.numero}`,
      indiceCapitolo: capIdx + 1,
      totaleCapitoli: lezione.capitoli.length,
      indiceBlocco: bloccoAttivo === null ? null : bloccoAttivo + 1,
      totaleBlocchi: capitolo.blocchi.length,
    };
  }, [lezione, capitolo, concorsoId, capIdx, bloccoAttivo]);

  const durataBlocco = useMemo(
    () =>
      capitolo && bloccoAttivo !== null
        ? millisecondiStimati(testoBlocco(capitolo.blocchi[bloccoAttivo]), velocita)
        : 0,
    [capitolo, bloccoAttivo, velocita]
  );

  const testoCorrente = useMemo(
    () => (capitolo && bloccoAttivo !== null ? testoBlocco(capitolo.blocchi[bloccoAttivo]) : ""),
    [capitolo, bloccoAttivo]
  );

  /**
   * Il capitolo appena aperto si porta dietro il suo audio registrato: poche
   * centinaia di kilobyte che tolgono di mezzo anche l'attesa della rete. Senza,
   * il primo play aspetterebbe il download del file.
   */
  useEffect(() => {
    if (!capitolo) return;
    precaricaRegistrazioni(capitolo.blocchi.map(testoBlocco));
  }, [capitolo]);

  // ------------------------------------------- sistema: blocco e comandi
  const azioni = useMemo<AzioniSistema>(
    () => ({
      riprendi: () => {
        if (!inRiproduzione) alternaPausa();
      },
      pausa: () => {
        if (inRiproduzione) alternaPausa();
      },
      ferma: interrompi,
      avanti: bloccoSuccessivo,
      indietro: bloccoPrecedente,
      capitoloAvanti: capitoloSuccessivo,
      capitoloIndietro: capitoloPrecedente,
    }),
    [
      inRiproduzione,
      alternaPausa,
      interrompi,
      bloccoSuccessivo,
      bloccoPrecedente,
      capitoloSuccessivo,
      capitoloPrecedente,
    ]
  );

  const albumConcorso = CONCORSI.find((c) => c.id === concorsoId)?.titolo ?? "";

  useMediaSession({
    titolo: bloccoAttivo === null ? null : capitolo?.titolo ?? null,
    artista: lezione?.materia ?? null,
    album: albumConcorso,
    inRiproduzione,
    inCorso,
    durataMs: durataBlocco,
    posizioneMs:
      durataBlocco > 0 && testoCorrente.length > 0
        ? Math.round(durataBlocco * (posizione / testoCorrente.length))
        : 0,
    azioni,
  });

  useSchermoAcceso(inRiproduzione);

  // ------------------------------------------------------- barra flottante
  const inPaginaLezione = percorso?.startsWith("/concorso/") ?? false;
  /**
   * Il player a schermo intero è davvero aperto solo se c'è un blocco da
   * mostrare: senza sessione non ha senso tenerlo in piedi, e la barra
   * flottante deve tornare al suo posto.
   */
  const schermoInteroAttivo = schermoIntero && bloccoAttivo !== null;

  /**
   * La barra flottante (§3C) accompagna l'app finché c'è un blocco aperto: la
   * lettura in corso, la pausa e anche il blocco finito (dove serve un tasto
   * per ripartire). Non compare a schermo intero (sarebbe un doppione) né sul
   * lettore in modalità Ascolta, che ha già il suo dock: due telecomandi per lo
   * stesso audio sono un ottimo modo per confondere.
   */
  const barraVisibile =
    bloccoAttivo !== null && !schermoInteroAttivo && !(inPaginaLezione && inAscolto);

  /**
   * Lo spazio in fondo alle pagine dipende dalla barra: lo dichiariamo sul
   * documento e lo risolve il CSS, così il contenuto non resta sotto il player
   * e nessun componente deve sapere se la barra c'è.
   */
  useEffect(() => {
    const radice = document.documentElement;
    if (barraVisibile) radice.setAttribute("data-audio", "si");
    else radice.removeAttribute("data-audio");
  }, [barraVisibile]);

  const valore = useMemo<ValoreSessione>(
    () => ({
      concorsoId,
      lezioni,
      lezioneIdx,
      capIdx,
      lezione,
      capitolo,
      bloccoAttivo,
      bloccoRef,
      traccia,
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
      schermoIntero: schermoInteroAttivo,
      barraVisibile,
      carica,
      avvia,
      alternaPausa,
      fermaTutto,
      interrompi,
      vaiA,
      vaiAlBlocco,
      bloccoSuccessivo,
      bloccoPrecedente,
      capitoloSuccessivo,
      capitoloPrecedente,
      cambiaVelocita,
      riprendiDaParola,
      alternaAudio,
      apriSchermoIntero: () => setSchermoIntero(true),
      chiudiSchermoIntero: () => setSchermoIntero(false),
    }),
    [
      concorsoId,
      lezioni,
      lezioneIdx,
      capIdx,
      lezione,
      capitolo,
      bloccoAttivo,
      traccia,
      autoplay,
      usaSilenzio,
      disponibile,
      audio,
      velocita,
      inCorso,
      inRiproduzione,
      inPreparazione,
      durataBlocco,
      schermoInteroAttivo,
      barraVisibile,
      carica,
      avvia,
      alternaPausa,
      fermaTutto,
      interrompi,
      vaiA,
      vaiAlBlocco,
      bloccoSuccessivo,
      bloccoPrecedente,
      capitoloSuccessivo,
      capitoloPrecedente,
      cambiaVelocita,
      riprendiDaParola,
      alternaAudio,
    ]
  );

  return (
    <Contesto.Provider value={valore}>
      {/* La posizione cambia a ogni frame: contesto a parte, consumatori pochi. */}
      <ContestoPosizione.Provider value={posizione}>{children}</ContestoPosizione.Provider>
    </Contesto.Provider>
  );
}

export function useSessioneAudio(): ValoreSessione {
  const valore = useContext(Contesto);
  if (!valore) {
    throw new Error("useSessioneAudio deve essere usato dentro <FornitoreSessioneAudio>");
  }
  return valore;
}

/**
 * Posizione nel blocco (indice carattere) per il karaoke.
 *
 * Separata dalla sessione perché cambia a ogni frame: chi non mostra il testo
 * che scorre non deve ridisegnarsi con lei.
 */
export function usePosizioneLettura(): number {
  return useContext(ContestoPosizione);
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
 * Il primo blocco del capitolo che segue quello indicato, se esiste.
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
