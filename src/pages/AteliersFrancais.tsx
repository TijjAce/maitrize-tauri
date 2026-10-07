import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_ORTHOGRAPHE, REGLAGES_ORTHOGRAPHE, STYLE_ORTHOGRAPHE, htmlOrthographe, type Classe, type ExerciceOrthographe, type ReglagesOrthographe } from "../orthographe";

// ── Fabriquer › Lecture et écriture : orthographe et dictées ──────────────

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function OrthographeTab() {
  const [r, maj] = useReglages("orthographe", REGLAGES_ORTHOGRAPHE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlOrthographe(r, graine), [r, graine]);
  const libelle = EXERCICES_ORTHOGRAPHE.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Orthographe — ${libelle.toLowerCase()}`;
  const avecMots = r.exercice === "dicteeDeMots" || r.exercice === "memoriser";
  const familles = [...new Set(EXERCICES_ORTHOGRAPHE.map((e) => e.famille))];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Orthographe et dictées</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les dictées des guides CP et CE1 — préparée, de mots, phrase du jour, à choix multiples, autodictée, à trous, piégée — et de quoi mémoriser l'orthographe des mots : les cartes et l'escalier, les listes analogiques, la lettre muette, s, c, g, m devant m, b, p, les accents. Le corrigé, ou le texte à dicter, à la suite.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Exercice">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceOrthographe })}>
              {familles.map((f) => (
                <optgroup key={f} label={f}>
                  {EXERCICES_ORTHOGRAPHE.filter((e) => e.famille === f).map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
        {r.exercice === "dicteeDeMots" && <>
          <Field label="Nombre de mots (de 4 à 10)">
            <Input type="number" min={4} max={10} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 4, 10, 8) })} style={{ width: 80 }} />
          </Field>
          <Coche on={r.aide} libelle="Pour les plus fragiles : des mots à trous, une liste écourtée" onChange={(v) => maj({ aide: v })} />
        </>}
        {r.exercice === "valeurLettres" && (
          <Field label="La lettre">
            <Select value={r.lettre} onChange={(e) => maj({ lettre: e.target.value as ReglagesOrthographe["lettre"] })}>
              <option value="g">g : gâteau, girafe</option><option value="c">c : carotte, cinéma</option><option value="s">s : serpent, poison</option>
            </Select>
          </Field>
        )}
        {avecMots && (
          <Field label="Vos mots (un par ligne)">
            <Textarea rows={5} value={r.mots} placeholder="Vide : les mots fréquents de la classe." onChange={(e) => maj({ mots: e.target.value })} />
          </Field>
        )}
        <Boutons onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("orthographe", titre, html, STYLE_ORTHOGRAPHE)} onBureau={() => bureau("orthographe", titre, html, STYLE_ORTHOGRAPHE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_ORTHOGRAPHE} />}
    />
  );
}
