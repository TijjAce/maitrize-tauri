// La période du problème du jour, en séquence : une séance par semaine,
// reprise chaque jour, avec ses cartes et son matériel.
//
// Comme pour les collections : l'atelier fabrique le matériel, la séquence
// l'installe dans la durée. La démarche « probleme-du-jour-maternelle » (voir
// demarcheProblemeDuJour.ts) donne le déroulement de chaque jour ; chaque
// séance reçoit ce que sa semaine manipule — les objets, leurs images, des
// jetons, rien —, les problèmes de ses jours dans son déroulement, et ses
// feuilles : les cartes de la semaine, l'affiche et les étiquettes des
// boîtes à nombres la première, le matériel à découper quand les images
// remplacent les objets, la feuille de recherche quand on cherche sans
// manipuler, la grille d'observation à la fin. Comme toute séquence qui pose
// des problèmes, elle s'ouvre sur la séance de leurs mots.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Seance, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import { seancesDuCadre, type Demarche, type SeanceCadre } from "./demarches";
import { DEMARCHE_PROBLEME_DU_JOUR } from "./demarcheProblemeDuJour";
import type { PlanDesFeuilles } from "./feuillesDesSequences";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import { aideDesMots } from "./aidesDesSequences";
import { MATERIEL_DES_MOTS, avecLaSeanceDesMots, enoncesDuHtml, motsDesEnonces, nombreDeMots, noteDesMots } from "./motsDesProblemes";
import { competenceDuProgramme as competenceDuReferentiel } from "./sequenceCategoriser";
import { chargerVacances, periodeDuJour } from "./vacances";
import {
  REGLAGES_PROBLEME, STYLE_PROBLEME_DU_JOUR, autresSituations, htmlProblemeDuJour, idsDesImages, joursDe, maxParDefaut, modesDeLaPeriode, nomDeLaForme,
  problemesDeLaPeriode, reglagesSurs, situationDe, typeDe, typesDuNiveau,
  type Forme, type Images, type Mode, type Probleme, type ReglagesProbleme, type TypeDeProbleme,
} from "./problemeDuJour";

export const DEMARCHE_PROBLEME = DEMARCHE_PROBLEME_DU_JOUR.id;

/** L'atelier de Fabriquer qui refait les feuilles. */
export const ATELIER_PROBLEME_DU_JOUR = "problemeDuJour";

/** Les séances de la démarche, une par sorte de semaine. */
const SEANCE_DU_MODE: Record<Mode, number> = { objets: 0, images: 1, jetons: 2, tete: 3, contextes: 4 };

/** Une feuille de la période : la séance qui la reçoit (avant celle des mots), ce qu'elle imprime, la semaine de ses cartes. */
export interface FeuilleDeLaPeriode { seance: number; forme: Forme; semaine?: number; titre: string }

/** Les feuilles de la période, semaine après semaine. */
export function feuillesDeLaPeriode(r: ReglagesProbleme): FeuilleDeLaPeriode[] {
  const famille = typeDe(r.type).famille;
  const feuilles: FeuilleDeLaPeriode[] = [];
  let recherche = false;
  modesDeLaPeriode(r.semaines).forEach((mode, i) => {
    if (i === 0) feuilles.push({ seance: 0, forme: "affiche", titre: nomDeLaForme("affiche") });
    feuilles.push({ seance: i, forme: "cartes", semaine: i + 1, titre: `Les cartes du problème du jour — semaine ${i + 1}` });
    // Les boîtes à nombres rangent les quantités ; une piste se lit sur sa bande.
    if (i === 0 && famille !== "piste") feuilles.push({ seance: 0, forme: "etiquettes", titre: nomDeLaForme("etiquettes") });
    if (mode === "images") feuilles.push({ seance: i, forme: "materiel", titre: nomDeLaForme("materiel") });
    // On dessine pour chercher à partir de 4 ans.
    if (mode === "tete" && !recherche && r.niveau !== "PS") { recherche = true; feuilles.push({ seance: i, forme: "recherche", titre: nomDeLaForme("recherche") }); }
    if (mode === "contextes") feuilles.push({ seance: i, forme: "grille", titre: nomDeLaForme("grille") });
  });
  return feuilles;
}

