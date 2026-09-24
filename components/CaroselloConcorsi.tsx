import Link from "next/link";
import { CalendarDays, Users } from "lucide-react";
import {
  concorsiInEvidenza,
  dataIt,
  giorniAllaScadenza,
  type Concorso,
} from "@/lib/dati/concorsi";
import { num } from "@/lib/ui";

/**
 * Carosello orizzontale dei concorsi in evidenza (§2A).
 *
 * Su un telefono l'elenco verticale mostra due schede per schermata; qui le
 * schede scorrono di lato con `scroll-snap`, che è il gesto che l'utente già
 * conosce. Niente JavaScript: lo scorrimento è nativo, quindi resta fluido
 * anche su dispositivi lenti.
 */
export function CaroselloConcorsi() {
  const evidenza = concorsiInEvidenza(6);
  if (evidenza.length === 0) return null;

  return (
    <section aria-labelledby="titolo-evidenza" className="-mx-4 sm:mx-0">
      <div className="mb-3 flex items-baseline justify-between gap-3 px-4 sm:px-0">
        <h2 id="titolo-evidenza" className="font-display text-xl font-semibold">
          In evidenza
        </h2>
        <Link
          href="#concorsi"
          className="shrink-0 text-[12.5px] font-semibold text-brand-600 transition hover:text-brand-700"
        >
          Vedi tutti
        </Link>
      </div>

      <ul className="carosello flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:px-0">
        {evidenza.map((c) => (
          <li
            key={c.id}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[32%]"
          >
            <SchedaEvidenza concorso={c} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function SchedaEvidenza({ concorso: c }: { concorso: Concorso }) {
  const giorni = giorniAllaScadenza(c.scadenza);
  const imminente = giorni !== null && giorni >= 0 && giorni <= 7;

  return (
    <Link
      href={`/concorso/${c.id}/`}
      className="flex h-full min-h-[168px] flex-col rounded-[var(--radius-card)] border border-sage-200
                 bg-surface p-4 shadow-[var(--shadow-soft)] transition
                 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]
                 active:scale-[0.99]"
    >
      <span className="flex flex-wrap items-center gap-1.5">
        {imminente ? (
          <span className="rounded-full bg-sun-100 px-2.5 py-0.5 text-[11px] font-bold text-sun-600">
            Scadenza imminente
          </span>
        ) : (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
            Bando pubblicato
          </span>
        )}
        <span className="rounded-full bg-sage-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-muted">
          {c.area}
        </span>
      </span>

      <span className="mt-2.5 block font-display text-[16px] font-semibold leading-snug">
        {c.titolo}
      </span>
      <span className="mt-1 block text-[12.5px] leading-snug text-ink-muted">
        {c.ente}
      </span>

      <span className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-[11.5px] text-ink-muted">
        {typeof c.posti === "number" && (
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} />
            <b className="tnum font-semibold text-ink-soft">{num(c.posti)}</b> posti
          </span>
        )}
        {c.scadenza && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={12} />
            {giorni === 0 ? "scade oggi" : dataIt(c.scadenza)}
          </span>
        )}
      </span>
    </Link>
  );
}
