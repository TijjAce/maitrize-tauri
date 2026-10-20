import React from "react";
import { api, texteErreur, type Eleve, type ObservationEleve } from "../api";
import { Empty } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { printHTML, escapeHtml } from "../print";
import { COLONNES, observationVide, repartir, type Colonne } from "../observationEleve";
import { isoJour } from "../dates";

// ── La grille « Observer », dans le dossier de l'élève ────────────────────
//
// Une fiche par temps d'observation, dans l'ordre des dates : ce qu'on a vu
// (réussites, difficultés), ce qu'on en déduit (hypothèses sur le besoin), ce
// qu'on met en place (aménagements), et ce que ça a donné (réajustement).
//
// L'écran suit le document de l'académie de Versailles, mais en fiches plutôt
// qu'en tableau : cinq colonnes de saisie ne tiennent pas sur un portable, et
// l'on écrit mal dans une case de deux centimètres. À l'impression, en
// revanche, c'est bien le tableau qui sort — c'est lui qu'on pose sur la table
// d'une ESS.

const fmt = (iso: string) => { const [a, m, j] = (iso || "").split("-"); return a && m && j ? `${j}/${m}/${a}` : iso; };

export function GrilleObservation({ eleve }: { eleve: Eleve | null }) {
  const [fiches, setFiches] = React.useState<ObservationEleve[] | null>(null);
  const [occupe, setOccupe] = React.useState("");
  const minuteurs = React.useRef<Record<string, number>>({});
  // Les fiches écrites mais pas encore enregistrées, dans leur dernier état.
  const enAttente = React.useRef<Record<string, ObservationEleve>>({});

  /** Enregistre tout de suite ce qu'une fiche attendait encore. */
  const enregistrer = (id: string) => {
    window.clearTimeout(minuteurs.current[id]);
    const o = enAttente.current[id];
    if (!o) return;
    delete enAttente.current[id];
    api.observationSave(o).catch((e) => toast("Non enregistré : " + texteErreur(e), { icone: "⚠️" }));
  };
  const viderLesAttentes = () => { for (const id of Object.keys(enAttente.current)) enregistrer(id); };

  // Les fiches de l'élève, relues quand l'élève change — pas quand sa fiche
  // est relue à l'identique (une synchronisation relisait les fiches par-dessus
  // ce qu'on était en train d'écrire). Changer d'élève ou quitter l'écran
  // enregistre d'abord ce qui attendait : la dernière frappe partait avec le
  // minuteur, sans être écrite.
  const eleveId = eleve?.id ?? "";
  React.useEffect(() => {
    if (!eleveId) { setFiches([]); return; }
    setFiches(null);
    let actif = true;
    api.observationsList(eleveId).then((l) => { if (actif) setFiches(l); }).catch((e) => {
      if (!actif) return;
      toast("Observations illisibles : " + texteErreur(e), { icone: "⚠️" });
      setFiches([]);
    });
    return () => { actif = false; viderLesAttentes(); };
  }, [eleveId]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Une case modifiée s'enregistre seule, peu après la frappe. */
  const modifier = (o: ObservationEleve, champ: Colonne, valeur: string) => {
    setFiches((l) => (l ?? []).map((x) => {
      if (x.id !== o.id) return x;
      const suite = { ...x, [champ]: valeur, dateMaj: new Date().toISOString() };
      enAttente.current[o.id] = suite;
      return suite;
    }));
    window.clearTimeout(minuteurs.current[o.id]);
    minuteurs.current[o.id] = window.setTimeout(() => enregistrer(o.id), 700);
  };

  const fichesRef = React.useRef(fiches);
  fichesRef.current = fiches;

  const ranger = async (o: ObservationEleve) => {
    setOccupe(o.id);
    try {
      const propose = await repartir(o, eleve?.nom ?? "");
      // La fiche telle qu'elle est maintenant, et non telle qu'elle était au
      // clic : on a pu y écrire, ou changer d'élève, pendant que l'IA rangeait.
      const actuelle = enAttente.current[o.id] ?? fichesRef.current?.find((x) => x.id === o.id)
        ?? (await api.observationsList(o.eleveId)).find((x) => x.id === o.id) ?? o;
      // Ce qui est déjà écrit à la main n'est pas écrasé : l'IA complète.
      const suite = { ...actuelle, dateMaj: new Date().toISOString() };
      let posees = 0;
      for (const [cle, valeur] of Object.entries(propose) as [Colonne, string][]) {
        if ((suite[cle] ?? "").trim() || !valeur.trim()) continue;
        suite[cle] = valeur.trim();
        posees++;
      }
      if (!posees) { toast("Rien à ajouter : les colonnes sont déjà écrites.", { icone: "ℹ️" }); return; }
      // La fiche rangée comprend ce qui attendait : un seul enregistrement.
      window.clearTimeout(minuteurs.current[o.id]);
      delete enAttente.current[o.id];
      await api.observationSave(suite);
      setFiches((l) => (l ?? []).map((x) => (x.id === o.id ? suite : x)));
      toast(`${posees} colonne(s) proposée(s) — à relire.`, { icone: "✨", duree: 6000 });
    } catch (e) {
      toast("Rangement impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally { setOccupe(""); }
  };

  const supprimer = async (o: ObservationEleve) => {
    if (!await confirmer("Supprimer ce temps d'observation ?")) return;
    await api.observationDelete(o.id);
    setFiches((l) => (l ?? []).filter((x) => x.id !== o.id));
  };

  const imprimer = () => {
    if (!eleve || !fiches?.length) return;
    const cellule = (t: string) => `<td>${escapeHtml(t || "").replace(/\n/g, "<br>")}</td>`;
    const lignes = fiches.map((o) => `<tr>
      <td><b>${escapeHtml(fmt(o.date))}</b>${o.contexte ? `<div class="meta">${escapeHtml(o.contexte)}</div>` : ""}
        ${o.axe ? `<div class="meta"><i>${escapeHtml(o.axe)}</i></div>` : ""}</td>
      ${COLONNES.map((c) => cellule(o[c.id])).join("")}
    </tr>`).join("");
    printHTML(`Observer — ${eleve.nom}`,
      `<h1>Observer — ${escapeHtml(eleve.nom)}</h1>
       <div class="meta">${fiches.length} temps d'observation · édité le ${fmt(isoJour(new Date()))}</div>
       <table><tr><th>Date, contexte, axe</th>${COLONNES.map((c) => `<th>${escapeHtml(c.titre)}</th>`).join("")}</tr>${lignes}</table>
       <div class="meta" style="margin-top:14px;font-style:italic">
         Grille « Observer » (académie de Versailles, DSDEN 92). Axes d'observation :
         grille Cap école inclusive, Réseau Canopé.</div>`,
      "table { font-size: 10.5px } td, th { vertical-align: top }");
  };

  if (!eleve) return <Empty icone="👁" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;
  if (fiches === null) return <p className="meta">Lecture des observations…</p>;
  if (!fiches.length) {
    return (
      <Empty icone="👁" titre="Aucun temps d'observation"
        sous="Dans le cahier journal, bouton « 👁 Observer » sur un créneau : choisissez un axe de la grille Cap école inclusive, et ce que vous écrirez dans le bilan viendra nourrir la fiche." />
    );
  }

  return (
    <>
      <div className="toolbar" style={{ marginBottom: 12 }}>
        <span className="meta" style={{ fontSize: 12.5 }}>
          {fiches.length} temps d'observation · grille « Observer »
        </span>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn sm" onClick={imprimer}>🖨 Imprimer la grille</button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {fiches.map((o) => (
          <div key={o.id} className="card">
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <b style={{ fontSize: 14 }}>{fmt(o.date)}</b>
              {o.contexte && <span className="meta" style={{ fontSize: 12.5 }}>{o.contexte}</span>}
              {o.competence && <span className="chip" style={{ fontSize: 11.5 }}>🎯 {o.competence.slice(0, 80)}</span>}
              <div className="spacer" style={{ flex: 1 }} />
              {o.note.trim() && (
                <button className="btn sm" disabled={!!occupe} onClick={() => { void ranger(o); }}
                  title="Ranger le bilan du jour dans les colonnes — vos textes ne sont pas écrasés">
                  {occupe === o.id ? "Rangement…" : "✨ Ranger le bilan"}
                </button>
              )}
              <button className="btn ghost sm" onClick={() => { void supprimer(o); }} aria-label="Supprimer">🗑</button>
            </div>

            {o.axe && (
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>👁 {o.axe}</span>
                {o.domaine && <div className="meta" style={{ fontSize: 11.5 }}>{o.domaine}</div>}
              </div>
            )}

            {o.note.trim() && observationVide(o) && (
              <p style={{ fontSize: 12.5, color: "var(--text-2)", background: "var(--panel-2)",
                padding: "8px 10px", borderRadius: 8, margin: "0 0 8px", whiteSpace: "pre-wrap" }}>
                <b>Repris du cahier journal :</b> {o.note}
              </p>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {COLONNES.map((c) => (
                <label key={c.id} style={{ display: "block" }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{c.titre}</span>
                  <textarea className="textarea" value={o[c.id]} placeholder={c.aide}
                    onChange={(e) => modifier(o, c.id, e.target.value)}
                    rows={Math.min(8, Math.max(2, (o[c.id] || "").split("\n").length + 1))}
                    style={{ width: "100%", resize: "vertical", fontSize: 13, lineHeight: 1.45, marginTop: 3 }} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
