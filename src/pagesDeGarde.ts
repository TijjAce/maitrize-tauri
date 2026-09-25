// Pages de garde, mots aux familles et listes de fournitures.
//
// Trois documents que l'on refait chaque rentrée : la première page d'un
// cahier, le mot qui explique aux familles ce qu'elles vont y lire, et la
// liste de ce qu'il faut acheter. L'application connaît déjà l'établissement,
// l'enseignant et l'année : elle pose l'en-tête et la signature, et il ne
// reste que le texte à écrire — à la main, ou avec l'IA.
//
// Ce texte se compose en cochant des cases : ce que la page doit porter, ce
// que le mot doit dire, ce que la liste doit contenir. Chaque case sait deux
// choses — la phrase qu'elle écrit toute seule, et ce qu'elle demande au
// modèle. On obtient donc le même document dans les deux cas, l'IA n'ajoutant
// que le style.
//
// La liste de fournitures suit l'esprit des listes ministérielles : courte,
// simple, peu coûteuse, pour épargner le budget des familles et le dos des
// élèves. D'où les cases « liste courte », « réutiliser l'an dernier »,
// « éviter le matériel coûteux », cochées ou non selon l'école.
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
  /** Les cases cochées : ce que le document doit contenir. */
  choix: string[];
  /** Ce que l'enseignant ajoute : « élèves non lecteurs », « budget serré »… */
  precisions: string;
}

const ligne = (texte: string) => `<p>${echapper(texte)}</p>`;
const centre = (html: string) => `<p style="text-align:center">${html}</p>`;

// ── Les cases à cocher ────────────────────────────────────────────────────

export interface OptionGarde {
  id: string;
  /** Ce que la case dit, à côté du carré. */
  libelle: string;
  /** Ce qu'elle demande au modèle, à la suite de « le mot doit dire … ». */
  demande: string;
  /**
   * Ce qu'elle écrit sans l'IA : du HTML simple, écrit ici et jamais saisi,
   * ou une fonction quand la phrase dépend des réglages.
   */
  corps?: string | ((i: InfosGarde) => string);
  /** Pour les fournitures : la puce de la liste. */
  puce?: string;
  /** Cochée à l'ouverture. */
  dOffice?: boolean;
  /** Proposée seulement en IME, ou seulement hors IME. */
  quand?: "ime" | "ordinaire";
}

export interface GroupeGarde { titre: string; options: OptionGarde[] }

/** Une case ordinaire : ce qu'elle demande, et le paragraphe qu'elle écrit. */
const c = (id: string, libelle: string, demande: string,
           corps?: OptionGarde["corps"], reste: Partial<OptionGarde> = {}): OptionGarde =>
  ({ id, libelle, demande, corps, ...reste });

/** Une fourniture : la puce qu'elle ajoute est aussi ce qu'on en dit au modèle. */
const f = (id: string, libelle: string, puce: string, reste: Partial<OptionGarde> = {}): OptionGarde =>
  ({ id, libelle, demande: puce.charAt(0).toLowerCase() + puce.slice(1), puce, ...reste });

/** Le nom de l'enseignant tel qu'il s'écrit au milieu d'une page de garde. */
const quiSigne = (i: InfosGarde) => [i.enseignant.trim(), i.fonction.trim()].filter(Boolean).join(" — ");

