import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Colonnes } from "./AteliersLangage";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDeComparaison } from "../components/SequenceDeComparaison";
import {
  CHAMPS, FORMES, NOMBRES_DE_CARTES, REGLAGES_COMPARER, STYLE_COMPARER, htmlComparer, paquet, reglagesComparerSurs,
  type Champ, type FormeNombre, type ReglagesComparer,
} from "../comparerNombres";

// ── Fabriquer › Comparer les nombres ──────────────────────────────────────
//
// Un paquet de cartes de nombres sous plusieurs formes, les cartes des
// signes, la règle de trois jeux — la bataille, la file des nombres, le
// nombre caché — et la feuille où l'on écrit ce qu'on a comparé.

const ATELIER = "comparer";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

export function ComparerTab() {
  const [brut, maj] = useReglages<ReglagesComparer>(ATELIER, REGLAGES_COMPARER);
  const r = React.useMemo(() => reglagesComparerSurs(brut), [brut]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const cartes = React.useMemo(() => paquet(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlComparer(cartes, r), [cartes, r]);
  const basculer = (id: FormeNombre) =>
    maj({ formes: r.formes.includes(id) ? r.formes.filter((f) => f !== id) : [...r.formes, id] });

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Comparer les nombres</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Un paquet de cartes, chaque nombre deux fois sous deux formes, et les signes &lt;, &gt; et = : la bataille pour comparer,
          la file des nombres pour ordonner et intercaler, le nombre caché pour encadrer. D'après le guide CP d'Éduscol.
        </p>
        <Field label="Les nombres">
          <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) as Champ })}>
            {CHAMPS.map((c) => <option key={c.jusqua} value={c.jusqua}>{c.libelle}</option>)}
          </Select>
        </Field>
        <Field label="Les formes des cartes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {FORMES.map((f) => (
              <button key={f.id} type="button" className={`btn sm${r.formes.includes(f.id) ? " primary" : " ghost"}`}
                title={`Par exemple : ${f.exemple}`} onClick={() => basculer(f.id)}>{f.libelle}</button>
            ))}
          </div>
          <div className="meta" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
            Exemple : {FORMES.filter((f) => r.formes.includes(f.id)).map((f) => f.exemple).join(" · ")}.
            Le guide fait passer d'une forme à l'autre : « 3d 17u » ou des cubes pas tous groupés obligent à penser aux dizaines.
          </div>
        </Field>
        <Field label="Combien de cartes de nombres">
          <Select value={r.cartes} onChange={(e) => maj({ cartes: Number(e.target.value) })}>
            {NOMBRES_DE_CARTES.map((n) => <option key={n} value={n}>{n} cartes ({n / 2} nombres)</option>)}
          </Select>
        </Field>
        <Coche on={r.pieges} libelle="Des nombres qui se ressemblent : 47 et 74, 49 et 51, 40 et 4" onChange={(pieges) => maj({ pieges })} />
        <Coche on={r.grandes} libelle="Grandes cartes : 12 par page au lieu de 20" onChange={(grandes) => maj({ grandes })} />
        <details className="pli" open>
          <summary>Ce qui s'imprime avec les cartes</summary>
          <Coche on={r.regle} libelle="La règle des trois jeux, et ce qu'on retient" onChange={(regle) => maj({ regle })} />
          <Coche on={r.signes} libelle="Les cartes des signes <, > et =" onChange={(signes) => maj({ signes })} />
          <Coche on={r.feuilleDeJeu} libelle="La feuille de jeu : écrire ses comparaisons, sa file, ses encadrements" onChange={(feuilleDeJeu) => maj({ feuilleDeJeu })} />
        </details>
        <Field label="Le titre">
          <Input value={r.titre} placeholder={REGLAGES_COMPARER.titre} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={r.titre.trim() || REGLAGES_COMPARER.titre} html={html} style={STYLE_COMPARER} peut={cartes.length > 0}
          onTirage={() => setGraine(graineAuHasard())} />
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setEnSequence(true)}
          title="La séquence du guide CP d'Éduscol, en sept séances, avec ce jeu et ses feuilles rangés dans les séances">
          📚 Créer une séquence avec ce jeu
        </button>
        {enSequence && <SequenceDeComparaison reglages={r} competences={competences} onClose={() => setEnSequence(false)} />}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_COMPARER} />}
    />
  );
}
