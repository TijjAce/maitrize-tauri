import React from "react";
import { Aide, AideEnLigne } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import {
  EXERCICES_RECTANGLES, OBJETS_EN_RECTANGLE, REGLAGES_RECTANGLES, STYLE_RECTANGLES, htmlRectangles, reglagesRectanglesSurs, titreRectangles,
  type ExerciceRectangles, type ObjetsEnRectangle, type ReglagesRectangles, type TablePythagore,
} from "../multiplicationEnRectangles";

// ── Fabriquer › multiplier en rectangles ──────────────────────────────────
//
// Le sens de la multiplication posée : des objets rangés en rectangle, un
// quadrillage qu'on coupe aux dizaines, un grand rectangle à découper, la
// table de Pythagore.

/** Un nombre de 2 à 60, ou rien pour le tirer au sort. Ce qu'on tape reste affiché — le « 1 » de 15 — ; les réglages relus l'écartent s'il est trop petit. */
function Nombre({ libelle, valeur, onChange }: { libelle: string; valeur: number; onChange: (n: number) => void }) {
  return (
    <Field label={libelle}>
      <Input type="number" min={0} max={60} value={valeur || ""} placeholder="au hasard" style={{ width: 110 }}
        onChange={(e) => onChange(Math.max(0, Math.min(60, Math.round(Number(e.target.value)) || 0)))} />
    </Field>
  );
}

export function RectanglesTab() {
  const [brut, maj] = useReglages<ReglagesRectangles>("rectangles", REGLAGES_RECTANGLES);
  const r = React.useMemo(() => reglagesRectanglesSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlRectangles(r, graine), [r, graine]);
  const titre = r.titre?.trim() || titreRectangles(r);
  const quadrillage = r.exercice === "quadrillage";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Multiplier en rectangles
          <Aide titre="Multiplier en rectangles" vers="droite"><p>Ce qui donne son sens à la multiplication posée, d'après la séquence de la multiplication du manuel
            « Réussir mon CRPE » (Nathan) : des objets rangés en rectangle — 26 rangées de 15 choux, coupées en 26 × 10 et 26 × 5 —, un quadrillage qu'on
            coupe le long des lignes, aux dizaines, un grand rectangle à découper en quatre morceaux, et la table de Pythagore. La feuille laisse chercher ;
            le corrigé coupe le rectangle et écrit les produits.</p></Aide>
        </h3>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceRectangles })}>
            {EXERCICES_RECTANGLES.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {r.exercice !== "pythagore" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Nombre libelle={quadrillage ? "Carreaux de long" : "Dans chaque rangée"} valeur={brut.parRangee} onChange={(parRangee) => maj({ parRangee })} />
            <Nombre libelle={quadrillage ? "Carreaux de large" : "Rangées"} valeur={brut.rangees} onChange={(rangees) => maj({ rangees })} />
          </div>
        )}
        {r.exercice === "objets" && (
          <Field label="Les objets">
            <Select value={r.objets ?? ""} onChange={(e) => maj({ objets: (e.target.value || undefined) as ObjetsEnRectangle | undefined })}>
              <option value="">au hasard</option>
              {OBJETS_EN_RECTANGLE.map((o) => <option key={o.id} value={o.id}>{o.libelle}</option>)}
            </Select>
          </Field>
        )}
        {quadrillage && (
          <>
            <Field label="Au corrigé, le quadrillage coupé">
              <Select value={r.morceaux ?? 2} onChange={(e) => maj({ morceaux: Number(e.target.value) as 2 | 4 })}>
                <option value={2}>en deux, aux dizaines d'un côté</option><option value={4}>en quatre, aux dizaines des deux côtés</option>
              </Select>
            </Field>
            <Coche on={!!r.aDecouper} onChange={(aDecouper) => maj({ aDecouper })}
              libelle="Le rectangle seul, à découper — le plus grand possible sur la page, pour le couper en morceaux par groupe." />
          </>
        )}
        {r.exercice === "pythagore" && (
          <Field label="La table">
            <Select value={r.pythagore ?? "remplie"} onChange={(e) => maj({ pythagore: e.target.value as TablePythagore })}>
              <option value="remplie">remplie, à afficher</option><option value="trous">à compléter en partie</option><option value="vide">à remplir entièrement</option>
            </Select>
          </Field>
        )}
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder={titreRectangles(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="rectangles" titre={titre} html={html} style={STYLE_RECTANGLES} peut onTirage={() => setGraine(graineAuHasard())} />
        <AideEnLigne libelle="📚 En faire une séquence"><p>Une séquence part de sa compétence : Plan de travail › Nouvelle séquence, puis la compétence visée.
          La séquence de la multiplication du manuel du CRPE (CE2) prend ses feuilles ici.</p></AideEnLigne>
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_RECTANGLES} />}
    />
  );
}
