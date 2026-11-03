import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  NOMBRES_DES_FAMILLES, NOMBRES_DES_TABLES, REGLAGES_FAMILLES, STYLE_FAMILLES, TITRE_DES_FAMILLES, htmlFamilles, reglagesFamillesSurs, titreFamilles,
  type ReglagesFamilles,
} from "../famillesAddition";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Mathématiques › Les tables d'addition ─────────────────────
//
// Les nombres qu'on veut, une maison ou une table chacun, ou la table de
// Pythagore ; pour le mur ou pour l'élève (voir famillesAddition.ts). Il en
// reste toujours un : sans nombre, il n'y aurait rien à afficher.

const ATELIER = "famillesAddition";

export function FamillesAdditionTab() {
  const [brut, maj] = useReglages<ReglagesFamilles>(ATELIER, REGLAGES_FAMILLES);
  const r = React.useMemo(() => reglagesFamillesSurs(brut), [brut]);
  const html = React.useMemo(() => htmlFamilles(r), [r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les tables d'addition
          <Aide titre="Les tables d'addition" vers="droite"><p>La famille d'un nombre, ce sont toutes ses façons de le faire en deux parties : 7, c'est 1 et 6, 2 et 5,
            3 et 4. Chaque nombre a sa maison, sur sa page : un étage par décomposition, et la même dans l'autre sens à côté. Les billes bleues font la première partie,
            les rouges la seconde, comme dans « Deux tas de billes ». Le programme de 2024 veut les tables d'addition connues « dans les deux sens » : l'écriture se choisit.</p>
            <p>La table d'un nombre aligne 7 + 1, 7 + 2… jusqu'à 7 + 10 ; la table de Pythagore les croise toutes, les doubles en couleur.</p>
            <p>Pour l'élève, chacune se fait en petit, quatre par page : à découper et à coller dans le cahier.</p></Aide>
        </h3>
        <Field label="Ce qu'on imprime">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as ReglagesFamilles["forme"] })}>
            <option value="maison">La maison de chaque nombre : ses familles</option>
            <option value="table">La table de chaque nombre : 7 + 1 … 7 + 10</option>
            <option value="pythagore">La table de Pythagore de l'addition</option>
          </Select>
        </Field>
        <Field label="Pour qui">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesFamilles["format"] })}>
            <option value="mur">Pour le mur : une page chacune</option>
            <option value="eleve">Pour l'élève : quatre par page, à coller dans le cahier</option>
          </Select>
        </Field>
        {r.forme !== "pythagore" && (
          <Field label="Les nombres, une page chacun">
            <Chips liste={r.forme === "maison" ? NOMBRES_DES_FAMILLES : NOMBRES_DES_TABLES} choisis={r.nombres} onChange={(nombres) => { if (nombres.length) maj({ nombres }); }} />
          </Field>
        )}
        <Field label="L'écriture">
          <Select value={r.ecriture} onChange={(e) => maj({ ecriture: e.target.value as ReglagesFamilles["ecriture"] })}>
            <option value="somme">4 + 3 = 7</option>
            <option value="decomposition">7 = 4 + 3</option>
          </Select>
        </Field>
        <Coche on={r.avecZero} libelle={r.forme === "maison" ? "Avec 0 + 7 et 7 + 0" : r.forme === "table" ? "Avec 7 + 0" : "Avec la ligne et la colonne du 0"}
          onChange={(avecZero) => maj({ avecZero })} />
        <Field label={r.forme === "pythagore" ? "Le titre de la page" : "Le titre de chaque page, avant le nombre"}>
          <Input value={brut.titre ?? ""} placeholder={r.forme === "maison" ? TITRE_DES_FAMILLES : r.forme === "table" ? "La table du" : "La table d'addition"}
            onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={titreFamilles(r)} html={html} style={STYLE_FAMILLES} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_FAMILLES} />}
    />
  );
}
