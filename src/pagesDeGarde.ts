// Pages de garde, mots aux familles et listes de fournitures.
//
// Trois documents que l'on refait chaque rentrée : la première page d'un
// cahier, le mot qui explique aux familles ce qu'elles vont y lire, et la
// liste de ce qu'il faut acheter. L'application connaît déjà l'établissement,
// l'enseignant et l'année : elle pose l'en-tête et la signature, et il ne
// reste que le texte à écrire — à la main, ou avec l'IA.
//
// L'IA n'écrit que le corps : l'en-tête et les coordonnées viennent des
// réglages, jamais du modèle, qui inventerait un numéro de téléphone. Rien de
// nominatif sur les élèves ne lui est transmis.

import { echapper } from "./texteRiche";

/** Le dossier réservé de ces documents, hors du plan de travail. */
export const DOSSIER_GARDE = "@pages-de-garde";

export type SorteGarde = "cahier" | "lettre" | "fournitures";

export const SORTES: { id: SorteGarde; libelle: string; icone: string; aide: string; titre: string }[] = [
  { id: "cahier", libelle: "Page de garde", icone: "📘", titre: "Cahier de classe",
    aide: "La première page d'un cahier ou d'un classeur, au nom de l'élève." },
  { id: "lettre", libelle: "Mot aux familles", icone: "✉️", titre: "Mot aux familles",
    aide: "Ce que le cahier contient et comment le lire, en quelques paragraphes." },
  { id: "fournitures", libelle: "Fournitures scolaires", icone: "🎒", titre: "Fournitures scolaires",
    aide: "La liste à acheter pour la rentrée, sans superflu." },
];

export interface InfosGarde {
  sorte: SorteGarde;
  /** Le nom du document : « Cahier de classe », « Cahier de liaison »… */
  titre: string;
  annee: string;
  ecole: string;
  enseignant: string;
  fonction: string;
  telephone: string;
  niveau: string;
  /** Unité d'enseignement : le ton et le contenu ne sont pas les mêmes. */
  ime: boolean;
  /** Ce que l'enseignant ajoute : « élèves non lecteurs », « budget serré »… */
  precisions: string;
}

const ligne = (texte: string) => `<p>${echapper(texte)}</p>`;
const centre = (html: string) => `<p style="text-align:center">${html}</p>`;

/** L'en-tête : le titre du document, l'établissement, l'année. */
export function entete(i: InfosGarde): string {
  const sousTitre = [i.ecole, i.niveau, i.annee].filter(Boolean).join(" · ");
  const titre = i.titre.trim() || SORTES.find((s) => s.id === i.sorte)!.titre;
  return `<h1${i.sorte === "cahier" ? ' style="text-align:center"' : ""}>${echapper(titre)}</h1>`
    + (sousTitre ? (i.sorte === "cahier" ? centre(echapper(sousTitre)) : ligne(sousTitre)) : "");
}

/** La signature : l'enseignant, sa fonction, le téléphone de l'établissement. */
export function signature(i: InfosGarde): string {
  const qui = [i.enseignant.trim(), i.fonction.trim()].filter(Boolean);
  if (!qui.length && !i.telephone.trim()) return "";
  const tel = i.telephone.trim() ? `<br>${echapper(i.telephone.trim())}` : "";
  return `<p style="text-align:right">${qui.map(echapper).join("<br>")}${tel}</p>`;
}

/** Le document complet : ce que l'application sait, autour du texte écrit. */
export function assembler(i: InfosGarde, corps: string): string {
  const fin = i.sorte === "cahier" ? "" : signature(i);
  return `${entete(i)}${corps}${fin}`;
}

