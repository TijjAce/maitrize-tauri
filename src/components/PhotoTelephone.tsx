import React from "react";
import { api, PortableInfo } from "../api";
import { Modal } from "./ui";
import { listen } from "@tauri-apps/api/event";

// Bouton « 📱 Téléphone » : démarre un mini-serveur local, affiche un QR code,
// et appelle onPhoto(nomFichier) quand le téléphone envoie une photo (via WiFi).
// La photo est déjà enregistrée côté Rust ; on reçoit juste son nom de fichier.
//
// C'est la seule façon dont l'ordinateur demande quelque chose au téléphone par
// le WiFi : le Dictaphone lit ce QR code (« Pages et photos »), photographie
// les pages — chacune ajustée aussitôt, et envoyée dès qu'elle est gardée — ou
// prend la photo ; n'importe quel autre téléphone ouvre la page de l'appareil
// photo.
export function PhotoTelephone({ onPhoto, label = "📱 Téléphone", serie = false, onFin, className = "btn", avantDOuvrir, sansBouton = false, demande = 0 }: {
  onPhoto: (nom: string) => void;
  label?: React.ReactNode;
  /** En série, la fenêtre reste ouverte photo après photo : un manuel, page à page. */
  serie?: boolean;
  /** Fin de série : le téléphone a dit « terminé », ou l'on a fermé ici. */
  onFin?: (recues: number) => void;
  className?: string;
  /** Ce qu'il faut faire avant d'ouvrir ; `false` annule (un titre manquant, par exemple). */
  avantDOuvrir?: () => boolean | Promise<boolean>;
  /** Pas de bouton à soi : d'autres boutons l'ouvrent, en changeant `demande`. */
  sansBouton?: boolean;
  /** Chaque nouvelle valeur ouvre la fenêtre : la demande vient d'ailleurs sur la page. */
  demande?: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [info, setInfo] = React.useState<PortableInfo | null>(null);
  const [err, setErr] = React.useState("");
  const [recues, setRecues] = React.useState(0);
  const recuesRef = React.useRef(0);

  const fermer = React.useCallback(() => {
    api.photoCaptureArreter().catch(() => {});
    setOpen(false); setInfo(null); setErr("");
  }, []);

  const terminer = React.useCallback(() => {
    fermer();
    onFin?.(recuesRef.current);
  }, [fermer, onFin]);

  const ouvrir = async () => {
    if (avantDOuvrir && !(await avantDOuvrir())) return;
    setOpen(true); setErr(""); setInfo(null); setRecues(0); recuesRef.current = 0;
    try { setInfo(await api.photoCaptureDemarrer(serie)); }
    catch (e: any) { setErr("❌ " + String(e)); }
  };

  // Ouverte d'ailleurs : un bouton de la page l'a demandée.
  const derniereDemande = React.useRef(demande);
  React.useEffect(() => {
    if (demande === derniereDemande.current) return;
    derniereDemande.current = demande;
    void ouvrir();
  }, [demande]); // eslint-disable-line react-hooks/exhaustive-deps

  // Une fenêtre qui disparaît avec sa page ne laisse pas tourner son serveur.
  const ouverte = React.useRef(false);
  ouverte.current = open;
  React.useEffect(() => () => { if (ouverte.current) api.photoCaptureArreter().catch(() => {}); }, []);

  React.useEffect(() => {
    if (!open) return;
    let actif = true;
    const un = listen<string>("photo:recue", (e) => {
      if (!actif) return;
      onPhoto(e.payload);
      if (serie) { recuesRef.current += 1; setRecues(recuesRef.current); }
      else fermer();
    });
    const fin = serie ? listen("photo:fin", () => { if (actif) terminer(); }) : null;
    return () => { actif = false; un.then((f) => f()); fin?.then((f) => f()); };
  }, [open, onPhoto, fermer, serie, terminer]);

  return (
    <>
      {!sansBouton && <button type="button" className={className} onClick={ouvrir}>{label}</button>}
      {open && (
        <Modal titre={serie ? "📱 Les pages, depuis le téléphone" : "📷 Une photo, depuis le téléphone"} onClose={serie ? terminer : fermer}
          footer={serie
            ? <button className="btn primary" onClick={terminer}>{recues ? `✅ Terminer (${recues} page${recues > 1 ? "s" : ""})` : "Annuler"}</button>
            : <button className="btn" onClick={fermer}>Annuler</button>}>
          {err ? <p style={{ color: "var(--danger)" }}>{err}</p> : info ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginTop: 0 }}>
                {serie
                  ? "Dans le Dictaphone, « Pages et photos » › Scanner le QR code, puis « Photographier les pages » : chacune arrive ici dès qu'elle est gardée. Ou visez ce QR code avec l'appareil photo de n'importe quel téléphone. Même WiFi que l'ordinateur."
                  : "Dans le Dictaphone, « Pages et photos » › Scanner le QR code, puis prenez la photo. Ou visez ce QR code avec l'appareil photo de n'importe quel téléphone. Même WiFi que l'ordinateur."}
              </p>
              <div className="qr-portable" style={{ display: "inline-block" }} dangerouslySetInnerHTML={{ __html: info.qrSvg }} />
              <p className="meta" style={{ marginTop: 12 }}>
                {serie ? (recues ? `✅ ${recues} page${recues > 1 ? "s" : ""} reçue${recues > 1 ? "s" : ""} — en attente de la suivante…` : "⏳ En attente de la première page…") : "⏳ En attente d'une photo…"}
              </p>
            </div>
          ) : <p>Démarrage du serveur…</p>}
        </Modal>
      )}
    </>
  );
}
