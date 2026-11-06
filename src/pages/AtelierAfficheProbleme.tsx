// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  CATEGORIES, FAMILLES_DE_PROBLEMES, REGLAGES_AFFICHE_PROBLEME, categorie, erreurDesNombres, htmlAfficheProbleme, nombresAbsents,
  problemeDeLAffiche, reglagesAfficheProblemeSurs, styleAfficheProbleme, textesDeLAffiche, titreAfficheProbleme,
  type CategorieProbleme, type ReglagesAfficheProbleme,
} from "../afficheProbleme";
import { nombre } from "../problemesBarres";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Coche } from "./AteliersMaths";

// ── Fabriquer › Maths › L'affiche du problème de référence ────────────────
//
// Le problème résolu ensemble, ses étapes sur une page pour le mur — le
// problème, je comprends, je représente, je calcule, je réponds (voir
// afficheProbleme.ts) —, avec les nombres et les mots de la classe.

const ATELIER = "afficheProbleme";

/** Un nombre qu'on peut effacer pour en taper un autre : il ne s'enregistre qu'entier et positif. */
function ChampNombre({ valeur, onChange, label }: { valeur: number; onChange: (n: number) => void; label: string }) {
  const [saisie, setSaisie] = React.useState(String(valeur));
  React.useEffect(() => { setSaisie(String(valeur)); }, [valeur]);
  return (
    <Input type="number" min={1} max={99999} value={saisie} aria-label={label} style={{ width: 100 }}
      onChange={(e) => {
        setSaisie(e.target.value);
        const n = Number(e.target.value);
        if (Number.isInteger(n) && n >= 1 && n <= 99999) onChange(n);
      }}
      onBlur={() => setSaisie(String(valeur))} />
  );
}

const avertissement: React.CSSProperties = { fontSize: 12.5, color: "var(--orange)", margin: "6px 0 0" };

export function AfficheProblemeTab() {
  const [brut, maj] = useReglages<ReglagesAfficheProbleme>(ATELIER, REGLAGES_AFFICHE_PROBLEME);
  const r = React.useMemo(() => reglagesAfficheProblemeSurs(brut), [brut]);
  const c = categorie(r.categorie);
  const p = React.useMemo(() => problemeDeLAffiche(r), [r]);
  const erreur = erreurDesNombres(r);
  const textes = p ? textesDeLAffiche(r, p) : null;
  const absents = r.enonce.trim() ? nombresAbsents(r.enonce, r) : [];
  const html = React.useMemo(() => htmlAfficheProbleme(r), [r]);
  const style = React.useMemo(() => styleAfficheProbleme(r), [r]);
  const changerDeSorte = (id: CategorieProbleme) =>
    maj({ categorie: id, nombres: [...categorie(id).defaut], graine: 0, enonce: "", comprendre: "", phrase: "" });
  const motsDuSchema = r.categorie === "plus" || r.categorie === "moins" ? "Le mot ÉCART sur le schéma"
    : r.categorie.startsWith("fois") ? "" : "Les mots TOUT et PARTIE sur le schéma";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          L'affiche du problème de référence
          <Aide titre="L'affiche du problème de référence" vers="droite"><p>Le guide « Pour enseigner les nombres, le calcul et la résolution
            de problèmes au CP » : les affiches de la classe sont celles des problèmes de référence qu'on a rencontrés ; elles vont de l'énoncé à
            l'écriture mathématique en passant par le schéma, et l'on s'y reporte quand on reconnaît « c'est comme le problème de… » (p. 101).
            Devant une comparaison, on répond d'abord à la question « qui en a le plus ? » (p. 98).</p>
            <p>Le guide de la résolution de problèmes au cours moyen en donne un modèle (p. 102) : l'énoncé, ce que l'on compare, le schéma, le
            calcul, la phrase réponse. Ces problèmes types restent peu nombreux, et la trace affichée se construit avec la classe : les textes
            se réécrivent avec les mots des élèves.</p></Aide>
        </h3>
        <Field label="Le problème">
          <Select value={r.categorie} onChange={(e) => changerDeSorte(e.target.value as CategorieProbleme)}>
            {FAMILLES_DE_PROBLEMES.map((f) => (
              <optgroup key={f} label={f}>
                {CATEGORIES.filter((x) => x.famille === f).map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {c.donnees.map((libelle, i) => (
            <Field key={`${r.categorie}-${i}`} label={libelle}>
              <ChampNombre label={libelle} valeur={r.nombres[i]}
                onChange={(n) => maj({ nombres: (i === 0 ? [n, r.nombres[1]] : [r.nombres[0], n]) as [number, number] })} />
            </Field>
          ))}
        </div>
        {erreur && <p style={avertissement}>⚠️ {erreur}</p>}
        {c.personnages > 0 && (
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {r.prenoms.slice(0, c.personnages).map((prenom, i) => (
              <Field key={i} label={i === 0 ? "Le personnage" : "L'autre personnage"}>
                <Input value={prenom} maxLength={30} style={{ width: 150 }}
                  onChange={(e) => maj({ prenoms: (i === 0 ? [e.target.value, r.prenoms[1]] : [r.prenoms[0], e.target.value]) as [string, string] })} />
              </Field>
            ))}
          </div>
        )}
        <Field label="Son nom dans la classe">
          <Input value={r.nom} maxLength={80} placeholder="Le problème des billes de Léo" onChange={(e) => maj({ nom: e.target.value })} />
        </Field>
        {textes && <>
          <Field label="Le problème">
            <textarea className="textarea" rows={4} value={textes.enonce} onChange={(e) => maj({ enonce: e.target.value })} />
          </Field>
          {absents.length > 0 && <p style={avertissement}>⚠️ L'énoncé ne dit pas {absents.map(nombre).join(" ni ")}.</p>}
          {r.etapeComprendre && (
            <Field label="Je comprends">
              <textarea className="textarea" rows={2} value={textes.comprendre} onChange={(e) => maj({ comprendre: e.target.value })} />
            </Field>
          )}
          <Field label="Je réponds">
            <textarea className="textarea" rows={2} value={textes.phrase} onChange={(e) => maj({ phrase: e.target.value })} />
          </Field>
          {(r.enonce || r.comprendre || r.phrase) && (
            <button type="button" className="btn ghost sm" onClick={() => maj({ enonce: "", comprendre: "", phrase: "" })}>Reprendre les textes de Maitrize</button>
          )}
        </>}
        <Coche on={r.etapeComprendre} libelle="L'étape « Je comprends »" onChange={(etapeComprendre) => maj({ etapeComprendre })} />
        {motsDuSchema && <Coche on={r.mots} libelle={motsDuSchema} onChange={(mots) => maj({ mots })} />}
        <Field label="La page">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesAfficheProbleme["format"] })}>
            <option value="portrait">A4 en hauteur</option>
            <option value="paysage">A4 en largeur</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreAfficheProbleme(r)} html={html} style={style} peut={!!p}
          onTirage={() => maj({ graine: r.graine + 1, enonce: "", comprendre: "", phrase: "" })} />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
