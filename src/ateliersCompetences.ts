// Ce qu'un atelier travaille, dit par les référentiels eux-mêmes.
//
// Un générateur produit une feuille ; il ne dit pas ce qu'elle vise. On
// l'écrivait donc à la main dans le bandeau de chaque atelier — « Programmes :
// résoudre des problèmes additifs… » —, une phrase recopiée qui vieillit mal
// et qui ne se coche nulle part.
//
// Chaque atelier déclare plutôt quelques mots — « problèmes additifs »,
// « syllabe », « correspondance » — et l'on va chercher, dans les
// référentiels installés, les compétences qui les portent. Elles arrivent donc
// avec leur intitulé exact, leur domaine et leur niveau : de quoi les citer
// dans un cahier journal ou les poser sur une programmation.
//
// Sans référentiel installé, on ne raconte rien : mieux vaut se taire que
// d'inventer une compétence.

import type { Referentiel } from "./api";
import type { CompetenceSelectionnee } from "./components/CompetenceTree";
import { correspond } from "./competencesTravaillees";

// La forme des référentiels, telle qu'elle est enregistrée.
interface RefComp { id: string; texte: string; niveau?: string }
interface RefCG { id: string; titre: string; competences?: RefComp[] }
interface RefSous { id: string; titre: string; competences?: RefComp[]; competencesGenerales?: RefCG[] }
interface RefDom { id: string; titre: string; sousDomaines: RefSous[] }
interface RefData { titre: string; domaines: RefDom[] }

/** Toutes les compétences des référentiels actifs, à plat. */
export function competencesDesReferentiels(refs: Referentiel[]): CompetenceSelectionnee[] {
  const sortie: CompetenceSelectionnee[] = [];
  for (const r of refs) {
    if (!r.actif) continue;
    let data: RefData | null = null;
    try { data = JSON.parse(r.donnees) as RefData; } catch { continue; }
    if (!data || !Array.isArray(data.domaines)) continue;
    for (const dom of data.domaines) {
      for (const sd of dom.sousDomaines ?? []) {
        const poser = (c: RefComp, cg: RefCG | null) => sortie.push({
          id: `${r.id}|${sd.id}|${c.id}`,
          referentielNom: r.nom,
          domaineId: dom.id,
          domaineTitre: dom.titre,
          sousDomaineTitre: sd.titre,
          competenceGeneraleTitre: cg?.titre ?? null,
          competenceTitre: c.texte,
          niveau: c.niveau ?? null,
          competenceRefId: c.id,
        });
        for (const c of sd.competences ?? []) poser(c, null);
        for (const cg of sd.competencesGenerales ?? []) for (const c of cg.competences ?? []) poser(c, cg);
      }
    }
  }
  return sortie;
}

/**
 * Les compétences qu'un atelier travaille, d'après ses mots-clés.
 *
 * Un terme retient une compétence si tous ses mots s'y trouvent — intitulé,
 * chemin et niveau compris. On plafonne : une liste de quarante lignes ne se
 * lit pas, et l'arbre complet reste à un clic.
 */
export function competencesDeLAtelier(
  refs: Referentiel[], termes: readonly string[], maximum = 12,
): CompetenceSelectionnee[] {
  if (!termes.length) return [];
  const toutes = competencesDesReferentiels(refs);
  const vues = new Set<string>();
  const sortie: CompetenceSelectionnee[] = [];
  for (const c of toutes) {
    const texte = `${c.niveau ?? ""} ${c.competenceTitre} ${c.competenceGeneraleTitre ?? ""} `
      + `${c.sousDomaineTitre} ${c.domaineTitre}`;
    if (!termes.some((t) => correspond(texte, t))) continue;
    // Deux référentiels reprennent parfois le même intitulé : on ne le montre
    // qu'une fois, sans quoi la liste se remplit de doublons.
    const cle = `${c.competenceTitre.trim().toLowerCase()}|${c.niveau ?? ""}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    sortie.push(c);
    if (sortie.length >= maximum) break;
  }
  return sortie;
}