/** Le corps proposé sans l'IA : un document déjà présentable, à retoucher. */
export function corpsParDefaut(i: InfosGarde): string {
  if (i.sorte === "cahier") {
    return centre("<br>")
      + centre("<b>Nom de l'élève :</b> ……………………………………")
      + centre("<br>")
      + (i.enseignant.trim() ? centre(echapper([i.enseignant.trim(), i.fonction.trim()].filter(Boolean).join(" — "))) : "")
      + centre("<br>")
      + centre("<i>Ce cahier fait le lien entre la classe et la maison : regardez-le ensemble.</i>");
  }
  if (i.sorte === "lettre") {
    const travaux = i.ime
      ? "La quantité de traces écrites varie beaucoup d'un jeune à l'autre : certains manipulent longuement sans pouvoir écrire, et laissent donc peu de traces. J'ai photocopié et collé la plupart des rituels pour que vous ayez tout de même une vue d'ensemble du travail proposé."
      : "Vous y trouverez les travaux de la période : les réussites comme les essais, qui font partie des apprentissages.";
    return ligne("Chères familles,")
      + ligne(`Afin de mieux suivre le déroulement de la scolarité de votre enfant, je vous ferai parvenir le « ${i.titre.trim() || "cahier"} » à chaque fin de période.`)
      + ligne(travaux)
      + ligne("Regardez-le avec votre enfant : qu'il vous raconte ce qu'il a fait, ce qu'il a aimé, ce qui lui a demandé des efforts. C'est le meilleur moyen de valoriser son travail.")
      + ligne("Si vous souhaitez de plus amples informations, un rendez-vous est toujours possible.")
      + ligne("Bien cordialement,");
  }
  const liste = i.ime
    ? ["Une pochette à élastiques", "Une trousse : crayon à papier, gomme, taille-crayon, bâton de colle",
       "Des feutres et des crayons de couleur", "Une paire de ciseaux à bouts ronds", "Une photo d'identité récente",
       "Une tenue de sport dans un sac", "Un change complet, au nom de l'enfant"]
    : ["Une trousse : crayons à papier, gomme, taille-crayon, bâtons de colle", "Des feutres et des crayons de couleur",
       "Une paire de ciseaux à bouts ronds", "Une règle de 20 cm", "Une ardoise, un chiffon et des feutres effaçables",
       "Une pochette à élastiques", "Une tenue de sport dans un sac"];
  return ligne("Chères familles,")
    + ligne("Voici ce qu'il faut prévoir pour la rentrée. Le matériel de l'an dernier peut resservir s'il est en bon état.")
    + `<ul>${liste.map((x) => `<li>${echapper(x)}</li>`).join("")}</ul>`
    + ligne("Merci de marquer chaque objet au nom de votre enfant. Le reste du matériel est fourni par la classe.");
}

/** Le document complet sans l'IA. */
export const modeleLocal = (i: InfosGarde) => assembler(i, corpsParDefaut(i));

/** Ce que l'on demande au modèle : le corps, et rien d'autre. */
export function consigneIA(i: InfosGarde): string {
  const quoi = {
    cahier: "la page de garde d'un cahier d'élève : quelques lignes centrées, dont une ligne « Nom de l'élève » à compléter à la main, et une phrase qui dit à quoi sert ce cahier",
    lettre: "un mot aux familles qui explique ce que contient ce cahier et comment le regarder avec leur enfant",
    fournitures: "une liste de fournitures scolaires à acheter pour la rentrée, en une liste à puces précédée d'une phrase d'introduction",
  }[i.sorte];
  return [
    `Tu aides un enseignant${i.ime ? " spécialisé, en unité d'enseignement d'un IME," : ""} à rédiger, en français, ${quoi}.`,
    "Ton bienveillant et simple, sans jargon, phrases courtes ; vouvoiement.",
    "N'invente aucun fait : ni date, ni horaire, ni prix, ni numéro de téléphone, ni nom de personne ou d'établissement.",
    "Écris seulement le corps du document, en HTML simple : <p>, <ul>, <li>, <b>, <i>. Pas de titre principal, pas de signature, pas de coordonnées, pas de balise <html> ni de bloc de code.",
  ].join(" ");
}

/** La demande elle-même : rien de nominatif sur les élèves n'y figure. */
export function demandeIA(i: InfosGarde): string {
  const lignes = [`Document : ${i.titre.trim() || SORTES.find((s) => s.id === i.sorte)!.titre}.`];
  if (i.niveau.trim()) lignes.push(`Niveau des élèves : ${i.niveau.trim()}.`);
  if (i.ime) lignes.push("Contexte : unité d'enseignement d'un IME, élèves aux besoins très variés, beaucoup de manipulation.");
  if (i.precisions.trim()) lignes.push(`À prendre en compte : ${i.precisions.trim()}`);
  return lignes.join("\n");
}

/**
 * La réponse du modèle, ramenée à du HTML simple : sans bloc de code, et avec
 * des paragraphes quand il a répondu en texte brut.
 */
export function htmlDeLaReponse(reponse: string): string {
  let t = (reponse ?? "").trim();
  t = t.replace(/^```[a-z]*\s*\n?/i, "").replace(/\n?```$/i, "").trim();
  t = t.replace(/<\/?(html|head|body)\b[^>]*>/gi, "").trim();
  // Un titre principal reviendrait en double : l'en-tête le porte déjà.
  t = t.replace(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi, "").trim();
  if (/<(p|ul|ol|h2|h3|table|div)\b/i.test(t)) return t;
  return t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${echapper(p).replace(/\n/g, "<br>")}</p>`).join("");
}
