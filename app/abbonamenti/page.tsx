import type { Metadata } from "next";
import Link from "next/link";
import { Check, CreditCard, Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Piani & Abbonamenti",
  description:
    "Come funziona l'accesso a ConcorsoFacile: contenuti e voce senza costi, nessun pagamento richiesto.",
};

/**
 * Piani & Abbonamenti (§1B).
 *
 * Non esiste ancora un sistema di pagamenti, quindi la pagina non inventa
 * prezzi: dice cosa c'è oggi, cosa non c'è, e come essere avvisati. Una
 * pagina di prezzi finta sarebbe la cosa meno credibile del sito.
 */
export default function PaginaAbbonamenti() {
  const inclusi = [
    "Tutti i concorsi seguiti, con scadenza e requisiti",
    "Schemi e audio-lezioni con voce sincronizzata",
    "Batterie di quiz con ripetizione mirata sugli errori",
    "Progressi salvati sul dispositivo, senza account",
    "Modalità chiara e notte",
  ];

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Piani & Abbonamenti
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
          Oggi ConcorsoFacile è <b className="font-semibold text-ink">interamente gratuito</b>{" "}
          e non chiede alcun pagamento. Questa pagina esiste per dirti cosa
          include e cosa stiamo costruendo, non per venderti un piano.
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-brand-300 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl font-semibold">Piano attuale</h2>
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-bold text-brand-700">
            Gratis
          </span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {inclusi.map((v) => (
            <li key={v} className="flex items-start gap-2.5 text-[14px] leading-snug text-ink-soft">
              <Check size={17} strokeWidth={3} className="mt-0.5 shrink-0 text-brand-500" />
              {v}
            </li>
          ))}
        </ul>

        <p className="mt-5 rounded-xl border border-sun-500/25 bg-sun-100/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          <b className="font-semibold text-sun-600">Download una tantum.</b> Se il tuo
          dispositivo non ha voci di sistema installate, l&apos;app scarica una
          voce neurale (~63 MB, una sola volta) e poi funziona anche offline.
          Non è un abbonamento: resta sul dispositivo.
        </p>
      </section>

      <section className="mt-4 rounded-[var(--radius-card)] border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
          <CreditCard size={19} className="text-ink-muted" />
          In definizione
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Stiamo valutando funzioni aggiuntive — percorsi guidati per singolo
          bando, simulazioni cronometrate, esportazione dei progressi. Quando
          saranno pronte, le troverai qui: nessun addebito comparirà senza che
          tu lo scelga esplicitamente.
        </p>
        <a
          href="mailto:francescochecco@gmail.com?subject=ConcorsoFacile%20%C2%B7%20info%20piani"
          className="tap-alto mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-5 text-sm font-bold text-cream transition hover:opacity-90 active:scale-[0.98]"
        >
          <Mail size={16} />
          Chiedi informazioni
        </a>
      </section>

      <p className="mt-6 text-[12.5px] leading-relaxed text-ink-muted">
        ConcorsoFacile non è affiliato ad alcuna amministrazione pubblica.{" "}
        <Link href="/privacy/" className="font-semibold text-brand-600 hover:text-brand-700">
          Note legali e privacy
        </Link>
        .
      </p>
    </main>
  );
}
