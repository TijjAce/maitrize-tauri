// Devenir lecteur : le carnet de lecteur, les personnages, la mise en réseau, choisir un livre.
//
// Programme de français du cycle 2 (2024), « Devenir lecteur » : lire 5 à 10
// œuvres complètes par an ; repérer et reconnaître des types de personnages ;
// aller vers les livres et en choisir ; relier ses lectures à son expérience
// et entre elles (mise en réseau) ; fréquenter des lieux de lecture. Le
// professeur « donne aux élèves la possibilité de garder la mémoire de leurs
// lectures (carnet de lecture, etc.) » ; au CE1, l'élève « commence à écrire à
// propos de ses lectures » et « présente une lecture à ses camarades » ; au
// CE2, il « consigne ses expériences de lecture dans un carnet de lecteur ».

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";

export type Classe = "CP" | "CE1" | "CE2";
export type ExerciceLecteur = "fiche" | "personnage" | "personnagesTypes" | "reseau" | "presenter" | "emprunts" | "genres";

export const EXERCICES_LECTEUR: { id: ExerciceLecteur; libelle: string }[] = [
  { id: "fiche", libelle: "La page du carnet de lecteur" },
  { id: "personnage", libelle: "La carte d'identité d'un personnage" },
  { id: "personnagesTypes", libelle: "Les personnages-types des contes" },
  { id: "reseau", libelle: "La mise en réseau : comparer des livres" },
  { id: "presenter", libelle: "Présenter un livre à la classe" },
  { id: "emprunts", libelle: "Choisir un livre ; le carnet des emprunts" },
  { id: "genres", libelle: "Conte, fable, poème, théâtre, documentaire" },
];

export interface ReglagesLecteur {
  exercice: ExerciceLecteur;
  classe: Classe;
  /** Le livre étudié (titre — auteur), pour la page du carnet et la carte du personnage. */
  livre: string;
  /** Le thème du réseau (« les loups dans les contes ») et ses livres, un par ligne. */
  theme: string;
  livres: string;
}

export const REGLAGES_LECTEUR: ReglagesLecteur = { exercice: "fiche", classe: "CP", livre: "", theme: "", livres: "" };

/** Les personnages-types des contes : ce qu'ils sont souvent, et où on les rencontre. */
export const PERSONNAGES_TYPES: { nom: string; souvent: string; ou: string }[] = [
  { nom: "le loup", souvent: "Il est affamé et rusé ; il veut manger les plus faibles, mais il se fait souvent rouler.", ou: "Le Petit Chaperon rouge (Perrault, Grimm) ; Le Loup et les Sept Chevreaux (Grimm)" },
  { nom: "l'ogre", souvent: "Il est énorme, il sent la chair fraîche et mange les enfants.", ou: "Le Petit Poucet (Perrault) ; Le Chat botté (Perrault)" },
  { nom: "la sorcière", souvent: "Elle jette des sorts, prépare des potions, piège les enfants.", ou: "Hansel et Gretel (Grimm) ; Raiponce (Grimm)" },
  { nom: "la fée", souvent: "Elle a des pouvoirs magiques ; elle aide le héros, ou lui jette un sort.", ou: "Cendrillon (Perrault) ; La Belle au bois dormant (Perrault)" },
  { nom: "le roi", souvent: "Il règne sur un royaume ; il donne souvent sa fille en mariage au héros.", ou: "Le Chat botté (Perrault) ; Le Roi grenouille (Grimm)" },
  { nom: "la princesse", souvent: "Elle est belle ; elle est souvent enfermée, endormie ou ensorcelée, et délivrée.", ou: "La Princesse au petit pois (Andersen) ; La Belle au bois dormant (Perrault)" },
  { nom: "la marâtre", souvent: "C'est la belle-mère méchante, jalouse de l'héroïne.", ou: "Cendrillon (Perrault) ; Blanche-Neige (Grimm)" },
  { nom: "le petit héros malin", souvent: "Il est le plus petit ou le plus faible, mais courageux et malin : il gagne à la fin.", ou: "Le Petit Poucet (Perrault) ; Jacques et le Haricot magique" },
  { nom: "le renard", souvent: "Il est rusé : il trompe les autres pour obtenir ce qu'il veut.", ou: "Le Corbeau et le Renard (La Fontaine) ; Le Roman de Renart" },
];

