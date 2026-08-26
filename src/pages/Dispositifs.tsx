import React from "react";
import { api, anneeScolaireActuelle } from "../api";
import { Field, Input, Select, Empty, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";
import { DISPOSITIFS, Champ } from "../data/dispositifs";
import { PpiTab } from "./Ppi";

// ── Dispositifs d'accompagnement ──────────────────────────────────────────
// Un seul écran pilote tous les plans (PPS, PAP, PAI, PPRE) à partir des
// schémas décrits dans data/dispositifs.ts : même saisie, même enregistrement,
// même impression. Le PPI, plus riche (objectifs suivis, bilans, IA), garde
// son écran dédié et s'ouvre depuis le même sélecteur.
// Stockage par élève et par dispositif : clé `dispositif:{id}:{eleveId}`.

type Valeurs = Record<string, any>;

const todayFr = () => new Date().toLocaleDateString("fr-FR");

export function DispositifsTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [dispoId, setDispoId] = React.useState("pps");
  const [v, setV] = React.useState<Valeurs>({});
  const [ecole, setEcole] = React.useState("");
  // Impression : formulaire complet (à remplir à la main) ou résumé
  // ne reprenant que ce qui a été saisi.
  const [resume, setResume] = React.useState(false);

  React.useEffect(() => { api.settingGet("ecole").then((x) => setEcole(x ?? "")); }, []);
  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  const dispo = DISPOSITIFS.find((d) => d.id === dispoId);
  const cle = `dispositif:${dispoId}:${eleveId}`;

  React.useEffect(() => {
    if (!eleveId || !dispo) return;
    api.settingGet(cle).then((s) => {
      let charge: Valeurs = {};
      try { charge = s ? JSON.parse(s) : {}; } catch { charge = {}; }
      vRef.current = charge; setV(charge);
    });
  }, [cle, eleveId, dispo]);

  // Référence à jour : deux saisies rapprochées doivent se composer.
  const vRef = React.useRef<Valeurs>({});
  vRef.current = v;
  const set = (id: string, valeur: any) => {
    const next = { ...vRef.current, [id]: valeur };
    vRef.current = next; setV(next);
    if (eleveId) api.settingSet(cle, JSON.stringify(next));
  };
  const coche = (champId: string, item: number, col: number) => {
    const grille: Record<string, boolean> = { ...(vRef.current[champId] ?? {}) };
    const k = `${item}:${col}`;
    if (grille[k]) delete grille[k]; else grille[k] = true;
    set(champId, grille);
  };
  const setCellule = (champId: string, ligne: number, col: number, texte: string) => {
    const tableau: string[][] = (vRef.current[champId] ?? []).map((r: string[]) => [...r]);
    while (tableau.length <= ligne) tableau.push([]);
    tableau[ligne][col] = texte;
    set(champId, tableau);
  };

  const eleve = eleves?.find((e) => e.id === eleveId);

  const preRemplir = () => {
    if (!dispo) return;
    const auto: Valeurs = { ...vRef.current };
    for (const s of dispo.sections) for (const c of s.champs) {
      if (auto[c.id]) continue;
      if (c.id === "etablissement") auto[c.id] = ecole;
      if (c.id === "anneeScolaire") auto[c.id] = anneeScolaireActuelle();
      if (c.id === "classe" && eleve?.niveau) auto[c.id] = eleve.niveau;
    }
    vRef.current = auto; setV(auto);
    if (eleveId) api.settingSet(cle, JSON.stringify(auto));
    toast("Champs connus pré-remplis.", { icone: "✨" });
  };

  const imprimer = () => {
    if (!dispo || !eleve) return;
    // Deux usages : le formulaire complet s'imprime pour être renseigné à la
    // main (en réunion, à faire signer) ; le résumé ne reprend que la saisie,
    // pour transmettre ou archiver sans cases vides.
    const bloc = (c: Champ): string => {
      const val = v[c.id];
      if (c.t === "ligne") {
        const rempli = (val ?? "").trim();
        if (!rempli && resume) return "";
        return `<div class="f"><span class="fl">${escapeHtml(c.label)} :</span> ${rempli ? escapeHtml(val) : '<span class="vide"></span>'}</div>`;
      }
      if (c.t === "zone") {
        const rempli = (val ?? "").trim();
        if (!rempli && resume) return "";
        return `<div class="fl">${escapeHtml(c.label)}</div><div class="zone">${rempli ? escapeHtml(val) : "&nbsp;"}</div>`;
      }
      if (c.t === "grille") {
        const g: Record<string, boolean> = val ?? {};
        const lignes = c.items.map((it, i) => {
          const cols = c.colonnes.map((_, j) => g[`${i}:${j}`] ? "✗" : "");
          if (resume && !cols.some(Boolean)) return "";
          return `<tr><td>${escapeHtml(it)}</td>${cols.map((x) => `<td class="c">${x}</td>`).join("")}</tr>`;
        }).filter(Boolean).join("");
        if (!lignes) return "";
        const entete = resume ? "Adaptation retenue" : "Adaptation";
        return `<div class="fl">${escapeHtml(c.label)}</div><table><tr><th>${entete}</th>${c.colonnes.map((n) => `<th class="c">${escapeHtml(n)}</th>`).join("")}</tr>${lignes}</table>`;
      }
      const t: string[][] = val ?? [];
      const lignes = Array.from({ length: c.lignes }, (_, l) => {
        const r = t[l] ?? [];
        if (resume && !r.some((x) => (x ?? "").trim())) return "";
        return `<tr>${c.colonnes.map((_, j) => `<td>${escapeHtml(r[j] ?? "") || "&nbsp;"}</td>`).join("")}</tr>`;
      }).filter(Boolean).join("");
      if (!lignes) return "";
      return `<div class="fl">${escapeHtml(c.label)}</div><table><tr>${c.colonnes.map((n) => `<th>${escapeHtml(n)}</th>`).join("")}</tr>${lignes}</table>`;
    };
    const corps = dispo.sections.map((s) => {
      const inner = s.champs.map(bloc).filter(Boolean).join("");
      if (!inner) return "";
      return `<h2>${escapeHtml(s.titre)}</h2>${s.note ? `<div class="note">${escapeHtml(s.note)}</div>` : ""}${inner}`;
    }).filter(Boolean).join("");
    printHTML(`${dispo.nom} — ${eleve.nom}`,
      `<h1>${escapeHtml(dispo.nomLong)}</h1>
       <div class="meta">${escapeHtml(eleve.nom)}${ecole ? " — " + escapeHtml(ecole) : ""} · édité le ${todayFr()}
       ${dispo.reference ? `<br>${escapeHtml(dispo.reference)}` : ""}</div>
       <style>
         .fl{font-weight:700;color:#23527c;margin-top:9px}
         .f{margin:3px 0}
         .zone{white-space:pre-wrap;border:1px solid #cfd4e2;border-radius:6px;padding:6px 8px;margin-top:2px;min-height:24px}
         .note{color:#687087;font-size:11px;margin-bottom:4px}
         td.c,th.c{text-align:center;width:46px}
         .vide{display:inline-block;min-width:220px;border-bottom:1px dotted #8a8a8a}
       </style>${corps || "<p>Ce dispositif ne comporte aucune rubrique.</p>"}`);
  };

  if (!eleve) return <Empty icone="📁" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 200 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="seg">
          {DISPOSITIFS.map((d) => (
            <button key={d.id} className={dispoId === d.id ? "active" : ""} title={d.nomLong}
              onClick={() => setDispoId(d.id)}>{d.nom}</button>
          ))}
          <button className={dispoId === "ppi" ? "active" : ""} title="Projet personnalisé individualisé (IME)"
            onClick={() => setDispoId("ppi")}>PPI</button>
        </div>
        <div className="spacer" />
        {dispo && <>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-2)" }}
            title="N'imprimer que les rubriques renseignées, sans cases ni lignes vides">
            <input type="checkbox" checked={resume} onChange={(e) => setResume(e.target.checked)} />
            Résumé
          </label>
          <button className="btn sm" onClick={preRemplir}>✨ Pré-remplir</button>
          <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
        </>}
      </div>

      {dispoId === "ppi" ? <PpiTab /> : dispo && (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{dispo.nomLong}</div>
            <div style={{ fontSize: 12, color: "var(--text-2)" }}>
              {dispo.sousTitre}{dispo.reference && ` · ${dispo.reference}`}
            </div>
          </div>

          {dispo.sections.map((s) => (
            <div key={s.titre} className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ marginTop: 0 }}>{s.titre}</h3>
              {s.note && <div style={{ fontSize: 12, color: "var(--text-2)", margin: "-6px 0 10px" }}>{s.note}</div>}
              {s.champs.map((c) => <ChampVue key={c.id} champ={c} valeur={v[c.id]}
                onTexte={(x) => set(c.id, x)} onCoche={(i, j) => coche(c.id, i, j)}
                onCellule={(l, col, x) => setCellule(c.id, l, col, x)} />)}
            </div>
          ))}
        </>
      )}
    </>
  );
}

