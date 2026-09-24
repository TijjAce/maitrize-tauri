// ── Les projets de classe, mois par mois ──────────────────────────────────
//
// Un projet tient une classe debout : il donne une raison aux séances, un
// horizon aux élèves, et de quoi raconter l'année aux familles. Mais il se
// décide en septembre pour l'année, ou un dimanche soir pour le mois — et
// c'est là qu'on sèche.
//
// D'où ce catalogue : des projets qui se mènent vraiment, rangés par le mois
// qui leur va, avec leurs étapes. On en prend un, il devient le sien, et l'on
// coche. Rien n'oblige à suivre la liste : un projet s'écrit aussi de zéro.

import { newId, nowIso, type ProjetClasse } from "./api";

export type { ProjetClasse };

/**
 * Les mois de l'année scolaire, dans l'ordre où on les vit.
 *
 * L'abrégé est celui de l'usage — « sept. », « avr. » —, pas les quatre
 * premières lettres, qui donnaient « Octo » et « Déce ».
 */
export const MOIS: { num: string; nom: string; abrege: string }[] = [
  { num: "09", nom: "Septembre", abrege: "sept." }, { num: "10", nom: "Octobre", abrege: "oct." },
  { num: "11", nom: "Novembre", abrege: "nov." }, { num: "12", nom: "Décembre", abrege: "déc." },
  { num: "01", nom: "Janvier", abrege: "janv." }, { num: "02", nom: "Février", abrege: "févr." },
  { num: "03", nom: "Mars", abrege: "mars" }, { num: "04", nom: "Avril", abrege: "avr." },
  { num: "05", nom: "Mai", abrege: "mai" }, { num: "06", nom: "Juin", abrege: "juin" },
];

/** Une idée du catalogue : ce qu'on propose, pas ce qu'on impose. */
export interface IdeeProjet {
  id: string;
  mois: string;
  titre: string;
  /** Ce que c'est, en une phrase qu'on peut dire aux élèves. */
  pitch: string;
  domaines: string[];
  etapes: string[];
}

/** Une étape d'un projet mené : on la coche, on la déplace, on la réécrit. */
export interface Etape { texte: string; faite: boolean }

export type Etat = "idee" | "encours" | "fait";

export const ETATS: { id: Etat; nom: string }[] = [
  { id: "idee", nom: "À faire" },
  { id: "encours", nom: "En cours" },
  { id: "fait", nom: "Terminé" },
];

// ── Le catalogue ──────────────────────────────────────────────────────────
//
// Trois par mois, de septembre à juin. Chacun se mène en classe ordinaire
// comme en IME : c'est le niveau d'exigence qui change, pas le projet. Les
// étapes sont écrites pour être cochées, donc au présent et au concret.

