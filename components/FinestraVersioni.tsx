"use client";

import { useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, X } from "lucide-react";
import { CHANGELOG, COMMIT, VERSIONE, dataLeggibile } from "@/lib/versione";
import { cn } from "@/lib/ui";

/**
 * Finestra delle modifiche: cosa è cambiato in ogni versione.
 *
 * Si apre dal numero di versione in topbar. I dati vengono dalla storia git
 * (vedi `scripts/versione.mjs`), dal rilascio più recente al più vecchio.
 */
export function FinestraVersioni({ onChiudi }: { onChiudi: () => void }) {
  // Esc chiude la finestra: atteso da tastiera, non solo il click fuori.
  useEffect(() => {
    const suTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", suTasto);
    return () => window.removeEventListener("keydown", suTasto);
  }, [onChiudi]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onChiudi}
      role="dialog"
      aria-modal="true"
      aria-labelledby="titolo-versioni"
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-sage-200 bg-surface p-6 shadow-[var(--shadow-lift)] sm:rounded-[var(--radius-card)]"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 id="titolo-versioni" className="font-display text-2xl font-semibold">
              Novità
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Versione corrente{" "}
              <span className="tnum font-semibold text-ink">v{VERSIONE}</span> ·{" "}
              {COMMIT} {COMMIT === 1 ? "modifica" : "modifiche"} pubblicate
            </p>
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {CHANGELOG.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-sage-300 bg-sage-50 p-4 text-sm text-ink-soft">
            Nessuna nota di rilascio disponibile.
          </p>
        ) : (
          <ol className="space-y-3">
            {CHANGELOG.map((r, i) => (
              <RigaRilascio key={`${r.versione}-${r.hash}`} rilascio={r} corrente={i === 0} />
            ))}
          </ol>
        )}

        <p className="mt-5 text-center text-[11px] leading-relaxed text-ink-muted">
          La versione cresce di 0.1 a ogni modifica pubblicata.
        </p>
      </motion.div>
    </motion.div>
  );
}

function RigaRilascio({
  rilascio,
  corrente,
}: {
  rilascio: (typeof CHANGELOG)[number];
  corrente: boolean;
}) {
  return (
    <li
      className={cn(
        "rounded-2xl border p-4",
        corrente ? "border-brand-300 bg-brand-50" : "border-sage-200 bg-cream"
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "tnum inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold",
            corrente ? "bg-brand-500 text-cream" : "bg-sage-100 text-ink-soft"
          )}
        >
          {corrente && <Sparkles size={12} />}v{rilascio.versione}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {rilascio.titolo}
        </span>
        <span className="tnum shrink-0 text-[11px] text-ink-muted">
          {dataLeggibile(rilascio.data)}
        </span>
      </div>

      {rilascio.voci.length > 0 && (
        <ul className="mt-2.5 space-y-1.5">
          {rilascio.voci.map((v, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-snug text-ink-soft">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-[0.45em] h-1 w-1 shrink-0 rounded-full",
                  corrente ? "bg-brand-400" : "bg-sage-300"
                )}
              />
              <span>
                <TestoVoce testo={v} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * I messaggi di commit usano i backtick per il codice. Invece di mostrare
 * l'apice grafico, la parte fra backtick diventa `<code>`.
 */
function TestoVoce({ testo }: { testo: string }) {
  const parti = testo.split("`");
  return (
    <>
      {parti.map((parte, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="rounded bg-sage-100 px-1 py-0.5 font-mono text-[11.5px] text-ink"
          >
            {parte}
          </code>
        ) : (
          <span key={i}>{parte}</span>
        )
      )}
    </>
  );
}
