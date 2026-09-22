---
name: "Player del testo — ConcorsoFacile"
description: "Design della modalità Ascolta: scena di un blocco, karaoke, autoplay con o senza voce"
status: implementata
---

# Player del testo

## 0. Idea

Il capitolo diventa una **scena** che mostra **un blocco alla volta**, grande e
centrato, e che **avanza da solo**. Non si scorre per leggere: il testo si muove
al ritmo della voce. Chi vuole consultare torna alla vista a blocchi impilati.

Due modalità dello stesso capitolo:

| Modalità | Cosa è | Per chi |
|---|---|---|
| **Leggi** | La lista a blocchi di oggi | Consultare, cercare, rileggere |
| **Ascolta** | La scena con player | Leggere o ascoltare in modo passivo |

La modalità è persistita per dispositivo (`concorsofacile.lettore.modalita`).
Default: `Ascolta` se l'utente ha già usato la voce, altrimenti `Leggi`.

---

## 1. Struttura (blocco alla volta)

```
┌──────────────────────────────────────────────┐
│ ◀  Diritto amministrativo · Cap. 2    ⋯  ▶   │  ← barra player (sticky)
│    ──────────────────────────────── 2/4      │  ← avanzamento capitolo
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  DEFINIZIONE                           │  │  ← etichetta tipo blocco
│  │                                        │  │
│  │  Principio di legalità                 │  │  ← termine (display)
│  │                                        │  │
│  │  La pubblica amministrazione può fare  │  │  ← testo 20–24px
│  │  solo ciò che la ▓legge le consente▓.  │  │  ← karaoke
│  │  Il privato, al contrario, può fare    │  │
│  │  tutto ciò che la legge non vieta.     │  │
│  └────────────────────────────────────────┘  │
│                                              │
│              ● ○ ○ ○                         │  ← pallini blocchi
├──────────────────────────────────────────────┤
│  ⏮   ⏸/▶   ⏭      ⟳ auto    1×    ▤ Leggi    │  ← dock comandi
└──────────────────────────────────────────────┘
```

Regole di layout:

- **Il testo non scrolla mai** in Ascolta. Il blocco più lungo si adatta con un
  `font-size` fluido (`clamp(17px, 4.6vw, 24px)`) e `line-height 1.5`. Se anche
  così non entra, il blocco **scorre da solo** dentro la scena (auto-scroll
  interno), non l'utente.
- La scena occupa `100dvh − barra − dock`; i comandi restano sempre visibili.
- `prefers-reduced-motion`: nessuna transizione tra blocchi, il testo si
  sostituisce di scatto.

---

## 2. Macchina a stati

Una sola sorgente di verità: il player non inventa stati, li deriva.

```
        ┌──────── idle ────────┐
        │  (blocco scelto,     │
        │   nessuna voce)      │
        └───┬───────────▲──────┘
       play │           │ fine / pausa
            ▼           │
   ┌── preparazione ────┤      (voce neurale: 1–3s, spinner sul play)
   │        │ avvio     │
   │        ▼           │
   │    ┌── lettura ────┴── pausa ──┐
   │    │   (karaoke)     │          │
   │    │                 ▼          │
   │    │              pausa ◄──────►│
   │    ▼                            │
   │  fine blocco ──► blocco+1 (se autoplay)
   │                     │
   └─────────────────────┘
```

Stati UI (derivati, non nuovi):

- `inPreparazione` = `bloccoAttivo !== null && stato === "idle"` (già in uso).
- `inAscolto` = `bloccoAttivo !== null && stato !== "idle"` (già in uso).
- `modalitaSoloTesto` = l'utente ha premuto play con audio assente/muto:
  l'avanzamento passa al **timer** (§4).

L'autoplay riusa `impostaFineLettura` del hook della voce: a fine blocco
`bloccoRef` avanza. Con il timer, la stessa callback viene chiamata da
`setTimeout` alla fine stimata — **un solo percorso di avanzamento**, così
l'autoplay non si duplica.

---

## 3. Karaoke parola per parola

Il hook espone `posizione` = indice di **carattere** e `onParola(i, len)`.
Oggi `LettoreLezione` mostra il taglio sul singolo blocco attivo.

Per la scena serve di più: **parole cliccabili** (tap su una parola = leggi da
lì) e la parola attiva identificabile.

