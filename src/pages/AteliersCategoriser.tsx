import React from "react";
import { api } from "../api";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { ChoixPicto, chargerImages, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille, useOptionsFeuille } from "../components/OptionsFeuille";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDeCategorisation } from "../components/SequenceDeCategorisation";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import {
  CATEGORIES_MAX, FORMES, NIVEAUX, REGLAGES_CATEGORISER, REPERES, STYLE_CATEGORISER, categoriesDuJeu, cequiManque, couleurDe,
  htmlCategoriser, idsDesImages, jeuxPour, motDeLaCategorie, motsDuJeu, motsPourLImage, nomDeLaForme, normaliserCategories, reglagesDuNiveau,
  type Categorie, type Forme, type Niveau, type ReglagesCategoriser,
} from "../categoriser";

// ── Fabriquer › Catégoriser les mots ──────────────────────────────────────
//
// « Organiser les mots en catégorie et en réseau » : les jeux de la fiche
// Éduscol « Catégoriser » (2023), avec les catégories de la classe. On les
// compose à gauche — ou on en prend de toutes prêtes —, le jeu choisi se voit
// à droite tel qu'il s'imprimera ; et la séquence se crée d'un clic.

const ATELIER = "categoriser";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

/** Le picto qui dit une catégorie, cherché dans la banque d'après son nom, ou rien. */
async function pictoDeLaCategorie(nom: string): Promise<number | null> {
  const essais = motsPourLImage(nom);
  if (!essais.length) return null;
  const [trouves] = await api.arasaacParMots(essais);
  for (const mot of essais) {
    const p = trouves.find((t) => t.mot.toLowerCase() === mot);
    if (p) return p.id;
  }
  return null;
}

/** Une catégorie : son nom, l'image qui la dit, et — dépliée — ses images. */
function CarteCategorie({ c, rang, ouverte, onOuvrir, onChange, onRetirer, banque, forme }: {
  c: Categorie; rang: number; ouverte: boolean; onOuvrir: () => void;
  onChange: (c: Categorie) => void; onRetirer: () => void; banque: boolean; forme: Forme;
}) {
  const [choix, setChoix] = React.useState(false);
  const src = usePictoImage(c.image);
  // Un nom écrit, pas encore d'image : la banque propose celle du mot qui dit la catégorie.
  const imageDuNom = async () => {
    if (!banque || c.image != null || !c.nom.trim()) return;
    try {
      const id = await pictoDeLaCategorie(c.nom);
      if (id != null) onChange({ ...c, image: id });
    } catch { /* sans image, la catégorie garde son nom seul */ }
  };
  return (
    <div className="ct-categorie" style={{ borderLeftColor: c.intrus ? "var(--text-3, #9aa0b4)" : couleurDe(rang) }}>
      <div className="ct-categorie-tete">
        <button type="button" className="ct-categorie-image" onClick={() => setChoix(true)} disabled={!banque}
          title={banque ? "Changer l'image qui dit la catégorie" : "La banque de pictogrammes n'est pas téléchargée"}>
          {src ? <img src={src} alt="" /> : <span aria-hidden="true">🖼</span>}
        </button>
        <Input value={c.nom} placeholder={c.intrus ? "Les intrus" : "Les fruits"} aria-label={`Nom de la catégorie ${rang + 1}`}
          onChange={(e) => onChange({ ...c, nom: e.target.value })} onBlur={() => { void imageDuNom(); }} />
        <button type="button" className="btn ghost sm" onClick={onOuvrir} aria-expanded={ouverte}
          title={ouverte ? "Replier" : "Voir et changer ses images"}>
          {c.mots.length} image{c.mots.length > 1 ? "s" : ""} {ouverte ? "▾" : "▸"}
        </button>
        <button type="button" className="btn ghost sm" onClick={onRetirer} aria-label={`Retirer la catégorie ${c.nom || rang + 1}`}>✕</button>
      </div>
      {ouverte && (
        <div className="ct-categorie-corps">
          <BanqueDeMots mots={c.mots} onChange={(mots) => onChange({ ...c, mots })} banque={banque}
            aide="Les images de cette catégorie : écrivez les mots, piochez dans un thème, ou ajoutez vos photos." />
          {forme === "appelle" && !c.intrus && (
            <Field label="Ce que dit le meneur : « J'appelle… »">
              <Input value={c.appel} placeholder={c.nom ? c.nom.toLowerCase() : "tout ce qui se mange"} onChange={(e) => onChange({ ...c, appel: e.target.value })} />
            </Field>
          )}
          <Coche on={c.intrus} libelle="Ces images ne vont dans aucune boîte : ce sont les intrus" onChange={(intrus) => onChange({ ...c, intrus })} />
        </div>
      )}
      {choix && (
        <ChoixPicto valeur={{ id: c.image, mot: motDeLaCategorie(c.nom) }} banque={banque} titre="L'image qui dit la catégorie"
          onClose={() => setChoix(false)} onValider={(p) => { onChange({ ...c, image: p.id }); setChoix(false); }} />
      )}
    </div>
  );
}

