"use client";

import { cn } from "@/lib/ui";

const OPZIONI = [10, 20, 50, 100];

/**
 * Quante domande in questa sessione.
 *
 * Vive nel client (non nell'URL) perché l'app è esportata staticamente: non
 * esiste un server che legga i parametri di ricerca. Il cambio di quantità
 * ricostruisce l'ordine della sessione.
 */
export function SelettoreQuantita({
  quanti,
  totali,
  onCambia,
  disabilitato,
}: {
  quanti: number;
  totali: number;
  onCambia: (n: number) => void;
  disabilitato?: boolean;
}) {
  const disponibili = OPZIONI.filter((o) => o <= totali);
  if (disponibili.length === 0) disponibili.push(totali);

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-sage-200 bg-surface p-1 shadow-[var(--shadow-soft)]",
        disabilitato && "pointer-events-none opacity-50"
      )}
      role="group"
      aria-label="Numero di domande"
    >
      {disponibili.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onCambia(o)}
          aria-pressed={o === quanti}
          className={cn(
            "tnum rounded-full px-3.5 py-1.5 text-sm font-semibold transition",
            o === quanti
              ? "bg-brand-500 text-white shadow-[var(--shadow-brand)]"
              : "text-ink-muted hover:bg-sage-100 hover:text-ink"
          )}
        >
          {o}
        </button>
      ))}
      <span className="hidden pr-2 text-xs font-medium text-ink-muted sm:block">
        domande
      </span>
    </div>
  );
}
