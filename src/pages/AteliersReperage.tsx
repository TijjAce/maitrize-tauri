import React from "react";
import { Aide, AideEnLigne } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Colonnes } from "./AteliersLangage";
import {
  CLASSES_REPERAGE, EXERCICES_REPERAGE, REGLAGES_DEMI_DROITE, REGLAGES_ORDINAUX, STYLE_REPERAGE, htmlReperage, reglagesReperageSurs, titreParDefaut,
  titreReperage, type AtelierReperage, type ClasseReperage, type ExerciceReperage, type ReglagesReperage,
} from "../reperageNombres";

// ── Fabriquer › la demi-droite graduée, les nombres ordinaux ──────────────
//
// Les deux ateliers des séquences de la demi-droite et des ordinaux : une
// classe, un exercice, et les nombres de la classe, d'après les exemples de
// réussite du programme de 2024.

const PRESENTATION: Record<AtelierReperage, { titre: string; aide: string }> = {
  demiDroite: {
    titre: "La demi-droite graduée",
    aide: "Le nombre d'un point, c'est le nombre d'unités qui le séparent de 0. Compter les unités, placer un nombre, lire celui d'un point, trouver le pas, "
      + "compléter les nombres qui manquent et la bande lacunaire : de un en un au CP, de dix en dix et de cent en cent au CE1, de mille en mille au CE2, "
      + "d'après les exemples de réussite du programme de 2024 et la frise numérique du guide CP.",
  },
  ordinaux: {
    titre: "Les nombres ordinaux",
    aide: "Le rang dans une file, une liste, une suite : le train et ses wagons, les gobelets « en partant de la gauche », la course d'EPS, premier et 1er, "
      + "devant moi et derrière moi, les suites qui se répètent — « quelle est la dix-neuvième lettre ? » — et, au CE1, celles qui grandissent. "
      + "D'après les exemples de réussite du programme de 2024.",
  },
};

function ReperageTab({ atelier }: { atelier: AtelierReperage }) {
  const [brut, maj] = useReglages<ReglagesReperage>(atelier, atelier === "demiDroite" ? REGLAGES_DEMI_DROITE : REGLAGES_ORDINAUX);
  const r = React.useMemo(() => reglagesReperageSurs(atelier, brut), [atelier, brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlReperage(r, graine), [r, graine]);
  const titre = titreReperage(r);
  const exercices = EXERCICES_REPERAGE[atelier].filter((e) => e.classes.includes(r.classe));
  const p = PRESENTATION[atelier];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {p.titre}
          <Aide titre={p.titre} vers="droite"><p>{p.aide}</p></Aide>
        </h3>
        <Field label="La classe">
          <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as ClasseReperage })}>
            {CLASSES_REPERAGE[atelier].map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceReperage })}>
            {exercices.map((e) => <option key={e.id} value={e.id}>{titreParDefaut({ exercice: e.id, classe: r.classe })}</option>)}
          </Select>
        </Field>
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder={titreParDefaut(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={atelier} titre={titre} html={html} style={STYLE_REPERAGE} peut onTirage={() => setGraine(graineAuHasard())} />
        <AideEnLigne libelle="📚 En faire une séquence"><p>Une séquence part de sa compétence : Plan de travail › Nouvelle séquence, puis la compétence visée.
          Les séquences de la demi-droite graduée et des nombres ordinaux prennent leurs feuilles ici.</p></AideEnLigne>
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_REPERAGE} />}
    />
  );
}

export const DemiDroiteTab = () => <ReperageTab atelier="demiDroite" />;
export const OrdinauxTab = () => <ReperageTab atelier="ordinaux" />;
