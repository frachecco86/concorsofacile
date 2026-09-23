import type { Metadata } from "next";
import { CategoriaConcorsi } from "@/components/CategoriaConcorsi";

export const metadata: Metadata = {
  title: "Comuni, Regioni & Enti locali",
  description:
    "Concorsi di comuni, province, regioni e aggregazioni di enti locali.",
};

export default function PaginaEntiLocali() {
  return (
    <CategoriaConcorsi
      categoria="enti-locali"
      titolo="Comuni, Regioni & Enti locali"
      descrizione="Selezioni di comuni, province, regioni e loro associazioni. Requisiti e materie cambiano molto da bando a bando: qui le trovi già schematizzate."
    />
  );
}
