// Reformulation d'un texte libre par l'IA.
//
// Le texte de l'enseignant est un écrit professionnel : l'IA l'améliore sans
// rien y ajouter. Les noms des élèves sont masqués avant l'envoi et remis au
// retour (voir confidentialite.ts). La proposition n'écrase jamais le texte :
// c'est l'enseignant qui choisit de la garder.
import { api } from "./api";
import { pseudonymiser, restaurer } from "./confidentialite";

export type Style = "reformuler" | "simple" | "professionnel" | "familles" | "notes" | "corriger";

export const STYLES: { id: Style; libelle: string; aide: string }[] = [
  { id: "reformuler", libelle: "Reformuler", aide: "Plus clair et plus fluide, même ton" },
  { id: "notes", libelle: "Rédiger mes notes", aide: "Des notes en vrac deviennent un texte suivi" },
  { id: "professionnel", libelle: "Plus professionnel", aide: "Pour l’équipe, une réunion, un compte rendu" },
  { id: "familles", libelle: "Pour les familles", aide: "Bienveillant, sans jargon" },
  { id: "simple", libelle: "Plus simple", aide: "Phrases courtes, mots faciles" },
  { id: "corriger", libelle: "Corriger seulement", aide: "Orthographe et grammaire, sans rien reformuler" },
];

const CONSIGNES: Record<Style, string> = {
  reformuler: "Reformule pour rendre le texte plus clair et plus fluide, en gardant le même registre et une longueur proche.",
  notes: "Le texte est une prise de notes : rédige-le en phrases complètes et bien enchaînées, sans ajouter aucun fait.",
  professionnel: "Adopte un style professionnel, précis et objectif, adapté à un écrit destiné à une équipe pluridisciplinaire.",
  familles: "Adopte un ton bienveillant, positif et respectueux, adapté à un message destiné à une famille, sans jargon.",
  simple: "Rends le texte facile à lire : phrases courtes, mots simples, une idée par phrase.",
  corriger: "Corrige uniquement l'orthographe, la grammaire et la ponctuation. Ne change ni les formulations ni l'ordre des idées.",
};

/** La consigne système envoyée au modèle. */
export function consigne(style: Style): string {
  return [
    "Tu aides un enseignant spécialisé (IME) à améliorer ses propres écrits professionnels, en français.",
    CONSIGNES[style],
    "Reste fidèle au sens. N'invente rien : aucun fait, aucune date, aucun nom.",
    "Garde la mise en forme : paragraphes, listes, retours à la ligne.",
    "Les marqueurs entre crochets comme [P1] remplacent des prénoms : recopie-les exactement, sans les expliquer.",
    "Réponds uniquement par le texte obtenu, sans guillemets, sans titre ni commentaire.",
  ].join(" ");
}

/** Retire ce que les modèles ajoutent parfois autour du texte. */
export function nettoyerReponse(rep: string): string {
  let t = rep.trim();
  t = t.replace(/^```[a-z]*\n?|\n?```$/g, "").trim();
  t = t.replace(/^(voici|texte reformulé|proposition)\s*[^\n:]*:\s*\n/i, "");
  // Guillemets englobants seulement s'ils encadrent tout le texte.
  const paires: [string, string][] = [["«", "»"], ["\"", "\""], ["“", "”"]];
  for (const [o, f] of paires) {
    if (t.startsWith(o) && t.endsWith(f) && t.indexOf(o, 1) === -1) t = t.slice(o.length, -f.length).trim();
  }
  return t;
}

export interface Proposition { texte: string; nomsAbsents: string[]; nomsMasques: number }

/** Envoie le texte (noms masqués) et rend la proposition, noms remis. */
export async function reformuler(texte: string, style: Style): Promise<Proposition> {
  const eleves = await api.elevesList().catch(() => []);
  const { texte: masque, table } = pseudonymiser(texte, eleves.map((e) => e.nom));
  const modele = await api.modeleActif();
  const rep = await api.mistralChat([
    { role: "system", content: consigne(style) },
    { role: "user", content: masque },
  ], modele);
  const propre = nettoyerReponse(rep);
  if (!propre) throw new Error("La réponse de l’IA est vide.");
  const { texte: final, absents } = restaurer(propre, table);
  return { texte: final, nomsAbsents: absents, nomsMasques: table.length };
}
