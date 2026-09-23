import type { Metadata } from "next";
import Link from "next/link";
import { Database, ExternalLink, HardDrive, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy e note legali",
  description:
    "ConcorsoFacile non raccoglie dati personali: progressi e preferenze restano nel tuo browser.",
};

/** Note legali e privacy (§5, sezione «Note legali»). */
export default function PaginaPrivacy() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-8">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Privacy e note legali
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
          In breve: non c&apos;è un account, non c&apos;è un server che ti
          profila, e i tuoi progressi non lasciano il dispositivo.
        </p>
      </header>

      <div className="space-y-4">
        <Blocco
          icona={HardDrive}
          titolo="Cosa viene salvato (e dove)"
        >
          <p>
            ConcorsoFacile salva nel <b className="font-semibold text-ink">localStorage</b> del
            browser solo ciò che serve a farti riprendere lo studio:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>i capitoli che hai ascoltato fino in fondo;</li>
            <li>l&apos;esito delle sessioni di quiz, per decidere cosa ripassare;</li>
            <li>l&apos;ultimo capitolo aperto, per la ripresa rapida;</li>
            <li>le preferenze della voce, della modalità di lettura e del tema.</li>
          </ul>
          <p className="mt-2">
            Sono dati anonimi e restano sul tuo dispositivo. Nessuno di questi
            valori viene inviato a un server: svuotando i dati del sito li perdi
            definitivamente, perché non ne esiste una copia altrove.
          </p>
        </Blocco>

        <Blocco icona={ShieldCheck} titolo="Cosa non facciamo">
          <ul className="list-disc space-y-1 pl-5">
            <li>nessun cookie di profilazione e nessuno script pubblicitario;</li>
            <li>nessuna registrazione, quindi nessun indirizzo email richiesto;</li>
            <li>nessuna vendita o condivisione di dati con terzi.</li>
          </ul>
          <p className="mt-2">
            La voce sintetica gira interamente nel browser. Quando serve la voce
            neurale, il modello viene scaricato una volta sola e salvato in locale.
          </p>
        </Blocco>

        <Blocco icona={Database} titolo="Fonti e limiti dei contenuti" id="fonti">
          <p>
            I dati di bandi e concorsi sono raccolti da fonti pubbliche; ogni
            scheda indica la fonte e la data di verifica. ConcorsoFacile{" "}
            <b className="font-semibold text-ink">non è un atto ufficiale</b> e non ha
            alcun rapporto con le amministrazioni citate: le informazioni possono
            essere incomplete o non aggiornate.
          </p>
          <p className="mt-2">
            Prima di presentare domanda verifica sempre il bando pubblicato
            dall&apos;ente titolare, che è l&apos;unico documento valido.
          </p>
        </Blocco>

        <Blocco icona={ExternalLink} titolo="Segnalazioni">
          <p>
            Un bando scaduto, una data sbagliata o un contenuto poco chiaro:{" "}
            <a
              href="mailto:francescochecco@gmail.com?subject=ConcorsoFacile%20%C2%B7%20segnalazione"
              className="font-semibold text-brand-600 underline decoration-brand-200 underline-offset-2 hover:text-brand-700"
            >
              scrivi all&apos;assistenza
            </a>
            . Le correzioni entrano nella build successiva.
          </p>
        </Blocco>
      </div>

      <p className="mt-8 text-[12.5px] text-ink-muted">
        <Link href="/metodo/" className="font-semibold text-brand-600 hover:text-brand-700">
          Come funziona il metodo
        </Link>{" "}
        ·{" "}
        <Link href="/abbonamenti/" className="font-semibold text-brand-600 hover:text-brand-700">
          Piani e abbonamenti
        </Link>
      </p>
    </main>
  );
}

function Blocco({
  icona: Icona,
  titolo,
  id,
  children,
}: {
  icona: React.ComponentType<{ size?: number; className?: string }>;
  titolo: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[var(--radius-card)] border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)] sm:p-6"
    >
      <h2 className="flex items-center gap-2 font-display text-xl font-semibold">
        <Icona size={19} className="shrink-0 text-brand-600" />
        {titolo}
      </h2>
      <div className="mt-2 text-sm leading-relaxed text-ink-soft">{children}</div>
    </section>
  );
}
