// Les feuilles des séquences de calcul mental.
//
// Une compétence de calcul mental appelle la séquence de son livret — l'arbre
// à calcul au CP, ajouter 9, 19 ou 29 et la table de 7 au CE1, multiplier par 4
// au CE2 (voir demarchesCalcul.ts) — ou, sinon, la démarche du guide CP, au
// procédé La Martinière. Les feuilles de chaque séance viennent des ateliers
// « Calcul mental », « Arbre à calcul » et « Cartes de calcul » : avec les
// calculs mêmes du livret quand il les donne, tirés au hasard dans ce que la
// séance travaille sinon — des nombres où la procédure du jour est la bonne.

import type { ClasseC2, ContexteFeuilles, FeuilleAFabriquer, PlanDesFeuilles } from "./feuillesDesSequences";
import { STYLE_FEUILLE, feuille } from "./cartesImprimables";
import { objectifParId, type Calcul } from "./faitsNumeriques";
import { hasard } from "./hasard";
import { STYLE_JEUX_MATHS, cartesCalcul, htmlArbreCalcul, htmlCartesCalcul, type Addition, type CarteCalcul, type ReglagesCalcul } from "./jeuxMaths";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, htmlMartiniere, calculsMartiniere, libelleTravaille, type FormeEntrainement, type ReglagesMartiniere } from "./martiniere";
import { choisir, entier, fr } from "./nombres";
import { memoiresDesProblemes, problemesAssocies, problemesDe } from "./problemesAssocies";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererPartieTout } from "./problemesBarres";

const plat = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

// ── Les objectifs de l'atelier « Calcul mental » qui servent une compétence ──

interface ObjectifsDUneCompetence {
  classe: ClasseC2;
  motif: RegExp;
  /** Les objectifs, dans l'ordre où la séquence les travaille ; selon la période quand le programme le dit. */
  objectifs: string[] | ((periode: number) => string[]);
  /** Les tables, pour les objectifs « au choix ». */
  tables?: (periode: number) => number[];
}

const TOUTES_LES_TABLES = [2, 3, 4, 5, 6, 7, 8, 9];

/** Les compétences de calcul mental du programme (2024), classe par classe, et les objectifs de l'atelier qui les travaillent. */
const OBJECTIFS_DES_COMPETENCES: ObjectifsDUneCompetence[] = [
  // Les résultats rencontrés en maternelle — les sommes jusqu'à dix — « sont réintroduits progressivement pendant les
  // deux premières périodes du CP » (programme 2024) ; puis toutes les tables.
  { classe: "CP", motif: /tables d.addition/, objectifs: (p) => (p <= 2 ? ["cp-sommes-10"] : ["cp-tables-addition"]) },
  { classe: "CP", motif: /doubles et (les )?moities/, objectifs: ["cp-doubles", "cp-moities"] },
  { classe: "CP", motif: /ajouter ou soustraire 1 ou 2/, objectifs: ["cp-un-ou-deux"] },
  { classe: "CP", motif: /ajouter ou soustraire 10 a/, objectifs: ["cp-dix"] },
  { classe: "CP", motif: /ajouter ou soustraire 20, 30/, objectifs: ["cp-dizaines"] },
  { classe: "CP", motif: /dizaine superieure/, objectifs: ["cp-dizaine-superieure"] },
  { classe: "CP", motif: /ajouter un nombre inferieur a 9/, objectifs: ["cp-ajouter-unites"] },
  { classe: "CP", motif: /ajouter 9 a un nombre/, objectifs: ["cp-ajouter-9"] },
  { classe: "CP", motif: /ajouter deux nombres inferieurs a 100/, objectifs: ["cp-deux-nombres"] },
  { classe: "CP", motif: /moitie d.un nombre pair/, objectifs: ["cp-moitie-pair"] },
  { classe: "CP", motif: /soustraire un nombre inferieur a 10 a un nombre entier de dizaines/, objectifs: ["cp-dizaines-moins"] },
  { classe: "CE1", motif: /tables d.addition/, objectifs: ["ce1-tables-addition"] },
  // La progression du livret CE1 : les tables de 2, 3, 4, 5, 6 et 10 en périodes 1 et 2, de 7 en période 3, de 8 en
  // période 4, toutes en période 5.
  { classe: "CE1", motif: /tables de multiplication/, objectifs: ["ce1-table-multiplication"],
    tables: (p) => (p <= 2 ? [2, 3, 4, 5, 6, 10] : p === 3 ? [7] : p === 4 ? [8] : TOUTES_LES_TABLES) },
  { classe: "CE1", motif: /faits multiplicatifs usuels/, objectifs: ["ce1-doubles", "ce1-moities", "ce1-multiples-25"] },
  { classe: "CE1", motif: /nombre entier de (dizaines|centaines)/, objectifs: ["ce1-dizaines-centaines"] },
  { classe: "CE1", motif: /multiplier par 10 un nombre/, objectifs: ["ce1-fois-10"] },
  { classe: "CE1", motif: /ajouter 9, 19 (ou|et) 29/, objectifs: ["ce1-ajouter-9-19-29"] },
  { classe: "CE1", motif: /soustraire 9 a un nombre/, objectifs: ["ce1-soustraire-9"] },
  { classe: "CE1", motif: /soustraire un nombre inferieur a 9/, objectifs: ["ce1-soustraire-unites"] },
  { classe: "CE1", motif: /moitie d.un nombre pair/, objectifs: ["ce1-moitie-pair"] },
  { classe: "CE1", motif: /compris entre 11 et 19/, objectifs: ["ce1-produit-11-19"] },
  { classe: "CE2", motif: /tables d.addition/, objectifs: ["ce2-tables-addition"] },
  { classe: "CE2", motif: /tables de multiplication/, objectifs: ["ce2-table-multiplication"], tables: () => TOUTES_LES_TABLES },
  { classe: "CE2", motif: /faits multiplicatifs usuels/, objectifs: ["ce2-doubles", "ce2-moities", "ce2-multiples-25", "ce2-produits-60"] },
  { classe: "CE2", motif: /par 10 ou (par )?100/, objectifs: ["ce2-fois-10-100"] },
  { classe: "CE2", motif: /ajouter 8, 9, 18/, objectifs: ["ce2-ajouter-8-9"] },
  { classe: "CE2", motif: /soustraire 9, 19, 29/, objectifs: ["ce2-soustraire-9"] },
  { classe: "CE2", motif: /par 4 ou par 8/, objectifs: ["ce2-fois-4-8"] },
  { classe: "CE2", motif: /inferieur a 10 par un nombre entier de dizaines/, objectifs: ["ce2-fois-dizaines"] },
  { classe: "CE2", motif: /compris entre 11 et 99/, objectifs: ["ce2-produit-11-99"] },
];

