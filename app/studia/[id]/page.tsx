import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { leggiMateria, leggiMaterie } from "@/lib/dati/server";
import { SessioneStudio } from "@/components/SessioneStudio";
import { num } from "@/lib/ui";

/**
 * Con `output: "export"` Next genera una pagina per ogni materia a build time.
 * Aggiungere una materia = rieseguire l'estrazione e ricostruire.
 */
export async function generateStaticParams() {
  const materie = await leggiMaterie();
  return materie.map((m) => ({ id: m.id }));
}

/** Nessuna route dinamica a runtime: tutto è pre-generato. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const materia = await leggiMateria(id);
  if (!materia) return { title: "Materia non trovata" };
  return {
    title: materia.nome,
    description: `Studia ${materia.nome} ascoltando: ${num(materia.quizCount)} quiz con voce.`,
  };
}

export default async function PaginaStudia({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const materia = await leggiMateria(id);
  if (!materia) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/quiz/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-brand-600"
        >
          <ArrowLeft size={16} />
          Quiz
        </Link>
      </div>

      <SessioneStudio materia={materia} />
    </main>
  );
}
