// ── Comparer, encadrer, intercaler : la bataille, la file, le nombre caché ──
//
// Le programme de mathématiques du cycle 2 (BO n° 41 du 31 octobre 2024)
// attend au CP qu'on sache « comparer, encadrer, intercaler des nombres
// entiers en utilisant les symboles =, < et > », ordonner cinq nombres, et
// placer un nombre sur une bande numérique : jusqu'à 59 au plus tard en
// période 2, jusqu'à 100 au plus tard en période 3.
//
// Le guide « Pour enseigner les nombres, le calcul et la résolution de
// problèmes au CP » (Éduscol) fait comparer par la valeur des chiffres —
// « 71 est plus grand que 68, car dans 71 il y a 7 dizaines alors que dans 68
// il y a seulement 6 dizaines » — sur des écritures variées : 5d 1u, 3u 4d,
// 5d 17u, des barres et des cubes pas tous groupés. La validation se fait au
// matériel, dizaine contre dizaine. Il demande au jeu une règle simple, un
// dialogue entre joueurs (« Comment le sais-tu ? ») et une trace écrite.
//
// Un seul paquet sert trois jeux : la bataille (comparer, =, <, >), la file
// des nombres (ordonner, intercaler) et le nombre caché (encadrer). Chaque
// nombre y est deux fois, sous deux formes : c'est ce qui fait les égalités.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { feuille, pagesDeCartes } from "./cartesImprimables";
import { REGLAGES_CUBES, piece } from "./cubesNumeration";
import { nombreEnLettres } from "./nombresEnLettres";

// ── Ce qui se règle ────────────────────────────────────────────────────────

export type FormeNombre = "chiffres" | "cubes" | "vrac" | "unites" | "desordre" | "plusDeDix" | "somme" | "lettres";

export const FORMES: { id: FormeNombre; libelle: string; exemple: string }[] = [
  { id: "chiffres", libelle: "en chiffres", exemple: "47" },
  { id: "cubes", libelle: "barres et cubes", exemple: "4 barres, 7 cubes" },
  { id: "vrac", libelle: "barres et cubes pas tous groupés", exemple: "3 barres, 17 cubes" },
  { id: "unites", libelle: "dizaines et unités", exemple: "4d 7u" },
  { id: "desordre", libelle: "les unités d'abord", exemple: "7u 4d" },
  { id: "plusDeDix", libelle: "plus de dix unités", exemple: "3d 17u" },
  { id: "somme", libelle: "décomposition", exemple: "40 + 7" },
  { id: "lettres", libelle: "en lettres", exemple: "quarante-sept" },
];

/** Les champs numériques du CP, période par période. */
export const CHAMPS = [
  { jusqua: 30, libelle: "jusqu'à 30 (période 1)" },
  { jusqua: 59, libelle: "jusqu'à 59 (période 2)" },
  { jusqua: 100, libelle: "jusqu'à 100 (dès la période 3)" },
] as const;
export type Champ = typeof CHAMPS[number]["jusqua"];

export const NOMBRES_DE_CARTES = [24, 32, 40, 48] as const;

export interface ReglagesComparer {
  titre: string;
  jusqua: Champ;
  formes: FormeNombre[];
  cartes: number;
  /** Des nombres qui se ressemblent : 47 et 74, 49 et 51, 40 et 4. */
  pieges: boolean;
  /** Douze cartes par page au lieu de vingt, pour les petites mains. */
  grandes: boolean;
  /** La règle des trois jeux et le savoir à retenir. */
  regle: boolean;
  /** Les cartes des signes <, > et =. */
  signes: boolean;
  /** La feuille où l'on écrit ses comparaisons, sa file, ses encadrements. */
  feuilleDeJeu: boolean;
}

export const REGLAGES_COMPARER: ReglagesComparer = {
  titre: "Comparer les nombres", jusqua: 30, formes: ["chiffres", "cubes", "unites", "desordre"], cartes: 32,
  pieges: true, grandes: false, regle: true, signes: true, feuilleDeJeu: true,
};

