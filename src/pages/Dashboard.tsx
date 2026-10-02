import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, raccourci } from "../api";
import { useAsync } from "../components/ui";
import { BandeauSync } from "../components/BandeauSync";
import { EVT_JOUR } from "../components/CommandPalette";
import { isoJour, lundiDe, plusJours } from "../dates";
import { demanderEtatDuPlan, useSuiviSequences } from "../components/useSuiviSequences";
import { LigneSuivi } from "../components/SuiviSequence";
import { rangerParActivite } from "../suiviSequences";

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

      <SuiviDuTableauDeBord ouvrirLeJournal={ouvrirLeJournal} />
    </Page>
  );
}

/**
 * Les séquences telles que le cahier journal les voit : celles qui sont en
 * classe en ce moment, avec leur avancement et la prochaine séance, ou
 * l'alerte quand rien n'est posé. Celles qu'on prépare ne s'étalent pas
 * ici — elles chargeaient l'accueil — : un compte, qui mène au plan de
 * travail où elles se filtrent.
 */
function SuiviDuTableauDeBord({ ouvrirLeJournal }: { ouvrirLeJournal: (iso: string) => void }) {
  const nav = useNavigate();
  const { suivis, aujourdHui, chargement } = useSuiviSequences();
  const tous = [...suivis.values()];
  const enClasse = rangerParActivite(tous.filter((s) => s.etat === "classe" || s.etat === "pause"));
  const enPreparation = tous.filter((s) => s.etat === "preparation").length;
  const terminees = tous.filter((s) => s.etat === "terminee").length;
  // Le plan de travail, filtré sur les séquences en préparation.
  const voirLaPreparation = () => {
    demanderEtatDuPlan("preparation");
    nav("/plan");
  };
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ marginTop: 0 }}>📚 En classe en ce moment</h3>
        {(enPreparation > 0 || terminees > 0) && (
          <span className="meta">
            {enPreparation > 0 && (
              <button type="button" className="lien" onClick={voirLaPreparation} title="Les voir dans le plan de travail">
                {enPreparation} en préparation
              </button>
            )}
            {enPreparation > 0 && terminees > 0 && " · "}
            {terminees > 0 && `${terminees} terminée${terminees > 1 ? "s" : ""} cette année`}
          </span>
        )}
      </div>
      {chargement ? null : enClasse.length === 0 ? (
        <p style={{ color: "var(--text-2)", margin: 0 }}>
          Aucune séquence démarrée : une séquence entre ici dès qu'une de ses séances est posée dans le cahier journal.
        </p>
      ) : enClasse.map((s) => (
        <LigneSuivi key={s.sequence.id} suivi={s} aujourdHui={aujourdHui} onOuvrir={() => nav(`/sequences/${s.sequence.id}`)} onJournal={ouvrirLeJournal} />
      ))}
    </div>
  );
}
