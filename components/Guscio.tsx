"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { MateriaIndice } from "@/lib/dati/tipi";
import { Testata } from "./Testata";
import { Drawer } from "./Drawer";
import { BarraInferiore } from "./BarraInferiore";
import { PiePagina } from "./PiePagina";
import { Ricerca } from "./Ricerca";
import { PannelloVoce } from "./PannelloVoce";
import { FinestraVersioni } from "./FinestraVersioni";

/**
 * Guscio dell'applicazione: top bar, drawer, ricerca, barra inferiore, footer.
 *
 * Tiene qui lo stato dei quattro pannelli sovrapposti perché condiviso fra
 * barra e drawer — la versione si apre dal drawer, la ricerca dalla barra — e
 * così nessuno dei due deve conoscere gli altri.
 *
 * L'ordine nel DOM conta: il contenuto arriva prima della barra inferiore e
 * del footer, mentre i pannelli sovrapposti vengono dopo, così restano sopra
 * a tutto senza dover combattere con lo `z-index` del contenuto.
 */
export function Guscio({
  children,
  materie,
}: {
  children: React.ReactNode;
  materie: MateriaIndice[];
}) {
  const [drawerAperto, setDrawerAperto] = useState(false);
  const [ricercaAperta, setRicercaAperta] = useState(false);
  const [voceAperta, setVoceAperta] = useState(false);
  const [versioniAperte, setVersioniAperte] = useState(false);

  const chiudiDrawer = useCallback(() => setDrawerAperto(false), []);
  const apriDrawer = useCallback(() => setDrawerAperto(true), []);
  const apriRicerca = useCallback(() => setRicercaAperta(true), []);
  const chiudiRicerca = useCallback(() => setRicercaAperta(false), []);
  const apriVoce = useCallback(() => setVoceAperta(true), []);
  const apriVersioni = useCallback(() => setVersioniAperte(true), []);

  // Scorciatoia da tastiera: ⌘K / Ctrl+K, come nelle app di produttività.
  // Su mobile non serve, ma sui tablet con tastiera e su desktop sì.
  useEffect(() => {
    const onTasto = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRicercaAperta(true);
      }
    };
    window.addEventListener("keydown", onTasto);
    return () => window.removeEventListener("keydown", onTasto);
  }, []);

  return (
    <>
      <Testata
        onApriDrawer={apriDrawer}
        onApriRicerca={apriRicerca}
        onApriVoce={apriVoce}
      />

      {/*
        Spazio in fondo per la barra di navigazione fissa: se il contenuto
        finisse sotto, l'ultima riga sarebbe irraggiungibile.
      */}
      <div className="pb-barra-basso">
        {children}
        <PiePagina />
      </div>

      <BarraInferiore />

      <Drawer
        aperto={drawerAperto}
        onChiudi={chiudiDrawer}
        onApriVersioni={apriVersioni}
      />

      <AnimatePresence>
        {ricercaAperta && (
          <Ricerca aperto onChiudi={chiudiRicerca} materie={materie} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {voceAperta && <PannelloVoce onChiudi={() => setVoceAperta(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {versioniAperte && (
          <FinestraVersioni onChiudi={() => setVersioniAperte(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
