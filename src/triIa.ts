// Marquer les verbes des étiquettes, et ranger celles du projet, avec l'IA.
//
// Pour colorer le verbe, il faut le désigner : entourer d'astérisques le mot
// de chaque phrase. Seize étiquettes, c'est long à la main. Le modèle le
// fait ; mais il ne touche à rien d'autre. On ne garde sa ligne que si, une
// fois ses astérisques retirés, elle redonne la phrase de l'enseignant — à
// la lettre. Les prénoms des élèves sont masqués avant l'envoi.
//
// Même prudence pour ranger le corpus du projet dans les maisons : le modèle
// dit dans quelle maison va chaque étiquette, en la recopiant ; une
// étiquette qu'il déforme, ou qu'il ne sait pas placer, revient à
// l'enseignant.

import type { ChatMessage } from "./api";
import { sansMarques } from "./triEtiquettes";

/** Ce qu'on demande au modèle : le verbe conjugué de chaque phrase, entre astérisques. */
export function promptMarquerVerbes(phrases: string[]): ChatMessage[] {
  const systeme = [
    "Tu aides un enseignant à préparer un exercice de grammaire, en français.",
    "On te donne des phrases, une par ligne. Recopie chaque ligne à l'identique, dans le même ordre, en entourant d'astérisques le verbe conjugué.",
    "Au passé composé, l'auxiliaire et le participe vont ensemble : « J'*ai mangé* une pomme. ». L'apostrophe reste hors des astérisques : « J'*ai* un vélo. ».",
    "Ne change aucun mot, aucune lettre, aucune ponctuation, et ne corrige rien. Les marqueurs entre crochets comme [P1] se recopient tels quels.",
    "Une ligne sans verbe conjugué se recopie telle quelle, sans astérisque.",
    "Réponds uniquement par les lignes, sans numéro, sans tiret, sans commentaire.",
  ].join(" ");
  return [{ role: "system", content: systeme }, { role: "user", content: phrases.map(sansMarques).join("\n") }];
}

/** Une forme comparable : espaces resserrées, apostrophes droites. */
const forme = (t: string) => t.replace(/[’ʼ]/g, "'").replace(/\s+/g, " ").trim();

const nettoyer = (ligne: string) => ligne.trim().replace(/^(\d+[.)]|[-•–])\s+/, "").replace(/^[«"“]\s*|\s*[»"”]$/g, "").trim();

/**
 * Les phrases avec leur verbe marqué : celles que le modèle a recopiées à
 * la lettre. Les autres restent comme elles étaient — marquées à la main,
 * ou pas du tout.
 */
