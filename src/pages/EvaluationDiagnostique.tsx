import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";
import { GRILLES, Grille, Bloc, compterRenseignes, compterTotal } from "../data/evaluationsDiagnostiques";

// ── Évaluation diagnostique ───────────────────────────────────────────────
// Un écran générique pour les deux grilles décrites dans
// data/evaluationsDiagnostiques.ts : même saisie, même enregistrement, même
// impression. Une grille par élève et par type, rangée dans son dossier.

type Valeurs = Record<string, any>;

const cleDoc = (grille: Grille) => `evaldiag:${grille.id}`;

export function EvaluationDiagnostiqueTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [grilleId, setGrilleId] = React.useState(GRILLES[0].id);
  const [v, setV] = React.useState<Valeurs>({});
  const [charge, setCharge] = React.useState(false);

  const grille = GRILLES.find((g) => g.id === grilleId) ?? GRILLES[0];
  const eleve = eleves?.find((e) => e.id === eleveId);

  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  React.useEffect(() => {
    if (!eleveId) return;
    setCharge(false);
    api.documentEleveGet(eleveId, cleDoc(grille)).then((s) => {
      let lu: Valeurs = {};
      try { lu = s ? JSON.parse(s) : {}; } catch { lu = {}; }
      vRef.current = lu; setV(lu); setCharge(true);
    });
  }, [eleveId, grilleId]);

  // Référence à jour : deux clics rapprochés doivent se composer, pas
  // s'écraser — le même piège que sur les autres écrans de saisie.
  const vRef = React.useRef<Valeurs>({});
  vRef.current = v;
  const persister = (next: Valeurs) => {
    vRef.current = next; setV(next);
    if (eleveId) api.documentEleveSet(eleveId, cleDoc(grille), JSON.stringify(next));
  };
  const majBloc = (blocId: string, valeur: any) => persister({ ...vRef.current, [blocId]: valeur });

  const basculerCase = (blocId: string, item: string) => {
    const bloc = { ...(vRef.current[blocId] ?? {}) };
    if (bloc[item]) delete bloc[item]; else bloc[item] = true;
    majBloc(blocId, bloc);
  };
  const noter = (blocId: string, item: string, niveau: string) => {
    const bloc = { ...(vRef.current[blocId] ?? {}) };
    if (niveau) bloc[item] = niveau; else delete bloc[item];
    majBloc(blocId, bloc);
  };
  const saisir = (blocId: string, champId: string, texte: string) => {
    majBloc(blocId, { ...(vRef.current[blocId] ?? {}), [champId]: texte });
  };

  const vider = () => {
    if (!confirm(`Effacer la grille « ${grille.nom} » de ${eleve?.nom ?? "cet élève"} ?`)) return;
    persister({});
    toast("Grille vidée.", { icone: "🗑" });
  };

  const imprimer = () => {
    const blocHtml = (b: Bloc): string => {
      const val = v[b.id] ?? {};
      if (b.t === "champs") {
        const lignes = b.champs.map((c) =>
          `<div style="margin:4px 0"><b>${escapeHtml(c.label)} :</b> ${escapeHtml(String(val[c.id] ?? "")) || "…"}</div>`).join("");
        return `<h3>${escapeHtml(b.titre)}</h3>${lignes}`;
      }
      if (b.t === "choix") {
        const cases = b.options.map((o) =>
          `<span style="margin-right:14px">${val === o ? "☒" : "☐"} ${escapeHtml(o)}</span>`).join("");
        return `<div style="margin:6px 0"><b>${escapeHtml(b.titre)} :</b> ${cases}</div>`;
      }
      if (b.t === "cases") {
        const items = b.items.map((i) =>
          `<li style="list-style:none">${val[i] ? "☒" : "☐"} ${escapeHtml(i)}</li>`).join("");
        return `<h3>${escapeHtml(b.titre)}</h3><ul style="margin:4px 0;padding-left:6px;columns:2">${items}</ul>`;
      }
      const lignes = b.items.map((i) =>
        `<tr><td>${escapeHtml(i)}</td><td style="text-align:center"><b>${escapeHtml(String(val[i] ?? "—"))}</b></td></tr>`).join("");
      return `<h3>${escapeHtml(b.titre)}</h3><table style="width:100%"><tr><th style="text-align:left">Domaine</th><th>Niveau</th></tr>${lignes}</table>`;
    };
    printHTML(`${grille.nom} — ${eleve?.nom ?? ""}`,
      `<h1>${escapeHtml(grille.nom)}</h1>
       <div class="meta">${escapeHtml(eleve?.nom ?? "")}${eleve?.niveau ? " · " + escapeHtml(eleve.niveau) : ""}
         · ${new Date().toLocaleDateString("fr-FR")}</div>
       ${grille.blocs.map(blocHtml).join("")}
       <div class="meta" style="margin-top:18px;font-style:italic">${escapeHtml(grille.source)}</div>`);
  };

  const renseignes = compterRenseignes(grille, v);
  const total = compterTotal(grille);

  if (!eleves?.length) {
    return <div className="card"><div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>
      Ajoutez d'abord vos élèves dans l'onglet Classe.
    </div></div>;
  }

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 200 }}>
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="seg">
          {GRILLES.map((g) => (
            <button key={g.id} className={grilleId === g.id ? "active" : ""} title={g.sousTitre}
              onClick={() => setGrilleId(g.id)}>{g.nom}</button>
          ))}
        </div>
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{renseignes}/{total} renseigné(s)</span>
        {renseignes > 0 && <button className="btn ghost sm" onClick={vider}>Vider</button>}
        <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
      </div>

      <div className="card" style={{ marginBottom: 12, padding: "8px 12px" }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{grille.sousTitre}</div>
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
          {grille.source}
          {grille.lien && <>
            {" · "}
            <a href={grille.lien} style={{ color: "var(--accent)", cursor: "pointer" }}
              onClick={(e) => { e.preventDefault(); openUrl(grille.lien!).catch(() => {}); }}>
              ouvrir l'outil en ligne ↗
            </a>
          </>}
        </div>
      </div>

      {!charge ? <div /> : grille.blocs.map((b) => (
        <BlocGrille key={b.id} bloc={b} valeur={v[b.id]} niveaux={grille.niveaux ?? []}
          onCase={(item) => basculerCase(b.id, item)}
          onChoix={(o) => majBloc(b.id, v[b.id] === o ? "" : o)}
          onNiveau={(item, n) => noter(b.id, item, n)}
          onTexte={(champ, texte) => saisir(b.id, champ, texte)} />
      ))}
    </>
  );
}

