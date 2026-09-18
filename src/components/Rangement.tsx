import React from "react";
import { api, couleurHex, texteErreur } from "../api";
import { ColorPicker, Confirm, Demander, Modal, useAsync } from "./ui";
import { openCtx, type CtxItem } from "./ctxmenu";
import { toast } from "./Toaster";
import { IconeDossier, COULEUR_DOSSIER } from "./IconeDossier";
import { disposer, poser, lireDispositions, lirePositions, reporterDispositions, type Case, type Positions } from "../disposition";
import {
  sousDossiers, filDAriane, normaliser, parent, estDans, renommerChemin, destinationDossier,
  reporterCouleurs, lireCouleurs, SANS_COULEUR, couleurDe, type SousDossier,
} from "../dossiers";

// ── Ranger comme sur le bureau ─────────────────────────────────────────────
//
// Les ateliers, espaces, jeux, outils et affichages se rangent comme le plan
// de travail : des dossiers qu'on crée d'un clic droit, où l'on entre d'un
// double-clic, où l'on glisse une tuile ; chaque tuile garde la case où on
// l'a posée. Chaque onglet a ses propres dossiers.
//
// Un élément appartient à un dossier par son chemin (« Maths/Nombres »), écrit
// sur sa fiche. Les dossiers vides, leurs couleurs et la place des tuiles sont
// des réglages partagés entre les ordinateurs : « rangement:<onglet>:dossier:<chemin> »
// et « rangement:<onglet>:place:<chemin> ».

const CASE_L = 136, CASE_H = 186;
const TYPE_ELEMENT = "application/x-maitrize-rangement";
const TYPE_DOSSIER = "application/x-maitrize-rangement-dossier";
const vientDIci = (e: React.DragEvent) => Array.from(e.dataTransfer.types).some((t) => t === TYPE_ELEMENT || t === TYPE_DOSSIER);

/** Une tuile : ce qu'il faut pour la montrer et la ranger. */
export interface ElementRange {
  /** Unique dans l'onglet. */
  cle: string;
  titre: string;
  dossier: string;
  sousTitre?: string;
  /** Teinte du fond de l'aperçu (#rrggbb). */
  couleur?: string;
  apercu: React.ReactNode;
}

