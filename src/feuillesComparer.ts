// ── Les feuilles de la séquence « comparer, encadrer, intercaler » ─────────
//
// Celles que le guide « Pour enseigner les nombres, le calcul et la
// résolution de problèmes au CP » (Éduscol) fait passer de séance en séance
// dans sa séquence sur la numération écrite chiffrée (p. 40-46) : deux
// collections de ronds qu'on ne voit pas ensemble, ce qu'on retient, les
// exercices de sa séance 2 — « À chaque fois, entoure le nombre le plus
// grand et écris ensuite le symbole qui convient » —, puis ordonner,
// intercaler, encadrer ; les problèmes de comparaison du programme (Aaron,
// Mia et leurs trombones) et du guide (le car et ses places) ; l'évaluation.
// Les nombres suivent le champ de l'atelier : jusqu'à 30, 59 ou 100.

import { escapeHtml } from "./print";
import { hasard, melanger } from "./hasard";
import { feuille } from "./cartesImprimables";
import {
  SIGNES, blocDuSavoir, convient, ecrireForme, exempleDuSavoir, faceDeCarte, ressemblant, type CarteNombre, type FormeNombre,
  type ReglagesComparer,
} from "./comparerNombres";

export const signeEntre = (a: number, b: number) => (a < b ? "<" : a > b ? ">" : "=");
const html = (signe: string) => (signe === "<" ? "&lt;" : signe === ">" ? "&gt;" : signe);
const f2 = (x: number) => Number(x.toFixed(2));
type Alea = () => number;

/** Un entier de `min` à `max`, bornes comprises. */
const entre = (alea: Alea, min: number, max: number) => min + Math.floor(alea() * (max - min + 1));

/** Ce qu'une carte montre, dans le corrigé : « 3d 17u (47) ». */
const lu = (c: CarteNombre) =>
  c.forme === "chiffres" ? `${c.n}` : c.forme === "cubes" || c.forme === "vrac" ? `les cubes de ${c.n}` : `${escapeHtml(ecrireForme(c.n, c.forme))} (${c.n})`;

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

/**
 * Les deux feuilles de la séance 1 : des ronds rouges pour un groupe, des
 * bleus pour l'autre — les nombres de « ce qu'on retient », 71 et 68 jusqu'à
 * 100, comme dans le guide. On y écrit le nombre en chiffres.
 */
export function htmlDeuxCollections(r: ReglagesComparer, graine: number): string {
  const [a, b] = exempleDuSavoir(r.jusqua);
  const page = (n: number, couleur: string, nom: string, decalage: number) => `<div class="page fc-collection">
    ${entete(`Les ronds ${nom}`, "Le groupe d'à côté a une autre feuille, que tu ne vois pas.")}
    ${consigne("Combien y a-t-il de ronds sur ta feuille ? Écris le nombre avec des chiffres.")}
    <div class="fc-ecrire">Il y a ${caseVide} ronds ${nom}.</div>
    <div class="fc-ronds">${semerDesRonds(n, couleur, graine + decalage)}</div>
  </div>`;
  const d = (n: number) => `${Math.floor(n / 10)} dizaine${Math.floor(n / 10) > 1 ? "s" : ""} ${n % 10} unité${n % 10 > 1 ? "s" : ""}`;
  return feuille(page(a, "#e8402f", "rouges", 1) + page(b, "#2454e6", "bleus", 2)
    + corrige("Deux collections à comparer", [`Les ronds rouges : <b>${a}</b> — ${d(a)}.`, `Les ronds bleus : <b>${b}</b> — ${d(b)}.`, `${a} &gt; ${b}`]), "cn fc");
}

// ── Séance 2 : ce qu'on retient, en affiche ───────────────────────────────

/** L'affiche de la classe : la trace du guide, en grand, et la lecture des trois signes. */
export function htmlAfficheDuSavoir(r: ReglagesComparer): string {
  const signes = SIGNES.map((s) => `<div><span>${html(s.signe)}</span>${s.lecture}</div>`).join("");
  return feuille(`<div class="page fc-affiche">${blocDuSavoir(r.jusqua, 4.2)}<div class="fc-signes">${signes}</div></div>`, "cn fc");
}

// ── Séance 3 : comparer sous toutes les écritures ─────────────────────────

export interface Paire { a: CarteNombre; b: CarteNombre }

