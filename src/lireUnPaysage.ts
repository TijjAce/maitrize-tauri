// ── Lire un paysage ───────────────────────────────────────────────────────
//
// Le programme d'histoire-géographie du cycle 2 (BO n° 22 du 28 mai 2026)
// fait décrire un paysage « à partir d'une photographie ou d'une observation
// directe, à l'oral et/ou avec une production graphique » (CE1), avec ses
// mots — premier plan, arrière-plan — ; il fait reconnaître la ville et le
// village (CE1), les espaces résidentiels et les paysages des activités en
// France (CE2), les forêts, les déserts, les reliefs du monde (CE1). La
// fiche se pose à côté de la photographie : ce qu'on voit, plan par plan ;
// ce que la nature y a fait, ce que les êtres humains y ont construit ; le
// nom du paysage ; le croquis et sa légende.

import { escapeHtml } from "./print";
import { reference } from "./references";
import { feuille } from "./cartesImprimables";

const esc = escapeHtml;
const PROGRAMME = "Programme d'histoire-géographie du cycle 2, BO n° 22 du 28 mai 2026 (annexe 3) : géographie, CE1 thèmes 1 et 2, CE2 thèmes 2 et 3.";

export type FamillePaysage = "villeVillage" | "monde" | "residentiel" | "activites";

/** Ce qu'on cherche dans chaque famille de paysages : les éléments, et les noms possibles du paysage. */
export const FAMILLES_PAYSAGE: Record<FamillePaysage, { nom: string; classe: string; naturels: string[]; humains: string[]; types: string[] }> = {
  villeVillage: {
    nom: "Ville, village, campagne", classe: "CE1",
    naturels: ["des champs", "des prés", "une forêt", "une rivière", "des collines"],
    humains: ["des immeubles", "des maisons", "des magasins", "des rues", "une place", "une église", "une école", "des voitures, des bus"],
    types: ["une ville", "un village", "la campagne"],
  },
  monde: {
    nom: "Les lieux de vie dans le monde", classe: "CE1",
    naturels: ["une montagne", "une plaine", "un plateau", "une vallée", "une forêt", "une prairie", "une savane", "un désert", "un fleuve", "une rivière", "la mer"],
    humains: ["des maisons", "une ville", "des routes", "des champs cultivés", "un pont", "un barrage"],
    types: ["une forêt tempérée", "une forêt tropicale", "un désert chaud", "un désert froid", "une prairie", "une savane", "une montagne", "une plaine"],
  },
  residentiel: {
    nom: "Se loger en France", classe: "CE2",
    naturels: ["des arbres", "des jardins", "un parc", "une rivière"],
    humains: ["des immeubles hauts", "des immeubles anciens", "des maisons individuelles", "des rues étroites", "de larges avenues",
      "des commerces", "une église, un monument", "des parkings", "des espaces verts", "des écoles"],
    types: ["un centre-ville historique", "un quartier récent d'habitation", "un grand ensemble", "un lotissement pavillonnaire", "un village"],
  },
  activites: {
    nom: "Travailler en France", classe: "CE2",
    naturels: ["des champs", "des prés", "la mer, une plage", "la montagne", "une rivière"],
    humains: ["une usine", "des entrepôts", "une ferme", "des serres", "un centre commercial", "un grand parking", "des tours de bureaux",
      "des hôtels", "des remontées mécaniques", "un port", "une autoroute", "une voie ferrée"],
    types: ["un paysage industriel", "un paysage agricole", "un paysage d'activité commerciale", "un quartier d'affaires", "une station touristique"],
  },
};

export interface ReglagesPaysage {
  famille: FamillePaysage;
  /** Ce que la photographie montre : on l'écrit en tête, ou on le laisse à trouver. */
  titre: string;
  /** Les plans du paysage : premier plan, second plan, arrière-plan. */
  plans: boolean;
  /** Les éléments à cocher : naturels, construits. */
  elements: boolean;
  /** Le croquis et sa légende. */
  croquis: boolean;
}

export const REGLAGES_PAYSAGE: ReglagesPaysage = { famille: "villeVillage", titre: "", plans: true, elements: true, croquis: true };

