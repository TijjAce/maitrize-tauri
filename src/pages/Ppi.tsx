import React from "react";
import { api, newId } from "../api";
import { Field, Input, Select, Empty, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";

// ── PPI (Projet Personnalisé Individualisé) — mode IME/ULIS/inclusion ──────
// Données stockées par élève dans les réglages (clé `ppi:{eleveId}`), comme la
// Synthèse GS : pas de migration de schéma, export/import inclus d'office.

interface PpiObjectif {
  id: string; domaine: string; intitule: string; critere: string;
  echeance: string; statut: "encours" | "atteint" | "areprendre"; notes: string;
}
interface PpiPec { id: string; intitule: string; creneau: string }
interface PpiBilan { id: string; date: string; texte: string }
interface PpiData {
  besoins: string; amenagements: string;
  prisesEnCharge: PpiPec[]; objectifs: PpiObjectif[]; bilans: PpiBilan[];
}

const VIDE: PpiData = { besoins: "", amenagements: "", prisesEnCharge: [], objectifs: [], bilans: [] };

const STATUTS: { k: PpiObjectif["statut"]; label: string; couleur: string }[] = [
  { k: "encours", label: "En cours", couleur: "#eb9e33" },
  { k: "atteint", label: "Atteint", couleur: "#57b873" },
  { k: "areprendre", label: "À reprendre", couleur: "#d64d4d" },
];
const statutLabel = (k: string) => STATUTS.find((s) => s.k === k)?.label ?? "En cours";

const DOMAINES_SUGGERES = ["Langage / communication", "Lecture", "Écriture", "Mathématiques",
  "Autonomie", "Socialisation", "Motricité", "Attention / comportement"];

const todayIso = () => new Date().toISOString().slice(0, 10);
const fmtDateFr = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

export function PpiTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [data, setData] = React.useState<PpiData>(VIDE);
  const [ecole, setEcole] = React.useState("");
  const [enseignantNom, setEnseignantNom] = React.useState("");
  const [exportEnCours, setExportEnCours] = React.useState(false);
  const [reformuleId, setReformuleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    api.settingGet("ecole").then((v) => setEcole(v ?? ""));
    api.settingGet("enseignantNom").then((v) => setEnseignantNom(v ?? ""));
  }, []);

  React.useEffect(() => {
    if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id);
  }, [eleves, eleveId]);

  React.useEffect(() => {
    if (!eleveId) return;
    api.documentEleveGet(eleveId, "ppi").then((v) => {
      try { setData(v ? { ...VIDE, ...JSON.parse(v) } : VIDE); } catch { setData(VIDE); }
    });
  }, [eleveId]);

  const persister = (d: PpiData) => { setData(d); if (eleveId) api.documentEleveSet(eleveId, "ppi", JSON.stringify(d)); };
  const up = (p: Partial<PpiData>) => persister({ ...data, ...p });
  const upObjectif = (id: string, p: Partial<PpiObjectif>) =>
    up({ objectifs: data.objectifs.map((o) => o.id === id ? { ...o, ...p } : o) });
  const upPec = (id: string, p: Partial<PpiPec>) =>
    up({ prisesEnCharge: data.prisesEnCharge.map((x) => x.id === id ? { ...x, ...p } : x) });
  const upBilan = (id: string, p: Partial<PpiBilan>) =>
    up({ bilans: data.bilans.map((b) => b.id === id ? { ...b, ...p } : b) });

  const eleve = eleves?.find((e) => e.id === eleveId);
  const prenom = (eleve?.nom || "L'élève").trim().split(/\s+/)[0];

  // Reformulation IA du texte d'un bilan (même approche que la Synthèse GS).
  const reformuler = async (b: PpiBilan) => {
    if (!b.texte.trim()) { toast("Écrivez d'abord quelques mots à reformuler.", { icone: "✍️" }); return; }
    setReformuleId(b.id);
    try {
      const modele = await api.modeleActif();
      const rep = await api.mistralChat([
        { role: "system", content:
          "Tu es enseignant·e spécialisé·e (IME/ULIS). Tu reformules les notes d'un enseignant pour le bilan officiel du Projet Personnalisé Individualisé d'un élève, destiné à l'équipe de suivi, la famille et la MDPH. " +
          "Rédige en français, style clair, bienveillant et professionnel, à la 3e personne avec le prénom de l'élève. " +
          "Reste fidèle au sens, n'invente rien, garde une longueur proche de l'original. " +
          "Réponds UNIQUEMENT par le texte reformulé, sans guillemets ni commentaire." },
        { role: "user", content: `Prénom de l'élève : ${prenom}\n\nNotes à reformuler :\n${b.texte}` },
      ], modele);
      const propre = rep.trim().replace(/^["«»\s]+|["«»\s]+$/g, "");
      if (propre) upBilan(b.id, { texte: propre });
    } catch (e: any) {
      toast("Reformulation impossible : " + String(e?.message ?? e), { icone: "⚠️", duree: 5000 });
    } finally {
      setReformuleId(null);
    }
  };

  const exporter = async (bilan?: PpiBilan) => {
    if (!eleve) return;
    setExportEnCours(true);
    try {
      const b = bilan ?? [...data.bilans].sort((a, z) => z.date.localeCompare(a.date))[0];
      await api.exporterBilanPpi({
        eleveNom: eleve.nom, ecole, enseignantNom,
        date: fmtDateFr(b?.date || todayIso()),
        besoins: data.besoins, amenagements: data.amenagements,
        prisesEnCharge: data.prisesEnCharge.map((p) => [p.intitule, p.creneau].filter(Boolean).join(" — ")),
        objectifs: data.objectifs.map((o) => ({
          domaine: o.domaine, intitule: o.intitule, critere: o.critere,
          echeance: fmtDateFr(o.echeance), statut: statutLabel(o.statut), notes: o.notes,
        })),
        bilanTexte: b?.texte ?? "",
      });
    } catch (e: any) {
      toast("Export impossible : " + String(e?.message ?? e), { icone: "⚠️", duree: 5000 });
    } finally {
      setExportEnCours(false);
    }
  };

  if (!eleve) return <Empty icone="🧩" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;

  return (
    <>
      <div className="toolbar">
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 240 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="spacer" />
        <button className="btn sm" disabled={exportEnCours} onClick={() => exporter()}>
          {exportEnCours ? "Export…" : "📄 Exporter le bilan PDF"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ marginTop: 0 }}>🧩 Besoins & aménagements</h3>
        <Field label="Besoins particuliers">
          <textarea className="textarea" value={data.besoins} onChange={(e) => up({ besoins: e.target.value })}
            placeholder="Points d'appui, difficultés, besoins spécifiques…" />
        </Field>
        <Field label="Aménagements mis en place">
          <textarea className="textarea" value={data.amenagements} onChange={(e) => up({ amenagements: e.target.value })}
            placeholder="Supports adaptés, temps majoré, pictogrammes, place dans la classe…" />
        </Field>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>🏥 Prises en charge extérieures</h3>
          <div className="spacer" />
          <button className="btn sm" onClick={() => up({ prisesEnCharge: [...data.prisesEnCharge, { id: newId(), intitule: "", creneau: "" }] })}>+ Ajouter</button>
        </div>
        {data.prisesEnCharge.length === 0 && <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginTop: 8 }}>Aucune (orthophonie, psychomotricité, SESSAD…).</div>}
        {data.prisesEnCharge.map((p) => (
          <div key={p.id} className="row" style={{ marginTop: 10, alignItems: "center" }}>
            <Input value={p.intitule} onChange={(e) => upPec(p.id, { intitule: e.target.value })} placeholder="Orthophonie" />
            <Input value={p.creneau} onChange={(e) => upPec(p.id, { creneau: e.target.value })} placeholder="Mardi 10h30 (Mme …)" />
            <button className="btn ghost sm" aria-label="Supprimer" onClick={() => up({ prisesEnCharge: data.prisesEnCharge.filter((x) => x.id !== p.id) })}>🗑</button>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>🎯 Objectifs individualisés</h3>
          <div className="spacer" />
          <button className="btn sm" onClick={() => up({ objectifs: [...data.objectifs, { id: newId(), domaine: "", intitule: "", critere: "", echeance: "", statut: "encours", notes: "" }] })}>+ Objectif</button>
        </div>
        {data.objectifs.length === 0 && <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginTop: 8 }}>Aucun objectif défini pour {prenom}.</div>}
        {data.objectifs.map((o) => (
          <div key={o.id} style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <div className="row">
              <Field label="Domaine">
                <Input list="ppi-domaines" value={o.domaine} onChange={(e) => upObjectif(o.id, { domaine: e.target.value })} placeholder="Langage, autonomie…" />
              </Field>
              <Field label="Échéance">
                <Input type="date" value={o.echeance} onChange={(e) => upObjectif(o.id, { echeance: e.target.value })} />
              </Field>
              <div className="field" style={{ flex: "none" }}>
                <label>Statut</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {STATUTS.map((s) => (
                    <button key={s.k} title={s.label} onClick={() => upObjectif(o.id, { statut: s.k })}
                      style={{ padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                        background: o.statut === s.k ? s.couleur : "var(--panel-2)", color: o.statut === s.k ? "#fff" : "var(--text-2)" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn ghost sm" aria-label="Supprimer" style={{ alignSelf: "center" }}
                onClick={() => up({ objectifs: data.objectifs.filter((x) => x.id !== o.id) })}>🗑</button>
            </div>
            <Field label="Objectif">
              <Input value={o.intitule} onChange={(e) => upObjectif(o.id, { intitule: e.target.value })}
                placeholder={`Ex. ${prenom} demande de l'aide avec un pictogramme ou un mot.`} />
            </Field>
            <div className="row">
              <Field label="Critère de réussite">
                <Input value={o.critere} onChange={(e) => upObjectif(o.id, { critere: e.target.value })} placeholder="Réussi 3 fois sur 4 sur deux semaines" />
              </Field>
              <Field label="Notes">
                <Input value={o.notes} onChange={(e) => upObjectif(o.id, { notes: e.target.value })} placeholder="Observations, adaptations…" />
              </Field>
            </div>
          </div>
        ))}
        <datalist id="ppi-domaines">{DOMAINES_SUGGERES.map((d) => <option key={d} value={d} />)}</datalist>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h3 style={{ margin: 0 }}>📝 Bilans</h3>
          <div className="spacer" />
          <button className="btn sm" onClick={() => up({ bilans: [{ id: newId(), date: todayIso(), texte: "" }, ...data.bilans] })}>+ Bilan</button>
        </div>
        {data.bilans.length === 0 && <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic", marginTop: 8 }}>Aucun bilan rédigé.</div>}
        {data.bilans.map((b) => (
          <div key={b.id} style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Input type="date" value={b.date} onChange={(e) => upBilan(b.id, { date: e.target.value })} style={{ maxWidth: 170 }} />
              <div className="spacer" />
              <button className="btn sm" disabled={reformuleId === b.id || !b.texte.trim()} title="Reformuler avec l'assistant IA"
                onClick={() => reformuler(b)}>{reformuleId === b.id ? "Reformulation…" : "✨ Reformuler"}</button>
              <button className="btn sm" disabled={exportEnCours} onClick={() => exporter(b)}>📄 Exporter</button>
              <button className="btn ghost sm" aria-label="Supprimer" onClick={() => up({ bilans: data.bilans.filter((x) => x.id !== b.id) })}>🗑</button>
            </div>
            <textarea className="textarea" style={{ minHeight: 90 }} value={b.texte}
              onChange={(e) => upBilan(b.id, { texte: e.target.value })}
              placeholder={`Bilan de la période pour ${prenom} : progrès observés, difficultés, perspectives…`} />
          </div>
        ))}
      </div>
    </>
  );
}
