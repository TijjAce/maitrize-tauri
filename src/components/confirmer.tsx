import React from "react";
import { Modal } from "./ui";

// Confirmation dans la fenêtre de l'application.
//
// `window.confirm` n'y est pas implémenté : l'appel répond « non » sans rien
// afficher, et l'action demandée n'a jamais lieu — un bouton qui semble mort.
// `confirmer()` s'utilise comme lui, en attendant la réponse :
//   if (!(await confirmer("Remplacer la programmation ?"))) return;

interface Demande { message: string; oui: string; danger: boolean; resoudre: (v: boolean) => void }
const EVT = "maitrize:confirmer";

export function confirmer(message: string, opts: { oui?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resoudre) => {
    window.dispatchEvent(new CustomEvent<Demande>(EVT, {
      detail: { message, oui: opts.oui ?? "Confirmer", danger: opts.danger ?? false, resoudre },
    }));
  });
}

/** Hôte unique, monté une fois dans l'application. */
export function ConfirmerHost() {
  const [demande, setDemande] = React.useState<Demande | null>(null);
  const courante = React.useRef<Demande | null>(null);
  React.useEffect(() => {
    const h = (e: Event) => {
      // Une nouvelle demande pendant qu'une autre est ouverte : la première vaut « non ».
      courante.current?.resoudre(false);
      courante.current = (e as CustomEvent<Demande>).detail;
      setDemande(courante.current);
    };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);
  if (!demande) return null;
  const finir = (v: boolean) => { demande.resoudre(v); courante.current = null; setDemande(null); };
  return (
    <Modal titre="Confirmer" onClose={() => finir(false)}
      footer={<>
        <button className="btn" onClick={() => finir(false)}>Annuler</button>
        <button className={`btn ${demande.danger ? "danger" : "primary"}`} onClick={() => finir(true)}>{demande.oui}</button>
      </>}>
      <p style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{demande.message}</p>
    </Modal>
  );
}
