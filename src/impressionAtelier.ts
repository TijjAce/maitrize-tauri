// Ce qu'un atelier travaille, écrit en haut de ce qu'il imprime.
//
// Une feuille qui circule — classeur de l'élève, remplaçant, dossier, visite
// de l'inspecteur — doit dire à quoi elle sert. Les compétences que
// l'enseignant a attachées à l'atelier (voir `ateliersCompetences`) s'écrivent
// donc en tête de chaque impression, avant le titre. Sans compétence choisie,
// rien ne change.
//
// Les feuilles de cartes remplissent la page au millimètre : un bloc posé en
// tête pousserait la dernière rangée sur une page de plus. L'en-tête prend
// donc la place de la marge haute de la première page et du blanc du corps,
// à hauteur plafonnée — ce qu'il y a dessous ne bouge pas.

import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { cleDesCompetences, lireCompetencesAtelier, objectifsDesAteliers, unionDesCompetences } from "./ateliersCompetences";
import { CLE_ACTIF, CLE_LEXIQUE, STYLE_CONSIGNES_PICTOS, consignesActives, decorerConsignesHtml, lireLexique } from "./caa";
import { chargerImageAppoint } from "./pictosAppoint";
import { cleConsigne, remplacerConsigne, clePictos, lirePictosAjoutes } from "./consigneAtelier";
import { appliquerOptionsFeuille, cleOptionsFeuille, lireOptionsFeuille } from "./optionsFeuille";
import { documentImprimable, escapeHtml, printHTML } from "./print";
import type { MaterielItem } from "./api";

/** Combien de compétences s'écrivent en tête ; au-delà, on les compte. */
export const LIGNES_MAX = 4;

/**
 * L'intitulé seul, sans le niveau.
 *
 * La feuille va à l'élève : « CP » n'y a pas sa place — l'enseignant le sait,
 * et l'élève d'IME n'a pas à lire sur sa fiche un niveau qui n'est pas le
 * sien. Le niveau reste visible dans l'application, où il aide à choisir.
 */
export const etiquetteCompetence = (c: CompetenceSelectionnee) => c.competenceTitre.trim();

/** D'où vient la compétence : « Cycle 2 › Lire et écrire › Identifier des mots ». */
export function contexteCompetence(c: CompetenceSelectionnee): string {
  const etapes: string[] = [];
  for (const brut of [c.referentielNom, c.domaineTitre, c.sousDomaineTitre]) {
    const e = (brut ?? "").trim();
    if (e && etapes[etapes.length - 1] !== e) etapes.push(e);
  }
  return etapes.join(" › ");
}

/** Une compétence sur une ligne, pour les PDF : « Intitulé — contexte ». */
export function ligneCompetence(c: CompetenceSelectionnee): string {
  const contexte = contexteCompetence(c);
  return contexte ? `${etiquetteCompetence(c)} — ${contexte}` : etiquetteCompetence(c);
}

/** Les compétences à montrer, et la ligne qui compte les autres s'il y en a trop. */
function retenues(comps: CompetenceSelectionnee[]): { montrees: CompetenceSelectionnee[]; suite: string } {
  if (comps.length <= LIGNES_MAX) return { montrees: comps, suite: "" };
  const montrees = comps.slice(0, LIGNES_MAX - 1);
  return { montrees, suite: `… et ${comps.length - montrees.length} autres compétences` };
}

/** Les lignes à donner aux générateurs PDF (loto, mémory, imagier, TLA). */
export function lignesCompetences(comps: CompetenceSelectionnee[]): string[] {
  const { montrees, suite } = retenues(comps);
  return [...montrees.map(ligneCompetence), ...(suite ? [suite] : [])];
}

/** Le bloc d'en-tête d'une feuille HTML ; vide sans compétence. */
export function enteteCompetencesHtml(comps: CompetenceSelectionnee[]): string {
  if (!comps.length) return "";
  const { montrees, suite } = retenues(comps);
  const lignes = montrees.map((c) => {
    const contexte = contexteCompetence(c);
    return `<div class="ca-ligne"><b>${escapeHtml(etiquetteCompetence(c))}</b>`
      + (contexte ? `<span class="ca-contexte"> · ${escapeHtml(contexte)}</span>` : "")
      + `</div>`;
  });
  if (suite) lignes.push(`<div class="ca-ligne ca-contexte">${escapeHtml(suite)}</div>`);
  const label = comps.length > 1 ? "Compétences travaillées" : "Compétence travaillée";
  return `<div class="competences-atelier"><div class="ca-label">🎯 ${label}</div><div class="ca-lignes">${lignes.join("")}</div></div>`;
}

