import React from "react";
import { api, PortableInfo } from "../api";
import { Modal } from "./ui";
import { listen } from "@tauri-apps/api/event";

// Bouton « 📱 Téléphone » : démarre un mini-serveur local, affiche un QR code,
// et appelle onPhoto(nomFichier) quand le téléphone envoie une photo (via WiFi).
// La photo est déjà enregistrée côté Rust ; on reçoit juste son nom de fichier.
export function PhotoTelephone({ onPhoto, label = "📱 Téléphone", serie = false, onFin, className = "btn", avantDOuvrir }: {
  onPhoto: (nom: string) => void;
  label?: string;
  /** En série, la fenêtre reste ouverte photo après photo : un manuel, page à page. */
  serie?: boolean;
  /** Fin de série : le téléphone a dit « terminé », ou l'on a fermé ici. */
  onFin?: (recues: number) => void;
  className?: string;
  /** Ce qu'il faut faire avant d'ouvrir ; `false` annule (un titre manquant, par exemple). */
  avantDOuvrir?: () => boolean | Promise<boolean>;
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
      <button type="button" className={className} onClick={ouvrir}>{label}</button>
      {open && (
        <Modal titre={serie ? "📷 Photographier les pages" : "📷 Photo depuis le téléphone"} onClose={serie ? terminer : fermer}
          footer={serie
            ? <button className="btn primary" onClick={terminer}>{recues ? `✅ Terminer (${recues} page${recues > 1 ? "s" : ""})` : "Annuler"}</button>
            : <button className="btn" onClick={fermer}>Annuler</button>}>
          {err ? <p style={{ color: "var(--danger)" }}>{err}</p> : info ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginTop: 0 }}>
                {serie
                  ? "Scannez ce QR code avec votre téléphone (même WiFi), puis photographiez les pages une à une, dans l'ordre : chacune arrive ici. Terminez depuis le téléphone ou d'ici."
                  : "Scannez ce QR code avec votre téléphone (même WiFi), prenez une photo : elle arrivera ici automatiquement."}
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
