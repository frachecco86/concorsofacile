---
name: "ConcorsoFacile"
description: "App di apprendimento con contesto e voce — quiz concorsi letti ad alta voce"
colors:
  ink: "#1C1A17"
  cream: "#FDF9F3"
  brand: "#F2570B"
  brand-soft: "#FFE9DC"
  voce: "#0E8C86"
  voce-soft: "#DCF6F4"
  lilac: "#6E5BD8"
typography:
  display: "Fraunces, Georgia, serif"
  body: "Plus Jakarta Sans, system-ui, sans-serif"
---

# Design System: ConcorsoFacile

## 1. Overview

**Creative North Star: "Il Quaderno Vivo"**

ConcorsoFacile non è un portale burocratico né un videogioco. È il quaderno di studio di
qualcuno che ti sta accanto e ti legge la domanda ad alta voce, poi aspetta.

La palette è calda e luminosa: carta crema invece di bianco freddo, un
**arancione terracotta** come colore guida (energia, attenzione, incoraggiamento)
e un **teal** come secondo accento riservato alla voce — così "leggere" e
"ascoltare" si riconoscono a colpo d'occhio. Il testo è un near-black caldo,
mai nero puro.

## 2. Palette

| Ruolo | Token | Valore | Uso |
|---|---|---|---|
| Sfondo | `--color-cream` | `#FDF9F3` | Carta, sfondo app |
| Superficie | `--color-surface` | `#FFFFFF` | Card, pannelli |
| Testo | `--color-ink` | `#1C1A17` | Testi, titoli |
| Guida | `--color-brand-*` | `#F2570B` | Azioni primarie, progresso, accenti |
| Voce | `--color-voce-*` | `#0E8C86` | Tutto ciò che riguarda l'audio |
| Neutro | `--color-sand-*` | caldi | Bordi, superfici spente |

Regola: **l'arancione guida, il teal parla.** Se un elemento produce o controlla
audio, è teal. Mai il contrario.

## 3. Tipografia

- **Display (Fraunces)**: titoli, domande, numeri grandi. Optical size alto,
  `wght` variabile, `SOFT` per il calore.
- **Testo (Plus Jakarta Sans)**: UI, risposte, etichette.
- **Numeri/monospace**: Plus Jakarta Sans tabellare per statistiche e timer.

Le domande dei quiz si leggono a 20–28px con `line-height` 1.45: sono il
contenuto, devono dominare la pagina.

## 4. Forma e spazio

- Raggio: `--radius-card: 20px`, pill per i controlli (`9999px`).
- Ombre: morbide, colorate di caldo (`--shadow-lift`), mai grigie dure.
- Bordi: 1px `sand-200`, usati per separare senza chiudere.
- Spaziatura generosa: il contenuto respira, mai denso.

## 5. Movimento

`motion` (Framer) per micro-transizioni: comparsa della risposta, avanzamento
del progresso, pulse del pulsante voce durante la sintesi. Tutto disattivabile
con `prefers-reduced-motion`.

## 6. Principi

1. **Una cosa alla volta** — la sessione di studio mostra una domanda, mai due.
2. **Ascoltare è un diritto** — ogni testo leggibile ha il suo controllo voce
   accanto, non nascosto in un menu.
3. **Immediato** — zero loader bloccanti: il quiz è già nel DOM, la voce arriva
   quando è pronta.
4. **Caldo ma professionale** — colore per orientarsi, non per decorare.
