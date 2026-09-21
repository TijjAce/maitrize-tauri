import React from "react";
import { api, texteErreur, type PortableInfo } from "../api";
import { Modal } from "./ui";

// ── Emporter son cahier journal sur le téléphone ──────────────────────────
//
// L'application sert un instantané de ses données sur le réseau local, et le
// téléphone l'ouvre dans son navigateur en scannant un QR code : le planning
// du jour avec ce qui est prévu, les séquences, les élèves. Rien ne passe par
// internet, rien ne s'installe, et le partage s'arrête en refermant.
//
// Utile en classe, où l'on n'a pas l'ordinateur sous la main, et en réunion.

export function SurLeTelephone({ label = "📱 Sur le téléphone" }: { label?: string }) {
  const [ouvert, setOuvert] = React.useState(false);
  const [info, setInfo] = React.useState<PortableInfo | null>(null);
  const [erreur, setErreur] = React.useState("");

  const fermer = React.useCallback(() => {
    // Le partage s'arrête avec la fenêtre : il ne reste pas ouvert par oubli.
    api.portableArreter().catch(() => {});
    setOuvert(false); setInfo(null); setErreur("");
  }, []);

  const ouvrir = async () => {
    setOuvert(true); setErreur(""); setInfo(null);
    try { setInfo(await api.portableDemarrer()); }
    catch (e) { setErreur(texteErreur(e)); }
  };

  // Quitter la page pendant le partage l'arrête aussi.
  React.useEffect(() => () => { api.portableArreter().catch(() => {}); }, []);

  return (
    <>
      <button type="button" className="btn ghost sm" onClick={() => { void ouvrir(); }}
        title="Ouvrir le planning et le cahier journal sur le téléphone, par le WiFi">{label}</button>
      {ouvert && (
        <Modal titre="📱 Sur le téléphone" onClose={fermer}
          footer={<button className="btn" onClick={fermer}>Arrêter le partage</button>}>
          {erreur ? (
            <p style={{ color: "var(--danger, #ef4444)", margin: 0 }}>{erreur}</p>
          ) : info ? (
            // Court et serré : la fenêtre doit tenir sur un écran d'ordinateur
            // portable, QR compris, sans que rien ne sorte par le haut.
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 13.5 }}>
                Scannez-le avec votre téléphone, sur <b>le même WiFi</b>.
              </p>
              <div className="qr-portable" style={{ display: "inline-block" }}
                ref={(el) => { el?.querySelector("svg")?.setAttribute("style", "width:150px;height:150px;display:block"); }}
                dangerouslySetInnerHTML={{ __html: info.qrSvg }} />
              <p className="meta" style={{ margin: 0, fontSize: 11.5, wordBreak: "break-all" }}>{info.url}</p>
              <p style={{ fontSize: 12, color: "var(--text-2)", margin: 0 }}>
                Planning, prévu et bilan, séquences, élèves — en lecture seule, sur le réseau local.
                Le partage s'arrête en fermant.
              </p>
            </div>
          ) : (
            <p style={{ margin: 0 }}>Démarrage du partage…</p>
          )}
        </Modal>
      )}
    </>
  );
}
