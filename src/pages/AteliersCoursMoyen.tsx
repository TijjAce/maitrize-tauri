import React from "react";
import { Aide, AideEnLigne } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import { Choix } from "./AteliersNumerationCP";
import {
  EXERCICES_CALCUL_CM, REGLAGES_CALCUL_CM, STYLE_CALCUL_CM, combienAuPlus, htmlCalculCM, reglagesCalculCMSurs, sePose, titreCalculCM,
  type ExerciceCalculCM, type ReglagesCalculCM,
} from "../calculCoursMoyen";
import {
  PROBLEMES_CM_MAX, REGLAGES_PROBLEMES_CM, SORTES_PROBLEMES_CM, STYLE_PROBLEMES_CM, htmlProblemesCM, reglagesProblemesCMSurs,
  type ReglagesProblemesCM, type SorteProblemeCM,
} from "../problemesCoursMoyen";
import {
  AVEC_GRANDEUR, EXERCICES_GRANDEURS, REGLAGES_GRANDEURS_CM, STYLE_GRANDEURS_CM, SURFACES_DE_REFERENCE, htmlGrandeursCM, reglagesGrandeursCMSurs,
  type ExerciceGrandeurs, type GrandeurCM, type ReglagesGrandeursCM, type SurfaceDeReference,
} from "../grandeursCoursMoyen";

// ── Fabriquer › le cours moyen ─────────────────────────────────────────────
//
// Les ateliers des feuilles du CM1 et du CM2 : le calcul, les problèmes, les
// grandeurs, la géométrie, d'après le programme du cycle 3 (2025) et ses
// exemples de réussite. Les séquences du cours moyen y prennent leurs
// feuilles, celles du manuel du CRPE de l'enseignant comme les autres : on
// les y refait.

const CLASSES = ["CM1", "CM2"] as const;

const EN_FAIRE_UNE_SEQUENCE = <AideEnLigne libelle="📚 En faire une séquence"><p>Une séquence part de sa compétence : Plan de travail › Nouvelle séquence, puis la compétence visée.
  Les séquences du CM1 et du CM2 prennent leurs feuilles ici, et « Modifier dans Fabriquer » les y rouvre.</p></AideEnLigne>;

/** La classe : le CM1 ou le CM2. */
function ChoixDeLaClasse({ classe, onChange }: { classe: "CM1" | "CM2"; onChange: (c: "CM1" | "CM2") => void }) {
  return (
    <Field label="La classe">
      <div className="seg">
        {CLASSES.map((c) => <button key={c} type="button" className={classe === c ? "active" : ""} onClick={() => onChange(c)}>{c}</button>)}
      </div>
    </Field>
  );
}

/** Combien d'opérations, de problèmes ou d'items : entre 1 et `max`. */
function Combien({ libelle, valeur, max, onChange }: { libelle: string; valeur: number; max: number; onChange: (n: number) => void }) {
  return (
    <Field label={libelle}>
      <Input type="number" min={1} max={max} value={valeur} style={{ width: 80 }}
        onChange={(e) => onChange(Math.max(1, Math.min(max, Number(e.target.value) || 1)))} />
    </Field>
  );
}

// ── Le calcul ──

