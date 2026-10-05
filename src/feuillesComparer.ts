// ── Les feuilles de la séquence « comparer, encadrer, intercaler » ─────────
//
// Celles que le guide « Pour enseigner les nombres, le calcul et la
// résolution de problèmes au CP » (Éduscol) fait passer de séance en séance
// dans sa séquence sur la numération écrite chiffrée (p. 40-46) : deux
// collections qu'on ne voit pas ensemble, ce qu'on retient, les exercices de
// sa séance 2 — « À chaque fois, entoure le nombre le plus grand et écris
// ensuite le symbole qui convient » —, puis ordonner, intercaler, encadrer ;
// les problèmes de comparaison du programme (Aaron, Mia et leurs trombones)
// et du guide (le car et ses places) ; l'évaluation.
//
// Les nombres suivent le niveau de l'atelier, au cycle 2 : jusqu'à 30, 59 ou
// 100 au CP ; 1 000 au CE1, où l'on encadre entre deux centaines et où les
// collections se donnent en plaques, barres et cubes ; 10 000 au CE2, où
// elles arrivent par caisses, cartons et boîtes, comme dans les problèmes du
// programme.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { feuille } from "./cartesImprimables";
import { REGLAGES_CUBES, dessinerGroupes, type Groupement } from "./cubesNumeration";
import {
  SIGNES, avecUneUniteDefaite, blocDuSavoir, convient, ecrireForme, exempleDuSavoir, faceDeCarte, niveauDe, parties,
  rangsDe, ressemblant, tirerNombre, type CarteNombre, type FormeNombre, type Niveau, type ReglagesComparer,
} from "./comparerNombres";
import { fr } from "./nombres";

export const signeEntre = (a: number, b: number) => (a < b ? "<" : a > b ? ">" : "=");
const html = (signe: string) => (signe === "<" ? "&lt;" : signe === ">" ? "&gt;" : signe);
const f2 = (x: number) => Number(x.toFixed(2));
type Alea = () => number;

/** Un entier de `min` à `max`, bornes comprises. */
const entre = (alea: Alea, min: number, max: number) => min + Math.floor(alea() * (max - min + 1));

/** Ce qu'une carte montre, dans le corrigé : « 3d 17u (47) ». */
const lu = (c: CarteNombre, niv: Niveau) =>
  c.forme === "chiffres" ? fr(c.n)
    : c.forme === "cubes" || c.forme === "vrac" ? `le matériel de ${fr(c.n)}`
      : `${escapeHtml(ecrireForme(c.n, c.forme, niv))} (${fr(c.n)})`;

const entete = (titre: string, sous = "") =>
  `<div class="titre">${escapeHtml(titre)}</div>`
  + `<div class="fc-nom">Prénom : ........................................ Date : ........................</div>`
  + (sous ? `<div class="sous">${escapeHtml(sous)}</div>` : "");
const consigne = (texte: string) => `<div class="fc-consigne">${escapeHtml(texte)}</div>`;
const caseVide = `<span class="fc-case"></span>`;
const signe = (s: string) => `<span class="fc-signe">${html(s)}</span>`;
const corrige = (titre: string, lignes: string[]) =>
  `<div class="page corrige fc-corrige"><div class="titre">Corrigé · ${escapeHtml(titre)}</div><ol>${lignes.map((l) => `<li>${l}</li>`).join("")}</ol></div>`;

// ── Séance 1 : deux collections qu'on ne voit pas ensemble ────────────────

/** Des ronds semés sans se toucher : un par case d'une grille, un peu décalé dans sa case. */
export function semerDesRonds(n: number, couleur: string, graine: number, largeur = 160, hauteur = 176): string {
  const alea = hasard(graine);
  const pas = 11, diametre = 7.6;
  const colonnes = Math.floor(largeur / pas), rangees = Math.floor(hauteur / pas);
  const cases = melanger(alea, Array.from({ length: colonnes * rangees }, (_, i) => i)).slice(0, n);
  const jeu = pas - diametre - 0.8;
  const cercles = cases.map((k) => {
    const cx = (k % colonnes) * pas + pas / 2 + (alea() - 0.5) * jeu;
    const cy = Math.floor(k / colonnes) * pas + pas / 2 + (alea() - 0.5) * jeu;
    return `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${diametre / 2}" fill="${couleur}" stroke="#1c2233" stroke-width="0.3"/>`;
  });
  const L = colonnes * pas, H = rangees * pas;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${L}mm" height="${H}mm" viewBox="0 0 ${L} ${H}" role="img" aria-label="${n} ronds">${cercles.join("")}</svg>`;
}

