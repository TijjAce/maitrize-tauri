import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Page } from "../App";
import { api, EtatBanque, PictoArasaac, OptionsJeu } from "../api";
import { Field, Input, Select, Empty, Modal, useAsync, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { TlaTab } from "./Tla";
import { PartieToutTab, MultiplicatifsTab } from "./ProblemesBarres";
import { SupportsVisuelsTab, retenirSupport } from "./SupportsVisuels";
import { ajouter, completerAuHasard, imagesConseillees, motsDeLaListe, remplacer, uneImageParMot } from "../loto";
import { usePictoImage } from "../components/ChoixPicto";

// ── Loto et tableaux à partir des pictogrammes ARASAAC ────────────────────
//
// Aucune IA n'intervient dans le choix des pictogrammes. On part des
// catégories de la banque : un picto rangé dans « animaux terrestres » par
// ARASAAC en est un, sans qu'un modèle ait à le deviner. L'enseignant voit
// ensuite tout le vivier et retire ce qu'il ne veut pas : rien ne s'imprime
// sans avoir été regardé.

const OCTETS = (n: number) =>
  n > 1e9 ? `${(n / 1e9).toFixed(1)} Go` : n > 1e6 ? `${Math.round(n / 1e6)} Mo` : `${Math.round(n / 1e3)} ko`;

const ONGLETS = ["jeux", "memory", "imagier", "tla", "supports", "partieTout", "multiplicatifs"] as const;
type Onglet = typeof ONGLETS[number];

/**
 * Les générateurs, rangés par famille.
 *
 * Une rangée d'onglets s'allonge à chaque nouveau jeu et finit par ne plus
 * rien dire : on choisit d'abord ce qu'on travaille — le langage, les
 * mathématiques, l'autonomie —, puis l'outil.
 */
const FAMILLES: { id: string; libelle: string; aide: string; outils: { id: Onglet; libelle: string }[] }[] = [
  {
    id: "langage", libelle: "🗣 Langage", aide: "À partir des pictogrammes ARASAAC : vocabulaire, désignation, phrases.",
    outils: [
      { id: "jeux", libelle: "🎲 Loto" },
      { id: "memory", libelle: "🃏 Mémory" },
      { id: "imagier", libelle: "📖 Imagier" },
      { id: "tla", libelle: "🗣 Tableaux de langage" },
    ],
  },
  {
    id: "maths", libelle: "🔢 Mathématiques", aide: "Des problèmes à la structure choisie, avec leur schéma en barres.",
    outils: [
      { id: "partieTout", libelle: "➕ Problèmes partie-tout" },
      { id: "multiplicatifs", libelle: "✖️ Problèmes multiplicatifs" },
    ],
  },
  {
    id: "autonomie", libelle: "🧭 Autonomie et repères", aide: "Ce qui aide à suivre la journée : jetons, étapes, temps, scénarios.",
    outils: [
      { id: "supports", libelle: "🖼 Supports visuels" },
    ],
  },
];

/** La famille qui porte cet outil. */
const familleDe = (o: Onglet) => FAMILLES.find((f) => f.outils.some((x) => x.id === o)) ?? FAMILLES[0];

const ONGLET_MEMORISE = "fabriquer:onglet";

export default function Jeux() {
  const [onglet, setOngletBrut] = React.useState<Onglet>(() => {
    try {
      const lu = localStorage.getItem(ONGLET_MEMORISE);
      return ONGLETS.includes(lu as Onglet) ? (lu as Onglet) : "jeux";
    } catch {
      return "jeux";
    }
  });
  const setOnglet = React.useCallback((o: Onglet) => {
    setOngletBrut(o);
    try { localStorage.setItem(ONGLET_MEMORISE, o); } catch { /* stockage indisponible */ }
  }, []);
  // Un support demandé par la palette (« minuteur »…) ouvre son onglet.
  useOngletDemande("jeux", ONGLETS, setOnglet, (o) => { if (retenirSupport(o)) setOnglet("supports"); });
  const [etat, setEtat] = React.useState<EtatBanque | null>(null);
  const [progression, setProgression] = React.useState<{ etape: string; faits: number; total: number } | null>(null);
  const rafraichir = React.useCallback(() => { api.arasaacEtat().then(setEtat).catch(() => {}); }, []);
  React.useEffect(rafraichir, [rafraichir]);

  React.useEffect(() => {
    const p = listen<{ etape: string; faits: number; total: number }>("arasaac://avancement", (e) => setProgression(e.payload));
    return () => { p.then((off) => off()); };
  }, []);

  const telecharger = async () => {
    setProgression({ etape: "Démarrage", faits: 0, total: 0 });
    try {
      setEtat(await api.arasaacTelecharger());
      toast("Banque ARASAAC à jour.", { icone: "✅" });
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally {
      setProgression(null);
    }
  };

  // La banque est commune au loto et aux tableaux : tant qu'elle n'est pas
  // là, ces deux onglets n'ont de quoi travailler. Les supports visuels s'en
  // passent (ils portent alors le mot seul), les problèmes en barres aussi.
  const famille = familleDe(onglet);

  const avecPictos = (contenu: React.ReactNode) =>
    !etat ? <div /> : !etat.installee ? <Banque progression={progression} onTelecharger={telecharger} /> : contenu;

  return (
    <Page titre="Fabriquer" sous="Jeux et supports à imprimer : langage, mathématiques, autonomie">
      {/* D'abord ce qu'on travaille, ensuite l'outil : la liste peut grandir
          sans que la barre devienne illisible. */}
      <div className="onglets">
        {FAMILLES.map((f) => (
          <button key={f.id} className={famille.id === f.id ? "active" : ""} title={f.aide}
            onClick={() => setOnglet(f.outils[0].id)}>{f.libelle}</button>
        ))}
      </div>
      <div className="seg" style={{ margin: "10px 0 14px", flexWrap: "wrap" }}>
        {famille.outils.map((o) => (
          <button key={o.id} className={onglet === o.id ? "active" : ""} onClick={() => setOnglet(o.id)}>{o.libelle}</button>
        ))}
        <span style={{ alignSelf: "center", marginLeft: 10, fontSize: 12.5, color: "var(--text-2)" }}>{famille.aide}</span>
      </div>
      {onglet === "supports" ? <SupportsVisuelsTab banque={Boolean(etat?.installee)} />
        : onglet === "partieTout" ? <PartieToutTab />
        : onglet === "multiplicatifs" ? <MultiplicatifsTab />
        : onglet === "tla" ? avecPictos(<TlaTab />)
        : avecPictos(etat && (
          <Loto key={onglet} gen={GENERATEURS[onglet === "jeux" ? "loto" : onglet]} etat={etat}
            progression={progression} onTelecharger={telecharger} />
        ))}
    </Page>
  );
}

// ── La banque ──────────────────────────────────────────────────────────────

function Banque({ progression, onTelecharger }: {
  progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const pourcent = progression && progression.total > 0
    ? Math.round((progression.faits / progression.total) * 100) : null;
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>🗃 Banque de pictogrammes</h3>
      <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 0 }}>
        Les 13 800 pictogrammes d'ARASAAC descendent une seule fois, puis tout
        fonctionne hors ligne. Comptez environ 330 Mo et une dizaine de minutes.
        Le téléchargement reprend là où il s'est arrêté si vous le relancez.
      </p>
      {progression ? (
        <>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {progression.etape}
            {progression.total > 0 && ` — ${progression.faits} / ${progression.total}`}
          </div>
          <div style={{ height: 8, background: "var(--panel-2)", borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pourcent ?? 0}%`, background: "var(--accent)", transition: "width .3s" }} />
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={onTelecharger}>⬇ Télécharger la banque</button>
      )}
    </div>
  );
}

// ── Le loto ────────────────────────────────────────────────────────────────
//
// On choisit ses images de trois façons, qui remplissent une même sélection :
// par thème (une image par mot, cochée d'un clic), par une liste de mots
// écrite d'un trait, ou par recherche. Le hasard ne sert plus qu'à compléter,
// et une image retirée n'y revient pas.

type Mode = "theme" | "mots" | "recherche";
const PAR_PAGE = 60;

/**
 * Ce qui distingue un générateur d'un autre.
 *
 * Le choix des images est le même pour tous — thèmes, liste de mots,
 * recherche —, et c'est le plus gros de l'écran. Seules changent les options
 * d'impression et la façon de compter ce qu'il faut d'images.
 */
interface Generateur {
  /** Le nom que le moteur attend. */
  id: string;
  quoi: string;
  exemple: string;
  /** Combien d'images il faut au minimum, vu les options. */
  minimum: (o: OptionsJeu) => number;
  /** Ce qu'on dit quand il en manque. */
  manque: (o: OptionsJeu) => string;
  grilles: [string, string][];
  /** Les réglages montrés : tous n'ont pas de sens partout. */
  montre: { planches?: boolean; cartes?: boolean; libelles?: boolean };
  defauts: Partial<OptionsJeu>;
  bouton: string;
  icone: string;
}

export const GENERATEURS: Record<string, Generateur> = {
  loto: {
    id: "loto", quoi: "loto", exemple: "Loto de la famille",
    minimum: (o) => o.colonnes * o.lignes,
    manque: (o) => `Il faut au moins ${o.colonnes * o.lignes} images pour une planche ${o.colonnes} × ${o.lignes}.`,
    grilles: [["2x2", "2 × 2 — quatre cases"], ["3x2", "3 × 2 — six cases"], ["3x3", "3 × 3 — neuf cases"], ["4x3", "4 × 3 — douze cases"]],
    montre: { planches: true, cartes: true, libelles: true },
    defauts: { colonnes: 3, lignes: 2, planches: 6, cartes: true },
    bouton: "🖨 Créer le PDF du loto", icone: "🎲",
  },
  memory: {
    id: "memory", quoi: "mémory", exemple: "Mémory des animaux",
    // Une feuille de seize cartes, ce sont huit images, chacune en double.
    minimum: (o) => Math.max(2, Math.floor((o.colonnes * o.lignes) / 2)),
    manque: (o) => `Il faut au moins ${Math.max(2, Math.floor((o.colonnes * o.lignes) / 2))} images : chacune sort en double.`,
    grilles: [["3x2", "6 cartes — 3 paires"], ["4x3", "12 cartes — 6 paires"], ["4x4", "16 cartes — 8 paires"]],
    montre: { planches: true, libelles: true },
    defauts: { colonnes: 4, lignes: 4, planches: 1, cartes: false },
    bouton: "🖨 Créer le PDF du mémory", icone: "🃏",
  },
  imagier: {
    id: "imagier", quoi: "imagier", exemple: "Imagier de la cuisine",
    minimum: () => 1,
    manque: () => "Choisissez au moins une image.",
    grilles: [["1x2", "2 grandes fiches par page"], ["2x2", "4 fiches par page"], ["3x3", "9 petites fiches"]],
    // Toutes les images choisies y passent : le nombre de pages en découle.
    montre: { libelles: true },
    defauts: { colonnes: 2, lignes: 2, planches: 1, cartes: false, libelles: true },
    bouton: "🖨 Créer le PDF de l'imagier", icone: "📖",
  },
};

function Loto({ gen, etat, progression, onTelecharger }: {
  gen: Generateur;
  etat: EtatBanque; progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const { data: categories } = useAsync(() => api.arasaacCategories(), []);
  const [mode, setMode] = React.useState<Mode>("theme");

  // ── La sélection ──
  const [selection, setSelection] = React.useState<PictoArasaac[]>([]);
  // Retirées : le hasard ne les ramène plus (on peut toujours les recocher).
  const [retires, setRetires] = React.useState<Set<number>>(new Set());
  const choisis = React.useMemo(() => new Set(selection.map((p) => p.id)), [selection]);
  const basculer = (p: PictoArasaac) => {
    if (choisis.has(p.id)) {
      setSelection((s) => s.filter((x) => x.id !== p.id));
      setRetires((r) => new Set(r).add(p.id));
    } else {
      setSelection((s) => ajouter(s, [p]));
    }
  };
  const [variantesDe, setVariantesDe] = React.useState<PictoArasaac | null>(null);

  // ── Par thème ──
  const [q, setQ] = React.useState("");
  const [themes, setThemes] = React.useState<string[]>([]);
  const [intersection, setIntersection] = React.useState(false);
  const [sansVerbes, setSansVerbes] = React.useState(true);
  const [uneParMot, setUneParMot] = React.useState(true);
  const [filtre, setFiltre] = React.useState("");
  const [limite, setLimite] = React.useState(PAR_PAGE);
  const [vivier, setVivier] = React.useState<PictoArasaac[] | null>(null);
  React.useEffect(() => {
    setLimite(PAR_PAGE);
    if (!themes.length) { setVivier(null); return; }
    let vivant = true;
    api.arasaacSelection(themes, sansVerbes ? EXCLUES_PAR_DEFAUT : [], intersection, 0, 1)
      .then((v) => { if (vivant) setVivier(v); })
      .catch((e) => toast(String(e), { icone: "⚠️" }));
    return () => { vivant = false; };
  }, [themes, intersection, sansVerbes]);

  const visibles = React.useMemo(() => {
    const f = q.trim().toLowerCase();
    return (categories ?? [])
      .filter((c) => c.nombre >= 6)
      .filter((c) => !f || libelleCategorie(c.nom).toLowerCase().includes(f) || c.nom.toLowerCase().includes(f))
      .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
  }, [categories, q]);

  const candidatsTheme = React.useMemo(() => {
    const f = filtre.trim().toLowerCase();
    const liste = (vivier ?? []).filter((p) => !f || p.mot.toLowerCase().includes(f));
    return uneParMot ? uneImageParMot(liste) : liste.map((picto) => ({ picto, variantes: 1 }));
  }, [vivier, filtre, uneParMot]);

  // ── Par liste de mots ──
  const [texteMots, setTexteMots] = React.useState("");
  const [absents, setAbsents] = React.useState<string[]>([]);
  const ajouterMots = async () => {
    const mots = motsDeLaListe(texteMots);
    if (!mots.length) return;
    try {
      const [trouves, pasTrouves] = await api.arasaacParMots(mots);
      const avant = selection.length;
      const suite = ajouter(selection, trouves);
      setSelection(suite);
      setAbsents(pasTrouves);
      toast(`${suite.length - avant} image${suite.length - avant > 1 ? "s" : ""} ajoutée${suite.length - avant > 1 ? "s" : ""}`
        + (pasTrouves.length ? ` · ${pasTrouves.length} mot${pasTrouves.length > 1 ? "s" : ""} à chercher` : ""), { icone: "✏️" });
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  };

  // ── Par recherche ──
  const [recherche, setRecherche] = React.useState("");
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (recherche.trim().length < 2) { setResultats([]); return; }
      api.arasaacChercher(recherche.trim(), 60).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [recherche]);
  const chercher = (mot: string) => { setMode("recherche"); setRecherche(mot); };

  // ── Impression ──
  const [options, setOptions] = React.useState<OptionsJeu>({
    libelles: false, cartes: true, colonnes: 3, lignes: 2, planches: 6, graine: 0, ...gen.defauts,
  });
  // Changer de générateur remet ses réglages : un imagier n'est pas un loto.
  React.useEffect(() => {
    setOptions((o) => ({ ...o, libelles: false, cartes: true, ...gen.defauts }));
  }, [gen]);
  const [titre, setTitre] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const minimum = gen.minimum(options);
  const parPlanche = options.colonnes * options.lignes;
  const conseille = imagesConseillees(parPlanche, options.planches);
  const [jusqua, setJusqua] = React.useState(12);
  const completer = () => {
    if (!vivier?.length) return;
    const suite = completerAuHasard(selection, vivier, retires, jusqua);
    if (suite.length === selection.length) toast("Ce thème n'a plus d'autres images.", { icone: "ℹ️" });
    setSelection(suite);
  };
  const generer = async () => {
    setOccupe(true);
    try {
      const nom = titre.trim() || themes.map(libelleCategorie).join(" + ") || gen.quoi;
      await api.jeuGenerer(gen.id, selection, { ...options, graine: Math.floor(Math.random() * 1e9) }, nom);
      toast(`${gen.quoi.charAt(0).toUpperCase()}${gen.quoi.slice(1)} créé — le PDF s'ouvre.`, { icone: gen.icone });
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            🗃 {etat.pictos.toLocaleString("fr")} pictogrammes · {etat.images.toLocaleString("fr")} images · {OCTETS(etat.octets)}
            {etat.derniereMaj && ` · mise à jour le ${etat.derniereMaj}`}
          </div>
          <div className="spacer" style={{ flex: 1 }} />
          {progression
            ? <span style={{ fontSize: 13 }}>{progression.etape} {progression.faits}/{progression.total}</span>
            : <button className="btn sm" onClick={onTelecharger}>🔄 Resynchroniser</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        {/* ── Trouver des images ── */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>1. Trouver des images</h3>
          <div className="seg" style={{ marginBottom: 10, display: "flex" }}>
            <button className={mode === "theme" ? "active" : ""} onClick={() => setMode("theme")}>📚 Thème</button>
            <button className={mode === "mots" ? "active" : ""} onClick={() => setMode("mots")}>✏️ Mots</button>
            <button className={mode === "recherche" ? "active" : ""} onClick={() => setMode("recherche")}>🔎 Chercher</button>
          </div>

          {mode === "theme" && <>
            <Input placeholder="Chercher un thème : famille, fruits, ferme…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 8, border: "1px solid var(--border)", borderRadius: 8 }}>
              {visibles.map((c) => (
                <label key={c.nom} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 13,
                  cursor: "pointer", background: themes.includes(c.nom) ? "var(--panel-2)" : undefined,
                }}>
                  <input type="checkbox" checked={themes.includes(c.nom)}
                    onChange={() => setThemes((v) => (v.includes(c.nom) ? v.filter((x) => x !== c.nom) : [...v, c.nom]))} />
                  <span style={{ flex: 1 }}>{libelleCategorie(c.nom)}</span>
                  <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.nombre}</span>
                </label>
              ))}
              {!visibles.length && <div style={{ padding: 10, fontSize: 13, color: "var(--text-2)" }}>Aucun thème.</div>}
            </div>
            {themes.length > 1 && (
              <label className="pb-coche" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={intersection} onChange={(e) => setIntersection(e.target.checked)} />
                <span><b>Croiser les thèmes</b><br />
                  <span style={{ color: "var(--text-2)" }}>L'image doit appartenir à tous : « Mammifères » croisé avec « Animaux domestiques » donne la ferme.</span>
                </span>
              </label>
            )}
            <label className="pb-coche">
              <input type="checkbox" checked={sansVerbes} onChange={(e) => setSansVerbes(e.target.checked)} />
              <span><b>Écarter les verbes</b><br />
                <span style={{ color: "var(--text-2)" }}>À décocher pour un loto d'actions.</span>
              </span>
            </label>
          </>}

          {mode === "mots" && <>
            <Field label="Les mots du loto">
              <textarea className="textarea" rows={8} value={texteMots} onChange={(e) => setTexteMots(e.target.value)}
                placeholder={"papa, maman, bébé, frère, sœur…\nou un mot par ligne"} style={{ width: "100%", resize: "vertical" }} />
            </Field>
            <button className="btn primary" style={{ width: "100%" }} disabled={!motsDeLaListe(texteMots).length} onClick={ajouterMots}>
              ✏️ Ajouter ces mots
            </button>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
              Chaque mot prend l'image qui porte exactement ce nom ; « 🔄 » en propose d'autres dessins.
            </p>
            {absents.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <b>Pas trouvés tels quels :</b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {absents.map((m) => (
                    <button key={m} className="btn sm" onClick={() => chercher(m)} title="Chercher des images proches">🔎 {m}</button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {mode === "recherche" && <>
            <Input autoFocus placeholder="Chercher une image : maman, pomme, dormir…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
              Cliquez sur une image pour l'ajouter au loto, ou la retirer.
            </p>
          </>}
        </div>

        <div>
          {/* ── Choisir ── */}
          {mode !== "mots" && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>2. Choisir</h3>
                {mode === "theme" && vivier && (
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {candidatsTheme.length} {uneParMot ? "mots" : "images"}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                {mode === "theme" && vivier && <>
                  <Input placeholder="Filtrer : cousin, maman…" value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ maxWidth: 200 }} />
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={uneParMot} onChange={(e) => setUneParMot(e.target.checked)} /> Une image par mot
                  </label>
                </>}
              </div>
              {mode === "theme" ? (
                !vivier ? (
                  <div style={{ marginTop: 10 }}><Empty icone="📚" titre="Choisissez un thème" sous="Ses images s'affichent ici : cliquez sur celles du loto." /></div>
                ) : (
                  <>
                    <div className="loto-grille">
                      {candidatsTheme.slice(0, limite).map(({ picto, variantes }) => (
                        <Tuile key={picto.id} picto={picto} choisi={choisis.has(picto.id)} variantes={uneParMot ? variantes : 1}
                          onClick={() => basculer(picto)} />
                      ))}
                    </div>
                    {candidatsTheme.length > limite && (
                      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setLimite((l) => l + PAR_PAGE)}>
                        Afficher {Math.min(PAR_PAGE, candidatsTheme.length - limite)} de plus
                      </button>
                    )}
                  </>
                )
              ) : (
                recherche.trim().length < 2 ? (
                  <div style={{ marginTop: 10 }}><Empty icone="🔎" titre="Cherchez une image" sous="Tapez un mot à gauche." /></div>
                ) : !resultats.length ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-2)" }}>Aucune image pour « {recherche} ».</div>
                ) : (
                  <div className="loto-grille">
                    {resultats.map((p) => <Tuile key={p.id} picto={p} choisi={choisis.has(p.id)} onClick={() => basculer(p)} />)}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── La sélection ── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{mode === "mots" ? "2" : "3"}. Mon loto</h3>
              <span style={{ fontSize: 13, color: selection.length && selection.length < parPlanche ? "var(--danger, #b03030)" : "var(--text-2)" }}>
                {selection.length} image{selection.length > 1 ? "s" : ""}
                {selection.length < conseille && ` · ${conseille} conseillées pour ${options.planches} planches variées`}
              </span>
              <div style={{ flex: 1 }} />
              {themes.length > 0 && vivier && (
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                  <button className="btn sm" onClick={completer} title="Ajoute au hasard des images du thème, d'autres mots que ceux déjà choisis">
                    🎲 Compléter au hasard jusqu'à
                  </button>
                  <Input type="number" min={1} max={80} value={jusqua} style={{ width: 64 }} aria-label="Nombre d'images voulues"
                    onChange={(e) => setJusqua(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} />
                </span>
              )}
              {selection.length > 0 && (
                <button className="btn sm ghost" onClick={() => { setRetires((r) => new Set([...r, ...selection.map((p) => p.id)])); setSelection([]); }}>
                  Tout retirer
                </button>
              )}
            </div>
            {!selection.length ? (
              <div style={{ marginTop: 10 }}>
                <Empty icone="🎴" titre="Aucune image pour l'instant"
                  sous="Cochez des images d'un thème, écrivez une liste de mots ou cherchez : elles se rangent ici." />
              </div>
            ) : (
              <div className="loto-grille">
                {selection.map((p) => (
                  <Tuile key={p.id} picto={p} choisi onClick={() => basculer(p)}
                    actions={<button className="btn sm loto-variantes" title="Choisir un autre dessin pour ce mot"
                      onClick={(e) => { e.stopPropagation(); setVariantesDe(p); }}>🔄</button>} />
                ))}
              </div>
            )}
          </div>

          {/* ── Imprimer ── */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{mode === "mots" ? "3" : "4"}. Imprimer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <Field label={`Nom du ${gen.quoi}`}>
                <Input value={titre} placeholder={themes.map(libelleCategorie).join(" + ") || gen.exemple} onChange={(e) => setTitre(e.target.value)} />
              </Field>
              <Field label={gen.id === "imagier" ? "Fiches par page" : "Grille"}>
                <Select value={`${options.colonnes}x${options.lignes}`}
                  onChange={(e) => {
                    const [c, l] = e.target.value.split("x").map(Number);
                    setOptions((o) => ({ ...o, colonnes: c, lignes: l }));
                  }}>
                  {gen.grilles.map(([v, libelle]) => <option key={v} value={v}>{libelle}</option>)}
                </Select>
              </Field>
              {gen.montre.planches && (
                <Field label={gen.id === "memory" ? "Nombre de feuilles" : "Nombre de planches"}>
                  <Input type="number" min={1} max={20} value={options.planches}
                    onChange={(e) => setOptions((o) => ({ ...o, planches: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))} />
                </Field>
              )}
            </div>
            {gen.montre.libelles && (
              <label className="pb-coche">
                <input type="checkbox" checked={options.libelles} onChange={(e) => setOptions((o) => ({ ...o, libelles: e.target.checked }))} />
                <span><b>Écrire le mot sous l'image</b><br />
                  <span style={{ color: "var(--text-2)" }}>
                    {gen.id === "imagier"
                      ? "Un imagier sans mot devient un jeu de cartes : à vous de voir."
                      : "Pour un non-lecteur, le texte n'apporte rien et charge l'image."}
                  </span>
                </span>
              </label>
            )}
            {gen.montre.cartes && (
              <label className="pb-coche">
                <input type="checkbox" checked={options.cartes} onChange={(e) => setOptions((o) => ({ ...o, cartes: e.target.checked }))} />
                <span><b>Ajouter les cartes à découper</b></span>
              </label>
            )}
            {selection.length > 0 && selection.length < minimum && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger, #b03030)" }}>{gen.manque(options)}</div>
            )}
            <button className="btn primary" style={{ marginTop: 12 }} disabled={occupe || selection.length < minimum} onClick={generer}>
              {occupe ? "Création…" : gen.bouton}
            </button>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, marginBottom: 0 }}>
              Pictogrammes ARASAAC — auteur Sergio Palao, origine Gouvernement d'Aragon,
              licence CC BY-NC-SA. L'attribution est portée sur chaque page. Usage
              pédagogique non commercial.
            </p>
          </div>
        </div>
      </div>

      {variantesDe && (
        <Variantes picto={variantesDe} onClose={() => setVariantesDe(null)}
          onChoisir={(p) => { setSelection((s) => remplacer(s, variantesDe.id, p)); setVariantesDe(null); }} />
      )}
    </>
  );
}

/** Une image à cocher : cadre coloré et coche quand elle est dans le loto. */
function Tuile({ picto, choisi, variantes = 1, onClick, actions }: {
  picto: PictoArasaac; choisi: boolean; variantes?: number; onClick: () => void; actions?: React.ReactNode;
}) {
  const src = usePictoImage(picto.id);
  return (
    <div className={`loto-tuile${choisi ? " choisie" : ""}`}>
      <button type="button" className="loto-tuile-bouton" onClick={onClick}
        title={choisi ? `Retirer « ${picto.mot} » du loto` : `Ajouter « ${picto.mot} » au loto`} aria-pressed={choisi}>
        {src ? <img src={src} alt="" /> : <div className="loto-tuile-vide" />}
        <span className="loto-tuile-mot">{picto.mot}</span>
        {choisi && <span className="loto-coche" aria-hidden="true">✓</span>}
        {variantes > 1 && <span className="loto-nb-variantes" title={`${variantes} dessins pour ce mot`}>+{variantes - 1}</span>}
      </button>
      {actions}
    </div>
  );
}

/** Les autres dessins d'un mot, pour remplacer celui du loto. */
function Variantes({ picto, onClose, onChoisir }: {
  picto: PictoArasaac; onClose: () => void; onChoisir: (p: PictoArasaac) => void;
}) {
  const [liste, setListe] = React.useState<PictoArasaac[] | null>(null);
  React.useEffect(() => {
    api.arasaacChercher(picto.mot, 48).then(setListe).catch(() => setListe([]));
  }, [picto.mot]);
  return (
    <Modal titre={`Autres dessins pour « ${picto.mot} »`} onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {!liste ? <div style={{ fontSize: 13, color: "var(--text-2)" }}>Recherche…</div> : (
        <div className="loto-grille">
          {liste.map((p) => <Tuile key={p.id} picto={p} choisi={p.id === picto.id} onClick={() => onChoisir(p)} />)}
        </div>
      )}
    </Modal>
  );
}
