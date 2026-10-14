import React from "react";
import { api, texteErreur } from "../api";
import { EVT_DONNEES_DISTANTES, useAsync } from "./ui";
import { toast } from "./Toaster";
import {
  CLE_MINUTEURS_RETARD, MINUTEURS_DE_BASE, RECETTES, iconeDeLaRecette, lireMinuteursRetard, minuteurDeLaRecette, nomDeToutesLesFiches,
  rubriqueDeLaRecette,
} from "../fichesAutonomie";
import { dureeDuMinuteur, MINUTEURS_DES_TABLETTES } from "../journalTelephone";

// ── Réglages › En retard ───────────────────────────────────────────────────
//
// Le temps de chaque sorte de fiche. La fiche le reçoit quand « En retard » la
// fabrique ; le téléphone l'envoie ensuite aux tablettes avec sa consigne,
// depuis le créneau du cahier journal qui la cite. Un temps changé ici vaut
// pour les fiches à venir : celles déjà faites gardent le leur. Le réglage
// passe à l'autre ordinateur avec les autres.

const RUBRIQUES = ["Maternelle", "Mathématiques", "Français"] as const;

export function ReglagesEnRetard() {
  const [regles, setRegles] = React.useState<Record<string, number> | null>(null);
  const { data: telephone } = useAsync(() => api.telephoneEtat(), []);
  React.useEffect(() => {
    const lire = () => api.settingGet(CLE_MINUTEURS_RETARD).then((brut) => setRegles(lireMinuteursRetard(brut))).catch(() => setRegles({}));
    void lire();
    // Un temps changé sur l'autre ordinateur arrive avec la synchronisation.
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
  }, []);
  if (!regles) return null;

  const ecrire = async (suite: Record<string, number>) => {
    const avant = regles;
    setRegles(suite);
    try {
      await api.settingSet(CLE_MINUTEURS_RETARD, JSON.stringify(suite));
    } catch (e) {
      setRegles(avant);
      toast("Temps non enregistré : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    }
  };
  /** Seul ce qui s'écarte du temps de base se garde : un temps de base changé plus tard s'applique aux autres. */
  const changer = (id: string, minutes: number) => {
    const suite = { ...regles };
    if (minutes === MINUTEURS_DE_BASE[id]) delete suite[id]; else suite[id] = minutes;
    void ecrire(suite);
  };

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 720 }}>
      <h3 style={{ marginTop: 0 }}>⏰ Le temps de chaque fiche</h3>
      <p style={{ color: "var(--text-2)", marginTop: 6, fontSize: 13, lineHeight: 1.6 }}>
        Chaque fiche d'« En retard » reçoit ce temps quand elle est fabriquée. Depuis le créneau du cahier journal qui la cite,
        le téléphone l'envoie aux tablettes avec sa consigne, et le minuteur démarre aussitôt. Un temps changé ici vaut pour
        les fiches à venir ; celles déjà faites gardent le leur.
      </p>
      {telephone && !telephone.relie && (
        <p className="meta" style={{ fontSize: 12.5, marginTop: 0 }}>
          📱 Le téléphone n'est pas encore relié : ces temps serviront dès qu'il le sera (Réglages › Téléphone).
        </p>
      )}
      {RUBRIQUES.map((rubrique) => (
        <div key={rubrique} className="retard-reglages">
          <div className="retard-reglages-titre">{rubrique}</div>
          {RECETTES.filter((r) => rubriqueDeLaRecette(r) === rubrique).map((r) => {
            const nom = nomDeToutesLesFiches(r);
            const base = MINUTEURS_DE_BASE[r.id];
            return (
              <div key={r.id} className="retard-reglages-ligne">
                <span className="retard-reglages-nom">{iconeDeLaRecette(r)} {nom}</span>
                <span className="retard-reglages-niveaux">{r.niveaux.join(" · ")}</span>
                <select className="select" value={minuteurDeLaRecette(r.id, regles)} aria-label={`Le temps de « ${nom} »`}
                  onChange={(e) => changer(r.id, Number(e.target.value))}>
                  <option value={0}>sans minuteur</option>
                  {MINUTEURS_DES_TABLETTES.map((m) => <option key={m} value={m}>{dureeDuMinuteur(m)}{m === base ? " — de base" : ""}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      ))}
      {Object.keys(regles).length > 0 && (
        <button className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => { void ecrire({}); }}>↺ Remettre les temps de base</button>
      )}
    </div>
  );
}