/** Ce que l'atelier « Calcul mental » travaille pour une compétence : ses objectifs et ses tables ; rien quand on ne sait pas. */
export function objectifsDuCalcul(ctx: Pick<ContexteFeuilles, "classe" | "periode" | "competence">): { objectifs: string[]; tables: number[] } | null {
  const titre = plat(ctx.competence);
  const trouve = OBJECTIFS_DES_COMPETENCES.find((o) => o.classe === ctx.classe && o.motif.test(titre));
  if (!trouve) return null;
  return {
    objectifs: typeof trouve.objectifs === "function" ? trouve.objectifs(ctx.periode) : trouve.objectifs,
    tables: trouve.tables?.(ctx.periode) ?? [],
  };
}

// ── Les calculs ───────────────────────────────────────────────────────────

const calcul = (objectif: string, dire: string, ecrit: string, reponse: number): Calcul => ({ objectif, dire, ecrit, reponse: fr(reponse) });
const somme = (objectif: string, a: number, b: number) => calcul(objectif, `${fr(a)} plus ${fr(b)}`, `${fr(a)} + ${fr(b)} = …`, a + b);
const produit = (objectif: string, a: number, b: number) => calcul(objectif, `${fr(a)} fois ${fr(b)}`, `${fr(a)} × ${fr(b)} = …`, a * b);

/** Des calculs tous différents, tirés jusqu'à en avoir `n`. */
function tirerDistincts(n: number, graine: number, tirer: (alea: () => number, rang: number) => Calcul | null): Calcul[] {
  const alea = hasard(graine);
  const sortie: Calcul[] = [];
  const vus = new Set<string>();
  for (let garde = 0; sortie.length < n && garde < 4000; garde++) {
    const c = tirer(alea, sortie.length);
    if (!c || vus.has(c.ecrit)) continue;
    vus.add(c.ecrit);
    sortie.push(c);
  }
  return sortie;
}

/**
 * Ajouter un nombre presque rond — 9, 19, 29 — à des nombres du CE1 (jusqu'à 1 000). `finit` dit les chiffres des
 * unités permis : de 2 à 9 quand la procédure est la bonne, 0 ou 1 quand on ajoute directement.
 */
function ajouts(objectif: string, termes: number[], n: number, graine: number, finit: (u: number, rang: number) => boolean): Calcul[] {
  return tirerDistincts(n, graine, (alea, rang) => {
    const b = choisir(alea, termes);
    const a = entier(alea, 12, 990 - b);
    return finit(a % 10, rang) ? somme(objectif, a, b) : null;
  });
}

const PAR_LA_PROCEDURE = (u: number) => u >= 2;
/** Une sur deux se termine par 0 ou 1 : on choisit, calcul après calcul, s'il faut la procédure. */
const UNE_SUR_DEUX_DIRECTE = (u: number, rang: number) => (rang % 2 === 0 ? u >= 2 : u <= 1);
const TOUS = () => true;

