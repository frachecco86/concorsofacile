"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GestoreVoce, MOTORI, type IdMotore } from "./gestore";
import type { StatoModello } from "./piper";
import {
  IMPOSTAZIONI_PREDEFINITE,
  scegliVoceMigliore,
  type ImpostazioniVoce,
  type OpzioneVoce,
  type StatoVoce,
} from "./tipi";

const CHIAVE_PREFERENZE = "concorsofacile.voce.preferenze.v2";

interface Preferenze {
  motore: IdMotore;
  impostazioni: ImpostazioniVoce;
}

interface ValoreVoce {
  /** Motori selezionabili, con descrizione. */
  motori: typeof MOTORI;
  motore: IdMotore;
  /** Nome leggibile del motore attivo. */
  motoreNome: string;
  /** Voci del motore attivo. */
  voci: OpzioneVoce[];
  /** `true` quando il dispositivo non ha voci: la voce neurale è indispensabile. */
  serveVoceNeurale: boolean;
  disponibile: boolean;
  impostazioni: ImpostazioniVoce;
  stato: StatoVoce;
  /** Stato del download del modello neurale, se in corso. */
  statoModello: StatoModello | null;
  testoInLettura: string | null;
  tagInLettura: string | null;
  posizione: number;
  cambiaMotore: (id: IdMotore) => void;
  aggiorna: (patch: Partial<ImpostazioniVoce>) => void;
  /** Scarica il modello neurale senza attendere una sintesi. */
  scaricaVoce: () => void;
  parla: (testo: string, tag?: string) => void;
  commuta: (testo: string, tag?: string) => void;
  ferma: () => void;
  commutaPausa: () => void;
}

const ContestoVoce = createContext<ValoreVoce | null>(null);

