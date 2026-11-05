// L'assistant de l'atelier Problèmes : on lui dit la feuille voulue, il règle l'atelier.
//
// « Essaye de faire un tchatbot ici » (l'enseignant, 5 novembre 2026, sur
// Fabriquer › Problèmes). L'enseignant écrit ce qu'il veut — « 8 problèmes
// jusqu'à 20 où l'on cherche une partie », « des problèmes avec des
// citrouilles », « remplace le 3 », « dans le 2, mets 8 et 5 » — et
// l'assistant règle l'atelier : ce que l'élève cherche, les parties, les
// nombres, le nombre de problèmes, le titre, les prénoms, les thèmes ; il
// remplace un problème, en choisit les nombres, tire une autre feuille.
//
// Puis « tout ça, je voulais dire le tchatbot » (le même jour, sur les
// panneaux « Les problèmes » et « La présentation ») : l'atelier n'a plus
// que lui. Il règle donc aussi toute la présentation — titre, lignes
// « Prénom » et « Date », colonnes, police, taille du texte, capitales,
// lignes « Calcul » et « Réponse », le schéma, ses mots, ses couleurs, les
// images dans les cases —, reprend ou garde une présentation enregistrée,
// montre le corrigé, imprime la feuille ou la pose sur le bureau.
//
// Mistral ne choisit que des réglages et des mots. Les nombres, les calculs
// et les réponses restent ceux du générateur (problemesBarres.ts) : un
// thème qu'il invente n'apporte que son vocabulaire (« citrouilles
// orange » / « orange »), jamais un énoncé ni un résultat.
//
// Sa réponse est un objet JSON relu ici avec méfiance : ce qui ne se lit pas
// ne change rien. Les prénoms — ceux des élèves, ceux du champ « Prénoms
// dans les énoncés » — partent masqués et reviennent ici (confidentialite.ts).

import { api, type ChatMessage } from "./api";
import { pseudonymiserTout, restaurer } from "./confidentialite";
import { nomsAMasquer } from "./nomsAMasquer";
import {
  CONTEXTES_PARTIES, PLAFONDS, TYPES_MULTIPLICATIFS, contexteLu, lirePrenoms, nomDuContexte, valeurDePresentation,
  type ContexteParties, type InconnuePartieTout, type Presentation, type Probleme, type TypeMultiplicatif,
} from "./problemesBarres";

export type SorteDeProblemes = "partieTout" | "multiplicatifs";

/** Les réglages de l'atelier que l'assistant peut changer (ceux d'un onglet ou de l'autre). */
export interface ReglagesDeLAtelier {
  titre: string; nombre: number; prenoms: string;
  // Partie-tout.
  parties: number; inconnue: InconnuePartieTout; max: number; perso: boolean; toutMin: number; toutMax: number; partieMin: number;
  /** Les thèmes où l'on tire, par leur nom ; vide : tous les thèmes livrés. */
  themes: string[];
  /** Les thèmes de l'enseignant, écrits avec l'assistant. */
  themesPerso: ContexteParties[];
  // Multiplicatifs.
  types: TypeMultiplicatif[]; table: number; partsMin: number; partsMax: number; valeurMin: number; valeurMax: number;
}

/** Les réglages de l'autre onglet, pour compléter ceux d'un onglet : l'assistant ne lit que ceux de sa sorte. */
export const REGLAGES_NEUTRES: ReglagesDeLAtelier = {
  titre: "", nombre: 6, prenoms: "",
  parties: 2, inconnue: "melange", max: 20, perso: false, toutMin: 5, toutMax: 10, partieMin: 1, themes: [], themesPerso: [],
  types: ["tout", "part", "nombre"], table: 10, partsMin: 2, partsMax: 5, valeurMin: 1, valeurMax: 5,
};

