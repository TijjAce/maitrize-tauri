import React from "react";
import { Field, Input } from "../components/ui";
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
