import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, couleurHex, raccourci } from "../api";
import { useAsync } from "../components/ui";

export default function Dashboard() {
  const nav = useNavigate();
  // Va sur une page puis déclenche l'action associée (comme la palette ⌘K).
  const action = (to: string, evt: string) => { nav(to); setTimeout(() => window.dispatchEvent(new Event(evt)), 120); };
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: ateliers } = useAsync(() => api.ateliersList(), []);
  const { data: projets } = useAsync(() => api.projetsList(), []);
  const [nom, setNom] = React.useState("");
  React.useEffect(() => { api.settingGet("enseignantNom").then((v) => setNom(v ?? "")); }, []);

  const today = (() => {
    const d = new Date().toISOString().slice(0, 10);
    return d;
  })();
  const { data: creneaux } = useAsync(() => api.creneauxList(today, today), []);

  const stats = [
    { label: "Séquences", val: sequences?.length ?? 0, ico: "📚", to: "/sequences" },
    { label: "Projets", val: projets?.length ?? 0, ico: "📁", to: "/projets" },
    { label: "Ateliers", val: ateliers?.length ?? 0, ico: "🧩", to: "/ateliers" },
    { label: "Élèves", val: eleves?.length ?? 0, ico: "👧", to: "/eleves" },
  ];

  return (
    <Page titre={nom ? `Bonjour ${nom}` : "Tableau de bord"} sous={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}>
      <div className="grid cols" style={{ marginBottom: 22 }}>
        {stats.map((s) => (
          <div key={s.label} className="card" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }} onClick={() => nav(s.to)}>
            <div style={{ fontSize: 30 }}>{s.ico}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{s.val}</div>
              <div style={{ color: "var(--text-2)", fontSize: 13 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="row" style={{ alignItems: "flex-start" }}>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>🗓️ Aujourd'hui</h3>
          {(creneaux?.length ?? 0) === 0 ? (
            <p style={{ color: "var(--text-2)" }}>Aucun créneau prévu. <a style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => nav("/planning")}>Ouvrir le planning →</a></p>
          ) : (
            creneaux!.sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)).map((c) => (
              <div key={c.id} className="list-row" style={{ marginBottom: 6 }}>
                <span className="badge">{c.heureDebut}</span>
                <span style={{ flex: 1 }}>{c.matiere}</span>
              </div>
            ))
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>⚡ Actions rapides</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn" onClick={() => action("/sequences", "maitrize:nouvelle-sequence")}>➕ Nouvelle séquence</button>
            <button className="btn" onClick={() => action("/assistant", "maitrize:generer-sequence")}>✨ Générer une séquence (IA)</button>
            <button className="btn" onClick={() => nav("/eleves")}>👧 Mes élèves</button>
            <button className="btn" onClick={() => window.dispatchEvent(new Event("maitrize:palette"))}>{raccourci("K")} Toutes les actions…</button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>📚 Séquences récentes</h3>
        {(sequences?.length ?? 0) === 0 ? (
          <p style={{ color: "var(--text-2)" }}>Aucune séquence pour l'instant.</p>
        ) : (
          [...(sequences ?? [])]
            .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)).slice(0, 5)
            .map((s) => (
              <div key={s.id} className="list-row" style={{ cursor: "pointer", marginBottom: 6 }} onClick={() => nav(`/sequences/${s.id}`)}>
                <span className="dot" style={{ width: 10, height: 10, borderRadius: 3, background: couleurHex[s.couleur] }} />
                <div style={{ flex: 1 }}>
                  <div className="title">{s.titre}</div>
                  <div className="meta">{[s.matiere, s.cycle, `P${s.periode}`].filter(Boolean).join(" · ")}</div>
                </div>
                <span className="meta">{new Date(s.dateCreation).toLocaleDateString("fr-FR")}</span>
              </div>
            ))
        )}
      </div>
    </Page>
  );
}
