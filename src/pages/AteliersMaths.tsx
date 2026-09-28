import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { ConsigneEnPictos, useConsignesEnPictos } from "../components/ConsigneEnPictos";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard } from "../hasard";
import { SONS, syllabes } from "../lectureSons";
import {
  ECRITURES, EXERCICES, EXERCICES_MAX, GROUPEMENTS, PALETTE_CUBES, PLAFONDS, PLANCHERS, REGLAGES_CUBES, STYLE_CUBES,
  consigneDe, ecrituresChoisies, exercicesCubes, groupementsJusqua, htmlCubes, type EcritureNombre, type ExerciceCubes,
} from "../cubesNumeration";
import {
  REGLAGES_ARBRE, REGLAGES_CALCUL, REGLAGES_FRACTIONS, REGLAGES_NOMBRES, REGLAGES_OIE, REPRESENTATIONS, STYLE_JEUX_MATHS,
  additionsArbre, cartesCalcul, cartesNombres, htmlArbreCalcul, htmlCartesCalcul, htmlCartesNombres, htmlFractions, htmlJeuDeLOie,
  type ContenuOie, type FacesDe, type MaterielFraction, type Operation, type Representation, type RepresentationFraction,
} from "../jeuxMaths";
import { FAMILLES_CALCUL, PLAFONDS_MARTINIERE, REFLEXIONS, REGLAGES_CYCLE, REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, htmlMartiniere } from "../martiniere";
import { OPERATIONS_COMPTE, REGLAGES_COMPTE, REGLAGES_COMPTE_CYCLE, STYLE_COMPTE, comptes, htmlCompteEstBon } from "../compteEstBon";
import { REGLAGES_PYRAMIDES, STYLE_PYRAMIDES, htmlPyramides, type FormeCalcul } from "../pyramides";
import { PRECISIONS_HEURE, REGLAGES_HEURE, STYLE_HEURE, heures, htmlHeure, type PrecisionHeure, type SensHeure } from "../heure";
import { EXERCICES_NUMERATION, PLAFONDS_NUMERATION, REGLAGES_NUMERATION, STYLE_NUMERATION, htmlNumeration } from "../numeration";
import { fr } from "../nombres";

// ── Fabriquer › Mathématiques : ce que les livrets font fabriquer ─────────

function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