/** Des réglages relus de la mémoire : ce qui n'a plus de sens revient au défaut. */
export function reglagesComparerSurs(brut: Partial<ReglagesComparer>): ReglagesComparer {
  const r = { ...REGLAGES_COMPARER, ...brut };
  const oui = (v: unknown, defaut: boolean) => (typeof v === "boolean" ? v : defaut);
  const formes = Array.isArray(r.formes) ? FORMES.map((f) => f.id).filter((id) => r.formes.includes(id)) : [];
  return {
    titre: typeof r.titre === "string" ? r.titre : REGLAGES_COMPARER.titre,
    jusqua: CHAMPS.find((c) => c.jusqua === r.jusqua)?.jusqua ?? REGLAGES_COMPARER.jusqua,
    formes: formes.length ? formes : ["chiffres"],
    cartes: (NOMBRES_DE_CARTES as readonly number[]).includes(r.cartes) ? r.cartes : REGLAGES_COMPARER.cartes,
    pieges: oui(r.pieges, true), grandes: oui(r.grandes, false),
    regle: oui(r.regle, true), signes: oui(r.signes, true), feuilleDeJeu: oui(r.feuilleDeJeu, true),
  };
}

// ── Le nombre et ses formes ────────────────────────────────────────────────

/** Toutes les formes ne vont pas à tous les nombres : « 7u 4d » demande des dizaines et des unités. */
export function convient(n: number, forme: FormeNombre): boolean {
  switch (forme) {
    case "vrac": case "plusDeDix": return n >= 10;
    case "desordre": case "somme": return n > 10 && n % 10 !== 0;
    default: return n >= 1;
  }
}

/**
 * Le nombre écrit sous une forme : 47 → « 4d 7u », « 7u 4d », « 3d 17u »,
 * « 40 + 7 ». Comme dans le guide, une dizaine entière s'écrit « 6d ».
 */
export function ecrireForme(n: number, forme: FormeNombre): string {
  const d = Math.floor(n / 10), u = n % 10;
  switch (forme) {
    case "unites": return d && u ? `${d}d ${u}u` : d ? `${d}d` : `${u}u`;
    case "desordre": return `${u}u ${d}d`;
    case "plusDeDix": return d > 1 ? `${d - 1}d ${u + 10}u` : `${u + 10}u`;
    case "somme": return `${d * 10} + ${u}`;
    case "lettres": return nombreEnLettres(n);
    default: return String(n);
  }
}

const f2 = (x: number) => Number(x.toFixed(2));

/**
 * Des barres de dix et des cubes, en millimètres : les barres côte à côte,
 * les cubes par rangées de cinq posées depuis le bas — trois rangées de cinq
 * et deux se voient sans compter un à un.
 */
export function barresEtCubes(barres: number, cubes: number, u = 2.4): string {
  const ecart = 0.4 * u, entre = 1.8 * u, parRangee = 5;
  const couleurs = REGLAGES_CUBES.couleurs;
  const largeurBarres = barres > 0 ? barres * u + (barres - 1) * ecart : 0;
  const colonnes = Math.min(parRangee, cubes);
  const largeurCubes = cubes > 0 ? colonnes * u + (colonnes - 1) * ecart : 0;
  const rangees = Math.ceil(cubes / parRangee);
  const hauteur = Math.max(barres > 0 ? 10 * u : 0, rangees * u + Math.max(0, rangees - 1) * ecart, u);
  const decalage = barres > 0 && cubes > 0 ? entre : 0;
  const morceaux: string[] = [];
  for (let i = 0; i < barres; i++) morceaux.push(piece("d", i * (u + ecart), hauteur - 10 * u, u, couleurs.d));
  for (let i = 0; i < cubes; i++) {
    const rangee = Math.floor(i / parRangee), colonne = i % parRangee;
    morceaux.push(piece("u", largeurBarres + decalage + colonne * (u + ecart), hauteur - u - rangee * (u + ecart), u, couleurs.u));
  }
  const marge = 0.3;
  const L = f2(largeurBarres + decalage + largeurCubes + 2 * marge), H = f2(hauteur + 2 * marge);
  const titre = `${barres} barre${barres > 1 ? "s" : ""} de dix et ${cubes} cube${cubes > 1 ? "s" : ""}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="${-marge} ${-marge} ${L} ${H}" role="img" aria-label="${titre}">${morceaux.join("")}</svg>`;
}

