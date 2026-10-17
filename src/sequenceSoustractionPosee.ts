// ── La soustraction posée au CE1 : une séquence toute faite ────────────────
//
// L'enseignant l'a demandée (octobre 2026) : une séquence de soustraction
// posée « qui ne donne pas que la procédure », où les élèves manipulent, et
// dont chaque séance commence par le calcul mental La Martinière. Ce n'est
// pas une séquence d'Éduscol — les livrets n'en ont pas pour les opérations
// — mais elle se bâtit sur ce qu'Éduscol en dit, et se présente dans
// Fabriquer comme les autres séquences toutes faites.
//
// Les sources :
// - la fiche d'intervention « Poser et effectuer des opérations » des
//   évaluations nationales de début de CE2 (Éduscol, août 2026) : au CE1,
//   « l'élève connait un algorithme de soustraction posée (« par cassage » ou
//   « par compensation ») », la différence de deux nombres de deux ou trois
//   chiffres, avec et sans retenue ; « quelle que soit la technique,
//   l'enseignant utilise la manipulation et explicite les actions sur les
//   chiffres » ; 59 – 48 avec le matériel avant trois chiffres — une seule
//   collection, dont on retire ; « étudier les différents cas de retenues
//   (dizaines et centaines) séparément avant de les rencontrer
//   simultanément » ; vérifier que le résultat est plus petit ; ensuite, un
//   entraînement court chaque jour et une dizaine de problèmes par semaine ;
// - la fiche de début de CM1 (Éduscol) : par cassage, « justifier
//   l'algorithme par l'utilisation de matériel puis la verbalisation » ; le
//   même algorithme du CE1 au CM2 ; « les manipulations proposées seront
//   d'abord réelles puis mentales » (guide CP, p. 72) ;
// - les fiches CE1 d'Éduscol de mai 2020 : le cassage sur 331 – 214, les
//   conversions d'unités de numération (1 c = 10 d = 100 u) ;
// - le programme de mathématiques du cycle 2 (2024), et la démarche en quatre
//   temps des livrets.
//
// L'algorithme est celui du cassage : c'est lui qui se justifie par le
// matériel. Une école qui a choisi la compensation le garde du CE1 au CM2 ;
// cette séquence n'est pas pour elle.

