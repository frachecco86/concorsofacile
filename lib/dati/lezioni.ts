/**
 * Mini-lezioni: capitoli brevi, pensati per essere **ascoltati**.
 *
 * Struttura pensata per la voce: ogni capitolo è una sequenza di blocchi
 * autonomi. Un blocco = un'unità di senso che la sintesi può leggere senza
 * perdere il filo. Le frasi sono corte e la punteggiatura guida le pause.
 *
 * ATTENZIONE — questi contenuti sono **di esempio**, scritti a mano per
 * mostrare la forma che avranno le lezioni definitive. In produzione i
 * capitoli verranno derivati dai quiz del corpus e revisionati prima della
 * pubblicazione. Per ora coprono tutte le materie del concorso
 * "comune-cremona-2026".
 */

export type TipoBlocco =
  | { tipo: "paragrafo"; testo: string }
  | { tipo: "punti"; titolo?: string; voci: string[] }
  | { tipo: "definizione"; termine: string; testo: string }
  | { tipo: "nota"; testo: string }
  | { tipo: "esempio"; testo: string };

export interface Capitolo {
  numero: number;
  titolo: string;
  /** Minuti stimati di ascolto, calcolati sul testo (vedi `stimaMinuti`). */
  minuti: number;
  blocchi: TipoBlocco[];
}

export interface Lezione {
  /** Deve combaciare con `MateriaConcorso.nome`. */
  materia: string;
  /** Concorso a cui questa lezione fa riferimento. */
  concorsoId: string;
  sommario: string;
  capitoli: Capitolo[];
}

/**
 * Testo "piatto" di un blocco: è quello che viene letto dalla voce.
 * Funzione pura e condivisa da UI e motore TTS.
 */
export function testoBlocco(b: TipoBlocco): string {
  switch (b.tipo) {
    case "paragrafo":
      return b.testo;
    case "punti":
      return [b.titolo, ...b.voci.map((v) => `• ${v}`)].filter(Boolean).join(". ");
    case "definizione":
      return `${b.termine}. ${b.testo}`;
    case "nota":
      return `Nota. ${b.testo}`;
    case "esempio":
      return `Esempio. ${b.testo}`;
  }
}

/** Testo completo di un capitolo: è ciò che legge "Ascolta il capitolo". */
export function testoCapitolo(c: Capitolo): string {
  return [`Capitolo ${c.numero}. ${c.titolo}.`, ...c.blocchi.map(testoBlocco)].join(" ");
}

/**
 * Stima i minuti di lettura ad alta voce.
 * ~150 parole al minuto: ritmo naturale per un testo tecnico in italiano.
 */
export function stimaMinuti(blocchi: TipoBlocco[]): number {
  const parole = blocchi
    .map(testoBlocco)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round((parole / 150) * 10) / 10);
}

