import React from "react";
import { createRoot } from "react-dom/client";
import { Bibliotheque } from "./Bibliotheque";
import { Ecran } from "./Ecran";
import { Annonces, Questions } from "./Fenetre";
import type { Classeur } from "./modele";
import { listerClasseurs } from "./pont";
import "./styles.css";

function Application() {
  const [classeurs, setClasseurs] = React.useState<Classeur[] | null>(null);
  const [ouvert, setOuvert] = React.useState<Classeur | null>(null);
  const recharger = React.useCallback(async () => { setClasseurs(await listerClasseurs()); }, []);
  React.useEffect(() => { void recharger(); }, [recharger]);
  return (
    <>
      {ouvert
        ? <Ecran key={ouvert.id} depart={ouvert} onFermer={() => { setOuvert(null); void recharger(); }} />
        : <Bibliotheque classeurs={classeurs} onOuvrir={setOuvert} onRecharger={recharger} />}
      <Questions />
      <Annonces />
    </>
  );
}

createRoot(document.getElementById("racine")!).render(<Application />);