/** Les genres et leurs indices ; un début pour chacun, à reconnaître. */
export const GENRES: { genre: string; indices: string; debut: string; source: string }[] = [
  { genre: "un conte", indices: "« Il était une fois » ; un temps et un pays lointains ; des personnages-types ; de la magie ; une fin heureuse.", debut: "Il était une fois un bûcheron et une bûcheronne qui avaient sept enfants, tous garçons.", source: "Charles Perrault, Le Petit Poucet" },
  { genre: "une fable", indices: "Des animaux qui parlent ; une petite histoire en vers ; une morale, une leçon, au début ou à la fin.", debut: "Maître Corbeau, sur un arbre perché, / Tenait en son bec un fromage.", source: "Jean de La Fontaine, Le Corbeau et le Renard" },
  { genre: "un poème", indices: "Des vers, des strophes ; souvent des rimes ; des images, des comparaisons.", debut: "Il pleut sur la ville grise, / Il pleut sur les toits pointus,", source: "Maitrize, Il pleut sur la ville" },
  { genre: "du théâtre", indices: "Le nom du personnage devant ce qu'il dit ; des indications entre parenthèses ; fait pour être joué.", debut: "LA REINE, en bâillant. — Votre Majesté, il est minuit passé. / LE ROI. — Et alors ?", source: "Maitrize, Le roi qui ne voulait pas se coucher" },
  { genre: "un documentaire", indices: "Il donne des informations vraies ; des titres, des photos, des schémas ; pas d'histoire.", debut: "Les abeilles vivent ensemble dans une ruche. Une ruche peut abriter plusieurs milliers d'abeilles.", source: "Maitrize, La vie des abeilles" },
  { genre: "un roman", indices: "Une longue histoire, en chapitres ; on le lit en plusieurs fois.", debut: "Chapitre 1. Ce matin-là, en ouvrant ses volets, Léon comprit tout de suite que la journée serait étrange.", source: "Maitrize" },
];

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const pointilles = (n = 1) => Array.from({ length: n }, () => '<div class="cl-ligne"></div>').join("");
const champ = (libelle: string, valeur = "", lignes = 1) => `<div class="cl-champ"><span class="cl-lib">${escapeHtml(libelle)}</span>${valeur ? `<span class="cl-val">${escapeHtml(valeur)}</span>` : pointilles(lignes)}</div>`;
const cases = (choix: string[]) => `<div class="cl-cases">${choix.map((c) => `<span><span class="cl-case"></span> ${escapeHtml(c)}</span>`).join("")}</div>`;

/** Un visage pour dire son avis : il sourit, il est neutre ou il fait la moue. */
export function visage(humeur: "content" | "neutre" | "pas", taille = 11): string {
  const bouche = humeur === "content" ? "M7 13 Q11 17 15 13" : humeur === "neutre" ? "M7 14 L15 14" : "M7 15 Q11 11 15 15";
  return `<svg viewBox="0 0 22 22" width="${taille}mm" height="${taille}mm"><circle cx="11" cy="11" r="10" fill="none" stroke="#1c2233" stroke-width="1.2"/><circle cx="7.5" cy="8.5" r="1.1" fill="#1c2233"/><circle cx="14.5" cy="8.5" r="1.1" fill="#1c2233"/><path d="${bouche}" fill="none" stroke="#1c2233" stroke-width="1.2" stroke-linecap="round"/></svg>`;
}
const avis = () => `<div class="cl-avis">${(["content", "neutre", "pas"] as const).map((h, i) => `<span>${visage(h)}<br>${["J'ai aimé", "Un peu", "Pas aimé"][i]}</span>`).join("")}</div>`;

