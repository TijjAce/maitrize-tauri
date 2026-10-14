import React from "react";
import { ETATS_SEQUENCE, type EtatSequence } from "../suiviSequences";
import { MODES_RANGEMENT, type ModeRangement } from "../rangement";

// ── Le menu du bureau ─────────────────────────────────────────────────────
//
// Trois boutons dans la barre du haut, un par geste (demande de
// l'enseignant, octobre 2026 : « plutôt que de tout faire en un seul coup,
// décompose ») : chercher — un mot, ou les séquences d'un état —, trier le
// dossier, partager — le bureau commun, la copie sur l'ordinateur. Chacun
// s'ouvre sur ses choix, et dit sur lui-même ce qui est actif.

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
  const decrit = etat ? ETATS_SEQUENCE.find((e) => e.id === etat) : undefined;
  const cherche = recherche.trim() ? `🔎 « ${recherche.trim()} »` : decrit ? `${decrit.ico} ${decrit.pluriel}` : "🔎 Chercher";
  const mode = MODES_RANGEMENT.find((m) => m.id === rangement);
  return (
    <div className="menu-bureau-barre">
      <Deroulant libelle={cherche} actif={!!recherche.trim() || !!etat} titre="Chercher sur le bureau">
        {(fermer) => (
          <>
            <input className="input" autoFocus placeholder="Rechercher partout…" value={recherche}
              onChange={(e) => onRecherche(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") fermer(); }} />
            <div className="menu-bureau-titre">Séquences</div>
            <button className={`ctx-item${etat ? "" : " coche"}`} onClick={() => { onEtat(""); fermer(); }}>
              <span className="ctx-ico" aria-hidden="true">{etat ? "" : "✓"}</span>Toutes
            </button>
            {ETATS_SEQUENCE.filter((e) => e.id !== "pause").map((e) => (
              <button key={e.id} className={`ctx-item${etat === e.id ? " coche" : ""}`} onClick={() => { onEtat(e.id); fermer(); }}
                title={e.id === "classe" ? "Démarrées dans le cahier journal, en pause comprises" : e.id === "preparation" ? "Écrites, mais aucune séance passée en classe" : "Toutes les séances faites, ou marquées terminées"}>
                <span className="ctx-ico" aria-hidden="true">{etat === e.id ? "✓" : ""}</span>{e.ico} {e.pluriel}
                <span className="menu-bureau-nombre">{compte(e.id) || ""}</span>
              </button>
            ))}
          </>
        )}
      </Deroulant>

      <Deroulant libelle={peutRanger && mode ? `${mode.ico} Trier` : "↕ Trier"} titre="Trier ce dossier">
        {(fermer) => (
          <>
            <div className="menu-bureau-titre">Trier ce dossier</div>
            {!peutRanger && <p className="menu-bureau-note">Effacez la recherche ou montrez toutes les séquences pour trier le dossier.</p>}
            {peutRanger && !rangement && <p className="menu-bureau-note">Icônes placées à la main : choisissez un ordre pour les trier.</p>}
            {MODES_RANGEMENT.map((m) => (
              <button key={m.id} className={`ctx-item${rangement === m.id ? " coche" : ""}`} disabled={!peutRanger}
                onClick={() => { onRanger(m.id); fermer(); }}>
                <span className="ctx-ico" aria-hidden="true">{peutRanger && rangement === m.id ? "✓" : ""}</span>{m.ico} {m.label}
              </button>
            ))}
          </>
        )}
      </Deroulant>

      <Deroulant libelle="🤝 Partager" actif={scinde} titre="Partager le bureau">
        {(fermer) => (
          <>
            <button className={`ctx-item${scinde ? " coche" : ""}`} onClick={() => { onScinde(!scinde); fermer(); }}
              title={scinde ? "Refermer le bureau commun" : "Ouvrir le bureau commun à côté : glisser d'un bureau à l'autre"}>
              <span className="ctx-ico" aria-hidden="true">{scinde ? "✓" : ""}</span>🤝 Bureaux communs
            </button>
            {copie && (
              <button className="ctx-item" onClick={() => { onCopie(); fermer(); }} title={`Ouvrir la copie de ce bureau sur l'ordinateur : ${copie.racine}`}>
                <span className="ctx-ico" aria-hidden="true" />🗂 Copie sur l'ordinateur
              </button>
            )}
          </>
        )}
      </Deroulant>
    </div>
  );
}

/** Un bouton qui s'ouvre sur ses choix, et se referme en cliquant ailleurs ou par Échap. */
function Deroulant({ libelle, actif = false, titre, children }: {
  libelle: string; actif?: boolean; titre: string; children: (fermer: () => void) => React.ReactNode;
}) {
  const [ouvert, setOuvert] = React.useState(false);
  const ancre = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!ouvert) return;
    const ailleurs = (e: MouseEvent) => { if (!ancre.current?.contains(e.target as Node)) setOuvert(false); };
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") setOuvert(false); };
    document.addEventListener("mousedown", ailleurs);
    document.addEventListener("keydown", echap);
    return () => { document.removeEventListener("mousedown", ailleurs); document.removeEventListener("keydown", echap); };
  }, [ouvert]);
  return (
    <div className="menu-bureau-ancre" ref={ancre}>
      <button className={`btn${actif ? " primary" : ""}`} aria-haspopup="dialog" aria-expanded={ouvert} onClick={() => setOuvert(!ouvert)}>
        {libelle} <span aria-hidden="true">▾</span>
      </button>
      {ouvert && <div className="menu-bureau" role="dialog" aria-label={titre}>{children(() => setOuvert(false))}</div>}
    </div>
  );
}