export function FornitoreVoce({ children }: { children: React.ReactNode }) {
  const gestoreRef = useRef<GestoreVoce | null>(null);
  const [pronto, setPronto] = useState(false);
  const [motore, setMotore] = useState<IdMotore>("dispositivo");
  const [voci, setVoci] = useState<OpzioneVoce[]>([]);
  const [serveVoceNeurale, setServeVoceNeurale] = useState(false);
  const [disponibile, setDisponibile] = useState(false);
  const [impostazioni, setImpostazioni] =
    useState<ImpostazioniVoce>(IMPOSTAZIONI_PREDEFINITE);
  const [stato, setStato] = useState<StatoVoce>("idle");
  const [statoModello, setStatoModello] = useState<StatoModello | null>(null);
  const [testoInLettura, setTestoInLettura] = useState<string | null>(null);
  const [tagInLettura, setTagInLettura] = useState<string | null>(null);
  const [posizione, setPosizione] = useState(0);

  // -------------------------------------------------------------- init
  useEffect(() => {
    let preferenze: Partial<Preferenze> = {};
    try {
      const raw =
        localStorage.getItem(CHIAVE_PREFERENZE) ??
        localStorage.getItem("concorsofacile.voce.preferenze");
      if (raw) preferenze = JSON.parse(raw);
    } catch {
      /* preferenze corrotte: si riparte dai valori predefiniti */
    }

    const gestore = new GestoreVoce(preferenze.motore ?? "dispositivo");
    gestoreRef.current = gestore;

    const inizializza = async () => {
      // 1. Il dispositivo ha voci? Se no, la voce neurale è l'unica strada.
      const senza = await gestore.dispositivoSenzaVoci();
      setServeVoceNeurale(senza);
      if (senza && MOTORI.some((m) => m.id === "neurale")) {
        gestore.seleziona("neurale");
      }

      setMotore(gestore.id);
      setDisponibile(gestore.corrente.disponibile());
      setPronto(true);

      // 2. Voci del motore scelto.
      const elenco = await gestore.voci();
      setVoci(elenco);

      // 3. Impostazioni: preferenze salvate, altrimenti la voce migliore.
      setImpostazioni((correnti) => {
        const base = { ...correnti, ...preferenze.impostazioni };
        if (!base.voceId && elenco.length > 0) {
          const migliore = scegliVoceMigliore(elenco);
          if (migliore) base.voceId = migliore.id;
        }
        return base;
      });
    };

    void inizializza();

    return () => gestore.chiudi();
  }, []);

  // -------------------------------------------------------- persistenza
  useEffect(() => {
    if (!pronto) return;
    try {
      localStorage.setItem(
        CHIAVE_PREFERENZE,
        JSON.stringify({ motore, impostazioni } satisfies Preferenze)
      );
    } catch {
      /* storage non disponibile (modalità privata) */
    }
  }, [motore, impostazioni, pronto]);

  // ------------------------------------------------------------ comandi
  const ferma = useCallback(() => {
    gestoreRef.current?.ferma();
    setStato("idle");
    setTestoInLettura(null);
    setTagInLettura(null);
    setPosizione(0);
  }, []);

  const parla = useCallback(
    (testo: string, tag?: string) => {
      const gestore = gestoreRef.current;
      if (!gestore || !testo.trim()) return;

      setTestoInLettura(testo);
      setTagInLettura(tag ?? testo);
      setPosizione(0);

      void gestore.parla(testo, impostazioni, {
        onInizio: () => setStato("speaking"),
        onFine: () => {
          setStato("idle");
          setTestoInLettura(null);
          setTagInLettura(null);
          setPosizione(0);
        },
        onParola: (i) => setPosizione(i),
        onErrore: () => setStato("idle"),
      });
    },
    [impostazioni]
  );

  const commuta = useCallback(
    (testo: string, tag?: string) => {
      const chiave = tag ?? testo;
      if (tagInLettura === chiave && (stato === "speaking" || stato === "paused")) {
        ferma();
      } else {
        parla(testo, tag);
      }
    },
    [tagInLettura, stato, ferma, parla]
  );

  const commutaPausa = useCallback(() => {
    const gestore = gestoreRef.current;
    if (!gestore) return;
    if (stato === "speaking") {
      gestore.pausa();
      setStato("paused");
    } else if (stato === "paused") {
      gestore.riprendi();
      setStato("speaking");
    }
  }, [stato]);

  /** Passa a un altro motore e ricarica l'elenco delle voci. */
  const cambiaMotore = useCallback((id: IdMotore) => {
    const gestore = gestoreRef.current;
    if (!gestore) return;
    gestore.seleziona(id);
    setMotore(id);
    setDisponibile(gestore.corrente.disponibile());
    setStato("idle");
    setTestoInLettura(null);
    setTagInLettura(null);
    void gestore.voci().then((elenco) => {
      setVoci(elenco);
      setImpostazioni((c) => {
        const valida = elenco.some((v) => v.id === c.voceId);
        if (valida) return c;
        const migliore = scegliVoceMigliore(elenco);
        return { ...c, voceId: migliore?.id ?? null };
      });
    });
  }, []);

  const scaricaVoce = useCallback(() => {
    const gestore = gestoreRef.current;
    if (!gestore) return;
    const voceId = impostazioni.voceId ?? "it_IT-paola-medium";
    void gestore.preparaNeurale(voceId, setStatoModello).catch(() => {
      // Lo stato d'errore (con la causa) è già impostato dal motore tramite
      // `onStato`: non serve duplicarlo qui.
    });
  }, [impostazioni.voceId]);

  const aggiorna = useCallback((patch: Partial<ImpostazioniVoce>) => {
    setImpostazioni((correnti) => ({ ...correnti, ...patch }));
  }, []);

  const motoreNome = useMemo(
    () => MOTORI.find((m) => m.id === motore)?.nome ?? "Voce del dispositivo",
    [motore]
  );

  const valore = useMemo<ValoreVoce>(
    () => ({
      motori: MOTORI,
      motore,
      motoreNome,
      voci,
      serveVoceNeurale,
      disponibile,
      impostazioni,
      stato,
      statoModello,
      testoInLettura,
      tagInLettura,
      posizione,
      cambiaMotore,
      aggiorna,
      scaricaVoce,
      parla,
      commuta,
      ferma,
      commutaPausa,
    }),
    [
      motore,
      motoreNome,
      voci,
      serveVoceNeurale,
      disponibile,
      impostazioni,
      stato,
      statoModello,
      testoInLettura,
      tagInLettura,
      posizione,
      cambiaMotore,
      aggiorna,
      scaricaVoce,
      parla,
      commuta,
      ferma,
      commutaPausa,
    ]
  );

  return <ContestoVoce.Provider value={valore}>{children}</ContestoVoce.Provider>;
}

export function useVoce(): ValoreVoce {
  const ctx = useContext(ContestoVoce);
  if (!ctx) throw new Error("useVoce deve essere usato dentro <FornitoreVoce>");
  return ctx;
}
