"use client";

import { Pause, Play, Sparkles } from "lucide-react";
import { useVoce } from "@/lib/voce/hook";
import { cn } from "@/lib/ui";
import { Equalizzatore } from "./PulsanteVoce";

/** Testo dell'anteprima: una frase reale di Diritto amministrativo. */
const ANTEPRIMA =
  "Il procedimento amministrativo è la sequenza di atti con cui la pubblica " +
  "amministrazione persegue un interesse pubblico. Inizia con l'avvio, di " +
  "ufficio o su istanza di parte, e si conclude con un provvedimento espresso " +
  "entro il termine stabilito dalla legge.";

/**
 * Mini-lettore dimostrativo nella hero (§2A).
 *
 * Il pulsante è volutamente grande — 72px, il doppio del minimo toccabile —
 * perché è la prima cosa che l'utente deve poter premere senza pensarci.
 * La voce è quella vera dell'app: qui l'utente sente subito come suoneranno
 * le lezioni, invece di doversi fidare di una promessa.
 */
export function AudioAnteprima() {
  const { parla, ferma, stato, disponibile, serveVoceNeurale } = useVoce();
  const inLettura = stato !== "idle";

  return (
    <div className="rounded-[var(--radius-card)] border border-voce-200 bg-voce-50 p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={() => (inLettura ? ferma() : parla(ANTEPRIMA))}
          aria-label={inLettura ? "Ferma l'anteprima" : "Ascolta un'anteprima"}
          className={cn(
            "flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full",
            "bg-voce-500 text-cream shadow-[var(--shadow-voce)] transition",
            "hover:bg-voce-600 active:scale-95",
            inLettura && "animate-voce-pulse"
          )}
        >
          {inLettura ? (
            <Pause size={30} fill="currentColor" />
          ) : (
            <Play size={30} fill="currentColor" className="ml-1" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-voce-700">
            <Sparkles size={13} />
            Anteprima
          </p>
          <p className="mt-1 font-display text-[17px] font-semibold leading-tight">
            Diritto amministrativo
          </p>
          <p className="mt-1 text-[13px] leading-snug text-ink-soft">
            {inLettura ? (
              <span className="inline-flex items-center gap-2">
                <Equalizzatore className="h-3.5 text-voce-500" />
                Sto leggendo…
              </span>
            ) : (
              "Tocca e ascolta come suonano le lezioni."
            )}
          </p>
        </div>
      </div>

      {serveVoceNeurale && !disponibile && (
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-[11.5px] leading-relaxed text-ink-muted">
          Nessuna voce di sistema: l&apos;app scaricherà la voce neurale al primo
          ascolto (~63 MB, una sola volta).
        </p>
      )}
    </div>
  );
}
