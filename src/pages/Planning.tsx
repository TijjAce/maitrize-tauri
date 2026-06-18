import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import { api, Creneau, Seance, Sequence, MATIERES, couleurHex, couleurPourMatiere, joursFeriesFR, newId } from "../api";
import { Modal, Field, Input, Select, Confirm, useAsync, useSegmentNav } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { SeanceReadView } from "./SequenceDetail";
import { printHTML, escapeHtml } from "../print";
import { labelCourt, CompetenceSelectionnee } from "../components/CompetenceTree";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const JOURS7 = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const H_DEBUT = 8, H_FIN = 18, H_PX = 56;

function lundiDe(d: Date): Date {
  const x = new Date(d); const j = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - j); x.setHours(0, 0, 0, 0); return x;
}
// Jour affiché à l'ouverture du planning : aujourd'hui, ou le lendemain
// s'il est passé 18h, puis lundi si on tombe un week-end.
function jourPlanningInitial(): Date {
  const now = new Date();
  const d = new Date(now); d.setHours(0, 0, 0, 0);
  if (now.getHours() >= 18) d.setDate(d.getDate() + 1);
  const jour = d.getDay(); // 0 = dimanche, 6 = samedi
  if (jour === 6) d.setDate(d.getDate() + 2);
  else if (jour === 0) d.setDate(d.getDate() + 1);
  return d;
}
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtJour = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const minToHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

interface DragState { id: string; dayIndex: number; startMin: number; durMin: number; grabOffMin: number; }

function layoutJour(cs: Creneau[]): Map<string, { lane: number; lanes: number }> {
  const res = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...cs].sort((a, b) => toMin(a.heureDebut) - toMin(b.heureDebut) || toMin(a.heureFin) - toMin(b.heureFin));
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

const VUES = ["jour", "semaine", "mois"] as const;
type Vue = typeof VUES[number];

