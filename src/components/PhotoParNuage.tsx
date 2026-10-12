import React from "react";
import { api } from "../api";
import { Modal } from "./ui";
import { EVT_MES_PICTOS, lireMesPictos, photoArrivee, type MonPicto } from "../mesPictos";
import { releverMaintenant } from "../releveTelephone";

// ── Une photo pour un picto, par Nuage ─────────────────────────────────────
//
// La photo d'un picto ne passe pas par le WiFi : elle passe par Nuage, comme
// les dictées, où que soient le téléphone et l'ordinateur. Dans le
// Dictaphone, onglet Notes › « Photo pour un picto » : on photographie
// l'objet, on lui donne son nom, et la photo se range dans Mes pictos. Cette
// fenêtre l'attend — elle relève Nuage de près — et se referme sur la photo
// arrivée depuis son ouverture.

/** Relever de près pendant l'attente : la photo se pose en quelques secondes, pas à la relève de fond. */
const RELEVE_RAPPROCHEE = 5_000;

export function PhotoParNuage({ mot, onPhoto, label = "📱 Photographier avec le téléphone", className = "btn sm" }: {
  /** Le mot attendu : la photo qui le porte l'emporte, s'il en arrive plusieurs. */
  mot: string;
  onPhoto: (photo: MonPicto) => void;
  label?: React.ReactNode;
  className?: string;
}) {
  const [ouverte, setOuverte] = React.useState(false);
  /** Le relais de Nuage existe-t-il ? Rien tant qu'on ne le sait pas. */
  const [relie, setRelie] = React.useState<boolean | null>(null);
  const connues = React.useRef<Set<number>>(new Set());
  // Le dernier mot et le dernier `onPhoto`, sans relancer l'attente à chaque frappe.
  const suite = React.useRef({ mot, onPhoto });
  suite.current = { mot, onPhoto };

  const ouvrir = async () => {
    setOuverte(true);
    setRelie(null);
    const [etat, miens] = await Promise.all([
      api.telephoneEtat().catch(() => null),
      lireMesPictos().catch((): MonPicto[] => []),
    ]);
    connues.current = new Set(miens.map((p) => p.id));
    setRelie(!!etat?.relie);
  };

  React.useEffect(() => {
    if (!ouverte || !relie) return;
    let vivante = true;
    const regarder = async () => {
      const arrivee = photoArrivee(connues.current, await lireMesPictos().catch((): MonPicto[] => []), suite.current.mot);
      if (!vivante || !arrivee) return;
      vivante = false;
      setOuverte(false);
      suite.current.onPhoto(arrivee);
    };
    window.addEventListener(EVT_MES_PICTOS, regarder);
    releverMaintenant();
    const minuteur = setInterval(releverMaintenant, RELEVE_RAPPROCHEE);
    return () => {
      vivante = false;
      window.removeEventListener(EVT_MES_PICTOS, regarder);
      clearInterval(minuteur);
    };
  }, [ouverte, relie]);

  const fermer = () => setOuverte(false);
  const attendu = mot.trim();
  return (
    <>
      <button type="button" className={className} onClick={() => { void ouvrir(); }}>{label}</button>
      {ouverte && (
        <Modal titre="📷 Une photo, par le téléphone" onClose={fermer} footer={<button className="btn" onClick={fermer}>Annuler</button>}>
          {relie === null ? <p>…</p> : relie ? (
            <div>
              <p style={{ marginTop: 0, lineHeight: 1.55 }}>
                Dans le Dictaphone, onglet <b>Notes</b> › « Photo pour un picto » : photographiez l'objet
                {attendu ? <>, et nommez-le « <b>{attendu}</b> »</> : null}. La photo passe par Nuage, se range dans Mes pictos,
                et se pose ici.
              </p>
              <p className="meta">⏳ En attente de la photo…</p>
            </div>
          ) : (
            <p style={{ marginTop: 0, lineHeight: 1.55 }}>
              Le Dictaphone n'est pas relié à cet ordinateur : la photo n'a pas de chemin. Reliez-le dans Réglages › Téléphone ›
              ☁️ Le téléphone par Nuage.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