function Boutons({ onTirage, onImprimer, onBureau, peut = true }: {
  onTirage?: () => void; onImprimer: () => void; onBureau?: () => Promise<{ id: string; titre: string }>; peut?: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
      <button type="button" className="btn primary sm" disabled={!peut} onClick={onImprimer}>🖨 Imprimer</button>
      {onBureau && <BoutonBureau disabled={!peut} onEnregistrer={onBureau} />}
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

const imprimer = (atelier: string, titre: string, html: string, style = STYLE_JEUX_MATHS, pictos: string[] = []) =>
  void imprimerAtelier(atelier, titre, html, STYLE_FEUILLE + style, { pictos });
/** La même feuille, en PDF sur le plan de travail. */
const bureau = (atelier: string, titre: string, html: string, style = STYLE_JEUX_MATHS, pictos: string[] = []) =>
  enregistrerSurLeBureau(atelier, titre, html, STYLE_FEUILLE + style, { pictos });

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
        <Boutons peut={cartes.length > 0} onImprimer={() => imprimer("nombres", "Cartes des nombres", html)} onBureau={() => bureau("nombres", "Cartes des nombres", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}

// ── Les nombres en cubes ──

/** Les couleurs possibles pour un groupement, en pastilles. */
function Pastilles({ valeur, onChange }: { valeur: string; onChange: (hex: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {PALETTE_CUBES.map((c) => (
        <button key={c.hex} type="button" title={c.nom} aria-label={c.nom} aria-pressed={valeur === c.hex}
          onClick={() => onChange(c.hex)}
          style={{
            width: 20, height: 20, borderRadius: 5, background: c.hex, cursor: "pointer", padding: 0,
            border: valeur === c.hex ? "3px solid var(--text)" : "1px solid var(--border)",
          }} />
      ))}
    </div>
  );
}

export function CubesTab() {
  const [r, maj] = useReglages("cubes", REGLAGES_CUBES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const exos = React.useMemo(() => exercicesCubes(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlCubes(exos, r, graine), [exos, r, graine]);
  const style = STYLE_JEUX_MATHS + STYLE_CUBES;
  const ecritures = ecrituresChoisies(r);
  // L'aperçu montre les pictos de la consigne comme l'impression les mettra.
  const apercu = useConsignesEnPictos(html, r.pictos);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Les nombres en cubes</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Le cube, la barre de dix, la plaque de cent, le gros cube de mille : l'élève lit les groupements et écrit le nombre — ou l'inverse.
        </p>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceCubes })}>
            {EXERCICES.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <Field label="Nombres de … à …">
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Select value={r.de} onChange={(e) => maj({ de: Number(e.target.value) })} aria-label="De" style={{ width: 90 }}>
              {PLANCHERS.filter((p) => p <= r.a).map((p) => <option key={p} value={p}>{p.toLocaleString("fr")}</option>)}
            </Select>
            <span>→</span>
            <Select value={r.a} onChange={(e) => { const a = Number(e.target.value); maj({ a, de: Math.min(r.de, a) }); }} aria-label="À" style={{ width: 90 }}>
              {PLAFONDS.map((p) => <option key={p} value={p}>{p.toLocaleString("fr")}</option>)}
            </Select>
          </div>
        </Field>
        <Field label={r.exercice === "ecrire" ? "L'élève écrit le nombre…" : "Le nombre est écrit…"}>
          <Chips liste={ECRITURES.map((x) => x.id)} choisis={r.ecritures} onChange={(v) => maj({ ecritures: v as EcritureNombre[] })}
            libelle={(id) => ECRITURES.find((x) => x.id === id)!.libelle} />
          <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>
            {r.exercice === "ecrire" ? "Une ligne de réponse par écriture cochée." : "Plusieurs écritures cochées : chaque exercice en tire une."}
            {" "}Exemple : {ecritures.map((id) => ECRITURES.find((x) => x.id === id)!.exemple).join(" · ")}.
          </div>
        </Field>
        <Field label="Exercices sur la feuille">
          <Input type="number" min={1} max={EXERCICES_MAX} value={r.nombre} style={{ width: 80 }}
            onChange={(e) => maj({ nombre: Math.max(1, Math.min(EXERCICES_MAX, Number(e.target.value) || 1)) })} />
        </Field>
        <Field label="La couleur de chaque groupement">
          {groupementsJusqua(r.a).map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "3px 0" }}>
              <span style={{ width: 70, fontSize: 12.5 }}>{GROUPEMENTS.find((x) => x.id === g.id)!.nom}</span>
              <Pastilles valeur={r.couleurs[g.id]} onChange={(hex) => maj({ couleurs: { ...r.couleurs, [g.id]: hex } })} />
            </div>
          ))}
        </Field>
        <Coche on={r.zeros} libelle="Avec des zéros à l'intérieur (30, 105, 2 040)" onChange={(v) => maj({ zeros: v })} />
        <Coche on={r.numeros} libelle="Numéroter les exercices" onChange={(v) => maj({ numeros: v })} />
        <ConsigneEnPictos consignes={[consigneDe(r)]} pictos={r.pictos ?? []} onChange={(pictos) => maj({ pictos })} />
        <Coche on={r.legende} libelle="La légende des cubes en haut de la feuille" onChange={(v) => maj({ legende: v })} />
        <Coche on={r.corrige} libelle="Le corrigé sur une page à part" onChange={(v) => maj({ corrige: v })} />
        <Field label="Titre de la feuille">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder={REGLAGES_CUBES.titre} />
        </Field>
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("cubes", r.titre.trim() || REGLAGES_CUBES.titre, html, style, r.pictos)}
          onBureau={() => bureau("cubes", r.titre.trim() || REGLAGES_CUBES.titre, html, style, r.pictos)} />
      </>}
      droite={<ApercuFeuille html={apercu.html} style={style + apercu.style} />}
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
        <Boutons peut={cartes.length > 0} onTirage={r.melanger ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("calcul", "Cartes de calcul", html)} onBureau={() => bureau("calcul", "Cartes de calcul", html)} />
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
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("arbre", "Arbre à calcul", html)} onBureau={() => bureau("arbre", "Arbre à calcul", html)} />
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
        <Boutons peut={r.materiel.length > 0} onTirage={r.materiel.includes("cartes") ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("fractions", "Fractions", html)} onBureau={() => bureau("fractions", "Fractions", html)} />
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
        <Boutons onTirage={r.evenements ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("oie", "Jeu de l'oie", html)} onBureau={() => bureau("oie", "Jeu de l'oie", html)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_MATHS} />}
    />
  );
}

