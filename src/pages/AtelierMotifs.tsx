import React from "react";
import { Aide, LibelleAvecAide } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { ChoixPicto, chargerImages, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille } from "../components/OptionsFeuille";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import {
  COULEURS_MOTIFS, EXERCICES_MOTIFS, FORMES_MOTIFS, MATIERES, NIVEAUX_MOTIFS, REGLAGES_MOTIFS, STRUCTURES, STYLE_MOTIFS,
  cequiManque, elementsEmployes, htmlMotifs, idsDesImages, reglagesDuNiveau, reglagesMotifsSurs,
  type ElementMotif, type ExerciceMotifs, type Forme, type Matiere, type NiveauMotifs, type ReglagesMotifs, type StructureMotif,
} from "../motifs";

// ── Fabriquer › Les motifs ────────────────────────────────────────────────
//
// « Se familiariser avec les motifs organisés » : la séquence 1 des trois
// livrets de mathématiques de la maternelle (Éduscol, 2025). On choisit la
// classe, l'exercice, la règle du motif et ses éléments ; la feuille se voit
// à droite telle qu'elle s'imprimera.

const ATELIER = "motifs";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span><LibelleAvecAide libelle={libelle} /></span></label>
);

/** Un élément du motif — A, B ou C — : sa couleur, sa forme, ou son image. */
function ReglageElement({ i, e, matiere, banque, onChange }: {
  i: number; e: ElementMotif; matiere: Matiere; banque: boolean; onChange: (e: Partial<ElementMotif>) => void;
}) {
  const [choix, setChoix] = React.useState(false);
  const src = usePictoImage(matiere === "pictos" ? e.picto : null);
  const lettre = "ABC"[i];
  return (
    <div className="mo-reglage">
      <b className="mo-lettre">{lettre}</b>
      {matiere === "pictos" ? (
        <div className="mo-reglage-image">
          <button type="button" className="mo-picto" onClick={() => setChoix(true)} disabled={!banque}
            title={banque ? "Choisir l'image" : "La banque de pictogrammes n'est pas téléchargée"}>
            {src ? <img src={src} alt="" /> : <span aria-hidden="true">🖼</span>}
          </button>
          <Input value={e.mot} placeholder="le mot" aria-label={`Le mot de l'élément ${lettre}`} onChange={(ev) => onChange({ mot: ev.target.value })} />
        </div>
      ) : (
        <div className="mo-reglage-choix">
          {matiere === "formes" && (
            <Select value={e.forme} aria-label={`La forme de l'élément ${lettre}`} onChange={(ev) => onChange({ forme: ev.target.value as Forme })}>
              {FORMES_MOTIFS.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </Select>
          )}
          <div className="cp-couleurs" role="radiogroup" aria-label={`La couleur de l'élément ${lettre}`}>
            {COULEURS_MOTIFS.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={e.couleur === c.id} aria-label={c.m} title={c.m}
                className={`cp-pastille${e.couleur === c.id ? " active" : ""}`} style={{ background: c.hex }} onClick={() => onChange({ couleur: c.id })} />
            ))}
          </div>
        </div>
      )}
      {choix && (
        <ChoixPicto valeur={{ id: e.picto, mot: e.mot }} banque={banque} titre={`L'élément ${lettre} du motif`} photos
          onClose={() => setChoix(false)} onValider={(p) => { onChange({ picto: p.id, mot: e.mot.trim() || p.mot }); setChoix(false); }} />
      )}
    </div>
  );
}