export function marquesDeLaReponse(reponse: string, phrases: string[]): { phrases: string[]; marquees: number } {
  const proposees = new Map<string, string>();
  for (const brute of (reponse ?? "").replace(/```[a-z]*/g, "").split("\n")) {
    const ligne = nettoyer(brute);
    if (!/\*[^*\n]+\*/.test(ligne)) continue;
    const cle = forme(sansMarques(ligne));
    if (!proposees.has(cle)) proposees.set(cle, ligne.replace(/\s+/g, " "));
  }
  let marquees = 0;
  const sortie = phrases.map((p) => {
    const proposee = proposees.get(forme(sansMarques(p)));
    if (!proposee || sansMarques(proposee) === proposee) return p;
    // La phrase de l'enseignant, à la lettre : sinon on remet ses apostrophes et ses espaces, et l'on garde la sienne en cas de doute.
    const fidele = sansMarques(proposee) === sansMarques(p) ? proposee : remarquer(sansMarques(p), proposee);
    if (!fidele) return p;
    marquees++;
    return fidele;
  });
  return { phrases: sortie, marquees };
}

/** Reporte les astérisques de la ligne proposée sur la phrase d'origine, caractère pour caractère. */
function remarquer(original: string, proposee: string): string | null {
  let sortie = "";
  let i = 0;
  for (const c of proposee) {
    if (c === "*") { sortie += "*"; continue; }
    if (i >= original.length || forme(original[i]) !== forme(c)) return null;
    sortie += original[i++];
  }
  return i === original.length ? sortie : null;
}

// ── Ranger les étiquettes du projet dans les maisons ──

/** Ce qu'on demande au modèle : le numéro de la maison de chaque étiquette. */
export function promptRangerEtiquettes(maisons: string[], etiquettes: string[]): ChatMessage[] {
  const systeme = [
    "Tu aides un enseignant à préparer un exercice de tri, en français.",
    "On te donne des maisons numérotées — les catégories du tri — puis des étiquettes, une par ligne.",
    "Pour chaque étiquette, réponds sur une ligne : le numéro de la maison, une tabulation, puis l'étiquette recopiée à l'identique — mêmes mots, même ponctuation, même casse.",
    "Une étiquette qui ne va dans aucune maison, ou qui pourrait aller dans plusieurs, prend le numéro 0.",
    "Les marqueurs entre crochets comme [P1] se recopient tels quels. Réponds uniquement par ces lignes, sans commentaire.",
  ].join(" ");
  const demande = ["Maisons :", ...maisons.map((m, i) => `${i + 1}. ${m}`), "", "Étiquettes :", ...etiquettes.map(sansMarques)].join("\n");
  return [{ role: "system", content: systeme }, { role: "user", content: demande }];
}

/**
 * Les étiquettes rangées : pour chaque maison, celles que le modèle y a
 * mises en les recopiant à la lettre. Ce qu'il a écarté, déformé ou mis
 * dans une maison qui n'existe pas revient dans `ecartees` : à ranger à la
 * main.
 */
export function rangementDeLaReponse(reponse: string, maisons: number, etiquettes: string[]): { parMaison: string[][]; ecartees: string[] } {
  const parForme = new Map(etiquettes.map((e) => [forme(sansMarques(e)), e]));
  const rangee = new Map<string, number>();
  for (const brute of (reponse ?? "").replace(/```[a-z]*/g, "").split("\n")) {
    const m = /^\s*(\d+)\s*[\t:.)\-–—|]*\s*(.+?)\s*$/.exec(brute);
    if (!m) continue;
    const original = parForme.get(forme(sansMarques(nettoyer(m[2]))));
    if (!original || rangee.has(original)) continue;
    const num = Number(m[1]);
    if (num >= 1 && num <= maisons) rangee.set(original, num - 1);
  }
  const parMaison = Array.from({ length: maisons }, () => [] as string[]);
  const ecartees: string[] = [];
  for (const e of etiquettes) {
    const i = rangee.get(e);
    if (i === undefined) ecartees.push(e);
    else parMaison[i].push(e);
  }
  return { parMaison, ecartees };
}

// ── Transposer un modèle au thème du projet ──
//
// « Être ou avoir », « Passé, présent, futur »… sont écrits avec des phrases
// de tous les jours. Pour que le tri reste dans le thème du projet, le modèle
// écrit de nouvelles étiquettes sur le même patron — mêmes maisons, même
// forme, même mot marqué — avec les mots du projet. Chaque étiquette dit sa
// maison ; ce qui n'en dit pas, ou en dit une qui n'existe pas, est écarté.

/** Ce qu'on demande au modèle : des étiquettes sur le patron des exemples, dans le thème. */
export function promptTransposer(
  maisons: { titre: string; exemples: string[] }[], theme: string, mots: string[], parMaison: number, cycle: 2 | 3,
): ChatMessage[] {
  const systeme = [
    `Tu aides un enseignant à préparer un exercice de tri, en français, pour des élèves de cycle ${cycle}.`,
    "On te donne un tri : ses maisons numérotées, chacune avec des étiquettes d'exemple, puis un thème et ses mots.",
    "Écris de nouvelles étiquettes sur le patron des exemples — même forme, même longueur, même difficulté, et le même mot entouré d'astérisques quand les exemples en ont —, mais sur le thème donné : emploie ses mots autant que possible. Ne recopie pas les exemples.",
    "Chaque étiquette doit aller sans hésitation dans sa maison, et dans une seule. Écris un français simple et correct, sans prénom de personne.",
    `Écris ${parMaison} étiquettes par maison. Réponds uniquement par des lignes : le numéro de la maison, une tabulation, puis l'étiquette. Sans titre ni commentaire.`,
  ].join(" ");
  const demande = [
    "Maisons :",
    ...maisons.map((m, i) => `${i + 1}. ${m.titre} — exemples : ${m.exemples.join(" / ")}`),
    "",
    `Thème : ${theme}`,
    mots.length ? `Mots du thème : ${mots.join(", ")}` : "",
    "",
    "La réponse a cette forme (avec d'autres étiquettes, sur le thème) :",
    ...maisons.map((m, i) => `${i + 1}\t${m.exemples[0] ?? "…"}`),
  ].filter((l, i, t) => l || t[i - 1] !== "").join("\n");
  return [{ role: "system", content: systeme }, { role: "user", content: demande }];
}

