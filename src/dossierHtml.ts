// Le dossier d'un élève, mis en page : pour l'imprimer depuis l'onglet
// Dossier, et pour l'exporter à la fin de l'année (voir `finDAnnee.ts`).
//
// L'export en dit plus que l'impression : il est la seule trace qui restera
// quand l'élève aura quitté Maitrize. S'y ajoutent ses temps d'observation et
// le contenu de ses documents — PPI, GEVA-Sco, dispositifs —, lisibles sans
// l'application.

import { couleurObservation } from "./components/TypeObservation";
import { infosReussite, lireLiens, intitulesDesObjectifs } from "./objectifsPpi";
import { documentImprimable, escapeHtml } from "./print";
import { construire, Dossier, piecesAttendues } from "./dossier";
import { api, type DocumentEleve, type Eleve, type ObservationEleve } from "./api";

/**
 * Le dossier tel qu'il s'imprime : axes, pièces, observations, évaluations,
 * papiers. `suite` vient avant la mention de fin, qui reste la dernière ligne.
 */
export function corpsDuDossier(d: Dossier, objectifs: Record<string, string>, suite = ""): string {
  const section = (titre: string, corps: string) =>
    corps ? `<h2>${escapeHtml(titre)}</h2>${corps}` : "";
  const liste = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "";

  return `<h1>${escapeHtml(d.eleve.nom)}</h1>
     <div class="meta">${[d.eleve.niveau, d.age !== undefined && `${d.age} ans`,
        d.eleve.ine && `INE ${d.eleve.ine}`].filter(Boolean).map((x) => escapeHtml(String(x))).join(" · ")}
        · édité le ${new Date().toLocaleDateString("fr-FR")}</div>

     ${section("Axes de travail", liste(d.observations.axes.map((a) =>
        `${escapeHtml(a.texte)} <span class="meta">(${new Date(a.date).toLocaleDateString("fr-FR")})</span>`)))}

     ${section("Pièces du dossier",
        `<table><tr><th>Pièce</th><th>État</th></tr>${d.pieces.map((p) =>
          `<tr><td>${escapeHtml(p.label)}</td><td>${p.rempli
            ? "renseignée" + (p.dateMaj ? ` le ${new Date(p.dateMaj).toLocaleDateString("fr-FR")}` : "")
            : "à remplir"}</td></tr>`).join("")}</table>`)}

     ${d.observations.parType.map((g) => {
        // La couleur de la catégorie, comme à l'écran.
        const c = couleurObservation(g.type);
        return g.items.length ? `<h2 style="border-bottom-color:${c}"><span class="chip" style="background:${c}1f;color:${c};border:1px solid ${c}55;font-size:13px">${escapeHtml(g.type)}</span> Observations</h2>
          <ul style="border-left:4px solid ${c};padding-left:22px;margin-left:2px">${g.items.map((o) => {
            // L'objectif travaillé accompagne l'observation : c'est ce qui rend
            // le dossier utilisable en ESS, où l'on demande des preuves datées.
            const vises = lireLiens(o.objectifs).filter((l) => objectifs[l.id]);
            const cible = vises.length
              ? ` <span class="meta">🎯 ${vises.map((l) => `${escapeHtml(objectifs[l.id])} ${infosReussite(l.reussite).icone}`).join(" · ")}</span>`
              : "";
            return `<li>${escapeHtml(o.texte)} <span class="meta">(${new Date(o.date).toLocaleDateString("fr-FR")})</span>${cible}</li>`;
          }).join("")}</ul>` : "";
      }).join("")}

     ${section("Évaluations", d.notes.length
        ? `<table><tr><th>Évaluation</th><th>Date</th><th>Note</th></tr>${d.notes.map((l) =>
            `<tr><td>${escapeHtml(l.evaluation.titre)}<div class="meta">${escapeHtml(l.evaluation.matiere)}</div></td>
              <td>${new Date(l.evaluation.date).toLocaleDateString("fr-FR")}</td>
              <td>${l.note.note} / ${l.evaluation.bareme}</td></tr>`).join("")}</table>`
        : "")}

     ${section("Papiers", liste(d.papiers.map((p) =>
        `${escapeHtml(p.type)} — ${escapeHtml(p.intitule)}`)))}

     ${suite}

     <div class="meta" style="margin-top:16px;font-style:italic">
       Document interne. Il contient des données personnelles d'élève : à ne pas
       diffuser hors de l'équipe.</div>`;
}

// ── Ce que l'export ajoute ────────────────────────────────────────────────

/** Les champs techniques d'un document, qui ne disent rien à un lecteur. */
const CLES_TECHNIQUES = new Set(["id", "eleveId", "version", "_v"]);

/** « natureDifficultes » → « Nature difficultes » : le nom d'un champ, lisible. */
export function libelle(cle: string): string {
  const mots = cle.replace(/[_-]+/g, " ").replace(/([a-zà-ÿ0-9])([A-Z])/g, "$1 $2").toLowerCase().trim();
  return mots.charAt(0).toUpperCase() + mots.slice(1);
}

