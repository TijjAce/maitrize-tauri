import React from "react";
import { api, texteErreur, type Ecart, type EtatPasse } from "../api";
import { Aide } from "./Aide";
import { confirmer } from "./confirmer";
import { toast } from "./Toaster";
import {
  bilanDesEcarts, deQuand, etiquette, motifEnClair, noterLeRetour, quandEnClair, rangerLesEtats, retourQuiVientDAvoirLieu, signeDuMotif,
} from "../revenirEnArriere";

// ── Revenir en arrière ───────────────────────────────────────────────────
//
// « Revenir à un état précis de l'application avec tout ce qu'il existait à
// ce moment » (l'enseignant, octobre 2026). On choisit un moment, on voit ce
// qui changerait, on revient ; « Annuler » ramène à l'état d'avant.

type Apercu = { ecarts: Ecart[] } | { erreur: string } | "lecture";

export function RevenirEnArriere() {
  const [etats, setEtats] = React.useState<EtatPasse[] | null>(null);
  const [choisi, setChoisi] = React.useState<string | null>(null);
  const [apercus, setApercus] = React.useState<Record<string, Apercu>>({});
  const [toutVoir, setToutVoir] = React.useState(false);
  const [occupe, setOccupe] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const maintenant = new Date();

  React.useEffect(() => { api.retourEtats().then(setEtats).catch(() => setEtats([])); }, []);

  const choisir = (nom: string) => {
    setMsg("");
    setChoisi((c) => (c === nom ? null : nom));
    if (apercus[nom] && apercus[nom] !== "lecture") return;
    setApercus((a) => ({ ...a, [nom]: "lecture" }));
    api.retourEcarts(nom)
      .then((ecarts) => setApercus((a) => ({ ...a, [nom]: { ecarts } })))
      .catch((e) => setApercus((a) => ({ ...a, [nom]: { erreur: texteErreur(e) } })));
  };

  const revenir = async (e: EtatPasse) => {
    const vers = deQuand(e, new Date());
    if (!(await confirmer(
      `Revenir à l'état ${vers} ?\n\nCe qui a été fait depuis sera défait, sur cet ordinateur et sur l'autre. `
      + "Rien n'est perdu : l'état d'aujourd'hui est gardé, et « Annuler » y ramène.",
      { oui: "Revenir à cet état" },
    ))) return;
    setOccupe(true); setMsg("");
    try {
      const bilan = await api.retourRevenir(e.nom);
      noterLeRetour({ copie: bilan.copie, vers, fichiers: bilan.fichiers });
      // Tous les écrans relisent leurs données.
      window.location.reload();
    } catch (err) {
      setMsg("❌ " + texteErreur(err));
      setOccupe(false);
    }
  };

  if (!etats) return null;
  const rangees = rangerLesEtats(etats, maintenant);
  // Aujourd'hui et hier en vue ; le reste se déplie.
  const visibles = toutVoir ? rangees : rangees.filter((r) => r.titre === "Aujourd'hui" || r.titre === "Hier");
  const cachees = rangees.filter((r) => !visibles.includes(r)).reduce((n, r) => n + r.etats.length, 0);
  const etatChoisi = etats.find((e) => e.nom === choisi) ?? null;
  const apercu = choisi ? apercus[choisi] : undefined;

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0 }}>🕓 Revenir en arrière</h3>
        <Aide titre="Revenir en arrière" vers="droite">
          <p>Maitrize garde l'état de toute l'application : un par heure d'utilisation quand quelque chose a changé, et
            un juste avant chaque mise à jour ou chaque retour en arrière. Elle les garde tous pendant deux jours, puis un par
            jour sur un mois, un par semaine sur six mois, un par mois sur un an.</p>
          <p>Revenir à un état reprend tout ce qui existait alors : élèves, séquences, cahier journal, organisation,
            réglages de la classe, et les documents joints, qui reviennent de la corbeille. Les réglages propres à cet
            ordinateur et vos clés restent.</p>
          <p>L'autre ordinateur suit le même retour. L'état d'avant est gardé : « Annuler » y ramène, tout de suite ou plus
            tard depuis cette liste. Ce que vous supprimez reste donc un an dans ces états, sur cet ordinateur seulement.</p>
        </Aide>
      </div>

      {!rangees.length && <p className="meta" style={{ margin: "8px 0 0" }}>Pas encore d'état gardé : le premier se prend dans quelques minutes.</p>}

      {visibles.map((r) => (
        <div key={r.titre} style={{ marginTop: 10 }}>
          <div className="meta" style={{ fontSize: 12, marginBottom: 4 }}>{r.titre}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {r.etats.map((e) => {
              const motif = motifEnClair(e.motif);
              return (
                <button key={e.nom} type="button" className={`btn sm${choisi === e.nom ? " primary" : ""}`}
                  title={`${quandEnClair(e, maintenant)}${motif ? ` — ${motif}` : ""}`} aria-pressed={choisi === e.nom}
                  onClick={() => choisir(e.nom)}>
                  {signeDuMotif(e.motif) && <span aria-hidden="true">{signeDuMotif(e.motif)} </span>}{etiquette(e, maintenant)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {cachees > 0 && (
        <button type="button" className="btn ghost sm" style={{ marginTop: 8 }} onClick={() => setToutVoir(true)}>
          ▸ Plus ancien ({cachees})
        </button>
      )}

      {etatChoisi && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            État {deQuand(etatChoisi, maintenant)}
            {motifEnClair(etatChoisi.motif) && <span className="meta" style={{ fontWeight: 400 }}> · {motifEnClair(etatChoisi.motif)}</span>}
          </div>
          {apercu === "lecture" && <div className="meta">Comparaison avec aujourd'hui…</div>}
          {apercu && apercu !== "lecture" && "erreur" in apercu && <div style={{ color: "var(--danger, #ef4444)" }}>{apercu.erreur}</div>}
          {apercu && apercu !== "lecture" && "ecarts" in apercu && <Changements ecarts={apercu.ecarts} />}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10 }}>
            <button type="button" className="btn primary" disabled={occupe || apercu === "lecture" || (!!apercu && "ecarts" in apercu && !apercu.ecarts.length)}
              onClick={() => revenir(etatChoisi)}>
              {occupe ? "Retour en cours…" : "Revenir à cet état"}
            </button>
            {msg && <span>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Changements({ ecarts }: { ecarts: Ecart[] }) {
  if (!ecarts.length) return <div className="meta">Rien n'a changé depuis.</div>;
  const b = bilanDesEcarts(ecarts);
  const ligne = (titre: string, items: string[]) => items.length > 0 && (
    <div style={{ marginTop: 3 }}><b>{titre}</b> {items.join(" · ")}</div>
  );
  return (
    <div>
      <div className="meta">En y revenant :</div>
      {ligne("Reviendraient :", b.revenues)}
      {ligne("S'en iraient :", b.parties)}
      {ligne("Redeviendraient comme alors :", b.changees)}
    </div>
  );
}

/**
 * Après le rechargement qui suit un retour : le dire, et offrir de l'annuler.
 * Monté une fois dans l'application.
 */
export function useAnnonceDuRetour() {
  React.useEffect(() => {
    const r = retourQuiVientDAvoirLieu();
    if (!r) return;
    // Le temps que l'hôte des notifications écoute. Pas d'arrêt au démontage :
    // l'annonce n'est lue qu'une fois, un double montage la perdrait.
    window.setTimeout(() => {
      if (!r.copie) {
        toast("Retour annulé : tout est revenu comme avant.", { icone: "↶" });
        return;
      }
      const fichiers = r.fichiers > 0 ? ` ${r.fichiers} document${r.fichiers > 1 ? "s" : ""} revenu${r.fichiers > 1 ? "s" : ""} de la corbeille.` : "";
      toast(`Revenu à l'état ${r.vers}.${fichiers}`, {
        icone: "🕓", duree: 30000,
        action: {
          label: "Annuler",
          faire: async () => {
            try {
              await api.retourRevenir(r.copie);
              noterLeRetour({ copie: "", vers: r.vers, fichiers: 0 });
              window.location.reload();
            } catch (e) {
              toast("Annulation impossible : " + texteErreur(e), { icone: "⚠️" });
            }
          },
        },
      });
    }, 600);
  }, []);
}
