// Le déroulement d'une séance, écrit comme un document (demande de
// l'enseignant, octobre 2026) : des phases, chacune une carte avec son titre,
// sa durée, son déroulement, la posture de l'enseignant et les champs qu'on
// ajoute à toute la séance (organisation, différenciation, matériel…) ;
// avant elles, un texte libre.
//
// Il reste du texte, ligne à ligne, et non du HTML : deux ordinateurs le
// fusionnent caractère par caractère (voir texte_crdt.rs), et une balise
// coupée par une fusion casserait la page. Les marques sont courtes :
//
//   ## Mise en route (5 min)          une phase, sa durée entre parenthèses
//   Du texte, **en gras**, *en italique*.      son déroulement
//   - un élément de liste
//   [img:photo.jpg]                   une image, seule sur sa ligne
//   [@outil:o1|Réglette de lecture]   un support cité (outil, affichage,
//                                     évaluation, jeu, materiel, feuille)
//   [cite:…]                          une citation d'un document du coffre
//   ### Posture de l'enseignant       un champ de la phase, puis ses lignes
//
// Une ligne de texte qui commence par « # » s'écrit « \# » : tapée dans une
// carte, elle ne devient ni une phase ni un champ.
//
// Le tableau des phases (`tableauDeroulement`) que lisent les tablettes,
// l'impression et les aides à la tâche se tire des phases à chaque
// enregistrement (`tableauDuDocument`) : ils n'ont rien à apprendre. Une
// séance d'avant, au tableau rempli, devient un document à son ouverture
// (`documentDeLaSeance`).

import { ENTETE_TABLEAU } from "./demarches";

export type GenreCite = "outil" | "affichage" | "evaluation" | "jeu" | "materiel" | "feuille";
const GENRES: readonly GenreCite[] = ["outil", "affichage", "evaluation", "jeu", "materiel", "feuille"];

export const ICONE_CITE: Record<GenreCite, string> = {
  outil: "📏", affichage: "🖼", evaluation: "📋", jeu: "🎲", materiel: "🧰", feuille: "📄",
};

export type Bloc =
  | { t: "phase"; titre: string; duree: string }
  | { t: "texte"; texte: string }
  | { t: "liste"; items: string[] }
  | { t: "image"; nom: string };

const RE_PHASE = /^##(?!#)\s*(.*)$/;
const RE_CHAMP = /^###\s*(.+?)\s*$/;
/** La durée en fin de titre de phase : « (5 min) », « (1 h) », « (1 h 30) », « (5-10 min) », « (10') ». */
const RE_DUREE_FIN = /\s*\(\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:min(?:utes?)?|h(?:\s*\d+)?|'))\s*\)\s*$/i;
const RE_LISTE = /^\s*(?:[-•]|\*(?=\s))\s+(.*)$/;
const RE_IMAGE_SEULE = /^\s*\[img:([^\]]+)\]\s*$/;
const RE_IMAGE = /\[img:([^\]]+)\]/g;
const RE_CITE_SUPPORT = /\[@([a-z]+):([^|\]]+)\|([^\]]*)\]/g;

