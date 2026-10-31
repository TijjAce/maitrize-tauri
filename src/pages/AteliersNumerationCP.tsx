import React from "react";
import { Aide, AideEnLigne } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import {
  ABAQUES_MAX, EXERCICES_BILLES, EXERCICES_SUITE, PARTIES_ABAQUE, REGLAGES_ABAQUE, REGLAGES_BILLES, REGLAGES_SUITE, STYLE_NUMERATION_CP,
  htmlAbaque, htmlBilles, htmlSuite, nombreMax, reglagesAbaqueSurs, reglagesBillesSurs, reglagesSuiteSurs, titreAbaque, titreBilles, titreSuite,
  type ExerciceBilles, type ExerciceSuite, type PartieAbaque, type ReglagesAbaque, type ReglagesBilles, type ReglagesSuite,
} from "../numerationCP";

// ── Fabriquer › la numération au CP, en manipulant ────────────────────────
//
// Trois ateliers : des billes et des calots, l'abaque à deux tiges, la suite
// des nombres. Les nombres se choisissent de … à …, jusqu'à 100.

/** « De … à … » : deux nombres, dans les bornes de l'exercice. */
function Bornes({ de, a, min, max, onChange }: { de: number; a: number; min: number; max: number; onChange: (de: number, a: number) => void }) {
  const lire = (v: string, d: number) => Math.max(min, Math.min(max, Number(v) || d));
  return (
    <Field label={`Les nombres, de ${min} à ${max}`}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <Input type="number" min={min} max={max} value={de} onChange={(e) => onChange(lire(e.target.value, de), a)} style={{ width: 70 }} aria-label="De" />
        <span>→</span>
        <Input type="number" min={min} max={max} value={a} onChange={(e) => onChange(de, lire(e.target.value, a))} style={{ width: 70 }} aria-label="À" />
      </div>
    </Field>
  );
}

/** Des boutons qu'on coche et décoche : les exercices de la feuille, au moins un. */
export function Choix<T extends string>({ liste, choisis, onChange }: { liste: { id: T; libelle: string }[]; choisis: T[]; onChange: (v: T[]) => void }) {
  const basculer = (id: T) => {
    const suivant = choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id];
    if (suivant.length) onChange(liste.map((x) => x.id).filter((x) => suivant.includes(x)));
  };
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {liste.map((x) => (
        <button key={x.id} type="button" className={`btn sm${choisis.includes(x.id) ? " primary" : " ghost"}`} onClick={() => basculer(x.id)}>{x.libelle}</button>
      ))}
    </div>
  );
}

const EN_FAIRE_UNE_SEQUENCE = <AideEnLigne libelle="📚 En faire une séquence"><p>Une séquence part de sa compétence : Plan de travail › Nouvelle séquence, puis la compétence visée.</p></AideEnLigne>;

// ── Billes et calots ──

export function BillesTab() {
  const [brut, maj] = useReglages<ReglagesBilles>("billes", REGLAGES_BILLES);
  const r = React.useMemo(() => reglagesBillesSurs(brut), [brut]);
  const ex = EXERCICES_BILLES.find((e) => e.id === r.exercice)!;
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlBilles(r, graine), [r, graine]);
  const titre = r.titre.trim() || titreBilles(r);
  /** Un autre exercice : ses nombres et son nombre d'exercices de départ. */
  const changerDExercice = (id: ExerciceBilles) => {
    const suivant = EXERCICES_BILLES.find((e) => e.id === id)!;
    maj({ exercice: id, de: suivant.defaut[0], a: suivant.defaut[1], nombre: suivant.nombre.defaut });
  };
  const mot = r.exercice === "compter" && r.a <= 10 ? "boîtes" : ex.nombre.mot;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Billes et calots
          <Aide titre="Billes et calots" vers="droite"><p>Des billes dispersées à compter, en faisant un paquet de dix ; deux tas qui font un nombre ;
            un calot vaut dix billes : qui a gagné la partie ? Jusqu'à 100, comme le prévoit le programme du CP.</p></Aide>
        </h3>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => changerDExercice(e.target.value as ExerciceBilles)}>
            {EXERCICES_BILLES.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <Bornes de={r.de} a={r.a} min={ex.min} max={ex.max} onChange={(de, a) => maj({ de, a })} />
        <Field label={`Combien de ${mot}`}>
          <Input type="number" min={ex.nombre.min} max={nombreMax(r.exercice, r.a)} value={r.nombre} style={{ width: 80 }}
            onChange={(e) => maj({ nombre: Number(e.target.value) || ex.nombre.defaut })} />
        </Field>
        {r.exercice === "compter" && r.a > 10 && (
          <AideEnLigne libelle="Le corrigé"><p>Au corrigé, chaque paquet de dix est entouré, jusqu'à 59.</p></AideEnLigne>
        )}
        {r.exercice === "partie" && <Coche on={r.regle} libelle="La règle « un calot vaut dix billes », dessinée en haut" onChange={(regle) => maj({ regle })} />}
        <Field label="Le titre">
          <Input value={r.titre} placeholder={titreBilles({ ...r, titre: "" })} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="billes" titre={titre} html={html} style={STYLE_NUMERATION_CP} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_NUMERATION_CP} />}
    />
  );
}

