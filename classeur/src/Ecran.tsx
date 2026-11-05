import React from "react";
import {
  LIGNES_MAX, COLONNES_MAX, ajouterPageSuivante, ajouterSectionApres, casesPerdues, changerSuite, changerTaille, deplacerSection,
  ditDeLaCase, fairePageDAccueil, fairePageDesCategories, imagesDuClasseur, nouvellePage, numeroDePage, pageDe, pageVoisine,
  poserCase, renommerPage, sectionDe, sectionsDe, supprimerPage, texteDeLaPhrase, type Case, type Classeur, type MotDit,
} from "./modele";
import { dire, garderClasseur, lireImages, voixDisponibles, type VoixDisponible } from "./pont";
import { FicheCase } from "./FicheCase";
import { Fenetre, annoncer, confirmer, saisir } from "./Fenetre";

// ── Le classeur ouvert ────────────────────────────────────────────────────
//
// Pour parler : on touche une case, elle se dit et s'ajoute à la phrase ;
// une case qui ouvre une page y mène — le numéro de cette page est dans son
// coin, comme dans le PODD. La phrase se réentend d'un toucher.
//
// Les pages se tournent comme celles d'un livre : en balayant la grille, ou
// en touchant ◀ ▶ en bas (un élève qui ne peut pas balayer le peut). Le nom
// de la page, en bas, ouvre la liste de toutes les pages. À droite, la
// colonne fixe de chaque page : la page 1, les catégories, le début de la
// section, le retour, « oups » — toujours à la même place.
//
// Pour modifier : on tient le crayon une seconde — un élève n'y entre pas par
// mégarde. Chaque case s'ouvre dans sa fiche ; la page change de nom, de
// taille, devient l'accueil ; on en ajoute, on en retire. Tout se garde à
// mesure, et « ↶ » défait le dernier geste.

const APPUI_MS = 1000;
/** Un balayage : assez long, plus horizontal que vertical ; lent, il compte encore (un élève peut balayer doucement). */
const BALAYAGE_PX = 60;
const BALAYAGE_MS = 2500;

