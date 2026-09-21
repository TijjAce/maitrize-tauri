import React from "react";
import { texteErreur } from "../api";
import { toast, toastAnnulable } from "./Toaster";
import { protegerImages, restaurerImages } from "../cahierJournal";
import { reformuler } from "../reformulation";

// ── Corriger ce qu'on vient de surligner ──────────────────────────────────
//
// Une faute se voit en relisant : on surligne le passage, et le bouton est
// là. Pas de menu à ouvrir, pas de fenêtre à remplir — le texte corrigé
// remplace l'ancien, et le message qui suit permet de revenir en arrière.
//
// L'IA ne reformule pas : elle corrige l'orthographe, la grammaire et la
// ponctuation. Les prénoms des élèves sont masqués avant l'envoi (voir
// `confidentialite.ts`), et les images posées dans le texte mises de côté.

/** En dessous, il n'y a rien à corriger : un mot ou deux. */
const MINIMUM = 12;

/**
 * Où se trouve un caractère dans une zone de texte, en pixels.
 *
 * Une zone de texte ne dit rien de ses lignes : on recopie donc ses styles
 * dans un calque invisible, on y met le texte jusqu'au caractère voulu, et
 * l'on mesure où le suivant commence. C'est la seule façon de poser quelque
 * chose à côté d'un passage surligné.
 */
const STYLES_COPIES = [
  "boxSizing", "width", "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
  "letterSpacing", "lineHeight", "textTransform", "wordSpacing", "textIndent", "tabSize",
  "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
  "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
] as const;

export function positionDansLaZone(zone: HTMLTextAreaElement, index: number): { x: number; y: number; ligne: number } {
  const style = window.getComputedStyle(zone);
  const miroir = document.createElement("div");
  for (const p of STYLES_COPIES) miroir.style[p] = style[p];
  miroir.style.position = "absolute";
  miroir.style.visibility = "hidden";
  miroir.style.top = "0";
  miroir.style.left = "-9999px";
  miroir.style.height = "auto";
  miroir.style.whiteSpace = "pre-wrap";
  miroir.style.overflowWrap = "break-word";
  miroir.textContent = zone.value.slice(0, index);
  // Un repère à la place du caractère : c'est lui qu'on mesure.
  const marque = document.createElement("span");
  marque.textContent = zone.value.slice(index, index + 1) || ".";
  miroir.appendChild(marque);
  document.body.appendChild(miroir);
  const x = marque.offsetLeft;
  const y = marque.offsetTop;
  document.body.removeChild(miroir);
  const ligne = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.3;
  return { x, y, ligne };
}

/** La place de la bulle, au-dessus du passage — ou dessous s'il touche le haut. */
export function placeDeLaBulle(
  p: { x: number; y: number; ligne: number },
  vue: { defilement: number; largeur: number; hauteur: number },
  bulle = { largeur: 132, hauteur: 30 },
): { gauche: number; haut: number } | null {
  const yVu = p.y - vue.defilement;
  // Le passage n'est plus à l'écran : la bulle n'a rien à y faire.
  if (yVu + p.ligne < 0 || yVu > vue.hauteur) return null;
  const auDessus = yVu - bulle.hauteur - 4;
  const haut = auDessus >= 2 ? auDessus : Math.min(yVu + p.ligne + 4, vue.hauteur - bulle.hauteur - 2);
  return {
    gauche: Math.max(4, Math.min(p.x, vue.largeur - bulle.largeur - 4)),
    haut: Math.max(2, haut),
  };
}

export function useCorrecteur({ valeur, onChange, zone }: {
  valeur: string;
  onChange: (suite: string) => void;
  zone: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [plage, setPlage] = React.useState<{ debut: number; fin: number } | null>(null);
  const [place, setPlace] = React.useState<{ gauche: number; haut: number } | null>(null);
  const [occupe, setOccupe] = React.useState(false);

  /** La bulle se pose au début du passage surligné, là où l'œil est déjà. */
  const situer = React.useCallback((debut: number) => {
    const el = zone.current;
    if (!el) return;
    setPlace(placeDeLaBulle(positionDansLaZone(el, debut),
      { defilement: el.scrollTop, largeur: el.clientWidth, hauteur: el.clientHeight }));
  }, [zone]);

  /** À appeler quand la sélection peut avoir changé (souris, clavier). */
  const surSelection = React.useCallback(() => {
    const el = zone.current;
    if (!el) return;
    const { selectionStart: debut, selectionEnd: fin } = el;
    const assez = fin - debut >= MINIMUM && el.value.slice(debut, fin).trim().length >= MINIMUM;
    if (!assez) { setPlage(null); setPlace(null); return; }
    setPlage({ debut, fin });
    situer(debut);
  }, [zone, situer]);

  // Le texte défile sous la bulle : elle suit, ou s'efface si le passage sort.
  React.useEffect(() => {
    const el = zone.current;
    if (!el || !plage) return;
    const suivre = () => situer(plage.debut);
    el.addEventListener("scroll", suivre);
    window.addEventListener("resize", suivre);
    return () => { el.removeEventListener("scroll", suivre); window.removeEventListener("resize", suivre); };
  }, [zone, plage, situer]);

  const corriger = async () => {
    if (!plage || occupe) return;
    const source = valeur.slice(plage.debut, plage.fin);
    setOccupe(true);
    try {
      // Les images du texte ne partent pas à l'IA : elles reviennent après.
      const { texte: sansImages, images } = protegerImages(source);
      const p = await reformuler(sansImages, "corriger");
      const propre = restaurerImages(p.texte, images);
      if (!propre.trim() || propre.trim() === source.trim()) {
        toast("Rien à corriger dans ce passage.", { icone: "✨" });
        return;
      }
      const avant = valeur;
      onChange(valeur.slice(0, plage.debut) + propre + valeur.slice(plage.fin));
      setPlage(null);
      setPlace(null);
      toastAnnulable("Passage corrigé.", () => onChange(avant), "✨");
    } catch (e) {
      toast("Correction impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setOccupe(false);
    }
  };

  // La bulle se pose juste au-dessus du passage surligné : on la trouve là où
  // l'on regarde, et elle ne recouvre ni le texte ni les boutons du bas.
  const bulle = plage && place ? (
    <button type="button" className="btn primary sm" disabled={occupe}
      // Sans cela, le champ perdrait sa sélection avant même le clic.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { void corriger(); }}
      title="Corriger l'orthographe et la grammaire du passage surligné, sans le reformuler"
      style={{ position: "absolute", left: place.gauche, top: place.haut, zIndex: 5,
        boxShadow: "var(--shadow)", whiteSpace: "nowrap" }}>
      {occupe ? "Correction…" : "✨ Corriger"}
    </button>
  ) : null;

  return { surSelection, bulle, corrigeEnCours: occupe };
}

/**
 * Le cadre qui porte la bulle. Un champ et son bouton flottant : il faut un
 * parent positionné, sans quoi la bulle irait se coller à la page.
 */
export function ZoneCorrigeable({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ position: "relative", ...style }}>{children}</div>;
}
