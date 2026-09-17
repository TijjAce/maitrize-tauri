// Essai de restauration : relire pour de vrai la dernière sauvegarde.
//
// Une sauvegarde jamais relue n'est pas une sauvegarde. Qu'elle soit vide,
// abîmée ou chiffrée avec une autre phrase, on ne le découvrait que le jour où
// l'on en avait besoin — le pire jour pour l'apprendre. Une fois par mois,
// l'app ouvre la vraie sauvegarde, sans rien remplacer, et ne dit quelque
// chose que si ça s'est mal passé.

import { api, VerifSauvegarde } from "./api";
import { toast } from "./components/Toaster";

/** Entre deux essais. */
export const JOURS_ENTRE_ESSAIS = 30;

/** Faut-il refaire un essai ? Séparé pour être vérifiable sans stockage. */
export function essaiNecessaire(dernierEssai: string, maintenant: Date, jours = JOURS_ENTRE_ESSAIS): boolean {
  if (!dernierEssai) return true;
  const quand = new Date(dernierEssai).getTime();
  if (Number.isNaN(quand)) return true;
  return maintenant.getTime() - quand >= jours * 86_400_000;
}

/** Ce qu'on dit à l'enseignant — rien quand tout va bien. */
export function alerteDeLEssai(v: VerifSauvegarde): string {
  if (!v.lisible) return `Sauvegarde du ${v.sauvegarde.slice(0, 10)} illisible. ${v.message}`;
  if (v.alertes.length) return `Sauvegarde relue, mais : ${v.alertes.join(" ")}`;
  return "";
}

/**
 * Un essai si le dernier remonte à plus d'un mois.
 *
 * Silencieux par nature : stockage non configuré ou injoignable ne concerne
 * pas l'enseignant au milieu d'une séance.
 */
export async function verifierLaSauvegarde(maintenant = new Date()): Promise<void> {
  try {
    const derniere = await api.sauvegardeVerifDerniere();
    if (!essaiNecessaire(derniere?.essai ?? "", maintenant)) return;
    const alerte = alerteDeLEssai(await api.sauvegardeVerifier());
    if (alerte) toast(alerte, { icone: "⚠️", duree: 30000 });
  } catch {
    /* pas de stockage, ou injoignable : on réessaiera */
  }
}