/**
 * Des additions pour l'arbre à calcul : deux nombres de deux chiffres, ni dizaine entière ni nombre qui se termine
 * par 9 — le livret les évite —, la somme jusqu'à 100, une sur deux avec retenue, comme 34 + 17.
 */
export function additionsDeLArbre(n: number, graine: number): Addition[] {
  const alea = hasard(graine);
  const sortie: Addition[] = [];
  const vues = new Set<string>();
  for (let garde = 0; sortie.length < n && garde < 4000; garde++) {
    const a = 10 * entier(alea, 1, 7) + entier(alea, 1, 8);
    const b = 10 * entier(alea, 1, 7) + entier(alea, 1, 8);
    const retenue = (a % 10) + (b % 10) >= 10;
    if (a + b > 100 || retenue !== (sortie.length % 2 === 0) || vues.has(`${a}+${b}`)) continue;
    vues.add(`${a}+${b}`);
    sortie.push({ a, b });
  }
  return sortie;
}

/**
 * Les égalités d'une table, les deux facteurs dans les deux ordres — « sept fois quatre ou quatre fois sept » — ; dans
 * les deux sens aussi, sur fiche : « 8 × 7 = … », « … × 7 = 28 ».
 */
function egalitesDesTables(objectif: string, tables: number[], n: number, graine: number, deuxSens: boolean): Calcul[] {
  return tirerDistincts(n, graine, (alea) => {
    const t = choisir(alea, tables);
    const k = entier(alea, 0, 10);
    const [a, b] = alea() < 0.5 ? [k, t] : [t, k];
    if (!deuxSens || alea() < 0.65 || k === 0) return produit(objectif, a, b);
    // Le facteur manquant : celui qui n'est pas la table.
    return a === k
      ? calcul(objectif, `combien fois ${fr(t)} égale ${fr(t * k)} ?`, `… × ${fr(t)} = ${fr(t * k)}`, k)
      : calcul(objectif, `${fr(t)} fois combien égale ${fr(t * k)} ?`, `${fr(t)} × … = ${fr(t * k)}`, k);
  });
}

/** Les nombres du livret CE2 dont les élèves connaissent les doubles : la procédure du double du double y est la bonne. */
const DOUBLES_CONNUS = [11, 12, 16, 17, 30, 35, 40, 45, 50, 60, 75, 110, 120, 150, 160, 170, 250, 300, 350, 400, 450, 500, 600, 750, 1500, 2500];
/** Puis, dit le livret, des nombres dont le chiffre des unités est compris entre 1 et 5. */
const unitesDe1a5 = (alea: () => number) => 10 * entier(alea, 1, 9) + entier(alea, 1, 5);

/** Multiplier par 4 : les doubles connus d'abord, puis l'élargissement. */
function foisQuatre(objectif: string, n: number, graine: number, elargir: boolean): Calcul[] {
  return tirerDistincts(n, graine, (alea, rang) =>
    produit(objectif, 4, elargir && rang % 2 === 1 ? unitesDe1a5(alea) : choisir(alea, DOUBLES_CONNUS)));
}

/**
 * Les cas où une autre procédure va plus vite (séance 5 du livret) : un nombre comme 18, des dizaines entières, un
 * nombre inférieur à 10 ; et, au réinvestissement, le double du double avec eux.
 */
function foisQuatreMeles(objectif: string, n: number, graine: number, avecLeDoubleDuDouble: boolean): Calcul[] {
  const sortes = avecLeDoubleDuDouble ? 4 : 3;
  return tirerDistincts(n, graine, (alea, rang) => {
    const sorte = rang % sortes;
    const m = sorte === 0 ? 10 * entier(alea, 1, 9) + entier(alea, 6, 9)
      : sorte === 1 ? 10 * entier(alea, 2, 9)
        : sorte === 2 ? entier(alea, 2, 9)
          : choisir(alea, DOUBLES_CONNUS);
    return produit(objectif, 4, m);
  });
}

// ── Les feuilles, atelier par atelier ─────────────────────────────────────

const STYLE_CALCUL_MENTAL = STYLE_FEUILLE + STYLE_MARTINIERE;
const STYLE_ATELIERS_MATHS = STYLE_FEUILLE + STYLE_JEUX_MATHS;

/** Les réglages de l'atelier « Calcul mental » pour une feuille : un objectif, ses séries telles qu'on les a tirées. */
function reglagesMartiniere(classe: ClasseC2, objectifs: string[], forme: FormeEntrainement, series: Calcul[][], tables: number[] = []): ReglagesMartiniere {
  return {
    ...REGLAGES_MARTINIERE, niveau: classe, objectifs, revision: objectifs.length > 1, tables, forme,
    parSerie: Math.max(1, ...series.map((s) => s.length)), series: Math.max(1, series.length),
  };
}