// ── Le paquet ──────────────────────────────────────────────────────────────

export interface CarteNombre { n: number; forme: FormeNombre }

/**
 * Un nombre qui ressemble à `n` sans lui être égal : les mêmes chiffres
 * inversés (47 et 74), deux nombres de part et d'autre d'une dizaine (49 et
 * 51), la même dizaine (45 et 48), une dizaine entière et son chiffre (40 et
 * 4). Ce sont les comparaisons où l'on se trompe en regardant mal.
 */
export function ressemblant(n: number, jusqua: number, alea: () => number): number | null {
  const d = Math.floor(n / 10), u = n % 10;
  const choix: number[] = [];
  if (d > 0 && u > 0 && d !== u && u * 10 + d <= jusqua) choix.push(u * 10 + d);
  if (u >= 7 && (d + 1) * 10 + 2 <= jusqua) choix.push((d + 1) * 10 + Math.floor(alea() * 3));
  if (d > 0) {
    const voisin = d * 10 + ((u + 1 + Math.floor(alea() * 8)) % 10);
    if (voisin !== n && voisin >= 1 && voisin <= jusqua) choix.push(voisin);
  }
  if (u === 0 && d > 0 && d <= jusqua) choix.push(d);
  return choix.length ? choix[Math.floor(alea() * choix.length)] : null;
}

/**
 * Le paquet : la moitié des cartes en nombres différents, chacun sous deux
 * formes — tirées parmi celles qui lui vont —, puis mélangé. Avec les
 * pièges, un nombre sur deux environ amène son ressemblant.
 */
export function paquet(r: ReglagesComparer, graine: number): CarteNombre[] {
  const alea = hasard(graine);
  const voulus = Math.min(r.cartes / 2, r.jusqua);
  const nombres: number[] = [];
  const pris = new Set<number>();
  const prendre = (n: number) => { if (!pris.has(n) && nombres.length < voulus) { pris.add(n); nombres.push(n); } };
  for (let essais = 0; nombres.length < voulus && essais < 2000; essais++) {
    const n = 1 + Math.floor(alea() * r.jusqua);
    if (pris.has(n)) continue;
    prendre(n);
    if (r.pieges && alea() < 0.6) {
      const voisin = ressemblant(n, r.jusqua, alea);
      if (voisin != null) prendre(voisin);
    }
  }
  const cartes: CarteNombre[] = [];
  for (const n of nombres) {
    const possibles = r.formes.filter((f) => convient(n, f));
    const [a, b] = melanger(alea, possibles.length ? possibles : (["chiffres"] as FormeNombre[]));
    cartes.push({ n, forme: a }, { n, forme: b ?? a });
  }
  return melanger(alea, cartes);
}

// ── La feuille ─────────────────────────────────────────────────────────────

/** La face d'une carte. */
export function faceDeCarte(c: CarteNombre, u = 2.4): string {
  const d = Math.floor(c.n / 10), reste = c.n % 10;
  switch (c.forme) {
    case "chiffres": return `<div class="cn-chiffres">${c.n}</div>`;
    case "cubes": return `<div class="cn-cubes">${barresEtCubes(d, reste, u)}</div>`;
    case "vrac": return `<div class="cn-cubes">${barresEtCubes(d - 1, reste + 10, u)}</div>`;
    case "lettres": return `<div class="cn-lettres">${escapeHtml(ecrireForme(c.n, "lettres"))}</div>`;
    default: return `<div class="cn-unites">${escapeHtml(ecrireForme(c.n, c.forme))}</div>`;
  }
}

/** Les signes, et ce qu'on dit en les lisant de gauche à droite. */
export const SIGNES = [
  { signe: "<", lecture: "est plus petit que" },
  { signe: ">", lecture: "est plus grand que" },
  { signe: "=", lecture: "est égal à" },
] as const;

