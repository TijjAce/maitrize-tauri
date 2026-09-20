import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, couleurHex, raccourci } from "../api";
import { useAsync } from "../components/ui";
import { BandeauSync } from "../components/BandeauSync";
import { EVT_JOUR } from "../components/CommandPalette";
import { isoJour, lundiDe, plusJours } from "../dates";

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
  // La semaine, pas seulement le jour : on prépare la suite autant qu'on
  // remplit le jour même, et un lundi soir on regarde déjà mardi.
  const lundi = React.useMemo(() => lundiDe(new Date()), []);
  // Du lundi au dimanche : un créneau posé un samedi se verrait aussi. Seuls
  // les jours qui portent quelque chose s'affichent, la carte reste courte.
  const jours = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => isoJour(plusJours(lundi, i))), [lundi]);
  const { data: creneaux } = useAsync(() => api.creneauxList(jours[0], jours[6]), [jours[0]]);

  // Le cahier journal s'ouvre au bon jour : la date n'est pas dans l'URL.
  const ouvrirLeJournal = (iso: string) => {
    nav("/planning");
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVT_JOUR, { detail: iso })), 120);
  };

  const maintenant = new Date().toTimeString().slice(0, 5);
  const semaine = (creneaux ?? []).filter((c) => (c.date ?? "").slice(0, 10) >= jours[0]);
  const duJour = (iso: string) => semaine
    .filter((c) => (c.date ?? "").slice(0, 10) === iso)
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  // Du lundi au vendredi toujours — on ouvre aussi un jour vide pour le
  // préparer — plus le week-end s'il porte quelque chose, ou si c'est
  // aujourd'hui.
  const joursMontres = jours.filter((j, i) => i < 5 || duJour(j).length || j === today);
  const jourDeClasse = semaine.length > 0;
  /** Ce qui est passé sans bilan : ce qu'il reste à écrire de la semaine. */
  const sansBilan = semaine.filter((c) => !(c.bilan ?? "").trim()
    && ((c.date ?? "").slice(0, 10) < today || ((c.date ?? "").slice(0, 10) === today && c.heureFin <= maintenant)));
  const nomDuJour = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    const texte = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
    return texte.charAt(0).toUpperCase() + texte.slice(1);
  };

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
            <h3 style={{ margin: 0 }}>🗓️ Cette semaine</h3>
            <div className="spacer" />
            {jourDeClasse && (
              <button className="btn sm" onClick={() => ouvrirLeJournal(today)}>Ouvrir le cahier journal</button>
            )}
          </div>
          {!jourDeClasse ? (
            <p style={{ color: "var(--text-2)" }}>Aucun créneau cette semaine. <a style={{ color: "var(--accent)", cursor: "pointer" }} onClick={() => nav("/planning")}>Ouvrir le planning →</a></p>
          ) : (
            <>
            <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {/* Un bouton par jour : on va à son cahier journal d'un clic,
                  sans dérouler les créneaux de toute la semaine. */}
              {joursMontres.map((jour) => {
                const duJourLa = duJour(jour);
                const cest = jour === today;
                const aEcrire = duJourLa.filter((c) => !(c.bilan ?? "").trim()
                  && (jour < today || (cest && c.heureFin <= maintenant))).length;
                return (
                  <button key={jour} className={`btn${cest ? " primary" : ""}`} onClick={() => ouvrirLeJournal(jour)}
                    title={`Ouvrir le cahier journal du ${nomDuJour(jour).toLowerCase()}`}
                    style={{ flexDirection: "column", alignItems: "flex-start", gap: 2, minWidth: 104, padding: "8px 12px" }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{nomDuJour(jour)}</span>
                    <span style={{ fontSize: 11.5, opacity: .8 }}>
                      {duJourLa.length ? `${duJourLa.length} créneau${duJourLa.length > 1 ? "x" : ""}` : "—"}
                      {aEcrire > 0 && ` · ✍️ ${aEcrire}`}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={{ marginTop: 8 }}>
              {sansBilan.length > 0 && (
                <button className="btn sm" style={{ marginTop: 4 }}
                  onClick={() => ouvrirLeJournal((sansBilan[0].date ?? today).slice(0, 10))}>
                  ✍️ {sansBilan.length} créneau{sansBilan.length > 1 ? "x" : ""} sans bilan
                </button>
              )}
            </div>
            </>
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
