"use client";

import { AlertTriangle, Check, Download, Loader2, X } from "lucide-react";
import { motion } from "motion/react";
import { useVoce } from "@/lib/voce/hook";
import { cn } from "@/lib/ui";

/**
 * Impostazioni della voce: motore, voce, velocità, tono, volume.
 *
 * Vive in un pannello a scomparsa — su mobile si apre dal basso (foglio), su
 * schermo grande al centro (finestra). È lo stesso componente: cambia solo
 * l'allineamento.
 */
export function PannelloVoce({ onChiudi }: { onChiudi: () => void }) {
  const {
    motori,
    motore,
    voci,
    impostazioni,
    aggiorna,
    parla,
    cambiaMotore,
    scaricaVoce,
    statoModello,
    serveVoceNeurale,
    disponibile,
  } = useVoce();

  const vociItaliane = voci.filter((v) => v.italiana);
  const elenco = vociItaliane.length > 0 ? vociItaliane : voci;
  const inScarico = statoModello?.fase === "scarico";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/25 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onChiudi}
    >
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[28px] border border-sage-200 bg-surface p-6 pb-safe shadow-[var(--shadow-lift)] sm:rounded-[var(--radius-card)] sm:pb-6"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold">Impostazioni voce</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {disponibile
                ? `${elenco.length} voci disponibili per questo motore`
                : "Nessun motore voce utilizzabile in questo browser."}
            </p>
          </div>
          <button
            type="button"
            onClick={onChiudi}
            aria-label="Chiudi"
            className="tap inline-flex shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-sage-100 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>

        {serveVoceNeurale && (
          <div className="mb-5 flex gap-3 rounded-2xl border border-sun-500/30 bg-sun-100 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-sun-500" />
            <p className="text-sm leading-relaxed text-ink-soft">
              <b className="font-semibold text-ink">
                Il tuo dispositivo non ha voci installate.
              </b>{" "}
              Attiva la <b>voce neurale</b>: viene scaricata una sola volta e poi
              funziona sempre, anche offline.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Motore */}
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Motore
            </span>
            <div className="space-y-2">
              {motori.map((m) => {
                const attivo = m.id === motore;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => cambiaMotore(m.id)}
                    className={cn(
                      "tap-alto flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
                      attivo
                        ? "border-voce-400 bg-voce-50"
                        : "border-sage-200 bg-cream hover:border-sage-300"
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
                        attivo ? "border-voce-500 bg-voce-500" : "border-sage-300"
                      )}
                    >
                      {attivo && <Check size={12} strokeWidth={4} className="text-cream" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold">{m.nome}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                        {m.descrizione}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Download del modello neurale */}
          {motore === "neurale" && (
            <StatoModelloBox
              stato={statoModello}
              onScarica={scaricaVoce}
              inScarico={inScarico}
            />
          )}

          {/* Voce */}
          {elenco.length > 0 && (
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Voce
              </span>
              <select
                value={impostazioni.voceId ?? ""}
                onChange={(e) => {
                  aggiorna({ voceId: e.target.value || null });
                  if (motore === "dispositivo") {
                    parla("Ciao, sono la voce che hai scelto. Studiamo insieme!");
                  }
                }}
                className="tap-alto w-full rounded-xl border border-sage-200 bg-cream px-3.5 py-3 text-sm font-medium text-ink transition focus:border-brand-400 focus:bg-surface"
              >
                {elenco.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nome} ({v.lingua}){v.qualita ? ` · ${v.qualita}` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}

          <Cursore
            etichetta="Velocità"
            valore={impostazioni.velocita}
            min={0.6}
            max={1.8}
            passo={0.05}
            formatta={(v) => `${v.toFixed(2)}×`}
            onCambia={(v) => aggiorna({ velocita: v })}
          />
          <Cursore
            etichetta="Tono"
            valore={impostazioni.tono}
            min={0.6}
            max={1.4}
            passo={0.05}
            formatta={(v) => v.toFixed(2)}
            onCambia={(v) => aggiorna({ tono: v })}
            disabilitato={motore === "neurale"}
            nota={motore === "neurale" ? "Non regolabile sulla voce neurale" : undefined}
          />
          <Cursore
            etichetta="Volume"
            valore={impostazioni.volume}
            min={0}
            max={1}
            passo={0.05}
            formatta={(v) => `${Math.round(v * 100)}%`}
            onCambia={(v) => aggiorna({ volume: v })}
          />

          <button
            type="button"
            disabled={inScarico}
            onClick={() =>
              parla(
                "Questa è la voce, la velocità e il tono con cui leggerò le domande e le risposte."
              )
            }
            className="tap-alto w-full rounded-full bg-voce-500 py-3 text-sm font-semibold text-cream shadow-[var(--shadow-voce)] transition hover:bg-voce-600 active:scale-[0.98] disabled:opacity-50"
          >
            {inScarico ? "Preparazione della voce…" : "Prova la voce"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Riquadro di stato del download: onesto su cosa sta succedendo. */
function StatoModelloBox({
  stato,
  onScarica,
  inScarico,
}: {
  stato: import("@/lib/voce/piper").StatoModello | null;
  onScarica: () => void;
  inScarico: boolean;
}) {
  if (stato?.fase === "pronto") {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-leaf-500/25 bg-leaf-100 p-4">
        <Check size={18} className="shrink-0 text-leaf-600" strokeWidth={3} />
        <p className="text-sm font-medium text-leaf-600">
          Voce scaricata e pronta. Funziona anche senza connessione.
        </p>
      </div>
    );
  }

  if (inScarico) {
    return (
      <div className="rounded-2xl border border-voce-200 bg-voce-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-voce-700">
          <Loader2 size={16} className="animate-spin" />
          Download della voce neurale… {stato?.percentuale ?? 0}%
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-voce-100">
          <div
            className="h-full rounded-full bg-voce-500 transition-all duration-300"
            style={{ width: `${stato?.percentuale ?? 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Circa 63 MB, una sola volta. La voce resta salvata sul dispositivo.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sage-200 bg-cream p-4">
      <div className="flex items-start gap-3">
        <Download size={18} className="mt-0.5 shrink-0 text-ink-muted" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Modello non ancora scaricato</p>
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">
            {stato?.fase === "errore"
              ? stato.messaggio
              : "Serve una connessione solo per il primo download (~63 MB)."}
          </p>
          <button
            type="button"
            onClick={onScarica}
            className="tap-alto mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-cream transition hover:opacity-90 active:scale-95"
          >
            <Download size={14} />
            Scarica ora
          </button>
        </div>
      </div>
    </div>
  );
}

function Cursore({
  etichetta,
  valore,
  min,
  max,
  passo,
  formatta,
  onCambia,
  disabilitato,
  nota,
}: {
  etichetta: string;
  valore: number;
  min: number;
  max: number;
  passo: number;
  formatta: (v: number) => string;
  onCambia: (v: number) => void;
  disabilitato?: boolean;
  nota?: string;
}) {
  return (
    <div className={cn(disabilitato && "opacity-45")}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          {etichetta}
        </span>
        <span className="tnum rounded-full bg-sage-100 px-2.5 py-1 text-xs font-semibold text-ink-soft">
          {formatta(valore)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={passo}
        value={valore}
        disabled={disabilitato}
        onChange={(e) => onCambia(Number(e.target.value))}
        className="h-6 w-full cursor-pointer appearance-none rounded-full bg-sage-200 accent-brand-500 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:shadow-[var(--shadow-brand)]"
      />
      {nota && <p className="mt-1.5 text-xs text-ink-muted">{nota}</p>}
    </div>
  );
}