export function CalculCMTab() {
  const [brut, maj] = useReglages<ReglagesCalculCM>("calculCM", REGLAGES_CALCUL_CM);
  const r = React.useMemo(() => reglagesCalculCMSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlCalculCM(r, graine), [r, graine]);
  const titre = r.titre?.trim() || titreCalculCM(r);
  const decimaux = r.exercice === "addition-decimaux" || r.exercice === "soustraction-decimaux";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le calcul — CM1, CM2
          <Aide titre="Le calcul au cours moyen" vers="droite"><p>Les quatre opérations du programme du cycle 3 (2025) : additions et soustractions de décimaux,
            multiplications, divisions euclidiennes et décimales, chacune dans son quadrillage, une case par chiffre, avec le corrigé ; les parenthèses, l'estimation.
            Avant la potence, le quotient et le reste en ligne, puis le partage des centaines, des dizaines et des unités, comme le trésor des pirates du manuel
            « Réussir mon CRPE » (Nathan).</p></Aide>
        </h3>
        <ChoixDeLaClasse classe={r.classe} onChange={(classe) => maj({ classe })} />
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceCalculCM })}>
            {EXERCICES_CALCUL_CM.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {decimaux && (
          <Coche on={r.decimales === "differentes"} onChange={(v) => maj({ decimales: v ? "differentes" : "melange" })}
            libelle="Des parties décimales de longueurs différentes — comme 12,47 + 2,7 : les nombres alignés à droite comme des entiers, ou dix dixièmes laissés dans leur colonne, sont les erreurs que le manuel du CRPE relève." />
        )}
        {r.exercice === "multiplication-entiers" && (
          <Field label="Le second facteur">
            <Select value={r.chiffresDuSecond ?? 2} onChange={(e) => maj({ chiffresDuSecond: Number(e.target.value) as 2 | 3 })}>
              <option value={2}>deux chiffres</option><option value={3}>trois chiffres</option>
            </Select>
          </Field>
        )}
        {r.exercice === "division-euclidienne" && (
          <Field label="Le diviseur">
            <Select value={r.diviseur ?? 1} onChange={(e) => maj({ diviseur: Number(e.target.value) as 1 | 2 })}>
              <option value={1}>un chiffre</option><option value={2}>deux chiffres, comme 785 ÷ 25</option>
            </Select>
          </Field>
        )}
        {r.exercice === "division-euclidienne" && (
          <Coche on={!!r.difficultes} onChange={(difficultes) => maj({ difficultes })}
            libelle="Les cas difficiles d'abord — un quotient qui commence au deuxième chiffre, comme 256 ÷ 9, puis un zéro au quotient, comme 824 ÷ 4 : ceux qu'une évaluation doit montrer." />
        )}
        {r.exercice === "division-decimale" && (
          <Field label="Le dividende">
            <Select value={r.dividende ?? "entier"} onChange={(e) => maj({ dividende: e.target.value as "entier" | "decimal" })}>
              <option value="entier">entier</option><option value="decimal">décimal</option>
            </Select>
          </Field>
        )}
        {r.exercice === "division-partages" && (
          <Coche on={!!r.materiel} onChange={(materiel) => maj({ materiel })}
            libelle="Le nombre dessiné en plaques, barres et cubes — à côté de son tableau, pour qui a encore besoin du matériel : une plaque restante devient dix barres." />
        )}
        {sePose(r.exercice) && (
          <Coche on={r.posees} onChange={(posees) => maj({ posees })}
            libelle="Les nombres placés dans le quadrillage — sinon, l'élève pose lui-même l'opération écrite en ligne." />
        )}
        <Combien libelle="Combien de calculs" valeur={r.combien} max={combienAuPlus(r.exercice)} onChange={(combien) => maj({ combien })} />
        {r.exercice === "division-euclidienne" && r.diviseur === 2 && r.classe === "CM1" && (
          <AideEnLigne libelle="Au-delà du programme"><p>Le programme de 2025 s'en tient, au CM1, au diviseur à un chiffre. Le manuel du CRPE va jusqu'au diviseur à deux chiffres,
            pour ceux qui sont prêts.</p></AideEnLigne>
        )}
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder={titreCalculCM(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="calculCM" titre={titre} html={html} style={STYLE_CALCUL_CM} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_CALCUL_CM} />}
    />
  );
}

// ── Les problèmes ──

const SORTES_AFFICHEES = SORTES_PROBLEMES_CM.map((s) => ({ id: s.id, libelle: s.cm2 ? `${s.libelle} (CM2)` : s.libelle }));

