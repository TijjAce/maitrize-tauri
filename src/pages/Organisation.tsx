import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import {
  api, ProgrammationFinale, ProgressionAnnuelle, EdtTypique, Sequence, Ami, anneeScolaireActuelle, MATIERES,
  HEURES_PROGRAMME, couleurHex, couleurPourMatiere, newId, telechargerTexte,
} from "../api";
import { Empty, Input, Select, Modal, ColorPicker, useAsync, useSegmentNav, useHistorique } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { labelCourt, CompetenceSelectionnee } from "../components/CompetenceTree";
import { COULEURS } from "../api";
import { printHTML, escapeHtml } from "../print";

// Couleurs officielles des périodes (miroir couleursPeriodes).
const COULEUR_PERIODE: Record<number, string> = { 1: "#2e73d9", 2: "#d94033", 3: "#4d4d4d", 4: "#d97319", 5: "#269950" };

/** Champ texte auto-extensible (affiche tout le contenu, multi-lignes). */
function AutoText({ value, onChange, bold, style }: {
  value: string; onChange: (v: string) => void; bold?: boolean; style?: React.CSSProperties;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const resize = React.useCallback(() => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }, []);
  React.useEffect(resize, [value, resize]);
  return (
    <textarea ref={ref} rows={1} value={value} spellCheck={false} onChange={(e) => { onChange(e.target.value); resize(); }}
      style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 7, padding: "6px 8px", background: "var(--panel)",
        color: "var(--text)", font: "inherit", fontSize: 13, fontWeight: bold ? 700 : 400, resize: "none", overflow: "hidden",
        lineHeight: 1.4, minHeight: 32, outline: "none", ...style }} />
  );
}

/** Chip de période coloré (P1…P5), sélectionné ou grisé. */
function PeriodeChip({ p, selected, onClick }: { p: number; selected: boolean; onClick: () => void }) {
  const c = COULEUR_PERIODE[p];
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 9,
        border: `1px solid ${selected ? c : "var(--border)"}`, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
        background: selected ? c : "var(--panel-2)", color: selected ? "#fff" : "var(--text-2)",
        boxShadow: selected ? `0 2px 6px ${c}55` : "none" }}>
      <span style={{ background: "rgba(255,255,255,.22)", borderRadius: 100, padding: "1px 6px", fontSize: 10,
        display: selected ? "inline" : "none" }}>P{p}</span>
      {!selected && `P${p}`}{selected && `Période ${p}`}
    </button>
  );
}

