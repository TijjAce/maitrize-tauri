import React from "react";
import { useNavigate } from "react-router-dom";
import { api, type ProjetClasse } from "../api";
import { Select, ouvrirOnglet, useAsync } from "./ui";
import {
  aUnCorpus, choixDeProjets, corpusDe, ecritALaMain, lignesDuCorpus, projetParDefaut, resumeDuCorpus, texteDuCorpus,
  type ChoixProjet, type Corpus,
} from "../corpusProjet";

// ── Le projet du moment, dans Fabriquer ────────────────────────────────────
//
// Posé sur la semaine ou sur le mois où l'on est, le projet en cours se
// retrouve en tête de chaque atelier qui travaille sur des mots ou des
// phrases : c'est son corpus que les ateliers prennent. On peut en désigner
// un autre pour la séance de travail, ou aucun ; au prochain lancement, c'est
// de nouveau le calendrier qui décide.

export interface ProjetDuMoment {
  projet: ProjetClasse | null;
  corpus: Corpus;
  /** Les corpus de tous les projets de l'année : un texte qui en vient n'est pas de la main de l'enseignant. */
  corpusDesProjets: { mots: string[][]; phrases: string[][] };
  choix: ChoixProjet[];
  /** Désigner un projet pour la séance de travail ; « » pour aucun. */
  choisir: (id: string) => void;
}

const RIEN: ProjetDuMoment = {
  projet: null, corpus: { mots: [], phrases: [] }, corpusDesProjets: { mots: [], phrases: [] }, choix: [], choisir: () => {},
};
const Contexte = React.createContext<ProjetDuMoment>(RIEN);

export const useProjetDuMoment = () => React.useContext(Contexte);

/** Le choix fait pendant la séance de travail : null tant que le calendrier décide, « » pour aucun projet. */
let choixDeLaSession: string | null = null;

export function ProjetDuMomentProvider({ children }: { children: React.ReactNode }) {
  const { data } = useAsync(() => api.projetsList(), []);
  const [choisi, setChoisi] = React.useState<string | null>(choixDeLaSession);
  const choisir = React.useCallback((id: string) => { choixDeLaSession = id; setChoisi(id); }, []);
  const valeur = React.useMemo<ProjetDuMoment>(() => {
    const projets = data ?? [];
    const projet = choisi === null ? projetParDefaut(projets)
      : choisi === "" ? null
      : projets.find((p) => p.id === choisi) ?? projetParDefaut(projets);
    return {
      projet, corpus: corpusDe(projet), choix: choixDeProjets(projets), choisir,
      corpusDesProjets: { mots: projets.map((p) => corpusDe(p).mots), phrases: projets.map((p) => corpusDe(p).phrases) },
    };
  }, [data, choisi, choisir]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** Les ateliers qui travaillent sur des mots ou des phrases : les seuls où le projet a quelque chose à dire. */
export const ATELIERS_A_CORPUS: readonly string[] = [
  "jeux", "memory", "imagier", "etiquettes", "lotoSyllabes", "dominos", "intrus", "fluence", "tri", "phrases", "motsMeles",
];

/** En tête de l'atelier : le projet suivi, de quoi en changer, et le chemin vers son corpus. */
export function ProjetDuMomentBandeau({ atelier }: { atelier: string }) {
  const { projet, corpus, choix, choisir } = useProjetDuMoment();
  const navigate = useNavigate();
  if (!ATELIERS_A_CORPUS.includes(atelier) || !choix.length) return null;
  // La fiche du projet s'ouvre sur la page Projets, une fois celle-ci affichée.
  const ouvrir = () => {
    navigate("/projets");
    if (projet) setTimeout(() => ouvrirOnglet("projets", projet.id), 140);
  };
  return (
    <div className="comp-atelier projet-atelier" role="group" aria-label="Le projet du moment">
      <span className="options-feuille-titre">📌 Projet</span>
      <Select value={projet?.id ?? ""} onChange={(e) => choisir(e.target.value)} aria-label="Le projet dont les ateliers prennent le corpus">
        <option value="">— sans projet —</option>
        {choix.map(({ projet: p, duMoment }) => (
          <option key={p.id} value={p.id}>{p.titre || "Sans titre"}{duMoment ? " · en ce moment" : ""}</option>
        ))}
      </Select>
      {projet ? (
        <>
          <span className="meta">{resumeDuCorpus(corpus)}</span>
          <button type="button" className="btn ghost sm" onClick={ouvrir}>✎ {aUnCorpus(projet) ? "Le corpus" : "Écrire son corpus"}</button>
          <span className="meta projet-atelier-aide">
            {aUnCorpus(projet) ? "Ses mots et ses phrases sont proposés ici." : "Ses mots et ses phrases nourriront cet atelier."}
          </span>
        </>
      ) : (
        <span className="meta projet-atelier-aide">Les ateliers ne suivent aucun projet.</span>
      )}
    </div>
  );
}

/**
 * Le texte d'un atelier suit le projet du moment : tant que l'enseignant n'y
 * a rien écrit de sa main, la liste devient celle du projet dès qu'on ouvre
 * l'atelier, ou qu'on change de projet. `prendre` la reprend à la demande.
 */
export function useCorpusDuProjet(quoi: keyof Corpus, texte: string, exemple: string, appliquer: (texte: string) => void) {
  const { projet, corpus, corpusDesProjets } = useProjetDuMoment();
  const liste = corpus[quoi];
  const cible = texteDuCorpus(liste);
  const id = projet?.id ?? "";
  // Des références : l'effet ne repart qu'au changement de projet, pas à chaque lettre tapée.
  const etat = React.useRef({ texte, appliquer, autres: corpusDesProjets[quoi] });
  etat.current = { texte, appliquer, autres: corpusDesProjets[quoi] };
  React.useEffect(() => {
    if (!id || !cible) return;
    const { texte: actuel, appliquer: poser, autres } = etat.current;
    if (ecritALaMain(actuel, exemple, autres)) return;
    if (texteDuCorpus(lignesDuCorpus(actuel)) !== cible) poser(cible);
  }, [id, cible, exemple]);
  const dejaPris = texteDuCorpus(lignesDuCorpus(texte)) === cible;
  return { projet: liste.length ? projet : null, liste, dejaPris, prendre: () => appliquer(cible) };
}

/** Sous la liste d'un atelier : d'où viennent les entrées, et de quoi reprendre celles du projet. */
export function LigneDuProjet({ quoi, texte, exemple, appliquer }: {
  quoi: keyof Corpus; texte: string; exemple: string; appliquer: (texte: string) => void;
}) {
  const { projet, liste, dejaPris, prendre } = useCorpusDuProjet(quoi, texte, exemple, appliquer);
  if (!projet) return null;
  const nom = `${quoi === "mots" ? "mot" : "phrase"}${liste.length > 1 ? "s" : ""}`;
  return (
    <div className="projet-ligne">
      <span className="meta">
        📌 {dejaPris ? `Les ${liste.length} ${nom} du projet « ${projet.titre} ».` : `Le projet « ${projet.titre} » a ${liste.length} ${nom}.`}
      </span>
      {!dejaPris && <button type="button" className="btn ghost sm" onClick={prendre}>Les reprendre</button>}
    </div>
  );
}