/** Ce que contient une collection du CE2 : des caisses de mille, des cartons de cent, des boîtes de dix, des vis seules. */
const LOTS: Record<Groupement, [string, string]> = {
  m: ["caisse de 1 000 vis", "caisses de 1 000 vis"],
  c: ["carton de 100 vis", "cartons de 100 vis"],
  d: ["boîte de 10 vis", "boîtes de 10 vis"],
  u: ["vis seule", "vis seules"],
};

/**
 * Ce que montre la collection d'un groupe : des ronds au CP ; au CE1, des
 * plaques, des barres et des cubes, l'une des deux avec plus de dix d'une
 * unité (« 17 unités, 8 dizaines et 2 centaines ») ; au CE2, une livraison.
 */
function laCollection(n: number, niv: Niveau, couleur: string, graine: number, defaite: boolean): { ce: string; dessin: string } {
  const rangs = rangsDe(niv);
  if (rangs.length === 2) return { ce: "ronds", dessin: `<div class="fc-ronds">${semerDesRonds(n, couleur, graine)}</div>` };
  const p = (defaite ? avecUneUniteDefaite(n, rangs) : null) ?? parties(n, rangs);
  if (rangs.length === 3) {
    const groupes: Record<Groupement, number> = { m: 0, c: 0, d: 0, u: 0 };
    rangs.forEach((r, i) => { groupes[r.id] = p[i]; });
    return { ce: "cubes", dessin: `<div class="fc-ronds">${dessinerGroupes(groupes, 3.2, REGLAGES_CUBES.couleurs, `${n}`).svg}</div>` };
  }
  const lignes = rangs.map((r, i) => (p[i] ? `<li>${p[i]} ${p[i] > 1 ? LOTS[r.id][1] : LOTS[r.id][0]}</li>` : "")).join("");
  return { ce: "vis", dessin: `<ul class="fc-lots">${lignes}</ul>` };
}

/**
 * Les deux feuilles de la séance 1 : une collection pour un groupe, une
 * autre pour l'autre — les nombres de « ce qu'on retient », 71 et 68 jusqu'à
 * 100 comme dans le guide, 412 et 398 au CE1, 4 012 et 3 998 au CE2. On y
 * écrit le nombre en chiffres.
 */
export function htmlDeuxCollections(r: ReglagesComparer, graine: number): string {
  const niv = niveauDe(r);
  const [a, b] = exempleDuSavoir(niv);
  const page = (n: number, couleur: string, nom: string, decalage: number, defaite: boolean) => {
    const { ce, dessin } = laCollection(n, niv, couleur, graine + decalage, defaite);
    const question = ce === "ronds" ? `Combien y a-t-il de ronds sur ta feuille ? Écris le nombre avec des chiffres.`
      : ce === "cubes" ? "Combien de cubes en tout ? Écris le nombre avec des chiffres."
        : "Combien de vis en tout ? Écris le nombre avec des chiffres.";
    const reponse = ce === "ronds" ? `Il y a ${caseVide} ronds ${nom}.` : ce === "cubes" ? `Il y a ${caseVide} cubes.` : `Il y a ${caseVide} vis.`;
    const titre = ce === "ronds" ? `Les ronds ${nom}` : ce === "cubes" ? `La collection du groupe ${nom.replace(/s$/, "")}` : `La livraison du groupe ${nom.replace(/s$/, "")}`;
    return `<div class="page fc-collection">
      ${entete(titre, "Le groupe d'à côté a une autre feuille, que tu ne vois pas.")}
      ${consigne(question)}
      <div class="fc-ecrire">${reponse}</div>
      ${dessin}
    </div>`;
  };
  const rangs = rangsDe(niv);
  const enUnites = (n: number) => parties(n, rangs).map((k, i) => `${k} ${k > 1 ? ["milliers", "centaines", "dizaines", "unités"][4 - rangs.length + i] : ["millier", "centaine", "dizaine", "unité"][4 - rangs.length + i]}`).join(" ");
  return feuille(page(a, "#e8402f", "rouges", 1, true) + page(b, "#2454e6", "bleus", 2, false)
    + corrige("Deux collections à comparer", [`Le groupe rouge : <b>${fr(a)}</b> — ${enUnites(a)}.`, `Le groupe bleu : <b>${fr(b)}</b> — ${enUnites(b)}.`, `${fr(a)} &gt; ${fr(b)}`]), "cn fc");
}

