// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { usePictoImages } from "../components/ChoixPicto";
import { Field, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  REGLAGES_PRONOMS, REMPLACANTS_PAR_DEFAUT, STYLE_PRONOMS, VERBES_DES_PRONOMS, htmlPronoms, motsADessinerPronoms, reglagesPronomsSurs, titrePronoms,
  type ReglagesPronoms,
} from "../affichePronoms";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Coche } from "./AteliersMaths";

// ── Fabriquer › Français › Les pronoms personnels sujets ──────────────────
//
// Le tableau des pronoms sujets, singulier et pluriel, les trois personnes,
// et les groupes nominaux qu'ils remplacent (voir affichePronoms.ts). Les
// pictogrammes viennent de la banque, quand elle est là.

const ATELIER = "affichePronoms";

/** Les pictogrammes des mots, par mot en minuscules : cherchés dans la banque sous leur nom exact. */
function useDessins(mots: string[], actif: boolean): Record<string, string> {
  const [ids, setIds] = React.useState<Record<string, number>>({});
  const cle = mots.join("|");
  React.useEffect(() => {
    if (!actif || !mots.length) { setIds({}); return; }
    let vivant = true;
    api.arasaacParMots(mots)
      .then(([trouves]) => { if (vivant) setIds(Object.fromEntries(trouves.map((p) => [p.mot.toLowerCase(), p.id]))); })
      .catch(() => { if (vivant) setIds({}); });
    return () => { vivant = false; };
  }, [cle, actif]); // eslint-disable-line react-hooks/exhaustive-deps
  const images = usePictoImages(Object.values(ids));
  return React.useMemo(() => Object.fromEntries(Object.entries(ids).flatMap(([mot, id]) => (images[id] ? [[mot, images[id]]] : []))), [ids, images]);
}

export function PronomsTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesPronoms>(ATELIER, REGLAGES_PRONOMS);
  const r = React.useMemo(() => reglagesPronomsSurs(brut), [brut]);
  const mots = React.useMemo(() => motsADessinerPronoms(r), [r]);
  const dessins = useDessins(mots, banque && r.pictos);
  const html = React.useMemo(() => htmlPronoms({ ...r, pictos: banque && r.pictos }, dessins), [r, banque, dessins]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les pronoms personnels sujets
          <Aide titre="Les pronoms personnels sujets" vers="droite"><p>Le guide « La grammaire du français du CP à la 6e » : dès le CP, la classe
            rassemble les pronoms sujets — je, tu, il, elle, nous, vous, ils, elles —, ceux qui désignent des personnes ou des animaux et ceux qui
            remplacent un groupe nominal (« la voiture ➔ elle »), « collectivement et sous la forme d'affichage en classe ». Au CE1, l'élève en
            dit la personne et le nombre, le singulier d'abord, puis le pluriel (p. 174).</p>
            <p>Ce qu'il retient : le pronom indique la personne qui parle, celle à qui l'on parle, celle de qui l'on parle (p. 173). Au début
            du cycle 2, la personne et le nombre se perçoivent sans être nommés : décochez-les.</p></Aide>
        </h3>
        <Coche on={r.pluriel} libelle="Le pluriel aussi : nous, vous, ils, elles" onChange={(pluriel) => maj({ pluriel })} />
        <Coche on={r.noms} libelle="Les mots 1re personne, singulier, pluriel" onChange={(noms) => maj({ noms })} />
        <Coche on={r.roles} libelle="Qui parle, à qui l'on parle, de qui l'on parle" onChange={(roles) => maj({ roles })} />
        <Coche on={r.on} libelle="« on », avec il et elle" onChange={(on) => maj({ on })} />
        {banque && <Coche on={r.pictos} libelle="Les pictogrammes" onChange={(pictos) => maj({ pictos })} />}
        <Field label="Un verbe au présent avec chaque pronom">
          <Select value={r.verbe} onChange={(e) => maj({ verbe: e.target.value })}>
            <option value="">Aucun</option>
            {VERBES_DES_PRONOMS.map((v) => <option key={v} value={v}>{v}</option>)}
          </Select>
        </Field>
        <Coche on={r.avecRemplacants} libelle="Ce que remplace le pronom" onChange={(avecRemplacants) => maj({ avecRemplacants })} />
        {r.avecRemplacants && <>
          <Field label="Un groupe nominal et son pronom par ligne">
            <textarea className="textarea" rows={5} value={r.remplacants} spellCheck={false} onChange={(e) => maj({ remplacants: e.target.value })} />
          </Field>
          {r.remplacants !== REMPLACANTS_PAR_DEFAUT && (
            <button type="button" className="btn ghost sm" onClick={() => maj({ remplacants: REMPLACANTS_PAR_DEFAUT })}>Remettre les exemples du guide</button>
          )}
        </>}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesPronoms["format"] })}>
            <option value="mur">Une page, pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titrePronoms(r)} html={html} style={STYLE_PRONOMS} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PRONOMS} />}
    />
  );
}
