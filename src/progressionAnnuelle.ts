// La progression annuelle : pour une année, un niveau et une période, les
// semaines en lignes et, en colonnes, des matières, des domaines ou des
// intitulés de l'emploi du temps.
//
// Une classe à plusieurs niveaux en tient une par niveau (demande de
// l'enseignant, octobre 2026). Celles d'avant n'ont pas de niveau : elles
// valent pour tous, et restent là où elles étaient. Un niveau vaut pour toute
// l'année : il a son tableau à chaque période. Dans les cases, on place aussi
// les séances des séquences créées.

import type { ProgressionAnnuelle } from "./api";
import type { PeriodeDeClasse } from "./vacances";

export interface Colonne { id: string; titre: string; couleur: string }
export interface EtatProg {
  colonnes: Colonne[];
  cellules: Record<string, string>;
  /** Par case, les séances placées (identifiants), dans l'ordre où on les a choisies. */
  seances: Record<string, string[]>;
}

/** Une progression vide. */
export const ETAT_VIDE: EtatProg = { colonnes: [], cellules: {}, seances: {} };

/** La progression sans niveau : celle de la classe, en tête de la période. */
export const LA_CLASSE = "la classe";

/** Sans calendrier (hors réseau, année pas encore publiée) : huit semaines, comme avant. */
export const SEMAINES_PAR_DEFAUT = 8;

export const cleCase = (semaine: number, colonne: string) => `w${semaine}_${colonne}`;

/** Ce que montre une progression ; rien d'illisible ne fait tomber l'écran. */
export function lireEtat(p?: Pick<ProgressionAnnuelle, "colonnesJson" | "cellulesJson"> & { seancesJson?: string } | null): EtatProg {
  let colonnes: Colonne[] = [];
  let cellules: Record<string, string> = {};
  const seances: Record<string, string[]> = {};
  try {
    const v = JSON.parse(p?.colonnesJson || "[]");
    if (Array.isArray(v)) {
      colonnes = v.filter((c) => c && typeof c.id === "string")
        .map((c) => ({ id: c.id, titre: String(c.titre ?? ""), couleur: String(c.couleur ?? "blue") }));
    }
  } catch { /* illisible : vide */ }
  try {
    const v = JSON.parse(p?.cellulesJson || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k, x] of Object.entries(v)) if (typeof x === "string" && x !== "") cellules[k] = x;
    }
  } catch { /* illisible : vide */ }
  try {
    const v = JSON.parse(p?.seancesJson || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [k, x] of Object.entries(v)) {
        const ids = Array.isArray(x) ? x.filter((i): i is string => typeof i === "string" && i !== "") : [];
        if (ids.length) seances[k] = ids;
      }
    }
  } catch { /* illisible : vide */ }
  return { colonnes, cellules, seances };
}

/** L'état en JSON, tel que la base le range : une case vide n'y est pas. */
export function enJson(e: EtatProg): { colonnesJson: string; cellulesJson: string; seancesJson: string } {
  const cellules = Object.fromEntries(Object.entries(e.cellules).filter(([, v]) => v !== ""));
  const seances = Object.fromEntries(Object.entries(e.seances ?? {}).filter(([, v]) => v.length > 0));
  return { colonnesJson: JSON.stringify(e.colonnes), cellulesJson: JSON.stringify(cellules), seancesJson: JSON.stringify(seances) };
}

const parCle = <V>(o: Record<string, V>) => Object.entries(o).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));

/** Deux états identiques, quel que soit l'ordre des cases : la base les range par clé. */
export function memeEtat(a: EtatProg, b: EtatProg): boolean {
  const signature = (e: EtatProg) => JSON.stringify([
    e.colonnes.map((c) => [c.id, c.titre, c.couleur]),
    parCle(e.cellules).filter(([, v]) => v !== ""),
    parCle(e.seances ?? {}).filter(([, v]) => v.length > 0),
  ]);
  return signature(a) === signature(b);
}

/** La progression d'une année, d'un niveau, d'une période : la plus ancienne s'il y en a deux. */
export const progressionDe = (liste: ProgressionAnnuelle[], annee: string, niveau: string, periode: number) =>
  liste.find((p) => p.annee === annee && (p.niveau ?? "") === niveau && p.periode === periode);

/** Une semaine de classe : son numéro dans la période, son premier et son dernier jour de classe. */
export interface SemaineDeClasse { numero: number; debut: string; fin: string }

