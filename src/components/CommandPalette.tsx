import React from "react";
import { useNavigate } from "react-router-dom";
import { api, ResultatRecherche, joursFeriesFR, anneeScolaireActuelle, raccourci } from "../api";

interface Cmd { id: string; ico: string; label: string; sous?: string; run: () => void | Promise<void>; }

const NAV: { ico: string; label: string; to: string }[] = [
  { ico: "🏠", label: "Tableau de bord", to: "/" },
  { ico: "📚", label: "Séquences", to: "/sequences" },
  { ico: "📁", label: "Projets", to: "/projets" },
  { ico: "🧩", label: "Ateliers & Espaces", to: "/ateliers" },
  { ico: "🗓️", label: "Planning", to: "/planning" },
  { ico: "🗂️", label: "Organisation", to: "/organisation" },
  { ico: "👧", label: "Élèves", to: "/eleves" },
  { ico: "📖", label: "Référentiels", to: "/referentiels" },
  { ico: "🧰", label: "Matériel", to: "/materiel" },
  { ico: "🌐", label: "Ressources", to: "/ressources" },
  { ico: "✨", label: "Assistant IA", to: "/assistant" },
  { ico: "⚙️", label: "Réglages", to: "/reglages" },
];

const KIND_TO: Record<string, (id: string) => string> = {
  sequence: (id) => `/sequences/${id}`, atelier: () => "/ateliers", espace: () => "/ateliers",
  eleve: () => "/eleves", materiel: () => "/materiel",
};
const KIND_ICO: Record<string, string> = { sequence: "📚", atelier: "🧩", espace: "🪑", eleve: "👧", materiel: "🧰" };

const isoDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const toMin = (s: string) => { const [h, m] = (s || "").split(":").map(Number); return (h || 0) * 60 + (m || 0); };

