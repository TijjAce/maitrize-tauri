import React from "react";
import { api } from "../api";
import { ecrireLexique, lireLexique, type Lexique } from "../caa";
import type { RefPicto } from "../pictosAppoint";
import { ChoixPictoConsigne } from "./ChoixPictoConsigne";
import { usePictoImage } from "./ChoixPicto";
import { toast } from "./Toaster";
import { EVT_DONNEES_DISTANTES } from "./ui";
import {
  CLE_MATIERES, CLE_PAR_DOMAINE, MATIERES_EN_PICTOS, detailleeParDomaine, domainesParMatiere, etiquetteDeMatiere, formeDuNom, lireParDomaine,
  motsDuNom, pictoChoisi, pictosProposes,
} from "../pictosMatieres";

// ── Réglages › Personnalisation › Les pictos des matières ──────────────────
//
// Le picto de chaque matière — les mêmes que dans la page CAA. Par défaut, ses
// domaines prennent le sien ; « par domaine » détaille une matière : ses
// domaines, ceux des référentiels actifs, paraissent alors, chacun avec le
// picto de la matière tant qu'on ne lui en choisit pas un. Le déroulement des
// tablettes suit ce réglage ; le rituel prend celui de « Rituel ». Sans
// choix, la banque propose le picto de la matière, en pâle.

export function PictosDesMatieres() {
  const [choix, setChoix] = React.useState<Lexique>({});
  const [domaines, setDomaines] = React.useState<Record<string, string[]>>({});
  const [proposes, setProposes] = React.useState<Record<string, number>>({});
  const [parDomaine, setParDomaine] = React.useState<Record<string, boolean>>({});
  const [enChoix, setEnChoix] = React.useState<string | null>(null);

  React.useEffect(() => {
    const lire = () => {
      api.settingGet(CLE_MATIERES).then((b) => setChoix(lireLexique(b))).catch(() => {});
      api.settingGet(CLE_PAR_DOMAINE).then((b) => setParDomaine(lireParDomaine(b))).catch(() => {});
    };
    void lire();
    api.referentielsList().then((refs) => setDomaines(domainesParMatiere(refs))).catch(() => {});
    // Un picto choisi sur l'autre ordinateur arrive avec la synchronisation.
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
  }, []);

  // La banque propose le picto de chaque matière ; un domaine, lui, prend celui de sa matière.
  React.useEffect(() => {
    let vivant = true;
    pictosProposes(MATIERES_EN_PICTOS).then((p) => { if (vivant) setProposes(p); }).catch(() => {});
    return () => { vivant = false; };
  }, []);

  /** Retient le picto d'un nom — `null` : on le retire —, sous ce nom-là seulement. */
  const choisir = (nom: string, ref: RefPicto | null) => {
    const suite = Object.fromEntries(Object.entries(choix).filter(([k]) => formeDuNom(k) !== formeDuNom(nom)));
    if (ref != null) suite[nom] = ref;
    setChoix(suite);
    api.settingSet(CLE_MATIERES, ecrireLexique(suite)).catch((e) => toast(`Picto non enregistré : ${e}`, { icone: "⚠️" }));
  };
  /** Détaille une matière par domaine, ou non : les pictos déjà choisis pour ses domaines restent, sans servir. */
  const detailler = (matiere: string, oui: boolean) => {
    const suite = { ...parDomaine, [matiere]: oui };
    setParDomaine(suite);
    api.settingSet(CLE_PAR_DOMAINE, JSON.stringify(suite)).catch((e) => toast(`Réglage non enregistré : ${e}`, { icone: "⚠️" }));
  };
  /** Le picto qu'une matière montre : celui qu'on a choisi, sinon celui que la banque propose. */
  const pictoDeLaMatiere = (m: string) => pictoChoisi(choix, m) ?? proposes[m] ?? null;
  const matiereDe = (d: string) => MATIERES_EN_PICTOS.find((m) => (domaines[m] ?? []).includes(d));

  return (
    <>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Le picto de chaque matière — le même que dans la page CAA. Sur les tablettes, le déroulement d'un créneau montre celui
        de la matière de chaque fiche et de la séance ; le rituel, celui de « Rituel ». Pour aller dans le détail, cochez
        « par domaine » : les domaines de vos référentiels paraissent, et chacun garde le picto de sa matière tant que vous ne
        lui en choisissez pas un. Tant que vous ne choisissez pas celui d'une matière, la banque d'images en propose un, en pâle.
      </p>
      {MATIERES_EN_PICTOS.map((m) => {
        const sesDomaines = domaines[m] ?? [];
        const detaillee = sesDomaines.length > 0 && detailleeParDomaine(m, parDomaine, sesDomaines, choix);
        return (
          <React.Fragment key={m}>
            <LigneDePicto nom={etiquetteDeMatiere(m)} choisi={pictoChoisi(choix, m)} propose={proposes[m]}
              detail={sesDomaines.length ? { oui: detaillee, combien: sesDomaines.length, basculer: (oui) => detailler(m, oui) } : undefined}
              onChoisir={() => setEnChoix(m)} onRetirer={() => choisir(m, null)} />
            {detaillee && sesDomaines.map((d) => (
              <LigneDePicto key={d} nom={d} domaine choisi={pictoChoisi(choix, d)} herite={pictoDeLaMatiere(m)}
                onChoisir={() => setEnChoix(d)} onRetirer={() => choisir(d, null)} />
            ))}
          </React.Fragment>
        );
      })}
      {enChoix && (
        <ChoixPictoConsigne verbe={etiquetteDeMatiere(enChoix)} recherche={motsDuNom(enChoix)[0]}
          actuel={pictoChoisi(choix, enChoix) ?? pictoDeLaMatiere(matiereDe(enChoix) ?? enChoix)} onClose={() => setEnChoix(null)}
          onValider={(ref) => { choisir(enChoix, ref); setEnChoix(null); }} />
      )}
    </>
  );
}

