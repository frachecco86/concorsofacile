import path from "node:path";
import type { IndiceMaterie, Materia, MateriaIndice } from "./tipi";

/**
 * Accesso ai dati estratti dalla pipeline (`scripts/extract.mjs`).
 *
 * Due modalità, stessa interfaccia:
 *
 * 1. **Server** (dev e build): legge `data/` dal filesystem. Veloce e senza
 *    copie inutili. È il percorso usato da `next dev` e da `next build` quando
 *    genera le pagine statiche.
 *
 * 2. **Browser** (export statico, PWA, GitHub Pages senza build): legge
 *    `data/` via HTTP dalla cartella pubblica. Necessario perché l'app può
 *    essere servita da un host che non esegue Node.
 *
 * Il rilevamento è automatico: se il filesystem non è leggibile si passa a HTTP.
 * Così la stessa app funziona su qualunque host, gratuito o no.
 */

const DATA_DIR = path.join(process.cwd(), "public", "data");
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Il filesystem è disponibile solo in ambiente Node (build/dev). */
const haFilesystem = typeof window === "undefined";

/**
 * `node:fs` è importato dinamicamente e solo lato Node: così questo modulo
 * resta importabile anche da un componente client senza rompere il bundle.
 */
async function fsPromises() {
  return await import("node:fs/promises");
}

// --- cache di processo: i dati sono immutabili a runtime ------------------

let cacheIndice: IndiceMaterie | null = null;
const cacheMaterie = new Map<string, Materia>();

function normalizzaId(id: string): string | null {
  // Difesa da path traversal: gli id sono slug semplici.
  return /^[a-z0-9_-]+$/i.test(id) ? id : null;
}

async function leggiJson<T>(percorsoRelativo: string): Promise<T | null> {
  if (haFilesystem) {
    try {
      const fs = await fsPromises();
      const raw = await fs.readFile(path.join(DATA_DIR, percorsoRelativo), "utf8");
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  // Fallback HTTP: `data/` deve essere raggiungibile dal bundler statico.
  try {
    const res = await fetch(`${BASE}/data/${percorsoRelativo}`, { cache: "force-cache" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function leggiIndice(): Promise<IndiceMaterie> {
  if (cacheIndice) return cacheIndice;
  const dati = await leggiJson<IndiceMaterie>("materie.json");
  cacheIndice = dati ?? {
    aggiornato: new Date().toISOString(),
    materieTotali: 0,
    quizTotali: 0,
    materie: [],
  };
  return cacheIndice;
}

export async function leggiMaterie(): Promise<MateriaIndice[]> {
  const indice = await leggiIndice();
  return indice.materie;
}

export async function leggiMateria(id: string): Promise<Materia | null> {
  const sicuro = normalizzaId(id);
  if (!sicuro) return null;
  if (cacheMaterie.has(sicuro)) return cacheMaterie.get(sicuro)!;

  const materia = await leggiJson<Materia>(`materie/${sicuro}.json`);
  if (materia) cacheMaterie.set(sicuro, materia);
  return materia;
}

/** Statistiche aggregate per la home. */
export async function leggiStatistiche() {
  const indice = await leggiIndice();
  const piuGrandi = [...indice.materie]
    .sort((a, b) => b.quizCount - a.quizCount)
    .slice(0, 6);
  return {
    materie: indice.materieTotali,
    quiz: indice.quizTotali,
    aggiornato: indice.aggiornato,
    piuGrandi,
  };
}
