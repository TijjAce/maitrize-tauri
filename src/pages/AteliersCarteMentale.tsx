import React from "react";
import { Field, Input } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { CasePicto } from "../components/CasePicto";
import { EditeurCarteMentale } from "../components/EditeurCarteMentale";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { BoutonBureau } from "../components/BoutonBureau";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import {
  BRANCHES_MAX, IDEES_MAX, PALETTE, REGLAGES_CARTE, STYLE_CARTE_MENTALE, brancheVide, cequiManque, htmlCarteMentale, idsDesImages, reglagesSurs,
  type Branche, type ReglagesCarte,
} from "../carteMentale";

// ── Fabriquer › Carte mentale ─────────────────────────────────────────────
//
// L'affichage d'un thème, d'une notion, d'une leçon : le centre, ses
// branches, leurs idées — des mots, avec leur picto si on veut. On compose à
// gauche ; l'affiche se voit à droite telle qu'elle s'imprimera, et se
// reprend sur la feuille même : cadres, tailles, mots, pictos.

const ATELIER = "carteMentale";

const Coche = ({ on, libelle, onChange }: { on: boolean; libelle: string; onChange: (v: boolean) => void }) => (
  <label className="pb-coche"><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

/** Une branche : sa couleur, son image, son titre — et, dépliée, ses idées. */
function CarteBranche({ b, rang, ouverte, onOuvrir, onChange, onRetirer, banque, retirable }: {
  b: Branche; rang: number; ouverte: boolean; onOuvrir: () => void; onChange: (b: Branche) => void; onRetirer: () => void; banque: boolean; retirable: boolean;
}) {
  return (
    <div className="ct-categorie" style={{ borderLeftColor: b.couleur }}>
      <div className="ct-categorie-tete">
        <CasePicto valeur={b.image} banque={banque} titre={`L'image de la branche ${rang + 1}`} taille={30} onChange={(image) => onChange({ ...b, image })} />
        <Input value={b.titre} placeholder={rang === 0 ? "Ce qu'on voit" : "Une branche"} aria-label={`Titre de la branche ${rang + 1}`}
          onChange={(e) => onChange({ ...b, titre: e.target.value })} />
        <button type="button" className="btn ghost sm" onClick={onOuvrir} aria-expanded={ouverte} title={ouverte ? "Replier" : "Ses idées et sa couleur"}>
          {b.idees.length} idée{b.idees.length > 1 ? "s" : ""} {ouverte ? "▾" : "▸"}
        </button>
        <button type="button" className="btn ghost sm" disabled={!retirable} onClick={onRetirer} aria-label={`Retirer la branche ${b.titre || rang + 1}`}>✕</button>
      </div>
      {ouverte && (
        <div className="ct-categorie-corps">
          <div style={{ display: "flex", gap: 4, margin: "2px 0 6px" }}>
            {PALETTE.map((c) => (
              <button key={c.hex} type="button" title={c.nom} aria-label={`Couleur ${c.nom}`} onClick={() => onChange({ ...b, couleur: c.hex })}
                className="dos-pastille" style={{ width: 18, height: 18, background: c.hex, cursor: "pointer", outline: b.couleur === c.hex ? "2px solid var(--text)" : "none" }} />
            ))}
          </div>
          <BanqueDeMots mots={b.idees} banque={banque} affichage onChange={(idees) => onChange({ ...b, idees: idees.slice(0, IDEES_MAX) })}
            aide={`Les idées de la branche, ${IDEES_MAX} au plus : écrivez les mots, la banque leur trouve un picto — ou ajoutez vos photos. `
              + "Sur chaque idée, 🖼 et Aa disent ce que la feuille en montre : cliquez Aa pour ne garder que l'image."} />
        </div>
      )}
    </div>
  );
}

export function CarteMentaleTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesCarte>(ATELIER, REGLAGES_CARTE);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  const [ouverte, setOuverte] = React.useState(-1);
  const ids = React.useMemo(() => idsDesImages(r), [r]);
  const images = usePictoImages(ids);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlCarteMentale(r, images), [r, images]);
  const titre = r.centre.trim() ? `Carte mentale — ${r.centre.trim()}` : "Carte mentale";
  const feuilleImprimee = async () => htmlCarteMentale(r, await chargerImages(ids));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_CARTE_MENTALE); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const changer = (i: number, b: Branche) => maj({ branches: r.branches.map((x, k) => (k === i ? b : x)) });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Carte mentale</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Pour l'affichage : le thème au centre, ses branches autour, chacune à sa couleur, avec ses idées en mots et en images.
          Une page A4 à l'italienne, qui s'agrandit en A3 à la photocopieuse.
        </p>
        <Field label="Au centre">
          <div className="ct-categorie-tete">
            <CasePicto valeur={r.image} banque={banque} titre="L'image du centre" taille={30} onChange={(image) => maj({ image })} />
            <Input value={r.centre} placeholder="Les cinq sens" onChange={(e) => maj({ centre: e.target.value })} />
          </div>
        </Field>
        <Field label={`Les branches (${r.branches.length})`}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {r.branches.map((b, i) => (
              <CarteBranche key={i} b={b} rang={i} banque={banque} ouverte={ouverte === i} retirable={r.branches.length > 2}
                onOuvrir={() => setOuverte(ouverte === i ? -1 : i)} onChange={(x) => changer(i, x)}
                onRetirer={() => { maj({ branches: r.branches.filter((_, k) => k !== i) }); setOuverte(-1); }} />
            ))}
            {r.branches.length < BRANCHES_MAX && (
              <button type="button" className="btn sm" style={{ alignSelf: "flex-start" }}
                onClick={() => { maj({ branches: [...r.branches, brancheVide(r.branches.length)] }); setOuverte(r.branches.length); }}>
                ＋ Une branche
              </button>
            )}
          </div>
        </Field>
        <details className="pli">
          <summary>Présentation<span className="meta"> · {[r.pictos ? "les pictos des idées" : "les mots seuls", r.capitales && "en capitales"].filter(Boolean).join(", ")}</span></summary>
          <Coche on={r.pictos} libelle="Les pictos des idées, à côté de leurs mots" onChange={(pictos) => maj({ pictos })} />
          <Coche on={r.capitales} libelle="Tout écrire en capitales" onChange={(capitales) => maj({ capitales })} />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_CARTE_MENTALE)} />
        </div>
      </div>
      <div style={{ minWidth: 0 }}>
        <EditeurCarteMentale r={r} html={html} onChange={maj} onChoisirBranche={setOuverte} />
      </div>
    </div>
  );
}
