// Le déroulement d'une séance, écrit comme un document (demande de
// l'enseignant, octobre 2026) : des phases numérotées avec leur durée, du
// texte mis en forme, des listes, des images, et les supports cités dans le
// texte.
//
// Il reste du texte, ligne à ligne, et non du HTML : deux ordinateurs le
// fusionnent caractère par caractère (voir texte_crdt.rs), et une balise
// coupée par une fusion casserait la page. Les marques sont courtes :
//
//   ## Mise en route (5 min)          une phase, sa durée entre parenthèses
//   Du texte, **en gras**, *en italique*.
//   - un élément de liste
//   [img:photo.jpg]                   une image, seule sur sa ligne
//   [@outil:o1|Réglette de lecture]   un support cité (outil, affichage,
//                                     évaluation, jeu, materiel, feuille)
//   [cite:…]                          une citation d'un document du coffre
//
// Le tableau des phases (`tableauDeroulement`) que lisent les tablettes,
// l'impression et les aides à la tâche se tire des phases du document à
// chaque enregistrement (`tableauDuDocument`) : ils n'ont rien à apprendre.
// Une séance d'avant, au tableau rempli, devient un document à son ouverture
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

const RE_PHASE = /^##\s+(.*)$/;
/** La durée en fin de titre de phase : « (5 min) », « (1 h) », « (1 h 30) », « (5-10 min) », « (10') ». */
const RE_DUREE_FIN = /\s*\(\s*(\d+(?:\s*[-–]\s*\d+)?\s*(?:min(?:utes?)?|h(?:\s*\d+)?|'))\s*\)\s*$/i;
const RE_LISTE = /^\s*(?:[-•]|\*(?=\s))\s+(.*)$/;
const RE_IMAGE_SEULE = /^\s*\[img:([^\]]+)\]\s*$/;
const RE_IMAGE = /\[img:([^\]]+)\]/g;
const RE_CITE_SUPPORT = /\[@([a-z]+):([^|\]]+)\|([^\]]*)\]/g;

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

/** Les blocs du document, ligne à ligne. Une image au milieu d'une ligne en sort, en bloc à elle. */
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
    let reste = brute, m: RegExpExecArray | null;
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
    if (!coupee || reste.trim()) blocs.push({ t: "texte", texte: coupee ? reste.trimStart() : brute });
  }
  return blocs;
}

/** Le document qu'écrivent ces blocs. */
export function ecrireDocument(blocs: Bloc[]): string {
  return blocs.flatMap((b): string[] => {
    if (b.t === "phase") return [`## ${b.titre.replace(/\n/g, " ").trim() || "Phase"}${b.duree.trim() ? ` (${b.duree.trim()})` : ""}`];
    if (b.t === "image") return [`[img:${b.nom}]`];
    if (b.t === "liste") return b.items.map((x) => `- ${x.replace(/\n/g, " ")}`);
    return [b.texte.replace(/\n/g, " ")];
  }).join("\n");
}

/** Le document a-t-il des phases ? Sinon, c'est un texte d'avant, ou une séance sans phases. */
export const aDesPhases = (markup: string) => (markup ?? "").split("\n").some((l) => RE_PHASE.test(l));

// ── Le texte simple : ce qu'en lisent les PDF du jour, la recherche des jeux ──

/** Une ligne sans ses marques : le titre des supports cités reste, la mise en forme s'efface. */
export function texteSansMarques(ligne: string): string {
  return ligne
    .replace(RE_CITE_SUPPORT, (_t, _g, _id, titre: string) => titre)
    .replace(/\[(img|cite):[^\]]+\]/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1$2");
}

/**
 * Le déroulement en texte simple, pour ce qui n'imprime que du texte : les
 * phases numérotées, avec leur durée ; les listes à puces ; les images
 * retirées ; les supports cités par leur titre.
 */