export const GROUPES: Record<SorteGarde, GroupeGarde[]> = {
  cahier: [
    { titre: "Sur la page", options: [
      c("nom", "Une ligne « Nom de l'élève » à compléter", "une ligne « Nom de l'élève » à compléter à la main",
        centre("<b>Nom de l'élève :</b> ……………………………………"), { dOffice: true }),
      c("classe", "La classe", "la classe",
        (i) => (i.niveau.trim() ? centre(echapper(`Classe : ${i.niveau.trim()}`)) : centre("Classe : …………………"))),
      c("enseignant", "Le nom de l'enseignant", "le nom de l'enseignant",
        (i) => (quiSigne(i) ? centre(echapper(quiSigne(i))) : ""), { dOffice: true }),
      c("photo", "De la place pour une photo ou un dessin", "un espace vide au milieu, pour coller une photo ou faire un dessin",
        centre("<br><br><br>") + centre("<i>photo ou dessin de l'élève</i>")),
      c("picto", "De la place pour un pictogramme", "la place d'un pictogramme, à côté du titre",
        centre("<br>"), { quand: "ime" }),
    ] },
    { titre: "Le ton", options: [
      c("role", "Une phrase qui dit à quoi sert ce cahier", "une phrase qui dit à quoi sert ce cahier",
        centre("<i>Ce cahier fait le lien entre la classe et la maison : regardez-le ensemble.</i>"), { dOffice: true }),
      c("accueil", "Un mot d'accueil pour l'élève", "un mot d'accueil adressé à l'élève",
        centre("<i>Bienvenue dans ta classe. Bonne année de travail !</i>")),
      c("soin", "Trois règles de tenue du cahier", "trois règles simples de tenue du cahier, écrites à la première personne",
        centre("<i>Je note la date. J'écris proprement. Je range mon cahier dans mon cartable.</i>")),
      c("sobre", "Peu de texte, de grands caractères", "très peu de texte : quelques mots par ligne, lisibles de loin"),
    ] },
  ],

  lettre: [
    { titre: "Ce que le mot explique", options: [
      c("rythme", "À quel rythme le cahier rentre à la maison", "à quel rythme le cahier rentre à la maison",
        (i) => ligne(`Le « ${i.titre.trim() || "cahier"} » vous sera remis à chaque fin de période.`), { dOffice: true }),
      c("contenu", "Ce qu'on y trouve", "ce que le cahier contient",
        ligne("Vous y trouverez les travaux de la période : les réussites comme les essais, qui font partie des apprentissages."),
        { dOffice: true }),
      c("traces", "Que la quantité d'écrit varie d'un élève à l'autre",
        "que la quantité de traces écrites varie beaucoup d'un jeune à l'autre, et que les rituels ont été photocopiés pour donner tout de même une vue d'ensemble",
        ligne("La quantité de traces écrites varie beaucoup d'un jeune à l'autre : certains manipulent longuement sans pouvoir écrire, et laissent donc peu de traces. J'ai photocopié et collé la plupart des rituels pour que vous ayez tout de même une vue d'ensemble du travail proposé."),
        { dOffice: true, quand: "ime" }),
      c("regarder", "Comment le regarder avec son enfant", "comment le regarder avec son enfant, en le laissant raconter",
        ligne("Regardez-le avec votre enfant : qu'il vous raconte ce qu'il a fait, ce qu'il a aimé, ce qui lui a demandé des efforts. C'est le meilleur moyen de valoriser son travail."),
        { dOffice: true }),
      c("progres", "Qu'on y lit un chemin, pas une comparaison", "que ce cahier montre le chemin parcouru par l'enfant, et ne se compare à aucun autre",
        ligne("Ce cahier montre le chemin parcouru par votre enfant : il ne se compare à celui d'aucun autre.")),
    ] },
    { titre: "Ce que vous demandez aux familles", options: [
      c("signer", "Signer le cahier", "de signer le cahier avant de le rendre",
        ligne("Merci de le signer avant de le rendre.")),
      c("rapporter", "Le rapporter après les vacances", "de le rapporter à la rentrée qui suit les vacances",
        ligne("Merci de le rapporter à la rentrée qui suit les vacances.")),
      c("mot", "Y écrire un mot si elles le souhaitent", "qu'elles peuvent y écrire un mot",
        ligne("Vous pouvez y écrire un mot : je le lirai avec plaisir.")),
      c("soigner", "En prendre soin, il sert toute l'année", "d'en prendre soin, puisqu'il sert toute l'année",
        ligne("Il sert toute l'année : prenez-en soin ensemble.")),
    ] },
    { titre: "Rester en lien", options: [
      c("rdv", "Un rendez-vous est toujours possible", "qu'un rendez-vous est toujours possible",
        ligne("Si vous souhaitez de plus amples informations, un rendez-vous est toujours possible."), { dOffice: true }),
      c("liaison", "Passer par le cahier de liaison", "que le plus simple, pour me joindre, est un mot dans le cahier de liaison",
        ligne("Pour me joindre, le plus simple reste un mot dans le cahier de liaison.")),
    ] },
  ],

  fournitures: [
    { titre: "Écrire", options: [
      f("trousse", "Une trousse", "Une trousse", { dOffice: true }),
      f("crayon", "Crayon à papier, gomme, taille-crayon", "Un crayon à papier, une gomme et un taille-crayon à réservoir", { dOffice: true }),
      f("stylos", "Stylos bleu, vert, rouge, noir", "Quatre stylos : bleu, vert, rouge et noir", { quand: "ordinaire" }),
      f("ardoise", "Ardoise, feutres et chiffon", "Une ardoise, des feutres effaçables et un chiffon"),
      f("surligneurs", "Surligneurs", "Deux surligneurs de couleurs différentes", { quand: "ordinaire" }),
    ] },
    { titre: "Couper, coller, colorier", options: [
      f("colle", "Bâtons de colle", "Deux bâtons de colle", { dOffice: true }),
      f("ciseaux", "Ciseaux à bouts ronds", "Une paire de ciseaux à bouts ronds", { dOffice: true }),
      f("couleurs", "Crayons de couleur et feutres", "Des crayons de couleur et des feutres", { dOffice: true }),
      f("regle", "Règle de 20 cm", "Une règle de 20 cm"),
    ] },
    { titre: "Ranger", options: [
      f("pochette", "Pochette à élastiques", "Une pochette à élastiques", { dOffice: true }),
      f("protege", "Protège-cahiers", "Des protège-cahiers", { quand: "ordinaire" }),
      f("classeur", "Classeur, intercalaires, pochettes", "Un classeur, des intercalaires et des pochettes transparentes", { quand: "ordinaire" }),
      f("agenda", "Agenda ou cahier de textes", "Un agenda ou un cahier de textes", { quand: "ordinaire" }),
      f("cartable", "Cartable", "Un cartable assez grand pour un classeur"),
    ] },
    { titre: "Géométrie", options: [
      f("equerre", "Équerre et compas", "Une équerre et un compas", { quand: "ordinaire" }),
      f("regleGraduee", "Règle graduée de 30 cm", "Une règle graduée de 30 cm", { quand: "ordinaire" }),
    ] },
    { titre: "Pour la journée", options: [
      f("sport", "Tenue de sport", "Une tenue de sport dans un sac", { dOffice: true }),
      f("change", "Change complet", "Un change complet, au nom de l'enfant", { quand: "ime", dOffice: true }),
      f("photo", "Photo d'identité", "Une photo d'identité récente", { quand: "ime" }),
      f("mouchoirs", "Boîte de mouchoirs", "Une boîte de mouchoirs"),
      f("gourde", "Gourde", "Une gourde marquée à son nom"),
      f("chaussons", "Chaussons", "Une paire de chaussons", { quand: "ime" }),
    ] },
    { titre: "L'esprit de la liste", options: [
      c("courte", "Liste courte : le reste est fourni par la classe",
        "que la liste est volontairement courte, tout le reste étant fourni par la classe",
        ligne("Cette liste est volontairement courte : tout le reste est fourni par la classe."), { dOffice: true }),
      c("reutiliser", "Réutiliser le matériel de l'an dernier", "de réutiliser le matériel de l'an dernier s'il est en bon état",
        ligne("Le matériel de l'an dernier peut resservir s'il est en bon état."), { dOffice: true }),
      c("marquer", "Tout marquer au nom de l'enfant", "de marquer chaque objet au nom de l'enfant",
        ligne("Merci de marquer chaque objet au nom de votre enfant."), { dOffice: true }),
      c("prix", "Éviter le matériel coûteux", "d'éviter le matériel coûteux ou de marque"),
      c("poids", "Penser au poids du cartable", "de tenir compte du poids du cartable"),
      c("adapte", "Matériel adapté : gros crayons, ciseaux à ressort",
        "du matériel adapté : crayons épais, ciseaux à ressort, gomme facile à tenir",
        ligne("Si votre enfant en a besoin : crayons épais, ciseaux à ressort, gomme facile à tenir — n'hésitez pas à m'en parler."),
        { quand: "ime" }),
    ] },
  ],
};