/** Le savoir à retenir, avec des nombres du champ : 71 et 68 comme dans le guide, 51 et 48, 21 et 18. */
export function exempleDuSavoir(jusqua: number): [number, number] {
  const t = Math.min(7, Math.floor((jusqua - 1) / 10));
  return [t * 10 + 1, (t - 1) * 10 + 8];
}

// Une espace insécable : « 7 » ne reste pas seul en fin de ligne, loin de ses dizaines.
const dizaines = (k: number) => `${k}\u00a0dizaine${k > 1 ? "s" : ""}`;
const unites = (k: number) => `${k}\u00a0unité${k > 1 ? "s" : ""}`;

/** Des exemples pris dans le champ des nombres, pour que la règle parle des nombres du paquet. */
const EXEMPLES: Record<Champ, { petit: number; grand: number; file: [number, number, number]; cadres: [string, string] }> = {
  30: { petit: 17, grand: 21, file: [12, 16, 23], cadres: ["10 &lt; ? &lt; 20", "15 &lt; ? &lt; 20"] },
  59: { petit: 47, grand: 52, file: [34, 37, 41], cadres: ["20 &lt; ? &lt; 40", "30 &lt; ? &lt; 40"] },
  100: { petit: 68, grand: 71, file: [54, 58, 63], cadres: ["50 &lt; ? &lt; 80", "60 &lt; ? &lt; 70"] },
};

/**
 * Ce qu'on retient, la trace du guide : les deux nombres en barres et en
 * cubes, le signe, et la phrase qui dit pourquoi. `u` grandit pour l'affiche.
 */
export function blocDuSavoir(jusqua: number, u = 2.6): string {
  const [a, b] = exempleDuSavoir(jusqua);
  const cote = (n: number) => `<div class="cn-savoir-nombre">${barresEtCubes(Math.floor(n / 10), n % 10, u)}`
    + `<div>${dizaines(Math.floor(n / 10))} ${unites(n % 10)}</div></div>`;
  return `<div class="cn-savoir">
      <div class="cn-savoir-titre">Ce qu'on retient</div>
      <div class="cn-savoir-dessins">${cote(a)}${cote(b)}</div>
      <div class="cn-savoir-signes">${a} &gt; ${b}</div>
      <p>${a} est plus grand que ${b}, car dans ${a} il y a ${dizaines(Math.floor(a / 10))} alors que dans ${b} il y a seulement ${dizaines(Math.floor(b / 10))}.</p>
    </div>`;
}

function pageDeRegle(r: ReglagesComparer, titre: string): string {
  const e = EXEMPLES[r.jusqua];
  const [x, y, z] = e.file;
  return `<div class="page cn-regle">
    <div class="titre">${escapeHtml(titre)} — jusqu'à ${r.jusqua}</div>
    ${blocDuSavoir(r.jusqua)}
    <div class="cn-jeu-regle">
      <b>La bataille des nombres</b><span class="cn-pour">2 joueurs · comparer avec =, &lt; et &gt;</span>
      <ol>
        <li>On partage les cartes. Chacun retourne la carte du dessus de son paquet.</li>
        <li>On pose entre les deux cartes le signe qui convient, et on lit : « ${e.petit} est plus petit que ${e.grand} ».</li>
        <li>L'autre joueur demande : « Comment le sais-tu ? » — « ${dizaines(Math.floor(e.petit / 10))}, c'est moins que ${dizaines(Math.floor(e.grand / 10))}. »</li>
        <li>Le plus grand nombre emporte les deux cartes. Le même nombre sous deux formes : on pose =, et c'est la bataille !</li>
      </ol>
    </div>
    <div class="cn-jeu-regle">
      <b>La file des nombres</b><span class="cn-pour">2 à 4 joueurs · ordonner, intercaler</span>
      <ol>
        <li>Une carte au milieu de la table ; chacun en reçoit cinq, le reste fait la pioche.</li>
        <li>À son tour, on pose une carte dans la file : les plus petits à gauche, les plus grands à droite — ou entre deux cartes, en disant les signes : « ${x} &lt; ${y} &lt; ${z} ». Le même nombre se pose dessus : =.</li>
        <li>Les autres vérifient. Une carte mal placée revient dans la main, et l'on pioche une carte de plus. Le premier qui n'a plus de cartes a gagné.</li>
      </ol>
    </div>
    <div class="cn-jeu-regle">
      <b>Le nombre caché</b><span class="cn-pour">2 joueurs · encadrer</span>
      <ol>
        <li>L'un tire une carte sans la montrer. L'autre propose un nombre ; on lui répond « plus grand » ou « plus petit ».</li>
        <li>Il écrit à chaque fois ce qu'il sait : ${e.cadres[0]}, puis ${e.cadres[1]}… jusqu'à le trouver. Moins de questions, mieux c'est.</li>
      </ol>
    </div>
    <p class="cn-verifier"><b>Pour vérifier :</b> on construit les deux nombres avec des barres et des cubes, et l'on compare dizaine contre dizaine, puis unité contre unité.</p>
    <p class="cn-source">D'après le programme de mathématiques du cycle 2 (2024) et le guide « Pour enseigner les nombres, le calcul et la résolution de problèmes au CP » (Éduscol).</p>
  </div>`;
}

