import type { Metadata } from "next";
import Link from "next/link";
import {
  BookOpen,
  Database,
  Headphones,
  ListChecks,
  Lock,
  Repeat,
  Smartphone,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Come funziona il metodo",
  description:
    "Schemi brevi, lettura ad alta voce sincronizzata e verifica continua: come ConcorsoFacile prepara a un concorso pubblico.",
};

/** Spiegazione del metodo (§1B). Contenuto stabile, quindi statico. */
export default function PaginaMetodo() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Come funziona il metodo
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
          Non è un manuale da leggere una volta. È un ciclo breve — schema,
          ascolto, verifica — che si ripete finché le risposte non diventano
          automatiche.
        </p>
      </header>

      <div className="space-y-4">
        <Passo
          n="1"
          icona={BookOpen}
          titolo="Un blocco di senso per volta"
          testo="Ogni capitolo è una sequenza di blocchi brevi: una definizione, un elenco di punti, un esempio. Nessun paragrafo di tre pagine da interpretare: si legge e si ascolta nello stesso ordine."
        />
        <Passo
          n="2"
          icona={Headphones}
          titolo="La voce legge, il testo segue"
          testo="La sintesi vocale legge il blocco mentre il testo si evidenzia parola per parola. Puoi ascoltare a schermo bloccato, in auto o in palestra, e usare i comandi delle cuffie o del sistema (MediaSession)."
        />
        <Passo
          n="3"
          icona={Smartphone}
          titolo="Pensato per il pollice"
          testo="I comandi stanno in basso, i bersagli sono grandi almeno 44 pixel, lo scorrimento automatico si stacca appena scorri tu e torna con un tocco. Tutto funziona anche con una sola mano."
        />
        <Passo
          n="4"
          icona={ListChecks}
          titolo="La verifica chiude il ciclo"
          testo="Subito dopo una lezione arrivano poche domande mirate. Quelle sbagliate non spariscono: rientrano nelle sessioni successive, in proporzione a quanto ti sono sfuggite."
        />
        <Passo
          n="5"
          icona={Repeat}
          titolo="La ripetizione si costruisce da sé"
          testo="Non decidi tu cosa ripassare. Il programma pesa le domande già sapute e quelle sbagliate e ti propone la coda più utile, sessione dopo sessione."
        />
      </div>

      {/* ── Dove finiscono i dati ── */}
      <section id="dati" className="mt-10 scroll-mt-24">
        <div className="rounded-[var(--radius-card)] border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Lock size={19} className="text-brand-600" />
            Dove finiscono i tuoi dati
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            Non c&apos;è un account e non c&apos;è un server che raccoglie
            statistiche. Progressi, capitoli completati e preferenze della voce
            vivono in <code className="rounded bg-sage-100 px-1.5 py-0.5 text-[12.5px]">localStorage</code>,
            dentro il tuo browser. Svuotando i dati del sito si perdono — è
            l&apos;unica copia che esiste.
          </p>
        </div>
      </section>

      {/* ── Fonti ── */}
      <section id="fonti" className="mt-4 scroll-mt-24">
        <div className="rounded-[var(--radius-card)] border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6">
          <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
            <Database size={19} className="text-brand-600" />
            Da dove arrivano i bandi
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            I concorsi sono raccolti da fonti pubbliche e ogni scheda riporta il
            collegamento alla fonte e la data di verifica. ConcorsoFacile non è
            un atto ufficiale e non sostituisce il bando: prima di presentare
            domanda, controlla sempre l&apos;ente titolare.
          </p>
          <Link
            href="/privacy/"
            className="tap-alto mt-4 inline-flex items-center gap-2 rounded-full border border-sage-200 px-4 text-sm font-bold text-ink-soft transition hover:border-brand-300 hover:text-brand-700"
          >
            Leggi le note legali
          </Link>
        </div>
      </section>
    </main>
  );
}

function Passo({
  n,
  icona: Icona,
  titolo,
  testo,
}: {
  n: string;
  icona: React.ComponentType<{ size?: number; className?: string }>;
  titolo: string;
  testo: string;
}) {
  return (
    <article className="flex gap-4 rounded-[var(--radius-card)] border border-sage-200 bg-surface p-4 shadow-[var(--shadow-soft)] sm:p-5">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
        <Icona size={21} />
      </span>
      <div className="min-w-0">
        <p className="tnum text-[11px] font-bold uppercase tracking-wider text-ink-muted">
          Passo {n}
        </p>
        <h2 className="mt-0.5 font-display text-[17px] font-semibold leading-snug">
          {titolo}
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">{testo}</p>
      </div>
    </article>
  );
}
