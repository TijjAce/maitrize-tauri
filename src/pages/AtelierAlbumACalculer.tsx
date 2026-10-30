import React from "react";
import { Aide, AideEnLigne } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import { EXERCICES_ALBUM, REGLAGES_ALBUM, htmlAlbum, reglagesAlbumSurs, styleAlbum, titreAlbum, type ExerciceAlbum, type ReglagesAlbum } from "../albumACalculer";

// ── Fabriquer › l'album à calculer ────────────────────────────────────────
//
// La page vierge, les pages faites d'avance, les oiseaux à découper, et
// l'image des oiseaux sur les fils.

export function AlbumACalculerTab() {
  const [brut, maj] = useReglages<ReglagesAlbum>("albumCalcul", REGLAGES_ALBUM);
  const r = React.useMemo(() => reglagesAlbumSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlAlbum(r, graine), [r, graine]);
  const style = React.useMemo(() => styleAlbum(r), [r]);
  const titre = r.titre?.trim() || titreAlbum(r);
  const faite = r.exercice === "faite";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          L'album à calculer
          <Aide titre="L'album à calculer" vers="droite"><p>D'après la séquence des décompositions additives du manuel « Réussir mon CRPE » (Nathan, sujet n° 6) : chaque
            page est un carré, avec quatre cases aux coins — le chiffre, le dé, les doigts, et la décomposition — et trois fils où l'on colle des oiseaux. Le
            dernier quart se replie sur le quart d'avant, comme une porte : les oiseaux collés entre les deux traits se cachent. Découpez le carré, pliez la
            porte sur les pointillés.</p></Aide>
        </h3>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceAlbum })}>
            {EXERCICES_ALBUM.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {faite && (
          <>
            <Field label="Le nombre">
              <Select value={r.nombre} onChange={(e) => maj({ nombre: Number(e.target.value), vus: 0 })}>
                {[2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Coche on={!!r.toutes} onChange={(toutes) => maj({ toutes })}
              libelle="Toutes les façons de le partager — une page pour chacune : pour 3, deux et un, puis un et deux, les deux pages que l'on montre avant de commencer." />
            {!r.toutes && (
              <Field label="Les oiseaux qu'on voit, porte fermée">
                <Select value={r.vus} onChange={(e) => maj({ vus: Number(e.target.value) })}>
                  <option value={0}>au hasard</option>
                  {Array.from({ length: r.nombre - 1 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} — et {r.nombre - n} cachés</option>)}
                </Select>
              </Field>
            )}
          </>
        )}
        {r.exercice === "fils" && (
          <Field label="Les oiseaux">
            <Select value={r.surLesFils} onChange={(e) => maj({ surLesFils: Number(e.target.value) })}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Le titre">
          <Input value={r.titre ?? ""} placeholder={titreAlbum(r)} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Boutons atelier="albumCalcul" titre={titre} html={html} style={style} peut
          onTirage={r.exercice === "faite" || r.exercice === "fils" ? () => setGraine(graineAuHasard()) : undefined} />
        <AideEnLigne libelle="📚 La séquence de l'album"><p>La séquence de grande section du manuel du CRPE — « Décomposer les nombres de 2 à 9 : l'album à calculer
          (GS) » — dit, séance par séance, quelles pages faire ici.</p></AideEnLigne>
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
