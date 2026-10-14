import React from "react";
import { api, MATIERES } from "../api";
import { ChoixPicto, usePictoImage } from "./ChoixPicto";
import { toast } from "./Toaster";
import { EVT_DONNEES_DISTANTES } from "./ui";
import { cleImage, type PictoPose } from "../supportsVisuels";
import { CLE_PICTOS_MATIERES, domainesParMatiere, formeDuNom, lirePictosMatieres, pictoChoisi, pictosProposes } from "../pictosDesMatieres";

// ── Réglages › Général › Pictos des matières ──────────────────────────────
//
// Le picto de chaque matière, et sous elle de chacun de ses domaines — ceux
// des référentiels actifs. Le déroulement des tablettes les prend : une fiche
// celui de son domaine, sinon de sa matière ; le rituel, celui de « Rituel ».
// Sans choix, la banque propose le picto de leur nom, en pâle.

export function PictosDesMatieres() {
  const [choix, setChoix] = React.useState<Record<string, PictoPose>>({});
  const [domaines, setDomaines] = React.useState<Record<string, string[]>>({});
  const [proposes, setProposes] = React.useState<Record<string, number>>({});
  const [banque, setBanque] = React.useState(false);
  const [enChoix, setEnChoix] = React.useState<string | null>(null);

  React.useEffect(() => {
    const lire = () => api.settingGet(CLE_PICTOS_MATIERES).then((b) => setChoix(lirePictosMatieres(b))).catch(() => {});
    void lire();
    api.referentielsList().then((refs) => setDomaines(domainesParMatiere(refs))).catch(() => {});
    api.arasaacEtat().then((e) => setBanque(Boolean(e.installee))).catch(() => {});
    // Un picto choisi sur l'autre ordinateur arrive avec la synchronisation.
    window.addEventListener(EVT_DONNEES_DISTANTES, lire);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, lire);
  }, []);

  const noms = React.useMemo(() => MATIERES.flatMap((m) => [m, ...(domaines[m] ?? [])]), [domaines]);
  React.useEffect(() => {
    let vivant = true;
    pictosProposes(noms).then((p) => { if (vivant) setProposes(p); }).catch(() => {});
    return () => { vivant = false; };
  }, [noms]);

  /** Retient le picto d'un nom — vide : on le retire —, sous ce nom-là seulement. */
  const choisir = (nom: string, p: PictoPose | null) => {
    const suite = Object.fromEntries(Object.entries(choix).filter(([k]) => formeDuNom(k) !== formeDuNom(nom)));
    if (p && (p.id != null || p.photo)) suite[nom] = p;
    setChoix(suite);
    api.settingSet(CLE_PICTOS_MATIERES, JSON.stringify(suite)).catch((e) => toast(`Picto non enregistré : ${e}`, { icone: "⚠️" }));
  };

  return (
    <>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Le picto de chaque matière et de ses domaines — ceux de vos référentiels. Sur les tablettes, le déroulement d'un créneau
        les montre : chaque fiche avec celui de son domaine, sinon de sa matière ; le rituel avec celui de « Rituel ». Tant que
        vous n'en choisissez pas, la banque d'images en propose un d'après le nom, en pâle.
      </p>
      {MATIERES.map((m) => (
        <React.Fragment key={m}>
          <LigneDePicto nom={m} choisi={pictoChoisi(choix, m)} propose={proposes[m]} onChoisir={() => setEnChoix(m)} onRetirer={() => choisir(m, null)} />
          {(domaines[m] ?? []).map((d) => (
            <LigneDePicto key={d} nom={d} domaine choisi={pictoChoisi(choix, d)} propose={proposes[d]}
              onChoisir={() => setEnChoix(d)} onRetirer={() => choisir(d, null)} />
          ))}
        </React.Fragment>
      ))}
      {enChoix && (
        <ChoixPicto valeur={pictoChoisi(choix, enChoix) ?? { id: proposes[enChoix] ?? null, mot: enChoix }} banque={banque} photos
          titre={`Le picto de « ${enChoix} »`} onClose={() => setEnChoix(null)}
          onValider={(p) => { choisir(enChoix, p); setEnChoix(null); }} />
      )}
    </>
  );
}

/** Une matière ou un domaine : son picto — choisi, ou proposé en pâle —, et de quoi le changer. */
function LigneDePicto({ nom, domaine = false, choisi, propose, onChoisir, onRetirer }: {
  nom: string; domaine?: boolean; choisi: PictoPose | null; propose: number | undefined; onChoisir: () => void; onRetirer: () => void;
}) {
  const src = usePictoImage(choisi ? cleImage(choisi) : propose ?? null, true);
  return (
    <div className={`pm-ligne${domaine ? " domaine" : ""}`}>
      <button type="button" className="pm-image" onClick={onChoisir} aria-label={`Choisir le picto de « ${nom} »`}>
        {src ? <img src={src} alt="" className={choisi ? "" : "propose"} /> : <span className="pm-vide">＋</span>}
      </button>
      <div className="pm-nom">
        {domaine ? <>↳ {nom}</> : nom}
        {!choisi && propose != null && <span className="meta"> · proposé</span>}
      </div>
      <button type="button" className="btn ghost sm" onClick={onChoisir}>Choisir…</button>
      {choisi && <button type="button" className="btn ghost sm" onClick={onRetirer}>Retirer</button>}
    </div>
  );
}