/** Ce que l'assistant a compris : ce qu'il dit, et ce qui change dans l'atelier — rien de plus que ce qu'il a lu. */
export interface ReponseProblemes {
  reponse: string;
  reglages: Partial<ReglagesDeLAtelier>;
  /** Les problèmes à remplacer par d'autres, comptés à partir de 1. */
  remplacer?: number[];
  /** Les nombres choisis pour un problème partie-tout : ses parties, et la case cherchée (-1 : le tout). */
  nombres?: { probleme: number; valeurs: number[]; inconnue: number }[];
  nouvelleFeuille?: boolean;
  /** Une présentation toute faite : la feuille complète, ou le modèle en barres seul ; avant les autres changements. */
  modele?: "complete" | "modele-seul";
  /** Une présentation enregistrée à reprendre, par son nom. */
  presentationEnregistree?: string;
  /** Les éléments de présentation qui changent, relus. */
  presentation?: Partial<Presentation>;
  /** Garder la présentation (après les changements) sous ce nom. */
  enregistrerPresentation?: string;
  voirCorrige?: boolean;
  imprimer?: boolean;
  surLeBureau?: boolean;
}

/** Ce que l'assistant voit de l'atelier : ses réglages, la présentation, et la feuille telle qu'elle est. */
export interface EtatDeLAtelier {
  sorte: SorteDeProblemes; reglages: ReglagesDeLAtelier; problemes: Probleme[];
  presentation?: Presentation; presentationsEnregistrees?: string[]; voirCorrige?: boolean;
}

export const NOMBRES_DE_PROBLEMES = [1, 2, 3, 4, 5, 6, 8, 10, 12];

/** Ce que l'assistant dit en s'ouvrant. */
export const accueilDesProblemes = (sorte: SorteDeProblemes) => (sorte === "partieTout"
  ? "Quelle feuille voulez-vous ? Les problèmes — « 8 problèmes jusqu'à 20 où l'on cherche une partie », « avec des citrouilles », « remplace le 3 » — "
    + "et la présentation — « en grand », « le modèle en barres seul », « 2 colonnes », « des images à compter ». Je peux aussi imprimer."
  : "Quelle feuille voulez-vous ? Les problèmes — « seulement des partages en parts égales », « tables de 2 à 5 », « remplace le 2 » — "
    + "et la présentation — « en grand », « sans énoncé », « 2 par page ». Je peux aussi imprimer.");

const ouiNon = (v: boolean) => (v ? "oui" : "non");

/** La présentation en clair, pour l'assistant. */
export function presentationEnClair(p: Presentation): string {
  return [
    `titre ${ouiNon(p.titre)}, lignes Prénom et Date ${ouiNon(p.nomDate)}, numéros ${ouiNon(p.numeros)}, cadres ${ouiNon(p.cadres)}, `
      + `${p.parPage ? `${p.parPage} par page` : "à la suite"}, ${p.colonnes} colonne(s), police ${p.police}, corrigé à la fin ${ouiNon(p.corrige)}`,
    `énoncé ${ouiNon(p.enonce)}, texte ${p.tailleTexte}, capitales ${ouiNon(p.capitales)}, ligne Calcul ${ouiNon(p.calcul)}, ligne Réponse ${ouiNon(p.reponse)}`,
    `schéma : ${p.schema}, case à trouver « ${p.inconnue} », mots ${ouiNon(p.etiquettes)} (« ${p.motTout} », « ${p.motPartie} »), accolades ${ouiNon(p.aides)}, `
      + `proportionnel ${ouiNon(p.proportionnel)}, tout en bas ${ouiNon(p.toutEnBas)}, couleurs ${p.couleurs}`
      + `${p.couleurs === "perso" ? ` (${p.couleurTout}, ${p.couleurPartie1}, ${p.couleurPartie2}, ${p.couleurPartie3})` : ""}, `
      + `traits ${p.epaisseur}, taille ${p.tailleSchema}, images dans les cases ${p.images}${p.images !== "non" ? ` (${p.formeImages})` : ""}`,
  ].join(" ; ");
}

const nomsDesThemes = (r: ReglagesDeLAtelier) => [...CONTEXTES_PARTIES, ...r.themesPerso].map(nomDuContexte);

