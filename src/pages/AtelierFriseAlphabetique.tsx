import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ChoixPoliceCursive } from "../components/ChoixPoliceCursive";
import { usePictoImages } from "../components/ChoixPicto";
import { Field, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  ALPHABET, ECRITURES, REGLAGES_FRISE, htmlFrise, motDuDessin, motsDesLettres, motsParDefaut, reglagesFriseSurs, styleFrise, titreFrise,
  type EcritureDeLettre, type ReglagesFrise,
} from "../friseAlphabetique";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Français › La frise alphabétique ──────────────────────────
//
// Les lettres dans leurs trois écritures, un mot et son dessin chacune ; la
// frise du mur, une lettre par page, ou la bande de la table de l'élève (voir
// friseAlphabetique.ts). Les dessins viennent de la banque, quand elle est là.

const ATELIER = "friseAlphabetique";

const plier = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Les dessins des mots de la frise, par mot : cherchés dans la banque sous leur nom — « wagon » sous « wagonnet ». */
function useDessinsDesMots(mots: string[], actif: boolean): Record<string, string> {
  const [ids, setIds] = React.useState<Record<string, number>>({});
  const cle = mots.join("|");
  React.useEffect(() => {
    if (!actif || !mots.length) { setIds({}); return; }
    let vivant = true;
    const recherches = mots.map(motDuDessin);
    api.arasaacParMots(recherches).then(([trouves]) => {
      if (!vivant) return;
      const parRecherche = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
      setIds(Object.fromEntries(mots.flatMap((m) => {
        const id = parRecherche.get(motDuDessin(m).toLowerCase());
        return id != null ? [[plier(m), id]] : [];
      })));
    }).catch(() => { if (vivant) setIds({}); });
    return () => { vivant = false; };
  }, [cle, actif]); // eslint-disable-line react-hooks/exhaustive-deps
  const images = usePictoImages(Object.values(ids));
  return React.useMemo(() => Object.fromEntries(Object.entries(ids).flatMap(([mot, id]) => (images[id] ? [[mot, images[id]]] : []))), [ids, images]);
}

export function FriseAlphabetiqueTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesFrise>(ATELIER, REGLAGES_FRISE);
  const r = React.useMemo(() => reglagesFriseSurs(brut), [brut]);
  const mots = React.useMemo(() => {
    const parLettre = motsDesLettres(r.mots);
    return ALPHABET.map((l) => parLettre[l]).filter(Boolean);
  }, [r.mots]);
  const dessins = useDessinsDesMots(mots, banque && r.images);
  const html = React.useMemo(() => htmlFrise({ ...r, images: banque && r.images }, dessins), [r, banque, dessins]);
  const style = React.useMemo(() => styleFrise(r), [r]);
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          La frise alphabétique
          <Aide titre="La frise alphabétique" vers="droite"><p>Le programme de 2024 compte la frise alphabétique parmi les outils de la classe dont
            l'élève de CP se sert. Celui de l'école maternelle fait connaître chaque lettre « dans les trois graphies » — la capitale, la script, la
            cursive — et distinguer les lettres qui se ressemblent, b et d, p et q, grâce à la cursive.</p>
            <p>Chaque lettre a son mot, qu'on change à sa guise : une ligne par lettre, la lettre puis le mot. La cursive s'écrit en Marelle, la
            police cursive du ministère, ou dans la police choisie.</p></Aide>
        </h3>
        <Field label="Les écritures">
          <Chips liste={ECRITURES.map((e) => e.id)} choisis={r.ecritures} libelle={(e: EcritureDeLettre) => ECRITURES.find((x) => x.id === e)!.nom}
            onChange={(ecritures) => { if (ecritures.length) maj({ ecritures }); }} />
        </Field>
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as ReglagesFrise["format"] })}>
            <option value="frise">La frise du mur, à mettre bout à bout</option>
            <option value="lettre">Une lettre par page, en grand</option>
            <option value="bande">La bande de la table de l'élève, deux par page</option>
          </Select>
        </Field>
        {r.format === "frise" && (
          <Field label="Lettres par page">
            <Select value={String(r.parPage)} onChange={(e) => maj({ parPage: Number(e.target.value) as ReglagesFrise["parPage"] })}>
              <option value="4">4 — de grandes cases</option>
              <option value="6">6</option>
              <option value="7">7 — quatre pages en tout</option>
            </Select>
          </Field>
        )}
        {r.ecritures.includes("cursive") && <ChoixPoliceCursive />}
        <Coche on={r.voyelles} libelle="Les voyelles en rouge, les consonnes en bleu" onChange={(voyelles) => maj({ voyelles })} />
        {banque && <Coche on={r.images} libelle="Le dessin de chaque mot" onChange={(images) => maj({ images })} />}
        <Field label="Les mots, une ligne par lettre">
          <textarea className="textarea" rows={8} value={r.mots} spellCheck={false} onChange={(e) => maj({ mots: e.target.value })} />
        </Field>
        {r.mots !== motsParDefaut() && (
          <button type="button" className="btn ghost sm" onClick={() => maj({ mots: motsParDefaut() })}>Remettre les mots de la frise</button>
        )}
        <Boutons atelier={ATELIER} titre={titreFrise(r)} html={html} style={style} peut />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