export const CATALOGUE: IdeeProjet[] = [
  // ── Septembre : se connaître, poser le cadre ──
  { id: "p-portraits", mois: "09", titre: "Qui suis-je ?",
    pitch: "Chacun fabrique son portrait — photo, prénom, ce qu'il aime — et la porte de la classe accueille tout le monde.",
    domaines: ["Langage oral", "Arts", "Vivre ensemble"],
    etapes: ["Photographier chaque élève", "Dicter ou écrire trois choses que j'aime",
      "Fabriquer le portrait (découpage, collage)", "Afficher et présenter le sien au groupe"] },
  { id: "p-regles", mois: "09", titre: "Les règles de la classe",
    pitch: "On écrit ensemble ce qui permet de bien travailler, plutôt que de lire une liste affichée d'avance.",
    domaines: ["EMC", "Langage oral"],
    etapes: ["Lister ce qui gêne et ce qui aide, en groupe", "Choisir cinq règles, pas plus",
      "Illustrer chaque règle par une photo mise en scène", "Signer l'affiche et la relire chaque lundi"] },
  { id: "p-bibliotheque", mois: "09", titre: "Notre coin lecture",
    pitch: "Installer, ranger et faire vivre la bibliothèque de la classe — et devenir celui qui la tient.",
    domaines: ["Lecture", "Tri et classement", "Autonomie"],
    etapes: ["Trier les livres par genre ou par couleur", "Fabriquer les étiquettes des bacs",
      "Écrire la règle d'emprunt", "Tenir le cahier d'emprunt à tour de rôle"] },

  // ── Octobre : l'automne, le goût ──
  { id: "p-cueillette", mois: "10", titre: "La cueillette d'automne",
    pitch: "Une sortie, un sac, et tout ce qu'on rapporte devient un herbier et un coin nature.",
    domaines: ["Sciences", "Vocabulaire", "Motricité fine"],
    etapes: ["Préparer la sortie : où, quoi ramasser, avec quoi", "Ramasser feuilles, glands, marrons",
      "Trier par forme, par couleur, par arbre", "Coller et nommer dans l'herbier de la classe"] },
  { id: "p-soupe", mois: "10", titre: "La soupe de la classe",
    pitch: "De la liste de courses au bol partagé : peser, éplucher, cuire, goûter.",
    domaines: ["Mesures", "Lecture de consigne", "Autonomie"],
    etapes: ["Lire la recette en images", "Écrire la liste de courses et l'acheter",
      "Peser, éplucher, couper", "Cuisiner, servir et goûter ensemble"] },
  { id: "p-emotions", mois: "10", titre: "L'imagier des émotions",
    pitch: "Photographier les visages de la classe pour dire ce qu'on ressent avec autre chose qu'un cri.",
    domaines: ["EMC", "Langage oral", "Arts"],
    etapes: ["Nommer les émotions, une par une", "Mimer et photographier chaque émotion",
      "Fabriquer l'imagier et la roue des émotions", "S'en servir chaque matin à l'accueil"] },

  // ── Novembre : le temps, la trace ──
  { id: "p-souvenirs", mois: "11", titre: "La boîte à souvenirs",
    pitch: "Chaque semaine, la classe choisit une trace à garder — et en juin, on ouvre la boîte.",
    domaines: ["Se repérer dans le temps", "Écrit", "Mémoire"],
    etapes: ["Décorer la boîte", "Choisir une trace chaque vendredi",
      "Dicter la légende qui l'accompagne", "Relire les traces du mois écoulé"] },
  { id: "p-semis", mois: "11", titre: "Le jardin d'intérieur",
    pitch: "Des semis sur le rebord de la fenêtre : arroser, observer, mesurer, et voir que ça pousse.",
    domaines: ["Sciences", "Mesures", "Responsabilité"],
    etapes: ["Semer lentilles, blé ou jacinthes", "Tenir le tour d'arrosage",
      "Mesurer et noter chaque semaine", "Comparer les pousses selon la lumière"] },
  { id: "p-correspondance", mois: "11", titre: "Une classe correspondante",
    pitch: "Écrire à une autre classe, attendre la réponse, et découvrir qu'on écrit pour être lu.",
    domaines: ["Écrit", "Géographie", "Vivre ensemble"],
    etapes: ["Trouver la classe et se présenter", "Écrire la première lettre collective",
      "Préparer un colis (photos, dessins)", "Lire et répondre à ce qui arrive"] },

  // ── Décembre : fabriquer, offrir ──
  { id: "p-marche", mois: "12", titre: "Le petit marché de Noël",
    pitch: "Fabriquer, afficher les prix, vendre aux familles et compter la recette.",
    domaines: ["Monnaie", "Fabrication", "Langage oral"],
    etapes: ["Choisir et fabriquer les objets", "Fixer et écrire les prix",
      "Préparer le stand et l'affiche", "Vendre, rendre la monnaie, compter la caisse"] },
  { id: "p-avent", mois: "12", titre: "Le calendrier des défis",
    pitch: "Chaque jour, une enveloppe : un défi coopératif à relever en dix minutes.",
    domaines: ["EMC", "Motricité", "Coopération"],
    etapes: ["Écrire vingt-quatre défis avec les élèves", "Fabriquer et numéroter les enveloppes",
      "Ouvrir et relever le défi du jour", "Noter les défis réussis"] },
  { id: "p-spectacle", mois: "12", titre: "Un moment pour les familles",
    pitch: "Trois chants, une danse, et le trac : préparer quelque chose à offrir.",
    domaines: ["Musique", "Langage oral", "EPS"],
    etapes: ["Choisir les chants avec la classe", "Répéter chaque jour, dix minutes",
      "Fabriquer les invitations", "Jouer devant les familles"] },

  // ── Janvier : l'hiver, les nombres ──
  { id: "p-oiseaux", mois: "01", titre: "Les oiseaux de l'hiver",
    pitch: "Une mangeoire à la fenêtre, et le comptage des visiteurs chaque matin.",
    domaines: ["Sciences", "Dénombrement", "Observation"],
    etapes: ["Fabriquer la mangeoire et la garnir", "Apprendre à reconnaître cinq oiseaux",
      "Compter et noter les visites chaque jour", "Faire le tableau du mois"] },
  { id: "p-galette", mois: "01", titre: "La galette à partager",
    pitch: "Une recette, un partage en parts égales, et la couronne à fabriquer.",
    domaines: ["Mathématiques", "Cuisine", "Arts"],
    etapes: ["Lire la recette et acheter", "Préparer et cuire la galette",
      "Partager en autant de parts qu'il y a d'élèves", "Fabriquer et offrir la couronne"] },
  { id: "p-voeux", mois: "01", titre: "Les cartes de vœux",
    pitch: "Écrire à quelqu'un qu'on aime, mettre l'adresse, et poster soi-même.",
    domaines: ["Écrit", "Geste graphique", "Autonomie"],
    etapes: ["Choisir à qui écrire", "Fabriquer la carte", "Copier l'adresse sur l'enveloppe",
      "Aller à la boîte aux lettres"] },

  // ── Février : le corps ──
  { id: "p-parcours", mois: "02", titre: "Le parcours de motricité",
    pitch: "Les élèves conçoivent le parcours, le dessinent, le montent, puis le font passer aux autres.",
    domaines: ["EPS", "Repérage dans l'espace", "Langage oral"],
    etapes: ["Dessiner le parcours sur un plan", "Installer le matériel comme sur le plan",
      "Expliquer les règles aux autres", "Chronométrer et améliorer"] },
  { id: "p-corps", mois: "02", titre: "Mon corps, mon squelette",
    pitch: "Nommer ce qu'on a sous la peau, tracer sa silhouette en vrai, et prendre soin de soi.",
    domaines: ["Sciences", "Vocabulaire", "Santé"],
    etapes: ["Tracer la silhouette de chacun au sol", "Nommer et placer les parties du corps",
      "Observer un squelette ou une radio", "Parler du sommeil et des repas"] },
  { id: "p-carnaval", mois: "02", titre: "Le carnaval",
    pitch: "Fabriquer son masque, défiler dans l'école, et se voir autrement.",
    domaines: ["Arts", "Langage oral", "Vivre ensemble"],
    etapes: ["Choisir son personnage", "Fabriquer masque et costume",
      "Préparer le défilé", "Défiler et photographier"] },

  // ── Mars : le printemps, le vivant ──
  { id: "p-bulbe", mois: "03", titre: "Du bulbe à la fleur",
    pitch: "Planter, mesurer chaque semaine, photographier, et voir le temps passer sur une tige.",
    domaines: ["Sciences", "Mesures", "Patience"],
    etapes: ["Planter les bulbes en pot", "Mesurer et photographier chaque semaine",
      "Tenir le graphique de croissance", "Offrir la fleur ou la replanter dehors"] },
  { id: "p-sortie", mois: "03", titre: "Préparer une sortie",
    pitch: "La ferme, le musée, la médiathèque : ce sont les élèves qui préparent, pas seulement qui suivent.",
    domaines: ["Autonomie", "Langage oral", "Se repérer"],
    etapes: ["Choisir le lieu et regarder le trajet", "Écrire les questions à poser",
      "Préparer le sac et les règles du groupe", "Raconter la sortie au retour"] },
  { id: "p-metiers", mois: "03", titre: "Les métiers autour de nous",
    pitch: "Faire venir quelqu'un qui travaille, l'interroger, et comprendre à quoi mènent les apprentissages.",
    domaines: ["EMC", "Langage oral", "Orientation"],
    etapes: ["Lister les métiers qu'on connaît", "Inviter une personne et préparer l'interview",
      "Mener l'entretien et l'enregistrer", "Afficher la fiche du métier"] },

  // ── Avril : raconter ──
  { id: "p-livre", mois: "04", titre: "Le livre de la classe",
    pitch: "Une histoire écrite et illustrée par tous, imprimée pour de vrai, empruntée par les familles.",
    domaines: ["Production d'écrit", "Arts", "Lecture"],
    etapes: ["Inventer l'histoire en dictée à l'adulte", "Découper l'histoire en pages",
      "Illustrer chaque page", "Imprimer, relier et lire aux autres classes"] },
  { id: "p-ombres", mois: "04", titre: "Le théâtre d'ombres",
    pitch: "Un album connu, des silhouettes en carton, un drap et une lampe.",
    domaines: ["Arts", "Langage oral", "Coopération"],
    etapes: ["Choisir l'album et le résumer", "Fabriquer les silhouettes",
      "Répéter derrière le drap", "Jouer devant une autre classe"] },
  { id: "p-marchande", mois: "04", titre: "La marchande",
    pitch: "Un vrai coin marchand dans la classe : étiqueter, acheter, payer, rendre la monnaie.",
    domaines: ["Monnaie", "Langage oral", "Autonomie"],
    etapes: ["Installer le coin et étiqueter les produits", "Fabriquer la monnaie",
      "Jouer les rôles à tour de rôle", "Aller acheter pour de vrai au commerce du coin"] },

  // ── Mai : dehors ──
  { id: "p-quartier", mois: "05", titre: "Le plan du quartier",
    pitch: "Sortir, repérer, photographier, puis fabriquer la maquette de ce qu'on a vu.",
    domaines: ["Se repérer dans l'espace", "Motricité fine", "Vocabulaire"],
    etapes: ["Marcher dans le quartier et photographier", "Repérer les lieux sur un plan",
      "Fabriquer la maquette en volume", "Y placer l'école, la boulangerie, l'arrêt de bus"] },
  { id: "p-transports", mois: "05", titre: "Prendre le bus",
    pitch: "Lire un horaire, reconnaître sa ligne, valider son titre : une compétence pour la vie.",
    domaines: ["Autonomie", "Lecture", "Mathématiques"],
    etapes: ["Regarder les lignes et les arrêts", "Lire l'horaire et choisir le départ",
      "Faire le trajet en groupe", "Refaire le trajet en petits groupes"] },
  { id: "p-exposition", mois: "05", titre: "L'exposition de la classe",
    pitch: "Accrocher ce qu'on a produit toute l'année et accueillir les visiteurs comme au musée.",
    domaines: ["Arts", "Langage oral", "Estime de soi"],
    etapes: ["Choisir les travaux à exposer", "Écrire les cartels",
      "Accrocher et éclairer", "Faire visiter, en guide"] },

  // ── Juin : transmettre, boucler ──
  { id: "p-film", mois: "06", titre: "Le film de l'année",
    pitch: "Les photos de l'année, remises dans l'ordre et commentées par ceux qui y étaient.",
    domaines: ["Se repérer dans le temps", "Langage oral", "Numérique"],
    etapes: ["Choisir les photos de chaque mois", "Les remettre dans l'ordre",
      "Enregistrer les commentaires", "Projeter aux familles"] },
  { id: "p-reussites", mois: "06", titre: "Mon livret de réussites",
    pitch: "Chacun choisit ce dont il est fier cette année et le présente — c'est lui qui parle de lui.",
    domaines: ["Estime de soi", "Écrit", "Langage oral"],
    etapes: ["Retrouver ses travaux de l'année", "Choisir cinq réussites",
      "Dicter ou écrire pourquoi", "Présenter son livret à un adulte"] },
  { id: "p-kermesse", mois: "06", titre: "La kermesse de la classe",
    pitch: "Des stands tenus par les élèves : expliquer la règle, encaisser, remettre en jeu.",
    domaines: ["Coopération", "Monnaie", "Langage oral"],
    etapes: ["Inventer les stands et leurs règles", "Fabriquer le matériel et les affiches",
      "Tenir son stand à deux", "Ranger et compter"] },
];

