import type { NextConfig } from "next";

/**
 * `NEXT_PUBLIC_BASE_PATH` permette di servire ConcorsoFacile da una sottocartella,
 * come richiede GitHub Pages per i repository di progetto
 * (`https://utente.github.io/concorsofacile/`).
 *
 * Con un dominio personalizzato o su Cloudflare/Netlify/Vercel la variabile
 * resta vuota e tutto viene servito dalla radice.
 *
 * Nota: il percorso è cablato a build time, quindi va impostato **prima** di
 * `next build` (vedi gli script `build:gh` e `deploy/`).
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * ConcorsoFacile è un'app di studio *statica*: i quiz sono dati immutabili, la voce
 * gira nel browser e i progressi vivono in localStorage. Non c'è nulla da
 * calcolare per richiesta.
 *
 * `output: "export"` genera HTML/CSS/JS puri in `out/`: niente server, niente
 * cold start, e l'app è ospitabile su qualunque host statico gratuito.
 * È anche il prerequisito per farla funzionare offline come PWA.
 */
const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,
  basePath: basePath || undefined,
  assetPrefix: basePath || undefined,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    // L'ottimizzazione immagini richiede un server: con export statico si disattiva.
    unoptimized: true,
  },
  turbopack: {
    resolveAlias: {
      /**
       * Piper porta con sé un ramo Node (`require("fs")`) mai eseguito nel
       * browser ma che il bundler deve comunque risolvere. Lo sostituiamo con
       * uno shim vuoto: vedi `lib/shim/fs-vuoto.js`.
       */
      fs: "./lib/shim/fs-vuoto.js",
    },
  },
};

export default nextConfig;
