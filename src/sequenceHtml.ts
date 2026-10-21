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
import { documentDeLaSeance, documentEnHtml } from "./documentSeance";

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

/** Le déroulement imprimé : ses phases numérotées, leur durée, les supports cités. */
export const STYLE_DOCUMENT = `
  .doc-lu p { margin: 3px 0; }
  .doc-lu ul { margin: 3px 0 3px 18px; padding: 0; }
  .doc-lu .doc-phase { display: flex; align-items: baseline; gap: 8px; font-size: 13.5px; margin: 12px 0 4px;
    padding-bottom: 3px; border-bottom: 1px solid #e3e6ef; break-after: avoid; page-break-after: avoid; }
  .doc-lu .doc-numero { display: inline-block; min-width: 20px; height: 20px; line-height: 20px; text-align: center;
    border-radius: 50%; background: #eef0fe; color: #4338ca; font-size: 11px; font-weight: 700; }
  .doc-lu .doc-duree { margin-left: auto; font-size: 11px; font-weight: 600; color: #687087; }
  .doc-lu .cite { border-radius: 5px; padding: 0 5px; background: #f0f2f8; font-weight: 600; }
  .doc-lu .doc-citation { display: block; border-left: 3px solid #6366f1; background: #eef0fe; margin: 6px 0; padding: 4px 10px; font-style: italic; }
  .doc-lu .doc-source { font-style: normal; font-size: 11px; color: #687087; }
  .doc-lu .doc-image { margin: 6px 0; break-inside: avoid; }
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
      ${doc ? `<div class="label">Déroulement</div><div class="doc-lu">${documentEnHtml(doc, { image })}</div>${reglesImprimees(jeuxCites(sansMarqueurs(doc), jeux))}` : ""}
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
