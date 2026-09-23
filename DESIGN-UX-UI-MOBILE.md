# Ux ui Mobile

## DIRETTIVE UX/UI E FRONTEND: PLATFORM PREPARAZIONE CONCORSI PUBBLICI (MOBILE-FIRST)
Agisci come Senior UX/UI Designer e Mobile Frontend Engineer. Devi progettare l'interfaccia utente dell'applicazione con una filosofia **Mobile-First nativa**, sia che l'utente acceda da Web mobile (PWA) sia dalle app iOS/Android (Capacitor/React Native). La piattaforma è dedicata alla **preparazione rapida ai concorsi pubblici italiani** tramite **Slide/Schemi sintetici + Voiceover audio sincronizzato**.
Tutti i componenti, le altezze dei pulsanti (minimo `48px` per area di tap), i font e le navigazioni devono essere ottimizzati primariamente per lo **schermo verticale dello smartphone** e l'uso a una mano (zona del pollice).

---

### 1. STRUTTURA DI NAVIGAZIONE MOBILE-FIRST
Anziché la classica navigazione orizzontale da desktop, la navigazione è totalmente incentrata su mobile:

#### A. Top Bar (Header Minimalista)
- **Altezza:** `56px` fisso in alto, con effetto `backdrop-blur` ed eventuale estensione per la Safe Area di iOS/Android.
- **Sinistra:** **Hamburger Menu (tre linee / drawer button)**. Facendo tap si apre un drawer laterale fluido con transizione da sinistra.
- **Centro:** Logo minimale / Nome App.
- **Destra:** Tasto Cerca (icona lente di ingrandimento per ricerca rapida `CMD+K`) oppure Foto Profilo / Tasto Accedi.

#### B. Hamburger Drawer (Menu Laterale a comparsa)
Il menu a scomparsa (sliding drawer da sinistra) contiene:
- **Intestazione:** Profilo utente (se loggato) o CTA rapida *"Accedi / Registrati"*.
- **Voci di Navigazione Principali:**
  - 🔍 *Tutti i Concorsi*
  - 🏛️ *Ministeri & Enti Nazionali*
  - 🏙️ *Comuni, Regioni & Enti Locali*
  - 🏥 *Sanità & Istruzione*
  - 💡 *Come funziona il Metodo*
  - 💳 *Piani & Abbonamenti*
- **Footer del Drawer:** Toggle rapido *Modalità Notte (Dark/Light)*, Link Assistenza / WhatsApp Support, e versione dell'App.

#### C. Bottom Navigation Bar (Fissa in Basso su Mobile)
Posizionata fisicamente nella zona più comoda per il pollice (Thumb Zone):
- 🏠 **Home:** Dashboard del concorso attivo e ripresa rapida studio.
- 📚 **Materie:** Elenco moduli, schemi e programma del bando.
- 🎧 **Ascolta:** Ritorno/Accesso immediato all'audio-lezione in corso.
- 📝 **Quiz:** Batteria di test e verifiche veloci per argomento.

---

### 2. HOMEPAGE MOBILE-FIRST

#### A. Vista Ospite / Landing Page
1. **Hero Section (Vertical Layout):**
  - *Headline compattata:* "Prepara il tuo concorso pubblico dallo smartphone".
  - *Sub-headline:* Schemi essenziali + Audio lezioni da ascoltare in auto, metro o palestra.
  - *Primary CTA Full-Width:* Pulsante a tutto schermo "Scegli il tuo Concorso".
  - *Interactive Audio-Slide Widget:* Mini-card dimostrativa con un pulsante Play gigante per ascoltare subito un'anteprima di Diritto Amministrativo.
1. **Carousel Orizzontale dei Concorsi in Evidenza:**
  - Schede dei concorsi scorrevoli in orizzontale (swipeable carousel con touch snap).
  - Badge evidenti: *Bando Pubblicato*, *In Arrivo*, *Scadenza Imminente*.
1. **Punti di Forza (Vertical Stack):**
  - Card verticali grandi con icone touch per spiegare la modalità Guida/Podcast, la lettura veloce e i Quiz.