// ── Lire le catalogue ─────────────────────────────────────────────────────

/** Le mois de l'année scolaire où l'on se trouve, au format « 09 ». */
export function moisCourant(quand = new Date()): string {
  return String(quand.getMonth() + 1).padStart(2, "0");
}

/** Le nom du mois, tel qu'on le dit. */
export const nomDuMois = (num: string) => MOIS.find((m) => m.num === num)?.nom ?? "Hors année";

/** Les idées d'un mois donné. */
export const ideesDuMois = (mois: string) => CATALOGUE.filter((i) => i.mois === mois);

/**
 * Les idées qui répondent à une recherche, sans accents ni casse.
 *
 * On cherche dans le titre, la phrase et les domaines : « monnaie » doit
 * remonter le marché de Noël comme la marchande, qui ne portent pas le mot
 * dans leur titre.
 */
export function chercherIdees(recherche: string, aplatir: (s: string) => string): IdeeProjet[] {
  const q = aplatir(recherche).trim();
  if (!q) return [];
  const mots = q.split(/\s+/).filter(Boolean);
  return CATALOGUE.filter((i) => {
    const foin = aplatir([i.titre, i.pitch, i.domaines.join(" ")].join(" "));
    return mots.every((mot) => foin.includes(mot));
  });
}

// ── Mener un projet ───────────────────────────────────────────────────────

