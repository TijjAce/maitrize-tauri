// Faire découvrir les projets du catalogue par la conversation.
//
// Quatre-vingt-dix projets en grille, d'un coup, avec leurs thèmes et une
// recherche : « là tu peux aussi mettre un chatbot qui fait découvrir les
// projets, et ils apparaissent qu'à la demande de l'utilisateur »
// (l'enseignant, 31 octobre 2026). On dit à l'assistant ce qu'on cherche — un
// thème, une envie, une saison — ; il choisit dans le catalogue et dit
// pourquoi ; les projets proposés apparaissent alors, et l'on coche ceux
// qu'on veut poser sur l'année.
//
// Mistral choisit, quand sa clé est là : il lit le catalogue et la
// conversation, prénoms masqués, et répond en JSON relu avec méfiance — un
// projet qui n'est pas au catalogue ne s'affiche pas. Sans lui, une recherche
// sur l'ordinateur répond : les mots du message dans le titre, la phrase et
// les domaines de chaque projet, le mois nommé en plus ; un thème seul nommé
// montre tout le thème.

import { api, type ChatMessage } from "./api";
import { normaliser } from "./competencesTravaillees";
import { pseudonymiserTout, restaurer } from "./confidentialite";
import { nomsAMasquer } from "./nomsAMasquer";
import { CATALOGUE, MOIS, THEMES, nomDuMois, nomDuTheme, type IdeeProjet, type Theme } from "./projets";

/** Une réplique de la conversation : l'enseignant, ou l'assistant. */
export interface RepliqueDecouverte { role: "user" | "assistant"; content: string }

/** Ce que l'assistant propose : ce qu'il dit, et les projets à montrer — choisis, tout un thème, ou tout le catalogue. */
export interface ReponseDecouverte { reponse: string; projets: string[]; theme?: Theme; tous?: boolean }

export const ACCUEIL_DECOUVERTE = "Que voulez-vous faire avec la classe ? Dites-le comme vous voulez — « vivre ensemble à la rentrée », "
  + "« la monnaie », « une sortie au printemps »… Je vous propose des projets.";

const COMMENT_POSER = "Cochez ceux qui vous plaisent, puis cliquez sur un mois, en haut.";
const PROPOSES_MAX = 8;

/** Les projets à montrer : tout le catalogue, tout un thème, ou ceux qu'il a choisis, dans son ordre. */
export function ideesDeLaReponse(r: ReponseDecouverte): IdeeProjet[] {
  if (r.tous) return CATALOGUE;
  if (r.theme) return CATALOGUE.filter((i) => i.theme === r.theme);
  return r.projets.map((id) => CATALOGUE.find((i) => i.id === id)).filter((i): i is IdeeProjet => !!i);
}

// ── Sans l'IA : une recherche sur l'ordinateur ────────────────────────────

/** Les mots qui ne disent rien du projet qu'on cherche. */
const VIDES = new Set([
  "avec", "pour", "dans", "sans", "sous", "chez", "vers", "entre", "classe", "eleve", "eleves", "projet", "projets", "faire", "veux", "voudrais",
  "aimerais", "cherche", "quelque", "chose", "propose", "proposez", "montre", "montrez", "moi", "nous", "vous", "leur", "leurs", "notre", "votre",
  "cette", "annee", "travailler", "idee", "idees", "petit", "petits", "plus", "tres", "bien", "aussi", "comme", "quel", "quels", "quelle", "quelles",
  "autour", "sujet", "theme", "genre",
]);

/** Ce qui désigne tout un thème, quand on ne dit rien de plus. */
const MOTS_DES_THEMES: Record<Theme, string[]> = {
  vivre: ["vivre ensemble"], langage: ["langage", "ecrit"], maths: ["nombres", "maths", "mathematiques"], sciences: ["sciences", "science", "nature"],
  arts: ["arts", "art", "culture"], corps: ["corps", "sante"], autonomie: ["autonomie", "vie quotidienne"], sorties: ["sorties", "decouvertes"],
  fetes: ["fetes", "saisons"],
};

const singulier = (m: string) => (m.length > 4 ? m.replace(/[sx]$/, "") : m);

/**
 * La recherche sur l'ordinateur : tout le catalogue s'il le demande ; tout
 * un thème s'il ne dit que lui ; sinon les projets qui portent le plus de ses
 * mots — dans le titre, la phrase, les domaines —, ceux du mois qu'il nomme
 * d'abord.
 */