#### B. Vista Utente Autenticato (Dashboard Mobile)
- **Top Card "In Corso":** Banner riassuntivo in cima con progresso % sul concorso e tasto d'azione primario *"RIPRENDI LEZIONE"* (altezza 52px, colore d'accento).
- **Conteggio Giorni:** Micro-widget con i giorni mancanti alla prova del concorso.

---

### 3. INTERFACCIA LEZIONE & PLAYER AUDIO (DUPLICE MODALITÀ)
La pagina della lezione è ottimizzata per l'uso con lo smartphone.

#### A. Modalità Reader / Studio (Default Vertical Reader)
- **Layout:** Colonna unica a tutto schermo con margini laterali di `16px`.
- **Tipografia:** Font Sans-Serif (Inter / SF Pro) con dimensione minima `16px` e `line-height: 1.6` per evitare affaticamento visivo.
- **Tap-to-Seek:** Facendo tap su qualsiasi blocco/paragrafo della slide, l'audio salta direttamente a quel secondo.
- **Auto-Scroll & Un-lock:**
  - In *Play*, lo schermo scorre da solo mantenendo il blocco attivo al centro.
  - Se l'utente fa uno **swipe/scroll manuale**, l'auto-scroll si stacca in automatico per lasciar leggere in pace, mentre l'audio continua.
  - Sulla Floating Bar compare il tasto magnete *"📍 Torna all'audio"*.

#### B. Modalità Ascolto / Guida (Podcast / In Mobilità)
- **Attivazione:** Tasto 🎧 grande sulla Floating Bar.
- **Full-Screen Touch-Friendly:** Trasforma l'app in un player audio stile Spotify/Podcast.
- **Controlli Giganti:**
  - Tasto Play/Pausa al centro di almeno `72x72px`.
  - Tasti Avanti/Indietro 15s affiancati e ben distanziati per non fare tap errati.
  - Mostra **solo lo schema/slide sintetico principale** al centro dello schermo.
- **Gesture Mobile Native:**
  - Swipe a destra/sinistra per cambiare lezione.
  - Double-tap sullo schermo per Play/Pausa.
- **Integrazioni:** Utilizza `MediaSession API` (per comandi da schermo di blocco, smartwatch, cuffie, CarPlay/Android Auto) e mantiene lo schermo acceso (`Keep Screen Awake`).

#### C. Floating Audio Player (Barra Fluttuante Mobile)
- Posizionata **appena sopra la Bottom Navigation Bar** con effetto `backdrop-blur`.
- Design compatto: Titolo lezione a scorrimento, tasto Play/Pausa, selettore velocità (`1x`, `1.25x`, `1.5x`, `2x`) e tasto per la Modalità Ascolto.

---

### 4. CHECKPOINT QUIZ A FINE LEZIONE
- Al termine dello scroll della lezione, si attiva un widget a card singola con 3 quiz veloci.
- Opzioni di risposta grandi (pulsanti `min-height: 48px`) touch-friendly con risposta visiva immediata (Verde = Corretto, Rosso = Errato con spiegazione sintetica).

---

### 5. FOOTER MOBILE ACCORDION
Su mobile il footer non occupa spazio infinito in verticale, ma usa una struttura ad **Accordion (Sezioni Espandibili)**:
- **Logo e Tagline** in cima.
- **4 Sezioni Cliccabili (Accordion con freccetta **`**∨**`**):**
  1. *Piattaforma & Concorsi*
  1. *Risorse & Banche Dati*
  1. *Assistenza & Contatti*
  1. *Note Legali*
- **Bottom Bar:** P.IVA, Copyright e selettore rapido Dark/Light Mode.

---

### 6. DESIGN SYSTEM E LINGUAGGIO VISIVO MOBILE
- **Touch Targets:** Nessun elemento cliccabile ha un'area inferiore a `44x44px` (standard Apple/Google).
- **Colori:** Sfondo neutro rilassante `off-white` (`#F9F9FB`) o Dark Mode OLED profonda (`#000000` / `#0F0F11`). Colore d'accento ad alto contrasto per i pulsanti azionabili.
- **Performance:** Animazioni fluide a 60fps (usando CSS hardware-accelerated o Framer Motion) per l'apertura del Drawer e del Player Full-Screen.
