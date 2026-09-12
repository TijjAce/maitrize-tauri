import React from "react";
import { COULEURS, couleurHex } from "../api";

export function Modal({ titre, onClose, children, footer, large }: {
  titre: string; onClose: () => void; children: React.ReactNode;
  footer?: React.ReactNode; large?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const titreId = React.useId();

  // Accessibilité : focus initial dans la boîte + restauration à la fermeture.
  React.useEffect(() => {
    const precedent = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((n) => n.offsetParent !== null);
    (focusables()[0] ?? ref.current)?.focus();
    return () => precedent?.focus?.();
  }, []);

  // Échap pour fermer + piège de focus (Tab boucle dans la boîte).
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.stopPropagation(); onClose(); return; }
    if (e.key !== "Tab") return;
    const f = Array.from(ref.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ) ?? []).filter((n) => n.offsetParent !== null);
    if (f.length === 0) return;
    const premier = f[0], dernier = f[f.length - 1];
    if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
    else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
  };

  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={titreId}
        tabIndex={-1} onKeyDown={onKeyDown} style={large ? { maxWidth: 880 } : undefined}>
        <div className="modal-head">
          <h2 id={titreId}>{titre}</h2>
          <div className="spacer" />
          <button className="btn ghost sm" aria-label="Fermer" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />;
}
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

export function Empty({ icone, titre, sous }: { icone: string; titre: string; sous?: string }) {
  return (
    <div className="empty">
      <div className="big">{icone}</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>{titre}</div>
      {sous && <div style={{ marginTop: 6 }}>{sous}</div>}
    </div>
  );
}

