import { ordinaConcorsi, type Concorso } from "@/lib/dati/concorsi";
import { SchedaConcorso } from "./SchedaConcorso";

/**
 * Elenco dei concorsi, dal più urgente al più vecchio.
 * Usato dalla home e dalle pagine per categoria: stessa lista, stessa logica.
 */
export function ElencoConcorsi({ concorsi }: { concorsi: Concorso[] }) {
  const ordinati = ordinaConcorsi(concorsi);

  if (ordinati.length === 0) {
    return (
      <p className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-8 text-center text-sm text-ink-soft">
        Nessun concorso in questa categoria per ora.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {ordinati.map((c) => (
        <li key={c.id}>
          <SchedaConcorso concorso={c} />
        </li>
      ))}
    </ul>
  );
}