export function Rangement({ espace, racine, elements, dossier, setDossier, onOuvrir, onRanger, onSupprimer, onRecharger, actions, creations, vide, filtre = false }: {
  /** Nom de l'onglet, pour ses réglages : « jeux », « espaces »… */
  espace: string;
  /** Nom de la racine dans le fil d'Ariane. */
  racine: string;
  elements: ElementRange[];
  dossier: string;
  setDossier: (d: string) => void;
  onOuvrir: (cle: string) => void;
  /** Écrit le nouveau dossier sur la fiche de l'élément. */
  onRanger: (cle: string, dossier: string) => Promise<unknown>;
  onSupprimer: (cle: string) => void;
  onRecharger: () => void;
  /** Actions propres à l'élément, ajoutées à son menu (dupliquer…). */
  actions?: (cle: string) => CtxItem[];
  /** Ce qu'on crée d'un clic droit sur la surface, dans le dossier courant. */
  creations: { label: string; icon: string; onClick: () => void }[];
  vide: { icone: string; titre: string; sous: string };
  /**
   * Le bureau ne montre qu'une partie de ce qu'il contient (un onglet filtre).
   * Un dossier qui ne contient rien de ce qu'on regarde s'efface alors : sans
   * cela, chaque filtre traînerait les dossiers vides des autres.
   */
  filtre?: boolean;
}) {
  const prefixeDossier = `rangement:${espace}:dossier:`;
  const prefixePlace = `rangement:${espace}:place:`;
  const { data: reglages } = useAsync(() => api.settingsAll(), []);
  const [couleurs, setCouleurs] = React.useState<Record<string, string>>({});
  const [dispositions, setDispositions] = React.useState<Record<string, Positions>>({});
  React.useEffect(() => {
    if (!reglages) return;
    setCouleurs(lireCouleurs(reglages, prefixeDossier));
    setDispositions(lireDispositions(reglages, prefixePlace));
  }, [reglages, prefixeDossier, prefixePlace]);

  /** Réécrit des réglages, en base puis à l'écran. */
  const ecrire = async (ecritures: Record<string, string>) => {
    try {
      for (const [cle, valeur] of Object.entries(ecritures)) await api.settingSet(cle, valeur);
    } catch (e) {
      toast("Rangement non enregistré : " + texteErreur(e), { icone: "⚠️" });
      return;
    }
    setCouleurs((avant) => {
      const apres = { ...avant };
      for (const [cle, valeur] of Object.entries(ecritures)) {
        if (!cle.startsWith(prefixeDossier)) continue;
        const chemin = cle.slice(prefixeDossier.length);
        if (valeur) apres[chemin] = valeur; else delete apres[chemin];
      }
      return apres;
    });
    setDispositions((avant) => {
      const apres = { ...avant };
      for (const [cle, valeur] of Object.entries(ecritures)) {
        if (!cle.startsWith(prefixePlace)) continue;
        const chemin = cle.slice(prefixePlace.length);
        if (valeur) apres[chemin] = lirePositions(valeur); else delete apres[chemin];
      }
      return apres;
    });
  };

  const dossiers = sousDossiers(elements.map((e) => ({ id: e.cle, dossier: e.dossier })), dossier, filtre ? [] : Object.keys(couleurs));
  const ici = elements.filter((e) => normaliser(e.dossier) === dossier).sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
  const cleDossier = (d: SousDossier) => `d:${d.nom}`;

  // ── La surface ──
  const surfaceEl = React.useRef<HTMLDivElement | null>(null);
  const observateur = React.useRef<ResizeObserver | null>(null);
  const [largeur, setLargeur] = React.useState(() => Math.max(CASE_L, window.innerWidth - 320));
  const surfaceRef = React.useCallback((el: HTMLDivElement | null) => {
    observateur.current?.disconnect();
    surfaceEl.current = el;
    if (!el) return;
    const mesurer = () => { if (el.clientWidth) setLargeur(el.clientWidth); };
    mesurer();
    observateur.current = new ResizeObserver(mesurer);
    observateur.current.observe(el);
  }, []);
  const nbCols = Math.max(1, Math.floor(largeur / CASE_L));
  const cles = [...dossiers.map(cleDossier), ...ici.map((e) => e.cle)];
  const disposition = React.useMemo(() => disposer(cles, dispositions[dossier] ?? {}, nbCols),
    [cles.join("|"), dispositions, dossier, nbCols]); // eslint-disable-line react-hooks/exhaustive-deps
  const nbRangs = cles.length ? Math.max(...Object.values(disposition).map((c) => c.rang)) + 1 : 0;

  const glisse = React.useRef<{ cle: string; dx: number; dy: number } | null>(null);
  const [caseVisee, setCaseVisee] = React.useState<Case | null>(null);
  const [survol, setSurvol] = React.useState<string | null>(null);
  const caseSous = (x: number, y: number, decalage = { dx: CASE_L / 2, dy: 40 }): Case | null => {
    const el = surfaceEl.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const gauche = x - r.left - decalage.dx + CASE_L / 2, haut = y - r.top - decalage.dy + CASE_H / 2;
    return { col: Math.min(nbCols - 1, Math.max(0, Math.floor(gauche / CASE_L))), rang: Math.max(0, Math.floor(haut / CASE_H)) };
  };
  // Un filtre masque une partie du bureau : ce qu'on n'y voit pas garde sa
  // place quand on en déplace un autre, au lieu de l'oublier à chaque geste.
  const placesGardees = (visibles: Positions): Positions => ({ ...(dispositions[dossier] ?? {}), ...visibles });
  const commencerGlisser = (cle: string, e: React.DragEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    glisse.current = { cle, dx: e.clientX - r.left, dy: e.clientY - r.top };
  };
  const finirGlisser = () => { glisse.current = null; setCaseVisee(null); };
  const poserSurLaSurface = async (e: React.DragEvent) => {
    const g = glisse.current;
    const c = g ? caseSous(e.clientX, e.clientY, g) : null;
    finirGlisser();
    if (!g || !c || !disposition[g.cle]) return;
    const actuelle = disposition[g.cle];
    if (actuelle.col === c.col && actuelle.rang === c.rang) return;
    await ecrire({ [prefixePlace + dossier]: JSON.stringify(placesGardees(poser(disposition, g.cle, c, nbCols))) });
  };
  const caseCreation = React.useRef<Case | null>(null);

  // ── Ranger ──
  const [demande, setDemande] = React.useState<{ titre: string; label: string; valeur?: string; placeholder?: string; sur: (v: string) => void } | null>(null);
  const [aColorer, setAColorer] = React.useState<SousDossier | null>(null);
  const [aSupprimer, setASupprimer] = React.useState<SousDossier | null>(null);

  const ranger = async (cle: string, vers: string) => {
    const element = elements.find((e) => e.cle === cle);
    const cible = normaliser(vers);
    if (!element || normaliser(element.dossier) === cible) return;
    try {
      await onRanger(cle, cible);
      onRecharger();
      toast(cible ? `Rangé dans ${cible}` : `Sorti dans ${racine}`, { icone: "📂" });
    } catch (e) {
      toast("Non rangé : " + texteErreur(e), { icone: "⚠️" });
    }
  };

  /** Déplace ou renomme un dossier : tout ce qu'il contient le suit, couleurs et places comprises. */
  const deplacerDossier = async (chemin: string, arrivee: string, message: string) => {
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), chemin));
    try {
      for (const e of touches) await onRanger(e.cle, renommerChemin(normaliser(e.dossier), chemin, arrivee));
      await ecrire({
        ...reporterCouleurs(couleurs, chemin, arrivee, prefixeDossier),
        ...reporterDispositions(dispositions, chemin, arrivee, false, prefixePlace),
      });
    } catch (e) {
      toast("Dossier non déplacé : " + texteErreur(e), { icone: "⚠️" });
    }
    if (dossier && estDans(dossier, chemin)) setDossier(renommerChemin(dossier, chemin, arrivee));
    onRecharger();
    toast(message, { icone: "📁" });
  };

  const deposerSur = (dt: DataTransfer, cible: string) => {
    const d = dt.getData(TYPE_DOSSIER);
    if (d) {
      const arrivee = destinationDossier(d, cible);
      if (arrivee) void deplacerDossier(d, arrivee, cible ? `Dossier rangé dans ${cible}` : `Dossier sorti dans ${racine}`);
      return;
    }
    const cle = dt.getData(TYPE_ELEMENT);
    if (cle) void ranger(cle, cible);
  };

  const creerDossier = () => setDemande({
    titre: "Nouveau dossier", label: "Nom du dossier", placeholder: "Maths, Motricité…",
    sur: async (nom) => {
      const chemin = normaliser(dossier ? `${dossier}/${nom}` : nom);
      if (!chemin) return;
      const ecritures: Record<string, string> = {};
      if (!couleurs[chemin]) ecritures[prefixeDossier + chemin] = SANS_COULEUR;
      const c = caseCreation.current;
      caseCreation.current = null;
      if (c) ecritures[prefixePlace + dossier] = JSON.stringify(placesGardees(poser(disposition, `d:${chemin.slice(chemin.lastIndexOf("/") + 1)}`, c, nbCols)));
      await ecrire(ecritures);
    },
  });

  const renommerDossier = (d: SousDossier) => setDemande({
    titre: "Renommer le dossier", label: "Nouveau nom", valeur: d.nom,
    sur: (nom) => {
      const nouveau = normaliser(parent(d.chemin) ? `${parent(d.chemin)}/${nom}` : nom);
      if (nouveau && nouveau !== d.chemin) void deplacerDossier(d.chemin, nouveau, "Dossier renommé");
    },
  });

  /** Supprime un dossier en remontant son contenu d'un cran, sans rien effacer. */
  const viderDossier = async (d: SousDossier) => {
    const touches = elements.filter((e) => estDans(normaliser(e.dossier), d.chemin));
    try {
      for (const e of touches) await onRanger(e.cle, renommerChemin(normaliser(e.dossier), d.chemin, parent(d.chemin)));
      const { [d.chemin]: retiree, ...autres } = couleurs;
      await ecrire({
        ...reporterCouleurs(autres, d.chemin, parent(d.chemin), prefixeDossier),
        ...(retiree ? { [prefixeDossier + d.chemin]: "" } : {}),
        ...reporterDispositions(dispositions, d.chemin, parent(d.chemin), true, prefixePlace),
      });
    } catch (e) {
      toast("Dossier non supprimé : " + texteErreur(e), { icone: "⚠️" });
    }
    onRecharger();
    toast(`${touches.length} élément${touches.length > 1 ? "s" : ""} remonté${touches.length > 1 ? "s" : ""} d'un dossier`, { icone: "📂" });
  };

  const fil = filDAriane(dossier, racine);

  return (
    <>
      <div className="rangement-fil">
        {fil.map((n, i) => (
          <React.Fragment key={n.chemin || "racine"}>
            {i > 0 && <span style={{ color: "var(--text-2)" }}>›</span>}
            <button type="button"
              onClick={() => setDossier(n.chemin)}
              onDragOver={(e) => { if (vientDIci(e)) { e.preventDefault(); setSurvol(`fil:${n.chemin}`); } }}
              onDragLeave={() => setSurvol(null)}
              onDrop={(e) => { if (!vientDIci(e)) return; e.preventDefault(); setSurvol(null); finirGlisser(); deposerSur(e.dataTransfer, n.chemin); }}
              className={`rangement-fil-etape${survol === `fil:${n.chemin}` ? " survol" : ""}${i === fil.length - 1 ? " courante" : ""}`}>
              {i === 0 ? "🗂 " : ""}{n.nom}
            </button>
          </React.Fragment>
        ))}
        <div style={{ flex: 1 }} />
        {/* Ranger était caché dans un clic droit : personne ne le trouvait, et
            un bureau qui garde les trous d'un élément déplacé finit par
            ressembler à un désordre qu'on ne sait pas défaire. */}
        <button type="button" className="btn ghost sm" disabled={!dispositions[dossier]}
          title={dispositions[dossier]
            ? "Remettre les icônes en ordre : les dossiers d'abord, puis par nom"
            : "Déjà rangé : les icônes suivent l'ordre des noms"}
          onClick={() => { void ecrire({ [prefixePlace + dossier]: "" }); }}>
          🧹 Ranger
        </button>
      </div>

      <div
        onDragOver={(e) => {
          if (!vientDIci(e) || !glisse.current) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          const c = caseSous(e.clientX, e.clientY, glisse.current);
          setCaseVisee((avant) => (c && avant && avant.col === c.col && avant.rang === c.rang ? avant : c));
        }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setCaseVisee(null); }}
        onDrop={async (e) => { if (!vientDIci(e)) return; e.preventDefault(); await poserSurLaSurface(e); }}
        onContextMenu={(e) => {
          if ((e.target as HTMLElement).closest("[draggable]")) return;
          const caseClic = surfaceEl.current ? caseSous(e.clientX, e.clientY) : null;
          openCtx(e, [
            { label: "Nouveau dossier", icon: "📁", onClick: () => { caseCreation.current = caseClic; creerDossier(); } },
            ...creations.map((c, i) => ({ label: c.label, icon: c.icon, sep: i === 0, onClick: c.onClick })),
            ...(dispositions[dossier] ? [{ label: "Ranger par nom", icon: "🔤", sep: true, onClick: () => { void ecrire({ [prefixePlace + dossier]: "" }); } }] : []),
          ]);
        }}
        className="rangement-zone">
        {!dossiers.length && !ici.length ? (
          <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--text-2)" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>{dossier ? "📂" : vide.icone}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)" }}>{dossier ? "Dossier vide" : vide.titre}</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {dossier ? "Glissez-y des tuiles, ou clic droit pour créer." : vide.sous}
              <br />Clic droit pour créer un dossier.
            </div>
          </div>
        ) : (
          <div ref={surfaceRef} className="bureau-surface" style={{ height: Math.max(nbRangs + 1, 2) * CASE_H }}>
            {caseVisee && !survol && (
              <div className="bureau-case-visee" aria-hidden="true"
                style={{ left: caseVisee.col * CASE_L, top: caseVisee.rang * CASE_H, width: CASE_L, height: CASE_H }} />
            )}
            {dossiers.map((d) => {
              const c = disposition[cleDossier(d)];
              const saisi = () => glisse.current?.cle === cleDossier(d);
              return (
                <div key={d.chemin} className="bureau-case" style={{ left: c.col * CASE_L, top: c.rang * CASE_H, width: CASE_L }}>
                  <div draggable data-chemin={d.chemin} className={`rangement-tuile${survol === d.chemin ? " survol" : ""}`}
                    onDragStart={(e) => { e.dataTransfer.setData(TYPE_DOSSIER, d.chemin); e.dataTransfer.effectAllowed = "move"; commencerGlisser(cleDossier(d), e); }}
                    onDragEnd={finirGlisser}
                    onDoubleClick={() => setDossier(d.chemin)}
                    onDragOver={(e) => { if (!vientDIci(e) || saisi()) return; e.preventDefault(); e.stopPropagation(); setSurvol(d.chemin); }}
                    onDragLeave={() => setSurvol(null)}
                    onDrop={(e) => {
                      if (!vientDIci(e) || saisi()) return;
                      e.preventDefault(); e.stopPropagation(); setSurvol(null); finirGlisser(); deposerSur(e.dataTransfer, d.chemin);
                    }}
                    onContextMenu={(e) => openCtx(e, [
                      { label: "Ouvrir", icon: "📂", onClick: () => setDossier(d.chemin) },
                      { label: "Renommer", icon: "✏️", onClick: () => renommerDossier(d) },
                      { label: "Couleur…", icon: "🎨", onClick: () => setAColorer(d) },
                      { label: "Supprimer le dossier", icon: "🗑", danger: true, sep: true, onClick: () => setASupprimer(d) },
                    ])}
                    title={`${d.nom} — ${d.total} élément${d.total > 1 ? "s" : ""}`}>
                    <IconeDossier couleur={couleurHex[couleurDe(couleurs[d.chemin]) ?? ""] ?? COULEUR_DOSSIER} ouvert={survol === d.chemin} />
                    <div className="rangement-tuile-titre">{d.nom}</div>
                    <div className="rangement-tuile-sous">{d.total} élément{d.total > 1 ? "s" : ""}</div>
                  </div>
                </div>
              );
            })}
            {ici.map((e) => {
              const c = disposition[e.cle];
              const teinte = e.couleur ?? couleurHex.gray;
              return (
                <div key={e.cle} className="bureau-case" style={{ left: c.col * CASE_L, top: c.rang * CASE_H, width: CASE_L }}>
                  <div draggable className="rangement-tuile"
                    onDragStart={(ev) => { ev.dataTransfer.setData(TYPE_ELEMENT, e.cle); ev.dataTransfer.effectAllowed = "move"; commencerGlisser(e.cle, ev); }}
                    onDragEnd={finirGlisser}
                    onDoubleClick={() => onOuvrir(e.cle)}
                    onContextMenu={(ev) => openCtx(ev, [
                      { label: "Ouvrir", icon: "↗", onClick: () => onOuvrir(e.cle) },
                      ...(actions?.(e.cle) ?? []),
                      { label: "Ranger dans…", icon: "📂", onClick: () => setDemande({
                        titre: "Ranger dans…", label: "Chemin du dossier", valeur: e.dossier, placeholder: "Maths/Nombres",
                        sur: (chemin) => { void ranger(e.cle, chemin); },
                      }) },
                      { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => onSupprimer(e.cle) },
                    ])}
                    title={e.titre}>
                    <div className="rangement-apercu" style={{ background: teinte + "1f", border: `1px solid ${teinte}44` }}>{e.apercu}</div>
                    <div className="rangement-tuile-titre">{e.titre}</div>
                    {e.sousTitre && <div className="rangement-tuile-sous">{e.sousTitre}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {demande && (
        <Demander titre={demande.titre} label={demande.label} valeur={demande.valeur} placeholder={demande.placeholder}
          onClose={() => setDemande(null)} onValider={(v) => { setDemande(null); demande.sur(v); }} />
      )}
      {aColorer && (
        <Modal titre={`Couleur de « ${aColorer.nom} »`} onClose={() => setAColorer(null)}
          footer={<>
            <button className="btn" onClick={() => { void ecrire({ [prefixeDossier + aColorer.chemin]: SANS_COULEUR }); setAColorer(null); }}>Sans couleur</button>
            <button className="btn primary" onClick={() => setAColorer(null)}>Fermer</button>
          </>}>
          <ColorPicker value={couleurDe(couleurs[aColorer.chemin]) ?? ""}
            onChange={(c) => { void ecrire({ [prefixeDossier + aColorer.chemin]: c }); setAColorer(null); }} />
        </Modal>
      )}
      {aSupprimer && (
        <Confirm
          message={`Supprimer le dossier « ${aSupprimer.nom} » ? Son contenu (${aSupprimer.total} élément${aSupprimer.total > 1 ? "s" : ""}) ne sera pas effacé : il remontera d'un cran.`}
          onYes={() => viderDossier(aSupprimer)} onClose={() => setASupprimer(null)} />
      )}
    </>
  );
}
