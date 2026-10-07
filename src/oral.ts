// L'oral : les supports et les grilles des séquences d'oral, du CP au CE2.
//
// Programme de français du cycle 2 (2024), « Oral » : écouter pour
// comprendre, dire pour être compris, participer à des échanges. Les
// exemples du programme sont repris mot pour mot : « Je souhaite prendre la
// parole pour… ; Je suis d'accord… » au CP, « Je ne suis pas d'accord
// avec… ; Je ne partage pas l'avis de… » au CE1, « Pour compléter ce qu'a
// dit… ; Je souhaite revenir sur ce qu'a dit… ; Pour reprendre les propos
// de… » au CE2 ; les connecteurs « parce que, alors, ensuite », « d'abord,
// pour commencer, ensuite, donc, par conséquent, enfin, pour terminer, pour
// conclure » ; « on ne parle pas de la même manière en classe et dans la
// cour » ; « Il restitue un poème en articulant distinctement et d'une voix
// audible. » La démarche des séquences — production initiale, critères,
// ateliers, production finale — est celle d'Éduscol, « Organiser
// l'enseignement de l'oral » ; la carte du récit et le rappel à mot imposé,
// celles du guide CP (p. 52-53, p. 105).

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { texteDe } from "./textesDeComprehension";

export type Classe = "CP" | "CE1" | "CE2";
export type Genre = "raconter" | "expose" | "poeme" | "debat";
export type ExerciceOral = "grille" | "expressions" | "roles" | "registres" | "situations" | "raconter" | "planExpose" | "poeme";

export const EXERCICES_ORAL: { id: ExerciceOral; libelle: string }[] = [
  { id: "grille", libelle: "La grille d'écoute : moi, un camarade, le professeur" },
  { id: "raconter", libelle: "Raconter : la carte du récit, les mots pour enchaîner" },
  { id: "poeme", libelle: "Le poème à dire" },
  { id: "planExpose", libelle: "Préparer un exposé : le plan, les fiches-mémo" },
  { id: "expressions", libelle: "Les cartes « Je prends la parole »" },
  { id: "roles", libelle: "Les rôles du débat" },
  { id: "registres", libelle: "Familier, courant, soutenu" },
  { id: "situations", libelle: "Les jeux de rôles : qui parle, à qui ?" },
];

export const GENRES: { id: Genre; nom: string }[] = [
  { id: "raconter", nom: "Raconter" }, { id: "expose", nom: "Présenter un exposé" }, { id: "poeme", nom: "Dire un poème" }, { id: "debat", nom: "Échanger, débattre" },
];

