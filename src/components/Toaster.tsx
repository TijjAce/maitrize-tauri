import React from "react";
import { inscrireAnnulable } from "../annulation";

export interface ToastDetail {
  id?: number; message: string; duree?: number; icone?: string;
  /** Un geste offert dans la notification : « Annuler », le plus souvent. */
  action?: { label: string; faire: () => void | Promise<void> };
}

let prochainId = 0;
const fermerLeToast = (id: number) => window.dispatchEvent(new CustomEvent("maitrize:toast-fermer", { detail: id }));

/** Affiche une notification en haut de l'écran (10 s par défaut). */
export function toast(
  message: string,
  opts: { duree?: number; icone?: string; action?: ToastDetail["action"]; clavier?: boolean } = {},
) {
  const id = ++prochainId;
  const duree = opts.duree ?? 10000;
  let action = opts.action;
  // Un bandeau qui offre « Annuler » : ⌘Z fait de même tant qu'il est là, une seule fois (voir annulation.ts) —
  // sauf là où l'écran a son propre historique (`clavier: false`) : ⌘Z y défait déjà la suppression.
  if (action?.label === "Annuler" && opts.clavier !== false) {
    const geste = action;
    const debut = Date.now();
    let fait = false;
    let retirer = () => {};
    const faire = async () => { if (fait) return; fait = true; retirer(); await geste.faire(); };
    retirer = inscrireAnnulable({ aDefaire: () => (fait ? 0 : debut), defaire: () => { void faire(); fermerLeToast(id); }, visible: () => true, partout: true });
    window.setTimeout(() => retirer(), duree);
    action = { label: geste.label, faire };
  }
  window.dispatchEvent(new CustomEvent("maitrize:toast", { detail: { id, message, duree, icone: opts.icone ?? "📬", action } }));
}

/**
 * Supprime, puis laisse dix secondes pour revenir en arrière — au bouton du bandeau, ou par ⌘Z.
 *
 * Une boîte « Êtes-vous sûr ? » arrête le geste sans rien protéger : on répond
 * oui sans lire. Défaire après coup demande moins, et rattrape vraiment — à
 * condition que l'élément se recrée tel quel, avec ce qui part avec lui (une
 * séquence et ses séances : voir suppressionsAnnulables.ts) ; un élève et son
 * dossier restent hors de portée.
 */
export function toastAnnulable(message: string, annuler: () => void | Promise<void>, icone = "🗑", o: { clavier?: boolean } = {}) {
  toast(message, { icone, duree: DUREE_ANNULABLE, action: { label: "Annuler", faire: annuler }, clavier: o.clavier });
}

/** Le temps qu'un bandeau « Annuler » reste là, et qu'une suppression peut se défaire. */
export const DUREE_ANNULABLE = 10000;

interface ToastItem { id: number; message: string; duree: number; icone: string; action?: ToastDetail["action"] }

/** Hôte unique des toasts (monté une fois dans App). */
export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const compteur = React.useRef(0);

  const fermer = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));

  React.useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      const id = d.id ?? -++compteur.current;
      setItems((xs) => [...xs, { id, message: d.message, duree: d.duree ?? 10000, icone: d.icone ?? "📬", action: d.action }]);
      window.setTimeout(() => fermer(id), d.duree ?? 10000);
    };
    // ⌘Z a défait le geste du bandeau : il s'en va.
    const onFermer = (e: Event) => fermer((e as CustomEvent<number>).detail);
    window.addEventListener("maitrize:toast", onToast);
    window.addEventListener("maitrize:toast-fermer", onFermer);
    return () => { window.removeEventListener("maitrize:toast", onToast); window.removeEventListener("maitrize:toast-fermer", onFermer); };
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
      {items.map((t) => {
        const agir = t.action ? () => { void t.action!.faire(); fermer(t.id); } : undefined;
        return (
          // Le bandeau entier se clique quand il offre un geste : on vise le
          // message, pas le petit bouton à côté.
          <div key={t.id} className={`toast${agir ? " cliquable" : ""}`} role="status" onClick={agir}>
            <span className="toast-ico" aria-hidden="true">{t.icone}</span>
            <span className="toast-msg">{t.message}</span>
            {t.action && (
              <button className="btn sm" onClick={(e) => { e.stopPropagation(); agir?.(); }}>
                {t.action.label}
              </button>
            )}
            <button className="btn ghost sm" aria-label="Fermer la notification" onClick={(e) => { e.stopPropagation(); fermer(t.id); }}>✕</button>
          </div>
        );
      })}
    </div>
  );
}
