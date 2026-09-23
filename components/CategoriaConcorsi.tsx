import {
  CONCORSI,
  categoriaEnte,
  quantiAperti,
  type CategoriaEnte,
} from "@/lib/dati/concorsi";
import { ElencoConcorsi } from "./ElencoConcorsi";

/**
 * Pagina di una categoria di enti (§1B).
 *
 * Le tre voci del menu — nazionali, locali, sanità — sono viste filtrate dello
 * stesso elenco: stessa scheda, stesso ordine, nessuna logica duplicata. Una
 * categoria vuota lo dice apertamente invece di mostrare una pagina bianca.
 */
export function CategoriaConcorsi({
  categoria,
  titolo,
  descrizione,
}: {
  categoria: CategoriaEnte;
  titolo: string;
  descrizione: string;
}) {
  const concorsi = CONCORSI.filter((c) => categoriaEnte(c) === categoria);
  const aperti = quantiAperti(concorsi);

  return (
    <main className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-6">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          {titolo}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-soft sm:text-base">
          {descrizione}
        </p>
        <p className="mt-2 text-[12.5px] text-ink-muted">
          {concorsi.length === 0
            ? "Nessun concorso in questa categoria al momento."
            : `${concorsi.length} concorsi seguiti · ${aperti} ancora aperti`}
        </p>
      </header>

      <ElencoConcorsi concorsi={concorsi} />
    </main>
  );
}
