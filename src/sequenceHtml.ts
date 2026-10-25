// Une séquence et ses séances en page HTML : pour l'imprimer, et pour la
// copie du bureau sur l'ordinateur, qui en fait une page à ouvrir d'un
// double-clic.
//
// Les images sont désignées par leur nom de fichier dans Maitrize ; `image`
// dit quoi mettre dans la source : l'image lue (impression) ou un marqueur
// que le backend remplace en écrivant la page (copie).

import { formatDuree, type Jeu, type PieceJointe, type Seance, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { escapeHtml } from "./print";
import { jeuxCites, reglesImprimees, sansMarqueurs } from "./jeuxCites";
import { lireConsignes } from "./tapuscrit";
import {
  CHAMP_ORGANISATION, CHAMP_POSTURE, champDe, champsDesPhases, documentDeLaSeance, documentEnHtml, lireSeance, memeNom,
} from "./documentSeance";

const liste = <T>(json: string | null | undefined): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
const labelCourt = (c: CompetenceSelectionnee) => (c.niveau ? `[${c.niveau}] ` : "") + c.competenceTitre;
const MARQUE_IMAGE = /\[img:([^\]]+)\]/g;

/** Les images d'une séquence : dans le déroulement et le tableau, en illustration, en pièce jointe. */
export function imagesDeLaSequence(seances: Seance[], pieces: PieceJointe[]): string[] {
  const noms = new Set<string>();
  const dans = (texte: string) => { for (const m of (texte ?? "").matchAll(MARQUE_IMAGE)) noms.add(m[1]); };
  for (const s of seances) {
    dans(s.deroulement);
    liste<string>(s.imagesDeroulement).forEach((f) => noms.add(f));
    liste<string[]>(s.tableauDeroulement).forEach((rang) => rang.forEach(dans));
  }
  pieces.filter((p) => p.type === "image" && seances.some((s) => s.id === p.seanceId)).forEach((p) => noms.add(p.nomFichier));
  return [...noms];
}

/**
 * Le déroulement imprimé comme une fiche de préparation : le texte d'avant les
 * phases, puis un tableau — une ligne par phase ; une colonne pour son
 * organisation si l'une est notée, son déroulement, la posture de
 * l'enseignant, puis chaque champ ajouté qu'une phase au moins remplit.
 */
export function seanceEnTableau(markup: string, image: (nom: string) => string | undefined): string {
  const s = lireSeance(markup);
  const html = (m: string) => documentEnHtml(m, { image });
  const intro = s.intro.trim() ? html(s.intro) : "";
  if (!s.phases.length) return intro;
  const rempli = (nom: string) => s.phases.some((p) => champDe(p, nom).trim());
  const avecOrganisation = rempli(CHAMP_ORGANISATION);
  const autres = champsDesPhases(s.phases).slice(1).filter((n) => !memeNom(n, CHAMP_ORGANISATION) && rempli(n));
  const entetes = ["Phase", "Durée", ...(avecOrganisation ? [CHAMP_ORGANISATION] : []), "Déroulement", CHAMP_POSTURE, ...autres];
  // Chaque colonne à sa mesure : le déroulement porte le texte, la durée tient « 15 min » et son intitulé.
  const part = (e: string) => (e === "Phase" ? 1.3 : e === "Durée" ? 1.1 : e === CHAMP_ORGANISATION ? 1.5 : e === "Déroulement" ? 4.6 : e === CHAMP_POSTURE ? 2.2 : 2);
  const total = entetes.reduce((t, e) => t + part(e), 0);
  const colonnes = `<colgroup>${entetes.map((e) => `<col style="width:${((part(e) / total) * 100).toFixed(1)}%">`).join("")}</colgroup>`;
  const lignes = s.phases.map((p, i) => `<tr><td><b>${i + 1}. ${escapeHtml(p.titre.trim() || "Phase")}</b></td><td class="duree">${escapeHtml(p.duree)}</td>`
    + (avecOrganisation ? `<td>${escapeHtml(champDe(p, CHAMP_ORGANISATION))}</td>` : "")
    + `<td>${html(p.deroulement)}</td><td>${html(champDe(p, CHAMP_POSTURE))}</td>`
    + autres.map((nom) => `<td>${html(champDe(p, nom))}</td>`).join("") + "</tr>");
  return `${intro}<table class="colonnes doc-tableau">${colonnes}<tr>${entetes.map((e) => `<th>${escapeHtml(e)}</th>`).join("")}</tr>${lignes.join("")}</table>`;
}

