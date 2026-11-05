import React from "react";
import {
  LIGNES_MAX, COLONNES_MAX, ajouterPage, casesPerdues, changerTaille, ditDeLaCase, fairePageDAccueil, imagesDuClasseur, nouvellePage, pageDe,
  poserCase, renommerPage, supprimerPage, texteDeLaPhrase, type Case, type Classeur, type MotDit,
} from "./modele";
import { dire, garderClasseur, lireImages, voixDisponibles, type VoixDisponible } from "./pont";
import { FicheCase } from "./FicheCase";
import { annoncer, confirmer, saisir } from "./Fenetre";

// ── Le classeur ouvert ────────────────────────────────────────────────────
//
// Pour parler : on touche une case, elle se dit et s'ajoute à la phrase ;
// une case qui ouvre une page y mène. La phrase se réentend d'un toucher.
// 🏠 ramène à l'accueil, ↩ à la page d'avant.
//
// Pour modifier : on tient le crayon une seconde — un élève n'y entre pas par
// mégarde. Chaque case s'ouvre dans sa fiche ; la page change de nom, de
// taille, devient l'accueil ; on en ajoute, on en retire. Tout se garde à
// mesure, et « ↶ » défait le dernier geste.

const APPUI_MS = 1000;

export function Ecran({ depart, onFermer }: { depart: Classeur; onFermer: (c: Classeur) => void }) {
  const [c, setC] = React.useState(depart);
  const [images, setImages] = React.useState<Record<string, string>>({});
  const [mode, setMode] = React.useState<"parler" | "modifier">("parler");
  const [pageId, setPageId] = React.useState(depart.accueil);
  const [chemin, setChemin] = React.useState<string[]>([]);
  const [phrase, setPhrase] = React.useState<MotDit[]>([]);
  const [fiche, setFiche] = React.useState<number | null>(null);
  const [passes, setPasses] = React.useState<Classeur[]>([]);
  const [appui, setAppui] = React.useState(false);
  const [voix, setVoix] = React.useState<VoixDisponible[]>([]);
  const minuteur = React.useRef<number | undefined>(undefined);
  const garde = React.useRef<Promise<void>>(Promise.resolve());

  const page = pageDe(c, pageId) ?? pageDe(c, c.accueil) ?? c.pages[0];

  // Les images du classeur, demandées une fois chacune (une image introuvable ne se redemande pas en boucle).
  const demandees = React.useRef(new Set<string>());
  React.useEffect(() => {
    const manquantes = imagesDuClasseur(c).filter((id) => !(id in images) && !demandees.current.has(id));
    if (!manquantes.length) return;
    manquantes.forEach((id) => demandees.current.add(id));
    void lireImages(manquantes).then((lues) => { if (Object.keys(lues).length) setImages((i) => ({ ...i, ...lues })); });
  }, [c, images]);

  // Tout se garde à mesure, un peu après le dernier geste.
  const premier = React.useRef(true);
  React.useEffect(() => {
    if (premier.current) { premier.current = false; return; }
    const t = window.setTimeout(() => {
      garde.current = garderClasseur(c).catch((e) => { annoncer(`Le classeur n'a pas pu être gardé : ${String((e as Error)?.message ?? e)}`); });
    }, 400);
    return () => window.clearTimeout(t);
  }, [c]);

  React.useEffect(() => { if (mode === "modifier" && !voix.length) void voixDisponibles().then(setVoix); }, [mode, voix.length]);

  const changer = (n: Classeur) => { setPasses((p) => [...p.slice(-40), c]); setC(n); };
  const annuler = () => {
    const avant = passes[passes.length - 1];
    if (!avant) return;
    setPasses(passes.slice(0, -1));
    setC(avant);
    if (!pageDe(avant, pageId)) setPageId(avant.accueil);
  };
  const fermer = async () => { await garderClasseur(c).catch(() => {}); await garde.current; onFermer(c); };

  // ── Parler ──────────────────────────────────────────────────────────────
  const toucher = (k: Case) => {
    const dit = ditDeLaCase(k);
    void dire(dit, c.voix);
    if (dit) setPhrase((p) => [...p, { mot: k.mot || dit, dire: dit, image: k.image }]);
    if (k.lien && pageDe(c, k.lien) && k.lien !== page.id) { setChemin((h) => [...h, page.id]); setPageId(k.lien); }
  };
  const direLaPhrase = () => { void dire(texteDeLaPhrase(phrase), c.voix); };
  const accueil = () => { setPageId(c.accueil); setChemin([]); };
  const retour = () => { const p = chemin[chemin.length - 1]; if (p) { setChemin(chemin.slice(0, -1)); setPageId(p); } };

  const tenir = (oui: boolean) => {
    window.clearTimeout(minuteur.current);
    setAppui(oui);
    if (oui) minuteur.current = window.setTimeout(() => { setAppui(false); setMode("modifier"); }, APPUI_MS);
  };

  // ── Modifier ────────────────────────────────────────────────────────────
  const poser = (index: number, k: Case | null, nomDeLaNouvellePage?: string) => {
    let n = c;
    if (k && nomDeLaNouvellePage) {
      const p = nouvellePage(nomDeLaNouvellePage, page.lignes, page.colonnes);
      n = ajouterPage(n, p);
      k = { ...k, lien: p.id };
      annoncer(`Page « ${p.nom} » créée : la case y mène.`);
    }
    changer(poserCase(n, page.id, index, k));
    setFiche(null);
  };
  const taille = async (lignes: number, colonnes: number) => {
    const perdues = casesPerdues(page, lignes, colonnes);
    if (perdues && !(await confirmer(`${perdues === 1 ? "Une case sortirait" : `${perdues} cases sortiraient`} de la page. Changer la taille quand même ?`, { oui: "Changer", danger: true }))) return;
    changer(changerTaille(c, page.id, lignes, colonnes));
  };
  const ajouter = async () => {
    const nom = await saisir("Le nom de la nouvelle page", "", "Créer");
    if (!nom) return;
    const p = nouvellePage(nom, page.lignes, page.colonnes);
    changer(ajouterPage(c, p));
    setPageId(p.id);
  };
  const retirer = async () => {
    if (c.pages.length <= 1) { annoncer("Un classeur garde au moins une page."); return; }
    const liens = c.pages.reduce((n, p) => n + p.cases.filter((k) => k?.lien === page.id).length, 0);
    const ok = await confirmer(`Retirer la page « ${page.nom} »${liens ? ` ? ${liens === 1 ? "Une case y mène" : `${liens} cases y mènent`} : elles n'ouvriront plus rien` : " ?"}`, { oui: "Retirer", danger: true });
    if (!ok) return;
    const n = supprimerPage(c, page.id);
    changer(n);
    setPageId(n.accueil);
  };

  const enModif = mode === "modifier";
  return (
    <div className={`ecran${enModif ? " en-modif" : ""}`}>
      <div className="barre-haut">
        <button className="bouton" onClick={() => { void fermer(); }} aria-label="Mes classeurs">‹ Classeurs</button>
        <div className="phrase" role="button" tabIndex={0} aria-label="Redire la phrase" onClick={direLaPhrase}>
          {phrase.length === 0 ? <span className="discret">{enModif ? c.nom : " "}</span> : phrase.map((m, i) => (
            <span key={i} className="mot-dit">
              {m.image && images[m.image] && <img src={images[m.image]} alt="" />}
              <span>{m.mot}</span>
            </span>
          ))}
        </div>
        <button className="bouton gros" aria-label="Redire la phrase" onClick={direLaPhrase}>🔊</button>
        <button className="bouton gros" aria-label="Effacer le dernier mot" onClick={() => setPhrase((p) => p.slice(0, -1))}>⌫</button>
        <button className="bouton gros" aria-label="Effacer la phrase" onClick={() => setPhrase([])}>✕</button>
      </div>

      <div className="barre-pages">
        <button className="bouton gros" aria-label="Accueil" disabled={page.id === c.accueil} onClick={accueil}>🏠</button>
        <button className="bouton gros" aria-label="Page d'avant" disabled={!chemin.length} onClick={retour}>↩</button>
        {enModif
          ? <>
            <select className="champ court" value={page.id} aria-label="La page" onChange={(e) => { setPageId(e.target.value); setChemin([]); }}>
              {c.pages.map((p) => <option key={p.id} value={p.id}>{p.id === c.accueil ? "🏠 " : ""}{p.nom}</option>)}
            </select>
            <input className="champ court" value={page.nom} aria-label="Le nom de la page" onChange={(e) => changer(renommerPage(c, page.id, e.target.value))} />
            <select className="champ etroit" value={page.lignes} aria-label="Lignes" onChange={(e) => { void taille(Number(e.target.value), page.colonnes); }}>
              {Array.from({ length: LIGNES_MAX }, (_, i) => <option key={i} value={i + 1}>{i + 1} lignes</option>)}
            </select>
            <select className="champ etroit" value={page.colonnes} aria-label="Colonnes" onChange={(e) => { void taille(page.lignes, Number(e.target.value)); }}>
              {Array.from({ length: COLONNES_MAX }, (_, i) => <option key={i} value={i + 1}>{i + 1} colonnes</option>)}
            </select>
            <button className="bouton" onClick={() => { void ajouter(); }}>＋ Page</button>
            <button className="bouton" disabled={page.id === c.accueil} onClick={() => changer(fairePageDAccueil(c, page.id))}>Faire l'accueil</button>
            <button className="bouton" onClick={() => { void retirer(); }}>Retirer la page</button>
            <select className="champ court" aria-label="La voix" value={c.voix?.id ?? ""}
              onChange={(e) => changer({ ...c, voix: { ...c.voix, id: e.target.value || undefined } })}>
              <option value="">Voix de l'appareil</option>
              {voix.map((v) => <option key={v.id} value={v.id}>{v.nom}{v.qualite > 1 ? " ★" : ""}</option>)}
            </select>
            <select className="champ etroit" aria-label="Le débit" value={String(c.voix?.debit ?? 1)}
              onChange={(e) => changer({ ...c, voix: { ...c.voix, debit: Number(e.target.value) } })}>
              <option value="0.8">Lent</option><option value="1">Normal</option><option value="1.15">Vif</option>
            </select>
            <span className="espace" />
            <button className="bouton" disabled={!passes.length} onClick={annuler} aria-label="Défaire">↶</button>
            <button className="bouton principal" onClick={() => setMode("parler")}>✓ Terminé</button>
          </>
          : <>
            <span className="nom-page">{page.nom}</span>
            <span className="espace" />
            <button className={`bouton crayon${appui ? " appui" : ""}`} aria-label="Modifier (tenir une seconde)"
              onPointerDown={() => tenir(true)} onPointerUp={() => tenir(false)} onPointerLeave={() => tenir(false)} onPointerCancel={() => tenir(false)}
              onContextMenu={(e) => e.preventDefault()}>✏️</button>
          </>}
      </div>

      <div className="grille" style={{ gridTemplateColumns: `repeat(${page.colonnes}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${page.lignes}, minmax(0, 1fr))` }}>
        {page.cases.map((k, i) => {
          if (enModif) {
            return (
              <button key={i} className={`case${k ? "" : " vide-modif"}${k?.masquee ? " cachee" : ""}${k?.lien ? " lien" : ""}`}
                style={k ? { background: k.fond, borderColor: k.bord } : undefined} onClick={() => setFiche(i)}>
                {k ? <>
                  {k.image && images[k.image] && <img src={images[k.image]} alt="" />}
                  <span className="mot">{k.mot}</span>
                  {k.lien && <span className="coin" aria-hidden>›</span>}
                  {k.masquee && <span className="marque" aria-hidden>caché</span>}
                </> : <span className="plus">＋</span>}
              </button>
            );
          }
          if (!k || k.masquee) return <div key={i} className="case vide" />;
          return (
            <button key={i} className={`case${k.lien ? " lien" : ""}`} style={{ background: k.fond, borderColor: k.bord }} onClick={() => toucher(k)}>
              {k.image && images[k.image] && <img src={images[k.image]} alt="" />}
              <span className="mot">{k.mot}</span>
              {k.lien && <span className="coin" aria-hidden>›</span>}
            </button>
          );
        })}
      </div>

      {fiche !== null && (
        <FicheCase classeur={c} page={page} valeur={page.cases[fiche] ?? null} images={images}
          onImage={(id, donnees) => setImages((i) => ({ ...i, [id]: donnees }))}
          onPoser={(k, nouvelle) => poser(fiche, k, nouvelle)} onFermer={() => setFiche(null)} />
      )}
    </div>
  );
}
