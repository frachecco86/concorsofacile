"use client";

import { useCallback } from "react";
import type { Materia, RispostaSessione } from "./tipi";
import { creaArchivio, useArchivio, ascoltaAltreSchede } from "./archivio";

/**
 * Progressi dell'utente, salvati localmente.
 *
 * Scelta deliberata: nessun account, nessun server, nessuna attesa. I progressi
 * vivono in `localStorage` e sono immediatamente disponibili offline. Se in
 * futuro servirà la sincronizzazione, questa è l'unica interfaccia da cambiare.
 */

const CHIAVE_PROGRESSI = "concorsofacile.progressi.v1";
const CHIAVE_SESSIONE = "concorsofacile.sessione.v1";

export interface ProgressoMateria {
  materiaId: string;
  materiaNome: string;
  /** Numeri dei quiz già affrontati (limitati a 5000 per sicurezza). */
  visti: number[];
  /** Numeri dei quiz segnati "da rivedere". */
  daRivedere: number[];
  /** Numeri dei quiz saputi. */
  saputi: number[];
  ultimaVolta: string;
  sessioni: number;
}

export type Progressi = Record<string, ProgressoMateria>;

/** Stato di una sessione in corso: un refresh non la perde. */
export interface SessioneSalvata {
  materiaId: string;
  materiaNome: string;
  ordine: number[];
  indice: number;
  risposte: RispostaSessione[];
  iniziata: string;
}

// Archivi a livello di modulo: una sola fonte di verità per tutta l'app.
const archivioProgressi = creaArchivio<Progressi>(CHIAVE_PROGRESSI, {});
const archivioSessione = creaArchivio<SessioneSalvata | null>(CHIAVE_SESSIONE, null);

// Le modifiche fatte in un'altra scheda invalidano la cache locale.
// (L'archivio rilegge al prossimo giro: qui basta notificare gli iscritti.)
if (typeof window !== "undefined") {
  ascoltaAltreSchede(CHIAVE_PROGRESSI, () => {
    try {
      const raw = window.localStorage.getItem(CHIAVE_PROGRESSI);
      archivioProgressi.scrivi(raw ? (JSON.parse(raw) as Progressi) : {});
    } catch {
      /* ignora */
    }
  });
}

/** Durata massima della cronologia tenuta per materia. */
const MAX_CRONOLOGIA = 5000;

export function useProgressi() {
  const [progressi, scriviProgressi] = useArchivio(archivioProgressi);

  const registra = useCallback(
    (materia: Materia, risposte: RispostaSessione[]) => {
      scriviProgressi((correnti) => {
        const precedente: ProgressoMateria = correnti[materia.id] ?? {
          materiaId: materia.id,
          materiaNome: materia.nome,
          visti: [],
          daRivedere: [],
          saputi: [],
          ultimaVolta: new Date().toISOString(),
          sessioni: 0,
        };

        const visti = new Set(precedente.visti);
        const daRivedere = new Set(precedente.daRivedere);
        const saputi = new Set(precedente.saputi);

        for (const r of risposte) {
          visti.add(r.numero);
          if (r.saputa) {
            saputi.add(r.numero);
            daRivedere.delete(r.numero);
          } else {
            daRivedere.add(r.numero);
            saputi.delete(r.numero);
          }
        }

        return {
          ...correnti,
          [materia.id]: {
            ...precedente,
            visti: [...visti].slice(-MAX_CRONOLOGIA),
            daRivedere: [...daRivedere].slice(-MAX_CRONOLOGIA),
            saputi: [...saputi].slice(-MAX_CRONOLOGIA),
            ultimaVolta: new Date().toISOString(),
            sessioni: precedente.sessioni + 1,
          },
        };
      });
    },
    [scriviProgressi]
  );

  const azzera = useCallback(
    (materiaId?: string) => {
      scriviProgressi((correnti) => {
        if (!materiaId) return {};
        const nuovo = { ...correnti };
        delete nuovo[materiaId];
        return nuovo;
      });
    },
    [scriviProgressi]
  );

  const progressoDi = useCallback(
    (materiaId: string): ProgressoMateria | undefined => progressi[materiaId],
    [progressi]
  );

  return { progressi, registra, azzera, progressoDi };
}

/** Sessione in corso della materia indicata, con scrittura. */
export function useSessioneSalvata(materiaId: string) {
  const [tutte, scriviSessione] = useArchivio(archivioSessione);

  // La sessione salvata appartiene a una materia sola: filtriamo qui.
  const salvata = tutte && tutte.materiaId === materiaId ? tutte : null;

  const salva = useCallback(
    (s: SessioneSalvata | null) => scriviSessione(s),
    [scriviSessione]
  );

  const azzera = useCallback(() => scriviSessione(null), [scriviSessione]);

  return { salvata, salva, azzera };
}

/**
 * Costruisce l'ordine dei quiz di una sessione.
 *
 * Mescola le domande (una sessione è sempre "nuova") ma rispetta due priorità:
 * prima i quiz segnati "da rivedere", poi quelli mai visti, infine i già visti.
 * Questo è il "contesto" dell'apprendimento: non un ordine casuale fine a se
 * stesso, ma il ripasso di ciò che è rimasto indietro.
 */
export function costruisciOrdine(
  materia: Materia,
  progresso: ProgressoMateria | undefined,
  quanti: number
): number[] {
  const tutti = materia.quiz.map((q) => q.numero);
  const daRivedere = new Set(progresso?.daRivedere ?? []);
  const visti = new Set(progresso?.visti ?? []);

  const priorita = (n: number) => (daRivedere.has(n) ? 0 : visti.has(n) ? 2 : 1);
  const mescolato = mescola(tutti).sort((a, b) => priorita(a) - priorita(b));

  return mescolato.slice(0, Math.max(1, Math.min(quanti, tutti.length)));
}

/** Fisher–Yates non mutante. */
function mescola<T>(array: T[]): T[] {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface RiepilogoProgressi {
  voci: ProgressoMateria[];
  quizVisti: number;
  saputi: number;
  daRivedere: number;
  sessioni: number;
}

/** Statistiche riepilogative dai progressi. Funzione pura: nessun hook. */
export function riepilogaProgressi(progressi: Progressi): RiepilogoProgressi {
  const voci = Object.values(progressi).filter(
    (p): p is ProgressoMateria => Boolean(p)
  );
  return {
    voci: [...voci].sort(
      (a, b) =>
        new Date(b.ultimaVolta).getTime() - new Date(a.ultimaVolta).getTime()
    ),
    quizVisti: voci.reduce((s, p) => s + p.visti.length, 0),
    saputi: voci.reduce((s, p) => s + p.saputi.length, 0),
    daRivedere: voci.reduce((s, p) => s + p.daRivedere.length, 0),
    sessioni: voci.reduce((s, p) => s + p.sessioni, 0),
  };
}
