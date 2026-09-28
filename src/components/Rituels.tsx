import React from "react";
import { api } from "../api";
import { Field, Input, Modal, Textarea } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { CLE_RITUELS, EVT_RITUELS, ecrireRituels, lireRituels, nouveauRituel, trierRituels, type Rituel } from "../rituels";

// Les rituels, côté écran : la liste partagée, le formulaire, le choix
// depuis le journal, et les rituels cités sous un prévu.

/** La liste des rituels, tenue à jour d'où qu'elle change. */
export function useRituels(): { rituels: Rituel[]; enregistrer: (r: Rituel) => void; supprimer: (id: string) => void } {
  const [rituels, setRituels] = React.useState<Rituel[]>([]);
  const lire = React.useCallback(() => {
    api.settingGet(CLE_RITUELS).then((v) => setRituels(trierRituels(lireRituels(v)))).catch(() => {});
  }, []);
  React.useEffect(() => {
    lire();
    window.addEventListener(EVT_RITUELS, lire);
    return () => window.removeEventListener(EVT_RITUELS, lire);
  }, [lire]);
  const ecrire = React.useCallback(async (suite: Rituel[]) => {
    setRituels(trierRituels(suite));
    try {
      await api.settingSet(CLE_RITUELS, ecrireRituels(suite));
      window.dispatchEvent(new Event(EVT_RITUELS));
    } catch (e) {
      toast("Rituel non enregistré : " + String(e), { icone: "⚠️" });
    }
  }, []);
  const enregistrer = React.useCallback((r: Rituel) => {
    // On relit la liste enregistrée avant d'écrire : deux fenêtres ne s'écrasent pas.
    api.settingGet(CLE_RITUELS).catch(() => null).then((v) => {
      const actuels = lireRituels(v);
      const suite = actuels.some((x) => x.id === r.id) ? actuels.map((x) => (x.id === r.id ? r : x)) : [...actuels, r];
      void ecrire(suite);
    });
  }, [ecrire]);
  const supprimer = React.useCallback((id: string) => {
    api.settingGet(CLE_RITUELS).catch(() => null).then((v) => { void ecrire(lireRituels(v).filter((x) => x.id !== id)); });
  }, [ecrire]);
  return { rituels, enregistrer, supprimer };
}

/** Le formulaire d'un rituel : un titre, un déroulement, une durée. */
export function RituelForm({ rituel, nouveau, onClose, onEnregistrer }: {
  rituel: Rituel; nouveau: boolean; onClose: () => void; onEnregistrer: (r: Rituel) => void;
}) {
  const [r, setR] = React.useState(rituel);
  const valider = () => {
    if (!r.titre.trim()) { toast("Donnez un titre au rituel.", { icone: "ℹ️" }); return; }
    onEnregistrer({ ...r, titre: r.titre.trim() });
    onClose();
  };
  return (
    <Modal titre={nouveau ? "🔁 Nouveau rituel" : `🔁 ${rituel.titre}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={valider}>Enregistrer</button></>}>
      <p className="meta" style={{ marginTop: 0, fontSize: 12.5, lineHeight: 1.5 }}>
        Ce qui revient chaque jour : la date, l'appel, le calcul mental. Écrit une fois, posé d'un clic dans le cahier journal.
      </p>
      <Field label="Titre"><Input autoFocus value={r.titre} onChange={(e) => setR({ ...r, titre: e.target.value })} placeholder="La date, L'appel, Le mot du jour…" /></Field>
      <Field label="Déroulement">
        <Textarea value={r.deroulement} rows={6} onChange={(e) => setR({ ...r, deroulement: e.target.value })}
          placeholder={"Ce qu'on fait, et qui fait quoi :\nPointage du jour de la semaine : Aurélien, Louison…\nÉcrire la date : Ethan, Jean…"} />
      </Field>
      <Field label="Durée habituelle (minutes, facultatif)">
        <Input type="number" min={0} max={120} value={r.duree || ""} style={{ width: 100 }}
          onChange={(e) => setR({ ...r, duree: Math.max(0, Math.min(120, Number(e.target.value) || 0)) })} />
      </Field>
    </Modal>
  );
}

/** Choisir un rituel à poser dans le prévu — ou en créer un, ou en corriger un, sans quitter la fenêtre. */
export function ChoixRituel({ onChoisir, onClose }: { onChoisir: (r: Rituel) => void; onClose: () => void }) {
  const { rituels, enregistrer, supprimer } = useRituels();
  const [edite, setEdite] = React.useState<{ rituel: Rituel; nouveau: boolean } | null>(null);
  const retirer = async (r: Rituel) => {
    if (!(await confirmer(`Supprimer le rituel « ${r.titre} » ? Les journaux qui le citent garderont sa ligne, sans son déroulement.`, { oui: "Supprimer", danger: true }))) return;
    supprimer(r.id);
  };
  return (
    <>
      <Modal titre="🔁 Poser un rituel dans le prévu" onClose={onClose}
        footer={<><button className="btn" onClick={() => setEdite({ rituel: nouveauRituel(), nouveau: true })}>＋ Nouveau rituel</button><button className="btn" onClick={onClose}>Fermer</button></>}>
        {rituels.length === 0 ? (
          <p className="meta" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Aucun rituel pour l'instant. Créez-en un : la date, l'appel, le calcul mental… Il se posera ensuite d'un clic.
          </p>
        ) : rituels.map((r) => (
          <div key={r.id} className="list-row" style={{ padding: "8px 12px" }}>
            <span>🔁</span>
            <button type="button" className="man-ouvrir" onClick={() => onChoisir(r)} title="Poser ce rituel dans le prévu">
              <b>{r.titre}</b>
              <span className="meta" style={{ whiteSpace: "pre-line" }}>
                {[r.duree ? `${r.duree} min` : "", r.deroulement.trim().split("\n")[0]?.slice(0, 90)].filter(Boolean).join(" · ")}
              </span>
            </button>
            <button type="button" className="btn ghost sm" aria-label={`Modifier ${r.titre}`} onClick={() => setEdite({ rituel: r, nouveau: false })}>✏️</button>
            <button type="button" className="btn ghost sm" aria-label={`Supprimer ${r.titre}`} onClick={() => retirer(r)}>🗑</button>
          </div>
        ))}
      </Modal>
      {edite && (
        <RituelForm rituel={edite.rituel} nouveau={edite.nouveau} onClose={() => setEdite(null)}
          onEnregistrer={(r) => { enregistrer(r); if (edite.nouveau) onChoisir(r); }} />
      )}
    </>
  );
}

/** Les rituels cités sous le prévu : leur déroulement sous les yeux, et un crayon pour le corriger. */
export function RituelsCites({ rituels, onModifier }: { rituels: Rituel[]; onModifier: (r: Rituel) => void }) {
  if (!rituels.length) return null;
  return (
    <div className="regles-app" aria-label="Rituels cités">
      {rituels.map((r) => (
        <div key={r.id} className="regle-app rituel-app">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b>🔁 {r.titre}</b>
            {r.duree > 0 && <span className="meta">· {r.duree} min</span>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn ghost sm" onClick={() => onModifier(r)} aria-label={`Modifier ${r.titre}`}>✏️</button>
          </div>
          {r.deroulement.trim() && <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{r.deroulement.trim()}</div>}
        </div>
      ))}
    </div>
  );
}
