import React from "react";
import { useNavigate } from "react-router-dom";
import { api, MODELE_TACHES, type ProjetClasse } from "../api";
import { Select, ouvrirOnglet, useAsync } from "./ui";
import { useReglages } from "./useMemoire";
import {
  aUnCorpus, choixDeProjets, corpusDe, ecritALaMain, lignesDuCorpus, projetParDefaut, resumeDuCorpus, texteDuCorpus,
  type ChoixProjet, type Corpus,
} from "../corpusProjet";
import { preparerLeCorpus, reserverLaPreparation, type ServicesCorpus } from "../corpusAuto";
import { DEMANDE_CORPUS } from "../corpusIa";
import { EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { graineAuHasard } from "../hasard";
import { lireEtapes } from "../projets";

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
  /** Le projet dont le corpus se prépare en ce moment, s'il y en a un. */
  preparation: string;
}

const RIEN: ProjetDuMoment = {
  projet: null, corpus: { mots: [], phrases: [] }, corpusDesProjets: { mots: [], phrases: [] }, choix: [], choisir: () => {}, preparation: "",
};
const Contexte = React.createContext<ProjetDuMoment>(RIEN);

export const useProjetDuMoment = () => React.useContext(Contexte);

/** La banque locale, l'IA et les noms à masquer, tels que l'application les fournit à la préparation du corpus. */
export const servicesCorpus: ServicesCorpus = {
  banqueInstallee: () => api.arasaacEtat().then((e) => e.installee).catch(() => false),
  categories: () => api.arasaacCategories(),
  themesDesMots: (mots) => api.arasaacThemesDesMots(mots),
  selection: (themes) => api.arasaacSelection(themes, EXCLUES_PAR_DEFAUT, false, 0, 1),
  chercher: (mot) => api.arasaacChercher(mot, 40),
  chat: async (messages) => api.mistralChat(messages, await api.modeleActif(MODELE_TACHES)),
  noms: () => api.elevesList().then((l) => l.map((e) => e.nom)).catch(() => []),
};

/** Ce qu'on dit d'un projet à la préparation de son corpus. */
export const decrireLeProjet = (p: ProjetClasse) => ({
  titre: p.titre, descriptif: p.descriptif, domaines: p.domaines, etapes: lireEtapes(p.etapesJson).map((e) => e.texte),
});

/** Le choix fait pendant la séance de travail : null tant que le calendrier décide, « » pour aucun projet. */
let choixDeLaSession: string | null = null;

export function ProjetDuMomentProvider({ children }: { children: React.ReactNode }) {
  const { data, reload } = useAsync(() => api.projetsList(), []);
  const [choisi, setChoisi] = React.useState<string | null>(choixDeLaSession);
  const choisir = React.useCallback((id: string) => { choixDeLaSession = id; setChoisi(id); }, []);
  const projet = React.useMemo(() => {
    const projets = data ?? [];
    return choisi === null ? projetParDefaut(projets)
      : choisi === "" ? null
      : projets.find((p) => p.id === choisi) ?? projetParDefaut(projets);
  }, [data, choisi]);

  // Le projet suivi n'a pas de corpus : il se prépare sans qu'on ait à le
  // demander — une fois —, et les ateliers le prennent dès qu'il est là.
  const [demande] = useReglages("corpusIa", DEMANDE_CORPUS);
  const [preparation, setPreparation] = React.useState("");
  const courant = React.useRef({ data, reload, demande });
  courant.current = { data, reload, demande };
  const id = projet?.id ?? "";
  const titre = projet?.titre ?? "";
  React.useEffect(() => {
    if (!projet || !reserverLaPreparation(projet.id, projet.titre, !aUnCorpus(projet))) return;
    let vivant = true;
    setPreparation(projet.id);
    preparerLeCorpus(decrireLeProjet(projet), courant.current.demande, servicesCorpus, graineAuHasard())
      .then(async (r) => {
        if (!r.mots.length && !r.phrases.length) return;
        // Le projet tel qu'il est maintenant : un corpus écrit entre-temps ne s'écrase pas.
        const actuel = (courant.current.data ?? []).find((p) => p.id === projet.id) ?? projet;
        if (aUnCorpus(actuel)) return;
        await api.projetSave({ ...actuel, mots: texteDuCorpus(r.mots), phrases: texteDuCorpus(r.phrases) });
        if (vivant) courant.current.reload();
      })
      .catch(() => {})
      .finally(() => { if (vivant) setPreparation(""); });
    return () => { vivant = false; };
  // Seul le projet suivi compte : ni ses relectures, ni les réglages de la demande.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, titre]);

  const valeur = React.useMemo<ProjetDuMoment>(() => {
    const projets = data ?? [];
    return {
      projet, corpus: corpusDe(projet), choix: choixDeProjets(projets), choisir, preparation,
      corpusDesProjets: { mots: projets.map((p) => corpusDe(p).mots), phrases: projets.map((p) => corpusDe(p).phrases) },
    };
  }, [data, projet, choisir, preparation]);
  return <Contexte.Provider value={valeur}>{children}</Contexte.Provider>;
}

/** Les ateliers qui travaillent sur des mots ou des phrases : les seuls où le projet a quelque chose à dire. */
export const ATELIERS_A_CORPUS: readonly string[] = [
  "jeux", "memory", "imagier", "etiquettes", "ombres", "lotoSyllabes", "dominos", "intrus", "fluence", "tri", "phrases", "motsMeles",
];

/** En tête de l'atelier : le projet suivi, de quoi en changer, et le chemin vers son corpus. */
export function ProjetDuMomentBandeau({ atelier }: { atelier: string }) {
  const { projet, corpus, choix, choisir, preparation } = useProjetDuMoment();
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
      {projet && preparation === projet.id ? (
        <span className="meta projet-atelier-aide">Son corpus se prépare : les mots dans la banque ARASAAC, les phrases par l'IA…</span>
      ) : projet ? (
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