export function CategoriserTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesCategoriser>(ATELIER, REGLAGES_CATEGORISER);
  const categories = React.useMemo(() => normaliserCategories(brut.categories), [brut.categories]);
  const r = React.useMemo(() => ({ ...brut, categories }), [brut, categories]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [ouverte, setOuverte] = React.useState(-1);
  const [jeu, setJeu] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const ids = React.useMemo(() => idsDesImages(categories), [categories]);
  const images = usePictoImages(ids);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlCategoriser(r, images, hasard(graine)), [r, images, graine]);
  const titre = nomDeLaForme(r.forme);
  const jeux = jeuxPour(r.niveau);

  const changerCategorie = (i: number, c: Categorie) => maj({ categories: categories.map((x, k) => (k === i ? c : x)) });
  const prendreLeJeu = async () => {
    const j = jeux.find((x) => x.id === jeu);
    if (!j) return;
    if (categories.some((c) => c.mots.length) && !(await confirmer(`Remplacer vos catégories par « ${j.libelle} » ?`, { oui: "Remplacer" }))) return;
    setOccupe(true);
    try {
      const parMot: Record<string, number> = {};
      if (banque) {
        const [trouves, absents] = await api.arasaacParMots(motsDuJeu(j));
        for (const p of trouves) if (parMot[p.mot.toLowerCase()] == null) parMot[p.mot.toLowerCase()] = p.id;
        if (absents.length) toast(`Sans image : ${absents.join(", ")} — le mot s'imprimera seul.`, { icone: "ℹ️" });
      }
      maj({ categories: categoriesDuJeu(j, parMot) });
      setOuverte(-1);
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };
  // L'impression attend toutes les images, et mêle les cartes comme l'aperçu.
  const feuilleImprimee = async () => htmlCategoriser(r, await chargerImages(ids), hasard(graine));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_CATEGORISER); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const jeuChoisi = jeux.find((x) => x.id === jeu);
  const melange = ["tri", "intrus", "loto", "appelle", "mistigri"].includes(r.forme);
  const avecImages = categories.some((c) => c.mots.length);
  // Ce que le pli règle, dit sur sa ligne : on sait ce qui sortira sans l'ouvrir.
  const nommable = r.forme === "tri" || r.forme === "loto" || r.forme === "appelle";
  const legendable = !["affiche", "evaluation", "familles"].includes(r.forme);
  const { options } = useOptionsFeuille(ATELIER);
  const resume = [
    nommable && (r.nommer ? "catégories nommées" : "à nommer par l'élève"),
    r.forme === "tri" && r.maisons && "en maisons",
    legendable && r.legendes && "mots sous les images",
    !options.consigne && "sans consigne", !options.prenom && "sans prénom", !options.corrige && "sans correction",
  ].filter(Boolean).join(", ");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Catégoriser les mots</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          « Organiser les mots en catégorie et en réseau » : les jeux de la fiche Éduscol « Catégoriser » (2023) et du guide
          « Pour enseigner le vocabulaire à l'école maternelle », avec les images de la classe.
        </p>
        <Field label="Classe">
          <div className="seg">
            {NIVEAUX.map((n) => (
              <button key={n.id} type="button" className={r.niveau === n.id ? "active" : ""}
                onClick={() => maj({ niveau: n.id as Niveau, ...reglagesDuNiveau(n.id) })} title={n.age}>{n.id}</button>
            ))}
          </div>
        </Field>
        <div className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "-2px 0 10px" }}>
          {NIVEAUX.find((n) => n.id === r.niveau)?.age} : {REPERES[r.niveau]}
        </div>
        <Field label={`Les catégories (${categories.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {categories.map((c, i) => (
              <CarteCategorie key={i} c={c} rang={i} ouverte={ouverte === i} banque={banque} forme={r.forme}
                onOuvrir={() => setOuverte(ouverte === i ? -1 : i)} onChange={(x) => changerCategorie(i, x)}
                onRetirer={() => { maj({ categories: categories.filter((_, k) => k !== i) }); setOuverte(-1); }} />
            ))}
            {categories.length < CATEGORIES_MAX && (
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }}
                onClick={() => { maj({ categories: [...categories, { nom: "", image: null, appel: "", intrus: false, mots: [] }] }); setOuverte(categories.length); }}>
                ＋ Une catégorie
              </button>
            )}
          </div>
        </Field>
        <Field label="Le jeu">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as Forme })}>
            {FORMES.map((f) => <option key={f.id} value={f.id}>{f.nom} — {f.quoi}</option>)}
          </Select>
        </Field>
        {r.forme === "intrus" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="Lignes">
              <Select value={r.lignes} onChange={(e) => maj({ lignes: Number(e.target.value) })}>
                {[2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} lignes</option>)}
              </Select>
            </Field>
            <Field label="Images par ligne">
              <Select value={r.parLigne} onChange={(e) => maj({ parLigne: Number(e.target.value) })}>
                {[3, 4, 5].map((n) => <option key={n} value={n}>{n}, l'intrus compris</option>)}
              </Select>
            </Field>
          </div>
        )}
        {/* Un pli : les exemples et la présentation se règlent une fois, puis se taisent. Il s'ouvre tant qu'il n'y a rien à trier. */}
        <details className="pli" open={!avecImages}>
          <summary>Exemples et présentation{resume && <span className="meta"> · {resume}</span>}</summary>
          <Field label="Des catégories toutes prêtes">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <Select value={jeu} onChange={(e) => setJeu(e.target.value)} style={{ flex: 1, minWidth: 160 }}>
                <option value="">Choisir un exemple…</option>
                {/* Ceux de la classe choisie d'abord ; les autres restent à portée, avec leur classe. */}
                <optgroup label={`Pour la ${NIVEAUX.find((n) => n.id === r.niveau)?.classe ?? r.niveau}`}>
                  {jeux.filter((j) => j.niveaux.includes(r.niveau)).map((j) => <option key={j.id} value={j.id}>{j.libelle}</option>)}
                </optgroup>
                <optgroup label="Pour les autres classes">
                  {jeux.filter((j) => !j.niveaux.includes(r.niveau)).map((j) => <option key={j.id} value={j.id}>{j.libelle} ({j.niveaux.join(", ")})</option>)}
                </optgroup>
              </Select>
              <button type="button" className="btn sm" disabled={!jeu || occupe} onClick={() => { void prendreLeJeu(); }}>{occupe ? "Recherche des images…" : "Prendre"}</button>
            </div>
            {jeuChoisi && <div className="meta" style={{ fontSize: 12, marginTop: 4 }}>D'après la {jeuChoisi.source}.</div>}
          </Field>
          {nommable && (
            <Coche on={r.nommer} libelle="Écrire le nom et l'image des catégories — décoché, c'est l'élève qui les nomme" onChange={(nommer) => maj({ nommer })} />
          )}
          {r.forme === "tri" && <Coche on={r.maisons} libelle="Des maisons plutôt que des boîtes (les maisons des familles de mots)" onChange={(maisons) => maj({ maisons })} />}
          {legendable && <Coche on={r.legendes} libelle="Écrire le mot sous chaque image" onChange={(legendes) => maj({ legendes })} />}
          <CasesFeuille />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {melange && <button type="button" className="btn sm" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>}
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_CATEGORISER)} />
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 8 }} disabled={categories.filter((c) => !c.intrus && c.mots.length).length < 2}
          onClick={() => setEnSequence(true)} title="Une séquence d'après le programme et les guides Éduscol, avec les jeux de ces catégories dans ses séances">
          📚 Créer une séquence avec ces catégories
        </button>
        {enSequence && <SequenceDeCategorisation reglages={r} competences={competences} onClose={() => setEnSequence(false)} />}
      </div>
      <div style={{ minWidth: 0 }}>
        {avecImages
          ? <ApercuFeuille html={html} style={STYLE_CATEGORISER} />
          : <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>
              Prenez des catégories toutes prêtes — les exemples de la fiche Éduscol, comme « S'habiller ou cuisiner » en petite section ou
              « Les animaux à poils, à plumes, à écailles, à carapace » en grande —, ou composez les vôtres : un nom, et ses images.
            </div>}
      </div>
    </div>
  );
}
