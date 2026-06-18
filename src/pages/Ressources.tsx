import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Page } from "../App";
import { Input, Select, Empty, Confirm, useAsync, useSegmentNav } from "../components/ui";
import { api, DocumentCoffre, newId, nowIso, couleurHex } from "../api";
import { PdfViewer } from "../components/PdfViewer";
import eduscol from "../data/eduscol.json";
import videos from "../data/videos.json";
import outils from "../data/outils.json";

interface Doc { titre: string; url: string; categorie: string; sousCategorie: string }
interface Vid { titre: string; sousTitre: string; plateforme: string; cycle: string; matiere: string; duree: string; url: string }
interface Outil { titre: string; description: string; categorie: string; url: string }

const ouvrir = (url: string) => { openUrl(url).catch(() => window.open(url, "_blank")); };
const TABS = ["docs", "outils", "videos", "coffre"] as const;

// Couleur stable par catégorie (documents & outils).
const COULEUR_CAT: Record<string, string> = {
  "Cycle 1": "green", "Cycle 2": "blue", "Cycle 3": "indigo",
  "Pédagogie": "purple", "Rituels": "teal", "Universalité des apprentissages": "cyan",
  "Évaluation": "orange", "Inclusion": "pink", "Numérique": "red", "Langues vivantes": "brown",
  "Gestion & direction": "blue", "Formation & accompagnement": "purple",
  "Ressources pédagogiques": "green", "Évaluation & compétences": "orange",
};
const teinteCat = (cat: string) => couleurHex[COULEUR_CAT[cat] ?? "gray"] ?? couleurHex.gray;

export default function Ressources() {
  const [onglet, setOnglet] = React.useState<typeof TABS[number]>("docs");
  useSegmentNav(TABS, onglet, setOnglet);
  return (
    <Page titre="Ressources" sous="Documents Éduscol, outils de l'enseignant, vidéothèque et coffre-fort de PDF">
      <div className="seg" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        <button className={onglet === "docs" ? "active" : ""} onClick={() => setOnglet("docs")}>Documents Éduscol ({(eduscol as Doc[]).length})</button>
        <button className={onglet === "outils" ? "active" : ""} onClick={() => setOnglet("outils")}>Outils de l'enseignant ({(outils as Outil[]).length})</button>
        <button className={onglet === "videos" ? "active" : ""} onClick={() => setOnglet("videos")}>Vidéothèque ({(videos as Vid[]).length})</button>
        <button className={onglet === "coffre" ? "active" : ""} onClick={() => setOnglet("coffre")}>Coffre-fort</button>
      </div>
      {onglet === "docs" ? <Documents /> : onglet === "outils" ? <Outils /> : onglet === "videos" ? <Videos /> : <CoffreFort />}
    </Page>
  );
}

const fmtTaille = (o: number) => o > 1e6 ? (o / 1e6).toFixed(1) + " Mo" : Math.round(o / 1e3) + " Ko";

async function fileToBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] ?? ""); r.onerror = rej; r.readAsDataURL(file); });
}

function CoffreFort() {
  const { data: docs, reload } = useAsync(() => api.coffreList(), []);
  const [del, setDel] = React.useState<DocumentCoffre | null>(null);
  const [ouvert, setOuvert] = React.useState<DocumentCoffre | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const importer = async (file: File) => {
    const b64 = await fileToBase64(file);
    const nomFichier = await api.fichierSave(file.name, b64);
    await api.coffreSave({ id: newId(), nom: file.name.replace(/\.pdf$/i, ""), nomFichier, tailleOctets: file.size, dateAjout: nowIso() });
    reload();
  };

  return (
    <>
      <div className="toolbar">
        <span className="chip">Vos documents PDF (manuels, ressources…)</span>
        <div className="spacer" />
        <input ref={input} type="file" accept="application/pdf" multiple style={{ display: "none" }}
          onChange={(e) => { Array.from(e.target.files ?? []).forEach((f) => importer(f)); e.target.value = ""; }} />
        <button className="btn primary" onClick={() => input.current?.click()}>＋ Ajouter un PDF</button>
      </div>
      {(docs?.length ?? 0) === 0 ? <Empty icone="🗄️" titre="Coffre-fort vide" sous="Importez vos PDF pour les consulter et en citer des passages." /> :
        docs!.map((d) => (
          <div key={d.id} className="list-row" style={{ cursor: "pointer" }} onClick={() => setOuvert(d)}>
            <span style={{ fontSize: 20 }}>📕</span>
            <div style={{ flex: 1 }}>
              <div className="title">{d.nom}</div>
              <div className="meta">{fmtTaille(d.tailleOctets)} · {new Date(d.dateAjout).toLocaleDateString("fr-FR")}</div>
            </div>
            <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setOuvert(d); }}>Ouvrir</button>
            <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDel(d); }} aria-label="Supprimer">🗑</button>
          </div>
        ))}
      {ouvert && <PdfViewer nomFichier={ouvert.nomFichier} titre={ouvert.nom} onClose={() => setOuvert(null)} />}
      {del && <Confirm message={`Supprimer « ${del.nom} » du coffre ?`}
        onYes={() => api.coffreDelete(del.id, del.nomFichier).then(reload)} onClose={() => setDel(null)} />}
    </>
  );
}

