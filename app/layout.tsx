import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { FornitoreVoce } from "@/lib/voce/hook";
import { FornitoreSessioneAudio } from "@/lib/audio/sessione";
import { Guscio } from "@/components/Guscio";
import { BarraAudio } from "@/components/BarraAudio";
import { PlayerAudio } from "@/components/PlayerAudio";
import { leggiMaterie } from "@/lib/dati/server";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

/**
 * Fraunces — serif variabile "soft", usata per titoli e domande.
 * Dà all'app un'identità editoriale, non un look SaaS generico.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
});

/**
 * Plus Jakarta Sans — UI e testi lunghi: geometrica, moderna, ottima
 * leggibilità su schermo anche a dimensioni piccole.
 */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "ConcorsoFacile · Studia ascoltando",
    template: "%s · ConcorsoFacile",
  },
  description:
    "App di apprendimento con contesto e voce: migliaia di quiz letti ad alta voce, sessione dopo sessione.",
  applicationName: "ConcorsoFacile",
  appleWebApp: {
    capable: true,
    title: "ConcorsoFacile",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  // Il colore è aggiornato da `lib/tema.ts` quando si passa alla modalità notte.
  themeColor: "#f7faf8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Su mobile il layout deve arrivare fino ai bordi: le safe area le gestiamo
  // noi con `env(safe-area-inset-*)`, così header e bottom bar non galleggiano.
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // L'indice delle materie serve alla ricerca rapida della top bar. È un file
  // statico rigenerato a ogni build: nessun costo per richiesta.
  const materie = await leggiMaterie();

  return (
    <html
      lang="it"
      className={`${fraunces.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        {/*
          Il tema va applicato *prima* del primo paint, altrimenti la pagina
          nasce chiara e passa allo scuro solo dopo l'idratazione: un lampo
          bianco, fastidiosissimo di notte. Lo script è inline e non dipende
          da nulla, quindi non ritarda il rendering.
        */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />

        {/*
          Le variabili --font-fraunces / --font-jakarta sono iniettate da
          next/font. Le rimappiamo sui token del design system così che
          Fraunces sia il font "display" predefinito.
        */}
        <style>{`
          :root {
            --font-display: var(--font-fraunces), Georgia, serif;
            --font-sans: var(--font-jakarta), ui-sans-serif, system-ui, sans-serif;
          }
        `}</style>

        <FornitoreVoce>
          {/*
            La sessione audio sta *sopra* il guscio e vive quanto l'app: il
            motore di lettura non appartiene alla pagina della lezione, quindi
            l'ascolto non si spegne navigando (direttive §3B/§3C).
          */}
          <FornitoreSessioneAudio>
            <Guscio materie={materie}>{children}</Guscio>
            {/* Barra flottante e player a schermo intero: sopra ogni pagina. */}
            <BarraAudio />
            <PlayerAudio />
          </FornitoreSessioneAudio>
        </FornitoreVoce>
      </body>
    </html>
  );
}
