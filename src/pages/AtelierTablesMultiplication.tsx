import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  REGLAGES_MULTIPLICATION, STYLE_MULTIPLICATION, TABLES_POSSIBLES, TITRE_DES_TABLES, htmlMultiplication, reglagesMultiplicationSurs,
  titreMultiplication, type ReglagesMultiplication,
} from "../tablesMultiplication";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Mathématiques › Les tables de multiplication ──────────────
//
// Les tables qu'on veut, une page chacune avec ses rectangles de points, ou
// la table de Pythagore ; pour le mur ou pour l'élève (voir
// tablesMultiplication.ts). Il en reste toujours une : sans table, il n'y
// aurait rien à afficher.

const ATELIER = "tablesMultiplication";

export function TablesMultiplicationTab() {
  const [brut, maj] = useReglages<ReglagesMultiplication>(ATELIER, REGLAGES_MULTIPLICATION);
  const r = React.useMemo(() => reglagesMultiplicationSurs(brut), [brut]);
  const html = React.useMemo(() => htmlMultiplication(r), [r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les tables de multiplication
          <Aide titre="Les tables de multiplication" vers="droite"><p>Le programme de 2024 veut, dès le CE1, les tables de multiplication connues
            « dans les deux sens » — 3 × 4 = 12, et 12 = 3 × 4 —, apprises « de manière progressive » sur toute l'année : on affiche celles qu'on
            travaille, et on en ajoute.</p>
            <p>Chaque produit a son rectangle de points : 3 × 4, ce sont trois rangées de quatre — et quatre colonnes de trois, ce qui fait voir que
            3 × 4 = 4 × 3. La table de Pythagore les croise toutes : les tables choisies en couleur, les carrés sur la diagonale.</p>
            <p>Pour l'élève, chacune se fait en petit, quatre par page : à découper et à coller dans le cahier.</p></Aide>
        </h3>
        <Field label="Ce qu'on imprime">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as ReglagesMultiplication["forme"] })}>
            <option value="table">La table de chaque nombre : 3 × 1 … 3 × 10</option>
            <option value="pythagore">La table de Pythagore de la multiplication</option>
          </Select>
        </Field>
        <Field label="Pour qui">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesMultiplication["format"] })}>
            <option value="mur">Pour le mur : une page chacune</option>
            <option value="eleve">Pour l'élève : quatre par page, à coller dans le cahier</option>
          </Select>
        </Field>
        <Field label={r.forme === "pythagore" ? "Les tables en couleur" : "Les tables, une page chacune"}>
          <Chips liste={TABLES_POSSIBLES} choisis={r.tables} onChange={(tables) => { if (tables.length) maj({ tables }); }} />
        </Field>
        {r.forme === "table" && (
          <Field label="L'écriture">
            <Select value={r.ecriture} onChange={(e) => maj({ ecriture: e.target.value as ReglagesMultiplication["ecriture"] })}>
              <option value="produit">3 × 4 = 12</option>
              <option value="inverse">4 × 3 = 12</option>
              <option value="egalite">12 = 3 × 4</option>
            </Select>
          </Field>
        )}
        {r.forme === "table" && <Coche on={r.points} libelle="Avec les rectangles de points" onChange={(points) => maj({ points })} />}
        <Coche on={r.avecZero} libelle={r.forme === "table" ? "Avec 3 × 0" : "Avec la ligne et la colonne du 0"} onChange={(avecZero) => maj({ avecZero })} />
        <Field label={r.forme === "pythagore" ? "Le titre de la page" : "Le titre de chaque page, avant le nombre"}>
          <Input value={brut.titre ?? ""} placeholder={r.forme === "pythagore" ? "La table de Pythagore" : TITRE_DES_TABLES}
            onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={titreMultiplication(r)} html={html} style={STYLE_MULTIPLICATION} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_MULTIPLICATION} />}
    />
  );
}
