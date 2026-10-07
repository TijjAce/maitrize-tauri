// Comprendre un texte : lire, revenir au texte, répondre.
//
// Programme de français du cycle 2 (2024), « Comprendre un texte » : dégager
// le sens global, se repérer dans la chaîne anaphorique, comprendre
// l'implicite, élucider le sens des mots inconnus, différencier les types de
// textes, justifier ses réponses par un retour au texte — sur un texte d'une
// dizaine de lignes au CP, d'une quinzaine au CE1, d'une vingtaine au CE2 ;
// « Écouter pour comprendre » à l'oral. Le texte s'imprime sur sa propre
// page, ses lignes numérotées : on le pose à côté des questions et on y
// revient pour prouver. Les textes sont dans textesDeComprehension.ts.

import { escapeHtml } from "./print";
import { feuille } from "./cartesImprimables";
import { hasard, melanger } from "./hasard";
import { TEXTES, ligneDe, lignesNumerotees, textesDeLaClasse, texteDe, type Classe, type Question, type TexteAComprendre, type TypeDeQuestion, type TypeDeTexte } from "./textesDeComprehension";

export type ExerciceComprehension = "questions" | "sensGlobal" | "moments" | "reprises" | "inferences" | "emotions" | "motInconnu" | "typesDeTextes" | "ecoute";

export const EXERCICES_COMPREHENSION: { id: ExerciceComprehension; libelle: string }[] = [
  { id: "questions", libelle: "Lire et répondre en revenant au texte" },
  { id: "sensGlobal", libelle: "Le sens global : le bon résumé" },
  { id: "moments", libelle: "Les moments du récit, dans l'ordre" },
  { id: "reprises", libelle: "Qui est qui ? Les reprises" },
  { id: "inferences", libelle: "Ce qui n'est pas écrit : l'indice, ce que je sais, donc…" },
  { id: "emotions", libelle: "Ce que ressentent les personnages" },
  { id: "motInconnu", libelle: "Le mot inconnu : le sens par le contexte" },
  { id: "typesDeTextes", libelle: "Récit, documentaire, règle ou recette, poème, théâtre" },
  { id: "ecoute", libelle: "Écouter pour comprendre : le texte lu par l'adulte" },
];

export interface ReglagesComprehension {
  exercice: ExerciceComprehension;
  classe: Classe;
  /** Le texte choisi ; vide : un texte de la classe, tiré au sort. */
  texte: string;
  /** Les questions posées : toutes, ou d'un seul type. */
  questions: "toutes" | TypeDeQuestion;
}

export const REGLAGES_COMPREHENSION: ReglagesComprehension = { exercice: "questions", classe: "CP", texte: "", questions: "toutes" };

/** Ce que dit la pastille de chaque question : où chercher la réponse. */
export const TYPES_DE_QUESTIONS: Record<TypeDeQuestion, { pastille: string; aide: string }> = {
  "littérale": { pastille: "C'est écrit", aide: "La réponse est écrite dans le texte : je la cherche et je la recopie." },
  "inférence": { pastille: "Je réfléchis", aide: "La réponse n'est pas écrite : je cherche des indices dans le texte et je réfléchis avec ce que je sais." },
  "reprise": { pastille: "Qui est-ce ?", aide: "Je relis la phrase et celle d'avant : de qui, de quoi parle-t-on ?" },
  "vocabulaire": { pastille: "Le mot", aide: "Je cherche le sens du mot dans la phrase, avant et après." },
};

/** Le nom de chaque type de texte pour l'élève, et ce qui le fait reconnaître. */
export const TYPES_DE_TEXTES: Record<TypeDeTexte, { nom: string; court: string; indices: string }> = {
  narratif: { nom: "un récit", court: "récit", indices: "des personnages ; une histoire qui se passe, avec un début, des évènements, une fin." },
  informatif: { nom: "un documentaire", court: "documentaire", indices: "il explique, il donne des informations vraies sur un sujet ; pas de personnage qui vit une histoire." },
  prescriptif: { nom: "une recette ou une règle", court: "recette ou règle", indices: "il dit quoi faire : le matériel, des étapes souvent numérotées, des verbes qui donnent des ordres (coupe, verse, mélange)." },
  "poétique": { nom: "un poème", court: "poème", indices: "des vers, des strophes, des rimes ; des images et des comparaisons." },
  "théâtral": { nom: "du théâtre", court: "théâtre", indices: "le nom du personnage devant ce qu'il dit, des tirets ; des indications entre parenthèses (les didascalies)." },
};

