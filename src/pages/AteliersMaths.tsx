import React from "react";
import { Field, Input, Select, Textarea, ouvrirOnglet } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille } from "../components/OptionsFeuille";
import { Pastilles } from "../components/Pastilles";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard } from "../hasard";
import { SONS, syllabes } from "../lectureSons";
import {
  CLASSES_CUBES, ECRITURES, EXERCICES, EXERCICES_MAX, GROUPEMENTS, NIVEAUX_CUBES, REGLAGES_CUBES, STYLE_CUBES, aRegrouperPourDessin,
  aRegrouperPourEcriture, decomposer, ecrirePieces, ecrireNombre, ecrireUnites, ecrituresChoisies, exempleDuNiveau, exercicesCubes,
  groupementsDuNiveau, htmlCubes, niveauCubes, ordreHabituel, ordreMelange, reglagesCubesSurs, type AnciensReglagesCubes, type EcritureNombre,
  type ExerciceCubes, type IdNiveauCubes, type ReglagesCubes,
} from "../cubesNumeration";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDesCubes } from "../components/SequenceDesCubes";
import {
  REGLAGES_ARBRE, REGLAGES_CALCUL, REGLAGES_FRACTIONS, REGLAGES_NOMBRES, REGLAGES_OIE, REPRESENTATIONS, STYLE_JEUX_MATHS,
  additionsArbre, cartesCalcul, cartesNombres, htmlArbreCalcul, htmlCartesCalcul, htmlCartesNombres, htmlFractions, htmlJeuDeLOie,
  type ContenuOie, type FacesDe, type MaterielFraction, type Operation, type Representation, type RepresentationFraction,
} from "../jeuxMaths";
import { REFLEXIONS, REGLAGES_MARTINIERE, STYLE_MARTINIERE, calculsMartiniere, fluenceAttendue, htmlMartiniere, libelleTravaille, objectifsRetenus, type FormeEntrainement } from "../martiniere";
import { objectifsDesAteliers } from "../ateliersCompetences";
import { useCompetencesParObjectif } from "../components/CompetencesAtelier";
import { SequenceDeCalculMental } from "../components/SequenceDeCalculMental";
import { consignesJustes } from "../consigneAtelier";
import { consignesPour } from "../consignesCalcul";
import { problemesAssocies, reglagesDeLAtelier } from "../problemesAssocies";
import { materielPour } from "../materielManipulation";
import { NIVEAUX, RUBRIQUES, objectifParId, objectifsDuNiveau, type Niveau, type Objectif } from "../faitsNumeriques";
import { OPERATIONS_COMPTE, REGLAGES_COMPTE, REGLAGES_COMPTE_CYCLE, STYLE_COMPTE, comptes, htmlCompteEstBon } from "../compteEstBon";
import { REGLAGES_PYRAMIDES, STYLE_PYRAMIDES, htmlPyramides, type FormeCalcul } from "../pyramides";
import { COULEURS_AIGUILLES, PRECISIONS_HEURE, REGLAGES_HEURE, STYLE_HEURE, heures, htmlHeure, type PrecisionHeure, type SensHeure } from "../heure";
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
    <>
      <CasesFeuille />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
        <button type="button" className="btn primary sm" disabled={!peut} onClick={onImprimer}>🖨 Imprimer</button>
        {onBureau && <BoutonBureau disabled={!peut} onEnregistrer={onBureau} />}
      </div>
    </>
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