/** Les réglages d'une feuille : ceux de l'atelier, sa forme, la semaine de ses cartes. */
export const reglagesDeLaFeuille = (r: ReglagesProbleme, f: FeuilleDeLaPeriode): ReglagesProbleme =>
  ({ ...r, forme: f.forme, semaine: f.semaine ?? 0 });

/** Le cadre de chaque semaine : la séance de la démarche, à son rang ; deux semaines sans manipuler sont numérotées. */
export function seancesDeLaPeriode(r: ReglagesProbleme): SeanceCadre[] {
  const modes = modesDeLaPeriode(r.semaines);
  return modes.map((mode, i) => {
    const base = DEMARCHE_PROBLEME_DU_JOUR.seances[SEANCE_DU_MODE[mode]];
    const meme = modes.filter((m) => m === mode).length > 1 ? ` (${modes.slice(0, i + 1).filter((m) => m === mode).length})` : "";
    return { ...base, titre: `Semaine ${i + 1} — ${base.titre}${meme}` };
  });
}

/** La démarche de la période, telle que la séquence la suivra : la séance des mots, puis une séance par semaine. */
export const demarcheDeLaPeriode = (r: ReglagesProbleme): Demarche =>
  avecLaSeanceDesMots({ ...DEMARCHE_PROBLEME_DU_JOUR, seances: seancesDeLaPeriode(r) });

/** Les problèmes de la semaine, pour le déroulement de sa séance : chaque jour, l'énoncé et sa réponse. */
export function deroulementDeLaSemaine(semaine: Probleme[], r: ReglagesProbleme): string {
  const jours = joursDe(r.jours);
  return [
    "Le problème du jour, chaque jour de la semaine (10 minutes) :",
    ...semaine.map((p) => `• ${jours[p.jour].charAt(0).toUpperCase()}${jours[p.jour].slice(1)} — ${p.enonce} (Réponse : ${p.reponse}.)`),
  ].join("\n");
}

/** Ce qu'il faut préparer pour une semaine : le matériel qu'elle manipule. */
export function materielDeLaSemaine(r: ReglagesProbleme, mode: Mode, premiere: boolean): string {
  const t = typeDe(r.type);
  const s = situationDe(r.situation, r.perso);
  const objets = s.objets.map((o) => o.plur).join(", ");
  const autres = autresSituations(r).map((a) => situationDe(a, r.perso).nom.toLowerCase()).join(", ");
  const debut = premiere ? "L'affiche du problème de référence au mur, près du coin des problèmes. " : "";
  if (t.famille === "piste") {
    return debut + {
      objets: `Une grande piste de 1 à ${r.max} tracée au sol, ou des cerceaux numérotés ; un dé.`,
      images: "La piste dessinée (le matériel à découper), un pion par élève, un dé.",
      jetons: "La bande numérique de la classe et une pince à linge.",
      tete: "La piste, à portée de main pour vérifier ; une feuille de recherche par élève.",
      contextes: `Une autre piste : ${autres}. La grille d'observation.`,
    }[mode];
  }
  if (t.famille === "groupes") {
    const qui = s.groupe ? s.groupe.plur : "";
    return debut + {
      objets: `Les ${qui} et les ${objets}, en vrai — figurines, boîtes, assiettes ; la réserve des ${objets} loin des tables.`,
      images: "Les images découpées des personnages et des objets (le matériel à découper).",
      jetons: "Des jetons pour les objets, des ronds dessinés pour les personnages.",
      tete: "Le matériel des semaines passées, pour vérifier ; une feuille de recherche par élève.",
      contextes: `Le matériel des autres situations : ${autres}. La grille d'observation.`,
    }[mode];
  }
  const lieu = s.lieuDit ?? "";
  return debut + {
    objets: `Les objets de la situation, en vrai : ${lieu ? `${lieu}, ` : ""}${objets} — assez pour ${r.max} ; de quoi cacher ce qu'on y met.${premiere ? " Les boîtes à nombres et leurs étiquettes." : ""}`,
    images: "Les images découpées (le matériel à découper), et une enveloppe ou une boîte pour les cacher.",
    jetons: "Des jetons ou des cubes, et une boîte qu'on ne voit pas à travers.",
    tete: "Le matériel des semaines passées, à portée de main pour vérifier ; une feuille de recherche par élève (à partir de 4 ans).",
    contextes: `Le matériel des autres situations : ${autres}. La grille d'observation.`,
  }[mode];
}

