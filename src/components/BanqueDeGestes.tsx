import React from "react";
import { api, raccourci, texteErreur } from "../api";
import { toast } from "./Toaster";
import { chargerImage } from "./imagesTexte";
import { chargerPicto, memoriserImage } from "./ChoixPicto";
import { imageReduite, type ImagePerso } from "./MesImages";
import { nouvelIdPerso } from "../imagesPerso";
import { GESTES, gesteDuFichier, legendeDuGeste, type ImagesGestes } from "../gestesBM";

// ── Les images des gestes Borel-Maisonny ───────────────────────────────────
//
// L'application n'en contient aucune : les photos de la méthode appartiennent
// à son éditeur, les dessins à leurs auteurs. L'enseignant apporte les
// siennes — celles de sa méthode, un jeu de dessins qu'il a le droit
// d'utiliser en classe —, une fois. Elles se rangent par son, dans les
// fichiers de Maitrize, et servent ensuite à toutes les feuilles.
//
// Nommées par leur son (« a.png », « ch.jpg », « …-Son-OU.png »), elles se
// rangent toutes seules ; les autres se rangent d'un choix dans une liste.
// Une image copiée — la capture d'un geste dans un document qu'on a sous les
// yeux — se colle aussi : elle attend qu'on lui donne son son.

/** Le réglage qui garde, pour chaque son, le fichier de son image. Préfixe « fabriquer: » : il suit les sauvegardes. */
const CLE = "fabriquer:gestesBM";
/** Le plus grand côté d'une image gardée : de quoi l'imprimer en affiche. */
const COTE_IMAGE = 1200;
/** Le plus grand côté d'une vignette : une carte à manipuler, un geste dans la suite d'un mot. */
const COTE_VIGNETTE = 360;
/** Le plus grand côté d'une image dans un jeu : la case d'un loto, la carte d'un mémory. */
const COTE_JEU = 700;
/** Émis quand la banque change : l'autre atelier ouvert se met à jour. */
const EVT = "maitrize:gestes-bm";

type Fichiers = Record<string, string>;

function lire(brut: string | null | undefined): Fichiers {
  try {
    const lu = JSON.parse(brut ?? "");
    if (!lu || typeof lu !== "object" || Array.isArray(lu)) return {};
    return Object.fromEntries(Object.entries(lu as Record<string, unknown>)
      .filter((paire): paire is [string, string] => GESTES.some((g) => g.id === paire[0]) && typeof paire[1] === "string" && paire[1] !== ""));
  } catch {
    return {};
  }
}

const vignettes = new Map<string, Promise<string>>();

/** La vignette d'une image gardée, réduite une fois par séance de travail. */
function vignetteDe(fichier: string, source: string): Promise<string> {
  let p = vignettes.get(fichier);
  if (!p) {
    p = imageReduite(source, COTE_VIGNETTE);
    p.catch(() => vignettes.delete(fichier));
    vignettes.set(fichier, p);
  }
  return p;
}

/** Sous quel identifiant chaque image de geste s'est rangée parmi les images de l'enseignant, pour la séance de travail. */
const idsDeJeu = new Map<string, number>();

/**
 * Les gestes, prêts à entrer dans un loto, un mémory, un imagier : des images
 * de l'enseignant comme les autres, chacune sous l'écriture de son son. Les
 * redemander ne les double pas : un geste garde son identifiant.
 */
export async function gestesPourLesJeux(seulement?: string[]): Promise<ImagePerso[]> {
  const fichiers = lire(await api.settingGet(CLE));
  const sortie: ImagePerso[] = [];
  for (const g of GESTES) {
    const fichier = fichiers[g.id];
    if (!fichier || (seulement && !seulement.includes(g.id))) continue;
    try {
      let id = idsDeJeu.get(fichier);
      if (id == null) {
        const src = await imageReduite(await chargerImage(fichier), COTE_JEU);
        id = nouvelIdPerso();
        memoriserImage(id, src);
        idsDeJeu.set(fichier, id);
      }
      sortie.push({ id, mot: g.graphies[0], src: await chargerPicto(id) });
    } catch { /* image illisible : ce geste manque au jeu, pas les autres */ }
  }
  return sortie;
}