const TETE = '<div class="sous">Prénom : ........................................ Date : ........................</div>';
const titre = (t: string) => `<div class="titre">${escapeHtml(t)}</div>`;
const regle = (t: string) => `<div class="regle">${t}</div>`;

/** Les textes d'un exercice : celui de l'enseignant, sinon un texte de la classe ; pour les moments, un récit. */
export function texteDeLExercice(r: ReglagesComprehension, graine: number): TexteAComprendre {
  const choisi = r.texte ? texteDe(r.texte) : undefined;
  if (choisi && (r.exercice !== "moments" || choisi.moments)) return choisi;
  const candidats = textesDeLaClasse(r.classe).filter((t) => r.exercice !== "moments" || t.moments);
  return candidats[Math.floor(hasard(graine)() * candidats.length)];
}

/** La première occurrence du mot dans la ligne, comme mot entier : d'abord avec sa casse, sinon sans. */
function occurrence(ligne: string, mot: string): [number, number] | null {
  const echappe = mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fin = /['’]$/.test(mot) ? "" : "(?![\\p{L}])";
  for (const drapeaux of ["u", "iu"]) {
    const m = new RegExp(`(?<![\\p{L}])${echappe}${fin}`, drapeaux).exec(ligne);
    if (m) return [m.index, m.index + m[0].length];
  }
  return null;
}

/** La ligne en HTML, les mots donnés soulignés. */
export function souligner(ligne: string, mots: string[], classe = "cx-souligne"): string {
  const zones = mots.map((m) => occurrence(ligne, m)).filter((z): z is [number, number] => z !== null).sort((a, b) => a[0] - b[0]);
  let html = "", i = 0;
  for (const [a, b] of zones) {
    if (a < i) continue;
    html += `${escapeHtml(ligne.slice(i, a))}<span class="${classe}">${escapeHtml(ligne.slice(a, b))}</span>`;
    i = b;
  }
  return html + escapeHtml(ligne.slice(i));
}

/** Le texte, lignes numérotées ; `marques` : les mots à souligner, ligne par ligne. */
function pageDuTexte(t: TexteAComprendre, consigne: string, marques: Map<number, string[]> = new Map(), entete = TETE, classe = "page", apres = "", sansTitre = false): string {
  const lignes = lignesNumerotees(t).map(({ n, texte }) => (n === null
    ? '<tr class="cx-strophe"><td></td><td></td></tr>'
    : `<tr><td class="cx-n">${n}</td><td class="cx-l">${souligner(texte, marques.get(n) ?? [])}</td></tr>`)).join("");
  return `<div class="${classe}">${titre(sansTitre ? "Le texte" : t.titre)}${entete}${consigne ? regle(consigne) : ""}<table class="cx-texte cx-${t.classe.toLowerCase()}">${lignes}</table>${apres}</div>`;
}

const pastille = (q: Question) => `<span class="cx-pastille cx-${q.type === "littérale" ? "lit" : q.type === "inférence" ? "inf" : q.type === "reprise" ? "rep" : "voc"}">${TYPES_DE_QUESTIONS[q.type].pastille}</span>`;


/** Les questions d'un texte, toutes ou d'un seul type ; au moins trois. */
export function questionsChoisies(t: TexteAComprendre, filtre: ReglagesComprehension["questions"]): Question[] {
  if (filtre === "toutes") return t.questions;
  const du = t.questions.filter((q) => q.type === filtre);
  return du.length >= 2 ? du : t.questions;
}

function lignesDeReponse(q: Question, classe: Classe): string {
  const n = classe === "CP" ? 1 : q.type === "inférence" ? 2 : 1;
  return Array.from({ length: n }, () => '<div class="cx-rep"></div>').join("");
}

/** À l'écoute, l'élève n'a pas le texte : la réponse a été dite, ou elle se déduit de ce qu'on a entendu. */
const A_L_ECOUTE: Partial<Record<TypeDeQuestion, string>> = {
  "littérale": "La réponse a été dite dans le texte : je m'en souviens.",
  "inférence": "La réponse n'a pas été dite : je réfléchis avec ce que j'ai entendu et ce que je sais.",
};
const classeDePastille = (ty: TypeDeQuestion) => (ty === "littérale" ? "lit" : ty === "inférence" ? "inf" : ty === "reprise" ? "rep" : "voc");

/** Les questions qu'on pose à l'écoute : sans les reprises, qu'on ne retrouve pas sans le texte sous les yeux. */
export const questionsALEcoute = (qs: Question[]) => {
  const sans = qs.filter((q) => q.type !== "reprise");
  return sans.length >= 3 ? sans : qs;
};

function pageDesQuestions(t: TexteAComprendre, qs: Question[], ecoute: boolean, enPlus = ""): string {
  const pastilleDe = (q: Question) => (ecoute && q.type === "littérale"
    ? '<span class="cx-pastille cx-lit">Je m\'en souviens</span>' : pastille(q));
  const enonce = (q: Question) => (ecoute ? q.q.replace(/\s(?:à|de) la ligne \d+/g, "") : q.q);
  const items = qs.map((q, i) => `<div class="cx-q"><div class="cx-enonce"><b>${i + 1}.</b> ${escapeHtml(enonce(q))} ${pastilleDe(q)}</div>${lignesDeReponse(q, t.classe)}${
    !ecoute && q.ligne ? '<div class="cx-preuve">Je le sais grâce à la ligne n° <span class="cx-case"></span></div>' : ""}</div>`).join("");
  const aide = [...new Set(qs.map((q) => q.type))].map((ty) => {
    const nom = ecoute && ty === "littérale" ? "Je m'en souviens" : TYPES_DE_QUESTIONS[ty].pastille;
    return `<div><span class="cx-pastille cx-${classeDePastille(ty)}">${nom}</span> ${(ecoute && A_L_ECOUTE[ty]) || TYPES_DE_QUESTIONS[ty].aide}</div>`;
  }).join("");
  const consigne = ecoute
    ? "Écoute bien le texte que lit l'adulte : il le lira deux fois. Puis réponds aux questions."
    : "Lis les questions, puis reviens au texte pour trouver la réponse. Écris le numéro de la ligne qui t'a aidé.";
  const bilan = ecoute && t.classe !== "CP"
    ? '<div class="cx-bilan">J\'ai compris le texte : <span class="cx-case"></span> tout &nbsp; <span class="cx-case"></span> presque tout &nbsp; <span class="cx-case"></span> un peu. Ce qui m\'a manqué : <span class="cx-pointilles cx-court"></span></div>' : "";
  return `<div class="page">${titre(`${t.titre} — ${ecoute ? "j'écoute et je comprends" : "je comprends le texte"}`)}${TETE}${regle(consigne)}<div class="cx-aide">${aide}</div><div class="cx-questions">${items}${enPlus}</div>${bilan}</div>`;
}

function corrigeDesQuestions(t: TexteAComprendre, qs: Question[]): string {
  const items = qs.map((q, i) => `<div class="cx-c"><b>${i + 1}.</b> ${escapeHtml(q.q)} — <b>${escapeHtml(q.r)}</b>${q.ligne ? ` <span class="cx-ligne">(ligne ${q.ligne} : « ${escapeHtml(ligneDe(t, q.ligne))} »)</span>` : ""}</div>`).join("");
  return `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<div class="cx-corrige">${items}</div></div>`;
}

function feuilleQuestions(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine), qs = questionsChoisies(t, r.questions);
  return pageDuTexte(t, "") + pageDesQuestions(t, qs, false) + corrigeDesQuestions(t, qs);
}

