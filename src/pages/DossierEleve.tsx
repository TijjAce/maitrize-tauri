import React from "react";
import { ChipObservation } from "../components/TypeObservation";
import { api, Eleve, TYPE_AXE } from "../api";
import { Select, Empty, useAsync, ouvrirOnglet } from "../components/ui";
import { printHTML, escapeHtml } from "../print";
import { construire, Dossier, Piece } from "../dossier";

// ── Dossier de l'élève ─────────────────────────────────────────────────────
//
// Tout ce que l'application sait d'un élève, sur un écran. Les informations
// se saisissent là où elles ont du sens — observations, notes, GEVA-Sco, PPI
// — mais aucun de ces écrans ne répond à « où en est-il ? ».
//
// Ce qui manque y est aussi visible que ce qui est là : un dossier sans axe
// de travail, ou dont une pièce n'a jamais été ouverte, se voit au premier
// coup d'œil plutôt qu'au moment de l'équipe de suivi.

export function DossierTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: typeStructure } = useAsync(() => api.settingGet("typeStructure"), []);
  const ime = typeStructure === "ime";
  const [eleveId, setEleveId] = React.useState("");

  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  const { data } = useAsync(async () => {
    if (!eleveId) return null;
    const eleve = (eleves ?? []).find((e) => e.id === eleveId);
    if (!eleve) return null;
    // Une seule passe : les sept sources sont lues de front plutôt qu'en
    // cascade, sinon l'écran s'affiche par morceaux.
    const [commentaires, notes, evaluations, docs, papiers, progressions] = await Promise.all([
      api.commentairesList(eleveId),
      api.notesEleveList(),
      api.evaluationsList(),
      api.documentsEleveList(eleveId),
      api.papiersList(),
      api.progressionsEleveList(),
    ]);
    return construire(eleve, commentaires, notes, evaluations, docs, papiers, progressions, ime);
  }, [eleveId, eleves, ime]);

  if (!eleves?.length) {
    return <Empty icone="🎓" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;
  }

  return (
    <>
      <div className="toolbar">
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 240 }}>
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="spacer" />
        {data && <button className="btn" onClick={() => imprimer(data)}>🖨 Imprimer le dossier</button>}
      </div>
      {data && <Contenu dossier={data} />}
    </>
  );
}