/** Sélecteur de domaine : matière réelle (→ bonne couleur) ou personnalisé. */
function DomaineLabel({ label, onChange }: { label: string; onChange: (v: string) => void }) {
  const estMatiere = MATIERES.includes(label);
  const [perso, setPerso] = React.useState(!estMatiere && label !== "Nouveau domaine");
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flex: 1 }}>
      <select className="select" value={estMatiere ? label : "__autre"} style={{ maxWidth: 220, fontWeight: 700 }}
        onChange={(e) => {
          if (e.target.value === "__autre") { setPerso(true); onChange(""); }
          else { setPerso(false); onChange(e.target.value); }
        }}>
        {MATIERES.map((m) => <option key={m} value={m}>{m}</option>)}
        <option value="__autre">Autre (personnalisé)…</option>
      </select>
      {(perso || (!estMatiere && label !== "")) && (
        <input className="input" placeholder="Nom du domaine" value={label} spellCheck={false}
          style={{ fontWeight: 700, maxWidth: 240 }} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

function imprimerProgression(annee: string, periode: number, colonnes: { id: string; titre: string }[], cellules: Record<string, string>) {
  const head = `<tr><th>Semaine</th>${colonnes.map((c) => `<th>${escapeHtml(c.titre)}</th>`).join("")}</tr>`;
  const rows = Array.from({ length: NB_SEMAINES }, (_, i) => i + 1).map((sem) =>
    `<tr><td><b>S${sem}</b></td>${colonnes.map((c) => `<td>${escapeHtml(cellules[`w${sem}_${c.id}`] ?? "")}</td>`).join("")}</tr>`).join("");
  printHTML(`Progression ${annee} P${periode}`, `<h1>Progression annuelle — ${escapeHtml(annee)} · Période ${periode}</h1><table>${head}${rows}</table>`);
}

function imprimerProgrammation(annee: string, lignes: Ligne[]) {
  const rows = lignes.map((l) => l.estDomaine
    ? `<tr style="background:${couleurHex[l.couleur ?? "blue"]}22;font-weight:700"><td colspan="6">📁 ${escapeHtml(l.label)}</td></tr>`
    : `<tr><td>${escapeHtml(l.label)}</td>${[l.p1, l.p2, l.p3, l.p4, l.p5].map((v, i) => {
        const fait = (l.periodesFaites ?? []).includes(i + 1);
        return `<td style="${fait ? "text-decoration:line-through;color:#888" : ""}">${escapeHtml(v)}</td>`;
      }).join("")}</tr>`).join("");
  printHTML(`Programmation ${annee}`,
    `<h1>Programmation annuelle — ${escapeHtml(annee)}</h1><table><tr><th>Domaine / Activité</th><th>P1</th><th>P2</th><th>P3</th><th>P4</th><th>P5</th></tr>${rows}</table>`);
}

const SEGMENTS = [
  { id: "prog", label: "Programmation" },
  { id: "annuelle", label: "Progression" },
  { id: "edt", label: "EDT type" },
  { id: "cycle", label: "Travail de cycle" },
] as const;
type SegId = typeof SEGMENTS[number]["id"];

const SEG_IDS = SEGMENTS.map((s) => s.id);

// Liste d'années scolaires autour de l'année courante (pour le sélecteur).
function anneesScolaires(courante: string): string[] {
  const startY = parseInt(courante.slice(0, 4), 10) || new Date().getFullYear();
  const arr: string[] = [];
  for (let y = startY - 2; y <= startY + 2; y++) arr.push(`${y}-${y + 1}`);
  return arr;
}
/** Sélecteur d'année scolaire (remplace l'étiquette figée). */
function AnneeSelect({ annee, setAnnee }: { annee: string; setAnnee: (a: string) => void }) {
  const opts = anneesScolaires(anneeScolaireActuelle());
  const all = opts.includes(annee) ? opts : [...opts, annee].sort();
  return (
    <Select value={annee} onChange={(e) => setAnnee(e.target.value)} style={{ maxWidth: 170, fontWeight: 600 }}>
      {all.map((a) => <option key={a} value={a}>Année {a}</option>)}
    </Select>
  );
}

const SOUS_TITRE = "Programmation, progression annuelle, emploi du temps type et travail de cycle";
export default function Organisation() {
  const [onglet, setOnglet] = React.useState<SegId>("prog");
  // Année sélectionnée mémorisée d'une session à l'autre (réglage « anneeCourante »).
  const [annee, setAnneeState] = React.useState(anneeScolaireActuelle());
  React.useEffect(() => { api.settingGet("anneeCourante").then((v) => { if (v) setAnneeState(v); }); }, []);
  const setAnnee = (a: string) => { setAnneeState(a); api.settingSet("anneeCourante", a); };
  useSegmentNav(SEG_IDS, onglet, setOnglet);
  const props = { annee, setAnnee };
  return (
    <Page titre="Organisation" sous={SOUS_TITRE}>
      <div className="seg" style={{ marginBottom: 18, flexWrap: "wrap" }}>
        {SEGMENTS.map((s) => <button key={s.id} className={onglet === s.id ? "active" : ""} onClick={() => setOnglet(s.id)}>{s.label}</button>)}
      </div>
      {onglet === "prog" ? <Programmation {...props} /> : onglet === "annuelle" ? <ProgressionAnnuelleVue {...props} /> : onglet === "edt" ? <EdtType {...props} /> : <TravailDeCycle {...props} />}
    </Page>
  );
}

interface AnneeProps { annee: string; setAnnee: (a: string) => void }

// ── Progression annuelle : semaines × colonnes (domaines/matières) ──────────
interface Colonne { id: string; titre: string; couleur: string }
const NB_SEMAINES = 8;

function ProgressionAnnuelleVue({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.progressionsAnnuelleList(), []);
  const [periode, setPeriode] = React.useState(1);
  const prog = data?.find((p) => p.annee === annee && p.periode === periode);
  const [editCol, setEditCol] = React.useState<Colonne | null>(null);

  // Colonnes + cellules en un seul bloc, avec annuler/rétablir (⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y).
  type EtatProg = { colonnes: Colonne[]; cellules: Record<string, string> };
  const { present: etat, reset: chargerEtat, commit } = useHistorique<EtatProg>({ colonnes: [], cellules: {} }, (next) => {
    const p: ProgressionAnnuelle = prog
      ? { ...prog, colonnesJson: JSON.stringify(next.colonnes), cellulesJson: JSON.stringify(next.cellules) }
      : { id: newId(), annee, periode, colonnesJson: JSON.stringify(next.colonnes), cellulesJson: JSON.stringify(next.cellules) };
    api.progressionAnnuelleSave(p).then(() => { if (!prog) reload(); });
  });
  const colonnes = etat.colonnes;
  const cellules = etat.cellules;
  const persister = (cols: Colonne[], cells: Record<string, string>) => commit({ colonnes: cols, cellules: cells });

  React.useEffect(() => {
    let cols: Colonne[] = []; let cells: Record<string, string> = {};
    try { cols = prog ? JSON.parse(prog.colonnesJson) : []; } catch { /* */ }
    try { cells = prog ? JSON.parse(prog.cellulesJson) : {}; } catch { /* */ }
    chargerEtat({ colonnes: cols, cellules: cells });
  }, [prog?.id, periode]);

  const ajouterCol = () => { const c = { id: newId(), titre: "Domaine", couleur: "blue" }; setEditCol(c); };
  const validerCol = (c: Colonne) => {
    const exists = colonnes.some((x) => x.id === c.id);
    persister(exists ? colonnes.map((x) => x.id === c.id ? c : x) : [...colonnes, c], cellules);
    setEditCol(null);
  };
  const supprimerCol = (id: string) => {
    const cells = { ...cellules };
    Object.keys(cells).forEach((k) => { if (k.endsWith("_" + id)) delete cells[k]; });
    persister(colonnes.filter((c) => c.id !== id), cells);
  };
  const setCell = (sem: number, colId: string, v: string) =>
    persister(colonnes, { ...cellules, [`w${sem}_${colId}`]: v });

  // ── Export / Import JSON (format compatible app native) ───────────────
  // L'année est neutralisée à l'export (champ vide) : à l'import on assigne
  // toujours la période/année actuellement affichée (« atterrit là où je suis »),
  // comme dans l'app native — pratique pour partager en travail de cycle.
  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => {
    const bundle = {
      version: 4, type: "progression", dateExport: new Date().toISOString(), appVersion: "tauri",
      progressionsAnnuelles: [{
        id: prog?.id ?? newId(), annee: "", periode,
        colonnesJSON: JSON.stringify(colonnes), cellulesJSON: JSON.stringify(cellules),
      }],
    };
    const d = new Date().toISOString().slice(0, 10);
    telechargerTexte(`Progression_${annee}_P${periode}_${d}.json`, JSON.stringify(bundle, null, 2));
  };
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      // Formats acceptés : export ciblé natif (progressionsAnnuelles), backup
      // complet (même clé), ou forme simple { colonnes, cellules }.
      const dtos: { periode?: number; colonnesJSON?: string; cellulesJSON?: string }[] =
        b.progressionsAnnuelles ?? (b.colonnes ? [{ periode, colonnesJSON: JSON.stringify(b.colonnes), cellulesJSON: JSON.stringify(b.cellules ?? {}) }] : []);
      if (dtos.length === 0) throw new Error();
      // On privilégie le tableau correspondant à la période affichée, sinon le premier.
      const dto = dtos.find((d) => d.periode === periode) ?? dtos[0];
      const cols: Colonne[] = JSON.parse(dto.colonnesJSON || "[]");
      const cells: Record<string, string> = JSON.parse(dto.cellulesJSON || "{}");
      if (!Array.isArray(cols)) throw new Error();
      persister(cols, cells); // atterrit sur la période actuellement affichée
    } catch { toast("Fichier de progression invalide.", { icone: "⚠️" }); }
  };

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[1, 2, 3, 4, 5].map((p) => <PeriodeChip key={p} p={p} selected={periode === p} onClick={() => setPeriode(p)} />)}
        </div>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        <button className="btn" onClick={() => imprimerProgression(annee, periode, colonnes, cellules)} disabled={colonnes.length === 0}>🖨 PDF</button>
        <button className="btn" onClick={exporter} disabled={colonnes.length === 0}>⬇️ Exporter</button>
        <button className="btn" onClick={() => fileRef.current?.click()}>⬆️ Importer</button>
        <button className="btn primary" onClick={ajouterCol}>+ Colonne</button>
      </div>
      {colonnes.length === 0 ? <Empty icone="📅" titre="Progression vide" sous="Ajoutez des colonnes (domaines/matières) puis remplissez par semaine." /> :
        <div style={{ overflowX: "auto" }}>
          <table className="tbl compact">
            <thead><tr><th style={{ width: 70 }}>Semaine</th>
              {colonnes.map((c) => (
                <th key={c.id} style={{ minWidth: 150 }}>
                  <span className="dot" style={{ background: couleurHex[c.couleur], display: "inline-block", width: 8, height: 8, borderRadius: "50%", marginRight: 6 }} />
                  {c.titre}
                  <button className="btn ghost sm" onClick={() => setEditCol(c)} aria-label="Modifier">✏️</button>
                  <button className="btn ghost sm" onClick={() => supprimerCol(c.id)} aria-label="Supprimer">🗑</button>
                </th>
              ))}
            </tr></thead>
            <tbody>
              {Array.from({ length: NB_SEMAINES }, (_, i) => i + 1).map((sem) => (
                <tr key={sem}>
                  <td style={{ fontWeight: 700, color: "var(--text-2)" }}>S{sem}</td>
                  {colonnes.map((c) => (
                    <td key={c.id}><input className="input" value={cellules[`w${sem}_${c.id}`] ?? ""}
                      onChange={(e) => setCell(sem, c.id, e.target.value)} /></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      {editCol && <ColonneForm colonne={editCol} onClose={() => setEditCol(null)} onValider={validerCol} />}
    </>
  );
}

function ColonneForm({ colonne, onClose, onValider }: { colonne: Colonne; onClose: () => void; onValider: (c: Colonne) => void }) {
  const [c, setC] = React.useState<Colonne>(colonne);
  return (
    <Modal titre="Colonne" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => onValider(c)}>Valider</button></>}>
      <div className="field"><label>Titre</label>
        <Select value={MATIERES.includes(c.titre) ? c.titre : "__autre"} onChange={(e) => e.target.value !== "__autre" && setC({ ...c, titre: e.target.value })}>
          {MATIERES.map((m) => <option key={m}>{m}</option>)}<option value="__autre">Autre (libre)…</option>
        </Select>
        <Input style={{ marginTop: 6 }} value={c.titre} onChange={(e) => setC({ ...c, titre: e.target.value })} />
      </div>
      <div className="field"><label>Couleur</label><ColorPicker value={c.couleur} onChange={(col) => setC({ ...c, couleur: col })} /></div>
    </Modal>
  );
}

// ── Programmation finale P1-P5 (domaines colorés, séquences liées, cases faites)
interface Ligne {
  id: string; estDomaine: boolean; label: string; couleur?: string;
  p1: string; p2: string; p3: string; p4: string; p5: string;
  seqs?: Record<string, string[]>; // "p1".."p5" → [sequenceId]
  periodesFaites?: number[];        // périodes (1..5) marquées réalisées
}
const PCOLS: ("p1" | "p2" | "p3" | "p4" | "p5")[] = ["p1", "p2", "p3", "p4", "p5"];

function Programmation({ annee, setAnnee }: AnneeProps) {
  const nav = useNavigate();
  const { data, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const prog = data?.find((p) => p.annee === annee && !p.estImportee);
  const [lien, setLien] = React.useState<{ ligneId: string; col: string } | null>(null);
  const [partagerOuvert, setPartagerOuvert] = React.useState(false);
  const fileRefProg = React.useRef<HTMLInputElement>(null);

  // État de la grille avec annuler/rétablir (⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y).
  const { present: lignes, reset: chargerLignes, commit: persister } = useHistorique<Ligne[]>([], (next) => {
    const p: ProgrammationFinale = prog ? { ...prog, lignesJson: JSON.stringify(next) }
      : { id: newId(), annee, lignesJson: JSON.stringify(next), niveau: "", enseignant: "", estImportee: false };
    api.programmationFinaleSave(p).then(() => { if (!prog) reload(); });
  });
  React.useEffect(() => { try { chargerLignes(prog ? JSON.parse(prog.lignesJson) : []); } catch { chargerLignes([]); } }, [prog?.id]);

  const nouvelle = (estDomaine: boolean): Ligne => ({ id: newId(), estDomaine,
    label: estDomaine ? "Nouveau domaine" : "Nouvelle activité", couleur: estDomaine ? "blue" : undefined,
    p1: "", p2: "", p3: "", p4: "", p5: "", seqs: {}, periodesFaites: [] });
  const ajouterLigne = (estDomaine: boolean) => persister([...lignes, nouvelle(estDomaine)]);

  // Export / Import fichier de la programmation finale.
  const exporterProg = () => {
    const bundle = { version: 1, type: "programmation", annee, lignes };
    telechargerTexte(`Programmation_${annee}_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
  };
  const importerProg = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      const ls = b.lignes as Ligne[] | undefined;
      if (!Array.isArray(ls)) throw new Error();
      if (lignes.length > 0 && !confirm("Remplacer la programmation actuelle ?")) return;
      persister(ls.map((l) => ({ ...l, id: newId() })));
    } catch { toast("Fichier de programmation invalide.", { icone: "⚠️" }); }
  };
  const majLigne = (id: string, patch: Partial<Ligne>) => persister(lignes.map((l) => l.id === id ? { ...l, ...patch } : l));
  const supprimer = (id: string) => persister(lignes.filter((l) => l.id !== id));
  const insererApres = (id: string, estDomaine: boolean) => {
    const i = lignes.findIndex((l) => l.id === id);
    const next = [...lignes]; next.splice(i + 1, 0, nouvelle(estDomaine)); persister(next);
  };

  const seqIdsDe = (l: Ligne, col: string) => l.seqs?.[col] ?? [];
  const setSeqIds = (ligneId: string, col: string, ids: string[]) => {
    persister(lignes.map((l) => l.id === ligneId ? { ...l, seqs: { ...(l.seqs ?? {}), [col]: ids } } : l));
  };
  const numPeriode = (col: string) => Number(col.slice(1));
  const estFaite = (l: Ligne, col: string) => (l.periodesFaites ?? []).includes(numPeriode(col));
  const toggleFaite = (l: Ligne, col: string) => {
    const p = numPeriode(col); const set = new Set(l.periodesFaites ?? []);
    set.has(p) ? set.delete(p) : set.add(p);
    majLigne(l.id, { periodesFaites: [...set] });
  };
  const cycleCouleur = (l: Ligne) => {
    const i = COULEURS.indexOf(l.couleur ?? "blue");
    majLigne(l.id, { couleur: COULEURS[(i + 1) % COULEURS.length] });
  };
  const competenceDe = (seqId: string): string | null => {
    const s = sequences?.find((x) => x.id === seqId);
    if (!s?.competenceVisee) return null;
    try { return labelCourt(JSON.parse(s.competenceVisee) as CompetenceSelectionnee); } catch { return null; }
  };

  // Couleur d'un domaine : suit la matière des Réglages si le libellé en est
  // une (couleurPourMatiere = surcharges Réglages incluses), sinon couleur manuelle.
  const couleurDomaine = (l: Ligne): string =>
    MATIERES.includes(l.label) ? couleurPourMatiere(l.label) : (l.couleur ?? "blue");
  // Couleur héritée du domaine parent (domaine le plus proche au-dessus).
  const couleurParent = (idx: number): string | undefined => {
    for (let i = idx; i >= 0; i--) if (lignes[i].estDomaine) return couleurDomaine(lignes[i]);
    return undefined;
  };

  // ── Drag & drop : réordonner (un domaine déplace tout son groupe) ──────────
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);
  // Reproduit deplacerLigne(source, apres: target) du natif : déplace la
  // source (+ ses enfants si domaine) APRÈS la cible ; si on dépose un
  // domaine sur un domaine, on insère après tout le groupe de la cible.
  const reordonner = (srcId: string, dstId: string) => {
    if (srcId === dstId) return;
    const arr = [...lignes];
    const si = arr.findIndex((l) => l.id === srcId);
    if (si < 0) return;
    const groupe: Ligne[] = [arr[si]];
    if (arr[si].estDomaine) { let j = si + 1; while (j < arr.length && !arr[j].estDomaine) { groupe.push(arr[j]); j++; } }
    arr.splice(si, groupe.length);
    const tgt = arr.findIndex((l) => l.id === dstId);
    if (tgt < 0) { arr.push(...groupe); }
    else {
      let insertAt = tgt + 1;
      if (arr[tgt].estDomaine && groupe[0].estDomaine) {
        while (insertAt < arr.length && !arr[insertAt].estDomaine) insertAt++;
      }
      arr.splice(Math.min(insertAt, arr.length), 0, ...groupe);
    }
    persister(arr);
  };

  const ligneLien = lignes.find((l) => l.id === lien?.ligneId);

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} /><div className="spacer" />
        <input ref={fileRefProg} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importerProg(f); e.target.value = ""; }} />
        <button className="btn" onClick={(e) => openCtx(e, [
          ...(lignes.length > 0 ? [{ label: "Partager à un ami", icon: "🤝", onClick: () => setPartagerOuvert(true) }] : []),
          ...(lignes.length > 0 ? [{ label: "Imprimer (PDF)", icon: "🖨", onClick: () => imprimerProgrammation(annee, lignes) }] : []),
          ...(lignes.length > 0 ? [{ label: "Exporter (fichier)", icon: "⬇️", onClick: exporterProg }] : []),
          { label: "Importer (fichier)", icon: "⬆️", onClick: () => fileRefProg.current?.click() },
        ])}>📄 Fichier ▾</button>
        <button className="btn primary" onClick={(e) => openCtx(e, [
          { label: "Ajouter une activité", icon: "➕", onClick: () => ajouterLigne(false) },
          { label: "Ajouter un domaine", icon: "📁", onClick: () => ajouterLigne(true) },
        ])}>➕ Ajouter ▾</button>
      </div>
      {lignes.length === 0 ? <Empty icone="🗂️" titre="Programmation vide" sous="Ajoutez des domaines et activités répartis sur les 5 périodes." /> :
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead><tr><th style={{ minWidth: 150 }}>Domaine / Activité</th>{[1, 2, 3, 4, 5].map((p) => <th key={p}>P{p}</th>)}<th></th></tr></thead>
            <tbody>
              {lignes.map((l, idx) => {
                const couleurNom = l.estDomaine ? couleurDomaine(l) : couleurParent(idx);
                const matiereDomaine = l.estDomaine && MATIERES.includes(l.label);
                const teinte = couleurNom ? couleurHex[couleurNom] : undefined;
                const survol = overId === l.id && dragId !== l.id;
                const dropProps = {
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOverId(l.id); },
                  onDragLeave: () => setOverId((o) => o === l.id ? null : o),
                  onDrop: (e: React.DragEvent) => { e.preventDefault(); if (dragId) reordonner(dragId, l.id); setDragId(null); setOverId(null); },
                };
                const handle = {
                  draggable: true,
                  onDragStart: (e: React.DragEvent) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", l.id); setDragId(l.id); },
                  onDragEnd: () => { setDragId(null); setOverId(null); },
                  title: "Glisser pour déplacer", style: { cursor: "grab", color: "var(--text-2)", userSelect: "none" } as React.CSSProperties,
                };
                const ctx = (e: React.MouseEvent) => openCtx(e, [
                  { label: "Ajouter une activité ici", icon: "➕", onClick: () => insererApres(l.id, false) },
                  { label: "Ajouter un domaine ici", icon: "📁", onClick: () => insererApres(l.id, true) },
                  { label: "Supprimer cette ligne", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(l.id) },
                ]);
                const borderTop = survol ? "2px solid var(--accent)" : undefined;
                if (l.estDomaine) return (
                  <tr key={l.id} {...dropProps} onContextMenu={ctx} style={{ background: teinte + "22", fontWeight: 700, borderTop }}>
                    <td colSpan={6}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span {...handle}>⠿</span>
                        <button title={matiereDomaine ? "Couleur de la matière (Réglages)" : "Changer la couleur"}
                          onClick={() => !matiereDomaine && cycleCouleur(l)}
                          style={{ width: 16, height: 16, borderRadius: 4, background: teinte, border: "none",
                            cursor: matiereDomaine ? "default" : "pointer", flexShrink: 0 }} />
                        <span>📁</span>
                        <DomaineLabel label={l.label} onChange={(v) => majLigne(l.id, { label: v })} />
                      </div>
                    </td>
                    <td><button className="btn ghost sm" onClick={() => supprimer(l.id)} aria-label="Supprimer">🗑</button></td>
                  </tr>
                );
                return (
                  <tr key={l.id} {...dropProps} onContextMenu={ctx}
                    style={{ background: teinte ? teinte + "10" : undefined, borderTop, borderLeft: teinte ? `3px solid ${teinte}` : undefined }}>
                    <td style={{ verticalAlign: "top" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                        <span {...handle} style={{ ...handle.style, paddingTop: 6 }}>⠿</span>
                        <AutoText value={l.label} onChange={(v) => majLigne(l.id, { label: v })} />
                      </div>
                    </td>
                    {PCOLS.map((c) => {
                      const faite = estFaite(l, c);
                      return (
                        <td key={c} style={{ minWidth: 150, verticalAlign: "top" }}>
                          <div style={{ position: "relative" }}>
                            <button title={faite ? "Marquer non fait" : "Marquer fait"} onClick={() => toggleFaite(l, c)}
                              style={{ position: "absolute", top: 4, right: 4, border: "none", background: "none", cursor: "pointer",
                                color: faite ? "var(--green)" : "var(--text-2)", fontSize: 14, zIndex: 1 }}>{faite ? "✓" : "○"}</button>
                            <AutoText value={l[c]} onChange={(v) => majLigne(l.id, { [c]: v } as Partial<Ligne>)}
                              style={{ paddingRight: 24, textDecoration: faite ? "line-through" : "none", color: faite ? "var(--text-2)" : undefined }} />
                            {seqIdsDe(l, c).map((sid) => {
                              const s = sequences?.find((x) => x.id === sid);
                              const comp = competenceDe(sid);
                              return s ? <div key={sid} style={{ marginTop: 3, textDecoration: faite ? "line-through" : "none", opacity: faite ? 0.55 : 1 }}>
                                <span className="chip" style={{ fontSize: 11, cursor: "pointer" }} title="Ouvrir la séquence"
                                  onClick={() => nav(`/sequences/${sid}`)}>📚 {s.titre} ↗</span>
                                {comp && <div style={{ fontSize: 10.5, color: "var(--text-2)", marginTop: 1 }}>🎯 {comp}</div>}
                              </div> : null;
                            })}
                            <button className="btn ghost sm" style={{ marginTop: 3, fontSize: 11 }} onClick={() => setLien({ ligneId: l.id, col: c })}>
                              + séquence{seqIdsDe(l, c).length ? ` (${seqIdsDe(l, c).length})` : ""}
                            </button>
                          </div>
                        </td>
                      );
                    })}
                    <td><button className="btn ghost sm" onClick={() => supprimer(l.id)} aria-label="Supprimer">🗑</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>}

      {lien && ligneLien && (
        <LierSequences sequences={sequences ?? []} selection={seqIdsDe(ligneLien, lien.col)}
          onClose={() => setLien(null)}
          onValider={(ids) => { setSeqIds(lien.ligneId, lien.col, ids); setLien(null); }} />
      )}
      {partagerOuvert && (
        <EnvoyerProgModal annee={annee} peutEnvoyer={lignes.length > 0}
          onClose={() => setPartagerOuvert(false)} />
      )}
    </>
  );
}

// Partage chiffré de la programmation finale : envoyer (à un ami) + recevoir.
// Envoi chiffré de la programmation de l'année. La réception est centralisée
// dans l'onglet Amis (« Boîte aux lettres ») : les programmations reçues
// apparaissent automatiquement comme colonnes de comparaison.
function EnvoyerProgModal({ annee, peutEnvoyer, onClose }: {
  annee: string; peutEnvoyer: boolean; onClose: () => void;
}) {
  const { data: amis } = useAsync(() => api.amisList(), []);
  const [msg, setMsg] = React.useState("");
  const [enCours, setEnCours] = React.useState("");
  const [envoyes, setEnvoyes] = React.useState<Record<string, boolean>>({});
  const envoyer = async (a: Ami) => {
    setEnCours(a.id); setMsg("");
    try { await api.programmationPartager(a.id, annee); setEnvoyes((s) => ({ ...s, [a.id]: true })); setMsg(`Envoyée à ${a.nom || "cet ami"} ✅`); }
    catch (e) { setMsg(String(e)); }
    finally { setEnCours(""); }
  };
  return (
    <Modal titre={`Partager la programmation ${annee}`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {(amis?.length ?? 0) === 0
        ? <Empty icone="🤝" titre="Aucun ami" sous="Ajoutez un collègue dans l'onglet Amis." />
        : <>
            {!peutEnvoyer && <p className="meta" style={{ marginTop: 0 }}>Ajoutez au moins une ligne pour pouvoir envoyer.</p>}
            <p className="meta" style={{ marginTop: 0 }}>Chiffrée de bout en bout. Elle arrivera dans la boîte aux lettres du destinataire.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {amis!.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--bg)" }}>
                  <span style={{ fontSize: 18 }} aria-hidden="true">{a.verifie ? "✅" : "👤"}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{a.nom || "Sans nom"}</span>
                  <button className="btn primary sm" disabled={enCours === a.id || !peutEnvoyer} onClick={() => envoyer(a)}>
                    {enCours === a.id ? "…" : envoyes[a.id] ? "✓ Renvoyer" : "📤 Envoyer"}</button>
                </div>
              ))}
            </div>
          </>}
      {msg && <div style={{ marginTop: 10, fontSize: 13 }} role="status">{msg}</div>}
    </Modal>
  );
}

function LierSequences({ sequences, selection, onClose, onValider }: {
  sequences: Sequence[]; selection: string[]; onClose: () => void; onValider: (ids: string[]) => void;
}) {
  const [sel, setSel] = React.useState<string[]>(selection);
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <Modal titre="Lier des séquences" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => onValider(sel)}>Valider</button></>}>
      {sequences.length === 0 ? <Empty icone="📚" titre="Aucune séquence" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sequences.map((s) => (
            <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: "var(--bg)" }}>
              <input type="checkbox" checked={sel.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="dot" style={{ background: couleurHex[s.couleur] }} />
              <span style={{ flex: 1 }}>{s.titre}</span>
              <span className="meta">{s.matiere} P{s.periode}</span>
            </label>
          ))}
        </div>}
    </Modal>
  );
}