// ── Séance 2 : ce qu'on retient, en affiche ───────────────────────────────

/** L'affiche de la classe : la trace du guide, en grand, et la lecture des trois signes. */
export function htmlAfficheDuSavoir(r: ReglagesComparer): string {
  const signes = SIGNES.map((s) => `<div><span>${html(s.signe)}</span>${s.lecture}</div>`).join("");
  return feuille(`<div class="page fc-affiche">${blocDuSavoir(niveauDe(r), 4.2)}<div class="fc-signes">${signes}</div></div>`, "cn fc");
}

// ── Séance 3 : comparer sous toutes les écritures ─────────────────────────

export interface Paire { a: CarteNombre; b: CarteNombre }

/**
 * Des paires à comparer : une égalité — le même nombre sous deux formes,
 * comme « 3u 4d » et « 34 » —, des nombres qui se ressemblent (47 et 74, 49
 * et 51, 352 et 325), et d'autres, mélangées.
 */
export function pairesAComparer(r: ReglagesComparer, alea: Alea, combien: number): Paire[] {
  const niv = niveauDe(r);
  const formes: FormeNombre[] = r.formes.length ? r.formes : ["chiffres"];
  const forme = (n: number): FormeNombre => {
    const ok = formes.filter((f) => convient(n, f, niv));
    return ok.length ? ok[Math.floor(alea() * ok.length)] : "chiffres";
  };
  const paires: Paire[] = [];
  // L'égalité : deux formes différentes, prises dans l'atelier si elles s'y trouvent.
  let n = tirerNombre(niv, alea);
  for (let i = 0; i < 20 && !convient(n, "desordre", niv); i++) n = tirerNombre(niv, alea);
  const deux = melanger(alea, formes.filter((f) => convient(n, f, niv)));
  const [fa, fb] = deux.length >= 2 ? deux : (["chiffres", convient(n, "desordre", niv) ? "desordre" : "unites"] as FormeNombre[]);
  paires.push({ a: { n, forme: fa }, b: { n, forme: fb } });
  const vues = new Set<string>([`${n}-${n}`]);
  for (let essais = 0; paires.length < combien && essais < 500; essais++) {
    const x = tirerNombre(niv, alea);
    const y = alea() < 0.6 ? ressemblant(x, niv, alea) : tirerNombre(niv, alea);
    if (y == null || y === x) continue;
    const cle = `${Math.min(x, y)}-${Math.max(x, y)}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    paires.push({ a: { n: x, forme: forme(x) }, b: { n: y, forme: forme(y) } });
  }
  return melanger(alea, paires);
}

const boite = (c: CarteNombre, niv: Niveau) => `<span class="fc-boite">${faceDeCarte(c, niv, 1.9)}</span>`;
const paireHtml = (p: Paire, niv: Niveau) => `<div class="fc-paire">${boite(p.a, niv)}<span class="fc-rond"></span>${boite(p.b, niv)}</div>`;

/** Le problème du guide, aux nombres du niveau : assez de places, ou pas. */
function car(alea: Alea, jusqua: number): { eleves: number; places: number } {
  const ecart = Math.max(7, Math.round(jusqua / 15));
  const eleves = entre(alea, Math.ceil(jusqua / 2), jusqua - 3);
  let places = eleves + (alea() < 0.5 ? -1 : 1) * entre(alea, 1, ecart);
  places = Math.max(1, Math.min(jusqua, places));
  return { eleves, places: places === eleves ? eleves + 1 : places };
}

export function htmlComparerLesEcritures(r: ReglagesComparer, graine: number): string {
  const niv = niveauDe(r);
  const alea = hasard(graine);
  const paires = pairesAComparer(r, alea, 10);
  const { eleves, places } = car(alea, niv.max);
  const petits = niv.max <= 100;
  const titre = "Comparer des nombres";
  const enonce = petits
    ? `${eleves} élèves doivent partir au cinéma. Le car arrive, il peut transporter ${places} élèves. Tous les élèves pourront-ils être transportés ? Explique pourquoi.`
    : `${fr(eleves)} spectateurs veulent assister au spectacle. La salle a ${fr(places)} places. Tous les spectateurs pourront-ils s'asseoir ? Explique pourquoi.`;
  const page = `<div class="page">${entete(titre)}
    ${consigne("À chaque fois, entoure le nombre le plus grand et écris ensuite le signe qui convient : <, > ou =. Tu peux vérifier avec le matériel.")}
    <div class="fc-paires">${paires.map((p) => paireHtml(p, niv)).join("")}</div>
    ${consigne("Lis, puis réponds.")}
    <div class="fc-probleme">${escapeHtml(enonce)}
      <div class="fc-reponse">Je compare : ${caseVide}<span class="fc-rond"></span>${caseVide}</div>
      <div class="fc-reponse">Réponse : <span class="fc-trait"></span></div></div>
  </div>`;
  const lignes = paires.map((p) => `${lu(p.a, niv)} ${html(signeEntre(p.a.n, p.b.n))} ${lu(p.b, niv)} — <b>${fr(p.a.n)} ${html(signeEntre(p.a.n, p.b.n))} ${fr(p.b.n)}</b>`);
  const qui = petits ? "élèves" : "spectateurs";
  lignes.push(`${petits ? "Le car" : "La salle"} : ${fr(eleves)} ${html(signeEntre(eleves, places))} ${fr(places)} — ${eleves <= places ? `oui, tous les ${qui} pourront ${petits ? "monter" : "s'asseoir"}` : `non, il manque ${fr(eleves - places)} place${eleves - places > 1 ? "s" : ""}`}.`);
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 4 : ordonner et intercaler ─────────────────────────────────────

/** `combien` nombres différents du niveau. */
function distincts(alea: Alea, niv: Niveau, combien: number): number[] {
  const pris = new Set<number>();
  for (let essais = 0; pris.size < combien && essais < 500; essais++) pris.add(tirerNombre(niv, alea));
  return [...pris];
}

/** Deux nombres assez écartés pour qu'on puisse en écrire un entre eux. */
function bornes(alea: Alea, niv: Niveau): [number, number] {
  const a = Math.min(tirerNombre(niv, alea), niv.max - 3);
  const pas = niv.max <= 100 ? 9 : niv.max <= 1000 ? 30 : 300;
  return [a, Math.min(niv.max, a + entre(alea, 2, pas))];
}

const ligneDeCases = (n: number, s: string) => `<div class="fc-ligne">${Array.from({ length: n }, () => caseVide).join(signe(s))}</div>`;
const donnes = (liste: number[]) => `<span class="fc-donnes">${liste.map(fr).join(" &nbsp; ")}</span>`;
const entreLesDeux = (a: number, b: number) => (b - a - 1 <= 8
  ? Array.from({ length: b - a - 1 }, (_, i) => fr(a + 1 + i)).join(", ")
  : `tout nombre de ${fr(a + 1)} à ${fr(b - 1)}`);

export function htmlOrdonnerIntercaler(r: ReglagesComparer, graine: number): string {
  const niv = niveauDe(r);
  const alea = hasard(graine);
  const series = [3, 3, 5].map((k) => distincts(alea, niv, k));
  const decroissante = distincts(alea, niv, 5);
  const intervalles = Array.from({ length: 4 }, () => bornes(alea, niv));
  const titre = "Ordonner et intercaler";
  const page = `<div class="page">${entete(titre)}
    ${consigne("Range les nombres du plus petit au plus grand.")}
    ${series.map((s) => `<div class="fc-serie">${donnes(s)}${ligneDeCases(s.length, "<")}</div>`).join("")}
    ${consigne("Range les nombres du plus grand au plus petit.")}
    <div class="fc-serie">${donnes(decroissante)}${ligneDeCases(5, ">")}</div>
    ${consigne("Écris un nombre qui va entre les deux.")}
    <div class="fc-cadres">${intervalles.map(([a, b]) => `<div class="fc-ligne"><b>${fr(a)}</b>${signe("<")}${caseVide}${signe("<")}<b>${fr(b)}</b></div>`).join("")}</div>
  </div>`;
  const croissant = (s: number[]) => [...s].sort((x, y) => x - y);
  const lignes = [
    ...series.map((s) => croissant(s).map(fr).join(" &lt; ")),
    croissant(decroissante).reverse().map(fr).join(" &gt; "),
    ...intervalles.map(([a, b]) => `Entre ${fr(a)} et ${fr(b)} : ${entreLesDeux(a, b)}`),
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 5 : encadrer ───────────────────────────────────────────────────

/** L'unité qu'on encadre : la dizaine au CP, la centaine au CE1, le millier au CE2. */
export function uniteDEncadrement(niv: Niveau): { pas: number; nom: string } {
  if (niv.max <= 100) return { pas: 10, nom: "dizaines" };
  if (niv.max <= 1000) return { pas: 100, nom: "centaines" };
  return { pas: 1000, nom: "milliers" };
}

/** Un nombre qu'on encadre entre deux dizaines (centaines, milliers) : jamais l'une d'elles. */
function horsDuPas(alea: Alea, niv: Niveau, pas: number): number {
  for (let essais = 0; essais < 200; essais++) {
    const n = tirerNombre(niv, alea);
    if (n > pas && n < niv.max && n % pas) return n;
  }
  return pas + 1;
}

/** Une bande numérique d'une dizaine à la suivante, quelques cases à remplir. */
function bande(alea: Alea, jusqua: number): { debut: number; vides: Set<number> } {
  const debut = 10 * entre(alea, 0, Math.floor(jusqua / 10) - 1);
  const vides = new Set(melanger(alea, Array.from({ length: 9 }, (_, i) => debut + 1 + i)).slice(0, 4));
  return { debut, vides };
}

export function htmlEncadrer(r: ReglagesComparer, graine: number): string {
  const niv = niveauDe(r);
  const alea = hasard(graine);
  const { pas, nom } = uniteDEncadrement(niv);
  const encadres = Array.from({ length: 4 }, () => horsDuPas(alea, niv, pas));
  const voisins = Array.from({ length: 4 }, () => Math.max(2, Math.min(niv.max - 1, tirerNombre(niv, alea))));
  const bandes = [bande(alea, niv.max), bande(alea, niv.max)];
  const titre = "Encadrer des nombres";
  const cadre = (n: number) => `<div class="fc-ligne">${caseVide}${signe("<")}<b>${fr(n)}</b>${signe("<")}${caseVide}</div>`;
  const bandeHtml = (b: { debut: number; vides: Set<number> }) =>
    `<div class="fc-bande${b.debut + 10 >= 1000 ? " fc-bande-longue" : ""}">${Array.from({ length: 11 }, (_, i) => b.debut + i).map((n) => `<span>${b.vides.has(n) ? "" : fr(n)}</span>`).join("")}</div>`;
  const page = `<div class="page">${entete(titre)}
    ${consigne(`Encadre chaque nombre entre deux ${nom}.`)}
    <div class="fc-cadres">${encadres.map(cadre).join("")}</div>
    ${consigne("Écris le nombre juste avant et le nombre juste après.")}
    <div class="fc-cadres">${voisins.map(cadre).join("")}</div>
    ${consigne("Complète la bande numérique.")}
    ${bandes.map(bandeHtml).join("")}
  </div>`;
  const lignes = [
    ...encadres.map((n) => `${fr(Math.floor(n / pas) * pas)} &lt; ${fr(n)} &lt; ${fr(Math.floor(n / pas) * pas + pas)}`),
    ...voisins.map((n) => `${fr(n - 1)} &lt; ${fr(n)} &lt; ${fr(n + 1)}`),
    ...bandes.map((b) => `La bande de ${fr(b.debut)} à ${fr(b.debut + 10)} : ${[...b.vides].sort((x, y) => x - y).map(fr).join(", ")}`),
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 6 : problèmes de comparaison ───────────────────────────────────

/** Deux nombres différents et proches : on compare pour de bon. */
function proches(alea: Alea, niv: Niveau): [number, number] {
  for (let essais = 0; essais < 200; essais++) {
    const x = Math.max(2, tirerNombre(niv, alea));
    const y = ressemblant(x, niv, alea) ?? Math.max(1, Math.min(niv.max, x + entre(alea, -6, 6)));
    if (y !== x) return [x, y];
  }
  return [2, 1];
}

export interface Probleme { enonce: string; a: number; b: number; reponse: string }

/**
 * Les problèmes : celui du programme (Aaron et Mia), celui du guide (le car),
 * et deux autres de la même sorte ; au-delà de cent, des contextes où de
 * grands nombres ont du sens — des timbres, une salle de spectacle.
 */
export function problemesDeComparaison(alea: Alea, niv: Niveau): Probleme[] {
  const petits = niv.max <= 100;
  const [x1, y1] = proches(alea, niv);
  const { eleves, places } = car(alea, niv.max);
  const [x3, y3] = proches(alea, niv);
  const [besoin, stock] = proches(alea, niv);
  const manque = (k: number, quoi: string) => `il en manque ${fr(k)}${quoi}`;
  return [
    {
      enonce: petits
        ? `Aaron a ${x1} trombones dans sa trousse et Mia en a ${y1}. Qui de Aaron ou de Mia a le plus de trombones ?`
        : `Aaron a ${fr(x1)} timbres dans sa collection et Mia en a ${fr(y1)}. Qui de Aaron ou de Mia a le plus de timbres ?`,
      a: x1, b: y1, reponse: `${x1 > y1 ? "Aaron" : "Mia"} a le plus de ${petits ? "trombones" : "timbres"}.`,
    },
    {
      enonce: petits
        ? `${eleves} élèves doivent partir au cinéma. Le car arrive, il peut transporter ${places} élèves. Tous les élèves pourront-ils être transportés ? Explique pourquoi.`
        : `${fr(eleves)} spectateurs veulent assister au spectacle. La salle a ${fr(places)} places. Tous les spectateurs pourront-ils s'asseoir ? Explique pourquoi.`,
      a: eleves, b: places, reponse: eleves <= places ? "Oui : il y a assez de places." : `Non : il manque ${fr(eleves - places)} place${eleves - places > 1 ? "s" : ""}.`,
    },
    {
      enonce: petits
        ? `Dans la boîte rouge, il y a ${x3} crayons. Dans la boîte bleue, il y en a ${y3}. Quelle boîte a le moins de crayons ?`
        : `Lundi, la boulangerie a vendu ${fr(x3)} croissants ; mardi, elle en a vendu ${fr(y3)}. Quel jour en a-t-elle vendu le moins ?`,
      a: x3, b: y3, reponse: petits ? (x3 < y3 ? "La boîte rouge." : "La boîte bleue.") : (x3 < y3 ? "Lundi." : "Mardi."),
    },
    {
      enonce: petits
        ? `Pour la fête de la classe, il faut ${besoin} chaises. Il y en a ${stock} dans la salle. Y a-t-il assez de chaises ?`
        : `Pour finir le collier géant de l'école, il faut ${fr(besoin)} perles. Il y en a ${fr(stock)} dans la boîte. Y a-t-il assez de perles ?`,
      a: besoin, b: stock, reponse: stock >= besoin ? "Oui." : `Non : ${manque(besoin - stock, "")}.`,
    },
  ];
}

const problemeHtml = (p: Probleme) => `<div class="fc-probleme">${escapeHtml(p.enonce)}
  <div class="fc-reponse">Je compare : ${caseVide}<span class="fc-rond"></span>${caseVide}</div>
  <div class="fc-reponse">Réponse : <span class="fc-trait"></span></div></div>`;

export function htmlProblemes(r: ReglagesComparer, graine: number): string {
  const problemes = problemesDeComparaison(hasard(graine), niveauDe(r));
  const titre = "Problèmes de comparaison";
  const page = `<div class="page">${entete(titre)}${consigne("Lis chaque problème. Écris la comparaison avec un signe, puis réponds.")}${problemes.map(problemeHtml).join("")}</div>`;
  return feuille(page + corrige(titre, problemes.map((p) => `${fr(p.a)} ${html(signeEntre(p.a, p.b))} ${fr(p.b)} — ${escapeHtml(p.reponse)}`)), "cn fc");
}

// ── Séance 7 : l'évaluation ───────────────────────────────────────────────

export function htmlEvaluation(r: ReglagesComparer, graine: number): string {
  const niv = niveauDe(r);
  const alea = hasard(graine);
  const { pas, nom } = uniteDEncadrement(niv);
  const paires = pairesAComparer(r, alea, 4);
  const serie = distincts(alea, niv, 5);
  const intervalles = [bornes(alea, niv), bornes(alea, niv)];
  const encadres = [horsDuPas(alea, niv, pas), horsDuPas(alea, niv, pas)];
  const probleme = problemesDeComparaison(alea, niv)[0];
  const titre = "Évaluation — comparer, ranger, encadrer";
  const page = `<div class="page">${entete(titre)}
    ${consigne("1. Écris le signe qui convient : <, > ou =.")}
    <div class="fc-paires">${paires.map((p) => paireHtml(p, niv)).join("")}</div>
    ${consigne("2. Range les nombres du plus petit au plus grand.")}
    <div class="fc-serie">${donnes(serie)}${ligneDeCases(5, "<")}</div>
    ${consigne("3. Écris un nombre qui va entre les deux.")}
    <div class="fc-cadres">${intervalles.map(([a, b]) => `<div class="fc-ligne"><b>${fr(a)}</b>${signe("<")}${caseVide}${signe("<")}<b>${fr(b)}</b></div>`).join("")}</div>
    ${consigne(`4. Encadre chaque nombre entre deux ${nom}.`)}
    <div class="fc-cadres">${encadres.map((n) => `<div class="fc-ligne">${caseVide}${signe("<")}<b>${fr(n)}</b>${signe("<")}${caseVide}</div>`).join("")}</div>
    ${consigne("5. Lis, puis réponds.")}
    ${problemeHtml(probleme)}
  </div>`;
  const lignes = [
    ...paires.map((p) => `${lu(p.a, niv)} ${html(signeEntre(p.a.n, p.b.n))} ${lu(p.b, niv)}`),
    [...serie].sort((x, y) => x - y).map(fr).join(" &lt; "),
    ...intervalles.map(([a, b]) => `Entre ${fr(a)} et ${fr(b)} : ${entreLesDeux(a, b)}`),
    ...encadres.map((n) => `${fr(Math.floor(n / pas) * pas)} &lt; ${fr(n)} &lt; ${fr(Math.floor(n / pas) * pas + pas)}`),
    `${fr(probleme.a)} ${html(signeEntre(probleme.a, probleme.b))} ${fr(probleme.b)} — ${escapeHtml(probleme.reponse)}`,
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

export const STYLE_FEUILLES_COMPARER = `
  .feuille.fc .fc-nom { font-size: 13px; color: #444; margin: 0 0 2mm; }
  .feuille.fc .fc-consigne { font-size: 14px; font-weight: 700; margin: 5mm 0 3mm; }
  .feuille.fc .fc-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
  .feuille.fc .fc-paire { display: flex; align-items: center; justify-content: center; gap: 3mm; break-inside: avoid; }
  .feuille.fc .fc-boite { display: inline-flex; align-items: center; justify-content: center; min-width: 26mm; max-width: 34mm; min-height: 15mm;
    padding: 1.5mm 2.5mm; border: 1.5px solid #1c2233; border-radius: 2.5mm; text-align: center; }
  .feuille.fc .cn-chiffres { font-size: 26px; }
  .feuille.fc .cn-chiffres.cn-t2 { font-size: 22px; }
  .feuille.fc .cn-chiffres.cn-t3, .feuille.fc .cn-chiffres.cn-t4 { font-size: 17px; }
  .feuille.fc .cn-unites { font-size: 19px; }
  .feuille.fc .cn-long { font-size: 14px; }
  .feuille.fc .cn-lettres { font-size: 13px; }
  .feuille.fc .cn-cubes svg { max-height: 24mm; width: auto; }
  .feuille.fc .fc-rond { display: inline-block; width: 9mm; height: 9mm; border: 1.5px solid #1c2233; border-radius: 50%; flex: none; }
  .feuille.fc .fc-case { display: inline-block; width: 15mm; height: 10mm; border: 1.5px solid #1c2233; border-radius: 2mm; vertical-align: middle; flex: none; }
  .feuille.fc .fc-signe { font-size: 20px; font-weight: 800; margin: 0 1.5mm; }
  .feuille.fc .fc-ligne { display: flex; align-items: center; gap: 1mm; margin: 0 0 3mm; font-size: 18px; }
  .feuille.fc .fc-serie { display: flex; align-items: center; gap: 6mm; margin: 0 0 3mm; flex-wrap: wrap; }
  .feuille.fc .fc-serie .fc-ligne { margin: 0; }
  .feuille.fc .fc-donnes { font-size: 18px; font-weight: 800; letter-spacing: .5px; min-width: 38mm; }
  .feuille.fc .fc-cadres { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm 8mm; }
  .feuille.fc .fc-bande { display: flex; margin: 0 0 4mm; }
  .feuille.fc .fc-bande span { width: 14mm; height: 11mm; border: 1.5px solid #1c2233; margin-left: -1.5px; display: inline-flex; align-items: center;
    justify-content: center; font-size: 17px; font-weight: 700; }
  .feuille.fc .fc-bande.fc-bande-longue span { width: 15.5mm; font-size: 13px; }
  .feuille.fc .fc-probleme { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 4mm; font-size: 14px; line-height: 1.5;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.fc .fc-reponse { display: flex; align-items: center; gap: 2mm; margin-top: 2.5mm; }
  .feuille.fc .fc-trait { flex: 1; border-bottom: 1.5px solid #1c2233; height: 7mm; }
  .feuille.fc .fc-ecrire { display: flex; align-items: center; gap: 3mm; font-size: 15px; margin: 2mm 0; }
  .feuille.fc .fc-ronds svg { display: block; margin: 3mm auto 0; max-width: 100%; height: auto; }
  .feuille.fc .fc-lots { font-size: 22px; font-weight: 700; line-height: 1.9; margin: 8mm 0 0 8mm; }
  .feuille.fc .fc-affiche .cn-savoir { padding: 10mm 8mm; margin-top: 10mm; }
  .feuille.fc .fc-affiche .cn-savoir-titre { font-size: 18px; }
  .feuille.fc .fc-affiche .cn-savoir-dessins { gap: 30mm; margin: 8mm 0 4mm; }
  .feuille.fc .fc-affiche .cn-savoir-nombre { font-size: 20px; }
  .feuille.fc .fc-affiche .cn-savoir-chiffre { font-size: 44px; }
  .feuille.fc .fc-affiche .cn-savoir-signes { font-size: 72px; }
  .feuille.fc .fc-affiche .cn-savoir p { font-size: 24px; line-height: 1.4; }
  .feuille.fc .fc-signes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 12mm; text-align: center; font-size: 17px; font-weight: 700; }
  .feuille.fc .fc-signes span { display: block; font-size: 64px; font-weight: 800; line-height: 1.1; }
  .feuille.fc .fc-corrige ol { font-size: 13px; line-height: 1.9; padding-left: 6mm; }
`;
