// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// La structure du GEVA-Sco, celle du support officiel (arrêté du 6 février 2015) : pour l'écran, le
// formulaire imprimé et le report dans le LPI.

export type Code = "" | "A" | "B" | "C" | "D" | "SO";
export const CODES: { k: Code; label: string; aide: string; couleur: string }[] = [
  { k: "A", label: "A", aide: "Activité réalisée sans difficulté et seul", couleur: "#57b873" },
  { k: "B", label: "B", aide: "Réalisée avec des difficultés ponctuelles et/ou une aide ponctuelle", couleur: "#9ac74f" },
  { k: "C", label: "C", aide: "Réalisée avec des difficultés régulières et/ou une aide régulière (commentaires indispensables)", couleur: "#eb9e33" },
  { k: "D", label: "D", aide: "Activité non réalisée (commentaires indispensables)", couleur: "#d64d4d" },
  { k: "SO", label: "SO", aide: "Sans objet", couleur: "var(--text-2)" },
];

// Domaines et activités, dans l'ordre exact du support officiel (p. 4 et 5).
export const DOMAINES: { id: string; titre: string; activites: { id: string; label: string }[] }[] = [
  {
    id: "general", titre: "Tâches et exigences générales, relation avec autrui",
    activites: [
      { id: "g1", label: "S'orienter dans le temps" },
      { id: "g2", label: "S'orienter dans l'espace" },
      { id: "g3", label: "Fixer son attention" },
      { id: "g4", label: "Mémoriser" },
      { id: "g5", label: "Gérer sa sécurité" },
      { id: "g6", label: "Respecter les règles de vie" },
      { id: "g7", label: "Avoir des relations avec autrui conformes aux règles sociales" },
      { id: "g8", label: "Maîtriser son comportement dans ses relations avec autrui" },
    ],
  },
  {
    id: "mobilite", titre: "Mobilité, manipulation",
    activites: [
      { id: "m1", label: "Faire ses transferts (ex. : du fauteuil roulant à la chaise dans la classe)" },
      { id: "m2", label: "Se déplacer à l'intérieur, à l'extérieur (dans le cadre des activités scolaires)" },
      { id: "m3", label: "Utiliser les transports en commun" },
      { id: "m4", label: "Avoir des activités de motricité fine" },
    ],
  },
  {
    id: "entretien", titre: "Entretien personnel",
    activites: [
      { id: "e1", label: "Assurer l'élimination et utiliser les toilettes" },
      { id: "e2", label: "S'habiller / se déshabiller" },
      { id: "e3", label: "Prendre ses repas (manger, boire)" },
      { id: "e4", label: "Prendre soin de sa santé" },
    ],
  },
  {
    id: "communication", titre: "Communication",
    activites: [
      { id: "c1", label: "Parler" },
      { id: "c2", label: "Comprendre la parole en face à face" },
      { id: "c3", label: "Comprendre une phrase simple" },
      { id: "c4", label: "Produire et recevoir des messages non verbaux" },
    ],
  },
  {
    id: "scolarite", titre: "Tâches et exigences en relation avec la scolarité",
    activites: [
      { id: "s1", label: "Lire" },
      { id: "s2", label: "Écrire" },
      { id: "s3", label: "Calculer" },
      { id: "s4", label: "Organiser son travail" },
      { id: "s5", label: "Contrôler son travail" },
      { id: "s6", label: "Accepter des consignes" },
      { id: "s7", label: "Suivre des consignes" },
      { id: "s8", label: "S'installer dans la classe" },
      { id: "s9", label: "Utiliser des supports pédagogiques" },
      { id: "s10", label: "Utiliser du matériel adapté à son handicap" },
      { id: "s11", label: "Prendre des notes (quel que soit le support)" },
      { id: "s12", label: "Participer à des sorties scolaires" },
    ],
  },
];

export type TableauGeva = "plans" | "accompagnements" | "materiel";
/** Les trois tableaux des conditions actuelles de scolarisation : une case et un commentaire par ligne. */
export const TABLEAUX_GEVA: { id: TableauGeva; titre: string; entete: string; lignes: string[] }[] = [
  {
    id: "plans", titre: "Plan ou projets formalisés", entete: "Commentaires (durée de mise en œuvre, effets…)",
    lignes: ["PAI", "Mesures éducatives", "Autres"],
  },
  {
    id: "accompagnements", titre: "Accompagnement et soins", entete: "Commentaires, précisions",
    lignes: ["RASED", "SAPAD", "CNED", "Soins hospitaliers", "CAMPS / CMP / CMPP", "EMS", "SESSAD", "Soins en libéral", "Autres"],
  },
  {
    id: "materiel", titre: "Conditions matérielles", entete: "Commentaires, précisions",
    lignes: ["Aménagements et adaptations pédagogiques", "Outils de communication",
      "Matériel informatique et audiovisuel", "Matériel déficience auditive", "Matériel déficience visuelle",
      "Mobilier et petits matériels", "Transport", "Autres"],
  },
];
export const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

