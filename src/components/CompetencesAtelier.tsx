import React from "react";
import { api, texteErreur } from "../api";
import { Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { CompetenceTree, type CompetenceSelectionnee } from "./CompetenceTree";
import {
  EVT_COMPETENCES_ATELIER, basculerCompetence, cleDesCompetences, ecrireCompetencesAtelier, lireCompetencesAtelier,
  memeCompetence,
} from "../ateliersCompetences";

// Ce que l'atelier travaille — dit par l'enseignant, pas deviné.
//
// On a d'abord essayé de le deviner par mots-clés : « addition » faisait
// remonter « poser et effectuer des additions en colonnes » pour un coloriage
// magique, où l'on ne pose aucune opération. Un moteur ne juge pas de cela.
//
// La liste se choisit donc dans l'arbre des référentiels, une fois, et se
// garde avec l'atelier — dans un réglage partagé entre les ordinateurs.

/** Les compétences choisies pour un atelier, tenues à jour d'où qu'elles changent, et de quoi les enregistrer. */
export function useCompetencesAtelier(atelier: string): [CompetenceSelectionnee[], (suite: CompetenceSelectionnee[]) => void] {
  const [liste, setListe] = React.useState<CompetenceSelectionnee[]>([]);
  const cle = cleDesCompetences(atelier);
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

export function CompetencesAtelier({ atelier, nom }: { atelier: string; nom: string }) {
  const [liste, enregistrer] = useCompetencesAtelier(atelier);
  const [ouvert, setOuvert] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");

  return (
    <details className="comp-atelier">
      <summary>
        🎯 Ce que cela travaille
        <span className="meta" style={{ fontWeight: 400, marginLeft: 8 }}>
          {liste.length
            ? `${liste.length} compétence${liste.length > 1 ? "s" : ""}`
            : "à choisir une fois"}
        </span>
      </summary>
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
          : "Aucune : dites une fois ce que cet atelier travaille chez vous, et cela restera."}
      </p>
      <button className="btn sm" onClick={() => setOuvert(true)}>
        🎯 {liste.length ? "Modifier" : "Choisir"} les compétences
      </button>

      {ouvert && (
        <Modal titre={`🎯 Ce que « ${nom} » travaille`} onClose={() => setOuvert(false)} large
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
