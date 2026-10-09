import React from "react";
import { api, isMac, texteErreur, type ChiffrementDisque } from "../api";
import { constat } from "../chiffrementDisque";

/** La carte des Réglages : le disque est-il chiffré ? (voir chiffrementDisque.ts) */
export function ChiffrementDisqueCard() {
  const [etat, setEtat] = React.useState<ChiffrementDisque | null>(null);
  const [msg, setMsg] = React.useState("");
  React.useEffect(() => {
    api.chiffrementDisque().then(setEtat).catch(() => setEtat({ etat: "inconnu", nom: "" }));
  }, []);
  const c = etat ? constat(etat) : null;
  const alerte = c?.ton === "alerte";
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620, ...(alerte ? { borderColor: "var(--danger, #ef4444)" } : {}) }}>
      <h3 style={{ marginTop: 0 }}>{alerte ? "🔓" : "🔒"} Chiffrement du disque</h3>
      <p style={{ color: alerte ? undefined : "var(--text-2)", margin: 0, fontSize: 13, lineHeight: 1.55 }}>
        {c ? `${c.ton === "ok" ? "✅ " : alerte ? "⚠️ " : ""}${c.texte}` : "Vérification…"}
      </p>
      {c && c.ton !== "ok" && isMac && (
        <div style={{ marginTop: 10, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={() => { setMsg(""); api.ouvrirReglagesChiffrement().catch((e) => setMsg("❌ " + texteErreur(e))); }}>
            Ouvrir les réglages de FileVault
          </button>
          {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
        </div>
      )}
    </div>
  );
}
