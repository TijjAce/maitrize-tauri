import React from "react";
import { api } from "../api";
import { toast } from "./Toaster";
import { AtelierContext } from "./AtelierContext";
import { feuillesPubliees } from "../optionsFeuille";
import { EVT_MODE_DYS, cleModeDys, ecrireModeDys, lireModeDys } from "../presentationFeuille";
import {
  EVT_MODE_IMAGES, MODES_IMAGES, MODE_IMAGES_DEFAUT, cleModeImages, feuillesAvecImages, lireModeImages, mesPhotos,
  modeImagesActif, photosChangees, type ModeImages,
} from "../imagesSelonMode";

// ── Comment la feuille se présente ─────────────────────────────────────────
//
// Deux choix par atelier, à côté de ce qui s'imprime : le mode dyslexique, et
// les images — photos et pictos, pictos seulement, photos seulement. Le
// premier se propose dès qu'une feuille est là ; le second dès qu'on a pris
// une photo et que la feuille montre des images.

/** Un réglage d'atelier, lu puis suivi d'où que vienne le changement. */
function useReglageDAtelier<T>(cle: string, evt: string, lire: (brut: string | null) => T, ecrire: (v: T) => string, defaut: T): [T, (v: T) => void] {
  const [valeur, setValeur] = React.useState<T>(defaut);
  React.useEffect(() => {
    if (!cle) { setValeur(defaut); return; }
    let vivant = true;
    const relire = () => { api.settingGet(cle).then((v) => { if (vivant) setValeur(lire(v)); }).catch(() => {}); };
    relire();
    window.addEventListener(evt, relire);
    return () => { vivant = false; window.removeEventListener(evt, relire); };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  const changer = React.useCallback((v: T) => {
    setValeur(v);
    api.settingSet(cle, ecrire(v))
      .then(() => window.dispatchEvent(new Event(evt)))
      .catch((e) => toast("Choix non enregistré : " + String(e), { icone: "⚠️" }));
  }, [cle, evt]); // eslint-disable-line react-hooks/exhaustive-deps
  return [valeur, changer];
}

/** Le mode dyslexique d'un atelier. */
export const useModeDys = (atelier: string) =>
  useReglageDAtelier(atelier ? cleModeDys(atelier) : "", EVT_MODE_DYS, lireModeDys, ecrireModeDys, false);

/** Le choix des images d'un atelier. */
export const useModeImages = (atelier: string) =>
  useReglageDAtelier<ModeImages>(atelier ? cleModeImages(atelier) : "", EVT_MODE_IMAGES, lireModeImages, (m) => (m === MODE_IMAGES_DEFAUT ? "" : m), MODE_IMAGES_DEFAUT);

/** Combien de photos dans Mes pictos, relu quand elles changent. */
export function useNombreDePhotos(): number {
  const version = React.useSyncExternalStore(photosChangees.abonner, photosChangees.version);
  const [n, setN] = React.useState(0);
  React.useEffect(() => {
    let vivant = true;
    mesPhotos().then((l) => { if (vivant) setN(l.length); }).catch(() => {});
    return () => { vivant = false; };
  }, [version]);
  return n;
}

/**
 * Pose le choix de l'atelier ouvert dans Fabriquer : les images de son aperçu
 * et de ses impressions le suivent. En le quittant, plus rien n'est remplacé.
 */
export function ModeImagesDeLAtelier({ atelier }: { atelier: string }) {
  const [mode] = useModeImages(atelier);
  React.useEffect(() => {
    modeImagesActif.definir(atelier ? mode : null);
    return () => modeImagesActif.definir(null);
  }, [atelier, mode]);
  return null;
}

/** Les trois choix d'images, en boutons. */
export function ChoixImages({ atelier, toujours = false }: { atelier: string; toujours?: boolean }) {
  const [mode, changer] = useModeImages(atelier);
  const photos = useNombreDePhotos();
  const avecImages = React.useSyncExternalStore(feuillesAvecImages.abonner, () => feuillesAvecImages.lire(atelier));
  if (!atelier || (!photos && mode === MODE_IMAGES_DEFAUT) || (!toujours && !avecImages && mode === MODE_IMAGES_DEFAUT)) return null;
  return (
    <span className="presentation-images" role="group" aria-label="Les images de la feuille">
      <span className="meta">📷 Images :</span>
      <span className="seg sm">
        {MODES_IMAGES.map((m) => (
          <button key={m.id} type="button" className={mode === m.id ? "active" : ""} title={m.aide}
            onClick={() => changer(m.id)}>{m.libelle}</button>
        ))}
      </span>
    </span>
  );
}

/**
 * Le mode dyslexique et le choix des images, sur une ligne. L'atelier vient
 * du contexte quand on ne le donne pas ; rien ne s'affiche tant que
 * l'aperçu n'a pas montré de feuille.
 */
export function PresentationFeuille({ atelier: donne }: { atelier?: string }) {
  const duContexte = React.useContext(AtelierContext);
  const atelier = donne ?? duContexte;
  const [dys, setDys] = useModeDys(atelier);
  const connue = React.useSyncExternalStore(feuillesPubliees.abonner, () => feuillesPubliees.connue(atelier));
  if (!atelier || !connue) return null;
  return (
    <span className="presentation-feuille">
      <label className="pb-coche" title="Une police aux lettres bien distinctes, plus d'espace entre les lettres, les mots et les lignes, ni italique ni texte justifié.">
        <input type="checkbox" checked={dys} onChange={(e) => setDys(e.target.checked)} />
        <span>mode dyslexique</span>
      </label>
      <ChoixImages atelier={atelier} />
    </span>
  );
}
