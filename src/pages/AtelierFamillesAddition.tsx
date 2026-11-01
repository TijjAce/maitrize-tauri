import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  NOMBRES_DES_FAMILLES, REGLAGES_FAMILLES, STYLE_FAMILLES, TITRE_DES_FAMILLES, htmlFamilles, reglagesFamillesSurs, titreFamilles,
  type ReglagesFamilles,
} from "../famillesAddition";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Affichages › Les familles d'addition ──────────────────────
//
// Les nombres qu'on veut au mur, une maison chacun (voir famillesAddition.ts).
// Il en reste toujours un : sans nombre, il n'y aurait rien à afficher.

const ATELIER = "famillesAddition";

export function FamillesAdditionTab() {
  const [brut, maj] = useReglages<ReglagesFamilles>(ATELIER, REGLAGES_FAMILLES);
  const r = React.useMemo(() => reglagesFamillesSurs(brut), [brut]);
  const html = React.useMemo(() => htmlFamilles(r), [r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les familles d'addition
          <Aide titre="Les familles d'addition" vers="droite"><p>La famille d'un nombre, ce sont toutes ses façons de le faire en deux parties : 7, c'est 1 et 6, 2 et 5,
            3 et 4. Chaque nombre a sa maison, sur sa page : un étage par décomposition, et la même dans l'autre sens à côté. Les billes bleues font la première partie,
            les rouges la seconde, comme dans « Deux tas de billes ». Le programme de 2024 veut les tables d'addition connues « dans les deux sens » : l'écriture se choisit.</p></Aide>
        </h3>
        <Field label="Les nombres, une page chacun">
          <Chips liste={NOMBRES_DES_FAMILLES} choisis={r.nombres} onChange={(nombres) => { if (nombres.length) maj({ nombres }); }} />
        </Field>
        <Field label="L'écriture">
          <Select value={r.ecriture} onChange={(e) => maj({ ecriture: e.target.value as ReglagesFamilles["ecriture"] })}>
            <option value="somme">4 + 3 = 7</option>
            <option value="decomposition">7 = 4 + 3</option>
          </Select>
        </Field>
        <Coche on={r.avecZero} libelle="Avec 0 + 7 et 7 + 0" onChange={(avecZero) => maj({ avecZero })} />
        <Field label="Le titre de chaque page, avant le nombre">
          <Input value={brut.titre ?? ""} placeholder={TITRE_DES_FAMILLES} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={titreFamilles(r)} html={html} style={STYLE_FAMILLES} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_FAMILLES} />}
    />
  );
}
