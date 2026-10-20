// Lire une œuvre et se l'approprier : le carnet de lecteur du cours moyen.
//
// Programme de français du cycle 3 (2025) : lire au moins sept œuvres
// complètes par an — au CM1, au moins 2 œuvres du patrimoine et 5 ouvrages
// de littérature de jeunesse ; au CM2, 3 et 4 — ; garder trace de ses
// lectures et les partager (« carnet de lecteur, cercle de lecture, défi
// lecture, podcast, vidéo, affiche ») ; mettre le texte lu en relation avec
// une œuvre lue en classe au CM1, avec une autre œuvre ou une autre
// référence culturelle au CM2, et avec ses expériences personnelles ;
// s'engager et persévérer. Six entrées littéraires structurent la culture
// littéraire du cours moyen ; les œuvres citées ici sont parmi celles que
// proposent les exemples de réussite du CM1 et du CM2 (Éduscol, 2025).

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";

export type ExerciceLecteurCM = "carnet" | "relier" | "lectures" | "cercle" | "presenter" | "entrees";

export interface ReglagesLecteurCM { classe: "CM1" | "CM2"; exercice: ExerciceLecteurCM; livre: string; titre?: string }
export const REGLAGES_LECTEUR_CM: ReglagesLecteurCM = { classe: "CM1", exercice: "carnet", livre: "" };

/** Les six entrées littéraires du cours moyen, et des œuvres que proposent les exemples de réussite. */
export const ENTREES_LITTERAIRES: { entree: string; oeuvres: string[] }[] = [
  { entree: "Découvrir des héroïnes, des héros", oeuvres: ["Astrid Lindgren, Fifi Brindacier", "Roald Dahl, Matilda", "Thierry Dedieu, Yacuba", "Daniel Pennac, Kamo l'idée du siècle", "Marie-Aude Murail, Malo, fils de voleur"] },
  { entree: "Se confronter au merveilleux, à l'étrange", oeuvres: ["Carlo Collodi, Les aventures de Pinocchio", "Rudyard Kipling, Histoires comme ça", "Pamela-Lyndon Travers, Mary Poppins", "Marie Desplechin, Verte", "Kenneth Grahame, Le vent dans les saules"] },
  { entree: "Imaginer et vivre d'autres vies", oeuvres: ["Luis Sepulveda, Histoire d'une mouette et du chat qui lui apprit à voler", "Anne Fine, Journal d'un chat assassin", "Jean-Claude Mourlevat, Jefferson", "Jean-Claude Mourlevat, L'Enfant Océan", "Jules Verne, Voyage au centre de la Terre (texte abrégé)"] },
  { entree: "Comprendre et interroger la morale", oeuvres: ["Jean de La Fontaine, Fables, livres 1, 2 et 3", "Alphonse Daudet, La chèvre de Monsieur Seguin", "Jean Giono, L'homme qui plantait des arbres", "Comtesse de Ségur, Un bon petit diable"] },
  { entree: "Savourer le goût des mots, imaginer et créer en poésie", oeuvres: ["Alain Boudet, Les mots des mois", "Jean-Pierre Siméon, Si tu regardes longtemps la terre", "David Dumortier, Ces gens qui sont des arbres", "Jean-Marie Henry, Le tireur de langue"] },
  { entree: "Se découvrir, s'affirmer dans le rapport aux autres", oeuvres: ["Anna Gavalda, 35 kg d'espoir", "Yaël Hassan, Momo, prince des bleuets", "Claude Roy, La maison qui s'envole", "Jules Verne, La famille Raton"] },
];

/** Ce que le programme demande de lire dans l'année. */
export const LECTURES_DE_L_ANNEE: Record<"CM1" | "CM2", { patrimoine: number; jeunesse: number }> = { CM1: { patrimoine: 2, jeunesse: 5 }, CM2: { patrimoine: 3, jeunesse: 4 } };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';
const lignes = (n = 1) => Array.from({ length: n }, () => '<div class="lk-ligne"></div>').join("");
const champ = (libelle: string, n = 1, valeur = "") => `<div class="lk-champ"><div class="lk-lib">${escapeHtml(libelle)}</div>${valeur ? `<div class="lk-val">${escapeHtml(valeur)}</div>` : lignes(n)}</div>`;
const caseACocher = (t: string) => `<span class="lk-option"><span class="lk-case"></span> ${escapeHtml(t)}</span>`;

