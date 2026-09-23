"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Tema chiaro/scuro, salvato sul dispositivo.
 *
 * Stesso impianto di `lib/lettore/modalita.ts`: `localStorage` è uno store
 * esterno a React e va letto con `useSyncExternalStore`, che gestisce da solo
 * la differenza fra server e client senza effetti di inizializzazione (quindi
 * senza lampo di tema sbagliato al primo render).
 *
 * Il tema è applicato come `data-tema` sull'elemento `<html>`: le regole CSS
 * in `globals.css` ridefiniscono lì i token di colore. Un solo attributo, e
 * tutta l'app cambia pelle.
 */

export type Tema = "chiaro" | "scuro";

const CHIAVE = "concorsofacile.tema.v1";

/** Attributo letto dal CSS (`[data-tema="scuro"]`). */
export const ATTRIBUTO_TEMA = "data-tema";

function leggiSalvato(): Tema | null {
  try {
    const v = localStorage.getItem(CHIAVE);
    return v === "chiaro" || v === "scuro" ? v : null;
  } catch {
    return null; // storage non disponibile (modalità privata)
  }
}

function scriviSalvato(tema: Tema): void {
  try {
    localStorage.setItem(CHIAVE, tema);
  } catch {
    /* niente da fare: la preferenza resta solo in memoria */
  }
}

/** Tema di partenza: quello scelto, altrimenti la preferenza di sistema. */
function temaIniziale(): Tema {
  const salvato = leggiSalvato();
  if (salvato) return salvato;
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "scuro" : "chiaro";
  }
  return "chiaro";
}

let cache: Tema | null = null;
const ascoltatori = new Set<() => void>();

function istantanea(): Tema {
  if (!cache) cache = temaIniziale();
  return cache;
}

/** Lato server non c'è storage: si parte dal tema chiaro. */
function istantaneaServer(): Tema {
  return "chiaro";
}

function iscriviti(cb: () => void): () => void {
  ascoltatori.add(cb);
  return () => ascoltatori.delete(cb);
}

/** Applica il tema al documento e aggiorna il colore della barra del browser. */
export function applicaTema(tema: Tema): void {
  const radice = document.documentElement;
  radice.setAttribute(ATTRIBUTO_TEMA, tema);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", tema === "scuro" ? "#0f0f11" : "#f7faf8");
  }
}

export function impostaTema(tema: Tema): void {
  cache = tema;
  scriviSalvato(tema);
  applicaTema(tema);
  for (const cb of ascoltatori) cb();
}

export function useTema() {
  const tema = useSyncExternalStore(iscriviti, istantanea, istantaneaServer);

  const alterna = useCallback(() => {
    impostaTema(istantanea() === "scuro" ? "chiaro" : "scuro");
  }, []);

  return { tema, scuro: tema === "scuro", impostaTema, alterna };
}

/**
 * Script inline da mettere nell'`<head>` *prima* del primo paint.
 *
 * Senza questo, la pagina verrebbe disegnata in tema chiaro e solo dopo
 * l'idratazione passerebbe allo scuro: un lampo bianco, fastidioso di notte.
 * Lo script è volutamente minuscolo e non dipende da nulla.
 */
export const SCRIPT_TEMA = `(function(){try{var k='${CHIAVE}',s=localStorage.getItem(k),t=(s==='chiaro'||s==='scuro')?s:(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'scuro':'chiaro');document.documentElement.setAttribute('${ATTRIBUTO_TEMA}',t);}catch(e){}})();`;
