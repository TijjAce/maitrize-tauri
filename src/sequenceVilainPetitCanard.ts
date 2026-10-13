// Une séquence « Le Vilain Petit Canard », avec ses feuilles.
//
// Comme pour « Catégoriser les mots » : la démarche du guide (voir
// demarchesVilainPetitCanard.ts) donne les douze séances, chacune reçoit ses
// feuilles — celles des ateliers « Catégoriser les mots » et « Images
// séquentielles », et celles de l'atelier du Vilain Petit Canard — et la note
// du matériel à préparer, avec le matériel de la classe que ses compétences
// appellent (l'inventaire dit où il est rangé). Les feuilles portent en tête
// la compétence qu'elles travaillent — celle de la séquence, ou, pour les
// ateliers du prolongement, décomposer une quantité et le graphisme ;
// « Modifier dans Fabriquer » rouvre l'atelier qui les a faites.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import type { PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { DEMARCHE_VPC } from "./demarchesVilainPetitCanard";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import type { Images } from "./supportsVisuels";
import { chargerVacances, periodeDuJour } from "./vacances";
import { NIVEAUX_VPC, feuillesDeLaSequence, materielDesSeances, type NiveauVpc } from "./vilainPetitCanard";

/** Le niveau d'une démarche du Vilain Petit Canard ; rien pour une autre démarche. */
export const niveauDeLaDemarche = (id: string): NiveauVpc | null => (id === DEMARCHE_VPC.MS ? "MS" : id === DEMARCHE_VPC.GS ? "GS" : null);

/**
 * Les feuilles et le matériel de la séquence, pour la fiche d'une séquence
 * qu'on crée depuis sa compétence : les mêmes que depuis l'atelier, chacune
 * dans sa séance, avec ce qu'il faut pour la refaire dans son atelier. Les
 * images sont celles de la séquence (`IDS_VPC`), déjà chargées.
 */
export function planDuVilainPetitCanard(n: NiveauVpc, images: Images): PlanDesFeuilles {
  return {
    feuilles: feuillesDeLaSequence(n).map((f) => ({
      seance: f.seance, atelier: f.atelier, titre: f.titre,
      fabriquer: (graine: number) => {
        const { html, style, memoires } = f.fabriquer(images, hasard(graine));
        return { html, style: STYLE_FEUILLE + style, refaire: memoires };
      },
    })),
    materiel: materielDesSeances(n),
  };
}

/** Le titre proposé : « Le Vilain Petit Canard : les émotions et la naissance (MS) ». */
export const titreDeLaSequence = (n: NiveauVpc) =>
  `Le Vilain Petit Canard : ${n === "MS" ? "les émotions et la naissance" : "à la queue leu leu"} (${n})`;

/** Ce que la séquence vise, d'après les objectifs du guide. */
export function objectifsDeLaSequence(n: NiveauVpc): string {
  const age = NIVEAUX_VPC.find((x) => x.id === n)?.age ?? "";
  const vise = n === "MS"
    ? "comprendre et employer les mots qui disent les émotions, et les verbes qui retracent la naissance des poussins"
    : "comprendre et employer des expressions synonymes de « marcher à la queue leu leu »";
  return `Organiser les mots en réseaux de sens à partir de l'album Le Vilain Petit Canard (Attilio Cassinelli), pour se faire comprendre `
    + `dans un langage correct et précis. ${n}, ${age} : ${vise}.`;
}

/** Les compétences des ateliers du prolongement, prises dans les référentiels : décomposer une quantité, le graphisme. */
export interface CompetencesDesAteliers { maths?: CompetenceSelectionnee | null; graphisme?: CompetenceSelectionnee | null }

/** Ce qu'on cherche dans les référentiels pour les ateliers du prolongement, à cet âge. */
export const INTITULES_DES_ATELIERS = (n: NiveauVpc) => ({
  maths: /composer (et|ou) décomposer des nombres/i,
  graphisme: n === "GS" ? /réaliser une composition à partir de plusieurs contraintes/i : /reproduire et créer des motifs/i,
});

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Les images sont celles de
 * la séquence (`IDS_VPC`), déjà chargées. Rend la séquence créée, et combien
 * de feuilles y sont.
 */
export async function creerLaSequenceDuVilainPetitCanard(
  n: NiveauVpc, titre: string, competences: CompetenceSelectionnee[], images: Images, ateliers: CompetencesDesAteliers = {},
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_VPC[n]);
  if (!demarche) throw new Error("La démarche du Vilain Petit Canard est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Mobiliser le langage dans toutes ses dimensions";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || titreDeLaSequence(n), matiere, cycle: "Cycle 1",
    objectifs: objectifsDeLaSequence(n), competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(), niveau: n,
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  const feuilles = feuillesDeLaSequence(n);
  // La séance des ateliers vise leurs compétences, et rappelle le matériel qu'elles appellent — les jetons pour décomposer.
  const desAteliers = [ateliers.maths, ateliers.graphisme].filter((c): c is CompetenceSelectionnee => Boolean(c));
  const seanceDesAteliers = desAteliers.length ? feuilles.find((f) => f.competence)?.seance ?? -1 : -1;
  const lire = (cle: string) => api.settingGet(cle);
  const noteDeLaSequence = await noteDuMaterielDesCompetences(competences, lire);
  const noteDesAteliers = await noteDuMaterielDesCompetences(desAteliers, lire);
  const materiel = materielDesSeances(n);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => {
    const ateliersIci = i === seanceDesAteliers;
    return {
      ...s, competences: JSON.stringify(ateliersIci ? desAteliers : competences),
      materiel: [materiel[i], ateliersIci ? noteDesAteliers : noteDeLaSequence].filter(Boolean).join("\n"),
    };
  });
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of feuilles) {
    const seance = seances[f.seance];
    if (!seance) continue;
    // Les réglages et le tirage vont avec la feuille : « Modifier dans Fabriquer » la refait ; sa compétence s'imprime en tête.
    const graine = graineAuHasard();
    const { html, style, memoires } = f.fabriquer(images, hasard(graine));
    const enTete = (f.competence === "maths" ? ateliers.maths : f.competence === "graphisme" ? ateliers.graphisme : null) ?? vise;
    await poserDansUneSeance(f.atelier, f.titre, html, STYLE_FEUILLE + style, seance.id, sequence.id,
      { competences: enTete ? [enTete] : undefined, fabrication: { memoires, graine } });
    posees++;
  }
  return { sequence, feuilles: posees };
}