/** Une feuille de l'atelier « Calcul mental », ses calculs tirés à chaque fabrication. */
function feuilleDeCalcul(
  seance: number, titre: string, classe: ClasseC2, objectif: string, forme: FormeEntrainement,
  series: (graine: number) => Calcul[][], options: { tables?: number[]; consigne?: string } = {},
): FeuilleAFabriquer {
  return {
    seance, atelier: "martiniere", titre,
    fabriquer: (graine) => {
      const s = series(graine);
      const reglages = reglagesMartiniere(classe, [objectif], forme, s, options.tables);
      return {
        html: htmlMartiniere(s, reglages, options.consigne), style: STYLE_CALCUL_MENTAL,
        // Le matériel ne dépend que des réglages : l'atelier le refait. Les séries des autres feuilles viennent de la séquence.
        refaire: forme === "materiel" && !options.consigne ? { martiniere: reglages } : undefined,
      };
    },
  };
}

/** Une feuille d'arbres à calcul. */
function feuilleDArbres(seance: number, titre: string, additions: (graine: number) => Addition[], entete?: { titre: string; consigne: string }): FeuilleAFabriquer {
  return {
    seance, atelier: "arbre", titre,
    fabriquer: (graine) => {
      const liste = additions(graine);
      return { html: htmlArbreCalcul(liste, { combien: liste.length, retenue: "mixte", aide: false }, entete), style: STYLE_ATELIERS_MATHS };
    },
  };
}

/** Des cartes recto-verso : le calcul au recto, le résultat au verso. */
function feuilleDeCartes(
  seance: number, titre: string, cartes: (graine: number) => CarteCalcul[], reglages: ReglagesCalcul, titreImprime?: string,
  /** Les cartes sont celles que l'atelier tire lui-même : il refait la feuille. */
  commeLAtelier = false,
): FeuilleAFabriquer {
  return {
    seance, atelier: "calcul", titre,
    fabriquer: (graine) => ({
      html: htmlCartesCalcul(cartes(graine), reglages, titreImprime), style: STYLE_ATELIERS_MATHS,
      refaire: commeLAtelier && !titreImprime ? { cartesCalcul: reglages } : undefined,
    }),
  };
}

const CARTES_RECTO_VERSO: ReglagesCalcul = { operation: "+", tables: [], rectoVerso: true, melanger: true };
const enCartes = (calculs: Calcul[]): CarteCalcul[] => calculs.map((c) => ({ question: c.ecrit.replace(/ = …$/, ""), reponse: Number(c.reponse.replace(/\s/g, "")) }));

/** La feuille du matériel de manipulation de l'objectif, à découper. */
const feuilleDuMateriel = (seance: number, classe: ClasseC2, objectif: string, tables: number[] = []) =>
  feuilleDeCalcul(seance, "Calcul mental — matériel de manipulation", classe, objectif, "materiel", () => [], { tables });

/** La table à construire tient sur une page : trois colonnes d'égalités, les trois recherches côte à côte. */
const STYLE_CONSTRUIRE = `
  .feuille.ma .ma-construire { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 0 0 4mm; }
  .feuille.ma .ma-construire .ma-recherche { margin: 0; padding: 2.5mm 3mm; }
  .feuille.ma .ma-construire .ma-recherche-calcul { font-size: 17px; }
`;

/**
 * La table à construire (séance 1 du livret CE1) : les résultats qu'on retrouve par la commutativité, ceux qu'on
 * construit en disant comment, puis la table entière, la trace écrite.
 */
