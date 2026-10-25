// Revenir en arrière : les états passés de l'application, dits en clair.
//
// Le moteur est côté Rust (retour.rs, instantanes.rs) : un instantané par
// heure d'utilisation, de moins en moins en remontant le temps, et les copies
// d'avant une mise à jour ou une opération. Ici, de quoi les ranger et dire ce
// qu'un retour changerait.

import type { Cible, Ecart, ElementPasse, EtatPasse } from "./api";

/** La date d'un état, en heure locale ; une copie d'un jour sans heure compte pour minuit. */
export function dateDe(e: EtatPasse): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?/.exec(e.date);
  if (!m) return new Date(NaN);
  const [, a, mo, j, h = "0", mi = "0", s = "0"] = m;
  return new Date(Number(a), Number(mo) - 1, Number(j), Number(h), Number(mi), Number(s));
}

/** Vrai si la copie n'a que son jour, pas son heure. */
const sansHeure = (e: EtatPasse) => e.date.length <= 10;

/** Ce qui a fait naître l'état, quand ce n'est pas l'heure qui passe. */
export function motifEnClair(motif: string): string {
  const v = /^avant-v(.+)$/.exec(motif);
  if (v) return `avant le passage à la ${v[1]}`;
  const connus: Record<string, string> = {
    auto: "", jour: "",
    "avant-retour": "avant un retour en arrière",
    "avant-reprise": "avant la reprise d'un élément",
    "avant-synchro": "avant un gros envoi de l'autre ordinateur",
    "avant-import": "avant un import",
    "avant-restauration": "avant une restauration",
  };
  return connus[motif] ?? motif.replace(/-/g, " ");
}

/** Le signe d'un état qui n'est pas un simple instantané. */
export function signeDuMotif(motif: string): string {
  if (motif.startsWith("avant-v")) return "⬆";
  if (motif === "avant-retour" || motif === "avant-reprise") return "↶";
  if (motif === "avant-import" || motif === "avant-restauration") return "⤓";
  if (motif === "avant-synchro") return "⇅";
  return "";
}

const jourSeul = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const joursEntre = (a: Date, b: Date) => Math.round((jourSeul(b) - jourSeul(a)) / 86_400_000);
const heure = (d: Date) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/** L'état en entier : « aujourd'hui à 14:05 », « hier à 9:12 », « lundi 13 octobre à 17:40 ». */
export function quandEnClair(e: EtatPasse, maintenant: Date): string {
  const d = dateDe(e);
  const ecart = joursEntre(d, maintenant);
  const jour = ecart === 0 ? "aujourd'hui" : ecart === 1 ? "hier"
    : d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", ...(d.getFullYear() !== maintenant.getFullYear() ? { year: "numeric" } : {}) });
  return sansHeure(e) ? `${jour}, en début de journée` : `${jour} à ${heure(d)}`;
}

