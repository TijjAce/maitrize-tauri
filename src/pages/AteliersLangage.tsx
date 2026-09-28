import React from "react";
import { Field, Input, Textarea } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { REGLAGES_ETIQUETTES, STYLE_ETIQUETTES, htmlEtiquettes } from "../etiquettes";
import type { MotImage } from "../jeuxSons";
import { graineAuHasard } from "../hasard";
import { REGLAGES_MOTS_MELES, STYLE_MOTS_MELES, grilleMotsMeles, htmlMotsMeles, motsSaisis } from "../motsMeles";
import { REGLAGES_PHRASES, STYLE_PHRASES, htmlPhrasesEnDesordre, phrasesEnDesordre, phrasesSaisies } from "../phrasesEnDesordre";

// ── Fabriquer › Langage › Étiquettes à catégoriser ────────────────────────
//
// Les mots collectés, sur étiquettes : grandes pour le tableau, petites par
// enveloppe de trinôme, et la corolle lexicale pour les ranger.

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
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

function Colonnes({ gauche, droite }: { gauche: React.ReactNode; droite: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">{gauche}</div>
      <div style={{ minWidth: 0 }}>{droite}</div>
    </div>
  );
}

function Boutons({ atelier, titre, html, style, peut, onTirage }: { atelier: string; titre: string; html: string; style: string; peut: boolean; onTirage: () => void }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      <button type="button" className="btn sm" onClick={onTirage}>🎲 Autre tirage</button>
      <button type="button" className="btn primary sm" disabled={!peut} onClick={() => void imprimerAtelier(atelier, titre, html, STYLE_FEUILLE + style)}>🖨 Imprimer</button>
      <BoutonBureau disabled={!peut} onEnregistrer={() => enregistrerSurLeBureau(atelier, titre, html, STYLE_FEUILLE + style)} />
    </div>
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
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0 }}>Phrases en désordre</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Les mots d'une phrase sur des étiquettes mélangées : on découpe, on remet en ordre, on colle ou on recopie. La majuscule et le point guident.
        </p>
        <Field label="Les phrases, une par ligne">
          <Textarea rows={7} value={r.phrases} onChange={(e) => maj({ phrases: e.target.value })} placeholder={"Le chat dort sur le canapé.\nOù est mon cartable ?"} />
        </Field>
        <Coche on={r.lignes} libelle="Une ligne sous les étiquettes, pour coller ou recopier" onChange={(v) => maj({ lignes: v })} />
        <Coche on={r.capitales} libelle="Lettres en capitales" onChange={(v) => maj({ capitales: v })} />
        <div className="meta" style={{ fontSize: 12.5 }}>{phrases.length} phrases.</div>
        <Boutons atelier="phrases" titre="Phrases en désordre" html={html} style={STYLE_PHRASES} peut={phrases.length > 0} onTirage={() => setGraine(graineAuHasard())} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_PHRASES} />}
    />
  );
}
