import React from "react";

// ── Les fenêtres, les questions et les annonces ──────────────────────────
//
// Pas de boîtes du navigateur (alert, confirm, prompt) : elles ne s'ouvrent
// pas partout dans une application iOS. Une fenêtre à nous, une question qui
// s'attend comme une promesse, une annonce qui passe en bas de l'écran.

export function Fenetre({ titre, onFermer, children, pied, large }: {
  titre: string; onFermer: () => void; children: React.ReactNode; pied?: React.ReactNode; large?: boolean;
}) {
  React.useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [onFermer]);
  // Toucher à côté ferme la fenêtre au relâcher, sur le voile lui-même : fermée dès l'appui, le relâcher tombait sur la
  // case d'en dessous, qui se disait.
  const appuiDehors = React.useRef(false);
  return (
    <div className="voile" onPointerDown={(e) => { appuiDehors.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (appuiDehors.current && e.target === e.currentTarget) onFermer(); appuiDehors.current = false; }}>
      <div className={`fenetre${large ? " large" : ""}`} role="dialog" aria-modal="true" aria-label={titre}>
        <div className="fenetre-tete">
          <h2>{titre}</h2>
          <button className="bouton discret" aria-label="Fermer" onClick={onFermer}>✕</button>
        </div>
        <div className="fenetre-corps">{children}</div>
        {pied && <div className="fenetre-pied">{pied}</div>}
      </div>
    </div>
  );
}

interface Question { message: string; oui: string; danger?: boolean; saisie?: string; repondre: (v: boolean | string | null) => void }
const EVT_QUESTION = "classeur:question";
const EVT_ANNONCE = "classeur:annonce";

/** Une question oui / non. */
export const confirmer = (message: string, o: { oui?: string; danger?: boolean } = {}): Promise<boolean> =>
  new Promise((repondre) => window.dispatchEvent(new CustomEvent<Question>(EVT_QUESTION, {
    detail: { message, oui: o.oui ?? "Oui", danger: o.danger, repondre: (v) => repondre(v === true) },
  })));

/** Une question qui demande un texte ; rien si l'on renonce. */
export const saisir = (message: string, valeur = "", oui = "Valider"): Promise<string | null> =>
  new Promise((repondre) => window.dispatchEvent(new CustomEvent<Question>(EVT_QUESTION, {
    detail: { message, oui, saisie: valeur, repondre: (v) => repondre(typeof v === "string" ? v : null) },
  })));

/** Une annonce, quelques secondes en bas de l'écran. */
export const annoncer = (message: string) => window.dispatchEvent(new CustomEvent<string>(EVT_ANNONCE, { detail: message }));

export function Questions() {
  const [q, setQ] = React.useState<Question | null>(null);
  const [texte, setTexte] = React.useState("");
  React.useEffect(() => {
    const ouvrir = (e: Event) => { const d = (e as CustomEvent<Question>).detail; setTexte(d.saisie ?? ""); setQ(d); };
    window.addEventListener(EVT_QUESTION, ouvrir);
    return () => window.removeEventListener(EVT_QUESTION, ouvrir);
  }, []);
  if (!q) return null;
  const finir = (v: boolean | string | null) => { q.repondre(v); setQ(null); };
  const valider = () => finir(q.saisie !== undefined ? (texte.trim() ? texte.trim() : null) : true);
  return (
    <Fenetre titre={q.message} onFermer={() => finir(q.saisie !== undefined ? null : false)}
      pied={<>
        <button className="bouton" onClick={() => finir(q.saisie !== undefined ? null : false)}>Annuler</button>
        <button className={`bouton ${q.danger ? "danger" : "principal"}`} onClick={valider}>{q.oui}</button>
      </>}>
      {q.saisie !== undefined && (
        <input className="champ" autoFocus value={texte} onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
      )}
    </Fenetre>
  );
}

export function Annonces() {
  const [liste, setListe] = React.useState<{ id: number; message: string }[]>([]);
  React.useEffect(() => {
    let n = 0;
    const ajouter = (e: Event) => {
      const id = ++n;
      setListe((l) => [...l, { id, message: (e as CustomEvent<string>).detail }]);
      window.setTimeout(() => setListe((l) => l.filter((x) => x.id !== id)), 5000);
    };
    window.addEventListener(EVT_ANNONCE, ajouter);
    return () => window.removeEventListener(EVT_ANNONCE, ajouter);
  }, []);
  return <div className="annonces" role="status">{liste.map((a) => <div key={a.id} className="annonce">{a.message}</div>)}</div>;
}