function feuilleCarnet(r: ReglagesLecteurCM): string {
  const [auteur, oeuvre] = r.livre.includes(",") ? [r.livre.split(",")[0].trim(), r.livre.split(",").slice(1).join(",").trim()] : ["", r.livre.trim()];
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("Mon carnet de lecteur")}${TETE}
    ${regle(`Après ma lecture, je remplis la page de mon carnet. J'écris ce que je pense vraiment, et je le justifie avec le livre. ${SOURCE}`)}
    <div class="lk-deux">${champ("Le titre", 1, oeuvre)}${champ("L'auteur ou l'autrice", 1, auteur)}</div>
    <div class="lk-champ"><div class="lk-lib">Le genre</div>${["un roman", "un conte", "des fables", "des poèmes", "une pièce de théâtre", "un album", "une bande dessinée", "un documentaire"].map(caseACocher).join(" ")}</div>
    ${champ("Ce que je retiens en premier, en refermant le livre", 2)}
    ${champ("Le passage que je recopie, et pourquoi je l'ai choisi", 3)}
    ${champ(cm2 ? "Le personnage auquel je m'identifie, ou dont je me distingue, et pourquoi" : "Le personnage auquel je ressemble, ou que j'aimerais être, et pourquoi", 2)}
    ${champ(cm2 ? "Ce livre me fait penser à… (un autre livre, un film, un tableau, une chanson, ce que j'ai vécu, le monde d'aujourd'hui)" : "Ce livre me fait penser à… (un livre lu en classe, ce que j'ai vécu)", 2)}
    ${champ("Mon avis, justifié par un moment du livre", 2)}
    ${champ("Je le conseillerais à…, parce que…", 1)}</div>`;
}

function feuilleRelier(r: ReglagesLecteurCM): string {
  const cm2 = r.classe === "CM2";
  const lignesTableau = ["Le titre, l'auteur", "Le genre", "Le héros ou l'héroïne", "Ce qu'il ou elle cherche, ce qui lui arrive", "Comment cela finit", "Ce que j'en pense"]
    .map((l) => `<tr><th>${escapeHtml(l)}</th><td></td><td></td></tr>`).join("");
  return `<div class="page">${titre("Relier deux œuvres")}${TETE}
    ${regle(`Je compare le livre que je lis avec ${cm2 ? "une autre œuvre ou une autre référence : un livre, un film, un tableau, une chanson" : "un livre lu en classe"}. Je remplis le tableau, puis j'écris ce qui les rapproche et ce qui les distingue. ${SOURCE}`)}
    <table class="lk-tableau"><tr><th></th><th>Le livre que je lis</th><th>${cm2 ? "L'autre œuvre" : "Le livre lu en classe"}</th></tr>${lignesTableau}</table>
    ${champ("Ce qui les rapproche", 2)}${champ("Ce qui les distingue", 2)}${champ("Ce que la comparaison m'a fait comprendre", 2)}</div>`;
}

function feuilleLectures(r: ReglagesLecteurCM): string {
  const o = LECTURES_DE_L_ANNEE[r.classe];
  const entrees = ENTREES_LITTERAIRES.map((e, i) => `${i + 1}. ${e.entree}`).join(" · ");
  const rangs = Array.from({ length: 10 }, () => `<tr><td></td><td></td><td></td><td class="lk-centre"><span class="lk-case"></span> P <span class="lk-case"></span> J</td><td class="lk-centre"></td><td class="lk-centre">☺ ☹</td></tr>`).join("");
  return `<div class="page">${titre("Mes lectures de l'année")}${TETE}
    ${regle(`J'inscris chaque livre que je finis. Je coche s'il appartient au patrimoine (P) ou à la littérature de jeunesse (J), et j'écris le numéro de son entrée. ${SOURCE}`)}
    <div class="lk-objectif">Au ${r.classe}, je lis au moins ${o.patrimoine} œuvres du patrimoine et ${o.jeunesse} livres de littérature de jeunesse.</div>
    <div class="lk-entrees">Les entrées : ${escapeHtml(entrees)}</div>
    <table class="lk-tableau lk-lectures"><tr><th>Date</th><th>Le titre</th><th>L'auteur</th><th>P ou J</th><th>Entrée</th><th>Mon avis</th></tr>${rangs}</table></div>`;
}

