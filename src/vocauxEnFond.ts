// ── Les vocaux du téléphone se transcrivent tout seuls ─────────────────────
//
// Ils arrivent pendant que Maitrize est ouvert — par le WiFi ou par Nuage —
// et l'enseignant est ailleurs dans l'application. La transcription part
// donc d'ici, et non de l'écran qui les montre : quand il vient les ranger,
// le texte est déjà écrit. Un vocal à la fois : le moteur n'en mène qu'un.

import { listen } from "@tauri-apps/api/event";
import { api } from "./api";
import type { Vocal } from "./vocaux";

/** Émis quand un vocal commence ou finit d'être transcrit : l'écran qui les montre se relit. */
export const EVT_VOCAUX = "maitrize:vocaux";

let enCours = "";
/** Le vocal en cours de transcription ; vide quand il n'y en a pas. */
export const vocalEnCours = () => enCours;

/**
 * Les vocaux déjà tentés depuis l'ouverture. Un échec se reprend une fois —
 * ce qui manquait la veille est peut-être là aujourd'hui —, pas en boucle.
 */
const tentes = new Set<string>();

/** Le prochain vocal à transcrire : un vocal reçu d'abord, sinon un échec qu'on n'a pas encore repris. */
export function prochainATranscrire(vocaux: Pick<Vocal, "id" | "etat">[], dejaTentes: ReadonlySet<string>): string {
  const libre = (v: Pick<Vocal, "id" | "etat">) => !dejaTentes.has(v.id);
  return (vocaux.find((v) => v.etat === "recu" && libre(v)) ?? vocaux.find((v) => v.etat === "echec" && libre(v)))?.id ?? "";
}

const signaler = () => window.dispatchEvent(new Event(EVT_VOCAUX));

let tourne = false;

/** Transcrit ce qui attend, un vocal après l'autre, jusqu'à ce qu'il ne reste rien. */
export async function transcrireCeQuiAttend(): Promise<void> {
  if (tourne) return;
  tourne = true;
  try {
    for (;;) {
      const id = prochainATranscrire(await api.vocauxList(), tentes);
      if (!id) break;
      tentes.add(id);
      enCours = id;
      signaler();
      // L'échec s'écrit à côté du vocal, côté Rust : rien à faire ici, que passer au suivant.
      await api.vocalTranscrire(id).catch(() => {});
      enCours = "";
      signaler();
    }
  } catch {
    // Pas de liste : on réessaiera au prochain vocal qui arrive.
  } finally {
    tourne = false;
    if (enCours) { enCours = ""; signaler(); }
  }
}

/** À la demande : un vocal en échec repart, même déjà repris. */
export function retranscrire(id: string): void {
  tentes.delete(id);
  void transcrireCeQuiAttend();
}

/** Démarre l'écoute des arrivées ; rend de quoi l'arrêter. */
export function demarrerVocauxEnFond(): () => void {
  // Ce qui était resté en attente à la dernière fermeture.
  const auDepart = setTimeout(() => { void transcrireCeQuiAttend(); }, 6000);
  // Les deux chemins — WiFi et Nuage — annoncent chaque vocal rangé.
  const ecoute = listen("vocal:recu", () => { void transcrireCeQuiAttend(); }).catch(() => null);
  return () => {
    clearTimeout(auDepart);
    void ecoute.then((off) => off?.());
  };
}
