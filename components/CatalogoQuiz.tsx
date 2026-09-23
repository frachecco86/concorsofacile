"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ClipboardList, Search, X } from "lucide-react";
import type { MateriaIndice } from "@/lib/dati/tipi";
import { num } from "@/lib/ui";

/** Toglie accenti e maiuscole: "contabilita" trova "Contabilità". */
function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Catalogo delle batterie di quiz (§1C, voce «Quiz»).
 *
 * Le materie sono centinaia: un elenco lungo senza filtro è inutilizzabile su
 * un telefono. Il campo di ricerca filtra mentre si scrive; il pulsante di
 * avvio resta grande e in fondo alla riga, dov'è più comodo da toccare.
 */
export function CatalogoQuiz({ materie }: { materie: MateriaIndice[] }) {
  const [query, setQuery] = useState("");

  const filtrate = useMemo(() => {
    const q = normalizza(query.trim());
    if (!q) return materie;
    return materie.filter((m) => normalizza(m.nome).includes(q));
  }, [materie, query]);

  return (
    <div>
      {/* Filtro */}
      <div className="sticky top-[calc(var(--safe-alto)+var(--h-testata))] z-20 -mx-4 border-b border-sage-200 bg-cream/95 px-4 py-2.5 backdrop-blur-lg sm:mx-0 sm:rounded-full sm:border sm:px-3">
        <div className="flex items-center gap-2">
          <Search size={17} className="shrink-0 text-ink-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca una materia…"
            aria-label="Cerca una materia"
            className="h-10 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-muted"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Cancella la ricerca"
              className="tap inline-flex shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100 hover:text-ink"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <p className="mb-3 mt-4 text-[12.5px] text-ink-muted">
        {filtrate.length === materie.length
          ? `${num(materie.length)} batterie disponibili`
          : `${num(filtrate.length)} batterie su ${num(materie.length)}`}
      </p>

      {filtrate.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-8 text-center">
          <ClipboardList size={28} className="mx-auto text-sage-400" />
          <p className="mt-3 text-sm text-ink-soft">
            Nessuna materia per «{query.trim()}».
          </p>
        </div>
      ) : (
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {filtrate.map((m) => (
            <li key={m.id}>
              <Link
                href={`/studia/${m.id}/`}
                className="tap-alto group flex items-center gap-3.5 rounded-2xl border border-sage-200
                           bg-surface px-4 py-3 shadow-[var(--shadow-soft)] transition
                           hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]
                           active:scale-[0.99]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-display text-[13px] font-bold text-brand-700">
                  {m.indice}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14.5px] font-semibold leading-snug">
                    {m.nome}
                  </span>
                  <span className="tnum block text-[12px] text-ink-muted">
                    {num(m.quizCount)} quiz
                  </span>
                </span>
                <ArrowRight
                  size={17}
                  className="shrink-0 text-sage-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