function Documents() {
  const docs = eduscol as Doc[];
  const [q, setQ] = React.useState("");
  const filtres = docs.filter((d) =>
    !q || d.titre.toLowerCase().includes(q.toLowerCase()) || d.sousCategorie.toLowerCase().includes(q.toLowerCase()) || d.categorie.toLowerCase().includes(q.toLowerCase()));

  // Dossiers : catégorie → sous-catégorie → documents.
  const dossiers: Record<string, Record<string, Doc[]>> = {};
  for (const d of filtres) ((dossiers[d.categorie] ??= {})[d.sousCategorie] ??= []).push(d);

  // Dossiers ouverts. En recherche active, tout est déplié pour voir les résultats.
  const [ouverts, setOuverts] = React.useState<Record<string, boolean>>({});
  const toggle = (cat: string) => setOuverts((s) => ({ ...s, [cat]: !s[cat] }));

  const [etat, setEtat] = React.useState<Record<string, "load" | "ok" | "err">>({});
  const ajouterAuCoffre = async (d: Doc) => {
    setEtat((s) => ({ ...s, [d.url]: "load" }));
    try { await api.coffreDownload(d.url, d.titre); setEtat((s) => ({ ...s, [d.url]: "ok" })); }
    catch { setEtat((s) => ({ ...s, [d.url]: "err" })); }
  };

  const docRow = (d: Doc, teinte: string, key: React.Key) => {
    const st = etat[d.url];
    return (
      <div key={key} className="list-row" style={{ borderLeft: `3px solid ${teinte}`, background: teinte + "0d" }}>
        <span>📄</span>
        <div style={{ flex: 1, cursor: "pointer" }} className="title" onClick={() => ouvrir(d.url)}>{d.titre}</div>
        <button className="btn ghost sm" disabled={st === "load" || st === "ok"} onClick={() => ajouterAuCoffre(d)}>
          {st === "load" ? "⏳ Ajout…" : st === "ok" ? "✓ Au coffre" : st === "err" ? "❌ Échec" : "🗄️ Coffre"}
        </button>
        <button className="btn ghost sm" onClick={() => ouvrir(d.url)}>Ouvrir ↗</button>
      </div>
    );
  };

  return (
    <>
      <div className="toolbar">
        <Input className="search" placeholder="Rechercher un document…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtres.length === 0 ? <Empty icone="📚" titre="Aucun document" /> :
        Object.entries(dossiers).map(([cat, sous]) => {
          const teinte = teinteCat(cat);
          const total = Object.values(sous).reduce((n, l) => n + l.length, 0);
          const ouvert = q ? true : !!ouverts[cat]; // recherche → tout déplié
          return (
            <div key={cat} style={{ marginBottom: 12 }}>
              <button onClick={() => toggle(cat)} disabled={!!q}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", cursor: q ? "default" : "pointer",
                  background: teinte + "1f", border: `1px solid ${teinte}55`, borderLeft: `3px solid ${teinte}`, borderRadius: 10,
                  color: "var(--text)", font: "inherit", fontWeight: 700, fontSize: 14 }}>
                <span style={{ fontSize: 16 }}>{ouvert ? "📂" : "📁"}</span>
                <span style={{ flex: 1, textAlign: "left" }}>{cat}</span>
                <span className="chip" style={{ background: teinte + "33" }}>{total}</span>
                <span style={{ color: "var(--text-2)", transform: ouvert ? "rotate(90deg)" : "none", transition: "transform .15s" }}>›</span>
              </button>
              {ouvert && (
                <div style={{ paddingLeft: 14, marginTop: 6 }}>
                  {Object.entries(sous).map(([sc, list]) => (
                    <div key={sc} style={{ marginBottom: 10 }}>
                      <h3 style={{ margin: "0 0 6px", fontSize: 13, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: teinte, flexShrink: 0 }} />{sc}
                      </h3>
                      {list.map((d, i) => docRow(d, teinte, i))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </>
  );
}

function Outils() {
  const items = outils as Outil[];
  const groupes: Record<string, Outil[]> = {};
  for (const o of items) (groupes[o.categorie] ??= []).push(o);
  return (
    <>
      {Object.entries(groupes).map(([cat, list]) => {
        const teinte = teinteCat(cat);
        return (
          <div key={cat} style={{ marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-2)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: teinte, flexShrink: 0 }} />{cat}
            </h3>
            <div className="grid cols">
              {list.map((o, i) => (
                <div key={i} className="card" style={{ cursor: "pointer", borderLeft: `3px solid ${teinte}` }} onClick={() => ouvrir(o.url)}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ fontSize: 20 }}>🧰</span>
                    <div style={{ fontWeight: 700, flex: 1 }}>{o.titre}</div>
                    <span style={{ color: "var(--text-2)" }}>↗</span>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>{o.description}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function Videos() {
  const vids = videos as Vid[];
  const [cycle, setCycle] = React.useState("");
  const cycles = Array.from(new Set(vids.map((v) => v.cycle)));
  const filtres = vids.filter((v) => !cycle || v.cycle === cycle);
  return (
    <>
      <div className="toolbar">
        <Select value={cycle} onChange={(e) => setCycle(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="">Tous les cycles</option>{cycles.map((c) => <option key={c}>{c}</option>)}
        </Select>
      </div>
      <div className="grid cols">
        {filtres.map((v, i) => (
          <div key={i} className="card" style={{ cursor: "pointer" }} onClick={() => ouvrir(v.url)}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 22 }}>▶️</span>
              <div style={{ fontWeight: 700, flex: 1 }}>{v.titre}</div>
            </div>
            {v.sousTitre && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 6 }}>{v.sousTitre}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <span className="chip">{v.cycle}</span><span className="chip">{v.matiere}</span>
              {v.duree && <span className="chip">⏱ {v.duree}</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
