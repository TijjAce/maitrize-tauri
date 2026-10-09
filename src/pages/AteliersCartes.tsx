import React from "react";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import {
  CLASSES, COMBIEN_MAX, COULEURS, DOMAINES, REGLAGES_CARTES, STYLE_CARTES_A_TACHES, cartesDeLaSerie, htmlDeLaSerie, optionsDe, reglagesSurs, typeDe,
  typesDeLaClasse, type Classe,
} from "../cartesATaches";

// ── Fabriquer › Évaluer : les cartes à tâches ─────────────────────────────

export function CartesATachesTab() {
  const [brut, maj] = useReglages("cartesATaches", REGLAGES_CARTES);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const t = typeDe(r.type)!;
  const serie = React.useMemo(() => cartesDeLaSerie(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlDeLaSerie(serie, r, graine), [serie, r, graine]);
  const options = optionsDe(t, r);
  const majOption = (cle: string, v: string) => maj({ options: { ...r.options, [t.id]: { ...options, [cle]: v } } });
  const titre = `${t.nom} — ${r.classe}`;
  const pinces = serie.format === "pinces";
  const etiquettes = serie.cartes.some((c) => c.etiquette);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Cartes à tâches</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Une question par carte, rien autour : l'élève pince la bonne réponse, ou il l'écrit. De quoi savoir où il en est sans
          fioritures — en évaluation, en autonomie, en atelier. Les fausses réponses sont les erreurs qu'on rencontre : les chiffres
          inversés, l'aire prise pour le périmètre, la petite aiguille lue comme la grande.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Combien de cartes">
            <Input type="number" min={2} max={COMBIEN_MAX} value={r.combien} style={{ width: 80 }}
              onChange={(e) => maj({ combien: Math.max(1, Math.min(COMBIEN_MAX, Math.round(Number(e.target.value)) || REGLAGES_CARTES.combien)) })} />
          </Field>
        </div>
        <Field label="Les cartes">
          <Select value={r.type} onChange={(e) => maj({ type: e.target.value })}>
            {DOMAINES.map((d) => {
              const liste = typesDeLaClasse(r.classe).filter((x) => x.domaine === d);
              return liste.length ? (
                <optgroup key={d} label={d}>{liste.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}</optgroup>
              ) : null;
            })}
          </Select>
        </Field>
        {t.options?.map((o) => (
          <Field key={o.cle} label={o.libelle}>
            <Select value={options[o.cle]} onChange={(e) => majOption(o.cle, e.target.value)}>
              {o.valeurs(r.classe).map(([v, libelle]) => <option key={v} value={v}>{libelle}</option>)}
            </Select>
          </Field>
        ))}
        <Field label="La carte">
          <div className="seg">
            <button type="button" className={pinces ? "active" : ""} disabled={!t.formats.includes("pinces")} onClick={() => maj({ format: "pinces" })}
              title="Trois propositions sur le bord : l'élève pose une pince à linge sur la bonne">🧷 À pinces</button>
            <button type="button" className={!pinces ? "active" : ""} disabled={!t.formats.includes("tache")} onClick={() => maj({ format: "tache" })}
              title="Une ligne où l'élève écrit sa réponse, sur la carte ou sur sa fiche">✏️ À écrire</button>
          </div>
        </Field>
        {!pinces && (
          <Field label="Cartes par page">
            <Select value={r.parPage} onChange={(e) => maj({ parPage: Number(e.target.value) === 4 ? 4 : 6 })}>
              <option value={6}>6</option>
              <option value={4}>4, plus grandes</option>
            </Select>
          </Field>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Couleur">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {COULEURS.map((c) => (
                <button key={c.hex} type="button" onClick={() => maj({ couleur: c.hex })} title={c.nom} aria-label={`Couleur ${c.nom}`}
                  aria-pressed={r.couleur === c.hex}
                  style={{ width: 22, height: 22, borderRadius: 6, background: c.hex, cursor: "pointer",
                    border: r.couleur === c.hex ? "3px solid var(--text)" : "2px solid transparent" }} />
              ))}
            </div>
          </Field>
          <Field label="Dans le coin">
            <Input value={r.marque} maxLength={30} placeholder="Niveau 1, Série A…" onChange={(e) => maj({ marque: e.target.value })} />
          </Field>
        </div>
        {pinces && <Coche on={r.question} libelle="La question écrite sur chaque carte" onChange={(v) => maj({ question: v })} />}
        {pinces && <Coche on={r.dos} libelle="Le dos à plier, un point derrière la bonne réponse : l'élève se corrige seul" onChange={(v) => maj({ dos: v })} />}
        <Coche on={r.fiche} libelle="La fiche réponse de l'élève" onChange={(v) => maj({ fiche: v })} />
        {etiquettes && <Coche on={r.etiquettes} libelle="Les étiquettes-réponses à découper, et des leurres" onChange={(v) => maj({ etiquettes: v })} />}
        <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>
          {serie.cartes.length} carte{serie.cartes.length > 1 ? "s" : ""}
          {serie.cartes.length < r.combien && <span style={{ color: "var(--orange)" }}> — il n'y en a pas plus de différentes</span>}
          {" "}· {t.source}.
        </div>
        <Boutons peut={serie.cartes.length > 0} onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("taches", titre, html, STYLE_CARTES_A_TACHES)}
          onBureau={() => bureau("taches", titre, html, STYLE_CARTES_A_TACHES)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_CARTES_A_TACHES} />}
    />
  );
}