/** Écouter pour comprendre : l'élève n'a que les questions ; le texte et les réponses vont à l'adulte. */
function feuilleEcoute(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine), qs = questionsALEcoute(questionsChoisies(t, r.questions));
  const ordre = t.moments && t.classe !== "CP" ? melanger(hasard(graine + 7), t.moments.map((m, i) => ({ m, i }))) : [];
  const moments = ordre.length
    ? `<div class="cx-q"><div class="cx-enonce"><b>${qs.length + 1}.</b> Numérote les moments de l'histoire dans l'ordre.</div>${ordre.map(({ m }) => `<div class="cx-moment"><span class="cx-case"></span> ${escapeHtml(m)}</div>`).join("")}</div>` : "";
  const eleve = pageDesQuestions(t, qs, true, moments);
  const reponses = qs.map((q, i) => `<div class="cx-c"><b>${i + 1}.</b> ${escapeHtml(q.q)} — <b>${escapeHtml(q.r)}</b></div>`).join("")
    + (ordre.length ? `<div class="cx-c"><b>${qs.length + 1}.</b> L'ordre : ${ordre.map(({ i }) => i + 1).join(", ")} (de haut en bas).</div>` : "");
  const adulte = pageDuTexte(t, "Pour l'adulte : lire le texte deux fois, à voix haute, en articulant ; laisser les élèves répondre après la seconde lecture, les questions lues au besoin.",
    new Map(), "", "page corrige", `<div class="cx-corrige cx-apres">${reponses}</div>`);
  return eleve + adulte;
}