/** Le lezioni scritte finora. */
export const LEZIONI: Lezione[] = [
  {
    materia: "Diritto amministrativo",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Che cos'è il procedimento amministrativo, chi lo gestisce, quali sono i tempi e i diritti del cittadino.",
    capitoli: [
      {
        numero: 1,
        titolo: "La pubblica amministrazione e i suoi principi",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "La pubblica amministrazione è l'insieme degli organi e degli uffici che curano gli interessi della collettività. Non agisce per se stessa: agisce per legge.",
          },
          {
            tipo: "definizione",
            termine: "Principio di legalità",
            testo:
              "La pubblica amministrazione può fare solo ciò che la legge le consente. Il privato, al contrario, può fare tutto ciò che la legge non vieta.",
          },
          {
            tipo: "punti",
            titolo: "I principi fondamentali",
            voci: [
              "Legalità: l'attività amministrativa trova la sua base nella legge",
              "Imparzialità: l'amministrazione non può favorire né danneggiare nessuno",
              "Buon andamento: deve essere efficiente, economica ed efficace",
              "Trasparenza: chiunque può conoscere l'attività dell'amministrazione",
              "Responsabilità: ogni funzionario risponde del proprio operato",
            ],
          },
          {
            tipo: "nota",
            testo:
              "Imparzialità e buon andamento sono scritti nell'articolo 97 della Costituzione: sono i due pilastri dell'attività amministrativa.",
          },
        ],
      },
      {
        numero: 2,
        titolo: "Il procedimento amministrativo",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Il procedimento amministrativo è la sequenza di atti con cui l'amministrazione arriva a una decisione. La legge generale di riferimento è la legge 241 del 1990.",
          },
          {
            tipo: "punti",
            titolo: "Le fasi del procedimento",
            voci: [
              "L'iniziativa: il procedimento parte d'ufficio oppure su istanza di parte",
              "L'istruttoria: si raccolgono fatti, documenti e pareri necessari",
              "La decisione: l'amministrazione adotta il provvedimento finale",
              "L'integrazione dell'efficacia: controlli o comunicazioni che ne permettono gli effetti",
            ],
          },
          {
            tipo: "definizione",
            termine: "Responsabile del procedimento",
            testo:
              "È la persona fisica che cura il procedimento dall'inizio alla fine. Accerta i fatti, valuta i requisiti e risponde dei ritardi.",
          },
          {
            tipo: "nota",
            testo:
              "Il procedimento deve concludersi entro un termine certo. Dove la legge non lo fissa, il termine generale è di trenta giorni.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "La partecipazione del privato",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Chi è coinvolto da un procedimento ha il diritto di parteciparvi. Non è una concessione: è una garanzia prevista dalla legge.",
          },
          {
            tipo: "punti",
            titolo: "Cosa può fare il privato",
            voci: [
              "Prendere visione degli atti del procedimento",
              "Presentare memorie scritte e documenti",
              "Chiedere informazioni e chiarimenti al responsabile",
              "Ricevere la comunicazione di avvio del procedimento",
            ],
          },
          {
            tipo: "definizione",
            termine: "Preavviso di rigetto",
            testo:
              "Prima di respingere una domanda, l'amministrazione deve comunicare i motivi. Il privato ha dieci giorni per presentare osservazioni.",
          },
          {
            tipo: "esempio",
            testo:
              "Se il Comune intende negare una licenza edilizia, deve prima spiegare perché. Il richiedente può allora correggere o integrare la domanda.",
          },
        ],
      },
      {
        numero: 4,
        titolo: "Il silenzio e l'autotutela",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Quando l'amministrazione non risponde entro il termine, la legge dà un significato a quel silenzio.",
          },
          {
            tipo: "punti",
            titolo: "Le forme di silenzio",
            voci: [
              "Silenzio-assenso: in molti casi il silenzio equivale a un'accettazione",
              "Silenzio-inadempimento: l'amministrazione è semplicemente in ritardo e il privato può reagire",
              "Silenzio-diniego: il silenzio vale come rifiuto, solo dove la legge lo prevede",
            ],
          },
          {
            tipo: "definizione",
            termine: "Autotutela",
            testo:
              "È il potere dell'amministrazione di tornare sulle proprie decisioni. Annulla un atto illegittimo oppure lo revoca per un nuovo interesse pubblico.",
          },
          {
            tipo: "nota",
            testo:
              "L'annullamento d'ufficio richiede un interesse pubblico concreto, non basta un semplice ripensamento.",
          },
        ],
      },
    ],
  },

  {
    materia: "Ordinamento degli enti locali",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Comuni, Province e Città metropolitane: chi fa cosa, quali sono gli organi e come si formano le decisioni.",
    capitoli: [
      {
        numero: 1,
        titolo: "Il sistema degli enti locali",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "La Repubblica riconosce e promuove le autonomie locali. Comuni, Province e Città metropolitane sono enti autonomi con propri statuti, poteri e funzioni.",
          },
          {
            tipo: "definizione",
            termine: "Comune",
            testo:
              "È l'ente locale di base, più vicino al cittadino. Si occupa di servizi anagrafici, urbanistica, viabilità, scuole dell'infanzia, assistenza sociale e polizia locale.",
          },
          {
            tipo: "definizione",
            termine: "Provincia",
            testo:
              "È l'ente di area vasta. Si occupa di viabilità provinciale, edilizia scolastica, ambiente e trasporti. Non è eletta direttamente dai cittadini.",
          },
          {
            tipo: "definizione",
            termine: "Città metropolitana",
            testo:
              "Sostituisce la Provincia nei grandi agglomerati urbani. Ha funzioni di pianificazione strategica, mobilità e sviluppo economico del territorio.",
          },
          {
            tipo: "nota",
            testo:
              "Il testo di riferimento è il decreto legislativo 267 del 2000, chiamato Testo unico degli enti locali.",
          },
        ],
      },
      {
        numero: 2,
        titolo: "Gli organi del Comune",
        minuti: 0,
        blocchi: [
          {
            tipo: "punti",
            titolo: "Gli organi di governo",
            voci: [
              "Consiglio comunale: approva statuto, regolamenti, bilancio e piani",
              "Giunta comunale: collabora con il sindaco e attua gli indirizzi",
              "Sindaco: guida l'amministrazione, rappresenta l'ente, nomina la Giunta",
            ],
          },
          {
            tipo: "definizione",
            termine: "Consiglio comunale",
            testo:
              "È l'organo di indirizzo e di controllo politico-amministrativo. È eletto dai cittadini e approva gli atti fondamentali del Comune.",
          },
          {
            tipo: "definizione",
            termine: "Giunta comunale",
            testo:
              "È l'organo esecutivo. I suoi componenti sono gli assessori, nominati dal sindaco. Non ha competenze di indirizzo politico generale.",
          },
          {
            tipo: "paragrafo",
            testo:
              "Il sindaco nei Comuni fino a 15.000 abitanti può nominare assessori anche esterni al Consiglio. Nei Comuni più grandi vale la stessa regola: non serve essere consigliere.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "Le funzioni e i servizi",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Il Comune gestisce le funzioni amministrative che riguardano la popolazione e il territorio, secondo il principio di sussidiarietà.",
          },
          {
            tipo: "definizione",
            termine: "Sussidiarietà",
            testo:
              "Le funzioni vanno attribuite al livello di governo più vicino al cittadino. Si sale al livello superiore solo quando quello inferiore non è in grado di svolgerle.",
          },
          {
            tipo: "punti",
            titolo: "Funzioni tipiche del Comune",
            voci: [
              "Servizi demografici: anagrafe, stato civile, elettorale",
              "Pianificazione urbanistica ed edilizia privata",
              "Polizia locale e sicurezza urbana",
              "Servizi sociali e assistenza",
              "Scuola dell'infanzia e servizi educativi",
            ],
          },
        ],
      },
    ],
  },

  {
    materia: "Contabilità pubblica",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Come si costruisce e si gestisce il bilancio di un ente pubblico: entrate, spese, equilibri e controlli.",
    capitoli: [
      {
        numero: 1,
        titolo: "Il bilancio e i suoi principi",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Il bilancio è il documento con cui l'ente prevede le entrate e le spese per l'anno successivo. È approvato dal Consiglio prima dell'inizio dell'esercizio.",
          },
          {
            tipo: "punti",
            titolo: "I principi del bilancio",
            voci: [
              "Annualità: il bilancio copre un anno, dal 1 gennaio al 31 dicembre",
              "Unità: entrate e spese formano un unico complesso",
              "Universalità: tutte le entrate e le spese vanno iscritte, senza compensazioni",
              "Integrità: ogni voce è iscritta per l'intero importo",
              "Veridicità: le previsioni devono essere realistiche",
              "Pareggio: entrate e spese devono quadrare",
            ],
          },
          {
            tipo: "definizione",
            termine: "Equilibrio di bilancio",
            testo:
              "Il bilancio deve chiudersi in pareggio. Dal 2012 la Costituzione impone il pareggio tra entrate e spese, articolo 81.",
          },
        ],
      },
      {
        numero: 2,
        titolo: "Entrate e spese",
        minuti: 0,
        blocchi: [
          {
            tipo: "punti",
            titolo: "Le entrate",
            voci: [
              "Tributarie: imposte, tasse e tariffe come IMU e TARI",
              "Extratributarie: proventi da servizi pubblici e beni dell'ente",
              "Da trasferimenti: contributi dello Stato e della Regione",
              "In conto capitale: contributi per investimenti e alienazioni",
              "Da accensione di prestiti: mutui e altre forme di finanziamento",
            ],
          },
          {
            tipo: "punti",
            titolo: "Le spese",
            voci: [
              "Correnti: funzionamento dell'ente, personale, acquisto di beni e servizi",
              "In conto capitale: investimenti e opere pubbliche",
              "Per rimborso di prestiti: restituzione della quota capitale dei mutui",
            ],
          },
          {
            tipo: "nota",
            testo:
              "La spesa corrente non può essere finanziata con l'indebitamento. I mutui servono solo per gli investimenti: è una regola fondamentale di buona gestione.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "Il ciclo di gestione e i controlli",
        minuti: 0,
        blocchi: [
          {
            tipo: "punti",
            titolo: "Le fasi della spesa",
            voci: [
              "Impegno: l'ente si obbliga a pagare una somma",
              "Liquidazione: si verifica che la prestazione sia stata eseguita",
              "Ordinazione: si dispone il pagamento",
              "Pagamento: il tesoriere eroga materialmente la somma",
            ],
          },
          {
            tipo: "definizione",
            termine: "Peg e Pdo",
            testo:
              "Il Piano esecutivo di gestione assegna obiettivi e risorse ai dirigenti. Il Piano dettagliato degli obiettivi li articola in modo più fine.",
          },
          {
            tipo: "punti",
            titolo: "I controlli",
            voci: [
              "Controllo di regolarità amministrativa e contabile",
              "Controllo di gestione: verifica l'efficienza e l'efficacia dell'azione",
              "Controllo strategico: valuta il raggiungimento degli obiettivi politici",
              "Revisione economico-finanziaria: affidata all'organo di revisione",
            ],
          },
        ],
      },
    ],
  },

  {
    materia: "Codice della strada",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Le regole fondamentali della circolazione, i documenti di guida e le sanzioni più comuni.",
    capitoli: [
      {
        numero: 1,
        titolo: "Le regole di base della circolazione",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Il Codice della strada disciplina la circolazione di veicoli e pedoni. La sua finalità principale è la sicurezza di tutti gli utenti della strada.",
          },
          {
            tipo: "punti",
            titolo: "Principi generali",
            voci: [
              "I conducenti devono comportarsi in modo da non costituire pericolo o intralcio",
              "Devono mantenere il controllo del veicolo ed essere in grado di compiere ogni manovra necessaria",
              "La priorità va sempre rispettata secondo la segnaletica e le regole generali",
            ],
          },
          {
            tipo: "definizione",
            termine: "Precedenza a destra",
            testo:
              "Negli incroci senza segnaletica né semaforo, si deve dare la precedenza a chi proviene da destra. È la regola generale che vale in mancanza di indicazioni.",
          },
          {
            tipo: "esempio",
            testo:
              "In un incrocio a T senza segnali, chi arriva dal lato che si immette deve dare la precedenza alla strada principale solo se c'è un segnale. Altrimenti vale la regola della destra.",
          },
        ],
      },
      {
        numero: 2,
        titolo: "Documenti e requisiti per guidare",
        minuti: 0,
        blocchi: [
          {
            tipo: "punti",
            titolo: "Documenti necessari",
            voci: [
              "Patente di guida valida per la categoria del veicolo",
              "Carta di circolazione del veicolo",
              "Certificato di assicurazione obbligatoria RCA",
            ],
          },
          {
            tipo: "definizione",
            termine: "Punti della patente",
            testo:
              "La patente parte da 20 punti. Si perdono punti commettendo violazioni gravi e si riacquistano con corsi o dopo due anni senza infrazioni.",
          },
          {
            tipo: "nota",
            testo:
              "La guida sotto l'effetto di alcol o droghe comporta sanzioni molto severe: sospensione o revoca della patente, oltre a conseguenze penali.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "Sanzioni e comportamenti a rischio",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Le violazioni del Codice della strada si distinguono in amministrative e penali. La polizia locale accerta e contesta quelle amministrative.",
          },
          {
            tipo: "punti",
            titolo: "Sanzioni principali",
            voci: [
              "Verbale con sanzione pecuniaria",
              "Decurtazione dei punti dalla patente",
              "Sospensione o revoca della patente nei casi più gravi",
              "Fermo o sequestro amministrativo del veicolo",
            ],
          },
          {
            tipo: "nota",
            testo:
              "La sospensione breve della patente scatta quando si accumulano troppe violazioni gravi in un periodo limitato.",
          },
        ],
      },
    ],
  },

  {
    materia: "Compiti e funzioni della Polizia Municipale",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Chi è l'agente di Polizia Locale, cosa può fare, i suoi poteri e i doveri verso i cittadini.",
    capitoli: [
      {
        numero: 1,
        titolo: "La Polizia Locale e il suo ruolo",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "La Polizia Locale è un corpo di polizia del Comune. Dipende dal sindaco e opera per la sicurezza della comunità locale.",
          },
          {
            tipo: "definizione",
            termine: "Polizia Locale",
            testo:
              "È il servizio che il Comune organizza per svolgere le funzioni di polizia locale, come previsto dalla legge 65 del 1986 e dall'articolo 7 del Testo unico degli enti locali.",
          },
          {
            tipo: "punti",
            titolo: "Le funzioni principali",
            voci: [
              "Polizia stradale: vigila sul rispetto del Codice della strada",
              "Polizia amministrativa: controlla commercio, edilizia e occupazioni del suolo",
              "Polizia giudiziaria: collabora con l'autorità giudiziaria",
              "Polizia urbana: vigilanza sul territorio e decoro",
              "Sicurezza e soccorso: interviene in emergenze",
            ],
          },
        ],
      },
      {
        numero: 2,
        titolo: "I poteri e le qualifiche",
        minuti: 0,
        blocchi: [
          {
            tipo: "punti",
            titolo: "Le qualifiche degli agenti",
            voci: [
              "Agenti di polizia giudiziaria: possono ricevere denunce e compiere atti",
              "Agenti di polizia stradale: accertano le violazioni del Codice della strada",
              "Ufficiali di polizia giudiziaria: per il personale con qualifica superiore",
            ],
          },
          {
            tipo: "definizione",
            termine: "Verbale di accertamento",
            testo:
              "È l'atto con cui l'agente documenta una violazione. Fa piena prova fino a querela di falso delle dichiarazioni dei fatti compiute dal pubblico ufficiale.",
          },
          {
            tipo: "nota",
            testo:
              "Nei casi previsti dalla legge l'agente può elevare sanzioni, procedere a fermo e sequestro, e identificare le persone.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "Doveri e responsabilità dell'agente",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "L'agente di Polizia Locale è un pubblico ufficiale. Da questo derivano doveri precisi, oltre ai poteri.",
          },
          {
            tipo: "punti",
            titolo: "Doveri principali",
            voci: [
              "Rispettare la legge e i regolamenti nell'esercizio delle funzioni",
              "Mantenere un comportamento imparziale e corretto",
              "Prestare soccorso in caso di incidente o pericolo per le persone",
              "Non rivelare informazioni riservate apprese per ragioni di servizio",
            ],
          },
          {
            tipo: "definizione",
            termine: "Responsabilità disciplinare",
            testo:
              "L'agente risponde delle violazioni dei doveri d'ufficio davanti all'amministrazione, oltre alle eventuali responsabilità penali e civili.",
          },
        ],
      },
    ],
  },

  {
    materia: "Logica",
    concorsoId: "comune-cremona-2026",
    sommario:
      "Le abilità logiche richieste nei concorsi: deduzioni, serie, insiemi e attenzione alle trappole.",
    capitoli: [
      {
        numero: 1,
        titolo: "Sillogismi e deduzione",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "I quesiti logici chiedono di trarre conclusioni necessarie da premesse date. La conclusione è valida solo se deriva con certezza dalle premesse.",
          },
          {
            tipo: "definizione",
            termine: "Sillogismo",
            testo:
              "È un ragionamento formato da due premesse e una conclusione. Se le premesse sono vere e la forma è corretta, la conclusione è necessariamente vera.",
          },
          {
            tipo: "esempio",
            testo:
              "Tutti i funzionari sono laureati. Marco è un funzionario. Dunque Marco è laureato. La conclusione deriva con certezza dalle premesse.",
          },
          {
            tipo: "nota",
            testo:
              "La trappola più frequente è invertire la relazione: da 'tutti i funzionari sono laureati' non segue che 'tutti i laureati sono funzionari'.",
          },
        ],
      },
      {
        numero: 2,
        titolo: "Serie numeriche e successioni",
        minuti: 0,
        blocchi: [
          {
            tipo: "paragrafo",
            testo:
              "Nelle serie numeriche occorre scoprire la regola che lega i termini. La regola può essere una differenza, una moltiplicazione o un'alternanza.",
          },
          {
            tipo: "punti",
            titolo: "Regole che ricorrono più spesso",
            voci: [
              "Differenza costante: si somma o si sottrae sempre lo stesso numero",
              "Progressione geometrica: si moltiplica o si divide per un fattore",
              "Serie alternate: due successioni intrecciate, una ai posti pari e una ai dispari",
              "Somma dei precedenti: ogni termine è la somma dei due che lo precedono",
            ],
          },
          {
            tipo: "esempio",
            testo:
              "Nella serie 2, 4, 8, 16 il termine successivo è 32: ogni numero è il doppio del precedente.",
          },
        ],
      },
      {
        numero: 3,
        titolo: "Insiemi, condizioni e negazioni",
        minuti: 0,
        blocchi: [
          {
            tipo: "definizione",
            termine: "Condizione necessaria e sufficiente",
            testo:
              "Una condizione è necessaria se non può mancare. È sufficiente se basta da sola. 'Se e solo se' indica che è insieme necessaria e sufficiente.",
          },
          {
            tipo: "punti",
            titolo: "Come attaccare un quesito",
            voci: [
              "Leggere con attenzione le parole 'tutti', 'alcuni', 'nessuno'",
              "Tradurre in simboli le relazioni tra le grandezze",
              "Verificare ogni opzione invece di scegliere la prima che sembra giusta",
              "Controllare la negazione: 'non tutti' equivale ad 'almeno uno che non'",
            ],
          },
          {
            tipo: "nota",
            testo:
              "Negare 'tutti gli impiegati sono puntuali' non significa che nessuno lo sia, ma che almeno uno non lo è.",
          },
        ],
      },
    ],
  },
];

/**
 * Cerca la lezione di una materia.
 *
 * Le lezioni sono scritte per un concorso specifico: due concorsi possono
 * chiedere la stessa materia con programmi diversi, quindi il concorso fa
 * parte della chiave. Passando `concorsoId` la ricerca è precisa; senza, si
 * cerca in tutte le lezioni disponibili.
 */
export function trovaLezione(materia: string, concorsoId?: string): Lezione | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  const target = norm(materia);
  return LEZIONI.find(
    (l) => norm(l.materia) === target && (!concorsoId || l.concorsoId === concorsoId)
  );
}

/** Le lezioni di un concorso. */
export function lezioniDelConcorso(concorsoId: string): Lezione[] {
  return LEZIONI.filter((l) => l.concorsoId === concorsoId);
}

// Ricalcola i minuti dalle parole reali: così nessun valore scritto a mano
// può divergere dal testo effettivo.
for (const lezione of LEZIONI) {
  for (const capitolo of lezione.capitoli) {
    capitolo.minuti = stimaMinuti(capitolo.blocchi);
  }
}
