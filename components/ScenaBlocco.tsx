"use client";

import { useEffect, useMemo, useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { componiBlocco, type ParteBlocco, type TipoBlocco } from "@/lib/dati/lezioni";
import { fraseA, frasiConOffset, type Frase } from "@/lib/frasi";
import { cn } from "@/lib/ui";

/**
 * La scena: **un blocco alla volta**, grande, al centro.
 *
 * Il testo non si scorre: si adatta con un `font-size` fluido e, se proprio non
 * entra, scorre da solo seguendo la voce. L'evidenziazione è **per frase**,
 * sulla stessa unità che la voce legge: dentro una frase una stima del tempo è
 * invisibile, parola per parola no.
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
 * Una porzione di testo con l'evidenziazione **a livello di frase**.
 *
 * `inizio`/`fine` sono la posizione della porzione nel testo piatto del blocco;
 * `frase` è la frase in lettura, nelle stesse coordinate. Una frase può
 * scavalcare più porzioni (una definizione con il suo testo, i punti di un
 * elenco): qui si evidenzia la parte che cade dentro questa, e le altre fanno
 * lo stesso — il risultato è una frase sola evidenziata a pezzi.
 *
 * Perché per frase e non per parola: la posizione nel tempo viene da una stima
 * (o al più dai confini di parola del sistema, che su iOS non arrivano). Dentro
 * una frase l'errore è invisibile, tra una parola e l'altra no: il riquadro
 * saltella e a volte cade sulla parola sbagliata. La frase è l'unità che si
 * sente leggere, ed è l'unità che si vuole seguire.
 */
function Porzione({
  testo,
  inizio,
  fine,
  frase,
  evidenzia,
  onFrase,
  className,
}: {
  testo: string;
  inizio: number;
  fine: number;
  /** Frase in lettura, in coordinate del testo piatto (o `null`). */
  frase: Frase | null;
  evidenzia: boolean;
  /** Rilegge a partire da un indice nel testo piatto. */
  onFrase?: (offset: number) => void;
  className?: string;
}) {
  if (!evidenzia || !frase) {
    return <span className={className}>{testo}</span>;
  }

  // Intersezione fra questa porzione e la frase in lettura.
  const da = Math.max(inizio, frase.inizio);
  const a = Math.min(fine, frase.fine);
  if (a <= da || da >= fine || a <= inizio) {
    // La frase è altrove: questa porzione è già stata letta, o deve ancora
    // esserlo. In entrambi i casi resta testo normale, più tenue.
    return <span className={cn("text-ink-soft", className)}>{testo}</span>;
  }

  return (
    <span className={className}>
      {testo.slice(0, da - inizio) && (
        <span className="text-ink-soft">{testo.slice(0, da - inizio)}</span>
      )}
      <span
        data-attiva=""
        className={cn(
          "rounded-[4px] bg-brand-100 text-ink",
          onFrase && "cursor-pointer hover:bg-brand-200"
        )}
        onClick={onFrase ? () => onFrase(da) : undefined}
      >
        {testo.slice(da - inizio, a - inizio)}
      </span>
      {testo.slice(a - inizio) && (
        <span className="text-ink-soft">{testo.slice(a - inizio)}</span>
      )}
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

  /**
   * Testo e frasi del blocco, calcolati una volta per blocco: sono gli stessi
   * confini di frase che usano la voce dal vivo e le registrazioni.
   */
  const { parti, frasi } = useMemo(() => {
    const scomposto = componiBlocco(blocco);
    return { parti: scomposto.parti, frasi: frasiConOffset(scomposto.testo) };
  }, [blocco]);
  const frase = fraseA(frasi, posizione);

  // Auto-scroll interno: se il blocco supera la scena, l'utente non deve
  // toccare nulla. Portiamo la frase in corso al centro, con dolcezza.
  useEffect(() => {
    if (!evidenzia) return;
    const cont = contenitore.current;
    const attiva = cont?.querySelector<HTMLElement>("[data-attiva]");
    if (!cont || !attiva) return;
    if (cont.scrollHeight <= cont.clientHeight + 4) return;
    const target = attiva.offsetTop - cont.clientHeight / 2 + attiva.offsetHeight / 2;
    cont.scrollTo({ top: Math.max(0, target), behavior: riduciMovimento ? "auto" : "smooth" });
  }, [posizione, evidenzia, riduciMovimento]);

  const porzione = (p: ParteBlocco | undefined, className?: string) =>
    p ? (
      <Porzione
        testo={p.testo}
        inizio={p.inizio}
        fine={p.fine}
        frase={frase}
        evidenzia={evidenzia}
        onFrase={onParolaRipeti}
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