/** Les rôles du cercle de lecture : chacun prépare sa part, puis on échange. */
const ROLES: [string, string][] = [
  ["Le meneur de discussion", "Je prépare trois questions sur le passage, qui ne se répondent pas par oui ou non. Pendant le cercle, je donne la parole à chacun."],
  ["Le chercheur de mots", "Je relève trois mots ou expressions difficiles, intéressants ou étonnants ; j'écris leur sens et la page où je les ai trouvés."],
  ["Le relieur", "Je fais des liens entre ce passage et un autre livre, un film, ce que j'ai vécu ou ce qui se passe dans le monde."],
  ["L'illustrateur", "Je dessine une scène du passage ; je laisse les autres deviner laquelle, puis j'explique mon choix."],
  ["Le lecteur à voix haute", "Je choisis un court extrait, important, drôle ou émouvant ; je prépare sa lecture et je dis pourquoi je l'ai choisi."],
];

function feuilleCercle(): string {
  return `<div class="page">${titre("Le cercle de lecture")}${TETE}
    ${regle(`Chacun lit le même passage et prépare son rôle. Pendant le cercle, chacun présente son travail, puis nous échangeons nos impressions et nos interprétations, en nous appuyant sur le texte. À chaque cercle, les rôles tournent. ${SOURCE}`)}
    <div class="lk-roles">${ROLES.map(([r, q]) => `<div class="lk-role"><div class="lk-role-nom">${escapeHtml(r)}</div><div class="lk-role-quoi">${escapeHtml(q)}</div>${lignes(4)}</div>`).join("")}</div>
    ${champ("Le livre, les pages lues", 1)}</div>`;
}

function feuillePresenter(r: ReglagesLecteurCM): string {
  const plan: [string, number][] = [["Mon accroche : une question, une phrase du livre, un mystère", 2], ["Le titre, l'auteur ou l'autrice, le genre", 1],
    ["L'histoire, sans dévoiler la fin", 3], ["Le passage que je lirai à voix haute (page, première et dernière phrase)", 2], ["Mon avis, justifié par un moment du livre", 2], ["À qui je le conseille", 1]];
  const criteres = ["On a envie de lire le livre.", "Je n'ai pas dévoilé la fin.", "Mon avis est justifié.", "Ma lecture à voix haute est préparée.", "Je parle fort, sans lire mes notes, en regardant mon public."];
  return `<div class="page">${titre("Présenter un livre")}${TETE}
    ${regle(`Je prépare la présentation d'un livre que j'ai aimé, pour un défi lecture, un podcast ou la classe. Je note des mots clés, pas des phrases : je parlerai sans lire. ${r.classe === "CM2" ? "Je m'enregistre, je m'écoute et je m'améliore. " : ""}${SOURCE}`)}
    ${plan.map(([l, n]) => champ(l, n)).join("")}
    <table class="lk-tableau"><tr><th>Ce que mon public écoute</th><th>Oui</th><th>Pas encore</th></tr>${criteres.map((c) => `<tr><td>${escapeHtml(c)}</td><td class="lk-centre"><span class="lk-case"></span></td><td class="lk-centre"><span class="lk-case"></span></td></tr>`).join("")}</table></div>`;
}