function pageDeJeu(titre: string): string {
  const paire = `<div class="cn-paire"><span class="cn-case"></span><span class="cn-rond"></span><span class="cn-case"></span></div>`;
  const file = `<div class="cn-file">${Array.from({ length: 6 }, () => `<span class="cn-case"></span>`).join(`<span class="cn-signe-file">&lt;</span>`)}</div>`;
  const cadre = `<div class="cn-cadre"><span class="cn-case"></span><span class="cn-signe-file">&lt;</span><span class="cn-cache">?</span><span class="cn-signe-file">&lt;</span><span class="cn-case"></span></div>`;
  return `<div class="page cn-feuille-jeu">
    <div class="titre">Ma feuille de jeu — ${escapeHtml(titre.toLowerCase())}</div>
    <div class="cn-nom">Prénom : ........................................ Date : ........................</div>
    <h3>La bataille des nombres</h3>
    <p class="cn-consigne">J'écris en chiffres le nombre de chaque carte, et le signe qui convient : &lt;, &gt; ou =.</p>
    <div class="cn-paires">${Array.from({ length: 8 }, () => paire).join("")}</div>
    <h3>La file des nombres</h3>
    <p class="cn-consigne">Je recopie la file, du plus petit au plus grand.</p>
    ${file}${file}
    <h3>Le nombre caché</h3>
    <p class="cn-consigne">J'écris ce que je sais du nombre caché.</p>
    <div class="cn-cadres">${Array.from({ length: 4 }, () => cadre).join("")}</div>
  </div>`;
}

export function htmlComparer(cartes: CarteNombre[], r: ReglagesComparer): string {
  const titre = r.titre.trim() || REGLAGES_COMPARER.titre;
  const format = r.grandes ? { colonnes: 3, lignes: 4 } : { colonnes: 4, lignes: 5 };
  const u = r.grandes ? 2.6 : 2.4;
  const entete = (quoi: string) => `<div class="titre">${escapeHtml(titre)} — ${quoi}</div>`;
  const faces = cartes.map((c) => `<div class="carte">${faceDeCarte(c, u)}</div>`);
  const signes = SIGNES.flatMap((s) => Array.from({ length: 4 }, () =>
    `<div class="carte"><div class="cn-signe">${escapeHtml(s.signe)}</div><div class="cn-lecture">${s.lecture}</div></div>`));
  return feuille(
    (r.regle ? pageDeRegle(r, titre) : "")
    + pagesDeCartes(faces, format, entete(`les cartes, à découper (jusqu'à ${r.jusqua})`))
    + (r.signes ? pagesDeCartes(signes, { colonnes: 3, lignes: 4 }, entete("les signes, à découper")) : "")
    + (r.feuilleDeJeu ? pageDeJeu(titre) : ""),
    `cn${r.grandes ? " cn-grandes" : ""}`,
  );
}

