// Moteur de thème : applique Mode / Accent / Style d'interface aux variables
// CSS, + charge les surcharges de couleurs de matière. Réglages persistés en DB.
import { api, setMatiereOverrides } from "./api";

export const MODES = [
  { id: "system", label: "Système" },
  { id: "clair", label: "Clair" },
  { id: "sombre", label: "Sombre" },
  { id: "sepia", label: "Sépia" },
  { id: "confort", label: "Confort" },
];

export const ACCENTS = [
  { id: "indigo", hex: "#6366f1" }, { id: "blue", hex: "#3b82f6" }, { id: "green", hex: "#22c55e" },
  { id: "red", hex: "#ef4444" }, { id: "purple", hex: "#a855f7" }, { id: "slate", hex: "#64748b" },
  { id: "pink", hex: "#ec4899" }, { id: "teal", hex: "#14b8a6" }, { id: "orange", hex: "#f59e0b" },
  { id: "gray", hex: "#6b7280" },
];

export const STYLES = [
  { id: "vitre", label: "Vitré", desc: "Matériaux translucides et flous" },
  { id: "epure", label: "Épuré", desc: "Fonds opaques, sans ombre" },
  { id: "doux", label: "Doux", desc: "Coins très arrondis et ombres" },
  { id: "contraste", label: "Contrasté", desc: "Coins nets et bordures marquées" },
];

export function applyTheme(s: Record<string, string>) {
  const root = document.documentElement;
  let mode = s.apparence || "system";
  if (mode === "translucide") mode = "system"; // mode retiré : repli système
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode); // clair|sombre|sepia|confort

  const style = s.styleInterface || "";
  if (style) root.setAttribute("data-style", style); else root.removeAttribute("data-style");

  const accent = ACCENTS.find((a) => a.id === (s.accent || "indigo"))?.hex || "#6366f1";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-soft", accent + "26"); // ~15% alpha
}

/** Charge tous les réglages au démarrage et applique thème + couleurs matières. */
export async function bootTheme() {
  try {
    const s = await api.settingsAll();
    applyTheme(s);
    try { setMatiereOverrides(JSON.parse(s.matiereCouleursOverride || "{}")); } catch { /* ignore */ }
  } catch { /* ignore */ }
}
