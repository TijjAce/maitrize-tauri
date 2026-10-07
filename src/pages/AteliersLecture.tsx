import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_VOIX_HAUTE, REGLAGES_VOIX_HAUTE, STYLE_VOIX_HAUTE, htmlVoixHaute, type Classe, type ExerciceVoixHaute } from "../lectureVoixHaute";

// ── Fabriquer › Sons et lecture : lire à voix haute ───────────────────────

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function VoixHauteTab() {
  const [r, maj] = useReglages("voixHaute", REGLAGES_VOIX_HAUTE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlVoixHaute(r, graine), [r, graine]);
  const titre = `Lire à voix haute — ${(EXERCICES_VOIX_HAUTE.find((e) => e.id === r.exercice)?.libelle ?? "").replace(/ \(CE2\)$/, "").toLowerCase()}`;
  const avecPhrases = r.exercice !== "grille" && r.exercice !== "fable";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Lire à voix haute</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Des phrases à préparer, codées ou à coder — les liaisons, la ponctuation et l'intonation, la phrase sur plusieurs lignes, les groupes de souffle —, la grille du binôme lecteur-auditeur, et le texte partition de la fable du CE2 : d'après les livrets de français CP, CE1 et CE2.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          {avecPhrases && (
            <Field label="Phrases">
              <Input type="number" min={1} max={12} value={r.combien} onChange={(e) => maj({ combien: borne(e.target.value, 1, 12, 6) })} style={{ width: 80 }} />
            </Field>
          )}
        </div>
        <Field label="Exercice">
          <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceVoixHaute })}>
            {EXERCICES_VOIX_HAUTE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
          </Select>
        </Field>
        {avecPhrases && <>
          {r.exercice !== "lignes" && <Coche on={r.codees} libelle="Déjà codées : à lire ; sinon, l'élève les code (corrigé à la suite)" onChange={(v) => maj({ codees: v })} />}
          <Field label="Vos phrases (une par ligne ; « | » entre les groupes de souffle)">
            <Textarea rows={5} value={r.phrases} placeholder="Vide : les phrases de la classe. Exemple : Le petit éléphant | a un gros appétit." onChange={(e) => maj({ phrases: e.target.value })} />
          </Field>
        </>}
        <Boutons onTirage={avecPhrases && !r.phrases.trim() ? () => setGraine(graineAuHasard()) : undefined} onImprimer={() => imprimer("voixHaute", titre, html, STYLE_VOIX_HAUTE)} onBureau={() => bureau("voixHaute", titre, html, STYLE_VOIX_HAUTE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_VOIX_HAUTE} />}
    />
  );
}
