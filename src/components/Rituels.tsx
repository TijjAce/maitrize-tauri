import React from "react";
import { api } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast, toastAnnulable } from "./Toaster";
import { confirmer } from "./confirmer";
import {
  CLE_RITUELS, EVT_RITUELS, deroulementEnHtml, deroulementEnTexte, ecrireRituels, lireRituels, nouveauRituel, trierRituels, type Rituel,
} from "../rituels";
import { masqueRituel } from "../journalMasques";
import { avecSourcesImages, imagesDuTexte } from "../texteRiche";
import { CaseImpression } from "./MasquesDuJournal";
import { EditeurRiche } from "./EditeurRiche";
import { chargerImage } from "./imagesTexte";

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

/**
 * Le formulaire d'un rituel : un titre, un déroulement, une durée. Le
 * déroulement s'écrit dans l'éditeur mis en forme, pour bien dire ce qu'on
 * veut pour chaque élève (demande de l'enseignant, 31 octobre 2026).
 */
export function RituelForm({ rituel, nouveau, onClose, onEnregistrer }: {
  rituel: Rituel; nouveau: boolean; onClose: () => void; onEnregistrer: (r: Rituel) => void;
}) {
  const [r, setR] = React.useState(rituel);
  // L'éditeur part du déroulement mis en forme ; un ancien texte brut y devient des paragraphes.
  const [depart] = React.useState(() => deroulementEnHtml(rituel));
  const valider = () => {
    if (!r.titre.trim()) { toast("Donnez un titre au rituel.", { icone: "ℹ️" }); return; }
    onEnregistrer({ ...r, titre: r.titre.trim() });
    onClose();
  };
  return (
    <Modal titre={nouveau ? "🔁 Nouveau rituel" : `🔁 ${rituel.titre}`} onClose={onClose} large
      footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={valider}>Enregistrer</button></>}>
      <p className="meta" style={{ marginTop: 0, fontSize: 12.5, lineHeight: 1.5 }}>
        Ce qui revient chaque jour : la date, l'appel, le calcul mental. Écrit une fois, posé d'un clic dans le cahier journal.
      </p>
      <Field label="Titre"><Input autoFocus value={r.titre} onChange={(e) => setR({ ...r, titre: e.target.value })} placeholder="La date, L'appel, Le mot du jour…" /></Field>
      <div className="field">
        <label>Déroulement</label>
        <EditeurRiche valeur={depart} onChange={(deroulement) => setR((x) => ({ ...x, deroulement }))} minHauteur="32vh"
          placeholder="Ce qu'on fait, et qui fait quoi : un groupe par élève, l'aide de chacun, le matériel…" />
      </div>
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
    toastAnnulable(`Rituel « ${r.titre} » supprimé.`, () => enregistrer(r), "🔁");
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
                {[r.duree ? `${r.duree} min` : "", deroulementEnTexte(r).split("\n")[0]?.slice(0, 90)].filter(Boolean).join(" · ")}
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
export function RituelsCites({ rituels, onModifier, masques, onMasquer }: {
  rituels: Rituel[]; onModifier: (r: Rituel) => void;
  /** Dans le cahier journal : ce que ce créneau cite sans l'imprimer, et de quoi le changer. */
  masques?: readonly string[]; onMasquer?: (cle: string) => void;
}) {
  if (!rituels.length) return null;
  return (
    <div className="regles-app" aria-label="Rituels cités">
      {rituels.map((r) => (
        <div key={r.id} className={masques?.includes(masqueRituel(r.id)) ? "regle-app rituel-app non-imprime" : "regle-app rituel-app"}>
          <div className="regle-app-tete">
            <b style={{ whiteSpace: "nowrap" }}>🔁 {r.titre}</b>
            {r.duree > 0 && <span className="meta" style={{ whiteSpace: "nowrap" }}>· {r.duree} min</span>}
            <div style={{ flex: 1 }} />
            {onMasquer && <CaseImpression masque={Boolean(masques?.includes(masqueRituel(r.id)))} onChange={() => onMasquer(masqueRituel(r.id))} />}
            <button type="button" className="btn ghost sm" onClick={() => onModifier(r)} aria-label={`Modifier ${r.titre}`}>✏️</button>
          </div>
          <DeroulementRiche rituel={r} />
        </div>
      ))}
    </div>
  );
}

/** Le déroulement mis en forme, sous le prévu : tel qu'on l'a écrit, ses images lues sur l'ordinateur. */
function DeroulementRiche({ rituel }: { rituel: Rituel }) {
  const html = React.useMemo(() => deroulementEnHtml(rituel), [rituel]);
  // Tant que les images ne sont pas lues, elles ne se montrent pas : jamais d'image cassée.
  const [affiche, setAffiche] = React.useState(() => avecSourcesImages(html, () => undefined));
  React.useEffect(() => {
    let vivant = true;
    setAffiche(avecSourcesImages(html, () => undefined));
    const noms = imagesDuTexte(html);
    if (noms.length) {
      Promise.all(noms.map((n) => chargerImage(n).then((src) => [n, src] as const).catch(() => [n, undefined] as const))).then((lues) => {
        const sources = new Map(lues);
        if (vivant) setAffiche(avecSourcesImages(html, (n) => sources.get(n)));
      });
    }
    return () => { vivant = false; };
  }, [html]);
  if (!deroulementEnTexte(rituel) && !imagesDuTexte(html).length) return null;
  return <div className="rituel-deroulement" dangerouslySetInnerHTML={{ __html: affiche }} />;
}
