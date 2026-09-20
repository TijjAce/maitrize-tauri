import React from "react";

export interface CtxItem {
  label: string;
  icon?: string;
  danger?: boolean;
  sep?: boolean;        // séparateur affiché AVANT cet item
  onClick?: () => void;
  /**
   * Un sous-menu, comme « Aligner les objets › » du système : l'item l'ouvre
   * au lieu d'agir. Un long menu se lit mieux en deux temps.
   */
  enfants?: CtxItem[];
}

/** Ouvre le menu contextuel au curseur avec les items donnés. */
export function openCtx(e: React.MouseEvent, items: CtxItem[]) {
  e.preventDefault();
  e.stopPropagation();
  window.dispatchEvent(new CustomEvent("maitrize:ctx", { detail: { x: e.clientX, y: e.clientY, items } }));
}

/** Hôte unique du menu contextuel (monté une fois dans App). */
export function ContextMenuHost() {
  const [state, setState] = React.useState<{ x: number; y: number; items: CtxItem[] } | null>(null);

  React.useEffect(() => {
    const onOpen = (e: Event) => setState((e as CustomEvent).detail);
    const onClose = () => setState(null);
    const onEchap = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("maitrize:ctx", onOpen);
    window.addEventListener("click", onClose);
    window.addEventListener("scroll", onClose, true);
    window.addEventListener("resize", onClose);
    window.addEventListener("keydown", onEchap);
    return () => {
      window.removeEventListener("maitrize:ctx", onOpen);
      window.removeEventListener("click", onClose);
      window.removeEventListener("scroll", onClose, true);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("keydown", onEchap);
    };
  }, []);

  if (!state) return null;
  return <Menu items={state.items} depart={{ x: state.x, y: state.y }} fermerTout={() => setState(null)} />;
}

/** Où se pose un sous-menu : contre l'item qui l'ouvre. */
interface Ancre { gauche: number; droite: number; haut: number }

/**
 * Un niveau de menu. Le menu racine se pose au curseur ; un sous-menu se pose
 * à droite de son item, ou à gauche s'il n'y a plus la place.
 */
function Menu({ items, depart, ancre, fermerTout, onRetour, autoFocus = true, onSurvol }: {
  items: CtxItem[];
  /** Menu racine : à l'endroit du clic. */
  depart?: { x: number; y: number };
  /** Sous-menu : contre l'item qui l'ouvre. */
  ancre?: Ancre;
  fermerTout: () => void;
  /** Sous-menu : revenir au menu parent (flèche gauche, Échap). */
  onRetour?: () => void;
  /** Un sous-menu ouvert à la souris ne vole pas le clavier. */
  autoFocus?: boolean;
  /** Le parent garde son sous-menu ouvert tant que la souris y est. */
  onSurvol?: () => void;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState({ x: depart?.x ?? -9999, y: depart?.y ?? -9999 });
  // L'item dont le sous-menu est ouvert, et comment il l'a été.
  const [ouvert, setOuvert] = React.useState<{ i: number; ancre: Ancre; clavier: boolean } | null>(null);
  const minuteur = React.useRef<number | undefined>(undefined);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (ancre) {
      // À droite de l'item ; à gauche si le bord de la fenêtre est trop près.
      let x = ancre.droite - 4;
      if (x + r.width > window.innerWidth - 8) x = Math.max(8, ancre.gauche - r.width + 4);
      setPos({ x, y: Math.max(8, Math.min(ancre.haut - 5, window.innerHeight - r.height - 8)) });
    } else if (depart) {
      setPos({
        x: Math.max(8, Math.min(depart.x, window.innerWidth - r.width - 8)),
        y: Math.max(8, Math.min(depart.y, window.innerHeight - r.height - 8)),
      });
    }
    if (autoFocus) el.querySelector<HTMLElement>(".ctx-item")?.focus();
  }, [depart?.x, depart?.y, ancre?.gauche, ancre?.droite, ancre?.haut]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const annulerFermeture = () => window.clearTimeout(minuteur.current);
  // Un instant de répit : la souris qui file en diagonale vers le sous-menu
  // traverse les items voisins sans le faire disparaître.
  const fermerBientot = () => {
    annulerFermeture();
    minuteur.current = window.setTimeout(() => setOuvert(null), 180);
  };

  const ouvrir = (i: number, el: HTMLElement, clavier: boolean) => {
    annulerFermeture();
    const r = el.getBoundingClientRect();
    const parent = ref.current?.getBoundingClientRect();
    setOuvert({ i, ancre: { gauche: parent?.left ?? r.left, droite: parent?.right ?? r.right, haut: r.top }, clavier });
  };

  const items_ = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(":scope > .ctx-item") ?? []);
  const onKeyDown = (e: React.KeyboardEvent) => {
    const liste = items_();
    if (!liste.length) return;
    const i = liste.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") { e.preventDefault(); liste[(i + 1) % liste.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); liste[(i - 1 + liste.length) % liste.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); liste[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); liste[liste.length - 1].focus(); }
    else if (e.key === "ArrowRight" && i >= 0 && items[i]?.enfants?.length) {
      e.preventDefault();
      ouvrir(i, liste[i], true);
    } else if ((e.key === "ArrowLeft" || e.key === "Escape") && onRetour) {
      e.preventDefault();
      e.stopPropagation(); // Échap referme ce sous-menu, pas tout le menu.
      onRetour();
    }
  };

  const sous = ouvert === null ? null : items[ouvert.i];
  return (
    <>
      <div ref={ref} className="ctx-menu" role="menu" aria-label="Menu contextuel" style={{ left: pos.x, top: pos.y }}
        onClick={(e) => e.stopPropagation()} onKeyDown={onKeyDown}
        onMouseEnter={() => { annulerFermeture(); onSurvol?.(); }}>
        {items.map((it, i) => {
          const aDesEnfants = Boolean(it.enfants?.length);
          return (
            <React.Fragment key={i}>
              {it.sep && <div className="ctx-sep" role="separator" />}
              <button role="menuitem" className={"ctx-item" + (it.danger ? " danger" : "") + (ouvert?.i === i ? " ouvert" : "")}
                aria-haspopup={aDesEnfants ? "menu" : undefined} aria-expanded={aDesEnfants ? ouvert?.i === i : undefined}
                onMouseEnter={(e) => (aDesEnfants ? ouvrir(i, e.currentTarget, false) : fermerBientot())}
                onClick={(e) => {
                  if (aDesEnfants) { ouvrir(i, e.currentTarget, true); return; }
                  fermerTout();
                  it.onClick?.();
                }}>
                {it.icon && <span className="ctx-ico" aria-hidden="true">{it.icon}</span>}
                {it.label}
                {aDesEnfants && <span className="ctx-fleche" aria-hidden="true">›</span>}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      {sous?.enfants && ouvert && (
        <Menu items={sous.enfants} ancre={ouvert.ancre} fermerTout={fermerTout} autoFocus={ouvert.clavier}
          onSurvol={annulerFermeture}
          onRetour={() => {
            setOuvert(null);
            items_()[ouvert.i]?.focus();
          }} />
      )}
    </>
  );
}
