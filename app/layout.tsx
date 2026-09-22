import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import { FornitoreVoce } from "@/lib/voce/hook";
import { Testata } from "@/components/Testata";
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
};

export const viewport: Viewport = {
  themeColor: "#F7FAF8",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className={`${fraunces.variable} ${jakarta.variable}`}>
      <body className="min-h-dvh antialiased">
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
          <Testata />
          {children}
        </FornitoreVoce>
      </body>
    </html>
  );
}