function BlocGrille({ bloc, valeur, niveaux, onCase, onChoix, onNiveau, onTexte }: {
  bloc: Bloc; valeur: any; niveaux: string[];
  onCase: (item: string) => void;
  onChoix: (option: string) => void;
  onNiveau: (item: string, niveau: string) => void;
  onTexte: (champ: string, texte: string) => void;
}) {
  const val = valeur ?? {};
  return (
    <div className="card" style={{ marginBottom: 10 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{bloc.titre}</h3>

      {bloc.t === "cases" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 4 }}>
          {bloc.items.map((i) => (
            <label key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer", padding: "2px 0" }}>
              <input type="checkbox" checked={!!val[i]} onChange={() => onCase(i)} />
              {i}
            </label>
          ))}
        </div>
      )}

      {bloc.t === "choix" && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {bloc.options.map((o) => (
            <button key={o} className={"btn sm" + (valeur === o ? " primary" : "")} onClick={() => onChoix(o)}>{o}</button>
          ))}
        </div>
      )}

      {bloc.t === "echelle" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {bloc.items.map((i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{i}</span>
              <div className="seg">
                {niveaux.map((n) => (
                  <button key={n} className={val[i] === n ? "active" : ""} style={{ fontSize: 12 }}
                    onClick={() => onNiveau(i, val[i] === n ? "" : n)}>{n}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {bloc.t === "champs" && (
        <div className="row">
          {bloc.champs.map((c) => (
            <Field key={c.id} label={c.label}>
              {c.label.length > 28
                ? <Textarea rows={3} value={val[c.id] ?? ""} onChange={(e) => onTexte(c.id, e.target.value)} />
                : <Input value={val[c.id] ?? ""} onChange={(e) => onTexte(c.id, e.target.value)} />}
            </Field>
          ))}
        </div>
      )}
    </div>
  );
}
