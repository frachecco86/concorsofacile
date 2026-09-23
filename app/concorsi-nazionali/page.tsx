import type { Metadata } from "next";
import { CategoriaConcorsi } from "@/components/CategoriaConcorsi";

export const metadata: Metadata = {
  title: "Ministeri & Enti nazionali",
  description:
    "Concorsi di ministeri, presidenza del Consiglio, agenzie ed enti nazionali.",
};

export default function PaginaConcorsiNazionali() {
  return (
    <CategoriaConcorsi
      categoria="nazionali"
      titolo="Ministeri & Enti nazionali"
      descrizione="Concorsi banditi da amministrazioni centrali, agenzie e enti pubblici nazionali. Spesso molte sedi, prove uniche su base nazionale."
    />
  );
}
