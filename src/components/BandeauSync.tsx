import React from "react";
import { api, EtatSync } from "../api";
import { PageVisibleContext } from "./ui";

// ── État de la synchronisation, sur le tableau de bord ─────────────────────
//
// Les changements voyagent seuls, ligne par ligne, entre les ordinateurs.
// Ce bandeau proposait aussi de « récupérer » la dernière sauvegarde en ligne
// quand elle paraissait plus récente : une restauration remplace pourtant
// TOUTE la base, et effaçait ce qui n'était pas dans cette sauvegarde — une
// séquence entière a disparu ainsi. Restaurer reste possible, dans les
// Réglages, comme un geste de secours explicite et précédé d'une copie.

/** « 2026-09-12-143005 » → « 12/09 à 14:30 ». */
function lisible(brut: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(brut);
  return m ? `${m[3]}/${m[2]} à ${m[4]}:${m[5]}` : brut;
}

export function BandeauSync() {
  const [etat, setEtat] = React.useState<EtatSync | null>(null);
  const relire = React.useCallback(() => {
    api.syncEtat().then(setEtat).catch(() => setEtat(null));
  }, []);
  const visible = React.useContext(PageVisibleContext);
  React.useEffect(() => { if (visible) relire(); }, [visible, relire]);

  if (!etat?.configure) return null;
  if (etat.horsLigne) {
    return (
      <div className="card" style={{ marginBottom: 14, borderLeft: "3px solid #c2591f", fontSize: 13, color: "var(--text-2)" }}>
        ☁️ {etat.horsLigne} — vos changements partiront dès que le stockage répondra.
      </div>
    );
  }
  return (
    <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
      ☁️ Synchronisation automatique active{etat.derniereSync && ` · dernière sauvegarde le ${lisible(etat.derniereSync)}`}
    </div>
  );
}
