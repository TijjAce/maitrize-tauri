// Séquences citées dans le prévu du cahier journal : « séquence Organiser les
// mots en réseau », ou la ligne posée par le bouton 📚 — « 📚 Organiser les
// mots en réseau · séance 2 : Découverte du corpus ». La séquence citée
// montre, sous le prévu et dans le PDF du jour, ses objectifs et le
// déroulement de la séance citée.
//
// Le titre se reconnaît sans accents ni majuscules ; la séance, sur la même
// ligne, par son numéro (« séance 2 ») ou par son titre.

import type { Seance, Sequence } from "./api";
import { escapeHtml } from "./print";

export interface CitationSequence { sequence: Sequence; seance: Seance | null }

/** Une forme comparable : minuscules, sans accents, mots séparés d'une espace. */
const forme = (texte: string) => ` ${(texte ?? "")
  .toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, " ").trim()} `;

/** En dessous, un titre de séquence citerait la séquence à tout propos. */
const LONGUEUR_TITRE = 8;

/** Les séquences citées dans un texte, avec leur séance si elle est précisée, dans l'ordre du texte. */
export function sequencesCitees(texte: string, sequences: Sequence[], seances: Seance[]): CitationSequence[] {
  const titres = sequences
    .map((s) => ({ s, titre: forme(s.titre) }))
    .filter((x) => x.titre.trim())
    // Le titre le plus long d'abord : « Les fractions (2) » avant « Les fractions ».
    .sort((a, b) => b.titre.length - a.titre.length);
  const candidates = titres.filter((x) => x.titre.trim().length >= LONGUEUR_TITRE);
  const sortie: CitationSequence[] = [];
  const vues = new Set<string>();
  for (const ligne of (texte ?? "").split(/\n/)) {
    let reste = forme(ligne);
    const trouvees: { s: Sequence; position: number }[] = [];
    // La ligne du bouton : une seule séquence, en tête, même au titre court.
    const posee = ligne.trim().startsWith("📚") ? titres.find((x) => reste.startsWith(x.titre)) : undefined;
    if (posee) trouvees.push({ s: posee.s, position: 0 });
    else for (const { s, titre } of candidates) {
      const i = reste.indexOf(titre);
      if (i < 0) continue;
      trouvees.push({ s, position: i });
      // Retiré de la ligne : un titre plus court contenu dans celui-ci ne compte pas en plus.
      reste = reste.slice(0, i) + " ".repeat(titre.length) + reste.slice(i + titre.length);
    }
    trouvees.sort((a, b) => a.position - b.position);
    for (const { s } of trouvees) {
      const siennes = seances.filter((x) => x.sequenceId === s.id);
      const numero = /\bs[ée]ance\s*(?:n\s*[°o.]?\s*)?(\d{1,3})\b/i.exec(ligne)?.[1];
      const lignePropre = forme(ligne);
      const seance = (trouvees.length === 1 && numero ? siennes.find((x) => x.numero === Number(numero)) : undefined)
        ?? siennes.find((x) => forme(x.titre).trim().length >= LONGUEUR_TITRE && lignePropre.includes(forme(x.titre)))
        ?? null;
      const cle = `${s.id}|${seance?.id ?? ""}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      sortie.push({ sequence: s, seance });
    }
  }
  return sortie;
}

/** La ligne que pose le bouton 📚 dans le prévu. */
export function ligneDeSequence(sequence: Sequence, seance?: Seance | null, total = 0): string {
  const titre = sequence.titre.trim() || "Séquence sans titre";
  if (!seance) return `📚 ${titre}`;
  return `📚 ${titre} · ${rangDeLaSeance(seance, total)}${seance.titre.trim() ? ` : ${seance.titre.trim()}` : ""}`;
}

/**
 * « séance 3/6 » quand la séquence dit combien elle en prévoit, « séance 3 »
 * sinon. Savoir où l'on en est vaut mieux que de compter dans sa tête.
 */
export function rangDeLaSeance(seance: Seance, total = 0): string {
  return `séance ${seance.numero}${total > 0 && total >= seance.numero ? `/${total}` : ""}`;
}

/**
 * Combien de séances compter : celles que la séquence prévoit, sinon celles
 * qui existent — mais seulement s'il y en a plusieurs. « Séance 1/1 » ne
 * renseignerait personne.
 */
export function totalDesSeances(sequence: Sequence, seances: Seance[]): number {
  if (sequence.nbSeancesPrevu > 0) return sequence.nbSeancesPrevu;
  const existantes = seances.filter((x) => x.sequenceId === sequence.id).length;
  return existantes > 1 ? existantes : 0;
}

/** Pose une ligne après celle du curseur (ou à la fin), sans la doubler. */
export function insererLigne(texte: string, ligne: string, curseur: number | null): string {
  if ((texte ?? "").split("\n").some((l) => l.trim() === ligne.trim())) return texte;
  if (!texte.trim()) return ligne;
  if (curseur === null || curseur >= texte.length) return `${texte.replace(/\s+$/, "")}\n${ligne}`;
  const finDeLigne = texte.indexOf("\n", curseur);
  if (finDeLigne < 0) return `${texte.replace(/\s+$/, "")}\n${ligne}`;
  return `${texte.slice(0, finDeLigne)}\n${ligne}${texte.slice(finDeLigne)}`;
}

/** Un texte de séance sans ses marqueurs d'images et de citations. */
export const texteDeSeance = (texte: string) => (texte ?? "").replace(/\[(img|cite):[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim();

/** Les séquences citées, pour le PDF du jour. */
export function sequencesImprimees(citations: CitationSequence[], seances: Seance[] = []): string {
  if (!citations.length) return "";
  return `<div class="sequences-citees">${citations.map(({ sequence: s, seance }) => {
    const infos = [s.matiere, s.periode ? `période ${s.periode}` : ""].filter(Boolean).join(" · ");
    const rang = seance ? rangDeLaSeance(seance, totalDesSeances(s, seances)) : "";
    const titre = `📚 ${escapeHtml(s.titre)}${seance ? ` — ${rang}${seance.titre ? ` : ${escapeHtml(seance.titre)}` : ""}` : ""}`;
    const objectifs = (seance?.objectifs || s.objectifs || "").trim();
    const deroulement = seance ? texteDeSeance(seance.deroulement) : "";
    return `<div class="sequence-citee"><div class="sequence-citee-titre">${titre}`
      + (infos ? `<span class="sequence-citee-infos"> · ${escapeHtml(infos)}</span>` : "") + `</div>`
      + (objectifs ? `<div class="sequence-citee-texte"><b>Objectifs :</b> ${escapeHtml(objectifs)}</div>` : "")
      + (deroulement ? `<div class="sequence-citee-texte"><b>Déroulement :</b>\n${escapeHtml(deroulement)}</div>` : "")
      + `</div>`;
  }).join("")}</div>`;
}

export const STYLE_SEQUENCES = `
  .sequences-citees { margin-top: 5px; display: flex; flex-direction: column; gap: 4px; }
  .sequence-citee { border: 1px solid #cfe0f5; background: #f3f8fe; border-radius: 6px; padding: 4px 8px;
    break-inside: avoid; page-break-inside: avoid; }
  .sequence-citee-titre { font-weight: 700; color: #23527c; font-size: .95em; }
  .sequence-citee-infos { font-weight: 400; color: #7a7f8f; }
  .sequence-citee-texte { white-space: pre-wrap; overflow-wrap: anywhere; font-size: .95em; line-height: 1.4; margin-top: 2px; }
`;