export function MotifsTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesMotifs>(ATELIER, REGLAGES_MOTIFS);
  const r = React.useMemo(() => reglagesMotifsSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const ids = React.useMemo(() => idsDesImages(r), [r]);
  const images = usePictoImages(ids);
  const manque = cequiManque(r);
  const html = React.useMemo(() => (manque ? "" : htmlMotifs(r, images, hasard(graine))), [r, images, graine, manque]);
  const exercice = EXERCICES_MOTIFS.find((e) => e.id === r.exercice)!;
  const titre = `Les motifs — ${exercice.nom.toLowerCase()}`;
  const niveau = NIVEAUX_MOTIFS.find((n) => n.id === r.niveau)!;
  const exercices = EXERCICES_MOTIFS.filter((e) => e.niveaux.includes(r.niveau));
  const structures = STRUCTURES.filter((s) => s.niveaux.includes(r.niveau));
  // Le fil à linge, ce sont des chaussettes.
  const matiere: Matiere = r.exercice === "fil" ? "chaussettes" : r.matiere;
  const changerElement = (i: number, e: Partial<ElementMotif>) => maj({ elements: r.elements.map((x, k) => (k === i ? { ...x, ...e } : x)) });
  const feuilleImprimee = async () => htmlMotifs(r, ids.length ? await chargerImages(ids) : {}, hasard(graine));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_MOTIFS); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const tirage = r.exercice === "completer" || r.exercice === "intrus" || r.exercice === "structure";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les motifs
          <Aide titre="D'où viennent ces exercices" vers="droite">
            <p>{"« Se familiariser avec les motifs organisés » : la séquence 1 des trois livrets d'accompagnement de mathématiques de la maternelle (Éduscol, 2025)."}</p>
            <p>{"Avant 4 ans, un seul type de motif, le motif répétitif, qu'on mémorise et qu'on reproduit — le fil à linge de la mascotte, modèle à distance. À partir de 4 ans, on le reconnaît, on le décrit, on le complète, on le prolonge, on y trouve un intrus. À partir de 5 ans, le motif évolutif, et la même règle avec d'autres objets."}</p>
            <p>{"Les chaussettes ont un tissu — à pois, rayé, uni —, les formes leur silhouette : le motif se lit aussi photocopié en noir et blanc."}</p>
          </Aide>
        </h3>
        <Field label="Classe">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="seg">
              {NIVEAUX_MOTIFS.map((n) => (
                <button key={n.id} type="button" className={r.niveau === n.id ? "active" : ""} title={n.age}
                  onClick={() => maj({ niveau: n.id as NiveauMotifs, ...reglagesDuNiveau(n.id) })}>{n.id}</button>
              ))}
            </div>
            <Aide titre={`Ce qu'on attend ${niveau.age}`} vers="droite"><p>{niveau.repere}</p></Aide>
          </div>
        </Field>
        <Field label="L'exercice">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceMotifs })}>
              {exercices.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </Select>
            <Aide titre={exercice.nom} vers="gauche"><p>{exercice.quoi.charAt(0).toUpperCase() + exercice.quoi.slice(1)}.</p></Aide>
          </div>
        </Field>
        <Field label="La règle du motif">
          <Select value={r.structure} onChange={(e) => maj({ structure: e.target.value as StructureMotif })}>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </Select>
        </Field>
        {r.exercice !== "fil" && (
          <Field label="Les éléments">
            <div className="seg">
              {MATIERES.map((m) => (
                <button key={m.id} type="button" className={r.matiere === m.id ? "active" : ""} onClick={() => maj({ matiere: m.id })}>{m.nom}</button>
              ))}
            </div>
          </Field>
        )}
        {r.elements.slice(0, elementsEmployes(r.structure) === 3 || r.exercice === "intrus" ? 3 : 2).map((e, i) => (
          <ReglageElement key={i} i={i} e={e} matiere={matiere} banque={banque} onChange={(x) => changerElement(i, x)} />
        ))}
        {elementsEmployes(r.structure) === 2 && r.exercice === "intrus" && (
          <p className="meta" style={{ fontSize: 12, margin: "2px 0 6px" }}>C sert à faire l'intrus, avec A et B à la mauvaise place.</p>
        )}
        <Field label={r.exercice === "structure" ? "Combien de cartes" : r.exercice === "fil" ? "Combien de fils" : "Combien de bandes"}>
          <Input type="number" min={1} max={12} value={r.combien} style={{ width: 80 }}
            onChange={(e) => maj({ combien: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
        </Field>
        {(r.exercice === "fil" || r.exercice === "reproduire" || r.exercice === "completer" || r.exercice === "prolonger") && (
          <Coche on={r.decouper} libelle="Les éléments à découper, pour les poser au lieu de les dessiner" onChange={(v) => maj({ decouper: v })} />
        )}
        {r.exercice === "intrus" && (
          <Coche on={r.autocorrective} libelle="La bande autocorrective : l'intrus repéré au dos, pour vérifier seul" onChange={(v) => maj({ autocorrective: v })} />
        )}
        {manque && <div style={{ marginTop: 8, fontSize: 13, color: "var(--danger, #b03030)" }}>{manque}</div>}
        <CasesFeuille />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {tirage && <button type="button" className="btn sm" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>}
          <button type="button" className="btn primary sm" disabled={!!manque} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={!!manque} onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_MOTIFS)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {html ? <ApercuFeuille html={html} style={STYLE_MOTIFS} />
          : <div className="card" style={{ color: "var(--text-2)", fontSize: 13 }}>{manque}</div>}
      </div>
    </div>
  );
}
