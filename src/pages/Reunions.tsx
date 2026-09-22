import React from "react";
import { Page } from "../App";
import { api, newId, nowIso, texteErreur, type Reunion } from "../api";
import { Empty, Field, Input, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML, escapeHtml } from "../print";
import { useEcoute, type TrancheAudio } from "../ecoute";
import { ZoneVivante } from "../components/ZoneVivante";
import {
  GENRES, MORCEAU_S, PHRASES_PAR_RESUME, ajouterAuDocument, ajouterAuTexte, assezPourResumer, convertirAnciennes,
  decouperEnPhrases, dureeLisible, ecrireResumes, lirePlan, lireResumes, mettreAuPropre,
  nomDeLaReunion, phrasesEnAttente, planVide, rangerLeDocument, texteACopier, type Resume,
} from "../reunion";

// ── Réunions ──────────────────────────────────────────────────────────────
//
// En ESS, en conseil de cycle, en équipe éducative, on parle pendant une
// heure et l'on note trois mots : au moment de rédiger, il ne reste rien.
// Ici, l'application écrit ce qui se dit au fur et à mesure, et un agent
// range : toutes les dix phrases, il reprend le compte rendu et l'agence —
// ce qui est nouveau va sous le bon titre, ce qui se répète fusionne, une
// piste devenue décision change de rubrique. À la fin, le compte rendu est
// déjà écrit ; il ne reste qu'à le mettre au propre.
//
// Le texte est modifiable, et l'on peut aussi y taper sans micro : une
// réunion se prend parfois au clavier, et les résumés arrivent pareillement.
//
// Tout se relit et se corrige : un résumé est une proposition, pas un procès
// verbal. C'est l'enseignant qui signe ce qui sort d'ici.

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

/**
 * Le repos après lequel on résume, une fois les dix phrases atteintes.
 *
 * Court exprès : un texte qui continue d'arriver — la dictée qui reprend, une
 * frappe rapide — ne doit pas repousser le résumé indéfiniment. Il sert juste
 * à ne pas partir au milieu d'un mot.
 */
const REPOS_MS = 1000;

/** Une réunion vide, datée d'aujourd'hui. */
function nouvelleReunion(): Reunion {
  return {
    id: newId(), titre: "", genre: GENRES[0], date: aujourdhui(), participants: "",
    tranchesJson: "[]", texte: "", resumesJson: "[]", compteRendu: "", dureeS: 0,
    dateCreation: nowIso(), dateMaj: nowIso(),
  };
}

