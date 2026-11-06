// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ChoixPoliceCursive } from "../components/ChoixPoliceCursive";
import { usePictoImages } from "../components/ChoixPicto";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  LETTRES_A_VALEURS, REGLAGES_VALEUR_LETTRES, STYLE_VALEUR_LETTRES, VALEURS, htmlValeurLettres, motsADessiner, motsHorsDeLaRegle,
  reglagesValeurLettresSurs, sonsAffiches, titreValeurLettres, type LettreAValeurs, type ReglagesValeurLettres,
} from "../valeurDesLettres";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Français › La valeur des lettres ──────────────────────────
//
// c, g et s : une page par lettre, une case par son, une ligne par règle,
// des mots et leurs dessins (voir valeurDesLettres.ts). Les dessins viennent
// de la banque, quand elle est là.

const ATELIER = "valeurLettres";

/** Les dessins des mots, par mot en minuscules : cherchés dans la banque sous leur nom exact. */
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

const avertissement: React.CSSProperties = { fontSize: 12.5, color: "var(--orange)", margin: "4px 0 0" };

export function ValeurLettresTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesValeurLettres>(ATELIER, REGLAGES_VALEUR_LETTRES);
  const r = React.useMemo(() => reglagesValeurLettresSurs(brut), [brut]);
  const mots = React.useMemo(() => motsADessiner(r), [r]);
  const dessins = useDessins(mots, banque && r.images);
  const html = React.useMemo(() => htmlValeurLettres({ ...r, images: banque && r.images }, dessins), [r, banque, dessins]);
  const changerLesMots = (id: string, saisie: string) => maj({ mots: { ...r.mots, [id]: saisie } });
  const remettre = (l: LettreAValeurs) => {
    const ids = new Set(VALEURS[l].flatMap((s) => s.regles.map((g) => g.id)));
    maj({ mots: Object.fromEntries(Object.entries(r.mots).filter(([id]) => !ids.has(id))) });
  };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          La valeur des lettres
          <Aide titre="La valeur des lettres" vers="droite"><p>Le programme de 2024, au CE1 : classer et mémoriser les mots où une lettre se
            prononce de deux façons — « s prononcé –ss ou –z, c prononcé –ss ou –k, g prononcé –j ou –g » —, et retrouver une lettre muette
            finale grâce à un mot de la même famille : blanc, blanche.</p>
            <p>Le guide « Pour enseigner la lecture et l'écriture au CE1 » range les valeurs de la lettre c en carte mentale (p. 112) ; l'affiche
            en reprend l'ordre pour c, g et s : une case par son, une ligne par règle. La lettre est en couleur, celle qui décide est soulignée.
            Les mots se changent : « blanc/blanche » écrit le mot de la famille sous le mot.</p></Aide>
        </h3>
        <Field label="Les lettres">
          <Chips liste={LETTRES_A_VALEURS} choisis={r.lettres} onChange={(lettres) => { if (lettres.length) maj({ lettres }); }} />
        </Field>
        <Coche on={r.muettes} libelle="Les lettres muettes : blanc, sang, souris" onChange={(muettes) => maj({ muettes })} />
        <Coche on={r.digrammes} libelle="Les digrammes ch et gn" onChange={(digrammes) => maj({ digrammes })} />
        {banque && <Coche on={r.images} libelle="Le dessin de chaque mot" onChange={(images) => maj({ images })} />}
        <Coche on={r.cursive} libelle="La lettre aussi en cursive" onChange={(cursive) => maj({ cursive })} />
        {r.cursive && <ChoixPoliceCursive />}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesValeurLettres["format"] })}>
            <option value="mur">Une page par lettre, pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        {r.lettres.map((l) => {
          const changees = VALEURS[l].some((s) => s.regles.some((g) => g.id in r.mots));
          return (
            <details key={l} style={{ margin: "10px 0" }}>
              <summary style={{ cursor: "pointer", fontWeight: 600 }}>Les mots de la lettre {l}</summary>
              {sonsAffiches(l, r).flatMap((s) => s.regles.map((g) => {
                const hors = motsHorsDeLaRegle(g, r);
                return (
                  <Field key={g.id} label={`${s.son === "muet" ? "Muet" : s.son} ${g.quand}`}>
                    <Input value={r.mots[g.id] ?? g.mots} onChange={(e) => changerLesMots(g.id, e.target.value)} spellCheck={false} />
                    {hors.length > 0 && <p style={avertissement}>⚠️ La règle ne se voit pas dans : {hors.join(", ")}.</p>}
                  </Field>
                );
              }))}
              {changees && <button type="button" className="btn ghost sm" onClick={() => remettre(l)}>Remettre les mots de la lettre {l}</button>}
            </details>
          );
        })}
        <Boutons atelier={ATELIER} titre={titreValeurLettres(r)} html={html} style={STYLE_VALEUR_LETTRES} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_VALEUR_LETTRES} />}
    />
  );
}
