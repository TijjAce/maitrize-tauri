// Le problème du jour, en maternelle : une sorte de problème pour une période.
//
// « Utiliser les nombres pour résoudre des problèmes » (programme de l'école
// maternelle, 2025). Les livrets d'accompagnement de 2025 (« Avant 4 ans »,
// « À partir de 4 ans », « À partir de 5 ans ») et le guide « La
// construction du nombre à l'école maternelle » (2023) font travailler la
// même sorte de problème pendant plusieurs semaines, dans une situation de
// référence : la valise de la mascotte, les chevaux de la ferme, les
// jongleurs, les poupées et leurs gâteaux. D'une semaine à l'autre, le
// matériel s'éloigne de la situation — les objets eux-mêmes, puis leurs
// images, puis des jetons, puis rien qu'on manipule : on cherche, on dit, et
// l'on vérifie après — avant d'autres contextes. Les nombres grandissent dans
// les limites de l'âge : trois, voire quatre, avant 4 ans ; six à partir de
// 4 ans ; dix à partir de 5 ans.
//
// L'atelier prépare la période : un problème par jour, écrit pour être lu à
// la classe, et ce qu'il faut imprimer — les cartes de la semaine, l'affiche
// du problème de référence, les images à découper, les étiquettes des
// boîtes à nombres, la feuille où l'on dessine pour chercher, la grille
// d'observation. Les énoncés sont les nôtres, sur le modèle des documents.

import { escapeHtml } from "./print";
import { attributionPour, carte, feuille, pagesDeCartes, type FormatGrille } from "./cartesImprimables";
import { NIVEAUX, type Niveau } from "./categoriser";
import { doigtsSvg, pointsSvg } from "./collections";
import { reference } from "./references";
import { cleImage, type PictoPose } from "./supportsVisuels";

// ── Les sortes de problèmes ───────────────────────────────────────────────

export type TypeDeProbleme =
  | "ajout" | "retrait" | "ajoutRetrait" | "complement" | "comparaison"
  | "piste" | "pisteDe" | "groupements" | "partage" | "parts";

/** Ce que le matériel représente : une collection qui change, un pion sur une piste, des groupes égaux. */
export type Famille = "collection" | "piste" | "groupes";

export type SituationId =
  | "valise" | "ferme" | "boite" | "branche" | "billes" | "oie" | "grenouille" | "jongleurs" | "perles" | "poupees" | "perso";

/** Un mot qu'on compte : son singulier, son pluriel, son genre et son image. */
export interface ObjetPb { sing: string; plur: string; f?: boolean; picto: number | string | null }

export interface InfoType {
  id: TypeDeProbleme;
  nom: string;
  /** Pour un titre : « ajouter », « partager ». */
  court: string;
  /** Ce qu'on cherche, dit simplement. */
  quoi: string;
  famille: Famille;
  niveaux: Niveau[];
  /** Quand les documents le placent dans l'année. */
  quand?: Partial<Record<Niveau, string>>;
  /** Les situations qui s'y prêtent : la première est celle de référence. */
  situations: SituationId[];
  /** Les mots de la compétence du programme 2025 qu'il sert, à chaque âge. */
  competence: Partial<Record<Niveau, RegExp>>;
  source: string;
}

const LIVRETS = "les livrets d'accompagnement « Avant 4 ans », « À partir de 4 ans » et « À partir de 5 ans » (2025)";
const GUIDE = "le guide « La construction du nombre à l'école maternelle » (2023)";

export const TYPES: InfoType[] = [
  {
    id: "ajout", court: "ajouter", nom: "On ajoute : combien maintenant ?", famille: "collection", niveaux: ["PS", "MS", "GS"],
    quoi: "Une collection cachée, on en ajoute : combien y en a-t-il maintenant ? C'est chercher le tout.",
    situations: ["valise", "ferme", "boite", "branche", "billes", "perso"],
    competence: { PS: /parties-tout/i, MS: /parties-tout/i, GS: /parties-tout/i },
    source: `${LIVRETS} ; ${GUIDE}, le problème des chevaux`,
  },
  {
    id: "retrait", court: "enlever", nom: "On enlève : combien en reste-t-il ?", famille: "collection", niveaux: ["PS", "MS", "GS"],
    quoi: "Une collection cachée, on en enlève : combien en reste-t-il ? C'est chercher une partie.",
    situations: ["valise", "ferme", "boite", "branche", "billes", "perso"],
    competence: { PS: /parties-tout/i, MS: /parties-tout/i, GS: /parties-tout/i },
    source: `${LIVRETS} ; ${GUIDE}, le problème des chevaux`,
  },
  {
    id: "ajoutRetrait", court: "ajouter ou enlever", nom: "On ajoute ou on enlève", famille: "collection", niveaux: ["MS", "GS"],
    quoi: "Un jour on ajoute, le lendemain on enlève : il faut d'abord comprendre ce qui se passe.",
    situations: ["ferme", "valise", "boite", "branche", "billes", "perso"],
    competence: { MS: /parties-tout/i, GS: /parties-tout/i },
    source: `${LIVRETS} ; ${GUIDE}`,
  },
  {
    id: "complement", court: "combien en plus, combien en moins", nom: "Combien en a-t-on ajouté, ou enlevé ?", famille: "collection", niveaux: ["GS"],
    quoi: "On connaît le début et la fin : combien en a-t-on ajouté, ou enlevé ? C'est chercher la transformation.",
    situations: ["ferme", "valise", "boite", "branche", "billes", "perso"],
    competence: { GS: /ajout[ée]e ou retir[ée]e/i },
    source: `${GUIDE}, le problème des chevaux en grande section ; le livret « À partir de 5 ans » (2025)`,
  },
  {
    id: "comparaison", court: "comparer", nom: "Combien de plus, combien de moins ?", famille: "collection", niveaux: ["GS"],
    quoi: "Une collection, et l'écart avec une autre : combien la seconde en a-t-elle ?",
    situations: ["billes", "boite", "ferme", "branche"],
    competence: { GS: /[ée]cart entre/i },
    source: "le programme de l'école maternelle (2025)",
  },
  {
    id: "piste", court: "avancer et reculer sur la piste", nom: "Sur la piste : où arrive-t-on ?", famille: "piste", niveaux: ["MS", "GS"],
    quoi: "Un pion sur une case, il avance ou il recule : sur quelle case arrive-t-il ? Avancer, c'est ajouter ; reculer, c'est enlever.",
    situations: ["oie", "grenouille"],
    competence: { MS: /position finale/i, GS: /position finale/i },
    source: `${GUIDE}, les jeux de piste`,
  },
  {
    id: "pisteDe", court: "trouver le déplacement sur la piste", nom: "Sur la piste : de combien avancer ?", famille: "piste", niveaux: ["GS"],
    quoi: "Le pion est sur une case, on veut aller sur une autre : quel nombre doit montrer le dé ?",
    situations: ["oie", "grenouille"],
    competence: { GS: /position finale/i },
    source: `${GUIDE}, les jeux de piste`,
  },
  {
    id: "groupements", court: "des groupes égaux", nom: "Des groupes égaux : combien en tout ?", famille: "groupes", niveaux: ["MS", "GS"],
    quand: { MS: "à partir de février" },
    quoi: "Plusieurs jongleurs, autant de balles pour chacun : combien faut-il de balles en tout ?",
    situations: ["jongleurs", "perles", "poupees"],
    competence: { MS: /groupements?/i, GS: /groupements?/i },
    source: "le livret « À partir de 4 ans » (2025), les jongleurs ; le livret « À partir de 5 ans » (2025)",
  },
  {
    id: "partage", court: "partager", nom: "Partager : combien chacun ?", famille: "groupes", niveaux: ["MS", "GS"],
    quand: { MS: "à partir de février, sans reste" },
    quoi: "Des objets à partager également : combien chacun en aura-t-il ? En grande section, il peut en rester.",
    situations: ["poupees", "jongleurs", "perles"],
    // En moyenne section, le livret fait partager avec les groupements : le programme n'a pas de ligne à part.
    competence: { MS: /groupements?/i, GS: /partage/i },
    source: "le livret « À partir de 4 ans » (2025), les partages ; le livret « À partir de 5 ans » (2025), les poupées et leurs gâteaux",
  },
  {
    id: "parts", court: "combien de parts", nom: "Partager : combien de parts ?", famille: "groupes", niveaux: ["GS"],
    quoi: "Des objets à ranger, autant dans chaque boîte : combien de boîtes faut-il ?",
    situations: ["perles", "poupees", "jongleurs"],
    competence: { GS: /partage/i },
    source: "le livret « À partir de 4 ans » (2025), la progression jusqu'à 5 ans",
  },
];

export const typeDe = (id: TypeDeProbleme): InfoType => TYPES.find((t) => t.id === id) ?? TYPES[0];
export const typesDuNiveau = (n: Niveau): InfoType[] => TYPES.filter((t) => t.niveaux.includes(n));

// ── Les situations ────────────────────────────────────────────────────────

/** Les pictogrammes ARASAAC des situations. */
export const P = {
  valise: 2931, peluche: 4945, bonnet: 2412, crayon: 2440, livre: 2450, ferme: 3337, cheval: 2294, boite: 5935,
  bille: 36507, branche: 7224, oiseau: 2490, pion: 34167, de: 2731, grenouille: 2543, jongleur: 10350, balle: 3241,
  perle: 8334, poupee: 26238, gateau: 8312, assiette: 2532, cubes: 26403, doigts: 9826, dessiner: 8088, compter: 2714,
  penser: 8662, distribuer: 27069, avancer: 21397, toucher: 3293, marchand: 37808,
} as const;