function feuilleEntrees(): string {
  return `<div class="page">${titre("Choisir mes lectures")}${TETE}
    ${regle(`Voici des livres pour chacune des six entrées de l'année. Je coche ceux que j'ai lus et ceux que j'ai envie de lire ; j'en ajoute que je connais. ${SOURCE}`)}
    ${ENTREES_LITTERAIRES.map((e, i) => `<div class="lk-entree"><div class="lk-entree-nom">${i + 1}. ${escapeHtml(e.entree)}</div>
      <table class="lk-oeuvres">${e.oeuvres.map((o) => `<tr><td>${escapeHtml(o)}</td><td class="lk-centre"><span class="lk-case"></span> lu</td><td class="lk-centre"><span class="lk-case"></span> envie</td></tr>`).join("")}
      <tr><td><span class="lk-trait"></span></td><td class="lk-centre"><span class="lk-case"></span> lu</td><td class="lk-centre"><span class="lk-case"></span> envie</td></tr></table></div>`).join("")}
    <div class="lk-source">Œuvres proposées par les exemples de réussite du CM1 et du CM2 (Éduscol, 2025).</div></div>`;
}

export function htmlLecteurCM(r: ReglagesLecteurCM): string {
  const corps = r.exercice === "carnet" ? feuilleCarnet(r)
    : r.exercice === "relier" ? feuilleRelier(r)
      : r.exercice === "lectures" ? feuilleLectures(r)
        : r.exercice === "cercle" ? feuilleCercle()
          : r.exercice === "presenter" ? feuillePresenter(r)
            : feuilleEntrees();
  return feuille(corps, "lk");
}

export const STYLE_LECTEUR_CM = `
  .feuille.lk .lk-champ { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.lk .lk-lib { font-size: 12.5px; font-weight: 700; color: #2c3346; margin-bottom: 0.5mm; }
  .feuille.lk .lk-val { font-size: 14px; border-bottom: 1px solid #9aa0b4; padding: 1mm 0; }
  .feuille.lk .lk-ligne { border-bottom: 1px solid #9aa0b4; height: 8mm; }
  .feuille.lk .lk-deux { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
  .feuille.lk .lk-option { display: inline-block; font-size: 12px; margin: 0 3mm 1mm 0; white-space: nowrap; }
  .feuille.lk .lk-case { display: inline-block; width: 3.8mm; height: 3.8mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -0.8mm; }
  .feuille.lk .lk-tableau { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 0 0 4mm; }
  .feuille.lk .lk-tableau th, .feuille.lk .lk-tableau td { border: 1px solid #1c2233; padding: 2mm; text-align: left; height: 9mm; }
  .feuille.lk .lk-tableau th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.lk .lk-lectures td { height: 10mm; }
  .feuille.lk .lk-centre { text-align: center !important; white-space: nowrap; }
  .feuille.lk .lk-objectif { font-size: 13.5px; font-weight: 700; margin: 0 0 2mm; }
  .feuille.lk .lk-entrees { font-size: 11px; color: #4a5168; margin: 0 0 3mm; line-height: 1.5; }
  .feuille.lk .lk-roles { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-bottom: 4mm; }
  .feuille.lk .lk-role { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2.5mm 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.lk .lk-role-nom { font-weight: 800; font-size: 13.5px; }
  .feuille.lk .lk-role-quoi { font-size: 11.5px; color: #4a5168; margin: 1mm 0; line-height: 1.45; }
  .feuille.lk .lk-entree { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.lk .lk-entree-nom { font-weight: 800; font-size: 13px; margin-bottom: 1mm; }
  .feuille.lk .lk-oeuvres { width: 100%; border-collapse: collapse; font-size: 12px; }
  .feuille.lk .lk-oeuvres td { border-bottom: 1px dotted #c4c9d6; padding: 1mm 0; }
  .feuille.lk .lk-trait { display: inline-block; width: 90mm; border-bottom: 1px dotted #687087; height: 4mm; }
  .feuille.lk .lk-source { font-size: 10.5px; color: #687087; font-style: italic; text-align: right; }
`;
