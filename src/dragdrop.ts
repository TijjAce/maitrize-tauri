// Glisser-déposer natif de fichiers (Finder, Aperçu…) vers une zone précise
// de l'UI. Le drop OS de Tauri ne donne qu'une position d'écran — on fait
// donc nous-mêmes le hit-test contre les zones enregistrées (getBoundingClientRect),
// converti en pixels CSS via devicePixelRatio.
import React from "react";

interface Zone {
  el: HTMLElement;
  accept: (chemin: string) => boolean;
  onFiles: (chemins: string[]) => void;
  onHover: (actif: boolean) => void;
}

const zones = new Set<Zone>();
let installe = false;

function zoneSous(x: number, y: number): Zone | null {
  for (const z of zones) {
    const r = z.el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
  }
  return null;
}

/** À appeler une seule fois au démarrage de l'app. */
export async function installerGlisserDeposer() {
  if (installe) return;
  installe = true;
  try {
    const { getCurrentWebview } = await import("@tauri-apps/api/webview");
    const { toast } = await import("./components/Toaster");
    const webview = getCurrentWebview();
    let zoneActive: Zone | null = null;
    await webview.onDragDropEvent((event) => {
      const p = event.payload;
      console.log("[dragdrop]", p);
      const ratio = window.devicePixelRatio || 1;
      if (p.type === "enter" || p.type === "over") {
        const x = p.position.x / ratio, y = p.position.y / ratio;
        const z = zoneSous(x, y);
        if (p.type === "enter") toast(`drag enter — ${("paths" in p ? p.paths.join(", ") : "")} (zone:${z ? "oui" : "non"})`, { duree: 3000 });
        if (z !== zoneActive) { zoneActive?.onHover(false); z?.onHover(true); zoneActive = z; }
      } else if (p.type === "drop") {
        const x = p.position.x / ratio, y = p.position.y / ratio;
        const z = zoneSous(x, y);
        toast(`drop — [${p.paths.join(", ")}] (zone:${z ? "oui" : "non"})`, { duree: 5000 });
        zoneActive?.onHover(false); zoneActive = null;
        if (z) {
          const fichiers = p.paths.filter((c) => z.accept(c));
          if (fichiers.length) z.onFiles(fichiers);
          else toast(`Aucun fichier accepté parmi : ${p.paths.join(", ")}`, { duree: 5000 });
        }
      } else {
        zoneActive?.onHover(false); zoneActive = null;
      }
    });
  } catch {
    // Hors Tauri (ex. aperçu navigateur) : pas de drop natif, on ignore.
  }
}

/**
 * Enregistre un élément comme zone de dépôt acceptant des fichiers (chemins
 * absolus venant du Finder/Aperçu). Retourne `actif` pour l'effet visuel de
 * survol pendant le glisser.
 */
export function useFileDropZone(opts: { accept: (chemin: string) => boolean; onFiles: (chemins: string[]) => void }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [actif, setActif] = React.useState(false);
  const optsRef = React.useRef(opts);
  optsRef.current = opts;

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const zone: Zone = {
      el,
      accept: (c) => optsRef.current.accept(c),
      onFiles: (f) => optsRef.current.onFiles(f),
      onHover: setActif,
    };
    zones.add(zone);
    return () => { zones.delete(zone); };
  }, []);

  return { ref, actif };
}

export const estPdf = (chemin: string) => /\.pdf$/i.test(chemin);
export const estImage = (chemin: string) => /\.(png|jpe?g|gif|webp|heic|bmp|svg)$/i.test(chemin);
export const nomDeChemin = (chemin: string) => chemin.split(/[\\/]/).pop() || chemin;