// ── EDT type + bilan vs volumes officiels ──────────────────────────────────
interface Slot { id: string; jour: string; heureDebut: string; heureFin: string; titre: string; couleur: string }
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const minHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const EDT_H_DEBUT = 8, EDT_H_FIN = 18, EDT_H_PX = 56;

// Répartit en colonnes (lanes) les slots qui se chevauchent dans un jour.
function layoutSlots(ss: Slot[]): Map<string, { lane: number; lanes: number }> {
  const res = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...ss].sort((a, b) => toMin(a.heureDebut) - toMin(b.heureDebut) || toMin(a.heureFin) - toMin(b.heureFin));
  let i = 0;
  while (i < sorted.length) {
    let clusterEnd = toMin(sorted[i].heureFin); const cluster = [sorted[i]]; let j = i;
    while (j + 1 < sorted.length && toMin(sorted[j + 1].heureDebut) < clusterEnd) {
      j++; cluster.push(sorted[j]); clusterEnd = Math.max(clusterEnd, toMin(sorted[j].heureFin));
    }
    const laneEnds: number[] = [];
    for (const c of cluster) {
      let lane = laneEnds.findIndex((e) => e <= toMin(c.heureDebut));
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = toMin(c.heureFin); res.set(c.id, { lane, lanes: 0 });
    }
    for (const c of cluster) res.get(c.id)!.lanes = laneEnds.length;
    i = j + 1;
  }
  return res;
}

