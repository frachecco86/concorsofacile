"use client";

import { creaArchivio, useArchivio } from "./archivio";

/**
 * Progresso delle lezioni, salvato localmente.
 *
 * Un capitolo è "ascoltato" quando la voce lo ha letto fino in fondo — non
 * quando è stato semplicemente aperto. Così il progresso riflette l'ascolto
 * reale e non la navigazione.
 */

const CHIAVE = "concorsofacile.studio.v1";

export interface StatoLezioni {
  /** Chiavi dei capitoli completati: `<concorsoId>|<materia>|<numero>`. */
  completati: string[];
  /** Ultimo capitolo aperto, per riprendere da dove si era rimasti. */
  ultimo: {
    concorsoId: string;
    materia: string;
    capitolo: number;
  } | null;
}

const VUOTO: StatoLezioni = { completati: [], ultimo: null };

const archivio = creaArchivio<StatoLezioni>(CHIAVE, VUOTO);

export function chiaveCapitolo(
  concorsoId: string,
  materia: string,
  numero: number
): string {
  return `${concorsoId}|${materia}|${numero}`;
}

/** Hook di lettura/scrittura del progresso delle lezioni. */
export function useStudio() {
  const [stato, scrivi] = useArchivio(archivio);

  const segnaCompletato = (
    concorsoId: string,
    materia: string,
    numero: number
  ) => {
    const k = chiaveCapitolo(concorsoId, materia, numero);
    scrivi((s) => ({
      ...s,
      completati: s.completati.includes(k) ? s.completati : [...s.completati, k],
      ultimo: { concorsoId, materia, capitolo: numero },
    }));
  };

  const segnaAperto = (
    concorsoId: string,
    materia: string,
    numero: number
  ) => {
    scrivi((s) => ({ ...s, ultimo: { concorsoId, materia, capitolo: numero } }));
  };

  const azzera = () => scrivi(VUOTO);

  const completato = (concorsoId: string, materia: string, numero: number) =>
    stato.completati.includes(chiaveCapitolo(concorsoId, materia, numero));

  const quantiCompletati = (concorsoId: string, materia?: string) =>
    stato.completati.filter(
      (k) =>
        k.startsWith(`${concorsoId}|`) && (!materia || k.startsWith(`${concorsoId}|${materia}|`))
    ).length;

  return { stato, segnaCompletato, segnaAperto, completato, quantiCompletati, azzera };
}