/**
 * Une matière ou un domaine : son picto — choisi ; pour une matière, proposé en pâle ; pour un domaine, celui de
 * sa matière, en pâle —, de quoi le changer, et pour une matière qui a des domaines, la case qui la détaille.
 */
function LigneDePicto({ nom, domaine = false, choisi, propose, herite, detail, onChoisir, onRetirer }: {
  nom: string; domaine?: boolean; choisi: RefPicto | null; propose?: number; herite?: RefPicto | null;
  detail?: { oui: boolean; combien: number; basculer: (oui: boolean) => void };
  onChoisir: () => void; onRetirer: () => void;
}) {
  const src = usePictoImage(choisi ?? (domaine ? herite : propose) ?? null, true);
  return (
    <div className={`pm-ligne${domaine ? " domaine" : ""}`}>
      <button type="button" className="pm-image" onClick={onChoisir} aria-label={`Choisir le picto de « ${nom} »`}>
        {src ? <img src={src} alt="" className={choisi != null ? "" : "propose"} /> : <span className="pm-vide">＋</span>}
      </button>
      <div className="pm-nom">
        {domaine ? <>↳ {nom}</> : nom}
        {choisi == null && (domaine
          ? herite != null && <span className="meta"> · celui de la matière</span>
          : propose != null && <span className="meta"> · proposé</span>)}
      </div>
      {detail && (
        <label className="pm-detail" title="Donner à chaque domaine de cette matière son propre picto">
          <input type="checkbox" checked={detail.oui} onChange={(e) => detail.basculer(e.target.checked)} />
          par domaine ({detail.combien})
        </label>
      )}
      <button type="button" className="btn ghost sm" onClick={onChoisir}>Choisir…</button>
      {choisi != null && <button type="button" className="btn ghost sm" onClick={onRetirer}>Retirer</button>}
    </div>
  );
}