// ── Réponses directes (façon PiloteMoteur du natif) ────────────────────────
async function planningJour(quand: "today" | "demain"): Promise<string> {
  const d = new Date(); if (quand === "demain") d.setDate(d.getDate() + 1);
  const j = isoDate(d);
  const crs = (await api.creneauxList(j, j)).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  const seances = await api.seancesList();
  const jour = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  if (crs.length === 0) return `Aucun créneau prévu le ${jour}.`;
  return `${crs.length} créneau(x) le ${jour} :\n` + crs.map((c) => {
    const s = seances.find((x) => x.id === c.seanceId);
    return `• ${c.heureDebut}–${c.heureFin}  ${c.matiere}${s ? " — " + s.titre : ""}`;
  }).join("\n");
}
async function preparerDemain(): Promise<string> {
  const d = new Date(); d.setDate(d.getDate() + 1); const j = isoDate(d);
  const crs = (await api.creneauxList(j, j)).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));
  if (crs.length === 0) return "Rien de prévu demain. 🎉";
  const seances = await api.seancesList();
  const lignes = crs.map((c) => {
    const s = seances.find((x) => x.id === c.seanceId);
    const mat = s?.materiel?.trim();
    return `• ${c.heureDebut} ${c.matiere}${s ? " — " + s.titre : ""}${mat ? `\n    🧰 ${mat}` : ""}`;
  });
  return `À préparer pour demain (${crs.length} créneaux) :\n` + lignes.join("\n");
}
async function listerSequences(): Promise<string> {
  const seq = await api.sequencesList();
  if (seq.length === 0) return "Aucune séquence.";
  return `${seq.length} séquence(s) :\n` + seq.slice(0, 30).map((s) => `• ${s.titre}${s.matiere ? " — " + s.matiere : ""} (P${s.periode})`).join("\n");
}
async function heuresParMatiere(): Promise<string> {
  const edt = (await api.edtTypiqueList()).find((e) => e.annee === anneeScolaireActuelle());
  if (!edt) return "Aucun EDT type défini.";
  let slots: { heureDebut: string; heureFin: string; titre: string }[] = [];
  try { slots = JSON.parse(edt.slotsJson); } catch { /* */ }
  const m: Record<string, number> = {};
  for (const s of slots) m[s.titre] = (m[s.titre] ?? 0) + (toMin(s.heureFin) - toMin(s.heureDebut));
  const lignes = Object.entries(m).sort((a, b) => b[1] - a[1]).map(([mat, min]) => `• ${mat} : ${(min / 60).toFixed(1)} h`);
  return lignes.length ? "Volume hebdomadaire (EDT type) :\n" + lignes.join("\n") : "EDT type vide.";
}
async function bilanSemaine(): Promise<string> {
  const lun = new Date(); lun.setDate(lun.getDate() - ((lun.getDay() + 6) % 7));
  const ven = new Date(lun); ven.setDate(lun.getDate() + 4);
  const crs = await api.creneauxList(isoDate(lun), isoDate(ven));
  if (crs.length === 0) return "Aucun créneau cette semaine.";
  const m: Record<string, number> = {};
  for (const c of crs) m[c.matiere] = (m[c.matiere] ?? 0) + (toMin(c.heureFin) - toMin(c.heureDebut));
  const tot = Object.values(m).reduce((a, b) => a + b, 0);
  return `Cette semaine : ${crs.length} créneaux, ${(tot / 60).toFixed(1)} h\n` +
    Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `• ${k} : ${(v / 60).toFixed(1)} h`).join("\n");
}
async function prochainesVacances(): Promise<string> {
  const cache = await api.settingGet("vacancesCache");
  let vac: { description: string; debut: string; fin: string }[] = [];
  try { vac = cache ? JSON.parse(cache) : []; } catch { /* */ }
  if (vac.length === 0) { try { vac = await api.vacancesScolaires((await api.settingGet("zoneVacances")) || "A"); } catch { /* */ } }
  const today = isoDate(new Date());
  const proch = vac.filter((v) => v.fin > today).sort((a, b) => a.debut.localeCompare(b.debut))[0];
  if (!proch) return "Vacances inconnues (vérifiez la zone dans Réglages).";
  return `🏖️ ${proch.description}\ndu ${new Date(proch.debut).toLocaleDateString("fr-FR")} au ${new Date(proch.fin).toLocaleDateString("fr-FR")}`;
}
function prochainFerie(): string {
  const y = new Date().getFullYear();
  const all = { ...joursFeriesFR(y), ...joursFeriesFR(y + 1) };
  const today = isoDate(new Date());
  const next = Object.entries(all).filter(([d]) => d >= today).sort((a, b) => a[0].localeCompare(b[0]))[0];
  return next ? `🚩 Prochain jour férié : ${next[1]}\nle ${new Date(next[0]).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}` : "—";
}
async function meilleuresSequences(): Promise<string> {
  const seq = await api.sequencesList();
  const notees = seq.map((s) => ({ s, n: s.ratingEngagement + s.ratingFacilite + s.ratingApprentissage }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 5);
  if (notees.length === 0) return "Aucune séquence notée pour l'instant.";
  return "⭐ Mes meilleures séquences :\n" + notees.map((x) => `• ${x.s.titre} (${(x.n / 3).toFixed(1)}/5)`).join("\n");
}
async function sequencesNonNotees(): Promise<string> {
  const seq = await api.sequencesList();
  const nn = seq.filter((s) => s.ratingEngagement + s.ratingFacilite + s.ratingApprentissage === 0);
  return nn.length === 0 ? "Toutes vos séquences sont notées. 👍" : `${nn.length} séquence(s) non notée(s) :\n` + nn.slice(0, 30).map((s) => `• ${s.titre}`).join("\n");
}
async function seancesSansBilan(): Promise<string> {
  const seances = await api.seancesList();
  const seq = await api.sequencesList();
  const sans = seances.filter((s) => !s.bilan?.trim());
  if (sans.length === 0) return "Toutes les séances ont un bilan. 👍";
  return `${sans.length} séance(s) sans bilan :\n` + sans.slice(0, 30).map((s) => {
    const q = seq.find((x) => x.id === s.sequenceId);
    return `• #${s.numero} ${s.titre}${q ? " (" + q.titre + ")" : ""}`;
  }).join("\n");
}
async function prochaineEvaluation(): Promise<string> {
  const evs = await api.evaluationsList();
  const today = isoDate(new Date());
  const proch = evs.filter((e) => e.date.slice(0, 10) >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
  return proch ? `📝 Prochaine évaluation : ${proch.titre}\n${proch.matiere} — le ${new Date(proch.date).toLocaleDateString("fr-FR")}` : "Aucune évaluation à venir.";
}
async function moyennesMatieres(): Promise<string> {
  const evs = await api.evaluationsList();
  const parMat: Record<string, number[]> = {};
  for (const ev of evs.filter((e) => e.mode === "note")) {
    const notes = await api.notesEleveList(ev.id);
    const vals = notes.filter((n) => !n.absent && n.note != null).map((n) => (n.note! / ev.bareme) * 20);
    if (vals.length) (parMat[ev.matiere || "—"] ??= []).push(...vals);
  }
  const lignes = Object.entries(parMat).map(([m, v]) => `• ${m} : ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(1)}/20`);
  return lignes.length ? "Moyennes par matière (ramenées sur 20) :\n" + lignes.join("\n") : "Aucune note saisie.";
}
async function anniversairesMois(): Promise<string> {
  const eleves = await api.elevesList();
  const mois = new Date().getMonth() + 1;
  const anniv = eleves.filter((e) => e.dateNaissance && Number(e.dateNaissance.slice(5, 7)) === mois)
    .sort((a, b) => a.dateNaissance.slice(8, 10).localeCompare(b.dateNaissance.slice(8, 10)));
  return anniv.length === 0 ? "Aucun anniversaire ce mois-ci." : "🎂 Anniversaires du mois :\n" + anniv.map((e) => `• ${e.nom} — le ${e.dateNaissance.slice(8, 10)}`).join("\n");
}

export function CommandPalette() {
  const nav = useNavigate();
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [res, setRes] = React.useState<ResultatRecherche[]>([]);
  const [sel, setSel] = React.useState(0);
  const [bulle, setBulle] = React.useState<{ titre: string; texte: string } | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("maitrize:palette", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("maitrize:palette", onOpen); };
  }, []);

  React.useEffect(() => { if (open) { setQ(""); setRes([]); setSel(0); setBulle(null); } }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      if (q.trim().length < 2) { setRes([]); return; }
      try { setRes(await api.recherche(q.trim())); } catch { /* */ }
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  const repondre = (titre: string, fn: () => string | Promise<string>) => async () => {
    setBusy(true); setBulle({ titre, texte: "…" });
    try { setBulle({ titre, texte: await fn() }); } catch (e) { setBulle({ titre, texte: "Erreur : " + String(e) }); }
    finally { setBusy(false); }
  };
  const goNav = (to: string) => () => { setOpen(false); nav(to); };
  const goAction = (to: string, evt?: string) => () => { setOpen(false); nav(to); if (evt) setTimeout(() => window.dispatchEvent(new Event(evt)), 120); };

  // Actions du natif portées (navigation, actions, réponses directes).
  const ACTIONS: Cmd[] = [
    { id: "a-newseq", ico: "➕", label: "Nouvelle séquence", sous: "Action · créer", run: goAction("/sequences", "maitrize:nouvelle-sequence") },
    { id: "a-genia", ico: "✨", label: "Générer une séquence (IA)", sous: "Action · assistant", run: goAction("/assistant", "maitrize:generer-sequence") },
    { id: "a-assist", ico: "🪄", label: "Ouvrir l'assistant IA", sous: "Action", run: goNav("/assistant") },
    { id: "r-demain", ico: "🌅", label: "Préparer pour demain", sous: "Réponse directe", run: repondre("Préparer pour demain", preparerDemain) },
    { id: "r-jour", ico: "📅", label: "Planning d'aujourd'hui", sous: "Réponse directe", run: repondre("Planning d'aujourd'hui", () => planningJour("today")) },
    { id: "r-listseq", ico: "📋", label: "Lister mes séquences", sous: "Réponse directe", run: repondre("Mes séquences", listerSequences) },
    { id: "r-heures", ico: "⏱️", label: "Heures par matière", sous: "Réponse directe", run: repondre("Heures par matière", heuresParMatiere) },
    { id: "r-bilan", ico: "✔️", label: "Bilan de la semaine", sous: "Réponse directe", run: repondre("Bilan de la semaine", bilanSemaine) },
    { id: "r-vac", ico: "🏖️", label: "Prochaines vacances", sous: "Réponse directe", run: repondre("Prochaines vacances", prochainesVacances) },
    { id: "r-ferie", ico: "🚩", label: "Prochain jour férié", sous: "Réponse directe", run: repondre("Prochain jour férié", () => prochainFerie()) },
    { id: "r-top", ico: "⭐", label: "Mes meilleures séquences", sous: "Réponse directe", run: repondre("Meilleures séquences", meilleuresSequences) },
    { id: "r-nonnote", ico: "☆", label: "Séquences non notées", sous: "Réponse directe", run: repondre("Séquences non notées", sequencesNonNotees) },
    { id: "r-sansbilan", ico: "💬", label: "Séances sans bilan", sous: "Réponse directe", run: repondre("Séances sans bilan", seancesSansBilan) },
    { id: "r-nexteval", ico: "📝", label: "Prochaine évaluation", sous: "Réponse directe", run: repondre("Prochaine évaluation", prochaineEvaluation) },
    { id: "r-moy", ico: "📊", label: "Moyennes par matière", sous: "Réponse directe", run: repondre("Moyennes par matière", moyennesMatieres) },
    { id: "r-anniv", ico: "🎂", label: "Anniversaires du mois", sous: "Réponse directe", run: repondre("Anniversaires du mois", anniversairesMois) },
  ];

  const match = (label: string) => !q || label.toLowerCase().includes(q.toLowerCase());
  const navCmds: Cmd[] = NAV.filter((n) => match(n.label)).map((n) => ({ id: "nav" + n.to, ico: n.ico, label: n.label, sous: "Aller à", run: goNav(n.to) }));
  const actionCmds = ACTIONS.filter((a) => match(a.label) || match(a.sous ?? ""));
  const rechCmds: Cmd[] = res.map((r) => ({ id: r.kind + r.id, ico: KIND_ICO[r.kind] ?? "•", label: r.titre, sous: r.sousTitre, run: () => { setOpen(false); nav((KIND_TO[r.kind] ?? (() => "/"))(r.id)); } }));
  const cmds = [...actionCmds, ...navCmds, ...rechCmds];
  const clamped = Math.min(sel, Math.max(0, cmds.length - 1));

  if (!open) return null;
  return (
    <div className="overlay" style={{ alignItems: "flex-start", paddingTop: "10vh" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="palette" role="dialog" aria-modal="true" aria-label="Recherche et commandes" onKeyDown={(e) => {
        if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, cmds.length - 1)); }
        if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
        if (e.key === "Enter" && cmds[clamped]) { e.preventDefault(); cmds[clamped].run(); }
      }}>
        <input className="palette-input" autoFocus aria-label="Commande, action ou recherche"
          placeholder="Commande, action, ou recherche (séquences, élèves…)"
          value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} />
        {bulle && (
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--accent-soft)" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{bulle.titre}</div>
            <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}>{busy ? "…" : bulle.texte}</div>
          </div>
        )}
        <div className="palette-list">
          {cmds.length === 0 ? <div style={{ padding: 16, color: "var(--text-2)" }}>Aucun résultat.</div> :
            cmds.map((c, i) => (
              <button key={c.id} className={"palette-item" + (i === clamped ? " on" : "")}
                onMouseEnter={() => setSel(i)} onClick={() => c.run()}>
                <span style={{ fontSize: 16 }}>{c.ico}</span>
                <span style={{ flex: 1 }}>{c.label}</span>
                {c.sous && <span style={{ fontSize: 12, color: "var(--text-2)" }}>{c.sous}</span>}
              </button>
            ))}
        </div>
        <div className="palette-foot">↑↓ naviguer · ↵ exécuter · esc fermer · {raccourci("K")}</div>
      </div>
    </div>
  );
}
