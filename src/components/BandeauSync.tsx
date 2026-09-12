import React from "react";
import { api, EtatSync } from "../api";
import { Confirm, PageVisibleContext } from "./ui";
import { toast } from "./Toaster";

// ── Passer d'une machine à l'autre ─────────────────────────────────────────
//
// Le va-et-vient entre le bureau et le portable échoue toujours de la même
// façon : on restaure alors qu'il fallait envoyer, et une soirée de saisie
// disparaît. Le remède n'est pas un avertissement de plus, c'est de ne
// proposer que le bon geste.
//
// Le bandeau compare donc la dernière écriture locale et la dernière
// sauvegarde en ligne, et n'affiche qu'un bouton : envoyer, ou récupérer.
// Quand les deux ont bougé — seul cas réellement ambigu — il le dit et laisse
// choisir, en nommant ce qui sera perdu dans chaque cas.

/** « 2026-09-12-143005 » → « 12/09à 14:30 ». */
function lisible(brut: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(brut);
  return m ? `${m[3]}/${m[2]} à ${m[4]}:${m[5]}` : brut;
}

export function BandeauSync() {
  const [etat, setEtat] = React.useState<EtatSync | null>(null);
  const [occupe, setOccupe] = React.useState("");
  const [aConfirmer, setAConfirmer] = React.useState<"envoyer" | "recuperer" | null>(null);

  const relire = React.useCallback(() => {
    // Muet en cas d'échec : un stockage injoignable ne doit pas polluer
    // l'écran d'accueil à chaque ouverture.
    api.syncEtat().then(setEtat).catch(() => setEtat(null));
  }, []);

  // Le tableau de bord reste monté toute la session : sans cette relecture à
  // chaque retour, le bandeau afficherait encore l'état du démarrage après une
  // heure de saisie, et dirait « synchronisé » alors qu'il ne l'est plus.
  const visible = React.useContext(PageVisibleContext);
  React.useEffect(() => { if (visible) relire(); }, [visible, relire]);

  const agir = async (quoi: "envoyer" | "recuperer") => {
    setOccupe(quoi);
    try {
      const msg = quoi === "envoyer"
        ? await api.sauvegardePush()
        : await api.sauvegardePull();
      toast(msg, { icone: quoi === "envoyer" ? "☁️" : "⬇️" });
      relire();
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  if (!etat?.configure) return null;
  if (!etat.aEnvoyer && !etat.aRecuperer && !etat.horsLigne) {
    return (
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 12 }}>
        ☁️ Synchronisé{etat.derniereSync && ` · dernière fois le ${lisible(etat.derniereSync)}`}
      </div>
    );
  }

  const couleur = etat.conflit ? "#b03030" : etat.aRecuperer ? "#2f5aa8" : "#c2591f";
  return (
    <>
      <div className="card" style={{ marginBottom: 14, borderLeft: `3px solid ${couleur}` }}>
        {etat.horsLigne ? (
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            ☁️ {etat.horsLigne}
            {etat.aEnvoyer && " — vous avez travaillé ici depuis la dernière synchronisation."}
          </div>
        ) : etat.conflit ? (
          <>
            <b style={{ fontSize: 13 }}>Les deux côtés ont changé</b>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 0 10px" }}>
              Vous avez travaillé sur cet ordinateur, et une sauvegarde plus
              récente ({lisible(etat.derniereDistante)}) vient de l'autre. Il
              faut choisir : l'un des deux travaux sera perdu.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className="btn" disabled={!!occupe} onClick={() => setAConfirmer("envoyer")}>
                Garder le travail d'ici
              </button>
              <button className="btn" disabled={!!occupe} onClick={() => setAConfirmer("recuperer")}>
                Garder celui de l'autre machine
              </button>
            </div>
          </>
        ) : etat.aRecuperer ? (
          <>
            <b style={{ fontSize: 13 }}>Une version plus récente vous attend</b>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 0 10px" }}>
              Sauvegardée le {lisible(etat.derniereDistante)} depuis votre autre
              ordinateur. Rien n'a été modifié ici depuis.
            </p>
            <button className="btn primary" disabled={!!occupe} onClick={() => agir("recuperer")}>
              {occupe === "recuperer" ? "Récupération…" : "⬇️ Récupérer"}
            </button>
          </>
        ) : (
          <>
            <b style={{ fontSize: 13 }}>Travail non sauvegardé</b>
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 0 10px" }}>
              Vous avez travaillé ici depuis
              {etat.derniereSync ? ` le ${lisible(etat.derniereSync)}` : " la dernière synchronisation"}.
              Envoyez avant de passer sur l'autre ordinateur.
            </p>
            <button className="btn primary" disabled={!!occupe} onClick={() => agir("envoyer")}>
              {occupe === "envoyer" ? "Envoi…" : "☁️ Envoyer"}
            </button>
          </>
        )}
      </div>

      {aConfirmer && (
        <Confirm
          message={aConfirmer === "envoyer"
            ? `Envoyer le travail de cet ordinateur ? La sauvegarde du ${lisible(etat.derniereDistante)}, faite sur l'autre machine, restera consultable dans les Réglages mais ne sera plus la plus récente.`
            : `Récupérer la sauvegarde du ${lisible(etat.derniereDistante)} ? Tout ce que vous avez saisi sur CET ordinateur depuis sera définitivement remplacé.`}
          onYes={() => { const q = aConfirmer; setAConfirmer(null); agir(q); }}
          onClose={() => setAConfirmer(null)} />
      )}
    </>
  );
}
