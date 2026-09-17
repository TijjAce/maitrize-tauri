import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, couleurHex, raccourci } from "../api";
import { useAsync } from "../components/ui";
import { BandeauSync } from "../components/BandeauSync";
import { EVT_JOUR } from "../components/CommandPalette";

export default function Dashboard() {
  const nav = useNavigate();
  // Va sur une page puis déclenche l'action associée (comme la palette ⌘K).
  const action = (to: string, evt: string) => { nav(to); setTimeout(() => window.dispatchEvent(new Event(evt)), 120); };
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: ateliers } = useAsync(() => api.ateliersList(), []);
  const [nom, setNom] = React.useState("");
  React.useEffect(() => { api.settingGet("enseignantNom").then((v) => setNom(v ?? "")); }, []);

  const today = (() => {
    const d = new Date().toISOString().slice(0, 10);
    return d;
  })();
  const { data: creneaux } = useAsync(() => api.creneauxList(today, today), []);

  // Le cahier journal s'ouvre au bon jour : la date n'est pas dans l'URL.
  const ouvrirLeJournal = (iso: string) => {
    nav("/planning");
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVT_JOUR, { detail: iso })), 120);
  };

  // Première ligne du prévu : de quoi reconnaître le créneau sans l'ouvrir.
  const apercu = (texte: string) =>
    (texte ?? "").split("\n").map((l) => l.replace(/^[-•*\s]+/, "").trim()).find(Boolean) ?? "";

  const maintenant = new Date().toTimeString().slice(0, 5);
  const jourDeClasse = (creneaux?.length ?? 0) > 0;
  const sansBilan = (creneaux ?? []).filter((c) => !(c.bilan ?? "").trim() && c.heureFin <= maintenant);

  const stats = [
    { label: "Séquences", val: sequences?.length ?? 0, ico: "📚", to: "/plan" },
    { label: "Ateliers", val: ateliers?.length ?? 0, ico: "🧩", to: "/ateliers" },
    { label: "Élèves", val: eleves?.length ?? 0, ico: "👧", to: "/eleves" },
  ];

  return (
    <Page titre={nom ? `Bonjour ${nom}` : "Tableau de bord"} sous={new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}>
      <BandeauSync />
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0 }}>🗓️ Aujourd'hui</h3>
            <div className="spacer" />
            {jourDeClasse && (
              <button className="btn sm" onClick={() => ouvrirLeJournal(today)}>Ouvrir le cahier journal</button>
            )}
          </div>
          {!jourDeClasse ? (
            <p style={{ color: "var(--text-2)" }}>Aucun créneau prévu. <a style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => nav("/planning")}>Ouvrir le planning →</a></p>
          ) : (
            <div style={{ marginTop: 8 }}>
              {[...creneaux!].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)).map((c) => {
                // Le créneau en cours se repère d'un coup d'œil : c'est celui
                // sur lequel on écrit, souvent entre deux activités.
                const enCours = c.heureDebut <= maintenant && maintenant < c.heureFin;
                const fini = c.heureFin <= maintenant;
                const texte = apercu(c.prevu ?? "");
                return (
                  <div key={c.id} className="list-row" role="button" tabIndex={0}
                    onClick={() => ouvrirLeJournal(today)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirLeJournal(today); } }}
                    title="Ouvrir le cahier journal de ce jour"
                    style={{
                      marginBottom: 6, cursor: "pointer", alignItems: "flex-start",
                      borderLeft: enCours ? "3px solid var(--accent)" : "3px solid transparent",
                      paddingLeft: 7, opacity: fini && !enCours ? 0.75 : 1,
                    }}>
                    <span className="badge">{c.heureDebut}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="title">{c.matiere || "Créneau"}</div>
                      {texte && <div className="meta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texte}</div>}
                    </div>
                    {fini && !(c.bilan ?? "").trim() && <span className="meta" title="Bilan à écrire">✍️</span>}
                    {(c.bilan ?? "").trim() && <span className="meta" title="Bilan écrit">✓</span>}
                  </div>
                );
              })}
              {sansBilan.length > 0 && (
                <button className="btn sm" style={{ marginTop: 4 }} onClick={() => ouvrirLeJournal(today)}>
                  ✍️ {sansBilan.length} créneau{sansBilan.length > 1 ? "x" : ""} sans bilan
                </button>
              )}
            </div>
          )}
        </div>
        <div className="card" style={{ flex: 1 }}>
          <h3 style={{ marginTop: 0 }}>⚡ Actions rapides</h3>
          <div style={{ display: "grid", gap: 8 }}>
            <button className="btn" onClick={() => action("/plan", "maitrize:nouvelle-sequence")}>➕ Nouvelle séquence</button>
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