/** Une forme de titre comparable : sans accent, sans ponctuation, en minuscules. */
const titreComparable = (t: string) => t.toLocaleLowerCase("fr").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Les étiquettes écrites pour chaque maison, sans doublon, `parMaison` au plus.
 *
 * Le modèle ne répond pas toujours « numéro, tabulation, étiquette ». Il
 * regroupe souvent sous le titre de chaque maison (« **Verbe être** »,
 * « Maison 1 : »), numérote dans chaque groupe, met le mot en gras, ou
 * répond en JSON. On lit toutes ces formes ; une étiquette dont on ne sait
 * pas la maison est écartée, jamais devinée au hasard.
 */
export function transpositionDeLaReponse(reponse: string, titres: string[] | number, parMaison: number): string[][] {
  const noms = typeof titres === "number" ? Array.from({ length: titres }, () => "") : titres;
  const maisons = noms.length;
  const sortie = Array.from({ length: maisons }, () => [] as string[]);
  const vues = new Set<string>();
  const ranger = (i: number, brute: string) => {
    const etiquette = nettoyer(brute.replace(/\*\*([^*\n]+)\*\*/g, "*$1*").replace(/__([^_\n]+)__/g, "*$1*")).replace(/\s+/g, " ").trim();
    // Des astérisques qui ne vont pas par deux : l'étiquette s'imprimerait de travers.
    if (i < 0 || i >= maisons || !sansMarques(etiquette).trim() || (etiquette.match(/\*/g) ?? []).length % 2) return;
    const cle = forme(sansMarques(etiquette)).toLocaleLowerCase("fr");
    if (vues.has(cle) || sortie[i].length >= parMaison) return;
    vues.add(cle);
    sortie[i].push(etiquette);
  };
  const texte = (reponse ?? "").replace(/```[a-z]*/g, "");

  // Une réponse en JSON : un tableau de listes, ou un objet par maison.
  const json = /[[{][\s\S]*[\]}]/.exec(texte)?.[0];
  if (json) {
    try {
      const v: unknown = JSON.parse(json);
      const listes = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v as Record<string, unknown>) : [];
      const enListes = (listes.length === 1 && Array.isArray(listes[0]) && (listes[0] as unknown[]).every(Array.isArray)) ? listes[0] as unknown[] : listes;
      enListes.forEach((l, i) => { if (Array.isArray(l)) l.forEach((e) => { if (typeof e === "string") ranger(i, e); }); });
      if (sortie.some((l) => l.length)) return sortie;
    } catch { /* pas du JSON : on lit les lignes */ }
  }

  const lignes = texte.split("\n").map((l) => l.trim());
  /** La maison qu'une ligne annonce, si c'est un titre ; -1 sinon. */
  const enTete = (ligne: string): number => {
    const sansDeco = ligne.replace(/^#+\s*/, "").replace(/[*_]/g, "").trim();
    const parNumero = /^(?:maison|cat[ée]gorie)\s*(\d+)\b\s*[:.)\-–—]?\s*(.*)$/i.exec(sansDeco);
    if (parNumero) {
      // « Maison 1 : Verbe être » est un titre ; « Maison 1 : La sorcière… », une étiquette.
      const reste = titreComparable(parNumero[2]);
      return !reste || noms.some((n) => n && titreComparable(n) === reste) ? Number(parNumero[1]) - 1 : -1;
    }
    const plat = titreComparable(sansDeco.replace(/^\(?\d+\)?\s*[.):\-–—]?\s*/, ""));
    if (!plat || !/:$|^#|^\*\*|^\d+\s*[.)]/.test(ligne) && plat.split(" ").length > 6) return -1;
    return noms.findIndex((n) => n && (titreComparable(n) === plat || plat.startsWith(titreComparable(n) + " ") && /:$/.test(ligne)));
  };
  // Un titre que le modèle a reformulé (« **Avec être :** ») : il annonce la maison suivante.
  const preambule = (l: string) => /^(voici|voil[aà]|bien s[uû]r|ci-dessous|here|sure)\b/i.test(l.replace(/^[#*_\s]+/, ""));
  const ressembleAUnTitre = (l: string) => !!l && !preambule(l)
    && (/:\s*\**$/.test(l) || /^#/.test(l) || /^\*\*[^*]+\*\*:?$/.test(l) || /^(maison|cat[ée]gorie)\s*\d+\s*[:.)\-–—]?\s*$/i.test(l.replace(/^[#*_\s]+/, "").replace(/[*_]+$/, "")));
  const parTitres = lignes.filter((l) => enTete(l) >= 0 || ressembleAUnTitre(l)).length >= 2;

  if (parTitres) {
    // Groupées sous leurs titres : chaque ligne va à la maison du dernier titre.
    let courante = -1;
    for (const l of lignes) {
      if (!l || preambule(l)) continue;
      const t = enTete(l);
      if (t >= 0) { courante = t; continue; }
      if (ressembleAUnTitre(l)) { courante++; continue; }
      if (courante >= 0) ranger(courante, l.replace(/^(\d+[.)]|[-•*–])\s+/, ""));
    }
    return sortie;
  }

  let numerotees = 0;
  for (const l of lignes) {
    // « 1<tab>…», « 1. … », « 1 - … », « (1) … », « Maison 1 : … » — ou « 1 … » devant une majuscule.
    const m = /^(?:[Mm]aison\s*|[Cc]at[ée]gorie\s*)?\(?(\d+)\)?\s*(?:[\t:.)\-–—|]+\s*|\s+(?=[A-ZÀ-ÖØ-Þ«"*]))(.+)$/.exec(l);
    if (!m) continue;
    numerotees++;
    ranger(Number(m[1]) - 1, m[2]);
  }
  if (numerotees) return sortie;

  // Ni numéros ni titres : des paquets séparés par une ligne vide, dans l'ordre des maisons.
  const paquets = texte.split(/\n\s*\n/).map((p) => p.split("\n").map((l) => l.trim()).filter((l) => l && !/:$/.test(l))).filter((p) => p.length);
  if (paquets.length === maisons) paquets.forEach((p, i) => p.forEach((l) => ranger(i, l.replace(/^(\d+[.)]|[-•*–])\s+/, ""))));
  return sortie;
}

// ── Relire ce que le modèle a écrit ──
//
// Un modèle qui écrit seize phrases en laisse passer : « La *suis* une
// sorcière », « le costume de Halloween ». Une seconde lecture, demandée à
// part, les rattrape mieux que la première écriture. Elle corrige sans rien
// réécrire d'autre, et le mot marqué reste marqué.

/** Ce qu'on demande au modèle : corriger chaque étiquette, rien de plus. */
export function promptRelireEtiquettes(etiquettes: string[], cycle: 2 | 3): ChatMessage[] {
  const systeme = [
    `Tu relis les étiquettes d'un exercice pour des élèves de cycle ${cycle}, comme un correcteur attentif.`,
    "Corrige toute faute : orthographe, accords, conjugaison, élisions (« d'Halloween », « l'école »), majuscule au début, ponctuation.",
    "Le sujet et le verbe doivent aller ensemble : « Je *suis* », jamais « La *suis* » — remplace un sujet impossible par le bon pronom.",
    "Ne change ni le sens, ni les mots justes, ni la longueur. Garde les astérisques autour du même mot, corrigé s'il le faut.",
    "Réponds par les étiquettes, une par ligne, dans le même ordre, chacune précédée de son numéro et d'un point (« 1. »). Sans commentaire.",
  ].join(" ");
  return [{ role: "system", content: systeme }, { role: "user", content: etiquettes.map((e, i) => `${i + 1}. ${e}`).join("\n") }];
}