let demande: { sons: string[]; quand: number } | null = null;

/** Depuis l'atelier des gestes : le jeu qu'on ouvre à l'instant commence avec ces gestes. */
export function demanderLesGestesAuJeu(sons: string[]): void {
  demande = { sons, quand: Date.now() };
}

/** Les gestes qu'on vient de demander pour le jeu qui s'ouvre — une seule fois, et seulement dans l'instant. */
export function gestesDemandes(): string[] | null {
  const d = demande;
  demande = null;
  return d && Date.now() - d.quand < 5000 ? d.sons : null;
}

/** Combien de sons ont leur image : de quoi proposer d'en faire un jeu, sans relire une seule image. */
export function useNombreDeGestes(): number {
  const [combien, setCombien] = React.useState(0);
  React.useEffect(() => {
    const compter = () => { api.settingGet(CLE).then((brut) => setCombien(Object.keys(lire(brut)).length)).catch(() => setCombien(0)); };
    compter();
    window.addEventListener(EVT, compter);
    return () => window.removeEventListener(EVT, compter);
  }, []);
  return combien;
}

/** Une image qu'on n'a pas su ranger : son nom ne dit pas le son. */
export interface ARanger { nom: string; fichier: File }

export interface BanqueGestes {
  /** Les images, par son : en grand pour les cartes, en vignette pour les suites de gestes. */
  images: ImagesGestes;
  vignettes: ImagesGestes;
  /** Vrai une fois les images relues : avant, on ne sait pas encore ce qui manque. */
  pret: boolean;
  /** Combien de sons ont leur image. */
  combien: number;
  poser: (id: string, fichier: Blob) => Promise<void>;
  retirer: (id: string) => Promise<void>;
  /** Range plusieurs images d'après leur nom ; rend celles qu'il faudra ranger à la main. */
  importer: (fichiers: File[]) => Promise<ARanger[]>;
}

/** La banque d'images des gestes : ce que l'enseignant a apporté, relu et prêt à imprimer. */
export function useBanqueDeGestes(): BanqueGestes {
  const [fichiers, setFichiers] = React.useState<Fichiers | null>(null);
  const [images, setImages] = React.useState<ImagesGestes>({});
  const [petites, setPetites] = React.useState<ImagesGestes>({});
  const [pret, setPret] = React.useState(false);
  const courant = React.useRef<Fichiers>({});

  const relire = React.useCallback(() => {
    api.settingGet(CLE).then((brut) => { const f = lire(brut); courant.current = f; setFichiers(f); }).catch(() => setFichiers({}));
  }, []);
  React.useEffect(() => {
    relire();
    window.addEventListener(EVT, relire);
    return () => window.removeEventListener(EVT, relire);
  }, [relire]);

  // Les images se relisent quand la liste change ; une image illisible manque, sans retenir les autres.
  React.useEffect(() => {
    if (!fichiers) return;
    let vivant = true;
    void (async () => {
      const grandes: ImagesGestes = {}, reduites: ImagesGestes = {};
      await Promise.all(Object.entries(fichiers).map(async ([id, fichier]) => {
        try {
          grandes[id] = await chargerImage(fichier);
          reduites[id] = await vignetteDe(fichier, grandes[id]).catch(() => grandes[id]);
        } catch { /* fichier disparu : le son redevient « à ajouter » */ }
      }));
      if (vivant) { setImages(grandes); setPetites(reduites); setPret(true); }
    })();
    return () => { vivant = false; };
  }, [fichiers]);

  const enregistrer = React.useCallback(async (suite: Fichiers) => {
    courant.current = suite;
    await api.settingSet(CLE, JSON.stringify(suite));
    setFichiers(suite);
    window.dispatchEvent(new Event(EVT));
  }, []);

  /** Réduit une image, la garde dans les fichiers de Maitrize, et rend son nom. */
  const garder = async (id: string, fichier: Blob): Promise<string> => {
    const source = await imageReduite(fichier, COTE_IMAGE);
    const [, type, base64] = /^data:image\/([a-z]+);base64,(.*)$/.exec(source) ?? [];
    if (!base64) throw new Error("Image illisible.");
    return api.fichierSave(`geste-${id}.${type === "jpeg" ? "jpg" : type}`, base64);
  };

  const poser = React.useCallback(async (id: string, fichier: Blob) => {
    const ancien = courant.current[id];
    const nom = await garder(id, fichier);
    await enregistrer({ ...courant.current, [id]: nom });
    if (ancien && ancien !== nom) api.fichierDelete(ancien).catch(() => {});
  }, [enregistrer]);

  const retirer = React.useCallback(async (id: string) => {
    const ancien = courant.current[id];
    const suite = { ...courant.current };
    delete suite[id];
    await enregistrer(suite);
    if (ancien) api.fichierDelete(ancien).catch(() => {});
  }, [enregistrer]);

  const importer = React.useCallback(async (liste: File[]) => {
    const aRanger: ARanger[] = [];
    const suite = { ...courant.current };
    const remplaces: string[] = [];
    for (const f of liste) {
      const id = gesteDuFichier(f.name);
      if (!id) { aRanger.push({ nom: f.name, fichier: f }); continue; }
      try {
        const nom = await garder(id, f);
        if (suite[id] && suite[id] !== nom) remplaces.push(suite[id]);
        suite[id] = nom;
      } catch {
        toast(`« ${f.name} » ne se lit pas : préférez un PNG ou un JPEG.`, { icone: "⚠️" });
      }
    }
    await enregistrer(suite);
    for (const ancien of remplaces) api.fichierDelete(ancien).catch(() => {});
    return aRanger;
  }, [enregistrer]);

  return { images, vignettes: petites, pret, combien: Object.keys(images).length, poser, retirer, importer };
}

