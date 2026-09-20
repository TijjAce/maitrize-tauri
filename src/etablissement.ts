// Ce que l'enseignant renseigne une fois pour toutes sur son établissement :
// à qui s'adresser, et où se trouve le matériel.
//
// Ces repères reviennent dans chaque feuille pour un remplaçant et dans les
// pages de garde. Les retaper à chaque fois, c'est les laisser vides : on les
// garde donc dans les réglages, d'où les documents se remplissent seuls.
//
// Les clés portent le préfixe « etab: » : elles voyagent d'un ordinateur à
// l'autre avec la synchronisation, comme l'emploi du temps.

/** Les personnes qu'un remplaçant peut avoir à joindre. */
export const CONTACTS = [
  { id: "direction", libelle: "Direction", exemple: "Mme Martin — 01 23 45 67 89" },
  { id: "coordination", libelle: "Coordination ou chef de service", exemple: "M. Arnaud, bureau à l'entrée" },
  { id: "collegues", libelle: "Collègues de l'équipe", exemple: "Sophie (classe 2), Karim (atelier cuisine)" },
  { id: "soignants", libelle: "AESH, éducateurs, soignants", exemple: "Léa (AESH), psychomotricienne le mardi" },
  { id: "secretariat", libelle: "Secrétariat", exemple: "01 23 45 67 80, poste 12" },
] as const;

/** Où se trouve ce qu'on cherche le premier jour. */
export const REPERES = [
  { id: "cahiers", libelle: "Cahiers et classeurs des élèves", exemple: "Dans l'armoire, étagère du milieu côté gauche" },
  { id: "manipulation", libelle: "Matériel de manipulation", exemple: "Casiers à l'entrée et étagère du haut" },
  { id: "caa", libelle: "Outils de communication (pictogrammes, CAA)", exemple: "Classeur CAA sur le bureau, TLA affiché" },
  { id: "cles", libelle: "Clés et badges", exemple: "À demander à l'accueil" },
] as const;

export type ContactId = typeof CONTACTS[number]["id"];
export type RepereId = typeof REPERES[number]["id"];

/** La clé de réglage d'un repère d'établissement. */
export const cleEtab = (id: string) => `etab:${id}`;

export interface Etablissement {
  contacts: Partial<Record<ContactId, string>>;
  materiel: Partial<Record<RepereId, string>>;
  telephone: string;
  adresse: string;
}

const lu = (reglages: Record<string, string>, id: string) => (reglages[cleEtab(id)] ?? "").trim();

/** Les repères de l'établissement, tels qu'ils sont enregistrés. */
export function lireEtablissement(reglages: Record<string, string>): Etablissement {
  const contacts: Partial<Record<ContactId, string>> = {};
  for (const c of CONTACTS) {
    const v = lu(reglages, c.id);
    if (v) contacts[c.id] = v;
  }
  const materiel: Partial<Record<RepereId, string>> = {};
  for (const r of REPERES) {
    const v = lu(reglages, r.id);
    if (v) materiel[r.id] = v;
  }
  return { contacts, materiel, telephone: lu(reglages, "telephone"), adresse: lu(reglages, "adresse") };
}

/** Rien de renseigné : les documents le disent, plutôt que d'aligner des « … ». */
export const etablissementVide = (e: Etablissement) =>
  !Object.keys(e.contacts).length && !Object.keys(e.materiel).length && !e.telephone && !e.adresse;
