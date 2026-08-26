import React from "react";
import { api, Eleve, newId } from "../api";
import { Field, Input, Select, Modal, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";

// ── Progressions individuelles ────────────────────────────────────────────
// Chaque élève suit sa propre trajectoire, indépendante du groupe : une
// progression = une suite d'étapes ordonnées dans un domaine. Complète le PPI
// (qui dit où l'on va) en décrivant par quelles étapes on y passe.
// Stockage par élève dans les réglages (clé `progressions:{eleveId}`).

type StatutEtape = "nonabordee" | "encours" | "acquise";
interface Etape { id: string; intitule: string; statut: StatutEtape; date: string; notes: string }
interface Progression { id: string; domaine: string; titre: string; etapes: Etape[] }

const STATUTS: { k: StatutEtape; label: string; court: string; couleur: string }[] = [
  { k: "nonabordee", label: "Non abordée", court: "—", couleur: "var(--panel-2)" },
  { k: "encours", label: "En cours", court: "~", couleur: "#eb9e33" },
  { k: "acquise", label: "Acquise", court: "✓", couleur: "#57b873" },
];
const stat = (k: StatutEtape) => STATUTS.find((s) => s.k === k)!;

const DOMAINES = ["Langage oral", "Langage écrit / lecture", "Écriture / graphisme", "Mathématiques",
  "Autonomie", "Socialisation", "Motricité", "Repérage dans le temps", "Repérage dans l'espace",
  "Communication (CAA)", "Attention / comportement"];

const todayIso = () => new Date().toISOString().slice(0, 10);
const fmtFr = (iso: string) => { const [y, m, d] = (iso || "").split("-"); return y && m && d ? `${d}/${m}/${y}` : ""; };

/** Petite photo ronde de l'élève (ou initiale). */
function Photo({ eleve, size = 30 }: { eleve: Eleve; size?: number }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    if (eleve.photoFichier) api.fichierRead(eleve.photoFichier).then((b) => setSrc(`data:image;base64,${b}`)).catch(() => {});
    else setSrc("");
  }, [eleve.photoFichier]);
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.42, flexShrink: 0 }}>
      {(eleve.nom || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function ProgressionsTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [progs, setProgs] = React.useState<Progression[]>([]);
  const [copier, setCopier] = React.useState<Progression | null>(null);
  const [supprimer, setSupprimer] = React.useState<Progression | null>(null);

  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  React.useEffect(() => {
    if (!eleveId) return;
    api.settingGet(`progressions:${eleveId}`).then((v) => {
      try { setProgs(v ? JSON.parse(v) : []); } catch { setProgs([]); }
    });
  }, [eleveId]);

  const persister = (p: Progression[]) => { setProgs(p); if (eleveId) api.settingSet(`progressions:${eleveId}`, JSON.stringify(p)); };
  const upProg = (id: string, patch: Partial<Progression>) => persister(progs.map((p) => p.id === id ? { ...p, ...patch } : p));
  const upEtape = (pid: string, eid: string, patch: Partial<Etape>) =>
    upProg(pid, { etapes: progs.find((p) => p.id === pid)!.etapes.map((e) => e.id === eid ? { ...e, ...patch } : e) });

  const ajouterProg = () => persister([...progs, { id: newId(), domaine: "", titre: "", etapes: [] }]);
  const ajouterEtape = (pid: string) => {
    const p = progs.find((x) => x.id === pid)!;
    upProg(pid, { etapes: [...p.etapes, { id: newId(), intitule: "", statut: "nonabordee", date: "", notes: "" }] });
  };
  const deplacer = (pid: string, eid: string, sens: -1 | 1) => {
    const p = progs.find((x) => x.id === pid)!;
    const i = p.etapes.findIndex((e) => e.id === eid);
    const j = i + sens;
    if (j < 0 || j >= p.etapes.length) return;
    const arr = [...p.etapes];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    upProg(pid, { etapes: arr });
  };
  // Changer le statut : « acquise » horodate automatiquement l'étape.
  const cycleStatut = (pid: string, e: Etape, k: StatutEtape) => {
    const patch: Partial<Etape> = { statut: k };
    if (k === "acquise" && !e.date) patch.date = todayIso();
    if (k !== "acquise") patch.date = "";
    upEtape(pid, e.id, patch);
  };

  // Copie d'une progression vers d'autres élèves (étapes remises à zéro) :
  // en IME on réutilise souvent la même trame pour plusieurs jeunes.
  const copierVers = async (p: Progression, cibles: string[]) => {
    for (const id of cibles) {
      const brut = await api.settingGet(`progressions:${id}`);
      let liste: Progression[] = [];
      try { liste = brut ? JSON.parse(brut) : []; } catch { liste = []; }
      liste.push({
        id: newId(), domaine: p.domaine, titre: p.titre,
        etapes: p.etapes.map((e) => ({ id: newId(), intitule: e.intitule, statut: "nonabordee", date: "", notes: "" })),
      });
      await api.settingSet(`progressions:${id}`, JSON.stringify(liste));
    }
    toast(`Progression copiée vers ${cibles.length} élève${cibles.length > 1 ? "s" : ""}.`, { icone: "✅" });
    setCopier(null);
  };

  const eleve = eleves?.find((e) => e.id === eleveId);

  const imprimer = () => {
    if (!eleve) return;
    const corps = progs.map((p) => {
      const acq = p.etapes.filter((e) => e.statut === "acquise").length;
      return `<h2>${escapeHtml(p.titre || "Progression")} <span style="font-weight:400;color:#687087;font-size:13px">${escapeHtml(p.domaine)} — ${acq}/${p.etapes.length} acquises</span></h2>
        <table><tr><th style="width:52%">Étape</th><th style="width:16%">Statut</th><th style="width:14%">Date</th><th>Notes</th></tr>
        ${p.etapes.map((e) => `<tr><td>${escapeHtml(e.intitule)}</td><td>${escapeHtml(stat(e.statut).label)}</td><td>${escapeHtml(fmtFr(e.date))}</td><td>${escapeHtml(e.notes)}</td></tr>`).join("")}
        </table>`;
    }).join("");
    printHTML(`Progressions — ${eleve.nom}`,
      `<h1>Progressions individuelles</h1><div class="meta">${escapeHtml(eleve.nom)} — édité le ${fmtFr(todayIso())}</div>${corps || "<p>Aucune progression.</p>"}`);
  };

  if (!eleve) return <Empty icone="📈" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;

  return (
    <>
      <div className="toolbar">
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 240 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="spacer" />
        <button className="btn sm" onClick={imprimer} disabled={progs.length === 0}>🖨 Imprimer</button>
        <button className="btn primary sm" onClick={ajouterProg}>+ Progression</button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <Photo eleve={eleve} size={38} />
        <div>
          <div style={{ fontWeight: 700 }}>{eleve.nom}</div>
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>
            {progs.length === 0 ? "Aucune progression" :
              `${progs.length} progression${progs.length > 1 ? "s" : ""} · ${progs.reduce((n, p) => n + p.etapes.filter((e) => e.statut === "acquise").length, 0)} étape(s) acquise(s)`}
          </div>
        </div>
      </div>

      {progs.length === 0 && (
        <Empty icone="📈" titre="Aucune progression" sous={`Créez la première trajectoire d'apprentissage de ${(eleve.nom || "").split(" ")[0]}.`} />
      )}

      {progs.map((p) => {
        const total = p.etapes.length;
        const acq = p.etapes.filter((e) => e.statut === "acquise").length;
        const enc = p.etapes.filter((e) => e.statut === "encours").length;
        const pct = total ? Math.round((acq / total) * 100) : 0;
        return (
          <div key={p.id} className="card" style={{ marginBottom: 14 }}>
            <div className="row" style={{ alignItems: "flex-end" }}>
              <Field label="Domaine">
                <Input list="prog-domaines" value={p.domaine} onChange={(e) => upProg(p.id, { domaine: e.target.value })} placeholder="Langage écrit / lecture" />
              </Field>
              <Field label="Intitulé de la progression">
                <Input value={p.titre} onChange={(e) => upProg(p.id, { titre: e.target.value })} placeholder="Entrée dans l'écrit" />
              </Field>
              <button className="btn sm" title="Copier cette progression vers d'autres élèves" onClick={() => setCopier(p)}>📋 Copier vers…</button>
              <button className="btn ghost sm" aria-label="Supprimer" onClick={() => setSupprimer(p)}>🗑</button>
            </div>

            {/* Frise de progression */}
            <div style={{ margin: "10px 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 8, borderRadius: 99, background: "var(--panel-2)", overflow: "hidden", display: "flex" }}>
                <div style={{ width: `${pct}%`, background: "#57b873" }} />
                <div style={{ width: `${total ? (enc / total) * 100 : 0}%`, background: "#eb9e33" }} />
              </div>
              <span style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "nowrap" }}>{acq}/{total} acquises</span>
            </div>

            {p.etapes.map((e, i) => (
              <div key={e.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "8px 0", borderTop: "1px solid var(--border)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 2 }}>
                  <button className="btn ghost sm" style={{ padding: "0 6px", lineHeight: 1.1 }} disabled={i === 0}
                    onClick={() => deplacer(p.id, e.id, -1)} aria-label="Monter">▲</button>
                  <button className="btn ghost sm" style={{ padding: "0 6px", lineHeight: 1.1 }} disabled={i === p.etapes.length - 1}
                    onClick={() => deplacer(p.id, e.id, 1)} aria-label="Descendre">▼</button>
                </div>
                <span style={{ fontSize: 12, color: "var(--text-2)", paddingTop: 8, width: 18, textAlign: "right" }}>{i + 1}</span>
                <div style={{ flex: 1 }}>
                  <Input value={e.intitule} onChange={(ev) => upEtape(p.id, e.id, { intitule: ev.target.value })}
                    placeholder="Ex. reconnaît son prénom parmi trois étiquettes" />
                  <div className="row" style={{ marginTop: 6 }}>
                    <Input value={e.notes} onChange={(ev) => upEtape(p.id, e.id, { notes: ev.target.value })} placeholder="Notes, aide apportée…" />
                    {e.statut === "acquise" && (
                      <Input type="date" value={e.date} onChange={(ev) => upEtape(p.id, e.id, { date: ev.target.value })} style={{ maxWidth: 165 }} />
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0, paddingTop: 4 }}>
                  {STATUTS.map((s) => (
                    <button key={s.k} title={s.label} onClick={() => cycleStatut(p.id, e, s.k)}
                      style={{ width: 30, height: 30, borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700,
                        background: e.statut === s.k ? s.couleur : "var(--panel-2)",
                        color: e.statut === s.k && s.k !== "nonabordee" ? "#fff" : "var(--text-2)" }}>{s.court}</button>
                  ))}
                  <button className="btn ghost sm" aria-label="Supprimer l'étape"
                    onClick={() => upProg(p.id, { etapes: p.etapes.filter((x) => x.id !== e.id) })}>🗑</button>
                </div>
              </div>
            ))}
            <button className="btn sm" style={{ marginTop: 10 }} onClick={() => ajouterEtape(p.id)}>+ Étape</button>
          </div>
        );
      })}
      <datalist id="prog-domaines">{DOMAINES.map((d) => <option key={d} value={d} />)}</datalist>

      {copier && (
        <CopierVersModal progression={copier} eleves={(eleves ?? []).filter((e) => e.id !== eleveId)}
          onClose={() => setCopier(null)} onCopier={(cibles) => copierVers(copier, cibles)} />
      )}
      {supprimer && (
        <Confirm message={`Supprimer la progression « ${supprimer.titre || "sans titre"} » ?`}
          onYes={() => persister(progs.filter((x) => x.id !== supprimer.id))} onClose={() => setSupprimer(null)} />
      )}
    </>
  );
}

function CopierVersModal({ progression, eleves, onClose, onCopier }: {
  progression: Progression; eleves: Eleve[]; onClose: () => void; onCopier: (ids: string[]) => void;
}) {
  const [sel, setSel] = React.useState<string[]>([]);
  const bascule = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <Modal titre="Copier la progression vers…" onClose={onClose}
      footer={<>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>Les étapes sont copiées vierges (statut remis à zéro).</span>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={sel.length === 0} onClick={() => onCopier(sel)}>Copier ({sel.length})</button>
      </>}>
      <div style={{ marginBottom: 10, fontSize: 13 }}>
        <b>{progression.titre || "Progression"}</b> — {progression.etapes.length} étape(s)
      </div>
      {eleves.length === 0 && <div style={{ color: "var(--text-2)", fontSize: 13 }}>Aucun autre élève.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {eleves.map((e) => (
          <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 4px", cursor: "pointer", borderRadius: 6 }}>
            <input type="checkbox" checked={sel.includes(e.id)} onChange={() => bascule(e.id)} />
            <Photo eleve={e} size={26} />
            <span>{e.nom}</span>
          </label>
        ))}
      </div>
    </Modal>
  );
}