// ── Calcul mental : procédé La Martinière ──

/** Deux boutons, un choix : le cycle. */
function Cycle({ valeur, onChange }: { valeur: 2 | 3; onChange: (c: 2 | 3) => void }) {
  return (
    <div className="seg">
      <button type="button" className={valeur === 2 ? "active" : ""} onClick={() => onChange(2)}>Cycle 2</button>
      <button type="button" className={valeur === 3 ? "active" : ""} onClick={() => onChange(3)}>Cycle 3</button>
    </div>
  );
}

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Number(v) || defaut));

export function MartiniereTab() {
  const [r, maj] = useReglages("martiniere", REGLAGES_MARTINIERE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const series = React.useMemo(() => calculsMartiniere(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlMartiniere(series, r), [series, r]);
  const familles = FAMILLES_CALCUL.filter((f) => f.cycles.includes(r.cycle));
  const total = series.reduce((n, s) => n + s.length, 0);
  const avecTables = r.familles.some((f) => f === "tables" || f === "divisions");
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Calcul mental — procédé La Martinière</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Je dis le calcul, on réfléchit, « écrivez », « montrez ». La fiche du maître avec les réponses, et les ardoises papier des élèves à la suite.
        </p>
        <Field label="Cycle"><Cycle valeur={r.cycle} onChange={(cycle) => maj({ cycle, ...REGLAGES_CYCLE[cycle] })} /></Field>
        <Field label="Familles de calculs">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {familles.map((f) => (
              <Coche key={f.id} on={r.familles.includes(f.id)} libelle={f.libelle}
                onChange={(v) => maj({ familles: v ? [...r.familles, f.id] : r.familles.filter((x) => x !== f.id) })} />
            ))}
          </div>
        </Field>
        <Field label="Nombres jusqu'à">
          <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
            {PLAFONDS_MARTINIERE.map((p) => <option key={p} value={p}>{fr(p)}</option>)}
          </Select>
        </Field>
        {avecTables && (
          <Field label="Tables"><Chips liste={[2, 3, 4, 5, 6, 7, 8, 9, 10]} choisis={r.tables} onChange={(v) => maj({ tables: [...v].sort((a, b) => a - b) })} /></Field>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Calculs par série"><Input type="number" min={5} max={20} value={r.parSerie} onChange={(e) => maj({ parSerie: borne(e.target.value, 5, 20, 10) })} /></Field>
          <Field label="Séries"><Input type="number" min={1} max={5} value={r.series} onChange={(e) => maj({ series: borne(e.target.value, 1, 5, 2) })} /></Field>
        </div>
        <Field label="Temps de réflexion avant « écrivez »">
          <Select value={r.reflexion} onChange={(e) => maj({ reflexion: Number(e.target.value) })}>
            {REFLEXIONS.map((s) => <option key={s} value={s}>{s} secondes</option>)}
          </Select>
        </Field>
        <Coche on={r.ardoises} libelle="Les ardoises papier des élèves, à la suite" onChange={(v) => maj({ ardoises: v })} />
        <div className="meta" style={{ fontSize: 12.5 }}>{total} calculs{total === 0 && r.familles.length === 0 ? " — choisissez au moins une famille" : ""}.</div>
        <Boutons peut={total > 0} onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("martiniere", "Calcul mental", html, STYLE_MARTINIERE)} onBureau={() => bureau("martiniere", "Calcul mental", html, STYLE_MARTINIERE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_MARTINIERE} />}
    />
  );
}

// ── Le compte est bon ──

export function CompteEstBonTab() {
  const [r, maj] = useReglages("compteEstBon", REGLAGES_COMPTE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const liste = React.useMemo(() => comptes(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlCompteEstBon(liste, r), [liste, r]);
  const ids = OPERATIONS_COMPTE.map((o) => o.id);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Le compte est bon</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Une cible, quelques nombres, les opérations permises : on cherche un chemin, on écrit ses calculs. Une solution dans le corrigé.
        </p>
        <Field label="Cycle"><Cycle valeur={r.cycle} onChange={(cycle) => maj({ cycle, ...REGLAGES_COMPTE_CYCLE[cycle] })} /></Field>
        <Field label="Opérations permises">
          <Chips liste={ids} choisis={r.operations} onChange={(v) => maj({ operations: ids.filter((id) => v.includes(id)) })}
            libelle={(id) => OPERATIONS_COMPTE.find((o) => o.id === id)!.signe} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Nombres par carte"><Input type="number" min={3} max={6} value={r.nombres} onChange={(e) => maj({ nombres: borne(e.target.value, 3, 6, 4) })} /></Field>
          <Field label="Cartes"><Input type="number" min={1} max={12} value={r.problemes} onChange={(e) => maj({ problemes: borne(e.target.value, 1, 12, 6) })} /></Field>
        </div>
        <div className="meta" style={{ fontSize: 12.5 }}>{liste.length} cartes{liste.length < r.problemes ? " — pas davantage avec ces réglages" : ""}.</div>
        <Boutons peut={liste.length > 0} onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("compteEstBon", "Le compte est bon", html, STYLE_COMPTE)} onBureau={() => bureau("compteEstBon", "Le compte est bon", html, STYLE_COMPTE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_COMPTE} />}
    />
  );
}

// ── Pyramides et carrés magiques ──

export function PyramidesTab() {
  const [r, maj] = useReglages("pyramides", REGLAGES_PYRAMIDES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlPyramides(r, graine), [r, graine]);
  const titre = r.forme === "pyramide" ? "Pyramides de nombres" : "Carrés magiques";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Pyramides et carrés magiques</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Chaque brique est la somme des deux du dessous ; chaque ligne du carré fait la même somme. À compléter, le corrigé à la suite.
        </p>
        <Field label="Forme">
          <Select value={r.forme} onChange={(e) => { const forme = e.target.value as FormeCalcul; maj({ forme, ...(forme === "carre" && r.jusqua < 10 ? { jusqua: 10 } : {}) }); }}>
            <option value="pyramide">Pyramides de nombres</option><option value="carre">Carrés magiques</option>
          </Select>
        </Field>
        {r.forme === "pyramide" ? (<>
          <Field label="Étages">
            <Select value={r.etages} onChange={(e) => maj({ etages: Number(e.target.value) })}>
              {[3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} étages</option>)}
            </Select>
          </Field>
          <Field label="Briques données">
            <Select value={r.trous} onChange={(e) => maj({ trous: e.target.value as "bas" | "meles" })}>
              <option value="bas">La base : on additionne en montant</option><option value="meles">Mêlées : on ajoute et on retranche</option>
            </Select>
          </Field>
          <Field label="Nombres de la base jusqu'à">
            <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
              {[5, 10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        </>) : (<>
          <Field label="Taille">
            <Select value={r.taille} onChange={(e) => maj({ taille: Number(e.target.value) as 3 | 4 })}>
              <option value={3}>3 × 3</option><option value={4}>4 × 4</option>
            </Select>
          </Field>
          <Field label="Nombres jusqu'à">
            <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
              {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        </>)}
        <Field label="Combien par feuille"><Input type="number" min={1} max={12} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 12, 6) })} style={{ width: 80 }} /></Field>
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("pyramides", titre, html, STYLE_PYRAMIDES)} onBureau={() => bureau("pyramides", titre, html, STYLE_PYRAMIDES)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PYRAMIDES} />}
    />
  );
}