/** Les cases proposées pour ce document : l'IME n'achète pas la même chose. */
export function groupesDe(sorte: SorteGarde, ime: boolean): GroupeGarde[] {
  return GROUPES[sorte]
    .map((g) => ({ ...g, options: g.options.filter((o) => !o.quand || (o.quand === "ime") === ime) }))
    .filter((g) => g.options.length > 0);
}

/** Toutes les cases d'un document, groupes mis à plat. */
export const optionsDe = (sorte: SorteGarde, ime: boolean): OptionGarde[] =>
  groupesDe(sorte, ime).flatMap((g) => g.options);

/** Les cases cochées à l'ouverture : un document déjà correct, à ajuster. */
export const choixParDefaut = (sorte: SorteGarde, ime: boolean): string[] =>
  optionsDe(sorte, ime).filter((o) => o.dOffice).map((o) => o.id);

/** Coche ou décoche une case. */
export const basculer = (choix: string[], id: string): string[] =>
  (choix.includes(id) ? choix.filter((x) => x !== id) : [...choix, id]);

/** Les cases cochées, dans l'ordre où elles sont proposées — pas celui des clics. */
export const cochees = (i: InfosGarde): OptionGarde[] =>
  optionsDe(i.sorte, i.ime).filter((o) => i.choix.includes(o.id));