/** Les mots d'une étiquette, pour juger qu'une correction n'est pas une réécriture. */
const motsDe = (t: string) => sansMarques(t).toLocaleLowerCase("fr").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .split(/[^a-z0-9]+/).filter(Boolean);

/**
 * Les étiquettes relues. Une ligne n'en remplace une autre que si elle garde
 * le mot marqué (même corrigé) et l'essentiel de ses mots : sinon c'est une
 * réécriture, pas une correction — on garde l'original.
 */
export function relectureDeLaReponse(reponse: string, etiquettes: string[]): { etiquettes: string[]; corrigees: number } {
  const proposees = new Map<number, string>();
  for (const brute of (reponse ?? "").replace(/```[a-z]*/g, "").split("\n")) {
    const m = /^\s*(\d+)\s*[.):\-–—]\s*(.+?)\s*$/.exec(brute);
    if (!m) continue;
    const ligne = nettoyer(m[2].replace(/\*\*([^*\n]+)\*\*/g, "*$1*")).replace(/\s+/g, " ").trim();
    if (!proposees.has(Number(m[1]) - 1)) proposees.set(Number(m[1]) - 1, ligne);
  }
  let corrigees = 0;
  const sortie = etiquettes.map((e, i) => {
    const p = proposees.get(i);
    if (!p || p === e) return e;
    const marques = (t: string) => (t.match(/\*/g) ?? []).length;
    if (marques(p) % 2 || (marques(e) > 0) !== (marques(p) > 0) || !sansMarques(p).trim()) return e;
    const avant = motsDe(e), apres = new Set(motsDe(p));
    const gardes = avant.filter((w) => apres.has(w)).length;
    if (!avant.length || gardes / avant.length < 0.6) return e;
    corrigees++;
    return p;
  });
  return { etiquettes: sortie, corrigees };
}

const PERSONNE_DU_VERBE: Record<string, string> = {
  suis: "je", ai: "je", es: "tu", as: "tu", est: "il", a: "il",
  sommes: "nous", avons: "nous", "êtes": "vous", avez: "vous", sont: "ils", ont: "ils",
};
const PERSONNE_DU_PRONOM: Record<string, string> = {
  je: "je", j: "je", tu: "tu", il: "il", elle: "il", on: "il", nous: "nous", vous: "vous", ils: "ils", elles: "ils",
};
const DETERMINANTS = new Set(["le", "la", "un", "une", "des", "du", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "notre", "nos", "votre", "vos", "leurs", "ce", "cet", "cette", "ces", "les", "l", "leur"]);
/** Devant « avoir », ceux-là peuvent être des pronoms : « Il les *a* ». */
const PRONOMS_COMPLEMENTS = new Set(["les", "l", "leur"]);

/**
 * Un sujet qui ne peut pas aller avec le verbe marqué, quand c'est être ou
 * avoir au présent (ou l'auxiliaire d'un temps composé) : « La *suis* »,
 * « Nous *est* », « Je *a* ». Rien quand on ne peut pas trancher — un nom
 * sujet, par exemple. C'est le garde-fou derrière la relecture.
 */
export function sujetQuiNeVaPas(etiquette: string): boolean {
  const m = /\*([^*\n]+)\*/.exec(etiquette);
  if (!m) return false;
  const verbe = m[1].trim().toLocaleLowerCase("fr").split(/\s+/)[0];
  const personne = PERSONNE_DU_VERBE[verbe];
  if (!personne) return false;
  const mots = etiquette.slice(0, m.index).toLocaleLowerCase("fr").replace(/[’ʼ]/g, "'")
    .split(/[^a-zàâäéèêëîïôöùûüÿçœæ]+/).filter(Boolean);
  // La négation et « y », « en » se glissent entre le sujet et le verbe.
  let k = mots.length - 1;
  while (k >= 0 && ["ne", "n", "y", "en"].includes(mots[k])) k--;
  const avant = mots[k];
  if (!avant) return false;
  if (avant in PERSONNE_DU_PRONOM) return PERSONNE_DU_PRONOM[avant] !== personne;
  if (!DETERMINANTS.has(avant)) return false;
  return !(PRONOMS_COMPLEMENTS.has(avant) && ["ai", "as", "a", "avons", "avez", "ont"].includes(verbe));
}
