import React from "react";
import { getVersion } from "@tauri-apps/api/app";
import { api } from "../api";
import { Modal } from "./ui";
import { NOUVEAUTES, Nouveaute, nouveautesDepuis } from "../nouveautes";

// ── Quoi de neuf ───────────────────────────────────────────────────────────
//
// L'app se met à jour toute seule, et rien ne disait ce qui avait changé : les
// nouveautés se découvraient par hasard. Ce panneau s'ouvre une fois, à la
// première ouverture qui suit une mise à jour, et se rappelle ensuite depuis
// la palette ⌘K.

/** Version déjà vue sur CET ordinateur (elle ne voyage pas : chacun met à jour quand il veut). */
const CLE_VUES = "nouveautesVues";

/** Ouvre le panneau à la demande. */
export const EVT_NOUVEAUTES = "maitrize:quoi-de-neuf";
export const montrerLesNouveautes = () => window.dispatchEvent(new Event(EVT_NOUVEAUTES));

export function QuoiDeNeuf() {
  const [liste, setListe] = React.useState<Nouveaute[] | null>(null);

  const ouvrirTout = React.useCallback(() => setListe(NOUVEAUTES), []);

  React.useEffect(() => {
    window.addEventListener(EVT_NOUVEAUTES, ouvrirTout);
    return () => window.removeEventListener(EVT_NOUVEAUTES, ouvrirTout);
  }, [ouvrirTout]);

  // À l'ouverture : ce qui a changé depuis la version vue la dernière fois.
  React.useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const [version, vues] = await Promise.all([getVersion(), api.settingGet(CLE_VUES)]);
        if (!vivant) return;
        const neuf = nouveautesDepuis(vues ?? "", version);
        // La version vue se note tout de suite : un panneau qui revient à
        // chaque ouverture parce qu'on l'a fermé trop vite serait pire que rien.
        if ((vues ?? "") !== version) await api.settingSet(CLE_VUES, version);
        if (vivant && neuf.length) setListe(neuf);
      } catch {
        /* hors application Tauri (tests, maquettes) : rien à annoncer */
      }
    })();
    return () => { vivant = false; };
  }, []);

  if (!liste?.length) return null;
  return (
    <Modal titre="✨ Quoi de neuf" onClose={() => setListe(null)} large
      footer={<button className="btn primary" onClick={() => setListe(null)}>J'ai vu</button>}>
      {liste.map((n) => (
        <div key={n.version} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="chip">Version {n.version}</span>
            <span style={{ fontWeight: 600 }}>{n.titre}</span>
          </div>
          <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.5 }}>
            {n.points.map((p) => (
              <li key={p.quoi} style={{ marginBottom: 5 }}>
                {p.quoi}
                {p.ou && <span style={{ color: "var(--text-2)", fontSize: 12.5 }}> — {p.ou}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Modal>
  );
}