export function ProblemesCMTab() {
  const [brut, maj] = useReglages<ReglagesProblemesCM>("problemesCM", REGLAGES_PROBLEMES_CM);
  const r = React.useMemo(() => reglagesProblemesCMSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlProblemesCM(r, graine), [r, graine]);
  const titre = r.titre?.trim() || "Résoudre des problèmes";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les problèmes — CM1, CM2
          <Aide titre="Les problèmes au cours moyen" vers="droite"><p>Les problèmes du programme du cycle 3 (2025) et de ses exemples de réussite, sur de grands nombres,
            des décimaux et des grandeurs, résolus en quatre phases — comprendre, modéliser, calculer, répondre. Le corrigé écrit les calculs, la phrase réponse
            et le schéma en barres quand il aide. Les sortes se mêlent dans l'ordre choisi ; les prénoms sont inventés.</p></Aide>
        </h3>
        <ChoixDeLaClasse classe={r.classe} onChange={(classe) => maj({ classe })} />
        <Field label="Les problèmes">
          <Choix<SorteProblemeCM> liste={SORTES_AFFICHEES} choisis={r.sortes} onChange={(sortes) => maj({ sortes })} />
        </Field>
        <Combien libelle="Combien de problèmes" valeur={r.combien} max={PROBLEMES_CM_MAX} onChange={(combien) => maj({ combien })} />
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder="Résoudre des problèmes" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="problemesCM" titre={titre} html={html} style={STYLE_PROBLEMES_CM} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PROBLEMES_CM} />}
    />
  );
}

// ── Les grandeurs ──

const GRANDEURS: { id: GrandeurCM; libelle: string }[] = [{ id: "longueur", libelle: "Longueurs" }, { id: "masse", libelle: "Masses" }, { id: "contenance", libelle: "Contenances" }];

export function GrandeursCMTab() {
  const [brut, maj] = useReglages<ReglagesGrandeursCM>("grandeursCM", REGLAGES_GRANDEURS_CM);
  const r = React.useMemo(() => reglagesGrandeursCMSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlGrandeursCM(r, graine), [r, graine]);
  const titre = r.titre?.trim() || "Grandeurs et mesures";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Grandeurs et mesures — CM1, CM2
          <Aide titre="Les grandeurs au cours moyen" vers="droite"><p>Les longueurs, les masses et les contenances avec toutes leurs unités, le périmètre, les aires, les angles
            et les durées, d'après le programme du cycle 3 (2025) et ses exemples de réussite. Pour les aires, ce que la séquence du manuel « Réussir mon CRPE » (Nathan)
            fait faire avant de mesurer : comparer sans mesurer, puis paver avec une surface de référence. Les figures à comparer et à paver sont en vraie grandeur :
            on peut les découper.</p></Aide>
        </h3>
        <ChoixDeLaClasse classe={r.classe} onChange={(classe) => maj({ classe })} />
        <Field label="Les exercices">
          <Choix<ExerciceGrandeurs> liste={EXERCICES_GRANDEURS} choisis={r.exercices} onChange={(exercices) => maj({ exercices })} />
        </Field>
        {r.exercices.some((e) => AVEC_GRANDEUR.includes(e)) && (
          <Field label="La grandeur">
            <div className="seg">
              {GRANDEURS.map((g) => <button key={g.id} type="button" className={r.grandeur === g.id ? "active" : ""} onClick={() => maj({ grandeur: g.id })}>{g.libelle}</button>)}
            </div>
          </Field>
        )}
        {r.exercices.includes("aire-reference") && (
          <Field label="La surface de référence">
            <Select value={r.reference ?? ""} onChange={(e) => maj({ reference: (e.target.value || undefined) as SurfaceDeReference | undefined })}>
              <option value="">au hasard</option>
              {SURFACES_DE_REFERENCE.map((x) => <option key={x.id} value={x.id}>{x.libelle}</option>)}
            </Select>
          </Field>
        )}
        <Combien libelle="Combien d'items par exercice" valeur={r.combien} max={10} onChange={(combien) => maj({ combien })} />
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder="Grandeurs et mesures" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="grandeursCM" titre={titre} html={html} style={STYLE_GRANDEURS_CM} peut onTirage={() => setGraine(graineAuHasard())} />
        {EN_FAIRE_UNE_SEQUENCE}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_GRANDEURS_CM} />}
    />
  );
}
