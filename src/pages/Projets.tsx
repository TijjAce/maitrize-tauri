import React from "react";
import { Page } from "../App";
import { api, anneeScolaireActuelle, texteErreur } from "../api";
import { Empty, Input, TextareaAuto, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { normaliser } from "../competencesTravaillees";
import {
  ETATS, MOIS, avancement, chercherIdees, depuisIdee, ecrireEtapes, etatDeduit,
  ideesDuMois, lireEtapes, moisCourant, nomDuMois, projetVierge, rangerParMois,
  type Etape, type IdeeProjet, type ProjetClasse,
} from "../projets";

// ── Les projets de classe ─────────────────────────────────────────────────
//
// Deux colonnes, et c'est tout : à gauche le mois, avec des idées toutes
// prêtes ; à droite les projets qu'on mène. Prendre une idée la fait passer
// à droite avec ses étapes, qu'on coche ensuite — et l'état du projet se
// déduit des cases, personne n'ayant jamais pensé à le changer à la main.

const COULEUR_ETAT: Record<string, string> = {
  idee: "var(--text-2)", encours: "var(--accent)", fait: "#16a34a",
};

export default function Projets() {
  const annee = anneeScolaireActuelle();
  const { data: projets, reload } = useAsync(() => api.projetsList(), []);
  const [mois, setMois] = React.useState(() => {
    const m = moisCourant();
    return MOIS.some((x) => x.num === m) ? m : "09";
  });
  const [recherche, setRecherche] = React.useState("");
  const [ouvert, setOuvert] = React.useState<string>("");

  const miens = (projets ?? []).filter((p) => !p.annee || p.annee === annee);
  const dejaPris = new Set(miens.map((p) => p.origine).filter(Boolean));

  const enregistrer = async (p: ProjetClasse) => {
    try { await api.projetSave(p); reload(); }
    catch (e) { toast("Projet non enregistré : " + texteErreur(e), { icone: "⚠️" }); }
  };

  const prendre = async (idee: IdeeProjet) => {
    const p = depuisIdee(idee, annee);
    await enregistrer(p);
    setOuvert(p.id);
    toast(`« ${idee.titre} » est dans vos projets.`, { icone: "🌱" });
  };

  const creer = async () => {
    const p = { ...projetVierge(mois, annee), titre: "Nouveau projet" };
    await enregistrer(p);
    setOuvert(p.id);
  };

  const supprimer = async (p: ProjetClasse) => {
    if (!await confirmer(`Supprimer « ${p.titre || "ce projet"} » ? Les séquences rattachées restent.`)) return;
    try { await api.projetDelete(p.id); reload(); }
    catch (e) { toast("Suppression impossible : " + texteErreur(e), { icone: "⚠️" }); }
  };

  const trouvees = recherche.trim() ? chercherIdees(recherche, normaliser) : [];
  const idees = (recherche.trim() ? trouvees : ideesDuMois(mois))
    .filter((i) => !dejaPris.has(i.id));

  return (
    <Page titre="Projets" sous="Ce qu'on mène en classe ce mois-ci, et les idées pour le mois prochain"
      actions={<button className="btn primary" onClick={() => { void creer(); }}>＋ Nouveau projet</button>}>

      <div className="row" style={{ alignItems: "flex-start", gap: 14 }}>
        {/* ── Les idées, par mois ── */}
        <div style={{ flex: "1 1 380px", minWidth: 0 }}>
          <div className="toolbar" style={{ marginBottom: 10 }}>
            <Input value={recherche} placeholder="Chercher une idée (monnaie, sortie, écrire…)"
              onChange={(e) => setRecherche(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
            {recherche && <button className="btn ghost sm" onClick={() => setRecherche("")}>✕</button>}
          </div>

          {!recherche && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {MOIS.map((m) => (
                <button key={m.num} type="button" className={`btn sm${mois === m.num ? " primary" : " ghost"}`}
                  onClick={() => setMois(m.num)}>{m.nom}</button>
              ))}
            </div>
          )}

          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>
            {recherche ? `${trouvees.length} idée${trouvees.length > 1 ? "s" : ""} trouvée${trouvees.length > 1 ? "s" : ""}`
              : `Idées pour ${nomDuMois(mois).toLowerCase()}`}
          </h3>

          {idees.length === 0 ? (
            <p className="meta" style={{ fontSize: 12.5 }}>
              {recherche ? "Rien de ce côté-là — essayez un autre mot."
                : "Toutes les idées du mois sont déjà dans vos projets."}
            </p>
          ) : idees.map((i) => (
            <div key={i.id} className="card" style={{ marginBottom: 10, padding: 12 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 14 }}>{i.titre}</b>
                {recherche && <span className="meta" style={{ fontSize: 11.5 }}>{nomDuMois(i.mois)}</span>}
                <div className="spacer" style={{ flex: 1 }} />
                <button className="btn sm" onClick={() => { void prendre(i); }}>＋ Le prendre</button>
              </div>
              <p style={{ margin: "6px 0 8px", fontSize: 13, lineHeight: 1.55, color: "var(--text-2)" }}>{i.pitch}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {i.domaines.map((d) => <span key={d} className="chip" style={{ fontSize: 11 }}>{d}</span>)}
              </div>
              <ol style={{ margin: 0, paddingLeft: 20, fontSize: 12.5, lineHeight: 1.6, color: "var(--text-2)" }}>
                {i.etapes.map((e) => <li key={e}>{e}</li>)}
              </ol>
            </div>
          ))}
        </div>

        {/* ── Les projets menés ── */}
        <div style={{ flex: "1 1 420px", minWidth: 0 }}>
          <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Mes projets {miens.length > 0 && `(${miens.length})`}</h3>
          {projets === null ? <p className="meta">Chargement…</p>
            : miens.length === 0 ? (
              <Empty icone="🌱" titre="Aucun projet pour l'instant"
                sous="Prenez une idée du mois à gauche, ou écrivez le vôtre. Un projet donne une raison d'être aux séances qu'on y rattache." />
            ) : rangerParMois(miens).filter((g) => g.projets.length > 0).map((groupe) => (
              <div key={groupe.mois || "sans"} style={{ marginBottom: 14 }}>
                <div className="meta" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
                  {nomDuMois(groupe.mois)}
                </div>
                {groupe.projets.map((p) => (
                  <CarteProjet key={p.id} projet={p} ouvert={ouvert === p.id}
                    onOuvrir={() => setOuvert(ouvert === p.id ? "" : p.id)}
                    onChange={(suite) => { void enregistrer(suite); }}
                    onSupprimer={() => { void supprimer(p); }} />
                ))}
              </div>
            ))}
        </div>
      </div>
    </Page>
  );
}

/** Un projet mené : replié, il ne dit que son avancement ; déplié, il s'édite. */
function CarteProjet({ projet, ouvert, onOuvrir, onChange, onSupprimer }: {
  projet: ProjetClasse; ouvert: boolean;
  onOuvrir: () => void; onChange: (p: ProjetClasse) => void; onSupprimer: () => void;
}) {
  const etapes = lireEtapes(projet.etapesJson);
  const { faites, total, part } = avancement(etapes);
  const etat = etatDeduit(projet.etat, etapes);

  const majEtapes = (suite: Etape[]) =>
    onChange({ ...projet, etapesJson: ecrireEtapes(suite), etat: etatDeduit(projet.etat, suite) });

  return (
    <div className="card" style={{ marginBottom: 8, padding: 12 }}
      onContextMenu={(e) => openCtx(e, [
        ...ETATS.map((x) => ({
          label: x.nom, icon: etat === x.id ? "●" : "○",
          onClick: () => onChange({ ...projet, etat: x.id }),
        })),
        { label: "Supprimer le projet", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
      ])}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={onOuvrir}>
        <span style={{ fontSize: 16 }}>{etat === "fait" ? "✅" : etat === "encours" ? "🌿" : "🌱"}</span>
        <b style={{ fontSize: 14, flex: 1, minWidth: 0 }}>{projet.titre || "Sans titre"}</b>
        {total > 0 && (
          <span className="meta" style={{ fontSize: 11.5, color: COULEUR_ETAT[etat] }}>
            {faites}/{total}
          </span>
        )}
        <span className="meta" style={{ fontSize: 12 }}>{ouvert ? "▾" : "▸"}</span>
      </div>

      {total > 0 && (
        <div style={{ height: 4, borderRadius: 4, background: "var(--panel-2)", marginTop: 8, overflow: "hidden" }}>
          <div style={{ width: `${Math.round(part * 100)}%`, height: "100%", background: COULEUR_ETAT[etat] }} />
        </div>
      )}

      {ouvert && (
        <div style={{ marginTop: 10 }}>
          <Input value={projet.titre} placeholder="Titre du projet"
            onChange={(e) => onChange({ ...projet, titre: e.target.value })} />
          <TextareaAuto value={projet.descriptif} minHauteur={60} placeholder="De quoi s'agit-il, en une phrase ?"
            style={{ marginTop: 6 }} onChange={(e) => onChange({ ...projet, descriptif: e.target.value })} />

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "10px 0" }}>
            {MOIS.map((m) => (
              <button key={m.num} type="button" className={`btn sm${projet.mois === m.num ? " primary" : " ghost"}`}
                onClick={() => onChange({ ...projet, mois: m.num })}>{m.abrege}</button>
            ))}
          </div>

          <div style={{ marginTop: 6 }}>
            {etapes.map((e, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <input type="checkbox" checked={e.faite} aria-label={e.texte}
                  onChange={() => majEtapes(etapes.map((x, j) => (j === i ? { ...x, faite: !x.faite } : x)))} />
                <Input value={e.texte} style={{ flex: 1, minWidth: 0, textDecoration: e.faite ? "line-through" : undefined }}
                  onChange={(ev) => majEtapes(etapes.map((x, j) => (j === i ? { ...x, texte: ev.target.value } : x)))} />
                <button className="btn ghost sm" aria-label="Retirer cette étape"
                  onClick={() => majEtapes(etapes.filter((_, j) => j !== i))}>✕</button>
              </div>
            ))}
            <button className="btn ghost sm" style={{ marginTop: 4 }}
              onClick={() => majEtapes([...etapes, { texte: "", faite: false }])}>＋ Étape</button>
          </div>

          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <div className="seg" role="group" aria-label="Où en est le projet">
              {ETATS.map((x) => (
                <button key={x.id} className={etat === x.id ? "active" : ""}
                  onClick={() => onChange({ ...projet, etat: x.id })}>{x.nom}</button>
              ))}
            </div>
            <div className="spacer" style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={onSupprimer}>🗑 Supprimer</button>
          </div>

          {projet.domaines && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
              {projet.domaines.split(",").map((d) => d.trim()).filter(Boolean)
                .map((d) => <span key={d} className="chip" style={{ fontSize: 11 }}>{d}</span>)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