export function htmlConstruireLaTable(table: number, nouveaux: number[]): string {
  const tous = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const connus = tous.filter((k) => !nouveaux.includes(k));
  const egalite = (k: number, reponse: boolean) =>
    `<div class="ma-egalite"><span class="ma-numero"></span>${k} × ${table} = ${reponse ? `<b>${k * table}</b>` : `<span class="ma-trou"></span>`}</div>`;
  const egalites = (ks: number[], reponse = false) => `<div class="ma-egalites ma-serre">${ks.map((k) => egalite(k, reponse)).join("")}</div>`;
  const eleve = `<div class="page"><div class="titre">La table de ${table}</div>
    <div class="sous">Prénom : ........................................ Date : ........................</div>
    <div class="consigne">1. Ce que je sais déjà, grâce aux autres tables : « 3 fois ${table}, c'est ${table} fois 3 ».</div>
    ${egalites(connus)}
    <div class="consigne" style="margin-top:5mm">2. Je construis les résultats nouveaux, et je dis comment.</div>
    <div class="ma-construire">${nouveaux.map((k) => `<div class="ma-recherche"><div class="ma-recherche-calcul">${k} × ${table} = <span class="ma-trou"></span></div>
      <div class="ma-etiquette">Comment j'ai fait :</div><div class="ma-lignes">${'<div class="ma-ligne"></div>'.repeat(3)}</div></div>`).join("")}</div>
    <div class="ma-retenir"><div class="ma-retenir-titre">3. Ma table de ${table}</div>${egalites(tous)}</div></div>`;
  const corrige = `<div class="page corrige"><div class="titre">La table de ${table} — corrigé</div>${egalites(tous, true)}</div>`;
  return feuille(eleve + corrige, "ma");
}

// ── Les séquences des livrets ─────────────────────────────────────────────

/** La note du matériel de chaque séance, avec les feuilles nommées comme elles s'impriment. */
function notes(feuilles: FeuilleAFabriquer[], debuts: string[]): string[] {
  return debuts.map((debut, s) => {
    const f = feuilles.filter((x) => x.seance === s).map((x) => `« ${x.titre} »`);
    return f.length ? `${debut} ; ${f.length > 1 ? "les feuilles" : "la feuille"} ${f.join(" et ")}.` : `${debut}.`;
  });
}

const liste = (objectif: string, termes: [number, number][], op: typeof somme = somme) => termes.map(([a, b]) => op(objectif, a, b));

function planDeLArbre(): PlanDesFeuilles {
  const o = "cp-deux-nombres";
  const feuilles: FeuilleAFabriquer[] = [
    // L'annexe « séance 1 – Différenciation » : pour ceux qui sont à l'aise.
    feuilleDArbres(0, "Arbre à calcul — en autonomie", () => [[17, 33], [24, 27], [39, 13], [15, 27], [31, 12], [34, 18]].map(([a, b]) => ({ a, b }))),
    feuilleDuMateriel(0, "CP", o),
    // L'annexe « séance 2 – entraînement ».
    feuilleDArbres(1, "Arbre à calcul — fiche d'entraînement",
      () => [[24, 12], [15, 22], [25, 17], [14, 27], [31, 14], [34, 23], [27, 26], [24, 27], [36, 17]].map(([a, b]) => ({ a, b }))),
    feuilleDArbres(2, "Arbre à calcul — entraînement, d'autres nombres", (g) => additionsDeLArbre(9, g)),
    feuilleDeCartes(2, "Cartes autocorrectives — ajouter deux nombres",
      (g) => additionsDeLArbre(20, g).map(({ a, b }) => ({ question: `${a} + ${b}`, reponse: a + b })), CARTES_RECTO_VERSO,
      "Cartes autocorrectives — ajouter deux nombres inférieurs à 100"),
    feuilleDArbres(3, "Arbre à calcul — évaluation, 9 calculs en 3 minutes", (g) => additionsDeLArbre(9, g), {
      titre: "Évaluation — ajouter deux nombres",
      consigne: "Tu as 3 minutes. Tu n'es pas obligé de tracer l'arbre : pour les calculs que tu trouves faciles, calcule dans ta tête et écris seulement le résultat.",
    }),
    feuilleDeCalcul(4, "Calcul mental — ajouter deux nombres, en rituel", "CP", o, "ecrit", (g) => [additionsDeLArbre(9, g).map(({ a, b }) => somme(o, a, b))]),
    {
      seance: 4, atelier: "partieTout", titre: "Problèmes partie-tout — chercher le tout",
      fabriquer: (g) => ({
        html: feuilleProblemes(genererPartieTout({ nombre: 4, parties: 2, inconnue: "tout", max: 100, min: 30, partMin: 11, enonces: true, prenoms: [] }, g),
          "Problèmes partie-tout — chercher le tout", PRESENTATION_COMPLETE),
        style: STYLE_PROBLEMES,
        refaire: {
          partieTout: { titre: "Problèmes partie-tout — chercher le tout", nombre: 4, prenoms: "", parties: 2, inconnue: "tout", max: 20,
            perso: true, toutMin: 30, toutMax: 100, partieMin: 11 },
          "presentation:partieTout": PRESENTATION_COMPLETE,
        },
      }),
    },
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Des cubes emboîtables et des barres de dix pour valider ; les ardoises ; le cahier de mathématiques pour la trace écrite",
      "Les ardoises",
      "Les ardoises ; les cartes, imprimées recto-verso, pour le coin d'entraînement en autonomie",
      "Un chronomètre",
      "Les ardoises",
    ]),
  };
}

function planDuCE1Ajouter19(): PlanDesFeuilles {
  const o = "ce1-ajouter-9-19-29";
  const ecrit = (seance: number, titre: string, series: (g: number) => Calcul[][], consigne?: string) =>
    feuilleDeCalcul(seance, titre, "CE1", o, "ecrit", series, { consigne });
  const feuilles: FeuilleAFabriquer[] = [
    feuilleDeCalcul(0, "Calcul mental — découverte : ajouter 19", "CE1", o, "decouverte", () => [liste(o, [[58, 19], [26, 19], [47, 19]])]),
    // L'annexe « séance 1 – Différenciation ».
    ecrit(0, "Ajouter 19 — en autonomie", () => [liste(o, [[17, 19], [54, 19], [69, 19], [115, 19], [132, 19], [125, 19]])]),
    feuilleDuMateriel(0, "CE1", o),
    // L'annexe « séance 2 – entraînement ».
    ecrit(1, "Ajouter 19 — fiche d'entraînement", () => [liste(o, [[84, 19], [115, 19], [125, 19], [264, 19], [131, 19], [234, 19], [257, 19], [304, 19], [536, 19], [482, 19], [507, 19], [633, 19]])]),
    ecrit(2, "Ajouter 19 — quand le nombre se termine par 0 ou 1", (g) => [ajouts(o, [19], 12, g, UNE_SUR_DEUX_DIRECTE)],
      "Calcule de tête. Avant chaque calcul, demande-toi : faut-il ajouter 20 et retirer 1 ?"),
    ecrit(3, "Ajouter 19 — calculs mélangés (1)", (g) => [ajouts(o, [19], 12, g, TOUS)]),
    ecrit(4, "Ajouter 19 — calculs mélangés (2)", (g) => [ajouts(o, [19], 12, g, TOUS)], "Calcule de tête : 12 calculs, le plus vite possible."),
    ecrit(5, "Ajouter 29 — entraînement", (g) => [ajouts(o, [29], 12, g, PAR_LA_PROCEDURE)]),
    ecrit(6, "Ajouter 9, 19 et 29 — entraînement", (g) => [ajouts(o, [9, 19, 29], 12, g, TOUS)]),
    feuilleDeCartes(6, "Cartes autocorrigées — ajouter 9, 19 ou 29", (g) => enCartes(ajouts(o, [9, 19, 29], 20, g, TOUS)), CARTES_RECTO_VERSO,
      "Cartes autocorrigées — ajouter 9, 19 ou 29"),
    // L'évaluation du livret : 12 calculs en 3 minutes, l'ajout de 19 puis les stratégies mêlées pour 9 ou 19.
    feuilleDeCalcul(7, "Ajouter 9, 19 ou 29 — évaluation", "CE1", o, "evaluation",
      (g) => [ajouts(o, [19, 9], 12, g, TOUS), ajouts(o, [9, 19, 29], 6, g + 1, TOUS)]),
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Le matériel de manipulation — barres de dix et cubes, deux couleurs pour le cube ajouté puis retiré — ; les ardoises ; le cahier de mathématiques pour la trace écrite",
      "Les ardoises",
      "Les ardoises ; le cahier, pour compléter la trace écrite",
      "Les ardoises ; un chronomètre",
      "Un chronomètre",
      "Les ardoises ; le cahier, pour compléter la trace écrite",
      "Les cartes, imprimées recto-verso, pour le coin d'entraînement",
      "Un chronomètre",
    ]),
  };
}

function planDeLaTableDe7(): PlanDesFeuilles {
  const o = "ce1-table-multiplication";
  const oral = (seance: number, titre: string) =>
    feuilleDeCalcul(seance, titre, "CE1", o, "oral", (g) => [egalitesDesTables(o, [7], 10, g, false)], { tables: [7] });
  const fiche = (seance: number, titre: string, tables: number[]) =>
    feuilleDeCalcul(seance, titre, "CE1", o, "ecrit", (g) => [egalitesDesTables(o, tables, 20, g, true)],
      { tables, consigne: "Complète le plus d'égalités possible en deux minutes." });
  const cartes = (seance: number, titre: string, tables: number[]) =>
    feuilleDeCartes(seance, titre, (g) => cartesCalcul({ operation: "x", tables, rectoVerso: true, melanger: true }, g),
      { operation: "x", tables, rectoVerso: true, melanger: true }, undefined, true);
  const feuilles: FeuilleAFabriquer[] = [
    { seance: 0, atelier: "martiniere", titre: "La table de 7 — je construis", fabriquer: () => ({ html: htmlConstruireLaTable(7, [7, 8, 9]), style: STYLE_CALCUL_MENTAL + STYLE_CONSTRUIRE }) },
    oral(2, "La table de 7 — à l'ardoise"),
    oral(3, "La table de 7 — à l'ardoise, sans le cahier"),
    oral(4, "La table de 7 — dix calculs à noter (1)"),
    oral(5, "La table de 7 — dix calculs à noter (2)"),
    cartes(6, "Cartes de la table de 7", [7]),
    cartes(7, "Cartes des tables de 5, 6 et 7", [5, 6, 7]),
    fiche(8, "La table de 7 — vingt égalités", [7]),
    fiche(9, "Les tables de 5, 6 et 7 — vingt égalités", [5, 6, 7]),
    fiche(10, "La table de 7 — vingt égalités, une semaine plus tard", [7]),
    fiche(11, "Les tables de 5, 6 et 7 — vingt égalités, trois semaines plus tard", [5, 6, 7]),
    fiche(12, "Les tables de 5, 6 et 7 — évaluation", [5, 6, 7]),
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "La table de Pythagore des tables déjà construites ; des cubes emboîtables ou des jetons ; les ardoises ; le cahier pour la trace écrite",
      "Le cahier, la table de 7 ; les ardoises",
      "Les ardoises ; le cahier ouvert",
      "Les ardoises, cahiers fermés",
      "Les ardoises",
      "Les ardoises",
      "Les cartes imprimées recto-verso, un jeu par binôme",
      "Les cartes, un jeu par binôme",
      "Un chronomètre",
      "Un chronomètre ; la leçon pour se corriger",
      "Un chronomètre",
      "Un chronomètre ; la leçon pour se corriger",
      "Un chronomètre",
    ]),
  };
}

function planDuCE2FoisQuatre(): PlanDesFeuilles {
  const o = "ce2-fois-4-8";
  const ecrit = (seance: number, titre: string, series: (g: number) => Calcul[][], consigne?: string) =>
    feuilleDeCalcul(seance, titre, "CE2", o, "ecrit", series, { consigne });
  const feuilles: FeuilleAFabriquer[] = [
    feuilleDeCalcul(0, "Calcul mental — découverte : multiplier par 4", "CE2", o, "decouverte", () => [liste(o, [[4, 35], [4, 45], [4, 16]], produit)]),
    feuilleDuMateriel(0, "CE2", o),
    feuilleDeCalcul(1, "Multiplier par 4 — à l'ardoise", "CE2", o, "oral", (g) => [foisQuatre(o, 10, g, false)]),
    // Le livret : trois calculs en trois minutes d'abord, puis davantage dans le même temps — six, ici.
    ecrit(2, "Multiplier par 4 — sur fiche", (g) => [foisQuatre(o, 6, g, true)], "Calcule de tête : le double, puis encore le double."),
    ecrit(3, "Multiplier par 4 — évaluation intermédiaire, 9 calculs en 3 minutes", (g) => [foisQuatre(o, 9, g, true)],
      "Calcule de tête : 9 calculs en 3 minutes."),
    ecrit(4, "Multiplier par 4 — choisir sa procédure", (g) => [foisQuatreMeles(o, 9, g, false)],
      "Calcule de tête. Choisis ta procédure : la table de 4, les dizaines, ou le double du double."),
    ecrit(5, "Multiplier par 4 — réinvestissement", (g) => [foisQuatreMeles(o, 12, g, true)]),
  ];
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Des cubes emboîtables pour chercher et valider ; les ardoises ; le cahier de mathématiques pour la trace écrite",
      "Les ardoises",
      "Un chronomètre",
      "Un chronomètre",
      "Les ardoises ; le cahier, pour compléter la trace écrite",
      "Un chronomètre",
    ]),
  };
}

// ── La démarche du guide CP, au procédé La Martinière ─────────────────────
//
// Elle installe un fait ou une procédure dans la durée : une découverte en
// séance longue, des séances courtes au procédé La Martinière, un
// réinvestissement, une évaluation. Chaque séance reçoit sa feuille : la
// fiche de recherche et le matériel à la découverte, la fiche du maître et
// les ardoises papier aux entraînements, une série écrite courte et des
// problèmes au réinvestissement, l'évaluation finale et son corrigé.

/** Une feuille de la démarche : la séance qui la reçoit, sa forme ; une seule série pour la fluence du jour. */
interface FeuilleDeSequence { seance: number; forme: FormeEntrainement; uneSerie?: boolean }

const FEUILLES_LA_MARTINIERE: FeuilleDeSequence[] = [
  { seance: 0, forme: "decouverte" },
  { seance: 0, forme: "materiel" },
  { seance: 1, forme: "oral" },
  { seance: 2, forme: "oral" },
  { seance: 3, forme: "oral" },
  { seance: 4, forme: "ecrit", uneSerie: true },
  { seance: 5, forme: "evaluation" },
];

/** La séance où vont les problèmes qui réinvestissent le calcul : celle du réinvestissement. */
const SEANCE_DES_PROBLEMES = 4;

/** Le titre d'une feuille, comme l'atelier la nomme. */
const titreDeLaFeuille = (f: FeuilleDeSequence) => ({
  oral: "Calcul mental — La Martinière", ecrit: "Calcul mental — test de fluence",
  decouverte: "Calcul mental — découverte", materiel: "Calcul mental — matériel de manipulation",
  evaluation: "Calcul mental — évaluation finale",
}[f.forme]);

/** Les objectifs qu'une feuille de la démarche travaille : un par séance d'entraînement, tous ensemble ensuite. */
function objectifsDeLaFeuille(f: FeuilleDeSequence, objectifs: string[]): string[] {
  const n = objectifs.length;
  if (n === 1 || f.forme === "decouverte" || f.forme === "materiel") return [objectifs[0]];
  // Les trois séances d'entraînement : chacune le sien, la troisième mêle tout quand il n'y en a que deux.
  if (f.forme === "oral" && f.seance - 1 < Math.min(n, 3) && !(n === 2 && f.seance === 3)) return [objectifs[f.seance - 1]];
  return objectifs;
}

function planDeLaMartiniere(classe: ClasseC2, objectifs: string[], tables: number[]): PlanDesFeuilles | null {
  const premier = objectifParId(objectifs[0]);
  if (!premier || premier.niveau !== classe) return null;
  const feuilles: FeuilleAFabriquer[] = FEUILLES_LA_MARTINIERE.map((f) => {
    const ceux = objectifsDeLaFeuille(f, objectifs);
    const series = f.uneSerie ? 1 : 2;
    const seul = ceux.length === 1 ? objectifParId(ceux[0]) : undefined;
    // Plusieurs objectifs dans la séquence : chaque feuille d'entraînement dit le sien.
    const titre = objectifs.length > 1 && f.forme === "oral"
      ? `${titreDeLaFeuille(f)} : ${seul ? libelleTravaille(seul, tables) : "tout mêlé"}` : titreDeLaFeuille(f);
    return {
      seance: f.seance, atelier: "martiniere", titre,
      fabriquer: (graine: number) => {
        const r: ReglagesMartiniere = { ...REGLAGES_MARTINIERE, niveau: classe, objectifs: ceux, revision: ceux.length > 1, tables, forme: f.forme, parSerie: 10, series };
        return { html: htmlMartiniere(calculsMartiniere(r, graine), r), style: STYLE_CALCUL_MENTAL, refaire: { martiniere: r } };
      },
    };
  });
  // Les problèmes qui réinvestissent le calcul, quand il en a.
  const associes = problemesAssocies(premier, tables);
  if (associes) {
    const titre = `Problèmes — ${libelleTravaille(premier, tables)}`;
    feuilles.push({
      seance: SEANCE_DES_PROBLEMES, atelier: associes.atelier, titre,
      fabriquer: (graine) => ({
        html: feuilleProblemes(problemesDe(associes, 4, graine), titre, PRESENTATION_COMPLETE), style: STYLE_PROBLEMES,
        refaire: memoiresDesProblemes(associes, titre, 4),
      }),
    });
  }
  return {
    feuilles,
    materiel: notes(feuilles, [
      "Le matériel de manipulation de l'objectif, à découper ; le cahier de recherche ; les ardoises",
      "Les ardoises, ou les ardoises papier qui suivent la fiche du maître",
      "Les ardoises ; le matériel, sous la main de qui en a besoin",
      "Les ardoises ; chacun note son score",
      "Un chronomètre pour la série écrite",
      "Un chronomètre",
    ]),
  };
}

// ── Le plan ───────────────────────────────────────────────────────────────

/** Les démarches de calcul mental dont on sait fabriquer les feuilles. */
export const estUneDemarcheDeCalcul = (demarcheId: string) =>
  ["arbre-a-calcul-cp", "ajouter-9-19-29-ce1", "table-de-7-ce1", "multiplier-par-4-ce2", "calcul-mental-martiniere"].includes(demarcheId);

/**
 * Les feuilles et le matériel d'une démarche de calcul mental. Celle du guide
 * CP prend les objectifs de la compétence — ou celui qu'on a rattaché à la
 * compétence dans l'atelier ; rien quand on ne sait pas ce qu'elle travaille.
 */
export function planDuCalcul(demarcheId: string, ctx: ContexteFeuilles): PlanDesFeuilles | null {
  if (demarcheId === "arbre-a-calcul-cp") return planDeLArbre();
  if (demarcheId === "ajouter-9-19-29-ce1") return planDuCE1Ajouter19();
  if (demarcheId === "table-de-7-ce1") return planDeLaTableDe7();
  if (demarcheId === "multiplier-par-4-ce2") return planDuCE2FoisQuatre();
  if (demarcheId !== "calcul-mental-martiniere") return null;
  const rattache = ctx.objectifRattache && objectifParId(ctx.objectifRattache)?.niveau === ctx.classe ? ctx.objectifRattache : null;
  const duProgramme = objectifsDuCalcul(ctx);
  if (rattache) return planDeLaMartiniere(ctx.classe, [rattache], duProgramme?.objectifs.includes(rattache) ? duProgramme.tables : []);
  return duProgramme ? planDeLaMartiniere(ctx.classe, duProgramme.objectifs, duProgramme.tables) : null;
}