/** « Le Petit Poucet — Charles Perrault » : le titre, puis l'auteur. */
export function titreEtAuteur(livre: string): [string, string] {
  const [t, ...a] = livre.split(/\s+[—–-]\s+/);
  return [t.trim(), a.join(" — ").trim()];
}

function feuilleFiche(r: ReglagesLecteur): string {
  const [t, a] = r.livre.trim() ? titreEtAuteur(r.livre) : ["", ""];
  const genres = ["album", "conte", "fable", "poème", "théâtre", "roman", "documentaire"];
  const corps = r.classe === "CP"
    ? `${champ("Le titre", t)}${champ("L'auteur", a)}<div class="cl-dessin"><span>Le moment que j'ai préféré, en dessin</span></div>${champ("Je l'écris en une phrase", "", 1)}${avis()}`
    : `${champ("Le titre", t)}${champ("L'auteur", a)}${champ("L'illustrateur")}<div class="cl-champ"><span class="cl-lib">C'est</span>${cases(genres)}</div>
      ${champ("Les personnages", "", 1)}${champ("Où et quand se passe l'histoire", "", 1)}${champ("Ce que raconte le livre, en deux ou trois phrases", "", 3)}
      <div class="cl-deux"><div class="cl-dessin cl-petit"><span>Le passage que j'ai préféré</span></div><div>${champ("Pourquoi", "", 3)}${r.classe === "CE2" ? champ("Ce livre me fait penser à… (un autre livre, ce que j'ai vécu)", "", 2) : ""}</div></div>${avis()}${champ("Je le conseillerais à…, parce que…", "", 1)}`;
  return `<div class="page">${titre("Mon carnet de lecteur")}${TETE}${regle("Garde la mémoire de tes lectures : une page par livre lu. Relis ton carnet avant de choisir un nouveau livre.")}${corps}</div>`;
}

const CARACTERES = ["rusé", "gentil", "méchant", "courageux", "peureux", "gourmand", "malin", "naïf", "jaloux", "généreux", "curieux", "têtu", "sage", "orgueilleux", "honnête", "menteur"];

function feuillePersonnage(r: ReglagesLecteur): string {
  const ce2 = r.classe === "CE2";
  return `<div class="page">${titre("La carte d'identité d'un personnage")}${TETE}${regle("Relis les passages où le personnage apparaît : ce qu'il fait, ce qu'il dit, ce que les autres disent de lui. Ses actions te disent comment il est.")}
    ${champ("Le livre", r.livre)}<div class="cl-deux"><div class="cl-dessin cl-portrait"><span>Son portrait</span></div><div>${champ("Son nom")}${champ("Qui est-il ? (un animal, un enfant, un roi…)")}${champ("Comment il est (son physique)", "", 2)}</div></div>
    <div class="cl-champ"><span class="cl-lib">Son caractère (entoure, ou ajoute un mot)</span><div class="cl-mots">${CARACTERES.map((m) => `<span>${m}</span>`).join("")}</div></div>
    ${champ("La preuve dans le livre (ce qu'il fait ou dit)", "", 2)}${champ("Ce qu'il veut", "", 1)}${champ("Ce qu'il ressent au début, à la fin", "", ce2 ? 2 : 1)}
    ${champ("Il ressemble au personnage-type de…", "", 1)}${ce2 ? champ("Pourquoi agit-il ainsi ? Aurais-tu fait comme lui ?", "", 2) : ""}</div>`;
}

