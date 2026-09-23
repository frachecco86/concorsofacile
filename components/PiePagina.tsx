"use client";

import Link from "next/link";
import { ChevronDown, Moon, Sun } from "lucide-react";
import { useTema } from "@/lib/tema";
import { VERSIONE } from "@/lib/versione";

/**
 * Footer mobile accordion (§5).
 *
 * Su desktop un footer a colonne si legge in un colpo d'occhio; su un telefono
 * diventerebbe una colonna infinita fra l'utente e la fine della pagina. Qui
 * quindi è una pila di sezioni richiudibili: si vede la mappa, non il
 * contenuto, e si apre solo quello che serve.
 *
 * Le sezioni sono `<details>` nativi: funzionano anche senza JavaScript, sono
 * accessibili da tastiera e da screen reader senza codice aggiuntivo.
 */

const SEZIONI: Array<{
  titolo: string;
  voci: Array<{ etichetta: string; href: string }>;
}> = [
  {
    titolo: "Piattaforma & Concorsi",
    voci: [
      { etichetta: "Tutti i concorsi", href: "/" },
      { etichetta: "Ministeri & Enti nazionali", href: "/concorsi-nazionali/" },
      { etichetta: "Comuni, Regioni & Enti locali", href: "/enti-locali/" },
      { etichetta: "Sanità & Istruzione", href: "/sanita-istruzione/" },
    ],
  },
  {
    titolo: "Risorse & Banche dati",
    voci: [
      { etichetta: "Materie e schemi", href: "/materie/" },
      { etichetta: "Batterie di quiz", href: "/quiz/" },
      { etichetta: "Ascolta le lezioni", href: "/ascolta/" },
      { etichetta: "I tuoi progressi", href: "/progressi/" },
    ],
  },
  {
    titolo: "Assistenza & Contatti",
    voci: [
      { etichetta: "Scrivi all'assistenza", href: "mailto:francescochecco@gmail.com" },
      { etichetta: "Come funziona il metodo", href: "/metodo/" },
      { etichetta: "Piani & abbonamenti", href: "/abbonamenti/" },
    ],
  },
  {
    titolo: "Note legali",
    voci: [
      { etichetta: "Privacy: dove finiscono i tuoi dati", href: "/privacy/" },
      { etichetta: "Fonti e verifiche dei bandi", href: "/privacy/#fonti" },
    ],
  },
];

export function PiePagina() {
  const { scuro, alterna } = useTema();

  return (
    <footer className="mt-16 border-t border-sage-200 bg-sage-50/60">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* Marchio e tagline */}
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-cream shadow-[var(--shadow-brand)]">
            <span className="font-display text-lg font-semibold leading-none">N</span>
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-semibold tracking-tight">
              ConcorsoFacile
            </span>
            <span className="mt-0.5 text-[11.5px] font-medium text-ink-muted">
              Studia ascoltando
            </span>
          </span>
        </div>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
          Preparazione rapida ai concorsi pubblici italiani: schemi essenziali e
          audio-lezioni sincronizzate, da ascoltare in auto, in metro o in palestra.
        </p>

        {/* Accordion */}
        <div className="mt-6 divide-y divide-sage-200 border-y border-sage-200">
          {SEZIONI.map((s) => (
            <details key={s.titolo} className="group">
              <summary className="tap-alto flex cursor-pointer list-none items-center gap-3 py-3.5 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                <span className="flex-1">{s.titolo}</span>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <ul className="pb-3">
                {s.voci.map((v) => (
                  <li key={v.etichetta}>
                    <Link
                      href={v.href}
                      className="tap-alto flex items-center px-1 text-sm text-ink-soft transition hover:text-brand-600"
                    >
                      {v.etichetta}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ))}
        </div>

        {/* Barra finale */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11.5px] leading-relaxed text-ink-muted">
            © {new Date().getFullYear()} ConcorsoFacile · v{VERSIONE}
            <br />
            I dati dei bandi provengono da fonti pubbliche e non sostituiscono
            l&apos;atto ufficiale.
          </p>
          <button
            type="button"
            onClick={alterna}
            aria-pressed={scuro}
            className="tap inline-flex shrink-0 items-center gap-2 rounded-full border border-sage-200 bg-surface px-3.5 text-xs font-semibold text-ink-soft shadow-[var(--shadow-soft)] transition hover:border-brand-300 hover:text-brand-700 active:scale-95"
          >
            {scuro ? <Sun size={15} /> : <Moon size={15} />}
            {scuro ? "Tema chiaro" : "Tema scuro"}
          </button>
        </div>
      </div>
    </footer>
  );
}
