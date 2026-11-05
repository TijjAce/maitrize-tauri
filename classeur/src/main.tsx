import React from "react";
import { createRoot } from "react-dom/client";
import { Bibliotheque } from "./Bibliotheque";
import { Ecran } from "./Ecran";
import { poserAuPremierLancement } from "./classeurComplet";
import { Annonces, Questions, annoncer } from "./Fenetre";
import type { Classeur } from "./modele";
import { listerClasseurs } from "./pont";
import "./styles.css";

function Application() {
  const [classeurs, setClasseurs] = React.useState<Classeur[] | null>(null);
  const [ouvert, setOuvert] = React.useState<Classeur | null>(null);
  const recharger = React.useCallback(async () => { setClasseurs(await listerClasseurs()); }, []);
  React.useEffect(() => {
    // Au premier lancement, la liste attend le classeur complet (quelques secondes, le temps de recopier ses pictos).
    void (async () => {
      const deja = await listerClasseurs();
      try {
        if (await poserAuPremierLancement(deja)) {
          await recharger();
          return;
        }
      } catch (e) {
        annoncer(`Le classeur complet n'a pas pu être posé : ${String((e as Error)?.message ?? e)}`);
      }
      setClasseurs(deja);
    })();
  }, [recharger]);
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
