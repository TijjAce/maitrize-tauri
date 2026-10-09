import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import { EXERCICES_ORAL, GENRES, REGLAGES_ORAL, STYLE_ORAL, htmlOral, type ExerciceOral, type Genre } from "../oral";
import { EXERCICES_GRAMMAIRE, REGLAGES_GRAMMAIRE, STYLE_GRAMMAIRE, htmlGrammaire, type ExerciceGrammaire } from "../grammaire";
import { TEMPS, type Temps } from "../conjugaison";
import { EXERCICES_ECRIRE, REGLAGES_ECRIRE, STYLE_ECRIRE, htmlEcrire, type ExerciceEcrire } from "../ecrire";
import { EXERCICES_ORTHOGRAPHE, REGLAGES_ORTHOGRAPHE, STYLE_ORTHOGRAPHE, htmlOrthographe, type Classe, type ExerciceOrthographe, type ReglagesOrthographe } from "../orthographe";

// ── Fabriquer › Lecture et écriture : orthographe et dictées ──────────────

/** « Les cartes « Je prends la parole » » → « les cartes « Je prends la parole » » : seule l'initiale change, les sigles restent. */
const minusculeInitiale = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

export function OrthographeTab() {
  const [r, maj] = useReglages("orthographe", REGLAGES_ORTHOGRAPHE);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlOrthographe(r, graine), [r, graine]);
  const libelle = EXERCICES_ORTHOGRAPHE.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Orthographe — ${minusculeInitiale(libelle)}`;
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

// ── Fabriquer › Lecture et écriture : écrire ──────────────────────────────

export function EcrireTab() {
  const [r, maj] = useReglages("ecrire", REGLAGES_ECRIRE);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlEcrire(r, graine), [r, graine]);
  const libelle = EXERCICES_ECRIRE.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Écrire — ${minusculeInitiale(libelle)}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Écrire</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les écrits du programme et du guide CE1 : la phrase avec des mots imposés, les gammes sur une phrase modèle, déplacer-ajouter-remplacer-supprimer, de l'oral à l'écrit, le jogging d'écriture et ses lanceurs, transformer un texte, ajouter un épisode, les connecteurs ; et pour écrire un texte : le brouillon, la grille de relecture, la lettre à un destinataire.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Feuille">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceEcrire })}>
              {EXERCICES_ECRIRE.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
            </Select>
          </Field>
        </div>
        <Boutons onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("ecrire", titre, html, STYLE_ECRIRE)} onBureau={() => bureau("ecrire", titre, html, STYLE_ECRIRE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_ECRIRE} />}
    />
  );
}

// ── Fabriquer › Lecture et écriture : grammaire et conjugaison ────────────

export function GrammaireTab() {
  const [r, maj] = useReglages("grammaire", REGLAGES_GRAMMAIRE);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlGrammaire(r, graine), [r, graine]);
  const libelle = EXERCICES_GRAMMAIRE.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Grammaire — ${minusculeInitiale(libelle)}`;
  const familles = [...new Set(EXERCICES_GRAMMAIRE.map((e) => e.famille))];
  const avecTemps = (r.exercice === "conjuguer" || r.exercice === "transformerTemps") && r.classe !== "CP";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Grammaire et conjugaison</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          La phrase et ses marqueurs, les types et les formes, les classes de mots, groupe sujet, verbe et compléments, les paroles rapportées ; la chaîne d'accords et l'accord du verbe ; les tableaux de conjugaison, changer le temps d'une phrase, l'infinitif — avec les exemples du programme et le corrigé.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Exercice">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceGrammaire })}>
              {familles.map((f) => (
                <optgroup key={f} label={f}>
                  {EXERCICES_GRAMMAIRE.filter((e) => e.famille === f).map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
                </optgroup>
              ))}
            </Select>
          </Field>
        </div>
        {avecTemps && (
          <Field label="Le temps">
            <Select value={r.temps} onChange={(e) => maj({ temps: e.target.value as Temps })}>
              {TEMPS.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
            </Select>
          </Field>
        )}
        {r.exercice === "conjuguer" && r.classe !== "CP" && (
          <Field label="Les verbes (séparés par des virgules)">
            <Input value={r.verbes} placeholder="Vide : des verbes de la classe. Exemple : chanter, être, faire" onChange={(e) => maj({ verbes: e.target.value })} />
          </Field>
        )}
        <Boutons onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("grammaire", titre, html, STYLE_GRAMMAIRE)} onBureau={() => bureau("grammaire", titre, html, STYLE_GRAMMAIRE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_GRAMMAIRE} />}
    />
  );
}

// ── Fabriquer › Lecture et écriture : l'oral ──────────────────────────────

export function OralTab() {
  const [r, maj] = useReglages("oral", REGLAGES_ORAL);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlOral(r, graine), [r, graine]);
  const libelle = EXERCICES_ORAL.find((e) => e.id === r.exercice)?.libelle ?? "";
  const titre = `Oral — ${minusculeInitiale(libelle)}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>L'oral</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les grilles d'écoute pour raconter, présenter un exposé, dire un poème, débattre ; la carte du récit et les mots imposés ; le poème à apprendre ; le plan d'exposé ; les cartes « Je prends la parole » avec les expressions du programme, les rôles du débat ; les registres de langue et les jeux de rôles.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 }}>
          <Field label="Classe">
            <Select value={r.classe} onChange={(e) => maj({ classe: e.target.value as Classe })}>
              <option value="CP">CP</option><option value="CE1">CE1</option><option value="CE2">CE2</option>
            </Select>
          </Field>
          <Field label="Feuille">
            <Select value={r.exercice} onChange={(e) => maj({ exercice: e.target.value as ExerciceOral })}>
              {EXERCICES_ORAL.map((e) => <option key={e.id} value={e.id}>{e.libelle}</option>)}
            </Select>
          </Field>
        </div>
        {r.exercice === "grille" && (
          <Field label="Ce qu'on travaille">
            <Select value={r.genre} onChange={(e) => maj({ genre: e.target.value as Genre })}>
              {GENRES.map((g) => <option key={g.id} value={g.id}>{g.nom}</option>)}
            </Select>
          </Field>
        )}
        <Boutons onTirage={["raconter", "registres", "situations"].includes(r.exercice) ? () => setGraine(graineAuHasard()) : undefined}
          onImprimer={() => imprimer("oral", titre, html, STYLE_ORAL)} onBureau={() => bureau("oral", titre, html, STYLE_ORAL)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_ORAL} />}
    />
  );
}
