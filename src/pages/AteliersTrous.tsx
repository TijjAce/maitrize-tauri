import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { confirmer } from "../components/confirmer";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Colonnes } from "./AteliersLangage";
import {
  MODELES_TROUS, REGLAGES_TROUS, STYLE_TROUS, etiquettesEnPlus, htmlTexteATrous, phrasesATrous, phrasesSansTrou, queDesFormesEtreAvoir,
  reglagesTrousSurs, trousDe, type ReglagesTrous,
} from "../texteATrous";

// ── Fabriquer › Texte à trous ─────────────────────────────────────────────
//
// Les phrases de l'enseignant, le mot retiré entre astérisques ; ou celles
// d'un modèle, pour être et avoir au présent. La feuille porte les cases, les
// étiquettes à découper de la même taille, et le corrigé à la suite.

const ATELIER = "trous";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

export function TrousTab() {
  const [brut, maj] = useReglages<ReglagesTrous>(ATELIER, REGLAGES_TROUS);
  const r = React.useMemo(() => reglagesTrousSurs(brut), [brut]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const phrases = React.useMemo(() => phrasesATrous(r.phrases), [r.phrases]);
  const html = React.useMemo(() => htmlTexteATrous(r, graine), [r, graine]);
  const trous = phrases.flatMap(trousDe).length;
  const enPlus = etiquettesEnPlus(phrases, r, graine).length;
  const sansTrou = phrasesSansTrou(phrases);
  const etreAvoir = queDesFormesEtreAvoir(phrases);

  /** Un modèle remplace les phrases : on demande avant d'effacer celles qu'on a écrites soi-même. */
  const prendreModele = async (id: string) => {
    const m = MODELES_TROUS.find((x) => x.id === id);
    if (!m) { maj({ modele: "" }); return; }
    const aMoi = r.phrases.trim() && !MODELES_TROUS.some((x) => x.phrases === r.phrases);
    if (aMoi && !(await confirmer(`Remplacer vos phrases par celles du modèle « ${m.nom} » ?`, { oui: "Remplacer" }))) return;
    maj({ modele: m.id, titre: m.titre, phrases: m.phrases, texteMethode: m.methode });
  };

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Texte à trous</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Des phrases dont on a retiré le verbe conjugué — ou le mot que vous voulez. Les étiquettes, de la taille exacte des cases,
          se découpent, s'essaient, se vérifient puis se collent. Le corrigé suit.
        </p>
        <Field label="Partir d'un modèle">
          <Select value={MODELES_TROUS.some((m) => m.id === r.modele) ? r.modele : ""} onChange={(e) => { void prendreModele(e.target.value); }}>
            <option value="">Mes phrases</option>
            {MODELES_TROUS.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
          </Select>
        </Field>
        <Field label="Le titre de la feuille">
          <Input value={r.titre} placeholder="Texte à trous" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label="Les phrases, une par ligne — le mot à retirer entre astérisques">
          <Textarea rows={10} value={r.phrases} onChange={(e) => maj({ phrases: e.target.value, modele: "" })}
            placeholder={"Nous *sommes* en classe.\nTu *as* un vélo bleu."} />
        </Field>
        <p className="meta" style={{ fontSize: 12, lineHeight: 1.45, marginTop: -4 }}>
          Plusieurs trous dans une phrase : « Je *suis* à l'école et j'*ai* faim. » Un indice après une barre : « *sommes|être* ».
          {sansTrou.length > 0 && (
            <span style={{ color: "var(--orange)" }}> Rien à retirer dans la phrase {sansTrou.join(", ")} : mettez le mot entre astérisques.</span>
          )}
        </p>
        <details className="pli" open>
          <summary>Pour différencier</summary>
          <Coche on={r.indices} libelle={etreAvoir ? "L'infinitif en gris dans la case : être ou avoir" : "L'indice en gris dans la case (après la barre)"}
            onChange={(indices) => maj({ indices })} />
          {etreAvoir && (
            <Field label="Des étiquettes en plus, qui ne vont nulle part">
              <Select value={r.intrus} onChange={(e) => maj({ intrus: Number(e.target.value) })}>
                <option value={0}>Aucune : une étiquette par case</option>
                {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n} forme{n > 1 ? "s" : ""} d'être ou d'avoir en plus</option>)}
              </Select>
            </Field>
          )}
          <Field label="D'autres étiquettes en plus (séparées par des virgules)">
            <Input value={r.autres} placeholder={etreAvoir ? "et, à…" : "des mots qui ne vont nulle part"} onChange={(e) => maj({ autres: e.target.value })} />
          </Field>
          <Coche on={r.methode} libelle="Le rappel pour vérifier, en haut de la feuille" onChange={(methode) => maj({ methode })} />
          {r.methode && (
            <Textarea rows={3} value={r.texteMethode} onChange={(e) => maj({ texteMethode: e.target.value })} aria-label="Le rappel pour vérifier" />
          )}
          <Coche on={r.lignes} libelle="Une ligne sous chaque phrase, pour la recopier" onChange={(lignes) => maj({ lignes })} />
          <Coche on={r.taille === "grande"} libelle="En grand : texte, cases et étiquettes" onChange={(g) => maj({ taille: g ? "grande" : "normale" })} />
          <Coche on={r.capitales} libelle="Tout en capitales" onChange={(capitales) => maj({ capitales })} />
        </details>
        <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
          {phrases.length} phrase{phrases.length > 1 ? "s" : ""}, {trous} case{trous > 1 ? "s" : ""}
          {enPlus > 0 ? `, ${enPlus} étiquette${enPlus > 1 ? "s" : ""} en plus` : ""}.
        </div>
        <Boutons atelier={ATELIER} titre={r.titre.trim() || "Texte à trous"} html={html} style={STYLE_TROUS} peut={trous > 0}
          onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_TROUS} />}
    />
  );
}