export interface ReglagesOral { exercice: ExerciceOral; classe: Classe; genre: Genre }
export const REGLAGES_ORAL: ReglagesOral = { exercice: "grille", classe: "CE1", genre: "raconter" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const lignes = (n: number) => Array.from({ length: n }, () => '<div class="ol-ligne"></div>').join("");

/** Les critères de chaque genre, de plus en plus nombreux du CP au CE2, tirés des exemples de réussite du programme. */
export const CRITERES: Record<Genre, Record<Classe, string[]>> = {
  raconter: {
    CP: ["Je raconte dans l'ordre.", "J'enchaîne avec : parce que, alors, ensuite.", "Je dis qui sont les personnages.", "Je parle assez fort pour qu'on m'entende.", "Je regarde mes camarades."],
    CE1: ["Je raconte dans l'ordre, sans oublier d'étape.", "J'enchaîne avec : d'abord, ensuite, donc, enfin.", "Je raconte au passé.", "J'utilise les mots appris.", "Je parle fort et lentement.", "Je regarde mes camarades."],
    CE2: ["Je raconte dans l'ordre et j'explique pourquoi les choses arrivent.", "Je varie les connecteurs.", "Je raconte au passé, sans changer de temps.", "J'utilise des mots précis.", "J'évite les « euh » et les mots familiers.", "Je garde l'attention de mon public."],
  },
  expose: {
    CP: ["Je dis de quoi je vais parler.", "Je montre mon objet ou mon image.", "Je parle assez fort.", "Je regarde mes camarades.", "Je réponds à une question."],
    CE1: ["Je présente mon sujet au début.", "Je suis l'ordre de mon plan : d'abord, ensuite, enfin.", "J'utilise les mots précis appris.", "Je parle fort et lentement.", "Je regarde le public.", "Je conclus : pour terminer…"],
    CE2: ["Je présente mon sujet et mon plan.", "Je m'appuie sur mon support sans le lire.", "J'explique avec des mots précis et des exemples.", "Je varie les connecteurs : donc, par conséquent, pour conclure.", "J'intéresse mon public : une image, une question, un objet.", "Je réponds aux questions."],
  },
  poeme: {
    CP: ["Je connais mon poème par cœur.", "J'articule bien chaque mot.", "Je parle assez fort.", "Je fais les pauses.", "Je regarde mon public."],
    CE1: ["Je connais mon poème par cœur.", "J'articule et je fais les liaisons.", "Je fais les pauses à la fin des vers et aux points.", "Mon ton va avec le poème.", "Je regarde mon public."],
    CE2: ["Je connais mon poème par cœur.", "J'articule, je fais les liaisons.", "Je respecte le rythme des vers et la ponctuation.", "Ma voix fait vivre les images du poème.", "Je regarde mon public et je capte son attention."],
  },
  debat: {
    CP: ["J'attends la fin d'une prise de parole pour parler.", "Je demande la parole.", "Je parle du sujet de l'échange.", "Je donne mon avis : je pense que…", "J'écoute les autres."],
    CE1: ["J'attends mon tour et je respecte ce que dit l'autre.", "Je dis si je suis d'accord ou non, et pourquoi.", "Je reste dans le sujet.", "J'utilise les expressions de la classe.", "J'écoute jusqu'au bout."],
    CE2: ["Je reprends ce qu'a dit un camarade avant de répondre.", "Je justifie mon avis.", "Je fais avancer l'échange.", "J'utilise les expressions de la classe.", "Je parle sans couper la parole."],
  },
};

/** Les expressions pour prendre la parole ; celles du programme d'abord. */
export const EXPRESSIONS: Record<Classe, string[]> = {
  CP: ["Je souhaite prendre la parole pour…", "Je suis d'accord…", "Je ne suis pas d'accord parce que…", "Je pense que…", "Je voudrais ajouter…", "Je n'ai pas compris…"],
  CE1: ["Je ne suis pas d'accord avec…", "Je ne partage pas l'avis de…", "Je souhaite prendre la parole pour…", "Je suis d'accord avec…, parce que…", "À mon avis…", "Je voudrais ajouter que…"],
  CE2: ["Pour compléter ce qu'a dit…", "Je souhaite revenir sur ce qu'a dit…", "Pour reprendre les propos de…", "Je ne partage pas l'avis de…, parce que…", "Je suis d'accord avec…, et j'ajoute que…", "Pour résumer ce qui a été dit…"],
};

/** Les rôles d'un échange organisé. */
export const ROLES: { role: string; quoi: string }[] = [
  { role: "Le président de séance", quoi: "Il donne la parole, dans l'ordre des mains levées, et rappelle le sujet." },
  { role: "Le gardien du temps", quoi: "Il surveille la durée et prévient quand il reste deux minutes." },
  { role: "Le reformulateur", quoi: "Il redit en une phrase ce qui vient d'être dit, avant qu'on réponde." },
  { role: "L'observateur de la parole", quoi: "Il note qui a parlé, et aide ceux qui n'ont pas encore parlé." },
  { role: "Le secrétaire", quoi: "Il note les idées importantes et les lit à la fin." },
];

/** Une même idée dite de trois façons : familier, courant, soutenu. Au CP, « rigoler » et « rire ». */
export const REGISTRES: [string, string, string][] = [
  ["On rigole bien !", "On rit bien !", "Nous nous amusons beaucoup."],
  ["J'ai la trouille.", "J'ai peur.", "Je suis effrayé."],
  ["Il est sympa, ton pote.", "Il est gentil, ton ami.", "Votre ami est fort aimable."],
  ["File-moi ton crayon.", "Donne-moi ton crayon, s'il te plaît.", "Pourriez-vous me prêter votre crayon, je vous prie ?"],
  ["T'as pas vu mon ballon ?", "Tu n'as pas vu mon ballon ?", "N'auriez-vous pas vu mon ballon ?"],
  ["C'est trop chouette !", "C'est très bien !", "C'est remarquable."],
  ["Ma bagnole est en panne.", "Ma voiture est en panne.", "Mon automobile est en panne."],
  ["Je bouffe une pomme.", "Je mange une pomme.", "Je déguste une pomme."],
];

/** Les jeux de rôles : qui parle, à qui, de quoi. */
export const SITUATIONS: { qui: string; aQui: string; quoi: string; registre: "familier" | "courant" | "soutenu" }[] = [
  { qui: "Toi", aQui: "un camarade, dans la cour", quoi: "Tu lui demandes de jouer avec toi.", registre: "familier" },
  { qui: "Toi", aQui: "la directrice de l'école", quoi: "Tu lui demandes la permission d'afficher une affiche.", registre: "soutenu" },
  { qui: "Toi", aQui: "un visiteur que tu ne connais pas", quoi: "Tu l'accueilles dans la classe et tu lui présentes ce que vous faites.", registre: "soutenu" },
  { qui: "Toi", aQui: "ta grand-mère, au téléphone", quoi: "Tu la remercies pour un cadeau.", registre: "courant" },
  { qui: "Toi", aQui: "un plus petit, en maternelle", quoi: "Tu lui expliques comment jouer à la marelle.", registre: "courant" },
  { qui: "Toi", aQui: "une passante, dans la rue", quoi: "Tu lui demandes où se trouve la bibliothèque.", registre: "soutenu" },
  { qui: "Toi", aQui: "ton meilleur ami", quoi: "Tu lui racontes ton week-end.", registre: "familier" },
  { qui: "Toi", aQui: "le boulanger", quoi: "Tu achètes une baguette et deux croissants.", registre: "courant" },
];

/** Des poèmes à apprendre, écrits pour Maitrize ; au CE2, celui du texte à comprendre. */
export const POEMES: Record<Classe, { titre: string; vers: string[] }> = {
  CP: { titre: "Mon chat", vers: ["Mon chat est tout gris,", "Il dort sur mon lit.", "Il ronronne doucement,", "Il ouvre un œil de temps en temps.", "Quand la souris passe,", "Hop ! Il saute et la chasse."] },
  CE1: { titre: "Le vent", vers: ["Le vent souffle sur la colline,", "Il fait danser les capucines,", "Il emporte les chapeaux,", "Il fait voler les oiseaux.", "Le soir, il se fait tout petit,", "Et dans les arbres, il s'endort sans bruit."] },
  CE2: { titre: "Il pleut sur la ville", vers: texteDe("poeme-pluie")!.lignes },
};

/** Les mots pour enchaîner : ceux du programme, classe par classe. */
export const CONNECTEURS_ORAUX: Record<Classe, string[]> = {
  CP: ["d'abord", "parce que", "alors", "ensuite", "à la fin"],
  CE1: ["d'abord", "pour commencer", "ensuite", "donc", "par conséquent", "enfin", "pour terminer", "pour conclure"],
  CE2: ["au début", "puis", "soudain", "alors", "parce que", "donc", "pourtant", "finalement", "pour conclure"],
};
/** Des mots imposés pour le rappel de récit à tour de rôle (guide CP, p. 105). */
export const MOTS_IMPOSES = ["soudain", "la forêt", "un cri", "le lendemain", "heureusement", "un secret", "la nuit", "un ami", "la peur", "enfin", "le chemin", "une surprise"];

// ── Les feuilles ──────────────────────────────────────────────────────────

function feuilleGrille(r: ReglagesOral): string {
  const g = GENRES.find((x) => x.id === r.genre)!;
  const crit = CRITERES[r.genre][r.classe];
  const colonnes = r.classe === "CP" ? ["Moi", "Le professeur"] : ["Moi", "Un camarade", "Le professeur"];
  const lignesGrille = crit.map((c) => `<tr><td>${escapeHtml(c)}</td>${colonnes.map(() => '<td class="ol-centre"><span class="ol-case"></span></td>').join("")}</tr>`).join("");
  return `<div class="page">${titre(`${g.nom} — ma grille`)}${TETE}${regle("Avant de parler, je relis les critères. Après, je coche ce que j'ai réussi ; un camarade et le professeur aussi. Je compare avec ma première production.")}
    <table class="ol-tableau"><tr><th>Ce qu'on écoute</th>${colonnes.map((c) => `<th class="ol-centre">${c}</th>`).join("")}</tr>${lignesGrille}</table>
    <div class="ol-champ"><b>Ce que j'ai amélioré depuis la première fois</b>${lignes(2)}</div><div class="ol-champ"><b>Mon prochain défi</b>${lignes(1)}</div></div>`;
}

function feuilleRaconter(r: ReglagesOral, graine: number): string {
  const carte = ["Qui ?", "Où ?", "Quand ?", "Quel est le problème ?", "Qu'arrive-t-il ?", "Quelle est la solution ?"];
  const mots = melanger(hasard(graine), MOTS_IMPOSES).slice(0, 6);
  return `<div class="page">${titre("Raconter une histoire")}${TETE}${regle("Avant de raconter, je prépare la carte du récit en quelques mots. Je raconte comme pour quelqu'un qui ne connaît pas l'histoire. — Guide CP, p. 52-53.")}
    <div class="ol-carte">${carte.map((c) => `<div class="ol-bulle"><b>${c}</b>${lignes(1)}</div>`).join("")}</div>
    <div class="ol-sous-titre">Les mots pour enchaîner</div><div class="ol-mots">${CONNECTEURS_ORAUX[r.classe].map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>
    <div class="ol-sous-titre">Raconter à tour de rôle, avec un mot imposé (à découper)</div><div class="ol-cartes">${mots.map((m) => `<div class="ol-carte-mot">${escapeHtml(m)}</div>`).join("")}</div></div>`;
}

function feuillePoeme(r: ReglagesOral): string {
  const p = POEMES[r.classe];
  let n = 0;
  const vers = p.vers.map((v) => (v.trim() ? `<tr><td class="ol-num">${++n}</td><td class="ol-vers">${escapeHtml(v)}</td></tr>` : '<tr class="ol-strophe"><td></td><td></td></tr>')).join("");
  const etapes = ["Je lis le poème à voix haute, en entier.", "Je l'apprends vers par vers, strophe par strophe : je lis, je cache, je redis.", "Je me fais des images dans la tête pour chaque vers.", `Je code les pauses / ${r.classe === "CP" ? "" : "et les liaisons ‿ "}au crayon.`, "Je le dis à quelqu'un, en le regardant."];
  // Un long poème : des vers plus serrés et un cadre plus petit, pour tenir sur la page.
  const long = n > 10 ? " ol-long" : "";
  return `<div class="page">${titre(`${p.titre} — le poème à dire`)}${TETE}
    <table class="ol-poeme${long}">${vers}</table>
    <div class="ol-sous-titre">Pour l'apprendre</div><ol class="ol-etapes">${etapes.map((e) => `<li>${escapeHtml(e)}</li>`).join("")}</ol>
    <div class="ol-sous-titre">J'illustre mon poème</div><div class="ol-dessin${long}"></div></div>`;
}

function feuillePlanExpose(r: ReglagesOral): string {
  const parties = r.classe === "CP" ? ["Ce que je vais montrer", "Ce que je veux dire", "Une question pour la classe"] : ["Première partie", "Deuxième partie", "Troisième partie"];
  return `<div class="page">${titre("Préparer un exposé")}${TETE}${regle("Je note des mots-clés, pas des phrases : je dois parler, pas lire. Je m'entraîne à voix haute, avec mon support.")}
    <div class="ol-champ"><b>Mon sujet</b>${lignes(1)}</div>
    <div class="ol-champ"><b>Pour commencer</b> (« Je vais vous parler de… »)${lignes(1)}</div>
    ${parties.map((x) => `<div class="ol-fiche"><b>${escapeHtml(x)}</b> — mes mots-clés${lignes(2)}</div>`).join("")}
    <div class="ol-champ"><b>Pour conclure</b> (« Pour terminer… », « Ce que je retiens… »)${lignes(1)}</div>
    <div class="ol-champ"><b>Mon support</b> : <span class="ol-case"></span> une affiche <span class="ol-case"></span> un objet <span class="ol-case"></span> des images <span class="ol-case"></span> un écran</div>
    <div class="ol-champ"><b>Les questions qu'on pourrait me poser</b>${lignes(2)}</div></div>`;
}

function feuilleExpressions(r: ReglagesOral): string {
  const liste = r.classe === "CP" ? EXPRESSIONS.CP : r.classe === "CE1" ? [...EXPRESSIONS.CE1, ...EXPRESSIONS.CP.slice(0, 2)] : [...EXPRESSIONS.CE2, ...EXPRESSIONS.CE1.slice(0, 2)];
  return `<div class="page">${titre("Je prends la parole")}${TETE}${regle("Découpe les cartes. Pendant l'échange, pose devant toi la carte de ce que tu veux dire, puis lève la main.")}
    <div class="ol-cartes ol-grandes">${liste.map((e) => `<div class="ol-carte-mot">${escapeHtml(e)}</div>`).join("")}</div></div>`;
}

function feuilleRoles(): string {
  return `<div class="page">${titre("Les rôles de l'échange")}${TETE}${regle("Découpe les cartes. Chacun son rôle, et les rôles changent à chaque échange.")}
    <div class="ol-cartes ol-roles">${ROLES.map((x) => `<div class="ol-carte-role"><b>${escapeHtml(x.role)}</b><div>${escapeHtml(x.quoi)}</div></div>`).join("")}</div></div>`;
}

function feuilleRegistres(r: ReglagesOral, graine: number): string {
  const alea = hasard(graine);
  if (r.classe === "CP") {
    const paires = melanger(alea, REGISTRES).slice(0, 5);
    const items = melanger(alea, paires.flatMap(([f, c]) => [{ t: f, k: "cour" }, { t: c, k: "classe" }]));
    return `<div class="page">${titre("Dans la cour, en classe")}${TETE}${regle("On ne parle pas de la même manière en classe et dans la cour. Pour chaque phrase, coche où on la dit plutôt.")}
      <table class="ol-tableau"><tr><th>La phrase</th><th class="ol-centre">Dans la cour</th><th class="ol-centre">En classe</th></tr>${items.map((x) => `<tr><td>${escapeHtml(x.t)}</td><td class="ol-centre"><span class="ol-case"></span></td><td class="ol-centre"><span class="ol-case"></span></td></tr>`).join("")}</table></div>
      <div class="page corrige">${titre("Dans la cour, en classe — corrigé")}<div class="ol-corrige">${items.map((x) => `<div>${escapeHtml(x.t)} — ${x.k === "cour" ? "plutôt dans la cour" : "en classe"}</div>`).join("")}</div></div>`;
  }
  const triplets = melanger(alea, REGISTRES).slice(0, 4);
  const items = melanger(alea, triplets.flatMap(([f, c, s]) => [{ t: f, k: "familier" }, { t: c, k: "courant" }, { t: s, k: "soutenu" }]));
  const transformer = melanger(alea, REGISTRES.filter((x) => !triplets.includes(x))).slice(0, 2);
  return `<div class="page">${titre("Familier, courant, soutenu")}${TETE}${regle("On choisit sa façon de parler selon la personne à qui l'on parle et la situation. Coche le registre de chaque phrase.")}
    <table class="ol-tableau"><tr><th>La phrase</th><th class="ol-centre">Familier</th><th class="ol-centre">Courant</th><th class="ol-centre">Soutenu</th></tr>${items.map((x) => `<tr><td>${escapeHtml(x.t)}</td><td class="ol-centre"><span class="ol-case"></span></td><td class="ol-centre"><span class="ol-case"></span></td><td class="ol-centre"><span class="ol-case"></span></td></tr>`).join("")}</table>
    <div class="ol-sous-titre">Dis-le en registre courant, puis soutenu</div>${transformer.map(([f]) => `<div class="ol-champ">« ${escapeHtml(f)} »${lignes(2)}</div>`).join("")}</div>
    <div class="page corrige">${titre("Familier, courant, soutenu — corrigé")}<div class="ol-corrige">${items.map((x) => `<div>${escapeHtml(x.t)} — ${x.k}</div>`).join("")}${transformer.map(([f, c, s]) => `<div>« ${escapeHtml(f)} » → « ${escapeHtml(c)} » → « ${escapeHtml(s)} »</div>`).join("")}</div></div>`;
}

function feuilleSituations(r: ReglagesOral, graine: number): string {
  const choisies = melanger(hasard(graine), SITUATIONS).slice(0, 6);
  return `<div class="page">${titre("Les jeux de rôles")}${TETE}${regle(`Découpe les cartes. À deux, tirez une carte et jouez la scène. Ceux qui regardent disent si la façon de parler convient${r.classe === "CP" ? "." : " : familier, courant ou soutenu ?"}`)}
    <div class="ol-cartes ol-roles">${choisies.map((x) => `<div class="ol-carte-role"><b>Tu parles à ${escapeHtml(x.aQui)}.</b><div>${escapeHtml(x.quoi)}</div></div>`).join("")}</div></div>
    <div class="page corrige">${titre("Les jeux de rôles — pour l'adulte")}<div class="ol-corrige">${choisies.map((x) => `<div>${escapeHtml(x.aQui)} : ${escapeHtml(x.quoi)} — registre attendu : <b>${x.registre}</b></div>`).join("")}</div></div>`;
}

export function htmlOral(r: ReglagesOral, graine: number): string {
  const corps = r.exercice === "grille" ? feuilleGrille(r)
    : r.exercice === "raconter" ? feuilleRaconter(r, graine)
      : r.exercice === "poeme" ? feuillePoeme(r)
        : r.exercice === "planExpose" ? feuillePlanExpose(r)
          : r.exercice === "expressions" ? feuilleExpressions(r)
            : r.exercice === "roles" ? feuilleRoles()
              : r.exercice === "registres" ? feuilleRegistres(r, graine)
                : feuilleSituations(r, graine);
  return feuille(corps, "ol");
}

export const STYLE_ORAL = `
  .feuille.ol .ol-ligne { border-bottom: 1px solid #9aa0b4; height: 9mm; }
  .feuille.ol .ol-tableau { width: 100%; border-collapse: collapse; font-size: 14px; margin: 2mm 0 5mm; }
  .feuille.ol .ol-tableau th, .feuille.ol .ol-tableau td { border: 1px solid #1c2233; padding: 2.5mm 3mm; text-align: left; vertical-align: middle; }
  .feuille.ol .ol-tableau th { background: #f7f8fc; font-size: 12px; }
  .feuille.ol .ol-tableau td { height: 11mm; }
  .feuille.ol .ol-centre { text-align: center !important; width: 24mm; }
  .feuille.ol .ol-case { display: inline-block; width: 5.5mm; height: 5.5mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -1.5mm; margin: 0 1mm; }
  .feuille.ol .ol-champ { font-size: 13.5px; margin: 0 0 3mm; line-height: 1.9; }
  .feuille.ol .ol-sous-titre { font-size: 14px; font-weight: 800; margin: 5mm 0 2mm; }
  .feuille.ol .ol-carte { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 6mm; }
  .feuille.ol .ol-bulle { border: 1.5px solid #c4c9d6; border-radius: 3mm; padding: 2mm 3mm 0; font-size: 13.5px; }
  .feuille.ol .ol-mots { display: block; font-size: 15px; line-height: 2.3; }
  .feuille.ol .ol-mots span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 3mm; margin: 0 2mm 1.5mm 0; line-height: 1.7; }
  .feuille.ol .ol-cartes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin-top: 2mm; }
  .feuille.ol .ol-cartes.ol-grandes { grid-template-columns: repeat(2, 1fr); }
  .feuille.ol .ol-cartes.ol-roles { grid-template-columns: repeat(2, 1fr); }
  .feuille.ol .ol-carte-mot { border: 1px dashed #9aa0b4; height: 26mm; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 17px; font-weight: 700; padding: 0 3mm; }
  .feuille.ol .ol-grandes .ol-carte-mot { height: 36mm; font-size: 19px; }
  .feuille.ol .ol-carte-role { border: 1px dashed #9aa0b4; min-height: 42mm; padding: 4mm; font-size: 14px; line-height: 1.5; }
  .feuille.ol .ol-carte-role b { display: block; font-size: 16px; margin-bottom: 2mm; }
  .feuille.ol .ol-poeme { border-collapse: collapse; margin: 2mm 0 4mm; }
  .feuille.ol .ol-poeme td { border: none; padding: 0; vertical-align: baseline; }
  .feuille.ol .ol-num { width: 9mm; font-size: 10px; color: #687087; text-align: right; padding-right: 3mm !important; }
  .feuille.ol .ol-vers { font-size: 19px; line-height: 1.9; }
  .feuille.ol .ol-strophe td { height: 3mm; }
  .feuille.ol .ol-etapes { font-size: 13.5px; line-height: 1.7; margin: 0 0 2mm 5mm; padding: 0; }
  .feuille.ol .ol-dessin { border: 1.5px dashed #9aa0b4; border-radius: 3mm; height: 55mm; }
  .feuille.ol .ol-dessin.ol-long { height: 32mm; }
  .feuille.ol .ol-long .ol-vers { font-size: 17px; line-height: 1.7; }
  .feuille.ol .ol-fiche { border: 1px solid #c4c9d6; border-radius: 2mm; padding: 2mm 3mm 0; margin: 0 0 3mm; font-size: 13.5px; }
  .feuille.ol .ol-corrige { font-size: 13.5px; line-height: 1.8; }
`;
