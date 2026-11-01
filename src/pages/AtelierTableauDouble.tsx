import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { usePictoImages } from "../components/ChoixPicto";
import { useColoriages } from "../components/MesImages";
import { Field, Input, Select } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import {
  COULEURS_DU_TABLEAU, FORMES_DU_TABLEAU, MAX_COULEURS_DU_TABLEAU, MAX_DU_TABLEAU, REGLAGES_TABLEAU, STYLE_TABLEAU, couleurDuTableau, htmlTableau,
  reglagesTableauSurs, titreTableau, type ReglagesTableau,
} from "../tableauDoubleEntree";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Mathématiques › Données › Le tableau à double entrée ──────
//
// Son atelier à lui, hors de la séquence (voir tableauDoubleEntree.ts) : les
// formes ou les images des lignes — de deux à cinq —, les couleurs des
// colonnes — de deux à neuf —, les cases faites, ce que fait l'élève. Des
// images en coloriage : leur dessin noir et blanc se calcule ici, avec celui
// de chaque couleur.

const ATELIER = "tableauDouble";

export function TableauDoubleTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesTableau>(ATELIER, REGLAGES_TABLEAU);
  const r = React.useMemo(() => reglagesTableauSurs(brut), [brut]);
  const [mots, setMots] = useMotsGardes(`${ATELIER}:mots`);
  const [graine, setGraine] = useGraine();
  const ids = mots.map((m) => m.id).filter((x): x is number => x != null);
  const sources = usePictoImages(ids);
  const brutes = React.useMemo(() => mots.flatMap((m) => (m.id != null && sources[m.id] ? [{ mot: m.mot, src: sources[m.id] }] : [])).slice(0, MAX_DU_TABLEAU),
    [mots, sources]);
  const hexes = r.couleurs.map((nom) => couleurDuTableau(nom)!.hex);
  const { dessins } = useColoriages(brutes.map((i) => i.src), hexes, r.lignes === "images" && r.coloriage);
  const images = React.useMemo(() => brutes.map((i) => (dessins[`:${i.src}`]
    ? { ...i, coloriage: dessins[`:${i.src}`], colorie: Object.fromEntries(hexes.flatMap((h) => (dessins[`${h}:${i.src}`] ? [[h, dessins[`${h}:${i.src}`]]] : []))) }
    : i)), [brutes, dessins, hexes.join()]); // eslint-disable-line react-hooks/exhaustive-deps
  const html = React.useMemo(() => htmlTableau(r, images, graine), [r, images, graine]);
  const enImages = r.lignes === "images" && images.length >= 2;
  // De deux à `max` : au-delà, les cases ne tiennent plus sur la page.
  const borne = <T,>(liste: T[], max: number, poser: (v: T[]) => void) => { if (liste.length >= 2 && liste.length <= max) poser(liste); };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le tableau à double entrée
          <Aide titre="Le tableau à double entrée" vers="droite"><p>Une ligne par forme, ou par image ; une colonne par couleur : chaque case, la forme de sa ligne,
            de la couleur de sa colonne. Quelques cases sont faites — au hasard, ou la première ligne ou la première colonne, en modèle —, l'élève dessine les autres,
            ou y colle les gommettes qu'il découpe. Le programme du CP : « construire et compléter un tableau à double entrée ».</p></Aide>
        </h3>
        <Field label="Les lignes">
          <Select value={r.lignes} onChange={(e) => maj({ lignes: e.target.value as ReglagesTableau["lignes"] })}>
            <option value="formes">Des formes</option>
            <option value="images">Des images</option>
          </Select>
        </Field>
        {r.lignes === "formes"
          ? <Chips liste={FORMES_DU_TABLEAU} choisis={r.formes} onChange={(formes) => borne(formes, MAX_DU_TABLEAU, (v) => maj({ formes: v }))} />
          : <>
            <BanqueDeMots mots={mots} onChange={setMots} banque={banque} aide={`De deux à ${MAX_DU_TABLEAU} images : une ligne chacune.`} />
            <Coche on={r.coloriage} libelle="En coloriage : le dessin en noir et blanc, à colorier" onChange={(coloriage) => maj({ coloriage })} />
          </>}
        <Field label="Les colonnes : les couleurs">
          <Chips liste={COULEURS_DU_TABLEAU.map((c) => c.nom)} choisis={r.couleurs} onChange={(couleurs) => borne(couleurs, MAX_COULEURS_DU_TABLEAU, (v) => maj({ couleurs: v }))} />
        </Field>
        <Field label="Les cases déjà faites">
          <Select value={r.faites} onChange={(e) => maj({ faites: e.target.value as ReglagesTableau["faites"] })}>
            <option value="hasard">Quelques-unes, au hasard</option>
            <option value="ligne">La première ligne, en modèle</option>
            <option value="colonne">La première colonne, en modèle</option>
            <option value="aucune">Aucune</option>
          </Select>
        </Field>
        {r.faites === "hasard" && (
          <Field label="Combien">
            <Select value={String(r.combien)} onChange={(e) => maj({ combien: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        )}
        <Field label="L'élève">
          <Select value={r.tache} onChange={(e) => maj({ tache: e.target.value as ReglagesTableau["tache"] })}>
            <option value="dessiner">Dessine dans les cases</option>
            <option value="coller">Colle les gommettes qu'il découpe</option>
          </Select>
        </Field>
        <Coche on={r.motsEcrits} libelle="Les noms écrits dans les têtes" onChange={(motsEcrits) => maj({ motsEcrits })} />
        <Coche on={r.niveauDAide} libelle="Le niveau d'aide, pour l'enseignant" onChange={(niveauDAide) => maj({ niveauDAide })} />
        <Field label="Le titre">
          <Input value={brut.titre ?? ""} placeholder={titreTableau(r, enImages)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier={ATELIER} titre={titreTableau(r, enImages)} html={html} style={STYLE_TABLEAU} peut onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_TABLEAU} />}
    />
  );
}
