import React from "react";
import { api } from "../api";
import { Field, Input, Select, Textarea, useAsync } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { motDuMot, usePictosDesMots } from "../components/Tapuscrit";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { Boutons, Coche, Colonnes, bureau, imprimer } from "./AteliersMaths";
import {
  FEUILLES_PLAN, MOTS_MAX, PHRASE_PAR_DEFAUT, REGLAGES_PLAN_CLASSE, STYLE_PLAN_CLASSE, consignesAuto, htmlPlanClasse, lireProfils, mobilierDe,
  motsDeLaPhrase, reglagesPlanSurs,
} from "../planDeLaClasse";
import { FIGURES_PAR_DEFAUT, MODELES_FRISE, MOIS, REGLAGES_FRISE, STYLE_FRISE, htmlFrise, reglagesFriseSurs, type ModeleFrise } from "../frisesTemps";
import { FAMILLES_PAYSAGE, REGLAGES_PAYSAGE, STYLE_PAYSAGE, htmlPaysage, reglagesPaysageSurs, type FamillePaysage } from "../lireUnPaysage";

// ── Fabriquer › Histoire-géographie : le plan de la classe ────────────────
//
// Les feuilles de la séquence Éduscol « La classe, un espace organisé qui se
// représente » (voir planDeLaClasse.ts). Le mobilier vient du plan de salle ;
// la feuille en garde une copie, qu'on reprend d'un clic quand la salle a
// changé.

