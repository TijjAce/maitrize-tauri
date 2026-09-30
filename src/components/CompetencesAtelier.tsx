import React from "react";
import { api, texteErreur } from "../api";
import { EVT_DONNEES_DISTANTES, Input, Modal, Select } from "./ui";
import { toast } from "./Toaster";
import { CompetenceTree, type CompetenceSelectionnee } from "./CompetenceTree";
import {
  EVT_COMPETENCES_ATELIER, basculerCompetence, cleDesCompetences, competencesParObjectif, ecrireCompetencesAtelier,
  lireCompetencesAtelier, memeCompetence, type ObjectifTravaille,
} from "../ateliersCompetences";

// Ce que l'atelier travaille — dit par l'enseignant, pas deviné.
//
// On a d'abord essayé de le deviner par mots-clés : « addition » faisait
// remonter « poser et effectuer des additions en colonnes » pour un coloriage
// magique, où l'on ne pose aucune opération. Un moteur ne juge pas de cela.
//
// La liste se choisit donc dans l'arbre des référentiels, une fois, et se
// garde avec l'atelier — dans un réglage partagé entre les ordinateurs.

/** Les compétences choisies pour un atelier — ou l'un de ses objectifs —, tenues à jour d'où qu'elles changent, et de quoi les enregistrer. */
export function useCompetencesAtelier(atelier: string, objectif?: string): [CompetenceSelectionnee[], (suite: CompetenceSelectionnee[]) => void] {
  const [liste, setListe] = React.useState<CompetenceSelectionnee[]>([]);
  const cle = cleDesCompetences(atelier, objectif);
  React.useEffect(() => {
    let vivant = true;
    const lire = () => {
      api.settingGet(cle)
        .then((v) => { if (vivant) setListe(lireCompetencesAtelier(v)); })
        .catch(() => { if (vivant) setListe([]); });
    };
    lire();
    window.addEventListener(EVT_COMPETENCES_ATELIER, lire);
    return () => { vivant = false; window.removeEventListener(EVT_COMPETENCES_ATELIER, lire); };
  }, [cle]);
  const enregistrer = React.useCallback((suite: CompetenceSelectionnee[]) => {
    setListe(suite);
    api.settingSet(cle, ecrireCompetencesAtelier(suite))
      .then(() => window.dispatchEvent(new Event(EVT_COMPETENCES_ATELIER)))
      .catch((e) => toast("Compétences non enregistrées : " + texteErreur(e), { icone: "⚠️" }));
  }, [cle]);
  return [liste, enregistrer];
}

/** Les compétences d'un atelier, objectif par objectif, tenues à jour d'où qu'elles changent. */
export function useCompetencesParObjectif(atelier: string): Record<string, CompetenceSelectionnee[]> {
  const [par, setPar] = React.useState<Record<string, CompetenceSelectionnee[]>>({});
  React.useEffect(() => {
    let vivant = true;
    const lire = () => { api.settingsAll().then((r) => { if (vivant) setPar(competencesParObjectif(r, atelier)); }).catch(() => {}); };
    lire();
    window.addEventListener(EVT_COMPETENCES_ATELIER, lire);
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => {
      vivant = false;
      window.removeEventListener(EVT_COMPETENCES_ATELIER, lire);
      window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
    };
  }, [atelier]);
  return par;
}

/**
 * Ce que l'atelier travaille. Quand il a des objectifs — le calcul mental,
 * une procédure à la fois —, c'est l'objectif retenu qu'on règle, et chacun
 * garde sa liste.
 */
export function CompetencesAtelier({ atelier, nom, objectifs = [] }: { atelier: string; nom: string; objectifs?: ObjectifTravaille[] }) {
  // L'objectif qu'on règle : le premier retenu, ou celui qu'on désigne quand il y en a plusieurs.
  const [designe, setDesigne] = React.useState("");
  const objectif = objectifs.find((o) => o.id === designe) ?? objectifs[0];
  const [liste, enregistrer] = useCompetencesAtelier(atelier, objectif?.id);
  const [ouvert, setOuvert] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");
  const quoi = objectif ? `${nom} — ${objectif.libelle}` : nom;

  return (
    <details className="comp-atelier">
      <summary>
        🎯 Ce que cela travaille
        <span className="meta" style={{ fontWeight: 400, marginLeft: 8 }}>
          {objectif ? `pour « ${objectif.libelle} » : ` : ""}
          {liste.length
            ? `${liste.length} compétence${liste.length > 1 ? "s" : ""}`
            : objectif ? "à choisir pour cet objectif" : "à choisir une fois"}
        </span>
      </summary>
      {objectifs.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "8px 0 2px", fontSize: 13 }}>
          <span className="meta">Pour l'objectif :</span>
          <Select value={objectif?.id ?? ""} onChange={(e) => setDesigne(e.target.value)} aria-label="L'objectif dont on règle les compétences" style={{ maxWidth: 360 }}>
            {objectifs.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
          </Select>
        </div>
      )}
      {liste.length > 0 && (
        <ul className="comp-atelier-liste">
          {liste.map((c) => (
            <li key={c.id}>
              {c.niveau && <span className="badge">{c.niveau}</span>}
              <span>{c.competenceTitre}</span>
              <span className="meta">{[c.referentielNom, c.domaineTitre].filter(Boolean).join(" › ")}</span>
              <button className="btn ghost sm" aria-label="Retirer"
                onClick={() => enregistrer(liste.filter((x) => !memeCompetence(x, c)))}>🗑</button>
            </li>
          ))}
        </ul>
      )}
      <p className="meta" style={{ fontSize: 12.5, margin: "10px 0 4px", lineHeight: 1.5 }}>
        {liste.length
          ? "Elles s'affichent ici pour être recopiées dans un cahier journal, ou retrouvées dans une programmation."
          : objectif
            ? "Aucune pour cet objectif : dites une fois ce qu'il travaille chez vous, et cela restera — chaque objectif garde les siennes."
            : "Aucune : dites une fois ce que cet atelier travaille chez vous, et cela restera."}
      </p>
      <button className="btn sm" onClick={() => setOuvert(true)}>
        🎯 {liste.length ? "Modifier" : "Choisir"} les compétences{objectif ? " de cet objectif" : ""}
      </button>

      {ouvert && (
        <Modal titre={`🎯 Ce que « ${quoi} » travaille`} onClose={() => setOuvert(false)} large
          footer={<button className="btn primary" onClick={() => setOuvert(false)}>Terminé</button>}>
          <Input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher une compétence (ex. : décoder, addition, se repérer…)"
            aria-label="Chercher une compétence" />
          <div style={{ maxHeight: "52vh", overflowY: "auto", marginTop: 8 }}>
            <CompetenceTree mode="multi" selection={liste} recherche={recherche}
              onToggle={(c) => enregistrer(basculerCompetence(liste, c))} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 6 }}>
            Cochez ce que cet atelier travaille réellement chez vous. C'est vous qui en jugez.
          </div>
        </Modal>
      )}
    </details>
  );
}
