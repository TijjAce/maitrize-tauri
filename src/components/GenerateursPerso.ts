// Les générateurs de l'enseignant, gardés dans ses réglages (partagés entre
// ses ordinateurs) ; et ce qu'on demande à l'IA pour en faire un, ou le
// retoucher (voir generateursPerso.ts).

import React from "react";
import { api, newId, nowIso, type ChatMessage } from "../api";
import { pseudonymiserTout, restaurer } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import { lireMesPictos, pourLeMot, type MonPicto } from "../mesPictos";
import {
  CLE_GENERATEURS, CONSIGNE_DE_L_IA, CONSIGNE_DES_QUESTIONS, EVT_GENERATEURS, QUESTIONS_MAX, demandeALIA, lireGenerateurs, lireQuestion, lireRecette, motsSansImage,
  poserLesPictos, questionsALIA, retoucheALIA, variantesDuMot,
  type Echange, type GenerateurPerso, type QuestionDeLIA,
} from "../generateursPerso";
import { EVT_DONNEES_DISTANTES } from "./ui";

/** Les générateurs de l'enseignant, tenus à jour d'où qu'ils changent. */
export function useGenerateursPerso(): GenerateurPerso[] {
  const [liste, setListe] = React.useState<GenerateurPerso[]>([]);
  React.useEffect(() => {
    let vivant = true;
    const lire = () => { api.settingGet(CLE_GENERATEURS).then((b) => { if (vivant) setListe(lireGenerateurs(b)); }).catch(() => {}); };
    lire();
    window.addEventListener(EVT_GENERATEURS, lire);
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => { vivant = false; window.removeEventListener(EVT_GENERATEURS, lire); window.removeEventListener(EVT_DONNEES_DISTANTES, lire); };
  }, []);
  return liste;
}

/** Garde un générateur, nouveau ou modifié, et prévient les écrans qui les montrent. */
export async function enregistrerGenerateur(g: GenerateurPerso): Promise<void> {
  const liste = lireGenerateurs(await api.settingGet(CLE_GENERATEURS));
  const suivante = liste.some((x) => x.id === g.id) ? liste.map((x) => (x.id === g.id ? g : x)) : [...liste, g];
  await api.settingSet(CLE_GENERATEURS, JSON.stringify(suivante));
  window.dispatchEvent(new Event(EVT_GENERATEURS));
}

export async function supprimerGenerateur(id: string): Promise<void> {
  const liste = lireGenerateurs(await api.settingGet(CLE_GENERATEURS));
  await api.settingSet(CLE_GENERATEURS, JSON.stringify(liste.filter((x) => x.id !== id)));
  window.dispatchEvent(new Event(EVT_GENERATEURS));
}

/**
 * Demande une recette à l'IA, et la relit ; une seconde chance quand la
 * réponse n'en est pas une. Les prénoms de la classe partent masqués, et
 * reviennent dans la recette.
 */
async function demanderUneRecette(message: string): Promise<GenerateurPerso> {
  const masque = pseudonymiserTout([message], await nomsAMasquer());
  const messages: ChatMessage[] = [{ role: "system", content: CONSIGNE_DE_L_IA }, { role: "user", content: masque.textes[0] }];
  const modele = await api.modeleActif();
  // Mistral répond par un objet JSON ; un modèle qui ne le saurait pas répond comme d'habitude.
  let json = true;
  const demander = async () => {
    try {
      return await api.mistralChat(messages, modele, json);
    } catch (e) {
      if (!json || !/\(code 4(00|22)\)/.test(String((e as Error)?.message ?? e))) throw e;
      json = false;
      return api.mistralChat(messages, modele);
    }
  };
  for (let essai = 0; essai < 2; essai++) {
    const reponse = await demander();
    const recette = lireRecette(restaurer(reponse, masque.table).texte);
    if (recette) return recette;
    messages.push({ role: "assistant", content: reponse },
      { role: "user", content: "Cette réponse n'est pas une recette lisible. Réponds seulement par l'objet JSON, au format demandé, avec au moins un bloc." });
  }
  throw new Error("L'IA n'a pas proposé d'exercice lisible. Décrivez autrement ce que vous voulez, ou essayez un autre modèle dans les réglages de l'IA.");
}

