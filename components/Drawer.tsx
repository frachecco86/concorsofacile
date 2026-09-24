"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Building2,
  CreditCard,
  Headphones,
  Landmark,
  LifeBuoy,
  Lightbulb,
  LineChart,
  Moon,
  Sparkles,
  Stethoscope,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { cn } from "@/lib/ui";
import { useTema } from "@/lib/tema";
import { VERSIONE } from "@/lib/versione";

/** Assistenza: l'indirizzo è quello del progetto. */
const EMAIL_ASSISTENZA = "francescochecco@gmail.com";

interface Voce {
  href: string;
  etichetta: string;
  icona: React.ComponentType<{ size?: number | string; className?: string }>;
}

/** Navigazione principale (§1B): le sei destinazioni del metodo. */
const PRINCIPALI: Voce[] = [
  { href: "/", etichetta: "Tutti i Concorsi", icona: Landmark },
  { href: "/concorsi-nazionali/", etichetta: "Ministeri & Enti Nazionali", icona: Building2 },
  { href: "/enti-locali/", etichetta: "Comuni, Regioni & Enti Locali", icona: Landmark },
  { href: "/sanita-istruzione/", etichetta: "Sanità & Istruzione", icona: Stethoscope },
  { href: "/metodo/", etichetta: "Come funziona il Metodo", icona: Lightbulb },
  { href: "/abbonamenti/", etichetta: "Piani & Abbonamenti", icona: CreditCard },
];

/** Scorciatoie: quello che si usa ogni giorno. */
const SCORCIATOIE: Voce[] = [
  { href: "/materie/", etichetta: "Materie", icona: BookOpen },
  { href: "/ascolta/", etichetta: "Ascolta", icona: Headphones },
  { href: "/progressi/", etichetta: "Progressi", icona: LineChart },
];

/**
 * Drawer laterale (§1B), in scorrimento da sinistra.
 *
 * Il pannello non è un semplice elenco di link: in cima c'è l'identità
 * dell'utente (o l'invito ad accedere), in fondo i comandi di servizio
 * — tema, assistenza, versione — che non meritano una voce di primo livello
 * ma devono restare a portata di pollice.
 */
export function Drawer({
  aperto,
  onChiudi,
  onApriVersioni,
}: {
  aperto: boolean;
  onChiudi: () => void;
  onApriVersioni: () => void;
}) {
  const percorso = usePathname();
  const { scuro, alterna } = useTema();

  // Cambio pagina = drawer chiuso: altrimenti resterebbe aperto sopra la
  // schermata nuova, che è già cambiata sotto.
  useEffect(() => {
    onChiudi();
  }, [percorso, onChiudi]);

  // Esc chiude, e finché è aperto il corpo non scorre dietro al pannello.
  useEffect(() => {
    if (!aperto) return;
    const onTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", onTasto);
    const precedente = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onTasto);
      document.body.style.overflow = precedente;
    };
  }, [aperto, onChiudi]);

  return (
    <>
      {/* Sfondo: tocca per chiudere */}
      <motion.div
        initial={false}
        animate={{ opacity: aperto ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        aria-hidden="true"
        onClick={onChiudi}
        className={cn(
          "fixed inset-0 z-50 bg-ink/35 backdrop-blur-sm",
          aperto ? "pointer-events-auto" : "pointer-events-none"
        )}
      />

      <motion.aside
        initial={false}
        animate={{ x: aperto ? 0 : "-100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu di navigazione"
        aria-hidden={!aperto}
        className={cn(
          "pt-safe pb-safe fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-[340px] flex-col",
          "border-r border-sage-200 bg-surface shadow-[var(--shadow-lift)]",
          !aperto && "pointer-events-none"
        )}
      >
        {/* ── Intestazione: profilo ── */}
        <div className="flex items-start justify-between gap-3 border-b border-sage-200 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <UserRound size={20} />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-[15px] font-semibold leading-tight">
                Studia in anonimo
              </span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-muted">
                I progressi restano su questo dispositivo
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi il menu"
            className="tap -mr-1.5 -mt-1 inline-flex shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100 hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Invito ad accedere: non esiste ancora un account, quindi è onesto
            e non promette nulla che non ci sia. */}
        <div className="border-b border-sage-200 px-4 py-3">
          <Link
            href="/progressi/"
            className="tap-alto flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 px-4 text-sm font-bold text-cream shadow-[var(--shadow-brand)] transition hover:bg-brand-600 active:scale-[0.98]"
          >
            <UserRound size={16} />
            Accedi / Registrati
          </Link>
        </div>

        {/* ── Navigazione ── */}
        <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
          <ul className="space-y-0.5">
            {PRINCIPALI.map((v) => {
              const attivo = percorso === v.href;
              return (
                <li key={v.href}>
                  <Link
                    href={v.href}
                    className={cn(
                      "tap-alto flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                      attivo
                        ? "bg-brand-100 text-brand-700"
                        : "text-ink-soft hover:bg-sage-100 hover:text-ink"
                    )}
                  >
                    <v.icona size={18} className="shrink-0" />
                    <span className="min-w-0 truncate">{v.etichetta}</span>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="mb-1 mt-4 px-3 text-[11px] font-bold uppercase tracking-wider text-ink-muted">
            Studia
          </p>
          <ul className="space-y-0.5">
            {SCORCIATOIE.map((v) => {
              const attivo = percorso.startsWith(v.href);
              return (
                <li key={v.href}>
                  <Link
                    href={v.href}
                    className={cn(
                      "tap-alto flex items-center gap-3 rounded-xl px-3 text-sm font-medium transition",
                      attivo
                        ? "bg-sage-100 text-ink"
                        : "text-ink-soft hover:bg-sage-100 hover:text-ink"
                    )}
                  >
                    <v.icona size={18} className="shrink-0" />
                    <span className="min-w-0 truncate">{v.etichetta}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ── Piede del drawer ── */}
        <div className="border-t border-sage-200 px-4 py-3">
          <button
            type="button"
            onClick={alterna}
            aria-pressed={scuro}
            className="tap-alto flex w-full items-center gap-3 rounded-xl px-2 text-sm font-medium text-ink-soft transition hover:bg-sage-100 hover:text-ink"
          >
            {scuro ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            <span className="flex-1 text-left">Modalità notte</span>
            {/* Interruttore: si legge a colpo d'occhio senza leggere l'etichetta */}
            <span
              aria-hidden="true"
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                scuro ? "bg-brand-500" : "bg-sage-300"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-all",
                  scuro ? "left-[22px]" : "left-0.5"
                )}
              />
            </span>
          </button>

          <a
            href={`mailto:${EMAIL_ASSISTENZA}?subject=Assistenza%20ConcorsoFacile`}
            className="tap-alto flex items-center gap-3 rounded-xl px-2 text-sm font-medium text-ink-soft transition hover:bg-sage-100 hover:text-ink"
          >
            <LifeBuoy size={18} className="shrink-0" />
            Assistenza
          </a>

          <button
            type="button"
            onClick={() => {
              onChiudi();
              onApriVersioni();
            }}
            className="tap-alto flex w-full items-center gap-3 rounded-xl px-2 text-sm font-medium text-ink-soft transition hover:bg-sage-100 hover:text-ink"
          >
            <Sparkles size={18} className="shrink-0" />
            <span className="flex-1 text-left">Novità della versione</span>
            <span className="tnum rounded-full bg-sage-100 px-2 py-0.5 text-[11px] font-bold text-ink-muted">
              v{VERSIONE}
            </span>
          </button>
        </div>
      </motion.aside>
    </>
  );
}
