// Les générateurs de l'enseignant, gardés dans ses réglages (partagés entre
// ses ordinateurs) ; et ce qu'on demande à l'IA pour en faire un, ou le
// retoucher (voir generateursPerso.ts).

import React from "react";
import { api, newId, nowIso, type ChatMessage } from "../api";
import { pseudonymiserTout, restaurer } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import {
  CLE_GENERATEURS, CONSIGNE_DE_L_IA, EVT_GENERATEURS, demandeALIA, lireGenerateurs, lireRecette, motsSansImage, poserLesPictos, retoucheALIA,
  type GenerateurPerso,
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
  for (let essai = 0; essai < 2; essai++) {
    const reponse = await api.mistralChat(messages, modele);
    const recette = lireRecette(restaurer(reponse, masque.table).texte);
    if (recette) return recette;
    messages.push({ role: "assistant", content: reponse },
      { role: "user", content: "Cette réponse n'est pas une recette lisible. Réponds seulement par l'objet JSON, au format demandé, avec au moins un bloc." });
  }
  throw new Error("L'IA n'a pas proposé d'exercice lisible. Décrivez autrement ce que vous voulez, ou essayez un autre modèle dans les réglages de l'IA.");
}

/** Les pictos de la banque pour les mots qui n'ont pas encore d'image ; `garder` : les images d'avant, mot pour mot. */
export async function avecLesPictos(g: GenerateurPerso, garder: GenerateurPerso | null): Promise<GenerateurPerso> {
  const mots = motsSansImage(garder ? poserLesPictos(g, [], garder) : g);
  const [trouves] = mots.length ? await api.arasaacParMots(mots).catch((): [never[], string[]] => [[], []]) : [[], []];
  return poserLesPictos(g, trouves, garder);
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