/** Relit les étapes enregistrées ; une valeur abîmée n'en perd pas le reste. */
export function lireEtapes(json: string): Etape[] {
  try {
    const v = JSON.parse(json || "[]");
    if (!Array.isArray(v)) return [];
    return v.flatMap((x): Etape[] => {
      if (typeof x === "string") return [{ texte: x, faite: false }];
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      return [{ texte: typeof o.texte === "string" ? o.texte : "", faite: o.faite === true }];
    }).filter((e) => e.texte.trim() !== "");
  } catch {
    return [];
  }
}

export const ecrireEtapes = (e: Etape[]) => JSON.stringify(e);

/** Un projet neuf, à partir d'une idée du catalogue. */
export function depuisIdee(idee: IdeeProjet, annee: string): ProjetClasse {
  return {
    id: newId(), titre: idee.titre, descriptif: idee.pitch, couleur: "indigo",
    dateCreation: nowIso(), annee, imageNom: null, mois: idee.mois, etat: "idee",
    etapesJson: ecrireEtapes(idee.etapes.map((texte) => ({ texte, faite: false }))),
    domaines: idee.domaines.join(", "), origine: idee.id,
  };
}

/** Un projet neuf, écrit de zéro. */
export function projetVierge(mois: string, annee: string): ProjetClasse {
  return {
    id: newId(), titre: "", descriptif: "", couleur: "indigo", dateCreation: nowIso(),
    annee, imageNom: null, mois, etat: "idee", etapesJson: "[]", domaines: "", origine: "",
  };
}