export function PlanClasseTab() {
  const [brut, maj] = useReglages("planClasse", REGLAGES_PLAN_CLASSE);
  const r = React.useMemo(() => reglagesPlanSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const { data: profilsBruts } = useAsync(() => api.settingGet("salle:profils"), []);
  const profils = React.useMemo(() => lireProfils(profilsBruts), [profilsBruts]);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const objets = React.useMemo(() => r.objets.map((o) => o.trim()).filter(Boolean), [r.objets]);
  const motsObjets = React.useMemo(() => objets.map(motDuMot), [objets]);
  const { pictoDe, images } = usePictosDesMots(r.feuille === "etiquettes" ? motsObjets : []);
  const imagesParMot = React.useMemo(() => {
    const sortie: Record<string, string> = {};
    for (const m of motsObjets) { const ref = pictoDe(m); if (ref != null && images[String(ref)]) sortie[m.cle] = images[String(ref)]; }
    return sortie;
  }, [motsObjets, pictoDe, images]);
  const html = React.useMemo(() => htmlPlanClasse(r, graine, imagesParMot), [r, graine, imagesParMot]);
  const nomFeuille = FEUILLES_PLAN.find((f) => f.id === r.feuille)!;
  const titre = `Plan de la classe — ${nomFeuille.nom}`;
  const prendre = (id: string) => {
    const p = profils.find((x) => x.id === id);
    maj(p ? { elements: p.elements, agencement: p.nom } : { elements: [], agencement: "" });
  };
  const prenomsDeLaClasse = (eleves ?? []).map((e) => e.nom.trim().split(/\s+/)[0]).filter(Boolean);
  const mots = motsDeLaPhrase(r.phrase);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Le plan de la classe</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les feuilles de la séquence Éduscol « La classe, un espace organisé qui se représente » (CP) : de la maquette au plan, puis lire
          le plan pour se repérer et se déplacer. Le plan est celui de votre classe, d'après le plan de salle.
        </p>
        <Field label="La feuille">
          <Select value={r.feuille} onChange={(e) => maj({ feuille: e.target.value as typeof r.feuille })} title={nomFeuille.quoi}>
            {FEUILLES_PLAN.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </Select>
          <div className="meta" style={{ fontSize: 11.5, marginTop: 4 }}>{nomFeuille.quoi}</div>
        </Field>
        <Field label="La salle">
          <Select value={profils.find((p) => p.nom === r.agencement && r.elements.length)?.id ?? ""} onChange={(e) => prendre(e.target.value)}>
            <option value="">{r.elements.length && r.agencement ? `${r.agencement} (copie gardée)` : "Une classe d'exemple"}</option>
            {profils.map((p) => <option key={p.id} value={p.id}>Plan de salle — {p.nom}</option>)}
          </Select>
          {!profils.length && (
            <div className="meta" style={{ fontSize: 11.5, marginTop: 4 }}>
              Pas encore de plan de salle : la feuille montre une classe d'exemple. Dessinez la vôtre dans Organisation › Plan de salle.
            </div>
          )}
          {r.elements.length > 0 && (
            <div className="meta" style={{ fontSize: 11.5, marginTop: 4 }}>{mobilierDe(r).length} éléments, nommés comme dans le plan de salle.</div>
          )}
        </Field>
        {r.feuille !== "etiquettes" && <>
          <Coche on={r.noms} libelle="Les noms sur le plan" onChange={(v) => maj({ noms: v })} />
          <Coche on={r.couleurs} libelle="Le code couleur et sa légende" onChange={(v) => maj({ couleurs: v })} />
        </>}
        {r.feuille === "tresor" && (
          <Field label={`La phrase mystère (${mots.length} mot${mots.length > 1 ? "s" : ""}, ${MOTS_MAX} au plus : un par cachette)`}>
            <Input value={r.phrase} maxLength={200} placeholder={PHRASE_PAR_DEFAUT} onChange={(e) => maj({ phrase: e.target.value })} />
          </Field>
        )}
        {r.feuille === "evaluation" && (
          <Field label="Les consignes, une par ligne">
            <Textarea rows={9} value={r.consignes || consignesAuto(mobilierDe(r))}
              onChange={(e) => maj({ consignes: e.target.value })} />
            {r.consignes && (
              <button type="button" className="lien" onClick={() => maj({ consignes: "" })}>↺ Reprendre les consignes tirées du plan</button>
            )}
          </Field>
        )}
        {r.feuille === "etiquettes" && <>
          <Field label="Les prénoms">
            <Textarea rows={4} value={r.prenoms.join("\n")} onChange={(e) => maj({ prenoms: e.target.value.split(/\r?\n/).slice(0, 40) })} />
            {prenomsDeLaClasse.length > 0 && (
              <button type="button" className="lien" onClick={() => maj({ prenoms: prenomsDeLaClasse.slice(0, 40) })}>
                ↧ Prendre les prénoms de la classe ({prenomsDeLaClasse.length})
              </button>
            )}
          </Field>
          <Field label="Les objets à poser, un par ligne">
            <Textarea rows={4} value={r.objets.join("\n")} onChange={(e) => maj({ objets: e.target.value.split(/\r?\n/).slice(0, 12) })} />
          </Field>
        </>}
        <Boutons peut onTirage={r.feuille === "tresor" ? () => setGraine(graineAuHasard()) : undefined}
          onImprimer={() => imprimer("planClasse", titre, html, STYLE_PLAN_CLASSE)}
          onBureau={() => bureau("planClasse", titre, html, STYLE_PLAN_CLASSE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PLAN_CLASSE} />}
    />
  );
}

// ── Fabriquer › Histoire-géographie : frises et calendriers ───────────────

export function FriseTab() {
  const [brut, maj] = useReglages("frise", REGLAGES_FRISE);
  const r = React.useMemo(() => reglagesFriseSurs(brut), [brut]);
  const html = React.useMemo(() => htmlFrise(r), [r]);
  const modele = MODELES_FRISE.find((m) => m.id === r.modele)!;
  const titre = `${modele.nom}${r.aCompleter ? " — à compléter" : ""}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Frises et calendriers</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Se repérer dans le temps, comme le programme le fait construire : la journée, la semaine, l'année et ses saisons, le calendrier,
          la vie de l'élève, les générations ; au CE1, le passé proche et lointain, les grandes périodes ; au CE2, la Préhistoire, Rome, le royaume.
        </p>
        <Field label="La frise">
          <Select value={r.modele} onChange={(e) => maj({ modele: e.target.value as ModeleFrise })}>
            {["CP", "CE1", "CE2"].map((c) => (
              <optgroup key={c} label={c}>
                {MODELES_FRISE.filter((m) => m.classe === c).map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </optgroup>
            ))}
          </Select>
          <div className="meta" style={{ fontSize: 11.5, marginTop: 4 }}>{modele.quoi}</div>
        </Field>
        {!["vie", "generations"].includes(r.modele) && (
          <Coche on={r.aCompleter} libelle="À compléter, avec les étiquettes à découper (sinon complétée, pour l'affichage)" onChange={(v) => maj({ aCompleter: v })} />
        )}
        {r.modele === "calendrier" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Le mois">
              <Select value={r.mois} onChange={(e) => maj({ mois: Number(e.target.value) })}>
                {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </Select>
            </Field>
            <Field label="L'année">
              <Input type="number" value={r.annee} min={1900} max={2100} onChange={(e) => maj({ annee: Number(e.target.value) || REGLAGES_FRISE.annee })} />
            </Field>
          </div>
        )}
        {r.modele === "vie" && (
          <Field label="L'année de naissance">
            <Input type="number" value={r.naissance} min={1900} max={2100} onChange={(e) => maj({ naissance: Number(e.target.value) || REGLAGES_FRISE.naissance })} />
          </Field>
        )}
        {r.modele === "tempsLong" && (
          <Field label="L'année d'aujourd'hui (la fin de la frise)">
            <Input type="number" value={r.annee} min={1900} max={2100} onChange={(e) => maj({ annee: Number(e.target.value) || REGLAGES_FRISE.annee })} />
          </Field>
        )}
        {r.modele === "periodes" && (
          <Field label="Les figures, une par ligne : « Période : nom »">
            <Textarea rows={8} value={r.figures} onChange={(e) => maj({ figures: e.target.value })} />
            {r.figures !== FIGURES_PAR_DEFAUT && (
              <button type="button" className="lien" onClick={() => maj({ figures: FIGURES_PAR_DEFAUT })}>↺ Reprendre les figures proposées</button>
            )}
          </Field>
        )}
        <Boutons peut onImprimer={() => imprimer("frise", titre, html, STYLE_FRISE)} onBureau={() => bureau("frise", titre, html, STYLE_FRISE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_FRISE} />}
    />
  );
}

// ── Fabriquer › Histoire-géographie : lire un paysage ─────────────────────

export function PaysageTab() {
  const [brut, maj] = useReglages("paysage", REGLAGES_PAYSAGE);
  const r = React.useMemo(() => reglagesPaysageSurs(brut), [brut]);
  const html = React.useMemo(() => htmlPaysage(r), [r]);
  const titre = `Lire un paysage — ${FAMILLES_PAYSAGE[r.famille].nom}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Lire un paysage</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          La fiche qui accompagne une photographie ou une sortie : ce qu'on voit au premier plan et à l'arrière-plan, ce que la nature a fait
          et ce que les êtres humains ont construit, le nom du paysage, puis le croquis et sa légende.
        </p>
        <Field label="Les paysages">
          <Select value={r.famille} onChange={(e) => maj({ famille: e.target.value as FamillePaysage })}>
            {(Object.keys(FAMILLES_PAYSAGE) as FamillePaysage[]).map((f) => (
              <option key={f} value={f}>{FAMILLES_PAYSAGE[f].nom} ({FAMILLES_PAYSAGE[f].classe})</option>
            ))}
          </Select>
        </Field>
        <Field label="Ce que montre la photographie (facultatif)">
          <Input value={r.titre} maxLength={80} placeholder="Le village de…, le port de…" onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Coche on={r.plans} libelle="Le premier plan, le second plan, l'arrière-plan" onChange={(v) => maj({ plans: v })} />
        <Coche on={r.elements} libelle="Les éléments à cocher : naturels, construits" onChange={(v) => maj({ elements: v })} />
        <Coche on={r.croquis} libelle="La page du croquis et de sa légende" onChange={(v) => maj({ croquis: v })} />
        <Boutons peut onImprimer={() => imprimer("paysage", titre, html, STYLE_PAYSAGE)} onBureau={() => bureau("paysage", titre, html, STYLE_PAYSAGE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PAYSAGE} />}
    />
  );
}
