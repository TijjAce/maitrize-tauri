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

  // Première ligne du prévu : de quoi reconnaître le créneau sans l'ouvrir.
  const apercu = (texte: string) =>
    // Une ligne qui ne portait qu'une image découpée n'a rien à dire ici.
    (texte ?? "").split("\n").map((l) => l.replace(/\[img:[^\]]+\]/g, "").replace(/^[-•*\s]+/, "").trim()).find(Boolean) ?? "";

  const maintenant = new Date().toTimeString().slice(0, 5);
  const semaine = (creneaux ?? []).filter((c) => (c.date ?? "").slice(0, 10) >= jours[0]);
  const duJour = (iso: string) => semaine
    .filter((c) => (c.date ?? "").slice(0, 10) === iso)
    .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  // Les jours de la semaine qui portent quelque chose, et aujourd'hui même vide.
  const joursMontres = [...new Set([...jours.filter((j) => duJour(j).length), today])]
    .filter((j) => jours.includes(j))
    .sort();
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
            <div style={{ marginTop: 8 }}>
              {joursMontres.map((jour) => {
                const duJourLa = duJour(jour);
                const cest = jour === today;
                return (
                  <div key={jour} style={{ marginBottom: 10 }}>
                    <button onClick={() => ouvrirLeJournal(jour)} title="Ouvrir le cahier journal de ce jour"
                      style={{ fontSize: 12.5, fontWeight: cest ? 700 : 600, color: cest ? "var(--accent)" : "var(--text-2)",
                        background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 4, display: "block" }}>
                      {nomDuJour(jour)}{cest ? " · aujourd'hui" : ""}
                    </button>
                    {!duJourLa.length && <div className="meta" style={{ paddingLeft: 7 }}>Aucun créneau.</div>}
                    {duJourLa.map((c) => {
                      // Le créneau en cours se repère d'un coup d'œil : c'est celui
                      // sur lequel on écrit, souvent entre deux activités.
                      const enCours = cest && c.heureDebut <= maintenant && maintenant < c.heureFin;
                      const passe = jour < today || (cest && c.heureFin <= maintenant);
                      // Le détail du prévu n'encombre que le jour même : les autres
                      // jours se lisent d'un coup d'œil, horaires et intitulés.
                      const texte = cest ? apercu(c.prevu ?? "") : "";
                      return (
                        <div key={c.id} className="list-row" role="button" tabIndex={0}
                          onClick={() => ouvrirLeJournal(jour)}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirLeJournal(jour); } }}
                          title="Ouvrir le cahier journal de ce jour"
                          style={{
                            marginBottom: 6, cursor: "pointer", alignItems: "flex-start",
                            borderLeft: enCours ? "3px solid var(--accent)" : "3px solid transparent",
                            paddingLeft: 7, opacity: passe && !enCours ? 0.75 : 1,
                          }}>
                          <span className="badge">{c.heureDebut}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="title">{c.matiere || "Créneau"}</div>
                            {texte && <div className="meta" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{texte}</div>}
                          </div>
                          {passe && !(c.bilan ?? "").trim() && <span className="meta" title="Bilan à écrire">✍️</span>}
                          {(c.bilan ?? "").trim() && <span className="meta" title="Bilan écrit">✓</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {sansBilan.length > 0 && (
                <button className="btn sm" style={{ marginTop: 4 }}
                  onClick={() => ouvrirLeJournal((sansBilan[0].date ?? today).slice(0, 10))}>
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
