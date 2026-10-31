import React from "react";
import { Aide, LibelleAvecAide } from "../components/Aide";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { ApercuExemple, useMotsExemple } from "../components/Exemple";
import { AssistantDesMots, FIN_SANS_MOTS, questionDesCases, questionDesLegendes, questionDesPlanches, type QuestionDeReglage } from "../components/AssistantDesMots";
import { MOTS_EXEMPLE } from "../exemplesDesAteliers";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille } from "../components/OptionsFeuille";
import { LigneDuProjet } from "../components/ProjetDuMoment";
import { api } from "../api";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import {
  PAIRES_DISTINCTIVES, REGLAGES_LETTRES, REGLAGES_LOTO_SYLLABES, STYLE_JEUX_SONS, dominos, htmlDominos, htmlIntrus, htmlLettres,
  htmlLotoSyllabes, htmlPaires, lignesIntrus, motsDesPaires, nbSyllabes, pairesQuiSenchainent, planchesLotoSyllabes,
  type ModeIntrus, type MotImage, type PaireDistinctive,
} from "../jeuxSons";
import {
  CONSONNES_SYLLABAIRE, REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE, STYLE_FLUENCE, VOYELLES_SYLLABAIRE, grapheme, grilleFluence, htmlFluence, htmlSyllabaire,
  nomDeLEtape,
} from "../fluence";
import { ETAPES, PERIODES, dejaVu, etapeVoisine, periodeDe, type EtapeCgp, type MotEnAttente } from "../progressionCgp";

// ── Fabriquer › Sons et lecture ───────────────────────────────────────────
//
// Les jeux que les guides de lecture décrivent, avec les mots de la classe.
// Chaque atelier : les réglages et les mots à gauche, la feuille à droite,
// telle qu'elle s'imprimera. Ceux qu'un assistant prépare — les lotos, les
// dominos, l'intrus — ne gardent à gauche que les mots et leurs images :
// l'assistant pose à droite tous les réglages (voir AssistantDesMots).

export const ids = (mots: MotImage[]) => mots.map((m) => m.id).filter((x): x is number => x != null);

/** Imprimer : on attend les images, puis on ouvre le document. */
export async function imprimer(atelier: string, titre: string, html: (images: Record<number, string>) => string, idsImages: number[], style: string) {
  try {
    const images = await chargerImages(idsImages);
    await imprimerAtelier(atelier, titre, html(images), STYLE_FEUILLE + style);
  } catch (e) { toast(String(e), { icone: "⚠️" }); }
}

/** La même feuille, en PDF sur le plan de travail. */
export async function bureau(atelier: string, titre: string, html: (images: Record<number, string>) => string, idsImages: number[], style: string) {
  const images = await chargerImages(idsImages);
  return enregistrerSurLeBureau(atelier, titre, html(images), STYLE_FEUILLE + style);
}

export function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

/** Les boutons d'impression, avec les cases de la feuille ; sous l'assistant, sans elles : il les demande (voir AssistantDesMots). */
export function Boutons({ onTirage, onImprimer, onBureau, peut, sousLAssistant = false }: {
  onTirage?: () => void; onImprimer: () => void; onBureau?: () => Promise<{ id: string; titre: string }>; peut: boolean; sousLAssistant?: boolean;
}) {
  const boutons = (
    <div className="loto-actions" style={sousLAssistant ? undefined : { marginTop: 10 }}>
      {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
      <button type="button" className="btn primary sm" disabled={!peut} onClick={onImprimer}>🖨 Imprimer</button>
      {onBureau && <BoutonBureau disabled={!peut} onEnregistrer={onBureau} />}
    </div>
  );
  return sousLAssistant ? boutons : <><CasesFeuille />{boutons}</>;
}

export const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span><LibelleAvecAide libelle={libelle} /></span></label>
);

export const Vide = ({ quoi }: { quoi: string }) => (
  <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>{quoi}</div>
);

// ── Loto des syllabes ──