// ── L'abaque ──

export function AbaqueTab() {
  const [brut, maj] = useReglages<ReglagesAbaque>("abaque", REGLAGES_ABAQUE);
  const r = React.useMemo(() => reglagesAbaqueSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlAbaque(r, graine), [r, graine]);
  const titre = r.titre.trim() || titreAbaque(r);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          L'abaque
          <Aide titre="L'abaque à deux tiges" vers="droite"><p>Deux tiges de dix jetons au plus : les verts comptent les unités ; dix verts s'échangent contre un rouge,
            qui va sur la tige des dizaines — c'est sa place qui fait la dizaine. Faire l'échange, lire l'abaque, dessiner les jetons d'un nombre.</p></Aide>
        </h3>
        <Field label="Les exercices">
          <Choix<PartieAbaque> liste={PARTIES_ABAQUE} choisis={r.parties} onChange={(parties) => maj({ parties })} />
        </Field>
        <Bornes de={r.de} a={r.a} min={1} max={99} onChange={(de, a) => maj({ de, a })} />
        {(r.parties.includes("lire") || r.parties.includes("dessiner")) && (
          <Field label="Combien d'abaques à lire, à dessiner">
            <Input type="number" min={2} max={ABAQUES_MAX} value={r.nombre} style={{ width: 80 }} onChange={(e) => maj({ nombre: Number(e.target.value) || 4 })} />
          </Field>
        )}
        {r.parties.includes("echange") && (
          <AideEnLigne libelle="L'échange"><p>La tige des unités est pleine, et d'autres jetons verts attendent à côté : dix d'entre eux s'échangent contre un rouge.</p></AideEnLigne>
        )}
        <Field label="Le titre">
          <Input value={r.titre} placeholder={titreAbaque(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="abaque" titre={titre} html={html} style={STYLE_NUMERATION_CP} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_NUMERATION_CP} />}
    />
  );
}

// ── La suite des nombres ──

export function SuiteNombresTab() {
  const [brut, maj] = useReglages<ReglagesSuite>("suiteNombres", REGLAGES_SUITE);
  const r = React.useMemo(() => reglagesSuiteSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlSuite(r, graine), [r, graine]);
  const titre = r.titre.trim() || titreSuite(r);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          La suite des nombres
          <Aide titre="La suite des nombres" vers="droite"><p>La suite écrite et la suite orale des nombres : la frise à compléter, le nombre juste avant et juste après,
            ranger et comparer — en chiffres, en mots, sur l'abaque, en calots —, le nom des nombres, les dizaines et les unités en barres et en cubes.</p></Aide>
        </h3>
        <Field label="Les exercices">
          <Choix<ExerciceSuite> liste={EXERCICES_SUITE} choisis={r.exercices} onChange={(exercices) => maj({ exercices })} />
        </Field>
        <Bornes de={r.de} a={r.a} min={0} max={100} onChange={(de, a) => maj({ de, a })} />
        <Field label="Le titre">
          <Input value={r.titre} placeholder={titreSuite(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="suiteNombres" titre={titre} html={html} style={STYLE_NUMERATION_CP} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_NUMERATION_CP} />}
    />
  );
}