function feuillePersonnagesTypes(r: ReglagesLecteur, graine: number): string {
  const liste = r.classe === "CP" ? PERSONNAGES_TYPES.slice(0, 6) : PERSONNAGES_TYPES;
  if (r.classe === "CP") {
    // Au CP : relier chaque personnage à ce qu'il fait souvent dans les contes.
    const melange = melanger(hasard(graine), liste);
    const lignes = liste.map((p, i) => `<tr><td class="cl-gauche">${escapeHtml(p.nom)} <span class="cl-point">●</span></td><td class="cl-vide"></td><td class="cl-droite"><span class="cl-point">●</span> ${escapeHtml(melange[i].souvent)}</td></tr>`).join("");
    return `<div class="page">${titre("Les personnages des contes")}${TETE}${regle("Relie chaque personnage à ce qu'il fait souvent dans les contes que nous avons lus.")}<table class="cl-relier">${lignes}</table></div>
      <div class="page corrige">${titre("Les personnages des contes — corrigé")}${liste.map((p) => `<div class="cl-c"><b>${escapeHtml(p.nom)}</b> : ${escapeHtml(p.souvent)} <span class="cl-gris">— ${escapeHtml(p.ou)}</span></div>`).join("")}</div>`;
  }
  const lignes = liste.map((p) => `<tr><td class="cl-nom">${escapeHtml(p.nom)}</td><td></td><td></td></tr>`).join("");
  return `<div class="page">${titre("Les personnages-types des contes")}${TETE}${regle("Au fil des contes lus, complète le tableau : comment est souvent ce personnage, et dans quels livres tu l'as rencontré.")}
    <table class="cl-tableau"><tr><th>Le personnage</th><th>Comment il est souvent</th><th>Où je l'ai rencontré</th></tr>${lignes}</table></div>
    <div class="page corrige">${titre("Les personnages-types — pour l'enseignant")}${liste.map((p) => `<div class="cl-c"><b>${escapeHtml(p.nom)}</b> : ${escapeHtml(p.souvent)} <span class="cl-gris">— ${escapeHtml(p.ou)}</span></div>`).join("")}</div>`;
}

/** Un réseau donné en exemple quand l'enseignant n'en a pas saisi. */
export const RESEAU_EXEMPLE = { theme: "Le loup dans les contes", livres: ["Le Petit Chaperon rouge — Charles Perrault", "Le Loup et les Sept Chevreaux — les frères Grimm", "Les Trois Petits Cochons — conte traditionnel"] };

function feuilleReseau(r: ReglagesLecteur): string {
  const livres = r.livres.split("\n").map((l) => l.trim()).filter(Boolean);
  const theme = r.theme.trim() || (livres.length ? "" : RESEAU_EXEMPLE.theme);
  const liste = livres.length ? livres : RESEAU_EXEMPLE.livres;
  const lignes = liste.slice(0, 6).map((l) => `<tr><td class="cl-nom">${escapeHtml(l)}</td><td></td><td></td><td></td></tr>`).join("");
  const vides = Array.from({ length: Math.max(0, 4 - liste.length) }, () => "<tr><td></td><td></td><td></td><td></td></tr>").join("");
  return `<div class="page">${titre(`La mise en réseau${theme ? ` — ${theme}` : ""}`)}${TETE}${regle("Compare les livres du réseau : qu'ont-ils en commun ? qu'est-ce qui change d'un livre à l'autre ?")}
    <table class="cl-tableau"><tr><th>Le livre</th><th>Le personnage</th><th>Ce qui est pareil</th><th>Ce qui change</th></tr>${lignes}${vides}</table>
    ${champ("Ce que j'ai découvert en lisant ces livres ensemble", "", 2)}${champ("Le livre du réseau que je préfère, et pourquoi", "", r.classe === "CP" ? 1 : 2)}${r.classe !== "CP" ? champ("Ces livres me font penser à…", "", 1) : ""}</div>`;
}

