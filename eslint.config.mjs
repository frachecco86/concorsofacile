import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * ESLint 9 · configurazione "flat".
 * `eslint-config-next` v16 esporta già configurazioni flat: niente compat layer.
 */
const configurazione = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Nomi di dominio in italiano: le variabili brevi restano chiare.
      // Il prefisso `_` segnala un valore volutamente inutilizzato.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
];

export default configurazione;