export function LotoSyllabesTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = useMotsGardes("lotoSyllabes:mots");
  const [r, maj] = useReglages("lotoSyllabes", REGLAGES_LOTO_SYLLABES);
  const [graine, setGraine] = useGraine();
  // Sans mots, les planches d'un exemple : ce que donnera votre loto.
  const exemple = useMotsExemple(MOTS_EXEMPLE.lotoSyllabes, !mots.length);
  const montres = mots.length ? mots : exemple ?? [];
  const planches = React.useMemo(() => planchesLotoSyllabes(montres, r, hasard(graine)), [montres, r, graine]);
  const images = usePictoImages(ids(montres));
  const html = React.useMemo(() => htmlLotoSyllabes(planches, montres, images, r), [planches, montres, images, r]);
  // Un clic sur le compte le fait tourner : notre découpage n'est pas parole d'évangile.
  const tourner = (m: MotImage) => setMots(mots.map((x) => (x === m ? { ...x, syllabes: (nbSyllabes(x, r.ecrites) % r.maximum) + 1 } : x)));
  // L'assistant : les mots — le projet, un thème, ses images —, puis les planches, les cases, les syllabes, le e final, l'écrit (31 octobre 2026).
  const eFinal = (oui: boolean) => (oui ? "Le e final compte : ta-ble" : "Le e final ne compte pas");
  const reglages: QuestionDeReglage[] = [
    questionDesPlanches(r.planches, (planches) => maj({ planches })),
    questionDesCases(r.cases, (cases) => maj({ cases })),
    {
      question: {
        id: "maximum", puce: "Syllabes", titre: "Jusqu'à combien de syllabes ?",
        choix: [
          { id: "2", libelle: "Jusqu'à 2 syllabes", description: "pour les plus jeunes" },
          { id: "3", libelle: "Jusqu'à 3 syllabes", description: "en maternelle" },
          { id: "4", libelle: "Jusqu'à 4 syllabes", description: "ensuite" },
        ],
      },
      repondre: (c) => { const n = Number(c) || 3; maj({ maximum: n }); return `Jusqu'à ${n} syllabes`; },
      actuelle: () => `Jusqu'à ${r.maximum} syllabes`,
    },
    {
      question: {
        id: "ecrites", puce: "Le e final", titre: "Le « e » muet final compte-t-il pour une syllabe ?",
        choix: [
          { id: "non", libelle: "Non", description: "à l'oral, « table » se dit en une syllabe" },
          { id: "oui", libelle: "Oui : ta-ble", description: "comme on scande à l'école, en disant le e final : deux syllabes" },
        ],
      },
      repondre: (c) => { maj({ ecrites: c === "oui" }); return eFinal(c === "oui"); },
      actuelle: () => eFinal(r.ecrites),
    },
    questionDesLegendes(r.legendes, (legendes) => maj({ legendes })),
  ];
  const fin = !mots.length ? "Écrivez vos mots à gauche, ou choisissez-en : le loto se fait sous vos yeux."
    : planches.length ? `C'est prêt : ${planches.length} planche${planches.length > 1 ? "s" : ""} de ${r.cases} cases, avec ${mots.length} mots.`
      : `⚠️ Aucun de ces mots n'a de ${r.maximum} syllabes ou moins : ajoutez-en de plus courts.`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Loto des syllabes
          <Aide titre="Loto des syllabes" vers="droite"><p>{"Chaque case d'une planche impose un nombre de syllabes ; on pioche une image, on scande, on compte. Le nombre sous chaque mot se corrige d'un clic."}</p></Aide>
        </h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          extra={(m) => <button type="button" className="bm-compte" title="Changer le nombre de syllabes" onClick={() => tourner(m)}>{nbSyllabes(m, r.ecrites)} syll.</button>} />
      </>}
      droite={
        <div className="loto-droite">
          <AssistantDesMots titre="Préparer le loto des syllabes" question="Avec quels mots fait-on le loto ?" mots={mots} onMots={setMots} banque={banque} parTheme={18} reglages={reglages} fin={fin} />
          <Boutons sousLAssistant peut={mots.length > 0 && planches.length > 0} onTirage={() => setGraine(graineAuHasard())}
            onImprimer={() => imprimer("lotoSyllabes", "Loto des syllabes", (im) => htmlLotoSyllabes(planches, mots, im, r), ids(mots), STYLE_JEUX_SONS)}
            onBureau={() => bureau("lotoSyllabes", "Loto des syllabes", (im) => htmlLotoSyllabes(planches, mots, im, r), ids(mots), STYLE_JEUX_SONS)} />
          {planches.length && mots.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} />
            : planches.length ? <ApercuExemple onPrendre={() => setMots(montres)}><ApercuFeuille html={html} style={STYLE_JEUX_SONS} /></ApercuExemple>
            : <Vide quoi="Ajoutez des mots : le loto se fabrique avec les mots de la classe et leurs images." />}
        </div>
      }
    />
  );
}