/**
 * Le style de l'en-tête.
 *
 * À l'impression, la première page perd 8 mm de marge haute et le corps son
 * blanc du dessus : c'est là que l'en-tête s'écrit, sur quatre lignes au
 * plus. Le contenu commence au même endroit qu'avant, et une feuille de
 * cartes calculée pour remplir la page la remplit toujours.
 */
export const STYLE_ENTETE_COMPETENCES = `
  .competences-atelier { display: flex; gap: 8px; align-items: baseline; font-size: 9.5px; line-height: 1.3;
    color: #3b4256; border-bottom: 1px solid #cfd4e2; padding: 0 0 1mm; margin: 0 0 2mm; max-height: 13.4mm; overflow: hidden; }
  .competences-atelier .ca-label { flex: none; font-size: 8.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .3px; color: #687087; }
  .competences-atelier .ca-lignes { flex: 1; min-width: 0; }
  .competences-atelier .ca-ligne { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .competences-atelier .ca-ligne b { font-weight: 600; }
  .competences-atelier .ca-contexte { color: #687087; }
  @page :first { margin-top: 6mm; }
  @media print { body { padding-top: 0; } }
`;

/**
 * Les compétences attachées à un atelier — ou, s'il travaille par objectif,
 * celles des objectifs retenus à l'écran. Aucune si rien n'est choisi ou si
 * la lecture échoue.
 */
export async function competencesDeLAtelier(atelier: string): Promise<CompetenceSelectionnee[]> {
  try {
    // Import dynamique, comme dans `print` : pas de cycle au chargement.
    const { api } = await import("./api");
    const objectifs = objectifsDesAteliers.lire(atelier);
    if (!objectifs.length) return lireCompetencesAtelier(await api.settingGet(cleDesCompetences(atelier)));
    const listes = await Promise.all(objectifs.map((o) => api.settingGet(cleDesCompetences(atelier, o.id)).then(lireCompetencesAtelier)));
    return unionDesCompetences(listes);
  } catch {
    return [];
  }
}

/** Les lignes pour un PDF fabriqué côté Rust. */
export const lignesCompetencesAtelier = async (atelier: string) =>
  lignesCompetences(await competencesDeLAtelier(atelier));

/**
 * Les consignes de la feuille avec les pictos de leurs verbes (voir `caa`),
 * si l'enseignant en a choisi. Une image qui manque ne bloque rien.
 */
export async function consignesEnPictos(corps: string, supplement: string[] = []): Promise<{ corps: string; style: string }> {
  try {
    const { api } = await import("./api");
    const lexique = lireLexique(await api.settingGet(CLE_LEXIQUE));
    if (!consignesActives(await api.settingGet(CLE_ACTIF), lexique)) return { corps, style: "" };
    const ids = [...new Set(Object.values(lexique))];
    const images: Record<string, string> = {};
    await Promise.all(ids.map(async (id) => {
      try {
        images[id] = typeof id === "string" ? await chargerImageAppoint(id) : `data:image/png;base64,${await api.arasaacImage(id)}`;
      } catch { /* sans image, pas de picto */ }
    }));
    const decore = decorerConsignesHtml(corps, lexique, images, supplement);
    return { corps: decore, style: decore === corps ? "" : STYLE_CONSIGNES_PICTOS };
  } catch {
    return { corps, style: "" };
  }
}

/** Ce qu'un atelier ajoute à sa feuille : des pictos de verbes choisis à la main. */
export interface ExtrasAtelier {
  pictos?: string[];
  /** Les compétences à porter, quand ce ne sont pas celles de l'atelier : une feuille fabriquée pour une séquence porte la sienne. */
  competences?: CompetenceSelectionnee[];
}

/** Les verbes ajoutés à la main pour cet atelier, depuis le bandeau (voir `consigneAtelier`). */
export async function pictosDeLAtelier(atelier: string): Promise<string[]> {
  try {
    const { api } = await import("./api");
    return lirePictosAjoutes(await api.settingGet(clePictos(atelier)));
  } catch {
    return [];
  }
}

/** Les verbes à montrer en plus : ceux de l'atelier et ceux que la feuille apporte, une fois chacun. */
const supplementDe = async (atelier: string, extras: ExtrasAtelier) => [...new Set([...(extras.pictos ?? []), ...(await pictosDeLAtelier(atelier))])];

/**
 * La feuille telle que l'enseignant la veut : la consigne qu'il a réécrite
 * pour cet atelier, et sans ce qu'il a décoché — consigne, prénom, correction.
 */