function feuillePresenter(): string {
  const plan = [
    ["Je vous présente…", "le titre, l'auteur, l'illustrateur"],
    ["C'est l'histoire de…", "le personnage principal, ce qui lui arrive — sans raconter la fin !"],
    ["Mon passage préféré…", "je le lis à voix haute, je l'ai préparé"],
    ["Je vous le conseille, parce que…", "à qui, et pourquoi"],
  ];
  const criteres = ["Je regarde mes camarades.", "Je parle fort et lentement.", "Je montre le livre.", "Je ne raconte pas la fin.", "Je réponds aux questions."];
  return `<div class="page">${titre("Présenter un livre à la classe")}${TETE}${regle("Prépare ta présentation : note quelques mots pour chaque partie, pas des phrases entières. Entraîne-toi à voix haute.")}
    ${plan.map(([a, b]) => `<div class="cl-champ"><span class="cl-lib">${escapeHtml(a)}</span> <span class="cl-gris">(${escapeHtml(b)})</span>${pointilles(2)}</div>`).join("")}
    <table class="cl-tableau cl-grille"><tr><th>Pendant que je présente</th><th>Moi</th><th>Un camarade</th></tr>${criteres.map((c) => `<tr><td>${escapeHtml(c)}</td><td><span class="cl-case"></span></td><td><span class="cl-case"></span></td></tr>`).join("")}</table></div>`;
}

function feuilleEmprunts(r: ReglagesLecteur): string {
  const indices = ["la couverture et son illustration", "le titre", "le résumé de la 4e de couverture", "un auteur que je connais déjà", "le genre : conte, documentaire, bande dessinée…", "les premières pages, que je feuillette", "le conseil d'un camarade"];
  const lignes = Array.from({ length: r.classe === "CP" ? 7 : 10 }, () => `<tr><td></td><td></td>${r.classe === "CP" ? "" : "<td></td>"}<td class="cl-av">${visage("content", 6)} ${visage("neutre", 6)} ${visage("pas", 6)}</td></tr>`).join("");
  return `<div class="page">${titre("Choisir un livre")}${TETE}${regle("À la bibliothèque ou au coin lecture, avant de choisir, je regarde… (coche ce qui t'aide le plus)")}
    ${cases(indices)}
    <div class="titre cl-sous-titre">Mon carnet des emprunts</div>
    <table class="cl-tableau"><tr><th>Date</th><th>Le titre</th>${r.classe === "CP" ? "" : "<th>L'auteur</th>"}<th>Mon avis</th></tr>${lignes}</table></div>`;
}

function feuilleGenres(r: ReglagesLecteur, graine: number): string {
  const liste = r.classe === "CP" ? GENRES.filter((g) => ["un conte", "une fable", "un poème", "un documentaire"].includes(g.genre)) : GENRES;
  const ordre = melanger(hasard(graine + 1), liste);
  const choix = liste.map((g) => `<span class="cl-case"></span> ${escapeHtml(g.genre)}`).join(" &nbsp; ");
  const items = ordre.map((g, i) => `<div class="cl-q"><div class="cl-enonce"><b>${i + 1}.</b> « ${escapeHtml(g.debut)} »</div><div class="cl-choix">C'est ${choix}</div>${r.classe === "CP" ? "" : champ("L'indice")}</div>`).join("");
  return `<div class="page">${titre("Quel genre de texte ?")}${TETE}${regle("Lis chaque début. Coche le genre, puis écris l'indice qui t'a aidé.")}${items}</div>
    <div class="page corrige">${titre("Quel genre de texte ? — corrigé")}${ordre.map((g, i) => `<div class="cl-c"><b>${i + 1}.</b> ${escapeHtml(g.genre)} — ${escapeHtml(g.indices)} <span class="cl-gris">(${escapeHtml(g.source)})</span></div>`).join("")}</div>`;
}

