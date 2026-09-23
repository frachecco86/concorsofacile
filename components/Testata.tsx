"use client";

import Link from "next/link";
import { AlertTriangle, Menu, Search, Settings2 } from "lucide-react";
import { useVoce } from "@/lib/voce/hook";
import { cn } from "@/lib/ui";
import { Equalizzatore } from "./PulsanteVoce";

/**
 * Top bar mobile-first (direttive UX/UI §1A).
 *
 * Cresce con la safe area del dispositivo, resta **fissa a 56px** di contenuto
 * e tiene sempre la stessa geometria: hamburger a sinistra, marchio al centro,
 * azioni rapide a destra. Niente navigazione orizzontale: quella vive nel
 * drawer (§1B), così l'header non si allarga mai su schermi stretti.
 *
 * I comandi principali stanno a sinistra e a destra perché sono le due aree
 * raggiungibili dal pollice con la mano che impugna il telefono.
 */
export function Testata({
  onApriDrawer,
  onApriRicerca,
  onApriVoce,
}: {
  onApriDrawer: () => void;
  onApriRicerca: () => void;
  onApriVoce: () => void;
}) {
  const { stato, serveVoceNeurale, motore } = useVoce();

  const voceDaAttivare = serveVoceNeurale && motore === "dispositivo";

  return (
    <header className="pt-safe sticky top-0 z-40 border-b border-sage-200/80 bg-cream/85 backdrop-blur-xl">
      <div className="mx-auto grid h-14 max-w-5xl grid-cols-[auto_1fr_auto] items-center gap-1 px-2 sm:px-4">
        {/* Sinistra — drawer */}
        <button
          type="button"
          onClick={onApriDrawer}
          aria-label="Apri il menu"
          className="tap inline-flex items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 hover:text-ink active:scale-95"
        >
          <Menu size={22} />
        </button>

        {/* Centro — marchio */}
        <Link
          href="/"
          className="flex min-w-0 items-center justify-center gap-2 justify-self-center"
          aria-label="ConcorsoFacile, vai alla home"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-cream shadow-[var(--shadow-brand)]">
            <span className="font-display text-base font-semibold leading-none">N</span>
          </span>
          <span className="truncate font-display text-[17px] font-semibold tracking-tight">
            ConcorsoFacile
          </span>
        </Link>

        {/* Destra — azioni rapide */}
        <div className="flex items-center justify-end gap-0.5">
          {stato !== "idle" && (
            <span
              className="mr-1 hidden items-center gap-1.5 rounded-full border border-voce-200 bg-voce-50 px-2.5 py-1 text-[11px] font-semibold text-voce-700 sm:inline-flex"
              title="La voce sta leggendo"
            >
              <Equalizzatore className="h-3 text-voce-500" />
              Voce
            </span>
          )}

          <button
            type="button"
            onClick={onApriRicerca}
            aria-label="Cerca un concorso o una materia"
            className="tap inline-flex items-center justify-center rounded-full text-ink-soft transition hover:bg-sage-100 hover:text-ink active:scale-95"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={onApriVoce}
            aria-label="Impostazioni voce"
            className={cn(
              "tap relative inline-flex items-center justify-center rounded-full transition active:scale-95",
              voceDaAttivare
                ? "text-sun-500 hover:bg-sun-100"
                : "text-ink-soft hover:bg-sage-100 hover:text-ink"
            )}
          >
            {voceDaAttivare ? <AlertTriangle size={20} /> : <Settings2 size={20} />}
            {/* Pallino di avviso: la voce neurale va ancora scaricata */}
            {voceDaAttivare && (
              <span
                aria-hidden="true"
                className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-sun-500 ring-2 ring-cream"
              />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
