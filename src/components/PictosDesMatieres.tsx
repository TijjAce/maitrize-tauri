import React from "react";
import { api } from "../api";
import { ecrireLexique, lireLexique, type Lexique } from "../caa";
import type { RefPicto } from "../pictosAppoint";
import { ChoixPictoConsigne } from "./ChoixPictoConsigne";
import { usePictoImage } from "./ChoixPicto";
import { toast } from "./Toaster";
import { EVT_DONNEES_DISTANTES } from "./ui";
import {
  CLE_MATIERES, MATIERES_EN_PICTOS, domainesParMatiere, etiquetteDeMatiere, formeDuNom, motsDuNom, pictoChoisi, pictosProposes,
} from "../pictosMatieres";

// ── Réglages › Personnalisation › Les pictos des matières ──────────────────
//
// Le picto de chaque matière — les mêmes que dans la page CAA —, et sous elle
// de chacun de ses domaines, ceux des référentiels actifs. Le déroulement des
// tablettes montre celui du domaine, et lui seul ; le rituel, celui de
// « Rituel ». Sans choix, la banque propose le picto du nom, en pâle.

export function PictosDesMatieres() {
  const [choix, setChoix] = React.useState<Lexique>({});
  const [domaines, setDomaines] = React.useState<Record<string, string[]>>({});
  const [proposes, setProposes] = React.useState<Record<string, number>>({});
  const [enChoix, setEnChoix] = React.useState<string | null>(null);

  React.useEffect(() => {
    const lire = () => api.settingGet(CLE_MATIERES).then((b) => setChoix(lireLexique(b))).catch(() => {});
    void lire();
    api.referentielsList().then((refs) => setDomaines(domainesParMatiere(refs))).catch(() => {});
    // Un picto choisi sur l'autre ordinateur arrive avec la synchronisation.
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
  }, []);

  const noms = React.useMemo(() => MATIERES_EN_PICTOS.flatMap((m) => [m, ...(domaines[m] ?? [])]), [domaines]);
  React.useEffect(() => {
    let vivant = true;
    pictosProposes(noms).then((p) => { if (vivant) setProposes(p); }).catch(() => {});
    return () => { vivant = false; };
  }, [noms]);

  /** Retient le picto d'un nom — `null` : on le retire —, sous ce nom-là seulement. */
  const choisir = (nom: string, ref: RefPicto | null) => {
    const suite = Object.fromEntries(Object.entries(choix).filter(([k]) => formeDuNom(k) !== formeDuNom(nom)));
    if (ref != null) suite[nom] = ref;
    setChoix(suite);
    api.settingSet(CLE_MATIERES, ecrireLexique(suite)).catch((e) => toast(`Picto non enregistré : ${e}`, { icone: "⚠️" }));
  };

  return (
    <>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Le picto de chaque matière — le même que dans la page CAA — et de ses domaines, ceux de vos référentiels. Sur les
        tablettes, le déroulement d'un créneau montre celui du domaine, et lui seul : le domaine de chaque fiche, celui de la
        séance ; le rituel, celui de « Rituel ». Tant que vous n'en choisissez pas, la banque d'images en propose un d'après le nom, en pâle.
      </p>
      {MATIERES_EN_PICTOS.map((m) => (
        <React.Fragment key={m}>
          <LigneDePicto nom={etiquetteDeMatiere(m)} choisi={pictoChoisi(choix, m)} propose={proposes[m]}
            onChoisir={() => setEnChoix(m)} onRetirer={() => choisir(m, null)} />
          {(domaines[m] ?? []).map((d) => (
            <LigneDePicto key={d} nom={d} domaine choisi={pictoChoisi(choix, d)} propose={proposes[d]}
              onChoisir={() => setEnChoix(d)} onRetirer={() => choisir(d, null)} />
          ))}
        </React.Fragment>
      ))}
      {enChoix && (
        <ChoixPictoConsigne verbe={etiquetteDeMatiere(enChoix)} recherche={motsDuNom(enChoix)[0]}
          actuel={pictoChoisi(choix, enChoix) ?? proposes[enChoix] ?? null} onClose={() => setEnChoix(null)}
          onValider={(ref) => { choisir(enChoix, ref); setEnChoix(null); }} />
      )}
    </>
  );
}

/** Une matière ou un domaine : son picto — choisi, ou proposé en pâle —, et de quoi le changer. */
function LigneDePicto({ nom, domaine = false, choisi, propose, onChoisir, onRetirer }: {
  nom: string; domaine?: boolean; choisi: RefPicto | null; propose: number | undefined; onChoisir: () => void; onRetirer: () => void;
}) {
  const src = usePictoImage(choisi ?? propose ?? null, true);
  return (
    <div className={`pm-ligne${domaine ? " domaine" : ""}`}>
      <button type="button" className="pm-image" onClick={onChoisir} aria-label={`Choisir le picto de « ${nom} »`}>
        {src ? <img src={src} alt="" className={choisi != null ? "" : "propose"} /> : <span className="pm-vide">＋</span>}
      </button>
      <div className="pm-nom">
        {domaine ? <>↳ {nom}</> : nom}
        {choisi == null && propose != null && <span className="meta"> · proposé</span>}
      </div>
      <button type="button" className="btn ghost sm" onClick={onChoisir}>Choisir…</button>
      {choisi != null && <button type="button" className="btn ghost sm" onClick={onRetirer}>Retirer</button>}
    </div>
  );
}
