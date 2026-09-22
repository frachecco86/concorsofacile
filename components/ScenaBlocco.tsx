"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { componiBlocco, type ParteBlocco, type TipoBlocco } from "@/lib/dati/lezioni";
import { cn } from "@/lib/ui";

/**
 * La scena: **un blocco alla volta**, grande, al centro.
 *
 * Il testo non si scorre: si adatta con un `font-size` fluido e, se proprio non
 * entra, scorre da solo seguendo la voce. Il karaoke evidenzia la parola in
 * corso partendo da `posizione`, la stessa unità (indice carattere) usata dalla
 * voce reale e dal timer silenzioso: la scena non sa da dove arriva.
 */

/** Etichetta breve mostrata sopra il blocco, derivata dal tipo. */
function etichetta(blocco: TipoBlocco): string {
  switch (blocco.tipo) {
    case "paragrafo":
      return "Paragrafo";
    case "punti":
      return "Punti chiave";
    case "definizione":
      return "Definizione";
    case "nota":
      return "Nota";
    case "esempio":
      return "Esempio";
  }
}

/**
 * Una porzione di testo con karaoke. `inizio`/`fine` sono la posizione della
 * porzione nel testo piatto del blocco, così l'indice di `posizione` vale per
 * tutte le parti senza conversioni.
 */
function Porzione({
  testo,
  inizio,
  fine,
  posizione,
  evidenzia,
  onParola,
  className,
}: {
  testo: string;
  inizio: number;
  fine: number;
  posizione: number;
  evidenzia: boolean;
  onParola?: (offset: number) => void;
  className?: string;
}) {
  if (!evidenzia || posizione < inizio) {
    return <span className={className}>{testo}</span>;
  }
  if (posizione >= fine) {
    return <span className={cn("text-ink-soft", className)}>{testo}</span>;
  }

  // La posizione cade dentro questa porzione: la espandiamo ai confini di
  // parola, così l'evidenziazione è sempre per parola intera.
  const locale = posizione - inizio;
  let a = locale;
  while (a > 0 && !/\s/.test(testo[a - 1])) a--;
  let b = locale;
  while (b < testo.length && !/\s/.test(testo[b])) b++;

  return (
    <span className={className}>
      {testo.slice(0, a) && <span className="text-ink-soft">{testo.slice(0, a)}</span>}
      <span
        data-attiva=""
        className={cn(
          "rounded-[3px] bg-brand-100 text-ink",
          onParola && "cursor-pointer hover:bg-brand-200"
        )}
        onClick={onParola ? () => onParola(inizio + a) : undefined}
      >
        {testo.slice(a, b)}
      </span>
      {testo.slice(b)}
    </span>
  );
}

export function ScenaBlocco({
  blocco,
  indice,
  totale,
  posizione,
  evidenzia,
  onParolaRipeti,
}: {
  blocco: TipoBlocco;
  indice: number;
  totale: number;
  posizione: number;
  /** `true` quando la lettura è in corso: senza, niente karaoke. */
  evidenzia: boolean;
  /** Rilegge il blocco a partire da un offset in caratteri. */
  onParolaRipeti?: (offset: number) => void;
}) {
  const riduciMovimento = useReducedMotion();
  const contenitore = useRef<HTMLDivElement | null>(null);
  const { parti } = componiBlocco(blocco);

  // Auto-scroll interno: se il blocco supera la scena, l'utente non deve
  // toccare nulla. Portiamo la parola in corso al centro, con dolcezza.
  useEffect(() => {
    if (!evidenzia) return;
    const cont = contenitore.current;
    const parola = cont?.querySelector<HTMLElement>("[data-attiva]");
    if (!cont || !parola) return;
    if (cont.scrollHeight <= cont.clientHeight + 4) return;
    const target = parola.offsetTop - cont.clientHeight / 2 + parola.offsetHeight / 2;
    cont.scrollTo({ top: Math.max(0, target), behavior: riduciMovimento ? "auto" : "smooth" });
  }, [posizione, evidenzia, riduciMovimento]);

  const porzione = (p: ParteBlocco | undefined, className?: string) =>
    p ? (
      <Porzione
        testo={p.testo}
        inizio={p.inizio}
        fine={p.fine}
        posizione={posizione}
        evidenzia={evidenzia}
        onParola={onParolaRipeti}
        className={className}
      />
    ) : null;

  const contenuto = () => {
    switch (blocco.tipo) {
      case "punti": {
        const titolo = parti.find((p) => p.ruolo === "titolo");
        const punti = parti.filter((p) => p.ruolo === "punto");
        return (
          <>
            {titolo && (
              <p className="mb-4 font-display text-[clamp(19px,5vw,26px)] font-semibold leading-tight">
                {porzione(titolo)}
              </p>
            )}
            <ul className="space-y-3">
              {punti.map((p) => (
                <li key={p.inizio} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400"
                  />
                  <span className="min-w-0 flex-1">{porzione(p)}</span>
                </li>
              ))}
            </ul>
          </>
        );
      }
      case "definizione": {
        const termine = parti.find((p) => p.ruolo === "termine");
        const testo = parti.find((p) => p.ruolo === "testo");
        return (
          <>
            <p className="mb-3 font-display text-[clamp(20px,5.4vw,28px)] font-semibold leading-tight text-brand-700">
              {porzione(termine)}
            </p>
            <p className="leading-[1.55]">{porzione(testo)}</p>
          </>
        );
      }
      default: {
        const testo = parti.find((p) => p.ruolo === "testo");
        return <p className="leading-[1.55]">{porzione(testo)}</p>;
      }
    }
  };

  return (
    <section
      aria-label={`Blocco ${indice} di ${totale}`}
      className="flex min-h-0 flex-1 flex-col justify-center"
    >
      <motion.div
        key={indice}
        initial={riduciMovimento ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        ref={contenitore}
        className="max-h-full overflow-y-auto overscroll-contain px-1 py-2"
      >
        <p className="mb-4 text-[10.5px] font-bold uppercase tracking-[0.14em] text-brand-600">
          {etichetta(blocco)}
        </p>
        <div className="text-[clamp(17px,4.6vw,24px)] leading-[1.55] text-ink">
          {contenuto()}
        </div>
      </motion.div>
    </section>
  );
}