// ── Dominos des syllabes ──

export function DominosTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = useMotsGardes("dominos:mots");
  const [{ legendes }, majDominos] = useReglages("dominos", { legendes: false });
  const setLegendes = (v: boolean) => majDominos({ legendes: v });
  const [graine, setGraine] = useGraine();
  // Sans mots, les dominos d'un exemple : des mots qui s'enchaînent.
  const exemple = useMotsExemple(MOTS_EXEMPLE.dominos, !mots.length);
  const montres = mots.length ? mots : exemple ?? [];
  const pieces = React.useMemo(() => dominos(pairesQuiSenchainent(montres, hasard(graine))), [montres, graine]);
  const images = usePictoImages(ids(montres));
  const html = React.useMemo(() => htmlDominos(pieces, images, legendes), [pieces, images, legendes]);
  const fin = !mots.length ? FIN_SANS_MOTS
    : pieces.length >= 3 ? `C'est prêt : ${pieces.length} dominos, ${pieces.length * 2} images, qui se referment en boucle.`
      : "⚠️ Ces mots ne s'enchaînent pas encore : il faut des mots dont la dernière syllabe commence un autre mot (micro – crocodile). Piochez un thème entier, ou deux.";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Dominos des syllabes
          <Aide titre="Dominos des syllabes" vers="droite"><p>{"Un domino s'enchaîne quand la dernière syllabe d'une image commence la suivante : micro – crocodile. Il faut beaucoup de mots pour trouver des enchaînements — piochez un thème entier, ou deux."}</p></Aide>
        </h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque} />
      </>}
      droite={
        <div className="loto-droite">
          <AssistantDesMots titre="Préparer les dominos" question="Avec quels mots fait-on les dominos ?" mots={mots} onMots={setMots} banque={banque}
            reglages={[questionDesLegendes(legendes, setLegendes)]} fin={fin} parTheme={30} />
          <Boutons sousLAssistant peut={mots.length > 0 && pieces.length >= 3} onTirage={() => setGraine(graineAuHasard())}
            onImprimer={() => imprimer("dominos", "Dominos des syllabes", (im) => htmlDominos(pieces, im, legendes), ids(mots), STYLE_JEUX_SONS)}
            onBureau={() => bureau("dominos", "Dominos des syllabes", (im) => htmlDominos(pieces, im, legendes), ids(mots), STYLE_JEUX_SONS)} />
          {pieces.length && mots.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} />
            : pieces.length ? <ApercuExemple onPrendre={() => setMots(montres)}><ApercuFeuille html={html} style={STYLE_JEUX_SONS} /></ApercuExemple>
            : <Vide quoi="Les dominos apparaîtront dès que des mots s'enchaînent : la rime de l'un est l'attaque de l'autre." />}
        </div>
      }
    />
  );
}

// ── Chasse à l'intrus ──