/** La couleur d'une section, celle de son numéro sur les cases qui y mènent et en bas de ses pages. */
const COULEURS_SECTIONS = ["#f6c9c4", "#fbe3a6", "#bfe3cf", "#c8d9f6", "#ddd2ee", "#fad2b4", "#c3e7f2", "#e9d6c4", "#d6ecbd", "#f3cbe2"];
export const couleurDeSection = (numero: number) => COULEURS_SECTIONS[(Math.max(1, numero) - 1) % COULEURS_SECTIONS.length];
/** Un mot de neuf lettres ou plus s'écrit un peu plus petit sur un écran étroit, pour ne pas se couper au milieu. */
const classeDuMot = (mot: string) => (Math.max(0, ...mot.split(/[\s'’-]+/).map((m) => m.length)) >= 9 ? "mot long" : "mot");

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
  const [liste, setListe] = React.useState(false);
  const [entree, setEntree] = React.useState<"droite" | "gauche" | null>(null);
  const balayage = React.useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const vientDeBalayer = React.useRef(false);
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
    // La page défaite n'existe plus : on revient à celle d'où l'on venait.
    if (!pageDe(avant, pageId)) {
      const d = [...chemin].reverse().find((id) => pageDe(avant, id));
      setEntree(null);
      setPageId(d ?? avant.accueil);
    }
  };
  const fermer = async () => { await garderClasseur(c).catch(() => {}); await garde.current; onFermer(c); };

  // ── Parler ──────────────────────────────────────────────────────────────
  /** Va à une page ; ↩ y ramènera de là. `depuis` : le côté d'où la page arrive quand on la tourne. `dans` : le classeur
   *  où la chercher, quand elle vient d'y être ajoutée (l'état n'a pas encore suivi). */
  const aller = (id: string | undefined, depuis: "droite" | "gauche" | null = null, dans: Classeur = c) => {
    if (!id || id === page.id || !pageDe(dans, id)) return;
    setChemin((h) => [...h.slice(-60), page.id]);
    setEntree(depuis);
    setPageId(id);
  };
  const tourner = (sens: 1 | -1) => aller(pageVoisine(c, page.id, sens)?.id, sens === 1 ? "droite" : "gauche");
  const toucher = (k: Case) => {
    const dit = ditDeLaCase(k);
    void dire(dit, c.voix);
    if (dit) setPhrase((p) => [...p, { mot: k.mot || dit, dire: dit, image: k.image }]);
    if (k.lien) aller(k.lien);
  };
  const direLaPhrase = () => { void dire(texteDeLaPhrase(phrase), c.voix); };
  const accueil = () => { setEntree(null); setPageId(c.accueil); setChemin([]); };
  const retour = () => { const p = chemin[chemin.length - 1]; if (p) { setChemin(chemin.slice(0, -1)); setEntree(null); setPageId(p); } };
  /** « Oups » : quelque chose s'est mal passé — il se dit, sans entrer dans la phrase. */
  const oups = () => { void dire("oups", c.voix); };

  // Balayer la grille tourne la page ; le toucher qui finit un balayage n'est pas un appui sur une case.
  const debutBalayage = (e: React.PointerEvent) => { balayage.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId }; };
  const finBalayage = (e: React.PointerEvent) => {
    const b = balayage.current;
    balayage.current = null;
    if (!b || b.id !== e.pointerId || c.balayer === false) return;
    const dx = e.clientX - b.x, dy = e.clientY - b.y;
    if (Math.abs(dx) < BALAYAGE_PX || Math.abs(dx) < 1.5 * Math.abs(dy) || Date.now() - b.t > BALAYAGE_MS) return;
    vientDeBalayer.current = true;
    window.setTimeout(() => { vientDeBalayer.current = false; }, 80);
    window.clearTimeout(minuteur.current);
    tourner(dx < 0 ? 1 : -1);
  };

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
      n = ajouterSectionApres(n, page.id, p);
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
  const ajouterSection = async () => {
    const nom = await saisir("Le nom de la nouvelle section", "", "Créer");
    if (!nom) return;
    const p = nouvellePage(nom, page.lignes, page.colonnes);
    const n = ajouterSectionApres(c, page.id, p);
    changer(n);
    aller(p.id, "droite", n);
  };
  const ajouterSuite = () => {
    const base = sectionDe(c, page.id)?.pages[0]?.nom ?? page.nom;
    const p = nouvellePage(`${base.replace(/ \(suite\)$/, "")} (suite)`, page.lignes, page.colonnes);
    const n = ajouterPageSuivante(c, page.id, p);
    changer(n);
    aller(p.id, "droite", n);
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
  const numero = numeroDePage(c, page.id);
  const section = sectionDe(c, page.id);
  const couleur = couleurDeSection(section?.numero ?? 1);
  const debut = section && section.pages[0].id !== page.id ? section.pages[0] : undefined;
  const avant = pageVoisine(c, page.id, -1), apres = pageVoisine(c, page.id, 1);
  const coin = (k: Case) => k.lien && pageDe(c, k.lien)
    ? <span className="coin" aria-hidden style={{ background: couleurDeSection(sectionDe(c, k.lien)?.numero ?? 1) }}>{numeroDePage(c, k.lien)}</span>
    : null;

  return (
    <div className={`ecran${enModif ? " en-modif" : ""}`}>
      <div className="barre-haut">
        <button className="bouton" onClick={() => { void fermer(); }} aria-label="Mes classeurs">‹<span className="large-seulement"> Classeurs</span></button>
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

      {enModif && (
        <div className="barre-pages">
          <input className="champ court" value={page.nom} aria-label="Le nom de la page" onChange={(e) => changer(renommerPage(c, page.id, e.target.value))} />
          <select className="champ etroit" value={page.lignes} aria-label="Lignes" onChange={(e) => { void taille(Number(e.target.value), page.colonnes); }}>
            {Array.from({ length: LIGNES_MAX }, (_, i) => <option key={i} value={i + 1}>{i + 1} lignes</option>)}
          </select>
          <select className="champ etroit" value={page.colonnes} aria-label="Colonnes" onChange={(e) => { void taille(page.lignes, Number(e.target.value)); }}>
            {Array.from({ length: COLONNES_MAX }, (_, i) => <option key={i} value={i + 1}>{i + 1} colonnes</option>)}
          </select>
          <button className="bouton" onClick={ajouterSuite}>＋ Page suivante</button>
          <button className="bouton" onClick={() => { void ajouterSection(); }}>＋ Section</button>
          <label className="coche petite">
            <input type="checkbox" checked={!!page.suite} disabled={page.id === c.accueil}
              onChange={(e) => changer(changerSuite(c, page.id, e.target.checked))} /> Suite de la page d'avant
          </label>
          <button className="bouton" aria-label="Section plus tôt" disabled={(section?.numero ?? 1) <= 2}
            onClick={() => changer(deplacerSection(c, page.id, -1))}>◀ Section</button>
          <button className="bouton" aria-label="Section plus tard" disabled={!section || section.numero <= 1 || section.numero >= sectionsDe(c).length}
            onClick={() => changer(deplacerSection(c, page.id, 1))}>Section ▶</button>
          <button className="bouton" disabled={page.id === c.accueil} onClick={() => changer(fairePageDAccueil(c, page.id))}>En faire la page 1</button>
          <button className="bouton" disabled={page.id === c.categories} onClick={() => changer(fairePageDesCategories(c, page.id))}>En faire les catégories</button>
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
          <label className="coche petite">
            <input type="checkbox" checked={c.balayer !== false}
              onChange={(e) => changer({ ...c, balayer: e.target.checked ? undefined : false })} /> Balayer tourne les pages
          </label>
          <span className="espace" />
          <button className="bouton" disabled={!passes.length} onClick={annuler} aria-label="Défaire">↶</button>
          <button className="bouton principal" onClick={() => setMode("parler")}>✓ Terminé</button>
        </div>
      )}

      <div className="corps" onPointerDown={debutBalayage} onPointerUp={finBalayage} onPointerCancel={() => { balayage.current = null; }}
        onClickCapture={(e) => { if (vientDeBalayer.current) { e.stopPropagation(); e.preventDefault(); } }}>
        <div key={page.id} className={`grille${entree ? ` entree-${entree}` : ""}`}
          style={{ gridTemplateColumns: `repeat(${page.colonnes}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${page.lignes}, minmax(0, 1fr))` }}>
          {page.cases.map((k, i) => {
            if (enModif) {
              return (
                <button key={i} className={`case${k ? "" : " vide-modif"}${k?.masquee ? " cachee" : ""}${k?.lien ? " lien" : ""}`}
                  style={k ? { background: k.fond, borderColor: k.bord } : undefined} onClick={() => setFiche(i)}>
                  {k ? <>
                    {k.image && images[k.image] && <img src={images[k.image]} alt="" />}
                    <span className={classeDuMot(k.mot)}>{k.mot}</span>
                    {coin(k)}
                    {k.masquee && <span className="marque" aria-hidden>caché</span>}
                  </> : <span className="plus">＋</span>}
                </button>
              );
            }
            if (!k || k.masquee) return <div key={i} className="case vide" />;
            return (
              <button key={i} className={`case${k.lien ? " lien" : ""}`} style={{ background: k.fond, borderColor: k.bord }} onClick={() => toucher(k)}>
                {k.image && images[k.image] && <img src={images[k.image]} alt="" />}
                <span className={classeDuMot(k.mot)}>{k.mot}</span>
                {coin(k)}
              </button>
            );
          })}
        </div>

        <div className="operations" role="toolbar" aria-label="Aller dans le classeur">
          <button className="operation" disabled={page.id === c.accueil} onClick={accueil}><span className="op-icone">🏠</span><span>Page 1</span></button>
          {c.categories && pageDe(c, c.categories) && (
            <button className="operation" disabled={page.id === c.categories} onClick={() => aller(c.categories)}>
              <span className="op-icone">▦</span><span>Catégories</span>
            </button>
          )}
          {debut && (
            <button className="operation" style={{ borderColor: couleur }} onClick={() => aller(debut.id, "gauche")}>
              <span className="op-icone">⤒</span><span>Page {numeroDePage(c, debut.id)}</span>
            </button>
          )}
          <button className="operation" disabled={!chemin.length} onClick={retour}><span className="op-icone">↩</span><span>Retour</span></button>
          <button className="operation" onClick={oups}><span className="op-icone">😮</span><span>Oups</span></button>
        </div>
      </div>

      <div className="barre-bas">
        <button className="bouton tourne" aria-label="Page d'avant" disabled={!avant} onClick={() => tourner(-1)}>◀</button>
        <button className="page-ici" aria-label="Toutes les pages" onClick={() => setListe(true)}>
          <span className="numero" style={{ background: couleur }}>{numero}</span>
          <span className="nom-page">{page.nom}</span>
        </button>
        <button className="bouton tourne" aria-label="Tourner la page" disabled={!apres} onClick={() => tourner(1)}>▶</button>
        {!enModif && (
          <button className={`bouton crayon${appui ? " appui" : ""}`} aria-label="Modifier (tenir une seconde)"
            onPointerDown={() => tenir(true)} onPointerUp={() => tenir(false)} onPointerLeave={() => tenir(false)} onPointerCancel={() => tenir(false)}
            onContextMenu={(e) => e.preventDefault()}>✏️</button>
        )}
      </div>

      {liste && (
        <Fenetre titre="Les pages" onFermer={() => setListe(false)} large>
          <div className="sommaire">
            {sectionsDe(c).map((s) => (
              <div key={s.numero} className="sommaire-section">
                {s.pages.map((p) => (
                  <button key={p.id} className={`sommaire-page${p.id === page.id ? " ici" : ""}`} onClick={() => { setListe(false); aller(p.id); }}>
                    <span className="numero" style={{ background: couleurDeSection(s.numero) }}>{numeroDePage(c, p.id)}</span>
                    <span>{p.nom}</span>
                    {p.id === c.categories && <span className="discret">· catégories</span>}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </Fenetre>
      )}

      {fiche !== null && (
        <FicheCase classeur={c} page={page} valeur={page.cases[fiche] ?? null} images={images}
          onImage={(id, donnees) => setImages((i) => ({ ...i, [id]: donnees }))}
          onPoser={(k, nouvelle) => poser(fiche, k, nouvelle)} onFermer={() => setFiche(null)} />
      )}
    </div>
  );
}
