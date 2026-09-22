"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, PartyPopper, RotateCcw, Trophy } from "lucide-react";
import type { Materia, RispostaSessione } from "@/lib/dati/tipi";
import { costruisciOrdine, useProgressi, useSessioneSalvata } from "@/lib/dati/progressi";
import { durata, num } from "@/lib/ui";
import { CardQuiz } from "./CardQuiz";
import { ControlliTrasporto } from "./PulsanteVoce";
import { SelettoreQuantita } from "./SelettoreQuantita";

/**
 * Sessione di studio: N domande in sequenza, con esito finale.
 *
 * La sessione viene salvata dopo ogni risposta, quindi un refresh (o il
 * telefono che si chiude) non fa perdere il progresso.
 */
export function SessioneStudio({ materia }: { materia: Materia }) {
  const { progressoDi, registra } = useProgressi();
  const { salvata, salva, azzera } = useSessioneSalvata(materia.id);

  const progresso = progressoDi(materia.id);

  /**
   * Stato iniziale risolto **una sola volta**, alla creazione del componente:
   * se esisteva una sessione interrotta la si riprende, altrimenti si costruisce
   * subito l'ordine in base ai progressi. Così non serve alcun effect che
   * inizializzi lo stato (che causerebbe un render in più e un lampo).
   */
  const [stato, setStato] = useState(() => {
    if (salvata) {
      return { ...salvata, conclusa: false, ripresa: salvata.risposte.length > 0 };
    }
    return {
      ordine: costruisciOrdine(materia, progresso, 10),
      indice: 0,
      risposte: [] as RispostaSessione[],
      iniziata: new Date().toISOString(),
      conclusa: false,
      ripresa: false,
    };
  });

  /** Quante domande: scelta locale, l'app è statica e non legge l'URL. */
  const [quanti, setQuanti] = useState(() => stato.ordine.length);
  /** L'utente ha accettato di riprendere la sessione interrotta? */
  const [avviata, setAvviata] = useState(false);

  const { ordine, indice, risposte, iniziata, conclusa } = stato;

  /**
   * Ogni cambiamento della sessione viene persistito: un refresh, o il
   * telefono che si chiude, non fanno perdere il punto.
   * `scrivi` è stabile, quindi questo effect non riparte a ogni render.
   */
  useEffect(() => {
    if (ordine.length === 0 || conclusa) return;
    salva({
      materiaId: materia.id,
      materiaNome: materia.nome,
      ordine,
      indice,
      risposte,
      iniziata,
    });
  }, [ordine, indice, risposte, iniziata, materia.id, materia.nome, conclusa, salva]);

  const quizCorrente = useMemo(() => {
    const numero = ordine[indice];
    return materia.quiz.find((q) => q.numero === numero) ?? null;
  }, [ordine, indice, materia.quiz]);

  const handleRisultato = useCallback(
    (saputa: boolean) => {
      const numero = ordine[indice];
      if (numero === undefined) return;
      setStato((s) => ({
        ...s,
        risposte: [...s.risposte, { numero, saputa, tempo: 0 }],
      }));
    },
    [ordine, indice]
  );

  const avanti = useCallback(() => {
    setStato((s) => {
      const prossimo = s.indice + 1;
      // Oltre l'ultima domanda la sessione è conclusa e i progressi vengono
      // registrati subito, una volta sola.
      if (prossimo >= s.ordine.length) {
        registra(materia, s.risposte);
        azzera();
        return { ...s, conclusa: true };
      }
      return { ...s, indice: prossimo };
    });
  }, [registra, materia, azzera]);

  const indietro = useCallback(() => {
    setStato((s) => ({
      ...s,
      indice: Math.max(0, s.indice - 1),
      risposte: s.risposte.slice(0, -1),
    }));
  }, []);

  const ricomincia = useCallback(
    (soloDaRivedere: boolean) => {
      const sbagliate = risposte.filter((r) => !r.saputa).map((r) => r.numero);
      const nuovo =
        soloDaRivedere && sbagliate.length > 0
          ? sbagliate
          : costruisciOrdine(materia, progresso, quanti);
      setStato({
        ordine: nuovo,
        indice: 0,
        risposte: [],
        iniziata: new Date().toISOString(),
        conclusa: false,
        ripresa: false,
      });
      azzera();
    },
    [risposte, materia, progresso, quanti, azzera]
  );

  // Avvio manuale quando c'è una sessione da riprendere che ha già risposte.
  if (stato.ripresa && !avviata) {
    return (
      <Ripristino
        materia={materia}
        fatte={stato.risposte.length}
        totali={stato.ordine.length}
        onRiprendi={() => setAvviata(true)}
        onRicomincia={() => {
          ricomincia(false);
          setAvviata(true);
        }}
      />
    );
  }

  if (ordine.length === 0) {
    return <div className="h-64 animate-shimmer rounded-[28px]" />;
  }

  if (conclusa) {
    return (
      <Esito
        materia={materia}
        risposte={risposte}
        iniziata={iniziata}
        onRicomincia={() => ricomincia(false)}
        onRivediErrori={() => ricomincia(true)}
      />
    );
  }

  if (!quizCorrente) return null;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold">{materia.nome}</span>
        </div>
        <div className="flex items-center gap-2">
          <ControlliTrasporto />
          <SelettoreQuantita
            quanti={quanti}
            totali={materia.quizCount}
            disabilitato={risposte.length > 0}
            onCambia={(n) => {
              setQuanti(n);
              setStato({
                ordine: costruisciOrdine(materia, progresso, n),
                indice: 0,
                risposte: [],
                iniziata: new Date().toISOString(),
                conclusa: false,
                ripresa: false,
              });
              azzera();
            }}
          />
        </div>
      </div>

      <CardQuiz
        quiz={quizCorrente}
        indice={indice}
        totale={ordine.length}
        onRisultato={handleRisultato}
        onAvanti={avanti}
        onIndietro={indietro}
        puoIndietro={indice > 0}
      />

      <p className="mt-5 text-center text-xs text-ink-muted">
        <TastiUtili />
      </p>
    </div>
  );
}

