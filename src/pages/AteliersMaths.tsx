import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard } from "../hasard";
import { SONS, syllabes } from "../lectureSons";
import {
  REGLAGES_ARBRE, REGLAGES_CALCUL, REGLAGES_FRACTIONS, REGLAGES_NOMBRES, REGLAGES_OIE, REPRESENTATIONS, STYLE_JEUX_MATHS,
  additionsArbre, cartesCalcul, cartesNombres, htmlArbreCalcul, htmlCartesCalcul, htmlCartesNombres, htmlFractions, htmlJeuDeLOie,
  type ContenuOie, type FacesDe, type MaterielFraction, type Operation, type Representation, type RepresentationFraction,
} from "../jeuxMaths";

// ── Fabriquer › Mathématiques : ce que les livrets font fabriquer ─────────

function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

function Boutons({ onTirage, onImprimer, peut = true }: { onTirage?: () => void; onImprimer: () => void; peut?: boolean }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
      <button type="button" className="btn primary sm" disabled={!peut} onClick={onImprimer}>🖨 Imprimer</button>
    </div>
  );
}

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

function Chips<T extends string | number>({ liste, choisis, onChange, libelle }: {
  liste: readonly T[]; choisis: T[]; onChange: (v: T[]) => void; libelle?: (x: T) => string;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {liste.map((x) => (
        <button key={String(x)} type="button" className={`btn sm${choisis.includes(x) ? " primary" : " ghost"}`}
          onClick={() => onChange(choisis.includes(x) ? choisis.filter((y) => y !== x) : [...choisis, x])}>{libelle ? libelle(x) : String(x)}</button>
      ))}
    </div>
  );
}

const imprimer = (atelier: string, titre: string, html: string) =>
  void imprimerAtelier(atelier, titre, html, STYLE_FEUILLE + STYLE_JEUX_MATHS);

// ── Cartes des nombres ──

