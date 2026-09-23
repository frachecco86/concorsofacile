"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Landmark, Search, X } from "lucide-react";
import { CONCORSI } from "@/lib/dati/concorsi";
import type { MateriaIndice } from "@/lib/dati/tipi";
import { num } from "@/lib/ui";

/** Toglie accenti e maiuscole: "amministrazione" trova "Amministrativò". */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

interface Risultato {
  chiave: string;
  href: string;
  titolo: string;
  sotto: string;
  tipo: "concorso" | "materia";
}

/** Ricerca rapida su concorsi e materie (§1A, icona lente). */
export function Ricerca({
  aperto,
  onChiudi,
  materie,
}: {
  aperto: boolean;
  onChiudi: () => void;
  materie: MateriaIndice[];
}) {
  // Il componente viene montato solo mentre il pannello è aperto (`Guscio`),
  // quindi la ricerca parte sempre da vuota: nessuno stato da azzerare.
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // All'apertura il campo è già pronto: si scrive subito, senza toccare.
  // Il ritardo lascia finire l'animazione d'ingresso, altrimenti la tastiera
  // mobile si apre su un elemento che sta ancora scivolando.
  useEffect(() => {
    if (!aperto) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    const onTasto = (e: KeyboardEvent) => {
      if (e.key === "Escape") onChiudi();
    };
    window.addEventListener("keydown", onTasto);
    return () => window.removeEventListener("keydown", onTasto);
  }, [aperto, onChiudi]);

  const indice = useMemo<Risultato[]>(
    () => [
      ...CONCORSI.map((c) => ({
        chiave: `c-${c.id}`,
        href: `/concorso/${c.id}/`,
        titolo: c.titolo,
        sotto: `${c.ente} · ${c.area}`,
        tipo: "concorso" as const,
      })),
      ...materie.map((m) => ({
        chiave: `m-${m.id}`,
        href: `/studia/${m.id}/`,
        titolo: m.nome,
        sotto: `${num(m.quizCount)} quiz`,
        tipo: "materia" as const,
      })),
    ],
    [materie]
  );

  const risultati = useMemo(() => {
    const q = normalizza(query.trim());
    if (q.length < 2) return [];
    return indice
      .filter((r) => normalizza(r.titolo).includes(q) || normalizza(r.sotto).includes(q))
      .slice(0, 12);
  }, [indice, query]);

  if (!aperto) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="pt-safe fixed inset-0 z-[60] bg-ink/35 backdrop-blur-sm"
      onClick={onChiudi}
    >
      <motion.div
        initial={{ y: -16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -16, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Cerca"
        className="mx-auto mt-3 w-[94%] max-w-xl overflow-hidden rounded-[var(--radius-card)] border border-sage-200 bg-surface shadow-[var(--shadow-lift)]"
      >
        <div className="flex items-center gap-2 border-b border-sage-200 px-3">
          <Search size={18} className="shrink-0 text-ink-muted" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca un concorso o una materia…"
            aria-label="Testo da cercare"
            className="h-14 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi la ricerca"
            className="tap -mr-1.5 inline-flex shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[60dvh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Scrivi almeno due lettere per cercare fra {num(CONCORSI.length)} concorsi
              e {num(materie.length)} materie.
            </p>
          ) : risultati.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nessun risultato per «{query.trim()}».
            </p>
          ) : (
            <ul className="p-2">
              {risultati.map((r) => (
                <li key={r.chiave}>
                  <Link
                    href={r.href}
                    className="tap-alto flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-sage-100"
                  >
                    <span
                      className={
                        r.tipo === "concorso"
                          ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-voce-100 text-voce-700"
                      }
                    >
                      {r.tipo === "concorso" ? <Landmark size={16} /> : <BookOpen size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{r.titolo}</span>
                      <span className="block truncate text-xs text-ink-muted">{r.sotto}</span>
                    </span>
                    <ArrowRight size={16} className="shrink-0 text-sage-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