function feuilleSensGlobal(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine);
  const titrer = t.classe !== "CP";
  const ordre = melanger(hasard(graine + 3), t.resumes.map((texte, i) => ({ texte, juste: i === 0 })));
  const choix = ordre.map(({ texte }) => `<div class="cx-choix"><span class="cx-case"></span> ${escapeHtml(texte)}</div>`).join("");
  const suite = titrer
    ? ['Explique pourquoi les deux autres résumés ne conviennent pas.', 'Donne un titre au texte.', 'Résume le texte à ton voisin, à l\'oral, sans le relire.']
    : ['Raconte le texte à ton voisin, avec tes mots, sans le relire.'];
  const questions = suite.map((q, k) => `<div class="cx-q"><div class="cx-enonce"><b>${k + 2}.</b> ${escapeHtml(q)}</div>${k < 2 && titrer ? '<div class="cx-rep"></div>'.repeat(k === 0 ? 2 : 1) : ""}</div>`).join("");
  const page = `<div class="page">${titre(titrer ? "De quoi parle le texte ?" : `${t.titre} — de quoi parle le texte ?`)}${TETE}${regle("Lis le texte en entier. Ferme les yeux et fais-toi le film de ce qu'il raconte ou de ce qu'il explique. Puis choisis le résumé qui lui correspond.")}
    <div class="cx-q"><div class="cx-enonce"><b>1.</b> Coche le résumé qui correspond au texte.</div>${choix}</div>${questions}</div>`;
  const corrige = `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<div class="cx-corrige"><div class="cx-c">Le bon résumé : <b>${escapeHtml(t.resumes[0])}</b></div>${
    t.resumes.slice(1).map((x) => `<div class="cx-c">Ne convient pas : ${escapeHtml(x)} <span class="cx-ligne">— il contredit le texte ou en oublie l'essentiel.</span></div>`).join("")}${
    titrer ? `<div class="cx-c">Le titre de l'auteur : <b>${escapeHtml(t.titre)}</b> <span class="cx-ligne">— tout titre qui dit l'essentiel convient.</span></div>` : ""}</div></div>`;
  return pageDuTexte(t, "", new Map(), TETE, "page", "", titrer) + page + corrige;
}

/** Les inférences : l'indice du texte, ce que je sais déjà, donc ce que je comprends — expliciter son raisonnement. */
function feuilleInferences(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine);
  const qs = t.questions.filter((q) => q.type === "inférence");
  const cadre = t.classe === "CP"
    ? '<div class="cx-preuve">L\'indice est à la ligne n° <span class="cx-case"></span></div><div class="cx-rep"></div>'
    : '<table class="cx-cadre"><tr><td>L\'indice dans le texte (ligne <span class="cx-case"></span>)</td><td></td></tr><tr><td>Ce que je sais déjà</td><td></td></tr><tr><td>Donc…</td><td></td></tr></table>';
  const items = qs.map((q, i) => `<div class="cx-q"><div class="cx-enonce"><b>${i + 1}.</b> ${escapeHtml(q.q)} ${pastille(q)}</div>${cadre}</div>`).join("");
  const exemple = "« J'ai pris mon parapluie. » Ce n'est pas écrit, mais je comprends qu'il pleut : l'indice, c'est le parapluie ; je sais qu'on le prend quand il pleut.";
  const page = `<div class="page">${titre(`${t.titre} — ce qui n'est pas écrit`)}${TETE}${regle(`La réponse n'est pas écrite dans le texte : je cherche un indice, je réfléchis avec ce que je sais déjà, et j'explique. <i>${escapeHtml(exemple)}</i>`)}<div class="cx-questions">${items}</div></div>`;
  const corrige = `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<div class="cx-corrige">${qs.map((q, i) =>
    `<div class="cx-c"><b>${i + 1}.</b> ${escapeHtml(q.q)} — <b>${escapeHtml(q.r)}</b>${q.ligne ? ` <span class="cx-ligne">(indice ligne ${q.ligne} : « ${escapeHtml(ligneDe(t, q.ligne))} »)</span>` : ""}</div>`).join("")}</div></div>`;
  return pageDuTexte(t, "") + page + corrige;
}

/** Les mots des émotions, pour dire ce que ressentent les personnages. */
export const MOTS_DES_EMOTIONS = ["content", "fier", "rassuré", "surpris", "amusé", "triste", "déçu", "inquiet", "a peur", "en colère", "fâché", "honteux", "têtu", "reconnaissant", "fatigué"];

/** Ce que ressentent les personnages : à quelle ligne, quel indice ; puis la question ouverte du programme. */
function feuilleEmotions(r: ReglagesComprehension, graine: number): string {
  const choisi = r.texte ? texteDe(r.texte) : undefined;
  const t = choisi?.emotions ? choisi : (() => {
    const recits = textesDeLaClasse(r.classe).filter((x) => x.emotions);
    return recits[Math.floor(hasard(graine + 17)() * recits.length)];
  })();
  const items = t.emotions!.map((e, i) => `<div class="cx-q"><div class="cx-enonce"><b>${i + 1}.</b> Ligne ${e.ligne} : comment se sent ${escapeHtml(e.qui)} ? Souligne l'indice dans le texte.</div><div class="cx-rep"></div></div>`).join("");
  const ouverte = `<div class="cx-q"><div class="cx-enonce"><b>${t.emotions!.length + 1}.</b> Et toi, à sa place, qu'aurais-tu fait ? Pourquoi ?</div>${t.classe === "CP" ? "" : '<div class="cx-rep"></div><div class="cx-rep"></div>'}</div>`;
  const banque = `<div class="cx-banque">${MOTS_DES_EMOTIONS.map((m) => `<span>${escapeHtml(m)}</span>`).join("")}</div>`;
  const page = `<div class="page">${titre(`${t.titre} — ce que ressentent les personnages`)}${TETE}${regle("Ce que ressent un personnage n'est pas toujours écrit : je cherche ce qu'il fait, ce qu'il dit, comment il le dit. Je peux prendre un mot de la boîte.")}${banque}<div class="cx-questions">${items}${ouverte}</div></div>`;
  const corrige = `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<div class="cx-corrige">${t.emotions!.map((e, i) =>
    `<div class="cx-c"><b>${i + 1}.</b> ${escapeHtml(e.qui)}, ligne ${e.ligne} : <b>${escapeHtml(e.emotion)}</b>. <span class="cx-ligne">L'indice : ${escapeHtml(e.indice)}</span></div>`).join("")}<div class="cx-c"><b>${t.emotions!.length + 1}.</b> Réponse personnelle, justifiée.</div></div></div>`;
  return pageDuTexte(t, "") + page + corrige;
}

