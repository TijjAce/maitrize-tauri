import React from "react";
import { api, anneeScolaireActuelle } from "../api";
import { Select, Empty, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML, escapeHtml } from "../print";
import { reformuler } from "../reformulation";
import { isoJour } from "../dates";
import { lireCompetences, TYPE_DOC_COMPETENCES } from "../competencesTravaillees";
import {
  SECTIONS_SYNTHESE, TYPE_DOC_SYNTHESE, Section, SyntheseEleve, Indice,
  indicesDeLEleve, dansLaPeriode, comptes, preRemplirSynthese,
} from "../synthese";

// ── Synthèse d'un élève (évaluation sommative) ─────────────────────────────
// Un bilan par domaine ou matière, sur une période, rédigé d'après le suivi
// de l'élève : compétences travaillées, progressions, évaluations,
// observations. Le pré-remplissage ne touche qu'aux sections vides.

const debutAnneeScolaire = () => `${anneeScolaireActuelle().slice(0, 4)}-08-01`;
const vierge = (): SyntheseEleve => ({ debut: debutAnneeScolaire(), fin: isoJour(new Date()), bilan: "", sections: {} });
const fmtFr = (iso: string) => { const [a, m, j] = (iso || "").split("-"); return a && m && j ? `${j}/${m}/${a}` : ""; };

function lireSynthese(brut: string | null): SyntheseEleve {
  try {
    const v = brut ? JSON.parse(brut) : null;
    if (!v || typeof v !== "object") return vierge();
    return { ...vierge(), ...v, sections: { ...(v.sections ?? {}) } };
  } catch {
    return vierge();
  }
}

/** Zone de texte qui grandit avec son contenu. */
function ZoneAuto({ valeur, onChange, placeholder, label }: { valeur: string; onChange: (v: string) => void; placeholder: string; label: string }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = `${Math.max(76, el.scrollHeight + 2)}px`; }
  }, [valeur]);
  return (
    <textarea ref={ref} className="textarea" value={valeur} placeholder={placeholder} aria-label={label}
      onChange={(e) => onChange(e.target.value)} style={{ resize: "vertical", lineHeight: 1.55, overflow: "hidden" }} />
  );
}

