import React from "react";
import { Page } from "../App";
import { api, journal, newId, nowIso, texteErreur, type Reunion } from "../api";
import { Empty, Field, Input, Modal, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { printHTML, escapeHtml } from "../print";
import { useEcoute, type TrancheAudio } from "../ecoute";
import { ZoneVivante } from "../components/ZoneVivante";
import {
  moteurActif, paroleMinimale, plafondDuMorceau, sortieDeLAudio, transcrire, type Moteur,
} from "../transcription";
import {
  GENRES, SECONDES_PAR_RELECTURE, ajouterAuDocument, ajouterAuTexte, assezPourResumer, convertirAnciennes,
  dureeLisible, ecrireResumes, lirePlan, lireResumes, mettreAuPropre,
  assezPourRelire, nomDeLaReunion, phrasesEnAttente, planVide, rangerLeDocument,
  relireLeDocument, texteACopier, type Resume,
} from "../reunion";
import {
  CLE_MODE, CLE_RELECTURE, MODES, estUnePanneDeReseau, lireMode, rangeEnLigne, relitEnLigne,
  type ModeIA,
} from "../modeReunion";

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

/** Ce qu'on demande avant de commencer, et qu'on peut reprendre ensuite. */
interface Infos { titre: string; genre: string; date: string; participants: string }

/**
 * La fiche de la réunion.
 *
 * Posée avant l'écoute, elle ne revient plus encombrer l'écran : pendant la
 * réunion, on regarde le texte. Pour la reprendre après coup, clic droit sur
 * la réunion dans la liste.
 */
function FicheReunion({ infos, titre, bouton, onValider, onClose }: {
  infos: Infos; titre: string; bouton: string;
  onValider: (i: Infos) => void; onClose: () => void;
}) {
  const [i, setI] = React.useState<Infos>(infos);
  const champ = <T extends keyof Infos>(k: T) => (e: { target: { value: string } }) =>
    setI((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal titre={titre} onClose={onClose} footer={<>
      <div className="spacer" style={{ flex: 1 }} />
      <button className="btn" onClick={onClose}>Annuler</button>
      <button className="btn primary" onClick={() => onValider(i)}>{bouton}</button>
    </>}>
      <form onSubmit={(e) => { e.preventDefault(); onValider(i); }}>
        <Field label="Objet de la réunion">
          <Input autoFocus value={i.titre} placeholder="ESS de Camille, projet cirque…" onChange={champ("titre")} />
        </Field>
        <div className="row">
          <Field label="Type">
            <Select value={i.genre} onChange={champ("genre")}>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={i.date} onChange={champ("date")} />
          </Field>
        </div>
        <Field label="Participants (facultatif)">
          <Input value={i.participants} placeholder="Directrice, psychologue, éducatrice, la famille…"
            onChange={champ("participants")} />
        </Field>
        {/* Le formulaire se valide à l'Entrée : on pose l'ordinateur et ça part. */}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
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
  // La fiche ouverte : une nouvelle réunion, ou celle qu'on vient reprendre.
  const [fiche, setFiche] = React.useState<{ pour: Reunion | null } | null>(null);
  // L'accord est donné une fois : ensuite l'écoute part d'elle-même, et il
  // n'y a plus de bouton à chercher au moment où la réunion commence.
  const dejaExplique = React.useRef(false);
  const [transcrit, setTranscrit] = React.useState(false);
  const [relit, setRelit] = React.useState(false);
  // Ce qui part en ligne : rien, le rangement, ou le rangement et la
  // relecture. Trois positions, parce qu'il y a trois travaux distincts.
  const [mode, setMode] = React.useState<ModeIA>("relire");
  // Le moteur de transcription : en ligne, ou sur cette machine.
  const [moteur, setMoteur] = React.useState<Moteur>("ligne");
  // Le réseau est tombé : on cesse d'essayer, et on le dit une fois.
  const [horsLigne, setHorsLigne] = React.useState(false);

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
  // Lus depuis les rappels, qui vivent plus longtemps qu'un rendu.
  const modeRef = React.useRef<ModeIA>("relire");
  modeRef.current = mode;
  const moteurRef = React.useRef<Moteur>("ligne");
  moteurRef.current = moteur;
  const horsLigneRef = React.useRef(false);
  horsLigneRef.current = horsLigne;
  const resumeEnCours = React.useRef(false);
  // Où en était la réunion, en secondes d'écoute, à la dernière relecture.
  // Perdu au redémarrage, et ce n'est pas grave : la relecture arrivera un
  // peu plus tard, c'est tout.
  const secondesRelues = React.useRef(0);
  const secondesRef = React.useRef(0);
  // Un booléen, pas l'objet : `courante` change à chaque enregistrement, et
  // en dépendre relancerait le minuteur du résumé sans arrêt.
  const ouverte = !!courante;

  /**
   * Relit les réglages qui commandent la réunion.
   *
   * La page reste montée quand on va ailleurs : lus une seule fois, le moteur
   * et le mode restaient ceux du démarrage. Changer « En ligne » pour
   * « Whisper » dans les Réglages n'avait alors aucun effet avant de fermer
   * l'application — et la réunion suivante repartait chez Mistral.
   */
  const relireLesReglages = React.useCallback(async () => {
    const [accord, choisi, ancienne] = await Promise.all([
      api.settingGet(CLE_CONSENTEMENT).catch(() => null),
      api.settingGet(CLE_MODE).catch(() => null),
      api.settingGet(CLE_RELECTURE).catch(() => null),
    ]);
    dejaExplique.current = accord === "1";
    setMode(lireMode(choisi, ancienne));
    setMoteur(await moteurActif().catch(() => "ligne" as Moteur));
  }, []);

  React.useEffect(() => { void relireLesReglages(); }, [relireLesReglages]);

  const choisirMode = (m: ModeIA) => {
    setMode(m);
    api.settingSet(CLE_MODE, m).catch(() => {});
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

  /**
   * Le réseau est tombé : on le dit une fois, et l'on cesse d'essayer.
   *
   * Le 24 septembre, une réunion a produit trente et un échecs en six
   * minutes : chaque passage repartait chez Mistral, attendait quarante-cinq
   * secondes, échouait, et affichait son propre message. Rien n'était
   * transcrit, et rien ne disait pourquoi.
   */
  const signalerLaPanne = React.useCallback(() => {
    if (horsLigneRef.current) return;
    horsLigneRef.current = true;
    setHorsLigne(true);
    journal("RÉUNION hors ligne : les agents en ligne sont mis en pause");
  }, []);

  // ── Résumer ce qui attend ───────────────────────────────────────────────

  /**
   * La relecture de fond, toutes les dix phrases.
   *
   * Elle suit un rangement, jamais l'inverse : relire un document auquel il
   * manque les deux dernières phrases n'aurait pas de sens.
   */
  const relireSiBesoin = React.useCallback(async () => {
    if (!relitEnLigne(modeRef.current) || horsLigneRef.current) return;
    const maintenant = secondesRef.current;
    if (!assezPourRelire(maintenant - secondesRelues.current)) return;
    secondesRelues.current = maintenant;
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
    // « Rien en ligne » vaut pour le rangement comme pour la relecture : c'est
    // lui qui partait chez Mistral toutes les deux phrases, case décochée ou
    // non. Et sans réseau, il n'y a rien à tenter — le texte, lui, continue
    // de s'écrire et sera rangé au retour.
    if (!rangeEnLigne(modeRef.current) || horsLigneRef.current) return;
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
      const message = texteErreur(e);
      majResume(id, { etat: "echec", erreur: message }, true);
      if (estUnePanneDeReseau(message)) signalerLaPanne();
    } finally {
      resumeEnCours.current = false;
    }
  }, [majResume, majReunion]);

  // Deux phrases de plus, et le rangement part — après un court repos, pour
  // ne pas couper un mot en train de s'écrire. Le même chemin sert à la
  // dictée et à la frappe.
  //
  // Le minuteur ne dépend **pas** du texte : sinon chaque arrivée le remet à
  // zéro, et si la parole arrive plus vite que le repos, il ne part jamais.
  // Le défaut s'était déjà produit ; il ne se reproduira pas.
  const assez = assezPourResumer(phrasesEnAttente(texte, resumes).phrases.length);
  // `mode` et `horsLigne` en font partie : reprendre « Ranger », ou retrouver
  // le réseau, doit rattraper ce qui attend — sans quoi il faut reparler pour
  // que le rangement reparte.
  React.useEffect(() => {
    if (!ouverte || !assez) return;
    const t = window.setTimeout(() => { void integrerSiBesoin(); }, REPOS_MS);
    return () => window.clearTimeout(t);
  }, [ouverte, assez, integrerSiBesoin, mode, horsLigne]);

  // ── L'écoute ────────────────────────────────────────────────────────────

  const surMorceau = React.useCallback(async (t: TrancheAudio) => {
    // Sans réseau, un envoi de plus, c'est quarante-cinq secondes d'attente
    // pour le même échec. On s'arrête jusqu'à ce que l'enseignant redemande.
    if (horsLigneRef.current && moteurRef.current === "ligne") return;
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
      const message = texteErreur(e);
      if (estUnePanneDeReseau(message) && moteurRef.current === "ligne") signalerLaPanne();
      else toast("Un passage n'a pas pu être transcrit : " + message, { icone: "⚠️", duree: 7000 });
    } finally { setTranscrit(false); }
  }, [poserTexte]);

  const ecoute = useEcoute({
    onTranche: (t) => { void surMorceau(t); },
    minimumParole: paroleMinimale(moteur),
    plafond: plafondDuMorceau(moteur),
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
    secondesRelues.current = r.dureeS;
    setConsentementVu(false);
    if (ancienne) {
      void enregistrer({ ...r, texte: relu.texte, resumesJson: ecrireResumes(relu.resumes), dateMaj: nowIso() });
    }
  };

  const creer = () => {
    if (ecoute.etat !== "repos") { toast("Terminez l'écoute en cours d'abord.", { icone: "🎧" }); return; }
    setFiche({ pour: null });
  };

  /** La fiche remplie : on crée la réunion, et l'écoute part d'elle-même. */
  const commencer = async (i: Infos) => {
    setFiche(null);
    await relireLesReglages();
    setHorsLigne(false); horsLigneRef.current = false;
    const r = { ...nouvelleReunion(), ...i };
    await enregistrer(r);
    setCourante(r);
    texteRef.current = ""; setTexte("");
    resumesRef.current = []; setResumes([]);
    setCompteRendu("");
    secondesRelues.current = 0;
    setConsentementVu(false);
    // Rien à cliquer : on pose l'ordinateur et ça écoute. L'écran d'accord
    // ne revient que tant qu'il n'a pas été accepté une première fois.
    if (dejaExplique.current) {
      const erreur = await ecoute.demarrer(0);
      if (erreur) toast(erreur, { icone: "🎙" });
      else setConsentementVu(true);
    }
  };

  /** Une fiche reprise après coup, sur la réunion ouverte ou sur une autre. */
  const reprendreLaFiche = async (r: Reunion, i: Infos) => {
    setFiche(null);
    if (courante?.id === r.id) majReunion(i, true);
    else await enregistrer({ ...r, ...i, dateMaj: nowIso() });
  };

  /** Premier accord : on le retient, et l'écoute part dans la foulée. */
  const accepterEtEcouter = async () => {
    dejaExplique.current = true;
    api.settingSet(CLE_CONSENTEMENT, "1").catch(() => {});
    await demarrer();
  };

  const demarrer = async () => {
    if (!courante) return;
    // Le moteur a pu changer dans les Réglages depuis l'ouverture de la page.
    await relireLesReglages();
    setHorsLigne(false); horsLigneRef.current = false;
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

  /**
   * L'état vrai d'une réunion : celle qui est ouverte vit à l'écran, les
   * autres telles qu'elles sont enregistrées. Le clic droit de la liste agit
   * sur n'importe laquelle.
   */
  const etatDe = (r: Reunion): Reunion => (courante?.id === r.id ? { ...r, compteRendu, texte } : r);

  const copier = async (r: Reunion) => {
    await navigator.clipboard.writeText(texteACopier(etatDe(r)));
    toast("Compte rendu copié.", { icone: "📋" });
  };

  const imprimer = (brut: Reunion) => {
    const r = etatDe(brut);
    const lignes = (t: string) => t.split("\n").map((l) => {
      const x = l.trim();
      if (!x) return "";
      if (x.startsWith("## ")) return `<h2>${escapeHtml(x.slice(3))}</h2>`;
      if (x.startsWith("- ")) return `<li>${escapeHtml(x.slice(2))}</li>`;
      return `<p>${escapeHtml(x)}</p>`;
    }).join("").replace(/(<li>.*?<\/li>)(?!<li>)/g, "<ul>$1</ul>").replace(/<\/ul><ul>/g, "");
    // Sans compte rendu — réunion trop courte —, on imprime ce qui a été dit.
    const corps = r.compteRendu.trim() ? lignes(r.compteRendu) : lignes(r.texte);
    printHTML(nomDeLaReunion(r),
      `<h1>${escapeHtml(nomDeLaReunion(r))}</h1>
       <div class="meta">${escapeHtml([r.genre, r.date,
         r.dureeS ? dureeLisible(r.dureeS) : ""].filter(Boolean).join(" · "))}</div>
       ${r.participants ? `<div class="meta">Participants : ${escapeHtml(r.participants)}</div>` : ""}
       ${corps}
       <div class="meta" style="margin-top:16px;font-style:italic">
         Compte rendu rédigé à partir de résumés automatiques, relu par l'enseignant.</div>`);
  };

  const effacerTexte = async (r: Reunion) => {
    if (!await confirmer("Effacer le texte mot à mot ? Le compte rendu est conservé.")) return;
    if (courante?.id === r.id) poserTexte("", true);
    else await enregistrer({ ...r, texte: "", dateMaj: nowIso() });
    toast("Mot à mot effacé.", { icone: "🧹" });
  };

  /** Tout ce qu'on peut faire d'une réunion, là où on la voit : dans la liste. */
  const menuDeLaReunion = (e: React.MouseEvent, r: Reunion) => openCtx(e, [
    { label: "Modifier les informations…", icon: "✏️", onClick: () => setFiche({ pour: r }) },
    { label: "Copier le compte rendu", icon: "📋", onClick: () => { void copier(r); } },
    { label: "Imprimer", icon: "🖨", onClick: () => imprimer(r) },
    { label: "Effacer le mot à mot", icon: "🧹", sep: true, onClick: () => { void effacerTexte(r); } },
    { label: "Supprimer la réunion", icon: "🗑", danger: true, sep: true, onClick: () => { void supprimer(r); } },
  ]);

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
  const vide = planVide(lirePlan(compteRendu));

  return (
    <Page titre="Réunions" sous="Le texte s'écrit tout seul, et se range au fil de la parole"
      actions={<button className="btn primary" onClick={creer}>＋ Nouvelle réunion</button>}>

      {fiche && (
        <FicheReunion
          titre={fiche.pour ? "Informations de la réunion" : "Nouvelle réunion"}
          bouton={fiche.pour ? "Enregistrer" : "Commencer"}
          infos={fiche.pour
            ? { titre: fiche.pour.titre, genre: fiche.pour.genre, date: fiche.pour.date, participants: fiche.pour.participants }
            : { titre: "", genre: GENRES[0], date: aujourdhui(), participants: "" }}
          onClose={() => setFiche(null)}
          onValider={(i) => { const pour = fiche.pour; void (pour ? reprendreLaFiche(pour, i) : commencer(i)); }}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(190px, 240px) minmax(320px, 1fr)", gap: 14, alignItems: "start" }}>
        {/* La liste : on revient souvent chercher ce qui s'est dit le mois dernier. */}
        <div className="card" style={{ padding: 8 }}>
          {liste === null ? (
            <p className="meta" style={{ margin: 8 }}>Chargement…</p>
          ) : liste.length === 0 ? (
            <p className="meta" style={{ margin: 8, fontSize: 12.5 }}>Aucune réunion enregistrée.</p>
          ) : liste.map((r) => (
            <button key={r.id} type="button" className="btn ghost" onClick={() => ouvrir(r)}
              onContextMenu={(e) => menuDeLaReunion(e, r)}
              title="Clic droit : informations, copier, imprimer, supprimer"
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
            sous="Créez une réunion, posez l'ordinateur sur la table, et laissez l'application écrire. Clic droit sur une réunion de la liste pour ses informations, la copier ou l'imprimer." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
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
                  <li>{rangeEnLigne(mode)
                    ? "Le compte rendu, lui, est rangé par l'IA en ligne : c'est du texte, et les prénoms y sont masqués. « Rien en ligne », dans la barre, l'en empêche."
                    : "Vous avez choisi « Rien en ligne » : le texte s'écrira tel quel, sans partir nulle part."}</li>
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
                    : occupe ? occupe
                    : horsLigne ? (moteur === "local" ? "hors ligne — le texte s'écrit seul" : "hors ligne — rien ne s'écrit")
                    : enCours ? (!rangeEnLigne(mode) ? "rien ne part en ligne"
                        : assez ? "rangement en cours…"
                        : relitEnLigne(mode)
                          ? `relecture dans ${mmss(Math.max(0, SECONDES_PAR_RELECTURE - (ecoute.secondes - secondesRelues.current)))}`
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
                {!vide && (
                  <button className="btn sm" disabled={!!occupe} onClick={auPropre}
                    title="Relire l'ensemble d'un coup : redites, ordre, tournures">✍️ Au propre</button>
                )}
                {/* Trois travaux, trois positions : la case unique promettait
                    que rien ne sortait, et le rangement partait quand même. */}
                <div className="seg" role="group" aria-label="Ce qui part en ligne">
                  {MODES.map((m) => (
                    <button key={m.id} className={mode === m.id ? "active" : ""} title={m.aide}
                      onClick={() => choisirMode(m.id)}>{m.label}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Le réseau est tombé : on le dit ici, une fois, plutôt qu'à
                chaque passage — et l'on dit quoi faire. */}
            {horsLigne && (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--text)",
                background: "var(--panel-2)", padding: "8px 10px", borderRadius: 8,
                border: "1px solid var(--border)" }}>
                📡 <b>Pas de réseau.</b>{" "}
                {moteur === "local"
                  ? "La parole continue de s'écrire — elle est transcrite ici. Le rangement reprendra au retour du réseau."
                  : "La transcription en ligne ne répond pas, et rien ne s'écrit. Pour que la réunion tienne sans réseau, il faut la transcription sur cet ordinateur (Réglages · IA)."}
                <button className="btn ghost sm" style={{ marginLeft: 8 }}
                  onClick={() => { setHorsLigne(false); horsLigneRef.current = false; }}>Réessayer</button>
                <button className="btn ghost sm" style={{ marginLeft: 6 }}
                  onClick={() => { void relireLesReglages(); toast("Réglages relus.", { icone: "↻" }); }}>
                  J'ai changé les réglages
                </button>
              </p>
            )}

            {/* Ce que le mode implique, dit là où on le choisit — et d'autant
                plus net quand la transcription, elle, reste ici. */}
            {rangeEnLigne(mode) && !aExpliquer && (
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)",
                background: "var(--panel-2)", padding: "8px 10px", borderRadius: 8 }}>
                ⚠️ <b>Le rangement passe par l'IA en ligne</b> : le compte rendu part chez Mistral
                {relitEnLigne(mode) ? ` — et toutes les ${SECONDES_PAR_RELECTURE / 60} minutes pour la relecture —` : ""}
                , prénoms d'élèves masqués.{moteur === "local"
                  ? " L'audio, lui, reste sur cet ordinateur. Choisissez « Rien en ligne » pour que rien ne sorte d'ici."
                  : ""}
              </p>
            )}

            {/* L'encadré, et rien d'autre. Le reste — l'objet, les
                participants, copier, imprimer, supprimer — se trouve au clic
                droit sur la réunion, dans la liste. */}
            <ZoneVivante cible={compteRendu} minHauteur="55vh" anime={enCours || transcrit || assez}
              onChange={(v) => { compteRenduRef.current = v; setCompteRendu(v); majReunion({ compteRendu: v }); }}
              placeholder="Ce qui se dit s'écrira ici, tout seul — et se rangera en points abordés, décisions et choses à faire. Vous pouvez écrire dedans à tout moment." />
          </div>
        )}
      </div>
    </Page>
  );
}