export function CartesNombresTab() {
  const [r, maj] = useReglages("cartesNombres", REGLAGES_NOMBRES);
  const cartes = React.useMemo(() => cartesNombres(r), [r]);
  const html = React.useMemo(() => htmlCartesNombres(cartes, r), [cartes, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Cartes des nombres</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Le même nombre sous plusieurs formes — chiffre, constellation, boîte de dix, mot, décomposition — pour un mémory, une bataille, un loto.
        </p>
        <Field label="De … à …">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Input type="number" min={0} max={99} value={r.de} onChange={(e) => maj({ de: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} style={{ width: 70 }} aria-label="De" />
            <span>→</span>
            <Input type="number" min={0} max={99} value={r.a} onChange={(e) => maj({ a: Math.max(0, Math.min(99, Number(e.target.value) || 0)) })} style={{ width: 70 }} aria-label="À" />
          </div>
        </Field>
        <Field label="Les formes">
          <Chips liste={REPRESENTATIONS.map((x) => x.id)} choisis={r.representations} onChange={(v) => maj({ representations: v as Representation[] })}
            libelle={(id) => REPRESENTATIONS.find((x) => x.id === id)!.libelle} />
        </Field>
        <div className="meta" style={{ fontSize: 12.5 }}>{cartes.length} cartes.</div>
        <Boutons peut={cartes.length > 0} onImprimer={() => imprimer("nombres", "Cartes des nombres", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}

// ── Cartes de calcul ──

export function CartesCalculTab() {
  const [r, maj] = useReglages("cartesCalcul", REGLAGES_CALCUL);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const cartes = React.useMemo(() => cartesCalcul(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlCartesCalcul(cartes, r), [cartes, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Cartes de calcul</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Le calcul devant, le résultat derrière : pour se tester, ou pour une bataille des tables.
        </p>
        <Field label="Opération">
          <Select value={r.operation} onChange={(e) => maj({ operation: e.target.value as Operation })}>
            <option value="x">multiplications (tables)</option><option value="+">additions</option><option value="-">soustractions</option>
          </Select>
        </Field>
        <Field label={r.operation === "x" ? "Tables" : "Premier nombre"}>
          <Chips liste={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} choisis={r.tables} onChange={(v) => maj({ tables: [...v].sort((a, b) => a - b) })} />
        </Field>
        <Coche on={r.rectoVerso} libelle="Recto-verso : le résultat au dos" onChange={(v) => maj({ rectoVerso: v })} />
        <Coche on={r.melanger} libelle="Mélanger les cartes" onChange={(v) => maj({ melanger: v })} />
        <div className="meta" style={{ fontSize: 12.5 }}>{cartes.length} cartes.</div>
        <Boutons peut={cartes.length > 0} onTirage={r.melanger ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("calcul", "Cartes de calcul", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}

// ── Arbre à calcul ──

export function ArbreCalculTab() {
  const [r, maj] = useReglages("arbreCalcul", REGLAGES_ARBRE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const liste = React.useMemo(() => additionsArbre(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlArbreCalcul(liste, r), [liste, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Arbre à calcul</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Ajouter deux nombres en décomposant en dizaines et unités : l'arbre à compléter soutient le raisonnement, puis on s'en passe.
        </p>
        <Field label="Calculs par fiche">
          <Select value={r.combien} onChange={(e) => maj({ combien: Number(e.target.value) })}>
            <option value={4}>4</option><option value={6}>6</option><option value={8}>8</option>
          </Select>
        </Field>
        <Field label="Retenue">
          <Select value={r.retenue} onChange={(e) => maj({ retenue: e.target.value as typeof r.retenue })}>
            <option value="sans">sans retenue</option><option value="avec">avec retenue</option><option value="mixte">les deux</option>
          </Select>
        </Field>
        <Coche on={r.aide} libelle="Dizaines et unités déjà écrites (aide)" onChange={(v) => maj({ aide: v })} />
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("arbre", "Arbre à calcul", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}

// ── Fractions ──

export function FractionsTab() {
  const [r, maj] = useReglages("fractions", REGLAGES_FRACTIONS);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlFractions(r, graine), [r, graine]);
  const MATERIEL: [MaterielFraction, string][] = [["cartes", "cartes (mémory, bataille)"], ["bandes", "bandes unités à plier"], ["regle", "règle graduée"], ["nageurs", "course des nageurs"]];
  const REPS: [RepresentationFraction, string][] = [["chiffres", "en chiffres"], ["lettres", "en lettres"], ["bande", "bande partagée"], ["disque", "disque partagé"]];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Fractions</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les cartes pour nommer et comparer les fractions, la bande unité qu'on plie, la règle graduée en quarts ou en dixièmes, et la course des nageurs.
        </p>
        <Field label="Matériel"><Chips liste={MATERIEL.map((m) => m[0])} choisis={r.materiel} onChange={(v) => maj({ materiel: v })} libelle={(id) => MATERIEL.find((m) => m[0] === id)![1]} /></Field>
        {r.materiel.includes("cartes") && (<>
          <Field label="Dénominateurs"><Chips liste={[2, 3, 4, 5, 6, 8, 10]} choisis={r.denominateurs} onChange={(v) => maj({ denominateurs: [...v].sort((a, b) => a - b) })} /></Field>
          <Field label="Formes"><Chips liste={REPS.map((m) => m[0])} choisis={r.representations} onChange={(v) => maj({ representations: v })} libelle={(id) => REPS.find((m) => m[0] === id)![1]} /></Field>
        </>)}
        {(r.materiel.includes("regle") || r.materiel.includes("nageurs")) && (
          <Field label="Graduation de la règle">
            <Select value={r.graduation} onChange={(e) => maj({ graduation: Number(e.target.value) as 4 | 10 })}>
              <option value={4}>en quarts</option><option value={10}>en dixièmes</option>
            </Select>
          </Field>
        )}
        <Boutons peut={r.materiel.length > 0} onTirage={r.materiel.includes("cartes") ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("fractions", "Fractions", html)} />
      </>}
      droite={r.materiel.length ? <ApercuFeuille html={html} style={STYLE_JEUX_MATHS} /> : <div className="card meta">Choisissez le matériel à fabriquer.</div>}
    />
  );
}

// ── Jeu de l'oie ──

export function JeuDeLOieTab() {
  const [r, maj] = useReglages("jeuDeLOie", REGLAGES_OIE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [son, setSon] = React.useState("ch");
  const html = React.useMemo(() => htmlJeuDeLOie(r, graine), [r, graine]);
  const remplirSyllabes = () => {
    const s = SONS.find((x) => x.id === son);
    if (s) maj({ contenu: "syllabes", items: syllabes(s, 10).join(" ") });
  };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Jeu de l'oie</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Une piste à parcourir au dé — avec des nombres, des lettres ou des syllabes dans les cases — et le patron du dé à plier.
        </p>
        <Field label="Cases">
          <Select value={r.cases} onChange={(e) => maj({ cases: Number(e.target.value) })}>
            {[18, 24, 30, 36, 42].map((n) => <option key={n} value={n}>{n} cases</option>)}
          </Select>
        </Field>
        <Field label="Dans les cases">
          <Select value={r.contenu} onChange={(e) => maj({ contenu: e.target.value as ContenuOie })}>
            <option value="nombres">les nombres</option><option value="lettres">des lettres</option><option value="syllabes">des syllabes</option><option value="vide">rien</option>
          </Select>
        </Field>
        {(r.contenu === "lettres" || r.contenu === "syllabes") && (
          <Field label={r.contenu === "lettres" ? "Les lettres, séparées par des espaces" : "Les syllabes, séparées par des espaces"}>
            <Textarea value={r.items} onChange={(e) => maj({ items: e.target.value })} rows={2} placeholder={r.contenu === "lettres" ? "a b c d e f" : "cha chi cho chu"} />
            {r.contenu === "syllabes" && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                <Select value={son} onChange={(e) => setSon(e.target.value)} style={{ flex: 1 }}>
                  {SONS.map((s) => <option key={s.id} value={s.id}>{s.son}</option>)}
                </Select>
                <button type="button" className="btn sm" onClick={remplirSyllabes}>Les syllabes de ce son</button>
              </div>
            )}
          </Field>
        )}
        <Coche on={r.evenements} libelle="Cases surprises (avance, recule, rejoue, passe)" onChange={(v) => maj({ evenements: v })} />
        <Field label="Le dé">
          <Select value={r.de} onChange={(e) => maj({ de: e.target.value as FacesDe })}>
            <option value="constellations">patron à constellations 1 à 6</option><option value="chiffres">patron à chiffres 1 à 6</option>
            <option value="1-3">patron 1 à 3 (deux fois)</option><option value="aucun">pas de dé</option>
          </Select>
        </Field>
        <Boutons onTirage={r.evenements ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("oie", "Jeu de l'oie", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}