// ── Lire l'heure ──

export function HeureTab() {
  const [r, maj] = useReglages("heure", REGLAGES_HEURE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const liste = React.useMemo(() => heures(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlHeure(liste, r), [liste, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Lire l'heure</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Des horloges à lire, ou des cadrans vides où dessiner l'heure demandée — les heures pile d'abord, puis les demies, les quarts, les cinq minutes.
        </p>
        <Field label="Précision">
          <Select value={r.precision} onChange={(e) => maj({ precision: e.target.value as PrecisionHeure })}>
            {PRECISIONS_HEURE.map((p) => <option key={p.id} value={p.id}>{p.libelle}</option>)}
          </Select>
        </Field>
        <Field label="Exercice">
          <Select value={r.sens} onChange={(e) => maj({ sens: e.target.value as SensHeure })}>
            <option value="lire">Lire l'heure sur le cadran</option><option value="dessiner">Dessiner les aiguilles</option><option value="mixte">L'un et l'autre, en alternance</option>
          </Select>
        </Field>
        <Coche on={r.apresMidi} libelle="L'après-midi aussi : 19 h 30 se lit comme 7 h 30" onChange={(v) => maj({ apresMidi: v })} />
        <Field label="Horloges"><Input type="number" min={1} max={24} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 24, 9) })} style={{ width: 80 }} /></Field>
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("heure", "Lire l'heure", html, STYLE_HEURE)} onBureau={() => bureau("heure", "Lire l'heure", html, STYLE_HEURE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_HEURE} />}
    />
  );
}

