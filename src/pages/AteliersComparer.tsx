import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Colonnes } from "./AteliersLangage";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDeComparaison } from "../components/SequenceDeComparaison";
import {
  GROUPES_DE_NIVEAUX, NIVEAUX, NOMBRES_DE_CARTES, REGLAGES_COMPARER, STYLE_COMPARER, avecLesSignes, exempleForme, htmlComparer, libelleForme,
  niveauParId, paquet, reglagesComparerSurs, type FormeNombre, type IdNiveau, type Niveau, type ReglagesComparer,
} from "../comparerNombres";
import { sequencePossible } from "../sequenceComparer";

// ── Fabriquer › Comparer les nombres ──────────────────────────────────────
//
// Un paquet de cartes de nombres sous plusieurs formes, les cartes des
// signes, la règle des jeux — la bataille, la file des nombres, le nombre
// caché — et la feuille où l'on écrit ce qu'on a comparé. De la maternelle,
// où l'on compare des quantités avec des mots, au CM2 et à ses décimaux.

const ATELIER = "comparer";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

/** Les pièges du niveau, en exemple : ce que la case fait entrer dans le paquet. */
function piegesDe(niv: Niveau): string {
  switch (niv.famille) {
    case "collections": return niv.valeurs ? "" : "Des quantités voisines : quatre et cinq, cinq et six";
    case "decimaux": return "Des nombres qui se ressemblent : 3,5 et 3,45 ; 3,5 et 3,05 ; 2,1 et 2,09";
    case "grands": return "Des nombres qui se ressemblent : 456 789 et 456 798 ; 456 789 et 45 678";
    default: return niv.max <= 100 ? "Des nombres qui se ressemblent : 47 et 74, 49 et 51, 40 et 4" : "Des nombres qui se ressemblent : 352 et 325, 398 et 401";
  }
}

export function ComparerTab() {
  const [brut, maj] = useReglages<ReglagesComparer>(ATELIER, REGLAGES_COMPARER);
  const r = React.useMemo(() => reglagesComparerSurs(brut), [brut]);
  const niv = niveauParId(r.niveau);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const cartes = React.useMemo(() => paquet(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlComparer(cartes, r), [cartes, r]);
  const basculer = (id: FormeNombre) =>
    maj({ formes: r.formes.includes(id) ? r.formes.filter((f) => f !== id) : [...r.formes, id] });
  /** Un autre niveau garde les formes qu'il connaît aussi ; sinon, celles qu'il propose d'abord. */
  const changerDeNiveau = (id: IdNiveau) => {
    const suivant = niveauParId(id);
    const gardees = r.formes.filter((f) => suivant.formes.includes(f));
    maj({ niveau: id, formes: gardees.length >= 2 ? gardees : suivant.parDefaut });
  };
  const signes = avecLesSignes(niv);
  const pieges = piegesDe(niv);

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Comparer les nombres</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          {signes
            ? <>Un paquet de cartes, chaque nombre deux fois sous deux formes, et les signes &lt;, &gt; et = : la bataille pour comparer,
              la file des nombres pour ordonner et intercaler, le nombre caché pour encadrer. D'après les programmes et le guide CP d'Éduscol.</>
            : <>Des cartes de points, de doigts et, à partir de 5 ans, de chiffres : la bataille pour dire qui en a le plus, la file pour
              ranger. Sans signes : on compare avec « plus que », « moins que », « autant que », comme le veut le programme de maternelle.</>}
        </p>
        <Field label="Les nombres">
          <Select value={r.niveau} onChange={(e) => changerDeNiveau(e.target.value as IdNiveau)}>
            {GROUPES_DE_NIVEAUX.map((g) => (
              <optgroup key={g.cycle} label={g.nom}>
                {NIVEAUX.filter((n) => n.cycle === g.cycle).map((n) => <option key={n.id} value={n.id}>{n.libelle}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <Field label="Les formes des cartes">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {niv.formes.map((f) => (
              <button key={f} type="button" className={`btn sm${r.formes.includes(f) ? " primary" : " ghost"}`}
                title={`Par exemple : ${exempleForme(f, niv)}`} onClick={() => basculer(f)}>{libelleForme(f, niv)}</button>
            ))}
          </div>
          <div className="meta" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>
            Exemple : {niv.formes.filter((f) => r.formes.includes(f)).map((f) => exempleForme(f, niv)).join(" · ")}.
            {niv.famille === "entiers" && " Passer d'une forme à l'autre — « 3d 17u », du matériel pas tout groupé — oblige à penser aux unités de numération."}
            {niv.famille === "decimaux" && " Les fractions décimales viennent d'abord, l'écriture à virgule ensuite, comme le veut le programme du CM1."}
          </div>
        </Field>
        <Field label="Combien de cartes">
          <Select value={r.cartes} onChange={(e) => maj({ cartes: Number(e.target.value) })}>
            {NOMBRES_DE_CARTES.map((n) => <option key={n} value={n}>{n} cartes{niv.cycle > 1 ? ` (${n / 2} nombres)` : ""}</option>)}
          </Select>
        </Field>
        {pieges && <Coche on={r.pieges} libelle={pieges} onChange={(v) => maj({ pieges: v })} />}
        <Coche on={r.grandes} libelle="Grandes cartes : 12 par page au lieu de 20" onChange={(grandes) => maj({ grandes })} />
        <details className="pli" open>
          <summary>Ce qui s'imprime avec les cartes</summary>
          <Coche on={r.regle} libelle={signes ? "La règle des trois jeux, et ce qu'on retient" : "La règle des jeux, et ce qu'on retient"} onChange={(regle) => maj({ regle })} />
          {signes && <Coche on={r.signes} libelle="Les cartes des signes <, > et =" onChange={(v) => maj({ signes: v })} />}
          {signes && <Coche on={r.feuilleDeJeu} libelle="La feuille de jeu : écrire ses comparaisons, sa file, ses encadrements" onChange={(feuilleDeJeu) => maj({ feuilleDeJeu })} />}
        </details>
        <Field label="Le titre">
          <Input value={r.titre} placeholder={REGLAGES_COMPARER.titre} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={r.titre.trim() || REGLAGES_COMPARER.titre} html={html} style={STYLE_COMPARER} peut={cartes.length > 0}
          onTirage={() => setGraine(graineAuHasard())} />
        {sequencePossible(niv)
          ? (
            <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setEnSequence(true)}
              title="La séquence du guide CP d'Éduscol, en sept séances, aux nombres de ce niveau, avec ce jeu et ses feuilles rangés dans les séances">
              📚 Créer une séquence avec ce jeu
            </button>
          )
          : (
            <p className="meta" style={{ fontSize: 12, lineHeight: 1.45, margin: "8px 0 0" }}>
              La séquence du guide CP se crée pour les niveaux du cycle 2 : {niv.cycle === 1 ? "la maternelle compare des quantités, avec d'autres démarches." : "le cycle 3 compare de grands nombres et des décimaux, avec d'autres démarches."}
            </p>
          )}
        {enSequence && <SequenceDeComparaison reglages={r} competences={competences} onClose={() => setEnSequence(false)} />}
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_COMPARER} />}
    />
  );
}