export interface SituationPb {
  id: SituationId;
  nom: string;
  famille: Famille;
  /** Le lieu ou le contenant : la valise, l'enclos, la boîte, la branche ; pour une piste, le dé. */
  lieu?: ObjetPb;
  /** Le lieu avec son article : « la valise », « l'enclos ». */
  lieuDit?: string;
  /** Ce qu'on compte ; dans la valise, d'un jour à l'autre, des peluches, des bonnets… */
  objets: ObjetPb[];
  /** Ceux qui reçoivent, dans un groupement ou un partage : les jongleurs, les boîtes, les poupées. */
  groupe?: ObjetPb;
  source: string;
}

const SITUATIONS_FIXES: SituationPb[] = [
  {
    id: "valise", nom: "La valise de la mascotte", famille: "collection",
    lieu: { sing: "valise", plur: "valises", f: true, picto: P.valise }, lieuDit: "la valise",
    objets: [
      { sing: "peluche", plur: "peluches", f: true, picto: P.peluche }, { sing: "bonnet", plur: "bonnets", picto: P.bonnet },
      { sing: "crayon", plur: "crayons", picto: P.crayon }, { sing: "livre", plur: "livres", picto: P.livre },
    ],
    source: "le livret « Avant 4 ans » (2025) : la mascotte prépare sa valise",
  },
  {
    id: "ferme", nom: "Les chevaux de la ferme", famille: "collection",
    lieu: { sing: "enclos", plur: "enclos", picto: P.ferme }, lieuDit: "l'enclos",
    objets: [{ sing: "cheval", plur: "chevaux", picto: P.cheval }],
    source: `${GUIDE} : le problème des chevaux`,
  },
  {
    id: "boite", nom: "Le jeu de la boîte", famille: "collection",
    lieu: { sing: "boîte", plur: "boîtes", f: true, picto: P.boite }, lieuDit: "la boîte",
    objets: [{ sing: "bille", plur: "billes", f: true, picto: P.bille }],
    source: `${GUIDE} : le jeu de la boîte, en séances d'entraînement puis en activité ritualisée`,
  },
  {
    id: "branche", nom: "Les oiseaux sur la branche", famille: "collection",
    lieu: { sing: "branche", plur: "branches", f: true, picto: P.branche }, lieuDit: "la branche",
    objets: [{ sing: "oiseau", plur: "oiseaux", picto: P.oiseau }],
    source: `${GUIDE} : les oiseaux sur la branche`,
  },
  {
    id: "billes", nom: "Les billes de Zoé et Samir", famille: "collection",
    objets: [{ sing: "bille", plur: "billes", f: true, picto: P.bille }],
    source: "le programme de l'école maternelle (2025)",
  },
  {
    id: "oie", nom: "Le jeu de l'oie", famille: "piste",
    lieu: { sing: "dé", plur: "dés", picto: P.de },
    objets: [{ sing: "pion", plur: "pions", picto: P.pion }],
    source: `${GUIDE} : la piste du jeu de l'oie`,
  },
  {
    id: "grenouille", nom: "Les sauts de la grenouille", famille: "piste",
    objets: [{ sing: "grenouille", plur: "grenouilles", f: true, picto: P.grenouille }],
    source: `${GUIDE} : une autre piste, pour changer de contexte`,
  },
  {
    id: "jongleurs", nom: "Les jongleurs et leurs balles", famille: "groupes",
    groupe: { sing: "jongleur", plur: "jongleurs", picto: P.jongleur },
    objets: [{ sing: "balle", plur: "balles", f: true, picto: P.balle }],
    source: "le livret « À partir de 4 ans » (2025) : les jongleurs, et le marchand de balles au loin",
  },
  {
    id: "perles", nom: "Les perles dans les boîtes", famille: "groupes",
    groupe: { sing: "boîte", plur: "boîtes", f: true, picto: P.boite },
    objets: [{ sing: "perle", plur: "perles", f: true, picto: P.perle }],
    source: "les livrets « À partir de 4 ans » et « À partir de 5 ans » (2025) : les perles à ranger",
  },
  {
    id: "poupees", nom: "Les poupées et leurs gâteaux", famille: "groupes",
    groupe: { sing: "poupée", plur: "poupées", f: true, picto: P.poupee },
    objets: [{ sing: "gâteau", plur: "gâteaux", picto: P.gateau }],
    source: "le livret « À partir de 5 ans » (2025) : les poupées, leurs assiettes et les gâteaux",
  },
];

/** La situation de l'enseignant : son contenant, son objet, leurs images. */
export interface SituationPerso {
  /** Le contenant, avec son article : « le panier ». */
  lieu: string;
  objet: string;
  objets: string;
  feminin: boolean;
  pictoLieu: PictoPose;
  pictoObjet: PictoPose;
}

export const PERSO_VIDE: SituationPerso = {
  lieu: "le panier", objet: "pomme", objets: "pommes", feminin: true,
  pictoLieu: { id: 3012, mot: "panier" }, pictoObjet: { id: 2462, mot: "pomme" },
};