/** Une valeur d'un document, en HTML : le texte tel quel, les listes en listes, rien pour le vide. */
export function valeurHtml(v: unknown): string {
  if (v == null || v === "" || v === false) return "";
  if (typeof v === "string") return v.trim() ? `<span class="pre">${escapeHtml(v.trim())}</span>` : "";
  if (typeof v === "number") return String(v);
  if (v === true) return "oui";
  if (Array.isArray(v)) {
    const items = v.map(valeurHtml).filter(Boolean);
    if (!items.length) return "";
    if (v.every((x) => x === null || typeof x !== "object")) return items.join(", ");
    return `<ol>${items.map((i) => `<li>${i}</li>`).join("")}</ol>`;
  }
  if (typeof v === "object") {
    const lignes = Object.entries(v as Record<string, unknown>)
      .filter(([k]) => !CLES_TECHNIQUES.has(k))
      .map(([k, x]) => [k, valeurHtml(x)] as const)
      .filter(([, h]) => h);
    if (!lignes.length) return "";
    return `<dl class="doc">${lignes.map(([k, h]) => `<dt>${escapeHtml(libelle(k))}</dt><dd>${h}</dd>`).join("")}</dl>`;
  }
  return "";
}

/** Le nom d'un document, d'après son type. */
function nomDuDocument(type: string, ime: boolean): string {
  const connu = piecesAttendues(ime).find((p) => p.typeDoc === type) ?? piecesAttendues(!ime).find((p) => p.typeDoc === type);
  if (connu) return connu.label;
  const dispositif = type.match(/^dispositif:(.+)$/);
  if (dispositif) return dispositif[1].toUpperCase();
  const noms: Record<string, string> = { synthese: "Synthèse", competences: "Compétences travaillées" };
  return noms[type] ?? libelle(type);
}

/** Le contenu des documents de l'élève, document par document. */
export function documentsHtml(docs: DocumentEleve[], ime: boolean): string {
  const parties = docs.map((doc) => {
    let valeur: unknown = doc.donnees;
    try { valeur = JSON.parse(doc.donnees); } catch { /* un texte simple */ }
    const contenu = valeurHtml(valeur);
    if (!contenu) return "";
    const quand = doc.dateMaj ? ` <span class="meta">(mis à jour le ${new Date(doc.dateMaj).toLocaleDateString("fr-FR")})</span>` : "";
    return `<h3>${escapeHtml(nomDuDocument(doc.typeDoc, ime))}${quand}</h3>${contenu}`;
  }).filter(Boolean);
  return parties.length ? `<h2>Documents</h2>${parties.join("")}` : "";
}

/** Les temps d'observation (la grille « Observer »), du plus ancien au plus récent. */
export function tempsDObservationHtml(obs: ObservationEleve[]): string {
  const ordre = [...obs].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
  const blocs = ordre.map((o) => {
    const champs: [string, string][] = [
      ["Contexte", o.contexte], ["Axe", o.axe], ["Compétence", o.competence], ["Note", o.note],
      ["Réussites", o.reussites], ["Difficultés", o.difficultes], ["Hypothèses", o.hypotheses],
      ["Aménagements", o.amenagements], ["Réajustement", o.reajustement],
    ];
    const lignes = champs.filter(([, v]) => v && v.trim())
      .map(([k, v]) => `<dt>${k}</dt><dd><span class="pre">${escapeHtml(v.trim())}</span></dd>`).join("");
    if (!lignes) return "";
    return `<h3>${o.date ? new Date(o.date).toLocaleDateString("fr-FR") : "Sans date"}</h3><dl class="doc">${lignes}</dl>`;
  }).filter(Boolean);
  return blocs.length ? `<h2>Temps d'observation</h2>${blocs.join("")}` : "";
}

export const STYLE_EXPORT = `
  dl.doc { margin: 4px 0 10px; }
  dl.doc dt { font-weight: 600; font-size: 12px; color: #454b5e; margin-top: 6px; }
  dl.doc dd { margin: 0 0 0 14px; }
  ol { margin: 4px 0; padding-left: 22px; }
`;

/**
 * Le dossier complet d'un élève, à exporter : le dossier imprimable, ses
 * temps d'observation et le contenu de ses documents, dans une page autonome.
 */
export async function dossierExporte(eleve: Eleve, ime: boolean, annee: string): Promise<string> {
  const [commentaires, notes, evaluations, docs, papiers, progressions, observations] = await Promise.all([
    api.commentairesList(eleve.id),
    api.notesEleveList(),
    api.evaluationsList(),
    api.documentsEleveList(eleve.id),
    api.papiersList(),
    api.progressionsEleveList(),
    api.observationsList(eleve.id),
  ]);
  const objectifs = intitulesDesObjectifs(docs.find((d) => d.typeDoc === "ppi")?.donnees ?? null);
  const d = construire(eleve, commentaires, notes, evaluations, docs, papiers, progressions, ime);
  const entete = `<div class="meta">Exporté de Maitrize le ${new Date().toLocaleDateString("fr-FR")}, à la fin de l'année scolaire ${escapeHtml(annee)}.</div>`;
  return documentImprimable(`Dossier — ${eleve.nom}`,
    entete + corpsDuDossier(d, objectifs, tempsDObservationHtml(observations) + documentsHtml(docs, ime)),
    STYLE_EXPORT);
}
