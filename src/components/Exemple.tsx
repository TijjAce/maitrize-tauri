import React from "react";
import { pictosDesMots } from "../mesPictos";
import type { MotImage } from "../jeuxSons";

// L'exemple d'un générateur : tant que l'atelier est vide, l'aperçu montre
// une vraie feuille, faite d'un exemple — ce que donnera la feuille une fois
// remplie (voir exemplesDesAteliers.ts). Un bandeau le dit ; « Partir de cet
// exemple » le fait entrer dans l'atelier, et rien d'autre ne l'y fait entrer.

/** L'aperçu d'un exemple, sous son bandeau. Pour partir d'un thème, du projet ou de ses images, l'assistant de l'atelier pose la question (voir AssistantDesMots). */
export function ApercuExemple({ children, onPrendre }: { children: React.ReactNode; onPrendre?: () => void }) {
  return (
    <div className="apercu-exemple">
      <div className="apercu-exemple-bandeau">
        <span className="apercu-exemple-titre">Exemple</span>
        {onPrendre && <button type="button" className="btn sm" onClick={onPrendre}>Partir de cet exemple</button>}
      </div>
      {children}
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
