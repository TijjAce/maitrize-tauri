import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Choix } from "./AteliersNumerationCP";
import {
  OUTILS_D_AIDE, PROBLEMES_AIDES_MAX, PROBLEMES_DE_LA_RENCONTRE, REGLAGES_PROBLEMES_AIDES, STYLE_PROBLEMES_AIDES, htmlProblemesAides,
  reglagesProblemesAidesSurs, type OutilDAide, type ProblemeAide, type ReglagesProblemesAides,
} from "../problemesEtOutilsDAide";

// ── Fabriquer › des problèmes et leurs outils d'aide ──────────────────────
//
// Les problèmes que la classe se pose, écrits avec leurs nombres : la fiche,
// les outils d'aide à découper — les ronds, les ronds remplis de croix, la
// bande —, le corrigé.

/** Un problème à écrire : l'énoncé, ce qu'on cherche, les deux nombres connus, l'unité, le nom des deux parties. */
function EditeurDeProbleme({ p, i, onChange, onRetirer }: { p: ProblemeAide; i: number; onChange: (p: ProblemeAide) => void; onRetirer?: () => void }) {
  const nombre = (k: 0 | 1, v: string) => { const n = [...p.nombres] as [number, number]; n[k] = Math.max(0, Math.min(9999, Math.round(Number(v)) || 0)); onChange({ ...p, nombres: n }); };
  const nom = (k: 0 | 1, v: string) => { const n = [...p.noms] as [string, string]; n[k] = v; onChange({ ...p, noms: n }); };
  const tout = p.cherche === "tout";
  return (
    <div className="card" style={{ padding: 10, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <b>Problème {i + 1}</b>
        {onRetirer && <button type="button" className="btn ghost sm" onClick={onRetirer}>Retirer</button>}
      </div>
      <Textarea value={p.enonce} rows={3} onChange={(e) => onChange({ ...p, enonce: e.target.value })} aria-label={`L'énoncé du problème ${i + 1}`} />
      <Field label="On cherche">
        <Select value={p.cherche} onChange={(e) => onChange({ ...p, cherche: e.target.value as ProblemeAide["cherche"] })}>
          <option value="tout">le tout</option><option value="partie">ce qu'il manque</option>
        </Select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <Field label={tout ? "Une partie" : "Le tout"}><Input type="number" min={0} value={p.nombres[0]} onChange={(e) => nombre(0, e.target.value)} /></Field>
        <Field label={tout ? "L'autre partie" : "La partie connue"}><Input type="number" min={0} value={p.nombres[1]} onChange={(e) => nombre(1, e.target.value)} /></Field>
        <Field label={tout ? "Le nom de la première" : "Le nom de la partie connue"}><Input value={p.noms[0]} onChange={(e) => nom(0, e.target.value)} /></Field>
        <Field label={tout ? "Le nom de l'autre" : "Le nom de ce qui manque"}><Input value={p.noms[1]} onChange={(e) => nom(1, e.target.value)} /></Field>
      </div>
      <Field label="Ce qu'on compte"><Input value={p.unite} placeholder="élèves, places, ballons…" onChange={(e) => onChange({ ...p, unite: e.target.value })} /></Field>
    </div>
  );
}

export function ProblemesAidesTab() {
  const [brut, maj] = useReglages<ReglagesProblemesAides>("problemesAides", REGLAGES_PROBLEMES_AIDES);
  const r = React.useMemo(() => reglagesProblemesAidesSurs(brut), [brut]);
  const html = React.useMemo(() => htmlProblemesAides(r), [r]);
  const titre = r.titre?.trim() || "Des problèmes et leurs outils d'aide";
  const changer = (i: number, p: ProblemeAide) => maj({ problemes: r.problemes.map((x, k) => (k === i ? p : x)) });
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Problèmes et outils d'aide
          <Aide titre="Problèmes et outils d'aide" vers="droite"><p>Les problèmes que la classe se pose — chercher le tout, ou ce qu'il manque —, écrits avec leurs nombres,
            comme la rencontre sportive de la séquence des problèmes additifs du manuel « Réussir mon CRPE » (Nathan) : la fiche, chaque problème dans son cadre ;
            les outils d'aide à découper, pour qui en a besoin — deux ronds dans un même cadre, les mêmes remplis de croix pour les plus fragiles, la bande en
            deux parties — ; le corrigé. Pour la fiche des groupes, imprimez-la en A3.</p></Aide>
        </h3>
        {r.problemes.map((p, i) => (
          <EditeurDeProbleme key={i} p={p} i={i} onChange={(x) => changer(i, x)}
            onRetirer={r.problemes.length > 1 ? () => maj({ problemes: r.problemes.filter((_, k) => k !== i) }) : undefined} />
        ))}
        {r.problemes.length < PROBLEMES_AIDES_MAX && (
          <button type="button" className="btn sm" style={{ marginBottom: 8 }}
            onClick={() => maj({ problemes: [...r.problemes, { enonce: "", cherche: "tout", nombres: [10, 5], unite: "", noms: ["", ""] }] })}>+ Un problème</button>
        )}
        <Field label="Les outils d'aide">
          <Choix<OutilDAide> liste={OUTILS_D_AIDE} choisis={r.aides} onChange={(aides) => maj({ aides })} />
        </Field>
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder="Des problèmes et leurs outils d'aide" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="problemesAides" titre={titre} html={html} style={STYLE_PROBLEMES_AIDES} peut={r.problemes.some((p) => p.enonce.trim())} />
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
          <button type="button" className="btn ghost sm" onClick={() => maj({ problemes: PROBLEMES_DE_LA_RENCONTRE })}>↺ La rencontre sportive</button>
          <Aide titre="La rencontre sportive" vers="droite"><p>Les trois problèmes de la séance du manuel : les enfants de la rencontre, les places libres du car, les ballons à apporter.</p></Aide>
        </div>
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PROBLEMES_AIDES} />}
    />
  );
}