function TastiUtili() {
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
      <span>
        <b className="font-semibold text-ink-soft">Spazio</b> rivela
      </span>
      <span className="text-sage-300">·</span>
      <span>
        <b className="font-semibold text-ink-soft">1</b> la sapevo
      </span>
      <span className="text-sage-300">·</span>
      <span>
        <b className="font-semibold text-ink-soft">2</b> da rivedere
      </span>
      <span className="text-sage-300">·</span>
      <span>
        <b className="font-semibold text-ink-soft">R</b> rileggi
      </span>
    </span>
  );
}

function Ripristino({
  materia,
  fatte,
  totali,
  onRiprendi,
  onRicomincia,
}: {
  materia: Materia;
  fatte: number;
  totali: number;
  onRiprendi: () => void;
  onRicomincia: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[28px] border border-brand-200 bg-brand-50 p-8 text-center shadow-[var(--shadow-soft)]"
    >
      <h2 className="font-display text-2xl font-semibold">
        Sessione interrotta
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
        Avevi lasciato {materia.nome} a {fatte} domande su {totali}. Riprendi da
        dove eri o ricomincia da capo.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onRiprendi}
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-600 active:scale-[0.98]"
        >
          Riprendi
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          onClick={onRicomincia}
          className="inline-flex items-center gap-2 rounded-full border border-sage-200 bg-surface px-6 py-3 text-sm font-semibold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
        >
          <RotateCcw size={16} />
          Ricomincia
        </button>
      </div>
    </motion.div>
  );
}

function Esito({
  materia,
  risposte,
  iniziata,
  onRicomincia,
  onRivediErrori,
}: {
  materia: Materia;
  risposte: RispostaSessione[];
  iniziata: string;
  onRicomincia: () => void;
  onRivediErrori: () => void;
}) {
  const totali = risposte.length;
  const sapute = risposte.filter((r) => r.saputa).length;
  const errori = totali - sapute;
  const perc = totali > 0 ? Math.round((sapute / totali) * 100) : 0;
  // `ora` viene fissato all'apertura dell'esito: leggere l'orologio durante il
  // render sarebbe impuro e instabile tra re-render dello stesso componente.
  const [ora] = useState(() => Date.now());
  const tempo = ora - new Date(iniziata).getTime();

  const messaggio =
    perc >= 90
      ? "Padronanza. Questa materia è tua."
      : perc >= 70
        ? "Buon lavoro: le basi ci sono, rifinisci i dettagli."
        : perc >= 50
          ? "Sei sulla strada giusta, riprendi ciò che non torna."
          : "Nessun problema: è esattamente a questo che serve la sessione.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="paper-grain relative overflow-hidden rounded-[28px] border border-sage-200 bg-surface shadow-[var(--shadow-lift)]"
    >
      <div className="relative p-8 text-center sm:p-10">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
          {perc >= 70 ? <Trophy size={30} /> : <PartyPopper size={30} />}
        </div>

        <h2 className="font-display text-3xl font-semibold">
          {sapute}
          <span className="text-sage-400">/{totali}</span>
        </h2>
        <p className="mt-1 text-sm font-medium uppercase tracking-wider text-ink-muted">
          risposte sapute
        </p>

        <p className="mx-auto mt-5 max-w-md font-display text-xl leading-relaxed text-ink-soft">
          {messaggio}
        </p>

        {/* Anello di progresso */}
        <div className="mx-auto mt-7 max-w-xs">
          <div className="h-3 overflow-hidden rounded-full bg-sage-200">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500"
              initial={{ width: 0 }}
              animate={{ width: `${perc}%` }}
              transition={{ delay: 0.2, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-ink-muted">
            <span className="tnum">{perc}%</span>
            <span className="tnum">{durata(tempo)} di studio</span>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Dato etichetta="Materia" valore={materia.nome} />
          <Dato etichetta="Da rivedere" valore={num(errori)} accent="sun" />
          <Dato etichetta="Sapute" valore={num(sapute)} accent="leaf" />
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRicomincia}
            className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-600 active:scale-[0.98]"
          >
            <RotateCcw size={16} />
            Nuova sessione
          </button>
          {errori > 0 && (
            <button
              type="button"
              onClick={onRivediErrori}
              className="inline-flex items-center gap-2 rounded-full border-2 border-sun-500/30 bg-sun-100 px-6 py-3 text-sm font-bold text-sun-500 transition hover:border-sun-500/60 active:scale-[0.98]"
            >
              Rivedi i {num(errori)} errori
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function Dato({
  etichetta,
  valore,
  accent,
}: {
  etichetta: string;
  valore: string;
  accent?: "sun" | "leaf";
}) {
  const colori = accent
    ? accent === "sun"
      ? "bg-sun-100 text-sun-500 border-sun-500/20"
      : "bg-leaf-100 text-leaf-600 border-leaf-500/20"
    : "bg-sage-50 text-ink border-sage-200";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-left ${colori}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
        {etichetta}
      </div>
      <div className="tnum mt-0.5 truncate font-display text-lg font-semibold">
        {valore}
      </div>
    </div>
  );
}
