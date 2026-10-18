// L'oral au cours moyen : écouter pour comprendre, dire pour être compris,
// participer à des échanges.
//
// Programme de français du cycle 3 (2025) : une écoute active orientée par
// un but ; comprendre un message d'un tiers ou d'un média — une interview,
// un reportage — ; une production orale claire et organisée pour raconter,
// expliquer, argumenter, justifier, partager des connaissances ; la lecture
// expressive, la récitation ; l'oral comme outil réflexif ; prendre la
// parole selon les codes, construire une analyse collective, adapter son
// discours, porter un regard critique sur l'oral produit. Les exemples de
// réussite donnent les manières de dire, reprises ici : « La personne
// explique que… » ; « Ce tableau montre que… » ; « J'ai commencé par…
// puis… enfin… ; je me suis trompé sur… » ; « Je (ne) suis (pas) d'accord,
// car… ; j'ajouterais que… » ; « Pense à annoncer le thème de ton exposé.
// Articule plus clairement. »

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { texteDe } from "./textesDeComprehension";

export type ExerciceOralCM = "ecoute-media" | "expose" | "expliquer-document" | "procedure" | "debat" | "recitation" | "grille";

export const EXERCICES_ORAL_CM: { id: ExerciceOralCM; libelle: string }[] = [
  { id: "ecoute-media", libelle: "La fiche d'écoute : une interview, un reportage" },
  { id: "expose", libelle: "Préparer un exposé" },
  { id: "expliquer-document", libelle: "Expliquer un tableau, un schéma, à l'oral" },
  { id: "procedure", libelle: "Expliquer comment j'ai fait" },
  { id: "debat", libelle: "Le débat réglé" },
  { id: "recitation", libelle: "Apprendre et réciter un poème" },
  { id: "grille", libelle: "La grille d'écoute d'un oral" },
];

export interface ReglagesOralCM { classe: "CM1" | "CM2"; exercice: ExerciceOralCM; titre?: string }
export const REGLAGES_ORAL_CM: ReglagesOralCM = { classe: "CM1", exercice: "ecoute-media" };

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;
const SOURCE = '<span class="reference">Programme de français du cycle 3, 2025.</span>';
const lignes = (n: number) => '<div class="or-ligne"></div>'.repeat(n);
const cadre = (t: string, corps: string) => `<div class="or-cadre"><div class="or-cadre-titre">${escapeHtml(t)}</div>${corps}</div>`;
const formules = (t: string[]) => `<div class="or-formules">${t.map((x) => `<span>${escapeHtml(x)}</span>`).join("")}</div>`;
const caseACocher = '<span class="or-case"></span>';

