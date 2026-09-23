import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Headphones, ListChecks } from "lucide-react";
import { CONCORSI } from "@/lib/dati/concorsi";
import { lezioniDelConcorso } from "@/lib/dati/lezioni";
import { RiprendiAscolto } from "@/components/RiprendiAscolto";
import { ElencoConcorsi } from "@/components/ElencoConcorsi";
import { slug } from "@/lib/slug";

export const metadata: Metadata = {
  title: "Ascolta",
  description:
    "Le lezioni audio di ConcorsoFacile: schemi brevi, capitoli da pochi minuti, riprendibili in qualsiasi momento.",
};

/**
 * Catalogo delle lezioni audio (§1C).
 *
 * Non è un secondo player: è l'indice da cui entrare nel lettore. Ogni
 * capitolo è un collegamento profondo (`#cap-<materia>-<numero>`) che il
 * lettore apre direttamente, quindi la pagina resta un semplice documento
 * statico — veloce da caricare e con URL condivisibili.
 */
export default function PaginaAscolta() {
  const conLezioni = CONCORSI.map((c) => ({
    concorso: c,
    lezioni: lezioniDelConcorso(c.id),
  })).filter((v) => v.lezioni.length > 0);

  const capitoliTotali = conLezioni.reduce(
    (s, v) => s + v.lezioni.reduce((a, l) => a + l.capitoli.length, 0),
    0
  );
  const minutiTotali = conLezioni.reduce(
    (s, v) => s + v.lezioni.reduce((a, l) => a + l.capitoli.reduce((x, c) => x + c.minuti, 0), 0),
    0
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Ascolta
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
          Schemi brevi letti ad alta voce, un capitolo per volta. Metti le cuffie:
          il testo avanza da solo e si ferma dove lo lasci.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Headphones size={13} />
            {conLezioni.length} percorsi
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={13} />
            {capitoliTotali} capitoli
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} />
            {minutiTotali.toFixed(0)} minuti di ascolto
          </span>
        </p>
      </header>

      <div className="mb-8">
        <RiprendiAscolto />
      </div>

      {conLezioni.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-8 text-center text-sm text-ink-soft">
          Nessuna lezione pubblicata per ora. Le materie con i quiz sono già
          disponibili nella sezione Quiz.
        </p>
      ) : (
        <div className="space-y-9">
          {conLezioni.map(({ concorso, lezioni }) => (
            <section key={concorso.id} aria-labelledby={`titolo-${concorso.id}`}>
              <h2
                id={`titolo-${concorso.id}`}
                className="font-display text-lg font-semibold leading-snug"
              >
                {concorso.titolo}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">{concorso.ente}</p>

              <ul className="mt-3 space-y-2">
                {lezioni.map((lezione) => {
                  const minuti = lezione.capitoli.reduce((a, c) => a + c.minuti, 0);
                  const base = `cap-${slug(lezione.materia)}`;
                  return (
                    <li key={lezione.materia}>
                      <details className="group rounded-2xl border border-sage-200 bg-surface shadow-[var(--shadow-soft)]">
                        <summary
                          className="tap-alto flex cursor-pointer list-none items-center gap-3 px-4 py-3
                                     transition hover:bg-sage-50 [&::-webkit-details-marker]:hidden"
                        >
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-voce-100 text-voce-700">
                            <Headphones size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold">
                              {lezione.materia}
                            </span>
                            <span className="block text-[12px] text-ink-muted">
                              {lezione.capitoli.length} capitoli · {minuti.toFixed(0)} min
                            </span>
                          </span>
                          <span className="tnum shrink-0 text-[12px] font-bold text-voce-600">
                            Ascolta
                          </span>
                        </summary>

                        <ol className="border-t border-sage-200 p-2">
                          {lezione.capitoli.map((cap) => (
                            <li key={cap.numero}>
                              <Link
                                href={`/concorso/${concorso.id}/#${base}-${cap.numero}`}
                                className="tap-alto flex items-center gap-3 rounded-xl px-2.5 py-2 transition hover:bg-sage-100"
                              >
                                <span className="tnum flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-voce-100 text-[11px] font-bold text-voce-700">
                                  {cap.numero}
                                </span>
                                <span className="min-w-0 flex-1 text-[14px] leading-snug">
                                  {cap.titolo}
                                </span>
                                <span className="tnum shrink-0 text-[11.5px] text-ink-muted">
                                  {cap.minuti.toFixed(1)}′
                                </span>
                              </Link>
                            </li>
                          ))}
                        </ol>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <section className="mt-12">
        <h2 className="mb-3 font-display text-lg font-semibold">
          Altri concorsi seguiti
        </h2>
        <ElencoConcorsi concorsi={CONCORSI} />
      </section>
    </main>
  );
}
