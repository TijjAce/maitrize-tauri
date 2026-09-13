// Programmes officiels à enregistrer dans le coffre-fort, pour y citer les
// compétences travaillées par chaque élève.
//
// Ce sont les textes d'où sont tirés les référentiels intégrés (voir
// outils/referentiels/README.md). Chaque adresse a été vérifiée le 13/09/2026 :
// elle répond un PDF dont la taille est celle du fichier ayant servi à
// l'extraction — c'est bien le même texte.

export interface ProgrammeOfficiel {
  id: string;
  cycle: "Cycle 1" | "Cycle 2" | "Cycle 3" | "Cycles 2 et 3";
  discipline: string;
  reference: string;
  url: string;
  /** Taille annoncée, pour prévenir avant un long téléchargement. */
  octets: number;
}

const EDU = "https://www.education.gouv.fr/sites/default/files/document/";

export const PROGRAMMES_OFFICIELS: ProgrammeOfficiel[] = [
  { id: "c1-langage", cycle: "Cycle 1", discipline: "Langage oral et écrit", reference: "BO n° 41 du 31 octobre 2024",
    url: EDU + "Annexe%201%20%E2%80%93%20Programme%20d%E2%80%98enseignement%20pour%20le%20d%C3%A9veloppement%20et%20la%20structuration%20du%20langage%20oral%20et%20%C3%A9crit%20du%20cycle%201-403812.pdf", octets: 818480 },
  { id: "c1-maths", cycle: "Cycle 1", discipline: "Premiers outils mathématiques", reference: "BO n° 41 du 31 octobre 2024",
    url: EDU + "Annexe%202%20%E2%80%93%20Programme%20d%E2%80%99enseignement%20pour%20l%E2%80%99acquisition%20des%20premiers%20outils%20math%C3%A9matiques%20du%20cycle%201-403815.pdf", octets: 970514 },
  { id: "c1-2021", cycle: "Cycle 1", discipline: "Programme de l’école maternelle (autres domaines)", reference: "BO n° 25 du 24 juin 2021",
    url: "https://eduscol.education.gouv.fr/sites/default/files/document/programme-d-enseignement-du-cycle-1-80130.pdf", octets: 994004 },

  { id: "c2-francais", cycle: "Cycle 2", discipline: "Français", reference: "BO n° 41 du 31 octobre 2024",
    url: EDU + "Annexe%203%20%E2%80%93%20Programme%20de%20fran%C3%A7ais%20du%20cycle%202-403818.pdf", octets: 1126508 },
  { id: "c2-maths", cycle: "Cycle 2", discipline: "Mathématiques", reference: "BO n° 41 du 31 octobre 2024",
    url: EDU + "Annexe%204%20%E2%80%93%20Programme%20de%20math%C3%A9matiques%20du%20cycle%202-403821.pdf", octets: 1733229 },
  { id: "c2-sciences", cycle: "Cycle 2", discipline: "Sciences et technologie", reference: "BO n° 24 du 11 juin 2026",
    url: EDU + "annexe-1-programme-de-sciences-et-technologie-du-cycle-2-517289.pdf", octets: 7522736 },
  { id: "c2-hg", cycle: "Cycle 2", discipline: "Histoire-géographie", reference: "BO n° 22 du 28 mai 2026",
    url: EDU + "annexe-3-programme-d-histoire-geographie-cycle-2-516776.pdf", octets: 241461 },
  { id: "c2-eps", cycle: "Cycle 2", discipline: "Éducation physique et sportive", reference: "BO n° 22 du 28 mai 2026",
    url: EDU + "annexe-1-programme-d-education-physique-et-sportive-cycle-2-516770.pdf", octets: 392849 },
  { id: "c2-lver", cycle: "Cycle 2", discipline: "Langues vivantes étrangères et régionales", reference: "BO n° 12 du 19 mars 2026",
    url: EDU + "Annexe%201%20%E2%80%93%20Programme%20de%20langues%20vivantes%20%C3%A9trang%C3%A8res%20et%20r%C3%A9gionales%20pour%20le%20cycle%202%20-481187.pdf", octets: 807137 },
  { id: "c2-2020", cycle: "Cycle 2", discipline: "Programme du cycle 2 (enseignements artistiques)", reference: "BO n° 31 du 30 juillet 2020",
    url: "https://cache.media.education.gouv.fr/file/31/88/5/ensel714_annexe1_1312885.pdf", octets: 1113849 },

  { id: "c3-francais", cycle: "Cycle 3", discipline: "Français", reference: "BO n° 16 du 17 avril 2025",
    url: "https://www.education.gouv.fr/sites/default/files/programme-de-fran-ais-pour-le-cycle-3-439824.pdf", octets: 342501 },
  { id: "c3-maths", cycle: "Cycle 3", discipline: "Mathématiques", reference: "BO n° 16 du 17 avril 2025",
    url: "https://www.education.gouv.fr/sites/default/files/programme-de-math-matiques-pour-le-cycle-3-439827.pdf", octets: 527151 },
  { id: "c3-sciences", cycle: "Cycle 3", discipline: "Sciences et technologie", reference: "BO n° 24 du 11 juin 2026",
    url: EDU + "annexe-2-programme-de-sciences-et-technologie-du-cycle-3-517292.pdf", octets: 18663426 },
  { id: "c3-hg", cycle: "Cycle 3", discipline: "Histoire-géographie", reference: "BO n° 22 du 28 mai 2026",
    url: EDU + "annexe-4-programme-d-histoire-geographie-cycle-3-516779.pdf", octets: 416253 },
  { id: "c3-eps", cycle: "Cycle 3", discipline: "Éducation physique et sportive", reference: "BO n° 22 du 28 mai 2026",
    url: EDU + "annexe-2-programme-d-education-physique-et-sportive-cycle-3-516773.pdf", octets: 306489 },
  { id: "c3-lver", cycle: "Cycle 3", discipline: "Langues vivantes étrangères et régionales", reference: "BO n° 12 du 19 mars 2026",
    url: EDU + "Annexe%202%20%E2%80%93%20Programme%20de%20langues%20vivantes%20%C3%A9trang%C3%A8res%20et%20r%C3%A9gionales%20pour%20les%20classes%20de%20cours%20moyen%20%28cycle%203%29-481190.pdf", octets: 312240 },
  { id: "c3-2023", cycle: "Cycle 3", discipline: "Programme du cycle 3 (enseignements artistiques)", reference: "version en vigueur à la rentrée 2023",
    url: "https://eduscol.education.gouv.fr/sites/default/files/document/programme-d-enseignement-du-cycle-3-2023-100806.pdf", octets: 1464182 },

  { id: "emc", cycle: "Cycles 2 et 3", discipline: "Enseignement moral et civique", reference: "BO n° 24 du 13 juin 2024",
    url: EDU + "Annexe%20%E2%80%94%20Programme%20d%E2%80%99enseignement%20moral%20et%20civique%20du%20cours%20pr%C3%A9paratoire%20%C3%A0%20la%20classe%20terminale%20des%20voies%20g%C3%A9n%C3%A9rale%2C%20technologique%20et%20professionnelle%20et%20des%20classes%20pr%C3%A9parant%20au%20CAP-402159.pdf", octets: 1219253 },
];

/** Nom sous lequel le programme est rangé dans le coffre-fort — et retrouvé. */
export const nomDansLeCoffre = (p: ProgrammeOfficiel) => `${p.cycle} — ${p.discipline} (${p.reference})`;