Nuova utility pura in `lib/dati/lezioni.ts`:

```ts
export interface ParolaTesto {
  testo: string;   // "legge"  (senza spazi)
  inizio: number;  // indice carattere nell'inizio del testo letto
  fine: number;    // esclusivo
  separatore: string; // " ", "\n", "• " …
}

/** Segmenta il testo piatto di un blocco in parole, mantenendo le posizioni. */
export function paroleBlocco(testo: string): ParolaTesto[];
```

La scena:

1. riceve `posizione` dal hook;
2. `parolaAttiva = ultima parola con inizio <= posizione`;
3. rende `<span>` per parola: `aria-hidden` sul contenitore e un `<p>` con
   `aria-live="off"`; lo screen reader non deve annunciare la lettura parola per
   parola — l'audio fa già il suo lavoro;
4. la parola attiva ha sfondo `brand-100` (già usato da `CardQuiz`), il testo
   restante `ink`, il già letto `ink-soft`. Transizione 120ms, disattivata con
   `prefers-reduced-motion`.

**Punti e definizioni.** `testoBlocco` per `punti` produce
`"Titolo. • a. • b"`: la segmentazione deve ricostruire l'elenco visivo
(titolo in display, voci come lista). Quindi la scena non ri-segmenta il testo
piatto per il rendering: usa i **dati strutturati** del blocco e mappa
`posizione` sull'offset cumulativo. `paroleBlocco` serve solo a calcolare gli
offset; il rendering resta `Corpo`-style, arricchito dal karaoke.

---

## 4. Avanzamento senza audio (timer stimato)

Solo quando la voce non è disponibile o l'utente ha scelto il silenzio.
La base esiste già: `stimaMinuti` usa **150 parole/minuto**.

```ts
// nuove utility pure, testabili
export function conteggioParole(t: string): number;
export function millisecondiStimati(testo: string, velocita: number): number;
//  = conteggioParole / (150 * velocita) * 60_000  → /150 ≈ 400ms per parola a 1×
```

Il timer parte dal **primo indice di parola** e si aggiorna con
`requestAnimationFrame`, producendo lo **stesso `posizione`** della voce: la
scena non sa da dove arriva, quindi karaoke e avanzamento sono identici.

Controlli identici: play/pausa ferma o riprende il timer; `1× / 1.25× / 1.5× / 2×`
moltiplica la velocità. Chiudere il player azzera.

Fine blocco → stessa callback dell'autoplay. A fine capitolo → `segnaCompletato`
(solo se il tempo è stato effettivamente consumato, non se si è saltato).

> Nota: se la voce è disponibile, il timer **non** viene mai usato. Il timer è
> il fallback, non un'alternativa preferibile.

---

## 5. Comandi

| Comando | Posizione | Azione |
|---|---|---|
| Play / Pausa | dock, centro | Avvia la voce (o il timer); in preparazione mostra spinner |
| Blocco precedente | dock | Torna al blocco prima, rispetta l'autoplay |
| Blocco successivo | dock | Salta avanti senza segnare completato il blocco saltato |
| Auto | dock | `aria-pressed`; attiva/disattiva l'avanzamento automatico |
| Velocità | dock | 1× / 1.25× / 1.5× / 2×, già persistita nelle preferenze voce |
| Leggi / Ascolta | barra alta | Cambia modalità senza perdere il capitolo |
| Piano della lezione | barra alta `⋯` | Fisarmonica attuale, salta a capitolo |
| Chiudi | barra alta `✕` | Ferma e torna a Leggi |

Per un salto manuale **non** c'è autoplay: il blocco diventa `attivo` ma la
voce non parte finché non si preme play. È la regola che riduce l'attrito
"perché sta leggendo cose che non ho chiesto".

---

## 6. Differenze rispetto a oggi

Su `components/LettoreLezione.tsx`:

- oggi: lista di `Blocco` impilati + dock in basso.
- domani:
  - `Blocco` resta come componente (riusato in Leggi);
  - nuovo `ScenaBlocco` (un blocco alla volta, karaoke, font fluido);
  - `LettoreLezione` diventa il contenitore: stato modalità, capitolo/blocco,
    autoplay, comandi. Il rendering della scena o della lista è un ramo.

