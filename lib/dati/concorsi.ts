/**
 * Concorsi pubblici reali, aperti in Italia.
 *
 * ATTENZIONE — natura di questi dati:
 * informazioni raccolte da fonti pubbliche (agenzie di informazione sui
 * concorsi) con data di riferimento **22 settembre 2026**. Non sono un
 * provvedimento ufficiale: prima di presentare domanda verificare sempre il
 * bando sull'ente titolare. Ogni concorso riporta `fonteUrl` e `verificatoIl`.
 *
 * Le materie sono quelle tipicamente previste per quel profilo: servono a
 * organizzare lo studio dentro l'app, non sostituiscono il programma d'esame
 * del bando.
 */

export interface MateriaConcorso {
  /** Nome mostrato. */
  nome: string;
  /** Collegamento a una materia del corpus quiz, se esiste (id in materie.json). */
  materiaId?: string;
  /** Numero di capitoli della mini-lezione, se già scritta. */
  capitoli?: number;
}

export interface Concorso {
  id: string;
  titolo: string;
  ente: string;
  posti: number | null;
  requisito: "licenza media" | "diploma" | "laurea" | "laurea magistrale" | "varie";
  area: string;
  /** Regioni coinvolte; vuoto = tutta Italia. */
  regioni: string[];
  /** Data di scadenza in formato ISO (YYYY-MM-DD). */
  scadenza: string | null;
  /** Riferimento temporale: "aperto" = domande aperte. */
  stato: "aperto" | "in apertura";
  retribuzione?: string;
  materie: MateriaConcorso[];
  fonteUrl?: string;
  verificatoIl: string;
}

/**
 * Come comportarsi quando una materia non ha ancora una lezione scritta.
 * La chiave è il nome normalizzato della materia.
 */