/**
 * Des paires à comparer : une égalité — le même nombre sous deux formes,
 * comme « 3u 4d » et « 34 » —, des nombres qui se ressemblent (47 et 74, 49
 * et 51, 70 et 7), et d'autres, mélangées.
 */
export function pairesAComparer(r: ReglagesComparer, alea: Alea, combien: number): Paire[] {
  const formes: FormeNombre[] = r.formes.length ? r.formes : ["chiffres"];
  const forme = (n: number): FormeNombre => {
    const ok = formes.filter((f) => convient(n, f));
    return ok.length ? ok[Math.floor(alea() * ok.length)] : "chiffres";
  };
  const paires: Paire[] = [];
  // L'égalité : deux formes différentes, prises dans l'atelier si elles s'y trouvent.
  const n = entre(alea, Math.min(11, r.jusqua), r.jusqua);
  const deux = melanger(alea, formes.filter((f) => convient(n, f)));
  const [fa, fb] = deux.length >= 2 ? deux : (["chiffres", n > 10 && n % 10 ? "desordre" : "unites"] as FormeNombre[]);
  paires.push({ a: { n, forme: fa }, b: { n, forme: fb } });
  const vues = new Set<string>([`${n}-${n}`]);
  for (let essais = 0; paires.length < combien && essais < 500; essais++) {
    const x = entre(alea, 1, r.jusqua);
    const y = alea() < 0.6 ? ressemblant(x, r.jusqua, alea) : entre(alea, 1, r.jusqua);
    if (y == null || y === x) continue;
    const cle = `${Math.min(x, y)}-${Math.max(x, y)}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    paires.push({ a: { n: x, forme: forme(x) }, b: { n: y, forme: forme(y) } });
  }
  return melanger(alea, paires);
}

const boite = (c: CarteNombre) => `<span class="fc-boite">${faceDeCarte(c, 1.9)}</span>`;
const paireHtml = (p: Paire) => `<div class="fc-paire">${boite(p.a)}<span class="fc-rond"></span>${boite(p.b)}</div>`;

/** Le problème du guide, aux nombres du champ : assez de places, ou pas. */
function car(alea: Alea, jusqua: number): { eleves: number; places: number } {
  const eleves = entre(alea, Math.ceil(jusqua / 2), jusqua - 3);
  let places = eleves + (alea() < 0.5 ? -1 : 1) * entre(alea, 1, 7);
  places = Math.max(1, Math.min(jusqua, places));
  return { eleves, places: places === eleves ? eleves + 1 : places };
}

export function htmlComparerLesEcritures(r: ReglagesComparer, graine: number): string {
  const alea = hasard(graine);
  const paires = pairesAComparer(r, alea, 10);
  const { eleves, places } = car(alea, r.jusqua);
  const titre = "Comparer des nombres";
  const page = `<div class="page">${entete(titre)}
    ${consigne("À chaque fois, entoure le nombre le plus grand et écris ensuite le signe qui convient : <, > ou =. Tu peux vérifier avec le matériel.")}
    <div class="fc-paires">${paires.map(paireHtml).join("")}</div>
    ${consigne("Lis, puis réponds.")}
    <div class="fc-probleme">${eleves} élèves doivent partir au cinéma. Le car arrive, il peut transporter ${places} élèves.
      Tous les élèves pourront-ils être transportés ? Explique pourquoi.
      <div class="fc-reponse">Je compare : ${caseVide}<span class="fc-rond"></span>${caseVide}</div>
      <div class="fc-reponse">Réponse : <span class="fc-trait"></span></div></div>
  </div>`;
  const lignes = paires.map((p) => `${lu(p.a)} ${html(signeEntre(p.a.n, p.b.n))} ${lu(p.b)} — <b>${p.a.n} ${html(signeEntre(p.a.n, p.b.n))} ${p.b.n}</b>`);
  lignes.push(`Le car : ${eleves} ${html(signeEntre(eleves, places))} ${places} — ${eleves <= places ? "oui, tous les élèves pourront monter" : `non, il manque ${eleves - places} place${eleves - places > 1 ? "s" : ""}`}.`);
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 4 : ordonner et intercaler ─────────────────────────────────────

/** `combien` nombres différents du champ. */
function distincts(alea: Alea, jusqua: number, combien: number): number[] {
  const pris = new Set<number>();
  while (pris.size < Math.min(combien, jusqua)) pris.add(entre(alea, 1, jusqua));
  return [...pris];
}

/** Deux nombres assez écartés pour qu'on puisse en écrire un entre eux. */
function bornes(alea: Alea, jusqua: number): [number, number] {
  const a = entre(alea, 1, jusqua - 3);
  return [a, Math.min(jusqua, a + entre(alea, 2, 9))];
}

const ligneDeCases = (n: number, s: string) => `<div class="fc-ligne">${Array.from({ length: n }, () => caseVide).join(signe(s))}</div>`;
const donnes = (liste: number[]) => `<span class="fc-donnes">${liste.join(" &nbsp; ")}</span>`;

export function htmlOrdonnerIntercaler(r: ReglagesComparer, graine: number): string {
  const alea = hasard(graine);
  const series = [3, 3, 5].map((k) => distincts(alea, r.jusqua, k));
  const decroissante = distincts(alea, r.jusqua, 5);
  const intervalles = Array.from({ length: 4 }, () => bornes(alea, r.jusqua));
  const titre = "Ordonner et intercaler";
  const page = `<div class="page">${entete(titre)}
    ${consigne("Range les nombres du plus petit au plus grand.")}
    ${series.map((s) => `<div class="fc-serie">${donnes(s)}${ligneDeCases(s.length, "<")}</div>`).join("")}
    ${consigne("Range les nombres du plus grand au plus petit.")}
    <div class="fc-serie">${donnes(decroissante)}${ligneDeCases(5, ">")}</div>
    ${consigne("Écris un nombre qui va entre les deux.")}
    <div class="fc-cadres">${intervalles.map(([a, b]) => `<div class="fc-ligne"><b>${a}</b>${signe("<")}${caseVide}${signe("<")}<b>${b}</b></div>`).join("")}</div>
  </div>`;
  const croissant = (s: number[]) => [...s].sort((x, y) => x - y);
  const lignes = [
    ...series.map((s) => croissant(s).join(" &lt; ")),
    croissant(decroissante).reverse().join(" &gt; "),
    ...intervalles.map(([a, b]) => `Entre ${a} et ${b} : ${Array.from({ length: b - a - 1 }, (_, i) => a + 1 + i).join(", ")}`),
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 5 : encadrer ───────────────────────────────────────────────────

/** Un nombre qu'on encadre entre deux dizaines : jamais une dizaine entière. */
function horsDizaine(alea: Alea, jusqua: number): number {
  for (;;) {
    const n = entre(alea, 11, jusqua - 1);
    if (n % 10) return n;
  }
}

/** Une bande numérique d'une dizaine à la suivante, quelques cases à remplir. */
function bande(alea: Alea, jusqua: number): { debut: number; vides: Set<number> } {
  const debut = 10 * entre(alea, 0, Math.floor(jusqua / 10) - 1);
  const vides = new Set(melanger(alea, Array.from({ length: 9 }, (_, i) => debut + 1 + i)).slice(0, 4));
  return { debut, vides };
}

export function htmlEncadrer(r: ReglagesComparer, graine: number): string {
  const alea = hasard(graine);
  const dizaines = Array.from({ length: 4 }, () => horsDizaine(alea, r.jusqua));
  const voisins = Array.from({ length: 4 }, () => entre(alea, 2, r.jusqua - 1));
  const bandes = [bande(alea, r.jusqua), bande(alea, r.jusqua)];
  const titre = "Encadrer des nombres";
  const cadre = (n: number) => `<div class="fc-ligne">${caseVide}${signe("<")}<b>${n}</b>${signe("<")}${caseVide}</div>`;
  const bandeHtml = (b: { debut: number; vides: Set<number> }) =>
    `<div class="fc-bande">${Array.from({ length: 11 }, (_, i) => b.debut + i).map((n) => `<span>${b.vides.has(n) ? "" : n}</span>`).join("")}</div>`;
  const page = `<div class="page">${entete(titre)}
    ${consigne("Encadre chaque nombre entre deux dizaines.")}
    <div class="fc-cadres">${dizaines.map(cadre).join("")}</div>
    ${consigne("Écris le nombre juste avant et le nombre juste après.")}
    <div class="fc-cadres">${voisins.map(cadre).join("")}</div>
    ${consigne("Complète la bande numérique.")}
    ${bandes.map(bandeHtml).join("")}
  </div>`;
  const lignes = [
    ...dizaines.map((n) => `${Math.floor(n / 10) * 10} &lt; ${n} &lt; ${Math.floor(n / 10) * 10 + 10}`),
    ...voisins.map((n) => `${n - 1} &lt; ${n} &lt; ${n + 1}`),
    ...bandes.map((b) => `La bande de ${b.debut} à ${b.debut + 10} : ${[...b.vides].sort((x, y) => x - y).join(", ")}`),
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

// ── Séance 6 : problèmes de comparaison ───────────────────────────────────

/** Deux nombres différents et proches : on compare pour de bon. */
function proches(alea: Alea, jusqua: number): [number, number] {
  for (;;) {
    const x = entre(alea, 2, jusqua);
    const y = ressemblant(x, jusqua, alea) ?? Math.max(1, Math.min(jusqua, x + entre(alea, -6, 6)));
    if (y !== x) return [x, y];
  }
}

export interface Probleme { enonce: string; a: number; b: number; reponse: string }

/** Les problèmes : celui du programme (Aaron et Mia), celui du guide (le car), et deux autres de la même sorte. */
export function problemesDeComparaison(alea: Alea, jusqua: number): Probleme[] {
  const [x1, y1] = proches(alea, jusqua);
  const { eleves, places } = car(alea, jusqua);
  const [x3, y3] = proches(alea, jusqua);
  const [chaises, salle] = proches(alea, jusqua);
  return [
    { enonce: `Aaron a ${x1} trombones dans sa trousse et Mia en a ${y1}. Qui de Aaron ou de Mia a le plus de trombones ?`, a: x1, b: y1,
      reponse: x1 > y1 ? "Aaron a le plus de trombones." : "Mia a le plus de trombones." },
    { enonce: `${eleves} élèves doivent partir au cinéma. Le car arrive, il peut transporter ${places} élèves. Tous les élèves pourront-ils être transportés ? Explique pourquoi.`,
      a: eleves, b: places, reponse: eleves <= places ? "Oui : il y a assez de places." : `Non : il manque ${eleves - places} place${eleves - places > 1 ? "s" : ""}.` },
    { enonce: `Dans la boîte rouge, il y a ${x3} crayons. Dans la boîte bleue, il y en a ${y3}. Quelle boîte a le moins de crayons ?`, a: x3, b: y3,
      reponse: x3 < y3 ? "La boîte rouge." : "La boîte bleue." },
    { enonce: `Pour la fête de la classe, il faut ${chaises} chaises. Il y en a ${salle} dans la salle. Y a-t-il assez de chaises ?`, a: chaises, b: salle,
      reponse: salle >= chaises ? "Oui." : `Non : il en manque ${chaises - salle}.` },
  ];
}

const problemeHtml = (p: Probleme) => `<div class="fc-probleme">${escapeHtml(p.enonce)}
  <div class="fc-reponse">Je compare : ${caseVide}<span class="fc-rond"></span>${caseVide}</div>
  <div class="fc-reponse">Réponse : <span class="fc-trait"></span></div></div>`;

export function htmlProblemes(r: ReglagesComparer, graine: number): string {
  const problemes = problemesDeComparaison(hasard(graine), r.jusqua);
  const titre = "Problèmes de comparaison";
  const page = `<div class="page">${entete(titre)}${consigne("Lis chaque problème. Écris la comparaison avec un signe, puis réponds.")}${problemes.map(problemeHtml).join("")}</div>`;
  return feuille(page + corrige(titre, problemes.map((p) => `${p.a} ${html(signeEntre(p.a, p.b))} ${p.b} — ${escapeHtml(p.reponse)}`)), "cn fc");
}

// ── Séance 7 : l'évaluation ───────────────────────────────────────────────

export function htmlEvaluation(r: ReglagesComparer, graine: number): string {
  const alea = hasard(graine);
  const paires = pairesAComparer(r, alea, 4);
  const serie = distincts(alea, r.jusqua, 5);
  const intervalles = [bornes(alea, r.jusqua), bornes(alea, r.jusqua)];
  const dizaines = [horsDizaine(alea, r.jusqua), horsDizaine(alea, r.jusqua)];
  const probleme = problemesDeComparaison(alea, r.jusqua)[0];
  const titre = "Évaluation — comparer, ranger, encadrer";
  const page = `<div class="page">${entete(titre)}
    ${consigne("1. Écris le signe qui convient : <, > ou =.")}
    <div class="fc-paires">${paires.map(paireHtml).join("")}</div>
    ${consigne("2. Range les nombres du plus petit au plus grand.")}
    <div class="fc-serie">${donnes(serie)}${ligneDeCases(5, "<")}</div>
    ${consigne("3. Écris un nombre qui va entre les deux.")}
    <div class="fc-cadres">${intervalles.map(([a, b]) => `<div class="fc-ligne"><b>${a}</b>${signe("<")}${caseVide}${signe("<")}<b>${b}</b></div>`).join("")}</div>
    ${consigne("4. Encadre chaque nombre entre deux dizaines.")}
    <div class="fc-cadres">${dizaines.map((n) => `<div class="fc-ligne">${caseVide}${signe("<")}<b>${n}</b>${signe("<")}${caseVide}</div>`).join("")}</div>
    ${consigne("5. Lis, puis réponds.")}
    ${problemeHtml(probleme)}
  </div>`;
  const lignes = [
    ...paires.map((p) => `${lu(p.a)} ${html(signeEntre(p.a.n, p.b.n))} ${lu(p.b)}`),
    [...serie].sort((x, y) => x - y).join(" &lt; "),
    ...intervalles.map(([a, b]) => `Entre ${a} et ${b} : ${Array.from({ length: b - a - 1 }, (_, i) => a + 1 + i).join(", ")}`),
    ...dizaines.map((n) => `${Math.floor(n / 10) * 10} &lt; ${n} &lt; ${Math.floor(n / 10) * 10 + 10}`),
    `${probleme.a} ${html(signeEntre(probleme.a, probleme.b))} ${probleme.b} — ${escapeHtml(probleme.reponse)}`,
  ];
  return feuille(page + corrige(titre, lignes), "cn fc");
}

export const STYLE_FEUILLES_COMPARER = `
  .feuille.fc .fc-nom { font-size: 13px; color: #444; margin: 0 0 2mm; }
  .feuille.fc .fc-consigne { font-size: 14px; font-weight: 700; margin: 5mm 0 3mm; }
  .feuille.fc .fc-paires { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; }
  .feuille.fc .fc-paire { display: flex; align-items: center; justify-content: center; gap: 3mm; break-inside: avoid; }
  .feuille.fc .fc-boite { display: inline-flex; align-items: center; justify-content: center; min-width: 26mm; min-height: 15mm; padding: 1.5mm 2.5mm;
    border: 1.5px solid #1c2233; border-radius: 2.5mm; }
  .feuille.fc .cn-chiffres { font-size: 26px; }
  .feuille.fc .cn-unites { font-size: 19px; }
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
  .feuille.fc .fc-probleme { border: 1px solid #cfd4e2; border-radius: 3mm; padding: 3mm 4mm; margin: 0 0 4mm; font-size: 14px; line-height: 1.5;
    break-inside: avoid; page-break-inside: avoid; }
  .feuille.fc .fc-reponse { display: flex; align-items: center; gap: 2mm; margin-top: 2.5mm; }
  .feuille.fc .fc-trait { flex: 1; border-bottom: 1.5px solid #1c2233; height: 7mm; }
  .feuille.fc .fc-ecrire { display: flex; align-items: center; gap: 3mm; font-size: 15px; margin: 2mm 0; }
  .feuille.fc .fc-ronds svg { display: block; margin: 3mm auto 0; }
  .feuille.fc .fc-affiche .cn-savoir { padding: 10mm 8mm; margin-top: 10mm; }
  .feuille.fc .fc-affiche .cn-savoir-titre { font-size: 18px; }
  .feuille.fc .fc-affiche .cn-savoir-dessins { gap: 30mm; margin: 8mm 0 4mm; }
  .feuille.fc .fc-affiche .cn-savoir-nombre { font-size: 20px; }
  .feuille.fc .fc-affiche .cn-savoir-signes { font-size: 72px; }
  .feuille.fc .fc-affiche .cn-savoir p { font-size: 24px; line-height: 1.4; }
  .feuille.fc .fc-signes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 5mm; margin-top: 12mm; text-align: center; font-size: 17px; font-weight: 700; }
  .feuille.fc .fc-signes span { display: block; font-size: 64px; font-weight: 800; line-height: 1.1; }
  .feuille.fc .fc-corrige ol { font-size: 13px; line-height: 1.9; padding-left: 6mm; }
`;
