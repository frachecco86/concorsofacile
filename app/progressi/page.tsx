import type { Metadata } from "next";
import { leggiMaterie } from "@/lib/dati/server";
import { PannelloProgressi } from "@/components/PannelloProgressi";

export const metadata: Metadata = {
  title: "Progressi",
  description: "Cosa hai studiato, cosa sai e cosa rivedere.",
};

export default async function PaginaProgressi() {
  const materie = await leggiMaterie();

  return (
    <main className="mx-auto max-w-5xl px-4 pb-24 pt-10 sm:px-6 sm:pt-14">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">
          I tuoi progressi
        </h1>
        <p className="mt-2 text-ink-soft">
          Salvati su questo dispositivo. ConcorsoFacile li usa per proporti prima le
          domande che ti sono sfuggite.
        </p>
      </header>
      <PannelloProgressi materie={materie} />
    </main>
  );
}
