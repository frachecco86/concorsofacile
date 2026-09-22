"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Flame, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { useProgressi, riepilogaProgressi } from "@/lib/dati/progressi";
import type { MateriaIndice } from "@/lib/dati/tipi";
import { num } from "@/lib/ui";

/**
 * Progressi: cosa hai visto, cosa sai, cosa rivedere.
 * Tutto locale, nessun account: la pagina è pura lettura di localStorage.
 */
export function PannelloProgressi({ materie }: { materie: MateriaIndice[] }) {
  const { progressi, azzera } = useProgressi();
  const [confermaAzzera, setConfermaAzzera] = useState(false);

  const riepilogo = riepilogaProgressi(progressi);

  const mappaMaterie = useMemo(
    () => new Map(materie.map((m) => [m.id, m])),
    [materie]
  );

  const perData = useMemo(
    () =>
      [...riepilogo.voci].sort(
        (a, b) =>
          new Date(b.ultimaVolta).getTime() - new Date(a.ultimaVolta).getTime()
      ),
    [riepilogo.voci]
  );

  if (riepilogo.voci.length === 0) {
    return (
      <div className="rounded-[28px] border-2 border-dashed border-sage-300 bg-sage-50 p-12 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
          <TrendingUp size={26} />
        </div>
        <h2 className="font-display text-2xl font-semibold">
          Ancora nessun progresso
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Completa la tua prima sessione di studio e qui troverai cosa sai e cosa
          vale la pena rivedere.
        </p>
        <Link
          href="/materie/"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-white shadow-[var(--shadow-brand)] transition hover:bg-brand-600"
        >
          Scegli una materia
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Riepilogo */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Stat valore={num(riepilogo.quizVisti)} etichetta="domande affrontate" />
        <Stat valore={num(riepilogo.saputi)} etichetta="sapute" colore="leaf" />
        <Stat
          valore={num(riepilogo.daRivedere)}
          etichetta="da rivedere"
          colore="sun"
        />
        <Stat valore={num(riepilogo.sessioni)} etichetta="sessioni" colore="brand" />
      </div>

      {/* Elenco per materia */}
      <section>
        <h2 className="mb-4 font-display text-2xl font-semibold">
          Le tue materie
        </h2>
        <ul className="space-y-3">
          {perData.map((p) => {
            const m = mappaMaterie.get(p.materiaId);
            const totali = m?.quizCount ?? p.visti.length;
            const perc = totali > 0 ? Math.round((p.saputi.length / totali) * 100) : 0;
            return (
              <li key={p.materiaId}>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-sage-200 bg-surface p-5 shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display text-lg font-semibold">
                        {p.materiaNome}
                      </h3>
                      <p className="tnum mt-0.5 text-sm text-ink-muted">
                        {num(p.saputi.length)} sapute ·{" "}
                        <span className="text-sun-500">
                          {num(p.daRivedere.length)} da rivedere
                        </span>{" "}
                        · {num(p.visti.length)}/{num(totali)} viste
                      </p>
                    </div>
                    <Link
                      href={`/studia/${p.materiaId}/`}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-4 py-2 text-sm font-bold text-brand-700 transition hover:bg-brand-100"
                    >
                      Continua
                      <ArrowRight size={15} />
                    </Link>
                  </div>

                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-sage-200">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-500 transition-all duration-700"
                      style={{ width: `${Math.min(100, perc)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs font-semibold text-ink-muted">
                    <span className="tnum">{perc}% di padronanza</span>
                    <span>
                      {p.daRivedere.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-sun-500">
                          <Flame size={12} />
                          {num(p.daRivedere.length)} in ripasso
                        </span>
                      )}
                    </span>
                  </div>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Azzera */}
      <section className="rounded-2xl border border-sage-200 bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Riparti da zero</h3>
            <p className="text-sm text-ink-muted">
              Cancella tutti i progressi salvati su questo dispositivo.
            </p>
          </div>
          {confermaAzzera ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  azzera();
                  setConfermaAzzera(false);
                }}
                className="inline-flex items-center gap-2 rounded-full bg-rose-500 px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
              >
                <Trash2 size={15} />
                Confermo
              </button>
              <button
                type="button"
                onClick={() => setConfermaAzzera(false)}
                className="rounded-full px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-sage-100"
              >
                Annulla
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfermaAzzera(true)}
              className="inline-flex items-center gap-2 rounded-full border border-sage-200 px-5 py-2.5 text-sm font-semibold text-ink-soft transition hover:border-rose-500/40 hover:text-rose-500"
            >
              <RotateCcw size={15} />
              Azzera
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  valore,
  etichetta,
  colore = "ink",
}: {
  valore: string;
  etichetta: string;
  colore?: "ink" | "leaf" | "sun" | "brand";
}) {
  const sfondo = {
    ink: "bg-sage-50 border-sage-200",
    leaf: "bg-leaf-100 border-leaf-500/20",
    sun: "bg-sun-100 border-sun-500/20",
    brand: "bg-brand-50 border-brand-200",
  }[colore];

  const testo = {
    ink: "text-ink",
    leaf: "text-leaf-600",
    sun: "text-sun-500",
    brand: "text-brand-700",
  }[colore];

  return (
    <div className={`rounded-2xl border p-5 ${sfondo}`}>
      <div className={`tnum font-display text-3xl font-semibold leading-none ${testo}`}>
        {valore}
      </div>
      <div className="mt-1.5 text-sm font-medium text-ink-muted">{etichetta}</div>
    </div>
  );
}
