// Une séquence pour catégoriser les mots, avec ses feuilles.
//
// Comme pour le calcul mental : l'atelier fabrique un jeu, la séquence
// l'installe dans la durée. La démarche « categoriser-maternelle » (voir
// demarches.ts) en donne les séances ; chacune reçoit la feuille qui la sert
// — les cartes-images pour apporter les mots, les boîtes de tri et l'intrus
// pour structurer, l'affichage pour trace, le loto puis un jeu de cartes pour
// mémoriser, la grille pour observer — et la note du matériel à préparer.
// Le jeu de cartes suit l'âge, comme dans la fiche « Catégoriser » :
// « J'appelle… » en petite section, le jeu des familles en moyenne, le
// mistigri en grande.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE } from "./cartesImprimables";
import {
  NIVEAUX, REPERES, STYLE_CATEGORISER, categoriesRangees, cequiManque, htmlCategoriser, nomDeLaForme,
  type Forme, type Images, type Niveau, type ReglagesCategoriser,
} from "./categoriser";
import { demarcheDe, seancesDuCadre } from "./demarches";
import { graineAuHasard, hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { chargerVacances, periodeDuJour } from "./vacances";

export const DEMARCHE_CATEGORISER = "categoriser-maternelle";

/** Une feuille de la séquence : la séance qui la reçoit (dans l'ordre de la démarche), son jeu, les âges qu'il sert. */
export interface FeuilleDeSequence { seance: number; forme: Forme; niveaux?: Niveau[] }

export const FEUILLES_DE_LA_SEQUENCE: FeuilleDeSequence[] = [
  { seance: 0, forme: "cartes" },
  { seance: 1, forme: "tri" },
  { seance: 1, forme: "intrus" },
  { seance: 2, forme: "affiche" },
  { seance: 3, forme: "loto" },
  { seance: 4, forme: "appelle", niveaux: ["PS"] },
  { seance: 4, forme: "familles", niveaux: ["MS"] },
  { seance: 4, forme: "mistigri", niveaux: ["GS"] },
  { seance: 6, forme: "evaluation" },
];

/** La séance des jeux de cartes : si celui de l'âge ne se fait pas avec ces catégories, un autre le remplace. */
const SEANCE_DU_JEU = 4;
const JEUX_DE_CARTES: Forme[] = ["appelle", "familles", "mistigri"];

/** Les feuilles qui se feront vraiment, avec ces catégories et à cet âge. */
export function feuillesPour(r: ReglagesCategoriser): FeuilleDeSequence[] {
  const possible = (forme: Forme) => cequiManque({ ...r, forme }) === null;
  return FEUILLES_DE_LA_SEQUENCE.filter((f) => !f.niveaux || f.niveaux.includes(r.niveau)).flatMap((f) => {
    if (possible(f.forme)) return [f];
    if (f.seance !== SEANCE_DU_JEU) return [];
    const autre = JEUX_DE_CARTES.find(possible);
    return autre ? [{ ...f, forme: autre }] : [];
  });
}

/** Ce qu'il faut préparer, séance par séance : la note « matériel » de chacune. */
export function materielDesSeances(jeu: Forme): string[] {
  return [
    "Les objets réels du coin jeux (dînette, marchande, poupées…) ; les cartes-images du corpus, découpées.",
    "Les boîtes de tri et les images découpées, une enveloppe par binôme ; la fiche de l'intrus ; de quoi photographier les productions.",
    "Les cartes-images ; une grande feuille ; l'affichage des catégories.",
    "Le loto des catégories : une plaque par joueur, les cartes à piocher.",
    `${nomDeLaForme(jeu)} : les cartes découpées, et la règle.`,
    "Le coin dînette, marchande ou poupées ; l'affichage des catégories.",
    "La grille d'observation ; les cartes-images.",
  ];
}

const liste = (mots: string[]) => (mots.length <= 1 ? mots.join("") : `${mots.slice(0, -1).join(", ")} et ${mots[mots.length - 1]}`);
/** Les noms des catégories, pour une phrase : « les fruits », « chez le boulanger ». */
const nomsDansLaPhrase = (r: ReglagesCategoriser) =>
  categoriesRangees(r.categories).map((c) => c.nom.trim()).filter(Boolean).map((n) => n.charAt(0).toLowerCase() + n.slice(1));

/** Le titre proposé : « Catégoriser : les fruits et les légumes (PS) ». */
export function titreDeLaSequence(r: ReglagesCategoriser): string {
  const noms = nomsDansLaPhrase(r);
  return `Catégoriser${noms.length ? ` : ${liste(noms)}` : " les mots"} (${r.niveau})`;
}

/** Ce que la séquence vise : la compétence du programme, les catégories, ce qu'on observera à cet âge. */
export function objectifsDeLaSequence(r: ReglagesCategoriser): string {
  const age = NIVEAUX.find((n) => n.id === r.niveau)?.age ?? "";
  const noms = nomsDansLaPhrase(r);
  return `Organiser les mots en catégorie et en réseau${noms.length ? ` : ${liste(noms)}` : ""}. ${r.niveau}, ${age} : ${REPERES[r.niveau]}`;
}

interface RefComp { id: string; texte: string; niveau?: string }
interface RefCG { titre: string; competences?: RefComp[] }
interface RefSous { titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines?: RefSous[] }

/**
 * « Organiser les mots en catégorie et en réseau », à cet âge, dans les
 * référentiels actifs — le programme 2025 d'abord : la compétence que la
 * séquence vise quand l'atelier n'en a pas reçu. Une autre séquence de
 * maternelle y cherche la sienne par son intitulé.
 */
export function competenceDuProgramme(referentiels: Referentiel[], niveau: Niveau | string, intitule = /organiser les mots en cat/i): CompetenceSelectionnee | null {
  const actifs = referentiels.filter((r) => r.actif).sort((a, b) => Number(/2025/.test(b.nom)) - Number(/2025/.test(a.nom)));
  for (const ref of actifs) {
    let donnees: { domaines?: RefDom[] } | null = null;
    try { donnees = JSON.parse(ref.donnees); } catch { continue; }
    for (const dom of donnees?.domaines ?? []) for (const sd of dom.sousDomaines ?? []) {
      const groupes = [{ cg: null as RefCG | null, comps: sd.competences ?? [] }, ...(sd.competencesGenerales ?? []).map((cg) => ({ cg, comps: cg.competences ?? [] }))];
      for (const { cg, comps } of groupes) for (const c of comps) {
        if (!intitule.test(c.texte) || (c.niveau && c.niveau !== niveau)) continue;
        return {
          id: newId(), referentielNom: ref.nom, domaineId: dom.id, domaineTitre: dom.titre, sousDomaineTitre: sd.titre,
          competenceGeneraleTitre: cg?.titre ?? null, competenceTitre: c.texte, niveau: c.niveau ?? null, competenceRefId: c.id,
        };
      }
    }
  }
  return null;
}

/**
 * Crée la séquence : la fiche, les séances de la démarche avec leur
 * matériel, puis les feuilles dans leurs séances. Les images sont celles des
 * catégories, déjà chargées. Rend la séquence créée, et combien de feuilles
 * y sont.
 */
export async function creerLaSequenceDeCategorisation(
  r: ReglagesCategoriser, titre: string, competences: CompetenceSelectionnee[], images: Images,
): Promise<{ sequence: Sequence; feuilles: number }> {
  const demarche = demarcheDe(DEMARCHE_CATEGORISER);
  if (!demarche) throw new Error("La démarche de catégorisation est introuvable.");
  const vise = competences[0];
  const matiere = vise?.domaineTitre || "Mobiliser le langage dans toutes ses dimensions";
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
  const feuilles = feuillesPour(r);
  const materiel = materielDesSeances(feuilles.find((f) => f.seance === SEANCE_DU_JEU)?.forme ?? "appelle");
  const seances = seancesDuCadre(demarche, sequence.id, 1).map((s, i) => ({ ...s, competences: JSON.stringify(competences), materiel: materiel[i] ?? "" }));
  for (const s of seances) await api.seanceSave(s);
  let posees = 0;
  for (const f of feuilles) {
    const seance = seances[f.seance];
    if (!seance) continue;
    const html = htmlCategoriser({ ...r, forme: f.forme }, images, hasard(graineAuHasard()));
    await poserDansUneSeance("categoriser", nomDeLaForme(f.forme), html, STYLE_FEUILLE + STYLE_CATEGORISER, seance.id, sequence.id);
    posees++;
  }
  return { sequence, feuilles: posees };
}