export function IntrusTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = useMotsGardes("intrus:mots");
  const [r, maj] = useReglages("intrus", { mode: "attaque" as ModeIntrus, combien: 6, legendes: false });
  const [graine, setGraine] = useGraine();
  // Sans mots, les lignes d'un exemple : des mots qui commencent pareil, et leur intrus.
  const exemple = useMotsExemple(MOTS_EXEMPLE.intrus, !mots.length);
  const montres = mots.length ? mots : exemple ?? [];
  const lignes = React.useMemo(() => lignesIntrus(montres, r.mode, r.combien, hasard(graine)), [montres, r.mode, r.combien, graine]);
  const images = usePictoImages(ids(montres));
  const html = React.useMemo(() => htmlIntrus(lignes, images, r.mode, r.legendes), [lignes, images, r]);
  const ressemblance = (mode: ModeIntrus) => (mode === "rime" ? "Ils finissent pareil" : "Ils commencent pareil");
  const lignesDites = (n: number) => `${n} ligne${n > 1 ? "s" : ""}`;
  const reglages: QuestionDeReglage[] = [
    {
      question: {
        id: "mode", puce: "Ce qui se ressemble", titre: "Les trois mots de chaque ligne…",
        choix: [
          { id: "attaque", libelle: "Commencent pareil", description: "la même première syllabe : bateau, banane, ballon — et l'intrus, tapis" },
          { id: "rime", libelle: "Finissent pareil", description: "la même dernière syllabe : bateau, gâteau, râteau — et l'intrus, lapin" },
        ],
      },
      repondre: (c) => { const mode: ModeIntrus = c === "rime" ? "rime" : "attaque"; maj({ mode }); return ressemblance(mode); },
      actuelle: () => ressemblance(r.mode),
    },
    {
      question: {
        id: "combien", puce: "Lignes", titre: "Combien de lignes ?",
        choix: [4, 6, 8].map((n) => ({ id: String(n), libelle: `${n} lignes` })),
        autre: { placeholder: "Un autre nombre, de 1 à 15", nombre: { min: 1, max: 15 } },
      },
      repondre: (c, texte) => { const n = Math.max(1, Math.min(15, Number(texte ?? c) || 6)); maj({ combien: n }); return lignesDites(n); },
      actuelle: () => lignesDites(r.combien),
    },
    questionDesLegendes(r.legendes, (v) => maj({ legendes: v })),
  ];
  const fin = !mots.length ? FIN_SANS_MOTS
    : lignes.length ? `C'est prêt : ${lignes.length} ligne${lignes.length > 1 ? "s" : ""}, chacune avec son intrus.`
      : "⚠️ Pas encore trois mots qui se ressemblent : piochez un thème entier, ou deux.";
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Chasse à l'intrus
          <Aide titre="Chasse à l'intrus" vers="droite"><p>{"Trois mots qui commencent (ou finissent) par la même syllabe, et un intrus : bateau, banane, tapis, ballon. Il faut des mots qui se ressemblent — un ou deux thèmes entiers."}</p></Aide>
        </h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque} />
      </>}
      droite={
        <div className="loto-droite">
          <AssistantDesMots titre="Préparer la chasse à l'intrus" question="Avec quels mots fait-on la chasse à l'intrus ?" mots={mots} onMots={setMots}
            banque={banque} reglages={reglages} fin={fin} parTheme={30} />
          <Boutons sousLAssistant peut={mots.length > 0 && lignes.length > 0} onTirage={() => setGraine(graineAuHasard())}
            onImprimer={() => imprimer("intrus", "Chasse à l'intrus", (im) => htmlIntrus(lignes, im, r.mode, r.legendes), ids(mots), STYLE_JEUX_SONS)}
            onBureau={() => bureau("intrus", "Chasse à l'intrus", (im) => htmlIntrus(lignes, im, r.mode, r.legendes), ids(mots), STYLE_JEUX_SONS)} />
          {lignes.length && mots.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} />
            : lignes.length ? <ApercuExemple onPrendre={() => setMots(montres)}><ApercuFeuille html={html} style={STYLE_JEUX_SONS} /></ApercuExemple>
            : <Vide quoi="Les lignes apparaîtront dès que trois mots partagent une syllabe." />}
        </div>
      }
    />
  );
}

// ── Paires distinctives ──

