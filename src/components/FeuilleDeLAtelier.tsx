import React from "react";
import { CompetencesAtelier, useCompetencesAtelier, useCompetencesParObjectif } from "./CompetencesAtelier";
import { ConsigneAtelier, useConsigneAtelier } from "./ConsigneAtelier";
import { OptionsFeuille, useOptionsFeuille } from "./OptionsFeuille";
import { PictosAtelier, useEtatDesPictos } from "./PictosAtelier";
import { objectifsDesAteliers, propositionsDesAteliers, unionDesCompetences } from "../ateliersCompetences";
import { feuillesPubliees } from "../optionsFeuille";
import { useModeDys, useModeImages } from "./PresentationFeuille";
import { MODES_IMAGES, MODE_IMAGES_DEFAUT } from "../imagesSelonMode";
import { CONSIGNE_DANS_L_ATELIER } from "../consigneAtelier";
import { api } from "../api";
import { Select } from "./ui";
import { Aide } from "./Aide";
import { domainesParMatiere } from "../pictosMatieres";
import {
  EVT_MATIERE_DE_LA_FEUILLE, MATIERES_DES_FEUILLES, cleMatiereDeLaFeuille, lireMatiereDeFeuille, matiereEnClair, matiereParDefaut,
  niveauxDeLaClasse, type MatiereDeFeuille,
} from "../matiereDesFeuilles";

// ── La feuille de l'atelier, en une ligne ──────────────────────────────────
//
// Tout ce qui touche à la feuille imprimée — ce qu'on y met, sa consigne,
// les pictos de la consigne, les compétences en marge — se réglait en quatre
// bandeaux empilés au-dessus de chaque atelier : on ne voyait plus l'atelier.
// Ils tiennent ici dans un seul bloc replié, dont la ligne dit l'essentiel ;
// on l'ouvre le jour où l'on veut changer quelque chose.

const SANS: Record<"consigne" | "prenom" | "corrige", string> = {
  consigne: "sans la consigne", prenom: "sans prénom ni date", corrige: "sans la correction",
};

/**
 * La matière de la feuille (voir matiereDesFeuilles) : celle que l'enseignant a
 * choisie pour l'atelier, celle que l'atelier propose, et les domaines de
 * chaque matière, lus dans les référentiels.
 */
function useMatiereDeLaFeuille(atelier: string) {
  const [etat, setEtat] = React.useState<{ choisie: MatiereDeFeuille | null; defaut: MatiereDeFeuille | null; domaines: Record<string, string[]> }>(
    { choisie: null, defaut: null, domaines: {} });
  React.useEffect(() => {
    if (!atelier) return;
    let vivant = true;
    const lire = async () => {
      const [brut, reglages, referentiels] = await Promise.all([
        api.settingGet(cleMatiereDeLaFeuille(atelier)).catch(() => null),
        api.settingsAll().catch((): Record<string, string> => ({})),
        api.referentielsList().catch(() => []),
      ]);
      if (vivant) setEtat({ choisie: lireMatiereDeFeuille(brut), defaut: matiereParDefaut(atelier, niveauxDeLaClasse(reglages)), domaines: domainesParMatiere(referentiels) });
    };
    const relire = () => { void lire(); };
    relire();
    window.addEventListener(EVT_MATIERE_DE_LA_FEUILLE, relire);
    return () => { vivant = false; window.removeEventListener(EVT_MATIERE_DE_LA_FEUILLE, relire); };
  }, [atelier]);
  const choisir = React.useCallback((m: MatiereDeFeuille | null) => {
    void api.settingSet(cleMatiereDeLaFeuille(atelier), m ? JSON.stringify(m) : "")
      .then(() => window.dispatchEvent(new Event(EVT_MATIERE_DE_LA_FEUILLE))).catch(() => {});
  }, [atelier]);
  return { ...etat, choisir };
}

