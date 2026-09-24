import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  ListChecks,
  MousePointerClick,
} from "lucide-react";
import { CONCORSI, quantiAperti, statisticheConcorsi } from "@/lib/dati/concorsi";
import { num } from "@/lib/ui";
import { AudioAnteprima } from "@/components/AudioAnteprima";
import { CaroselloConcorsi } from "@/components/CaroselloConcorsi";
import { ElencoConcorsi } from "@/components/ElencoConcorsi";

export default function Home() {
  const stat = statisticheConcorsi(CONCORSI);
  const aperti = quantiAperti(CONCORSI);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      {/* ══════════ HERO (§2A) ══════════ */}
      <section className="mb-10">
        <h1 className="font-display text-[30px] font-semibold leading-[1.15] tracking-tight sm:text-4xl">
          Prepara il tuo concorso pubblico
          <br className="hidden sm:block" /> dallo smartphone
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-ink-soft">
          Schemi essenziali e audio-lezioni sincronizzate, da ascoltare in auto,
          in metro o in palestra. Riprendi sempre dal punto in cui eri rimasto.
        </p>

        {/* CTA a tutta larghezza: su mobile è la zona più comoda del pollice */}
        <Link
          href="#concorsi"
          className="tap-alto mt-5 flex w-full items-center justify-center gap-2 rounded-full
                     bg-brand-500 px-6 text-[15px] font-bold text-cream
                     shadow-[var(--shadow-brand)] transition hover:bg-brand-600
                     active:scale-[0.99] sm:w-auto sm:self-start"
        >
          Scegli il tuo concorso
          <ArrowRight size={17} />
        </Link>

        <div className="mt-5 max-w-xl sm:max-w-md">
          <AudioAnteprima />
        </div>
      </section>

      {/* ══════════ CAROSELLO (§2A) ══════════ */}
      <div className="mb-10">
        <CaroselloConcorsi />
      </div>

      {/* ══════════ PUNTI DI FORZA (§2A) ══════════ */}
      <section aria-labelledby="titolo-forza" className="mb-12">
        <h2 id="titolo-forza" className="mb-3 font-display text-xl font-semibold">
          Come si studia qui
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          <Punto
            icona={Headphones}
            titolo="Ascolta come un podcast"
            testo="La voce legge schemi brevi, uno alla volta. Schermo bloccato, cuffie, e i comandi restano attivi."
            tinta="voce"
          />
          <Punto
            icona={MousePointerClick}
            titolo="Tocca un blocco, salta lì"
            testo="Tap su un paragrafo e l'audio riparte da quel secondo. Lo scorrimento automatico si stacca quando scorri tu."
            tinta="brand"
          />
          <Punto
            icona={ListChecks}
            titolo="Quiz a fine lezione"
            testo="Tre domande rapide per capire cosa è rimasto. Quelle sbagliate tornano nella sessione successiva."
            tinta="sun"
          />
        </ul>
      </section>

      {/* ══════════ ELENCO COMPLETO ══════════ */}
      <section id="concorsi" className="scroll-mt-24">
        <header className="mb-4">
          <h2 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
            Concorsi aperti in Italia
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            <b className="font-semibold text-ink">{aperti}</b> concorsi ancora aperti,{" "}
            {num(stat.postiTotali)} posti dichiarati in {num(stat.materieUniche)} materie.
            Apri un concorso per vedere le materie da preparare e studiarle con la voce.
          </p>
          <p className="mt-3 flex items-start gap-2 rounded-xl border border-sun-500/25 bg-sun-100/60 px-3.5 py-2.5 text-xs leading-relaxed text-ink-soft">
            <BadgeCheck size={15} className="mt-0.5 shrink-0 text-sun-600" />
            <span>
              <span className="font-semibold text-sun-600">Nota.</span> Dati raccolti da
              fonti pubbliche a scopo informativo. Non sono un atto ufficiale: verifica
              sempre il bando sull&apos;ente titolare prima di presentare domanda.
            </span>
          </p>
        </header>

        <ElencoConcorsi concorsi={CONCORSI} />
      </section>

      {/* ══════════ METODO (§1B, voce di menu) ══════════ */}
      <section id="metodo" className="mt-12 scroll-mt-24">
        <div className="rounded-[var(--radius-card)] border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-7">
          <h2 className="font-display text-2xl font-semibold">
            Come funziona il metodo
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft">
            Non è un libro da leggere: è un ciclo breve che si ripete finché le
            risposte non diventano automatiche.
          </p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              {
                n: "1",
                t: "Schema breve",
                d: "Un blocco di senso per volta: definizione, punti, esempio. Niente pagine infinite.",
              },
              {
                n: "2",
                t: "Ascolto attivo",
                d: "La voce legge mentre segui il testo evidenziato. Funziona anche a schermo spento.",
              },
              {
                n: "3",
                t: "Verifica",
                d: "Quiz mirati su ciò che hai appena sentito. Gli errori guidano la ripetizione.",
              },
            ].map((p) => (
              <li key={p.n}>
                <span className="tnum flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 font-display text-base font-bold text-brand-700">
                  {p.n}
                </span>
                <h3 className="mt-2.5 text-[15px] font-bold">{p.t}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{p.d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/ascolta/"
              className="tap-alto inline-flex items-center justify-center gap-2 rounded-full border border-sage-200 bg-surface px-5 text-sm font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-700 active:scale-[0.98]"
            >
              <Headphones size={16} />
              Vai alle lezioni
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

/** Card di un punto di forza: icona grande + titolo + spiegazione breve. */
function Punto({
  icona: Icona,
  titolo,
  testo,
  tinta,
}: {
  icona: React.ComponentType<{ size?: number; className?: string }>;
  titolo: string;
  testo: string;
  tinta: "brand" | "voce" | "sun";
}) {
  const sfondo =
    tinta === "voce" ? "bg-voce-100 text-voce-700" : tinta === "sun" ? "bg-sun-100 text-sun-600" : "bg-brand-100 text-brand-700";

  return (
    <li className="rounded-[var(--radius-card)] border border-sage-200 bg-surface p-4 shadow-[var(--shadow-soft)]">
      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${sfondo}`}>
        <Icona size={21} />
      </span>
      <h3 className="mt-3 text-[15px] font-bold leading-snug">{titolo}</h3>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{testo}</p>
    </li>
  );
}
