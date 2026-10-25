// Moteur de thème : applique Mode / Accent / Style d'interface aux variables
// CSS, + charge les surcharges de couleurs de matière. Réglages persistés en DB.
import { api, setMatiereOverrides, CLE_COULEURS_MATIERES } from "./api";
import { EVT_DONNEES_DISTANTES } from "./components/ui";

export const MODES = [
  { id: "clair", label: "Clair" },
  { id: "aurore", label: "Aurore" },
  { id: "sepia", label: "Sépia" },
  { id: "sombre", label: "Sombre" },
  { id: "ardoise", label: "Ardoise" },
  { id: "foret-nuit", label: "Forêt Nuit" },
  { id: "lavande-nuit", label: "Lavande Nuit" },
];

export const ACCENTS = [
  { id: "indigo", hex: "#6366f1" }, { id: "blue", hex: "#3b82f6" }, { id: "green", hex: "#22c55e" },
  { id: "red", hex: "#ef4444" }, { id: "purple", hex: "#a855f7" }, { id: "slate", hex: "#64748b" },
  { id: "pink", hex: "#ec4899" }, { id: "teal", hex: "#14b8a6" }, { id: "orange", hex: "#f59e0b" },
  { id: "gray", hex: "#6b7280" },
];

/**
 * Les styles d'interface, et de quoi dessiner leur aperçu dans les réglages :
 * l'arrondi, le bord, l'ombre, le fond derrière la carte et la carte.
 */
export const STYLES = [
  { id: "vitre", label: "Vitré", desc: "Verre dépoli sur un fond coloré", apercu: {
    r: 8, bord: "1px solid color-mix(in srgb, var(--panel) 55%, #fff 45%)", ombre: "0 4px 12px rgba(20, 25, 40, .14)",
    fond: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 40%, var(--panel)), color-mix(in srgb, #06b6d4 34%, var(--panel)) 55%, color-mix(in srgb, #f472b6 34%, var(--panel)))",
    carte: "color-mix(in srgb, var(--panel) 52%, transparent)" } },
  { id: "epure", label: "Épuré", desc: "À plat : filets fins, aucune ombre", apercu: {
    r: 3, bord: "1px solid var(--border)", ombre: "none", fond: "var(--panel)", carte: "var(--panel)" } },
  { id: "doux", label: "Doux", desc: "Coins très arrondis, ombres légères", apercu: {
    r: 10, bord: "1px solid transparent", ombre: "0 3px 10px rgba(20, 25, 40, .16)", fond: "var(--panel-2)", carte: "var(--panel)" } },
  { id: "contraste", label: "Contrasté", desc: "Angles nets, bordures épaisses, texte appuyé", apercu: {
    r: 1, bord: "2px solid var(--text)", ombre: "none", fond: "var(--panel)", carte: "var(--panel)" } },
];

/**
 * Taille du texte, appliquée en agrandissant toute la fenêtre.
 *
 * L'application est dessinée en pixels : grossir la seule police laisserait
 * les cadres à leur taille et couperait les mots. Le zoom agrandit tout —
 * texte, boutons, images — ce qui est exactement ce qu'on veut quand on est
 * penché sur l'écran avec un élève, ou en visio d'ESS.
 *
 * Le choix reste sur cet ordinateur : l'écran du portable et celui du bureau
 * n'ont pas la même taille.
 */
export const TAILLES = [
  { id: "normal", label: "Normale", zoom: 1 },
  { id: "grand", label: "Grande", zoom: 1.15 },
  { id: "tresgrand", label: "Très grande", zoom: 1.3 },
];

/** La taille choisie dans les réglages, et ce que la télécommande y ajoute (« plus grand », au tableau). */
let zoomDeBase = 1;
let zoomDuTableau = 1;

/** La taille des réglages ; ce que la télécommande a ajouté reste par-dessus. */
function appliquerZoom(facteur: number) {
  zoomDeBase = facteur;
  poserLeZoom(facteur * zoomDuTableau);
}

/** La télécommande agrandit ou réduit tout, par-dessus la taille des réglages ; 1 y revient. */
export function zoomerDeLoin(facteur: number) {
  zoomDuTableau = facteur;
  poserLeZoom(zoomDeBase * facteur);
}

/**
 * Agrandit la fenêtre entière, comme ⌘+ dans un navigateur.
 *
 * Le zoom du webview vaut mieux que la propriété CSS : il agrandit aussi ce
 * que l'application fixe en pixels, et la fenêtre reste cohérente (menus,
 * fenêtres modales, impression). Hors de l'application — tests, maquettes —
 * on retombe sur le zoom CSS, qui suffit à vérifier le reste.
 */
function poserLeZoom(facteur: number) {
  const parLeCss = () =>
    document.documentElement.style.setProperty("zoom", facteur === 1 ? "" : String(facteur));
  import("@tauri-apps/api/webview")
    .then(({ getCurrentWebview }) => getCurrentWebview().setZoom(facteur).catch(parLeCss))
    .catch(parLeCss);
}

export function applyTheme(s: Record<string, string>) {
  const root = document.documentElement;
  let mode = s.apparence || "clair";
  // Modes/thèmes retirés ou renommés : repli vers un équivalent existant
  if (mode === "system" || mode === "translucide" || mode === "confort") mode = "clair";
  if (mode === "nuit") mode = "sombre";
  if (mode === "lavande") mode = "lavande-nuit";
  if (mode === "foret") mode = "foret-nuit";
  root.setAttribute("data-theme", mode);

  // « Doux » quand rien n'est choisi : c'est celui que les réglages montrent comme choisi.
  root.setAttribute("data-style", s.styleInterface || "doux");

  const accent = ACCENTS.find((a) => a.id === (s.accent || "indigo"))?.hex || "#6366f1";
  root.style.setProperty("--accent", accent);
  root.style.setProperty("--accent-soft", accent + "26"); // ~15% alpha

  appliquerZoom(TAILLES.find((x) => x.id === (s.tailleTexte || "normal"))?.zoom ?? 1);

  // Liseré lumineux animé autour de la fenêtre (activé par défaut)
  root.setAttribute("data-neon", s.liseret === "off" ? "off" : "on");
}

/** Charge tous les réglages au démarrage et applique thème + couleurs matières. */
export async function bootTheme() {
  try {
    const s = await api.settingsAll();
    applyTheme(s);
    try { setMatiereOverrides(JSON.parse(s[CLE_COULEURS_MATIERES] || "{}")); } catch { /* ignore */ }
  } catch { /* ignore */ }
  // Les couleurs choisies sur l'autre ordinateur arrivent avec la synchronisation.
  if (!ecouteCouleurs) {
    ecouteCouleurs = true;
    window.addEventListener(EVT_DONNEES_DISTANTES, () => {
      api.settingGet(CLE_COULEURS_MATIERES).then((v) => {
        try { setMatiereOverrides(JSON.parse(v || "{}")); } catch { /* ignore */ }
      }).catch(() => {});
    });
  }
}
let ecouteCouleurs = false;
