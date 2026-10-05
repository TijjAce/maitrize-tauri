import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { CasePicto } from "../components/CasePicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille, useOptionsFeuille } from "../components/OptionsFeuille";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { NIVEAUX, type Niveau } from "../categoriser";
import { idsDes, pictoVide, type PictoPose } from "../supportsVisuels";
import {
  ETAPES_CONSEILLEES, ETAPES_MAX, FORMES, REGLAGES_SUITES, REPERES, REPERES_ORDRE, STYLE_SUITES,
  cequiManque, etapesPleines, htmlSuites, motsDuTemps, nomDeLaForme, reglagesSurs, suitesPour,
  type Forme, type Repere, type ReglagesSuites,
} from "../suitesImages";

// ── Fabriquer › Images séquentielles ──────────────────────────────────────
//
// « S'approprier la notion de chronologie » : remettre dans l'ordre une
// histoire, un geste de tous les jours, une recette, un cycle de vie. Les
// images se posent dans l'ordre juste — des pictos, des photos de la classe
// prises au téléphone, les illustrations d'un album —, la feuille les mêle.

const ATELIER = "suites";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

export function SuitesTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesSuites>(ATELIER, REGLAGES_SUITES);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [suite, setSuite] = React.useState("");
  const ids = React.useMemo(() => idsDes(r.etapes), [r.etapes]);
  const images = usePictoImages(ids);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlSuites(r, images, hasard(graine)), [r, images, graine]);
  const titre = r.titre.trim() || nomDeLaForme(r.forme);
  // L'impression attend les images, et mêle comme l'aperçu.
  const feuilleImprimee = async () => htmlSuites(r, await chargerImages(ids), hasard(graine));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_SUITES); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  // Une étape de plus ou de moins, ou qui change de place : la liste reste dans l'ordre de l'histoire.
  const etapes = r.etapes.length ? r.etapes : [pictoVide(), pictoVide()];
  const changer = (liste: PictoPose[]) => maj({ etapes: liste });
  const deplacer = (i: number, vers: number) => {
    const liste = [...etapes];
    [liste[i], liste[vers]] = [liste[vers], liste[i]];
    changer(liste);
  };
  const suites = suitesPour(r.niveau);
  const prendre = async () => {
    const s = suites.find((x) => x.id === suite);
    if (!s) return;
    if (etapesPleines(r).length && !(await confirmer(`Remplacer vos images par « ${s.libelle} » ?`, { oui: "Remplacer" }))) return;
    maj({ etapes: s.etapes.map((e) => ({ id: e.id, mot: e.mot })), titre: s.libelle });
  };
  const n = etapesPleines(r).length;
  const { options } = useOptionsFeuille(ATELIER);
  const resume = [
    REPERES_ORDRE.find((x) => x.id === r.reperes)?.nom.split(" — ")[0],
    r.legendes && "mots sous les images",
    !options.consigne && "sans consigne", !options.prenom && "sans prénom", !options.corrige && "sans l'ordre juste",
  ].filter(Boolean).join(", ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Images séquentielles</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          « S'approprier la notion de chronologie » (programme 2025) : remettre dans l'ordre une histoire, un geste de tous les jours,
          une recette, un cycle de vie — puis raconter avec les mots du temps.
        </p>
        <Field label="Classe">
          <div className="seg">
            {NIVEAUX.map((x) => (
              <button key={x.id} type="button" className={r.niveau === x.id ? "active" : ""} onClick={() => maj({ niveau: x.id as Niveau })} title={x.age}>{x.id}</button>
            ))}
          </div>
        </Field>
        <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "-2px 0 10px" }}>
          {NIVEAUX.find((x) => x.id === r.niveau)?.age} : {REPERES[r.niveau]} {ETAPES_CONSEILLEES[r.niveau]} images, pour commencer.
        </div>
        <Field label="Le titre">
          <Input value={r.titre} placeholder="L'histoire d'un bonhomme de neige" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label={`Les images, dans l'ordre de l'histoire (${n})`}>
          <div className="si-etapes">
            {etapes.map((p, i) => (
              <div key={i} className="si-etape-ligne">
                <span className="si-etape-rang">{i + 1}</span>
                <CasePicto valeur={p} banque={banque} titre={`Image ${i + 1}`} taille={52}
                  onChange={(x) => changer(etapes.map((e, k) => (k === i ? x : e)))} />
                <span className="meta si-etape-mot">{motsDuTemps(r.niveau, etapes.length)[i]}</span>
                <span className="si-etape-actions">
                  <button type="button" className="btn ghost sm" disabled={i === 0} onClick={() => deplacer(i, i - 1)} aria-label={`Monter l'image ${i + 1}`}>↑</button>
                  <button type="button" className="btn ghost sm" disabled={i === etapes.length - 1} onClick={() => deplacer(i, i + 1)} aria-label={`Descendre l'image ${i + 1}`}>↓</button>
                  <button type="button" className="btn ghost sm" disabled={etapes.length <= 2} onClick={() => changer(etapes.filter((_, k) => k !== i))} aria-label={`Retirer l'image ${i + 1}`}>✕</button>
                </span>
              </div>
            ))}
            {etapes.length < ETAPES_MAX && (
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }} onClick={() => changer([...etapes, pictoVide()])}>＋ Une image</button>
            )}
          </div>
          <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>
            Un picto, une photo prise au téléphone, ou une image de l'ordinateur — les illustrations d'un album, par exemple.
          </div>
        </Field>
        <Field label="La feuille">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as Forme })}>
            {FORMES.map((f) => <option key={f.id} value={f.id}>{f.nom} — {f.quoi}</option>)}
          </Select>
        </Field>
        {/* Un pli : les exemples et la présentation se règlent une fois, puis se taisent. Il s'ouvre tant qu'il n'y a rien à ordonner. */}
        <details className="pli" open={n < 2}>
          <summary>Exemples et présentation{resume && <span className="meta"> · {resume}</span>}</summary>
          <Field label="Des suites toutes prêtes">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Select value={suite} onChange={(e) => setSuite(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">Choisir un exemple…</option>
                <optgroup label={`Pour la ${NIVEAUX.find((x) => x.id === r.niveau)?.classe ?? r.niveau}`}>
                  {suites.filter((s) => s.niveaux.includes(r.niveau)).map((s) => <option key={s.id} value={s.id}>{s.libelle} — {s.genre}</option>)}
                </optgroup>
                <optgroup label="Pour les autres classes">
                  {suites.filter((s) => !s.niveaux.includes(r.niveau)).map((s) => <option key={s.id} value={s.id}>{s.libelle} ({s.niveaux.join(", ")})</option>)}
                </optgroup>
              </Select>
              <button type="button" className="btn sm" disabled={!suite || !banque} onClick={() => { void prendre(); }}
                title={banque ? "" : "La banque de pictogrammes n'est pas téléchargée"}>Prendre</button>
            </div>
          </Field>
          <Field label="Près des cases">
            <Select value={r.reperes} onChange={(e) => maj({ reperes: e.target.value as Repere })}>
              {REPERES_ORDRE.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
            </Select>
          </Field>
          <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(legendes) => maj({ legendes })} />
          <CasesFeuille />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button type="button" className="btn sm" disabled={Boolean(manque)} onClick={() => setGraine(graineAuHasard())}>🎲 Mêler autrement</button>
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_SUITES)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {n >= 2
          ? <ApercuFeuille html={html} style={STYLE_SUITES} />
          : <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>
              Posez les images dans l'ordre de l'histoire — des pictos, des photos de la classe en activité, ou les illustrations d'un album
              prises au téléphone —, ou prenez une suite toute prête : « Se laver les mains » en petite section, « Le bonhomme de neige » en grande.
              La feuille les mêlera.
            </div>}
      </div>
    </div>
  );
}
