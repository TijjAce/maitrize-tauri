// Les exercices des manuels, hors de l'écran des manuels : les relire tous,
// retrouver l'image d'une page, en découper un encadré. L'écran des manuels
// s'en sert pour faire le modèle simplifié ; une séquence, pour poser dans
// ses séances les exercices qui travaillent sa compétence.

import { api, newId, nowIso, type MaterielItem } from "./api";
import { STYLE_ENTETE_COMPETENCES, enteteCompetencesHtml, materielDuBureau } from "./impressionAtelier";
import {
  CLE_INDEX, STYLE_FICHE_ADAPTEE, cleManuel, htmlFicheAdaptee, lireIndex, lireManuel, nomExercice, texteExercice,
  type ExerciceTrouve, type Manuel, type PageManuel, type Zone,
} from "./manuels";
import { rendrePage } from "./pdfRendu";
import { documentImprimable, escapeHtml } from "./print";

const mimeDe = (fichier: string) => (fichier.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

/** Tous les manuels de l'index, relus ; ceux qui ne se relisent pas sont passés. */
export async function chargerLesManuels(): Promise<Manuel[]> {
  const index = lireIndex(await api.settingGet(CLE_INDEX));
  const manuels = await Promise.all(index.map(async (r) => lireManuel(await api.settingGet(cleManuel(r.id)))));
  return manuels.filter((m): m is Manuel => !!m);
}

/** Les octets d'un PDF de Fichiers/, gardés le temps de la visite : un manuel importé se relit page après page. */
const pdfsLus = new Map<string, Uint8Array>();

/** L'image d'une page, en data URL : sa photo, ou la page de son PDF rendue. */
export async function imageDeLaPage(m: Manuel, p: PageManuel): Promise<string> {
  if (p.fichier) return `data:${mimeDe(p.fichier)};base64,${await api.fichierRead(p.fichier)}`;
  let octets = pdfsLus.get(m.fichierPdf);
  if (!octets) {
    octets = Uint8Array.from(atob(await api.fichierRead(m.fichierPdf)), (c) => c.charCodeAt(0));
    pdfsLus.set(m.fichierPdf, octets);
  }
  return `data:image/png;base64,${(await rendrePage(octets, p.numero)).image}`;
}

/** L'encadré d'une page, découpé dans son image — avec un liseré pour ne pas couper une lettre —, en PNG base64. */
export async function pngDeLaZone(dataUrl: string, z: Zone, maxCote = 1600): Promise<string> {
  const img = new Image();
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error("Image illisible")); img.src = dataUrl; });
  const marge = 0.01;
  const x = Math.max(0, z.x - marge) * img.width, y = Math.max(0, z.y - marge) * img.height;
  const l = Math.min(img.width - x, (z.l + 2 * marge) * img.width), h = Math.min(img.height - y, (z.h + 2 * marge) * img.height);
  const echelle = Math.min(1, maxCote / Math.max(l, h));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(l * echelle));
  toile.height = Math.max(1, Math.round(h * echelle));
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(img, x, y, l, h, 0, 0, toile.width, toile.height);
  const url = toile.toDataURL("image/png");
  return url.slice(url.indexOf(",") + 1);
}

/**
 * Pose un exercice dans une séance : son modèle simplifié en PDF — c'est ce
 * qui s'imprime avec le cahier journal — et l'encadré d'origine en image, pour
 * l'avoir sous les yeux. Sans modèle simplifié, c'est l'encadré qui s'imprime.
 */
export async function poserDansLaSeance(t: ExerciceTrouve, seanceId: string, sequenceId: string, cycle: string): Promise<MaterielItem> {
  const { manuel, page, exercice: e } = t;
  const ou = `${manuel.titre} · p. ${page.numero}${e.numero ? ` · ex. ${e.numero}` : ""}`;
  const encadre = e.zone ? await pngDeLaZone(await imageDeLaPage(manuel, page), e.zone) : "";
  const corps = e.modele
    ? htmlFicheAdaptee(e.modele.fiche, e.modele.options, { manuel: manuel.titre, page: page.numero, numero: e.numero })
    : `<div class="fa"><div class="fa-titre">${escapeHtml(nomExercice(e))}</div><div class="fa-nom">${escapeHtml(ou)}</div>${
      encadre ? `<img src="data:image/png;base64,${encadre}" alt="" style="max-width:100%">` : `<p>${escapeHtml(texteExercice(e))}</p>`}</div>`;
  const titre = nomExercice(e);
  const pdf = await api.feuilleEnPdf(documentImprimable(titre, enteteCompetencesHtml(e.competences) + corps,
    STYLE_FICHE_ADAPTEE + (e.competences.length ? STYLE_ENTETE_COMPETENCES : "")));
  const image = encadre ? await api.fichierSave(`exercice-p${page.numero}.png`, encadre) : "";
  const materiel: MaterielItem = {
    ...materielDuBureau("manuels", titre, pdf, e.competences, newId(), nowIso()),
    descriptionMateriel: ou, cycle, imagesJson: JSON.stringify(image ? [image] : []), seanceId, sequenceId,
  };
  await api.materielSave(materiel);
  return materiel;
}
