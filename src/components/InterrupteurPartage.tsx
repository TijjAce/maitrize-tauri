import React from "react";
import { type PortableInfo, texteErreur } from "../api";
import { toast } from "./Toaster";
import {
  EVT_PARTAGE, fermerPartage, lirePartage, ouvrirPartage, titreDuPartage,
} from "../partageWifi";

// L'interrupteur du partage WiFi, dans Réglages › Téléphone.
//
// Il a longtemps tenu dans la barre du haut de chaque page, quand on dictait
// par le WiFi. Les dictées passent maintenant par Nuage : le partage ne sert
// plus qu'à lire le planning dans le navigateur du téléphone, et l'interrupteur
// reste là où ce partage s'explique. Le voyant dit l'état sans qu'on ait à cliquer.

export function InterrupteurPartage() {
  const [info, setInfo] = React.useState<PortableInfo | null>(null);
  const [occupe, setOccupe] = React.useState(false);

  React.useEffect(() => { lirePartage().then(setInfo); }, []);

  // Les Réglages commandent le même partage : les deux écrans se suivent.
  React.useEffect(() => {
    const ecouter = (e: Event) => setInfo((e as CustomEvent<PortableInfo | null>).detail);
    window.addEventListener(EVT_PARTAGE, ecouter);
    return () => window.removeEventListener(EVT_PARTAGE, ecouter);
  }, []);

  const basculer = async () => {
    setOccupe(true);
    try {
      if (info) {
        await fermerPartage();
        toast("Partage fermé.", { icone: "📡" });
      } else {
        const ouvert = await ouvrirPartage();
        toast(`Partage ouvert sur ${ouvert.ip}:${ouvert.port}.`, { icone: "📡", duree: 5000 });
      }
    } catch (e) {
      toast("Partage impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setOccupe(false);
    }
  };

  return (
    <button className={`interrupteur${info ? " on" : ""}`} disabled={occupe}
      onClick={() => { void basculer(); }}
      title={titreDuPartage(info)}
      aria-pressed={!!info}
      aria-label={info ? "Fermer le partage WiFi" : "Ouvrir le partage WiFi"}>
      <span className="interrupteur-voyant" />
      📡 <span className="interrupteur-mot">Partage</span>
    </button>
  );
}