/** L'atelier tel que l'assistant le lit : ses réglages, puis chaque problème avec ses nombres. */
export function ficheDesProblemes(e: EtatDeLAtelier): string {
  const r = e.reglages;
  const lignes = [`Titre de la feuille : ${r.titre.trim() || "(aucun)"}`, `Nombre de problèmes : ${r.nombre}`,
    `Prénoms dans les énoncés : ${r.prenoms.trim() || "(ceux de l'atelier)"}`];
  if (e.sorte === "partieTout") {
    lignes.push(
      `Ce que l'élève cherche : ${r.inconnue === "tout" ? "le tout" : r.inconnue === "partie" ? "une partie" : "le tout ou une partie, en alternance"}`,
      `Parties : ${r.parties}`,
      `Nombres : ${r.perso ? `le tout de ${r.toutMin} à ${r.toutMax}, chaque partie au moins ${r.partieMin}` : `jusqu'à ${r.max}`}`,
      `Thèmes : ${r.themes.length ? r.themes.join(", ") : "tous"} (thèmes connus : ${nomsDesThemes(r).join(", ")})`,
    );
  } else {
    lignes.push(
      `Types : ${r.types.map((t) => TYPES_MULTIPLICATIFS.find((x) => x.id === t)?.libelle ?? t).join(" ; ")}`,
      `Nombres : ${r.perso ? `parts (ou fois) de ${r.partsMin} à ${r.partsMax}, valeur d'une part de ${r.valeurMin} à ${r.valeurMax}` : `tables de 2 à ${r.table}`}`,
    );
  }
  if (e.presentation) lignes.push(`Présentation : ${presentationEnClair(e.presentation)}`);
  lignes.push(`Présentations enregistrées : ${e.presentationsEnregistrees?.length ? e.presentationsEnregistrees.join(", ") : "aucune"}`);
  lignes.push(`Aperçu : ${e.voirCorrige ? "le corrigé" : "la feuille"}`);
  lignes.push("La feuille :");
  e.problemes.forEach((p, i) => {
    const s = p.schema;
    const nombres = s.forme === "parties"
      ? `parties ${s.parties.map((c) => c.valeur).join(" et ")}, tout ${s.tout.valeur}, on cherche ${s.tout.connue ? `la partie ${s.parties.findIndex((c) => !c.connue) + 1}` : "le tout"}`
      : `réponse ${p.reponse}`;
    lignes.push(`${i + 1}. ${p.enonce || "(schéma seul)"} [${nombres}]`);
  });
  return lignes.join("\n");
}

