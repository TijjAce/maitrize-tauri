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

export function useCorrecteur({ valeur, onChange, zone }: {
  valeur: string;
  onChange: (suite: string) => void;
  zone: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const [plage, setPlage] = React.useState<{ debut: number; fin: number } | null>(null);
  const [occupe, setOccupe] = React.useState(false);

  /** À appeler quand la sélection peut avoir changé (souris, clavier). */
  const surSelection = React.useCallback(() => {
    const el = zone.current;
    if (!el) return;
    const { selectionStart: debut, selectionEnd: fin } = el;
    const assez = fin - debut >= MINIMUM && el.value.slice(debut, fin).trim().length >= MINIMUM;
    setPlage(assez ? { debut, fin } : null);
  }, [zone]);

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
      toastAnnulable("Passage corrigé.", () => onChange(avant), "✨");
    } catch (e) {
      toast("Correction impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setOccupe(false);
    }
  };

  // La bulle se pose sur le champ, en bas à droite : là où la souris finit un
  // surlignage, et jamais sur le texte qu'on vient de lire.
  const bulle = plage ? (
    <button type="button" className="btn primary sm" disabled={occupe}
      // Sans cela, le champ perdrait sa sélection avant même le clic.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => { void corriger(); }}
      title="Corriger l'orthographe et la grammaire du passage surligné, sans le reformuler"
      style={{ position: "absolute", right: 12, bottom: 12, zIndex: 5, boxShadow: "var(--shadow)" }}>
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
