import type { Metadata } from "next";
import { CategoriaConcorsi } from "@/components/CategoriaConcorsi";

export const metadata: Metadata = {
  title: "Sanità & Istruzione",
  description:
    "Concorsi del servizio sanitario e del mondo della scuola e dell'istruzione.",
};

export default function PaginaSanitaIstruzione() {
  return (
    <CategoriaConcorsi
      categoria="sanita-istruzione"
      titolo="Sanità & Istruzione"
      descrizione="Aziende sanitarie, enti ospedalieri e amministrazioni del comparto istruzione: profili tecnici, amministrativi e sanitari."
    />
  );
}
