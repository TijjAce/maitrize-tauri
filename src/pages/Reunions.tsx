import React from "react";
import { Page } from "../App";
import { api, newId, nowIso, texteErreur, type Reunion } from "../api";
import { Empty, Field, Input, Select, TextareaAuto } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML, escapeHtml } from "../print";
import { useEcoute, type TrancheAudio } from "../ecoute";
import {
  GENRES, TRANCHE_S, dureeLisible, ecrireTranches, horodatage, lireTranches, nomDeLaReunion,
  redigerCompteRendu, restantAvantLaCoupe, resumerTranche, riendedit, texteACopier,
  type Tranche,
} from "../reunion";

// ── Réunions ──────────────────────────────────────────────────────────────
//
// En ESS, en conseil de cycle, en équipe éducative, on parle pendant une
// heure et l'on note trois mots : au moment de rédiger, il ne reste rien.
// Ici l'application écoute, découpe en tranches de cinq minutes et résume
// chaque tranche pendant que la réunion continue. À la fin, le compte rendu
// s'écrit à partir des résumés, et l'enseignant le relit.
//
// Tout se relit et se corrige : un résumé est une proposition, pas un procès
// verbal. C'est l'enseignant qui signe ce qui sort d'ici.

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Une réunion vide, datée d'aujourd'hui. */
function nouvelleReunion(): Reunion {
  return {
    id: newId(), titre: "", genre: GENRES[0], date: aujourdhui(), participants: "",
    tranchesJson: "[]", compteRendu: "", dureeS: 0,
    dateCreation: nowIso(), dateMaj: nowIso(),
  };
}

const LIBELLE_ETAT: Record<Tranche["etat"], string> = {
  attente: "en attente",
  transcription: "transcription…",
  resume: "résumé…",
  fait: "",
  echec: "échec",
};