export function CubesTab() {
  const [brut, maj] = useReglages<ReglagesCubes & AnciensReglagesCubes>("cubes", REGLAGES_CUBES);
  const r = React.useMemo(() => reglagesCubesSurs(brut), [brut]);
  const niv = niveauCubes(r.niveau);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier("cubes");
  const exos = React.useMemo(() => exercicesCubes(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlCubes(exos, r, graine), [exos, r, graine]);
  const style = STYLE_JEUX_MATHS + STYLE_CUBES;
  const ecritures = ecrituresChoisies(r);
  /** Un autre niveau : sa couleur de départ, et un exercice qu'il connaît ; les anciennes bornes s'effacent. */
  const changerDeNiveau = (id: IdNiveauCubes) => {
    const suivant = niveauCubes(id);
    const seulementCp = EXERCICES.find((e) => e.id === r.exercice)?.cpSeulement && suivant.classe !== "CP";
    maj({ niveau: id, memeCouleur: suivant.memeCouleur, exercice: seulementCp ? "ecrire" : r.exercice, a: undefined, de: undefined });
  };
  // Les exemples, au nombre du programme pour la classe : 34, 635, 4 635.
  const exemple = exempleDuNiveau(niv);
  const juste = decomposer(exemple, niv.plusGrand);
  const exempleDe = (id: EcritureNombre) => (id === "unites" ? ecrireUnites(juste, ordreHabituel(juste), niv.enMots) : ecrireNombre(exemple, id, { plusGrand: niv.plusGrand, enMots: niv.enMots }));
  const collectionARegrouper = aRegrouperPourDessin(exemple, niv, () => 0);
  const ecritureARegrouper = aRegrouperPourEcriture(exemple, niv, () => 0);
  const libelleRegrouper = r.exercice === "grouper" ? "Quelques barres déjà faites, et plus de dix cubes à grouper"
    : r.exercice === "dessiner" ? `Des écritures à regrouper, avec plus de dix d'une unité (${ecritureARegrouper ? ecrireUnites(ecritureARegrouper, ordreHabituel(ecritureARegrouper), niv.enMots) : ""})`
    : `Des collections à regrouper, avec plus de dix d'une sorte (${collectionARegrouper ? ecrirePieces(collectionARegrouper) : ""})`;
  const avecUnites = (r.exercice === "dessiner" || r.exercice === "relier") && ecritures.includes("unites");
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Les nombres en cubes</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Le cube, la barre de dix, la plaque de cent, le gros cube de mille : lire les groupements et écrire le nombre, grouper par dix,
          faire un nombre de plusieurs façons — passer d'une représentation à l'autre, comme le veut le programme. D'après le guide CP d'Éduscol.
        </p>
        <Field label="Les nombres">
          <Select value={r.niveau} onChange={(e) => changerDeNiveau(e.target.value as IdNiveauCubes)}>
            {CLASSES_CUBES.map((classe) => (
              <optgroup key={classe} label={classe}>
                {NIVEAUX_CUBES.filter((n) => n.classe === classe).map((n) => <option key={n.id} value={n.id}>{n.classe} — {n.libelle}</option>)}
              </optgroup>
            ))}
          </Select>
          <div className="meta" style={{ fontSize: 12, marginTop: 4, lineHeight: 1.45 }}>{niv.repere}</div>
        </Field>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceCubes })}>
            {EXERCICES.filter((e) => !e.cpSeulement || niv.classe === "CP").map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {r.exercice !== "facons" && (
          <Field label={r.exercice === "ecrire" || r.exercice === "grouper" ? "L'élève écrit le nombre…" : "Le nombre est écrit…"}>
            <Chips liste={ECRITURES.map((x) => x.id)} choisis={r.ecritures} onChange={(v) => maj({ ecritures: v as EcritureNombre[] })}
              libelle={(id) => ECRITURES.find((x) => x.id === id)!.libelle} />
            <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>
              {r.exercice === "ecrire" || r.exercice === "grouper" ? "Une ligne de réponse par écriture cochée." : "Plusieurs écritures cochées : chaque exercice en tire une."}
              {" "}Exemple : {ecritures.map(exempleDe).join(" · ")}.
            </div>
          </Field>
        )}
        <Field label="Exercices sur la feuille">
          <Input type="number" min={1} max={EXERCICES_MAX} value={r.nombre} style={{ width: 80 }}
            onChange={(e) => maj({ nombre: Math.max(1, Math.min(EXERCICES_MAX, Number(e.target.value) || 1)) })} />
        </Field>
        {r.exercice !== "facons" && <Coche on={r.aRegrouper} libelle={libelleRegrouper} onChange={(v) => maj({ aRegrouper: v })} />}
        {avecUnites && (
          <Coche on={r.desordre} libelle={`Les unités de numération dans le désordre (${ecrireUnites(juste, ordreMelange(juste, () => 0), niv.enMots)})`}
            onChange={(v) => maj({ desordre: v })} />
        )}
        <Coche on={r.memeCouleur} libelle="Toutes les pièces de la même couleur, comme les cubes emboîtables du début" onChange={(v) => maj({ memeCouleur: v })} />
        <Field label={r.memeCouleur ? "La couleur des pièces" : "La couleur de chaque groupement"}>
          {(r.memeCouleur ? GROUPEMENTS.filter((g) => g.id === "u") : groupementsDuNiveau(niv)).map((g) => (
            <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 8, margin: "3px 0" }}>
              <span style={{ width: 70, fontSize: 12.5 }}>{r.memeCouleur ? "toutes" : g.nom}</span>
              <Pastilles valeur={r.couleurs[g.id]} onChange={(hex) => maj({ couleurs: { ...r.couleurs, [g.id]: hex } })} />
            </div>
          ))}
        </Field>
        <Coche on={r.zeros} libelle="Avec des zéros à l'intérieur (30, 105, 2 040)" onChange={(v) => maj({ zeros: v })} />
        <Coche on={r.numeros} libelle="Numéroter les exercices" onChange={(v) => maj({ numeros: v })} />
        <Coche on={r.legende} libelle="La légende des cubes en haut de la feuille" onChange={(v) => maj({ legende: v })} />
        <Coche on={r.retenir} libelle="« Ce qu'on retient » en haut de la feuille" onChange={(v) => maj({ retenir: v })} />
        <Field label="Titre de la feuille">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder={REGLAGES_CUBES.titre} />
        </Field>
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("cubes", r.titre.trim() || REGLAGES_CUBES.titre, html, style)}
          onBureau={() => bureau("cubes", r.titre.trim() || REGLAGES_CUBES.titre, html, style)} />
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setEnSequence(true)}
          title="La séquence d'après le guide CP et le programme, en sept séances, aux nombres de ce niveau, avec les feuilles de cet atelier rangées dans les séances">
          📚 Créer une séquence avec cet atelier
        </button>
        {enSequence && <SequenceDesCubes reglages={r} competences={competences} onClose={() => setEnSequence(false)} />}
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
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
        <Field label={r.operation === "x" ? "Tables" : r.operation === "+" ? "Tables d'addition : le premier terme" : "La différence"}>
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
  const duNiveau = objectifsDuNiveau(r.niveau);
  const retenus = objectifsRetenus(r);
  const niveau = NIVEAUX.find((n) => n.id === r.niveau) ?? NIVEAUX[0];
  const total = series.reduce((n, s) => n + s.length, 0);
  const tablesPossibles = [...new Set(retenus.flatMap((o) => o.tables ?? []))];
  const tablesChoisies = (r.tables ?? []).filter((t) => tablesPossibles.includes(t));
  const attendu = retenus.map(fluenceAttendue).find(Boolean);

  // Chaque objectif travaille sa compétence : le bandeau règle celle de l'objectif retenu, la feuille imprime celles des retenus.
  const cleRetenus = retenus.map((o) => o.id).join("|");
  React.useEffect(() => {
    objectifsDesAteliers.publier("martiniere", retenus.map((o) => ({ id: o.id, libelle: libelleTravaille(o, tablesChoisies) })));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleRetenus, tablesChoisies.join("|")]);
  React.useEffect(() => () => objectifsDesAteliers.publier("martiniere", []), []);
  const competencesDe = useCompetencesParObjectif("martiniere");
  const [enSequence, setEnSequence] = React.useState(false);
  // Les consignes justes pour ces calculs-ci : l'éditeur de consigne les propose, et relève un mot qui ne leur irait pas.
  React.useEffect(() => {
    const ecrits = series.flat().map((c) => c.ecrit);
    const propositions = r.forme === "decouverte"
      ? ["Cherche, puis explique comment tu as fait.", "Trouve le nombre qui manque, puis explique comment tu as fait."]
      : consignesPour(ecrits, r.forme === "oral");
    consignesJustes.publier("martiniere", { propositions, ecrits });
  }, [series, r.forme]);
  React.useEffect(() => () => consignesJustes.publier("martiniere", null), []);

  // Un seul objectif à la fois ; en révision, on coche ceux qu'on veut mêler.
  const choisir = (o: Objectif) => {
    const table = o.tables && !(r.tables ?? []).some((t) => o.tables!.includes(t)) ? { tables: [o.tables[0]] } : {};
    if (!r.revision) { maj({ objectifs: [o.id], ...table }); return; }
    const siens = (r.objectifs ?? []).filter((id) => objectifParId(id)?.niveau === r.niveau);
    const suite = siens.includes(o.id) ? siens.filter((id) => id !== o.id) : [...siens, o.id];
    maj({ objectifs: suite.length ? suite : [o.id], ...table });
  };
  const choisirTable = (t: number) => {
    if (!r.revision) { maj({ tables: [t] }); return; }
    const suite = tablesChoisies.includes(t) ? tablesChoisies.filter((x) => x !== t) : [...tablesChoisies, t];
    maj({ tables: (suite.length ? suite : [t]).sort((a, b) => a - b) });
  };
  const titre = {
    oral: "Calcul mental — La Martinière", ecrit: "Calcul mental", decouverte: "Calcul mental — découverte",
    materiel: "Calcul mental — matériel de manipulation", evaluation: "Calcul mental — évaluation finale",
  }[r.forme] ?? "Calcul mental";
  const materiel = retenus.length === 1 ? materielPour(retenus[0], tablesChoisies) : null;
  // Les problèmes qui réinvestissent ce calcul : l'atelier de problèmes s'ouvre réglé pour eux.
  const associes = !r.revision && retenus.length === 1 ? problemesAssocies(retenus[0], tablesChoisies) : null;
  const versLesProblemes = () => {
    if (!associes) return;
    const cle = `fabriquer:${associes.atelier}`;
    try {
      const avant = JSON.parse(localStorage.getItem(cle) ?? "{}");
      localStorage.setItem(cle, JSON.stringify({ ...avant, ...reglagesDeLAtelier(associes, `Problèmes — ${libelleTravaille(retenus[0], tablesChoisies)}`) }));
    } catch { /* stockage indisponible : l'atelier s'ouvre sur ses réglages */ }
    ouvrirOnglet("jeux", associes.atelier);
  };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Calcul mental</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Un fait numérique ou une procédure à la fois, tels que les programmes les donnent classe par classe. À l'oral, c'est le procédé La Martinière ; par écrit, un test de fluence.
        </p>
        <Field label="Classe">
          <div className="seg">
            {NIVEAUX.map((n) => (
              <button key={n.id} type="button" className={r.niveau === n.id ? "active" : ""}
                onClick={() => maj({ niveau: n.id as Niveau, objectifs: [objectifsDuNiveau(n.id)[0].id] })}>{n.id}</button>
            ))}
          </div>
        </Field>
        <Field label={r.revision ? "Ce qu'on révise" : "Ce qu'on travaille"}>
          {RUBRIQUES.map((rubrique) => {
            const siens = duNiveau.filter((o) => o.rubrique === rubrique.id);
            if (!siens.length) return null;
            return (
              <div key={rubrique.id} className="fn-rubrique">
                <div className="fn-rubrique-titre">{rubrique.libelle}</div>
                {siens.map((o) => {
                  const choisi = retenus.some((x) => x.id === o.id);
                  const competences = competencesDe[o.id] ?? [];
                  return (
                    <button key={o.id} type="button" className={choisi ? "fn-objectif choisi" : "fn-objectif"} aria-pressed={choisi} onClick={() => choisir(o)}>
                      <span className="fn-puce" aria-hidden="true">{choisi ? (r.revision ? "☑" : "●") : (r.revision ? "☐" : "○")}</span>
                      <span style={{ flex: 1 }}>{o.libelle}</span>
                      {competences.length > 0 && (
                        <span className="fn-competence" title={`Compétence${competences.length > 1 ? "s" : ""} choisie${competences.length > 1 ? "s" : ""} : ${competences.map((c) => c.competenceTitre).join(" ; ")}`}>
                          🎯 {competences.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
          <Coche on={r.revision} libelle="Réviser : mêler plusieurs objectifs sur la même feuille"
            onChange={(v) => maj({ revision: v, objectifs: v ? r.objectifs : retenus.slice(0, 1).map((o) => o.id) })} />
        </Field>
        {tablesPossibles.length > 0 && (
          <Field label={r.revision ? "Quelles tables ?" : "Quelle table ?"}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {tablesPossibles.map((t) => (
                <button key={t} type="button" className={`btn sm${tablesChoisies.includes(t) ? " primary" : " ghost"}`} onClick={() => choisirTable(t)}>{t}</button>
              ))}
            </div>
          </Field>
        )}
        <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "2px 0 8px" }}>
          Programme de {r.niveau} · {niveau.champ}{attendu ? ` · attendu en fin d'année : ${attendu}` : ""}.
        </div>
        <Field label="Forme">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as FormeEntrainement })}>
            <option value="oral">À l'oral — procédé La Martinière</option>
            <option value="ecrit">Par écrit — test de fluence</option>
            <option value="decouverte">Découverte — chercher, expliquer, retenir</option>
            <option value="materiel">Matériel de manipulation — pour la découverte</option>
            <option value="evaluation">Évaluation finale</option>
          </Select>
        </Field>
        {r.forme !== "decouverte" && r.forme !== "materiel" && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Calculs par série"><Input type="number" min={5} max={30} value={r.parSerie} onChange={(e) => maj({ parSerie: borne(e.target.value, 5, 30, 10) })} /></Field>
          <Field label="Séries"><Input type="number" min={1} max={6} value={r.series} onChange={(e) => maj({ series: borne(e.target.value, 1, 6, 2) })} /></Field>
        </div>}
        {r.forme === "oral" && (<>
          <Field label="Temps de réflexion avant « écrivez »">
            <Select value={r.reflexion} onChange={(e) => maj({ reflexion: Number(e.target.value) })}>
              {REFLEXIONS.map((s) => <option key={s} value={s}>{s} secondes</option>)}
            </Select>
          </Field>
          <Coche on={r.ardoises} libelle="Les ardoises papier des élèves, à la suite" onChange={(v) => maj({ ardoises: v })} />
        </>)}
        <div className="meta" style={{ fontSize: 12.5 }}>
          {r.forme === "materiel" ? (materiel ? `${materiel.nom} : ${materiel.usage}` : "Choisissez un seul objectif.")
            : r.forme === "decouverte" ? "Trois calculs à chercher, puis la trace écrite à remplir ensemble."
            : r.forme === "evaluation" ? `${series.length > 1 ? series[0].length : Math.ceil(total / 2)} calculs en temps limité, ${Math.min(6, series.length > 1 ? series[1].length : Math.floor(total / 2))} sans limite de temps, une procédure à expliquer${associes ? ", un problème" : ""}, et le bilan.`
            : `${total} calculs.`}
        </div>
        <Boutons peut={total > 0} onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("martiniere", titre, html, STYLE_MARTINIERE)} onBureau={() => bureau("martiniere", titre, html, STYLE_MARTINIERE)} />
        {associes && (
          <button type="button" className="btn sm" style={{ marginTop: 8, marginRight: 6 }} onClick={versLesProblemes}
            title={`${associes.nom}, réglés pour réinvestir ce calcul`}>
            🧩 Des problèmes avec ce calcul
          </button>
        )}
        <button type="button" className="btn sm" style={{ marginTop: 8 }} disabled={total === 0 || r.revision} onClick={() => setEnSequence(true)}
          title={r.revision ? "Une séquence travaille un seul objectif : décochez « Réviser »." : "Une séquence d'après les guides Éduscol, avec cette feuille dans ses séances"}>
          📚 Créer une séquence avec cette feuille
        </button>
        {enSequence && (
          <SequenceDeCalculMental reglages={r} graine={graine} competences={competencesDe[retenus[0]?.id ?? ""] ?? []} onClose={() => setEnSequence(false)} />
        )}
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
        <Field label="Les aides">
          <Coche on={r.couleurs} libelle="Aiguilles en couleur" onChange={(v) => maj({ couleurs: v })} />
          {r.couleurs && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "4px 0 8px 24px" }}>
              <div>
                <div className="meta" style={{ fontSize: 12, marginBottom: 4 }}>Petite aiguille · les heures</div>
                <Pastilles palette={COULEURS_AIGUILLES} valeur={r.couleurHeures} onChange={(hex) => maj({ couleurHeures: hex })} />
              </div>
              <div>
                <div className="meta" style={{ fontSize: 12, marginBottom: 4 }}>Grande aiguille · les minutes</div>
                <Pastilles palette={COULEURS_AIGUILLES} valeur={r.couleurMinutes} onChange={(hex) => maj({ couleurMinutes: hex })} />
              </div>
            </div>
          )}
          <Coche on={r.minutesAutour} libelle="Les minutes autour du cadran : 5, 10, 15…" onChange={(v) => maj({ minutesAutour: v })} />
          <Coche on={r.avecH} libelle="Le « h » déjà écrit dans la réponse" onChange={(v) => maj({ avecH: v })} />
          <Coche on={r.apresMidi} libelle="L'après-midi aussi : 19 h 30 se lit comme 7 h 30" onChange={(v) => maj({ apresMidi: v })} />
        </Field>
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
