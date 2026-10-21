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
import { CONSIGNE_DANS_L_ATELIER, cleConsigne, remplacerConsigne, clePictos, lirePictosAjoutes } from "./consigneAtelier";
import { cleOptionsFeuille, consignesDeLaFeuille, feuilleSelonOptions, lireOptionsFeuille, type OptionsFeuille } from "./optionsFeuille";
import { ATELIERS_D_AIDE } from "./journalTelephone";
import { documentImprimable, escapeHtml, printHTML } from "./print";
import type { MaterielItem } from "./api";
import { ecrireFabrication, fabricationDuMoment, lireFabrication, modificationEnCours, type Fabrication, type Modification } from "./modifierFeuille";
import { feuillePourLaSeance } from "./feuillePourLaSeance";
import { sansReferences } from "./references";
import { STYLE_DYS, cleModeDys, lireModeDys } from "./presentationFeuille";
import { STYLE_CONSIGNES_STRUCTUREES } from "./consignesStructurees";
import { avecLesPhotosDePaysage } from "./photosPaysages";
import { titreSansLEleve } from "./materielSeance";

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
  /** De quoi refaire la feuille dans son atelier, quand la séquence le sait (voir `modifierFeuille`). */
  fabrication?: Pick<Fabrication, "memoires" | "graine">;
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
 * Sans ses références non plus : elles ne s'impriment pas, et leurs mots ne
 * doivent pas appeler de pictos dans la consigne.
 */
export async function avecLaConsigneDeLAtelier(atelier: string, corps: string, imposees: Partial<OptionsFeuille> = {}): Promise<string> {
  try {
    const { api } = await import("./api");
    const reecrite = CONSIGNE_DANS_L_ATELIER.has(atelier) ? corps : remplacerConsigne(corps, await api.settingGet(cleConsigne(atelier)));
    const options = { ...lireOptionsFeuille(await api.settingGet(cleOptionsFeuille(atelier))), ...imposees };
    return sansReferences(feuilleSelonOptions(reecrite, options));
  } catch {
    // Sans les réglages, la feuille garde tout, sauf les aides : mieux vaut une consigne de trop qu'une feuille sans elle.
    return sansReferences(feuilleSelonOptions(corps, { consigne: true, prenom: true, corrige: true, aide: false, tablettes: false, ...imposees }));
  }
}

/**
 * La consigne d'une feuille pour les tablettes : ses blocs de consigne et de
 * règle — la consigne que l'enseignant a réécrite comprise —, si l'atelier les
 * y envoie. Elle part avec la feuille posée dans une séance : le cahier
 * journal la publie au téléphone (voir journalTelephone). Rien pour une aide à
 * la tâche, qui part déjà entière.
 */
export async function consignePourLesTablettes(atelier: string, corps: string): Promise<string | undefined> {
  if ((ATELIERS_D_AIDE as readonly string[]).includes(atelier)) return undefined;
  try {
    const { api } = await import("./api");
    if (!lireOptionsFeuille(await api.settingGet(cleOptionsFeuille(atelier))).tablettes) return undefined;
    return await consigneDeLaFiche(atelier, corps);
  } catch {
    return undefined;
  }
}

/**
 * La consigne d'une fiche d'élève pour les tablettes, toujours : une fiche
 * d'« En retard » se fait seul, et le téléphone l'envoie depuis son créneau
 * avec son minuteur. Les mêmes blocs que pour une feuille de séance.
 */
export async function consigneDeLaFiche(atelier: string, corps: string): Promise<string | undefined> {
  if ((ATELIERS_D_AIDE as readonly string[]).includes(atelier)) return undefined;
  try {
    const { api } = await import("./api");
    const consignes = consignesDeLaFeuille(sansReferences(CONSIGNE_DANS_L_ATELIER.has(atelier) ? corps : remplacerConsigne(corps, await api.settingGet(cleConsigne(atelier)))));
    return consignes.length ? consignes.join("\n") : undefined;
  } catch {
    return undefined;
  }
}

/** Le style que l'atelier ajoute à chacune de ses feuilles, en dernier : les consignes structurées, et le mode dyslexique s'il est choisi. */
export async function styleDeLAtelier(atelier: string): Promise<string> {
  try {
    const { api } = await import("./api");
    return STYLE_CONSIGNES_STRUCTUREES + (lireModeDys(await api.settingGet(cleModeDys(atelier))) ? STYLE_DYS : "");
  } catch {
    return STYLE_CONSIGNES_STRUCTUREES;
  }
}

