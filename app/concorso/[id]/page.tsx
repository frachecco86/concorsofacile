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
    <main className="mx-auto max-w-3xl px-4 pb-20 pt-2 sm:px-6 sm:pt-4">
      <div className="flex items-baseline gap-2">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-muted transition hover:text-brand-600"
        >
          <ArrowLeft size={13} />
          Concorsi
        </Link>
      </div>

      <header className="mb-1.5 mt-0.5">
        <h1 className="font-display text-[17px] font-semibold leading-snug sm:text-xl">
          {concorso.titolo}
        </h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-ink-muted">
          <span>{concorso.ente}</span>
          {conLezione.length > 0 && (
            <span className="tnum">
              · {conLezione.length} materie · {minutiTotali.toFixed(1)} min
            </span>
          )}
        </p>
      </header>

      <LettoreLezione lezioni={conLezione} concorsoId={concorso.id} />
    </main>
  );
}
