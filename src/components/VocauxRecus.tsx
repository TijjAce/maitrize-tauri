import React from "react";
import { listen } from "@tauri-apps/api/event";
import { api, texteErreur, type Creneau } from "../api";
import { Select, TextareaAuto } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { creneauDuVocal, repereDuVocal, verserDansLeBilan, type Vocal } from "../vocaux";

// ── Ce que le téléphone a déposé ──────────────────────────────────────────
//
// Les vocaux dictés en classe, ordinateur fermé, arrivent ici — au même
// endroit que le partage WiFi, puisque c'est par là qu'ils passent. On ouvre
// cette page au retour, le téléphone se vide, et l'on range.
//
// La transcription part toute seule, sur cette machine : elle ne coûte rien
// et ne sort pas. Le versement dans le bilan, lui, demande un clic : une
// transcription se relit avant d'entrer dans le dossier d'un élève.

/** Le jour d'un vocal, tel qu'on l'écrit au-dessus du groupe. */
function jourLisible(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "Date inconnue";
  const t = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function VocauxRecus() {
  const [vocaux, setVocaux] = React.useState<Vocal[]>([]);
  const [creneaux, setCreneaux] = React.useState<Creneau[]>([]);
  const [occupe, setOccupe] = React.useState<string>("");
  const [transcrit, setTranscrit] = React.useState<string>("");
  const [cible, setCible] = React.useState<Record<string, string>>({});
  const [texte, setTexte] = React.useState<Record<string, string>>({});

  const charger = React.useCallback(async () => {
    let liste: Vocal[] = [];
    try { liste = await api.vocauxList(); } catch { /* rien à montrer */ }
    setVocaux(liste);
    // Les créneaux des jours concernés, et rien de plus : on ne charge pas
    // l'année pour ranger trois vocaux.
    const jours = [...new Set(liste.map((v) => v.debut.slice(0, 10)).filter(Boolean))].sort();
    if (!jours.length) { setCreneaux([]); return; }
    try { setCreneaux(await api.creneauxList(jours[0], jours[jours.length - 1])); }
    catch { setCreneaux([]); }
  }, []);

  React.useEffect(() => { void charger(); }, [charger]);

  // Un vocal qui arrive pendant qu'on regarde l'écran doit s'y montrer.
  React.useEffect(() => {
    const p = listen("vocal:recu", () => { void charger(); });
    return () => { p.then((off) => off()); };
  }, [charger]);

  /**
   * La transcription part d'elle-même, un vocal après l'autre.
   *
   * Le garde-fou est une référence, pas un état : l'effet ne dépend que de
   * l'identifiant à traiter, une chaîne stable. La chaîne se poursuit seule —
   * le vocal transcrit quitte la file, le suivant prend sa place.
   */
  const aTranscrire = vocaux.find((v) => v.etat === "recu")?.id ?? "";
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

  const jours = [...new Set(vocaux.map((v) => v.debut.slice(0, 10)))].sort().reverse();

  return (
    <div className="card" style={{ maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>🎙 Vocaux du téléphone</h3>
      {vocaux.length === 0 ? (
        <p style={{ color: "var(--text-2)", margin: 0, fontSize: 13, lineHeight: 1.6 }}>
          Rien en attente. Ce que vous dictez depuis l'application du téléphone arrive ici
          dès que le partage est ouvert — transcrit sur cet ordinateur, puis rangé dans le
          bilan du créneau d'un clic.
        </p>
      ) : jours.map((jour) => (
        <div key={jour} style={{ marginBottom: 14 }}>
          <div className="meta" style={{ fontSize: 11.5, textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>
            {jourLisible(jour)}
          </div>
          {vocaux.filter((v) => v.debut.slice(0, 10) === jour)
            .sort((a, b) => a.debut.localeCompare(b.debut))
            .map((v) => {
              const devine = creneauDuVocal(v.debut, creneaux);
              const id = cible[v.id] ?? devine?.id ?? "";
              return (
                <div key={v.id} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 10, marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                    <b style={{ fontSize: 12.5 }}>{repereDuVocal(v)}</b>
                    <Select value={id} style={{ maxWidth: 240 }}
                      onChange={(e) => setCible((x) => ({ ...x, [v.id]: e.target.value }))}>
                      <option value="">— choisir le créneau —</option>
                      {creneaux.filter((c) => c.date.slice(0, 10) === jour)
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
                      <button className="btn primary sm" style={{ marginTop: 6 }}
                        disabled={!!occupe} onClick={() => { void verser(v); }}>
                        ↓ Verser dans le bilan
                      </button>
                    </>
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