export function PairesTab({ banque }: { banque: boolean }) {
  const [r, maj] = useReglages("pairesDistinctives", { choisies: PAIRES_DISTINCTIVES.slice(0, 8).map((p) => p.a), jeux: 2, legendes: false });
  const paires = PAIRES_DISTINCTIVES.filter((p) => r.choisies.includes(p.a));
  const motsVoulus = React.useMemo(() => motsDesPaires(paires, 1), [r.choisies]); // eslint-disable-line react-hooks/exhaustive-deps
  const [parMot, setParMot] = React.useState<Record<string, number>>({});
  React.useEffect(() => {
    if (!banque || !motsVoulus.length) { setParMot({}); return; }
    let vivant = true;
    api.arasaacParMots(motsVoulus).then(([trouves]) => {
      if (!vivant) return;
      const table: Record<string, number> = {};
      for (const p of trouves) if (table[p.mot.toLowerCase()] == null) table[p.mot.toLowerCase()] = p.id;
      setParMot(table);
    }).catch(() => setParMot({}));
    return () => { vivant = false; };
  }, [banque, motsVoulus.join("|")]); // eslint-disable-line react-hooks/exhaustive-deps
  const images = usePictoImages(Object.values(parMot));
  const imagesParMot = React.useMemo(() => Object.fromEntries(Object.entries(parMot).map(([mot, id]) => [mot, images[id]]).filter(([, src]) => src)) as Record<string, string>, [parMot, images]);
  const html = React.useMemo(() => htmlPaires(paires, r.jeux, imagesParMot, r.legendes), [paires, r.jeux, imagesParMot, r.legendes]);
  const basculer = (p: PaireDistinctive) => maj({ choisies: r.choisies.includes(p.a) ? r.choisies.filter((a) => a !== p.a) : [...r.choisies, p.a] });
  const groupes: [string, PaireDistinctive[]][] = [
    ["Livret « À partir de 5 ans » (2025)", PAIRES_DISTINCTIVES.filter((p) => p.source === "livret")],
    ["Guide maternelle (2020)", PAIRES_DISTINCTIVES.filter((p) => p.source === "guide")],
    ["Autres paires", PAIRES_DISTINCTIVES.filter((p) => p.source === "classique")],
  ];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Paires de mots proches
          <Aide titre="Paires de mots proches" vers="droite"><p>Deux mots qui ne diffèrent que d'un son : pour articuler et distinguer, avec le jeu du trésor et le jeu du téléphone.</p></Aide>
        </h3>
        {groupes.map(([titre, liste]) => (
          <Field key={titre} label={titre}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
              {liste.map((p) => (
                <button key={p.a} type="button" className={`btn sm${r.choisies.includes(p.a) ? " primary" : " ghost"}`} onClick={() => basculer(p)}
                  title={p.sons}>{p.a} / {p.b}</button>
              ))}
            </div>
          </Field>
        ))}
        <Field label="Jeux de cartes">
          <Select value={r.jeux} onChange={(e) => maj({ jeux: Number(e.target.value) })}>
            <option value={1}>1 jeu</option><option value={2}>2 jeux (le trésor et le téléphone)</option><option value={3}>3 jeux</option>
          </Select>
        </Field>
        <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(v) => maj({ legendes: v })} />
        <Boutons peut={paires.length > 0}
          onImprimer={() => imprimer("paires", "Paires de mots proches", () => html, [], STYLE_JEUX_SONS)}
          onBureau={() => bureau("paires", "Paires de mots proches", () => html, [], STYLE_JEUX_SONS)} />
      </>}
      droite={paires.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} /> : <Vide quoi="Choisissez au moins une paire." />}
    />
  );
}

// ── Grille de fluence ──

/** Quand un mot se lira, et ce qui lui manque : « se lira en CP, période 3 (il manque : au) ». */
function raisonDeLAttente(a: MotEnAttente, ici: EtapeCgp): string {
  const manque = `(il manque : ${a.manque.map((m) => m.libelle).join(", ")})`;
  if (!a.aPartirDe) return `demande une lettre que la progression du CP n'enseigne pas ${manque}`;
  const quand = a.aPartirDe.periode === ici.periode ? `plus loin en ${periodeDe(ici.periode).court}, à « ${nomDeLEtape(a.aPartirDe)} »` : `en ${periodeDe(a.aPartirDe.periode).court}`;
  return `se lira ${quand} ${manque}`;
}