function Contenu({ dossier: d }: { dossier: Dossier }) {
  return (
    <>
      <Identite eleve={d.eleve} age={d.age} />

      {d.manques.length > 0 && (
        <div className="card" style={{ marginBottom: 14, borderLeft: "3px solid #c2591f" }}>
          <b style={{ fontSize: 13 }}>À compléter</b>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--text-2)" }}>
            {d.manques.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14, alignItems: "start" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>🎯 Axes de travail</h3>
          {!d.observations.axes.length ? (
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
              Aucun axe posé. Ajoutez une observation de type « {TYPE_AXE} » dans
              l'onglet Observations.
            </p>
          ) : d.observations.axes.map((a) => (
            <div key={a.id} style={{ padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: 13 }}>
              {a.texte}
              <div className="meta">{new Date(a.date).toLocaleDateString("fr-FR")}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>📁 Pièces du dossier</h3>
          {d.pieces.map((p) => <LignePiece key={p.typeDoc} piece={p} />)}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>📝 Observations <span style={{ fontWeight: 400, color: "var(--text-2)", fontSize: 13 }}>({d.observations.total})</span></h3>
          {!d.observations.parType.length ? (
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>Aucune observation.</p>
          ) : d.observations.parType.map((g) => (
            <div key={g.type} style={{ borderTop: "1px solid var(--border)", padding: "7px 0" }}>
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <ChipObservation type={g.type} compte={g.items.length} />
              </div>
              {g.items.slice(0, 3).map((c) => (
                <div key={c.id} style={{ fontSize: 13, marginTop: 3 }}>
                  {c.texte}
                  <span className="meta"> · {new Date(c.date).toLocaleDateString("fr-FR")}</span>
                </div>
              ))}
              {g.items.length > 3 && (
                <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 3 }}>
                  et {g.items.length - 3} autre{g.items.length - 3 > 1 ? "s" : ""}…
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>📊 Évaluations</h3>
          {!d.notes.length ? (
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>Aucune note enregistrée.</p>
          ) : d.notes.slice(0, 8).map((l) => (
            <div key={l.note.id} style={{ display: "flex", gap: 8, alignItems: "baseline",
              borderTop: "1px solid var(--border)", padding: "5px 0", fontSize: 13 }}>
              <span style={{ flex: 1 }}>
                {l.evaluation.titre}
                <div className="meta">{l.evaluation.matiere} · {new Date(l.evaluation.date).toLocaleDateString("fr-FR")}</div>
              </span>
              <b>{l.note.note} / {l.evaluation.bareme}</b>
              {l.sur20 !== undefined && <span style={{ fontSize: 12, color: "var(--text-2)" }}>({l.sur20}/20)</span>}
            </div>
          ))}
          {d.progressions.total > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 7, marginTop: 7, fontSize: 13 }}>
              Progressions : <b>{d.progressions.faites}</b> / {d.progressions.total}
            </div>
          )}
        </div>

        {d.papiers.length > 0 && (
          <div className="card">
            <h3 style={{ marginTop: 0 }}>📎 Papiers <span style={{ fontWeight: 400, color: "var(--text-2)", fontSize: 13 }}>({d.papiers.length})</span></h3>
            {d.papiers.map((p) => (
              <div key={p.id} style={{ borderTop: "1px solid var(--border)", padding: "5px 0", fontSize: 13 }}>
                <span className="chip">{p.type}</span> {p.intitule}
                <div className="meta">{new Date(p.dateAjout).toLocaleDateString("fr-FR")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Identite({ eleve, age }: { eleve: Eleve; age?: number }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    if (!eleve.photoFichier) { setSrc(""); return; }
    let vivant = true;
    api.fichierRead(eleve.photoFichier)
      .then((b) => { if (vivant) setSrc(`data:image;base64,${b}`); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [eleve.photoFichier]);
  return (
    <div className="card" style={{ marginBottom: 14, display: "flex", gap: 14, alignItems: "center" }}>
      {src
        ? <img src={src} alt="" style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
        : <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--panel-2)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
            {eleve.nom.trim().charAt(0).toUpperCase() || "?"}
          </div>}
      <div>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{eleve.nom}</div>
        <div style={{ fontSize: 13, color: "var(--text-2)" }}>
          {[eleve.niveau, age !== undefined && `${age} ans`,
            eleve.dateNaissance && `né(e) le ${new Date(eleve.dateNaissance).toLocaleDateString("fr-FR")}`,
            eleve.ine && `INE ${eleve.ine}`].filter(Boolean).join(" · ")}
        </div>
      </div>
    </div>
  );
}

function LignePiece({ piece }: { piece: Piece }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", borderTop: "1px solid var(--border)", padding: "6px 0", fontSize: 13 }}>
      <span>{piece.rempli ? "✅" : "⬜"}</span>
      <span style={{ flex: 1 }}>
        {piece.label}
        {piece.rempli && piece.dateMaj && (
          <div className="meta">mis à jour le {new Date(piece.dateMaj).toLocaleDateString("fr-FR")}</div>
        )}
      </span>
      <button className="btn ghost sm" onClick={() => ouvrirOnglet("eleves", piece.onglet)}>
        {piece.rempli ? "Voir" : "Remplir"}
      </button>
    </div>
  );
}

function imprimer(d: Dossier) {
  const section = (titre: string, corps: string) =>
    corps ? `<h2>${escapeHtml(titre)}</h2>${corps}` : "";
  const liste = (items: string[]) =>
    items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>` : "";

  printHTML(`Dossier — ${d.eleve.nom}`,
    `<h1>${escapeHtml(d.eleve.nom)}</h1>
     <div class="meta">${[d.eleve.niveau, d.age !== undefined && `${d.age} ans`,
        d.eleve.ine && `INE ${d.eleve.ine}`].filter(Boolean).map((x) => escapeHtml(String(x))).join(" · ")}
        · édité le ${new Date().toLocaleDateString("fr-FR")}</div>

     ${section("Axes de travail", liste(d.observations.axes.map((a) =>
        `${escapeHtml(a.texte)} <span class="meta">(${new Date(a.date).toLocaleDateString("fr-FR")})</span>`)))}

     ${section("Pièces du dossier",
        `<table><tr><th>Pièce</th><th>État</th></tr>${d.pieces.map((p) =>
          `<tr><td>${escapeHtml(p.label)}</td><td>${p.rempli
            ? "renseignée" + (p.dateMaj ? ` le ${new Date(p.dateMaj).toLocaleDateString("fr-FR")}` : "")
            : "à remplir"}</td></tr>`).join("")}</table>`)}

     ${d.observations.parType.map((g) =>
        section(`Observations — ${g.type}`, liste(g.items.map((c) =>
          `${escapeHtml(c.texte)} <span class="meta">(${new Date(c.date).toLocaleDateString("fr-FR")})</span>`)))).join("")}

     ${section("Évaluations", d.notes.length
        ? `<table><tr><th>Évaluation</th><th>Date</th><th>Note</th></tr>${d.notes.map((l) =>
            `<tr><td>${escapeHtml(l.evaluation.titre)}<div class="meta">${escapeHtml(l.evaluation.matiere)}</div></td>
              <td>${new Date(l.evaluation.date).toLocaleDateString("fr-FR")}</td>
              <td>${l.note.note} / ${l.evaluation.bareme}</td></tr>`).join("")}</table>`
        : "")}

     ${section("Papiers", liste(d.papiers.map((p) =>
        `${escapeHtml(p.type)} — ${escapeHtml(p.intitule)}`)))}

     <div class="meta" style="margin-top:16px;font-style:italic">
       Document interne. Il contient des données personnelles d'élève : à ne pas
       diffuser hors de l'équipe.</div>`);
}