/** La consigne de l'assistant, avec l'atelier tel qu'il est. */
export function consigneDesProblemes(e: EtatDeLAtelier): string {
  const commun = [
    "Tu es l'assistant de l'atelier « Problèmes » de Maitrize : un enseignant du premier degré fabrique une feuille de problèmes "
      + "à imprimer. Il te dit ce qu'il veut ; tu règles l'atelier, et tu dis en une ou deux phrases ce que tu as changé, en vouvoyant "
      + "l'enseignant. Tu n'écris jamais toi-même un énoncé, un nombre de la feuille ni une réponse : le générateur les tire et calcule.",
    "Réponds uniquement par un objet JSON. « reponse » est obligatoire ; les autres clés ne viennent que si elles changent quelque "
      + "chose que l'enseignant a demandé.",
    "Clés communes : « nombre » (1 à 12 problèmes), « titre », « prenoms » (une liste de prénoms à mettre dans les énoncés ; [] pour "
      + "revenir à ceux de l'atelier), « remplacer » (les numéros des problèmes à remplacer par d'autres), « nouvelleFeuille » (true "
      + "pour tirer une autre feuille).",
  ];
  const propre = e.sorte === "partieTout" ? [
    "Problèmes partie-tout : « inconnue » : \"tout\", \"partie\" ou \"melange\" (en alternance) ; « parties » : 2 ou 3 ; « max » : le "
      + "plus grand tout, 10, 20, 100 ou 1000 ; ou « plage » : {\"toutMin\": …, \"toutMax\": …, \"partieMin\": …} pour d'autres nombres.",
    "« themes » : les noms des thèmes à garder, parmi les thèmes connus ([] : tous). « nouveauxThemes » : un thème que l'enseignant "
      + "demande et qui n'existe pas, écrit ainsi : {\"tout\": [\"citrouille\", \"citrouilles\"], \"lieu\": \"Dans le champ\", "
      + "\"parties\": [{\"groupe\": [\"citrouille orange\", \"citrouilles orange\"], \"attribut\": [\"orange\", \"orange\"]}, "
      + "{\"groupe\": [\"citrouille verte\", \"citrouilles vertes\"], \"attribut\": [\"verte\", \"vertes\"]}]} — deux ou trois parties ; "
      + "sans « lieu », une personne possède (« Léa a… ») ; accorde bien le singulier et le pluriel, sans « il » ni « elle ». "
      + "Un thème nouveau devient seul thème de la feuille, sauf si l'enseignant veut aussi les autres.",
    "« nombres » : [{\"probleme\": 2, \"valeurs\": [8, 5], \"cherche\": \"tout\"}] quand l'enseignant choisit les nombres d'un "
      + "problème : les parties, et ce qu'on cherche — \"tout\" ou le numéro de la partie cherchée.",
  ] : [
    "Problèmes multiplicatifs : « types » parmi \"tout\" (le tout, d'après les parts égales), \"part\" (la valeur d'une part), "
      + "\"nombre\" (le nombre de parts), \"grand\" (la grande quantité, n fois plus), \"petit\" (la petite quantité) ; « table » : 5 "
      + "(tables de 2 à 5) ou 10 (de 2 à 10) ; ou « plage » : {\"partsMin\": …, \"partsMax\": …, \"valeurMin\": …, \"valeurMax\": …}.",
  ];
  const presentation = [
    "La présentation : « modele » : \"complete\" (la feuille complète) ou \"modele-seul\" (le modèle en barres et ses nombres, rien "
      + "d'autre). « presentation » : les seuls éléments qui changent, parmi titre, nomDate (lignes Prénom et Date), numeros, cadres, "
      + "parPage (0 : à la suite ; 1, 2, 3, 4 ou 6 par page), colonnes (1 ou 2), police (\"arial\", \"verdana\", \"comic\"), "
      + "corrige (corrigé à la fin), enonce (écrire l'énoncé), tailleTexte (\"normale\", \"grande\", \"tres-grande\"), capitales, "
      + "calcul (ligne Calcul), reponse (ligne Réponse), schema (\"nombres\" : les nombres dans le schéma, \"vide\" : cases que "
      + "l'élève remplit, \"sans\" : un cadre pour dessiner), inconnue (la case à trouver : \"?\", \"vide\", \"surlignee\"), "
      + "etiquettes (mots sur le schéma), motTout, motPartie, aides (accolades et légendes), proportionnel, toutEnBas, couleurs "
      + "(\"classe\", \"noir\", \"perso\"), couleurTout, couleurPartie1, couleurPartie2, couleurPartie3 (en #rrggbb, avec couleurs "
      + "\"perso\"), epaisseur (\"fin\", \"normal\", \"epais\"), tailleSchema (\"moyen\", \"grand\", \"pleine\"), images "
      + "(dans les cases : \"non\", \"oui\" : des images à compter, \"avec-nombres\"), formeImages (\"enonce\", \"ronds\"). Les cases "
      + "à cocher valent true ou false.",
    "« presentationEnregistree » : le nom d'une présentation enregistrée à reprendre. « enregistrerPresentation » : le nom sous lequel "
      + "garder la présentation. « voirCorrige » : true pour montrer le corrigé dans l'aperçu, false pour la feuille. « imprimer » : true "
      + "quand l'enseignant demande d'imprimer. « surLeBureau » : true pour poser la feuille en PDF sur le bureau.",
    "L'enseignant n'a que toi pour régler l'atelier : quand il demande les réglages, la présentation ou la feuille, réponds d'après "
      + "l'atelier ci-dessous, dans « reponse », sans rien changer.",
  ];
  return [
    ...commun, ...propre, ...presentation,
    "Les marqueurs [P1], [P2]… remplacent des prénoms : recopie-les tels quels quand l'enseignant veut ces prénoms dans les énoncés.",
    "L'atelier, tel qu'il est :",
    ficheDesProblemes(e),
  ].join("\n");
}

// ── La réponse, relue ───────────────────────────────────────────────────────

const chaine = (v: unknown, max: number): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
};
const entier = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  return Number.isFinite(n) && Math.round(n) >= min && Math.round(n) <= max ? Math.round(n) : undefined;
};
const plier = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Le nombre de problèmes le plus proche parmi ceux que l'atelier propose. */
export const nombreDeProblemes = (n: number) =>
  NOMBRES_DE_PROBLEMES.reduce((a, b) => (Math.abs(b - n) < Math.abs(a - n) || (Math.abs(b - n) === Math.abs(a - n) && b > a) ? b : a));

