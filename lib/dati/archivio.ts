"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Piccolo strato per sincronizzare React con `localStorage`.
 *
 * Perché non `useEffect` + `setState`: leggere una sorgente esterna dentro un
 * effect causa un render in più e un lampo di contenuto vuoto. L'API pensata
 * per questo è `useSyncExternalStore`, che:
 *
 * - legge il valore reale **prima** del primo paint (niente flash);
 * - gestisce da sé la discrepanza server/client (l'HTML statico non può
 *   conoscere il contenuto di localStorage);
 * - notifica tutte le istanze montate quando il valore cambia, quindi le
 *   schermate restano coerenti senza passarsi dati a mano.
 *
 * Astrazione minima e riutilizzata da progressi e sessione in corso.
 */

type Iscritto = () => void;

export interface Archivio<T> {
  /** Iscrizione ai cambiamenti (per `useSyncExternalStore`). */
  iscrivi: (cb: Iscritto) => () => void;
  /** Valore corrente. Deve essere referenzialmente stabile tra i render. */
  leggi: () => T;
  /** Valore per il render sul server (e per il primo render lato client). */
  leggiServer: () => T;
  /** Scrive e notifica tutti gli iscritti. */
  scrivi: (valore: T | ((corrente: T) => T)) => void;
}

export function creaArchivio<T>(chiave: string, iniziale: T): Archivio<T> {
  let valore: T = iniziale;
  let inizializzato = false;
  const iscritti = new Set<Iscritto>();

  const notifica = () => {
    for (const cb of iscritti) cb();
  };

  /** Lettura pigra: avviene alla prima iscrizione, non al momento dell'import. */
  const assicuraInizializzato = () => {
    if (inizializzato || typeof window === "undefined") return;
    inizializzato = true;
    try {
      const raw = window.localStorage.getItem(chiave);
      if (raw !== null) valore = JSON.parse(raw) as T;
    } catch {
      // Valore assente o corrotto: si resta sul valore iniziale.
    }
  };

  return {
    iscrivi(cb) {
      assicuraInizializzato();
      iscritti.add(cb);
      // Le altre schede aperte sullo stesso sito devono restare coerenti.
      return () => iscritti.delete(cb);
    },
    leggi() {
      assicuraInizializzato();
      return valore;
    },
    leggiServer() {
      return iniziale;
    },
    scrivi(aggiornamento) {
      assicuraInizializzato();
      valore =
        typeof aggiornamento === "function"
          ? (aggiornamento as (c: T) => T)(valore)
          : aggiornamento;
      try {
        window.localStorage.setItem(chiave, JSON.stringify(valore));
      } catch {
        // Quota esaurita o storage bloccato: il valore resta in memoria.
      }
      notifica();
    },
  };
}

/**
 * Sottoscrive un componente a un archivio.
 * Restituisce la tupla `[valore, scrivi]`.
 */
export function useArchivio<T>(archivio: Archivio<T>): [T, Archivio<T>["scrivi"]] {
  const valore = useSyncExternalStore(
    archivio.iscrivi,
    archivio.leggi,
    archivio.leggiServer
  );
  const scrivi = useCallback(
    (v: T | ((corrente: T) => T)) => archivio.scrivi(v),
    [archivio]
  );
  return [valore, scrivi];
}

/**
 * Tiene sincronizzate le schede dello stesso sito: se i progressi cambiano in
 * un'altra scheda, questa si aggiorna. L'evento `storage` è l'unico modo per
 * accorgersene.
 */
export function ascoltaAltreSchede(chiave: string, alCambio: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const gestore = (e: StorageEvent) => {
    if (e.key === chiave) alCambio();
  };
  window.addEventListener("storage", gestore);
  return () => window.removeEventListener("storage", gestore);
}