export interface Activite { code: Code; obstacles: string; appuis: string }
export interface Responsable {
  id: string; civilite: "" | "Mme" | "M"; nom: string;
  rue: string; cp: string; ville: string; tel: string; courriel: string;
}
export interface GevaData {
  type: "premiere" | "reexamen";
  numDossier: string; anneeScolaire: string; dateReunion: string;
  dateNaissance: string; adresse: string; cp: string; ville: string; tel: string; courriel: string;
  representants: string;
  responsables: Responsable[];
  /** Cases à cocher des dispositifs (clé = libellé de ligne). */
  coches: Record<string, boolean>;
  referentNom: string; referentTel: string; referentCourriel: string;
  etablissement: string; classe: string;
  etabRue: string; etabCp: string; etabVille: string;
  parcours: { id: string; annee: string; scolarisation: string }[];
  plans: Record<string, string>;
  accompagnements: Record<string, string>;
  materiel: Record<string, string>;
  niveauApprentissages: string;
  acquisitions: "" | "atteintes" | "nonatteintes";
  edt: Record<string, { matin: string; midi: string; apresmidi: string }>;
  activites: Record<string, Activite>;
  /** Cadres « obstacles » / « points d'appui », un par domaine (support officiel). */
  cadres: Record<string, { obstacles: string; appuis: string }>;
  accessibiliteBati: "" | "oui" | "non" | "partielle";
  natureDifficultes: string;
  evolutions: string;
  bilanAmenagements: string; bilanDispositifs: string; bilanAideHumaine: string; bilanAccompagnements: string;
  perspectives: string;
  remarquesFamille: string; remarquesProfessionnels: string;
  participants: { id: string; nom: string; fonction: string }[];
}

const propre = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** « Autres » existe dans les trois tableaux : sa case a une clé par tableau. */
const cleDeCase = (tableau: TableauGeva, ligne: string) => (ligne === "Autres" ? `Autres:${tableau}` : ligne);

/**
 * Une ligne se coche à la main, ou d'elle-même quand elle a un commentaire. Les documents d'avant
 * n'avaient qu'une case « Autres » pour les trois tableaux : elle vaut tant qu'on n'a pas touché à
 * celle de ce tableau.
 */
export function ligneCochee(d: Pick<GevaData, "coches" | TableauGeva>, tableau: TableauGeva, ligne: string): boolean {
  const coches = d.coches ?? {};
  return !!(coches[cleDeCase(tableau, ligne)] ?? coches[ligne]) || !!propre(d[tableau]?.[ligne]);
}

export const poserCase = (coches: Record<string, boolean>, tableau: TableauGeva, ligne: string, valeur: boolean) =>
  ({ ...coches, [cleDeCase(tableau, ligne)]: valeur });

/** Les commentaires d'un tableau en un seul texte, une ligne par dispositif. */
export function commentairesDuTableau(lignes: readonly string[], valeurs: Record<string, string> | undefined): string {
  return lignes.filter((l) => propre(valeurs?.[l])).map((l) => `${l} : ${propre(valeurs?.[l])}`).join("\n");
}

// Les listes du GEVA-Sco (représentants légaux, parcours, participants) se
// remplissent ligne par ligne, dans le désordre : écrire la troisième ligne
// d'une liste qui n'en a qu'une laissait des trous, que la base relit en
// `null`, et l'impression s'arrêtait sur le premier (`r.nom` d'une ligne
// absente) sans rien dire.

/** La liste sans trous, d'au moins `longueur` lignes : une ligne absente devient une ligne vide. */
export function sansTrous<T>(liste: readonly (T | null | undefined)[] | null | undefined, vide: () => T, longueur = 0): T[] {
  const n = Math.max(liste?.length ?? 0, longueur);
  return Array.from({ length: n }, (_, k) => liste?.[k] ?? vide());
}
