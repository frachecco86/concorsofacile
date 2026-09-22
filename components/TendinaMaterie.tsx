"use client";

import { BookOpen, ChevronDown, Headphones } from "lucide-react";
import { type Concorso } from "@/lib/dati/concorsi";
import { trovaLezione } from "@/lib/dati/lezioni";
import { slug } from "./slug";

/**
 * Menù a tendina delle materie di un concorso.
 *
 * Ogni materia mostra quanti capitoli ha e, se aperta, l'elenco con durata in
 * minuti. Le materie senza lezione restano visibili ma segnalate: si capisce
 * subito cosa c'è e cosa no.
 */
export function TendinaMaterie({ concorso }: { concorso: Concorso }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-muted">
        Materie da preparare
      </h3>

      <ul className="space-y-2">
        {concorso.materie.map((m) => {
          const lezione = trovaLezione(m.nome, concorso.id);
          // La lezione vive nella pagina del concorso: qui non serve un URL
          // separato per materia, basta un'ancora al capitolo.
          const ancora = `#cap-${slug(m.nome)}`;
          const minuti = lezione
            ? lezione.capitoli.reduce((s, c) => s + c.minuti, 0)
            : 0;

          return (
            <li key={m.nome}>
              {lezione ? (
                <details className="group/mat rounded-2xl border border-sage-200 bg-sage-50/50">
                  <summary
                    className="flex cursor-pointer list-none items-center gap-3 px-4 py-3
                               transition hover:bg-sage-100/60 [&::-webkit-details-marker]:hidden"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-cream">
                      <Headphones size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">{m.nome}</span>
                      <span className="block text-xs text-ink-muted">
                        {lezione.capitoli.length} capitoli ·{" "}
                        {minuti.toFixed(1)} min di ascolto
                      </span>
                    </span>
                    <a
                      href={ancora}
                      onClick={(e) => e.stopPropagation()}
                      className="hidden shrink-0 rounded-full bg-brand-500 px-3.5 py-1.5
                                 text-xs font-bold text-cream transition hover:bg-brand-600
                                 sm:inline-flex"
                    >
                      Studia
                    </a>
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-sage-400 transition-transform
                                 duration-200 group-open/mat:rotate-180"
                    />
                  </summary>

                  {/* Capitoli */}
                  <ol className="border-t border-sage-200 px-4 py-3">
                    {lezione.capitoli.map((cap) => (
                      <li key={cap.numero}>
                        <a
                          href={`${ancora}-${cap.numero}`}
                          className="flex items-center gap-3 rounded-xl px-2 py-2
                                     transition hover:bg-surface"
                        >
                          <span className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface text-[11px] font-bold text-brand-600">
                            {cap.numero}
                          </span>
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            {cap.titolo}
                          </span>
                          <span className="tnum shrink-0 text-xs text-ink-muted">
                            {cap.minuti.toFixed(1)}′
                          </span>
                        </a>
                      </li>
                    ))}
                    <li className="mt-2 px-2">
                      <a
                        href={ancora}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 transition hover:text-brand-700"
                      >
                        <BookOpen size={13} />
                        Apri la lezione completa
                      </a>
                    </li>
                  </ol>
                </details>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-dashed border-sage-200 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sage-100 text-sage-400">
                    <BookOpen size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-soft">
                      {m.nome}
                    </span>
                    <span className="block text-xs text-ink-muted">
                      capitoli in preparazione
                    </span>
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
