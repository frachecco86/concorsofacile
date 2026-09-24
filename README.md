# ConcorsoFacile

App di apprendimento **con contesto e voce**: migliaia di quiz letti ad alta
voce, con un ripasso che si costruisce da sé in base a ciò che sbagli.

Nata dal corpus di concorsi già esportato in `../materie-json/` (339 materie,
~934.000 quiz, originati dai doc-definition pdfMake del simulatore): qui i quiz
vengono **estratti** in JSON leggeri e fruiti da un'app web immediata.

---

## Avvio rapido

```bash
pnpm install
pnpm estrai          # estrae le materie pilota  (~2 secondi)
pnpm voce:aggiorna   # allinea i WASM della voce   (~30 secondi, 32 MB)
pnpm dev             # http://localhost:3000
```

---

## Come è fatta

```
├── scripts/
│   ├── extract.mjs         # doc-definition pdfMake → JSON di quiz
│   ├── aggiorna-voce.mjs   # allinea i WASM di Piper/ONNX alla versione installata
│   └── versione.mjs        # genera lib/versione.generato.ts dalla storia git
├── public/
│   ├── data/               # quiz estratti (rigenerabili)
│   └── voce/               # WASM della voce neurale (rigenerabili)
├── lib/
│   ├── dati/               # lettura dati + progressi (localStorage)
│   └── voce/               # ASTRAZIONE del motore voce (vedi sotto)
├── components/             # UI
└── app/                    # pagine (export statico)
```

### La voce

Il punto architetturale importante: **l'app non conosce il motore TTS.** Parla
solo con l'interfaccia `MotoreVoce` (`lib/voce/tipi.ts`). Esistono due
implementazioni:

| Motore | Come funziona | Quando ha senso |
|---|---|---|
| `WebSpeechEngine` | `speechSynthesis` del sistema | Voci italiane già installate: zero download, latenza minima |
| `PiperEngine` | Piper (VITS→ONNX) in WebAssembly, modello in OPFS | Nessuna voce di sistema, o qualità identica su ogni dispositivo |

`GestoreVoce` sceglie automaticamente: se il dispositivo non ha **nessuna**
voce (caso comune su Linux e molti browser desktop) passa da solo alla voce
neurale e lo comunica all'utente.

Aggiungere un terzo motore (es. Kokoro-82M) significa implementare
`MotoreVoce` e registrarlo: nessuna modifica all'interfaccia.

### La voce registrata (lezioni)

La sintesi nel browser ha un difetto che non si può nascondere: Piper impiega
1–3 secondi per un blocco e non può partire prima di averlo finito. Per le
lezioni — dove il testo è noto in anticipo — l'audio si registra **una volta in
fase di build** e si serve come file:

```bash
pnpm voce:registra                 # la lezione pilota (un capitolo)
pnpm voce:registra -- --tutto      # tutte le lezioni
pnpm voce:registra -- --materia "Diritto amministrativo" --capitolo 2
```

Come funziona:

- il testo di ogni blocco viene diviso in **frasi** (`lib/frasi.ts`), la stessa
  divisione che usa l'app per leggere;
- ogni frase si sintetizza a parte — ma **in un solo processo** Piper, perché il
  caricamento del modello costa più della sintesi: una frase per riga di
  `--json-input`, una sola inferenza per modello caricato;
- la durata di ogni frase è quindi **nota**, non stimata: è ciò che rende
  esatta l'evidenziazione per frase;
- i file finiscono in `public/voce-registrata/` (un MP3 per blocco, ~8 KB al
  secondo) e il catalogo in `lib/voce/registrazioni.json`, entrambi versionati;
- la voce usata è in `lib/voce/voce-registrata.ts` — un solo posto, perché l'id
  fa parte della chiave: script e app **devono** usare lo stesso;
- la chiave è l'impronta del testo **letto**: se il testo cambia, la chiave
  cambia e la registrazione vecchia non viene più servita — quel blocco ricade
  sulla voce dal vivo, senza audio fuori sincrono;
- rieseguire lo script **aggiunge** le registrazioni mancanti, non rifà il
  catalogo da capo;
- il binario Piper, il modello (~89 MB) e l'encoder MP3 restano in
  `~/.cache/concorsofacile-voce/`, fuori dal progetto.

In riproduzione la scelta è per testo: le lezioni registrate partono
all'istante e funzionano offline, tutto il resto (quiz, anteprime, testi nuovi)
resta alla voce dal vivo.

### I dati

`extract.mjs` legge i doc-definition pdfMake. Tre cose non ovvie, già risolte:

1. **Una materia è spezzata in più tabelle** (una per argomento), tutte con lo
   stesso schema: vanno unite, non va presa la più grande.
2. **La colonna "ID Ufficiale" riparte da 1 in ogni tabella**: il dedup va
   fatto sul contenuto (`domanda + risposta`), mai sull'id.
3. **L'id non è sempre numerico**: esistono forme come `IA00005`. Il parser lo
   conserva come stringa.

L'estrazione è verificata contro il conteggio dichiarato in ogni file
(`"Nel file sono presenti N quiz"`).