/** Le déroulement imprimé : le tableau des phases, les supports cités en pastilles. */
export const STYLE_DOCUMENT = `
  .doc-lu table.doc-tableau { margin: 6px 0 2px; }
  .doc-lu table.doc-tableau th { word-break: normal; overflow-wrap: normal; }
  .doc-lu table.doc-tableau td.duree { white-space: nowrap; }
  .doc-lu table.doc-tableau td p { margin: 0 0 3px; }
  .doc-lu table.doc-tableau td ul { margin: 0 0 3px 14px; padding: 0; }
  .doc-lu p { margin: 3px 0; }
  .doc-lu ul { margin: 3px 0 3px 18px; padding: 0; }
  .doc-lu .cite { border-radius: 5px; padding: 0 5px; background: #f0f2f8; font-weight: 600; }
  .doc-lu .doc-citation { display: block; border-left: 3px solid #6366f1; background: #eef0fe; margin: 6px 0; padding: 4px 10px; font-style: italic; }
  .doc-lu .doc-source { font-style: normal; font-size: 11px; color: #687087; }
  .doc-lu .doc-image { margin: 6px 0; break-inside: avoid; }
  .doc-lu table.doc-grille { width: 100%; margin: 4px 0 6px; border-collapse: collapse; break-inside: avoid; }
  .doc-lu table.doc-grille th, .doc-lu table.doc-grille td { padding: 3px 6px; border: 1px solid #cfd4e0; text-align: left; vertical-align: top; }
  .doc-lu table.doc-grille th { background: #f0f2f8; }
  .doc-lu .doc-c-rouge { color: #b91c1c; } .doc-lu .doc-c-orange { color: #c2410c; } .doc-lu .doc-c-vert { color: #15803d; }
  .doc-lu .doc-c-bleu { color: #1d4ed8; } .doc-lu .doc-c-violet { color: #7e22ce; }
  .doc-lu [class*="doc-fond-"], .doc-lu table.doc-grille th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .doc-lu .doc-fond-jaune { background: rgba(250, 204, 21, .45); } .doc-lu .doc-fond-vert { background: rgba(34, 197, 94, .3); }
  .doc-lu .doc-fond-bleu { background: rgba(59, 130, 246, .3); } .doc-lu .doc-fond-rose { background: rgba(236, 72, 153, .3); }
`;

/** Le corps de la page d'une séquence. */
export function htmlDeLaSequence(
  seq: Sequence, seances: Seance[], pieces: PieceJointe[], jeux: Jeu[], image: (nom: string) => string | undefined,
): string {
  const img = (nom: string) => { const src = image(nom); return src ? `<img alt="" src="${src}">` : ""; };
  let comp = "";
  try { const c = seq.competenceVisee ? JSON.parse(seq.competenceVisee) : null; if (c) comp = labelCourt(c); } catch { /* ignore */ }

  const seancesHtml = seances.map((s) => {
    const comps = liste<CompetenceSelectionnee>(s.competences);
    // Le déroulement en document : ses phases, ses images, le tableau et les illustrations d'avant compris.
    const doc = documentDeLaSeance(s);
    const pj = pieces.filter((p) => p.seanceId === s.id && p.type === "image").map((p) => p.nomFichier);
    return `<div class="seance">
      <h3>Séance ${s.numero} — ${escapeHtml(s.titre)}</h3>
      <div class="meta">${formatDuree(s.duree)}${s.date ? " · " + new Date(s.date).toLocaleDateString("fr-FR") : ""}</div>
      ${s.objectifs ? `<div class="label">Objectifs</div><div class="pre">${escapeHtml(s.objectifs)}</div>` : ""}
      ${lireConsignes(s.consignes).length ? `<div class="label">Consignes pour les élèves</div><ol class="consignes">${lireConsignes(s.consignes).map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ol>` : ""}
      ${comps.length ? `<div class="label">Compétences</div>${comps.map((c) => `<span class="chip">${escapeHtml(labelCourt(c))}</span>`).join("")}` : ""}
      ${doc ? `<div class="label">Déroulement</div><div class="doc-lu">${seanceEnTableau(doc, image)}</div>${reglesImprimees(jeuxCites(sansMarqueurs(doc), jeux))}` : ""}
      ${s.materiel ? `<div class="label">Matériel</div><div class="pre">${escapeHtml(s.materiel)}</div>` : ""}
      ${pj.map(img).join("")}
      ${s.bilan ? `<div class="label">Bilan</div><div class="pre">${escapeHtml(s.bilan)}</div>` : ""}
    </div>`;
  }).join("");

  return `
    <h1>${escapeHtml(seq.titre)}</h1>
    <div class="meta">${[seq.matiere, seq.cycle, "Période " + seq.periode, seq.annee].filter(Boolean).map(escapeHtml).join(" · ")}</div>
    ${comp ? `<div class="chip">🎯 ${escapeHtml(comp)}</div>` : ""}
    ${seq.objectifs ? `<div class="label">Objectifs / notes</div><div class="pre">${escapeHtml(seq.objectifs)}</div>` : ""}
    <h2>Séances (${seances.length})</h2>
    ${seancesHtml || "<div class='meta'>Aucune séance.</div>"}`;
}
