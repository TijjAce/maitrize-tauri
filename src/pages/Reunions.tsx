import React from "react";
import { Page } from "../App";
import { api, journal, newId, nowIso, texteErreur, type Reunion } from "../api";
import { Empty, Field, Input, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { printHTML, escapeHtml } from "../print";
import { useEcoute, type TrancheAudio } from "../ecoute";
import { ZoneVivante } from "../components/ZoneVivante";
import {
  formatDe, moteurActif, secondesParMorceau, sortieDeLAudio, transcrire, type Moteur,
} from "../transcription";
import {
  GENRES, PHRASES_PAR_RELECTURE, ajouterAuDocument, ajouterAuTexte, assezPourResumer, convertirAnciennes,
  decouperEnPhrases, dureeLisible, ecrireResumes, lirePlan, lireResumes, mettreAuPropre,
  assezPourRelire, nomDeLaReunion, phrasesEnAttente, planVide, rangerLeDocument,
  relireLeDocument, texteACopier, type Resume,
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

/** L'accord donné une fois, gardé sur ce poste : l'écoute part seule ensuite. */
const CLE_CONSENTEMENT = "reunionsConsentement";
/** La relecture de fond, qu'on peut couper : elle coûte un appel de plus. */
const CLE_RELECTURE = "reunionsRelecture";

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
  // L'en-tête (objet, type, date) ne sert qu'avant et après : pendant la
  // réunion, c'est l'encadré qui doit avoir la place.
  const [entete, setEntete] = React.useState(false);
  // L'accord est donné une fois : ensuite l'écoute part d'elle-même, et il
  // n'y a plus de bouton à chercher au moment où la réunion commence.
  const dejaExplique = React.useRef(false);
  const [transcrit, setTranscrit] = React.useState(false);
  const [relit, setRelit] = React.useState(false);
  // La relecture de fond est un choix : elle améliore le compte rendu, et
  // elle consomme un appel de plus toutes les dix phrases.
  const [relecture, setRelecture] = React.useState(true);
  // Le moteur de transcription : en ligne, ou sur cette machine.
  const [moteur, setMoteur] = React.useState<Moteur>("ligne");

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
  // Lue depuis les rappels, qui vivent plus longtemps qu'un rendu.
  const relectureRef = React.useRef(true);
  relectureRef.current = relecture;
  const moteurRef = React.useRef<Moteur>("ligne");
  moteurRef.current = moteur;
  const resumeEnCours = React.useRef(false);
  // Où en était le texte à la dernière relecture de fond. Perdu au
  // redémarrage, et ce n'est pas grave : la relecture arrivera un peu plus
  // tard, c'est tout.
  const phrasesRelues = React.useRef(0);
  const secondesRef = React.useRef(0);
  // Un booléen, pas l'objet : `courante` change à chaque enregistrement, et
  // en dépendre relancerait le minuteur du résumé sans arrêt.
  const ouverte = !!courante;

  React.useEffect(() => {
    api.settingGet(CLE_CONSENTEMENT).then((v) => { dejaExplique.current = v === "1"; }).catch(() => {});
    api.settingGet(CLE_RELECTURE).then((v) => setRelecture(v !== "0")).catch(() => {});
    moteurActif().then(setMoteur).catch(() => {});
  }, []);

  const basculerRelecture = () => {
    const suite = !relecture;
    setRelecture(suite);
    api.settingSet(CLE_RELECTURE, suite ? "1" : "0").catch(() => {});
  };

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
   * La relecture de fond, toutes les dix phrases.
   *
   * Elle suit un rangement, jamais l'inverse : relire un document auquel il
   * manque les deux dernières phrases n'aurait pas de sens.
   */
  const relireSiBesoin = React.useCallback(async () => {
    if (!relectureRef.current) return;
    const phrases = decouperEnPhrases(texteRef.current).length;
    if (!assezPourRelire(phrases - phrasesRelues.current)) return;
    phrasesRelues.current = phrases;
    setRelit(true);
    try {
      const suite = await relireLeDocument(compteRenduRef.current, contexte.current);
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majReunion({ compteRendu: suite }, true);
    } catch (e) {
      // Une relecture ratée ne casse rien : le document d'avant reste, et la
      // suivante retentera dans dix phrases.
      journal(`ÉCHEC relecture réunion : ${texteErreur(e)}`);
    } finally { setRelit(false); }
  }, [majReunion]);

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
      await relireSiBesoin();
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

  // Deux phrases de plus, et le rangement part — après un court repos, pour
  // ne pas couper un mot en train de s'écrire. Le même chemin sert à la
  // dictée et à la frappe.
  //
  // Le minuteur ne dépend **pas** du texte : sinon chaque arrivée le remet à
  // zéro, et si la parole arrive plus vite que le repos, il ne part jamais.
  // Le défaut s'était déjà produit ; il ne se reproduira pas.
  const assez = assezPourResumer(phrasesEnAttente(texte, resumes).phrases.length);
  React.useEffect(() => {
    if (!ouverte || !assez) return;
    const t = window.setTimeout(() => { void integrerSiBesoin(); }, REPOS_MS);
    return () => window.clearTimeout(t);
  }, [ouverte, assez, integrerSiBesoin]);

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
      const morceau = await transcrire(b64, moteurRef.current);
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

  const ecoute = useEcoute({
    onTranche: (t) => { void surMorceau(t); },
    tranche: secondesParMorceau(moteur),
    format: formatDe(moteur),
  });
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
    phrasesRelues.current = decouperEnPhrases(relu.texte).length;
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
    phrasesRelues.current = 0;
    setConsentementVu(false);
    setEntete(false);
    // Rien à cliquer : on pose l'ordinateur et ça écoute. L'écran d'accord
    // ne revient que tant qu'il n'a pas été accepté une première fois.
    if (dejaExplique.current) {
      const erreur = await ecoute.demarrer(0);
      if (erreur) toast(erreur, { icone: "🎙" });
      else setConsentementVu(true);
    }
  };

  /** Premier accord : on le retient, et l'écoute part dans la foulée. */
  const accepterEtEcouter = async () => {
    dejaExplique.current = true;
    api.settingSet(CLE_CONSENTEMENT, "1").catch(() => {});
    await demarrer();
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
  const aDuTexte = !!texte.trim() || !!compteRendu.trim();
  // L'écran d'accord ne s'affiche que tant qu'il n'a pas été accepté, et
  // seulement sur une réunion qui n'a pas encore commencé.
  const aExpliquer = !enCours && !aDuTexte && !consentementVu && !dejaExplique.current;
  const ratés = resumes.filter((r) => r.etat === "echec");
  const vide = planVide(lirePlan(compteRendu));

  return (
    <Page titre="Réunions" sous="Le texte s'écrit tout seul, et se range toutes les 10 phrases"
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
            {/* Pendant la réunion, l'écran s'efface : une bande de contrôle,
                et l'encadré. L'en-tête ne sert qu'avant et après, il se
                replie pour laisser la place au texte. */}
            {(!enCours && !aDuTexte) || entete ? (
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
            ) : null}

            {/* L'accord des participants se demande une fois, et l'écoute part
                ensuite d'elle-même à chaque nouvelle réunion. */}
            {aExpliquer ? (
              <div className="card">
                <b style={{ fontSize: 14 }}>Avant de commencer</b>
                <ul style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 18 }}>
                  <li><b>Prévenez les participants</b> que vous enregistrez pour prendre des notes,
                      et recueillez leur accord — en ESS ou devant une famille, cela se demande avant.</li>
                  <li>{sortieDeLAudio(moteur)} Les prénoms d'élèves connus de l'application
                      sont masqués avant tout envoi de texte.</li>
                  <li>Le compte rendu, lui, est rangé par l'IA en ligne dans les deux cas :
                      c'est du texte, et les prénoms y sont masqués.</li>
                  <li>Une fois cet écran accepté, l'écoute démarrera d'elle-même à chaque nouvelle
                      réunion. Le bouton Pause reste à portée de main.</li>
                </ul>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  <button className="btn primary" onClick={accepterEtEcouter}>🎧 J'ai compris, écouter</button>
                  <button className="btn" onClick={() => setConsentementVu(true)}>⌨️ Écrire moi-même</button>
                </div>
              </div>
            ) : (
              <div className="toolbar" style={{ marginBottom: 0 }}>
                <span style={{ fontSize: 18 }}>{enCours ? (ecoute.etat === "pause" ? "⏸" : "🔴") : "⏹"}</span>
                <b style={{ fontSize: 15, fontVariantNumeric: "tabular-nums", minWidth: 54 }}>
                  {mmss(enCours ? ecoute.secondes : courante.dureeS)}
                </b>
                <span className="meta" style={{ fontSize: 12 }}>
                  {ecoute.etat === "pause" ? "en pause"
                    : relit ? "relecture de l'ensemble…"
                    : transcrit ? "le texte s'écrit…"
                    : enCours ? (assez ? "rangement en cours…"
                        : relecture
                          ? `relecture dans ${Math.max(1, PHRASES_PAR_RELECTURE - (decouperEnPhrases(texte).length - phrasesRelues.current))} phrases`
                          : "rangement à chaque phrase")
                    : "écoute arrêtée"}
                </span>
                <div className="spacer" style={{ flex: 1 }} />
                {enCours ? (
                  <>
                    {ecoute.etat === "ecoute"
                      ? <button className="btn" onClick={ecoute.pause}>⏸ Pause</button>
                      : <button className="btn primary" onClick={ecoute.reprendre}>▶️ Reprendre</button>}
                    <button className="btn" onClick={terminer}>⏹ Terminer</button>
                  </>
                ) : (
                  <button className="btn primary" onClick={demarrer}>🎧 Écouter</button>
                )}
                {attente > 0 && (
                  <button className="btn sm" onClick={() => { void integrerSiBesoin(true); }}
                    title="Ranger tout de suite ce qui vient d'être dit">✨ Ranger</button>
                )}
                {!vide && <>
                  <button className="btn sm" disabled={!!occupe} onClick={auPropre}
                    title="Relire l'ensemble d'un coup : redites, ordre, tournures">✍️ Au propre</button>
                  <button className="btn sm" onClick={copier}>📋</button>
                  <button className="btn sm" onClick={imprimer}>🖨</button>
                </>}
                <button className="btn ghost sm" onClick={basculerRelecture}
                  title={relecture
                    ? "Une seconde IA relit tout le compte rendu toutes les dix phrases et le resserre. Cliquez pour l'arrêter."
                    : "La relecture de fond est arrêtée : le compte rendu se range au fil de l'eau, sans seconde lecture."}>
                  {relecture ? "🔁 Relecture" : "🔁̸ Sans relecture"}
                </button>
                <button className="btn ghost sm" onClick={() => setEntete((v) => !v)}
                  title="Objet, type, date, participants">{entete ? "▴" : "▾"} Détails</button>
              </div>
            )}

            {/* L'encadré, et rien d'autre : même feuille que l'éditeur de
                textes, pour qu'on écrive ici comme on écrit là-bas. */}
            <ZoneVivante cible={compteRendu} minHauteur="55vh" anime={enCours || transcrit || assez}
              onChange={(v) => { compteRenduRef.current = v; setCompteRendu(v); majReunion({ compteRendu: v }); }}
              placeholder="Ce qui se dit s'écrira ici, tout seul — et se rangera en points abordés, décisions et choses à faire. Vous pouvez écrire dedans à tout moment." />

            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span className="meta" style={{ fontSize: 11.5 }}>
                {occupe || `Mot à mot gardé à part (${decouperEnPhrases(texte).length} phrase(s))`}
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

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="btn ghost sm" onClick={() => supprimer(courante)}>🗑 Supprimer cette réunion</button>
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