### I progressi

Stanno in `localStorage`: nessun account, nessun server, nessuna attesa.
`costruisciOrdine()` dà priorità a ciò che hai segnato "da rivedere", poi a ciò
che non hai mai visto, infine al resto. Anche la sessione in corso è
persistita, quindi un refresh non la perde.

---

## Estrazione

```bash
pnpm estrai                    # materie pilota (PILOT in extract.mjs)
pnpm estrai -- --all           # tutte le 339 materie
pnpm estrai -- --materia 266   # una sola materia
pnpm estrai -- --list          # elenca gli indici
pnpm estrai -- --force         # rigenera anche quelle già presenti
```

> Solo le 8 materie pilota pesano ~9 MB. Tutte le 339 ne pesano ~390 MB:
> valuta di **non** metterle nel repository e di generarli in CI (vedi sotto).

---

## Deploy

L'app è un **export statico** (`output: "export"`): niente server, niente cold
start, hostabile ovunque. I file finiscono in `out/`.

| Host | Config | Note |
|---|---|---|
| Cloudflare Workers | `wrangler.toml` | `npx wrangler deploy`. Bandwidth illimitata. |
| Cloudflare Pages | `wrangler.toml` | `npx wrangler pages deploy out` |
| GitHub Pages | `.github/workflows/deploy-pages.yml` | Usa `build:gh` (base path `/concorsofacile`) |
| Netlify | `netlify.toml` | Build automatica da Git |
| Vercel | `vercel.json` | Build automatica da Git |
| Render / Surge / qualsiasi host statico | — | Carica `out/` |

### Vincoli da conoscere

- **File singolo < 25 MiB** (limite Cloudflare e GitHub Pages). Gli asset voce
  sono tenuti sotto: ~17 MB il più grande. Il WASM WebGPU di ONNX (28 MB) è
  volutamente **escluso**.
- **GitHub Pages in sottocartella**: la build deve conoscere il prefisso.
  Usa `pnpm build:gh` (o imposta `NEXT_PUBLIC_BASE_PATH`).
- **`public/.nojekyll`** deve esistere su GitHub Pages, altrimenti Jekyll
  ignora la cartella `_next/` e la pagina resta bianca.
- **Nessun `searchParams`**: con l'export statico non esiste un server che
  legga l'URL. Le scelte di sessione (es. numero di domande) vivono nel
  client, non nella query string.

### Build grande? Genera i dati in CI

Con tutte le 339 materie conviene non versionare `public/data/`:

```yaml
- run: npm ci
- run: npm run estrai:all      # i JSON sorgente devono essere presenti
- run: npm run voce:aggiorna
- run: npm run build
```

---

## Accessibilità

- Ogni testo leggibile ha il suo controllo voce, mai nascosto in un menu.
- Uso completo da tastiera: `Spazio` rivela, `1` la sapevo, `2` da rivedere,
  `R` rilegge, `←/→` naviga.
- `prefers-reduced-motion` disattiva tutte le animazioni.
- Contrasto WCAG AA, focus visibile su ogni controllo.

---

## Versione e note di rilascio

La versione dell'app compare in topbar e, se toccata, apre la finestra **Novità**
con le modifiche di ogni rilascio.

La regola è **+0.1 a ogni commit** (schema minor): con N commit la versione è
`0.N.0`, quindi ogni commit aggiunge esattamente 0.1.

La versione **non è scritta a mano**. È una funzione della storia git, generata
in `lib/versione.generato.ts` da `scripts/versione.mjs`, che gira su `predev`,
`prebuild` e `postinstall`. Titolo e voci di ogni rilascio sono la prima riga e
le righe `- ...` del messaggio di commit.

```bash
pnpm versione            # rigenera a mano
pnpm versione --stampa   # vede il risultato senza scrivere
```

> **Perché non un hook git.** Sarebbe la soluzione ovvia, ma git **non permette
di mettere in stage dall'hook `commit-msg`** (l'indice è già stato fotografato)
e `pre-commit` non vede ancora il messaggio. Un hook non può fare entrambe le
cose, quindi il bump finirebbe nel commit successivo. Generare dalla storia
toglie il problema: non esiste uno stato da tenere allineato.

> **Nota per la CI.** Il conteggio dipende dalla profondità del clone: il
workflow usa `fetch-depth: 0`, altrimenti la versione sarebbe `0.1.0` a ogni
deploy.

---

## Comandi

| Comando | Cosa fa |
|---|---|
| `pnpm dev` | Sviluppo |
| `pnpm build` | Export statico in `out/` |
| `pnpm build:gh` | Build con base path per GitHub Pages |
| `pnpm anteprima` | Serve `out/` per verificare prima del deploy |
| `pnpm estrai` / `estrai:all` | Estrazione quiz |
| `pnpm voce:aggiorna` | Allinea i WASM della voce |
| `pnpm versione` | Rigenera versione e changelog dalla storia git |
| `pnpm versione --stampa` | Come sopra, ma stampa senza scrivere file |
