import React from "react";
import { Field, Input, Select, Textarea } from "../components/ui";
import { Pastilles } from "../components/Pastilles";
import { api, MODELE_TACHES } from "../api";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille } from "../components/OptionsFeuille";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "../etiquettes";
import type { MotImage } from "../jeuxSons";
import { graineAuHasard } from "../hasard";
import { REGLAGES_MOTS_MELES, STYLE_MOTS_MELES, grilleMotsMeles, htmlMotsMeles, motsSaisis } from "../motsMeles";
import { REGLAGES_PHRASES, STYLE_PHRASES, htmlPhrasesEnDesordre, phrasesEnDesordre, phrasesSaisies } from "../phrasesEnDesordre";
import { DEMANDE_PHRASES, phrasesDeLaReponse, promptPhrases } from "../phrasesIa";
import {
  CATEGORIES_MAX, COULEURS_TRI, MODELES_TRI, REGLAGES_TRI, STYLE_TRI, avecAide, etiquettesDuTri, etiquettesSaisies, htmlTri, maisonsDuTri,
  type CategorieTri, type ReglagesTri,
} from "../triEtiquettes";
import { marquesDeLaReponse, promptMarquerVerbes, promptRangerEtiquettes, rangementDeLaReponse } from "../triIa";
import { pseudonymiser, restaurer } from "../confidentialite";
import { LigneDuProjet, useProjetDuMoment } from "../components/ProjetDuMoment";
import { estUnModele, trisDuProjet } from "../triDuProjet";
import { useImagesEtOmbres } from "../components/MesImages";
import { OMBRES_MINIMUM, REGLAGES_OMBRES, STYLE_OMBRES, feuillesDOmbres, htmlOmbres, type FormeOmbres, type ImageOmbre, type ReglagesOmbres } from "../ombres";

// ── Fabriquer › Langage › Étiquettes à catégoriser ────────────────────────
//
// Les mots collectés, sur étiquettes : grandes pour le tableau, petites par
// enveloppe de trinôme, et la corolle lexicale pour les ranger.

export const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

export function EtiquettesTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [r, maj] = useReglages("etiquettes", REGLAGES_ETIQUETTES);
  const ids = mots.map((m) => m.id).filter((x): x is number => x != null);
  const images = usePictoImages(r.pictos ? ids : []);
  const html = React.useMemo(() => htmlEtiquettes(mots, images, r), [mots, images, r]);
  const imprimer = async () => {
    try {
      const im = r.pictos ? await chargerImages(ids) : {};
      await imprimerAtelier("etiquettes", "Étiquettes de mots", htmlEtiquettes(mots, im, r), STYLE_FEUILLE + STYLE_ETIQUETTES);
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const peut = mots.length > 0 && (r.grandes || r.petites || r.corolle);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Étiquettes à catégoriser</h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          aide="Les mots collectés pendant la séquence, à regrouper, classer, trier : en grand pour le tableau, en petit dans une enveloppe par trinôme. Une image aide les élèves qui ne déchiffrent pas encore." />
        <Field label="Ce qu'on imprime">
          <Coche on={r.grandes} libelle="Grandes étiquettes pour le tableau" onChange={(v) => maj({ grandes: v })} />
          <Coche on={r.petites} libelle="Petites étiquettes, une enveloppe par groupe" onChange={(v) => maj({ petites: v })} />
          {r.petites && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "4px 0 6px 24px" }}>
              <Input type="number" min={1} max={12} value={r.enveloppes} onChange={(e) => maj({ enveloppes: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} style={{ width: 64 }} aria-label="Enveloppes" />
              <span className="meta" style={{ fontSize: 12.5 }}>enveloppes</span>
            </div>
          )}
          <Coche on={r.pictos} libelle="Avec l'image du mot quand il y en a une" onChange={(v) => maj({ pictos: v })} />
          <Coche on={r.corolle} libelle="Une corolle lexicale vierge" onChange={(v) => maj({ corolle: v })} />
          {r.corolle && <Input value={r.titreCorolle} onChange={(e) => maj({ titreCorolle: e.target.value })} placeholder="Le mot au centre de la corolle" style={{ marginLeft: 24, width: "calc(100% - 24px)" }} />}
        </Field>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button type="button" className="btn primary sm" disabled={!peut} onClick={imprimer}>🖨 Imprimer</button>
          <BoutonBureau disabled={!peut} onEnregistrer={async () => {
            const im = r.pictos ? await chargerImages(ids) : {};
            return enregistrerSurLeBureau("etiquettes", "Étiquettes de mots", htmlEtiquettes(mots, im, r), STYLE_FEUILLE + STYLE_ETIQUETTES);
          }} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        {mots.length ? <ApercuFeuille html={html} style={STYLE_ETIQUETTES} />
          : <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>Ajoutez les mots de la séquence : ils s'afficheront tels qu'ils s'imprimeront.</div>}
      </div>
    </div>
  );
}