function feuilleMoments(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine);
  const ordre = melanger(hasard(graine + 5), t.moments!.map((m, i) => ({ m, i })));
  const cases = ordre.map(({ m }) => `<div class="cx-moment"><span class="cx-case cx-grande"></span> ${escapeHtml(m)}</div>`).join("");
  const raconter = t.classe === "CP"
    ? "Raconte l'histoire à ton voisin dans l'ordre, avec tes mots."
    : "Raconte l'histoire à ton voisin dans l'ordre, avec : d'abord, ensuite, puis, enfin. Puis écris-la en trois ou quatre phrases dans ton cahier.";
  const page = `<div class="page">${titre(`${t.titre} — les moments de l'histoire`)}${TETE}${regle("Relis le texte. Numérote les moments de l'histoire de 1 à 4, dans l'ordre où ils arrivent. Vérifie en revenant au texte.")}
    <div class="cx-moments">${cases}</div><div class="cx-q"><div class="cx-enonce">${escapeHtml(raconter)}</div></div></div>`;
  const corrige = `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<div class="cx-corrige">${ordre.map(({ m, i }) => `<div class="cx-c"><b>${i + 1}</b> — ${escapeHtml(m)}</div>`).join("")}</div></div>`;
  return pageDuTexte(t, "") + page + corrige;
}

function feuilleReprises(r: ReglagesComprehension, graine: number): string {
  const t = texteDeLExercice(r, graine);
  const marques = new Map<number, string[]>();
  for (const x of t.reprises) marques.set(x.ligne, [...(marques.get(x.ligne) ?? []), x.mot]);
  const lignes = t.reprises.map((x) => `<tr><td class="cx-mot">${escapeHtml(x.mot)}</td><td class="cx-centre">${x.ligne}</td><td></td></tr>`).join("");
  const consigne = t.classe === "CP"
    ? "Les mots soulignés remplacent un personnage ou une chose. Pour chacun, relis la phrase et celle d'avant : de qui, de quoi parle-t-on ?"
    : "Les mots soulignés reprennent un personnage ou une chose dont le texte a déjà parlé. Pour chacun, relis la phrase et celle d'avant ; vérifie en remplaçant le mot par ta réponse : la phrase garde-t-elle son sens ?";
  const page = `<div class="page">${titre(`${t.titre} — qui est qui ?`)}${TETE}${regle(consigne)}
    <table class="cx-tableau"><tr><th>Le mot souligné</th><th>Ligne</th><th>De qui, de quoi parle-t-on ?</th></tr>${lignes}</table>
    <div class="cx-q"><div class="cx-enonce">Colorie de la même couleur, dans le texte, tous les mots qui désignent le même personnage.</div></div></div>`;
  const corrige = `<div class="page corrige">${titre(`${t.titre} — corrigé`)}<table class="cx-tableau"><tr><th>Le mot</th><th>Ligne</th><th>Ce qu'il désigne</th></tr>${
    t.reprises.map((x) => `<tr><td class="cx-mot">${escapeHtml(x.mot)}</td><td class="cx-centre">${x.ligne}</td><td>${escapeHtml(x.designe)}</td></tr>`).join("")}</table></div>`;
  return pageDuTexte(t, "", marques) + page + corrige;
}

/** Le mot inconnu dans sa phrase : la ligne d'avant, la sienne, celle d'après ; quatre mots par feuille. */
function feuilleMotInconnu(r: ReglagesComprehension, graine: number): string {
  const alea = hasard(graine + 11);
  const premier = texteDeLExercice(r, graine);
  const autres = melanger(alea, textesDeLaClasse(premier.classe).filter((t) => t.id !== premier.id)).slice(0, 3);
  const textes = [premier, ...autres];
  const items = textes.map((t, k) => {
    const m = t.motInconnu, n = t.lignes.filter((l) => l.trim()).length;
    const extrait = [m.ligne - 1, m.ligne, m.ligne + 1].filter((x) => x >= 1 && x <= n)
      .map((x) => (x === m.ligne ? souligner(ligneDe(t, x), [m.mot], "cx-gras") : escapeHtml(ligneDe(t, x)))).join(t.type === "poétique" ? " / " : " ");
    const choix = melanger(alea, [m.sens, ...m.leurres]).map((s) => `<div class="cx-choix"><span class="cx-case"></span> ${escapeHtml(s)}</div>`).join("");
    return `<div class="cx-q"><div class="cx-enonce"><b>${k + 1}.</b> <i>${escapeHtml(t.titre)}</i> — que veut dire « ${escapeHtml(m.mot)} » ?</div><div class="cx-extrait">${extrait}</div>${choix}
      <div class="cx-preuve">Ce qui m'a aidé : <span class="cx-pointilles"></span></div></div>`;
  }).join("");
  const strategies = "Pour comprendre un mot inconnu : je relis la phrase, celle d'avant et celle d'après ; je cherche un mot de la même famille que je connais ; j'essaie de le remplacer par un mot que je connais et je vérifie que la phrase garde son sens ; puis je vérifie dans le dictionnaire.";
  const page = `<div class="page">${titre("Le mot inconnu — je cherche le sens dans le texte")}${TETE}${regle(escapeHtml(strategies))}<div class="cx-questions">${items}</div></div>`;
  const corrige = `<div class="page corrige">${titre("Le mot inconnu — corrigé")}<div class="cx-corrige">${textes.map((t, k) =>
    `<div class="cx-c"><b>${k + 1}.</b> « ${escapeHtml(t.motInconnu.mot)} » : <b>${escapeHtml(t.motInconnu.sens)}</b>. <span class="cx-ligne">L'indice : ${escapeHtml(t.motInconnu.indice)}</span></div>`).join("")}</div></div>`;
  return page + corrige;
}