export const STYLE_COMPARER = `
  .feuille.cn .carte { gap: 1.5mm; padding: 2.5mm; }
  .feuille.cn .cn-chiffres { font-size: 44px; font-weight: 800; line-height: 1; }
  .feuille.cn .cn-unites { font-size: 27px; font-weight: 800; line-height: 1.1; white-space: nowrap; }
  .feuille.cn .cn-lettres { font-size: 17px; font-weight: 700; line-height: 1.2; overflow-wrap: anywhere; }
  .feuille.cn .cn-cubes { max-width: 100%; }
  .feuille.cn .cn-cubes svg { display: block; max-width: 100%; height: auto; }
  .feuille.cn.cn-grandes .cn-chiffres { font-size: 58px; }
  .feuille.cn.cn-grandes .cn-unites { font-size: 34px; }
  .feuille.cn.cn-grandes .cn-lettres { font-size: 21px; }
  .feuille.cn .cn-signe { font-size: 72px; font-weight: 800; line-height: 1; }
  .feuille.cn .cn-lecture { font-size: 14px; font-weight: 700; color: #444; }
  .feuille.cn .cn-savoir { border: 2px solid #1c2233; border-radius: 4mm; padding: 4mm 5mm; margin: 0 0 5mm; text-align: center; }
  .feuille.cn .cn-savoir-titre { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .5px; color: #687087; }
  .feuille.cn .cn-savoir-dessins { display: flex; justify-content: center; align-items: flex-end; gap: 16mm; margin: 3mm 0 2mm; }
  .feuille.cn .cn-savoir-nombre { display: flex; flex-direction: column; align-items: center; gap: 2mm; font-size: 13px; font-weight: 600; }
  .feuille.cn .cn-savoir-nombre svg { display: block; }
  .feuille.cn .cn-savoir-signes { font-size: 34px; font-weight: 800; margin: 1mm 0; }
  .feuille.cn .cn-savoir p { font-size: 15px; font-weight: 600; margin: 1mm 0 0; line-height: 1.4; }
  .feuille.cn .cn-jeu-regle { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 3mm; background: #f7f8fc;
    font-size: 13px; line-height: 1.45; break-inside: avoid; page-break-inside: avoid; }
  .feuille.cn .cn-jeu-regle b { font-size: 15px; }
  .feuille.cn .cn-pour { margin-left: 3mm; color: #687087; font-size: 12px; }
  .feuille.cn .cn-jeu-regle ol { margin: 1.5mm 0 0; padding-left: 6mm; }
  .feuille.cn .cn-jeu-regle li { margin: 0.8mm 0; }
  .feuille.cn .cn-verifier { font-size: 13px; margin: 3mm 0 1mm; }
  .feuille.cn .cn-source { font-size: 10.5px; color: #687087; margin: 2mm 0 0; }
  .feuille.cn .cn-nom { font-size: 13px; color: #444; margin: 0 0 3mm; }
  .feuille.cn .cn-feuille-jeu h3 { font-size: 16px; margin: 6mm 0 1mm; }
  .feuille.cn .cn-consigne { font-size: 13px; margin: 0 0 3mm; color: #1c2233; }
  .feuille.cn .cn-case { display: inline-block; width: 16mm; height: 12mm; border: 1.5px solid #1c2233; border-radius: 2mm; background: #fff; }
  .feuille.cn .cn-rond { display: inline-block; width: 10mm; height: 10mm; border: 1.5px solid #1c2233; border-radius: 50%; }
  .feuille.cn .cn-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
  .feuille.cn .cn-paire, .feuille.cn .cn-cadre { display: flex; align-items: center; gap: 3mm; }
  .feuille.cn .cn-file { display: flex; align-items: center; gap: 1.5mm; margin: 0 0 4mm; }
  .feuille.cn .cn-file .cn-case { width: 19mm; }
  .feuille.cn .cn-signe-file { font-size: 22px; font-weight: 800; }
  .feuille.cn .cn-cache { font-size: 24px; font-weight: 800; width: 10mm; text-align: center; }
  .feuille.cn .cn-cadres { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 10mm; }
`;