function SlotForm({ slot, onClose, onSave, onDelete }: {
  slot: Slot; onClose: () => void; onSave: (s: Slot) => void; onDelete: () => void;
}) {
  const [s, setS] = React.useState<Slot>(slot);
  const up = (p: Partial<Slot>) => setS((c) => ({ ...c, ...p }));
  return (
    <Modal titre="Créneau type" onClose={onClose}
      footer={<>
        <button className="btn danger" onClick={onDelete}>Supprimer</button>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={() => onSave(s)}>Enregistrer</button>
      </>}>
      <div className="row">
        <div className="field"><label>Jour</label>
          <Select value={s.jour} onChange={(e) => up({ jour: e.target.value })}>{JOURS.map((j) => <option key={j}>{j}</option>)}</Select></div>
        <div className="field"><label>Début</label><Input type="time" value={s.heureDebut} onChange={(e) => up({ heureDebut: e.target.value })} /></div>
        <div className="field"><label>Fin</label><Input type="time" value={s.heureFin} onChange={(e) => up({ heureFin: e.target.value })} /></div>
      </div>
      <div className="field"><label>Matière</label>
        <Select value={s.titre} onChange={(e) => up({ titre: e.target.value, couleur: couleurPourMatiere(e.target.value) })}>
          {MATIERES.map((m) => <option key={m}>{m}</option>)}
        </Select></div>
    </Modal>
  );
}