export function SyntheseEleveTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [synthese, setSynthese] = React.useState<SyntheseEleve>(vierge());
  const [indices, setIndices] = React.useState<Indice[]>([]);
  const [charge, setCharge] = React.useState(false);
  const [avant, setAvant] = React.useState<Partial<Record<Section | "bilan", string>>>({});
  const [redaction, setRedaction] = React.useState<Section | "bilan" | null>(null);
  const aEcrire = React.useRef<{ id: string; json: string } | null>(null);

  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  const lireSuivi = React.useCallback(async (id: string) => {
    const [competences, progressions, evaluations, notes, observations] = await Promise.all([
      api.documentEleveGet(id, TYPE_DOC_COMPETENCES).then(lireCompetences),
      api.documentEleveGet(id, "progressions").then((v) => { try { return v ? JSON.parse(v) : []; } catch { return []; } }),
      api.evaluationsList(), api.notesEleveList(), api.commentairesList(id),
    ]);
    return indicesDeLEleve(id, { competences, progressions, evaluations, notes, observations });
  }, []);

  React.useEffect(() => {
    if (!eleveId) return;
    let actif = true;
    setCharge(false);
    setAvant({});
    Promise.all([api.documentEleveGet(eleveId, TYPE_DOC_SYNTHESE), lireSuivi(eleveId)]).then(([brut, ind]) => {
      if (!actif) return;
      setSynthese(lireSynthese(brut));
      setIndices(ind);
      setCharge(true);
    });
    return () => { actif = false; };
  }, [eleveId, lireSuivi]);

  // Enregistrement peu après la frappe, et en changeant d'élève ou d'écran.
  const ecrire = React.useCallback(() => {
    const w = aEcrire.current;
    aEcrire.current = null;
    if (w) void api.documentEleveSet(w.id, TYPE_DOC_SYNTHESE, w.json);
  }, []);
  React.useEffect(() => {
    if (!aEcrire.current) return;
    const t = window.setTimeout(ecrire, 600);
    return () => window.clearTimeout(t);
  }, [synthese, ecrire]);
  React.useEffect(() => () => ecrire(), [eleveId, ecrire]);

  const modifier = (s: SyntheseEleve) => {
    setSynthese(s);
    if (eleveId) aEcrire.current = { id: eleveId, json: JSON.stringify(s) };
  };
  const setSection = (id: Section, texte: string) => modifier({ ...synthese, sections: { ...synthese.sections, [id]: texte } });

  const eleve = eleves?.find((e) => e.id === eleveId);
  const autres = (eleves ?? []).filter((e) => e.id !== eleveId).map((e) => e.nom);
  const periode = dansLaPeriode(indices, synthese.debut, synthese.fin);

  const preRemplir = async (seulement?: Section) => {
    if (!eleveId) return;
    if (seulement && (synthese.sections[seulement] ?? "").trim()
      && !(await confirmer("Remplacer le texte de cette section par un brouillon tiré du suivi ?", { oui: "Remplacer" }))) return;
    const frais = await lireSuivi(eleveId);
    setIndices(frais);
    if (seulement) setAvant((a) => ({ ...a, [seulement]: synthese.sections[seulement] ?? "" }));
    const r = preRemplirSynthese(synthese, frais, autres, seulement);
    modifier(r.synthese);
    if (!seulement) {
      toast(r.remplies
        ? `${r.remplies} section${r.remplies > 1 ? "s" : ""} pré-remplie${r.remplies > 1 ? "s" : ""} d'après le suivi — à relire. Les sections déjà écrites n'ont pas changé.`
        : dansLaPeriode(frais, synthese.debut, synthese.fin).length
          ? "Les sections qui ont des données sont déjà écrites."
          : "Rien sur cette période : citez des compétences (Progressions), positionnez des évaluations ou notez des observations.",
        { icone: r.remplies ? "✨" : "ℹ️", duree: 6500 });
    }
  };

  const rediger = async (cle: Section | "bilan") => {
    const texte = cle === "bilan" ? synthese.bilan : synthese.sections[cle] ?? "";
    if (!texte.trim()) { toast("Rien à rédiger dans cette section.", { icone: "✍️" }); return; }
    setRedaction(cle);
    try {
      const p = await reformuler(texte, "notes");
      setAvant((a) => ({ ...a, [cle]: texte }));
      if (cle === "bilan") modifier({ ...synthese, bilan: p.texte });
      else setSection(cle, p.texte);
    } catch (e) {
      toast(`Rédaction impossible : ${e}`, { icone: "⚠️", duree: 6000 });
    } finally {
      setRedaction(null);
    }
  };

  const revenir = (cle: Section | "bilan") => {
    const t = avant[cle];
    if (t == null) return;
    if (cle === "bilan") modifier({ ...synthese, bilan: t }); else setSection(cle, t);
    setAvant((a) => { const n = { ...a }; delete n[cle]; return n; });
  };

  const imprimer = async () => {
    if (!eleve) return;
    ecrire();
    const ecole = (await api.settingGet("ecole")) ?? "";
    const corps = SECTIONS_SYNTHESE.filter((s) => (synthese.sections[s.id] ?? "").trim())
      .map((s) => `<h2>${escapeHtml(s.titre)}</h2><div class="pre">${escapeHtml(synthese.sections[s.id]!.trim())}</div>`).join("");
    printHTML(`Synthèse — ${eleve.nom}`,
      `<h1>Synthèse — ${escapeHtml(eleve.nom)}</h1>` +
      `<div class="meta">Période du ${fmtFr(synthese.debut)} au ${fmtFr(synthese.fin)}${ecole ? ` · ${escapeHtml(ecole)}` : ""} · éditée le ${fmtFr(isoJour(new Date()))}</div>` +
      (synthese.bilan.trim() ? `<h2>Bilan général</h2><div class="pre">${escapeHtml(synthese.bilan.trim())}</div>` : "") +
      (corps || (synthese.bilan.trim() ? "" : "<p>Synthèse vide.</p>")));
  };

  if (!eleves) return null;
  if (!eleve) return <Empty icone="📋" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;

  const c = comptes(periode);
  const outilsSection = (cle: Section | "bilan") => (
    <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
      {avant[cle] != null && <button className="btn ghost sm" onClick={() => revenir(cle)}>↶ Revenir</button>}
      {cle !== "bilan" && (
        <button className="btn ghost sm" onClick={() => preRemplir(cle)} title="Remplacer par un brouillon tiré du suivi de la période">↻ Reprendre du suivi</button>
      )}
      <button className="btn sm" onClick={() => rediger(cle)} disabled={redaction === cle}
        title="Transformer ces notes en phrases rédigées (noms des élèves masqués avant l'envoi)">
        {redaction === cle ? "Rédaction…" : "✨ Rédiger"}
      </button>
    </div>
  );

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <Select value={eleveId} onChange={(e) => { ecrire(); setEleveId(e.target.value); }} style={{ maxWidth: 240 }} aria-label="Élève">
          {eleves.map((e) => <option key={e.id} value={e.id}>{e.nom}{e.niveau ? ` (${e.niveau})` : ""}</option>)}
        </Select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          Du <input type="date" className="input" value={synthese.debut} style={{ width: 150 }}
            onChange={(e) => modifier({ ...synthese, debut: e.target.value })} aria-label="Début de la période" />
          au <input type="date" className="input" value={synthese.fin} style={{ width: 150 }}
            onChange={(e) => modifier({ ...synthese, fin: e.target.value })} aria-label="Fin de la période" />
        </label>
        <div className="spacer" />
        <button className="btn" onClick={() => preRemplir()} disabled={!charge}>✨ Pré-remplir d'après le suivi</button>
        <button className="btn" onClick={imprimer}>🖨 Imprimer</button>
      </div>

      <div style={{ fontSize: 12.5, color: "var(--text-2)", margin: "-4px 0 12px" }}>
        {charge ? `Sur la période : ${c.reussites} réussite${c.reussites > 1 ? "s" : ""}, ${c.enCours} en cours, ${c.aConsolider} à consolider, ${c.observations} observation${c.observations > 1 ? "s" : ""}.`
          : "Lecture du suivi…"} Les observations de santé ne sont jamais reprises.
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <h3 style={{ margin: 0, fontSize: 15, flex: 1 }}>Bilan général</h3>
          {outilsSection("bilan")}
        </div>
        <ZoneAuto valeur={synthese.bilan} onChange={(v) => modifier({ ...synthese, bilan: v })} label="Bilan général"
          placeholder={`En quelques phrases : les progrès de ${(eleve.nom || "").split(" ")[0]}, ce qui l'aide, les priorités.`} />
      </div>

      {SECTIONS_SYNTHESE.map((s) => {
        const n = comptes(periode.filter((i) => i.section === s.id));
        const total = n.reussites + n.enCours + n.aConsolider + n.observations;
        return (
          <div key={s.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0, fontSize: 15 }}>{s.titre}</h3>
              <span style={{ fontSize: 12, color: "var(--text-2)", flex: 1 }}>
                {total ? [n.reussites && `${n.reussites} réussi`, n.enCours && `${n.enCours} en cours`, n.aConsolider && `${n.aConsolider} à consolider`,
                  n.observations && `${n.observations} observation${n.observations > 1 ? "s" : ""}`].filter(Boolean).join(" · ") : "rien dans le suivi"}
              </span>
              {outilsSection(s.id)}
            </div>
            <ZoneAuto valeur={synthese.sections[s.id] ?? ""} onChange={(v) => setSection(s.id, v)} label={s.titre}
              placeholder={total ? "« Pré-remplir d'après le suivi » propose un brouillon, ou écrivez directement." : "À écrire."} />
          </div>
        );
      })}
    </>
  );
}
