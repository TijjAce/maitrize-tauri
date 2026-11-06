// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { usePictoImages } from "../components/ChoixPicto";
import { ApercuExemple, useMotsExemple } from "../components/Exemple";
import { Field, Select, Textarea } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import {
  DE_NEUF, MAX_DES, REGLAGES_DES, SORTES_DE_DES, STYLE_DES, aLaRegleDuJeu, facesDuDe, htmlDes, reglagesDesSurs, titreDuDe,
  type DeAFabriquer, type ImageDeDe, type ReglagesDes, type SorteDeDe,
} from "../desAFabriquer";
import { MOTS_EXEMPLE } from "../exemplesDesAteliers";
import { COULEURS_DU_TABLEAU, FORMES_DU_TABLEAU } from "../tableauDoubleEntree";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Mathématiques › Données › Les dés personnalisés ─────────────
//
// Un à trois dés (voir desAFabriquer.ts), chacun ses faces : des images de la
// banque ou les siennes, des couleurs, des formes, des points, des chiffres ou
// des mots. Tant que le premier dé d'images n'a pas d'image, l'exemple montre
// celui des animaux et un dé de couleurs : « Dessine-moi le zèbre en rouge ».
// On retire un dé par la fin : chaque dé garde sa liste d'images.

const ATELIER = "des";

export function DesTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesDes>(ATELIER, REGLAGES_DES);
  const r = React.useMemo(() => reglagesDesSurs(brut), [brut]);
  const [mots1, setMots1] = useMotsGardes(`${ATELIER}:mots:1`);
  const [mots2, setMots2] = useMotsGardes(`${ATELIER}:mots:2`);
  const [mots3, setMots3] = useMotsGardes(`${ATELIER}:mots:3`);
  const listes = [mots1, mots2, mots3];
  const poseurs = [setMots1, setMots2, setMots3];
  const premierEnImages = r.des.findIndex((d) => d.sorte === "images");
  const exemple = useMotsExemple(MOTS_EXEMPLE.des, banque && premierEnImages >= 0 && !listes[premierEnImages].length);
  const enExemple = premierEnImages >= 0 && !listes[premierEnImages].length && !!exemple?.length;
  const motsDuDe = (i: number) => (listes[i].length ? listes[i] : i === premierEnImages && exemple ? exemple : []);
  const ids = r.des.flatMap((d, i) => (d.sorte === "images" ? motsDuDe(i) : [])).map((m) => m.id).filter((x): x is number => x != null);
  const sources = usePictoImages(ids);
  const imagesParDe = r.des.map((d, i): ImageDeDe[] => (d.sorte === "images"
    ? motsDuDe(i).flatMap((m) => (m.id != null && sources[m.id] ? [{ mot: m.mot, src: sources[m.id] }] : [])).slice(0, 6) : []));
  const cle = JSON.stringify([r, imagesParDe.map((l) => l.map((x) => x.mot + x.src.length))]);
  const html = React.useMemo(() => htmlDes(r, imagesParDe), [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  const changer = (i: number, d: Partial<DeAFabriquer>) => maj({ des: r.des.map((x, k) => (k === i ? { ...x, ...d } : x)) });
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les dés personnalisés
          <Aide titre="Les dés personnalisés" vers="droite"><p>Des dés dont on choisit les six faces : des images de la banque ou les vôtres, des couleurs, des formes,
            des points, des chiffres ou des mots — moins de six, et elles reviennent dans l'ordre. Un patron à découper, plier et coller, ou six cartes pour un dé
            à pochettes. Deux dés, un d'images ou de formes puis un de couleurs, font le jeu « Dessine-moi… » : le premier dit quoi, le second de quelle couleur ;
            les mêmes dés font jouer au tableau à double entrée.</p></Aide>
        </h3>
        {r.des.map((d, i) => (
          <div key={i} className="card" style={{ padding: 10, marginBottom: 8 }}>
            <Field label={titreDuDe(d, i, r.des.length)}>
              <Select value={d.sorte} onChange={(e) => changer(i, { sorte: e.target.value as SorteDeDe })}>
                {SORTES_DE_DES.map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
              </Select>
            </Field>
            {d.sorte === "couleurs" && <Chips liste={COULEURS_DU_TABLEAU.map((c) => c.nom)} choisis={d.couleurs}
              onChange={(couleurs) => { if (couleurs.length <= 6) changer(i, { couleurs }); }} />}
            {d.sorte === "formes" && <Chips liste={FORMES_DU_TABLEAU} choisis={d.formes}
              onChange={(formes) => { if (formes.length <= 6) changer(i, { formes }); }} />}
            {d.sorte === "images" && <BanqueDeMots mots={listes[i]} onChange={poseurs[i]} banque={banque} aide="Jusqu'à six images : une par face." />}
            {d.sorte === "mots" && (
              <Textarea rows={4} value={d.mots} placeholder={"saute\ntourne\ntape des mains"} aria-label="Les mots du dé, un par ligne"
                onChange={(e) => changer(i, { mots: e.target.value })} />
            )}
            {!facesDuDe(d, imagesParDe[i]).length && <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>Ce dé n'a encore rien sur ses faces.</div>}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          {r.des.length < MAX_DES && <button type="button" className="btn ghost sm" onClick={() => maj({ des: [...r.des, { ...DE_NEUF, sorte: "couleurs" }] })}>+ Un dé de plus</button>}
          {r.des.length > 1 && <button type="button" className="btn ghost sm" onClick={() => maj({ des: r.des.slice(0, -1) })}>Retirer le dernier dé</button>}
        </div>
        <Field label="Le dé">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as ReglagesDes["forme"] })}>
            <option value="patron">Un patron à plier</option>
            <option value="pochettes">Six cartes pour un dé à pochettes</option>
          </Select>
        </Field>
        <Field label="Sa taille">
          <Select value={String(r.taille)} onChange={(e) => maj({ taille: Number(e.target.value) as ReglagesDes["taille"] })}>
            <option value="3">3 cm</option>
            <option value="4">4 cm</option>
            <option value="5">5 cm</option>
          </Select>
        </Field>
        <Coche on={r.motsEcrits} libelle="Le mot sous l'image, la couleur ou la forme" onChange={(motsEcrits) => maj({ motsEcrits })} />
        {r.des.length >= 2 && <Coche on={r.regle} libelle="La règle du jeu « Dessine-moi… »" onChange={(regle) => maj({ regle })} />}
        {r.regle && r.des.length >= 2 && !aLaRegleDuJeu(r) && (
          <div className="meta" style={{ fontSize: 12.5 }}>La règle vient avec un premier dé d'images ou de formes, et un deuxième de couleurs.</div>
        )}
        <Boutons atelier={ATELIER} titre="Les dés personnalisés" html={html} style={STYLE_DES} peut={!!html && !enExemple} />
      </>}
      droite={!html
        ? <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>Choisissez ce que montrent les faces : des images, des couleurs, des formes…</div>
        : enExemple
          ? <ApercuExemple onPrendre={() => poseurs[premierEnImages](exemple!)}><ApercuFeuille html={html} style={STYLE_DES} /></ApercuExemple>
          : <ApercuFeuille html={html} style={STYLE_DES} />}
    />
  );
}
