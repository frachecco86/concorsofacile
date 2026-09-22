import Link from "next/link";
import { ArrowRight, BookOpen, Headphones, Sparkles, Target } from "lucide-react";
import { leggiStatistiche } from "@/lib/dati/server";
import { num } from "@/lib/ui";

export default async function Home() {
  const stat = await leggiStatistiche();
  const vuoto = stat.materie === 0;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
      {vuoto ? <AvvisoVuoto /> : null}

      {/* Hero */}
      <section className="paper-grain relative overflow-hidden rounded-[32px] border border-sand-200 bg-surface px-6 py-12 shadow-[var(--shadow-lift)] sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-100/60 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-voce-100/60 blur-2xl" />

        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-brand-700">
            <Sparkles size={13} strokeWidth={2.6} />
            Studio con la voce
          </span>

          <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Studia{" "}
            <span className="relative inline-block">
              <span className="relative z-10">ascoltando</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-3 rounded-sm bg-brand-200/70 sm:h-4" />
            </span>
            , non solo leggendo.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-soft">
            ConcorsoFacile legge le domande e le risposte ad alta voce e ti lascia
            decidere cosa sai e cosa rivedere. Il ripasso si costruisce da solo,
            in base a quello che hai sbagliato.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/materie/"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3.5 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-600 active:scale-[0.98]"
            >
              Inizia a studiare
              <ArrowRight size={17} strokeWidth={2.6} />
            </Link>
            <Link
              href="/progressi/"
              className="inline-flex items-center gap-2 rounded-full border border-sand-200 bg-cream px-6 py-3.5 text-sm font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-600"
            >
              I miei progressi
            </Link>
          </div>
        </div>
      </section>

      {/* Numeri */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        <Numero
          icona={<BookOpen size={18} />}
          valore={num(stat.materie)}
          etichetta="materie pronte"
          colore="brand"
        />
        <Numero
          icona={<Target size={18} />}
          valore={num(stat.quiz)}
          etichetta="quiz disponibili"
          colore="voce"
        />
        <Numero
          icona={<Headphones size={18} />}
          valore="∞"
          etichetta="sessioni, quante vuoi"
          colore="lilac"
        />
      </section>

      {/* Come funziona */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">
          Come funziona
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Passo
            n={1}
            titolo="Ascolta"
            testo="La voce legge la domanda e la risposta. Puoi cambiare voce, velocità e tono in qualsiasi momento."
          />
          <Passo
            n={2}
            titolo="Decidi"
            testo="La sapevo, oppure da rivedere. Due pulsanti, nessuna distrazione, un tasto della tastiera se preferisci."
          />
          <Passo
            n={3}
            titolo="Ripassa"
            testo="ConcorsoFacile tiene il conto e ti ripropone prima le domande che ti sono sfuggite."
          />
        </div>
      </section>

      {/* Materie più ricche */}
      {stat.piuGrandi.length > 0 && (
        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">
              Materie più ricche
            </h2>
            <Link
              href="/materie/"
              className="text-sm font-semibold text-brand-600 transition hover:text-brand-700"
            >
              Vedi tutte →
            </Link>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {stat.piuGrandi.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/studia/${m.id}/`}
                  className="group flex items-center gap-4 rounded-2xl border border-sand-200 bg-surface px-5 py-4 shadow-[var(--shadow-soft)] transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-[var(--shadow-lift)]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 font-display text-sm font-bold text-brand-700">
                    {m.indice}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{m.nome}</span>
                    <span className="tnum block text-sm text-ink-muted">
                      {num(m.quizCount)} quiz
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="shrink-0 text-sand-400 transition group-hover:translate-x-0.5 group-hover:text-brand-500"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Numero({
  icona,
  valore,
  etichetta,
  colore,
}: {
  icona: React.ReactNode;
  valore: string;
  etichetta: string;
  colore: "brand" | "voce" | "lilac";
}) {
  const stili = {
    brand: "bg-brand-100 text-brand-600",
    voce: "bg-voce-100 text-voce-600",
    lilac: "bg-lilac-100 text-lilac-500",
  }[colore];

  return (
    <div className="rounded-2xl border border-sand-200 bg-surface p-5 shadow-[var(--shadow-soft)]">
      <span
        className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl ${stili}`}
      >
        {icona}
      </span>
      <div className="tnum font-display text-3xl font-semibold leading-none">
        {valore}
      </div>
      <div className="mt-1.5 text-sm font-medium text-ink-muted">{etichetta}</div>
    </div>
  );
}

function Passo({
  n,
  titolo,
  testo,
}: {
  n: number;
  titolo: string;
  testo: string;
}) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-surface p-5 shadow-[var(--shadow-soft)]">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-ink font-display text-sm font-bold text-cream">
        {n}
      </span>
      <h3 className="mt-3 font-display text-lg font-semibold">{titolo}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{testo}</p>
    </div>
  );
}

function AvvisoVuoto() {
  return (
    <div className="mb-8 rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50 p-6">
      <h2 className="font-display text-xl font-semibold text-brand-800">
        Nessun quiz ancora caricato
      </h2>
      <p className="mt-2 text-sm text-ink-soft">
        Esegui l&apos;estrazione dal corpus dei concorsi per popolare l&apos;app:
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-ink px-4 py-3 text-sm text-cream">
        <code>npm run estrai</code>
      </pre>
      <p className="mt-2 text-xs text-ink-muted">
        Per includere tutte le 339 materie: <code>npm run estrai:all</code>.
      </p>
    </div>
  );
}
