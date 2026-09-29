import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { api } from "../api";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { SONS, syllabes } from "../lectureSons";
import {
  PAIRES_DISTINCTIVES, REGLAGES_LETTRES, REGLAGES_LOTO_SYLLABES, STYLE_JEUX_SONS, dominos, htmlDominos, htmlIntrus, htmlLettres,
  htmlLotoSyllabes, htmlPaires, lignesIntrus, motsDesPaires, nbSyllabes, pairesQuiSenchainent, planchesLotoSyllabes,
  type ModeIntrus, type MotImage, type PaireDistinctive,
} from "../jeuxSons";
import {
  CONSONNES_SYLLABAIRE, REGLAGES_FLUENCE, REGLAGES_SYLLABAIRE, STYLE_FLUENCE, VOYELLES_SYLLABAIRE, grapheme, grilleFluence, htmlFluence, htmlSyllabaire,
} from "../fluence";

// ── Fabriquer › Sons et lecture ───────────────────────────────────────────
//
// Les jeux que les guides de lecture décrivent, avec les mots de la classe.
// Chaque atelier : les réglages et les mots à gauche, la feuille à droite,
// telle qu'elle s'imprimera.

const ids = (mots: MotImage[]) => mots.map((m) => m.id).filter((x): x is number => x != null);

/** Imprimer : on attend les images, puis on ouvre le document. */
async function imprimer(atelier: string, titre: string, html: (images: Record<number, string>) => string, idsImages: number[], style: string) {
  try {
    const images = await chargerImages(idsImages);
    await imprimerAtelier(atelier, titre, html(images), STYLE_FEUILLE + style);
  } catch (e) { toast(String(e), { icone: "⚠️" }); }
}

/** La même feuille, en PDF sur le plan de travail. */
async function bureau(atelier: string, titre: string, html: (images: Record<number, string>) => string, idsImages: number[], style: string) {
  const images = await chargerImages(idsImages);
  return enregistrerSurLeBureau(atelier, titre, html(images), STYLE_FEUILLE + style);
}

function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

function Boutons({ onTirage, onImprimer, onBureau, peut }: {
  onTirage?: () => void; onImprimer: () => void; onBureau?: () => Promise<{ id: string; titre: string }>; peut: boolean;
}) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
      <button type="button" className="btn primary sm" disabled={!peut} onClick={onImprimer}>🖨 Imprimer</button>
      {onBureau && <BoutonBureau disabled={!peut} onEnregistrer={onBureau} />}
    </div>
  );
}

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

const Vide = ({ quoi }: { quoi: string }) => (
  <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>{quoi}</div>
);

// ── Loto des syllabes ──

export function LotoSyllabesTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [r, maj] = useReglages("lotoSyllabes", REGLAGES_LOTO_SYLLABES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const planches = React.useMemo(() => planchesLotoSyllabes(mots, r, hasard(graine)), [mots, r, graine]);
  const images = usePictoImages(ids(mots));
  const html = React.useMemo(() => htmlLotoSyllabes(planches, mots, images, r), [planches, mots, images, r]);
  // Un clic sur le compte le fait tourner : notre découpage n'est pas parole d'évangile.
  const tourner = (m: MotImage) => setMots(mots.map((x) => (x === m ? { ...x, syllabes: (nbSyllabes(x, r.ecrites) % r.maximum) + 1 } : x)));
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Loto des syllabes</h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          aide="Chaque case d'une planche impose un nombre de syllabes ; on pioche une image, on scande, on compte. Le nombre sous chaque mot se corrige d'un clic."
          extra={(m) => <button type="button" className="bm-compte" title="Changer le nombre de syllabes" onClick={() => tourner(m)}>{nbSyllabes(m, r.ecrites)} syll.</button>} />
        <Field label="Planches">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <Input type="number" min={1} max={12} value={r.planches} onChange={(e) => maj({ planches: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} style={{ width: 70 }} aria-label="Nombre de planches" />
            <Select value={r.cases} onChange={(e) => maj({ cases: Number(e.target.value) as 6 | 9 })} aria-label="Cases par planche">
              <option value={6}>6 cases</option><option value={9}>9 cases</option>
            </Select>
            <Select value={r.maximum} onChange={(e) => maj({ maximum: Number(e.target.value) })} aria-label="Nombre de syllabes au plus">
              <option value={2}>jusqu'à 2 syllabes</option><option value={3}>jusqu'à 3 syllabes</option><option value={4}>jusqu'à 4 syllabes</option>
            </Select>
          </div>
        </Field>
        <Coche on={r.ecrites} libelle="Compter le e muet final (ta-ble : 2 syllabes)" onChange={(v) => maj({ ecrites: v })} />
        <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(v) => maj({ legendes: v })} />
        <Boutons peut={planches.length > 0} onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("lotoSyllabes", "Loto des syllabes", (im) => htmlLotoSyllabes(planches, mots, im, r), ids(mots), STYLE_JEUX_SONS)}
          onBureau={() => bureau("lotoSyllabes", "Loto des syllabes", (im) => htmlLotoSyllabes(planches, mots, im, r), ids(mots), STYLE_JEUX_SONS)} />
      </>}
      droite={planches.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} /> : <Vide quoi="Ajoutez des mots : le loto se fabrique avec les mots de la classe et leurs images." />}
    />
  );
}

