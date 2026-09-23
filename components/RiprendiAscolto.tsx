"use client";

import Link from "next/link";
import { Headphones, Play } from "lucide-react";
import { CONCORSI } from "@/lib/dati/concorsi";
import { useStudio } from "@/lib/dati/studio";
import { slug } from "@/lib/slug";

/**
 * Ripresa dell'ascolto (§1C, voce «Ascolta»).
 *
 * La bottom bar deve riportare *subito* all'audio in corso: qui leggiamo
 * l'ultimo capitolo aperto dallo store locale e ne facciamo un collegamento
 * diretto. Se non si è mai ascoltato nulla la scheda non compare, invece di
 * mostrare un riquadro vuoto.
 */
export function RiprendiAscolto() {
  const { stato } = useStudio();
  const ultimo = stato.ultimo;
  if (!ultimo) return null;

  const concorso = CONCORSI.find((c) => c.id === ultimo.concorsoId);
  if (!concorso) return null;

  const href = `/concorso/${concorso.id}/#cap-${slug(ultimo.materia)}-${ultimo.capitolo}`;

  return (
    <Link
      href={href}
      className="tap-alto flex items-center gap-3.5 rounded-[var(--radius-card)] border border-voce-200
                 bg-voce-50 p-4 shadow-[var(--shadow-soft)] transition
                 hover:border-voce-400 active:scale-[0.99]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-voce-500 text-cream shadow-[var(--shadow-voce)]">
        <Play size={22} fill="currentColor" className="ml-0.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-voce-700">
          <Headphones size={12} />
          Riprendi l&apos;ascolto
        </span>
        <span className="mt-0.5 block truncate font-display text-[16px] font-semibold leading-tight">
          {ultimo.materia}
        </span>
        <span className="mt-0.5 block truncate text-[12.5px] text-ink-muted">
          Capitolo {ultimo.capitolo} · {concorso.titolo}
        </span>
      </span>
    </Link>
  );
}
