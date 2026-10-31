// Les rituels : ce qui revient chaque jour, écrit une fois.
//
// La date, l'appel, le mot du jour, le calcul mental : un rituel n'est pas
// une séquence — pas de séances, pas de progression, pas de fin. On en
// faisait pourtant une, faute de mieux, pour la citer dans le cahier
// journal. Un rituel se crée d'un bouton, avec son déroulement — souvent
// différencié par élève —, et se pose d'un clic dans le prévu d'un créneau :
// « 🔁 La date ». Le journal montre alors son déroulement, à l'écran et sur
// le papier, comme pour une séquence citée.
//
// Les rituels vivent dans un réglage partagé entre les ordinateurs.
//
// Le déroulement s'écrit dans un éditeur mis en forme — titres, gras, listes,
// surlignage, une image collée —, pour bien dire ce qu'on veut pour chaque
// élève (l'enseignant, 31 octobre 2026). Il se garde en HTML ; un déroulement
// d'avant, en texte brut, se lit en paragraphes. Le PDF de la semaine, qui
// n'a que du texte, en prend le texte lisible.

import { escapeHtml } from "./print";
import { texteBrut, versHtml } from "./texteRiche";

export interface Rituel {
  id: string;
  titre: string;
  /** Le déroulement, tel qu'on le lit en classe — avec la différenciation par élève s'il y a lieu ; mis en forme (HTML), ou texte brut. */
  deroulement: string;
  /** La durée habituelle, en minutes ; 0 quand on ne la note pas. */
  duree: number;
}

export const CLE_RITUELS = "rituels:liste";
/** Émis quand la liste change : le journal et le bureau se mettent à jour. */
export const EVT_RITUELS = "maitrize:rituels";
/** Ce que la palette demande au journal : créer un rituel. */
export const EVT_NOUVEAU_RITUEL = "maitrize:nouveau-rituel";

const MARQUE = "🔁";

export const nouveauRituel = (titre = ""): Rituel => ({ id: crypto.randomUUID(), titre, deroulement: "", duree: 0 });

/** La liste enregistrée, telle qu'on peut s'y fier : un rituel sans titre ni identifiant ne sert à personne. */
export function lireRituels(brut: string | null | undefined): Rituel[] {
  if (!brut) return [];
  try {
    const lu = JSON.parse(brut);
    if (!Array.isArray(lu)) return [];
    const chaine = (v: unknown) => (typeof v === "string" ? v : "");
    return lu.flatMap((x): Rituel[] => {
      if (!x || typeof x !== "object") return [];
      const o = x as Record<string, unknown>;
      const id = chaine(o.id), titre = chaine(o.titre).trim();
      if (!id || !titre) return [];
      return [{ id, titre, deroulement: chaine(o.deroulement), duree: Math.max(0, Math.round(Number(o.duree) || 0)) }];
    });
  } catch {
    return [];
  }
}

export const ecrireRituels = (rituels: Rituel[]) => JSON.stringify(rituels);

/** Les rituels dans l'ordre où on les range : par titre. */
export const trierRituels = (rituels: Rituel[]) => [...rituels].sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

/** La ligne posée dans le prévu : « 🔁 La date ». */
export const ligneDeRituel = (r: Rituel) => `${MARQUE} ${r.titre.trim()}`;

/** Une forme comparable : sans accents ni majuscules, espaces resserrées. */
const forme = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Les rituels cités dans un texte : une ligne « 🔁 titre », dans l'ordre du texte, une fois chacun. */
export function rituelsCites(texte: string, rituels: Rituel[]): Rituel[] {
  const sortie: Rituel[] = [];
  for (const ligne of (texte ?? "").split("\n")) {
    const propre = ligne.trim();
    if (!propre.startsWith(MARQUE)) continue;
    const titre = forme(propre.slice(MARQUE.length));
    const r = rituels.find((x) => forme(x.titre) === titre);
    if (r && !sortie.includes(r)) sortie.push(r);
  }
  return sortie;
}

/** Les titres des rituels posés dans un texte — « 🔁 La date » —, tels qu'écrits, dans l'ordre, une fois chacun. */
export function titresDesRituels(texte: string): string[] {
  const sortie: string[] = [];
  for (const ligne of (texte ?? "").split("\n")) {
    const propre = ligne.trim();
    const titre = propre.startsWith(MARQUE) ? propre.slice(MARQUE.length).trim() : "";
    if (titre && !sortie.some((t) => forme(t) === forme(titre))) sortie.push(titre);
  }
  return sortie;
}

/** Le déroulement mis en forme, nettoyé : ses images restent des fichiers de Maitrize, à lire avant d'imprimer. */
export const deroulementEnHtml = (r: Rituel) => versHtml(r.deroulement);

/** Le déroulement en texte lisible, nettoyé d'abord : pour un aperçu, ou le PDF de la semaine. */
export const deroulementEnTexte = (r: Rituel) => texteBrut(versHtml(r.deroulement)).trim();

/**
 * Les rituels cités, imprimés sous le prévu — comme les séquences citées.
 * `html` donne le déroulement à imprimer ; le journal y a déjà mis les images.
 */
export function rituelsImprimes(rituels: Rituel[], html: (r: Rituel) => string = deroulementEnHtml): string {
  if (!rituels.length) return "";
  return `<div class="sequences-citees rituels-cites">${rituels.map((r) =>
    `<div class="sequence-citee rituel-cite"><div class="sequence-citee-titre">🔁 ${escapeHtml(r.titre)}`
    + (r.duree ? `<span class="sequence-citee-infos"> · ${r.duree} min</span>` : "") + `</div>`
    + (deroulementEnTexte(r) || /<img\b/i.test(r.deroulement) ? `<div class="sequence-citee-texte rituel-texte">${html(r)}</div>` : "")
    + `</div>`).join("")}</div>`;
}

/** Un déroulement mis en forme, sur le papier : des paragraphes et des listes serrés, des images à leur mesure. */
export const STYLE_RITUELS_IMPRIMES = `
  .rituel-texte { white-space: normal; }
  .rituel-texte p, .rituel-texte h1, .rituel-texte h2, .rituel-texte h3 { margin: 0 0 3px; }
  .rituel-texte ul, .rituel-texte ol { margin: 2px 0 3px; padding-left: 16px; }
  .rituel-texte img { max-height: 32mm; max-width: 100%; }
`;

/** Sur le PDF de la semaine, où le prévu n'est que du texte : le déroulement de chaque rituel cité, à sa suite. */
export function avecRituels(prevu: string, rituels: Rituel[]): string {
  const cites = rituelsCites(prevu, rituels).filter((r) => deroulementEnTexte(r));
  if (!cites.length) return prevu;
  return `${prevu.replace(/\s+$/, "")}\n${cites.map((r) => `${r.titre} : ${deroulementEnTexte(r)}`).join("\n")}`;
}