/**
 * La réponse du modèle, relue : ce qui ne se lit pas ne change rien. `e` : l'atelier tel qu'il est (pour borner les
 * numéros des problèmes, compter les parties, reconnaître les thèmes).
 */
export function lireReponseProblemes(brut: string, e: EtatDeLAtelier): ReponseProblemes {
  let o: Record<string, unknown> = {};
  try {
    const debut = brut.indexOf("{"), fin = brut.lastIndexOf("}");
    const v: unknown = debut >= 0 && fin > debut ? JSON.parse(brut.slice(debut, fin + 1)) : null;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* une réponse en texte : elle se dit telle quelle */ }
  const texteSeul = !Object.keys(o).length ? chaine(brut, 600) : undefined;
  const r: ReponseProblemes = { reponse: chaine(o.reponse, 600) ?? texteSeul ?? "C'est fait.", reglages: {} };
  const g = r.reglages;
  const actuels = e.reglages;

  const titre = chaine(o.titre, 80);
  if (titre) g.titre = titre;
  const nombre = entier(o.nombre, 1, 12);
  if (nombre !== undefined) g.nombre = nombreDeProblemes(nombre);
  if (Array.isArray(o.prenoms)) {
    const prenoms = o.prenoms.map((x) => chaine(x, 30)).filter((x): x is string => !!x).slice(0, 12);
    g.prenoms = lirePrenoms(prenoms.join(", ")).join(", ");
  }

  if (e.sorte === "partieTout") {
    if (o.inconnue === "tout" || o.inconnue === "partie" || o.inconnue === "melange") g.inconnue = o.inconnue;
    const parties = entier(o.parties, 2, 3);
    if (parties !== undefined) g.parties = parties;
    const max = entier(o.max, 2, 100000);
    if (max !== undefined) {
      if (PLAFONDS.includes(max)) Object.assign(g, { perso: false, max });
      else Object.assign(g, { perso: true, toutMax: max, toutMin: Math.min(actuels.toutMin, max), partieMin: Math.min(actuels.partieMin, Math.floor(max / 2) || 1) });
    }
    const plage = o.plage && typeof o.plage === "object" ? (o.plage as Record<string, unknown>) : null;
    if (plage) {
      const toutMax = entier(plage.toutMax, 2, 100000) ?? actuels.toutMax;
      const toutMin = Math.min(entier(plage.toutMin, 2, 100000) ?? actuels.toutMin, toutMax);
      const partieMin = Math.max(1, Math.min(entier(plage.partieMin, 1, 100000) ?? actuels.partieMin, Math.floor(toutMax / (g.parties ?? actuels.parties))));
      Object.assign(g, { perso: true, toutMin, toutMax, partieMin });
    }
    // Les thèmes nouveaux d'abord : « themes » peut les nommer.
    const nouveaux = (Array.isArray(o.nouveauxThemes) ? o.nouveauxThemes : []).map(contexteLu).filter((c): c is ContexteParties => !!c).slice(0, 4);
    if (nouveaux.length) {
      const neufs = new Set(nouveaux.map((c) => plier(nomDuContexte(c))));
      g.themesPerso = [...actuels.themesPerso.filter((c) => !neufs.has(plier(nomDuContexte(c)))), ...nouveaux].slice(-8);
    }
    const connus = [...CONTEXTES_PARTIES, ...(g.themesPerso ?? actuels.themesPerso)].map(nomDuContexte);
    if (Array.isArray(o.themes)) {
      g.themes = o.themes.map((x) => chaine(x, 40)).filter((x): x is string => !!x)
        .map((x) => connus.find((n) => plier(n) === plier(x)))
        .filter((x, i, a): x is string => !!x && a.indexOf(x) === i);
    } else if (nouveaux.length) {
      // Un thème nouveau devient le thème de la feuille, sauf si l'enseignant a dit lesquels garder.
      g.themes = nouveaux.map(nomDuContexte);
    }
    const partiesFinales = g.parties ?? actuels.parties;
    const nombres = (Array.isArray(o.nombres) ? o.nombres : []).flatMap((x) => {
      const q = x && typeof x === "object" ? (x as Record<string, unknown>) : {};
      const probleme = entier(q.probleme, 1, g.nombre ?? actuels.nombre);
      const valeurs = Array.isArray(q.valeurs) ? q.valeurs.map((v) => entier(v, 1, 1000000)) : [];
      if (probleme === undefined || valeurs.length !== partiesFinales || valeurs.some((v) => v === undefined)) return [];
      const cherche = q.cherche === "tout" || q.cherche === undefined ? -1 : entier(q.cherche, 1, partiesFinales);
      return cherche === undefined ? [] : [{ probleme, valeurs: valeurs as number[], inconnue: cherche < 0 ? -1 : cherche - 1 }];
    });
    if (nombres.length) r.nombres = nombres;
  } else {
    if (Array.isArray(o.types)) {
      const types = TYPES_MULTIPLICATIFS.map((t) => t.id).filter((id) => (o.types as unknown[]).includes(id));
      if (types.length) g.types = types;
    }
    const table = entier(o.table, 2, 10);
    if (table !== undefined) Object.assign(g, { perso: false, table: table <= 5 ? 5 : 10 });
    const plage = o.plage && typeof o.plage === "object" ? (o.plage as Record<string, unknown>) : null;
    if (plage) {
      const partsMax = entier(plage.partsMax, 2, 100) ?? actuels.partsMax;
      const partsMin = Math.min(entier(plage.partsMin, 2, 100) ?? actuels.partsMin, partsMax);
      const valeurMax = entier(plage.valeurMax, 1, 10000) ?? actuels.valeurMax;
      const valeurMin = Math.min(entier(plage.valeurMin, 1, 10000) ?? actuels.valeurMin, valeurMax);
      Object.assign(g, { perso: true, partsMin, partsMax, valeurMin, valeurMax });
    }
  }

  const total = g.nombre ?? actuels.nombre;
  if (Array.isArray(o.remplacer)) {
    const n = [...new Set(o.remplacer.map((x) => entier(x, 1, total)).filter((x): x is number => x !== undefined))];
    if (n.length) r.remplacer = n;
  }
  if (o.nouvelleFeuille === true) r.nouvelleFeuille = true;

  // La présentation : une toute faite, une enregistrée, puis les éléments qui changent — relus un à un.
  if (o.modele === "complete" || o.modele === "modele-seul") r.modele = o.modele;
  const enregistree = chaine(o.presentationEnregistree, 60);
  const connue = enregistree && e.presentationsEnregistrees?.find((n) => plier(n) === plier(enregistree));
  if (connue) r.presentationEnregistree = connue;
  if (o.presentation && typeof o.presentation === "object" && !Array.isArray(o.presentation)) {
    const partielle: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(o.presentation as Record<string, unknown>)) {
      const lu = valeurDePresentation(k, v);
      if (lu !== undefined) partielle[k] = lu;
    }
    if (Object.keys(partielle).length) r.presentation = partielle as Partial<Presentation>;
  }
  const nom = chaine(o.enregistrerPresentation, 60);
  if (nom) r.enregistrerPresentation = nom;
  if (typeof o.voirCorrige === "boolean") r.voirCorrige = o.voirCorrige;
  if (o.imprimer === true) r.imprimer = true;
  if (o.surLeBureau === true) r.surLeBureau = true;
  return r;
}

/**
 * Demande à l'assistant la suite de la conversation. Tout ce qui part — la consigne, l'atelier, les répliques — passe
 * par le masque des prénoms (ceux des élèves, et ceux du champ « Prénoms ») ; ce qui revient est remis en clair, puis relu.
 */
export async function demanderALAssistantDesProblemes(e: EtatDeLAtelier, fil: { role: "user" | "assistant"; content: string }[]): Promise<ReponseProblemes> {
  const premier = fil.findIndex((m) => m.role === "user");
  const envoyes = premier < 0 ? [] : fil.slice(premier);
  const textes = [consigneDesProblemes(e), ...envoyes.map((m) => m.content)];
  const noms = [...await nomsAMasquer(), ...lirePrenoms(e.reglages.prenoms)];
  const { textes: masques, table } = pseudonymiserTout(textes, noms);
  const messages: ChatMessage[] = [
    { role: "system", content: masques[0] },
    ...envoyes.map((m, i): ChatMessage => ({ role: m.role, content: masques[i + 1] })),
  ];
  const brut = await api.mistralChat(messages, await api.modeleActif(), true);
  return lireReponseProblemes(restaurer(brut, table).texte, e);
}
