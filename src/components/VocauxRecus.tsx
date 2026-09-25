import React from "react";
import { listen } from "@tauri-apps/api/event";
import { api, texteErreur, type Creneau } from "../api";
import { Select, TextareaAuto } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { creneauDuVocal, repereDuVocal, verserDansLeBilan, vocauxDuJour, type Vocal } from "../vocaux";

// ── Ce que le téléphone a déposé ──────────────────────────────────────────
//
// Les vocaux dictés dans la classe, ordinateur fermé, arrivent ici. Chacun
// sait l'heure où il a été dit, et l'ordinateur en déduit le créneau — c'est
// lui qui a le cahier journal, le téléphone n'a rien.
//
// La transcription part toute seule, sur cette machine : elle ne coûte rien
// et ne sort pas. Le versement dans le bilan, lui, demande un clic : une
// transcription se relit avant d'entrer dans le dossier d'un élève.

export function VocauxRecus({ dateIso, creneaux, onEcrit }: {
  dateIso: string;
  creneaux: Creneau[];
  /** Appelé après un versement, pour que le cahier journal se relise. */
  onEcrit: () => void;
}) {
  const [vocaux, setVocaux] = React.useState<Vocal[]>([]);
  const [occupe, setOccupe] = React.useState<string>("");
  /** Le vocal en cours de transcription, pour le dire à l'écran. */
  const [transcrit, setTranscrit] = React.useState<string>("");
  const [cible, setCible] = React.useState<Record<string, string>>({});
  const [texte, setTexte] = React.useState<Record<string, string>>({});

  const charger = React.useCallback(async () => {
    try { setVocaux(await api.vocauxList()); } catch { /* rien à montrer */ }
  }, []);

  React.useEffect(() => { void charger(); }, [charger]);

  // Un vocal qui arrive pendant qu'on regarde l'écran doit s'y montrer.
  React.useEffect(() => {
    const p = listen("vocal:recu", () => { void charger(); });
    return () => { p.then((off) => off()); };
  }, [charger]);

  const duJour = vocauxDuJour(vocaux, dateIso);

  /**
   * La transcription part d'elle-même, un vocal après l'autre.
   *
   * Le garde-fou est une référence, pas un état : l'effet dépendait d'abord
   * du tableau des vocaux, recalculé à chaque rendu, et le `setOccupe` du
   * début suffisait à le relancer — il s'annulait lui-même, et rien
   * n'arrivait jamais. Ici il ne dépend que de l'identifiant à traiter, une
   * chaîne stable, et la chaîne se poursuit toute seule : le vocal transcrit
   * disparaît de la file, le suivant prend sa place.
   */
  const aTranscrire = duJour.find((v) => v.etat === "recu")?.id ?? "";
  const enCours = React.useRef("");
  React.useEffect(() => {
    if (!aTranscrire || enCours.current) return;
    enCours.current = aTranscrire;
    setTranscrit(aTranscrire);
    api.vocalTranscrire(aTranscrire)
      .then((suite) => setVocaux((avant) => avant.map((v) => (v.id === suite.id ? suite : v))))
      // L'état « echec » est écrit côté Rust : on relit plutôt que de deviner.
      .catch(() => { void charger(); })
      .finally(() => { enCours.current = ""; setTranscrit(""); });
  }, [aTranscrire, charger]);

  if (duJour.length === 0) return null;

  const verser = async (v: Vocal) => {
    const id = cible[v.id] ?? creneauDuVocal(v.debut, creneaux)?.id ?? "";
    const c = creneaux.find((x) => x.id === id);
    if (!c) { toast("Choisissez le créneau où le ranger.", { icone: "🗓" }); return; }
    const dit = (texte[v.id] ?? v.texte).trim();
    if (!dit) { toast("Ce vocal n'a rien donné à écrire.", { icone: "⚠️" }); return; }
    setOccupe(v.id);
    try {
      await api.creneauJournalSave(c.id, c.prevu ?? "", verserDansLeBilan(c.bilan ?? "", dit));
      await api.vocalDelete(v.id);
      await charger();
      onEcrit();
      toast(`Versé dans le bilan de ${c.matiere || "ce créneau"}.`, { icone: "🎙" });
    } catch (e) {
      toast("Versement impossible : " + texteErreur(e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  const jeter = async (v: Vocal) => {
    if (!await confirmer("Supprimer ce vocal ? L'enregistrement est effacé de l'ordinateur.")) return;
    try { await api.vocalDelete(v.id); await charger(); }
    catch (e) { toast("Suppression impossible : " + texteErreur(e), { icone: "⚠️" }); }
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <b style={{ fontSize: 14 }}>🎙 {duJour.length} {duJour.length > 1 ? "vocaux" : "vocal"} du téléphone</b>
        <span className="meta" style={{ fontSize: 12 }}>transcrits ici, versés sur votre clic</span>
      </div>

      {duJour.map((v) => {
        const devine = creneauDuVocal(v.debut, creneaux);
        const id = cible[v.id] ?? devine?.id ?? "";
        return (
          <div key={v.id} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 10, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <b style={{ fontSize: 12.5 }}>{repereDuVocal(v)}</b>
              <Select value={id} style={{ maxWidth: 260 }}
                onChange={(e) => setCible((x) => ({ ...x, [v.id]: e.target.value }))}>
                <option value="">— choisir le créneau —</option>
                {creneaux.filter((c) => c.date.slice(0, 10) === dateIso)
                  .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut))
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.heureDebut.slice(0, 5)} {c.matiere || "créneau"}
                    </option>
                  ))}
              </Select>
              {!cible[v.id] && devine && (
                <span className="meta" style={{ fontSize: 11.5 }}>trouvé à l'heure</span>
              )}
              <div className="spacer" style={{ flex: 1 }} />
              <button className="btn ghost sm" onClick={() => { void jeter(v); }} aria-label="Supprimer">🗑</button>
            </div>

            {v.etat === "recu" ? (
              <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>
                {transcrit === v.id ? "Transcription en cours…" : "En attente de transcription…"}
              </p>
            ) : v.etat === "echec" ? (
              <p style={{ fontSize: 12.5, margin: 0, color: "var(--danger)" }}>
                Transcription impossible : {v.erreur}
              </p>
            ) : (
              <>
                <TextareaAuto value={texte[v.id] ?? v.texte} minHauteur={56}
                  onChange={(e) => setTexte((x) => ({ ...x, [v.id]: e.target.value }))} />
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  <button className="btn primary sm" disabled={!!occupe} onClick={() => { void verser(v); }}>
                    ↓ Verser dans le bilan
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