export default function Reunions() {
  const [liste, setListe] = React.useState<Reunion[] | null>(null);
  const [courante, setCourante] = React.useState<Reunion | null>(null);
  const [texte, setTexte] = React.useState("");
  const [resumes, setResumes] = React.useState<Resume[]>([]);
  const [compteRendu, setCompteRendu] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [consentementVu, setConsentementVu] = React.useState(false);
  const [transcrit, setTranscrit] = React.useState(false);

  // Ce que les rappels du micro et des minuteurs doivent lire : ils vivent
  // plus longtemps qu'un rendu, et une valeur figée leur ferait résumer deux
  // fois le même passage.
  const contexte = React.useRef({ genre: "", titre: "" });
  contexte.current = { genre: courante?.genre ?? "", titre: courante?.titre ?? "" };
  const texteRef = React.useRef("");
  texteRef.current = texte;
  const resumesRef = React.useRef<Resume[]>([]);
  resumesRef.current = resumes;
  // L'agent repart du compte rendu tel qu'il est — corrections de
  // l'enseignant comprises : c'est lui l'état, il n'y en a pas d'autre.
  const compteRenduRef = React.useRef("");
  compteRenduRef.current = compteRendu;
  const resumeEnCours = React.useRef(false);
  const secondesRef = React.useRef(0);
  // Un booléen, pas l'objet : `courante` change à chaque enregistrement, et
  // en dépendre relancerait le minuteur du résumé sans arrêt.
  const ouverte = !!courante;

  const charger = React.useCallback(async () => {
    try { setListe(await api.reunionsList()); }
    catch (e) { toast("Réunions illisibles : " + texteErreur(e), { icone: "⚠️" }); setListe([]); }
  }, []);
  React.useEffect(() => { void charger(); }, [charger]);

  // ── Enregistrement ──────────────────────────────────────────────────────
  //
  // On écrit souvent : une réunion d'une heure ne doit rien perdre si
  // l'ordinateur s'éteint au milieu.

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

  const minuteurSauvegarde = React.useRef<number | null>(null);
  /** Modifie la réunion ouverte et l'enregistre, tout de suite ou après la frappe. */
  const majReunion = React.useCallback((patch: Partial<Reunion>, tout_de_suite = false) => {
    setCourante((r) => {
      if (!r) return r;
      const suite = { ...r, ...patch, dateMaj: nowIso() };
      if (minuteurSauvegarde.current) window.clearTimeout(minuteurSauvegarde.current);
      if (tout_de_suite) void enregistrer(suite);
      else minuteurSauvegarde.current = window.setTimeout(() => { void enregistrer(suite); }, 800);
      return suite;
    });
  }, [enregistrer]);

  // Le texte et les résumés vivent à part (ils changent pendant qu'on tape
  // ailleurs) : on les recolle à la réunion au moment d'écrire.
  const poserTexte = React.useCallback((suite: string, tout_de_suite = false) => {
    texteRef.current = suite;
    setTexte(suite);
    majReunion({ texte: suite }, tout_de_suite);
  }, [majReunion]);

  const majResume = React.useCallback((id: string, patch: Partial<Resume>, ecrire = false) => {
    const suite = resumesRef.current.map((r) => (r.id === id ? { ...r, ...patch } : r));
    resumesRef.current = suite;
    setResumes(suite);
    if (ecrire) majReunion({ resumesJson: ecrireResumes(suite), texte: texteRef.current }, true);
  }, [majReunion]);

  // ── Résumer ce qui attend ───────────────────────────────────────────────

  /**
   * Fait relire le compte rendu à l'agent avec ce qui vient d'être dit.
   *
   * Rien n'est empilé : l'agent rend le document entier, réagencé. On repart
   * toujours de la version affichée, pour qu'une correction de l'enseignant
   * survive au passage suivant.
   */
  const integrerSiBesoin = React.useCallback(async (force = false) => {
    if (resumeEnCours.current) return;
    const { de, phrases } = phrasesEnAttente(texteRef.current, resumesRef.current);
    if (!phrases.length) return;
    if (!force && !assezPourResumer(phrases.length)) return;
    resumeEnCours.current = true;
    const id = newId();
    const encours: Resume = {
      id, rang: resumesRef.current.length + 1, de, a: de + phrases.length,
      texte: "", etat: "encours", quand: secondesRef.current || undefined,
    };
    const avec = [...resumesRef.current, encours];
    resumesRef.current = avec;
    setResumes(avec);
    try {
      const suite = await rangerLeDocument(compteRenduRef.current, contexte.current);
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majResume(id, { etat: "fait" });
      majReunion({ compteRendu: suite, resumesJson: ecrireResumes(resumesRef.current), texte: texteRef.current }, true);
    } catch (e) {
      majResume(id, { etat: "echec", erreur: texteErreur(e) }, true);
    } finally {
      resumeEnCours.current = false;
    }
  }, [majResume, majReunion]);

  /** Un passage mal intégré se rejoue : le texte, lui, n'est pas perdu. */
  const refaire = async (r: Resume) => {
    if (resumeEnCours.current) return;
    resumeEnCours.current = true;
    majResume(r.id, { etat: "encours", erreur: undefined });
    try {
      const suite = await rangerLeDocument(compteRenduRef.current, contexte.current);
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majResume(r.id, { etat: "fait" });
      majReunion({ compteRendu: suite, resumesJson: ecrireResumes(resumesRef.current), texte: texteRef.current }, true);
    } catch (e) {
      majResume(r.id, { etat: "echec", erreur: texteErreur(e) }, true);
    } finally { resumeEnCours.current = false; }
  };

  // Dix phrases de plus, et le résumé part — après un court repos, pour ne
  // pas couper un mot en train de s'écrire. Le même chemin sert à la dictée
  // et à la frappe. Tant qu'on est sous les dix phrases, aucun minuteur ne
  // tourne : rien à annuler, rien à repousser.
  const assez = assezPourResumer(phrasesEnAttente(texte, resumes).phrases.length);
  React.useEffect(() => {
    if (!ouverte || !assez) return;
    const t = window.setTimeout(() => { void integrerSiBesoin(); }, REPOS_MS);
    return () => window.clearTimeout(t);
  }, [texte, ouverte, assez, integrerSiBesoin]);

  // ── L'écoute ────────────────────────────────────────────────────────────

  const surMorceau = React.useCallback(async (t: TrancheAudio) => {
    setTranscrit(true);
    try {
      const b64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result).split(",")[1] ?? "");
        r.onerror = () => rej(new Error("Enregistrement illisible."));
        r.readAsDataURL(t.blob);
      });
      const morceau = await api.transcrireAudio(b64, "reunion.webm");
      // Deux endroits, un seul visible : la source garde le mot à mot, et
      // l'encadré reçoit la parole brute à la suite — c'est elle qu'on voit
      // s'écrire, et que l'agent rangera au prochain passage.
      poserTexte(ajouterAuTexte(texteRef.current, morceau), true);
      const suite = ajouterAuDocument(compteRenduRef.current, morceau);
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majReunion({ compteRendu: suite }, true);
    } catch (e) {
      toast("Un passage n'a pas pu être transcrit : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally { setTranscrit(false); }
  }, [poserTexte]);

  const ecoute = useEcoute({ onTranche: (t) => { void surMorceau(t); }, tranche: MORCEAU_S });
  // Où en est CETTE réunion : le compteur du micro tant qu'il tourne, la
  // durée déjà écoutée sinon. Sans cela, une réunion tapée au clavier
  // héritait des minutes de la précédente.
  secondesRef.current = ecoute.etat !== "repos" ? ecoute.secondes : (courante?.dureeS ?? 0);

  const ouvrir = (r: Reunion) => {
    if (ecoute.etat !== "repos") { toast("Terminez l'écoute en cours avant de changer de réunion.", { icone: "🎧" }); return; }
    setCourante(r);
    // Une réunion d'avant ce changement n'a que ses tranches de cinq minutes :
    // on en refait un texte suivi et des résumés, une fois pour toutes.
    const ancienne = !r.texte.trim() && !lireResumes(r.resumesJson).length && r.tranchesJson.length > 2;
    const relu = ancienne ? convertirAnciennes(r.tranchesJson) : { texte: r.texte, resumes: lireResumes(r.resumesJson) };
    texteRef.current = relu.texte;
    setTexte(relu.texte);
    resumesRef.current = relu.resumes;
    setResumes(relu.resumes);
    setCompteRendu(r.compteRendu);
    setConsentementVu(false);
    if (ancienne) {
      void enregistrer({ ...r, texte: relu.texte, resumesJson: ecrireResumes(relu.resumes), dateMaj: nowIso() });
    }
  };

  const creer = async () => {
    if (ecoute.etat !== "repos") { toast("Terminez l'écoute en cours d'abord.", { icone: "🎧" }); return; }
    const r = nouvelleReunion();
    await enregistrer(r);
    setCourante(r);
    texteRef.current = ""; setTexte("");
    resumesRef.current = []; setResumes([]);
    setCompteRendu("");
    setConsentementVu(false);
  };

  const demarrer = async () => {
    if (!courante) return;
    const erreur = await ecoute.demarrer(courante.dureeS);
    if (erreur) { toast(erreur, { icone: "🎙" }); return; }
    setConsentementVu(true);
  };

  const terminer = () => {
    ecoute.arreter();
    majReunion({ dureeS: ecoute.secondes }, true);
    // Ce qui reste sous les dix phrases mérite quand même son résumé, une
    // fois la dernière transcription arrivée.
    window.setTimeout(() => { void integrerSiBesoin(true); }, 1500);
  };

  // ── Le compte rendu ─────────────────────────────────────────────────────

  const auPropre = async () => {
    if (!courante) return;
    setOccupe("Mise au propre…");
    try {
      const t = await mettreAuPropre(courante, compteRenduRef.current);
      compteRenduRef.current = t;
      setCompteRendu(t);
      majReunion({ compteRendu: t }, true);
    } catch (e) {
      toast("Mise au propre impossible : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
    } finally { setOccupe(""); }
  };

  const copier = async () => {
    if (!courante) return;
    await navigator.clipboard.writeText(texteACopier({ ...courante, compteRendu, texte }));
    toast("Compte rendu copié.", { icone: "📋" });
  };

  const imprimer = () => {
    if (!courante) return;
    const lignes = (t: string) => t.split("\n").map((l) => {
      const x = l.trim();
      if (!x) return "";
      if (x.startsWith("## ")) return `<h2>${escapeHtml(x.slice(3))}</h2>`;
      if (x.startsWith("- ")) return `<li>${escapeHtml(x.slice(2))}</li>`;
      return `<p>${escapeHtml(x)}</p>`;
    }).join("").replace(/(<li>.*?<\/li>)(?!<li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
    // Sans compte rendu — réunion trop courte —, on imprime ce qui a été dit.
    const corps = compteRendu.trim() ? lignes(compteRendu) : lignes(texte);
    printHTML(nomDeLaReunion(courante),
      `<h1>${escapeHtml(nomDeLaReunion(courante))}</h1>
       <div class="meta">${escapeHtml([courante.genre, courante.date,
         courante.dureeS ? dureeLisible(courante.dureeS) : ""].filter(Boolean).join(" · "))}</div>
       ${courante.participants ? `<div class="meta">Participants : ${escapeHtml(courante.participants)}</div>` : ""}
       ${corps}
       <div class="meta" style="margin-top:16px;font-style:italic">
         Compte rendu rédigé à partir de résumés automatiques, relu par l'enseignant.</div>`);
  };

  const effacerTexte = async () => {
    if (!await confirmer("Effacer le texte mot à mot ? Les résumés et le compte rendu sont conservés.")) return;
    poserTexte("", true);
    toast("Texte effacé.", { icone: "🧹" });
  };

  const supprimer = async (r: Reunion) => {
    if (!await confirmer(`Supprimer « ${nomDeLaReunion(r)} » et son compte rendu ?`)) return;
    await api.reunionDelete(r.id);
    setListe((l) => (l ?? []).filter((x) => x.id !== r.id));
    if (courante?.id === r.id) { setCourante(null); setTexte(""); setResumes([]); setCompteRendu(""); }
  };

  const enCours = ecoute.etat !== "repos";
  const attente = phrasesEnAttente(texte, resumes).phrases.length;
  const integres = resumes.filter((r) => r.etat === "fait").length;
  const ratés = resumes.filter((r) => r.etat === "echec");
  const vide = planVide(lirePlan(compteRendu));

  return (
    <Page titre="Réunions" sous="Le texte s'écrit pendant la réunion, et se résume toutes les 10 phrases"
      actions={<button className="btn primary" onClick={creer}>＋ Nouvelle réunion</button>}>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 240px) minmax(320px, 1fr)", gap: 14, alignItems: "start" }}>
        {/* La liste : on revient souvent chercher ce qui s'est dit le mois dernier. */}
        <div className="card" style={{ padding: 8 }}>
          {liste === null ? (
            <p className="meta" style={{ margin: 8 }}>Chargement…</p>
          ) : liste.length === 0 ? (
            <p className="meta" style={{ margin: 8, fontSize: 12.5 }}>Aucune réunion enregistrée.</p>
          ) : liste.map((r) => (
            <button key={r.id} type="button" className="btn ghost" onClick={() => ouvrir(r)}
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
            sous="Créez une réunion, posez l'ordinateur sur la table, et laissez l'application écrire : elle résume toutes les dix phrases." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
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
              {!enCours && !texte.trim() && !consentementVu ? (
                <>
                  <b style={{ fontSize: 14 }}>Avant de commencer</b>
                  <ul style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 18 }}>
                    <li><b>Prévenez les participants</b> que vous enregistrez pour prendre des notes,
                        et recueillez leur accord — en ESS ou devant une famille, cela se demande avant.</li>
                    <li>L'audio part chez <b>Mistral</b> (serveurs en Europe) pour être transcrit, puis
                        le texte pour être résumé. Les prénoms d'élèves connus de l'application sont
                        masqués avant le résumé.</li>
                    <li>L'audio n'est <b>jamais écrit sur le disque</b> et disparaît après la
                        transcription : seuls les textes restent ici.</li>
                    <li>Posez l'ordinateur au milieu de la table, et empêchez-le de se mettre en veille.</li>
                  </ul>
                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button className="btn primary" onClick={demarrer}>🎧 J'ai compris, commencer à écouter</button>
                    <button className="btn" onClick={() => setConsentementVu(true)}>
                      ⌨️ Écrire moi-même
                    </button>
                  </div>
                </>
              ) : enCours ? (
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 30 }}>{ecoute.etat === "pause" ? "⏸" : "🔴"}</div>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ fontSize: 24, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(ecoute.secondes)}</div>
                    <div className="meta" style={{ fontSize: 12 }}>
                      {ecoute.etat === "pause" ? "en pause"
                        : transcrit ? "le texte s'écrit…"
                        : `${attente} phrase${attente > 1 ? "s" : ""} depuis le dernier rangement`}
                    </div>
                  </div>
                  <div className="spacer" style={{ flex: 1 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ecoute.etat === "ecoute" ? (
                      <>
                        <button className="btn" onClick={ecoute.couper} disabled={transcrit}
                          title="Transcrire tout de suite ce qui vient d'être dit">⤓ Écrire maintenant</button>
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
                    {texte.trim() ? "🎧 Reprendre l'écoute" : "🎧 Commencer à écouter"}
                  </button>
                  <span className="meta" style={{ fontSize: 12.5 }}>
                    Le compte rendu se range toutes les {PHRASES_PAR_RESUME} phrases
                    {courante.dureeS ? ` · ${dureeLisible(courante.dureeS)} écoutées` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Un seul encadré. Le texte s'y écrit tout seul, lettre après
                lettre, et l'agent le range toutes les dix phrases. On peut y
                mettre la main à tout moment : l'animation s'arrête, et
                l'agent repart de ce qui est écrit. */}
            <div className="card">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                <b style={{ fontSize: 14 }}>Compte rendu</b>
                <span className="meta" style={{ fontSize: 12 }}>
                  {integres > 0 ? `${integres} rangement(s)` : "il s'écrira pendant la réunion"}
                  {transcrit ? " · le texte s'écrit…"
                    : attente > 0 && (assez ? " · rangement en cours…" : ` · ${PHRASES_PAR_RESUME - attente} phrases avant le prochain`)}
                </span>
                <div className="spacer" style={{ flex: 1 }} />
                <span className="meta" style={{ fontSize: 12 }}>{occupe}</span>
                {attente > 0 && (
                  <button className="btn sm" onClick={() => { void integrerSiBesoin(true); }}
                    title="Ranger tout de suite ce qui vient d'être dit">✨ Ranger maintenant</button>
                )}
                {!vide && <>
                  <button className="btn primary sm" disabled={!!occupe} onClick={auPropre}
                    title="Relire l'ensemble d'un coup : redites, ordre, tournures">✍️ Mettre au propre</button>
                  <button className="btn sm" onClick={copier}>📋 Copier</button>
                  <button className="btn sm" onClick={imprimer}>🖨 Imprimer</button>
                </>}
              </div>
              <ZoneVivante cible={compteRendu} minHauteur={320} anime={enCours || transcrit || assez}
                onChange={(v) => { compteRenduRef.current = v; setCompteRendu(v); majReunion({ compteRendu: v }); }}
                placeholder="Ce qui se dit s'écrira ici, tout seul — et se rangera en points abordés, décisions et choses à faire. Vous pouvez écrire dedans à tout moment." />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span className="meta" style={{ fontSize: 11.5 }}>
                  Le mot à mot est gardé à part ({decouperEnPhrases(texte).length} phrase(s)).
                </span>
                {texte.trim() && <button className="btn ghost sm" onClick={effacerTexte}>🧹 Effacer le mot à mot</button>}
                {ratés.length > 0 && (
                  <>
                    <span style={{ fontSize: 11.5, color: "var(--danger, #ef4444)" }}>
                      {ratés.length} rangement(s) raté(s).
                    </span>
                    <button className="btn ghost sm" onClick={() => { void refaire(ratés[0]); }}>↺ Réessayer</button>
                  </>
                )}
              </div>
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
