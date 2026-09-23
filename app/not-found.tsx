import Link from "next/link";
import { Compass } from "lucide-react";

export default function NonTrovato() {
  return (
    <main className="mx-auto flex min-h-[70dvh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-500">
        <Compass size={30} />
      </div>
      <h1 className="font-display text-3xl font-semibold">
        Questa pagina non esiste
      </h1>
      <p className="mt-3 text-ink-soft">
        Forse la materia che cercavi non è ancora stata estratta. Torna
        all&apos;elenco e scegline un&apos;altra.
      </p>
      <Link
        href="/materie/"
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 text-sm font-bold text-cream shadow-[var(--shadow-brand)] transition hover:bg-brand-600"
      >
        Vai alle materie
      </Link>
    </main>
  );
}
