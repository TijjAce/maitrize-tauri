import React from "react";
import { Aide } from "../components/Aide";
import { Field, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille } from "../components/OptionsFeuille";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDuVilainPetitCanard } from "../components/SequenceDuVilainPetitCanard";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { demarcheDe } from "../demarches";
import { DEMARCHE_VPC } from "../demarchesVilainPetitCanard";
import { IDS_VPC, NIVEAUX_VPC, feuillesDeLaSequence, type NiveauVpc } from "../vilainPetitCanard";

// ── Fabriquer › Le Vilain Petit Canard ────────────────────────────────────
//
// La séquence de vocabulaire du guide « Pour enseigner le vocabulaire à
// l'école maternelle » (Éduscol, 2020, p. 71-76) : chaque feuille de ses
// séances, à voir et à imprimer une à une, ou toute la séquence d'un clic.

const ATELIER = "vilainPetitCanard";

interface ReglagesVpc { niveau: NiveauVpc; feuille: string }
const REGLAGES_VPC: ReglagesVpc = { niveau: "MS", feuille: "familles-cartes" };

const NOMS_DES_ATELIERS: Record<string, string> = { categoriser: "Catégoriser les mots", suites: "Images séquentielles" };

export function VilainPetitCanardTab() {
  const [brut, maj] = useReglages<ReglagesVpc>(ATELIER, REGLAGES_VPC);
  const niveau: NiveauVpc = brut.niveau === "GS" ? "GS" : "MS";
  const feuilles = React.useMemo(() => feuillesDeLaSequence(niveau), [niveau]);
  const f = feuilles.find((x) => x.id === brut.feuille) ?? feuilles[0];
  const demarche = demarcheDe(DEMARCHE_VPC[niveau]);
  const [graine, setGraine] = useGraine();
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const images = usePictoImages(IDS_VPC);
  const sortie = React.useMemo(() => f.fabriquer(images, hasard(graine)), [f, images, graine]);
  // L'impression attend toutes les images, et tire comme l'aperçu.
  const feuilleImprimee = async () => f.fabriquer(await chargerImages(IDS_VPC), hasard(graine));
  const imprimer = async () => {
    try {
      const { html, style } = await feuilleImprimee();
      await imprimerAtelier(ATELIER, f.titre, html, STYLE_FEUILLE + style);
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const seances = demarche?.seances ?? [];
  const venue = NOMS_DES_ATELIERS[f.atelier];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le Vilain Petit Canard
          <Aide titre="D'où vient cette séquence" vers="droite">
            <p>{"« Pour enseigner le vocabulaire à l'école maternelle » (Éduscol, 2020), Focus « Un exemple de séquence en moyenne et grande sections à partir d'un conte traditionnel », p. 71-76, d'après l'album d'Attilio Cassinelli (Gallimard Jeunesse, 2018)."}</p>
            <p>{"En moyenne section, les mots des émotions et les verbes de la naissance des poussins ; en grande section, les expressions synonymes de « marcher à la queue leu leu » — les synonymots, dont le principe vient de Micheline Cellier (Retz, 2015)."}</p>
            <p>{"L'album est le vôtre : ni son texte ni ses images ne sont dans l'application. Les fiches documentaires, les devinettes et le résumé de l'histoire sont écrits pour elle."}</p>
            <p>{"Le cygne femelle, le cygneau et l'oison n'ont pas de pictogramme à eux : ils prennent celui de leur famille. Dans une séance, « Modifier dans Fabriquer » ouvre la feuille dans son atelier, où l'on met ses photos."}</p>
          </Aide>
        </h3>
        <Field label="Classe">
          <div className="seg">
            {NIVEAUX_VPC.map((n) => (
              <button key={n.id} type="button" className={niveau === n.id ? "active" : ""} title={n.age}
                onClick={() => maj({ niveau: n.id })}>{n.id}</button>
            ))}
          </div>
        </Field>
        <Field label="La feuille">
          <Select value={f.id} onChange={(e) => maj({ feuille: e.target.value })}>
            {seances.map((s, i) => {
              const dans = feuilles.filter((x) => x.seance === i);
              return dans.length ? (
                <optgroup key={s.titre} label={`${i + 1}. ${s.titre}`}>
                  {dans.map((x) => <option key={x.id} value={x.id}>{x.titre}</option>)}
                </optgroup>
              ) : null;
            })}
          </Select>
        </Field>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: "0 0 6px" }}>
          Séance {f.seance + 1} : {seances[f.seance]?.titre ?? ""}.
          {venue && <> Cette feuille vient de l'atelier « {venue} », réglée pour la séquence.</>}
        </p>
        <CasesFeuille />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button type="button" className="btn sm" onClick={() => setGraine(graineAuHasard())}>🎲 Autre tirage</button>
          <button type="button" className="btn primary sm" onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau onEnregistrer={async () => {
            const { html, style } = await feuilleImprimee();
            return enregistrerSurLeBureau(ATELIER, f.titre, html, STYLE_FEUILLE + style);
          }} />
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setEnSequence(true)}
          title="Les douze séances de la démarche du guide, avec leurs feuilles et la note du matériel">
          📚 Créer la séquence complète ({seances.length} séances, {feuilles.length} feuilles)
        </button>
        {enSequence && <SequenceDuVilainPetitCanard niveau={niveau} competences={competences} onClose={() => setEnSequence(false)} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <ApercuFeuille html={sortie.html} style={sortie.style} />
      </div>
    </div>
  );
}
