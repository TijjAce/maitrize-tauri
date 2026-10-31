import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import {
  COTE_MAX, COTE_MIN, DESSINS_TANGRAM, EXERCICES_TANGRAM, FIGURES_TANGRAM, REGLAGES_TANGRAM, avertissementTangram, htmlTangram,
  reglagesTangramSurs, styleTangram, titreTangram, type DessinTangram, type ExerciceTangram, type ReglagesTangram,
} from "../tangram";

// ── Fabriquer › le tangram ────────────────────────────────────────────────
//
// Le grand carré à découper, les modèles à recouvrir — à la taille des
// pièces de la classe —, les sept pièces en désordre, les parallélogrammes.

/** Les figures, rangées par nombre de pièces : de deux à sept. */
const PAR_PIECES = [...new Set(FIGURES_TANGRAM.map((f) => f.pieces.length))].map((n) => ({ n, figures: FIGURES_TANGRAM.filter((f) => f.pieces.length === n) }));

/** Le dessin qu'un exercice prend d'abord : en noir pour les pièces en désordre et les parallélogrammes, où seule la forme compte. */
const DESSIN_D_ABORD: Record<ExerciceTangram, DessinTangram> = { modele: "contours", carre: "contours", desordre: "silhouette", parallelogrammes: "silhouette" };

export function TangramTab() {
  const [brut, maj] = useReglages<ReglagesTangram>("tangram", REGLAGES_TANGRAM);
  const r = React.useMemo(() => reglagesTangramSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlTangram(r, graine), [r, graine]);
  const style = React.useMemo(() => styleTangram(r), [r]);
  const titre = r.titre?.trim() || titreTangram(r);
  const avertissement = avertissementTangram(r);
  const modele = r.exercice === "modele";
  const tirage = r.exercice === "desordre" || r.exercice === "parallelogrammes";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le tangram
          <Aide titre="Le tangram" vers="droite"><p>Le grand carré à découper ; des modèles à recouvrir, de plus en plus difficiles — de deux pièces aux sept,
            chaque pièce dessinée, en couleur, puis la silhouette, à la taille des pièces ou plus petits ; les sept pièces en désordre, à poser chacune sur sa
            forme ; le parallélogramme, tourné ou retourné. Les figures sont de Maitrize. Plastifiez les modèles : ils resservent.</p></Aide>
        </h3>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => { const exercice = e.target.value as ExerciceTangram; maj({ exercice, dessin: DESSIN_D_ABORD[exercice] }); }}>
            {EXERCICES_TANGRAM.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <Field label="Le côté du grand carré, en mm">
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* Ce qu'on tape reste affiché ; la feuille, elle, prend la taille relue — entre 60 et 180 mm. */}
            <Input type="number" min={COTE_MIN} max={COTE_MAX} value={brut.cote || ""} placeholder={String(REGLAGES_TANGRAM.cote)} style={{ width: 110 }}
              onChange={(e) => maj({ cote: Math.max(0, Math.min(COTE_MAX, Math.round(Number(e.target.value)) || 0)) })} />
            <Aide titre="La taille des pièces" vers="droite"><p>Rangez les sept pièces de la classe en carré, et mesurez son côté : les modèles s'impriment à la taille
              de ces pièces, pour qu'on les pose dessus. Le grand carré à découper sort à cette taille aussi.</p></Aide>
          </div>
        </Field>
        {modele && (
          <Field label="La figure">
            <Select value={r.figure} onChange={(e) => maj({ figure: e.target.value })}>
              {PAR_PIECES.map((g) => (
                <optgroup key={g.n} label={`${g.n} pièces`}>
                  {g.figures.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Le dessin">
          <Select value={r.dessin} onChange={(e) => maj({ dessin: e.target.value as DessinTangram })}>
            {DESSINS_TANGRAM.filter((d) => d.exercices.includes(r.exercice)).map((d) => <option key={d.id} value={d.id}>{d.libelle}</option>)}
          </Select>
        </Field>
        {modele && (
          <>
            <Coche on={!!r.petit} onChange={(petit) => maj({ petit })}
              libelle="Plus petit que les pièces — à moitié de leur taille : on construit à côté du modèle, pas dessus." />
            {(r.dessin === "contours" || r.dessin === "couleur") && !r.petit && (
              <Coche on={!!r.etapes} onChange={(etapes) => maj({ etapes })}
                libelle="En petit livre — une page par pièce, des plus grandes aux plus petites : la pièce de la page est cernée, les suivantes restent pâles." />
            )}
          </>
        )}
        {avertissement && <p style={{ fontSize: 13, color: "var(--orange)", margin: "6px 0" }}>⚠️ {avertissement}</p>}
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder={titreTangram(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="tangram" titre={titre} html={html} style={style} peut onTirage={tirage ? () => setGraine(graineAuHasard()) : undefined} />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
