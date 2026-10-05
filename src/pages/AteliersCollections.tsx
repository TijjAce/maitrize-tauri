import React from "react";
import { Field, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille, useOptionsFeuille } from "../components/OptionsFeuille";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDeCollections } from "../components/SequenceDeCollections";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { NIVEAUX, type Niveau } from "../categoriser";
import {
  DISPOSITIONS, FORMES, QUANTITE_MAX, REGLAGES_COLLECTIONS, REPERES, REPRESENTATIONS, SITUATIONS, STYLE_COLLECTIONS,
  cequiManque, htmlCollections, idsDesImages, nomDeLaForme, reglagesDuNiveau, reglagesSurs, situationDe,
  type Forme, type ReglagesCollections, type Situation,
} from "../collections";

// ── Fabriquer › Construire des collections ────────────────────────────────
//
// « Constituer une collection d'un cardinal donné » : les situations du guide
// « La construction du nombre à l'école maternelle » (2023) et des livrets
// 2025 — les poupées, le dortoir des oursons, les voyageurs —, avec ce
// qu'elles font imprimer. On règle à gauche, la feuille se voit à droite
// telle qu'elle s'imprimera ; et la séquence se crée d'un clic.

const ATELIER = "collections";

const Coche = ({ on, libelle, onChange, titre }: { on: boolean; libelle: string; onChange: (v: boolean) => void; titre?: string }) => (
  <label className="pb-coche" title={titre}><input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} /><span>{libelle}</span></label>
);

/** Ajoute ou retire un choix, sans jamais vider la liste : il reste au moins une disposition, une représentation. */
const basculer = <T,>(liste: T[], v: T, on: boolean): T[] =>
  on ? (liste.includes(v) ? liste : [...liste, v]) : liste.length > 1 ? liste.filter((x) => x !== v) : liste;

const NOMBRES = Array.from({ length: QUANTITE_MAX }, (_, i) => i + 1);

export function CollectionsTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesCollections>(ATELIER, REGLAGES_COLLECTIONS);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const ids = React.useMemo(() => (banque ? idsDesImages(r) : []), [banque, r]);
  const images = usePictoImages(ids);
  const s = situationDe(r.situation);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlCollections(r, images, hasard(graine)), [r, images, graine]);
  const titre = `${nomDeLaForme(r.forme)}${r.forme === "fiches" || r.forme === "bons" ? ` — ${s.nom}` : ""}`;
  // L'impression attend les images, et garde le tirage de l'aperçu.
  const feuilleImprimee = async () => htmlCollections(r, banque ? await chargerImages(ids) : {}, hasard(graine));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_COLLECTIONS); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const tirage = (r.forme === "fiches" && r.dispositions.some((d) => d === "vrac" || d === "groupes")) || r.forme === "panier";
  // Ce que le pli règle, dit sur sa ligne : on sait ce qui sortira sans l'ouvrir.
  const { options } = useOptionsFeuille(ATELIER);
  const resume = [
    r.forme === "fiches" && (r.places === "dessins" ? `des ${s.place.pluriel} dessinés` : "des ronds"),
    r.forme === "fiches" && (r.grandes ? "une fiche par page" : "deux fiches par page"),
    !options.consigne && "sans consigne", !options.prenom && "sans prénom", !options.corrige && "sans clé",
  ].filter(Boolean).join(", ");
  const imageDe = (picto: number) => images[picto];
  const sansChiffre = r.representations.filter((x) => x !== "chiffre");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Construire des collections</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          « Constituer une collection d'un cardinal donné » : aller chercher juste ce qu'il faut, puis le commander — les situations du guide
          « La construction du nombre à l'école maternelle » (2023) et des livrets d'accompagnement de 2025.
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
        <Field label="La situation">
          <Select value={r.situation} onChange={(e) => maj({ situation: e.target.value as Situation })}>
            {SITUATIONS.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
          </Select>
        </Field>
        <div className="cl-situation">
          {imageDe(s.objet.picto) && <img src={imageDe(s.objet.picto)} alt="" />}
          <span>{s.objet.article} {s.objet.mot} par {s.place.mot}</span>
          {imageDe(s.place.picto) && <img src={imageDe(s.place.picto)} alt="" />}
          <span className="meta">— d'après {s.source}</span>
        </div>
        <Field label="Le matériel">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as Forme })}>
            {FORMES.map((f) => <option key={f.id} value={f.id}>{f.nom} — {f.quoi}</option>)}
          </Select>
        </Field>
        {r.forme !== "evaluation" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <Field label="De">
              <Select value={r.de} onChange={(e) => { const de = Number(e.target.value); maj({ de, a: Math.max(de, r.a) }); }}>
                {NOMBRES.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
            <Field label="À">
              <Select value={r.a} onChange={(e) => { const a = Number(e.target.value); maj({ a, de: Math.min(r.de, a) }); }}>
                {NOMBRES.map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </Field>
          </div>
        )}
        {r.forme === "fiches" && (
          <Field label="Les places">
            {DISPOSITIONS.map((d) => (
              <Coche key={d.id} on={r.dispositions.includes(d.id)} libelle={`${d.nom} — ${d.quoi}`}
                onChange={(on) => maj({ dispositions: basculer(r.dispositions, d.id, on) })} />
            ))}
          </Field>
        )}
        {(r.forme === "cartes" || r.forme === "panier") && (
          <Field label={r.forme === "panier" ? "Les messages" : "Sur les cartes"}>
            {r.forme === "cartes"
              ? REPRESENTATIONS.map((x) => (
                <Coche key={x.id} on={r.representations.includes(x.id)} libelle={x.nom}
                  onChange={(on) => maj({ representations: basculer(r.representations, x.id, on) })} />
              ))
              : <>
                  <Coche on={r.representations.includes("chiffre")} libelle="Les nombres écrits en chiffres — décoché, en points"
                    onChange={(on) => maj({ representations: on ? [...sansChiffre, "chiffre"] : sansChiffre.length ? sansChiffre : ["points"] })} />
                  <Coche on={r.commeLeMessage} libelle="Les œufs des bons paniers rangés comme le message, en deux groupes — la première étape"
                    onChange={(commeLeMessage) => maj({ commeLeMessage })} />
                </>}
          </Field>
        )}
        {/* Un pli : la présentation se règle une fois, puis se tait. */}
        <details className="pli">
          <summary>Présentation{resume && <span className="meta"> · {resume}</span>}</summary>
          {r.forme === "fiches" && (
            <>
              <Coche on={r.places === "dessins"} libelle={`Dessiner les places : des ${s.place.pluriel} — décoché, de simples ronds, vers l'abstraction`}
                onChange={(on) => maj({ places: on ? "dessins" : "ronds" })} />
              <Coche on={r.grandes} libelle="Une fiche par page, au fond d'une boîte de ramette — décoché, deux par page"
                onChange={(grandes) => maj({ grandes })} />
            </>
          )}
          <CasesFeuille />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          {tirage && <button type="button" className="btn sm" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>}
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_COLLECTIONS)} />
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setEnSequence(true)}
          title="Une séquence d'après le programme, le guide et les livrets Éduscol, avec les feuilles de cette situation dans ses séances">
          📚 Créer une séquence avec cette situation
        </button>
        {enSequence && <SequenceDeCollections reglages={r} competences={competences} banque={banque} onClose={() => setEnSequence(false)} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <ApercuFeuille html={html} style={STYLE_COLLECTIONS} />
      </div>
    </div>
  );
}