export function texteDuDeroulement(markup: string): string {
  let n = 0;
  return lireDocument(markup).flatMap((b): string[] => {
    if (b.t === "phase") { n++; return [`${n}. ${b.titre}${b.duree ? ` — ${b.duree}` : ""}`]; }
    if (b.t === "image") return [];
    if (b.t === "liste") return b.items.map((x) => `• ${texteSansMarques(x)}`);
    return [texteSansMarques(b.texte)];
  }).join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ── Les phases, et le tableau qu'on en tire ───────────────────────────────

export interface PhaseDuDocument {
  numero: number;
  titre: string;
  duree: string;
  /** Les blocs de la phase, jusqu'à la suivante. */
  blocs: Bloc[];
}

/** Ce qui précède la première phase, et les phases. */
export function phasesDuDocument(markup: string): { avant: Bloc[]; phases: PhaseDuDocument[] } {
  const avant: Bloc[] = [];
  const phases: PhaseDuDocument[] = [];
  for (const b of lireDocument(markup)) {
    if (b.t === "phase") phases.push({ numero: phases.length + 1, titre: b.titre, duree: b.duree, blocs: [] });
    else (phases.length ? phases[phases.length - 1].blocs : avant).push(b);
  }
  return { avant, phases };
}

const POSTURE = /^\s*\*?\s*posture de l'enseignant\s*:\s*/i;

/**
 * Le tableau des phases que lisent les tablettes, l'impression et les aides
 * à la tâche (« Phase | Durée | Description | Posture de l'enseignant ») ;
 * rien pour un document sans phases — le tableau d'avant reste alors tel
 * quel. Une ligne « Posture de l'enseignant : … » va dans sa colonne ; les
 * images de la phase restent dans sa description.
 */
export function tableauDuDocument(markup: string): string[][] | null {
  const { phases } = phasesDuDocument(markup);
  if (!phases.length) return null;
  return [[...ENTETE_TABLEAU], ...phases.map((p) => {
    const description: string[] = [];
    const posture: string[] = [];
    for (const b of p.blocs) {
      if (b.t === "image") { description.push(`[img:${b.nom}]`); continue; }
      const lignes = b.t === "liste" ? b.items.map((x) => `• ${texteSansMarques(x)}`) : b.t === "texte" ? [texteSansMarques(b.texte)] : [];
      for (const l of lignes) {
        if (POSTURE.test(l)) posture.push(l.replace(POSTURE, "").replace(/\*\s*$/, "").trim());
        else description.push(l);
      }
    }
    return [p.titre, p.duree, description.join("\n").replace(/\n{3,}/g, "\n\n").trim(), posture.join("\n").trim()];
  })];
}

// ── Une séance d'avant devient un document ────────────────────────────────

function lireJson<T>(json: string | null | undefined, vide: T): T {
  try { const v = JSON.parse(json || ""); return Array.isArray(v) || (v && typeof v === "object") ? v as T : vide; } catch { return vide; }
}

/**
 * Le document d'une séance. Une séance déjà écrite en document le garde ;
 * une séance d'avant reçoit, après son texte, une phase par ligne de son
 * tableau (« Phase », « Durée », la description, la posture de l'enseignant
 * et toute autre colonne nommée), puis les illustrations qui n'étaient pas
 * encore dans le texte. Rien ne se perd.
 */
export function documentDeLaSeance(s: { deroulement?: string | null; tableauDeroulement?: string | null; imagesDeroulement?: string | null }): string {
  const texte = (s.deroulement ?? "").replace(/\r\n?/g, "\n").trimEnd();
  if (aDesPhases(texte)) return texte;
  const grille = lireJson<unknown[]>(s.tableauDeroulement, []).filter((l): l is unknown[] => Array.isArray(l))
    .map((l) => l.map((c) => (typeof c === "string" ? c : "")));
  const morceaux: string[] = texte ? [texte] : [];
  if (grille.length > 1) {
    const entete = grille[0].map((h) => h.trim());
    const iDuree = entete.findIndex((h) => /dur[ée]e/i.test(h));
    const iDescription = entete.findIndex((h) => /descri|d[ée]roul/i.test(h));
    for (const ligne of grille.slice(1)) {
      if (!ligne.some((c) => c.trim())) continue;
      const titre = (ligne[0] ?? "").replace(/\n/g, " ").trim() || "Phase";
      const duree = iDuree > 0 ? dureeLisible((ligne[iDuree] ?? "").replace(/\n/g, " ")) : "";
      const corps: string[] = [];
      ligne.forEach((cellule, i) => {
        if (i === 0 || i === iDuree || !cellule.trim()) return;
        if (i === iDescription) { corps.push(...cellule.trim().split("\n")); return; }
        const nom = entete[i] || "Note";
        corps.push(/posture/i.test(nom) ? `*${nom} : ${cellule.trim().replace(/\n/g, " ")}*` : `${nom} : ${cellule.trim().replace(/\n/g, " ")}`);
      });
      morceaux.push([`## ${titre}${duree ? ` (${duree})` : ""}`, ...corps].join("\n"));
    }
  }
  let doc = morceaux.join("\n");
  const dansLeTexte = new Set(imagesDuDocument(doc));
  const illustrations = lireJson<unknown[]>(s.imagesDeroulement, []).filter((x): x is string => typeof x === "string" && !!x && !dansLeTexte.has(x));
  if (illustrations.length) doc = [doc, ...illustrations.map((n) => `[img:${n}]`)].filter(Boolean).join("\n");
  return doc;
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
 * Le document en HTML. Pour l'éditeur (`edition`) : chaque bloc garde de quoi
 * se réécrire en document (voir EditeurDeroulement) ; les images n'ont que
 * leur nom (`data-fichier`) et se chargent ensuite. Pour la lecture et
 * l'impression : `image` donne la source de chaque image.
 */
export function documentEnHtml(markup: string, options: { edition?: boolean; image?: (nom: string) => string | undefined } = {}): string {
  const { edition = false, image } = options;
  let n = 0;
  const html = lireDocument(markup).map((b) => {
    if (b.t === "phase") {
      n++;
      const duree = b.duree ? echapper(b.duree) : "";
      return edition
        ? `<h3 class="doc-phase" data-bloc="phase" data-duree="${duree}">${echapper(b.titre)}<span class="doc-duree" contenteditable="false" data-ignorer="1">${duree || "durée"}</span></h3>`
        : `<h3 class="doc-phase"><span class="doc-numero">${n}</span>${echapper(b.titre)}${duree ? `<span class="doc-duree">${duree}</span>` : ""}</h3>`;
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