// ── Dominos des syllabes ──

export function DominosTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [legendes, setLegendes] = React.useState(false);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const pieces = React.useMemo(() => dominos(pairesQuiSenchainent(mots, hasard(graine))), [mots, graine]);
  const images = usePictoImages(ids(mots));
  const html = React.useMemo(() => htmlDominos(pieces, images, legendes), [pieces, images, legendes]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Dominos des syllabes</h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          aide="Un domino s'enchaîne quand la dernière syllabe d'une image commence la suivante : micro – crocodile. Il faut beaucoup de mots pour trouver des enchaînements — piochez un thème entier, ou deux." />
        <div className="meta" style={{ fontSize: 12.5, margin: "6px 0" }}>
          {pieces.length ? `${pieces.length} dominos trouvés (${pieces.length * 2} images).` : "Pas encore d'enchaînement : ajoutez des mots."}
        </div>
        <Coche on={legendes} libelle="Écrire le mot sous chaque image" onChange={setLegendes} />
        <Boutons peut={pieces.length >= 3} onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("dominos", "Dominos des syllabes", (im) => htmlDominos(pieces, im, legendes), ids(mots), STYLE_JEUX_SONS)}
          onBureau={() => bureau("dominos", "Dominos des syllabes", (im) => htmlDominos(pieces, im, legendes), ids(mots), STYLE_JEUX_SONS)} />
      </>}
      droite={pieces.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} /> : <Vide quoi="Les dominos apparaîtront dès que des mots s'enchaînent : la rime de l'un est l'attaque de l'autre." />}
    />
  );
}

// ── Chasse à l'intrus ──

