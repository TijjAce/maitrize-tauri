import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_VOIX_HAUTE, REGLAGES_VOIX_HAUTE, STYLE_VOIX_HAUTE, htmlVoixHaute, type Classe, type ExerciceVoixHaute } from "../lectureVoixHaute";
import { EXERCICES_COMPREHENSION, REGLAGES_COMPREHENSION, STYLE_COMPREHENSION, htmlComprehension, type ExerciceComprehension, type ReglagesComprehension } from "../comprehension";
import { TEXTES } from "../textesDeComprehension";
import { EXERCICES_LECTEUR, REGLAGES_LECTEUR, STYLE_LECTEUR, htmlLecteur, type ExerciceLecteur } from "../carnetDeLecteur";

// ── Fabriquer › Sons et lecture : lire à voix haute ───────────────────────

/** « Les cartes « Je prends la parole » » → « les cartes « Je prends la parole » » : seule l'initiale change, les sigles restent. */
const minusculeInitiale = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function VoixHauteTab() {
  const [r, maj] = useReglages("voixHaute", REGLAGES_VOIX_HAUTE);
  const [graine, setGraine] = useGraine();
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

// ── Fabriquer › Lecture et écriture : comprendre un texte ─────────────────

const TYPES_LIBELLES: Record<string, string> = { narratif: "récit", informatif: "documentaire", prescriptif: "règle ou recette", "poétique": "poème", "théâtral": "théâtre" };

export function ComprehensionTab() {
  const [r, maj] = useReglages("comprehension", REGLAGES_COMPREHENSION);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlComprehension(r, graine), [r, graine]);
  const libelle = EXERCICES_COMPREHENSION.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Comprendre un texte — ${minusculeInitiale(libelle)}`;
  // Les textes de la classe d'abord ; puis ceux des autres classes, pour qui en a besoin.
  const textes = [...TEXTES.filter((t) => t.classe === r.classe), ...TEXTES.filter((t) => t.classe !== r.classe)];
  const avecTexte = r.exercice !== "typesDeTextes";
  const avecFiltre = r.exercice === "questions" || r.exercice === "ecoute";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Comprendre un texte</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Des textes à la longueur du programme — une dizaine de lignes au CP, une quinzaine au CE1, une vingtaine au CE2 —, récits, documentaires, règles et recettes, poème et théâtre au CE2. Le texte s'imprime seul, ses lignes numérotées : on le pose à côté des questions et on y revient pour justifier.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe, texte: "" })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Exercice">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceComprehension })}>
              {EXERCICES_COMPREHENSION.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
            </Select>
          </Field>
        </div>
        {avecTexte && (
          <Field label="Le texte">
            <Select value={r.texte} onChange={(e) => maj({ texte: e.target.value })}>
              <option value="">Au hasard, parmi ceux de la classe</option>
              {textes.map((t) => <option key={t.id} value={t.id}>{t.titre} — {TYPES_LIBELLES[t.type]}{t.classe !== r.classe ? ` (${t.classe})` : ""}</option>)}
            </Select>
          </Field>
        )}
        {avecFiltre && (
          <Field label="Les questions">
            <Select value={r.questions} onChange={(e) => maj({ questions: e.target.value as ReglagesComprehension["questions"] })}>
              <option value="toutes">Toutes</option>
              <option value="littérale">C'est écrit : la réponse est dans le texte</option>
              <option value="inférence">Je réfléchis : la réponse se déduit</option>
              <option value="reprise">Qui est-ce ? Les reprises</option>
            </Select>
          </Field>
        )}
        <Boutons onTirage={!r.texte || r.exercice === "typesDeTextes" || r.exercice === "motInconnu" ? () => setGraine(graineAuHasard()) : undefined}
          onImprimer={() => imprimer("comprehension", titre, html, STYLE_COMPREHENSION)} onBureau={() => bureau("comprehension", titre, html, STYLE_COMPREHENSION)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_COMPREHENSION} />}
    />
  );
}

// ── Fabriquer › Lecture et écriture : le carnet de lecteur ────────────────

export function LecteurTab() {
  const [r, maj] = useReglages("lecteur", REGLAGES_LECTEUR);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlLecteur(r, graine), [r, graine]);
  const libelle = EXERCICES_LECTEUR.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Carnet de lecteur — ${minusculeInitiale(libelle)}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Carnet de lecteur</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Garder la mémoire de ses lectures, caractériser les personnages et reconnaître les personnages-types, mettre des livres en réseau, présenter un livre, choisir ses lectures : le programme « Devenir lecteur » du CP au CE2.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Feuille">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceLecteur })}>
              {EXERCICES_LECTEUR.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
            </Select>
          </Field>
        </div>
        {(r.exercice === "fiche" || r.exercice === "personnage") && (
          <Field label="Le livre (titre — auteur)">
            <Input value={r.livre} placeholder="Vide : à remplir par l'élève. Exemple : Le Petit Poucet — Charles Perrault" onChange={(e) => maj({ livre: e.target.value })} />
          </Field>
        )}
        {r.exercice === "reseau" && <>
          <Field label="Le thème du réseau">
            <Input value={r.theme} placeholder="Exemple : Le loup dans les contes" onChange={(e) => maj({ theme: e.target.value })} />
          </Field>
          <Field label="Les livres du réseau (un par ligne)">
            <Textarea rows={4} value={r.livres} placeholder="Vide : le réseau du loup, en exemple." onChange={(e) => maj({ livres: e.target.value })} />
          </Field>
        </>}
        <Boutons onTirage={r.exercice === "personnagesTypes" || r.exercice === "genres" ? () => setGraine(graineAuHasard()) : undefined}
          onImprimer={() => imprimer("lecteur", titre, html, STYLE_LECTEUR)} onBureau={() => bureau("lecteur", titre, html, STYLE_LECTEUR)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_LECTEUR} />}
    />
  );
}