/**
 * Imprime la feuille d'un atelier : sa consigne, ses consignes en pictos. Les
 * compétences ne s'impriment en tête que sur une feuille de séquence, qui
 * porte les siennes : la liste de toutes celles de l'atelier, sur une feuille
 * faite à part, « ne fait pas sérieux » (demande de l'enseignant, octobre 2026).
 */
export async function imprimerAtelier(atelier: string, titre: string, corps: string, style = "", extras: ExtrasAtelier = {}): Promise<void> {
  const entete = enteteCompetencesHtml(extras.competences ?? []);
  const consignes = await consignesEnPictos(await avecLaConsigneDeLAtelier(atelier, await avecLesPhotosDePaysage(corps)), await supplementDe(atelier, extras));
  printHTML(titre, entete + consignes.corps, (entete ? style + STYLE_ENTETE_COMPETENCES : style) + consignes.style + await styleDeLAtelier(atelier));
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

/**
 * Un PDF déjà dans les fichiers de l'application, déposé sur le bureau avec
 * de quoi le refaire dans son atelier — ou mis à la place de la feuille de
 * cet atelier qu'on est en train de refaire.
 */
export async function deposerSurLeBureau(atelier: string, titre: string, fichier: string, consigne?: string): Promise<MaterielItem> {
  const refaite = await remplacerLaFeuille(atelier, async () => fichier, async () => consigne);
  if (refaite) return refaite;
  const { api, newId, nowIso } = await import("./api");
  // Fabriquée pour une séance (voir feuillePourLaSeance) : elle va dans la séance, pas à la racine du bureau.
  const pour = feuillePourLaSeance.lire();
  const materiel: MaterielItem = {
    ...materielDuBureau(atelier, titre, fichier, await competencesDeLAtelier(atelier), newId(), nowIso()),
    ...(pour ? { seanceId: pour.seanceId, sequenceId: pour.sequenceId } : {}),
    fabricationJson: ecrireFabrication(fabricationDuMoment(atelier, consigne ? { consigne } : {})),
  };
  await api.materielSave(materiel);
  return materiel;
}

/**
 * La feuille d'un atelier, la même que celle qu'on imprime — ses compétences
 * en tête —, transformée en PDF et déposée sur le bureau. Si l'on refait une
 * feuille de cet atelier, elle sort comme l'ancienne — les compétences de sa
 * séquence en tête, ou au nom de son élève — et prend sa place.
 */
export async function enregistrerSurLeBureau(atelier: string, titre: string, corps: string, style = "", extras: ExtrasAtelier = {}): Promise<MaterielItem> {
  const consigne = await consignePourLesTablettes(atelier, corps);
  // Une fiche d'élève refaite garde sa consigne pour les tablettes, quelle que soit l'option de l'atelier.
  const refaite = await remplacerLaFeuille(atelier, (m, titreGarde) => (m.eleve
    ? pdfPourLEleve(atelier, titreGarde, corps, style, m.eleve)
    : pdfDeLAtelier(atelier, titreGarde, corps, style, { ...extras, competences: m.competences ?? extras.competences })),
  async (m) => (m.eleve ? consigneDeLaFiche(atelier, corps) : consigne));
  if (refaite) return refaite;
  return deposerSurLeBureau(atelier, titre, await pdfDeLAtelier(atelier, titre, corps, style, extras), consigne);
}

/**
 * La feuille qu'on refait (voir `modifierFeuille`) : si c'est une feuille de
 * cet atelier, le nouveau PDF prend la place de l'ancien dans le même
 * matériel — même nom, même séance, même dossier, donc même ligne au cahier
 * journal —, avec de quoi la refaire encore, et le minuteur qu'on lui avait
 * réglé pour les tablettes. Rien si l'on ne refait rien ici, ou si elle a été
 * supprimée entre-temps : on enregistre alors comme d'habitude.
 */
async function remplacerLaFeuille(
  atelier: string, pdf: (m: Modification, titreGarde: string) => Promise<string>,
  consigneDe: (m: Modification) => Promise<string | undefined>,
): Promise<MaterielItem | null> {
  const m = modificationEnCours.lire();
  if (!m || m.atelier !== atelier) return null;
  const { api } = await import("./api");
  const avant = (await api.materielList()).find((x) => x.id === m.materielId);
  if (!avant) {
    modificationEnCours.finir();
    return null;
  }
  const consigne = await consigneDe(m);
  const minuteur = lireFabrication(avant.fabricationJson)?.minuteur;
  const apres: MaterielItem = {
    ...avant, pdfsJson: JSON.stringify([await pdf(m, avant.titre)]),
    fabricationJson: ecrireFabrication(fabricationDuMoment(atelier, {
      competences: m.competences, eleve: m.eleve, ...(consigne ? { consigne } : {}), ...(minuteur ? { minuteur } : {}),
    })),
  };
  await api.materielSave(apres);
  modificationEnCours.finir();
  return apres;
}

/** La feuille d'un atelier telle qu'elle s'imprime — compétences en tête, consignes en pictos —, en PDF dans les fichiers. */
async function pdfDeLAtelier(atelier: string, titre: string, corps: string, style: string, extras: ExtrasAtelier): Promise<string> {
  const { api } = await import("./api");
  // Les compétences en tête : celles de la séquence, s'il y en a ; jamais la liste de l'atelier (voir imprimerAtelier).
  const entete = enteteCompetencesHtml(extras.competences ?? []);
  const consignes = await consignesEnPictos(await avecLaConsigneDeLAtelier(atelier, await avecLesPhotosDePaysage(corps)), await supplementDe(atelier, extras));
  const html = documentImprimable(titre, entete + consignes.corps, (entete ? style + STYLE_ENTETE_COMPETENCES : style) + consignes.style + await styleDeLAtelier(atelier));
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
  const consigne = await consignePourLesTablettes(atelier, corps);
  const materiel: MaterielItem = {
    ...materielDuBureau(atelier, titre, fichier, extras.competences ?? await competencesDeLAtelier(atelier), newId(), nowIso()), seanceId, sequenceId,
    fabricationJson: ecrireFabrication({ atelier, ...extras.fabrication, competences: extras.competences, ...(consigne ? { consigne } : {}) }),
  };
  await api.materielSave(materiel);
  return materiel;
}

// ── Pour un élève ──────────────────────────────────────────────────────────
//
// Une fiche d'autonomie (voir `fichesAutonomie`) va à un élève : elle se
// range dans son dossier et le cahier journal la cite à son nom, mais le
// papier ne le porte pas. Ni prénom ni date imprimés : la même feuille doit
// pouvoir resservir à un autre élève, un autre jour (demande de l'enseignant,
// octobre 2026) ; la ligne « Prénom … Date … » reste à remplir à la main.
// La correction reste au maître, elle n'a rien à faire dans la pile qu'on
// distribue.

export { titreSansLEleve } from "./materielSeance";

/**
 * La feuille de l'atelier telle qu'elle s'imprime — sa consigne —, sans
 * corrigé ni compétences, en PDF. Une fiche d'autonomie garde sa consigne sur
 * le papier : l'élève y travaille seul, portail ouvert ou non.
 */
async function pdfPourLEleve(atelier: string, titre: string, corps: string, style: string, eleve: { prenom: string; date: string }): Promise<string> {
  const { api } = await import("./api");
  const sansCorrige = await avecLaConsigneDeLAtelier(atelier, await avecLesPhotosDePaysage(corps), { consigne: true, corrige: false });
  const consignes = await consignesEnPictos(sansCorrige, await supplementDe(atelier, {}));
  // Ni compétences en tête : une fiche « En retard » n'est pas une feuille de séquence.
  const html = documentImprimable(titreSansLEleve(titre, eleve.prenom), consignes.corps, style + consignes.style + await styleDeLAtelier(atelier));
  return api.feuilleEnPdf(html);
}

/**
 * La fiche d'un élève, en PDF, rangée dans un dossier du bureau : la feuille
 * de l'atelier telle qu'elle s'imprime — sa consigne, ses compétences —, sans
 * corrigé, et sans son prénom : seuls le titre sur le bureau et le dossier
 * disent pour qui elle est. `refaire` dit comment l'atelier la refait — et le
 * minuteur des tablettes qu'« En retard » lui donne. Sa consigne est gardée :
 * le téléphone l'envoie aux tablettes depuis le créneau qui cite la fiche.
 */
export async function ficheDeLEleve(
  atelier: string, titre: string, corps: string, style: string, eleve: { prenom: string; date: string; dossier: string },
  refaire: Pick<Fabrication, "memoires" | "graine" | "minuteur" | "support"> = {},
): Promise<MaterielItem> {
  const { api, newId, nowIso } = await import("./api");
  const fichier = await pdfPourLEleve(atelier, titre, corps, style, eleve);
  const consigne = await consigneDeLaFiche(atelier, corps);
  const materiel: MaterielItem = {
    ...materielDuBureau(atelier, titre, fichier, await competencesDeLAtelier(atelier), newId(), nowIso()), dossier: eleve.dossier,
    fabricationJson: ecrireFabrication({ atelier, ...refaire, eleve: { prenom: eleve.prenom, date: eleve.date }, ...(consigne ? { consigne } : {}) }),
  };
  await api.materielSave(materiel);
  return materiel;
}
