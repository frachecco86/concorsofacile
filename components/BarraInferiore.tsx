"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, Headphones, Home, BookOpen } from "lucide-react";
import { cn } from "@/lib/ui";

/**
 * Bottom navigation fissa (§1C).
 *
 * Quattro voci, non una di più: su un telefono la barra sta nella zona del
 * pollice e ogni voce in più la rende più stretta e più facile da sbagliare.
 * L'altezza minima del bersaglio è 44px su tutta la cella, quindi si tocca
 * anche camminando.
 *
 * Lo sfondo è traslucido (`backdrop-blur`): il contenuto che scorre sotto
 * resta percettibile, così non si perde il senso di dove si è.
 */

export interface VoceBarra {
  href: string;
  etichetta: string;
  icona: React.ComponentType<{ size?: number | string; className?: string }>;
  /** Confronto di percorso: la home è attiva solo esattamente su "/". */
  esatto?: boolean;
}

export const VOCI_BARRA: VoceBarra[] = [
  { href: "/", etichetta: "Home", icona: Home, esatto: true },
  { href: "/materie/", etichetta: "Materie", icona: BookOpen },
  { href: "/ascolta/", etichetta: "Ascolta", icona: Headphones },
  { href: "/quiz/", etichetta: "Quiz", icona: ClipboardList },
];

export function BarraInferiore() {
  const percorso = usePathname();

  return (
    <nav
      aria-label="Navigazione principale"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-sage-200/80 bg-cream/90 backdrop-blur-xl"
    >
      <ul className="mx-auto flex max-w-5xl items-stretch px-safe">
        {VOCI_BARRA.map((v) => {
          const attivo = v.esatto ? percorso === v.href : percorso.startsWith(v.href);
          return (
            <li key={v.href} className="flex-1">
              <Link
                href={v.href}
                aria-current={attivo ? "page" : undefined}
                className={cn(
                  "relative flex h-16 flex-col items-center justify-center gap-0.5 transition",
                  attivo ? "text-brand-600" : "text-ink-muted hover:text-ink-soft"
                )}
              >
                {/* Barretta della scheda attiva */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 h-0.5 w-8 rounded-full transition-all",
                    attivo ? "bg-brand-500 opacity-100" : "opacity-0"
                  )}
                />
                <v.icona
                  size={21}
                  className={cn("transition-transform", attivo && "scale-110")}
                />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    attivo ? "font-bold" : "font-medium"
                  )}
                >
                  {v.etichetta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