// ── Fabriquer › Lecture et écriture ───────────────────────────────────────

export function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

/** Imprimer, ranger sur le bureau — et retirer au sort, pour les feuilles qui ont un tirage. */
export function Boutons({ atelier, titre, html, style, peut, onTirage }: { atelier: string; titre: string; html: string; style: string; peut: boolean; onTirage?: () => void }) {
  return (
    <>
      <CasesFeuille />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        {onTirage && <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>}
        <button type="button" className="btn primary sm" disabled={!peut} onClick={() => void imprimerAtelier(atelier, titre, html, STYLE_FEUILLE + style)}>🖨 Imprimer</button>
        <BoutonBureau disabled={!peut} onEnregistrer={() => enregistrerSurLeBureau(atelier, titre, html, STYLE_FEUILLE + style)} />
      </div>
    </>
  );
}

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Number(v) || defaut));

// ── Mots mêlés ──

export function MotsMelesTab() {
  const [r, maj] = useReglages("motsMeles", REGLAGES_MOTS_MELES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const mots = React.useMemo(() => motsSaisis(r.mots), [r.mots]);
  const grilles = React.useMemo(
    () => Array.from({ length: Math.max(1, Math.min(4, r.grilles)) }, (_, i) => grilleMotsMeles(mots, r, graine + i)),
    [mots, r, graine],
  );
  const html = React.useMemo(() => htmlMotsMeles(grilles, r), [grilles, r]);
  const oublies = grilles[0]?.oublies ?? [];
  const taille = grilles[0]?.taille ?? r.taille;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Mots mêlés</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les mots de la semaine cachés dans une grille de lettres : à retrouver, à entourer. La liste s'imprime dessous, le corrigé à la suite.
        </p>
        <Field label="Les mots, un par ligne">
          <Textarea rows={7} value={r.mots} onChange={(e) => maj({ mots: e.target.value })} placeholder={"chat\nchien\nlapin…"} />
          <LigneDuProjet quoi="mots" texte={r.mots} exemple={REGLAGES_MOTS_MELES.mots} appliquer={(mots) => maj({ mots })} />
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label="Taille de la grille"><Input type="number" min={5} max={20} value={r.taille} onChange={(e) => maj({ taille: borne(e.target.value, 5, 20, 10) })} /></Field>
          <Field label="Grilles différentes"><Input type="number" min={1} max={4} value={r.grilles} onChange={(e) => maj({ grilles: borne(e.target.value, 1, 4, 1) })} /></Field>
        </div>
        <Coche on={r.diagonales} libelle="En diagonale aussi" onChange={(v) => maj({ diagonales: v })} />
        <Coche on={r.inverses} libelle="À l'envers aussi (cycle 3)" onChange={(v) => maj({ inverses: v })} />
        <Coche on={r.capitales} libelle="Lettres en capitales" onChange={(v) => maj({ capitales: v })} />
        <Coche on={r.liste} libelle="La liste des mots sous la grille" onChange={(v) => maj({ liste: v })} />
        <div className="meta" style={{ fontSize: 12.5 }}>
          {mots.length} mots, grille de {taille} × {taille}.
          {oublies.length > 0 && <span style={{ color: "var(--orange)" }}> Sans place : {oublies.join(", ")} — agrandissez la grille.</span>}
        </div>
        <Boutons atelier="motsMeles" titre="Mots mêlés" html={html} style={STYLE_MOTS_MELES} peut={mots.length > 0} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_MOTS_MELES} />}
    />
  );
}

