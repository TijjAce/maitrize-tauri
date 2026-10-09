// Le disque est-il chiffré ? Ce qu'on en dit à l'enseignant.
//
// Les dossiers des élèves vivent sur le disque de l'ordinateur. Chiffré
// (FileVault, BitLocker), un ordinateur perdu ou volé ne livre rien sans le
// mot de passe ; sinon, tout se lit. L'application ne peut pas chiffrer le
// disque elle-même : elle le dit dans Réglages, et le rappelle au démarrage,
// une fois par mois au plus, tant qu'il ne l'est pas.

import { api, isMac, type ChiffrementDisque } from "./api";
import { toast } from "./components/Toaster";

/** Où l'on active la protection, selon le système. */
export function ouActiver(mac: boolean): string {
  return mac
    ? "Réglages Système › Confidentialité et sécurité › FileVault"
    : "Paramètres › Confidentialité et sécurité › Chiffrement de l'appareil (Windows Famille), "
      + "ou Panneau de configuration › Chiffrement de lecteur BitLocker (Windows Professionnel)";
}

export interface Constat { ton: "ok" | "alerte" | "neutre"; texte: string }

/** Ce que la carte des Réglages dit de l'état lu. */
export function constat(c: ChiffrementDisque, mac = isMac): Constat {
  const nom = c.nom || (mac ? "FileVault" : "BitLocker");
  switch (c.etat) {
    case "actif":
      return { ton: "ok", texte: `${nom} est activé : si cet ordinateur est perdu ou volé, les dossiers des élèves ne se lisent pas sans votre mot de passe.` };
    case "en_cours":
      return { ton: "ok", texte: `${nom} chiffre le disque. Laissez l'ordinateur branché : il n'y a rien d'autre à faire.` };
    case "inactif":
      return {
        ton: "alerte",
        texte: `${nom} est désactivé. Les dossiers des élèves sont sur ce disque : si l'ordinateur est perdu ou volé, ils peuvent être lus. `
          + `Activez-le : ${ouActiver(mac)}.${mac ? " Gardez la clé de secours en lieu sûr." : ""} `
          + "Sur un ordinateur prêté par l'école, voyez avec le service informatique.",
      };
    default:
      return { ton: "neutre", texte: `Maitrize n'a pas pu lire l'état du chiffrement de ce disque. Vérifiez-le : ${ouActiver(mac)}.` };
  }
}

const CLE_RAPPEL = "maitrize:rappelChiffrement";
const UN_MOIS = 30 * 24 * 3600 * 1000;

/** Rappeler maintenant ? Pas plus d'une fois par mois. */
export function rappelDu(dernier: string | null, maintenant = Date.now()): boolean {
  const t = dernier ? Date.parse(dernier) : NaN;
  return !Number.isFinite(t) || maintenant - t >= UN_MOIS;
}

/**
 * Au démarrage, un peu après : si le disque n'est pas chiffré, le dire — au
 * plus une fois par mois. `voir` mène aux Réglages. Renvoie de quoi annuler.
 */
export function surveillerLeChiffrement(voir: () => void, delai = 20000): () => void {
  const minuteur = window.setTimeout(async () => {
    let dernier: string | null = null;
    try { dernier = localStorage.getItem(CLE_RAPPEL); } catch { /* stockage indisponible : on rappelle */ }
    if (!rappelDu(dernier)) return;
    const c = await api.chiffrementDisque().catch(() => null);
    if (c?.etat !== "inactif") return;
    try { localStorage.setItem(CLE_RAPPEL, new Date().toISOString()); } catch { /* le rappel reviendra */ }
    toast(`${c.nom || "Le chiffrement du disque"} est désactivé : en cas de perte ou de vol de cet ordinateur, les dossiers des élèves pourraient être lus.`,
      { icone: "🔓", duree: 20000, action: { label: "Voir", faire: voir } });
  }, delai);
  return () => window.clearTimeout(minuteur);
}