/** Le panneau de la banque : les trente-quatre sons, leur image ou la place qui l'attend. */
export function BanqueDeGestes({ banque }: { banque: BanqueGestes }) {
  const plusieurs = React.useRef<HTMLInputElement>(null);
  const une = React.useRef<HTMLInputElement>(null);
  const [cible, setCible] = React.useState("");
  const [aRanger, setARanger] = React.useState<ARanger[]>([]);
  const [occupe, setOccupe] = React.useState(false);
  const apercus = React.useMemo(() => new Map(aRanger.map((x) => [x, URL.createObjectURL(x.fichier)])), [aRanger]);
  React.useEffect(() => () => { for (const url of apercus.values()) URL.revokeObjectURL(url); }, [apercus]);

  const importer = async (fichiers: File[]) => {
    if (!fichiers.length) return;
    setOccupe(true);
    try {
      const restants = await banque.importer(fichiers);
      const ranges = fichiers.length - restants.length;
      setARanger((avant) => [...avant, ...restants]);
      toast(`${ranges} image${ranges > 1 ? "s" : ""} rangée${ranges > 1 ? "s" : ""} par ${ranges > 1 ? "leur" : "son"} nom`
        + (restants.length ? ` · ${restants.length} à ranger à la main, ci-dessous` : "."), { icone: "🖼" });
    } catch (e) {
      toast(texteErreur(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };

  // Une image collée : rangée par son nom s'il dit le son (un fichier copié), sinon mise en attente.
  const collees = React.useRef(0);
  const recevoir = React.useRef(importer);
  recevoir.current = importer;
  React.useEffect(() => {
    const coller = (e: ClipboardEvent) => {
      const images = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      // Du texte collé dans un champ reste du texte : on ne prend que les images.
      if (!images.length) return;
      e.preventDefault();
      const nommees = images.filter((f) => gesteDuFichier(f.name));
      const anonymes = images.filter((f) => !gesteDuFichier(f.name));
      if (nommees.length) void recevoir.current(nommees);
      if (anonymes.length) {
        setARanger((avant) => [...avant, ...anonymes.map((f) => ({ nom: `image collée ${++collees.current}`, fichier: f }))]);
        toast(`Image collée : choisissez son son dans « À ranger ».`, { icone: "🖼" });
      }
    };
    document.addEventListener("paste", coller);
    return () => document.removeEventListener("paste", coller);
  }, []);

  const poser = async (id: string, fichier: Blob, apres?: () => void) => {
    setOccupe(true);
    try { await banque.poser(id, fichier); apres?.(); }
    catch (e) { toast(`Cette image ne se lit pas (${texteErreur(e)}). Préférez un PNG ou un JPEG.`, { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  return (
    <div className="gb-banque">
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <b style={{ fontSize: 13 }}>Mes images des gestes</b>
        <span className="meta" style={{ fontSize: 12 }}>{banque.pret ? `${banque.combien} sur ${GESTES.length}` : "lecture…"}</span>
      </div>
      <p className="meta" style={{ fontSize: 12, lineHeight: 1.5, margin: "4px 0 8px" }}>
        Les images des gestes appartiennent à leurs auteurs : Maitrize n'en contient pas. Apportez les vôtres — celles de votre
        méthode, des dessins que vous avez le droit d'utiliser en classe. Nommées par leur son (<code>a.png</code>,
        <code> ch.jpg</code>, <code>ou.png</code>…), elles se rangent toutes seules ; elles restent sur votre ordinateur.
        Une image copiée se colle aussi ({raccourci("V")}) : la capture d'un geste dans un document ouvert à l'écran, par exemple.
      </p>
      <button type="button" className="btn sm" disabled={occupe} onClick={() => plusieurs.current?.click()}>
        {occupe ? "Lecture des images…" : "🖼 Importer des images…"}
      </button>
      <input ref={plusieurs} type="file" accept="image/*" multiple hidden aria-label="Importer des images de gestes"
        onChange={(e) => { const f = [...(e.target.files ?? [])]; e.target.value = ""; void importer(f); }} />
      <input ref={une} type="file" accept="image/*" hidden aria-label="Choisir l'image d'un geste"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f && cible) void poser(cible, f); }} />

      {aRanger.length > 0 && (
        <div className="gb-a-ranger">
          <div className="meta" style={{ fontSize: 12 }}>À ranger : choisissez le son de chaque image.</div>
          {aRanger.map((x) => (
            <div key={x.nom + x.fichier.size} className="gb-a-ranger-ligne">
              <img src={apercus.get(x)} alt="" />
              <span className="meta" title={x.nom}>{x.nom}</span>
              <select className="input" defaultValue="" aria-label={`Le son de ${x.nom}`}
                onChange={(e) => { const id = e.target.value; if (id) void poser(id, x.fichier, () => setARanger((avant) => avant.filter((y) => y !== x))); }}>
                <option value="">Son…</option>
                {GESTES.map((g) => <option key={g.id} value={g.id}>{legendeDuGeste(g, true)}</option>)}
              </select>
              <button type="button" className="btn ghost sm" aria-label={`Écarter ${x.nom}`} onClick={() => setARanger((avant) => avant.filter((y) => y !== x))}>×</button>
            </div>
          ))}
        </div>
      )}

      <div className="gb-cases" role="list" aria-label="Les sons et leur image">
        {GESTES.map((g) => {
          const image = banque.vignettes[g.id] ?? banque.images[g.id];
          return (
            <div key={g.id} role="listitem" className={`gb-case${image ? " pleine" : ""}`}>
              <button type="button" className="gb-case-image" disabled={occupe}
                title={image ? `Remplacer l'image de « ${g.graphies[0]} »` : `Choisir l'image de « ${g.graphies[0]} »`}
                onClick={() => { setCible(g.id); une.current?.click(); }}>
                {image ? <img src={image} alt="" /> : <span aria-hidden="true">＋</span>}
              </button>
              <span className="gb-case-son">{g.graphies[0]}</span>
              {image && (
                <button type="button" className="gb-case-x" aria-label={`Retirer l'image de ${g.graphies[0]}`}
                  onClick={() => { void banque.retirer(g.id); }}>×</button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