function ChampVue({ champ, valeur, onTexte, onCoche, onCellule }: {
  champ: Champ; valeur: any;
  onTexte: (v: string) => void; onCoche: (item: number, col: number) => void;
  onCellule: (ligne: number, col: number, v: string) => void;
}) {
  if (champ.t === "ligne") {
    return (
      <div style={{ maxWidth: champ.large ? "100%" : 420 }}>
        <Field label={champ.label}><Input value={valeur ?? ""} onChange={(e) => onTexte(e.target.value)} /></Field>
      </div>
    );
  }
  if (champ.t === "zone") {
    return (
      <Field label={champ.label}>
        <textarea className="textarea" style={{ minHeight: champ.min ?? 80 }} value={valeur ?? ""}
          onChange={(e) => onTexte(e.target.value)} />
      </Field>
    );
  }
  if (champ.t === "grille") {
    const g: Record<string, boolean> = valeur ?? {};
    const retenus = Object.keys(g).length;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
          <b style={{ fontSize: 13 }}>{champ.label}</b>
          {retenus > 0 && <span style={{ fontSize: 12, color: "var(--accent)" }}>{retenus} coché(s)</span>}
        </div>
        <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: "var(--panel-2)", fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
            <div style={{ flex: 1, padding: "5px 8px" }}>Adaptation</div>
            {champ.colonnes.map((n) => <div key={n} style={{ width: 42, textAlign: "center", padding: "5px 0" }}>{n}</div>)}
          </div>
          {champ.items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", borderTop: "1px solid var(--border)" }}>
              <div style={{ flex: 1, padding: "6px 8px", fontSize: 12.5 }}>{it}</div>
              {champ.colonnes.map((n, j) => (
                <div key={n} style={{ width: 42, display: "flex", justifyContent: "center" }}>
                  <input type="checkbox" checked={!!g[`${i}:${j}`]} onChange={() => onCoche(i, j)}
                    aria-label={`${it} — ${n}`} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
  // liste : petit tableau de saisie
  const t: string[][] = valeur ?? [];
  return (
    <div style={{ marginBottom: 14 }}>
      <b style={{ fontSize: 13 }}>{champ.label}</b>
      <div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", marginTop: 4 }}>
        <div style={{ display: "flex", background: "var(--panel-2)", fontSize: 11, fontWeight: 700, color: "var(--text-2)" }}>
          {champ.colonnes.map((n) => <div key={n} style={{ flex: 1, padding: "5px 8px" }}>{n}</div>)}
        </div>
        {Array.from({ length: champ.lignes }, (_, l) => (
          <div key={l} style={{ display: "flex", borderTop: "1px solid var(--border)" }}>
            {champ.colonnes.map((n, c) => (
              <div key={n} style={{ flex: 1, borderLeft: c ? "1px solid var(--border)" : "none" }}>
                <input value={t[l]?.[c] ?? ""} onChange={(e) => onCellule(l, c, e.target.value)}
                  style={{ width: "100%", border: "none", background: "transparent", color: "inherit",
                    font: "inherit", fontSize: 12.5, padding: "6px 8px", outline: "none" }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
