// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { createRoot } from "react-dom/client";
import { Bibliotheque } from "./Bibliotheque";
import { Ecran } from "./Ecran";
import { poserAuPremierLancement } from "./classeurComplet";
import { Annonces, Questions, annoncer } from "./Fenetre";
import { classeurAOuvrir, type Classeur } from "./modele";
import { dansLApplication, listerClasseurs } from "./pont";
import "./styles.css";

const CLE_DERNIER = "classeur:dernier";
const lireDernier = (): string | null => { try { return localStorage.getItem(CLE_DERNIER); } catch { return null; } };

function Application() {
  const [classeurs, setClasseurs] = React.useState<Classeur[] | null>(null);
  const [ouvert, setOuvert] = React.useState<Classeur | null>(null);
  const ouvrir = React.useCallback((c: Classeur) => {
    try { localStorage.setItem(CLE_DERNIER, c.id); } catch { /* sans mémoire, le dernier modifié s'ouvrira */ }
    setOuvert(c);
  }, []);
  const recharger = React.useCallback(async () => {
    const liste = await listerClasseurs();
    setClasseurs(liste);
    return liste;
  }, []);
  React.useEffect(() => {
    // Au premier lancement, la liste attend le classeur complet (quelques secondes, le temps de recopier ses pictos).
    void (async () => {
      let liste = await listerClasseurs();
      try {
        if (await poserAuPremierLancement(liste)) liste = await listerClasseurs();
      } catch (e) {
        annoncer(`Le classeur complet n'a pas pu être posé : ${String((e as Error)?.message ?? e)}`);
      }
      setClasseurs(liste);
      // « En mode élève, par défaut, il y a le classeur qui se lance » (l'enseignant, 6 novembre 2026).
      const aOuvrir = dansLApplication() ? classeurAOuvrir(liste, lireDernier()) : null;
      if (aOuvrir) setOuvert(aOuvrir);
    })();
  }, []);
  return (
    <>
      {ouvert
        ? <Ecran key={ouvert.id} depart={ouvert} onFermer={() => { setOuvert(null); void recharger(); }} />
        : <Bibliotheque classeurs={classeurs} onOuvrir={ouvrir} onRecharger={async () => { await recharger(); }} />}
      <Questions />
      <Annonces />
    </>
  );
}

createRoot(document.getElementById("racine")!).render(<Application />);
