import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_GEOMETRIE, REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type Classe, type ExerciceGeometrie, type NiveauReproduction } from "../geometrie";
import { EXERCICES_SOLIDES, REGLAGES_SOLIDES, STYLE_SOLIDES, htmlSolides, type ExerciceSolides, type ReglagesSolides } from "../solides";
import { EXERCICES_DEPLACEMENTS, REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements, type ExerciceDeplacements, type ModeCodage } from "../deplacements";

// ── Fabriquer › Mathématiques : la géométrie, les solides, se déplacer ────

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));
const titreDe = (libelle: string | undefined, defaut: string) => (libelle ?? defaut).replace(/ \((CP|CE1|CE2)(, (CE1|CE2))?\)$/, "");

const ChoixClasse = ({ valeur, onChange, classes = ["CP", "CE1", "CE2"] }: { valeur: string; onChange: (c: string) => void; classes?: string[] }) => (
  <Field label="Classe">
    <Select value={valeur} onChange={(e) => onChange(e.target.value)}>
      {classes.map((c) => <option key={c} value={c}>{c}</option>)}
    </Select>
  </Field>
);

export function GeometrieTab() {
  const [r, maj] = useReglages("geometrie", REGLAGES_GEOMETRIE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlGeometrie(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_GEOMETRIE.find((e) => e.id === r.exercice)?.libelle, "Géométrie");
  const surGrille = r.exercice === "reproduire" || r.exercice === "symetrie" || (r.exercice === "completer" && !r.uni);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Géométrie</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Reproduire sur quadrillage et vérifier au calque, compléter un carré ou un rectangle, reconnaître les figures, les alignements, les angles, le compas, les constructions et la symétrie — d'après le programme 2024 et le document Éduscol « Espace et géométrie au cycle 2 ». À la taille réelle : imprimez à 100 %.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ChoixClasse valeur={r.classe} onChange={(c) => maj({ classe: c as Classe })} />
          <Field label="Combien">
            <Input type="number" min={1} max={16} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 16, 4) })} style={{ width: 80 }} />
          </Field>
        </div>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceGeometrie })}>
            {EXERCICES_GEOMETRIE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {r.exercice === "reproduire" && (
          <Field label="Les figures">
            <Select value={r.niveau} onChange={(e) => maj({ niveau: e.target.value as NiveauReproduction })}>
              <option value="lignes">Les côtés suivent les lignes (CP)</option>
              <option value="diagonales">Des diagonales qui passent par les nœuds (CE1)</option>
              <option value="obliques">D'un nœud quelconque à l'autre (CE1, CE2)</option>
            </Select>
          </Field>
        )}
        {r.exercice === "completer" && <Coche on={r.uni} libelle="Sur papier uni, les figures inclinées (CE1, CE2)" onChange={(v) => maj({ uni: v })} />}
        {surGrille && (
          <Field label="Le support">
            <Select value={r.support} onChange={(e) => maj({ support: e.target.value as "quadrille" | "pointe" })}>
              <option value="quadrille">Papier quadrillé</option><option value="pointe">Papier pointé</option>
            </Select>
          </Field>
        )}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("geometrie", titre, html, STYLE_GEOMETRIE)} onBureau={() => bureau("geometrie", titre, html, STYLE_GEOMETRIE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_GEOMETRIE} />}
    />
  );
}

export function SolidesTab() {
  const [r, maj] = useReglages("solides", REGLAGES_SOLIDES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlSolides(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_SOLIDES.find((e) => e.id === r.exercice)?.libelle, "Les solides");
  const sansNombre = r.exercice === "denombrer" || r.exercice === "patronCube" || r.exercice === "faces";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Les solides</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Des solides dessinés en perspective cavalière à reconnaître et à nommer, les objets et leur forme, les faces, les sommets et les arêtes, le jeu du portrait, l'intrus ; les faces à découper, les patrons du cube, des assemblages de cubes à construire.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ChoixClasse valeur={r.classe} onChange={(c) => maj({ classe: c as ReglagesSolides["classe"] })} />
          {!sansNombre && (
            <Field label="Combien">
              <Input type="number" min={1} max={16} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 16, 8) })} style={{ width: 80 }} />
            </Field>
          )}
        </div>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceSolides })}>
            {EXERCICES_SOLIDES.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {r.exercice === "faces" && (
          <Field label="Le solide">
            <Select value={r.solide} onChange={(e) => maj({ solide: e.target.value as ReglagesSolides["solide"] })}>
              <option value="cube">Le cube</option><option value="pavé">Le pavé</option><option value="pyramide">La pyramide à base carrée</option>
            </Select>
          </Field>
        )}
        {["nommer", "denombrer", "portrait", "intrus"].includes(r.exercice) && <Coche on={r.cachees} libelle="Les arêtes cachées en pointillés (CE2)" onChange={(v) => maj({ cachees: v })} />}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("solides", titre, html, STYLE_SOLIDES)} onBureau={() => bureau("solides", titre, html, STYLE_SOLIDES)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_SOLIDES} />}
    />
  );
}

export function DeplacementsTab() {
  const [r, maj] = useReglages("deplacements", REGLAGES_DEPLACEMENTS);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlDeplacements(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_DEPLACEMENTS.find((e) => e.id === r.exercice)?.libelle, "Se déplacer").split(" : ")[0];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Se repérer, se déplacer</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          La fusée et ses flèches, le robot qui avance et pivote d'un quart de tour, les cartes des positions — d'après le programme 2024 et la ressource Éduscol « Initiation à la programmation aux cycles 2 et 3 » : au plus dix instructions et deux virages au CP, quinze et quatre au CE1.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ChoixClasse valeur={r.classe} onChange={(c) => maj({ classe: c as "CP" | "CE1" })} classes={["CP", "CE1"]} />
          <Field label="Combien">
            <Input type="number" min={1} max={6} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 6, 4) })} style={{ width: 80 }} />
          </Field>
        </div>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceDeplacements })}>
            {EXERCICES_DEPLACEMENTS.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {r.exercice !== "positions" && (
          <Field label="Ce qu'on fait">
            <Select value={r.mode} onChange={(e) => maj({ mode: e.target.value as ModeCodage })}>
              <option value="decoder">Suivre le code et tracer le chemin</option>
              <option value="coder">Écrire le code d'un chemin tracé</option>
              {r.exercice === "fusee" && <option value="corriger">Corriger un code faux</option>}
            </Select>
          </Field>
        )}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("deplacements", titre, html, STYLE_DEPLACEMENTS)} onBureau={() => bureau("deplacements", titre, html, STYLE_DEPLACEMENTS)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_DEPLACEMENTS} />}
    />
  );
}