/** Les types de textes : un extrait de chaque, à reconnaître ; au CE2, le poème et le théâtre en plus. */
function feuilleTypes(r: ReglagesComprehension, graine: number): string {
  const alea = hasard(graine + 13);
  const types: TypeDeTexte[] = r.classe === "CE2" ? ["narratif", "informatif", "prescriptif", "poétique", "théâtral"] : ["narratif", "informatif", "prescriptif"];
  const rang = { CP: 0, CE1: 1, CE2: 2 };
  const extraits = melanger(alea, types.map((ty) => {
    // Un texte de ce type, de la classe ou d'une classe d'avant.
    const parmi = TEXTES.filter((t) => t.type === ty && rang[t.classe] <= rang[r.classe]);
    const t = parmi[Math.floor(alea() * parmi.length)];
    return { t, debut: t.lignes.filter((l) => l.trim()).slice(0, types.length > 3 ? 3 : 4) };
  }));
  const cases = types.map((ty) => `<span class="cx-option"><span class="cx-case"></span> ${TYPES_DE_TEXTES[ty].court}</span>`).join("");
  const items = extraits.map(({ debut }, k) => `<div class="cx-q"><div class="cx-enonce"><b>Texte ${k + 1}</b></div><div class="cx-extrait">${debut.map(escapeHtml).join("<br>")}</div>
    <div class="cx-choix">C'est ${cases}</div><div class="cx-preuve">L'indice : <span class="cx-pointilles"></span></div></div>`).join("");
  const page = `<div class="page">${titre("Quel type de texte ?")}${TETE}${regle("Lis le début de chaque texte. Coche ce que c'est, et écris l'indice qui t'a aidé.")}<div class="cx-questions">${items}</div></div>`;
  const corrige = `<div class="page corrige">${titre("Quel type de texte ? — corrigé")}<div class="cx-corrige">${extraits.map(({ t }, k) =>
    `<div class="cx-c"><b>Texte ${k + 1}</b> (« ${escapeHtml(t.titre)} ») : <b>${TYPES_DE_TEXTES[t.type].nom}</b> — ${escapeHtml(TYPES_DE_TEXTES[t.type].indices)}</div>`).join("")}</div></div>`;
  return page + corrige;
}

