import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { CONCORSI } from "@/lib/dati/concorsi";
import { lezioniDelConcorso } from "@/lib/dati/lezioni";
import { LettoreLezione } from "@/components/LettoreLezione";

/** L'app è statica: ogni concorso è una pagina pre-generata. */
export function generateStaticParams() {
  return CONCORSI.map((c) => ({ id: c.id }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const concorso = CONCORSI.find((c) => c.id === id);
  return { title: concorso?.titolo ?? "Concorso" };
}

export default async function PaginaConcorso({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const concorso = CONCORSI.find((c) => c.id === id);
  if (!concorso) notFound();

  const lezioni = lezioniDelConcorso(concorso.id);

  // La lezione di ogni materia, nell'ordine del concorso.
  const conLezione = concorso.materie
    .map((m) => lezioni.find((l) => l.materia === m.nome))
    .filter((l): l is NonNullable<typeof l> => Boolean(l));

  const minutiTotali = conLezione.reduce(
    (s, l) => s + l.capitoli.reduce((a, c) => a + c.minuti, 0),
    0
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-brand-600"
      >
        <ArrowLeft size={16} />
        Concorsi
      </Link>

      <header className="mt-5 mb-8">
        <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
          {concorso.titolo}
        </h1>
        <p className="mt-1.5 text-ink-soft">{concorso.ente}</p>
        {conLezione.length > 0 && (
          <p className="mt-3 text-sm text-ink-muted">
            {conLezione.length} materie con lezione pronta ·{" "}
            <b className="tnum font-semibold text-ink-soft">
              {minutiTotali.toFixed(1)}
            </b>{" "}
            minuti di ascolto
          </p>
        )}
      </header>

      <LettoreLezione lezioni={conLezione} />
    </main>
  );
}