export const CONCORSI: Concorso[] = [
  {
    id: "asmel-2026",
    titolo: "Maxi concorso ASMEL 2026",
    ente: "ASMEL (Associazione per la sussidiarietà e la modernizzazione degli enti locali)",
    posti: null,
    requisito: "varie",
    area: "Enti locali",
    regioni: [],
    scadenza: "2026-09-30",
    stato: "aperto",
    retribuzione: "Secondo profilo e CCNL applicato",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Diritto costituzionale", materiaId: "032_cittadinanza-e-costituzione-educazione-civica" },
      { nome: "Ordinamento degli enti locali", materiaId: "046_contabilit-e-finanza-degli-enti-locali" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Logica", materiaId: "197_logica-formez" },
      { nome: "Informatica di base", materiaId: "175_informatica-di-base" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/concorso-asmel-2026-maxi-bando/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "ripam-coesione-sud-2026",
    titolo: "RIPAM Coesione Sud 2026 — Specialisti tecnici",
    ente: "Dipartimento della Funzione Pubblica / Formez",
    posti: 882,
    requisito: "laurea",
    area: "Tecnico",
    regioni: ["Basilicata", "Calabria", "Campania", "Molise", "Puglia", "Sardegna", "Sicilia"],
    scadenza: "2026-09-23",
    stato: "aperto",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Contratti pubblici e appalti", materiaId: "082_diritto-commerciale" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Programmazione dei fondi europei", materiaId: "096_diritto-dellunione-europea-politiche-di-coesione-e-fondi-strutturali" },
      { nome: "Logica", materiaId: "197_logica-formez" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/concorso-ripam-coesione-sud-2026-specialisti-tecnici-bando/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "pcm-assistenti-tecnologici-2026",
    titolo: "Assistenti di settore tecnologico",
    ente: "Presidenza del Consiglio dei Ministri",
    posti: 10,
    requisito: "diploma",
    area: "Tecnico",
    regioni: ["Lazio"],
    scadenza: "2026-09-23",
    stato: "aperto",
    materie: [
      { nome: "Informatica di base", materiaId: "175_informatica-di-base" },
      { nome: "Informatica avanzata", materiaId: "173_informatica-avanzata-programmazione-e-sviluppo-software" },
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Logica", materiaId: "197_logica-formez" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/presidenza-consiglio-ministri-concorso-diplomati-assistenti-settore-tecnologico/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "asrem-molise-infermieri-2026",
    titolo: "Infermieri a tempo indeterminato",
    ente: "ASREM — Azienda Sanitaria Regionale del Molise",
    posti: 16,
    requisito: "laurea",
    area: "Sanità",
    regioni: ["Molise"],
    scadenza: "2026-09-10",
    stato: "in apertura",
    materie: [
      { nome: "Scienze infermieristiche", materiaId: "204_logopedia" },
      { nome: "Anatomia e fisiologia umana", materiaId: "007_anatomia-e-fisiologia-umana" },
      { nome: "Farmacologia", materiaId: "142_farmacologia" },
      { nome: "Primo soccorso", materiaId: "266_primo-soccorso" },
      { nome: "Igiene e medicina preventiva", materiaId: "167_igiene" },
      { nome: "Legislazione sanitaria", materiaId: "247_ordinamento-ministero-dellinterno" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/asrem-molise-concorso-infermieri/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "arera-funzionari-2026",
    titolo: "Funzionari area tecnica ed economica",
    ente: "ARERA — Autorità di Regolazione per Energia Reti e Ambiente",
    posti: 10,
    requisito: "laurea magistrale",
    area: "Economico-finanziario",
    regioni: ["Lombardia"],
    scadenza: "2026-09-25",
    stato: "aperto",
    retribuzione: "Oltre 60.000 € lordi annui",
    materie: [
      { nome: "Economia politica", materiaId: "131_economia-pubblica" },
      { nome: "Economia aziendale", materiaId: "128_economia-aziendale" },
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Diritto dell'energia e regolazione", materiaId: "105_diritto-finanziario" },
      { nome: "Statistica", materiaId: "292_scienze-dellamministrazione" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/arera-concorso-10-laureati-economia-ingegneria-funzionari/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "regione-umbria-funzionari-2026",
    titolo: "Funzionari economico-finanziari",
    ente: "Regione Umbria — Giunta regionale",
    posti: 10,
    requisito: "laurea",
    area: "Economico-finanziario",
    regioni: ["Umbria"],
    scadenza: "2026-09-06",
    stato: "in apertura",
    materie: [
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Contabilità e finanza degli enti locali", materiaId: "046_contabilit-e-finanza-degli-enti-locali" },
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Economia pubblica", materiaId: "131_economia-pubblica" },
      { nome: "Diritto costituzionale", materiaId: "032_cittadinanza-e-costituzione-educazione-civica" },
      { nome: "Logica", materiaId: "197_logica-formez" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/regione-umbria-concorso-funzionari-laureati/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "asst-lecco-2026",
    titolo: "Infermieri e operatori tecnici specializzati",
    ente: "ASST di Lecco",
    posti: 101,
    requisito: "varie",
    area: "Sanità",
    regioni: ["Lombardia"],
    scadenza: "2026-09-24",
    stato: "aperto",
    materie: [
      { nome: "Scienze infermieristiche", materiaId: "204_logopedia" },
      { nome: "Anatomia e fisiologia umana", materiaId: "007_anatomia-e-fisiologia-umana" },
      { nome: "Primo soccorso", materiaId: "266_primo-soccorso" },
      { nome: "Igiene e medicina preventiva", materiaId: "167_igiene" },
      { nome: "Farmacologia", materiaId: "142_farmacologia" },
      { nome: "Legislazione sanitaria", materiaId: "247_ordinamento-ministero-dellinterno" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/asst-lecco-concorsi-infermieri-operatori-tempo-indeterminato/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "comune-milano-tecnici-2026",
    titolo: "Istruttori direttivi dei servizi tecnici",
    ente: "Comune di Milano",
    posti: 16,
    requisito: "laurea",
    area: "Tecnico",
    regioni: ["Lombardia"],
    scadenza: "2026-09-15",
    stato: "in apertura",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Ordinamento degli enti locali", materiaId: "046_contabilit-e-finanza-degli-enti-locali" },
      { nome: "Edilizia e urbanistica", materiaId: "164_idraulica" },
      { nome: "Contratti pubblici e appalti", materiaId: "082_diritto-commerciale" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Logica", materiaId: "197_logica-formez" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/comune-milano-concorso-istruttori-direttivi-servizi-tecnici/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "regione-emilia-istruttori-2026",
    titolo: "Istruttori giuridico-amministrativi",
    ente: "Regione Emilia-Romagna",
    posti: 16,
    requisito: "diploma",
    area: "Amministrativo",
    regioni: ["Emilia-Romagna"],
    scadenza: "2026-09-10",
    stato: "in apertura",
    retribuzione: "Oltre 23.000 € lordi annui",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Diritto costituzionale", materiaId: "032_cittadinanza-e-costituzione-educazione-civica" },
      { nome: "Contratti pubblici e appalti", materiaId: "082_diritto-commerciale" },
      { nome: "Ordinamento degli enti locali", materiaId: "046_contabilit-e-finanza-degli-enti-locali" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Logica", materiaId: "197_logica-formez" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/regione-emilia-romagna-concorso-diplomati-istruttori-giuridico-amministrativi/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "ingv-collaboratori-2026",
    titolo: "Collaboratori tecnici e amministrativi",
    ente: "INGV — Istituto Nazionale di Geofisica e Vulcanologia",
    posti: null,
    requisito: "diploma",
    area: "Amministrativo",
    regioni: ["Lazio"],
    scadenza: "2026-09-07",
    stato: "in apertura",
    retribuzione: "Fino a 27.000 € lordi annui",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Informatica di base", materiaId: "175_informatica-di-base" },
      { nome: "Logica", materiaId: "197_logica-formez" },
      { nome: "Lingua inglese", materiaId: "180_inglese-b2" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/ingv-concorsi-diplomati-roma-assunzioni-tempo-indeterminato/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "comune-trieste-geometri-2026",
    titolo: "Istruttori tecnico-manutentivi (geometri)",
    ente: "Comune di Trieste",
    posti: 12,
    requisito: "diploma",
    area: "Tecnico",
    regioni: ["Friuli-Venezia Giulia"],
    scadenza: "2026-09-09",
    stato: "in apertura",
    materie: [
      { nome: "Edilizia e urbanistica", materiaId: "164_idraulica" },
      { nome: "Topografia e cartografia", materiaId: "025_cartografia" },
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Contratti pubblici e appalti", materiaId: "082_diritto-commerciale" },
      { nome: "Logica", materiaId: "197_logica-formez" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/concorso-comune-trieste-assunzioni-istruttori-tecnico-manutentivi-geometri-periti-edili/",
    verificatoIl: "2026-09-22",
  },
  {
    id: "comune-cremona-2026",
    titolo: "Diplomati e laureati (tecnico, amministrativo, polizia locale)",
    ente: "Comune di Cremona",
    posti: 13,
    requisito: "varie",
    area: "Enti locali",
    regioni: ["Lombardia"],
    scadenza: "2026-09-21",
    stato: "aperto",
    materie: [
      { nome: "Diritto amministrativo", materiaId: "071_diritto-amministrativo-nozioni-iniziali" },
      { nome: "Ordinamento degli enti locali", materiaId: "046_contabilit-e-finanza-degli-enti-locali" },
      { nome: "Contabilità pubblica", materiaId: "045_contabilit-di-stato" },
      { nome: "Codice della strada", materiaId: "034_codice-della-strada" },
      { nome: "Compiti e funzioni della Polizia Municipale", materiaId: "039_compiti-e-funzioni-della-polizia-municipale" },
      { nome: "Logica", materiaId: "197_logica-formez" },
    ],
    fonteUrl: "https://www.ticonsiglio.com/comune-cremona-concorsi-diplomati-laureati/",
    verificatoIl: "2026-09-22",
  },
];

/** Conteggi derivati, utili alla home. */
export function statisticheConcorsi(concorsi: Concorso[] = CONCORSI) {
  const materieUniche = new Set<string>();
  let postiTotali = 0;
  let postiNoti = 0;

  for (const c of concorsi) {
    for (const m of c.materie) materieUniche.add(m.nome);
    if (typeof c.posti === "number") {
      postiTotali += c.posti;
      postiNoti++;
    }
  }

  return {
    concorsi: concorsi.length,
    postiTotali,
    /** Quanti concorsi dichiarano un numero di posti (gli altri sono "elenchi"). */
    concorsiConPosti: postiNoti,
    materieUniche: materieUniche.size,
  };
}

/** Quanti giorni mancano alla scadenza (negativo = scaduto). */
export function giorniAllaScadenza(scadenza: string | null, oggi = new Date()): number | null {
  if (!scadenza) return null;
  const fine = new Date(`${scadenza}T23:59:59`);
  return Math.ceil((fine.getTime() - oggi.getTime()) / 86_400_000);
}

/** Data in formato italiano, senza dipendenze. */
export function dataIt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Categoria di appartenenza dell'ente, per la navigazione del drawer (§1B).
 *
 * Le aree del corpus sono 5 e non combaciano con le 3 voci di menu richieste
 * dalle direttive. Qui deriviamo la categoria dall'ente e dall'area, in modo
 * che ogni concorso finisca in **una sola** voce e nessuno resti fuori: una
 * navigazione che perde pezzi è peggio di una imprecisa.
 */
export type CategoriaEnte = "nazionali" | "enti-locali" | "sanita-istruzione";

const ENTI_NAZIONALI = /minister|presidenza|funzione pubblica|formez|ripam|agenzia|inps|inail|istat|banca d'italia|corte dei conti|consiglio di stato/i;
const ENTI_LOCALI = /comune|provincia|regione|asmel|città metropolitana|unione dei comuni/i;

export function categoriaEnte(c: Concorso): CategoriaEnte {
  if (c.area === "Sanità") return "sanita-istruzione";
  if (c.area === "Enti locali") return "enti-locali";
  if (ENTI_LOCALI.test(c.ente)) return "enti-locali";
  if (ENTI_NAZIONALI.test(c.ente) || c.area === "Amministrativo") return "nazionali";
  // Resto (tecnico, economico-finanziario): è quasi sempre amministrazione
  // centrale o di vigilanza, quindi la voce nazionale è la più utile.
  return "nazionali";
}

/**
 * Ordine di lettura dell'elenco: prima ciò che è ancora utile.
 *
 * Un concorso scaduto non sparisce — resta consultabile — ma non deve rubare
 * l'attenzione a chi ha ancora tempo per presentare domanda. A parità di
 * stato, vince la scadenza più vicina.
 */
export function ordinaConcorsi(concorsi: Concorso[] = CONCORSI): Concorso[] {
  return [...concorsi].sort((a, b) => {
    const ga = giorniAllaScadenza(a.scadenza);
    const gb = giorniAllaScadenza(b.scadenza);
    const scadutoA = ga !== null && ga < 0;
    const scadutoB = gb !== null && gb < 0;
    if (scadutoA !== scadutoB) return scadutoA ? 1 : -1;
    return (ga ?? 9999) - (gb ?? 9999);
  });
}

/** Quanti concorsi non sono ancora scaduti. */
export function quantiAperti(concorsi: Concorso[] = CONCORSI): number {
  return concorsi.filter((c) => {
    const g = giorniAllaScadenza(c.scadenza);
    return g === null || g >= 0;
  }).length;
}

/** I concorsi da mettere in vetrina nel carosello: i più imminenti e capienti. */
export function concorsiInEvidenza(quanti = 6, concorsi: Concorso[] = CONCORSI): Concorso[] {
  return ordinaConcorsi(concorsi)
    .filter((c) => {
      const g = giorniAllaScadenza(c.scadenza);
      return g === null || g >= 0;
    })
    .slice(0, quanti);
}