export default function Reunions() {
  const [liste, setListe] = React.useState<Reunion[] | null>(null);
  const [courante, setCourante] = React.useState<Reunion | null>(null);
  const [tranches, setTranches] = React.useState<Tranche[]>([]);
  const [compteRendu, setCompteRendu] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [consentementVu, setConsentementVu] = React.useState(false);
  const [transcriptionVisible, setTranscriptionVisible] = React.useState<Set<string>>(new Set());

  // Ce que le rappel du micro doit savoir : il vit plus longtemps qu'un rendu.
  const contexte = React.useRef({ genre: "", titre: "" });
  contexte.current = { genre: courante?.genre ?? "", titre: courante?.titre ?? "" };
  const rangSuivant = React.useRef(0);
  // L'audio d'une tranche ratée, gardé en mémoire le temps d'un réessai.
  const audiosRates = React.useRef(new Map<string, Blob>());

  const charger = React.useCallback(async () => {
    try { setListe(await api.reunionsList()); }
    catch (e) { toast("Réunions illisibles : " + texteErreur(e), { icone: "⚠️" }); setListe([]); }
  }, []);
  React.useEffect(() => { void charger(); }, [charger]);

  // ── Enregistrement de la réunion en cours ───────────────────────────────
  //
  // On écrit après chaque tranche : une réunion qui dure une heure ne doit
  // rien perdre si l'ordinateur s'éteint au milieu.

  const enregistrer = React.useCallback(async (r: Reunion) => {
    try {
      await api.reunionSave(r);
      setListe((l) => {
        const sans = (l ?? []).filter((x) => x.id !== r.id);
        return [r, ...sans].sort((a, b) => (b.date || "").localeCompare(a.date || "")
          || (b.dateCreation || "").localeCompare(a.dateCreation || ""));
      });
    } catch (e) {
      toast("Enregistrement impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    }
  }, []);

  /** Modifie la réunion ouverte et l'enregistre, sans attendre la frappe suivante. */
  const minuteurSauvegarde = React.useRef<number | null>(null);
  const majReunion = React.useCallback((patch: Partial<Reunion>, tout_de_suite = false) => {
    setCourante((r) => {
      if (!r) return r;
      const suite = { ...r, ...patch, dateMaj: nowIso() };
      if (minuteurSauvegarde.current) window.clearTimeout(minuteurSauvegarde.current);
      if (tout_de_suite) void enregistrer(suite);
      else minuteurSauvegarde.current = window.setTimeout(() => { void enregistrer(suite); }, 600);
      return suite;
    });
  }, [enregistrer]);

  // Les tranches et le compte rendu vivent à part (ils changent pendant que
  // l'on tape ailleurs) : on les recolle à la réunion au moment d'écrire.
  const poserTranches = React.useCallback((suite: Tranche[]) => {
    setTranches(suite);
    setCourante((r) => {
      if (!r) return r;
      const maj = { ...r, tranchesJson: ecrireTranches(suite), dateMaj: nowIso() };
      void enregistrer(maj);
      return maj;
    });
  }, [enregistrer]);

  const ouvrir = (r: Reunion) => {
    if (ecoute.etat !== "repos") { toast("Terminez l'écoute en cours avant de changer de réunion.", { icone: "🎧" }); return; }
    setCourante(r);
    const t = lireTranches(r.tranchesJson);
    setTranches(t);
    setCompteRendu(r.compteRendu);
    rangSuivant.current = t.reduce((m, x) => Math.max(m, x.rang), 0);
    audiosRates.current.clear();
    setTranscriptionVisible(new Set());
  };

  const creer = async () => {
    if (ecoute.etat !== "repos") { toast("Terminez l'écoute en cours d'abord.", { icone: "🎧" }); return; }
    const r = nouvelleReunion();
    await enregistrer(r);
    setCourante(r); setTranches([]); setCompteRendu(""); rangSuivant.current = 0;
    audiosRates.current.clear();
  };

  // ── De l'audio au résumé ────────────────────────────────────────────────

  const majTranche = React.useCallback((id: string, patch: Partial<Tranche>, ecrire = false) => {
    setTranches((l) => {
      const suite = l.map((t) => (t.id === id ? { ...t, ...patch } : t));
      if (ecrire) {
        setCourante((r) => {
          if (!r) return r;
          const maj = { ...r, tranchesJson: ecrireTranches(suite), dateMaj: nowIso() };
          void enregistrer(maj);
          return maj;
        });
      }
      return suite;
    });
  }, [enregistrer]);

  /** Transcrit puis résume une tranche. Les erreurs restent visibles, avec un réessai. */
  const traiter = React.useCallback(async (id: string, blob: Blob) => {
    const { genre, titre } = contexte.current;
    try {
      majTranche(id, { etat: "transcription", erreur: undefined });
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Enregistrement illisible."));
        r.readAsDataURL(blob);
      });
      const transcription = await api.transcrireAudio(b64, "reunion.webm");
      majTranche(id, { transcription, etat: "resume" });
      const resume = await resumerTranche(transcription, { genre, titre });
      audiosRates.current.delete(id);
      majTranche(id, { resume, etat: "fait" }, true);
    } catch (e) {
      // L'audio reste en mémoire : tant que l'écran est ouvert, on peut réessayer.
      audiosRates.current.set(id, blob);
      majTranche(id, { etat: "echec", erreur: texteErreur(e) }, true);
    }
  }, [majTranche]);

  const surTranche = React.useCallback((t: TrancheAudio) => {
    const id = newId();
    rangSuivant.current += 1;
    const tranche: Tranche = {
      id, rang: rangSuivant.current, debut: t.debut, fin: t.fin,
      transcription: "", resume: "", etat: "transcription",
    };
    setTranches((l) => [...l, tranche]);
    void traiter(id, t.blob);
  }, [traiter]);

  const ecoute = useEcoute({ onTranche: surTranche });

  const demarrer = async () => {
    if (!courante) return;
    // Une reprise continue la réunion : les tranches suivantes s'horodatent
    // à la suite des premières, au lieu de repartir de 00:00.
    const erreur = await ecoute.demarrer(courante.dureeS);
    if (erreur) { toast(erreur, { icone: "🎙" }); return; }
    setConsentementVu(true);
  };

  const terminer = () => {
    ecoute.arreter();
    majReunion({ dureeS: ecoute.secondes }, true);
  };

  const rediger = async () => {
    if (!courante) return;
    setOccupe("Rédaction du compte rendu…");
    try {
      const texte = await redigerCompteRendu(courante, tranches);
      setCompteRendu(texte);
      majReunion({ compteRendu: texte }, true);
    } catch (e) {
      toast("Compte rendu impossible : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
    } finally { setOccupe(""); }
  };

  const copier = async () => {
    if (!courante) return;
    await navigator.clipboard.writeText(texteACopier({ ...courante, compteRendu }, tranches));
    toast("Compte rendu copié.", { icone: "📋" });
  };

  const imprimer = () => {
    if (!courante) return;
    const lignes = (texte: string) => texte.split("\n").map((l) => {
      const t = l.trim();
      if (!t) return "";
      if (t.startsWith("## ")) return `<h2>${escapeHtml(t.slice(3))}</h2>`;
      if (t.startsWith("- ")) return `<li>${escapeHtml(t.slice(2))}</li>`;
      return `<p>${escapeHtml(t)}</p>`;
    }).join("").replace(/(<li>.*?<\/li>)(?!<li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
    const corps = compteRendu.trim()
      ? lignes(compteRendu)
      : tranches.filter((t) => !riendedit(t.resume))
        .map((t) => `<h2>${horodatage(t)}</h2>${lignes(t.resume)}`).join("");
    printHTML(nomDeLaReunion(courante),
      `<h1>${escapeHtml(nomDeLaReunion(courante))}</h1>
       <div class="meta">${escapeHtml([courante.genre, courante.date,
         courante.dureeS ? dureeLisible(courante.dureeS) : ""].filter(Boolean).join(" · "))}</div>
       ${courante.participants ? `<div class="meta">Participants : ${escapeHtml(courante.participants)}</div>` : ""}
       ${corps}
       <div class="meta" style="margin-top:16px;font-style:italic">
         Compte rendu rédigé à partir de résumés automatiques, relu par l'enseignant.</div>`);
  };

  const effacerTranscriptions = async () => {
    if (!await confirmer("Effacer les transcriptions mot à mot ? Les résumés et le compte rendu sont conservés.")) return;
    poserTranches(tranches.map((t) => ({ ...t, transcription: "" })));
    toast("Transcriptions effacées.", { icone: "🧹" });
  };

  const supprimer = async (r: Reunion) => {
    if (!await confirmer(`Supprimer « ${nomDeLaReunion(r)} » et son compte rendu ?`)) return;
    await api.reunionDelete(r.id);
    setListe((l) => (l ?? []).filter((x) => x.id !== r.id));
    if (courante?.id === r.id) { setCourante(null); setTranches([]); setCompteRendu(""); }
  };

  const enCours = ecoute.etat !== "repos";
  const resumesUtiles = tranches.filter((t) => !riendedit(t.resume)).length;

  return (
    <Page titre="Réunions" sous="L'application écoute, résume toutes les 5 minutes, et rédige le compte rendu"
      actions={<button className="btn primary" onClick={creer}>＋ Nouvelle réunion</button>}>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 260px) minmax(320px, 1fr)", gap: 14, alignItems: "start" }}>
        {/* La liste : on revient souvent chercher ce qui s'est dit le mois dernier. */}
        <div className="card" style={{ padding: 8 }}>
          {liste === null ? (
            <p className="meta" style={{ margin: 8 }}>Chargement…</p>
          ) : liste.length === 0 ? (
            <p className="meta" style={{ margin: 8, fontSize: 12.5 }}>Aucune réunion enregistrée.</p>
          ) : liste.map((r) => (
            <button key={r.id} type="button" className="btn ghost"
              onClick={() => ouvrir(r)}
              style={{
                width: "100%", justifyContent: "flex-start", textAlign: "left", marginBottom: 4,
                background: courante?.id === r.id ? "var(--panel-2)" : undefined, height: "auto", padding: "8px 10px",
              }}>
              <span style={{ display: "block", minWidth: 0 }}>
                <b style={{ display: "block", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nomDeLaReunion(r)}
                </b>
                <span className="meta" style={{ fontSize: 11.5 }}>
                  {[r.genre, r.date, r.dureeS ? dureeLisible(r.dureeS) : ""].filter(Boolean).join(" · ")}
                </span>
              </span>
            </button>
          ))}
        </div>

        {!courante ? (
          <Empty icone="🎧" titre="Aucune réunion ouverte"
            sous="Créez une réunion, posez l'ordinateur sur la table, et laissez l'application écouter : elle résume toutes les cinq minutes." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
            {/* L'en-tête sert au compte rendu : le type et la date y figurent. */}
            <div className="card">
              <div className="row">
                <Field label="Objet de la réunion">
                  <Input value={courante.titre} placeholder="ESS de Camille, projet cirque…"
                    onChange={(e) => majReunion({ titre: e.target.value })} />
                </Field>
                <Field label="Type">
                  <Select value={courante.genre} onChange={(e) => majReunion({ genre: e.target.value }, true)}>
                    {GENRES.map((g) => <option key={g}>{g}</option>)}
                  </Select>
                </Field>
                <Field label="Date">
                  <Input type="date" value={courante.date} onChange={(e) => majReunion({ date: e.target.value }, true)} />
                </Field>
              </div>
              <Field label="Participants (facultatif)">
                <Input value={courante.participants} placeholder="Directrice, psychologue, éducatrice, la famille…"
                  onChange={(e) => majReunion({ participants: e.target.value })} />
              </Field>
            </div>

            {/* L'écoute. Tant qu'elle tourne, c'est le seul endroit à regarder. */}
            <div className="card">
              {!enCours && tranches.length === 0 && !consentementVu ? (
                <>
                  <b style={{ fontSize: 14 }}>Avant de commencer</b>
                  <ul style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 18 }}>
                    <li><b>Prévenez les participants</b> que vous enregistrez pour prendre des notes,
                        et recueillez leur accord — en ESS ou devant une famille, cela se demande avant.</li>
                    <li>Chaque tranche de cinq minutes part chez <b>Mistral</b> (serveurs en Europe)
                        pour être transcrite, puis le texte pour être résumé. Les prénoms d'élèves
                        connus de l'application sont masqués avant le résumé.</li>
                    <li>L'audio n'est <b>jamais écrit sur le disque</b> et disparaît après la
                        transcription : seuls les textes restent ici.</li>
                    <li>Posez l'ordinateur au milieu de la table, et empêchez-le de se mettre en veille.</li>
                  </ul>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="btn primary" onClick={demarrer}>🎧 J'ai compris, commencer à écouter</button>
                    <button className="btn" onClick={() => setConsentementVu(true)}>Écrire mes notes à la main</button>
                  </div>
                </>
              ) : enCours ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 30 }}>{ecoute.etat === "pause" ? "⏸" : "🔴"}</div>
                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(ecoute.secondes)}</div>
                    <div className="meta" style={{ fontSize: 12 }}>
                      {ecoute.etat === "pause"
                        ? "en pause"
                        : `prochain résumé dans ${mmss(restantAvantLaCoupe(ecoute.secondesTranche))}`}
                    </div>
                  </div>
                  <div className="spacer" style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ecoute.etat === "ecoute" ? (
                      <>
                        <button className="btn" onClick={ecoute.couper}
                          title="Clore la tranche maintenant : le résumé arrive sans attendre les 5 minutes">✂️ Résumer maintenant</button>
                        <button className="btn" onClick={ecoute.pause}>⏸ Pause</button>
                      </>
                    ) : (
                      <button className="btn primary" onClick={ecoute.reprendre}>▶️ Reprendre</button>
                    )}
                    <button className="btn" onClick={terminer}>⏹ Terminer</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <button className="btn primary" onClick={demarrer}>
                    {tranches.length ? "🎧 Reprendre l'écoute" : "🎧 Commencer à écouter"}
                  </button>
                  <span className="meta" style={{ fontSize: 12.5 }}>
                    Une tranche toutes les {TRANCHE_S / 60} minutes
                    {courante.dureeS ? ` · ${dureeLisible(courante.dureeS)} écoutées` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Les tranches, dans l'ordre : on suit la réunion en la lisant. */}
            {tranches.length > 0 && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <b style={{ fontSize: 14 }}>Au fil de la réunion</b>
                  <span className="meta" style={{ fontSize: 12 }}>{tranches.length} tranche(s)</span>
                  <div className="spacer" style={{ flex: 1 }} />
                  {tranches.some((t) => t.transcription) && (
                    <button className="btn ghost sm" onClick={effacerTranscriptions}
                      title="Ne garder que les résumés">🧹 Effacer le mot à mot</button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[...tranches].sort((a, b) => a.rang - b.rang).map((t) => (
                    <div key={t.id} style={{ borderLeft: "3px solid var(--border)", paddingLeft: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <b style={{ fontSize: 12.5, fontVariantNumeric: "tabular-nums" }}>{horodatage(t)}</b>
                        {LIBELLE_ETAT[t.etat] && (
                          <span className="meta" style={{ fontSize: 11.5 }}>{LIBELLE_ETAT[t.etat]}</span>
                        )}
                        <div className="spacer" style={{ flex: 1 }} />
                        {t.etat === "echec" && audiosRates.current.has(t.id) && (
                          <button className="btn ghost sm" onClick={() => { void traiter(t.id, audiosRates.current.get(t.id)!); }}>
                            ↺ Réessayer
                          </button>
                        )}
                        {t.transcription && (
                          <button className="btn ghost sm" onClick={() => setTranscriptionVisible((s) => {
                            const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n;
                          })}>
                            {transcriptionVisible.has(t.id) ? "Masquer le mot à mot" : "Voir le mot à mot"}
                          </button>
                        )}
                      </div>
                      {t.etat === "echec" ? (
                        <p style={{ fontSize: 12.5, color: "var(--danger, #ef4444)", margin: "4px 0 0" }}>
                          {t.erreur}
                          {!audiosRates.current.has(t.id) && " — l'audio n'est plus disponible : cette tranche est perdue."}
                        </p>
                      ) : t.etat === "fait" ? (
                        riendedit(t.resume) ? (
                          <p className="meta" style={{ fontSize: 12.5, margin: "4px 0 0", fontStyle: "italic" }}>
                            Rien de notable pendant ces minutes.
                          </p>
                        ) : (
                          <TextareaAuto value={t.resume} minHauteur={54}
                            onChange={(e) => majTranche(t.id, { resume: e.target.value })}
                            onBlur={() => poserTranches(tranches)}
                            style={{ fontSize: 13, marginTop: 4 }} />
                        )
                      ) : (
                        <p className="meta" style={{ fontSize: 12.5, margin: "4px 0 0" }}>…</p>
                      )}
                      {transcriptionVisible.has(t.id) && (
                        <p style={{ fontSize: 12, color: "var(--text-2)", whiteSpace: "pre-wrap", margin: "6px 0 0" }}>
                          {t.transcription}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Le compte rendu : ce qu'on emporte et qu'on envoie. */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 14 }}>Compte rendu</b>
                <div className="spacer" style={{ flex: 1 }} />
                <span className="meta" style={{ fontSize: 12 }}>{occupe}</span>
                <button className="btn primary sm" disabled={!!occupe || resumesUtiles === 0} onClick={rediger}>
                  {compteRendu ? "✨ Reprendre la rédaction" : "✨ Rédiger le compte rendu"}
                </button>
                {compteRendu && <>
                  <button className="btn sm" onClick={copier}>📋 Copier</button>
                  <button className="btn sm" onClick={imprimer}>🖨 Imprimer</button>
                </>}
              </div>
              {compteRendu || resumesUtiles > 0 ? (
                <TextareaAuto value={compteRendu} minHauteur={200}
                  onChange={(e) => setCompteRendu(e.target.value)}
                  onBlur={() => majReunion({ compteRendu }, true)}
                  placeholder="Le compte rendu s'écrit ici à partir des résumés — relisez-le avant de l'envoyer."
                  style={{ fontSize: 13.5 }} />
              ) : (
                <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>
                  Le compte rendu s'écrira à partir des résumés, dès qu'il y en aura un.
                </p>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn ghost sm" onClick={() => supprimer(courante)}>🗑 Supprimer cette réunion</button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