/** La situation, et la sienne pour « perso ». */
export function situationDe(id: SituationId, perso: SituationPerso = PERSO_VIDE): SituationPb {
  if (id !== "perso") return SITUATIONS_FIXES.find((s) => s.id === id) ?? SITUATIONS_FIXES[0];
  const sansArticle = perso.lieu.trim().replace(/^(le |la |les |l'|l’)/i, "");
  return {
    id: "perso", nom: `Les ${perso.objets.trim() || "objets"} dans ${perso.lieu.trim() || "le contenant"}`, famille: "collection",
    lieu: { sing: sansArticle || "contenant", plur: sansArticle || "contenants", picto: cleImage(perso.pictoLieu) }, lieuDit: perso.lieu.trim() || "le contenant",
    objets: [{ sing: perso.objet.trim() || "objet", plur: perso.objets.trim() || `${perso.objet.trim() || "objet"}s`, f: perso.feminin, picto: cleImage(perso.pictoObjet) }],
    source: "votre classe",
  };
}

export const nomDeLaSituation = (id: SituationId, perso?: SituationPerso) => situationDe(id, perso).nom;

// ── Les réglages ──────────────────────────────────────────────────────────

/** Jusqu'où vont les quantités à chaque âge, d'après le programme 2025 : trois, voire quatre ; six ; dix. */
export const JUSQUA_DU_PROGRAMME: Record<Niveau, number> = { PS: 3, MS: 6, GS: 10 };
export const QUANTITE_MAX = 10;

/** Le plus petit « jusqu'à » qui laisse des problèmes à poser. */
const MINIMUM: Record<TypeDeProbleme, number> = {
  ajout: 2, retrait: 2, ajoutRetrait: 3, complement: 3, comparaison: 3, piste: 5, pisteDe: 5, groupements: 4, partage: 4, parts: 4,
};

/** Le « jusqu'à » de l'âge : celui du programme ; une piste va jusqu'à dix dès la moyenne section. */
export const maxParDefaut = (niveau: Niveau, type: TypeDeProbleme): number =>
  typeDe(type).famille === "piste" ? 10 : JUSQUA_DU_PROGRAMME[niveau];

export type Forme = "cartes" | "affiche" | "materiel" | "etiquettes" | "recherche" | "grille";

export const FORMES: { id: Forme; nom: string; quoi: string }[] = [
  { id: "cartes", nom: "Les cartes du problème du jour", quoi: "le plan de la période, puis une carte par jour : l'énoncé à lire, la situation en images, la réponse pour le maître" },
  { id: "affiche", nom: "L'affiche du problème de référence", quoi: "la situation, le premier problème, et les façons de chercher qu'on met en évidence" },
  { id: "materiel", nom: "Le matériel à découper", quoi: "les images de la situation, pour la semaine où elles remplacent les objets — et la piste" },
  { id: "etiquettes", nom: "Les étiquettes des boîtes à nombres", quoi: "chaque nombre en chiffre, en constellation, en points en désordre et en images ; l'étiquette de la boîte à problèmes" },
  { id: "recherche", nom: "La feuille de recherche", quoi: "dessiner pour chercher, puis la réponse : les problèmes de la semaine sans manipulation" },
  { id: "grille", nom: "La grille d'observation", quoi: "ce qu'on observe chez chaque élève, d'après les livrets" },
];

export const nomDeLaForme = (f: Forme) => FORMES.find((x) => x.id === f)?.nom ?? "Le problème du jour";

export interface ReglagesProbleme {
  niveau: Niveau;
  type: TypeDeProbleme;
  situation: SituationId;
  /** Le plus grand nombre de la période : le tout, ou la dernière case de la piste. */
  max: number;
  semaines: number;
  /** Quatre jours (lundi, mardi, jeudi, vendredi), ou cinq avec le mercredi. */
  jours: number;
  /** Le nom de la mascotte de la classe, qui prépare sa valise. */
  mascotte: string;
  perso: SituationPerso;
  forme: Forme;
  /** Les cartes d'une seule semaine (1, 2…) ; 0 : toutes, avec le plan de la période. */
  semaine: number;
}

export const REGLAGES_PROBLEME: ReglagesProbleme = {
  niveau: "MS", type: "ajout", situation: "valise", max: 6, semaines: 5, jours: 4, mascotte: "Lulu", perso: PERSO_VIDE, forme: "cartes", semaine: 0,
};

/** Ce qui change avec l'âge : la sorte de problème si elle n'y est pas, le plus grand nombre. */
export function reglagesDuNiveau(r: ReglagesProbleme, niveau: Niveau): Partial<ReglagesProbleme> {
  const type = typeDe(r.type).niveaux.includes(niveau) ? r.type : "ajout";
  const situation = typeDe(type).situations.includes(r.situation) ? r.situation : typeDe(type).situations[0];
  return { niveau, type, situation, max: maxParDefaut(niveau, type) };
}

/** Ce qui change avec la sorte de problème : sa situation de référence, et son plus grand nombre. */
export function reglagesDuType(r: ReglagesProbleme, type: TypeDeProbleme): Partial<ReglagesProbleme> {
  const t = typeDe(type);
  const memeFamille = t.famille === typeDe(r.type).famille;
  return { type, situation: t.situations.includes(r.situation) ? r.situation : t.situations[0], max: memeFamille ? r.max : maxParDefaut(r.niveau, type) };
}

const borne = (v: unknown, defaut: number, min: number, max: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : defaut;
const pose = (v: unknown, defaut: PictoPose): PictoPose => {
  if (!v || typeof v !== "object") return defaut;
  const o = v as Record<string, unknown>;
  const id = typeof o.id === "number" && Number.isInteger(o.id) ? o.id : null;
  const photo = typeof o.photo === "string" && /^[^/\\]+$/.test(o.photo) ? o.photo : undefined;
  return { id, mot: typeof o.mot === "string" ? o.mot : "", ...(photo ? { photo } : {}) };
};
const texte = (v: unknown, defaut: string, longueur = 40) => (typeof v === "string" ? v.slice(0, longueur) : defaut);

/** Les réglages enregistrés, réparés : ce qu'une version plus ancienne ou un fichier abîmé y a laissé. */
export function reglagesSurs(brut: Partial<ReglagesProbleme>): ReglagesProbleme {
  const d = REGLAGES_PROBLEME;
  const niveau = NIVEAUX.some((n) => n.id === brut.niveau) ? (brut.niveau as Niveau) : d.niveau;
  const voulu = TYPES.find((t) => t.id === brut.type);
  const type = voulu && voulu.niveaux.includes(niveau) ? voulu.id : typesDuNiveau(niveau)[0].id;
  const t = typeDe(type);
  const situation = t.situations.includes(brut.situation as SituationId) ? (brut.situation as SituationId) : t.situations[0];
  const semaines = borne(brut.semaines, d.semaines, 4, 6);
  const p = (brut.perso ?? {}) as Partial<SituationPerso>;
  return {
    niveau, type, situation,
    max: borne(brut.max, maxParDefaut(niveau, type), MINIMUM[type], QUANTITE_MAX),
    semaines, jours: brut.jours === 5 ? 5 : 4,
    mascotte: texte(brut.mascotte, d.mascotte, 24),
    perso: {
      lieu: texte(p.lieu, PERSO_VIDE.lieu), objet: texte(p.objet, PERSO_VIDE.objet), objets: texte(p.objets, PERSO_VIDE.objets),
      feminin: typeof p.feminin === "boolean" ? p.feminin : PERSO_VIDE.feminin,
      pictoLieu: pose(p.pictoLieu, PERSO_VIDE.pictoLieu), pictoObjet: pose(p.pictoObjet, PERSO_VIDE.pictoObjet),
    },
    forme: FORMES.some((f) => f.id === brut.forme) ? (brut.forme as Forme) : d.forme,
    semaine: borne(brut.semaine, 0, 0, semaines),
  };
}

/** Ce qui empêche la feuille de se faire, ou rien. */
export function cequiManque(r: ReglagesProbleme): string | null {
  if (r.max < MINIMUM[r.type]) return `Cette sorte de problème demande des nombres jusqu'à ${MINIMUM[r.type]} au moins.`;
  if (r.situation === "perso" && (!r.perso.objet.trim() || !r.perso.lieu.trim())) return "Écrivez l'objet et le contenant de votre situation.";
  return null;
}

// ── Les semaines ──────────────────────────────────────────────────────────

/** Ce qu'on manipule, semaine après semaine : de la situation vers le nombre. */
export type Mode = "objets" | "images" | "jetons" | "tete" | "contextes";

export const NOMS_DES_MODES: Record<Mode, string> = {
  objets: "avec les objets", images: "avec des images", jetons: "avec des jetons", tete: "sans manipuler, puis on vérifie", contextes: "dans d'autres situations",
};

/** Les semaines de la période et ce qu'on y manipule. */
export function modesDeLaPeriode(semaines: number): Mode[] {
  if (semaines <= 4) return ["objets", "images", "tete", "contextes"];
  if (semaines === 5) return ["objets", "images", "jetons", "tete", "contextes"];
  return ["objets", "images", "jetons", "tete", "tete", "contextes"];
}

/** Ce que la semaine fait faire, pour cette famille de problèmes. */
export function quoiDuMode(m: Mode, f: Famille): string {
  if (f === "piste") {
    return {
      objets: "Sur une grande piste tracée au sol : chacun se déplace lui-même, en comptant ses pas.",
      images: "Sur la piste dessinée, avec un pion : on joue le déplacement, case après case.",
      jetons: "Sur la bande numérique de la classe, avec une pince à linge à la place du pion.",
      tete: "Sans la piste : on dit d'abord la case d'arrivée, puis on vérifie en jouant.",
      contextes: "Une autre piste, un autre personnage : la même sorte de problème ailleurs. On observe chacun avec la grille.",
    }[m];
  }
  if (f === "groupes") {
    return {
      objets: "Avec les vrais objets et les personnages : on va chercher, on distribue, puis on vérifie que chacun en a autant.",
      images: "Avec les images découpées des personnages et des objets.",
      jetons: "Des jetons pour les objets, des ronds dessinés pour les personnages.",
      tete: "Sans rien manipuler : avec un dessin ou ses doigts ; on vérifie ensuite avec le matériel.",
      contextes: "La même sorte de problème dans une autre situation. On observe chacun avec la grille.",
    }[m];
  }
  return {
    objets: "On joue la situation avec les vrais objets : on les cache, on cherche, puis on ouvre pour vérifier.",
    images: "Les images découpées remplacent les objets : on les cache de la même façon.",
    jetons: "Des jetons ou des cubes représentent les objets : on cherche avec eux, puis on vérifie.",
    tete: "On cherche sans rien manipuler — ses doigts, un dessin, dans sa tête —, on dit sa réponse, puis on vérifie avec le matériel.",
    contextes: "La même sorte de problème dans une autre situation. On observe chacun avec la grille.",
  }[m];
}

const JOURS_4 = ["lundi", "mardi", "jeudi", "vendredi"];
const JOURS_5 = ["lundi", "mardi", "mercredi", "jeudi", "vendredi"];
export const joursDe = (n: number) => (n >= 5 ? JOURS_5 : JOURS_4);

/** Les personnages des pistes, et la camarade de la comparaison. */
const PERSONNAGES = ["Zoé", "Samir", "Bintou", "Léo", "Inès", "Malo"];

// ── Les énoncés ───────────────────────────────────────────────────────────

const VOYELLE = /^[aeiouyàâäéèêëîïôöûüh]/i;
/** « de » devant le nom : « combien de chevaux », « combien d'oiseaux ». */
const de = (o: ObjetPb) => (VOYELLE.test(o.plur) ? "d'" : "de ");
/** Un nombre et son nom accordé : « 1 cheval », « 3 chevaux ». */
const n = (k: number, o: ObjetPb) => `${k} ${k === 1 ? o.sing : o.plur}`;
/** « d'une balle », « de 2 balles ». */
const nDe = (k: number, o: ObjetPb) => (k === 1 ? `${o.f ? "d'une" : "d'un"} ${o.sing}` : `de ${k} ${o.plur}`);
/** « une balle », « 2 balles ». */
const nUn = (k: number, o: ObjetPb) => (k === 1 ? `${o.f ? "une" : "un"} ${o.sing}` : `${k} ${o.plur}`);
const e = (o: ObjetPb) => (o.f ? "e" : "");
/** « Un », « Une », en tête de phrase. */
const un = (o: ObjetPb) => (o.f ? "Une" : "Un");

/** Ce qu'on dit d'une collection qui change : la phrase de départ, l'ajout, le retrait, les questions. */
interface Phrases {
  depart: (a: number) => string;
  ajout: (b: number) => string;
  encore: (c: number) => string;
  ajoutCache: string;
  retrait: (b: number) => string;
  retraitCache: string;
  combien: string;
  reste: string;
  combienAjoute: string;
  combienRetire: string;
  /** La fin connue d'une transformation : « Maintenant, il y en a 5. » */
  maintenant: (c: number) => string;
  ilEnReste: (c: number) => string;
  comparer: (a: number, b: number, plus: boolean) => string;
}

function phrasesDe(s: SituationPb, o: ObjetPb, mascotte: string, perso: SituationPerso): Phrases {
  const M = mascotte.trim() || "La mascotte";
  const combienDe = `Combien ${de(o)}${o.plur}`;
  const plusMoins = (plus: boolean) => (plus ? "plus" : "moins");
  const fins = { maintenant: (c: number) => `Maintenant, il y en a ${c}.`, ilEnReste: (c: number) => `Maintenant, il en reste ${c}.` };
  switch (s.id) {
    case "ferme":
      return {
        ...fins,
        depart: (a) => `Dans l'enclos de la ferme, il y a ${n(a, o)}.`,
        ajout: (b) => (b === 1 ? `Puis ${un(o).toLowerCase()} ${o.sing} arrive.` : `Puis ${b} ${o.plur} arrivent.`),
        encore: (c) => (c === 1 ? `Et ${un(o).toLowerCase()} autre ${o.sing} arrive.` : `Et ${c} autres ${o.plur} arrivent.`),
        ajoutCache: `D'autres ${o.plur} arrivent.`,
        retrait: (b) => (b === 1 ? `Puis ${un(o).toLowerCase()} ${o.sing} sort de l'enclos.` : `Puis ${b} ${o.plur} sortent de l'enclos.`),
        retraitCache: `Des ${o.plur} sortent de l'enclos.`,
        combien: `${combienDe} y a-t-il dans l'enclos maintenant ?`,
        reste: `${combienDe} reste-t-il dans l'enclos ?`,
        combienAjoute: `${combienDe} sont arrivé${e(o)}s ?`,
        combienRetire: `${combienDe} sont sorti${e(o)}s ?`,
        comparer: (a, b, plus) => `Dans l'enclos rouge, il y a ${n(a, o)}. Dans l'enclos bleu, il y en a ${b} de ${plusMoins(plus)}. ${combienDe} y a-t-il dans l'enclos bleu ?`,
      };
    case "boite":
      return {
        ...fins,
        depart: (a) => `Je mets ${n(a, o)} dans la boîte.`,
        ajout: (b) => `Puis j'en mets encore ${b}.`,
        encore: (c) => `Et j'en mets encore ${c}.`,
        ajoutCache: "J'en mets d'autres, sans les montrer.",
        retrait: (b) => `J'en enlève ${b}.`,
        retraitCache: "J'en enlève, sans les montrer.",
        combien: `La boîte est fermée : ${combienDe.toLowerCase()} y a-t-il dedans ?`,
        reste: `${combienDe} reste-t-il dans la boîte ?`,
        combienAjoute: "J'en ai mis combien ?",
        combienRetire: "J'en ai enlevé combien ?",
        comparer: (a, b, plus) => `Dans la boîte rouge, il y a ${n(a, o)}. Dans la boîte bleue, il y en a ${b} de ${plusMoins(plus)}. ${combienDe} y a-t-il dans la boîte bleue ?`,
      };
    case "branche":
      return {
        ...fins,
        depart: (a) => `Sur la branche, il y a ${n(a, o)}.`,
        ajout: (b) => (b === 1 ? `Puis ${un(o).toLowerCase()} ${o.sing} vient se poser.` : `Puis ${b} ${o.plur} viennent se poser.`),
        encore: (c) => (c === 1 ? `Et ${un(o).toLowerCase()} autre ${o.sing} vient se poser.` : `Et ${c} autres ${o.plur} viennent se poser.`),
        ajoutCache: `D'autres ${o.plur} viennent se poser.`,
        retrait: (b) => (b === 1 ? `Puis ${un(o).toLowerCase()} ${o.sing} s'envole.` : `Puis ${b} ${o.plur} s'envolent.`),
        retraitCache: `Des ${o.plur} s'envolent.`,
        combien: `${combienDe} y a-t-il sur la branche maintenant ?`,
        reste: `${combienDe} reste-t-il sur la branche ?`,
        combienAjoute: `${combienDe} sont venu${e(o)}s se poser ?`,
        combienRetire: `${combienDe} se sont envolé${e(o)}s ?`,
        comparer: (a, b, plus) => `Sur la grande branche, il y a ${n(a, o)}. Sur la petite branche, il y en a ${b} de ${plusMoins(plus)}. ${combienDe} y a-t-il sur la petite branche ?`,
      };
    case "billes":
      return {
        depart: (a) => `Zoé a ${n(a, o)}.`,
        maintenant: (c) => `Maintenant, Zoé en a ${c}.`,
        ilEnReste: (c) => `Maintenant, il lui en reste ${c}.`,
        ajout: (b) => `Samir lui en donne ${b}.`,
        encore: (c) => `Puis Bintou lui en donne ${c}.`,
        ajoutCache: "Samir lui en donne d'autres.",
        retrait: (b) => `Zoé en perd ${b}.`,
        retraitCache: `Zoé en perd quelques-${o.f ? "unes" : "uns"}.`,
        combien: `${combienDe} Zoé a-t-elle maintenant ?`,
        reste: `${combienDe} reste-t-il à Zoé ?`,
        combienAjoute: "Samir lui en a donné combien ?",
        combienRetire: "Zoé en a perdu combien ?",
        comparer: (a, b, plus) => `Zoé a ${n(a, o)}. Samir a ${n(b, o)} de ${plusMoins(plus)} que Zoé. ${combienDe} a Samir ?`,
      };
    case "perso": {
      const L = perso.lieu.trim() || "la boîte";
      return {
        ...fins,
        depart: (a) => `${M} met ${n(a, o)} dans ${L}.`,
        ajout: (b) => `Puis ${M} en met encore ${b}.`,
        encore: (c) => `Et ${M} en met encore ${c}.`,
        ajoutCache: `${M} en met d'autres.`,
        retrait: (b) => `${M} en enlève ${b}.`,
        retraitCache: `${M} en enlève quelques-${o.f ? "unes" : "uns"}.`,
        combien: `${combienDe} y a-t-il dans ${L} ?`,
        reste: `${combienDe} reste-t-il dans ${L} ?`,
        combienAjoute: `${M} en a mis combien ?`,
        combienRetire: `${M} en a enlevé combien ?`,
        comparer: (a, b, plus) => `Dans ${L}, il y a ${n(a, o)}. Dans le sac de Zoé, il y en a ${b} de ${plusMoins(plus)}. ${combienDe} y a-t-il dans le sac de Zoé ?`,
      };
    }
    default:
      return {
        ...fins,
        depart: (a) => `${M} met ${n(a, o)} dans sa valise.`,
        ajout: (b) => `Puis ${M} en met encore ${b}.`,
        encore: (c) => `Et ${M} en met encore ${c}.`,
        ajoutCache: `${M} en met d'autres.`,
        retrait: (b) => `${M} en sort ${b}.`,
        retraitCache: `${M} en sort quelques-${o.f ? "unes" : "uns"}.`,
        combien: `${combienDe} y a-t-il dans la valise ?`,
        reste: `${combienDe} reste-t-il dans la valise ?`,
        combienAjoute: `${M} en a mis combien ?`,
        combienRetire: `${M} en a sorti combien ?`,
        comparer: (a, b, plus) => `Dans la valise de ${M}, il y a ${n(a, o)}. Dans le sac de Zoé, il y en a ${b} de ${plusMoins(plus)}. ${combienDe} y a-t-il dans le sac de Zoé ?`,
      };
  }
}

/** Le retrait part d'une collection déjà là : « Dans la valise de Lulu, il y a 3 peluches. » */
function departDuRetrait(s: SituationPb, o: ObjetPb, mascotte: string, perso: SituationPerso, a: number): string {
  const M = mascotte.trim() || "la mascotte";
  if (s.id === "valise") return `Dans la valise de ${M}, il y a ${n(a, o)}.`;
  if (s.id === "boite") return `Dans la boîte, il y a ${n(a, o)}.`;
  if (s.id === "perso") return `Dans ${perso.lieu.trim() || "la boîte"}, il y a ${n(a, o)}.`;
  return phrasesDe(s, o, mascotte, perso).depart(a);
}

/** Le sens d'un problème : ce qui se passe ce jour-là. */
export type Sens = "ajout" | "retrait" | "plus" | "moins" | "avance" | "recule" | "egal";

export interface Probleme {
  /** La semaine et le jour, à partir de zéro. */
  semaine: number;
  jour: number;
  mode: Mode;
  /** La sorte de problème posée ce jour-là : « ajout » ou « retrait » pour un mélange. */
  type: TypeDeProbleme;
  sens: Sens;
  situation: SituationId;
  /** L'objet compté ce jour-là, parmi ceux de la situation. */
  objet: number;
  /** Les nombres de l'énoncé, dans l'ordre où il les dit. */
  nombres: number[];
  /** Le personnage d'une piste. */
  personnage?: string;
  enonce: string;
  reponse: string;
  /** Le problème en abrégé, pour le plan du maître : « 2 + 1 ». */
  calcul: string;
  /** Le résultat, en abrégé : « 3 ». */
  resultat: string;
}

/** Un problème une fois ses nombres tirés : l'énoncé, la réponse, l'abrégé. */
function ecrire(p: Omit<Probleme, "enonce" | "reponse" | "calcul" | "resultat">, r: ReglagesProbleme): Probleme {
  const s = situationDe(p.situation, r.perso);
  const o = s.objets[p.objet % s.objets.length];
  const [a, b, c] = p.nombres;
  const ph = phrasesDe(s, o, r.mascotte, r.perso);
  let enonce = "", reponse = "", calcul = "", resultat = "";
  switch (p.type) {
    case "ajout":
    case "retrait":
    case "ajoutRetrait":
      if (p.sens === "retrait") {
        enonce = `${departDuRetrait(s, o, r.mascotte, r.perso, a)} ${ph.retrait(b)} ${ph.reste}`;
        reponse = n(a - b, o); calcul = `${a} − ${b}`; resultat = String(a - b);
      } else {
        const tout = a + b + (c ?? 0);
        enonce = `${ph.depart(a)} ${ph.ajout(b)}${c ? ` ${ph.encore(c)}` : ""} ${ph.combien}`;
        reponse = n(tout, o); calcul = `${a} + ${b}${c ? ` + ${c}` : ""}`; resultat = String(tout);
      }
      break;
    case "complement":
      if (p.sens === "retrait") {
        enonce = `${departDuRetrait(s, o, r.mascotte, r.perso, a)} ${ph.retraitCache} ${ph.ilEnReste(b)} ${ph.combienRetire}`;
        reponse = n(a - b, o); calcul = `${a} − ? = ${b}`; resultat = String(a - b);
      } else {
        enonce = `${ph.depart(a)} ${ph.ajoutCache} ${ph.maintenant(b)} ${ph.combienAjoute}`;
        reponse = n(b - a, o); calcul = `${a} + ? = ${b}`; resultat = String(b - a);
      }
      break;
    case "comparaison": {
      const plus = p.sens === "plus";
      enonce = ph.comparer(a, b, plus);
      const x = plus ? a + b : a - b;
      reponse = n(x, o); calcul = `${a}, ${b} de ${plus ? "plus" : "moins"}`; resultat = String(x);
      break;
    }
    case "piste":
    case "pisteDe": {
      const grenouille = s.id === "grenouille";
      const P2 = p.personnage ?? "Zoé";
      const unite = (k: number) => (grenouille ? (k === 1 ? "un saut" : `${k} sauts`) : k === 1 ? "une case" : `${k} cases`);
      const lieu = grenouille ? "pierre" : "case";
      const depart = grenouille ? `La grenouille est sur la pierre ${a}.` : `Le pion de ${P2} est sur la case ${a}.`;
      if (p.type === "pisteDe") {
        enonce = grenouille
          ? `${depart} Elle veut aller sur la pierre ${b}. Combien de sauts doit-elle faire ?`
          : `${depart} ${P2} voudrait arriver sur la case ${b}. Quel nombre doit montrer le dé ?`;
        reponse = grenouille ? (b - a === 1 ? "1 saut" : `${b - a} sauts`) : `${b - a}`; calcul = `${a} → ${b}`; resultat = `${b - a}`;
      } else {
        const avance = p.sens === "avance";
        const arrivee = avance ? a + b : a - b;
        enonce = grenouille
          ? `${depart} Elle fait ${unite(b)} en ${avance ? "avant" : "arrière"}. Sur quelle pierre arrive-t-elle ?`
          : `${depart} Il ${avance ? "avance" : "recule"} ${b === 1 ? "d'une case" : `de ${b} cases`}. Sur quelle case arrive-t-il ?`;
        reponse = `la ${lieu} ${arrivee}`; calcul = `${lieu} ${a}, ${avance ? "+" : "−"}${b}`; resultat = `${lieu} ${arrivee}`;
      }
      break;
    }
    case "groupements": {
      const g = s.groupe!;
      const [nbGroupes, k] = [a, b];
      enonce = s.id === "jongleurs"
        ? `Il y a ${nbGroupes} ${g.plur}. Chaque ${g.sing} a besoin ${nDe(k, o)}. Combien ${de(o)}${o.plur} faut-il aller chercher chez le marchand ?`
        : s.id === "poupees"
          ? `Il y a ${nbGroupes} ${g.plur} à table. Dans l'assiette de chaque ${g.sing}, on met ${nUn(k, o)}. Combien ${de(o)}${o.plur} faut-il ?`
          : `Il y a ${nbGroupes} ${g.plur}. Dans chaque ${g.sing}, on met ${nUn(k, o)}. Combien ${de(o)}${o.plur} faut-il ?`;
      reponse = n(nbGroupes * k, o); calcul = `${nbGroupes} fois ${k}`; resultat = String(nbGroupes * k);
      break;
    }
    case "partage": {
      const g = s.groupe!;
      const [t, nbGroupes] = [a, b];
      const part = Math.floor(t / nbGroupes), reste = t % nbGroupes;
      const question = s.id === "perles"
        ? `Il y a ${n(t, o)} à ranger dans ${nbGroupes} ${g.plur}, autant dans chaque ${g.sing}. Combien ${de(o)}${o.plur} y aura-t-il dans chaque ${g.sing} ?`
        : s.id === "jongleurs"
          ? `Le marchand a ${n(t, o)} pour ${nbGroupes} ${g.plur}. Chaque ${g.sing} doit en avoir autant. Combien ${de(o)}${o.plur} aura chaque ${g.sing} ?`
          : `Il y a ${n(t, o)} pour ${nbGroupes} ${g.plur}. Chaque ${g.sing} doit en avoir autant. Combien ${de(o)}${o.plur} aura chaque ${g.sing} ?`;
      enonce = `${question}${reste ? " Combien en restera-t-il ?" : ""}`;
      reponse = `${n(part, o)} ${g.f ? "chacune" : "chacun"}${reste ? `, et il en reste ${reste}` : ""}`;
      calcul = `${t} en ${nbGroupes} parts`; resultat = `${part}${reste ? `, reste ${reste}` : ""}`;
      break;
    }
    case "parts": {
      const g = s.groupe!;
      const [t, k] = [a, b];
      const combien = Math.floor(t / k), reste = t % k;
      enonce = s.id === "jongleurs"
        ? `Chaque ${g.sing} a besoin ${nDe(k, o)}. Le marchand en a ${t}. Combien ${de(g)}${g.plur} pourront jongler ?${reste ? ` Combien ${de(o)}${o.plur} restera-t-il ?` : ""}`
        : s.id === "poupees"
          ? `Il y a ${n(t, o)}. Chaque ${g.sing} en reçoit ${k} dans son assiette. Combien ${de(g)}${g.plur} auront des ${o.plur} ?${reste ? ` Combien ${de(o)}${o.plur} restera-t-il ?` : ""}`
          : `Il y a ${n(t, o)}. Dans chaque ${g.sing}, on en met ${k}. ${reste ? `Combien ${de(g)}${g.plur} peut-on remplir ? Combien ${de(o)}${o.plur} restera-t-il ?` : `Combien ${de(g)}${g.plur} faut-il ?`}`;
      reponse = `${n(combien, g)}${reste ? `, et il reste ${n(reste, o)}` : ""}`;
      calcul = `${t} par ${k}`; resultat = `${combien}${reste ? `, reste ${reste}` : ""}`;
      break;
    }
  }
  return { ...p, enonce, reponse, calcul, resultat };
}

// ── Les nombres de la période ─────────────────────────────────────────────

/** Le plus grand nombre de la semaine : la moitié du chemin la première, tout à partir de l'avant-dernière. */
export function plafondDeLaSemaine(max: number, semaine: number, semaines: number): number {
  const depart = Math.min(max, Math.max(3, Math.ceil(max / 2)));
  const t = semaines <= 2 ? 1 : Math.min(1, semaine / (semaines - 2));
  return Math.round(depart + (max - depart) * t);
}

/** Les nombres d'un jour, et ce qui s'y passe. Une semaine ne repose pas deux fois le même problème quand elle peut l'éviter. */
function tirer(r: ReglagesProbleme, semaine: number, jour: number, alea: () => number, vus: Set<string>): { nombres: number[]; sens: Sens; type: TypeDeProbleme } {
  const entre = (lo: number, hi: number) => (hi <= lo ? lo : lo + Math.floor(alea() * (hi - lo + 1)));
  const C = typeDe(r.type).famille === "groupes" ? r.max : plafondDeLaSemaine(r.max, semaine, r.semaines);
  const debut = semaine === 0;
  const tard = semaine >= r.semaines - 2;
  const impair = jour % 2 === 1;
  const unEssai = (): { nombres: number[]; sens: Sens; type: TypeDeProbleme } => {
    switch (r.type) {
      case "ajout":
      case "retrait":
      case "ajoutRetrait": {
        const retrait = r.type === "retrait" || (r.type === "ajoutRetrait" && impair);
        const t = entre(debut ? Math.max(2, Math.ceil(C / 2)) : Math.max(2, C - 3), C);
        if (!retrait && r.niveau === "GS" && tard && impair && t >= 4) {
          // « d'abord deux parties, puis éventuellement trois »
          const a = entre(1, t - 2), b = entre(1, t - a - 1);
          return { nombres: [a, b, t - a - b], sens: "ajout", type: r.type };
        }
        const b = entre(1, Math.min(t - 1, debut ? 2 : t - 1));
        return retrait ? { nombres: [t, b], sens: "retrait", type: r.type } : { nombres: [t - b, b], sens: "ajout", type: r.type };
      }
      case "complement": {
        const retrait = semaine >= 2 && impair;
        const t = entre(Math.max(2, C - 3), C);
        const d = entre(1, Math.min(t - 1, debut ? 3 : t - 1));
        return retrait ? { nombres: [t, t - d], sens: "retrait", type: "complement" } : { nombres: [t - d, t], sens: "ajout", type: "complement" };
      }
      case "comparaison": {
        const plus = !(semaine >= 2 && impair);
        const ecart = debut ? 2 : 4;
        if (plus) {
          const a = entre(2, C - 1);
          return { nombres: [a, entre(1, Math.min(ecart, C - a))], sens: "plus", type: "comparaison" };
        }
        const a = entre(2, C);
        return { nombres: [a, entre(1, Math.min(ecart, a - 1))], sens: "moins", type: "comparaison" };
      }
      case "piste": {
        const plusLoin = r.niveau === "MS" ? (semaine <= 1 ? 3 : 5) : 6;
        const recule = impair && semaine >= (r.niveau === "MS" ? 2 : 1);
        if (recule) {
          const a = entre(2, r.max);
          return { nombres: [a, entre(1, Math.min(plusLoin, a - 1))], sens: "recule", type: "piste" };
        }
        const a = entre(1, r.max - 1);
        return { nombres: [a, entre(1, Math.min(plusLoin, r.max - a))], sens: "avance", type: "piste" };
      }
      case "pisteDe": {
        const a = entre(1, r.max - 2);
        return { nombres: [a, a + entre(2, Math.min(debut ? 3 : 6, r.max - a))], sens: "avance", type: "pisteDe" };
      }
      case "groupements": {
        const groupesMax = r.niveau === "MS" ? 3 : semaine <= 1 ? 3 : 5;
        const parGroupeMax = r.niveau === "MS" ? (debut ? 2 : 3) : semaine <= 1 ? 3 : 5;
        for (let i = 0; i < 30; i++) {
          const g = entre(2, groupesMax), k = entre(debut ? 1 : 2, parGroupeMax);
          if (g * k <= C) return { nombres: [g, k], sens: "egal", type: "groupements" };
        }
        return { nombres: [2, 1], sens: "egal", type: "groupements" };
      }
      case "partage": {
        const avecReste = r.niveau === "GS" && semaine >= 2 && impair;
        for (let i = 0; i < 30; i++) {
          const g = entre(2, r.niveau === "MS" || semaine <= 1 ? 3 : 4), part = entre(2, r.niveau === "MS" ? 3 : 5);
          const reste = avecReste ? entre(1, g - 1) : 0;
          const t = g * part + reste;
          if (t <= C) return { nombres: [t, g], sens: "egal", type: "partage" };
        }
        return { nombres: [4, 2], sens: "egal", type: "partage" };
      }
      case "parts": {
        const avecReste = tard && impair;
        for (let i = 0; i < 30; i++) {
          const k = entre(2, semaine <= 1 ? 3 : 5), combien = entre(2, 5);
          const reste = avecReste ? entre(1, k - 1) : 0;
          const t = k * combien + reste;
          if (t <= C) return { nombres: [t, k], sens: "egal", type: "parts" };
        }
        return { nombres: [4, 2], sens: "egal", type: "parts" };
      }
    }
  };
  let essai = unEssai();
  for (let i = 0; i < 40 && vus.has(`${essai.sens}:${essai.nombres.join(",")}`); i++) essai = unEssai();
  vus.add(`${essai.sens}:${essai.nombres.join(",")}`);
  return essai;
}

/** Les situations des autres contextes : celles de la sorte de problème, sauf celle de référence et celle de l'enseignant. */
export const autresSituations = (r: Pick<ReglagesProbleme, "type" | "situation">): SituationId[] => {
  const autres = typeDe(r.type).situations.filter((s) => s !== r.situation && s !== "perso");
  return autres.length ? autres : [r.situation];
};

/** La période entière : une liste par semaine, un problème par jour. Le même tirage redonne la même période. */
export function problemesDeLaPeriode(r: ReglagesProbleme, alea: () => number): Probleme[][] {
  const modes = modesDeLaPeriode(r.semaines);
  const jours = joursDe(r.jours).length;
  const autres = autresSituations(r);
  return modes.map((mode, semaine) => {
    const vus = new Set<string>();
    return Array.from({ length: jours }, (_, jour) => {
      const rang = semaine * jours + jour;
      const situation = mode === "contextes" ? autres[jour % autres.length] : r.situation;
      const { nombres, sens, type } = tirer(r, semaine, jour, alea, vus);
      const personnage = typeDe(r.type).famille === "piste" ? PERSONNAGES[rang % PERSONNAGES.length] : undefined;
      return ecrire({ semaine, jour, mode, type, sens, situation, objet: rang, nombres, ...(personnage ? { personnage } : {}) }, r);
    });
  });
}

// ── Les images ────────────────────────────────────────────────────────────

/** Des images, par identifiant de pictogramme (ou « photo:… »). */
export type Images = Record<string | number, string>;

/** Les images d'une situation : le lieu, ceux qui reçoivent, les objets. */
const imagesDeLaSituation = (s: SituationPb): (number | string)[] =>
  [s.lieu?.picto, s.groupe?.picto, ...s.objets.map((o) => o.picto)].filter((x): x is number | string => x != null);

/** Les façons de chercher qu'on met en évidence, avec leur image ; certaines n'arrivent qu'avec l'âge. */
export interface Procedure { texte: string; picto?: number; doigts?: boolean; niveaux?: Niveau[] }

export const PROCEDURES: Record<Famille, Procedure[]> = {
  collection: [
    { texte: "Je fais avec les objets.", picto: P.toucher },
    { texte: "Je montre avec mes doigts.", doigts: true },
    { texte: "Je dessine les objets.", picto: P.dessiner, niveaux: ["MS", "GS"] },
    { texte: "Je compte tout, un par un.", picto: P.compter, niveaux: ["MS", "GS"] },
    { texte: "Je pars du nombre que je connais et je continue : « 4… 5, 6 ».", picto: P.compter, niveaux: ["GS"] },
    { texte: "Je le sais déjà : « 3 et 2, c'est 5 ».", picto: P.penser, niveaux: ["MS", "GS"] },
  ],
  piste: [
    { texte: "J'avance mon pion case par case, en comptant les sauts.", picto: P.avancer },
    { texte: "Je ne compte pas la case où je suis.", picto: P.pion },
    { texte: "Je pars du nombre de ma case et je dis la suite.", picto: P.compter, niveaux: ["GS"] },
    { texte: "Je le sais déjà : avancer de 2, c'est ajouter 2.", picto: P.penser },
  ],
  groupes: [
    { texte: "Je fais avec les objets.", picto: P.toucher },
    { texte: "Je distribue un par un, chacun son tour.", picto: P.distribuer },
    { texte: "Je distribue deux par deux.", picto: P.distribuer, niveaux: ["GS"] },
    { texte: "Je dessine les personnages et ce qu'ils reçoivent.", picto: P.dessiner },
    { texte: "J'essaie, puis je vérifie que chacun en a autant.", picto: P.penser },
  ],
};

export const proceduresPour = (f: Famille, niveau: Niveau) => PROCEDURES[f].filter((p) => !p.niveaux || p.niveaux.includes(niveau));

/** Les images que la feuille montre. */
export function idsDesImages(r: ReglagesProbleme): (number | string)[] {
  const s = situationDe(r.situation, r.perso);
  const ids = new Set<number | string>(imagesDeLaSituation(s));
  if (r.forme === "cartes" || r.forme === "recherche") for (const a of autresSituations(r)) imagesDeLaSituation(situationDe(a, r.perso)).forEach((x) => ids.add(x));
  if (r.forme === "affiche") proceduresPour(typeDe(r.type).famille, r.niveau).forEach((p) => p.picto && ids.add(p.picto));
  if (r.forme === "materiel" && typeDe(r.type).famille === "piste") imagesDeLaSituation(situationDe("grenouille")).forEach((x) => ids.add(x));
  return [...ids];
}

// ── Les feuilles ──────────────────────────────────────────────────────────

const ENCRE = "#1c2233";
const titre = (t: string, sous = "", ref = "") =>
  `<div class="titre">${escapeHtml(t)}</div>${sous || ref ? `<div class="sous">${escapeHtml(sous)}${ref ? ` ${reference(ref)}` : ""}</div>` : ""}`;
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** L'énoncé, ses nombres en gras : le maître les voit d'un coup d'œil en lisant. */
export const enonceHtml = (t: string) => escapeHtml(t).replace(/(\d+)/g, "<b>$1</b>");

const img = (images: Images, picto: number | string | null | undefined, mot: string, classe = "") =>
  picto != null && images[picto] ? `<img class="${classe}" src="${images[picto]}" alt="${escapeHtml(mot)}">` : "";

/** Les images d'un problème : le lieu ou ceux qui reçoivent, et l'objet du jour — jamais leur nombre. */
function imagesDuProbleme(p: Probleme, r: ReglagesProbleme, images: Images): string {
  const s = situationDe(p.situation, r.perso);
  const o = s.objets[p.objet % s.objets.length];
  const autre = s.groupe ?? s.lieu;
  return `<div class="pj-images">${img(images, autre?.picto, autre?.sing ?? "")}${img(images, o.picto, o.sing)}</div>`;
}

const jourDe = (p: Probleme, r: ReglagesProbleme) => `Semaine ${p.semaine + 1} · ${joursDe(r.jours)[p.jour]}`;

/** Le plan de la période, pour le maître : chaque semaine, ce qu'on manipule et les problèmes du jour en abrégé. */
function htmlPlan(r: ReglagesProbleme, periode: Probleme[][]): string {
  const t = typeDe(r.type);
  const s = situationDe(r.situation, r.perso);
  const jours = joursDe(r.jours);
  const lignes = periode.map((semaine, i) => `<tr><th><b>Semaine ${i + 1}</b><span>${escapeHtml(NOMS_DES_MODES[semaine[0].mode])}</span></th>${semaine.map((p) =>
    `<td>${escapeHtml(p.calcul)} <span class="corrige">→ ${escapeHtml(p.resultat)}</span>${p.situation !== r.situation ? `<i>${escapeHtml(situationDe(p.situation, r.perso).nom)}</i>` : ""}</td>`).join("")}</tr>`).join("");
  return `<div class="page">${titre(`Le problème du jour — ${t.nom}`, `${s.nom} · ${r.niveau} · ${r.semaines} semaines, ${jours.length} jours par semaine, jusqu'à ${r.max}.`, `D'après ${t.source}.`)}`
    + `<table class="pj-plan"><thead><tr><th></th>${jours.map((j) => `<th>${escapeHtml(majuscule(j))}</th>`).join("")}</tr></thead><tbody>${lignes}</tbody></table>`
    + `<div class="pj-semaines">${modesDeLaPeriode(r.semaines).map((m, i) => `<p><b>Semaine ${i + 1} — ${escapeHtml(NOMS_DES_MODES[m])}.</b> ${escapeHtml(quoiDuMode(m, t.famille))}</p>`).join("")}</div></div>`;
}

/** Une carte du jour : quand, ce qu'on manipule, les images de la situation, l'énoncé, la réponse pour le maître. */
function carteDuJour(p: Probleme, r: ReglagesProbleme, images: Images): string {
  return carte(`<div class="pj-tete"><b>${escapeHtml(jourDe(p, r))}</b><span>${escapeHtml(NOMS_DES_MODES[p.mode])}</span></div>`
    + imagesDuProbleme(p, r, images)
    + `<div class="pj-enonce">${enonceHtml(p.enonce)}</div>`
    + `<div class="pj-reponse corrige">Réponse : ${escapeHtml(p.reponse)}</div>`, "pj-carte");
}

const CARTES: FormatGrille = { colonnes: 2, lignes: 3, hauteurMm: 76 };

function htmlCartes(r: ReglagesProbleme, images: Images, periode: Probleme[][]): string {
  const semaines = r.semaine > 0 ? [periode[r.semaine - 1]].filter(Boolean) : periode;
  const pages = semaines.map((semaine) => {
    const mode = semaine[0].mode;
    const entete = `${titre(`Semaine ${semaine[0].semaine + 1} — ${NOMS_DES_MODES[mode]}`, quoiDuMode(mode, typeDe(r.type).famille))}`;
    return pagesDeCartes(semaine.map((p) => carteDuJour(p, r, images)), CARTES, entete);
  }).join("");
  return (r.semaine > 0 ? "" : htmlPlan(r, periode)) + pages;
}

/** L'affiche : la situation en grand, le premier problème, et les façons de chercher. */
function htmlAffiche(r: ReglagesProbleme, images: Images, periode: Probleme[][]): string {
  const t = typeDe(r.type);
  const s = situationDe(r.situation, r.perso);
  const premier = periode[0]?.[0];
  const procedures = proceduresPour(t.famille, r.niveau).map((p) =>
    `<li>${p.doigts ? doigtsSvg(3) : p.picto ? img(images, p.picto, p.texte) : ""}<span>${escapeHtml(p.texte)}</span></li>`).join("");
  const grand = s.groupe ?? s.lieu;
  const objets = s.objets.map((o) => img(images, o.picto, o.sing)).join("");
  return `<div class="page pj-affiche"><div class="pj-affiche-titre">${escapeHtml(s.nom)}</div>`
    + `<div class="pj-affiche-images">${grand ? img(images, grand.picto, grand.sing, "pj-grand") : ""}<div class="pj-affiche-objets n${s.objets.length}">${objets}</div></div>`
    + (premier ? `<div class="pj-affiche-probleme"><b>Notre problème</b>${enonceHtml(premier.enonce)}</div>` : "")
    + `<div class="pj-affiche-sous">Pour trouver :</div><ul class="pj-procedures">${procedures}</ul>`
    + `<div class="sous">${escapeHtml(t.nom)} · ${r.niveau}. ${reference(`D'après ${t.source}.`)}</div></div>`;
}

/** Une piste rectiligne, de 1 à `max` : une case par nombre, assez grande pour un pion. */
function piste(max: number): string {
  const largeur = Math.min(17, Math.floor(160 / max));
  return `<div class="pj-piste">${Array.from({ length: max }, (_, i) => `<div style="width:${largeur}mm">${i + 1}</div>`).join("")}</div>`;
}

const IMAGES_A_DECOUPER: FormatGrille = { colonnes: 5, lignes: 7, hauteurMm: 33, carre: true };

/** Le matériel à découper : les images de la situation, autant qu'il en faut ; la piste et ses pions. */
function htmlMateriel(r: ReglagesProbleme, images: Images): string {
  const t = typeDe(r.type);
  const s = situationDe(r.situation, r.perso);
  if (t.famille === "piste") {
    const pions = [P.pion, P.grenouille].flatMap((id) => Array.from({ length: 5 }, () => carte(img(images, id, ""), "pj-pion")));
    return `<div class="page">${titre(`La piste, de 1 à ${r.max}`, "Une piste par groupe ; la même en grand au sol, ou au tableau. Les pions et les grenouilles à découper.")}`
      + Array.from({ length: 4 }, () => piste(r.max)).join("")
      + `<div class="grille pj-pions" style="grid-template-columns: repeat(5, 30mm); grid-auto-rows: 30mm; justify-content: center">${pions.join("")}</div></div>`;
  }
  const cellules: string[] = [];
  // Les objets : de quoi faire le plus grand nombre de la période, et un de plus pour ne pas tout donner.
  for (const o of s.objets) for (let i = 0; i <= r.max; i++) cellules.push(carte(img(images, o.picto, o.sing), "pj-objet"));
  // Ceux qui reçoivent : jusqu'à cinq jongleurs, cinq boîtes, cinq poupées.
  if (s.groupe) for (let i = 0; i < Math.min(5, r.max); i++) cellules.push(carte(img(images, s.groupe.picto, s.groupe.sing), "pj-objet"));
  const entete = titre(`Le matériel à découper — ${s.nom}`, "Pour la semaine où les images remplacent les objets.");
  if (!s.lieu || t.famille !== "collection") return pagesDeCartes(cellules, IMAGES_A_DECOUPER, entete);
  return `<div class="page">${entete}<div class="pj-lieu">${img(images, s.lieu.picto, s.lieu.sing)}</div></div>`
    + pagesDeCartes(cellules, IMAGES_A_DECOUPER);
}

/** Des points en désordre, qui ne se touchent pas : le nombre qu'on ne reconnaît qu'en comptant. */
function desordreSvg(k: number, graine: number): string {
  let x = graine * 9301 + 49297;
  const alea = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const points: [number, number][] = [];
  for (let essai = 0; points.length < k && essai < 400; essai++) {
    const p: [number, number] = [12 + alea() * 76, 12 + alea() * 56];
    if (points.every(([a, b]) => Math.hypot(a - p[0], b - p[1]) > 17)) points.push(p);
  }
  return `<svg class="pj-desordre" viewBox="0 0 100 80">${points.map(([a, b]) => `<circle cx="${a.toFixed(1)}" cy="${b.toFixed(1)}" r="6.5" fill="${ENCRE}"/>`).join("")}</svg>`;
}

const ETIQUETTES: FormatGrille = { colonnes: 2, lignes: 4, hauteurMm: 56 };

/** Les étiquettes des boîtes à nombres : chaque nombre sous toutes ses formes ; et celle de la boîte à problèmes. */
function htmlEtiquettes(r: ReglagesProbleme, images: Images): string {
  const s = situationDe(r.situation, r.perso);
  const o = s.objets[0];
  const plusGrand = typeDe(r.type).famille === "piste" ? Math.min(r.max, 10) : r.max;
  const cellules = Array.from({ length: plusGrand }, (_, i) => {
    const k = i + 1;
    const figures = Array.from({ length: k }, () => img(images, o.picto, "")).join("");
    return carte(`<div class="pj-ligne"><div class="pj-chiffre">${k}</div>${pointsSvg(k)}${desordreSvg(k, k)}</div><div class="pj-figures">${figures}</div>`, "pj-etiquette");
  });
  const deux = [s.groupe ?? s.lieu, o].filter((x): x is ObjetPb => Boolean(x)).map((x) => img(images, x.picto, x.sing)).join("");
  cellules.push(carte(`<div class="pj-boite-titre">La boîte à problèmes</div><div class="pj-boite-images">${deux}</div>`, "pj-etiquette pj-boite"));
  return pagesDeCartes(cellules, ETIQUETTES, titre("Les étiquettes des boîtes à nombres", `De 1 à ${plusGrand} : le chiffre, la constellation, des points en désordre et des images. La dernière va sur la boîte à problèmes.`));
}

/** La feuille de recherche : la place pour dessiner, puis la réponse. Deux par page. */
function htmlRecherche(r: ReglagesProbleme, images: Images, periode: Probleme[][]): string {
  const semaines = periode.filter((semaine) => semaine[0].mode === "tete");
  const problemes = (semaines.length ? semaines : periode.slice(-1)).flat();
  const feuilles = problemes.map((p) => `<div class="pj-recherche"><div class="pj-r-tete"><div>Prénom : ……………………………</div><span>${escapeHtml(jourDe(p, r))}</span></div>`
    + `<div class="pj-r-enonce">${imagesDuProbleme(p, r, images)}<p>${enonceHtml(p.enonce)}</p></div>`
    + `<div class="pj-r-cadre"><span>Je dessine pour chercher.</span></div>`
    + `<div class="pj-r-fin"><span>Je trouve :</span><div class="pj-r-case"></div></div></div>`);
  const pages: string[] = [];
  for (let i = 0; i < feuilles.length; i += 2) pages.push(`<div class="page pj-recherches">${feuilles.slice(i, i + 2).join("")}</div>`);
  // Les réponses, pour le maître seul : une page à part, que la case « correction » retire.
  const reponses = `<div class="page corrige">${titre("La feuille de recherche — les réponses")}<ol class="pj-reponses">${problemes.map((p) =>
    `<li><b>${escapeHtml(jourDe(p, r))}</b> : ${escapeHtml(p.reponse)}</li>`).join("")}</ol></div>`;
  return pages.join("") + reponses;
}

/** Ce qu'on observe, d'après les grilles des livrets : la compréhension, puis la procédure. */
export const OBSERVABLES: Record<TypeDeProbleme, (r: ReglagesProbleme) => string[]> = {
  ajout: (r) => ["Comprend ce qui se passe : on ajoute", "Voit d'un coup d'œil 1, 2, 3", `Connaît les nombres jusqu'à ${r.max}`, "S'aide de ses doigts", "Connaît des décompositions : 2 et 1…"],
  retrait: (r) => ["Comprend ce qui se passe : on enlève", "Voit d'un coup d'œil 1, 2, 3", `Connaît les nombres jusqu'à ${r.max}`, "S'aide de ses doigts", "Connaît des décompositions : 3, c'est 2 et 1…"],
  ajoutRetrait: (r) => ["Sait si l'on ajoute ou si l'on enlève", "Voit d'un coup d'œil de petites quantités", `Connaît les nombres jusqu'à ${r.max}`, "S'aide de ses doigts ou d'un dessin", "Connaît des décompositions"],
  complement: () => ["Comprend la question : combien en plus, en moins", "Cherche avec les objets ou un dessin", "Compte à partir du premier nombre", "Trouve combien on a ajouté ou enlevé", "Explique comment il a trouvé"],
  comparaison: () => ["Comprend « de plus », « de moins »", "Fait les deux collections", "Trouve le nombre cherché", "S'aide d'un dessin ou de ses doigts", "Explique comment il a trouvé"],
  piste: () => ["Avance ou recule du bon nombre de cases", "Ne compte pas la case de départ", "Dit la case d'arrivée avant de jouer", "Avancer, c'est ajouter ; reculer, c'est enlever", "Explique comment il a trouvé"],
  pisteDe: () => ["Comprend qu'on cherche le déplacement", "Compte les cases à parcourir", "Trouve le nombre du dé", "Vérifie en jouant", "Explique comment il a trouvé"],
  groupements: () => ["Comprend : autant pour chacun", "Fait avec les objets, un dessin ou ses doigts", "Trouve le nombre total", "Compte de 2 en 2 ou s'appuie sur ce qu'il sait", "Explique comment il a trouvé"],
  partage: (r) => ["Distribue de façon équitable", "Choisit une procédure adaptée : un par un, deux par deux, essais", "Trouve la part de chacun", r.niveau === "GS" ? "Sait dire ce qui reste" : "Vérifie que chacun en a autant", "Explique comment il a trouvé"],
  parts: () => ["Fait des groupes de la bonne taille", "Trouve le nombre de groupes", "Sait dire ce qui reste", "Vérifie en comptant", "Explique comment il a trouvé"],
};

function htmlGrille(r: ReglagesProbleme): string {
  const t = typeDe(r.type);
  const age = NIVEAUX.find((x) => x.id === r.niveau)?.age ?? "";
  const colonnes = OBSERVABLES[r.type](r);
  const ligne = `<tr><td></td>${colonnes.map(() => "<td></td>").join("")}<td></td></tr>`;
  return `<div class="page">${titre(`Grille d'observation — ${t.nom}`, `Utiliser les nombres pour résoudre des problèmes · ${r.niveau}, ${age}.`, `D'après ${t.source}.`)}`
    + `<table class="pj-grille"><thead><tr><th>Prénom</th>${colonnes.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}<th>Procédure</th></tr></thead>`
    + `<tbody>${Array.from({ length: 12 }, () => ligne).join("")}</tbody></table>`
    + `<div class="sous pj-pied">✓ réussi · ~ en cours · ✗ pas encore. Procédure : O avec les objets · D avec les doigts · Ds en dessinant · C en comptant tout · S en comptant à partir d'un nombre · M en le sachant. `
    + `Observer pendant la dernière semaine, chacun son tour, le matériel à portée de main pour vérifier.</div></div>`;
}

/** La feuille de la forme choisie, avec ses images ; `alea` tire les nombres de la période. */
export function htmlProblemeDuJour(r: ReglagesProbleme, images: Images, alea: () => number): string {
  const periode = problemesDeLaPeriode(r, alea);
  const corps = {
    cartes: () => htmlCartes(r, images, periode),
    affiche: () => htmlAffiche(r, images, periode),
    materiel: () => htmlMateriel(r, images),
    etiquettes: () => htmlEtiquettes(r, images),
    recherche: () => htmlRecherche(r, images, periode),
    grille: () => htmlGrille(r),
  }[r.forme]();
  const montrees = r.forme === "grille" ? [] : idsDesImages(r).filter((id) => images[id]);
  return feuille(`${corps}${attributionPour(montrees.filter((id): id is number => typeof id === "number"))}`, "pj");
}

export const STYLE_PROBLEME_DU_JOUR = `
  .feuille.pj .pj-plan { width: 100%; border-collapse: collapse; font-size: 12px; margin: 2mm 0 5mm; }
  .feuille.pj .pj-plan th, .feuille.pj .pj-plan td { border: 1px solid #9aa0b4; padding: 2mm; vertical-align: top; text-align: left; }
  .feuille.pj .pj-plan thead th { background: #f2f4f8; }
  .feuille.pj .pj-plan tbody th { width: 34mm; font-weight: 400; }
  .feuille.pj .pj-plan tbody th b, .feuille.pj .pj-plan tbody th span { display: block; }
  .feuille.pj .pj-plan tbody th span { font-size: 10.5px; color: #687087; }
  .feuille.pj .pj-plan td { font-size: 13px; font-weight: 700; }
  .feuille.pj .pj-plan td .corrige { font-weight: 400; color: #687087; }
  .feuille.pj .pj-plan td i { display: block; font-size: 10px; font-weight: 400; color: #687087; font-style: normal; }
  .feuille.pj .pj-semaines p { font-size: 12px; line-height: 1.5; margin: 0 0 2mm; }
  .feuille.pj .pj-carte { justify-content: flex-start; align-items: stretch; text-align: left; gap: 2mm; padding: 4mm; }
  .feuille.pj .pj-tete { display: flex; justify-content: space-between; gap: 2mm; font-size: 10.5px; color: #687087; }
  .feuille.pj .pj-tete b { color: ${ENCRE}; }
  .feuille.pj .pj-images { display: flex; gap: 3mm; justify-content: center; }
  .feuille.pj .pj-images img { width: 17mm; height: 17mm; max-width: none; object-fit: contain; margin: 0; flex: none; }
  .feuille.pj .pj-enonce { font-size: 14px; line-height: 1.45; }
  .feuille.pj .pj-reponse { margin-top: auto; font-size: 11.5px; color: #687087; border-top: 1px solid #e3e6ee; padding-top: 1.5mm; }
  .feuille.pj .pj-affiche { text-align: center; }
  .feuille.pj .pj-affiche-titre { font-size: 32px; font-weight: 800; margin: 0 0 4mm; }
  .feuille.pj .pj-affiche-images { display: flex; justify-content: center; align-items: center; gap: 8mm; margin: 0 0 5mm; }
  .feuille.pj .pj-affiche-images img { object-fit: contain; margin: 0; max-width: none; }
  .feuille.pj .pj-affiche-images .pj-grand { width: 50mm; height: 50mm; }
  .feuille.pj .pj-affiche-objets { display: grid; grid-template-columns: repeat(2, auto); gap: 3mm; }
  .feuille.pj .pj-affiche-objets.n1 { grid-template-columns: auto; }
  .feuille.pj .pj-affiche-objets img { width: 23mm; height: 23mm; }
  .feuille.pj .pj-affiche-objets.n1 img { width: 50mm; height: 50mm; }
  .feuille.pj .pj-affiche-probleme { font-size: 19px; line-height: 1.45; border: 0.8mm solid ${ENCRE}; border-radius: 4mm; padding: 3mm 6mm; margin: 0 6mm 5mm; text-align: left; }
  .feuille.pj .pj-affiche-probleme b:first-child { display: block; font-size: 13px; color: #687087; margin-bottom: 1mm; }
  .feuille.pj .pj-affiche-sous { font-size: 18px; font-weight: 800; text-align: left; margin: 0 6mm 3mm; }
  .feuille.pj .pj-procedures { list-style: none; padding: 0; margin: 0 6mm 4mm; display: grid; gap: 2.5mm; text-align: left; }
  .feuille.pj .pj-procedures li { display: flex; align-items: center; gap: 5mm; font-size: 17px; border: 1px solid #cfd4e2; border-radius: 3mm; padding: 1.5mm 4mm; break-inside: avoid; }
  .feuille.pj .pj-procedures img, .feuille.pj .pj-procedures svg { width: 15mm; height: 15mm; object-fit: contain; margin: 0; flex: none; }
  .feuille.pj .pj-piste { display: flex; border: 0.7mm solid ${ENCRE}; border-radius: 2mm; overflow: hidden; height: 22mm; width: max-content; margin: 0 auto 6mm; }
  .feuille.pj .pj-piste div { display: flex; align-items: flex-end; justify-content: center; padding-bottom: 1.5mm; font-size: 18px; font-weight: 800; box-sizing: border-box; }
  .feuille.pj .pj-piste div + div { border-left: 0.5mm solid ${ENCRE}; }
  .feuille.pj .pj-pions { margin-top: 4mm; }
  .feuille.pj .pj-pion img, .feuille.pj .pj-objet img { max-width: 26mm; }
  .feuille.pj .pj-lieu { display: flex; justify-content: center; margin: 6mm 0; }
  .feuille.pj .pj-lieu img { width: 150mm; height: 150mm; object-fit: contain; margin: 0; }
  .feuille.pj .pj-etiquette { gap: 3mm; padding: 3mm 4mm; }
  .feuille.pj .pj-ligne { display: flex; align-items: center; justify-content: center; gap: 4mm; }
  .feuille.pj .pj-chiffre { font-size: 54px; font-weight: 800; line-height: 1; min-width: 16mm; text-align: center; }
  .feuille.pj .pj-ligne svg { height: 18mm; width: auto; display: block; flex: none; }
  .feuille.pj .pj-ligne svg.cl-deux { height: 12mm; }
  .feuille.pj .pj-figures { display: grid; grid-template-columns: repeat(5, 9mm); gap: 1mm; align-content: center; }
  .feuille.pj .pj-figures img { width: 9mm; height: 9mm; max-width: none; object-fit: contain; margin: 0; }
  .feuille.pj .pj-boite { flex-direction: column; }
  .feuille.pj .pj-boite-titre { font-size: 22px; font-weight: 800; }
  .feuille.pj .pj-boite-images { display: flex; gap: 4mm; }
  .feuille.pj .pj-boite-images img { width: 24mm; height: 24mm; max-width: none; object-fit: contain; margin: 0; }
  .feuille.pj .pj-recherches { display: flex; flex-direction: column; gap: 6mm; }
  .feuille.pj .pj-recherche { height: 120mm; box-sizing: border-box; border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 4mm; display: flex; flex-direction: column; gap: 2.5mm; overflow: hidden; }
  .feuille.pj .pj-r-tete { display: flex; justify-content: space-between; font-size: 11px; color: #687087; }
  .feuille.pj .pj-r-enonce { display: flex; align-items: center; gap: 4mm; }
  .feuille.pj .pj-r-enonce .pj-images img { width: 14mm; height: 14mm; }
  .feuille.pj .pj-r-enonce p { margin: 0; font-size: 12.5px; line-height: 1.4; }
  .feuille.pj .pj-r-cadre { flex: 1; border: 0.7mm solid ${ENCRE}; border-radius: 3mm; padding: 2mm 3mm; }
  .feuille.pj .pj-r-cadre span, .feuille.pj .pj-r-fin > span:first-child { font-size: 13px; font-weight: 700; }
  .feuille.pj .pj-r-fin { display: flex; align-items: center; gap: 4mm; }
  .feuille.pj .pj-r-case { width: 24mm; height: 16mm; border: 0.7mm solid ${ENCRE}; border-radius: 2mm; }
  .feuille.pj .pj-reponses { font-size: 13px; line-height: 1.7; }
  .feuille.pj .pj-grille { width: 100%; border-collapse: collapse; font-size: 11px; }
  .feuille.pj .pj-grille th, .feuille.pj .pj-grille td { border: 1px solid #9aa0b4; padding: 1.5mm; vertical-align: top; }
  .feuille.pj .pj-grille th { background: #f2f4f8; text-align: left; }
  .feuille.pj .pj-grille td { height: 11mm; }
  .feuille.pj .pj-grille th:first-child { width: 28mm; }
  .feuille.pj .pj-pied { margin-top: 3mm; }
`;