/** Où en est un projet : les étapes cochées sur le total. */
export function avancement(etapes: Etape[]): { faites: number; total: number; part: number } {
  const total = etapes.length;
  const faites = etapes.filter((e) => e.faite).length;
  return { faites, total, part: total === 0 ? 0 : faites / total };
}

/**
 * L'état que le projet devrait porter, vu ses étapes.
 *
 * Personne ne pense à changer l'état : il se déduit de ce qu'on coche. Un
 * projet qu'on a déclaré terminé le reste, même s'il garde une étape en
 * suspens — c'est le seul cas où l'enseignant a dit quelque chose.
 */
export function etatDeduit(etat: string, etapes: Etape[]): Etat {
  if (etat === "fait") return "fait";
  const { faites, total } = avancement(etapes);
  if (total > 0 && faites === total) return "fait";
  return faites > 0 ? "encours" : (etat === "encours" ? "encours" : "idee");
}

/** Les projets d'un mois, puis ceux qui n'en ont pas. */
export function rangerParMois(projets: ProjetClasse[]): { mois: string; projets: ProjetClasse[] }[] {
  const groupes = MOIS.map((m) => ({ mois: m.num, projets: projets.filter((p) => p.mois === m.num) }));
  const sansMois = projets.filter((p) => !MOIS.some((m) => m.num === p.mois));
  return sansMois.length ? [...groupes, { mois: "", projets: sansMois }] : groupes;
}
