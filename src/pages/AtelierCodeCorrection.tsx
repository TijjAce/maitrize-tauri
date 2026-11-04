import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  ERREURS, REGLAGES_CODE_CORRECTION, STYLE_CODE_CORRECTION, couleurDe, erreur, htmlCodeCorrection, reglagesCodeCorrectionSurs,
  titreCodeCorrection, type ReglagesCodeCorrection, type TypeErreur,
} from "../codeDeCorrection";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Français › Le code de correction ──────────────────────────
//
// Les sortes d'erreurs que l'élève corrige dans son écrit, chacune avec son
// code, ce qu'il fait pour corriger et un exemple (voir codeDeCorrection.ts).
// Les codes et les couleurs sont ceux de la classe.

const ATELIER = "codeCorrection";

export function CodeCorrectionTab() {
  const [brut, maj] = useReglages<ReglagesCodeCorrection>(ATELIER, REGLAGES_CODE_CORRECTION);
  const r = React.useMemo(() => reglagesCodeCorrectionSurs(brut), [brut]);
  const html = React.useMemo(() => htmlCodeCorrection(r), [r]);
  const changees = Object.keys(r.codes).length > 0 || Object.keys(r.couleurs).length > 0;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le code de correction
          <Aide titre="Le code de correction" vers="droite"><p>Le guide « Pour enseigner la lecture et l'écriture au CE1 » donne à l'élève une
            typologie des erreurs : pour chaque sorte d'erreur, ce qu'il fait pour corriger son écrit. Au CE1, on s'en tient aux erreurs de sons,
            aux erreurs de dictionnaire et aux erreurs d'accord, dans le groupe nominal et entre le sujet et le verbe (p. 106) ; les mots qui se
            disent pareil et les mots mal découpés viennent ensuite.</p>
            <p>Les codes et les couleurs sont ceux de votre classe : aucun texte officiel n'en impose. Les phrases et les exemples de l'affiche
            sont de Maitrize.</p></Aide>
        </h3>
        <Field label="Les erreurs">
          <Chips liste={ERREURS.map((e) => e.id)} choisis={r.types} libelle={(id: TypeErreur) => erreur(id).nom}
            onChange={(types) => { if (types.length) maj({ types }); }} />
        </Field>
        <Field label="Les codes et les couleurs">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {r.types.map(erreur).map((e) => (
              <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Input value={brut.codes?.[e.id] ?? e.code} maxLength={4} style={{ width: 64, textAlign: "center", fontWeight: 700 }} aria-label={`Le code de : ${e.nom}`}
                  onChange={(ev) => maj({ codes: { ...r.codes, [e.id]: ev.target.value } })} />
                <input type="color" value={couleurDe(e, r)} aria-label={`La couleur de : ${e.nom}`}
                  onChange={(ev) => maj({ couleurs: { ...r.couleurs, [e.id]: ev.target.value } })} />
                <span style={{ fontSize: 13 }}>{e.nom}</span>
              </div>
            ))}
          </div>
        </Field>
        {changees && (
          <button type="button" className="btn ghost sm" onClick={() => maj({ codes: {}, couleurs: {} })}>Remettre les codes et les couleurs de départ</button>
        )}
        <Coche on={r.strategies} libelle="Ce que l'élève fait pour corriger" onChange={(strategies) => maj({ strategies })} />
        <Coche on={r.exemples} libelle="Un exemple, faux puis juste" onChange={(exemples) => maj({ exemples })} />
        <Field label="Le titre">
          <Input value={r.titre} maxLength={60} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesCodeCorrection["format"] })}>
            <option value="mur">Une page, pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreCodeCorrection(r)} html={html} style={STYLE_CODE_CORRECTION} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_CODE_CORRECTION} />}
    />
  );
}