/** Une ligne de texte qui commence par « # » se protège : elle ne deviendra ni phase ni champ. */
export const ligneProtegee = (ligne: string) => (/^\s*#/.test(ligne) ? `\\${ligne}` : ligne);

/** Une marque de citation d'un support : son titre ne peut pas fermer la marque. */
export const marqueDeCitation = (genre: GenreCite, id: string, titre: string) =>
  `[@${genre}:${id}|${titre.replace(/\]/g, ")").replace(/\|/g, "/").replace(/\n/g, " ").trim()}]`;

/** Une durée lisible : « 10 » → « 10 min ». */
export function dureeLisible(duree: string): string {
  const d = (duree ?? "").trim();
  return /^\d+$/.test(d) ? `${d} min` : d;
}

/** Le titre et la durée d'une ligne de phase (« ## Mise en route (5 min) »). */
function lirePhase(ligne: string): { titre: string; duree: string } | null {
  const m = RE_PHASE.exec(ligne);
  if (!m) return null;
  const d = RE_DUREE_FIN.exec(m[1]);
  return d ? { titre: m[1].slice(0, d.index).trim(), duree: d[1].replace(/\s+/g, " ").trim() } : { titre: m[1].trim(), duree: "" };
}

/** Les blocs d'un texte, ligne à ligne. Une image au milieu d'une ligne en sort, en bloc à elle. */
export function lireDocument(markup: string): Bloc[] {
  const blocs: Bloc[] = [];
  for (const brute of (markup ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const phase = lirePhase(brute);
    if (phase) { blocs.push({ t: "phase", ...phase }); continue; }
    const img = RE_IMAGE_SEULE.exec(brute);
    if (img) { blocs.push({ t: "image", nom: img[1].trim() }); continue; }
    const li = RE_LISTE.exec(brute);
    if (li) {
      const der = blocs[blocs.length - 1];
      if (der?.t === "liste") der.items.push(li[1]); else blocs.push({ t: "liste", items: [li[1]] });
      continue;
    }
    // Une image dans une ligne de texte : le texte avant, l'image, le texte après.
    const ligne = brute.replace(/^(\s*)\\(?=#)/, "$1");
    let reste = ligne, m: RegExpExecArray | null;
    RE_IMAGE.lastIndex = 0;
    let coupee = false;
    while ((m = RE_IMAGE.exec(reste))) {
      coupee = true;
      const avant = reste.slice(0, m.index);
      if (avant.trim()) blocs.push({ t: "texte", texte: avant.trimEnd() });
      blocs.push({ t: "image", nom: m[1].trim() });
      reste = reste.slice(m.index + m[0].length);
      RE_IMAGE.lastIndex = 0;
    }
    if (!coupee || reste.trim()) blocs.push({ t: "texte", texte: coupee ? reste.trimStart() : ligne });
  }
  return blocs;
}

/** Le texte qu'écrivent ces blocs. */
export function ecrireDocument(blocs: Bloc[]): string {
  return blocs.flatMap((b): string[] => {
    if (b.t === "phase") return [`##${b.titre.trim() ? ` ${b.titre.replace(/\n/g, " ").trim()}` : ""}${b.duree.trim() ? ` (${b.duree.trim()})` : ""}`];
    if (b.t === "image") return [`[img:${b.nom}]`];
    if (b.t === "liste") return b.items.map((x) => `- ${x.replace(/\n/g, " ")}`);
    return [ligneProtegee(b.texte.replace(/\n/g, " "))];
  }).join("\n");
}

/** Le document a-t-il des phases ? Sinon, c'est un texte d'avant, ou une séance sans phases. */
export const aDesPhases = (markup: string) => (markup ?? "").split("\n").some((l) => RE_PHASE.test(l));

// ── Les phases et leurs champs ────────────────────────────────────────────

export const CHAMP_POSTURE = "Posture de l'enseignant";
export const CHAMP_ORGANISATION = "Organisation";
/** Les champs qu'on peut ajouter à toutes les phases d'une séance, dans l'ordre où ils s'affichent. */
export const CHAMPS_PROPOSES = [CHAMP_ORGANISATION, "Différenciation", "Matériel", "Trace écrite"] as const;

export const ORGANISATIONS = [
  { nom: "Collectif", ico: "👥" }, { nom: "Individuel", ico: "🧍" }, { nom: "Binômes", ico: "👫" },
  { nom: "Groupes", ico: "🧩" }, { nom: "Ateliers", ico: "🔄" },
] as const;
export const iconeOrganisation = (nom: string) =>
  ORGANISATIONS.find((o) => o.nom.toLowerCase() === nom.trim().toLowerCase())?.ico ?? (nom.trim() ? "✏️" : "👥");

export interface ChampDePhase { nom: string; texte: string }
export interface PhaseDeSeance { titre: string; duree: string; deroulement: string; champs: ChampDePhase[] }
export interface SeanceEnPhases { intro: string; phases: PhaseDeSeance[] }

/** Les lignes vides du début et de la fin ne comptent pas. */
const sansBords = (lignes: string[]) => {
  let debut = 0, fin = lignes.length;
  while (debut < fin && !lignes[debut].trim()) debut++;
  while (fin > debut && !lignes[fin - 1].trim()) fin--;
  return lignes.slice(debut, fin).join("\n");
};

const POSTURE = /^\s*\*?\s*(?:posture|r[ôo]le) de l'enseignant\s*:\s*/i;

const plat = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Deux noms de champ pareils, aux majuscules et aux accents près. */
export const memeNom = (a: string, b: string) => plat(a.trim()) === plat(b.trim());

/** Le texte d'un champ de la phase, vide s'il n'y est pas. */
export const champDe = (p: PhaseDeSeance, nom: string) => p.champs.find((c) => memeNom(c.nom, nom))?.texte ?? "";

/**
 * Le texte d'avant les phases, puis les phases, chacune avec son déroulement
 * et ses champs. Une ligne « Posture de l'enseignant : … » écrite dans le
 * déroulement (ainsi s'écrivaient les premières séances en document) rejoint
 * son champ.
 */
export function lireSeance(markup: string): SeanceEnPhases {
  const intro: string[] = [];
  const phases: { titre: string; duree: string; deroulement: string[]; champs: { nom: string; lignes: string[] }[] }[] = [];
  for (const ligne of (markup ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const phase = lirePhase(ligne);
    if (phase) { phases.push({ ...phase, deroulement: [], champs: [] }); continue; }
    const p = phases[phases.length - 1];
    if (!p) { intro.push(ligne); continue; }
    const champ = RE_CHAMP.exec(ligne);
    if (champ) { p.champs.push({ nom: champ[1], lignes: [] }); continue; }
    if (p.champs.length) p.champs[p.champs.length - 1].lignes.push(ligne);
    else p.deroulement.push(ligne);
  }
  return {
    intro: sansBords(intro),
    phases: phases.map((p) => {
      const champs: ChampDePhase[] = p.champs.map((c) => ({ nom: c.nom, texte: sansBords(c.lignes) }));
      let deroulement = p.deroulement;
      const postures = deroulement.filter((l) => POSTURE.test(l));
      if (postures.length && !champs.some((c) => memeNom(c.nom, CHAMP_POSTURE))) {
        deroulement = deroulement.filter((l) => !POSTURE.test(l));
        champs.unshift({ nom: CHAMP_POSTURE, texte: postures.map((l) => l.replace(POSTURE, "").replace(/\*\s*$/, "").trim()).join("\n") });
      }
      return { titre: p.titre, duree: p.duree, deroulement: sansBords(deroulement), champs };
    }),
  };
}

/** Le texte d'une séance en phases. */
export function ecrireSeance(s: SeanceEnPhases): string {
  const lignes: string[] = [];
  if (s.intro.trim()) lignes.push(s.intro);
  for (const p of s.phases) {
    lignes.push(ecrireDocument([{ t: "phase", titre: p.titre, duree: p.duree }]));
    if (p.deroulement.trim()) lignes.push(p.deroulement);
    for (const c of p.champs) {
      lignes.push(`### ${c.nom.replace(/\n/g, " ").trim()}`);
      if (c.texte.trim()) lignes.push(c.texte);
    }
  }
  return lignes.join("\n");
}

/**
 * Les champs des phases de la séance, sans le déroulement : la posture de
 * l'enseignant toujours, puis ceux qu'on a ajoutés — ceux qu'on propose, dans
 * leur ordre, puis ceux qu'on a nommés soi-même.
 */
export function champsDesPhases(phases: PhaseDeSeance[]): string[] {
  const vus: string[] = [];
  for (const p of phases) for (const c of p.champs) if (!vus.some((v) => memeNom(v, c.nom))) vus.push(c.nom);
  const proposes = CHAMPS_PROPOSES.filter((n) => vus.some((v) => memeNom(v, n)));
  const autres = vus.filter((v) => !memeNom(v, CHAMP_POSTURE) && !CHAMPS_PROPOSES.some((n) => memeNom(n, v)));
  return [CHAMP_POSTURE, ...proposes, ...autres];
}

/** Un champ ajouté à toutes les phases, vide là où il n'était pas. */
export function ajouterChamp(markup: string, nom: string): string {
  const s = lireSeance(markup);
  const propre = nom.replace(/\s+/g, " ").trim();
  if (!propre || !s.phases.length) return markup;
  return ecrireSeance({
    ...s,
    phases: s.phases.map((p) => (p.champs.some((c) => memeNom(c.nom, propre)) ? p : { ...p, champs: [...p.champs, { nom: propre, texte: "" }] })),
  });
}

/** Un champ retiré de toutes les phases. */
export function retirerChamp(markup: string, nom: string): string {
  const s = lireSeance(markup);
  return ecrireSeance({ ...s, phases: s.phases.map((p) => ({ ...p, champs: p.champs.filter((c) => !memeNom(c.nom, nom)) })) });
}

/** Les phases où ce champ est rempli. */
export const phasesOuLeChampEstRempli = (markup: string, nom: string) =>
  lireSeance(markup).phases.filter((p) => champDe(p, nom).trim()).length;

// ── Le texte simple : ce qu'en lisent les PDF du jour, la recherche des jeux ──

/** Une ligne sans ses marques : le titre des supports cités reste, la mise en forme s'efface. */
export function texteSansMarques(ligne: string): string {
  return ligne
    .replace(RE_CITE_SUPPORT, (_t, _g, _id, titre: string) => titre)
    .replace(/\[(img|cite):[^\]]+\]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1$2");
}

/** Les lignes d'un texte, en texte simple : listes à puces, images retirées, supports par leur titre. */
function lignesSimples(markup: string, images = false): string[] {
  return lireDocument(markup).flatMap((b): string[] => {
    if (b.t === "image") return images ? [`[img:${b.nom}]`] : [];
    if (b.t === "liste") return b.items.map((x) => `• ${texteSansMarques(x)}`);
    if (b.t === "phase") return [];
    return [texteSansMarques(b.texte)];
  });
}
const enUnBloc = (lignes: string[]) => lignes.join("\n").replace(/\n{3,}/g, "\n\n").trim();

/**
 * Le déroulement en texte simple, pour ce qui n'imprime que du texte : les
 * phases numérotées, avec leur durée et leur organisation ; leurs champs,
 * nommés ; les listes à puces ; les images retirées ; les supports cités par
 * leur titre.
 */
export function texteDuDeroulement(markup: string): string {
  const s = lireSeance(markup);
  const sortie = lignesSimples(s.intro);
  s.phases.forEach((p, i) => {
    const organisation = champDe(p, CHAMP_ORGANISATION).replace(/\s+/g, " ").trim();
    sortie.push(`${i + 1}. ${p.titre.trim() || "Phase"}${p.duree ? ` — ${p.duree}` : ""}${organisation ? ` · ${organisation}` : ""}`);
    sortie.push(...lignesSimples(p.deroulement));
    for (const c of p.champs) {
      if (memeNom(c.nom, CHAMP_ORGANISATION)) continue;
      const lignes = lignesSimples(c.texte).filter((l) => l.trim());
      if (lignes.length) sortie.push(`${c.nom} : ${lignes[0]}`, ...lignes.slice(1));
    }
  });
  return enUnBloc(sortie);
}

// ── Le tableau qu'on tire des phases ──────────────────────────────────────

/**
 * Le tableau des phases que lisent les tablettes, l'impression et les aides
 * à la tâche (« Phase | Durée | Description | Posture de l'enseignant », puis
 * une colonne par champ ajouté) ; rien pour un document sans phases — le
 * tableau d'avant reste alors tel quel. Les images de la phase restent dans
 * sa description.
 */
export function tableauDuDocument(markup: string): string[][] | null {
  const { phases } = lireSeance(markup);
  if (!phases.length) return null;
  const autres = champsDesPhases(phases).slice(1);
  return [[...ENTETE_TABLEAU, ...autres], ...phases.map((p, i) => [
    p.titre.trim() || `Phase ${i + 1}`, p.duree, enUnBloc(lignesSimples(p.deroulement, true)),
    enUnBloc(lignesSimples(champDe(p, CHAMP_POSTURE))), ...autres.map((nom) => enUnBloc(lignesSimples(champDe(p, nom)))),
  ])];
}

// ── Une séance d'avant devient un document ────────────────────────────────

function lireJson<T>(json: string | null | undefined, vide: T): T {
  try { const v = JSON.parse(json || ""); return Array.isArray(v) || (v && typeof v === "object") ? v as T : vide; } catch { return vide; }
}

/**
 * Le document d'une séance. Une séance déjà écrite en document le garde ;
 * une séance d'avant reçoit, après son texte, une phase par ligne de son
 * tableau : le titre et la durée, la description pour déroulement, la
 * posture de l'enseignant et toute autre colonne nommée pour champs ; puis
 * les illustrations qui n'étaient pas encore dans le texte. Rien ne se perd.
 */
export function documentDeLaSeance(s: { deroulement?: string | null; tableauDeroulement?: string | null; imagesDeroulement?: string | null }): string {
  const texte = (s.deroulement ?? "").replace(/\r\n?/g, "\n").trimEnd();
  if (aDesPhases(texte)) return texte;
  const grille = lireJson<unknown[]>(s.tableauDeroulement, []).filter((l): l is unknown[] => Array.isArray(l))
    .map((l) => l.map((c) => (typeof c === "string" ? c : "")));
  const seance: SeanceEnPhases = { intro: texte, phases: [] };
  if (grille.length > 1) {
    const entete = grille[0].map((h) => h.trim());
    const iDuree = entete.findIndex((h) => /dur[ée]e/i.test(h));
    const iDescription = entete.findIndex((h) => /descri|d[ée]roul/i.test(h));
    const lignes = (cellule: string) => cellule.trim().split("\n").map(ligneProtegee).join("\n");
    for (const ligne of grille.slice(1)) {
      if (!ligne.some((c) => c.trim())) continue;
      const champs: ChampDePhase[] = [];
      ligne.forEach((cellule, i) => {
        if (i === 0 || i === iDuree || i === iDescription || !cellule.trim()) return;
        const nom = /posture|r[ôo]le de l'enseignant/i.test(entete[i]) ? CHAMP_POSTURE : entete[i] || "Note";
        champs.push({ nom, texte: lignes(cellule) });
      });
      seance.phases.push({
        titre: (ligne[0] ?? "").replace(/\n/g, " ").trim() || "Phase",
        duree: iDuree > 0 ? dureeLisible((ligne[iDuree] ?? "").replace(/\n/g, " ")) : "",
        deroulement: iDescription >= 0 ? lignes(ligne[iDescription] ?? "") : "",
        champs,
      });
    }
  }
  const dansLeTexte = new Set(imagesDuDocument(ecrireSeance(seance)));
  const illustrations = lireJson<unknown[]>(s.imagesDeroulement, []).filter((x): x is string => typeof x === "string" && !!x && !dansLeTexte.has(x));
  if (illustrations.length) {
    // Au bout du déroulement de la dernière phase, ou du texte s'il n'y en a pas.
    const images = illustrations.map((n) => `[img:${n}]`).join("\n");
    const derniere = seance.phases[seance.phases.length - 1];
    if (derniere) derniere.deroulement = [derniere.deroulement, images].filter(Boolean).join("\n");
    else seance.intro = [seance.intro, images].filter(Boolean).join("\n");
  }
  return ecrireSeance(seance);
}

/** Les images du document, dans l'ordre. */
export function imagesDuDocument(markup: string): string[] {
  return [...(markup ?? "").matchAll(RE_IMAGE)].map((m) => m[1].trim());
}

// ── Les supports cités ────────────────────────────────────────────────────

export interface Citation { genre: GenreCite; id: string; titre: string; /** Le numéro de la phase où il est cité ; 0 avant la première. */ phase: number }

/** Les supports cités, dans l'ordre du texte. */
export function citationsDuDocument(markup: string): Citation[] {
  const sortie: Citation[] = [];
  let phase = 0;
  for (const ligne of (markup ?? "").split("\n")) {
    if (RE_PHASE.test(ligne)) { phase++; continue; }
    for (const m of ligne.matchAll(RE_CITE_SUPPORT)) {
      if ((GENRES as readonly string[]).includes(m[1])) sortie.push({ genre: m[1] as GenreCite, id: m[2], titre: m[3], phase });
    }
  }
  return sortie;
}

// ── En HTML : l'éditeur, et la lecture ────────────────────────────────────

export const echapper = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Une citation d'un document du coffre (« [cite:…] »), lue ; rien si elle est illisible. */
export function lireCitationDuCoffre(b64: string): { texte: string; source: string; page: string } | null {
  try {
    const c = JSON.parse(decodeURIComponent(escape(atob(b64))));
    return c && typeof c.texte === "string" ? { texte: c.texte, source: String(c.source ?? ""), page: String(c.page ?? "") } : null;
  } catch {
    return null;
  }
}

/**
 * Une ligne de texte en HTML : le texte échappé, le gras et l'italique, les
 * supports cités en pastilles. Dans l'éditeur (`edition`), les pastilles et
 * les citations du coffre ne se modifient pas au clavier et gardent de quoi
 * se réécrire.
 */
export function ligneEnHtml(ligne: string, edition = false): string {
  const RE = /\[@([a-z]+):([^|\]]+)\|([^\]]*)\]|\[cite:([^\]]+)\]/g;
  let out = "", dernier = 0, m: RegExpExecArray | null;
  const texte = (t: string) => echapper(t)
    .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<i>$2</i>");
  while ((m = RE.exec(ligne))) {
    out += texte(ligne.slice(dernier, m.index));
    if (m[4] !== undefined) {
      // Dans l'éditeur, la citation tient sur une ligne ; à la lecture et à l'impression, elle se lit en entier.
      const c = lireCitationDuCoffre(m[4]);
      const source = c && (c.source || c.page) ? `${echapper(c.source)}${c.page ? `${c.source ? ", " : ""}p. ${echapper(c.page)}` : ""}` : "";
      if (edition) {
        const vu = c ? `« ${echapper(c.texte.length > 80 ? `${c.texte.slice(0, 77)}…` : c.texte)} »${source ? ` — ${source}` : ""}` : "« citation »";
        out += `<span class="doc-citation" contenteditable="false" data-brut="${echapper(m[0])}">${vu}</span>`;
      } else if (c) {
        out += `<span class="doc-citation">« ${echapper(c.texte)} »${source ? ` <span class="doc-source">— ${source}</span>` : ""}</span>`;
      }
    } else {
      const genre = (GENRES as readonly string[]).includes(m[1]) ? m[1] as GenreCite : "materiel";
      const vu = `${ICONE_CITE[genre]} ${echapper(m[3])}`;
      out += edition
        ? `<span class="cite cite-${genre}" contenteditable="false" data-cite="${genre}:${echapper(m[2])}" data-titre="${echapper(m[3])}">${vu}</span>`
        : `<span class="cite cite-${genre}">${vu}</span>`;
    }
    dernier = m.index + m[0].length;
  }
  return out + texte(ligne.slice(dernier));
}

/**
 * Un texte en HTML — l'introduction, le déroulement d'une phase, un champ.
 * Pour l'éditeur (`edition`) : chaque bloc garde de quoi se réécrire (voir
 * EditeurDeroulement) ; les images n'ont que leur nom (`data-fichier`) et se
 * chargent ensuite. Pour la lecture et l'impression : `image` donne la source
 * de chaque image.
 */
export function documentEnHtml(markup: string, options: { edition?: boolean; image?: (nom: string) => string | undefined } = {}): string {
  const { edition = false, image } = options;
  if (!(markup ?? "").trim()) return edition ? "<p><br></p>" : "";
  let n = 0;
  const html = lireDocument(markup).map((b) => {
    if (b.t === "phase") {
      n++;
      const duree = b.duree ? echapper(b.duree) : "";
      return `<h3 class="doc-phase"><span class="doc-numero">${n}</span>${echapper(b.titre)}${duree ? `<span class="doc-duree">${duree}</span>` : ""}</h3>`;
    }
    if (b.t === "image") {
      const src = image?.(b.nom);
      return edition
        ? `<figure class="doc-image" contenteditable="false" data-img="${echapper(b.nom)}"><img data-fichier="${echapper(b.nom)}" alt=""></figure>`
        : src ? `<figure class="doc-image"><img src="${src}" alt=""></figure>` : "";
    }
    if (b.t === "liste") return `<ul>${b.items.map((x) => `<li>${ligneEnHtml(x, edition) || "<br>"}</li>`).join("")}</ul>`;
    return `<p>${ligneEnHtml(b.texte, edition) || "<br>"}</p>`;
  }).join("");
  return html || (edition ? "<p><br></p>" : "");
}

/**
 * La séance à lire, en cartes, comme dans l'éditeur : le texte d'avant, puis
 * chaque phase — son numéro, son titre, sa durée, son organisation ; son
 * déroulement et la posture de l'enseignant côte à côte ; ses autres champs
 * remplis dessous.
 */
export function seanceEnCartes(markup: string, image?: (nom: string) => string | undefined): string {
  const s = lireSeance(markup);
  const html = (m: string) => documentEnHtml(m, { image });
  const intro = s.intro.trim() ? `<div class="doc-intro">${html(s.intro)}</div>` : "";
  return intro + s.phases.map((p, i) => {
    const organisation = champDe(p, CHAMP_ORGANISATION).replace(/\s+/g, " ").trim();
    const autres = p.champs.filter((c) => !memeNom(c.nom, CHAMP_POSTURE) && !memeNom(c.nom, CHAMP_ORGANISATION) && c.texte.trim());
    return `<section class="ph"><div class="ph-tete"><span class="ph-n">${i + 1}</span><h3 class="ph-titre-lu">${echapper(p.titre.trim() || "Phase")}</h3>`
      + (p.duree ? `<span class="ph-chip">${echapper(p.duree)}</span>` : "")
      + (organisation ? `<span class="ph-orga">${iconeOrganisation(organisation)} ${echapper(organisation)}</span>` : "") + "</div>"
      + `<div class="ph-corps"><div class="ph-col"><span class="ph-label">Déroulement</span>${html(p.deroulement) || "<p>—</p>"}</div>`
      + `<div class="ph-col ph-posture"><span class="ph-label">${echapper(CHAMP_POSTURE)}</span>${html(champDe(p, CHAMP_POSTURE)) || "<p>—</p>"}</div></div>`
      + autres.map((c) => `<div class="ph-champ"><span class="ph-label">${echapper(c.nom)}</span>${html(c.texte)}</div>`).join("")
      + "</section>";
  }).join("");
}
