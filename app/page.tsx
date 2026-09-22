import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays, MapPin, Users } from "lucide-react";
import {
  CONCORSI,
  dataIt,
  giorniAllaScadenza,
  statisticheConcorsi,
  type Concorso,
} from "@/lib/dati/concorsi";
import { trovaLezione } from "@/lib/dati/lezioni";
import { num } from "@/lib/ui";
import { TendinaMaterie } from "@/components/TendinaMaterie";

export default function Home() {
  const stat = statisticheConcorsi(CONCORSI);

  // Ordinamento: prima i concorsi ancora utili (aperti, scadenza più vicina),
  // in fondo quelli già conclusi. Un concorso scaduto non sparisce — resta
  // consultabile — ma non deve rubare l'attenzione.
  const ordinati = [...CONCORSI].sort((a, b) => {
    const ga = giorniAllaScadenza(a.scadenza);
    const gb = giorniAllaScadenza(b.scadenza);
    const scadutoA = ga !== null && ga < 0;
    const scadutoB = gb !== null && gb < 0;
    if (scadutoA !== scadutoB) return scadutoA ? 1 : -1;
    return (ga ?? 9999) - (gb ?? 9999);
  });

  const aperti = ordinati.filter((c) => {
    const g = giorniAllaScadenza(c.scadenza);
    return g === null || g >= 0;
  }).length;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
      {/* Intestazione */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">
          Concorsi aperti in Italia
        </h1>
        <p className="mt-2 max-w-2xl text-ink-soft">
          <b className="font-semibold text-ink">{aperti}</b> concorsi ancora
          aperti, {num(stat.postiTotali)} posti dichiarati in{" "}
          {num(stat.materieUniche)} materie. Apri un concorso per vedere le
          materie da preparare e studiarle con la voce.
        </p>
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-sun-500/25 bg-sun-100/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
          <span className="font-semibold text-sun-600">Nota.</span>
          <span>
            Dati raccolti da fonti pubbliche il 22 settembre 2026 a scopo
            informativo. Non sono un atto ufficiale: verifica sempre il bando
            sull&apos;ente titolare prima di presentare domanda.
          </span>
        </p>
      </header>

      {/* Elenco concorsi */}
      <ul className="space-y-3">
        {ordinati.map((c) => (
          <li key={c.id}>
            <SchedaConcorso concorso={c} />
          </li>
        ))}
      </ul>
    </main>
  );
}

function SchedaConcorso({ concorso: c }: { concorso: Concorso }) {
  const giorni = giorniAllaScadenza(c.scadenza);
  const scaduto = giorni !== null && giorni < 0;
  const imminente = giorni !== null && giorni >= 0 && giorni <= 7;

  const conLezione = c.materie.filter((m) => trovaLezione(m.nome, c.id)).length;

  return (
    <details
      className="group rounded-[var(--radius-card)] border border-sage-200
                 bg-surface shadow-[var(--shadow-soft)] transition
                 open:border-brand-300 open:shadow-[var(--shadow-lift)]"
    >
      <summary
        className="flex cursor-pointer list-none items-start gap-4 p-5
                   transition hover:bg-sage-50/60 [&::-webkit-details-marker]:hidden"
      >
        {/* Indicatore scadenza */}
        <span
          aria-hidden="true"
          className={`mt-1 h-10 w-1.5 shrink-0 rounded-full ${
            scaduto
              ? "bg-sage-300"
              : imminente
                ? "bg-sun-500"
                : "bg-brand-500"
          }`}
        />

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <Tag>{c.area}</Tag>
            <Tag tenue>{requisitoLabel(c.requisito)}</Tag>
            {conLezione > 0 && (
              <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
                {conLezione === 1 ? "1 materia pronta" : `${conLezione} materie pronte`}
              </span>
            )}
          </span>

          <span className="mt-2 block font-display text-lg font-semibold leading-snug">
            {c.titolo}
          </span>
          <span className="mt-0.5 block text-sm text-ink-muted">{c.ente}</span>

          <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
            {typeof c.posti === "number" && (
              <span className="inline-flex items-center gap-1.5">
                <Users size={13} />
                <b className="tnum font-semibold text-ink-soft">{num(c.posti)}</b> posti
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} />
              {c.scadenza ? (
                <>
                  scade il <b className="font-semibold text-ink-soft">{dataIt(c.scadenza)}</b>
                  {!scaduto && (
                    <span className={imminente ? "font-semibold text-sun-600" : ""}>
                      ({giorni === 0 ? "oggi" : `${giorni} gg`})
                    </span>
                  )}
                  {scaduto && <span className="text-sage-400">(concluso)</span>}
                </>
              ) : (
                "scadenza da verificare"
              )}
            </span>
            {c.regioni.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} />
                {c.regioni.length > 3
                  ? `${c.regioni.length} regioni`
                  : c.regioni.join(", ")}
              </span>
            )}
          </span>
        </span>

        {/* Freccia: ruota all'apertura (pura decorazione, indicata come tale) */}
        <span
          aria-hidden="true"
          className="mt-1 shrink-0 text-sage-400 transition-transform
                     duration-200 group-open:rotate-90"
        >
          <ArrowRight size={18} />
        </span>
      </summary>

      {/* Corpo: materie */}
      <div className="border-t border-sage-200 px-5 pb-5 pt-4">
        {conLezione > 0 && (
          <Link
            href={`/concorso/${c.id}/`}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full
                       bg-brand-500 px-6 py-3 text-sm font-bold text-cream
                       shadow-[var(--shadow-brand)] transition hover:bg-brand-600
                       active:scale-[0.99] sm:w-auto"
          >
            <BookOpen size={16} />
            Studia {conLezione === 1 ? "la materia" : `le ${conLezione} materie`} con la voce
          </Link>
        )}

        <TendinaMaterie concorso={c} />

        {c.fonteUrl && (
          <p className="mt-4 text-xs text-ink-muted">
            Fonte e dettagli:{" "}
            <a
              href={c.fonteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-brand-600 underline decoration-brand-200 underline-offset-2 transition hover:text-brand-700"
            >
              scheda del bando
            </a>
            . Verificato il {dataIt(c.verificatoIl)}.
          </p>
        )}
      </div>
    </details>
  );
}

function Tag({
  children,
  tenue,
}: {
  children: React.ReactNode;
  tenue?: boolean;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        tenue
          ? "bg-sage-100 text-ink-muted"
          : "bg-brand-50 text-brand-700"
      }`}
    >
      {children}
    </span>
  );
}

function requisitoLabel(r: Concorso["requisito"]): string {
  if (r === "licenza media") return "Licenza media";
  if (r === "diploma") return "Diploma";
  if (r === "laurea") return "Laurea";
  if (r === "laurea magistrale") return "Laurea magistrale";
  return "Requisiti vari";
}
