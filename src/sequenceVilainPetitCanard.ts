// Une séquence « Le Vilain Petit Canard », avec ses feuilles.
//
// Comme pour « Catégoriser les mots » : la démarche du guide (voir
// demarchesVilainPetitCanard.ts) donne les douze séances, chacune reçoit ses
// feuilles — celles des ateliers « Catégoriser les mots » et « Images
// séquentielles », et celles de l'atelier du Vilain Petit Canard — et la note
// du matériel à préparer. Les feuilles portent en tête la compétence de la
// séquence ; « Modifier dans Fabriquer » rouvre l'atelier qui les a faites.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { DEMARCHE_VPC } from "./demarchesVilainPetitCanard";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import type { Images } from "./supportsVisuels";
import { chargerVacances, periodeDuJour } from "./vacances";
import { NIVEAUX_VPC, feuillesDeLaSequence, materielDesSeances, type NiveauVpc } from "./vilainPetitCanard";

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

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Les images sont celles de
 * la séquence (`IDS_VPC`), déjà chargées. Rend la séquence créée, et combien
 * de feuilles y sont.
 */
export async function creerLaSequenceDuVilainPetitCanard(
  n: NiveauVpc, titre: string, competences: CompetenceSelectionnee[], images: Images,
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
  const materiel = materielDesSeances(n);
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => ({ ...s, competences: JSON.stringify(competences), materiel: materiel[i] ?? "" }));
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of feuillesDeLaSequence(n)) {
    const seance = seances[f.seance];
    if (!seance) continue;
    // Les réglages et le tirage vont avec la feuille : « Modifier dans Fabriquer » la refait ; la compétence de la séquence s'imprime en tête.
    const graine = graineAuHasard();
    const { html, style, memoires } = f.fabriquer(images, hasard(graine));
    await poserDansUneSeance(f.atelier, f.titre, html, STYLE_FEUILLE + style, seance.id, sequence.id,
      { competences: vise ? [vise] : undefined, fabrication: { memoires, graine } });
    posees++;
  }
  return { sequence, feuilles: posees };
}
