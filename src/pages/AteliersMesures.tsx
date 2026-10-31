import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { CONTRAINTES_UN_EURO, EXERCICES_MONNAIE, PLAFONDS_MONNAIE, REGLAGES_MONNAIE, STYLE_MONNAIE, htmlMonnaie, type ExerciceMonnaie } from "../monnaie";
import { EXERCICES_MESURES, REGLAGES_MESURES, STYLE_MESURES, exerciceDisponible, htmlMesures, type Classe, type ExerciceMesures, type Grandeur } from "../mesures";
import { EXERCICES_DONNEES, REGLAGES_DONNEES, STYLE_DONNEES, htmlDonnees, type ExerciceDonnees } from "../donnees";

// ── Fabriquer › Mathématiques : la monnaie, les mesures ───────────────────

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function MonnaieTab() {
  const [r, maj] = useReglages("monnaie", REGLAGES_MONNAIE);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlMonnaie(r, graine), [r, graine]);
  const titre = EXERCICES_MONNAIE.find((e) => e.id === r.exercice)?.libelle.split(" — ")[0] ?? "La monnaie";
  // « 1 € de plusieurs façons » : toujours 1 €, en centimes, sans virgule ; seul compte le nombre de cases.
  const unEuro = r.exercice === "unEuro";
  const combienMax = unEuro ? CONTRAINTES_UN_EURO.length : 12;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          La monnaie
          <Aide titre="La monnaie" vers="droite"><p>Des pièces et des billets dessinés « pour jouer », et des feuilles pour compter, payer juste, comparer, rendre la monnaie, écrire avec la virgule — d'après le programme 2024 : les euros jusqu'à cent au CP, les centimes au CE1, la virgule à partir de la période 3.</p></Aide>
        </h3>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceMonnaie })}>
            {EXERCICES_MONNAIE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {!unEuro && (
            <Field label="Jusqu'à">
              <Select value={r.jusqua} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
                {PLAFONDS_MONNAIE.map((p) => <option key={p} value={p}>{p.toLocaleString("fr-FR")} €</option>)}
              </Select>
            </Field>
          )}
          {r.exercice !== "planche" && (
            <Field label="Combien">
              <Input type="number" min={unEuro ? 2 : 1} max={combienMax} value={Math.min(r.combien, combienMax)}
                onChange={(e) => maj({ combien: borne(e.target.value, unEuro ? 2 : 1, combienMax, 6) })} style={{ width: 80 }} />
            </Field>
          )}
        </div>
        {!unEuro && <>
          <Coche on={r.centimes} libelle="Les centimes aussi (CE1)" onChange={(v) => maj({ centimes: v })} />
          <Coche on={r.virgule} libelle="L'écriture à virgule : 3,50 € (CE1 dès la période 3, CE2)" onChange={(v) => maj({ virgule: v })} />
        </>}
        {r.exercice === "constituer" && <>
          <Coche on={r.moinsDePieces} libelle="Avec le moins de pièces et de billets possible" onChange={(v) => maj({ moinsDePieces: v })} />
          <Coche on={r.sansPiecesDe1} libelle="Sans pièce de 1 €" onChange={(v) => maj({ sansPiecesDe1: v })} />
        </>}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("monnaie", titre, html, STYLE_MONNAIE)} onBureau={() => bureau("monnaie", titre, html, STYLE_MONNAIE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_MONNAIE} />}
    />
  );
}

const GRANDEURS: { id: Grandeur; libelle: string }[] = [
  { id: "longueur", libelle: "Les longueurs" }, { id: "masse", libelle: "Les masses" }, { id: "contenance", libelle: "Les contenances" },
];

export function MesuresTab() {
  const [r, maj] = useReglages("mesures", REGLAGES_MESURES);
  const [graine, setGraine] = useGraine();
  const exercices = EXERCICES_MESURES.filter((e) => e.grandeurs.includes(r.grandeur) && exerciceDisponible(e.id, r.grandeur, r.classe));
  // Un exercice qui ne vaut pas pour la grandeur choisie : le premier de la liste.
  const exercice = exercices.some((e) => e.id === r.exercice) ? r.exercice : exercices[0].id;
  const html = React.useMemo(() => htmlMesures({ ...r, exercice }, graine), [r, exercice, graine]);
  const titre = EXERCICES_MESURES.find((e) => e.id === exercice)?.libelle.replace(/ \((CE2)\)$/, "") ?? "Mesures";
  const segments = exercice === "mesurer" || exercice === "tracer";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Mesures
          <Aide titre="Mesures" vers="droite"><p>Comparer, mesurer, tracer, estimer, convertir : les longueurs, les masses et les contenances du cycle 2, d'après le programme 2024 et les ressources Éduscol « Grandeurs et mesures ». Les segments sont à leur taille réelle : imprimez à 100 %.</p></Aide>
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Grandeur">
            <Select value={r.grandeur} onChange={(e) => maj({ grandeur: e.target.value as Grandeur })}>
              {GRANDEURS.map((g) => <option key={g.id} value={g.id}>{g.libelle}</option>)}
            </Select>
          </Field>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
        </div>
        <Field label="Exercice">
          <Select value={exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceMesures })}>
            {exercices.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {segments && <>
          <Coche on={r.millimetres} libelle="Au millimètre (CE2)" onChange={(v) => maj({ millimetres: v })} />
          {exercice === "mesurer" && <Coche on={r.encadrer} libelle="Encadrer entre deux centimètres (CE1)" onChange={(v) => maj({ encadrer: v })} />}
          {exercice === "mesurer" && <Coche on={r.obliques} libelle="Des segments dans tous les sens" onChange={(v) => maj({ obliques: v })} />}
        </>}
        {exercice !== "perimetreCompas" && exercice !== "regleU" && (
          <Field label="Combien">
            <Input type="number" min={1} max={12} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 12, 6) })} style={{ width: 80 }} />
          </Field>
        )}
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("mesures", titre, html, STYLE_MESURES)} onBureau={() => bureau("mesures", titre, html, STYLE_MESURES)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_MESURES} />}
    />
  );
}

export function DonneesTab() {
  const [r, maj] = useReglages("donnees", REGLAGES_DONNEES);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlDonnees(r, graine), [r, graine]);
  const titre = (EXERCICES_DONNEES.find((e) => e.id === r.exercice)?.libelle ?? "Tableaux et diagrammes").replace(/ \((CP|CE1|CE2)(, (CE1|CE2))?\)$/, "");
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Tableaux et diagrammes
          <Aide titre="Tableaux et diagrammes" vers="droite"><p>Une enquête et son relevé par bâtons, le tableau, le diagramme en barres — de cubes au CP —, le tableau à double entrée, des problèmes : d'après le programme 2024, moins de quarante réponses au CP, un axe gradué de un en un au CE1, une échelle adaptée au CE2.</p></Aide>
        </h3>
        <Field label="Classe">
          <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
            <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
          </Select>
        </Field>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceDonnees })}>
            {EXERCICES_DONNEES.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        <Boutons onTirage={() => setGraine(graineAuHasard())} onImprimer={() => imprimer("donnees", titre, html, STYLE_DONNEES)} onBureau={() => bureau("donnees", titre, html, STYLE_DONNEES)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_DONNEES} />}
    />
  );
}
