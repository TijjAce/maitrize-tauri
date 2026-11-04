import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { usePictoImages } from "../components/ChoixPicto";
import { Field, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  NIVEAUX_CONJUGAISON, PRONOMS_A_ILLUSTRER, REGLAGES_AFFICHE_CONJUGAISON, htmlAfficheConjugaison, reglagesAfficheSurs, styleAfficheConjugaison,
  titreAfficheConjugaison, type NiveauConjugaison, type ReglagesAfficheConjugaison,
} from "../afficheConjugaison";
import { AU_PROGRAMME, TEMPS, type Temps } from "../conjugaison";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Français › Les tableaux de conjugaison ────────────────────
//
// Les verbes et les temps du programme de la classe, une page par verbe ou
// par temps, pour le mur (voir afficheConjugaison.ts). Les pictogrammes des
// pronoms viennent de la banque, quand elle est là.

const ATELIER = "afficheConjugaison";

/** Les pictogrammes des pronoms, cherchés une fois dans la banque : le pronom, et son image. */
function usePictosDesPronoms(actif: boolean): Record<string, string> {
  const [ids, setIds] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    if (!actif) return;
    let vivant = true;
    api.arasaacParMots(PRONOMS_A_ILLUSTRER)
      .then(([trouves]) => { if (vivant) setIds(Object.fromEntries(trouves.map((p) => [p.mot.toLowerCase(), p.id]))); })
      .catch(() => {});
    return () => { vivant = false; };
  }, [actif]);
  const images = usePictoImages(Object.values(ids));
  return React.useMemo(() => Object.fromEntries(Object.entries(ids).flatMap(([pronom, id]) => (images[id] ? [[pronom, images[id]]] : []))), [ids, images]);
}

export function AfficheConjugaisonTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesAfficheConjugaison>(ATELIER, REGLAGES_AFFICHE_CONJUGAISON);
  const r = React.useMemo(() => reglagesAfficheSurs(brut), [brut]);
  const pictos = usePictosDesPronoms(banque && r.pictos);
  const html = React.useMemo(() => htmlAfficheConjugaison({ ...r, pictos: banque && r.pictos }, pictos), [r, banque, pictos]);
  const style = React.useMemo(() => styleAfficheConjugaison(r), [r]);
  const prog = AU_PROGRAMME[r.niveau];
  const nomDuTemps = (t: Temps) => TEMPS.find((x) => x.id === t)!.nom;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les tableaux de conjugaison
          <Aide titre="Les tableaux de conjugaison" vers="droite"><p>Le programme de 2024 : au CP, être et avoir au présent ; au CE1, le présent,
            l'imparfait, le futur puis le passé composé d'être, d'avoir et des verbes du 1er groupe ; au CE2, aussi faire, aller, dire, venir,
            pouvoir, voir, vouloir et prendre. Il demande de construire avec les élèves des outils d'aide à l'écriture — l'affichage en est un.</p>
            <p>La terminaison se colore là où elle se retient : à l'imparfait et au futur, pour tous les verbes ; au présent, pour les verbes du
            1er groupe ; au passé composé, c'est l'auxiliaire. Avec « il, elle », le participe d'un verbe conjugué avec être s'accorde :
            allé(e).</p></Aide>
        </h3>
        <Field label="La classe">
          <Select value={r.niveau} onChange={(e) => maj({ niveau: e.target.value as NiveauConjugaison })}>
            {NIVEAUX_CONJUGAISON.map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Field label="Les verbes">
          <Chips liste={prog.verbes} choisis={r.verbes} onChange={(verbes) => { if (verbes.length) maj({ verbes }); }} />
        </Field>
        <Field label="Les temps">
          <Chips liste={prog.temps} choisis={r.temps} libelle={nomDuTemps} onChange={(temps) => { if (temps.length) maj({ temps }); }} />
        </Field>
        <Field label="Une page">
          <Select value={r.disposition} onChange={(e) => maj({ disposition: e.target.value as ReglagesAfficheConjugaison["disposition"] })}>
            <option value="verbe">Par verbe : ses temps côte à côte</option>
            <option value="temps">Par temps : ses verbes côte à côte</option>
          </Select>
        </Field>
        <Field label="Les pronoms">
          <Select value={r.pronoms} onChange={(e) => maj({ pronoms: e.target.value as ReglagesAfficheConjugaison["pronoms"] })}>
            <option value="il">je, tu, il, nous, vous, ils</option>
            <option value="il-elle">… il, elle, on … ils, elles</option>
          </Select>
        </Field>
        <Coche on={r.couleurs} libelle="Les terminaisons en couleur" onChange={(couleurs) => maj({ couleurs })} />
        {banque && <Coche on={r.pictos} libelle="Les pictogrammes des pronoms" onChange={(p) => maj({ pictos: p })} />}
        <Boutons atelier={ATELIER} titre={titreAfficheConjugaison(r)} html={html} style={style} peut />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
