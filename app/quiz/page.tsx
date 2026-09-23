import type { Metadata } from "next";
import { leggiMaterie } from "@/lib/dati/server";
import { CatalogoQuiz } from "@/components/CatalogoQuiz";
import { num } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Quiz",
  description:
    "Batterie di quiz per materia: rispondi, ascolta la correzione e ripeti solo quello che ti sfugge.",
};

export default async function PaginaQuiz() {
  const materie = await leggiMaterie();
  const quizTotali = materie.reduce((s, m) => s + m.quizCount, 0);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="mb-4">
        <h1 className="font-display text-[28px] font-semibold leading-tight sm:text-4xl">
          Quiz
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft sm:text-base">
          Scegli una materia e parti: 10 domande alla volta. Ogni risposta
          sbagliata torna più avanti, finché non diventa automatica.
        </p>
        {materie.length > 0 && (
          <p className="tnum mt-2 text-[12.5px] text-ink-muted">
            {num(materie.length)} materie · {num(quizTotali)} domande
          </p>
        )}
      </header>

      {materie.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-sage-300 bg-sage-50 p-10 text-center">
          <p className="font-medium text-ink-soft">
            Esegui <code className="rounded bg-surface px-1.5 py-0.5">npm run estrai</code>{" "}
            per caricare le batterie di quiz.
          </p>
        </div>
      ) : (
        <CatalogoQuiz materie={materie} />
      )}
    </main>
  );
}
