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

import { escapeHtml } from "./print";

export interface Rituel {
  id: string;
  titre: string;
  /** Le déroulement, tel qu'on le lit en classe — avec la différenciation par élève s'il y a lieu. */
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

/** Les rituels cités, imprimés sous le prévu — comme les séquences citées. */
export function rituelsImprimes(rituels: Rituel[]): string {
  if (!rituels.length) return "";
  return `<div class="sequences-citees rituels-cites">${rituels.map((r) =>
    `<div class="sequence-citee rituel-cite"><div class="sequence-citee-titre">🔁 ${escapeHtml(r.titre)}`
    + (r.duree ? `<span class="sequence-citee-infos"> · ${r.duree} min</span>` : "") + `</div>`
    + (r.deroulement.trim() ? `<div class="sequence-citee-texte">${escapeHtml(r.deroulement.trim())}</div>` : "")
    + `</div>`).join("")}</div>`;
}

/** Sur le PDF de la semaine, où le prévu n'est que du texte : le déroulement de chaque rituel cité, à sa suite. */
export function avecRituels(prevu: string, rituels: Rituel[]): string {
  const cites = rituelsCites(prevu, rituels).filter((r) => r.deroulement.trim());
  if (!cites.length) return prevu;
  return `${prevu.replace(/\s+$/, "")}\n${cites.map((r) => `${r.titre} : ${r.deroulement.trim()}`).join("\n")}`;
}
