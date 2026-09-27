import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { historique, nomDuLieu, precedent, recents, suivant } from "../historique";
import { isMac } from "../api";
import { openCtx } from "./ctxmenu";
import { PageVisibleContext } from "./ui";

// Revenir où l'on était : le bouton de la barre latérale, ses raccourcis, et
// les deux crochets qui tiennent l'historique à jour (voir `historique`).
//
// ⌘⌥← revient, ⌘⌥→ avance — la même famille que ⌘⌥↑/↓ qui parcourt le
// menu, et des touches qu'un clavier français atteint sans contorsion. ⌘[ et
// ⌘] marchent aussi, pour qui a l'habitude de Safari.

/** Ce qu'il faut savoir du menu pour nommer un lieu qui ne s'est pas annoncé. */
export type MenuLieux = { to: string; label: string }[];

export const RACCOURCI_RETOUR = isMac ? "⌘⌥←" : "Ctrl+Alt+←";
export const RACCOURCI_AVANCE = isMac ? "⌘⌥→" : "Ctrl+Alt+→";

/** L'historique, tel que React le voit. */
export const useHistorique = () => React.useSyncExternalStore(historique.abonner, historique.lire);

/** À monter une fois, sous le routeur : chaque changement d'adresse se note. */
export function useSuiviDesLieux(chemin: string) {
  React.useEffect(() => { historique.arriver(chemin); }, [chemin]);
}

/**
 * Une page annonce son titre : c'est ce nom que « Revenir » montrera.
 *
 * L'effet d'une page s'exécute avant celui de la coquille qui note l'adresse :
 * la page s'annonce donc en arrivant elle-même (arriver là où l'on est déjà
 * ne change rien), sans quoi son titre tomberait sur le lieu précédent.
 */
export function useTitreDuLieu(titre: string) {
  const visible = React.useContext(PageVisibleContext);
  const { pathname, search } = useLocation();
  React.useEffect(() => {
    if (!visible) return;
    historique.arriver(pathname + search);
    historique.titrer(pathname + search, titre);
  }, [visible, pathname, search, titre]);
}

const dansUneSaisie = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
};

export function Retour({ menu }: { menu: MenuLieux }) {
  const h = useHistorique();
  const navigate = useNavigate();
  const avant = precedent(h);
  const apres = suivant(h);

  const revenir = React.useCallback(() => { const l = historique.reculer(); if (l) navigate(l.chemin); }, [navigate]);
  const avancer = React.useCallback(() => { const l = historique.avancer(); if (l) navigate(l.chemin); }, [navigate]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const modif = isMac ? e.metaKey : e.ctrlKey;
      if (!modif || e.shiftKey || dansUneSaisie(e)) return;
      const arriere = (e.altKey && e.key === "ArrowLeft") || (!e.altKey && e.key === "[");
      const avant = (e.altKey && e.key === "ArrowRight") || (!e.altKey && e.key === "]");
      if (!arriere && !avant) return;
      e.preventDefault();
      if (arriere) revenir(); else avancer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revenir, avancer]);

  const liste = recents(h);
  const ouvrirLesRecents = (e: React.MouseEvent) => {
    if (!liste.length) return;
    openCtx(e, [
      ...liste.map((l) => ({ label: nomDuLieu(l, menu), icon: "↩", onClick: () => navigate(l.chemin) })),
      ...(apres ? [{ label: `Avancer : ${nomDuLieu(apres, menu)}`, icon: "↪", sep: true, onClick: avancer }] : []),
    ]);
  };

  return (
    <div className="retour">
      <button type="button" className="palette-trigger retour-bouton" disabled={!avant} onClick={revenir} onContextMenu={ouvrirLesRecents}
        aria-keyshortcuts={isMac ? "Meta+Alt+ArrowLeft" : "Control+Alt+ArrowLeft"}
        title={avant ? `Revenir où j'étais : ${nomDuLieu(avant, menu)} (${RACCOURCI_RETOUR}) — clic droit : les lieux récents` : "Rien où revenir pour l'instant"}>
        <span aria-hidden="true">↩</span>
        <span className="retour-libelle">{avant ? nomDuLieu(avant, menu) : "Revenir"}</span>
        <kbd aria-hidden="true">{RACCOURCI_RETOUR}</kbd>
      </button>
      {liste.length > 0 && (
        <button type="button" className="retour-recents" onClick={ouvrirLesRecents} aria-label="Lieux récents" title="Les lieux récents">⌄</button>
      )}
    </div>
  );
}