export async function avecLaConsigneDeLAtelier(atelier: string, corps: string): Promise<string> {
  try {
    const { api } = await import("./api");
    const reecrite = remplacerConsigne(corps, await api.settingGet(cleConsigne(atelier)));
    return appliquerOptionsFeuille(reecrite, lireOptionsFeuille(await api.settingGet(cleOptionsFeuille(atelier))));
  } catch {
    return corps;
  }
}

/** Imprime la feuille d'un atelier : sa consigne, ses compétences en tête, ses consignes en pictos. */
export async function imprimerAtelier(atelier: string, titre: string, corps: string, style = "", extras: ExtrasAtelier = {}): Promise<void> {
  const entete = enteteCompetencesHtml(await competencesDeLAtelier(atelier));
  const consignes = await consignesEnPictos(await avecLaConsigneDeLAtelier(atelier, corps), await supplementDe(atelier, extras));
  printHTML(titre, entete + consignes.corps, (entete ? style + STYLE_ENTETE_COMPETENCES : style) + consignes.style);
}

// ── Sur le bureau ──────────────────────────────────────────────────────────
//
// Une feuille qu'on garde ne s'imprime pas seulement : elle se range sur le
// plan de travail, en PDF, comme n'importe quel document — pour la retrouver,
// la déposer dans une séance, la partager. Le matériel porte la première
// compétence de l'atelier, pour que la tuile dise ce qu'elle travaille.

/** Le matériel du bureau qui porte ce PDF, à la racine, sans séance ni séquence. */
export function materielDuBureau(
  atelier: string, titre: string, fichier: string, comps: CompetenceSelectionnee[], id: string, date: string,
): MaterielItem {
  const c = comps[0];
  return {
    id, titre: titre.trim() || atelier, descriptionMateriel: "",
    competenceId: c?.competenceRefId ?? "", competenceTitre: c?.competenceTitre ?? "",
    domaineTitre: c?.domaineTitre ?? "", sousDomaineTitre: c?.sousDomaineTitre ?? "", cycle: c?.referentielNom ?? "",
    imagesJson: "[]", pdfsJson: JSON.stringify([fichier]), dateCreation: date, seanceId: null, sequenceId: null,
    dossier: "", videosJson: "[]", coffreJson: "[]",
  };
}

/** Un PDF déjà dans les fichiers de l'application, déposé sur le bureau. */
export async function deposerSurLeBureau(atelier: string, titre: string, fichier: string): Promise<MaterielItem> {
  const { api, newId, nowIso } = await import("./api");
  const materiel = materielDuBureau(atelier, titre, fichier, await competencesDeLAtelier(atelier), newId(), nowIso());
  await api.materielSave(materiel);
  return materiel;
}

/**
 * La feuille d'un atelier, la même que celle qu'on imprime — ses compétences
 * en tête —, transformée en PDF et déposée sur le bureau.
 */
export async function enregistrerSurLeBureau(atelier: string, titre: string, corps: string, style = "", extras: ExtrasAtelier = {}): Promise<MaterielItem> {
  return deposerSurLeBureau(atelier, titre, await pdfDeLAtelier(atelier, titre, corps, style, extras));
}

/** La feuille d'un atelier telle qu'elle s'imprime — compétences en tête, consignes en pictos —, en PDF dans les fichiers. */
async function pdfDeLAtelier(atelier: string, titre: string, corps: string, style: string, extras: ExtrasAtelier): Promise<string> {
  const { api } = await import("./api");
  const entete = enteteCompetencesHtml(extras.competences ?? await competencesDeLAtelier(atelier));
  const consignes = await consignesEnPictos(await avecLaConsigneDeLAtelier(atelier, corps), await supplementDe(atelier, extras));
  const html = documentImprimable(titre, entete + consignes.corps, (entete ? style + STYLE_ENTETE_COMPETENCES : style) + consignes.style);
  return api.feuilleEnPdf(html);
}

/**
 * La feuille d'un atelier, en PDF, dans une séance de séquence plutôt qu'à
 * la racine du bureau : elle s'imprime avec le cahier journal du jour où la
 * séance est posée.
 */
export async function poserDansUneSeance(
  atelier: string, titre: string, corps: string, style: string, seanceId: string, sequenceId: string, extras: ExtrasAtelier = {},
): Promise<MaterielItem> {
  const { api, newId, nowIso } = await import("./api");
  const fichier = await pdfDeLAtelier(atelier, titre, corps, style, extras);
  const materiel: MaterielItem = {
    ...materielDuBureau(atelier, titre, fichier, extras.competences ?? await competencesDeLAtelier(atelier), newId(), nowIso()), seanceId, sequenceId,
  };
  await api.materielSave(materiel);
  return materiel;
}
