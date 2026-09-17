import React from "react";

export interface ToastDetail {
  message: string; duree?: number; icone?: string;
  /** Un geste offert dans la notification : « Annuler », le plus souvent. */
  action?: { label: string; faire: () => void | Promise<void> };
}

/** Affiche une notification en haut de l'écran (10 s par défaut). */
export function toast(
  message: string,
  opts: { duree?: number; icone?: string; action?: ToastDetail["action"] } = {},
) {
  window.dispatchEvent(new CustomEvent("maitrize:toast", {
    detail: { message, duree: opts.duree ?? 10000, icone: opts.icone ?? "📬", action: opts.action },
  }));
}

/**
 * Supprime, puis laisse dix secondes pour revenir en arrière.
 *
 * Une boîte « Êtes-vous sûr ? » arrête le geste sans rien protéger : on répond
 * oui sans lire. Défaire après coup demande moins, et rattrape vraiment — à
 * condition que l'élément se recrée tel quel, ce qui exclut ce qui entraîne
 * autre chose avec lui (une séquence et ses séances, un élève et son dossier).
 */
export function toastAnnulable(message: string, annuler: () => void | Promise<void>, icone = "🗑") {
  toast(message, { icone, duree: 10000, action: { label: "Annuler", faire: annuler } });
}

interface ToastItem { id: number; message: string; duree: number; icone: string; action?: ToastDetail["action"] }

/** Hôte unique des toasts (monté une fois dans App). */
export function Toaster() {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const compteur = React.useRef(0);

  const fermer = (id: number) => setItems((xs) => xs.filter((x) => x.id !== id));

  React.useEffect(() => {
    const onToast = (e: Event) => {
      const d = (e as CustomEvent<ToastDetail>).detail;
      const id = ++compteur.current;
      setItems((xs) => [...xs, { id, message: d.message, duree: d.duree ?? 10000, icone: d.icone ?? "📬", action: d.action }]);
      window.setTimeout(() => fermer(id), d.duree ?? 10000);
    };
    window.addEventListener("maitrize:toast", onToast);
    return () => window.removeEventListener("maitrize:toast", onToast);
  }, []);

  if (items.length === 0) return null;
  return (
    <div className="toaster" role="region" aria-label="Notifications" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className="toast" role="status">
          <span className="toast-ico" aria-hidden="true">{t.icone}</span>
          <span className="toast-msg">{t.message}</span>
          {t.action && (
            <button className="btn sm" onClick={() => { void t.action!.faire(); fermer(t.id); }}>
              {t.action.label}
            </button>
          )}
          <button className="btn ghost sm" aria-label="Fermer la notification" onClick={() => fermer(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}