// ── Phrases en désordre ──

export function PhrasesTab() {
  const [r, maj] = useReglages("phrases", REGLAGES_PHRASES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const phrases = React.useMemo(() => phrasesSaisies(r.phrases), [r.phrases]);
  const liste = React.useMemo(() => phrasesEnDesordre(phrases, graine), [phrases, graine]);
  const html = React.useMemo(() => htmlPhrasesEnDesordre(liste, r), [liste, r]);
  // ── L'IA propose des phrases, qui s'ajoutent sous celles de l'enseignant ──
  const [demande, majDemande] = useReglages("phrasesIa", DEMANDE_PHRASES);
  const [occupe, setOccupe] = React.useState(false);
  // Sans thème écrit, c'est le projet du moment qui donne le sien.
  const { projet } = useProjetDuMoment();
  const theme = demande.theme.trim() || projet?.titre.trim() || "";
  const proposer = async () => {
    setOccupe(true);
    try {
      const modele = await api.modeleActif(MODELE_TACHES);
      const reponse = await api.mistralChat(promptPhrases({ ...demande, theme }), modele);
      const nouvelles = phrasesDeLaReponse(reponse).filter((p) => !phrases.some((q) => q.toLowerCase() === p.toLowerCase()));
      if (!nouvelles.length) { toast("Le modèle n'a rien proposé de lisible ; réessayez, ou changez le thème.", { icone: "🤔" }); return; }
      maj({ phrases: [r.phrases.trim(), ...nouvelles].filter(Boolean).join("\n") });
      toast(`${nouvelles.length} phrases ajoutées sous les vôtres : relisez-les, gardez celles qui conviennent.`, { icone: "✨", duree: 6000 });
    } catch (e) {
      toast("Proposition impossible : " + String(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Phrases en désordre</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les mots d'une phrase sur des étiquettes mélangées : on découpe, on remet en ordre, on colle ou on recopie. La majuscule et le point guident.
        </p>
        <Field label="Les phrases, une par ligne">
          <Textarea rows={7} value={r.phrases} onChange={(e) => maj({ phrases: e.target.value })} placeholder={"Le chat dort sur le canapé.\nOù est mon cartable ?"} />
          <LigneDuProjet quoi="phrases" texte={r.phrases} exemple={REGLAGES_PHRASES.phrases} appliquer={(phrases) => maj({ phrases })} />
        </Field>
        <div className="ia-phrases">
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>✨ Demander des phrases à l'IA</div>
          <Input value={demande.theme} onChange={(e) => majDemande({ theme: e.target.value })} aria-label="Thème des phrases"
            placeholder={projet?.titre.trim() ? `Le thème : par défaut, le projet « ${projet.titre.trim()} »` : "Le thème : la ferme, la cantine, l'hiver, la piscine…"} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, margin: "6px 0" }}>
            <Select value={demande.cycle} onChange={(e) => majDemande({ cycle: Number(e.target.value) as 2 | 3 })} aria-label="Cycle">
              <option value={2}>Cycle 2</option><option value={3}>Cycle 3</option>
            </Select>
            <Select value={demande.combien} onChange={(e) => majDemande({ combien: Number(e.target.value) })} aria-label="Nombre de phrases">
              {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} phrases</option>)}
            </Select>
            <Select value={demande.motsMax} onChange={(e) => majDemande({ motsMax: Number(e.target.value) })} aria-label="Mots au plus">
              {[4, 5, 6, 8, 10, 12].map((n) => <option key={n} value={n}>{n} mots au plus</option>)}
            </Select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" disabled={occupe} onClick={() => void proposer()}>{occupe ? "Le modèle écrit…" : "✨ Proposer des phrases"}</button>
            <span className="meta" style={{ fontSize: 12 }}>Elles s'ajoutent sous les vôtres. Rien de la classe n'est envoyé.</span>
          </div>
        </div>
        <Coche on={r.lignes} libelle="Une ligne sous les étiquettes, pour coller ou recopier" onChange={(v) => maj({ lignes: v })} />
        <Coche on={r.capitales} libelle="Lettres en capitales" onChange={(v) => maj({ capitales: v })} />
        <div className="meta" style={{ fontSize: 12.5 }}>{phrases.length} phrases.</div>
        <Boutons atelier="phrases" titre="Phrases en désordre" html={html} style={STYLE_PHRASES} peut={phrases.length > 0} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PHRASES} />}
    />
  );
}