/** La matière que chaque PDF de l'atelier emporte : la carte de la fiche, sur les tablettes, la montre. */
function MatiereDeLaFeuille({ atelier }: { atelier: string }) {
  const { choisie, defaut, domaines, choisir } = useMatiereDeLaFeuille(atelier);
  const matiere = choisie?.matiere ?? "";
  const siens = matiere ? domaines[matiere] ?? [] : [];
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "2px 0 10px" }}>
      <span className="meta">Matière</span>
      <Select value={matiere} aria-label="La matière de la feuille" style={{ maxWidth: 400 }}
        onChange={(e) => choisir(e.target.value ? { matiere: e.target.value, domaine: "" } : null)}>
        <option value="">{defaut ? `Selon l'atelier : ${matiereEnClair(defaut)}` : "Selon les compétences de la feuille"}</option>
        {MATIERES_DES_FEUILLES.map((m) => <option key={m} value={m}>{m}</option>)}
      </Select>
      {matiere && siens.length > 0 && (
        <Select value={choisie?.domaine ?? ""} aria-label="Le domaine de la feuille" style={{ maxWidth: 320 }}
          onChange={(e) => choisir({ matiere, domaine: e.target.value })}>
          <option value="">Sans domaine</option>
          {siens.map((d) => <option key={d} value={d}>{d}</option>)}
        </Select>
      )}
      <Aide titre="La matière de la feuille">
        <p>Chaque PDF fabriqué ici emporte sa matière et son domaine. Quand un créneau le cite, la carte de l'élève sur les
          tablettes et dans la journée en bandes les montre, avec leur picto, sans les deviner d'après le titre.</p>
        <p>Sans choix, c'est la matière de la première compétence de la feuille, sinon celle de l'atelier.</p>
      </Aide>
    </div>
  );
}

/** Ce que la ligne repliée résume : la matière, la consigne, les pictos, ce qui manque sur la feuille, les compétences. */
export function useResumeDeLaFeuille(atelier: string): string {
  const consigne = useConsigneAtelier(atelier);
  const { montres, sansPicto } = useEtatDesPictos(atelier);
  const { options } = useOptionsFeuille(atelier);
  const contenu = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.lire(atelier));
  // Un atelier qui travaille par objectif : les compétences de la feuille sont celles des objectifs retenus.
  const objectifs = React.useSyncExternalStore(objectifsDesAteliers.abonner, () => objectifsDesAteliers.lire(atelier));
  const [deLAtelier] = useCompetencesAtelier(atelier);
  const parObjectif = useCompetencesParObjectif(atelier);
  const competences = objectifs.length ? unionDesCompetences(objectifs.map((o) => parObjectif[o.id] ?? [])) : deLAtelier;
  const proposees = React.useSyncExternalStore(propositionsDesAteliers.abonner, () => propositionsDesAteliers.lire(atelier, objectifs[0]?.id));
  const avecPicto = montres.length - sansPicto.length;
  const [dys] = useModeDys(atelier);
  const [images] = useModeImages(atelier);
  const { choisie, defaut } = useMatiereDeLaFeuille(atelier);
  return [
    matiereEnClair(choisie ?? defaut) || (competences.length ? "" : "matière à choisir"),
    CONSIGNE_DANS_L_ATELIER.has(atelier) ? "" : consigne.trim() ? "consigne réécrite" : "consigne de l'atelier",
    dys ? "mode dyslexique" : "",
    images !== MODE_IMAGES_DEFAUT ? (MODES_IMAGES.find((m) => m.id === images)?.libelle ?? "").toLowerCase() : "",
    !montres.length ? "" : sansPicto.length ? `pictos : ${avecPicto} sur ${montres.length}` : `${montres.length} picto${montres.length > 1 ? "s" : ""}`,
    ...(Object.keys(SANS) as (keyof typeof SANS)[]).filter((c) => contenu[c] && !options[c]).map((c) => SANS[c]),
    competences.length ? `${competences.length} compétence${competences.length > 1 ? "s" : ""}`
      : proposees.length ? `${proposees.length} compétence${proposees.length > 1 ? "s" : ""} proposée${proposees.length > 1 ? "s" : ""}`
      : objectifs.length ? "compétences à choisir pour cet objectif" : "compétences à choisir",
  ].filter(Boolean).join(" · ");
}

/** Le bloc replié, et ses quatre réglages une fois ouvert. */
export function FeuilleDeLAtelier({ atelier, nom }: { atelier: string; nom: string }) {
  const resume = useResumeDeLaFeuille(atelier);
  const objectifs = React.useSyncExternalStore(objectifsDesAteliers.abonner, () => objectifsDesAteliers.lire(atelier));
  return (
    <details className="comp-atelier feuille-atelier">
      <summary>
        🖨 La feuille
        <span className="meta">{resume}</span>
      </summary>
      <div className="feuille-atelier-corps">
        <MatiereDeLaFeuille atelier={atelier} />
        <OptionsFeuille atelier={atelier} />
        {!CONSIGNE_DANS_L_ATELIER.has(atelier) && <ConsigneAtelier atelier={atelier} />}
        <PictosAtelier atelier={atelier} />
        <CompetencesAtelier atelier={atelier} nom={nom} objectifs={objectifs} />
      </div>
    </details>
  );
}