export default function Planning() {
  const [vue, setVue] = React.useState<Vue>("jour");
  const [ancre, setAncre] = React.useState(jourPlanningInitial);
  useSegmentNav(VUES, vue, setVue);

  // Plage de données chargée selon la vue.
  const { debut, fin, jours } = React.useMemo(() => {
    if (vue === "jour") return { debut: iso(ancre), fin: iso(ancre), jours: [new Date(ancre)] };
    if (vue === "semaine") {
      const l = lundiDe(ancre);
      const js = JOURS.map((_, i) => { const d = new Date(l); d.setDate(d.getDate() + i); return d; });
      return { debut: iso(js[0]), fin: iso(js[4]), jours: js };
    }
    // mois
    const first = new Date(ancre.getFullYear(), ancre.getMonth(), 1);
    const last = new Date(ancre.getFullYear(), ancre.getMonth() + 1, 0);
    return { debut: iso(lundiDe(first)), fin: iso(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 7)), jours: [] as Date[] };
  }, [vue, ancre]);

  const { data: creneaux, reload } = useAsync(() => api.creneauxList(debut, fin), [debut, fin]);
  const { data: seances } = useAsync(() => api.seancesList(), []);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const { data: edts } = useAsync(() => api.edtTypiqueList(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);

  // Anniversaires indexés par « MM-JJ » (toutes années confondues).
  const anniversaires = React.useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const e of eleves ?? []) {
      const d = new Date(e.dateNaissance);
      if (!e.dateNaissance || Number.isNaN(d.getTime())) continue;
      const cle = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      (m[cle] ??= []).push(e.nom || "Élève");
    }
    return m;
  }, [eleves]);
  const [edit, setEdit] = React.useState<Creneau | null>(null);
  const [del, setDel] = React.useState<Creneau | null>(null);
  const [voirSeance, setVoirSeance] = React.useState<Seance | null>(null);
  const [deplacer, setDeplacer] = React.useState(false);
  const navigate = useNavigate();

  // Tap sur un créneau : fiche de la séance liée, sinon édition du créneau.
  const ouvrirCreneau = (c: Creneau) => {
    const s = seances?.find((x) => x.id === c.seanceId);
    if (s) setVoirSeance(s); else setEdit(c);
  };

  const [vacances, setVacances] = React.useState<{ description: string; debut: string; fin: string }[]>([]);
  React.useEffect(() => {
    let annule = false;
    (async () => {
      const zone = (await api.settingGet("zoneVacances")) || "A";
      try { const v = await api.vacancesScolaires(zone); if (!annule) { setVacances(v); api.settingSet("vacancesCache", JSON.stringify(v)); } }
      catch { const cache = await api.settingGet("vacancesCache"); if (!annule && cache) { try { setVacances(JSON.parse(cache)); } catch { /* */ } } }
    })();
    return () => { annule = true; };
  }, []);
  const vacanceDe = (d: string) => vacances.find((v) => d >= v.debut && d < v.fin)?.description;
  const feries = React.useMemo(() => ({ ...joursFeriesFR(ancre.getFullYear()), ...joursFeriesFR(ancre.getFullYear() + 1) }), [ancre]);

  const decaler = (n: number) => {
    const d = new Date(ancre);
    if (vue === "jour") d.setDate(d.getDate() + n);
    else if (vue === "semaine") d.setDate(d.getDate() + n * 7);
    else d.setMonth(d.getMonth() + n);
    setAncre(d);
  };

  // Remplit les créneaux libres depuis l'EDT type : le jour affiché (vue jour)
  // ou toute la semaine (vue semaine).
  const generer = async () => {
    const jour = vue === "jour";
    const l = lundiDe(ancre);
    const semJours = JOURS.map((_, i) => { const d = new Date(l); d.setDate(d.getDate() + i); return d; });
    const refDate = jour ? ancre : l;
    const annee = (() => { const y = refDate.getFullYear(); return refDate.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`; })();
    const edt = (edts ?? []).find((e) => e.annee === annee) ?? (edts ?? [])[0];
    if (!edt) { toast("Aucun EDT type défini. Créez-le dans Organisation → EDT type.", { icone: "⚠️" }); return; }
    let slots: { jour: string; heureDebut: string; heureFin: string; titre: string }[] = [];
    try { slots = JSON.parse(edt.slotsJson); } catch { /* */ }
    if (slots.length === 0) { toast("L'EDT type est vide.", { icone: "⚠️" }); return; }
    if (!confirm(jour ? "Remplir les créneaux libres de ce jour depuis l'EDT type ?"
                      : "Remplir les créneaux libres de la semaine depuis l'EDT type ?")) return;
    const chevauche = (date: string, d: string, f: string) => (creneaux ?? []).some((c) =>
      c.date.slice(0, 10) === date && toMin(d) < toMin(c.heureFin) && toMin(c.heureDebut) < toMin(f));
    const ancreDi = ancre.getDay() - 1; // Lundi = 0 … Vendredi = 4 (week-end : hors plage)
    let poses = 0;
    for (const s of slots) {
      const di = JOURS.indexOf(s.jour); if (di < 0) continue;
      if (jour && di !== ancreDi) continue;
      const date = jour ? iso(ancre) : iso(semJours[di]);
      if (feries[date] || vacanceDe(date) || chevauche(date, s.heureDebut, s.heureFin)) continue;
      await api.creneauSave({ id: newId(), date, heureDebut: s.heureDebut, heureFin: s.heureFin, matiere: s.titre, couleur: couleurPourMatiere(s.titre), seanceId: null, atelierId: null, espaceId: null });
      poses++;
    }
    reload();
    if (poses === 0) toast(jour ? "Aucun créneau ajouté (jour déjà rempli, férié ou en vacances)."
                                : "Aucun créneau ajouté (déjà rempli, ou jours fériés/vacances).", { icone: "⚠️" });
  };

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const titre = vue === "jour" ? cap(ancre.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
    : vue === "semaine" ? `Semaine du ${fmtJour(jours[0])} au ${fmtJour(jours[4])}`
    : cap(ancre.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }));

  // Vue jour : rendu riche (grille horaire + contenu des séances) en HTML,
  // ouvert dans le navigateur (imprimable / PDF natif via ⌘P).
  const imprimerJourRiche = async () => {
    const jourCreneaux = (creneaux ?? []).filter((c) => c.date === iso(ancre)).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
    const reImg = /\[img:([^\]]+)\]/g;

    // Collecte toutes les images référencées, puis les lit en data URL.
    const noms = new Set<string>();
    const seqDe = (c: Creneau) => (seances ?? []).find((s) => s.id === c.seanceId);
    for (const c of jourCreneaux) {
      const s = seqDe(c); if (!s) continue;
      try { (JSON.parse(s.imagesDeroulement || "[]") as string[]).forEach((f) => noms.add(f)); } catch { /* */ }
      let m: RegExpExecArray | null; reImg.lastIndex = 0;
      while ((m = reImg.exec(s.deroulement || ""))) noms.add(m[1]);
      try { (JSON.parse(s.tableauDeroulement || "[]") as string[][]).forEach((row) => row.forEach((cell) => { let mm: RegExpExecArray | null; const re = /\[img:([^\]]+)\]/g; while ((mm = re.exec(cell))) noms.add(mm[1]); })); } catch { /* */ }
    }
    const urls: Record<string, string> = {};
    await Promise.all([...noms].map(async (n) => {
      try { const ext = (n.split(".").pop() || "png").toLowerCase(); urls[n] = `data:image/${ext};base64,${await api.fichierRead(n)}`; } catch { /* */ }
    }));
    const imgTag = (nom: string) => urls[nom] ? `<img alt="" src="" />` : "";
    const rendreCell = (cell: string) => {
      let out = "", last = 0, m: RegExpExecArray | null; const re = /\[img:([^\]]+)\]/g;
      while ((m = re.exec(cell))) { out += escapeHtml(cell.slice(last, m.index)) + imgTag(m[1]); last = m.index + m[0].length; }
      return out + escapeHtml(cell.slice(last));
    };

    // Helpers cahier-journal.
    const toMin = (h: string) => { const [a, b] = h.split(":").map(Number); return (a || 0) * 60 + (b || 0); };
    const hhmm = (h: string) => h.replace(":", "h");
    const dureeTxt = (a: string, b: string) => { const m = toMin(b) - toMin(a); if (m <= 0) return ""; if (m < 60) return `${m}min`; const hh = Math.floor(m / 60), mm = m % 60; return mm ? `${hh}h${String(mm).padStart(2, "0")}` : `${hh}h`; };
    const estPause = (m: string) => /r[ée]cr[ée]|pause|accueil|repas|cantine|sieste/i.test(m);
    const champ = (label: string, val: string) => val ? `<div class="f"><span class="fl">${label} :</span> ${val}</div>` : "";

    // Colonne d'un créneau (titre souligné + pastilles + champs).
    const rendreCol = (c: Creneau) => {
      const s = seqDe(c);
      const seq = s ? (sequences ?? []).find((q) => q.id === s.sequenceId) : undefined;
      const teinte = couleurHex[c.couleur] || couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue;
      const titre = s?.titre || c.matiere || "Créneau";
      const dur = dureeTxt(c.heureDebut, c.heureFin);
      const chips = `${c.matiere ? `<span class="chip" style="background:${teinte}26;color:${teinte}">${escapeHtml(c.matiere)}</span>` : ""}${dur ? `<span class="chip dur">⏱ ${dur}</span>` : ""}`;
      const head = `<div class="head"><span class="ttl">${escapeHtml(titre)}</span><span class="chips">${chips}</span></div>`;
      if (!s && estPause(c.matiere)) return `<div class="col">${head}</div>`;
      let comps: CompetenceSelectionnee[] = [];
      try { comps = s?.competences ? JSON.parse(s.competences) : []; } catch { /* */ }
      let grid: string[][] = [];
      try { grid = s?.tableauDeroulement ? JSON.parse(s.tableauDeroulement) : []; } catch { /* */ }
      let illus: string[] = [];
      try { illus = s?.imagesDeroulement ? JSON.parse(s.imagesDeroulement) : []; } catch { /* */ }
      const deroul = (s?.deroulement || "").replace(reImg, "").replace(/\[cite:[^\]]+\]/g, "").trim();
      const body = [
        seq ? champ("Séquence", escapeHtml([seq.titre, seq.annee, seq.periode ? "P" + seq.periode : ""].filter(Boolean).join(" · "))) : "",
        s?.objectifs ? champ("Objectifs", escapeHtml(s.objectifs)) : "",
        deroul ? `<div class="f"><span class="fl">Activités :</span></div><div class="txt">${escapeHtml(deroul)}</div>` : "",
        comps.length ? champ("Compétences", comps.map((x) => escapeHtml(labelCourt(x))).join("<br>")) : "",
        grid.length ? `<div class="fl" style="margin-top:4px">Tableau :</div><table>${grid.map((row, r) => `<tr>${row.map((cell) => r === 0 ? `<th>${escapeHtml(cell)}</th>` : `<td>${rendreCell(cell)}</td>`).join("")}</tr>`).join("")}</table>` : "",
        illus.length ? `<div class="imgs">${illus.map(imgTag).join("")}</div>` : "",
      ].join("");
      return `<div class="col">${head}${body ? `<div class="body">${body}</div>` : ""}</div>`;
    };

    // Rangées par horaire ; créneaux de même horaire côte à côte.
    const groupes: Creneau[][] = [];
    { let cur: Creneau[] = [], fin = -1;
      for (const c of jourCreneaux) {
        const d = toMin(c.heureDebut), f = toMin(c.heureFin);
        if (cur.length && d < fin) { cur.push(c); fin = Math.max(fin, f); }
        else { if (cur.length) groupes.push(cur); cur = [c]; fin = f; }
      }
      if (cur.length) groupes.push(cur); }

    const rangs = groupes.map((g) => {
      const pause = g.every((c) => !seqDe(c) && estPause(c.matiere));
      return `<div class="row${pause ? " rpause" : ""}">
        <div class="time">${escapeHtml(hhmm(g[0].heureDebut))}</div>
        <div class="cols">${g.map(rendreCol).join("")}</div>
      </div>`;
    }).join("");

    const css = `
      *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#1c2233;margin:0;padding:22px 26px}
      h1{font-size:22px;margin:0 0 2px;color:#23527c} .sub{color:#687087;font-size:11px;text-transform:uppercase;letter-spacing:1.2px;font-weight:600;margin-bottom:16px}
      .jour{border-bottom:1px solid #cfd6e4}
      .row{display:flex;border-top:1px solid #cfd6e4;page-break-inside:avoid}
      .row.rpause .cols{background:repeating-linear-gradient(45deg,#eef1f6,#eef1f6 8px,#e4e8f0 8px,#e4e8f0 16px)}
      .time{width:58px;flex:none;font-weight:700;color:#23527c;font-size:12.5px;padding:10px 8px;border-right:1px solid #cfd6e4}
      .cols{flex:1;display:flex;min-width:0}
      .col{flex:1;min-width:0;padding:9px 14px;border-left:1px solid #e6eaf2}
      .cols .col:first-child{border-left:none}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
      .ttl{font-weight:700;color:#23527c;text-decoration:underline;font-size:13px}
      .chips{flex:none;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
      .chip{border-radius:100px;padding:2px 10px;font-size:10.5px;font-weight:600;white-space:nowrap}
      .chip.dur{background:#eef1f6;color:#5a6072;font-weight:500}
      .body{margin-top:7px;font-size:11px;line-height:1.45}
      .f{margin-top:3px} .fl{font-weight:700;color:#23527c}
      .txt{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin-top:1px}
      table{border-collapse:collapse;width:100%;margin-top:3px;table-layout:fixed} th,td{border:1px solid #d7dbe6;padding:3px 5px;font-size:9.5px;vertical-align:top;text-align:left;overflow-wrap:anywhere;word-break:break-word} th{background:#f0f2f8}
      .imgs{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px} img{max-width:100%;max-height:150px;border-radius:5px;object-fit:contain}
      td img{max-height:110px}
      @media print{@page{margin:11mm}}
    `;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Planning — ${escapeHtml(titre)}</title><style>${css}</style></head>
      <body><h1>${escapeHtml(titre)}</h1><div class="sub">Planning du jour</div>
      <div class="jour">${rangs || '<div class="row"><div style="padding:20px;color:#687087">Aucun créneau ce jour-là.</div></div>'}</div>
      </body></html>`;
    await api.ouvrirHtml(html);
  };

  // Impression du planning : jour = HTML riche ; semaine = PDF natif (Aperçu).
  const imprimer = async () => {
    if (vue === "jour") { await imprimerJourRiche(); return; }
    const nettoie = (t: string) => (t || "").replace(/\[(img|cite):[^\]]+\]/g, "").replace(/\n{3,}/g, "\n\n").trim();
    const info = (c: Creneau) => {
      const s = (seances ?? []).find((x) => x.id === c.seanceId);
      return {
        heureDebut: c.heureDebut, heureFin: c.heureFin,
        matiere: c.matiere || "Créneau", seance: s?.titre ?? "",
        couleur: couleurHex[c.couleur] || couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue,
        objectifs: nettoie(s?.objectifs ?? ""),
        deroulement: nettoie(s?.deroulement ?? ""),
      };
    };
    // Regroupe les créneaux qui se chevauchent (même horaire) → affichés côte à côte.
    const toMin = (h: string) => { const [hh, mm] = h.split(":").map(Number); return (hh || 0) * 60 + (mm || 0); };
    type Info = ReturnType<typeof info>;
    const grouper = (cs: Info[]): Info[][] => {
      const groups: Info[][] = [];
      let cur: Info[] = [], fin = -1;
      for (const c of cs) {
        const d = toMin(c.heureDebut), f = toMin(c.heureFin);
        if (cur.length && d < fin) { cur.push(c); fin = Math.max(fin, f); }
        else { if (cur.length) groups.push(cur); cur = [c]; fin = f; }
      }
      if (cur.length) groups.push(cur);
      return groups;
    };
    const ds = jours; // ici : vue semaine (le jour est traité plus haut)
    const data = ds.map((d) => ({
      jour: d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
      rangs: grouper((creneaux ?? [])
        .filter((c) => c.date === iso(d))
        .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
        .map(info)),
    }));
    try {
      await api.imprimerPlanning(`Planning — ${titre}`, data);
    } catch {
      // Repli (hors macOS) : impression via la webview.
      const rows = data.flatMap((j) => [
        ds.length > 1 ? `<tr><th colspan="2">${escapeHtml(j.jour)}</th></tr>` : "",
        ...(j.rangs.flat().length ? j.rangs.flat().map((x) => `<tr><td style="white-space:nowrap"><b>${escapeHtml(x.heureDebut)}–${escapeHtml(x.heureFin)}</b></td><td>${escapeHtml(x.matiere)}${x.seance ? ` — <span style="color:#687087">${escapeHtml(x.seance)}</span>` : ""}</td></tr>`) : [`<tr><td colspan="2" style="color:#687087">Aucun créneau.</td></tr>`]),
      ]).join("");
      printHTML(`Planning — ${titre}`, `<h1>Planning — ${escapeHtml(titre)}</h1><table>${rows}</table>`);
    }
  };

  return (
    <Page titre="Planning" sous={titre}
      actions={<>
        {vue !== "mois" && <button className="btn" style={{ minWidth: 196 }} onClick={generer}>⚡ {vue === "jour" ? "Générer le jour" : "Générer la semaine"}</button>}
        {vue !== "mois" && <button className="btn" onClick={() => setDeplacer((v) => !v)} aria-pressed={deplacer}
          style={deplacer ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}
          title={deplacer ? "Déplacement activé — glissez les créneaux. Cliquez pour désactiver." : "Activer le déplacement des créneaux par glisser-déposer"}>
          ✋ Déplacer</button>}
        {vue !== "mois" && <button className="btn" onClick={imprimer}>🖨 PDF</button>}
        <div className="seg" style={{ marginLeft: 4 }}>
          <button className={vue === "jour" ? "active" : ""} onClick={() => setVue("jour")}>Jour</button>
          <button className={vue === "semaine" ? "active" : ""} onClick={() => setVue("semaine")}>Semaine</button>
          <button className={vue === "mois" ? "active" : ""} onClick={() => setVue("mois")}>Mois</button>
        </div>
        <button className="btn" onClick={() => decaler(-1)} aria-label="Précédent">←</button>
        <button className="btn" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setAncre(d); }}>Aujourd'hui</button>
        <button className="btn" onClick={() => decaler(1)} aria-label="Suivant">→</button>
      </>}>
      {vue === "mois"
        ? <VueMois ancre={ancre} creneaux={creneaux ?? []} feries={feries} vacanceDe={vacanceDe}
            anniversaires={anniversaires} onJour={(d) => { setAncre(d); setVue("jour"); }} />
        : <GrilleHoraire jours={jours} creneaux={creneaux ?? []} seances={seances ?? []} feries={feries} vacanceDe={vacanceDe}
            deplacable={deplacer} onEdit={setEdit} onTap={ouvrirCreneau} onReload={reload} />}

      {voirSeance && <SeanceReadView seance={voirSeance}
        onClose={() => setVoirSeance(null)}
        onEdit={() => { const sid = voirSeance.sequenceId; setVoirSeance(null); if (sid) navigate(`/sequences/${sid}`); }} />}
      {edit && <CreneauForm creneau={edit} seances={seances ?? []} sequences={sequences ?? []}
        onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }}
        onDelete={() => { setDel(edit); setEdit(null); }} />}
      {del && <Confirm message="Supprimer ce créneau ?" onYes={() => api.creneauDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </Page>
  );
}

// ── Grille horaire (1 jour ou 5 jours) ─────────────────────────────────────
function GrilleHoraire({ jours, creneaux, seances, feries, vacanceDe, deplacable, onEdit, onTap, onReload }: {
  jours: Date[]; creneaux: Creneau[]; seances: Seance[]; feries: Record<string, string>;
  vacanceDe: (d: string) => string | undefined; deplacable: boolean; onEdit: (c: Creneau) => void; onTap: (c: Creneau) => void; onReload: () => void;
}) {
  const todayIso = iso(new Date());
  const heures = Array.from({ length: H_FIN - H_DEBUT + 1 }, (_, i) => H_DEBUT + i);
  const hauteur = (H_FIN - H_DEBUT) * H_PX;
  const colsRef = React.useRef<HTMLDivElement>(null);
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const n = jours.length;

  const pourJour = (d: Date) => creneaux.filter((c) => c.date.slice(0, 10) === iso(d));

  const creerA = (d: Date, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".cren-block")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const start = Math.max(H_DEBUT * 60, Math.min((H_FIN - 1) * 60, H_DEBUT * 60 + Math.floor(((e.clientY - rect.top) / H_PX) * 60 / 30) * 30));
    onEdit({ id: newId(), date: iso(d), heureDebut: minToHHMM(start), heureFin: minToHHMM(start + 60), matiere: "Français", couleur: couleurPourMatiere("Français"), seanceId: null, atelierId: null, espaceId: null });
  };

  // Drag d'un créneau : écouteurs attachés une seule fois par geste (ref pour
  // l'état courant) → mouvement fluide, sans ré-abonnement à chaque frame.
  const dragRef = React.useRef<DragState | null>(null);
  const majDrag = (d: DragState | null) => { dragRef.current = d; setDrag(d); };

  const onDragStart = (c: Creneau, e: React.MouseEvent) => {
    if (!deplacable) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabOffMin = (e.clientY - rect.top) / H_PX * 60;
    majDrag({ id: c.id, dayIndex: jours.findIndex((d) => iso(d) === c.date.slice(0, 10)), startMin: toMin(c.heureDebut), durMin: toMin(c.heureFin) - toMin(c.heureDebut), grabOffMin });

    const onMove = (ev: MouseEvent) => {
      const cur = dragRef.current; const box = colsRef.current?.getBoundingClientRect();
      if (!cur || !box) return;
      const di = Math.max(0, Math.min(n - 1, Math.floor((ev.clientX - box.left) / (box.width / n))));
      // La grille commence à H_DEBUT (8h) : on convertit la position en minute
      // absolue de la journée, sinon tout retombe à 08:00 (clamp Math.max).
      const yMin = H_DEBUT * 60 + (ev.clientY - box.top) / H_PX * 60 - cur.grabOffMin;
      const start = Math.max(H_DEBUT * 60, Math.min(H_FIN * 60 - cur.durMin, Math.round(yMin / 15) * 15));
      majDrag({ ...cur, dayIndex: di, startMin: start });
    };
    const onUp = async () => {
      window.removeEventListener("mousemove", onMove);
      const d = dragRef.current; majDrag(null);
      if (!d) return;
      const cc = creneaux.find((x) => x.id === d.id); if (!cc) return;
      const newDate = iso(jours[d.dayIndex]); const nd = minToHHMM(d.startMin), nf = minToHHMM(d.startMin + d.durMin);
      if (newDate !== cc.date.slice(0, 10) || nd !== cc.heureDebut) {
        await api.creneauSave({ ...cc, date: newDate, heureDebut: nd, heureFin: nf }); onReload();
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: `44px repeat(${n}, 1fr)`, borderBottom: "1px solid var(--border)" }}>
        <div />
        {jours.map((d, i) => {
          const ferie = feries[iso(d)]; const vac = vacanceDe(iso(d));
          return (
            <div key={i} style={{ textAlign: "center", padding: "8px 0", borderLeft: "1px solid var(--border)", background: iso(d) === todayIso ? "var(--accent-soft)" : "var(--panel-2)" }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{jours.length === 1 ? d.toLocaleDateString("fr-FR", { weekday: "long" }) : JOURS[i]}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{fmtJour(d)}</div>
              {ferie && <div style={{ fontSize: 10, color: "var(--orange)", fontWeight: 600 }}>{ferie}</div>}
              {!ferie && vac && <div style={{ fontSize: 10, color: "#a855f7", fontWeight: 600 }} title={vac}>🏖️ Vacances</div>}
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `44px 1fr` }}>
        <div style={{ position: "relative", height: hauteur }}>
          {heures.map((h, i) => <div key={h} style={{ position: "absolute", top: i * H_PX - 7, right: 6, fontSize: 11, color: "var(--text-2)" }}>{h}h</div>)}
        </div>
        <div ref={colsRef} style={{ display: "grid", gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {jours.map((d, di) => {
            const off = feries[iso(d)] || vacanceDe(iso(d));
            const lay = layoutJour(pourJour(d));
            return (
              <div key={di} onClick={(e) => !off && !deplacable && creerA(d, e)}
                style={{ position: "relative", height: hauteur, borderLeft: "1px solid var(--border)", cursor: off || deplacable ? "default" : "pointer",
                  background: off ? "repeating-linear-gradient(45deg, var(--panel-2), var(--panel-2) 8px, transparent 8px, transparent 16px)" : iso(d) === todayIso ? "color-mix(in srgb, var(--accent-soft) 40%, transparent)" : undefined }}>
                {heures.map((_, i) => <div key={i} style={{ position: "absolute", top: i * H_PX, left: 0, right: 0, borderTop: "1px solid var(--border)", opacity: 0.5 }} />)}
                {pourJour(d).map((c) => {
                  const dragged = drag?.id === c.id;
                  const startMin = dragged ? drag!.startMin : toMin(c.heureDebut);
                  const durMin = dragged ? drag!.durMin : (toMin(c.heureFin) - toMin(c.heureDebut));
                  if (dragged && drag!.dayIndex !== di) return null;
                  const top = (startMin - H_DEBUT * 60) / 60 * H_PX;
                  const h = Math.max(20, durMin / 60 * H_PX);
                  const seance = seances.find((x) => x.id === c.seanceId);
                  const { lane, lanes } = (!dragged && lay.get(c.id)) || { lane: 0, lanes: 1 };
                  return (
                    <div key={c.id} className="cren-block"
                      onMouseDown={(e) => { if (deplacable) onDragStart(c, e); }}
                      onClick={(e) => { e.stopPropagation(); if (!deplacable && !drag) onTap(c); }}
                      onContextMenu={(e) => openCtx(e, [
                        ...(c.seanceId ? [{ label: "Voir la séance", icon: "👁", onClick: () => onTap(c) }] : []),
                        { label: "Modifier le créneau", icon: "✏️", onClick: () => onEdit(c) },
                        ...(c.seanceId ? [{ label: "Détacher la séance", icon: "🔗", onClick: () => api.creneauSave({ ...c, seanceId: null }).then(onReload) }] : []),
                        { label: "Dupliquer", icon: "📑", sep: true, onClick: () => api.creneauSave({ ...c, id: newId() }).then(onReload) },
                        { label: "Supprimer le créneau", icon: "🗑", danger: true, sep: true, onClick: () => api.creneauDelete(c.id).then(onReload) },
                      ])}
                      style={{ position: "absolute", top, height: h - 2, left: dragged ? 3 : `calc(${(lane / lanes) * 100}% + 3px)`, width: dragged ? "calc(100% - 6px)" : `calc(${100 / lanes}% - 6px)`,
                        background: couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue, borderRadius: 7, color: "#fff", padding: "4px 6px", overflow: "hidden", fontSize: 11.5, lineHeight: 1.3,
                        boxShadow: dragged ? "0 4px 14px rgba(0,0,0,.35)" : "0 1px 3px rgba(0,0,0,.2)", opacity: dragged ? 0.92 : 1, outline: deplacable ? "2px dashed rgba(255,255,255,.7)" : "none", cursor: deplacable ? "grab" : "pointer", userSelect: "none", zIndex: dragged ? 10 : 1 }}>
                      <div style={{ opacity: 0.92 }}>{minToHHMM(startMin)}–{minToHHMM(startMin + durMin)}</div>
                      <div style={{ fontWeight: 700 }}>{c.matiere}</div>
                      {seance && <div style={{ opacity: 0.92 }}>{seance.titre}</div>}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-2)" }}>💡 Clic sur une plage vide pour créer · glisser pour déplacer.</div>
    </div>
  );
}

// ── Vue mois (calendrier) ──────────────────────────────────────────────────
function VueMois({ ancre, creneaux, feries, vacanceDe, anniversaires, onJour }: {
  ancre: Date; creneaux: Creneau[]; feries: Record<string, string>;
  vacanceDe: (d: string) => string | undefined; anniversaires: Record<string, string[]>; onJour: (d: Date) => void;
}) {
  const annivDe = (d: Date) => anniversaires[`${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`] ?? [];
  const todayIso = iso(new Date());
  const mois = ancre.getMonth();
  const first = lundiDe(new Date(ancre.getFullYear(), mois, 1));
  const semaines: Date[][] = [];
  const cur = new Date(first);
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) { row.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    semaines.push(row);
    if (row[6].getMonth() !== mois && w >= 4) break;
  }
  const pourJour = (d: Date) => creneaux.filter((c) => c.date.slice(0, 10) === iso(d)).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
        {JOURS7.map((j) => <div key={j} style={{ textAlign: "center", padding: "8px 0", fontWeight: 700, fontSize: 12.5, background: "var(--panel-2)", borderLeft: "1px solid var(--border)" }}>{j}</div>)}
      </div>
      {semaines.map((row, wi) => (
        <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)" }}>
          {row.map((d, di) => {
            const horsMois = d.getMonth() !== mois;
            const ferie = feries[iso(d)]; const vac = vacanceDe(iso(d));
            const crs = pourJour(d);
            const anniv = annivDe(d);
            return (
              <div key={di} onClick={() => onJour(d)}
                style={{ minHeight: 92, padding: 5, borderLeft: "1px solid var(--border)", cursor: "pointer",
                  background: iso(d) === todayIso ? "var(--accent-soft)" : ferie || vac ? "var(--panel-2)" : undefined, opacity: horsMois ? 0.4 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 12.5 }}>{d.getDate()}</span>
                  {ferie && <span style={{ fontSize: 9, color: "var(--orange)" }} title={ferie}>●</span>}
                  {!ferie && vac && <span style={{ fontSize: 9 }} title={vac}>🏖️</span>}
                  {anniv.length > 0 && <span style={{ fontSize: 11, marginLeft: "auto" }} title={`Anniversaire : ${anniv.join(", ")}`}>🎂</span>}
                </div>
                {anniv.map((nom, k) => (
                  <div key={"a" + k} style={{ marginTop: 2, fontSize: 10, color: "var(--accent)", fontWeight: 600, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    🎂 {nom}
                  </div>
                ))}
                {crs.slice(0, 4).map((c) => (
                  <div key={c.id} style={{ marginTop: 2, fontSize: 10, color: "#fff", background: couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue, borderRadius: 4, padding: "1px 4px", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                    {c.heureDebut} {c.matiere}
                  </div>
                ))}
                {crs.length > 4 && <div style={{ fontSize: 10, color: "var(--text-2)", marginTop: 1 }}>+{crs.length - 4}…</div>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CreneauForm({ creneau, seances, sequences, onClose, onSaved, onDelete }: {
  creneau: Creneau; seances: Seance[]; sequences: Sequence[]; onClose: () => void; onSaved: () => void; onDelete: () => void;
}) {
  const [c, setC] = React.useState<Creneau>(creneau);
  const up = (p: Partial<Creneau>) => setC((cur) => ({ ...cur, ...p }));
  // Séances groupées par séquence (séquences triées par titre, séances par n°).
  const seqsTriees = [...sequences].sort((a, b) => a.titre.localeCompare(b.titre));
  const seancesDe = (seqId: string) => seances.filter((s) => s.sequenceId === seqId).sort((a, b) => a.numero - b.numero);
  const orphelines = seances.filter((s) => !s.sequenceId || !sequences.some((q) => q.id === s.sequenceId));
  return (
    <Modal titre="Créneau" onClose={onClose}
      footer={<>
        <button className="btn danger" onClick={onDelete}>Supprimer</button>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={() => api.creneauSave(c).then(onSaved)}>Enregistrer</button>
      </>}>
      <div className="row">
        <Field label="Date"><Input type="date" value={c.date.slice(0, 10)} onChange={(e) => up({ date: e.target.value })} /></Field>
        <Field label="Début"><Input type="time" value={c.heureDebut} onChange={(e) => up({ heureDebut: e.target.value })} /></Field>
        <Field label="Fin"><Input type="time" value={c.heureFin} onChange={(e) => up({ heureFin: e.target.value })} /></Field>
      </div>
      <Field label="Matière">
        <Select value={c.matiere} onChange={(e) => up({ matiere: e.target.value, couleur: couleurPourMatiere(e.target.value) })}>
          {MATIERES.map((m) => <option key={m}>{m}</option>)}
        </Select>
      </Field>
      <Field label="Séance liée (optionnel)">
        <Select value={c.seanceId ?? ""} onChange={(e) => up({ seanceId: e.target.value || null })}>
          <option value="">Aucune</option>
          {seqsTriees.map((q) => {
            const ss = seancesDe(q.id);
            return ss.length === 0 ? null : (
              <optgroup key={q.id} label={[q.titre, q.matiere].filter(Boolean).join(" · ")}>
                {ss.map((s) => <option key={s.id} value={s.id}>#{s.numero} {s.titre || "Sans titre"}</option>)}
              </optgroup>
            );
          })}
          {orphelines.length > 0 && (
            <optgroup label="Sans séquence">
              {orphelines.map((s) => <option key={s.id} value={s.id}>#{s.numero} {s.titre || "Sans titre"}</option>)}
            </optgroup>
          )}
        </Select>
      </Field>
    </Modal>
  );
}
