import React from "react";
import { api, PortableInfo } from "../api";
import { Modal } from "./ui";
import { listen } from "@tauri-apps/api/event";

// Bouton « 📱 Téléphone » : démarre un mini-serveur local, affiche un QR code,
// et appelle onPhoto(nomFichier) quand le téléphone envoie une photo (via WiFi).
// La photo est déjà enregistrée côté Rust ; on reçoit juste son nom de fichier.
export function PhotoTelephone({ onPhoto, label = "📱 Téléphone" }: { onPhoto: (nom: string) => void; label?: string }) {
  const [open, setOpen] = React.useState(false);
  const [info, setInfo] = React.useState<PortableInfo | null>(null);
  const [err, setErr] = React.useState("");

  const fermer = React.useCallback(() => {
    api.photoCaptureArreter().catch(() => {});
    setOpen(false); setInfo(null); setErr("");
  }, []);

  const ouvrir = async () => {
    setOpen(true); setErr(""); setInfo(null);
    try { setInfo(await api.photoCaptureDemarrer()); }
    catch (e: any) { setErr("❌ " + String(e)); }
  };

  React.useEffect(() => {
    if (!open) return;
    let actif = true;
    const un = listen<string>("photo:recue", (e) => {
      if (!actif) return;
      onPhoto(e.payload);
      fermer();
    });
    return () => { actif = false; un.then((f) => f()); };
  }, [open, onPhoto, fermer]);

  return (
    <>
      <button type="button" className="btn" onClick={ouvrir}>{label}</button>
      {open && (
        <Modal titre="📷 Photo depuis le téléphone" onClose={fermer}
          footer={<button className="btn" onClick={fermer}>Annuler</button>}>
          {err ? <p style={{ color: "var(--danger)" }}>{err}</p> : info ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginTop: 0 }}>Scannez ce QR code avec votre téléphone (même WiFi), prenez une photo : elle arrivera ici automatiquement.</p>
              <div className="qr-portable" style={{ display: "inline-block" }} dangerouslySetInnerHTML={{ __html: info.qrSvg }} />
              <p className="meta" style={{ marginTop: 12 }}>⏳ En attente d'une photo…</p>
            </div>
          ) : <p>Démarrage du serveur…</p>}
        </Modal>
      )}
    </>
  );
}