function feuilleEcouteMedia(r: ReglagesOralCM): string {
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("J'écoute une interview, un reportage")}${TETE}
    ${regle(`J'écoute le document une première fois, sans écrire. À la deuxième écoute, je prends des notes : des mots, pas des phrases. Puis je complète la fiche et je redis l'essentiel à mon voisin. ${SOURCE}`)}
    <div class="or-deux">${cadre("C'est", ["une interview", "un reportage", "une émission de radio", "une vidéo"].map((x) => `<div>${caseACocher} ${x}</div>`).join(""))}${cadre("Qui parle ? À qui ?", lignes(3))}</div>
    ${cadre("De quoi parle-t-on ? Où ? Quand ?", lignes(2))}
    ${cadre("Les trois informations essentielles", lignes(3))}
    ${cadre(cm2 ? "Ce que disent les personnes" : "Ce que dit la personne", `${formules(cm2 ? ["La personne A dit que…", "La personne B n'est pas d'accord, parce que…", "La personne A demande…", "la personne B répond que…"] : ["La personne dit : « … »", "La personne explique que…", "La personne demande si…"])}${lignes(3)}`)}
    ${cadre("Ce que je n'ai pas compris", `${formules(["Je n'ai pas compris qui…", "quand…", "où…", "pourquoi…"])}${lignes(1)}`)}
    ${cadre("Ma réaction", `${formules(["Ce document me fait rire, me fait peur… parce que…", "Je suis surpris, étonné… à cause de…", "J'ai appris que…"])}${lignes(2)}`)}</div>`;
}

function feuilleExpose(r: ReglagesOralCM): string {
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("Je prépare mon exposé")}${TETE}
    ${regle(`Je choisis mon sujet et je cherche des informations. Je prépare des notes : des phrases clés et des mots pour relier mes idées, pas tout le texte. Je m'entraîne à voix haute${cm2 ? ", je m'enregistre," : ""} puis je présente à la classe. ${SOURCE}`)}
    ${cadre("Mon sujet", lignes(1))}
    ${cadre("Mon introduction : j'annonce le thème et mon plan", lignes(2))}
    <table class="or-tableau"><tr><th>Partie</th><th>Mes phrases clés</th><th>Mon exemple, mon image</th></tr>${[1, 2, 3].map((k) => `<tr><td class="or-centre">${k}</td><td></td><td></td></tr>`).join("")}</table>
    ${cadre("Ma conclusion : ce qu'il faut retenir, une question au public", lignes(2))}
    ${cadre("Mes mots pour relier", formules(["D'abord…", "Ensuite…", "De plus…", "Par exemple…", "C'est pourquoi…", "Pourtant…", "Pour conclure…"]))}
    ${cadre("Les mots difficiles que j'expliquerai", lignes(1))}
    ${cm2 ? cadre("Une ou deux phrases que je dirai sans les avoir écrites", lignes(1)) : ""}</div>`;
}

/** Un tableau à expliquer à l'oral, avec les manières de dire des exemples de réussite. */
function feuilleExpliquerDocument(): string {
  return `<div class="page">${titre("J'explique un tableau à l'oral")}${TETE}
    ${regle(`J'observe le tableau : son titre, ses lignes, ses colonnes. Je prépare ce que je vais dire, avec les mots du tableau et les formules. Puis j'explique le tableau à mon groupe, sans lire mes notes. ${SOURCE}`)}
    <div class="or-titre-doc">Le moyen de transport des élèves de l'école, selon la distance</div>
    <table class="or-tableau or-doc"><tr><th></th><th>À pied</th><th>À vélo</th><th>En voiture</th><th>En bus</th></tr>
      <tr><th>Moins de 1 km</th><td>38</td><td>6</td><td>9</td><td>0</td></tr><tr><th>De 1 à 3 km</th><td>7</td><td>12</td><td>21</td><td>8</td></tr><tr><th>Plus de 3 km</th><td>0</td><td>2</td><td>18</td><td>16</td></tr></table>
    <div class="or-source-doc">Enquête menée dans une école ; données imaginées pour l'exercice.</div>
    ${cadre("Les mots du tableau", formules(["le titre", "la ligne", "la colonne", "la case", "le nombre d'élèves", "la distance", "la plupart", "presque aucun"]))}
    ${cadre("Mes formules", formules(["Ce tableau montre que…", "Dans la ligne…, on lit que…", "Quand la distance augmente, …", "La plupart des élèves qui habitent…", "Au contraire, …"]))}
    ${cadre("Ce que je vais dire : trois phrases", lignes(4))}</div>
    <div class="page corrige">${titre("J'explique un tableau — pour l'adulte")}<div class="or-corrige">
      <p>Ce que le tableau montre : quand l'école est à moins de 1 km, la plupart des élèves viennent à pied (38 sur 53) ; de 1 à 3 km, la voiture domine (21 sur 48), le vélo progresse (12) ; à plus de 3 km, presque tous viennent en voiture (18) ou en bus (16), personne à pied. Quand la distance augmente, la marche disparaît et le bus apparaît.</p>
      <p>Ce qu'on écoute : le titre annoncé, les lignes et les colonnes nommées, une comparaison, une conclusion.</p></div></div>`;
}