export function htmlLecteur(r: ReglagesLecteur, graine: number): string {
  const corps = r.exercice === "fiche" ? feuilleFiche(r)
    : r.exercice === "personnage" ? feuillePersonnage(r)
      : r.exercice === "personnagesTypes" ? feuillePersonnagesTypes(r, graine)
        : r.exercice === "reseau" ? feuilleReseau(r)
          : r.exercice === "presenter" ? feuillePresenter()
            : r.exercice === "emprunts" ? feuilleEmprunts(r)
              : feuilleGenres(r, graine);
  return feuille(corps, "cl");
}

export const STYLE_LECTEUR = `
  .feuille.cl .cl-champ { margin: 0 0 3mm; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
  .feuille.cl .cl-lib { font-weight: 700; }
  .feuille.cl .cl-val { margin-left: 2mm; font-size: 15px; }
  .feuille.cl .cl-ligne { border-bottom: 1px solid #9aa0b4; height: 8mm; }
  .feuille.cl .cl-cases { font-size: 12.5px; line-height: 2; margin: 1mm 0 2mm; }
  .feuille.cl .cl-cases > span { display: inline-block; margin-right: 4mm; white-space: nowrap; }
  .feuille.cl .cl-case { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -0.8mm; }
  .feuille.cl .cl-dessin { border: 1.5px dashed #9aa0b4; border-radius: 3mm; height: 80mm; margin: 2mm 0 4mm; position: relative; }
  .feuille.cl .cl-dessin > span { position: absolute; top: 2mm; left: 3mm; font-size: 11px; color: #687087; }
  .feuille.cl .cl-dessin.cl-petit { height: 45mm; }
  .feuille.cl .cl-dessin.cl-portrait { height: 55mm; }
  .feuille.cl .cl-deux { display: grid; grid-template-columns: 62mm 1fr; gap: 5mm; align-items: start; }
  .feuille.cl .cl-avis { display: block; text-align: center; margin: 3mm 0; font-size: 11px; }
  .feuille.cl .cl-avis > span { display: inline-block; margin: 0 6mm; text-align: center; }
  .feuille.cl .cl-mots { margin-top: 1.5mm; line-height: 2.2; }
  .feuille.cl .cl-mots span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 2.5mm; margin: 0 1.5mm 1mm 0; line-height: 1.7; }
  .feuille.cl .cl-tableau { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 2mm 0 5mm; }
  .feuille.cl .cl-tableau th, .feuille.cl .cl-tableau td { border: 1px solid #1c2233; padding: 2mm; text-align: left; vertical-align: top; }
  .feuille.cl .cl-tableau th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.cl .cl-tableau td { height: 16mm; }
  .feuille.cl .cl-tableau.cl-grille td { height: 8mm; vertical-align: middle; }
  .feuille.cl .cl-tableau .cl-av { white-space: nowrap; width: 28mm; vertical-align: middle; }
  .feuille.cl .cl-nom { font-weight: 700; width: 30%; }
  .feuille.cl .cl-relier { width: 100%; border-collapse: collapse; font-size: 14px; }
  .feuille.cl .cl-relier td { padding: 4mm 0; vertical-align: middle; border: none; }
  .feuille.cl .cl-gauche { width: 30%; font-weight: 700; text-align: right; white-space: nowrap; }
  .feuille.cl .cl-vide { width: 22%; }
  .feuille.cl .cl-point { color: #1c2233; font-size: 12px; margin: 0 1.5mm; }
  .feuille.cl .cl-q { margin: 0 0 5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.cl .cl-enonce { font-size: 14px; line-height: 1.5; font-style: italic; }
  .feuille.cl .cl-enonce b { font-style: normal; color: #687087; margin-right: 1mm; }
  .feuille.cl .cl-choix { font-size: 12.5px; line-height: 2; margin: 1mm 0 0 2mm; }
  .feuille.cl .cl-c { font-size: 13px; line-height: 1.6; margin: 0 0 2.5mm; }
  .feuille.cl .cl-gris { color: #687087; font-size: 12px; }
  .feuille.cl .cl-sous-titre { margin-top: 6mm; font-size: 15px; }
`;