export function decouvrirLocalement(texte: string): ReponseDecouverte {
  const t = normaliser(texte);
  if (/\b(tous les projets|tout le catalogue|le catalogue|tout voir|voir tout|montre[sz]?[- ]moi tout|montre[sz]? tout)\b/.test(t)) {
    return { reponse: `Voici les ${CATALOGUE.length} projets du catalogue. ${COMMENT_POSER}`, projets: [], tous: true };
  }
  const mots = t.split(/[^a-z0-9]+/).filter((m) => m.length >= 4 && !VIDES.has(m));
  const mois = MOIS.find((m) => new RegExp(`\\b${normaliser(m.nom)}\\b`).test(t));
  const sansMois = mots.filter((m) => !mois || m !== normaliser(mois.nom));
  const theme = (Object.entries(MOTS_DES_THEMES) as [Theme, string[]][]).find(([, ms]) => ms.some((m) => new RegExp(`\\b${m}\\b`).test(t)))?.[0];
  if (theme && sansMois.length <= 2 && !mois) {
    return { reponse: `Voici les projets « ${nomDuTheme(theme)} ». ${COMMENT_POSER}`, projets: [], theme };
  }
  // Un mot du titre compte plus qu'un mot de la phrase ou des domaines. Pas le nom du thème : « monnaie » ferait remonter
  // tous les projets de « Nombres & monnaie ». Le mois nommé départage, mais ne fait pas entrer un projet sans aucun mot.
  const mesure = (i: IdeeProjet) => {
    const titre = normaliser(i.titre), foin = normaliser([i.pitch, i.domaines.join(" ")].join(" "));
    const mots = sansMois.reduce((n, m) => n + (titre.includes(singulier(m)) ? 3 : foin.includes(singulier(m)) ? 2 : 0), 0);
    return { mots, total: mots + (mois && i.mois === mois.num ? 2 : 0) };
  };
  const trouves = CATALOGUE.map((i) => ({ i, ...mesure(i) })).filter((x) => (sansMois.length ? x.mots > 0 : x.total > 0))
    .sort((a, b) => b.total - a.total).slice(0, PROPOSES_MAX - 2).map((x) => x.i);
  if (!trouves.length) {
    return { reponse: "Je n'ai rien trouvé pour cela. Essayez un autre mot — la monnaie, une sortie, écrire —, un thème, ou « montrez-moi tout ».", projets: [] };
  }
  const quand = mois ? `, plutôt en ${nomDuMois(mois.num).toLowerCase()}` : "";
  return { reponse: `Voici ${trouves.length > 1 ? `${trouves.length} projets` : "un projet"}${quand}. ${COMMENT_POSER}`, projets: trouves.map((i) => i.id) };
}

// ── Avec l'IA ─────────────────────────────────────────────────────────────

/** Le catalogue tel que l'assistant le lit : un projet par ligne. */
export const catalogueEnBref = () => CATALOGUE
  .map((i) => `${i.id} | ${i.titre} | ${i.theme} | plutôt en ${nomDuMois(i.mois).toLowerCase()} | ${i.pitch}`).join("\n");

/** La consigne de l'assistant qui fait découvrir les projets : son rôle, le JSON attendu, les thèmes, le catalogue. */
export function consigneDeLaDecouverte(aujourdhui: string): string {
  return [
    "Tu es l'assistant de Maitrize qui fait découvrir à un enseignant du premier degré les projets de classe du catalogue ci-dessous. "
      + "Il te dit ce qu'il cherche — un thème, une envie, une saison, des élèves particuliers — ; tu choisis les projets qui lui vont le "
      + "mieux, deux à six en général, et tu dis en une ou deux phrases pourquoi, en le vouvoyant.",
    "Ne propose que des projets du catalogue, par leur identifiant. S'il demande tout le catalogue, mets \"tous\": true ; s'il demande tout "
      + "un thème, mets \"theme\" avec l'identifiant du thème. S'il ne dit pas assez ce qu'il cherche, pose-lui une question courte, sans projet.",
    "La première fois que tu proposes des projets, dis-lui comment les poser : il les coche, puis il clique sur un mois, en haut de la page.",
    "Réponds uniquement par un objet JSON : {\"reponse\": \"…\", \"projets\": [\"identifiant\", …], \"theme\": \"…\", \"tous\": false}.",
    "N'écris aucun prénom d'élève. Les marqueurs [P1], [P2]… remplacent des prénoms : ne les recopie pas.",
    `Les thèmes : ${THEMES.map((t) => `${t.id} (${t.nom})`).join(", ")}.`,
    `Aujourd'hui : ${aujourdhui}.`,
    "Le catalogue, un projet par ligne — identifiant | titre | thème | mois conseillé | ce que c'est :",
    catalogueEnBref(),
  ].join("\n");
}

/** La réponse du modèle, relue : un projet hors du catalogue ne s'affiche pas, un thème inconnu non plus. */
export function lireReponseDecouverte(brut: string): ReponseDecouverte {
  let o: Record<string, unknown> = {};
  try {
    const debut = brut.indexOf("{"), fin = brut.lastIndexOf("}");
    const v: unknown = debut >= 0 && fin > debut ? JSON.parse(brut.slice(debut, fin + 1)) : null;
    if (v && typeof v === "object" && !Array.isArray(v)) o = v as Record<string, unknown>;
  } catch { /* une réponse en texte : elle se dit telle quelle */ }
  const texte = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, 600) : "");
  const reponse = texte(o.reponse) || (Object.keys(o).length ? "" : texte(brut)) || "Que cherchez-vous ? Un thème, une envie, une saison…";
  const connus = new Set(CATALOGUE.map((i) => i.id));
  const projets = Array.isArray(o.projets)
    ? [...new Set(o.projets.filter((x): x is string => typeof x === "string" && connus.has(x)))].slice(0, PROPOSES_MAX) : [];
  const r: ReponseDecouverte = { reponse, projets };
  if (typeof o.theme === "string" && THEMES.some((t) => t.id === o.theme)) r.theme = o.theme as Theme;
  if (o.tous === true) r.tous = true;
  return r;
}

/**
 * Demande à l'assistant les projets qui répondent à la conversation. Ce qui
 * part passe par le masque des prénoms ; l'accueil reste à l'écran.
 */
export async function demanderALaDecouverte(fil: RepliqueDecouverte[], aujourdhui: string): Promise<ReponseDecouverte> {
  const premier = fil.findIndex((m) => m.role === "user");
  const envoyes = premier < 0 ? [] : fil.slice(premier);
  const { textes: masques, table } = pseudonymiserTout(envoyes.map((m) => m.content), await nomsAMasquer());
  const messages: ChatMessage[] = [
    { role: "system", content: consigneDeLaDecouverte(aujourdhui) },
    ...envoyes.map((m, i): ChatMessage => ({ role: m.role, content: masques[i] })),
  ];
  const brut = await api.mistralChat(messages, await api.modeleActif(), true);
  return lireReponseDecouverte(restaurer(brut, table).texte);
}
