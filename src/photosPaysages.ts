// ── Les photographies de paysages ─────────────────────────────────────────
//
// Une photographie par type de paysage du programme de géographie du cycle 2
// (2026) : de quoi lire un paysage quand on n'a ni sortie ni photo à soi.
// Elles viennent de Wikimedia Commons, choisies le 12 octobre 2026 : une
// licence libre (CC0, CC BY, CC BY-SA), un premier plan et un arrière-plan
// nets, personne de reconnaissable. Réduites à 1 200 px, elles sont dans
// l'application (src/assets/paysages) : la fiche les imprime sans réseau,
// leur crédit dessous, comme la licence le demande.

import type { FamillePaysage } from "./lireUnPaysage";

export interface PhotoPaysage {
  /** Le nom de son fichier, sans « .jpg ». */
  id: string;
  /** Le paysage qu'elle montre, avec les mots de la fiche. */
  type: string;
  /** Les familles de paysages de l'atelier où elle se propose. */
  familles: FamillePaysage[];
  /** Le lieu. */
  titre: string;
  auteur: string;
  licence: string;
  /** Sa page sur Wikimedia Commons : l'original, son auteur, sa licence. */
  page: string;
}

export const PHOTOS_PAYSAGES: PhotoPaysage[] = [
  { id: "ville", type: "une ville", familles: ["villeVillage"], titre: "Rouen, la Seine et la ville",
    auteur: "CEphoto, Uwe Aranas", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Rouen_France_Panoramic-View-02.jpg" },
  { id: "village", type: "un village", familles: ["villeVillage", "residentiel"], titre: "Belcastel, le village et son pont",
    auteur: "kallerna", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Belcastel_4.jpg" },
  { id: "campagne", type: "la campagne", familles: ["villeVillage"], titre: "Un chêne dans un champ de colza, dans le Jura",
    auteur: "ZarlokX", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Ch%C3%AAne,_colza,_Jura_(horizontal).jpg" },
  { id: "foret-temperee", type: "une forêt tempérée", familles: ["monde"], titre: "Une forêt de hêtres au printemps",
    auteur: "Stephan van Helden", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Im_Naturwaldreservat_Wildacker_15.jpg" },
  { id: "foret-tropicale", type: "une forêt tropicale", familles: ["monde"], titre: "La forêt guyanaise près de Kourou",
    auteur: "Stéphane Lesbats (Ifremer)", licence: "CC BY 4.0", page: "https://commons.wikimedia.org/wiki/File:For%C3%AAt_guyanaise_aux_abords_de_Kourou_(Guyane)_(Ifremer_00807-91904_-_53040).jpg" },
  { id: "desert-chaud", type: "un désert chaud", familles: ["monde"], titre: "Une caravane dans le Sahara",
    auteur: "Sergey Pesterev", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Caravan_in_the_desert.jpg" },
  { id: "desert-froid", type: "un désert froid", familles: ["monde"], titre: "Le mont Herschel, en Antarctique",
    auteur: "Andrew Mandemaker", licence: "CC BY-SA 2.5", page: "https://commons.wikimedia.org/wiki/File:Mt_Herschel,_Antarctica,_Jan_2006.jpg" },
  { id: "prairie", type: "une prairie", familles: ["monde"], titre: "Les prairies des Grasslands, au Canada",
    auteur: "Ethan Sahagun", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Cloud_shadows_over_hills_in_Grasslands_National_Park.jpg" },
  { id: "savane", type: "une savane", familles: ["monde"], titre: "La savane d'Amboseli et le Kilimandjaro, au Kenya",
    auteur: "Sergey Pesterev", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Kilimanjaro_from_Amboseli.jpg" },
  { id: "montagne", type: "une montagne", familles: ["monde"], titre: "Le massif du Mont-Blanc",
    auteur: "Krzysztof Golik", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Massif_du_Mont-Blanc_from_Lac_de_Joux_Plane_03.jpg" },
  { id: "plaine", type: "une plaine", familles: ["monde"], titre: "La plaine de la Messara, en Crète",
    auteur: "Jebulon", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Mount_Ida_chain_Messara_plain_from_Phaistos_Crete_Greece.jpg" },
  { id: "plateau", type: "un plateau", familles: ["monde"], titre: "Les tepuys Kukenán et Roraima, au Venezuela",
    auteur: "Paolo Costa Baldi", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Kukenan_Roraima_GS.jpg" },
  { id: "vallee", type: "une vallée", familles: ["monde"], titre: "La vallée de Gavarnie, dans les Pyrénées",
    auteur: "Moahim", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:2019_-_Parc_national_des_Pyrenees_-_Vall%C3%A9e_de_Gavarnie.jpg" },
  { id: "fleuve", type: "un fleuve", familles: ["monde"], titre: "Le Nil à Assouan, en Égypte",
    auteur: "Marc Ryckaert (MJJR)", licence: "CC BY 3.0", page: "https://commons.wikimedia.org/wiki/File:Aswan_Nile_R23.jpg" },
  { id: "centre-ville", type: "un centre-ville historique", familles: ["residentiel"], titre: "La Petite Venise, à Colmar",
    auteur: "Krzysztof Golik", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Little_Venice_in_Colmar_01.jpg" },
  { id: "quartier-recent", type: "un quartier récent d'habitation", familles: ["residentiel"], titre: "L'écoquartier de Bonne, à Grenoble",
    auteur: "Simdaperce", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Ecoquartier_de_Bonne_-_Grenoble_3.JPG" },
  { id: "grand-ensemble", type: "un grand ensemble", familles: ["residentiel"], titre: "Le quartier des Musiciens, aux Mureaux",
    auteur: "Matgrt", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Les_Mureaux_-_Musiciens.jpg" },
  { id: "lotissement", type: "un lotissement pavillonnaire", familles: ["residentiel"], titre: "Un lotissement à Saint-Maurice-de-Beynost, vu d'un drone",
    auteur: "Benoît Prieur", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Drone_-_vue_du_lotissement_de_la_rue_des_M%C3%BBriers_%C3%A0_Saint-Maurice-de-Beynost_(mars_2020).JPG" },
  { id: "industriel", type: "un paysage industriel", familles: ["activites"], titre: "Une usine au bord du canal, à Marcq-en-Barœul",
    auteur: "Velvet", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Marcq_bord_canal_usine_lesaffre_fumees.jpg" },
  { id: "agricole", type: "un paysage agricole", familles: ["activites"], titre: "Des vignes et des champs, à Autignac",
    auteur: "Christian Ferrer", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Autignac,_H%C3%A9rault_01.jpg" },
  { id: "commercial", type: "un paysage d'activité commerciale", familles: ["activites"], titre: "La zone commerciale d'Avignon Nord, vue d'avion",
    auteur: "Jean-Louis Zimmermann", licence: "CC BY 2.0", page: "https://commons.wikimedia.org/wiki/File:Vue_a%C3%A9rienne,_zone_commerciale_Avignon_Nord_(LE_PONTET,FR84)_2007-10-09.jpg" },
  { id: "quartier-affaires", type: "un quartier d'affaires", familles: ["activites"], titre: "La Défense, vue du bois de Boulogne",
    auteur: "GFreihalter", licence: "CC BY-SA 3.0", page: "https://commons.wikimedia.org/wiki/File:Paris_Bois_de_Boulogne_La_D%C3%A9fense_116.JPG" },
  { id: "station-littorale", type: "une station touristique littorale", familles: ["activites"], titre: "La Grande Plage de Biarritz",
    auteur: "Christian David", licence: "CC BY-SA 4.0", page: "https://commons.wikimedia.org/wiki/File:Grande_plage_de_Biarritz_en_2025.jpg" },
  { id: "station-montagne", type: "une station touristique de montagne", familles: ["activites"], titre: "Les Menuires, station de ski",
    auteur: "DimiTalen", licence: "CC0", page: "https://commons.wikimedia.org/wiki/File:Overview_of_Les_Menuires_and_the_Belleville_valley.jpg" },
];

export const photoPaysage = (id: string | null | undefined): PhotoPaysage | undefined => PHOTOS_PAYSAGES.find((p) => p.id === id);

/** Les photographies d'une famille de paysages, dans l'ordre de la fiche. */
export const photosDe = (famille: FamillePaysage): PhotoPaysage[] => PHOTOS_PAYSAGES.filter((p) => p.familles.includes(famille));

/** Le crédit imprimé sous la photographie : l'auteur, la licence, d'où elle vient. */
export const creditPhoto = (p: PhotoPaysage): string =>
  `Photo : ${p.auteur}, ${p.licence === "CC0" ? "domaine public (CC0)" : `licence ${p.licence}`}, Wikimedia Commons.`;

// Chaque fichier se charge à la demande, en données : la feuille l'emporte avec elle à l'impression.
const FICHIERS = import.meta.glob<string>("./assets/paysages/*.jpg", { query: "?inline", import: "default" });

/** La photographie, en données (« data:image/jpeg;base64,… ») ; rien si elle n'existe pas. */
export async function chargerPhotoPaysage(id: string): Promise<string | null> {
  const charger = FICHIERS[`./assets/paysages/${id}.jpg`];
  return charger ? charger() : null;
}

/** Ce que la feuille écrit à la place d'une photographie qu'elle n'a pas encore : l'impression la remplace. */
export const ATTENTE_PHOTO = "paysage:";

/** La feuille avec ses photographies : chaque « paysage:<nom> » devient l'image elle-même. */
export async function avecLesPhotosDePaysage(html: string): Promise<string> {
  const ids = [...new Set([...html.matchAll(/src="paysage:([a-z0-9-]+)"/g)].map((m) => m[1]))];
  if (!ids.length) return html;
  const images = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await chargerPhotoPaysage(id)] as const)));
  return html.replace(/src="paysage:([a-z0-9-]+)"/g, (tout, id: string) => (images[id] ? `src="${images[id]}"` : tout));
}