function feuilleProcedure(r: ReglagesOralCM): string {
  const cm2 = r.classe === "CM2";
  return `<div class="page">${titre("J'explique comment j'ai fait")}${TETE}
    ${regle(`Après un problème, un exercice, une expérience, je prépare ce que je vais dire : comment j'ai fait, dans l'ordre ; si je me suis trompé, où et pourquoi. Puis je l'explique à mon groupe. ${SOURCE}`)}
    ${cadre("Ce que je devais faire", lignes(2))}
    ${cadre("Comment j'ai fait, dans l'ordre", `${formules(["J'ai commencé par…", "puis…", "ensuite…", "enfin…", "j'ai essayé…", "j'ai repris le modèle…"])}${lignes(4)}`)}
    ${cadre("Si je me suis trompé", `${formules(cm2 ? ["Je me suis trompé sur…", "je n'étais pas certain que…", "je croyais que…", "je n'ai pas compris…"] : ["Si je me suis trompé, c'est peut-être que…", "J'ai procédé de cette manière parce que…"])}${lignes(3)}`)}
    ${cadre("Ce que je ferai la prochaine fois", lignes(2))}</div>`;
}

/** Des questions à débattre, au cours moyen : plusieurs tiennent aux textes lus en classe. */
const QUESTIONS_DE_DEBAT: string[] = [
  "Vaut-il mieux gagner, ou aider un camarade qui est tombé ?",
  "Faut-il garder les vieilles choses, ou les remplacer par des neuves ?",
  "Les animaux sont-ils mieux dans un zoo ou dans la nature ?",
  "Faut-il toujours dire la vérité, même quand elle fait de la peine ?",
  "Les écrans sont-ils utiles pour apprendre ?",
  "Doit-on toujours respecter les règles d'un jeu, même quand personne ne regarde ?",
];

function feuilleDebat(r: ReglagesOralCM, graine: number): string {
  const cm2 = r.classe === "CM2";
  const question = melanger(hasard(graine), QUESTIONS_DE_DEBAT)[0];
  const roles: [string, string][] = [["Le président de séance", "donne la parole, dans l'ordre des mains levées ; relance le débat."], ["Le gardien du temps", "veille au temps de parole de chacun."],
    ["Le secrétaire", "note les arguments de chaque avis, et le bilan."], ["Les débatteurs", "donnent leur avis, le justifient, répondent aux autres."], ["Les observateurs", "écoutent avec la grille et donnent un conseil."]];
  return `<div class="page">${titre("Le débat réglé")}${TETE}
    ${regle(`Je prépare mon avis et mes arguments au brouillon. Pendant le débat, je lève la main, j'attends mon tour, je ne coupe pas la parole ; je réponds aux arguments des autres. À la fin, nous faisons le bilan. ${SOURCE}`)}
    <div class="or-question">${escapeHtml(question)}</div>
    ${cadre("Mon avis, avant le débat", lignes(1))}
    ${cadre("Mes arguments, et un exemple pour chacun", lignes(4))}
    ${cadre("Mes formules", formules(cm2 ? ["Je suis d'accord avec…, car…", "Je ne suis pas d'accord, mais…", "Pourtant…", "J'ajouterais que…", "Je comprends ce que tu veux dire, mais…", "Je te donne un autre exemple…"]
      : ["Je pense que…, parce que…", "Je suis d'accord avec…", "Je ne suis pas d'accord, car…", "J'ajoute que…", "Par exemple…"]))}
    <table class="or-tableau or-roles"><tr><th>Les rôles</th><th>Ce qu'il fait</th></tr>${roles.map(([n, q]) => `<tr><td>${escapeHtml(n)}</td><td>${escapeHtml(q)}</td></tr>`).join("")}</table>
    ${cadre("Mon avis, après le débat : a-t-il changé ? Pourquoi ?", lignes(2))}</div>`;
}

function feuilleRecitation(r: ReglagesOralCM): string {
  const t = texteDe(r.classe === "CM1" ? "pommier-cm1" : "demain-cm2")!;
  const etapes = ["Je lis le poème en entier, et je cherche les mots que je ne comprends pas.", "Je dis ce que le poème raconte et ce qu'il me fait ressentir.",
    "J'apprends une strophe à la fois : je lis, je cache, je redis, je vérifie.", "Je me récite tout le poème, puis je le récite à quelqu'un.", "Je prépare la façon de le dire : les pauses, le ton, les mots que je fais ressortir."];
  return `<div class="page">${titre(`J'apprends et je récite : ${t.titre}`)}${TETE}
    ${regle(`J'apprends le poème étape par étape, sur plusieurs jours. Puis je le récite devant la classe, en regardant mon public, avec le ton qui convient. ${SOURCE}`)}
    <div class="or-poeme">${t.lignes.map((l) => (l.trim() ? `<div>${escapeHtml(l)}</div>` : '<div class="or-strophe"></div>')).join("")}</div>
    ${t.source ? `<div class="or-source-doc">${escapeHtml(t.source)}</div>` : ""}
    <table class="or-tableau"><tr><th>Mes étapes</th><th>Fait</th></tr>${etapes.map((e) => `<tr><td>${escapeHtml(e)}</td><td class="or-centre">${caseACocher}</td></tr>`).join("")}</table></div>`;
}

/** Les critères de la grille, d'après les exemples de réussite. */
export const CRITERES_ORAL: Record<"CM1" | "CM2", string[]> = {
  CM1: ["On m'entend : j'articule, ma voix est assez forte.", "Je ne parle ni trop vite ni trop lentement.", "Je regarde mon public.", "J'annonce de quoi je vais parler.",
    "Mes idées sont dans l'ordre.", "J'emploie des mots précis et des phrases correctes.", "Je donne un ou deux exemples.", "Je réponds aux questions du public."],
  CM2: ["Ma voix et mon débit s'adaptent à ce que je fais : expliquer, raconter, réciter.", "Je regarde mon public et j'attire son attention.", "J'annonce le thème et le plan.",
    "Mes parties s'enchaînent avec des connecteurs.", "Je parle à partir de mes notes, sans les lire.", "J'emploie un vocabulaire précis et des phrases correctes.",
    "Je justifie avec des exemples, même non préparés.", "Je tiens compte des questions et des avis du public."],
};

function feuilleGrille(r: ReglagesOralCM): string {
  const lignesGrille = CRITERES_ORAL[r.classe].map((c) => `<tr><td>${escapeHtml(c)}</td><td class="or-centre">${caseACocher}</td><td class="or-centre">${caseACocher}</td></tr>`).join("");
  return `<div class="page">${titre("J'écoute un oral, je donne un conseil")}
    <div class="sous">L'orateur : ........................................ L'auditeur : ........................................ Date : ..................</div>
    ${regle(`J'écoute l'oral — ou son enregistrement — avec la grille. Je coche ce qui est réussi. Je compare avec l'oral précédent, puis je donne un conseil. ${SOURCE}`)}
    <table class="or-tableau or-grille"><tr><th>Ce qu'on écoute</th><th>Réussi</th><th>À travailler</th></tr>${lignesGrille}</table>
    ${cadre("Ce qui s'est amélioré depuis le dernier oral", lignes(2))}
    ${cadre("Mon conseil", `${formules(["Pense à annoncer le thème de ton exposé.", "Articule plus clairement.", "Regarde ton public.", "Donne un exemple."])}${lignes(2)}`)}</div>`;
}

export function htmlOralCM(r: ReglagesOralCM, graine: number): string {
  const corps = r.exercice === "ecoute-media" ? feuilleEcouteMedia(r)
    : r.exercice === "expose" ? feuilleExpose(r)
      : r.exercice === "expliquer-document" ? feuilleExpliquerDocument()
        : r.exercice === "procedure" ? feuilleProcedure(r)
          : r.exercice === "debat" ? feuilleDebat(r, graine)
            : r.exercice === "recitation" ? feuilleRecitation(r)
              : feuilleGrille(r);
  return feuille(corps, "or");
}

export const STYLE_ORAL_CM = `
  .feuille.or .or-cadre { margin: 0 0 3mm; break-inside: avoid; page-break-inside: avoid; }
  .feuille.or .or-cadre-titre { font-size: 12.5px; font-weight: 700; color: #2c3346; margin-bottom: 0.5mm; }
  .feuille.or .or-ligne { border-bottom: 1px solid #9aa0b4; height: 8.5mm; }
  .feuille.or .or-deux { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; font-size: 12.5px; }
  .feuille.or .or-formules { display: block; margin: 0.5mm 0 1mm; }
  .feuille.or .or-formules span { display: inline-block; font-size: 11.5px; border: 1px solid #c4c9d6; border-radius: 3mm; padding: 0 2mm; margin: 0 1.2mm 1mm 0; line-height: 1.7; color: #2c3346; }
  .feuille.or .or-case { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -0.8mm; }
  .feuille.or .or-tableau { width: 100%; border-collapse: collapse; font-size: 12.5px; margin: 0 0 4mm; }
  .feuille.or .or-tableau th, .feuille.or .or-tableau td { border: 1px solid #1c2233; padding: 2mm; text-align: left; height: 10mm; }
  .feuille.or .or-tableau th { background: #f7f8fc; font-size: 11.5px; }
  .feuille.or .or-doc td { text-align: center; font-size: 13.5px; height: 8mm; }
  .feuille.or .or-centre { text-align: center !important; width: 18mm; }
  .feuille.or .or-titre-doc { font-weight: 800; font-size: 14px; margin: 0 0 2mm; }
  .feuille.or .or-source-doc { font-size: 10.5px; color: #687087; font-style: italic; margin: -2mm 0 3mm; }
  .feuille.or .or-question { font-size: 16px; font-weight: 800; text-align: center; border: 2px solid #1c2233; border-radius: 2mm; padding: 3mm; margin: 0 0 4mm; }
  .feuille.or .or-roles td { height: 8mm; font-size: 12px; }
  .feuille.or .or-poeme { font-size: 15px; line-height: 1.8; margin: 2mm 0 2mm 8mm; }
  .feuille.or .or-strophe { height: 4mm; }
  .feuille.or .or-corrige { font-size: 13px; line-height: 1.6; }
`;