import { api, anneeScolaireActuelle, couleurPourMatiere, newId, nowIso, type Referentiel, type Seance, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { STYLE_FEUILLE, feuille } from "./cartesImprimables";
import { REGLAGES_CUBES, STYLE_CUBES, couleursDe, decomposer, defaire, dessinerGroupes, reglagesCubesSurs, type CouleursCubes, type Parts } from "./cubesNumeration";
import { seancesDuCadre, type Demarche, type PhaseCadre, type SeanceCadre } from "./demarches";
import type { FeuilleAFabriquer } from "./feuillesDesSequences";
import { hasard } from "./hasard";
import { poserDansUneSeance } from "./impressionAtelier";
import { REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere, type ReglagesMartiniere } from "./martiniere";
import { noteDuMaterielDesCompetences } from "./materielDeClasse";
import { REGLAGES_POSEES, STYLE_POSEES, cassagesDe, htmlOperationsPosees, type ReglagesPosees } from "./operationsPosees";
import { escapeHtml } from "./print";
import { PRESENTATION_COMPLETE, STYLE_FEUILLE as STYLE_PROBLEMES, feuilleProblemes, genererPartieTout } from "./problemesBarres";
import { competenceDuProgramme } from "./sequenceCategoriser";
import { STYLE_SEQUENCE_CUBES, htmlDeLaFeuilleCubes } from "./sequenceCubes";
import { chargerVacances, periodeDuJour } from "./vacances";

/** L'atelier de Fabriquer qui la présente. */
export const ATELIER_SOUSTRACTION_POSEE = "soustractionPosee";

const LM = "Calcul mental — procédé La Martinière";
const T1 = "Temps 1 – Définition des objectifs et mise en réussite";
const T2 = "Temps 2 – Mise en activité des élèves";
const T3 = "Temps 3 – Institutionnalisation, retour réflexif";
const T4 = "Temps 4 – Automatisation, réinvestissement, transfert";
const ph = (phase: string, duree: string, description: string, posture = ""): PhaseCadre => ({ phase, duree, description, posture });
const sauront = (quoi: string) => `À la fin de cette séance, les élèves sauront ${quoi}`;

/** Les objectifs de calcul mental du CE1 qui ouvrent les séances (voir faitsNumeriques). */
const CALCUL_MENTAL = {
  unites: { id: "ce1-soustraire-unites", quoi: "soustraire un nombre à un chiffre — « 15 – 3 », « 48 – 6 »" },
  dizaines: { id: "ce1-dizaines-centaines", quoi: "ajouter ou soustraire des dizaines, des centaines entières — « 70 – 30 », « 500 – 200 »" },
  tables: { id: "ce1-tables-addition", quoi: "les tables d'addition dans les deux sens — « 12 – 7 », « 15 – 8 » : les calculs qu'on fait après avoir cassé" },
  neuf: { id: "ce1-soustraire-9", quoi: "soustraire 9 : retirer 10, ajouter 1" },
} as const;
type CalculMental = keyof typeof CALCUL_MENTAL;

/** La phase qui ouvre chaque séance : le calcul mental, au procédé La Martinière. */
const laMartiniere = (quoi: CalculMental) => ph(LM, "10 min",
  `${CALCUL_MENTAL[quoi].quoi[0].toUpperCase()}${CALCUL_MENTAL[quoi].quoi.slice(1)}. L'enseignant dit le calcul ; chacun écrit le résultat sur son ardoise et la lève au signal.`,
  "En début de séance de numération et de calcul, chaque jour.");

/** Le calcul mental de chaque séance, dans l'ordre : il prépare ce que la séance va demander. */
export const CALCUL_MENTAL_DES_SEANCES: CalculMental[] = ["unites", "dizaines", "dizaines", "tables", "tables", "dizaines", "dizaines", "tables", "neuf", "tables"];

const s = (titre: string, objectifs: string, duree: number, phases: PhaseCadre[], consignes?: string[]): SeanceCadre =>
  ({ titre, objectifs, duree, phases, ...(consignes ? { consignes } : {}) });

export const DEMARCHE_SOUSTRACTION_POSEE: Demarche = {
  id: "soustraction-posee-ce1", nom: "La soustraction posée (CE1)", famille: "Mathématiques",
  source: "Bâtie à la demande de l'enseignant d'après Éduscol — fiches d'intervention des évaluations de début de CE2 (2026) et de CM1, fiches CE1 de mai 2020 — et le programme de mathématiques du cycle 2 (2024) ; démarche en quatre temps des livrets",
  resume: "Au CE1 : la soustraction posée par cassage, comprise avant d'être appliquée. Chaque séance s'ouvre sur le calcul mental La Martinière ; on retire d'abord avec le matériel — barres, cubes, plaques —, on échange une dizaine contre dix unités, puis on pose, en reliant chaque action sur le matériel à l'écriture. La dizaine cassée, puis la centaine, séparément, avant de les mêler ; on vérifie que le résultat est plus petit. Ensuite, un entraînement court chaque jour et des problèmes chaque semaine.",
  seances: [
    s("Retirer : le sens de la soustraction", sauront("dire qu'une soustraction retire une quantité d'une collection, et trouver ce qui reste avec le matériel, puis en barrant sur un dessin."), 45, [
      laMartiniere("unites"),
      ph(T1, "10 min", "Un problème dit à l'oral : « La boulangère a 58 croissants ; elle en vend 23. Combien lui en reste-t-il ? » On a une collection, on en retire une partie."),
      ph(T2, "20 min", "Par deux, avec le matériel : on constitue 58 — 5 barres et 8 cubes —, on retire 23 — 2 barres et 3 cubes —, on compte ce qui reste. Puis sur la feuille, on barre sur le dessin ce qu'on retire. D'autres retraits, sans avoir à casser de barre.",
        "Fais dire ce qu'on retire : « 2 barres et 3 cubes »."),
      ph(T3, "5 min", "Ce qu'on retient : soustraire, c'est retirer ; ce qui reste est plus petit que ce qu'on avait. Le problème de la boulangère s'affiche : les suivants seront « comme lui »."),
    ], ["Je fais le nombre avec les barres et les cubes.", "Je retire les cubes, puis les barres.", "Je compte ce qui reste.", "J'écris le résultat."]),
    s("Échanger : une dizaine, c'est dix unités", sauront("échanger une barre contre dix cubes, une plaque contre dix barres, et écrire un nombre de plusieurs façons : 52, c'est 5 dizaines et 2 unités, ou 4 dizaines et 12 unités."), 45, [
      laMartiniere("dizaines"),
      ph(T1, "10 min", "Une barre, c'est dix cubes : on la défait pour de bon en dix cubes ; une plaque, c'est dix barres. 1 dizaine = 10 unités ; 1 centaine = 10 dizaines = 100 unités."),
      ph(T2, "20 min", "Avec le matériel : faire 52 de deux façons — 5 barres et 2 cubes, puis 4 barres et 12 cubes —, et 331 de trois façons. Puis les feuilles : les unités de numération dans tous les sens, un nombre de plusieurs façons.",
        "Les manipulations sont d'abord réelles, puis mentales : le matériel sert ensuite à vérifier."),
      ph(T3, "5 min", "La trace écrite : 52 = 5 d 2 u = 4 d 12 u ; 331 = 3 c 3 d 1 u = 3 c 2 d 11 u = 2 c 13 d 1 u."),
    ]),
    s("Poser une soustraction, sans casser", sauront("poser une soustraction en colonnes — le plus grand nombre en haut, les unités sous les unités, les dizaines sous les dizaines — et la calculer."), 45, [
      laMartiniere("dizaines"),
      ph(T1, "10 min", "59 – 48 avec le matériel : on constitue 59, on en retire 48. Ce n'est pas deux collections, comme pour l'addition : c'est une seule, dont on retire."),
      ph(T2, "20 min", "L'enseignant pose la soustraction au tableau et relie chaque action sur le matériel à son écriture : « 9 unités moins 8 unités, 1 unité ; 5 dizaines moins 4 dizaines, 1 dizaine ». Les élèves posent et calculent, le matériel en main, puis sans.",
        "Vérifie que le plus grand nombre est en haut."),
      ph(T3, "5 min", "Ce qu'on retient : on aligne rang par rang, le plus grand nombre en haut ; le résultat est plus petit que le premier nombre."),
    ]),
    s("Pas assez d'unités : casser une dizaine", sauront("casser une dizaine en dix unités quand il n'y a pas assez d'unités, avec le matériel, puis dans la soustraction posée."), 45, [
      laMartiniere("tables"),
      ph(T1, "10 min", "52 – 27 avec le matériel : on veut retirer 7 cubes, il n'y en a que 2. On casse une barre en dix cubes : 4 barres et 12 cubes. On retire 7 cubes, puis 2 barres : il reste 2 barres et 5 cubes."),
      ph(T2, "20 min", "L'enseignant pose 52 – 27 en disant le cassage en même temps qu'il le fait sur le matériel : on barre le 5, on écrit 4 au-dessus ; on écrit un 1 devant le 2 — 12 unités ; 12 unités moins 7 unités, 5 unités ; 4 dizaines moins 2 dizaines, 2 dizaines. Les élèves cassent, puis posent : le dessin d'abord, puis les soustractions.",
        "C'est en cassant qu'on voit pourquoi on commence par les unités."),
      ph(T3, "5 min", "La trace écrite : une soustraction posée, le cassage montré à côté du dessin des barres et des cubes."),
    ], ["Je regarde les unités : y en a-t-il assez pour retirer ?", "S'il n'y en a pas assez, je casse une dizaine en dix unités.", "Je barre la dizaine cassée et j'écris ce qui en reste.", "Je retire les unités, puis les dizaines.", "Je vérifie : le résultat est plus petit que le premier nombre."]),
    s("Casser ou pas : s'entraîner", sauront("poser seuls des soustractions de nombres à deux chiffres, et décider avant de calculer s'il faut casser une dizaine."), 45, [
      laMartiniere("tables"),
      ph(T2, "25 min", "Des soustractions à poser, avec et sans cassage, mêlées : on regarde d'abord les unités — assez, ou pas assez ? Le matériel reste sur la table, pour vérifier.",
        "Le matériel reste à disposition de qui en a besoin."),
      ph(T3, "10 min", "On compare deux erreurs : retirer le petit chiffre du grand dans chaque colonne (7 – 2 au lieu de casser) ; casser la dizaine sans la barrer."),
    ]),
    s("Trois chiffres : casser une dizaine", sauront("poser une soustraction de nombres à trois chiffres, les centaines sous les centaines, et casser une dizaine quand il le faut."), 45, [
      laMartiniere("dizaines"),
      ph(T1, "10 min", "331 – 214 avec les plaques, les barres et les cubes : 1 cube, on veut en retirer 4 — on casse une barre."),
      ph(T2, "20 min", "Des soustractions de nombres à trois chiffres où l'on casse une dizaine — jamais encore une centaine : on étudie les cas séparément."),
      ph(T3, "5 min", "La trace écrite s'enrichit : les centaines sous les centaines."),
    ]),
    s("Pas assez de dizaines : casser une centaine", sauront("casser une centaine en dix dizaines quand il n'y a pas assez de dizaines."), 45, [
      laMartiniere("dizaines"),
      ph(T1, "10 min", "Le boucher a 145 saucisses ; il en vend 92. Combien lui en reste-t-il ? Avec le matériel : 4 barres, on veut en retirer 9 — on casse la plaque en dix barres : 14 barres."),
      ph(T2, "20 min", "Sur la feuille, le dessin d'abord — on casse une plaque —, puis des soustractions où l'on casse une centaine."),
      ph(T3, "5 min", "Ce qu'on retient : on casse une centaine comme on cassait une dizaine — 1 centaine = 10 dizaines."),
    ], ["Je regarde les dizaines : y en a-t-il assez pour retirer ?", "S'il n'y en a pas assez, je casse une centaine en dix dizaines.", "Je barre la centaine cassée et j'écris ce qui en reste.", "Je retire les dizaines, puis les centaines.", "Je vérifie : le résultat est plus petit que le premier nombre."]),
    s("Casser deux fois, et vérifier", sauront("poser une soustraction où l'on casse une dizaine et une centaine, et vérifier le résultat par une addition ou un ordre de grandeur."), 45, [
      laMartiniere("tables"),
      ph(T1, "10 min", "332 – 158 : pas assez d'unités, puis pas assez de dizaines. Avec le matériel, on casse deux fois."),
      ph(T2, "20 min", "Des soustractions où l'on casse une dizaine et une centaine, puis on vérifie : 174 + 158 redonne 332 ; 330 – 160, c'est à peu près 170."),
      ph(T3, "5 min", "Ce qu'on retient : le résultat est plus petit que le premier nombre, et l'addition le vérifie."),
    ]),
    s("Des problèmes : de tête ou posée ?", sauront("résoudre des problèmes où l'on retire, en choisissant de calculer de tête ou de poser la soustraction."), 45, [
      laMartiniere("neuf"),
      ph(T2, "25 min", "Des problèmes de retrait, « comme » celui de la boulangère, puis celui du boucher : on écrit le calcul, on choisit de le faire de tête ou de le poser, on écrit la réponse par une phrase."),
      ph(T3, "10 min", "Ce qu'on retient : le calcul mental d'abord, chaque fois qu'il suffit ; la soustraction posée quand les nombres sont grands."),
    ]),
    s("Évaluation", sauront("poser et calculer seuls des soustractions de nombres à deux et trois chiffres, avec et sans cassage."), 30, [
      laMartiniere("tables"),
      ph("Évaluation", "15 min", "Des soustractions à poser et à calculer, avec et sans cassage."),
      ph(T4, "5 min", "Ensuite, un entraînement court chaque jour — une quinzaine de minutes — et une dizaine de problèmes par semaine, toute l'année."),
    ]),
  ],
};

// ── Les feuilles ───────────────────────────────────────────────────────────

/** Le calcul mental d'une séance, au procédé La Martinière : la fiche du maître et les ardoises. */
export function reglagesDuCalculMental(quoi: CalculMental): ReglagesMartiniere {
  return { ...REGLAGES_MARTINIERE, niveau: "CE1", objectifs: [CALCUL_MENTAL[quoi].id], forme: "oral", ardoises: true };
}

const martiniere = (seance: number, quoi: CalculMental): FeuilleAFabriquer => {
  const r = reglagesDuCalculMental(quoi);
  return {
    seance, atelier: "martiniere", titre: `Calcul mental — ${CALCUL_MENTAL[quoi].quoi.split(" — ")[0]}`,
    fabriquer: (g) => ({ html: htmlMartiniere(calculsMartiniere(r, g), r), style: STYLE_FEUILLE + STYLE_MARTINIERE, refaire: { martiniere: r } }),
  };
};

const posees = (seance: number, titre: string, r: Partial<ReglagesPosees>): FeuilleAFabriquer => {
  const reglages = { ...REGLAGES_POSEES, operation: "−" as const, ...r };
  return {
    seance, atelier: "posees", titre,
    fabriquer: (g) => ({ html: htmlOperationsPosees(reglages, g), style: STYLE_FEUILLE + STYLE_POSEES, refaire: { operationsPosees: reglages } }),
  };
};

const cubes = (seance: number, quoi: "unites" | "facons", titre: string): FeuilleAFabriquer => ({
  seance, atelier: "cubes", titre,
  fabriquer: (g) => ({ html: htmlDeLaFeuilleCubes(quoi, reglagesCubesSurs({ ...REGLAGES_CUBES, niveau: "ce1", memeCouleur: false }), g), style: STYLE_SEQUENCE_CUBES }),
});

/** Ce que les feuilles « Je retire » demandent : retirer seulement, casser une dizaine, ou une centaine. */
export type Retrait = "retirer" | "dizaine" | "centaine";

/** Des soustractions à faire sur le dessin du matériel, toutes différentes : sans casser, en cassant une dizaine, ou une centaine. */
export function retraits(quoi: Retrait, combien: number, graine: number): { a: number; b: number }[] {
  const alea = hasard(graine);
  const entre = (x: number, y: number) => x + Math.floor(alea() * (y - x + 1));
  const sortie: { a: number; b: number }[] = [];
  const vus = new Set<string>();
  for (let garde = 0; sortie.length < combien && garde < 5000; garde++) {
    const a = quoi === "centaine" ? entre(110, 349) : entre(31, 98);
    const b = quoi === "centaine" ? entre(21, Math.min(a - 11, 199)) : entre(11, a - 10);
    const casses = cassagesDe(a, b);
    const bon = quoi === "retirer" ? casses.size === 0 : quoi === "dizaine" ? casses.size === 1 && casses.has(1) : casses.size === 1 && casses.has(2);
    if (!bon || vus.has(`${a}-${b}`)) continue;
    vus.add(`${a}-${b}`);
    sortie.push({ a, b });
  }
  return sortie;
}

const CONSIGNE_DES_RETRAITS: Record<Retrait, { titre: string; consigne: string }> = {
  retirer: { titre: "Je retire sur le dessin", consigne: "Barre sur le dessin ce que l'on retire, puis écris ce qui reste." },
  dizaine: { titre: "Je casse une dizaine pour retirer", consigne: "S'il n'y a pas assez de cubes, entoure une barre et dessine à côté ses dix cubes. Barre ensuite ce que l'on retire, puis écris ce qui reste." },
  centaine: { titre: "Je casse une centaine pour retirer", consigne: "S'il n'y a pas assez de barres, entoure une plaque et dessine à côté ses dix barres. Barre ensuite ce que l'on retire, puis écris ce qui reste." },
};

/** Les pièces qu'on retire, dites comme le matériel : « 2 barres et 3 cubes ». */
function piecesDe(n: number): string {
  const p = decomposer(n, "c");
  const noms: [number, string, string][] = [[p.c, "plaque", "plaques"], [p.d, "barre", "barres"], [p.u, "cube", "cubes"]];
  const dits = noms.filter(([k]) => k > 0).map(([k, un, des]) => `${k} ${k > 1 ? des : un}`);
  return dits.length > 1 ? `${dits.slice(0, -1).join(", ")} et ${dits[dits.length - 1]}` : dits[0] ?? "rien";
}

/**
 * La feuille « Je retire » : chaque nombre dessiné en plaques, barres et
 * cubes ; l'élève barre ce qu'on retire — en cassant une barre ou une plaque
 * quand il le faut — et écrit ce qui reste. Le corrigé montre le nombre après
 * le cassage, et le résultat.
 */
export function htmlRetraits(quoi: Retrait, items: { a: number; b: number }[], couleurs: CouleursCubes): string {
  const u = quoi === "centaine" ? 1.9 : 2.6;
  const { titre, consigne } = CONSIGNE_DES_RETRAITS[quoi];
  const casse = (a: number): Parts => (quoi === "retirer" ? decomposer(a, "c") : defaire(decomposer(a, "c"), quoi === "dizaine" ? "d" : "c"));
  const item = (x: { a: number; b: number }, i: number, corrige: boolean) => {
    const dessin = dessinerGroupes(corrige ? casse(x.a) : decomposer(x.a, "c"), u, couleurs, `${x.a}`);
    return `<div class="sr-item"><div class="sr-tete"><b>${String.fromCharCode(65 + i)}</b> On a ${x.a}. On retire ${x.b} : ${escapeHtml(piecesDe(x.b))}.</div>
      <div class="sr-dessin">${dessin.svg}</div>
      <div class="sr-calcul">${x.a} – ${x.b} = ${corrige ? `<b>${x.a - x.b}</b>` : "……………"}</div></div>`;
  };
  const page = (corrige: boolean) => `<div class="page${corrige ? " corrige" : ""}"><div class="titre">${titre}${corrige ? " — corrigé" : ""}</div>
    ${corrige ? "" : `<div class="sous">Prénom : ........................................ Date : ........................</div><div class="regle"><b>Ce que je fais</b>${consigne}</div>`}
    <div class="sr-items">${items.map((x, i) => item(x, i, corrige)).join("")}</div></div>`;
  return feuille(page(false) + page(true), "sr");
}

export const STYLE_RETRAITS = `
  .feuille.sr .sr-items { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .feuille.sr .sr-item { border: 1px dashed #9aa0b4; border-radius: 3mm; padding: 3mm; display: flex; flex-direction: column; gap: 2.5mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.sr .sr-tete { font-size: 13px; line-height: 1.4; }
  .feuille.sr .sr-dessin { min-height: 32mm; display: flex; align-items: flex-end; }
  .feuille.sr .sr-dessin svg { display: block; max-width: 100%; height: auto; }
  .feuille.sr .sr-calcul { font-size: 16px; font-weight: 600; }
`;

const retirer = (seance: number, quoi: Retrait, combien: number): FeuilleAFabriquer => ({
  seance, atelier: "cubes", titre: CONSIGNE_DES_RETRAITS[quoi].titre,
  fabriquer: (g) => ({
    html: htmlRetraits(quoi, retraits(quoi, combien, g), couleursDe({ ...REGLAGES_CUBES, memeCouleur: false })),
    style: STYLE_FEUILLE + STYLE_CUBES + STYLE_RETRAITS,
  }),
});

const PRESENTATION_SANS_SCHEMA = { ...PRESENTATION_COMPLETE, schema: "sans" as const };
const problemes = (seance: number, titre: string): FeuilleAFabriquer => ({
  seance, atelier: "partieTout", titre,
  fabriquer: (g) => ({
    html: feuilleProblemes(genererPartieTout({ nombre: 4, parties: 2, inconnue: "partie", max: 999, min: 120, partMin: 20, enonces: true, prenoms: [] }, g), titre, PRESENTATION_SANS_SCHEMA),
    style: STYLE_PROBLEMES,
  }),
});

/** Les feuilles de la séquence, séance par séance : toujours le calcul mental d'abord. */
export const FEUILLES_SOUSTRACTION_POSEE: FeuilleAFabriquer[] = [
  ...CALCUL_MENTAL_DES_SEANCES.map((quoi, i) => martiniere(i, quoi)),
  retirer(0, "retirer", 6),
  cubes(1, "unites", "Les unités de numération dans tous les sens"),
  cubes(1, "facons", "Faire un nombre de plusieurs façons"),
  posees(2, "Soustractions posées, sans casser", { chiffres: 2, retenue: "sans", combien: 6 }),
  retirer(3, "dizaine", 4),
  posees(3, "Soustractions posées — casser une dizaine", { chiffres: 2, retenue: "avec", combien: 6 }),
  posees(4, "Soustractions à poser — casser ou pas ?", { chiffres: 2, retenue: "melange", combien: 8, posees: false }),
  posees(5, "Soustractions posées, trois chiffres — casser une dizaine", { chiffres: 3, cassage: "dizaine", combien: 6 }),
  retirer(6, "centaine", 4),
  posees(6, "Soustractions posées — casser une centaine", { chiffres: 3, cassage: "centaine", combien: 6 }),
  posees(7, "Soustractions posées — casser deux fois", { chiffres: 3, cassage: "deux", combien: 6 }),
  problemes(8, "Problèmes — retirer"),
  posees(9, "Soustractions à poser — évaluation", { chiffres: 3, retenue: "melange", combien: 6, posees: false }),
];

/** Ce qu'il faut sortir à chaque séance. */
export const MATERIEL_SOUSTRACTION_POSEE: string[] = [
  "Les ardoises ; des barres de dix et des cubes, par deux",
  "Les ardoises ; des barres de dix et des cubes, des plaques de cent, à échanger",
  "Les ardoises ; des barres de dix et des cubes",
  "Les ardoises ; des barres de dix et des cubes, à casser",
  "Les ardoises ; le matériel à disposition",
  "Les ardoises ; des plaques, des barres et des cubes",
  "Les ardoises ; des plaques, des barres et des cubes, à casser",
  "Les ardoises ; des plaques, des barres et des cubes",
  "Les ardoises ; le cahier",
  "Les ardoises",
];

// ── La séquence ────────────────────────────────────────────────────────────

/** « Poser et effectuer des additions et des soustractions en colonnes », au CE1, dans les référentiels actifs. */
export const competenceDeLaSoustraction = (referentiels: Referentiel[]): CompetenceSelectionnee | null =>
  competenceDuProgramme(referentiels, "CE1", /additions et des soustractions en colonnes/i);

/** Une graine par feuille : deux feuilles de la même séance ne tirent pas les mêmes calculs, et l'aperçu montre celle qu'on créera. */
export const graineDeLaFeuille = (graine: number, i: number) => (graine + 7919 * (i + 1)) % 1_000_000_007;

/**
 * Crée la séquence : la fiche, les dix séances avec leur matériel, puis les
 * feuilles dans leurs séances — le calcul mental de chacune d'abord.
 */
export async function creerLaSequenceDeLaSoustraction(
  titre: string, competences: CompetenceSelectionnee[], graine: number,
): Promise<{ sequence: Sequence; seances: number; feuilles: number }> {
  const demarche = DEMARCHE_SOUSTRACTION_POSEE;
  const vise = competences[0];
  const matiere = "Mathématiques";
  const aujourdHui = nowIso().slice(0, 10);
  const vacances = await chargerVacances(aujourdHui).catch(() => []);
  const periode = periodeDuJour(aujourdHui, Array.isArray(vacances) ? vacances : []);
  const sequence: Sequence = {
    id: newId(), titre: titre.trim() || demarche.nom, matiere, cycle: "Cycle 2",
    objectifs: demarche.resume, competences: JSON.stringify(competences), competenceVisee: vise ? JSON.stringify(vise) : "",
    imageNom: null, couleur: couleurPourMatiere(matiere), dateCreation: nowIso(), periode, annee: anneeScolaireActuelle(), niveau: "CE1",
    ratingEngagement: 0, ratingFacilite: 0, ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
    dossier: "", nbSeancesPrevu: demarche.seances.length, etat: "", dateMaj: "",
  };
  await api.sequenceSave(sequence);
  // Le matériel de la classe que la compétence appelle : chaque séance le rappelle, après le sien.
  const noteReelle = await noteDuMaterielDesCompetences(competences, (cle) => api.settingGet(cle));
  const seances: Seance[] = seancesDuCadre(demarche, sequence.id, 1).map((x, i) => ({
    ...x, competences: JSON.stringify(competences),
    materiel: [MATERIEL_SOUSTRACTION_POSEE[i] ?? "", noteReelle].filter(Boolean).join("\n"),
  }));
  for (const x of seances) await api.seanceSave(x);
  let posees = 0;
  for (const [i, f] of FEUILLES_SOUSTRACTION_POSEE.entries()) {
    const seance = seances[f.seance];
    if (!seance) continue;
    const g = graineDeLaFeuille(graine, i);
    const { html, style, refaire } = f.fabriquer(g);
    await poserDansUneSeance(f.atelier, f.titre, html, style, seance.id, sequence.id,
      { competences: vise ? [vise] : undefined, fabrication: { ...(refaire ? { memoires: refaire } : {}), graine: g } });
    posees++;
  }
  return { sequence, seances: seances.length, feuilles: posees };
}