interface EdtDrag { id: string; jourIndex: number; startMin: number; durMin: number; grabOffMin: number }

function EdtType({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.edtTypiqueList(), []);
  const edt = data?.find((e) => e.annee === annee);
  const [niveau, setNiveau] = React.useState("");
  const [edit, setEdit] = React.useState<Slot | null>(null);
  const [deplacer, setDeplacer] = React.useState(false);
  const [drag, setDrag] = React.useState<EdtDrag | null>(null);
  const dragRef = React.useRef<EdtDrag | null>(null);
  const colsRef = React.useRef<HTMLDivElement>(null);
  const majDrag = (d: EdtDrag | null) => { dragRef.current = d; setDrag(d); };

  // État des créneaux avec annuler/rétablir (⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y).
  const { present: slots, reset: chargerSlots, commit: persister } = useHistorique<Slot[]>([], (next) => {
    const e: EdtTypique = edt ? { ...edt, slotsJson: JSON.stringify(next) } : { id: newId(), annee, slotsJson: JSON.stringify(next) };
    api.edtTypiqueSave(e).then(() => { if (!edt) reload(); });
  });
  React.useEffect(() => { try { chargerSlots(edt ? JSON.parse(edt.slotsJson) : []); } catch { chargerSlots([]); } }, [edt?.id]);
  React.useEffect(() => { api.settingGet("niveauClasse").then((v) => setNiveau(v ?? "")); }, []);
  const upsert = (s: Slot) => persister(slots.some((x) => x.id === s.id) ? slots.map((x) => x.id === s.id ? s : x) : [...slots, s]);
  const supprimer = (id: string) => persister(slots.filter((s) => s.id !== id));

  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => {
    telechargerTexte(`edt-type-${annee}.json`, JSON.stringify({ annee, slots }, null, 2));
  };
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      const arr: Slot[] = Array.isArray(b) ? b : (b.slots ?? []);
      if (!Array.isArray(arr)) throw new Error();
      persister(arr.map((s) => ({ ...s, id: s.id || newId() })));
    } catch { toast("Fichier EDT type invalide.", { icone: "⚠️" }); }
  };
  const imprimer = () => {
    const hex = (c: string) => couleurHex[c] || couleurHex.blue;
    const fmtD = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return mm ? `${h}h${String(mm).padStart(2, "0")}min` : `${h}h`; };
    // Lignes = intervalles horaires distincts (debut–fin), triés.
    const ivMap = new Map<string, { debut: string; fin: string }>();
    for (const s of slots) ivMap.set(`${s.heureDebut}-${s.heureFin}`, { debut: s.heureDebut, fin: s.heureFin });
    const intervalles = [...ivMap.values()].sort((a, b) => a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin));

    const bloc = (s: Slot) =>
      `<div style="background:${hex(s.couleur)}2b;border-radius:6px;padding:6px 4px;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;line-height:1.25;color:#1f2937">${escapeHtml(s.titre)}</div>`;
    const cell = (jour: string, iv: { debut: string; fin: string }) => {
      const ss = slots.filter((s) => s.jour === jour && s.heureDebut === iv.debut && s.heureFin === iv.fin).sort((a, b) => a.titre.localeCompare(b.titre));
      if (ss.length === 0) return `<td></td>`;
      if (ss.length === 1) return `<td style="padding:3px">${bloc(ss[0])}</td>`;
      return `<td style="padding:3px"><div style="display:flex;gap:3px">${ss.map((s) => `<div style="flex:1">${bloc(s)}</div>`).join("")}</div></td>`;
    };

    const head = `<tr><th style="width:84px">Horaire</th>${JOURS.map((j) => `<th style="text-align:center">${j}</th>`).join("")}</tr>`;
    const rows = intervalles.map((iv) =>
      `<tr><td style="white-space:nowrap;font-weight:600;font-size:11px;background:#f3f4f6">${iv.debut}–${iv.fin}</td>${JOURS.map((j) => cell(j, iv)).join("")}</tr>`).join("");

    // Légende : durée totale par intitulé, avec sa couleur.
    const couleurTitre: Record<string, string> = {};
    for (const s of slots) couleurTitre[s.titre] = s.couleur;
    const legende = Object.entries(minutesParMatiere).sort((a, b) => b[1] - a[1])
      .map(([titre, min]) => `<span style="display:inline-block;background:${hex(couleurTitre[titre] || "blue")}2b;border:1px solid ${hex(couleurTitre[titre] || "blue")};border-radius:12px;padding:3px 10px;margin:3px;font-size:12px;color:#1f2937">${escapeHtml(titre)} (${fmtD(min)})</span>`).join(" ");

    const html =
      `<style>@page { size: A4 landscape; }</style>` +
      `<h1 style="text-align:center;margin:0 0 10px">EDT ${escapeHtml(annee)}${niveau ? " — " + escapeHtml(niveau) : ""}</h1>` +
      `<table style="table-layout:fixed">${head}${rows}</table>` +
      `<div style="margin-top:14px;font-weight:700">Répartition horaire :</div>` +
      `<div style="margin-top:4px">${legende}</div>`;
    printHTML(`EDT ${annee}`, html);
  };

  const heures = Array.from({ length: EDT_H_FIN - EDT_H_DEBUT + 1 }, (_, i) => EDT_H_DEBUT + i);
  const hauteur = (EDT_H_FIN - EDT_H_DEBUT) * EDT_H_PX;

  const creerA = (jour: string, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".cren-block")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const start = Math.max(EDT_H_DEBUT * 60, Math.min((EDT_H_FIN - 1) * 60,
      EDT_H_DEBUT * 60 + Math.floor(((e.clientY - rect.top) / EDT_H_PX) * 60 / 30) * 30));
    setEdit({ id: newId(), jour, heureDebut: minHHMM(start), heureFin: minHHMM(start + 60), titre: "Français", couleur: couleurPourMatiere("Français") });
  };

  // Glisser-déposer d'un créneau (mode « Déplacer »).
  const onDragStart = (s: Slot, e: React.MouseEvent) => {
    if (!deplacer) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabOffMin = (e.clientY - rect.top) / EDT_H_PX * 60;
    majDrag({ id: s.id, jourIndex: Math.max(0, JOURS.indexOf(s.jour)), startMin: toMin(s.heureDebut), durMin: toMin(s.heureFin) - toMin(s.heureDebut), grabOffMin });

    const onMove = (ev: MouseEvent) => {
      const cur = dragRef.current; const box = colsRef.current?.getBoundingClientRect();
      if (!cur || !box) return;
      const colW = (box.width - 44) / 5;
      const ji = Math.max(0, Math.min(4, Math.floor((ev.clientX - box.left - 44) / colW)));
      const yMin = EDT_H_DEBUT * 60 + (ev.clientY - box.top) / EDT_H_PX * 60 - cur.grabOffMin;
      const start = Math.max(EDT_H_DEBUT * 60, Math.min(EDT_H_FIN * 60 - cur.durMin, Math.round(yMin / 15) * 15));
      majDrag({ ...cur, jourIndex: ji, startMin: start });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      const d = dragRef.current; majDrag(null);
      if (!d) return;
      const s2 = slots.find((x) => x.id === d.id); if (!s2) return;
      const nj = JOURS[d.jourIndex], nd = minHHMM(d.startMin), nf = minHHMM(d.startMin + d.durMin);
      if (nj !== s2.jour || nd !== s2.heureDebut) {
        persister(slots.map((x) => x.id === d.id ? { ...x, jour: nj, heureDebut: nd, heureFin: nf } : x));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  // Bilan minutes/matière
  const minutesParMatiere: Record<string, number> = {};
  for (const s of slots) minutesParMatiere[s.titre] = (minutesParMatiere[s.titre] ?? 0) + (toMin(s.heureFin) - toMin(s.heureDebut));
  const officiel = HEURES_PROGRAMME[niveau] ?? {};
  const matieresBilan = Array.from(new Set([...Object.keys(officiel), ...Object.keys(minutesParMatiere).filter((m) => MATIERES.includes(m))])).sort();

  return (
    <>
      <div className="toolbar"><AnneeSelect annee={annee} setAnnee={setAnnee} />
        <div className="spacer" />
        {slots.length > 0 && <button className="btn" onClick={() => setDeplacer((v) => !v)}
          style={deplacer ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}
          title="Glisser les créneaux pour les déplacer">{deplacer ? "✋ Déplacement activé" : "✋ Déplacer"}</button>}
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        <button className="btn" onClick={(e) => openCtx(e, [
          ...(slots.length > 0 ? [{ label: "Imprimer (PDF)", icon: "🖨", onClick: imprimer }] : []),
          ...(slots.length > 0 ? [{ label: "Exporter (fichier)", icon: "⬇️", onClick: exporter }] : []),
          { label: "Importer (fichier)", icon: "⬆️", onClick: () => fileRef.current?.click() },
        ])}>📄 Fichier ▾</button>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", margin: "-8px 0 12px" }}>
        {deplacer ? "✋ Glissez un créneau pour le déplacer (jour et horaire)." : "Cliquez sur une plage vide pour ajouter un créneau · clic droit pour dupliquer/supprimer."}</div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* En-têtes jours */}
        <div style={{ display: "grid", gridTemplateColumns: `44px repeat(5, 1fr)`, borderBottom: "1px solid var(--border)" }}>
          <div />
          {JOURS.map((j) => <div key={j} style={{ textAlign: "center", padding: "8px 0", borderLeft: "1px solid var(--border)", background: "var(--panel-2)", fontWeight: 700, fontSize: 13 }}>{j}</div>)}
        </div>
        {/* Grille */}
        <div ref={colsRef} style={{ display: "grid", gridTemplateColumns: `44px repeat(5, 1fr)` }}>
          <div style={{ position: "relative", height: hauteur }}>
            {heures.map((h, i) => <div key={h} style={{ position: "absolute", top: i * EDT_H_PX - 7, right: 6, fontSize: 11, color: "var(--text-2)" }}>{h}h</div>)}
          </div>
          {JOURS.map((j, ji) => {
            const dayNormal = slots.filter((s) => s.jour === j && s.id !== drag?.id);
            const lay = layoutSlots(dayNormal);
            const dragged = drag && drag.jourIndex === ji ? slots.find((s) => s.id === drag.id) : null;
            return (
              <div key={j} onClick={(e) => { if (!deplacer) creerA(j, e); }}
                style={{ position: "relative", height: hauteur, borderLeft: "1px solid var(--border)", cursor: deplacer ? "default" : "pointer" }}>
                {heures.map((_, i) => <div key={i} style={{ position: "absolute", top: i * EDT_H_PX, left: 0, right: 0, borderTop: "1px solid var(--border)", opacity: 0.5 }} />)}
                {dayNormal.map((s) => {
                  const top = (toMin(s.heureDebut) - EDT_H_DEBUT * 60) / 60 * EDT_H_PX;
                  const h = Math.max(20, (toMin(s.heureFin) - toMin(s.heureDebut)) / 60 * EDT_H_PX);
                  const { lane, lanes } = lay.get(s.id) || { lane: 0, lanes: 1 };
                  return (
                    <div key={s.id} className="cren-block"
                      onMouseDown={(e) => onDragStart(s, e)}
                      onClick={(e) => { e.stopPropagation(); if (!deplacer) setEdit(s); }}
                      onContextMenu={(e) => openCtx(e, [
                        { label: "Modifier", icon: "✏️", onClick: () => setEdit(s) },
                        { label: "Dupliquer", icon: "📑", onClick: () => persister([...slots, { ...s, id: newId() }]) },
                        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(s.id) },
                      ])}
                      style={{ position: "absolute", top, height: h - 2, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`,
                        background: couleurHex[couleurPourMatiere(s.titre)] || couleurHex.blue, borderRadius: 7, color: "#fff", padding: "3px 6px",
                        overflow: "hidden", fontSize: 11, lineHeight: 1.25, boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                        outline: deplacer ? "2px dashed rgba(255,255,255,.7)" : "none", cursor: deplacer ? "grab" : "pointer", userSelect: "none" }}>
                      <div style={{ opacity: 0.9 }}>{s.heureDebut}–{s.heureFin}</div>
                      <div style={{ fontWeight: 700 }}>{s.titre}</div>
                    </div>
                  );
                })}
                {dragged && (() => {
                  const top = (drag!.startMin - EDT_H_DEBUT * 60) / 60 * EDT_H_PX;
                  const h = Math.max(20, drag!.durMin / 60 * EDT_H_PX);
                  return (
                    <div className="cren-block" style={{ position: "absolute", top, height: h - 2, left: 3, width: "calc(100% - 6px)",
                      background: couleurHex[couleurPourMatiere(dragged.titre)] || couleurHex.blue, borderRadius: 7, color: "#fff", padding: "3px 6px",
                      overflow: "hidden", fontSize: 11, lineHeight: 1.25, boxShadow: "0 4px 14px rgba(0,0,0,.35)", opacity: 0.92, zIndex: 10, userSelect: "none" }}>
                      <div style={{ opacity: 0.9 }}>{minHHMM(drag!.startMin)}–{minHHMM(drag!.startMin + drag!.durMin)}</div>
                      <div style={{ fontWeight: 700 }}>{dragged.titre}</div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {edit && <SlotForm slot={edit} onClose={() => setEdit(null)}
        onSave={(s) => { upsert(s); setEdit(null); }} onDelete={() => { supprimer(edit.id); setEdit(null); }} />}

      {/* Bilan hebdomadaire vs volumes officiels */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>📊 Bilan hebdomadaire {niveau ? `(${niveau})` : ""}</h3>
        {!niveau ? <p style={{ color: "var(--text-2)" }}>Renseignez le niveau de la classe dans les Réglages pour comparer aux volumes officiels.</p> :
          <table className="tbl">
            <thead><tr><th>Matière</th><th>Planifié</th><th>Officiel</th><th>Écart</th></tr></thead>
            <tbody>
              {matieresBilan.map((m) => {
                const planMin = minutesParMatiere[m] ?? 0;
                const refH = officiel[m] ?? 0;
                const ecartMin = planMin - refH * 60;
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td>{(planMin / 60).toFixed(1)} h</td>
                    <td>{refH ? refH.toFixed(1) + " h" : "—"}</td>
                    <td style={{ color: Math.abs(ecartMin) <= 15 ? "var(--green)" : ecartMin < 0 ? "var(--danger)" : "var(--orange)", fontWeight: 600 }}>
                      {refH ? (ecartMin >= 0 ? "+" : "") + (ecartMin / 60).toFixed(1) + " h" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
      </div>
    </>
  );
}

// ── Travail de cycle : comparaison des programmations entre collègues ────────
const NIVEAUX_ORDRE = ["TPS", "PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6e"];
const PALETTE_COLLEGUES = ["teal", "orange", "pink", "green", "indigo", "brown", "cyan"];
const rangNiveau = (n: string) => { const i = NIVEAUX_ORDRE.findIndex((x) => n.toUpperCase().includes(x)); return i < 0 ? 99 : i; };
const initiales = (col: { mienne: boolean; enseignant: string }) =>
  col.mienne ? "★" : (col.enseignant.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase() || "?");

// Contenu réel d'une activité : son intitulé + ce qui est prévu par période
// (texte de la case + séquences reliées).
interface ActCell { p: number; texte: string; seqs: string[] }
interface Activite { label: string; cellules: ActCell[] }

// Parse lignesJSON → domaines { clé → { label, activités détaillées } }.
function parseDomaines(lignesJson: string): { ordre: string[]; labels: Record<string, string>; acts: Record<string, Activite[]> } {
  let lignes: Ligne[] = []; try { lignes = JSON.parse(lignesJson); } catch { /* */ }
  const ordre: string[] = []; const labels: Record<string, string> = {}; const acts: Record<string, Activite[]> = {};
  let courant: string | null = null;
  for (const l of lignes) {
    if (l.estDomaine) {
      const lab = (l.label || "").trim(); if (!lab) { courant = null; continue; }
      const cle = lab.toLowerCase(); courant = cle;
      if (!labels[cle]) { labels[cle] = lab; ordre.push(cle); acts[cle] = []; }
    } else if (courant) {
      const cellules: ActCell[] = [];
      [l.p1, l.p2, l.p3, l.p4, l.p5].forEach((texte, i) => {
        const p = i + 1;
        const seqs = l.seqs?.[`p${p}`] ?? [];
        const t = (texte || "").trim();
        if (t || seqs.length) cellules.push({ p, texte: t, seqs });
      });
      const label = (l.label || "").trim();
      if (label || cellules.length) (acts[courant] ??= []).push({ label, cellules });
    }
  }
  return { ordre, labels, acts };
}

function TravailDeCycle({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const seqTitre: Record<string, string> = {};
  for (const s of sequences ?? []) seqTitre[s.id] = s.titre;
  const [moi, setMoi] = React.useState({ niveau: "", nom: "" });
  const [pending, setPending] = React.useState<{ lignesJson: string; annee: string } | null>(null);
  const [tag, setTag] = React.useState({ niveau: "CP", enseignant: "" });
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    Promise.all([api.settingGet("niveauClasse"), api.settingGet("enseignantNom")]).then(([n, nm]) => setMoi({ niveau: n ?? "", nom: nm ?? "" }));
  }, []);

  const mienne = (data ?? []).find((p) => p.annee === annee && !p.estImportee);
  const importees = (data ?? []).filter((p) => p.estImportee && p.annee === annee);
  const colonnes = [
    ...(mienne ? [{ prog: mienne, niveau: moi.niveau || "Ma classe", enseignant: "Moi", mienne: true }] : []),
    ...importees.map((p) => ({ prog: p, niveau: p.niveau || "?", enseignant: p.enseignant || "Collègue", mienne: false })),
  ].sort((a, b) => rangNiveau(a.niveau) - rangNiveau(b.niveau));

  const parsed = colonnes.map((c) => ({ col: c, dom: parseDomaines(c.prog.lignesJson) }));
  // Union ordonnée des domaines (tri alpha).
  const labels: Record<string, string> = {};
  for (const { dom } of parsed) for (const cle of dom.ordre) if (!labels[cle]) labels[cle] = dom.labels[cle];
  const domaines = Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b]));

  const exporter = () => {
    if (!mienne) return;
    const bundle = { annee: mienne.annee, lignesJson: mienne.lignesJson, niveau: moi.niveau, enseignant: moi.nom || "Moi" };
    telechargerTexte(`programmation-${moi.niveau || "classe"}-${annee}.json`, JSON.stringify(bundle, null, 2));
  };
  const onFichier = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      setPending({ lignesJson: b.lignesJson || "[]", annee: b.annee || annee });
      setTag({ niveau: b.niveau || "CP", enseignant: b.enseignant || file.name.replace(/\.json$/, "") });
    } catch { toast("Fichier de programmation invalide.", { icone: "⚠️" }); }
  };
  const confirmerImport = async () => {
    if (!pending) return;
    await api.programmationFinaleSave({ id: newId(), annee: pending.annee, lignesJson: pending.lignesJson, niveau: tag.niveau, enseignant: tag.enseignant.trim() || "Collègue", estImportee: true });
    setPending(null); reload();
  };

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} />
        <span className="chip">Comparaison par domaine</span>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFichier(f); e.target.value = ""; }} />
        <button className="btn" onClick={exporter} disabled={!mienne}>⬇️ Exporter ma programmation</button>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>⬆️ Importer un collègue</button>
      </div>
      {colonnes.length === 0 ? <Empty icone="👥" titre="Aucune programmation" sous="Créez votre programmation, puis importez celles de vos collègues pour comparer par domaine." /> :
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="tbl" style={{ minWidth: 200 + colonnes.length * 220 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160, position: "sticky", left: 0, background: "var(--panel-2)" }}>Domaine</th>
                {parsed.map(({ col }, i) => {
                  const c = col.mienne ? "var(--accent)" : couleurHex[PALETTE_COLLEGUES[i % PALETTE_COLLEGUES.length]];
                  return (
                    <th key={i} style={{ minWidth: 200, borderTop: `3px solid ${c}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 30, height: 30, borderRadius: "50%", background: c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{initiales(col)}</span>
                        <div style={{ textTransform: "none" }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{col.enseignant}</div>
                          <div className="meta" style={{ fontSize: 11 }}>{col.niveau}</div>
                        </div>
                        {!col.mienne && <button className="btn ghost sm" onClick={() => api.programmationFinaleDelete(col.prog.id).then(reload)} aria-label="Supprimer">🗑</button>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {domaines.map((cle) => (
                <tr key={cle}>
                  <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--panel)" }}>📁 {labels[cle]}</td>
                  {parsed.map(({ dom }, i) => {
                    const a = dom.acts[cle] ?? [];
                    return <td key={i} style={{ verticalAlign: "top", fontSize: 12.5 }}>
                      {a.length === 0 ? <span style={{ color: "var(--text-2)" }}>—</span> :
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {a.map((act, k) => (
                            <div key={k}>
                              {act.label && <div style={{ fontWeight: 600 }}>{act.label}</div>}
                              {act.cellules.length > 0 && (
                                <ul style={{ margin: "2px 0 0", paddingLeft: 15 }}>
                                  {act.cellules.map((cel) => (
                                    <li key={cel.p} style={{ marginBottom: 3 }}>
                                      <b>P{cel.p}</b>{cel.texte ? ` · ${cel.texte}` : ""}
                                      {cel.seqs.filter((id) => seqTitre[id]).map((id) => (
                                        <span key={id} className="chip" style={{ marginLeft: 4, fontSize: 10.5 }}>📚 {seqTitre[id]}</span>
                                      ))}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      {pending && (
        <Modal titre="Programmation d'un collègue" onClose={() => setPending(null)}
          footer={<><button className="btn" onClick={() => setPending(null)}>Annuler</button>
            <button className="btn primary" disabled={!tag.enseignant.trim()} onClick={confirmerImport}>Importer</button></>}>
          <p style={{ marginTop: 0, color: "var(--text-2)", fontSize: 13 }}>Indiquez le niveau et le nom de l'enseignant pour ce tableau.</p>
          <div className="row">
            <div className="field"><label>Niveau</label>
              <Select value={tag.niveau} onChange={(e) => setTag({ ...tag, niveau: e.target.value })}>{NIVEAUX_ORDRE.map((n) => <option key={n}>{n}</option>)}</Select></div>
            <div className="field"><label>Enseignant</label>
              <Input value={tag.enseignant} placeholder="Nom du collègue" onChange={(e) => setTag({ ...tag, enseignant: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