/**
 * L'image de chaque mot : le picto qui porte exactement ce mot ; sinon celui
 * du mot sans article ou au singulier ; sinon l'image gardée dans Mes pictos —
 * une photo, un picto dessiné, un symbole Makaton. Un mot sans rien n'est pas
 * dans la réponse.
 */
export async function pictosPourLesMots(mots: string[]): Promise<{ id: number; mot: string }[]> {
  const liste = [...new Set(mots.map((m) => m.trim().toLowerCase()).filter(Boolean))];
  if (!liste.length) return [];
  const [exacts, absents] = await api.arasaacParMots(liste).catch((): [{ id: number; mot: string }[], string[]] => [[], liste]);
  const trouves = exacts.map((p) => ({ id: p.id, mot: p.mot }));
  const reste = new Set(absents);
  // Sans article, au singulier : la première écriture que la banque connaît.
  const variantes = new Map<string, string>();
  for (const m of reste) for (const v of variantesDuMot(m)) if (!variantes.has(v)) variantes.set(v, m);
  if (variantes.size) {
    const [parVariante] = await api.arasaacParMots([...variantes.keys()]).catch((): [{ id: number; mot: string }[], string[]] => [[], []]);
    for (const p of parVariante) {
      const m = variantes.get(p.mot);
      if (m && reste.has(m)) { trouves.push({ id: p.id, mot: m }); reste.delete(m); }
    }
  }
  if (reste.size) {
    const miens = await lireMesPictos().catch((): MonPicto[] => []);
    for (const m of [...reste]) {
      const p = pourLeMot(miens, m) ?? variantesDuMot(m).map((v) => pourLeMot(miens, v)).find(Boolean);
      if (p) { trouves.push({ id: p.id, mot: m }); reste.delete(m); }
    }
  }
  return trouves;
}

/** Les images des mots qui n'en ont pas encore ; `garder` : les images d'avant, mot pour mot. */
export async function avecLesPictos(g: GenerateurPerso, garder: GenerateurPerso | null): Promise<GenerateurPerso> {
  const mots = motsSansImage(garder ? poserLesPictos(g, [], garder) : g);
  return poserLesPictos(g, await pictosPourLesMots(mots), garder);
}

/**
 * La question que l'IA pose avant d'écrire la recette, quand la demande ne
 * lui dit pas assez ; rien quand elle en sait assez. Au-delà de
 * QUESTIONS_MAX, ou si sa réponse ne se lit pas, on n'attend plus : la
 * recette s'écrit avec ce qu'on sait. Les prénoms partent masqués, comme
 * pour la recette.
 */
export async function questionDeLIA(demande: string, classe: string, echanges: Echange[]): Promise<QuestionDeLIA | null> {
  if (echanges.length >= QUESTIONS_MAX) return null;
  const masque = pseudonymiserTout([questionsALIA(demande, classe, echanges)], await nomsAMasquer());
  const messages: ChatMessage[] = [{ role: "system", content: CONSIGNE_DES_QUESTIONS }, { role: "user", content: masque.textes[0] }];
  const modele = await api.modeleActif();
  let reponse: string;
  try {
    reponse = await api.mistralChat(messages, modele, true);
  } catch (e) {
    if (!/\(code 4(00|22)\)/.test(String((e as Error)?.message ?? e))) throw e;
    reponse = await api.mistralChat(messages, modele);
  }
  const q = lireQuestion(reponse);
  return q && { question: restaurer(q.question, masque.table).texte, choix: q.choix.map((c) => restaurer(c, masque.table).texte) };
}

/** Un nouveau générateur, d'après ce que l'enseignant a décrit. */
export async function creerAvecLIA(demande: string, classe: string): Promise<GenerateurPerso> {
  const recette = await avecLesPictos(await demanderUneRecette(demandeALIA(demande, classe)), null);
  const maintenant = nowIso();
  return { ...recette, id: newId(), demande: demande.trim(), classe: recette.classe || classe, cree: maintenant, modifie: maintenant };
}

/** Le même générateur, retouché par l'IA comme l'enseignant le demande ; les images déjà choisies restent. */
export async function retoucherAvecLIA(g: GenerateurPerso, consigne: string): Promise<GenerateurPerso> {
  const recette = await avecLesPictos(await demanderUneRecette(retoucheALIA(g, consigne)), g);
  return { ...recette, id: g.id, demande: g.demande, cree: g.cree, modifie: nowIso() };
}