/** La sorte de problème qu'une compétence du programme appelle, à cet âge. */
const PAR_COMPETENCE: [RegExp, Partial<Record<Niveau, TypeDeProbleme>>][] = [
  [/ajout[ée]e ou retir[ée]e/i, { GS: "complement" }],
  [/[ée]cart entre/i, { GS: "comparaison" }],
  [/position finale|jeu de l.oie|piste/i, { MS: "piste", GS: "piste" }],
  [/partage/i, { MS: "partage", GS: "partage" }],
  [/groupement/i, { MS: "groupements", GS: "groupements" }],
  [/parties-tout/i, { PS: "ajout", MS: "ajoutRetrait", GS: "ajoutRetrait" }],
];

export function typePourLaCompetence(texte: string, niveau: Niveau): TypeDeProbleme {
  for (const [motif, types] of PAR_COMPETENCE) if (motif.test(texte) && types[niveau]) return types[niveau]!;
  return typesDuNiveau(niveau)[0].id;
}

/** Le niveau de maternelle d'une compétence, ou rien. */
export const niveauMaternelle = (niveau: string | null | undefined): Niveau | null => {
  const n = (niveau ?? "").trim().toUpperCase();
  return n === "PS" || n === "MS" || n === "GS" ? n : null;
};

/** Les réglages d'une période pour une compétence : sa sorte de problème, la situation de référence, les nombres de l'âge. */
export function reglagesPourLaCompetence(texte: string, niveau: Niveau): ReglagesProbleme {
  const type = typePourLaCompetence(texte, niveau);
  return reglagesSurs({ ...REGLAGES_PROBLEME, niveau, type, situation: typeDe(type).situations[0], max: maxParDefaut(niveau, type) });
}

/** Les images de toute la période : celles de chaque feuille. */
export const idsDeLaPeriode = (r: ReglagesProbleme): (number | string)[] =>
  [...new Set(feuillesDeLaPeriode(r).flatMap((f) => idsDesImages(reglagesDeLaFeuille(r, f))))];

/** Les feuilles de la période pour « Nouvelle séquence » : celles de chaque semaine, faites avec ses images. */
export function planDuProblemeDuJour(r: ReglagesProbleme, images: Images): PlanDesFeuilles {
  const graineDeLaPeriode = graineAuHasard();
  const modes = modesDeLaPeriode(r.semaines);
  return {
    // Toutes les feuilles tirent la même période : les cartes, l'affiche et la recherche parlent des mêmes problèmes.
    feuilles: feuillesDeLaPeriode(r).map((f) => ({
      seance: f.seance, atelier: ATELIER_PROBLEME_DU_JOUR, titre: f.titre,
      fabriquer: () => {
        const reglages = reglagesDeLaFeuille(r, f);
        return {
          html: htmlProblemeDuJour(reglages, images, hasard(graineDeLaPeriode)), style: STYLE_FEUILLE + STYLE_PROBLEME_DU_JOUR,
          refaire: { [ATELIER_PROBLEME_DU_JOUR]: reglages }, graine: graineDeLaPeriode,
        };
      },
    })),
    materiel: modes.map((m, i) => materielDeLaSemaine(r, m, i === 0)),
  };
}

/** Le titre proposé : « Le problème du jour : ajouter — la valise de la mascotte (MS) ». */
export const titreDeLaSequence = (r: ReglagesProbleme) =>
  `Le problème du jour : ${typeDe(r.type).court} — ${situationDe(r.situation, r.perso).nom.charAt(0).toLowerCase()}${situationDe(r.situation, r.perso).nom.slice(1)} (${r.niveau})`;

/** Ce que la séquence vise : la sorte de problème, la situation, la progression de la période. */
export function objectifsDeLaSequence(r: ReglagesProbleme): string {
  const t = typeDe(r.type);
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  return `Utiliser les nombres pour résoudre des problèmes : ${t.quoi.charAt(0).toLowerCase()}${t.quoi.slice(1)} `
    + `Pendant ${r.semaines} semaines, le problème du jour, quelques minutes chaque jour, dans une situation de référence — ${situationDe(r.situation, r.perso).nom.toLowerCase()} — : `
    + `avec les objets, puis leurs images${r.semaines >= 5 ? ", puis des jetons" : ""}, puis sans manipuler, enfin dans d'autres situations. ${r.niveau}, ${age} : des nombres jusqu'à ${r.max}.`;
}