// ── Grands nombres et décimaux ──

export function NumerationTab() {
  const [r, maj] = useReglages("numeration", REGLAGES_NUMERATION);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlNumeration(r, graine), [r, graine]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Grands nombres et décimaux</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Tableau de numération, écriture en lettres, décomposition, comparaison, encadrement : la feuille du cycle 3, avec d'autres nombres à chaque tirage.
        </p>
        <Field label="Nombres">
          <div className="seg">
            <button type="button" className={!r.decimaux ? "active" : ""} onClick={() => maj({ decimaux: false, jusqua: r.jusqua < 10000 ? 10000 : r.jusqua })}>Entiers</button>
            <button type="button" className={r.decimaux ? "active" : ""} onClick={() => maj({ decimaux: true, jusqua: 1000 })}>Décimaux</button>
          </div>
        </Field>
        {r.decimaux ? (
          <Field label="Décimales">
            <Select value={r.decimales} onChange={(e) => maj({ decimales: Number(e.target.value) as 1 | 2 | 3 })}>
              <option value={1}>les dixièmes</option><option value={2}>les centièmes</option><option value={3}>les millièmes</option>
            </Select>
          </Field>
        ) : (
          <Field label="Jusqu'à">
            <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
              {PLAFONDS_NUMERATION.map((p) => <option key={p} value={p}>{fr(p)}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Exercices">
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {EXERCICES_NUMERATION.map((e) => (
              <Coche key={e.id} on={r.exercices.includes(e.id)} libelle={e.libelle}
                onChange={(v) => maj({ exercices: v ? [...r.exercices, e.id] : r.exercices.filter((x) => x !== e.id) })} />
            ))}
          </div>
        </Field>
        <Field label="Nombres par exercice"><Input type="number" min={1} max={10} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 10, 5) })} style={{ width: 80 }} /></Field>
        <Boutons peut={r.exercices.length > 0} onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("numeration", "Numération", html, STYLE_NUMERATION)} onBureau={() => bureau("numeration", "Numération", html, STYLE_NUMERATION)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_NUMERATION} />}
    />
  );
}
