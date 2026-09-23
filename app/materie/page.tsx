import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, BookOpen } from "lucide-react";
import { leggiMaterie } from "@/lib/dati/server";
import { num } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Materie",
  description: "Tutte le materie disponibili in ConcorsoFacile.",
};

export default async function PaginaMaterie() {
  const materie = await leggiMaterie();

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Materie
        </h1>
        <p className="mt-2 text-ink-soft">
          {materie.length === 0
            ? "Nessuna materia ancora disponibile."
            : `${num(materie.length)} materie · ${num(
                materie.reduce((s, m) => s + m.quizCount, 0)
              )} quiz. Scegli da dove iniziare.`}
        </p>
      </header>

      {materie.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-10 text-center">
          <BookOpen size={32} className="mx-auto text-sage-400" />
          <p className="mt-3 font-medium text-ink-soft">
            Esegui <code className="rounded bg-surface px-1.5 py-0.5">npm run estrai</code>{" "}
            per caricare le materie.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {materie.map((m) => (
            <li key={m.id}>
              <Link
                href={`/studia/${m.id}/`}
                className="group flex h-full items-center gap-4 rounded-2xl border border-sage-200 bg-surface px-5 py-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-display text-sm font-bold text-brand-700">
                  {m.indice}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{m.nome}</span>
                  <span className="tnum block text-sm text-ink-muted">
                    {num(m.quizCount)} quiz
                  </span>
                </span>
                <ArrowRight
                  size={18}
                  className="shrink-0 text-sage-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