Nessuna modifica al contratto `MotoreVoce`. Le uniche aggiunte al hook voce,
se si vuole che la pausa del timer e della voce coincidano:

```ts
// lib/voce/hook.tsx — opzionale
/** Stato "pausa" anche per l'audio sintetico che non supporta pausa. */
pausa: () => void;
riprendi: () => void;
```

Il resto (motori, prefetch, `posizione`) è già sufficiente.

---

## 7. Accessibilità

- La scena è un `<section aria-label="Blocco N di M">`; a ogni cambio blocco
  `aria-live="polite"` annuncia **solo** il numero e il titolo del blocco, non
  il testo (già letto dalla voce).
- Tap su una parola = avvia la lettura **da quella parola**: si passa l'offset
  al motore. Solo per `WebSpeech` (supporta `start`); per Piper/`piper-tts-web`
  il tap riparte dall'inizio del blocco. Se non supportato, il tap è disattivato
  con `title` esplicativo.
- Controlli con `aria-label` e `aria-pressed` come oggi.
- `prefers-reduced-motion` disattiva transizioni di scena e karaoke.

---

## 8. Casi limite

| Caso | Comportamento |
|---|---|
| Blocco più lungo della scena | Auto-scroll interno dolce (o font 17px minimo) |
| Voce non disponibile | Play avvia il timer; l'etichetta mostra "lettura stimata" |
| Cambio velocità durante la lettura | Riavvia la sintesi dal blocco corrente (Piper/WebSpeech non cambiano a caldo); il timer si aggiorna subito |
| Fine ultimo blocco ultimo capitolo | Ferma, `segnaCompletato`, riapre la modalità Leggi con i progressi |
| Uscita dal player | `ferma()` e `bloccoRef = null`, come oggi nello smontaggio per cambio capitolo |
| `punti` con titolo | Il karaoke copre titolo e voci in sequenza, senza ri-renderizzare la lista a ogni parola |

---

## 9. File toccati

| File | Intervento |
|---|---|
| `components/LettoreLezione.tsx` | Contenitore + toggle `Leggi/Ascolta` + ramo `ScenaBlocco` |
| `components/ScenaBlocco.tsx` | **Nuovo**: scena, karaoke, font fluido, auto-scroll |
| `lib/voce/silenzio.ts` | **Nuovo**: `useVoceSilenziosa` (timer stimato, stessa `posizione`) |
| `lib/lettore/modalita.ts` | **Nuovo**: preferenze `modalita`/`audio` via `useSyncExternalStore` |
| `lib/dati/lezioni.ts` | `componiBlocco`, `paroleBlocco`, `segmentoKaraoke`, `conteggioParole`, `millisecondiStimati` |
| `lib/dati/studio.ts` | Nessuna modifica: `segnaCompletato` già adatto |

---

## 10. Come è stata implementata (differenze rispetto alla proposta)

Alcune scelte sono state semplificate in corso d'opera, senza cambiare
l'esperienza:

- **Nessuna modifica a `lib/voce/hook.tsx`.** La pausa nativa esiste già
  (`commutaPausa`), e il timer silenzioso è un hook separato con la stessa
  interfaccia. Il contratto della voce resta intatto.
- **Il timer silenzioso usa `requestAnimationFrame` + una `sessione`**, non un
  `setTimeout` per blocco: a fine blocco e inizio del successivo `attivo`
  resta `true` (React raggruppa gli aggiornamenti), quindi la dipendenza
  dell'animazione è un contatore di sessione, non il flag.
- **`posizione` unificata, con offset.** Il tap su una parola rilegge la coda
  del blocco: l'hook aggiunge l'offset, così il karaoke resta allineato al
  testo completo.
- **Il tap-parola riavvia la stringa dalla parola scelta** per entrambi i
  motori (la voce nativa parte dall'inizio della stringa ricevuta), senza
  dipendere da `start` del motore: comportamento unico e prevedibile.
- **L'autoplay non si spezza ai confini di capitolo**: `avviaPrimoBlocco`
  prosegue senza smontare la scena; l'effetto di smontaggio non dipende più
  dal capitolo.
- **Cambio velocità**: il timer si riavvia subito; la voce alza un flag e
  riparte in un effetto, quando `impostazioni.velocita` è già aggiornata
  (altrimenti `parla` userebbe la closure vecchia).

