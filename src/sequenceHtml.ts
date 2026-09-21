// Une séquence et ses séances en page HTML : pour l'imprimer, et pour la
// copie du bureau sur l'ordinateur, qui en fait une page à ouvrir d'un
// double-clic.
//
// Les images sont désignées par leur nom de fichier dans Maitrize ; `image`
// dit quoi mettre dans la source : l'image lue (impression) ou un marqueur
// que le backend remplace en écrivant la page (copie).

import { formatDuree, type Jeu, type PieceJointe, type Seance, type Sequence } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { colonnesDuTableau, escapeHtml } from "./print";
import { jeuxCites, reglesImprimees, sansMarqueurs } from "./jeuxCites";

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

/** Le corps de la page d'une séquence. */
export function htmlDeLaSequence(
  seq: Sequence, seances: Seance[], pieces: PieceJointe[], jeux: Jeu[], image: (nom: string) => string | undefined,
): string {
  const img = (nom: string) => { const src = image(nom); return src ? `<img alt="" src="${src}">` : ""; };
  const rendreTexte = (txt: string) => {
    const re = /\[(img|cite):([^\]]+)\]/g;
    let out = "", last = 0, m: RegExpExecArray | null;
    while ((m = re.exec(txt))) {
      out += escapeHtml(txt.slice(last, m.index));
      if (m[1] === "img") out += img(m[2]);
      else {
        try {
          const c = JSON.parse(decodeURIComponent(escape(atob(m[2]))));
          out += `<blockquote>« ${escapeHtml(c.texte)} »${c.source || c.page ? `<div style="font-size:11px;color:#687087">— ${escapeHtml(c.source)}${c.page ? ", p. " + escapeHtml(c.page) : ""}</div>` : ""}</blockquote>`;
        } catch { /* citation illisible */ }
      }
      last = m.index + m[0].length;
    }
    out += escapeHtml(txt.slice(last));
    return `<div class="pre">${out}</div>`;
  };

  let comp = "";
  try { const c = seq.competenceVisee ? JSON.parse(seq.competenceVisee) : null; if (c) comp = labelCourt(c); } catch { /* ignore */ }

  const seancesHtml = seances.map((s) => {
    const comps = liste<CompetenceSelectionnee>(s.competences);
    const grid = liste<string[]>(s.tableauDeroulement);
    const illus = liste<string>(s.imagesDeroulement);
    const pj = pieces.filter((p) => p.seanceId === s.id && p.type === "image").map((p) => p.nomFichier);
    return `<div class="seance">
      <h3>Séance ${s.numero} — ${escapeHtml(s.titre)}</h3>
      <div class="meta">${formatDuree(s.duree)}${s.date ? " · " + new Date(s.date).toLocaleDateString("fr-FR") : ""}</div>
      ${s.objectifs ? `<div class="label">Objectifs</div><div class="pre">${escapeHtml(s.objectifs)}</div>` : ""}
      ${comps.length ? `<div class="label">Compétences</div>${comps.map((c) => `<span class="chip">${escapeHtml(labelCourt(c))}</span>`).join("")}` : ""}
      ${s.deroulement ? `<div class="label">Déroulement</div>${rendreTexte(s.deroulement)}${reglesImprimees(jeuxCites(sansMarqueurs(s.deroulement), jeux))}` : ""}
      ${grid.length ? `<table class="colonnes">${colonnesDuTableau(grid[0])}${grid.map((row, r) => `<tr>${row.map((c) => r === 0 ? `<th>${escapeHtml(c)}</th>` : `<td>${rendreTexte(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}
      ${illus.map(img).join("")}
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