export function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <span className="stars" role={onChange ? "group" : "img"} aria-label={`Note : ${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={"star" + (n <= value ? " on" : "")}
          {...(onChange
            ? {
                role: "button", tabIndex: 0, "aria-label": `${n} étoile${n > 1 ? "s" : ""}`, "aria-pressed": n <= value,
                onClick: () => onChange(n === value ? 0 : n),
                onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChange(n === value ? 0 : n); } },
              }
            : { "aria-hidden": true })}>★</span>
      ))}
    </span>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
      {COULEURS.map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} title={c}
          aria-label={`Couleur ${c}`} aria-pressed={value === c}
          style={{
            width: 26, height: 26, borderRadius: 7, background: couleurHex[c],
            border: value === c ? "3px solid var(--text)" : "2px solid transparent",
            cursor: "pointer",
          }} />
      ))}
    </div>
  );
}

export function Dot({ couleur }: { couleur: string }) {
  return <span className="dot" style={{ background: couleurHex[couleur] || couleurHex.blue }} />;
}

/**
 * Demande une courte saisie à l'enseignant.
 *
 * Remplace `window.prompt`, que la fenêtre d'application n'implémente pas :
 * l'appel ne faisait rien, silencieusement, et le bouton paraissait mort.
 * `confirm` et `alert` fonctionnent, `prompt` non — d'où ce composant plutôt
 * qu'un correctif au cas par cas.
 */
export function Demander({ titre, label, valeur, placeholder, onClose, onValider }: {
  titre: string; label?: string; valeur?: string; placeholder?: string;
  onClose: () => void; onValider: (v: string) => void;
}) {
  const [v, setV] = React.useState(valeur ?? "");
  const valider = () => { const x = v.trim(); if (x) onValider(x); else onClose(); };
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-head"><h2>{titre}</h2></div>
        <div className="modal-body">
          {label && <label style={{ fontSize: 13, color: "var(--text-2)" }}>{label}</label>}
          <Input autoFocus value={v} placeholder={placeholder}
            onChange={(e) => setV(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); valider(); }
              if (e.key === "Escape") onClose();
            }} />
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" onClick={valider}>Valider</button>
        </div>
      </div>
    </div>
  );
}

export function Confirm({ message, onYes, onClose }: {
  message: string; onYes: () => void; onClose: () => void;
}) {
  return (
    <Modal titre="Confirmer" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn danger" onClick={() => { onYes(); onClose(); }}>Supprimer</button>
      </>}>
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

/// ⌘←/→ (ou Ctrl) pour naviguer entre les segments d'un onglet courant.
/// Inactif pendant l'édition de texte. À appeler dans chaque écran segmenté.
// Vrai quand la page hôte est affichée. Avec le keep-alive, les pages non
// visibles restent montées : ce contexte permet à leurs raccourcis clavier
// globaux de ne pas réagir (sinon leur sous-onglet dériverait en arrière-plan).
export const PageVisibleContext = React.createContext(true);

export function useSegmentNav<T extends string>(ids: readonly T[], current: T, set: (v: T) => void) {
  const visible = React.useContext(PageVisibleContext);
  React.useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      const i = ids.indexOf(current);
      if (i < 0) return;
      if (e.key === "ArrowLeft" && i > 0) { e.preventDefault(); set(ids[i - 1]); }
      if (e.key === "ArrowRight" && i < ids.length - 1) { e.preventDefault(); set(ids[i + 1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ids, current, set, visible]);
}

/** Nom de l'événement émis par la palette pour ouvrir un sous-onglet. */
export const EVT_ONGLET = "maitrize:onglet";

/** Demande l'ouverture d'un sous-onglet d'une page (depuis la palette). */
export function ouvrirOnglet(page: string, onglet: string) {
  window.dispatchEvent(new CustomEvent(EVT_ONGLET, { detail: { page, onglet } }));
}

/**
 * Écoute les demandes d'ouverture de sous-onglet.
 *
 * Les sous-onglets ne sont pas dans l'URL : sans ce relais, une douzaine
 * d'écrans (Plan de salle, GEVA-Sco, Dispositifs, Progressions…) ne sont
 * atteignables qu'en sachant sous quel onglet parent ils se cachent.
 *
 * `indisponible` est appelé quand l'onglet demandé existe mais n'est pas
 * affiché — mieux vaut l'expliquer que de ne rien faire.
 */
export function useOngletDemande<T extends string>(
  page: string,
  visibles: readonly T[],
  set: (v: T) => void,
  indisponible?: (onglet: string) => void,
) {
  const setRef = React.useRef(set);
  setRef.current = set;
  const dispoRef = React.useRef(indisponible);
  dispoRef.current = indisponible;
  const cles = visibles.join("|");
  React.useEffect(() => {
    const on = (e: Event) => {
      const d = (e as CustomEvent<{ page: string; onglet: string }>).detail;
      if (!d || d.page !== page) return;
      if (cles.split("|").includes(d.onglet)) setRef.current(d.onglet as T);
      else dispoRef.current?.(d.onglet);
    };
    window.addEventListener(EVT_ONGLET, on);
    return () => window.removeEventListener(EVT_ONGLET, on);
  }, [page, cles]);
}

/// Hook simple de chargement de données.
/**
 * Signal émis quand des données arrivent d'une autre machine.
 *
 * Tous les écrans se relisent alors, sans vider l'affichage : c'est ce qui
 * fait que la liste d'élèves se complète sous les yeux au lieu d'attendre le
 * prochain aller-retour dans le menu.
 */
export const EVT_DONNEES_DISTANTES = "maitrize:donnees-distantes";

export function useAsync<T>(fn: () => Promise<T>, deps: React.DependencyList = []) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const reload = React.useCallback(() => {
    setLoading(true);
    fn().then((d) => { setData(d); setLoading(false); })
        .catch((e) => { console.error(e); setLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  React.useEffect(() => { reload(); }, [reload]);

  // Keep-alive : quand la page redevient visible (retour sur l'onglet), on
  // rafraîchit les données en silence (sans vider l'affichage ni perdre le
  // défilement / sous-onglet) pour refléter d'éventuelles modifications.
  const visible = React.useContext(PageVisibleContext);
  const prevVisible = React.useRef(visible);
  const fnRef = React.useRef(fn);
  fnRef.current = fn;
  React.useEffect(() => {
    if (visible && !prevVisible.current) {
      fnRef.current().then(setData).catch(() => {});
    }
    prevVisible.current = visible;
  }, [visible]);

  // Données reçues d'une autre machine : on relit en silence, page visible ou
  // non — un écran caché mais gardé en vie doit être à jour quand on y revient.
  React.useEffect(() => {
    const h = () => { fnRef.current().then(setData).catch(() => {}); };
    window.addEventListener(EVT_DONNEES_DISTANTES, h);
    return () => window.removeEventListener(EVT_DONNEES_DISTANTES, h);
  }, []);

  return { data, loading, reload, setData };
}

/**
 * Annuler / Rétablir pour un état « bloc » persistant.
 * - `commit(next)` : applique + sauvegarde + empile l'historique (à utiliser à
 *   la place de l'ancien `persister`).
 * - `reset(v)` : (re)charge une valeur sans créer d'entrée d'historique.
 * - Raccourcis : ⌘Z / Ctrl+Z (annuler), ⌘⇧Z / Ctrl+Y (rétablir), ignorés quand
 *   le focus est dans un champ de saisie (l'annulation native du champ prime).
 */
export function useHistorique<T>(initial: T, persist: (v: T) => void) {
  const persistRef = React.useRef(persist);
  persistRef.current = persist;
  const [present, setPresent] = React.useState<T>(initial);
  const presentRef = React.useRef<T>(initial);
  const passe = React.useRef<T[]>([]);
  const futur = React.useRef<T[]>([]);
  const ecrire = (v: T) => { presentRef.current = v; setPresent(v); };

  const reset = React.useCallback((v: T) => { passe.current = []; futur.current = []; ecrire(v); }, []);
  const commit = React.useCallback((next: T) => {
    passe.current.push(presentRef.current);
    futur.current = [];
    ecrire(next);
    persistRef.current(next);
  }, []);
  const undo = React.useCallback(() => {
    if (passe.current.length === 0) return;
    futur.current.push(presentRef.current);
    const prev = passe.current.pop()!;
    ecrire(prev);
    persistRef.current(prev);
  }, []);
  const redo = React.useCallback(() => {
    if (futur.current.length === 0) return;
    passe.current.push(presentRef.current);
    const nxt = futur.current.pop()!;
    ecrire(nxt);
    persistRef.current(nxt);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if ((k === "z" && e.shiftKey) || k === "y") { e.preventDefault(); redo(); }
      else if (k === "z") { e.preventDefault(); undo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return { present, reset, commit, undo, redo };
}