// ── Le document ───────────────────────────────────────────────────────────

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

/**
 * Le corps écrit sans l'IA : les cases cochées, mises bout à bout.
 *
 * Une page de garde est une suite de lignes centrées ; un mot aux familles,
 * des paragraphes entre « Chères familles » et la formule de politesse ; une
 * liste de fournitures, des puces suivies de ce qu'on demande aux familles.
 */
export function corpsParDefaut(i: InfosGarde): string {
  const choisies = cochees(i);
  const ecrit = (o: OptionGarde) => (typeof o.corps === "function" ? o.corps(i) : o.corps ?? "");

  if (i.sorte === "cahier") {
    const blocs = choisies.map(ecrit).filter(Boolean);
    return centre("<br>") + blocs.join(centre("<br>"));
  }

  const puces = choisies.filter((o) => o.puce).map((o) => `<li>${echapper(o.puce!)}</li>`).join("");
  const textes = choisies.map(ecrit).filter(Boolean).join("");

  if (i.sorte === "fournitures") {
    return ligne("Chères familles,")
      + ligne("Voici ce qu'il faut prévoir pour la rentrée.")
      + (puces ? `<ul>${puces}</ul>` : "")
      + textes;
  }
  return ligne("Chères familles,") + textes + ligne("Bien cordialement,");
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
    "Traite tout ce qui t'est demandé, et rien d'autre : ce qui n'est pas dans la demande n'a pas sa place dans le document.",
    "N'invente aucun fait : ni date, ni horaire, ni prix, ni numéro de téléphone, ni nom de personne ou d'établissement.",
    "Écris seulement le corps du document, en HTML simple : <p>, <ul>, <li>, <b>, <i>. Pas de titre principal, pas de signature, pas de coordonnées, pas de balise <html> ni de bloc de code.",
  ].join(" ");
}

/** L'en-tête de la liste des cases cochées, selon le document. */
const ATTENDU: Record<SorteGarde, string> = {
  cahier: "La page doit porter",
  lettre: "Le mot doit dire",
  fournitures: "Et il faut dire aux familles",
};

/** La demande elle-même : rien de nominatif sur les élèves n'y figure. */
export function demandeIA(i: InfosGarde): string {
  const lignes = [`Document : ${i.titre.trim() || SORTES.find((s) => s.id === i.sorte)!.titre}.`];
  if (i.niveau.trim()) lignes.push(`Niveau des élèves : ${i.niveau.trim()}.`);
  if (i.ime) lignes.push("Contexte : unité d'enseignement d'un IME, élèves aux besoins très variés, beaucoup de manipulation.");
  const choisies = cochees(i);
  const aLister = choisies.filter((o) => o.puce);
  const consignes = choisies.filter((o) => !o.puce);
  if (aLister.length) {
    lignes.push("La liste doit contenir ces fournitures, et aucune autre :");
    for (const o of aLister) lignes.push(`- ${o.demande}`);
  }
  if (consignes.length) {
    lignes.push(`${ATTENDU[i.sorte]} :`);
    for (const o of consignes) lignes.push(`- ${o.demande}`);
  }
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