// ── Les maisons du tri ──

export function TriTab() {
  const [r, maj] = useReglages("tri", REGLAGES_TRI);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [occupe, setOccupe] = React.useState(false);
  const html = React.useMemo(() => htmlTri(r, graine), [r, graine]);
  const categories: CategorieTri[] = r.categories?.length ? r.categories : REGLAGES_TRI.categories;
  const maisons = maisonsDuTri(r);
  const total = etiquettesDuTri(r, graine).length;
  const aide = avecAide(r);
  const majMaison = (i: number, patch: Partial<CategorieTri>) => maj({ categories: categories.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const { projet, corpus, corpusDesProjets } = useProjetDuMoment();
  const duProjet = [...corpus.phrases, ...corpus.mots];

  // Le projet du moment donne ses tris : ses mots par syllabes, ses phrases ou pas.
  const modelesDuProjet = React.useMemo(() => (projet ? trisDuProjet(corpus, projet.titre) : []), [projet, corpus]);
  // Tous les tris qu'un modèle ou un projet poserait : un tri resté tel quel n'est pas de la main de l'enseignant.
  const tousLesModeles = React.useMemo(() => [
    ...MODELES_TRI,
    ...corpusDesProjets.mots.flatMap((mots, i) => trisDuProjet({ mots, phrases: corpusDesProjets.phrases[i] ?? [] }, "")),
  ], [corpusDesProjets]);
  const suitLeProjet = r.origine === "projet" && estUnModele(categories, modelesDuProjet);
  const prendreLeProjet = () => { if (modelesDuProjet[0]) maj({ ...modelesDuProjet[0].reglages, origine: "projet" }); };
  // À l'ouverture, ou au changement de projet : un tri qu'on n'a ni écrit ni choisi prend celui du projet.
  const courant = React.useRef({ r, categories, maj, tousLesModeles });
  courant.current = { r, categories, maj, tousLesModeles };
  const cleDuProjet = modelesDuProjet.map((m) => JSON.stringify(m.reglages.categories)).join("|");
  React.useEffect(() => {
    const premier = modelesDuProjet[0];
    if (!premier) return;
    const { r: actuel, categories: siennes, maj: poser, tousLesModeles: tous } = courant.current;
    if (actuel.origine === "modele" || !estUnModele(siennes, tous) || estUnModele(siennes, modelesDuProjet)) return;
    poser({ ...premier.reglages, origine: "projet" });
  }, [cleDuProjet]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le modèle range les mots et les phrases du projet dans les maisons ; ce qu'il n'a pas su placer reste à l'enseignant.
  const rangerLeProjet = async () => {
    const titres = categories.map((c) => c.titre.trim());
    if (titres.length < 2 || titres.some((t) => !t)) { toast("Donnez un titre à chaque maison : c'est lui qui dit où ranger.", { icone: "ℹ️" }); return; }
    const deja = new Set(categories.flatMap((c) => etiquettesSaisies(c.etiquettes)).map((e) => e.toLocaleLowerCase("fr")));
    const aRanger = duProjet.filter((e) => !deja.has(e.toLocaleLowerCase("fr")));
    if (!aRanger.length) { toast("Tout le corpus du projet est déjà dans les maisons.", { icone: "ℹ️" }); return; }
    setOccupe(true);
    try {
      const eleves = await api.elevesList().catch(() => []);
      const masque = pseudonymiser(aRanger.join("\n"), eleves.map((e) => e.nom));
      const modele = await api.modeleActif(MODELE_TACHES);
      const reponse = restaurer(await api.mistralChat(promptRangerEtiquettes(titres, masque.texte.split("\n")), modele), masque.table).texte;
      const { parMaison, ecartees } = rangementDeLaReponse(reponse, titres.length, aRanger);
      const rangees = aRanger.length - ecartees.length;
      if (!rangees) { toast("Le modèle n'a rien rangé de sûr ; écrivez les étiquettes dans leurs maisons.", { icone: "🤔", duree: 6000 }); return; }
      maj({ categories: categories.map((c, i) => ({ ...c, etiquettes: [...etiquettesSaisies(c.etiquettes), ...parMaison[i]].join("\n") })) });
      toast(`${rangees} étiquette${rangees > 1 ? "s" : ""} du projet rangée${rangees > 1 ? "s" : ""}${ecartees.length ? `, ${ecartees.length} laissée${ecartees.length > 1 ? "s" : ""} de côté` : ""} : relisez les maisons.`, { icone: "✨", duree: 6000 });
    } catch (e) {
      toast("Rangement impossible : " + String(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };

  // Le modèle marque le verbe de chaque phrase ; rien d'autre ne change, et les prénoms des élèves ne partent pas.
  const marquerLesVerbes = async () => {
    const phrases = categories.flatMap((c) => etiquettesSaisies(c.etiquettes));
    if (!phrases.length) { toast("Écrivez d'abord des étiquettes.", { icone: "ℹ️" }); return; }
    setOccupe(true);
    try {
      const eleves = await api.elevesList().catch(() => []);
      const masque = pseudonymiser(phrases.join("\n"), eleves.map((e) => e.nom));
      const modele = await api.modeleActif(MODELE_TACHES);
      const reponse = restaurer(await api.mistralChat(promptMarquerVerbes(masque.texte.split("\n")), modele), masque.table).texte;
      const { phrases: marquees, marquees: combien } = marquesDeLaReponse(reponse, phrases);
      if (!combien) { toast("Le modèle n'a rien marqué de sûr ; marquez à la main, entre astérisques.", { icone: "🤔", duree: 6000 }); return; }
      let k = 0;
      maj({ aideMots: true, categories: categories.map((c) => ({ ...c, etiquettes: etiquettesSaisies(c.etiquettes).map(() => marquees[k++]).join("\n") })) });
      toast(`${combien} verbe${combien > 1 ? "s" : ""} marqué${combien > 1 ? "s" : ""} : relisez l'aperçu, corrigez entre astérisques.`, { icone: "✨", duree: 6000 });
    } catch (e) {
      toast("Marquage impossible : " + String(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };

  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Les maisons du tri</h3>
        {/* Des plis : on ouvre ce qu'on règle, le reste se tait. */}
        <details className="pli" open>
          <summary>Les étiquettes <span className="meta">· {total} étiquettes, {maisons.length} maison{maisons.length > 1 ? "s" : ""}</span></summary>
          <Field label="Partir d'un modèle">
            <Select value="" aria-label="Modèle" onChange={(e) => {
              const duProjetChoisi = modelesDuProjet.find((x) => x.id === e.target.value);
              const m = duProjetChoisi ?? MODELES_TRI.find((x) => x.id === e.target.value);
              if (m) maj({ ...m.reglages, origine: duProjetChoisi ? "projet" : "modele" });
            }}>
              <option value="">Choisir un modèle : il remplace ce qui est écrit…</option>
              {projet && modelesDuProjet.length > 0 && (
                <optgroup label={`Le projet « ${projet.titre} »`}>
                  {modelesDuProjet.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
                </optgroup>
              )}
              <optgroup label="Les modèles">
                {MODELES_TRI.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </optgroup>
            </Select>
            {projet && modelesDuProjet.length > 0 && (
              <div className="projet-ligne">
                <span className="meta">📌 {suitLeProjet ? `Les mots du projet « ${projet.titre} ».` : `Le projet « ${projet.titre} » a de quoi trier.`}</span>
                {!suitLeProjet && <button type="button" className="btn ghost sm" onClick={prendreLeProjet}>Les prendre</button>}
              </div>
            )}
          </Field>
          <Field label="Titre"><Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} placeholder="ÊTRE ou AVOIR ?" /></Field>
          <Field label="Consigne"><Textarea rows={2} value={r.consigne} onChange={(e) => maj({ consigne: e.target.value })} /></Field>
          <Field label="Les maisons, et leurs étiquettes">
            {categories.map((c, i) => (
              <div key={i} className="tri-maison">
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Input value={c.titre} onChange={(e) => majMaison(i, { titre: e.target.value })} placeholder={`Maison ${i + 1}`} aria-label={`Titre de la maison ${i + 1}`} />
                  {categories.length > 2 && (
                    <button type="button" className="btn ghost sm" aria-label={`Retirer la maison ${i + 1}`}
                      onClick={() => maj({ categories: categories.filter((_, k) => k !== i) })}>🗑</button>
                  )}
                </div>
                <Textarea rows={5} value={c.etiquettes} onChange={(e) => majMaison(i, { etiquettes: e.target.value })}
                  placeholder={"Une étiquette par ligne.\nJe *suis* content."} aria-label={`Étiquettes de la maison ${i + 1}`} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {categories.length < CATEGORIES_MAX && (
                <button type="button" className="btn sm" onClick={() => maj({ categories: [...categories, { titre: "", etiquettes: "" }] })}>＋ Une maison de plus</button>
              )}
              {projet && duProjet.length > 0 && (
                <button type="button" className="btn sm" disabled={occupe} onClick={() => void rangerLeProjet()}
                  title={`Les ${duProjet.length} mots et phrases du projet « ${projet.titre} », rangés par le modèle dans vos maisons`}>
                  {occupe ? "Le modèle range…" : `✨ Ranger le corpus du projet (${duProjet.length})`}
                </button>
              )}
            </div>
          </Field>
        </details>
        <details className="pli">
          <summary>Différencier{aide && <span className="meta"> · {[r.aideMots && "mot en couleur", r.aidePonctuation && "ponctuation en couleur", r.deuxVersions && "deux versions"].filter(Boolean).join(", ")}</span>}</summary>
          <Coche on={r.aideMots} libelle="Le mot marqué en couleur : Je *suis* content." onChange={(v) => maj({ aideMots: v })} />
          {r.aideMots && (
            <div className="tri-aide">
              <Pastilles palette={COULEURS_TRI} valeur={r.couleurMots} onChange={(hex) => maj({ couleurMots: hex })} />
              <button type="button" className="btn sm" disabled={occupe} onClick={() => void marquerLesVerbes()}
                title="Le modèle entoure d'astérisques le verbe de chaque phrase, sans rien changer d'autre">
                {occupe ? "Le modèle lit…" : "✨ Marquer les verbes"}</button>
            </div>
          )}
          <Coche on={r.aidePonctuation} libelle="La majuscule et la ponctuation en couleur" onChange={(v) => maj({ aidePonctuation: v })} />
          {r.aidePonctuation && (
            <div className="tri-aide"><Pastilles palette={COULEURS_TRI} valeur={r.couleurPonctuation} onChange={(hex) => maj({ couleurPonctuation: hex })} /></div>
          )}
          <Coche on={r.deuxVersions && aide} libelle="Les deux versions à la suite : avec l'aide, et sans" onChange={(v) => maj({ deuxVersions: v })} />
        </details>
        <details className="pli">
          <summary>Présentation <span className="meta">· {r.parLigne} par ligne{r.taille === "grande" ? ", grandes" : ""}{r.capitales ? ", capitales" : ""}{r.melanger ? ", mélangées" : ""}</span></summary>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 4 }}>
            <Select value={r.parLigne} aria-label="Étiquettes par ligne" onChange={(e) => maj({ parLigne: borne(e.target.value, 2, 4, 4) })}>
              {[2, 3, 4].map((n) => <option key={n} value={n}>{n} étiquettes par ligne</option>)}
            </Select>
            <Select value={r.taille} aria-label="Taille des étiquettes" onChange={(e) => maj({ taille: e.target.value as ReglagesTri["taille"] })}>
              <option value="normale">taille normale</option><option value="grande">grandes étiquettes</option>
            </Select>
          </div>
          <Coche on={r.capitales} libelle="Lettres en capitales" onChange={(v) => maj({ capitales: v })} />
          <Coche on={r.melanger} libelle="Mélanger les étiquettes" onChange={(v) => maj({ melanger: v })} />
        </details>
        <details className="pli">
          <summary>Fiche d'aide « Je vérifie »{r.aide.trim() || r.aRetenir.trim() ? <span className="meta"> · écrite</span> : null}</summary>
          <Field label="Une vérification par ligne — titre : question">
            <Textarea rows={4} value={r.aide} onChange={(e) => maj({ aide: e.target.value })} placeholder={"Le sens : Est-ce que cela veut dire quelque chose ?"} />
          </Field>
          <Field label="À retenir"><Textarea rows={3} value={r.aRetenir} onChange={(e) => maj({ aRetenir: e.target.value })} /></Field>
        </details>
        {maisons.length < 2 && <div className="meta" style={{ fontSize: 12.5, marginTop: 6, color: "var(--orange)" }}>Il faut deux maisons pour trier.</div>}
        <Boutons atelier="tri" titre={`Les maisons du tri${r.titre.trim() ? ` — ${r.titre.trim()}` : ""}`} html={html} style={STYLE_TRI}
          peut={total > 0 && maisons.length >= 2} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_TRI} />}
    />
  );
}

// ── Le jeu des ombres ──

export function OmbresTab({ banque }: { banque: boolean }) {
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [r, maj] = useReglages("ombres", REGLAGES_OMBRES);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const ids = mots.map((m) => m.id).filter((x): x is number => x != null);
  const { images, ombres, pret } = useImagesEtOmbres(ids, r.grise);
  // Une image et son ombre, dès que les deux sont prêtes ; un mot sans image n'a pas d'ombre.
  const items = React.useMemo(() => mots.flatMap((m): ImageOmbre[] =>
    (m.id != null && images[m.id] && ombres[m.id] ? [{ id: m.id, mot: m.mot, image: images[m.id], ombre: ombres[m.id] }] : [])), [mots, images, ombres]);
  const html = React.useMemo(() => htmlOmbres(items, r, graine), [items, r, graine]);
  // Un mot que la banque n'a pas, une image qui ne se lit plus : ils restent dans la liste, sans ombre.
  const sansImage = pret ? mots.length - items.length : 0;
  const peut = pret && items.length >= OMBRES_MINIMUM;
  const feuilles = feuillesDOmbres(items.length, r);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Le jeu des ombres</h3>
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
          aide="Chaque image retrouve son ombre : on découpe les images, on les pose sur la planche des silhouettes. Les pictogrammes de la banque, ou vos images : une image détourée, ou un objet photographié sur un fond uni — une feuille, une table —, donne une ombre nette ; une photo plein cadre ne donne qu'un rectangle." />
        <Field label="Forme">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as FormeOmbres })}>
            <option value="poser">Des images à découper, à poser sur les ombres</option>
            <option value="relier">Une fiche : relier chaque image à son ombre</option>
          </Select>
        </Field>
        {r.forme === "poser" && (
          <Field label="Ombres par planche">
            <Select value={r.parPage} onChange={(e) => maj({ parPage: Number(e.target.value) as ReglagesOmbres["parPage"] })}>
              <option value={6}>6 — grandes, pour les petites mains</option>
              <option value={9}>9</option>
              <option value={12}>12 — petites</option>
            </Select>
          </Field>
        )}
        <Coche on={r.legendes} libelle="Écrire le mot sous l'image et sous son ombre" onChange={(v) => maj({ legendes: v })} />
        <Coche on={r.grise} libelle="Des ombres grises : moins d'encre, même forme" onChange={(v) => maj({ grise: v })} />
        <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
          {!pret ? "Les ombres se dessinent…" : `${items.length} image${items.length > 1 ? "s" : ""}, ${feuilles} feuille${feuilles > 1 ? "s" : ""}.`}
          {sansImage > 0 && <span style={{ color: "var(--orange)" }}> {sansImage} mot{sansImage > 1 ? "s" : ""} sans image : pas d'ombre pour {sansImage > 1 ? "eux" : "lui"}.</span>}
        </div>
        <Boutons atelier="ombres" titre="Le jeu des ombres" html={html} style={STYLE_OMBRES} peut={peut} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={items.length ? <ApercuFeuille html={html} style={STYLE_OMBRES} />
        : <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>Ajoutez au moins deux images — des mots de la banque, un thème, ou vos propres images : chacune aura son ombre.</div>}
    />
  );
}