const jourUtc = (jour: string) => new Date(`${jour}T12:00:00Z`);
const iso = (d: Date) => d.toISOString().slice(0, 10);
const plus = (jour: string, n: number) => { const d = jourUtc(jour); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

/**
 * Les semaines d'une période, du lundi au vendredi : une rentrée un mardi
 * compte sa semaine, comme `semainesDeClasse`.
 */
export function semainesDeLaPeriode(p: PeriodeDeClasse): SemaineDeClasse[] {
  const decalage = (jourUtc(p.debut).getUTCDay() + 6) % 7;
  const semaines: SemaineDeClasse[] = [];
  for (let lundi = plus(p.debut, -decalage), n = 1; lundi <= p.fin; lundi = plus(lundi, 7), n++) {
    const vendredi = plus(lundi, 4);
    semaines.push({ numero: n, debut: lundi < p.debut ? p.debut : lundi, fin: vendredi > p.fin ? p.fin : vendredi });
  }
  return semaines;
}

/**
 * Combien de semaines montrer : celles du calendrier, ou huit sans lui —
 * mais jamais moins que la dernière semaine remplie. Une case écrite ne
 * disparaît pas parce que le calendrier compte une semaine de moins.
 */
export function nombreDeSemaines(duCalendrier: number, cellules: Record<string, string>, seances: Record<string, string[]> = {}): number {
  let derniere = 0;
  const remplies = [...Object.entries(cellules).filter(([, v]) => v.trim()), ...Object.entries(seances).filter(([, v]) => v.length)];
  for (const [k] of remplies) {
    const m = /^w(\d+)_/.exec(k);
    if (m) derniere = Math.max(derniere, Number(m[1]));
  }
  return Math.max(duCalendrier > 0 ? duCalendrier : SEMAINES_PAR_DEFAUT, derniere);
}

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** « 1–4 sept. », ou « 28 sept. – 2 oct. » quand la semaine change de mois. */
export function datesDeLaSemaine(s: SemaineDeClasse): string {
  const [a, b] = [jourUtc(s.debut), jourUtc(s.fin)];
  if (s.debut === s.fin) return `${a.getUTCDate()} ${MOIS[a.getUTCMonth()]}`;
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MOIS[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MOIS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MOIS[b.getUTCMonth()]}`;
}

/** Vrai si une progression a quelque chose : une colonne, une case, une séance placée. */
export const remplie = (p?: ProgressionAnnuelle) => {
  const e = lireEtat(p);
  return e.colonnes.length > 0 || Object.keys(e.cellules).length > 0 || Object.keys(e.seances).length > 0;
};

/** La clé d'un niveau ajouté à l'année, le temps qu'il reçoive sa progression. */
export const cleNiveauAjoute = (annee: string, niveau: string) => `${annee}|${niveau}`;

/**
 * Les niveaux de l'année : ceux qui ont une progression à l'une de ses
 * périodes, et ceux qu'on vient d'ajouter par « + Niveau », dans l'ordre de
 * l'école. Chacun a son tableau à chaque période.
 */
export function niveauxDeLaProgression(ordre: string[], liste: ProgressionAnnuelle[], annee: string, ajoutes: string[]): string[] {
  const vus = new Set(liste.filter((p) => p.annee === annee && (p.niveau ?? "") !== "" && remplie(p)).map((p) => p.niveau));
  for (const k of ajoutes) {
    const [a, n] = k.split("|");
    if (a === annee && n) vus.add(n);
  }
  const rang = (n: string) => { const i = ordre.indexOf(n); return i < 0 ? ordre.length : i; };
  return [...vus].sort((a, b) => rang(a) - rang(b) || a.localeCompare(b, "fr"));
}

/**
 * Le tableau sans niveau se montre s'il a quelque chose dans l'année, ou
 * s'il n'y a pas de niveau : c'est par lui qu'on commence.
 */
export const tableauSansNiveau = (liste: ProgressionAnnuelle[], annee: string, niveaux: string[]) =>
  niveaux.length === 0 || liste.some((p) => p.annee === annee && (p.niveau ?? "") === "" && remplie(p));

/** Un groupe de titres à proposer pour une colonne. */
export interface GroupeDeTitres { groupe: string; titres: string[] }

const plat = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Les titres d'une colonne se tirent des matières et domaines de Réglages,
 * puis des intitulés de l'emploi du temps : chacun une fois, dans le premier
 * groupe où il paraît. `filtre` garde ceux qui contiennent ce qu'on tape.
 */
export function titresProposes(sources: GroupeDeTitres[], filtre = ""): GroupeDeTitres[] {
  const deja = new Set<string>();
  const cherche = plat(filtre);
  return sources.map(({ groupe, titres }) => ({
    groupe,
    titres: titres.map((t) => t.trim()).filter((t) => {
      const k = plat(t);
      if (!k || deja.has(k)) return false;
      deja.add(k);
      return !cherche || k.includes(cherche);
    }),
  })).filter((g) => g.titres.length > 0);
}

/** Vrai si un titre vient de l'une des listes proposées. */
export const titreConnu = (sources: GroupeDeTitres[], titre: string) =>
  sources.some((g) => g.titres.some((t) => plat(t) === plat(titre)));

/** D'où reprendre les colonnes d'une progression vide. */
export interface SourceDeColonnes { libelle: string; colonnes: Colonne[] }

/**
 * Les colonnes qu'une progression vide peut reprendre : celles de la période
 * la plus proche du même niveau, puis celles d'un autre niveau à la même
 * période. Les cases ne suivent pas : on reprend la forme, pas le contenu.
 */
export function sourcesDeColonnes(liste: ProgressionAnnuelle[], annee: string, niveau: string, periode: number): SourceDeColonnes[] {
  const avecColonnes = liste.filter((p) => p.annee === annee && lireEtat(p).colonnes.length > 0);
  // Elle a déjà les siennes : rien à reprendre.
  if (avecColonnes.some((p) => (p.niveau ?? "") === niveau && p.periode === periode)) return [];
  const sources: SourceDeColonnes[] = [];
  const memeNiveau = avecColonnes.filter((p) => (p.niveau ?? "") === niveau && p.periode !== periode)
    .sort((a, b) => Math.abs(a.periode - periode) - Math.abs(b.periode - periode) || a.periode - b.periode)[0];
  if (memeNiveau) sources.push({ libelle: `P${memeNiveau.periode}`, colonnes: lireEtat(memeNiveau).colonnes });
  const autreNiveau = avecColonnes.filter((p) => (p.niveau ?? "") !== niveau && p.periode === periode)
    .sort((a, b) => (a.niveau === "" ? -1 : 0) - (b.niveau === "" ? -1 : 0))[0];
  if (autreNiveau) sources.push({ libelle: autreNiveau.niveau || LA_CLASSE, colonnes: lireEtat(autreNiveau).colonnes });
  return sources;
}

/** Des colonnes reprises : mêmes titres et couleurs, nouveaux identifiants. */
export const copieDesColonnes = (colonnes: Colonne[], nouvelId: () => string): Colonne[] =>
  colonnes.map((c) => ({ ...c, id: nouvelId() }));

/** Sans une colonne : ses cases et leurs séances partent avec elle. */
export function sansColonne(e: EtatProg, id: string): EtatProg {
  const hors = <V>(o: Record<string, V>) => Object.fromEntries(Object.entries(o).filter(([k]) => !k.endsWith(`_${id}`)));
  return { colonnes: e.colonnes.filter((c) => c.id !== id), cellules: hors(e.cellules), seances: hors(e.seances ?? {}) };
}

/** Ce qu'une colonne retirée emporte : ses cases et leurs séances. */
export interface CasesDUneColonne { cellules: Record<string, string>; seances: Record<string, string[]> }

/** Une colonne retirée, et de quoi la remettre à sa place avec ses cases. */
export function casesDeLaColonne(e: EtatProg, id: string): CasesDUneColonne {
  const siennes = <V>(o: Record<string, V>) => Object.fromEntries(Object.entries(o).filter(([k]) => k.endsWith(`_${id}`)));
  return { cellules: siennes(e.cellules), seances: siennes(e.seances ?? {}) };
}

/** Remet une colonne retirée à sa place, avec ses cases, sans toucher au reste. */
export function remettreColonne(e: EtatProg, c: Colonne, place: number, cases: CasesDUneColonne): EtatProg {
  if (e.colonnes.some((x) => x.id === c.id)) return e;
  const colonnes = [...e.colonnes];
  colonnes.splice(Math.min(place, colonnes.length), 0, c);
  return { colonnes, cellules: { ...e.cellules, ...cases.cellules }, seances: { ...(e.seances ?? {}), ...cases.seances } };
}

/** Déplace une colonne d'un cran vers la gauche (-1) ou la droite (1). */
export function deplacerColonne(e: EtatProg, id: string, sens: -1 | 1): EtatProg {
  const i = e.colonnes.findIndex((c) => c.id === id);
  const j = i + sens;
  if (i < 0 || j < 0 || j >= e.colonnes.length) return e;
  const colonnes = [...e.colonnes];
  [colonnes[i], colonnes[j]] = [colonnes[j], colonnes[i]];
  return { ...e, colonnes };
}

/** Les séances placées dans une case (aucune : la clé disparaît). */
export function avecSeances(e: EtatProg, semaine: number, colonne: string, ids: string[]): EtatProg {
  const seances = { ...(e.seances ?? {}) };
  const cle = cleCase(semaine, colonne);
  if (ids.length) seances[cle] = [...new Set(ids)];
  else delete seances[cle];
  return { ...e, seances };
}

/** Une case écrite (vide, elle disparaît). */
export function avecCase(e: EtatProg, semaine: number, colonne: string, texte: string): EtatProg {
  const cellules = { ...e.cellules };
  if (texte === "") delete cellules[cleCase(semaine, colonne)];
  else cellules[cleCase(semaine, colonne)] = texte;
  return { ...e, cellules };
}
