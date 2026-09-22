"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Preferenze del lettore, salvate localmente.
 *
 * Due scelte indipendenti:
 * - **modalità**: `leggi` (lista impilata) o `ascolta` (scena + player);
 * - **audio**: se la voce deve parlare davvero o se la lettura avanza in
 *   silenzio con il timer stimato.
 *
 * Il default è `ascolta` quando la voce è già stata usata in passato, così chi
 * ha già ascoltato torna nella sua modalità; al primo giro si entra in `leggi`,
 * che è la vista più conservativa.
 *
 * `localStorage` è uno store esterno a React: lo leggiamo con
 * `useSyncExternalStore`, che gestisce da solo la differenza fra server e
 * client senza effetti di inizializzazione.
 */

export type ModalitaLettore = "leggi" | "ascolta";

const CHIAVE_MODALITA = "concorsofacile.lettore.modalita.v1";
const CHIAVE_AUDIO = "concorsofacile.lettore.audio.v1";
const CHIAVE_VOCE_USATA = "concorsofacile.voce.usata.v1";

function leggi(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null; // storage non disponibile (modalità privata)
  }
}

function scrivi(chiave: string, valore: string): void {
  try {
    localStorage.setItem(chiave, valore);
  } catch {
    /* niente da fare: la preferenza resta solo in memoria */
  }
}

export interface PreferenzeLettore {
  modalita: ModalitaLettore;
  audio: boolean;
}

const PREDEFINITE: PreferenzeLettore = { modalita: "leggi", audio: true };

let cache: PreferenzeLettore | null = null;
const ascoltatori = new Set<() => void>();

/** Snapshot corrente, letto una sola volta da `localStorage`. */
function istantanea(): PreferenzeLettore {
  if (cache) return cache;
  const salvata = leggi(CHIAVE_MODALITA);
  const modalitaValid = salvata === "leggi" || salvata === "ascolta";
  cache = {
    modalita: modalitaValid
      ? (salvata as ModalitaLettore)
      : leggi(CHIAVE_VOCE_USATA) === "si"
        ? "ascolta"
        : "leggi",
    audio: leggi(CHIAVE_AUDIO) !== "off",
  };
  return cache;
}

/** Snapshot lato server: nessuno storage, si parte dai valori predefiniti. */
function istantaneaServer(): PreferenzeLettore {
  return PREDEFINITE;
}

function iscriviti(cb: () => void): () => void {
  ascoltatori.add(cb);
  return () => ascoltatori.delete(cb);
}

function aggiorna(patch: Partial<PreferenzeLettore>): void {
  const prossimo = { ...istantanea(), ...patch };
  cache = prossimo;
  scrivi(CHIAVE_MODALITA, prossimo.modalita);
  scrivi(CHIAVE_AUDIO, prossimo.audio ? "on" : "off");
  for (const cb of ascoltatori) cb();
}

/** Ricorda per sempre che l'utente ha usato la voce (default futuro). */
export function segnaVoceUsata(): void {
  scrivi(CHIAVE_VOCE_USATA, "si");
}

export function useModalitaLettore() {
  const stato = useSyncExternalStore(iscriviti, istantanea, istantaneaServer);

  const cambiaModalita = useCallback((m: ModalitaLettore) => aggiorna({ modalita: m }), []);
  const setAudio = useCallback(
    (v: boolean | ((prev: boolean) => boolean)) =>
      aggiorna({ audio: typeof v === "function" ? v(istantanea().audio) : v }),
    []
  );

  return { ...stato, cambiaModalita, setAudio };
}
