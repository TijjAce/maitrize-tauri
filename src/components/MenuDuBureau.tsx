import React from "react";
import { ETATS_SEQUENCE, type EtatSequence } from "../suiviSequences";
import { MODES_RANGEMENT, type ModeRangement } from "../rangement";

// ── Le menu du bureau ─────────────────────────────────────────────────────
//
// Chercher, ne montrer que les séquences d'un état, ranger le dossier, ouvrir
// le bureau commun ou la copie sur l'ordinateur : une rangée de boutons et
// d'onglets qui encombrait le haut du bureau. Ils tiennent dans un seul
// bouton, dans la barre du haut avec ceux des autres pages ; ce qui est actif
// — une recherche, un état — se lit sur le bouton lui-même.

export function MenuDuBureau({
  recherche, onRecherche, etat, onEtat, compte, rangement, peutRanger, onRanger, scinde, onScinde, copie, onCopie,
}: {
  recherche: string; onRecherche: (q: string) => void;
  etat: EtatSequence | ""; onEtat: (e: EtatSequence | "") => void;
  /** Combien de séquences sont dans cet état. */
  compte: (e: EtatSequence) => number;
  /** L'ordre du dossier ; rien quand ses icônes ont été déplacées à la main. */
  rangement: ModeRangement | null;
  /** Une recherche ou un état montre des résultats, pas un dossier : il n'y a rien à ranger. */
  peutRanger: boolean; onRanger: (m: ModeRangement) => void;
  scinde: boolean; onScinde: (v: boolean) => void;
  /** La copie du bureau sur l'ordinateur, quand elle existe. */
  copie: { racine: string } | null; onCopie: () => void;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const ancre = React.useRef<HTMLDivElement>(null);

  // Se referme en cliquant ailleurs, ou par Échap.
  React.useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: MouseEvent) => { if (!ancre.current?.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", ailleurs); document.removeEventListener("keydown", echap); };
  }, [ouvert]);

  const decrit = etat ? ETATS_SEQUENCE.find((e) => e.id === etat) : undefined;
  const libelle = recherche.trim() ? `🔎 « ${recherche.trim()} »` : decrit ? `${decrit.ico} ${decrit.pluriel}` : "🔎 Chercher, ranger…";
  const choisir = (f: () => void) => () => { f(); setOuvert(false); };

  return (
    <div className="menu-bureau-ancre" ref={ancre}>
      <button className={`btn${recherche.trim() || etat ? " primary" : ""}`} aria-haspopup="dialog" aria-expanded={ouvert}
        onClick={() => setOuvert(!ouvert)}>
        {libelle} <span aria-hidden="true">▾</span>
      </button>
      {ouvert && (
        <div className="menu-bureau" role="dialog" aria-label="Chercher et ranger le bureau">
          <input className="input" autoFocus placeholder="Rechercher partout…" value={recherche}
            onChange={(e) => onRecherche(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") setOuvert(false); }} />

          <div className="menu-bureau-titre">Séquences</div>
          <button className={`ctx-item${etat ? "" : " coche"}`} onClick={choisir(() => onEtat(""))}>
            <span className="ctx-ico" aria-hidden="true">{etat ? "" : "✓"}</span>Toutes
          </button>
          {ETATS_SEQUENCE.filter((e) => e.id !== "pause").map((e) => (
            <button key={e.id} className={`ctx-item${etat === e.id ? " coche" : ""}`} onClick={choisir(() => onEtat(e.id))}
              title={e.id === "classe" ? "Démarrées dans le cahier journal, en pause comprises" : e.id === "preparation" ? "Écrites, mais aucune séance passée en classe" : "Toutes les séances faites, ou marquées terminées"}>
              <span className="ctx-ico" aria-hidden="true">{etat === e.id ? "✓" : ""}</span>{e.ico} {e.pluriel}
              <span className="menu-bureau-nombre">{compte(e.id) || ""}</span>
            </button>
          ))}

          <div className="menu-bureau-titre">Ranger ce dossier</div>
          {!peutRanger && <p className="menu-bureau-note">Effacez la recherche ou montrez toutes les séquences pour ranger le dossier.</p>}
          {peutRanger && !rangement && <p className="menu-bureau-note">Icônes placées à la main : choisissez un ordre pour les ranger.</p>}
          {MODES_RANGEMENT.map((m) => (
            <button key={m.id} className={`ctx-item${rangement === m.id ? " coche" : ""}`} disabled={!peutRanger}
              onClick={choisir(() => onRanger(m.id))}>
              <span className="ctx-ico" aria-hidden="true">{peutRanger && rangement === m.id ? "✓" : ""}</span>{m.ico} {m.label}
            </button>
          ))}

          <div className="ctx-sep" role="separator" />
          <button className={`ctx-item${scinde ? " coche" : ""}`} onClick={choisir(() => onScinde(!scinde))}
            title={scinde ? "Refermer le bureau commun" : "Ouvrir le bureau commun à côté : glisser d'un bureau à l'autre"}>
            <span className="ctx-ico" aria-hidden="true">{scinde ? "✓" : ""}</span>🤝 Bureaux communs
          </button>
          {copie && (
            <button className="ctx-item" onClick={choisir(onCopie)} title={`Ouvrir la copie de ce bureau sur l'ordinateur : ${copie.racine}`}>
              <span className="ctx-ico" aria-hidden="true" />🗂 Copie sur l'ordinateur
            </button>
          )}
        </div>
      )}
    </div>
  );
}
