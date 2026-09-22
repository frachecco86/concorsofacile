"use client";

import { Pause, Play, Volume2, Square } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/ui";
import { useVoce } from "@/lib/voce/hook";

/**
 * Il pulsante voce: l'elemento identitario di ConcorsoFacile.
 *
 * Ogni testo leggibile ha il suo. Il colore è teal — "ciò che parla" — così
 * si distingue dall'arancione delle azioni. Durante la lettura mostra un
 * equalizzatore animato: si capisce a colpo d'occhio che l'app sta parlando.
 */
export function PulsanteVoce({
  testo,
  tag,
  dimensione = "md",
  etichetta,
  className,
}: {
  testo: string;
  /** Chiave per capire se *questo* pulsante sta leggendo. */
  tag?: string;
  dimensione?: "sm" | "md" | "lg";
  etichetta?: string;
  className?: string;
}) {
  const { commuta, tagInLettura, stato } = useVoce();
  const attivo =
    tagInLettura === (tag ?? testo) && (stato === "speaking" || stato === "paused");

  const misure = {
    sm: "h-9 w-9",
    md: "h-11 w-11",
    lg: "h-14 gap-3 rounded-full px-6 w-auto",
  }[dimensione];

  const icona = { sm: 16, md: 18, lg: 20 }[dimensione];

  return (
    <button
      type="button"
      onClick={() => commuta(testo, tag)}
      aria-label={attivo ? "Ferma la lettura" : etichetta ?? "Ascolta"}
      aria-pressed={attivo}
      title={attivo ? "Ferma" : etichetta ?? "Ascolta"}
      className={cn(
        "group relative inline-flex shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        dimensione === "lg" && "font-medium",
        attivo
          ? "border-voce-500 bg-voce-500 text-white shadow-[var(--shadow-voce)]"
          : "border-voce-200 bg-voce-50 text-voce-600 hover:border-voce-300 hover:bg-voce-100 hover:shadow-[var(--shadow-soft)] active:scale-95",
        misure,
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {attivo ? (
          <motion.span
            key="attivo"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1"
          >
            {dimensione === "lg" ? (
              <>
                <Equalizzatore />
                <span className="text-sm">
                  {stato === "paused" ? "In pausa" : "Sta leggendo"}
                </span>
                <Square size={14} className="ml-1 opacity-80" />
              </>
            ) : (
              <Equalizzatore />
            )}
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Volume2 size={icona} strokeWidth={2.1} />
            {dimensione === "lg" && (
              <span className="text-sm">{etichetta ?? "Ascolta"}</span>
            )}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/** Tre barrette che pulsano: il segno visivo della voce. */
export function Equalizzatore({ className }: { className?: string }) {
  return (
    <span
      className={cn("flex h-4 items-end gap-[3px]", className)}
      aria-hidden="true"
    >
      {[0, 0.25, 0.5].map((ritardo, i) => (
        <span
          key={i}
          className="voce-bar w-[3px] rounded-full bg-current"
          style={{ height: "100%", animationDelay: `${ritardo}s` }}
        />
      ))}
    </span>
  );
}

/**
 * Controllo compatto di trasporto: pausa/riprendi e ferma.
 * Usato nella barra di sessione insieme all'avanzamento.
 */
export function ControlliTrasporto({ className }: { className?: string }) {
  const { stato, commutaPausa, ferma } = useVoce();
  if (stato === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-full border border-voce-200 bg-voce-50 p-1",
        className
      )}
    >
      <button
        type="button"
        onClick={commutaPausa}
        aria-label={stato === "paused" ? "Riprendi la lettura" : "Metti in pausa"}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-voce-600 transition hover:bg-voce-100 active:scale-95"
      >
        {stato === "paused" ? <Play size={15} /> : <Pause size={15} />}
      </button>
      <button
        type="button"
        onClick={ferma}
        aria-label="Ferma la lettura"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-voce-600 transition hover:bg-voce-100 active:scale-95"
      >
        <Square size={13} />
      </button>
    </div>
  );
}
