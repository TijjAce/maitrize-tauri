import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_GEOMETRIE, REGLAGES_GEOMETRIE, STYLE_GEOMETRIE, htmlGeometrie, type Classe, type ExerciceGeometrie, type NiveauReproduction } from "../geometrie";
import { EXERCICES_SOLIDES, REGLAGES_SOLIDES, STYLE_SOLIDES, htmlSolides, type ExerciceSolides, type ReglagesSolides } from "../solides";
import { EXERCICES_DEPLACEMENTS, REGLAGES_DEPLACEMENTS, STYLE_DEPLACEMENTS, htmlDeplacements, type ModeCodage } from "../deplacements";

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
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlGeometrie(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_GEOMETRIE.find((e) => e.id === r.exercice)?.libelle, "Géométrie");
  const surGrille = r.exercice === "reproduire" || r.exercice === "symetriques" || ((r.exercice === "symetrie" || r.exercice === "completer") && !r.uni);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Géométrie
          <Aide titre="Géométrie" vers="droite"><p>Reproduire sur quadrillage et vérifier au calque, compléter un carré ou un rectangle, reconnaître les figures, les alignements, les angles, le compas, les constructions et la symétrie — d'après le programme 2024 et le document Éduscol « Espace et géométrie au cycle 2 ». À la taille réelle : imprimez à 100 %.</p></Aide>
        </h3>
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
        {r.exercice === "reproduire" && <Coche on={!!r.repere} libelle="Un repère orthonormé, pour différencier" onChange={(v) => maj({ repere: v })} />}
        {r.exercice === "completer" && <Coche on={r.uni} libelle="Sur papier uni, les figures inclinées (CE1, CE2)" onChange={(v) => maj({ uni: v })} />}
        {r.exercice === "symetrie" && <Coche on={!!r.diagonale} libelle="L'axe en diagonale des carreaux — on compte les diagonales de carreau jusqu'à l'axe, puis autant de l'autre côté." onChange={(v) => maj({ diagonale: v })} />}
        {r.exercice === "symetrie" && <Coche on={r.uni} libelle="Sur papier uni, sans quadrillage — on plie et on pique, ou l'on retourne un calque." onChange={(v) => maj({ uni: v })} />}
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
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlSolides(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_SOLIDES.find((e) => e.id === r.exercice)?.libelle, "Les solides");
  const sansNombre = r.exercice === "denombrer" || r.exercice === "patronCube" || r.exercice === "faces";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les solides
          <Aide titre="Les solides" vers="droite"><p>Des solides dessinés en perspective cavalière à reconnaître et à nommer, les objets et leur forme, les faces, les sommets et les arêtes, le jeu du portrait, l'intrus ; les faces à découper, les patrons du cube, des assemblages de cubes à construire.</p></Aide>
        </h3>
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
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlDeplacements(r, graine), [r, graine]);
  const titre = titreDe(EXERCICES_DEPLACEMENTS.find((e) => e.id === r.exercice)?.libelle, "Se déplacer").split(" : ")[0];
  // La bille et le robot sont le même exercice, à deux niveaux : on passe de l'un à l'autre pour différencier.
  const quadrillage = r.exercice !== "positions";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Se repérer, se déplacer
          <Aide titre="Se repérer, se déplacer" vers="droite"><p>La bille et ses flèches — « La fusée » de la ressource Éduscol « Initiation à la programmation aux cycles 2 et 3 » —, le robot qui avance et pivote d'un quart de tour, les cartes des positions. D'après le programme 2024 : au plus dix instructions et deux virages au CP, quinze et quatre au CE1.</p></Aide>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <ChoixClasse valeur={r.classe} onChange={(c) => maj({ classe: c as "CP" | "CE1" })} classes={["CP", "CE1"]} />
          <Field label="Combien">
            <Input type="number" min={1} max={6} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 6, 4) })} style={{ width: 80 }} />
          </Field>
        </div>
        <Field label="Exercice">
          <Select value={quadrillage ? "quadrillage" : "positions"} onChange={(e) => maj({ exercice: e.target.value === "positions" ? "positions" : "fusee" })}>
            <option value="quadrillage">Se déplacer sur le quadrillage</option>
            <option value="positions">{EXERCICES_DEPLACEMENTS.find((e) => e.id === "positions")!.libelle}</option>
          </Select>
        </Field>
        {quadrillage && <>
          <Field label="Le code">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div className="seg">
                <button type="button" className={r.exercice === "fusee" ? "active" : ""} onClick={() => maj({ exercice: "fusee" })}>Des flèches</button>
                <button type="button" className={r.exercice === "robot" ? "active" : ""} onClick={() => maj({ exercice: "robot" })}>Des rotations (plus dur)</button>
              </div>
              <Aide titre="Le code" vers="gauche">
                <p><b>Des flèches</b> : la bille rouge va dans le sens de la flèche, une case par flèche. Elle ne tourne jamais : le haut reste le haut de la feuille.</p>
                <p><b>Des rotations</b>, comme les blocs « avancer » et « tourner ↻ ↺ » de Scratch : le robot regarde dans une direction ; ⬆ le fait avancer d'une case devant lui, ↻ et ↺ le font pivoter d'un quart de tour sans avancer. Sa droite n'est pas forcément celle de l'élève : c'est ce qui rend l'exercice plus dur.</p>
              </Aide>
            </div>
          </Field>
          <Field label="Ce qu'on fait">
            <Select value={r.mode} onChange={(e) => maj({ mode: e.target.value as ModeCodage })}>
              <option value="decoder">Suivre le code et tracer le chemin</option>
              <option value="coder">Écrire le code d'un chemin tracé</option>
              <option value="corriger">Corriger un code faux</option>
            </Select>
          </Field>
        </>}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("deplacements", titre, html, STYLE_DEPLACEMENTS)} onBureau={() => bureau("deplacements", titre, html, STYLE_DEPLACEMENTS)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_DEPLACEMENTS} />}
    />
  );
}
