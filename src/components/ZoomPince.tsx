import React from "react";
import { bornerZoom, lireZoom, zoomApresPincement } from "../zoomPince";

// Le zoom au pincement, côté écran : le facteur d'un cadre, retenu par
// ordinateur sous une clé, et l'indicateur qui ramène à 100 %.

/** Le zoom d'un cadre, au pincement du trackpad. À poser : `ref={cadre}` sur le cadre qui écoute. */
export function useZoomPince(cle: string): { zoom: number; majZoom: (v: number) => void; cadre: React.RefCallback<HTMLElement> } {
  const [zoom, setZoom] = React.useState(() => { try { return lireZoom(localStorage.getItem(cle)); } catch { return 1; } });
  // Le pincement envoie plusieurs crans entre deux rendus : on part du dernier facteur, pas de celui affiché.
  const courant = React.useRef(zoom);
  const majZoom = React.useCallback((v: number) => {
    const z = bornerZoom(v);
    courant.current = z;
    setZoom(z);
    try { localStorage.setItem(cle, String(z)); } catch { /* sans mémoire : le zoom vaut le temps de la page */ }
  }, [cle]);
  // Pincement trackpad (Safari/Chrome : wheel + ctrlKey). React tient ses
  // écouteurs wheel pour passifs, où preventDefault ne peut rien — et Chrome
  // zoomerait toute la page. On pose le nôtre, non passif, sur le cadre.
  const pincer = React.useCallback((e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    majZoom(zoomApresPincement(courant.current, e.deltaY));
  }, [majZoom]);
  const element = React.useRef<HTMLElement | null>(null);
  const cadre = React.useCallback((el: HTMLElement | null) => {
    element.current?.removeEventListener("wheel", pincer);
    element.current = el;
    el?.addEventListener("wheel", pincer, { passive: false });
  }, [pincer]);
  return { zoom, majZoom, cadre };
}

/** Le facteur en cours et le retour à 100 % — rien tant qu'on y est. */
export function IndicateurZoom({ zoom, onReinitialiser }: { zoom: number; onReinitialiser: () => void }) {
  if (zoom === 1) return null;
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ minWidth: 34, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
      <button className="btn sm" onClick={onReinitialiser} title="Réinitialiser le zoom">100%</button>
    </span>
  );
}