/** « d'aujourd'hui à 14:05 », « d'hier à 9:12 », « du lundi 13 octobre à 17:40 » : pour « l'état … ». */
export function deQuand(e: EtatPasse, maintenant: Date): string {
  const q = quandEnClair(e, maintenant);
  return /^(aujourd'hui|hier)/.test(q) ? `d'${q}` : `du ${q}`;
}

/** L'étiquette courte d'un état dans sa rangée : l'heure, ou le jour pour les plus anciens. */
export function etiquette(e: EtatPasse, maintenant: Date): string {
  const d = dateDe(e);
  const ecart = joursEntre(d, maintenant);
  if (ecart <= 1) return sansHeure(e) ? "début de journée" : heure(d);
  return d.toLocaleDateString("fr-FR", {
    weekday: ecart < 7 ? "short" : undefined, day: "numeric", month: "short",
    ...(d.getFullYear() !== maintenant.getFullYear() ? { year: "numeric" } : {}),
  });
}

export interface RangeeEtats { titre: string; etats: EtatPasse[] }

/** Les états par rangée : aujourd'hui, hier, le mois, et ce qui est plus ancien. Du plus récent au plus ancien. */
export function rangerLesEtats(etats: EtatPasse[], maintenant: Date): RangeeEtats[] {
  const tries = [...etats].sort((a, b) => dateDe(b).getTime() - dateDe(a).getTime() || b.nom.localeCompare(a.nom));
  const rangees: RangeeEtats[] = [
    { titre: "Aujourd'hui", etats: [] },
    { titre: "Hier", etats: [] },
    { titre: "Ce mois-ci", etats: [] },
    { titre: "Plus ancien", etats: [] },
  ];
  for (const e of tries) {
    const ecart = joursEntre(dateDe(e), maintenant);
    rangees[ecart <= 0 ? 0 : ecart === 1 ? 1 : ecart <= 31 ? 2 : 3].etats.push(e);
  }
  return rangees.filter((r) => r.etats.length > 0);
}

/** Le nom des choses d'une table, au singulier et au pluriel. */
const CHOSES: Record<string, [string, string]> = {
  projets: ["projet", "projets"],
  sequences: ["séquence", "séquences"],
  seances: ["séance", "séances"],
  ateliers: ["atelier", "ateliers"],
  espaces: ["espace", "espaces"],
  progressions_eleve: ["progression d'élève", "progressions d'élèves"],
  creneaux: ["créneau", "créneaux"],
  eleves: ["élève", "élèves"],
  appels_journalier: ["appel", "appels"],
  commentaires_eleve: ["observation", "observations"],
  evaluations: ["évaluation", "évaluations"],
  notes_eleve: ["note", "notes"],
  pieces_jointes: ["pièce jointe", "pièces jointes"],
  materiel_items: ["matériel", "matériels"],
  papiers_eleve: ["papier", "papiers"],
  notes_competence: ["note de compétence", "notes de compétences"],
  progressions_annuelle: ["progression", "progressions"],
  programmations_finale: ["programmation", "programmations"],
  edt_typique: ["emploi du temps", "emplois du temps"],
  documents_coffre: ["document du coffre", "documents du coffre"],
  documents_eleve: ["dossier d'élève", "dossiers d'élèves"],
  jeux: ["jeu", "jeux"],
  pilote_conversations: ["conversation de l'assistant", "conversations de l'assistant"],
  textes: ["texte", "textes"],
  outils_classe: ["outil", "outils"],
  reunions: ["réunion", "réunions"],
  observations_eleve: ["temps d'observation", "temps d'observation"],
  atelier_espace: ["atelier rangé dans un espace", "ateliers rangés dans un espace"],
  referentiels: ["référentiel ajouté", "référentiels ajoutés"],
  settings: ["réglage", "réglages"],
};

const compter = (n: number, table: string) => {
  const [un, plusieurs] = CHOSES[table] ?? ["élément", "éléments"];
  return `${n} ${n > 1 ? plusieurs : un}`;
};

/** Un créneau se nomme par sa date : « 2026-10-19 · Lecture » se lit « 19/10 · Lecture ». */
const dateCourte = (x: string) => x.replace(/^\d{4}-(\d{2})-(\d{2})/, "$2/$1");

const avecExemples = (n: number, table: string, exemples: string[]) =>
  compter(n, table) + (exemples.length ? ` (${exemples.map(dateCourte).join(", ")}${n > exemples.length ? "…" : ""})` : "");

export interface Bilan { revenues: string[]; parties: string[]; changees: string[] }

/** Ce qu'un retour changerait, en trois listes : ce qui reviendrait, s'en irait, redeviendrait comme alors. */
export function bilanDesEcarts(ecarts: Ecart[]): Bilan {
  const parTaille = (cle: "revenues" | "parties" | "changees") => [...ecarts].filter((e) => e[cle] > 0).sort((a, b) => b[cle] - a[cle]);
  return {
    revenues: parTaille("revenues").map((e) => avecExemples(e.revenues, e.table, e.exemplesRevenues)),
    parties: parTaille("parties").map((e) => avecExemples(e.parties, e.table, e.exemplesParties)),
    changees: parTaille("changees").map((e) => avecExemples(e.changees, e.table, e.exemplesChangees)),
  };
}

// ── Reprendre un seul élément ────────────────────────────────────────────

/** Le nom d'une chose d'une table, au singulier : « séquence ». */
export const nomDeLaChose = (table: string) => (CHOSES[table] ?? ["élément"])[0];

/** Le nom d'un élément tel que la liste le montre : un créneau par sa date courte. */
export const libelleEnClair = (e: ElementPasse) => dateCourte(e.libelle);

/** Ce qui revient avec un élément : « 8 séances », « 2 observations et 1 dossier d'élève ». */
export function avecEnClair(avec: [string, number][]): string {
  const morceaux = avec.map(([table, n]) => compter(n, table));
  return morceaux.length > 1 ? `${morceaux.slice(0, -1).join(", ")} et ${morceaux[morceaux.length - 1]}` : morceaux[0] ?? "";
}

/** Les éléments d'un état, en deux listes — supprimés depuis, modifiés depuis —, chacune par sorte puis par nom. */
export function elementsRanges(elements: ElementPasse[]): { supprimes: ElementPasse[]; modifies: ElementPasse[] } {
  const ordre = Object.keys(CHOSES);
  const rang = (t: string) => (ordre.includes(t) ? ordre.indexOf(t) : ordre.length);
  const tries = [...elements].sort((a, b) => rang(a.table) - rang(b.table) || a.libelle.localeCompare(b.libelle, "fr"));
  return { supprimes: tries.filter((e) => e.supprime), modifies: tries.filter((e) => !e.supprime) };
}

// ── Après un retour, la fenêtre se recharge ────────────────────────────────
//
// Tous les écrans doivent relire leurs données : on recharge. Ce qu'il faut
// dire ensuite — et le moyen d'annuler — passe le rechargement par la session.

const CLE_SESSION = "maitrize:retour-recent";

export interface RetourFait {
  /** La copie de l'état d'avant le retour : y revenir l'annule. Vide une fois le retour annulé. */
  copie: string;
  /** « du lundi 13 octobre à 17:40 », « d'hier à 22:59 ». */
  vers: string;
  fichiers: number;
  /** Une reprise d'un seul élément, pas un retour : ce qui a été repris (« « Les nombres » »), et toutes les lignes
   * écrites, que l'annulation reprend depuis `copie`. */
  reprise?: { quoi: string; lignes: Cible[] };
}

export function noterLeRetour(r: RetourFait) {
  try { sessionStorage.setItem(CLE_SESSION, JSON.stringify(r)); } catch { /* sans session, pas d'annonce */ }
}

/** Le retour qui vient d'avoir lieu, une seule fois. */
export function retourQuiVientDAvoirLieu(): RetourFait | null {
  try {
    const v = sessionStorage.getItem(CLE_SESSION);
    sessionStorage.removeItem(CLE_SESSION);
    return v ? JSON.parse(v) as RetourFait : null;
  } catch { return null; }
}