export function IntrusTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [r, maj] = useReglages("intrus", { mode: "attaque" as ModeIntrus, combien: 6, legendes: false });
  const [graine, setGraine] = React.useState(graineAuHasard);
  const lignes = React.useMemo(() => lignesIntrus(mots, r.mode, r.combien, hasard(graine)), [mots, r.mode, r.combien, graine]);
  const images = usePictoImages(ids(mots));
  const html = React.useMemo(() => htmlIntrus(lignes, images, r.mode, r.legendes), [lignes, images, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Chasse à l'intrus</h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          aide="Trois mots qui commencent (ou finissent) par la même syllabe, et un intrus : bateau, banane, tapis, ballon. Il faut des mots qui se ressemblent — un ou deux thèmes entiers." />
        <Field label="Ce qui se ressemble">
          <Select value={r.mode} onChange={(e) => maj({ mode: e.target.value as ModeIntrus })}>
            <option value="attaque">la première syllabe (l'attaque)</option>
            <option value="rime">la dernière syllabe (la rime)</option>
          </Select>
        </Field>
        <Field label="Lignes">
          <Input type="number" min={1} max={15} value={r.combien} onChange={(e) => maj({ combien: Math.max(1, Math.min(15, Number(e.target.value) || 1)) })} style={{ width: 70 }} />
        </Field>
        <div className="meta" style={{ fontSize: 12.5, margin: "6px 0" }}>{lignes.length ? `${lignes.length} ligne${lignes.length > 1 ? "s" : ""} possible${lignes.length > 1 ? "s" : ""}.` : "Pas encore trois mots qui se ressemblent."}</div>
        <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(v) => maj({ legendes: v })} />
        <Boutons peut={lignes.length > 0} onTirage={() => setGraine(graineAuHasard())}
          onImprimer={() => imprimer("intrus", "Chasse à l'intrus", (im) => htmlIntrus(lignes, im, r.mode, r.legendes), ids(mots), STYLE_JEUX_SONS)}
          onBureau={() => bureau("intrus", "Chasse à l'intrus", (im) => htmlIntrus(lignes, im, r.mode, r.legendes), ids(mots), STYLE_JEUX_SONS)} />
      </>}
      droite={lignes.length ? <ApercuFeuille html={html} style={STYLE_JEUX_SONS} /> : <Vide quoi="Les lignes apparaîtront dès que trois mots partagent une syllabe." />}
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
        <h3 style={{ marginTop: 0 }}>Paires de mots proches</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Deux mots qui ne diffèrent que d'un son : pour articuler et distinguer, avec le jeu du trésor et le jeu du téléphone.
        </p>
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

export function FluenceTab() {
  const [r, maj] = useReglages("fluence", REGLAGES_FLUENCE);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const g = React.useMemo(() => grilleFluence(r, graine), [r, graine]);
  const html = React.useMemo(() => htmlFluence(g, r), [g, r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Grille de fluence</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Syllabes, pseudo-mots et mots du son de la semaine, à lire chaque jour en une minute ; le score se note en bas.
        </p>
        <Field label="Le son">
          <Select value={r.son} onChange={(e) => maj({ son: e.target.value })}>
            {SONS.map((s) => <option key={s.id} value={s.id}>{s.son} — {s.graphemes.join(", ")}</option>)}
          </Select>
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
          <Textarea value={r.mesMots} onChange={(e) => maj({ mesMots: e.target.value })} rows={3} placeholder="Les mots de la classe qui contiennent le son" />
        </Field>
        <Coche on={r.puissance4} libelle="Ajouter le plateau « quatre jetons alignés »" onChange={(v) => maj({ puissance4: v })} />
        <Boutons peut onTirage={() => setGraine(graineAuHasard())} onImprimer={() => void imprimerAtelier("fluence", `Grille de fluence — ${g.son.son}`, html, STYLE_FEUILLE + STYLE_FLUENCE)}
          onBureau={() => enregistrerSurLeBureau("fluence", `Grille de fluence — ${g.son.son}`, html, STYLE_FEUILLE + STYLE_FLUENCE)} />
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
        <h3 style={{ marginTop: 0 }}>Syllabaire — jeu de l'ascenseur</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Un cadre à deux fenêtres et deux bandes qui glissent : la syllabe apparaît, on la lit. Choisissez les graphèmes déjà étudiés.
        </p>
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
  const [graine, setGraine] = React.useState(graineAuHasard);
  const html = React.useMemo(() => htmlLettres(r, hasard(graine)), [r, graine]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Les lettres</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Majuscule et minuscule à associer : mémory, mistigri, loto — et la planche de l'ophtalmologue pour nommer les lettres.
        </p>
        <Field label="Jeu">
          <Select value={r.jeu} onChange={(e) => maj({ jeu: e.target.value as typeof r.jeu })}>
            <option value="memory">Mémory des lettres</option>
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

/** Les syllabes d'un son, pour remplir d'autres jeux (le jeu de l'oie). */
export const syllabesDuSon = (id: string) => {
  const son = SONS.find((s) => s.id === id);
  return son ? syllabes(son, 10) : [];
};
