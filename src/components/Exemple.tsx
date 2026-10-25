import React from "react";
import { api } from "../api";
import { EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { MOTS_PAR_THEME, themesDeDepart, type ThemeDeDepart } from "../departsEnUnClic";
import { melanger } from "../hasard";
import { pictosDesMots } from "../mesPictos";
import type { MotImage } from "../jeuxSons";
import { uneImageParMot } from "../loto";
import { BoutonMesImages } from "./MesImages";
import { useProjetDuMoment } from "./ProjetDuMoment";
import { toast } from "./Toaster";
import { useAsync } from "./ui";

// L'exemple d'un générateur : tant que l'atelier est vide, l'aperçu montre
// une vraie feuille, faite d'un exemple — ce que donnera la feuille une fois
// remplie (voir exemplesDesAteliers.ts). Un bandeau le dit ; « Partir de cet
// exemple » le fait entrer dans l'atelier, et rien d'autre ne l'y fait entrer.

/** Ce qu'un atelier à mots offre de plus sous l'exemple : partir d'un thème, du projet ou de ses images, d'un clic. */
export interface Departs {
  onMots: (mots: MotImage[]) => void;
  /** La banque de pictogrammes est là : les thèmes peuvent se piocher. */
  banque: boolean;
}

/** L'aperçu d'un exemple, sous son bandeau. */
export function ApercuExemple({ children, onPrendre, departs }: { children: React.ReactNode; onPrendre?: () => void; departs?: Departs }) {
  return (
    <div className="apercu-exemple">
      <div className="apercu-exemple-bandeau">
        <span className="apercu-exemple-titre">Exemple</span>
        {onPrendre && <button type="button" className="btn sm" onClick={onPrendre}>Partir de cet exemple</button>}
      </div>
      {departs && <DepartsEnUnClic {...departs} />}
      {children}
    </div>
  );
}

/** Démarrer en un clic : des thèmes adaptés à la classe, les mots du projet du moment, ses images (voir departsEnUnClic.ts). */
function DepartsEnUnClic({ onMots, banque }: Departs) {
  const { data: niveauClasse } = useAsync(() => api.settingGet("niveauClasse").catch(() => null), []);
  const { projet, corpus } = useProjetDuMoment();
  const [occupe, setOccupe] = React.useState(false);
  const remplir = async (lire: () => Promise<MotImage[]>) => {
    setOccupe(true);
    try {
      const mots = await lire();
      if (mots.length) onMots(mots);
      else toast("Rien à prendre ici pour l'instant.", { icone: "ℹ️" });
    } catch (e) { toast(String(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };
  const piocher = (t: ThemeDeDepart) => remplir(async () => {
    const vivier = await api.arasaacSelection([t.categorie], EXCLUES_PAR_DEFAUT, false, 0, 1);
    return melanger(Math.random, uneImageParMot(vivier).map((x) => x.picto)).slice(0, MOTS_PAR_THEME).map((p) => ({ id: p.id, mot: p.mot }));
  });
  return (
    <div className="apercu-exemple-departs">
      <span className="meta">Ou partir de</span>
      {banque && niveauClasse !== undefined && themesDeDepart(niveauClasse).map((t) => (
        <button key={t.categorie} type="button" className="btn sm" disabled={occupe} onClick={() => void piocher(t)}>{t.icone} {t.libelle}</button>
      ))}
      {projet && corpus.mots.length > 0 && (
        <button type="button" className="btn sm" disabled={occupe} onClick={() => void remplir(() => motsAvecImages(corpus.mots))}>📌 {projet.titre}</button>
      )}
      <BoutonMesImages disabled={occupe} onImages={(images) => { if (images.length) onMots(images.map((i) => ({ id: i.id, mot: i.mot }))); }}>🖼 Mes images</BoutonMesImages>
    </div>
  );
}

/** Les mots d'exemple déjà cherchés dans la banque : on ne les cherche qu'une fois. */
const dejaLus = new Map<string, MotImage[]>();

/** Chaque mot avec l'image que la banque — ou Mes pictos — lui donne ; sans image, le mot seul. */
export async function motsAvecImages(mots: readonly string[]): Promise<MotImage[]> {
  const cle = mots.join("|");
  const deja = dejaLus.get(cle);
  if (deja) return deja;
  const [trouves] = await pictosDesMots([...mots]).catch((): [{ id: number; mot: string }[], string[]] => [[], [...mots]]);
  const parMot = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
  const liste = mots.map((mot) => ({ id: parMot.get(mot.toLowerCase()) ?? null, mot }));
  dejaLus.set(cle, liste);
  return liste;
}

/** Les mots d'un exemple, avec leurs images, tant que `actif` ; rien sinon. */
export function useMotsExemple(mots: readonly string[], actif: boolean): MotImage[] | null {
  const cle = mots.join("|");
  const [lus, setLus] = React.useState<MotImage[] | null>(() => dejaLus.get(cle) ?? null);
  React.useEffect(() => {
    if (!actif) return;
    let vivant = true;
    motsAvecImages(mots).then((l) => { if (vivant) setLus(l); }).catch(() => {});
    return () => { vivant = false; };
  }, [cle, actif]); // eslint-disable-line react-hooks/exhaustive-deps
  return actif ? lus : null;
}