export function FluenceTab() {
  const [r, maj] = useReglages("fluence", REGLAGES_FLUENCE);
  const [graine, setGraine] = useGraine();
  const g = React.useMemo(() => grilleFluence(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlFluence(g, r), [g, r]);
  const { etape } = g;
  const avant = etapeVoisine(etape, -1);
  const apres = etapeVoisine(etape, 1);
  const titre = `Grille de fluence — ${nomDeLEtape(etape)}`;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Grille de fluence
          <Aide titre="Grille de fluence" vers="droite"><p>Syllabes, pseudo-mots et mots du graphème de la semaine, faits seulement de ce que la progression des guides CP et CE1 a déjà fait
          étudier ; à lire chaque jour en une minute, le score se note en bas.</p></Aide>
        </h3>
        <Field label="Le graphème de la semaine">
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn sm ghost" disabled={!avant} aria-label="Étape précédente"
              title={avant ? `Étape précédente : ${nomDeLEtape(avant)}` : undefined} onClick={() => avant && maj({ son: avant.id })}>◀</button>
            <Select value={etape.id} onChange={(e) => maj({ son: e.target.value })} style={{ flex: 1, minWidth: 0 }}>
              {PERIODES.map((p) => (
                <optgroup key={p.id} label={p.titre}>
                  {ETAPES.filter((x) => x.periode === p.id).map((x) => <option key={x.id} value={x.id}>{nomDeLEtape(x)}</option>)}
                </optgroup>
              ))}
            </Select>
            <button type="button" className="btn sm ghost" disabled={!apres} aria-label="Étape suivante"
              title={apres ? `Étape suivante : ${nomDeLEtape(apres)}` : undefined} onClick={() => apres && maj({ son: apres.id })}>▶</button>
          </div>
          <div className="meta" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
            <b>{periodeDe(etape.periode).court}</b> — {etape.rubrique}.{etape.note && <> {etape.note}</>}
            <div style={{ marginTop: 3 }}>Déjà étudié : {dejaVu(etape)}</div>
          </div>
        </Field>
        <Field label="Contenu">
          <Select value={r.contenu} onChange={(e) => maj({ contenu: e.target.value as typeof r.contenu })}>
            <option value="mixte">syllabes, pseudo-mots et mots</option>
            <option value="syllabes">syllabes et pseudo-mots</option>
            <option value="mots">mots seulement</option>
          </Select>
        </Field>
        <Field label="Lignes">
          <Input type="number" min={3} max={10} value={r.lignes} onChange={(e) => maj({ lignes: Math.max(3, Math.min(10, Number(e.target.value) || 3)) })} style={{ width: 70 }} />
        </Field>
        <Field label="Mes mots (facultatif)">
          <Textarea value={r.mesMots} onChange={(e) => maj({ mesMots: e.target.value })} rows={3} placeholder="Les mots de la classe qui contiennent le graphème" />
          {/* Seuls ceux qui portent le graphème entrent dans la grille, et seulement s'ils se déchiffrent : les autres attendent leur semaine. */}
          <LigneDuProjet quoi="mots" texte={r.mesMots} exemple={REGLAGES_FLUENCE.mesMots} appliquer={(mesMots) => maj({ mesMots })} />
          {(g.miens.length > 0 || g.enAttente.length > 0) && (
            <div className="meta" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.45 }}>
              {g.miens.length > 0 && <div>Dans la grille : {g.miens.join(", ")}.</div>}
              {g.enAttente.length > 0 && (
                <div style={{ marginTop: 3 }}>
                  Pas encore déchiffrables à cette étape :
                  <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                    {g.enAttente.map((a) => <li key={a.mot}><b>{a.mot}</b> — {raisonDeLAttente(a, etape)}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Field>
        <Coche on={r.puissance4} libelle="Ajouter le plateau « quatre jetons alignés »" onChange={(v) => maj({ puissance4: v })} />
        <Boutons peut onTirage={() => setGraine(graineAuHasard())} onImprimer={() => void imprimerAtelier("fluence", titre, html, STYLE_FEUILLE + STYLE_FLUENCE)}
          onBureau={() => enregistrerSurLeBureau("fluence", titre, html, STYLE_FEUILLE + STYLE_FLUENCE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_FLUENCE} />}
    />
  );
}

// ── Syllabaire ──

export function SyllabaireTab() {
  const [r, maj] = useReglages("syllabaire", REGLAGES_SYLLABAIRE);
  const html = React.useMemo(() => htmlSyllabaire(r), [r]);
  const bascule = (cle: "consonnes" | "voyelles", x: string) =>
    maj({ [cle]: r[cle].includes(x) ? r[cle].filter((y) => y !== x) : [...r[cle], x] } as Partial<typeof r>);
  const chips = (cle: "consonnes" | "voyelles", liste: string[]) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {liste.map((x) => <button key={x} type="button" className={`btn sm${r[cle].includes(x) ? " primary" : " ghost"}`} onClick={() => bascule(cle, x)}>{grapheme(x, r.capitales)}</button>)}
    </div>
  );
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Syllabaire — jeu de l'ascenseur
          <Aide titre="Syllabaire — jeu de l'ascenseur" vers="droite"><p>Un cadre à deux fenêtres et deux bandes qui glissent : la syllabe apparaît, on la lit. Choisissez les graphèmes déjà étudiés.</p></Aide>
        </h3>
        <Field label="Consonnes">{chips("consonnes", CONSONNES_SYLLABAIRE)}</Field>
        <Field label="Voyelles et graphèmes">{chips("voyelles", VOYELLES_SYLLABAIRE)}</Field>
        <Field label="Écriture">
          <Coche on={r.capitales} libelle="Lettres en capitales (CH, É)" onChange={(capitales) => maj({ capitales })} />
        </Field>
        <Boutons peut={r.consonnes.length > 0 && r.voyelles.length > 0} onImprimer={() => void imprimerAtelier("syllabaire", "Syllabaire", html, STYLE_FEUILLE + STYLE_FLUENCE)}
          onBureau={() => enregistrerSurLeBureau("syllabaire", "Syllabaire", html, STYLE_FEUILLE + STYLE_FLUENCE)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_FLUENCE} />}
    />
  );
}

// ── Lettres ──

export function LettresTab() {
  const [r, maj] = useReglages("lettres", REGLAGES_LETTRES);
  const [graine, setGraine] = useGraine();
  const html = React.useMemo(() => htmlLettres(r, hasard(graine)), [r, graine]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Les lettres
          <Aide titre="Les lettres" vers="droite"><p>Majuscule et minuscule à associer : mémory, mistigri, loto — et la planche de l'ophtalmologue pour nommer les lettres.</p></Aide>
        </h3>
        <Field label="Jeu">
          <Select value={r.jeu} onChange={(e) => maj({ jeu: e.target.value as typeof r.jeu })}>
            <option value="memory">Jeu de mémoire des lettres</option>
            <option value="mistigri">Mistigri des lettres</option>
            <option value="loto">Loto des lettres</option>
            <option value="ophtalmologue">Jeu de l'ophtalmologue</option>
          </Select>
        </Field>
        <Field label="Les lettres">
          <Input value={r.lettres} onChange={(e) => maj({ lettres: e.target.value })} placeholder="abcdefghijklm" />
        </Field>
        {r.jeu === "loto" && (
          <Field label="Planches">
            <Input type="number" min={1} max={12} value={r.planches} onChange={(e) => maj({ planches: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} style={{ width: 70 }} />
          </Field>
        )}
        <Boutons peut={r.lettres.trim().length > 0} onTirage={() => setGraine(graineAuHasard())} onImprimer={() => void imprimerAtelier("lettres", "Les lettres", html, STYLE_FEUILLE + STYLE_JEUX_SONS)}
          onBureau={() => enregistrerSurLeBureau("lettres", "Les lettres", html, STYLE_FEUILLE + STYLE_JEUX_SONS)} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_JEUX_SONS} />}
    />
  );
}