/** La compétence du programme que sert cette sorte de problème, à cet âge, dans les référentiels actifs. */
export function competenceDuProgramme(referentiels: Referentiel[], r: Pick<ReglagesProbleme, "type" | "niveau">): CompetenceSelectionnee | null {
  const motif = typeDe(r.type).competence[r.niveau];
  return motif ? competenceDuReferentiel(referentiels, r.niveau, motif) : null;
}

/**
 * Crée la séquence de la période : la fiche, la séance des mots puis une
 * séance par semaine — son déroulement de chaque jour, ses problèmes, son
 * matériel —, enfin les feuilles dans leurs séances. Toutes tirent la même
 * période (`graine`), celle que l'atelier montrait. Rend la séquence créée,
 * et combien de feuilles y sont.
 */
export async function creerLaSequenceDuProblemeDuJour(
  r: ReglagesProbleme, titre: string, competences: CompetenceSelectionnee[], images: Images, graine: number,
): Promise<{ sequence: Sequence; seances: number; feuilles: number }> {
  const demarche = demarcheDeLaPeriode(r);
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Acquérir les premiers outils mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(r), matiere, cycle: "Cycle 1",
    objectifs: objectifsDeLaSequence(r), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(), niveau: r.niveau,
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const problemes = problemesDeLaPeriode(r, hasard(graine));
  const modes = modesDeLaPeriode(r.semaines);
  // Le matériel de la classe que la compétence appelle, comme pour une séquence créée depuis elle : chaque séance le rappelle.
  const noteReelle = await noteDuMaterielDesCompetences(competences, (cle) => api.settingGet(cle));
  // La séance des mots d'abord ; les semaines la suivent.
  const seances: Seance[] = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => {
    const semaine = i - 1;
    const commun = { ...s, competences: JSON.stringify(competences) };
    if (semaine < 0) return { ...commun, materiel: [MATERIEL_DES_MOTS, noteReelle].filter(Boolean).join("\n") };
    return {
      ...commun,
      deroulement: deroulementDeLaSemaine(problemes[semaine] ?? [], r),
      materiel: [materielDeLaSemaine(r, modes[semaine], semaine === 0), noteReelle].filter(Boolean).join("\n"),
    };
  });
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  const enonces: string[] = [];
  for (const f of feuillesDeLaPeriode(r)) {
    const seance = seances[f.seance + 1];
    if (!seance) continue;
    // Les réglages et le tirage vont avec la feuille : « Modifier dans Fabriquer » la refait ; la compétence de la séquence s'imprime en tête.
    const reglages = reglagesDeLaFeuille(r, f);
    const html = htmlProblemeDuJour(reglages, images, hasard(graine));
    enonces.push(...enoncesDuHtml(html));
    await poserDansUneSeance(ATELIER_PROBLEME_DU_JOUR, f.titre, html, STYLE_FEUILLE + STYLE_PROBLEME_DU_JOUR, seance.id, sequence.id,
      { competences: vise ? [vise] : undefined, fabrication: { memoires: { [ATELIER_PROBLEME_DU_JOUR]: reglages }, graine } });
    posees++;
  }
  // Les mots des problèmes, relevés dans les énoncés de la période : dans le matériel de la première séance, et sur leur feuille.
  const mots = motsDesEnonces(enonces);
  if (nombreDeMots(mots) && seances[0]) {
    await api.seanceSave({ ...seances[0], materiel: [seances[0].materiel, noteDesMots(mots)].filter(Boolean).join("\n") });
    const aide = aideDesMots(0, mots);
    try {
      const sortie = await aide.fabriquer();
      await poserDansUneSeance(aide.atelier, aide.titre, sortie.html, sortie.style, seances[0].id, sequence.id,
        { competences: vise ? [vise] : undefined, fabrication: { memoires: sortie.refaire } });
      posees++;
    } catch { /* la séance garde la liste de ses mots dans son matériel */ }
  }
  return { sequence, seances: seances.length, feuilles: posees };
}