export function reglagesPaysageSurs(brut: unknown): ReglagesPaysage {
  const o = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const d = REGLAGES_PAYSAGE;
  return {
    famille: (Object.keys(FAMILLES_PAYSAGE) as FamillePaysage[]).includes(o.famille as FamillePaysage) ? (o.famille as FamillePaysage) : d.famille,
    titre: typeof o.titre === "string" ? o.titre.slice(0, 80) : d.titre,
    plans: typeof o.plans === "boolean" ? o.plans : d.plans,
    elements: typeof o.elements === "boolean" ? o.elements : d.elements,
    croquis: typeof o.croquis === "boolean" ? o.croquis : d.croquis,
  };
}

const coches = (liste: string[]) => `<div class="py-coches">${liste.map((x) => `<span><i></i>${esc(x)}</span>`).join("")}</div>`;
const lignes = (n: number) => Array.from({ length: n }, () => `<div class="py-ligne"></div>`).join("");

export function htmlPaysage(r: ReglagesPaysage): string {
  const f = FAMILLES_PAYSAGE[r.famille];
  const plans = r.plans ? `<div class="py-cadre"><b>Ce que je vois</b>`
    + ["au premier plan", "au second plan", "à l'arrière-plan"].map((p) => `<div class="py-plan"><em>${p} :</em>${lignes(1)}</div>`).join("") + `</div>` : "";
  const elements = r.elements ? `<div class="py-deux">
      <div class="py-cadre"><b>Ce que la nature a fait</b>${coches(f.naturels)}</div>
      <div class="py-cadre"><b>Ce que les êtres humains ont construit</b>${coches(f.humains)}</div>
    </div>` : "";
  const nom = `<div class="py-cadre"><b>C'est…</b>${coches(f.types)}</div>`;
  const croquis = r.croquis ? `<div class="page"><div class="titre">Mon croquis du paysage</div>
      <div class="py-croquis"></div>
      <div class="py-cadre"><b>Ma légende</b>${Array.from({ length: 4 }, () => `<div class="py-legende"><i></i>${lignes(1)}</div>`).join("")}</div></div>` : "";
  return feuille(`<div class="page"><div class="titre">Je lis un paysage${r.titre.trim() ? ` : ${esc(r.titre.trim())}` : ""} ${reference(PROGRAMME)}</div>`
    + `<div class="sous">Prénom : ………………………… Date : ……………</div>`
    + `<div class="py-photo">Je colle la photographie ici.</div>${plans}${elements}${nom}</div>${croquis}`, "py");
}

export const STYLE_PAYSAGE = `
  .feuille.py .py-photo { height: 70mm; border: 1.5px dashed #9aa0b4; border-radius: 3mm; display: flex; align-items: center; justify-content: center;
    color: #8a91a5; font-size: 12px; margin: 2mm 0 3mm; }
  .feuille.py .py-cadre { border: 1.5px solid #cfd4e2; border-radius: 3mm; padding: 2.5mm 3.5mm; margin: 0 0 3mm; break-inside: avoid; }
  .feuille.py .py-cadre > b { display: block; margin-bottom: 1.5mm; font-size: 13.5px; }
  .feuille.py .py-plan { display: flex; align-items: flex-end; gap: 2mm; font-size: 13px; }
  .feuille.py .py-plan em { flex: none; width: 34mm; font-style: normal; }
  .feuille.py .py-plan .py-ligne { flex: 1; }
  .feuille.py .py-ligne { border-bottom: 1px solid #aab1c2; height: 7.5mm; }
  .feuille.py .py-deux { display: flex; gap: 3mm; }
  .feuille.py .py-deux > .py-cadre { flex: 1; }
  .feuille.py .py-coches { display: flex; flex-wrap: wrap; gap: 1.5mm 4mm; font-size: 12.5px; }
  .feuille.py .py-coches i, .feuille.py .py-legende i { display: inline-block; width: 4mm; height: 4mm; border: 1.5px solid #1c2233; border-radius: 0.8mm;
    vertical-align: -0.8mm; margin-right: 1.5mm; }
  .feuille.py .py-croquis { height: 120mm; border: 1.5px solid #1c2233; border-radius: 2mm; margin: 3mm 0; }
  .feuille.py .py-legende { display: flex; align-items: flex-end; gap: 2mm; }
  .feuille.py .py-legende i { width: 9mm; height: 5mm; }
  .feuille.py .py-legende .py-ligne { flex: 1; }
`;
