// Le rapport d'erreur, proposé quand un vrai bug survient.
//
// « Si un utilisateur a un bug, que l'erreur m'arrive sur contact@maitrize.com »
// (l'éditeur, octobre 2026) — d'un clic, à son choix : rien ne part tout seul.
// Le bouton ouvre la messagerie sur un e-mail déjà écrit, nettoyé des noms de
// la classe (voir rapport.rs) ; l'enseignant le relit et l'envoie lui-même.
//
// Le même problème n'est proposé qu'une fois par semaine, et deux problèmes
// au plus par session : une cascade d'erreurs ne fait pas dix notifications.

import { api, texteErreur, type RapportCourriel } from "./api";
import { toast } from "./components/Toaster";
import { forme } from "./incidents";

const CLE = "maitrize:rapports-proposes";
const DELAI_JOURS = 7;
const PAR_SESSION = 2;
let proposesCetteSession = 0;

/** Ce que le navigateur ou Tauri disent sans que rien ne soit cassé. */
const BRUITS = [/ResizeObserver loop/i, /listeners\[eventId\]/];

/** Ce qui reconnaît un problème, chiffres mis à part : la même erreur à une ligne près reste la même. */
export const signatureDe = (message: string) => forme(message).slice(0, 160);

/** Faut-il proposer ce problème ? Pas s'il l'a été il y a moins de `delaiJours`. */
export function aProposer(memo: Record<string, string>, signature: string, maintenant: Date, delaiJours = DELAI_JOURS): boolean {
  const avant = Date.parse(memo[signature] ?? "");
  return Number.isNaN(avant) || maintenant.getTime() - avant >= delaiJours * 86_400_000;
}

/**
 * Un vrai bug de l'écran ? Une commande du backend qui échoue rejette une
 * chaîne, déjà notée au journal comme un échec : souvent le réseau, pas un
 * bug. Une exception de l'écran, elle, est une `Error`.
 */
export const estUnBug = (raison: unknown) =>
  raison instanceof Error && !BRUITS.some((b) => b.test(raison.message));

export const estUnBruit = (message: string) => BRUITS.some((b) => b.test(message));

const lireMemo = (): Record<string, string> => {
  try { const v = JSON.parse(localStorage.getItem(CLE) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; }
};
const ecrireMemo = (m: Record<string, string>) => {
  // Les plus anciennes marques s'oublient : la mémoire ne grossit pas sans fin.
  const gardees = Object.entries(m).sort(([, a], [, b]) => b.localeCompare(a)).slice(0, 50);
  try { localStorage.setItem(CLE, JSON.stringify(Object.fromEntries(gardees))); } catch { /* sans mémoire, on proposera de nouveau */ }
};

/**
 * Propose d'envoyer le rapport. `motif` part dans l'e-mail ; `cle` reconnaît
 * le problème (par défaut, le motif) ; `phrase` est ce que dit la notification.
 */
export function proposerLeRapport(motif: string, phrase = "Un problème est survenu dans Maitrize.", cle = motif): void {
  if (proposesCetteSession >= PAR_SESSION || estUnBruit(motif)) return;
  const signature = signatureDe(cle);
  const memo = lireMemo();
  const maintenant = new Date();
  if (!aProposer(memo, signature, maintenant)) return;
  ecrireMemo({ ...memo, [signature]: maintenant.toISOString() });
  proposesCetteSession++;
  toast(phrase, { icone: "⚠️", duree: 20000, action: { label: "Envoyer le rapport", faire: () => envoyerLeRapport(motif) } });
}

/** Ouvre la messagerie sur le rapport ; sans messagerie, le copie pour qu'on le colle soi-même. */
export async function envoyerLeRapport(motif?: string): Promise<void> {
  let r: RapportCourriel;
  try { r = await api.diagCourriel(motif); } catch (e) {
    toast(`Rapport impossible : ${texteErreur(e)}`, { icone: "⚠️" });
    return;
  }
  if (r.ouvert) return;
  try {
    await navigator.clipboard.writeText(`${r.sujet}\n\n${r.corps}`);
    toast("Aucune messagerie ne s'est ouverte : le rapport est copié. Collez-le dans un e-mail à contact@maitrize.com.", { icone: "📋", duree: 15000 });
  } catch {
    toast("Aucune messagerie ne s'est ouverte. Le rapport se copie depuis Réglages › Données & synchro › Avancé, pour un e-mail à contact@maitrize.com.", { icone: "📋", duree: 15000 });
  }
}

/** Au démarrage : si la session d'avant s'est mal terminée, le dire, une fois. */
export async function proposerApresUnIncident(): Promise<void> {
  try {
    const r = await api.diagIncidentPrecedent();
    if (r) proposerLeRapport(r[0], r[0], `démarrage ${r[1]}`);
  } catch { /* le journal est illisible : rien à proposer */ }
}
