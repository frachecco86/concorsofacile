import type { ReactNode } from "react";

/**
 * Utilità minima per comporre classi condizionali senza dipendenze.
 */
export function cn(...valori: Array<string | false | null | undefined>): string {
  return valori.filter(Boolean).join(" ");
}

/** Formatta numeri in italiano con separatore delle migliaia. */
export function num(n: number): string {
  return n.toLocaleString("it-IT");
}

/** Millisecondi -> "1:05" oppure "12s". */
export function durata(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const resto = s % 60;
  return `${m}:${String(resto).padStart(2, "0")}`;
}

export function Card({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
}) {
  return (
    <Tag
      className={cn(
        "rounded-[var(--radius-card)] border border-sage-200 bg-surface shadow-[var(--shadow-soft)]",
        className
      )}
    >
      {children}
    </Tag>
  );
}