export function htmlComprehension(r: ReglagesComprehension, graine: number): string {
  const corps = r.exercice === "questions" ? feuilleQuestions(r, graine)
    : r.exercice === "ecoute" ? feuilleEcoute(r, graine)
      : r.exercice === "sensGlobal" ? feuilleSensGlobal(r, graine)
        : r.exercice === "moments" ? feuilleMoments(r, graine)
          : r.exercice === "reprises" ? feuilleReprises(r, graine)
            : r.exercice === "inferences" ? feuilleInferences(r, graine)
              : r.exercice === "emotions" ? feuilleEmotions(r, graine)
            : r.exercice === "motInconnu" ? feuilleMotInconnu(r, graine)
              : feuilleTypes(r, graine);
  return feuille(corps, "cx");
}

export const STYLE_COMPREHENSION = `
  .feuille.cx .cx-texte { border-collapse: collapse; width: 100%; margin-top: 2mm; }
  .feuille.cx .cx-texte td { vertical-align: baseline; padding: 0; border: none; }
  .feuille.cx .cx-n { width: 9mm; font-size: 10px; color: #687087; text-align: right; padding-right: 3mm !important; }
  .feuille.cx .cx-cp .cx-l { font-size: 21px; line-height: 2; }
  .feuille.cx .cx-ce1 .cx-l { font-size: 17.5px; line-height: 1.85; }
  .feuille.cx .cx-ce2 .cx-l { font-size: 15.5px; line-height: 1.75; }
  .feuille.cx .cx-strophe td { height: 3mm; }
  .feuille.cx .cx-souligne { border-bottom: 2.5px solid #d33a32; padding-bottom: 1px; font-weight: 700; }
  .feuille.cx .cx-gras { font-weight: 800; border-bottom: 2px solid #2454e6; }
  .feuille.cx .cx-aide { font-size: 11px; color: #4a5168; margin: 0 0 3mm; line-height: 1.7; }
  .feuille.cx .cx-pastille { display: inline-block; font-size: 10px; font-weight: 700; border-radius: 8px; padding: 0 6px; line-height: 1.6; margin-left: 1mm; vertical-align: 1px; white-space: nowrap; }
  .feuille.cx .cx-lit { background: #e3ebff; color: #2454e6; }
  .feuille.cx .cx-inf { background: #fff0dc; color: #b45d00; }
  .feuille.cx .cx-rep { background: #e2f5e8; color: #1f7a3f; }
  .feuille.cx .cx-voc { background: #f1e6fb; color: #7a3fb0; }
  .feuille.cx .cx-questions { display: block; }
  .feuille.cx .cx-q { margin: 0 0 4.5mm; page-break-inside: avoid; break-inside: avoid; }
  .feuille.cx .cx-enonce { font-size: 14px; line-height: 1.5; font-weight: 600; }
  .feuille.cx .cx-enonce b { color: #687087; margin-right: 1mm; }
  .feuille.cx div.cx-rep { border-bottom: 1px solid #9aa0b4; height: 9mm; background: none; border-radius: 0; padding: 0; margin: 0; }
  .feuille.cx .cx-preuve { font-size: 12px; color: #4a5168; margin-top: 1.5mm; line-height: 2; }
  .feuille.cx .cx-case { display: inline-block; width: 4.5mm; height: 4.5mm; border: 1.5px solid #1c2233; border-radius: 1mm; vertical-align: -1mm; }
  .feuille.cx .cx-case.cx-grande { width: 8mm; height: 8mm; vertical-align: -2.5mm; margin-right: 2mm; }
  .feuille.cx .cx-pointilles { display: inline-block; width: 120mm; border-bottom: 1px dotted #687087; height: 4mm; }
  .feuille.cx .cx-choix { font-size: 13.5px; line-height: 1.5; margin: 1.5mm 0 0 2mm; }
  .feuille.cx .cx-moments { display: block; margin: 2mm 0 6mm; }
  .feuille.cx .cx-moment { font-size: 15px; line-height: 1.5; margin: 0 0 4mm; padding: 2mm 3mm; border: 1px dashed #9aa0b4; border-radius: 2mm; }
  .feuille.cx .cx-extrait { font-size: 13px; line-height: 1.55; margin: 1.5mm 0 1mm 2mm; padding-left: 3mm; border-left: 2px solid #c4c9d6; color: #2c3346; }
  .feuille.cx .cx-tableau { width: 100%; border-collapse: collapse; font-size: 14px; margin: 2mm 0 5mm; }
  .feuille.cx .cx-tableau th, .feuille.cx .cx-tableau td { border: 1px solid #1c2233; padding: 2.5mm 2mm; text-align: left; }
  .feuille.cx .cx-tableau th { font-size: 12px; background: #f7f8fc; }
  .feuille.cx .cx-tableau td { height: 10mm; vertical-align: middle; }
  .feuille.cx .cx-mot { font-weight: 700; width: 30%; }
  .feuille.cx .cx-centre { text-align: center !important; width: 14mm; }
  .feuille.cx .cx-cadre { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 1.5mm; }
  .feuille.cx .cx-cadre td { border: 1px solid #9aa0b4; padding: 1.5mm 2mm; height: 11mm; vertical-align: middle; }
  .feuille.cx .cx-cadre td:first-child { width: 34%; color: #4a5168; background: #f7f8fc; }
  .feuille.cx .cx-banque { display: block; margin: 0 0 4mm; font-size: 12.5px; line-height: 2.1; }
  .feuille.cx .cx-banque span { display: inline-block; border: 1px solid #9aa0b4; border-radius: 3mm; padding: 0 2.5mm; margin: 0 1.5mm 1mm 0; line-height: 1.7; }
  .feuille.cx .cx-option { display: inline-block; margin-right: 4mm; white-space: nowrap; }
  .feuille.cx .cx-pointilles.cx-court { width: 60mm; }
  .feuille.cx .cx-bilan { font-size: 12.5px; margin-top: 5mm; line-height: 2; }
  .feuille.cx .cx-corrige { font-size: 13px; line-height: 1.6; }
  .feuille.cx .cx-corrige.cx-apres { margin-top: 6mm; border-top: 1px solid #c4c9d6; padding-top: 3mm; }
  .feuille.cx .cx-c { margin: 0 0 2.5mm; }
  .feuille.cx .cx-ligne { color: #687087; font-size: 12px; }
`;
