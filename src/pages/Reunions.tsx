import React from "react";
import { Page } from "../App";
import { api, journal, newId, nowIso, texteErreur, type Reunion } from "../api";
import { Demander, Field, Input, Modal, Select } from "../components/ui";
import { toast, toastAnnulable } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { printHTML, escapeHtml } from "../print";
import { useEcoute, type TrancheAudio } from "../ecoute";
import { DIRECT_COUPE, ouvrirLeDirect, type Direct } from "../voxtralDirect";
import { DialogueReunion } from "../components/DialogueReunion";
import { ajouterUnTour, enAttenteDeVoix, nombreDeMots, nomParDefaut, nomPropre, renommer } from "../dialogueReunion";
import { ZoneVivante } from "../components/ZoneVivante";
import {
  choixIci, paroleMinimale, plafondDuMorceau, sortieDeLAudio, transcrire, type Choix, type Moteur,
} from "../transcription";
import {
  GENRES, ajouterLeDirectAuDocument, apresLaPasse,
  assezPourResumer, convertirAnciennes,
  dureeLisible, ecrireResumes, lirePlan, lireResumes, mettreAuPropre,
  assezPourRelire, nomDeLaReunion, phrasesEnAttente, planVide, rangerLeDocument,
  reformulerPassage, relireLeDocument, texteACopier, type Resume,
} from "../reunion";
import {
  CLE_MODE, CLE_RELECTURE, MODES, estUnePanneDeReseau, lireMode, rangeEnLigne, relitEnLigne,
  type ModeIA,
} from "../modeReunion";
import { isoJour } from "../dates";

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
const aujourdhui = () => isoJour(new Date());

/** L'accord donné une fois, gardé sur ce poste : l'écoute part seule ensuite. */
const CLE_CONSENTEMENT = "reunionsConsentement";
/** « direct » : les réunions se transcrivent chez Mistral, en direct, les voix reconnues — quoi que disent les Réglages. */
const CLE_TRANSCRIPTION = "reunionsTranscription";
type Transcription = "direct" | "";

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
function FicheReunion({ infos, titre, bouton, onValider, onClose, mode, setMode, moteur, transcription, setTranscription, reglagesLocal }: {
  infos: Infos; titre: string; bouton: string;
  onValider: (i: Infos) => void; onClose: () => void;
  /** Le choix se fait ici, avant de commencer — pas pendant la réunion. */
  mode: ModeIA; setMode: (m: ModeIA) => void; moteur: Moteur;
  /** « direct » : Mistral en direct, les voix reconnues, même si les Réglages transcrivent sur l'ordinateur. */
  transcription: Transcription; setTranscription: (t: Transcription) => void;
  /** Les Réglages transcrivent-ils sur cet ordinateur ? Sinon, la réunion est de toute façon en ligne. */
  reglagesLocal: boolean;
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
        <Field label="La transcription">
          {reglagesLocal ? (
            <div className="seg" role="group" aria-label="Où la parole est transcrite">
              <button type="button" className={transcription === "direct" ? "active" : ""} onClick={() => setTranscription("direct")}
                title={DIRECT_COUPE
                  ? "La voix part chez Mistral, dans l'Union européenne, et s'écrit par passages."
                  : "La voix part chez Mistral, en direct : chaque personne qui parle est reconnue, comme dans une conversation."}>
                {DIRECT_COUPE ? "☁️ Mistral, par passages" : "☁️ Mistral en direct — les voix reconnues"}</button>
              <button type="button" className={transcription === "direct" ? "" : "active"} onClick={() => setTranscription("")}
                title="Whisper, sur cet ordinateur : l'audio ne sort pas, mais les voix ne sont pas reconnues.">
                🔒 Sur cet ordinateur</button>
            </div>
          ) : <div className="meta">{DIRECT_COUPE ? "☁️ Mistral, par passages" : "☁️ Mistral en direct — les voix reconnues"} (Réglages · IA)</div>}
        </Field>
        <Field label="L'IA, après la réunion">
          <div className="seg" role="group" aria-label="Ce qui part en ligne">
            {MODES.map((m) => (
              <button key={m.id} type="button" className={mode === m.id ? "active" : ""}
                title={m.aide} onClick={() => setMode(m.id)}>{m.label}</button>
            ))}
          </div>
        </Field>
        <p style={{ margin: "2px 0 0", fontSize: 12.5, lineHeight: 1.5, color: "var(--text-2)" }}>
          {MODES.find((m) => m.id === mode)?.aide}
          {" "}{moteur !== "ligne" ? sortieDeLAudio(moteur) : DIRECT_COUPE
            ? "L'audio part chez Mistral AI, entreprise française, pour être transcrit par passages, dans l'Union européenne."
            : "L'audio part chez Mistral AI, entreprise française, pour être transcrit en direct."}
        </p>
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
  // Ce qui part en ligne : rien, le rangement, ou le rangement et la
  // relecture. Trois positions, parce qu'il y a trois travaux distincts.
  const [mode, setMode] = React.useState<ModeIA>("local");
  // Le moteur de transcription : en ligne, ou sur cette machine.
  const [moteur, setMoteur] = React.useState<Moteur>("local");
  // Le réseau est tombé : on cesse d'essayer, et on le dit une fois.
  const [horsLigne, setHorsLigne] = React.useState(false);
  // Le passage surligné, et la reformulation en cours. La transcription, elle,
  // continue d'écrire pendant ce temps : c'est pour cela qu'on retrouve le
  // passage par son contenu, et non par sa position, qui aura bougé.
  const [choix, setChoix] = React.useState<{ texte: string; debut: number; fin: number } | null>(null);
  const [reformule, setReformule] = React.useState(false);
  const encadre = React.useRef<HTMLTextAreaElement | null>(null);
  // Ce que montre la réunion : la conversation, le texte à corriger, ou le compte rendu de l'IA s'il y en a un.
  const [vue, setVue] = React.useState<"dialogue" | "corriger" | "compteRendu">("dialogue");
  // La personne qu'on renomme, et le nom de chaque voix reconnue dans l'écoute en cours.
  const [aRenommer, setARenommer] = React.useState<string | null>(null);
  const noms = React.useRef(new Map<string, string>());
  // Mistral en direct pour les réunions, même quand les Réglages transcrivent sur l'ordinateur.
  const [transcription, setTranscription] = React.useState<Transcription>("");
  const [reglagesLocal, setReglagesLocal] = React.useState(true);

  // Ce que les rappels du micro et des minuteurs doivent lire : ils vivent
  // plus longtemps qu'un rendu, et une valeur figée leur ferait résumer deux
  // fois le même passage.
  const contexte = React.useRef({ genre: "", titre: "", participants: "" });
  contexte.current = { genre: courante?.genre ?? "", titre: courante?.titre ?? "", participants: courante?.participants ?? "" };
  const texteRef = React.useRef("");
  texteRef.current = texte;
  const resumesRef = React.useRef<Resume[]>([]);
  resumesRef.current = resumes;
  // L'agent repart du compte rendu tel qu'il est — corrections de
  // l'enseignant comprises : c'est lui l'état, il n'y en a pas d'autre.
  const compteRenduRef = React.useRef("");
  compteRenduRef.current = compteRendu;
  // Lus depuis les rappels, qui vivent plus longtemps qu'un rendu.
  const modeRef = React.useRef<ModeIA>("local");
  modeRef.current = mode;
  const moteurRef = React.useRef<Moteur>("local");
  moteurRef.current = moteur;
  // Le modèle avec : relu au départ de chaque écoute, comme le moteur.
  const choixRef = React.useRef<Choix>({ moteur: "local", modele: "" });
  const horsLigneRef = React.useRef(false);
  horsLigneRef.current = horsLigne;
  const resumeEnCours = React.useRef(false);
  // Où en était la réunion, en secondes d'écoute, à la dernière relecture.
  // Perdu au redémarrage, et ce n'est pas grave : la relecture arrivera un
  // peu plus tard, c'est tout.
  const secondesRelues = React.useRef(0);
  const secondesRef = React.useRef(0);

  /**
   * Relit les réglages qui commandent la réunion.
   *
   * La page reste montée quand on va ailleurs : lus une seule fois, le moteur
   * et le mode restaient ceux du démarrage. Changer « En ligne » pour
   * « Whisper » dans les Réglages n'avait alors aucun effet avant de fermer
   * l'application — et la réunion suivante repartait chez Mistral.
   */
  const relireLeMoteur = React.useCallback(async () => {
    const [c, voulue] = await Promise.all([choixIci("reunions"), api.settingGet(CLE_TRANSCRIPTION).catch(() => null)]);
    setReglagesLocal(!("moteur" in c) || c.moteur === "local");
    setTranscription(voulue === "direct" ? "direct" : "");
    // Un modèle voulu mais absent : l'écoute reste ici, et chaque passage dit
    // pourquoi il ne s'écrit pas — rien ne part en ligne à sa place.
    const choix: Choix = voulue === "direct" ? { moteur: "ligne" } : "erreur" in c ? { moteur: "local", modele: "" } : c;
    choixRef.current = choix;
    setMoteur(choix.moteur);
  }, []);

  React.useEffect(() => {
    void (async () => {
      const [accord, choisi, ancienne] = await Promise.all([
        api.settingGet(CLE_CONSENTEMENT).catch(() => null),
        api.settingGet(CLE_MODE).catch(() => null),
        api.settingGet(CLE_RELECTURE).catch(() => null),
      ]);
      dejaExplique.current = accord === "1";
      // Le mode ne se relit qu'ici : ensuite, c'est la fiche qui commande.
      // Le relire au démarrage de la réunion écrasait le choix qui venait
      // d'être fait, l'enregistrement n'étant pas encore revenu.
      setMode(lireMode(choisi, ancienne));
      await relireLeMoteur();
    })();
  }, [relireLeMoteur]);

  const choisirMode = (m: ModeIA) => {
    setMode(m);
    api.settingSet(CLE_MODE, m).catch(() => {});
  };
  const choisirTranscription = (v: Transcription) => {
    setTranscription(v);
    void api.settingSet(CLE_TRANSCRIPTION, v).catch(() => {}).then(() => relireLeMoteur());
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
    try {
      const envoye = compteRenduRef.current;
      const rendu = await relireLeDocument(envoye, contexte.current);
      // Ce qui s'est écrit pendant la relecture suit ; une retouche ailleurs l'emporte.
      const suite = apresLaPasse(envoye, compteRenduRef.current, rendu);
      if (suite === null) return;
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majReunion({ compteRendu: suite }, true);
    } catch (e) {
      // Une relecture ratée ne casse rien : le document d'avant reste, et la
      // suivante retentera dans dix phrases.
      journal(`ÉCHEC relecture réunion : ${texteErreur(e)}`);
    } finally { /* la relecture ne s'annonce plus : elle se fait en fond */ }
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
      const envoye = compteRenduRef.current;
      const rendu = await rangerLeDocument(envoye, contexte.current);
      // La parole a continué de s'écrire pendant le rangement : elle suit la
      // version rangée. Retouché ailleurs entre-temps, le compte rendu reste
      // tel que l'enseignant l'a laissé, et ce passage se refera au suivant.
      const suite = apresLaPasse(envoye, compteRenduRef.current, rendu);
      if (suite === null) {
        resumesRef.current = resumesRef.current.filter((r) => r.id !== id);
        setResumes(resumesRef.current);
        return;
      }
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

  // Rien ne se range pendant la réunion : « ne reformule rien, juste tu
  // transcris » (2026-11-02). Le compte rendu de l'IA ne se fait plus qu'à la
  // demande, après (voir `rediger`), à côté de la conversation qui reste telle
  // qu'elle a été dite.

  /** Le compte rendu de l'IA, à la demande : il range la conversation sans y toucher. */
  const rediger = async () => {
    if (!compteRenduRef.current.trim()) {
      compteRenduRef.current = texteRef.current;
      setCompteRendu(texteRef.current);
    }
    setVue("compteRendu");
    await integrerSiBesoin(true);
  };

  // ── L'écoute ────────────────────────────────────────────────────────────

  // ── Le direct de Voxtral ────────────────────────────────────────────────
  //
  // « Branche sur réunion Mistral Realtime pour écrire » (2026-11-02) : en
  // ligne, la parole part au fil de l'eau (voir voxtralDirect.ts) et les mots
  // s'écrivent pendant qu'on parle. Le silence qui fermait un passage ouvre
  // maintenant un paragraphe. Si le direct lâche, les passages reprennent.
  //
  // Puis : « je veux les deux en même temps : ça écrit, puis quand ça
  // identifie la personne ça met la bulle » (2026-11-02). Deux écoutes chez
  // Mistral, sur la même voix : l'une, sans les voix, écrit les mots à
  // l'instant, en attente sous la conversation ; l'autre reconnaît les voix
  // et pose chaque phrase dans la bulle de sa personne, à la place des mots
  // en attente. C'est elle seule qui s'enregistre. Le direct coûte deux fois
  // plus. Si la reconnaissance lâche, les mots à l'instant s'écrivent eux-mêmes,
  // sans les noms ; si les deux lâchent, les passages reprennent.

  /** L'écoute qui reconnaît les voix : ce qui s'enregistre. */
  const direct = React.useRef<Direct | null>(null);
  /** L'écoute instantanée, sans les voix : ce qu'on voit d'abord. */
  const instant = React.useRef<Direct | null>(null);
  // Les mots entendus à l'instant depuis le début de l'écoute, et combien ont déjà trouvé leur bulle.
  const instantane = React.useRef("");
  const motsPoses = React.useRef(0);
  const [enAttente, setEnAttente] = React.useState("");
  const majEnAttente = React.useCallback(() => setEnAttente(enAttenteDeVoix(instantane.current, motsPoses.current)), []);
  const oublierLAttente = React.useCallback(() => { instantane.current = ""; motsPoses.current = 0; setEnAttente(""); }, []);
  // Si Mistral rend des mots sans les voix sur l'écoute qui devait les reconnaître, elle écrit déjà à l'instant :
  // l'autre se tait, sinon chaque mot paraîtrait deux fois.
  const voixSansNoms = React.useRef(false);
  const apresUnSilence = React.useRef(true);
  // Au fil de la parole, la sauvegarde attend une pause de la frappe : une longue tirade est quand même gardée,
  // toutes les cinq secondes.
  const sauveLeDirect = React.useRef(0);

  /** La conversation telle qu'elle s'écrit : rien d'autre ne change (« ne reformule rien », 2026-11-02). */
  const ecrireLaConversation = React.useCallback((suite: string) => {
    texteRef.current = suite;
    setTexte(suite);
    const toutDeSuite = Date.now() - sauveLeDirect.current > 5000;
    if (toutDeSuite) sauveLeDirect.current = Date.now();
    majReunion({ texte: suite }, toutDeSuite);
  }, [majReunion]);

  /** Des mots sans voix reconnue : au fil de la parole, un nouveau paragraphe après un silence. */
  const ecrireLeDirect = React.useCallback((morceau: string) => {
    const nouveau = apresUnSilence.current;
    if (morceau.trim()) apresUnSilence.current = false;
    ecrireLaConversation(ajouterLeDirectAuDocument(texteRef.current, morceau, nouveau));
  }, [ecrireLaConversation]);

  /** Un tour de parole, sous le nom de sa voix — « Personne 2 », ou le nom que l'enseignant lui a donné. */
  const ecrireUnTour = React.useCallback((morceau: string, intervenant: string | null) => {
    const nom = (intervenant && noms.current.get(intervenant)) || nomParDefaut(intervenant);
    if (intervenant && !noms.current.has(intervenant)) noms.current.set(intervenant, nom);
    ecrireLaConversation(ajouterUnTour(texteRef.current, nom, morceau));
    // Ces mots ont trouvé leur bulle : ils quittent l'attente.
    motsPoses.current += nombreDeMots(morceau);
    majEnAttente();
  }, [ecrireLaConversation, majEnAttente]);

  /** Les mots à l'instant : en attente de leur bulle tant que les voix suivent ; écrits eux-mêmes si elles ont lâché. */
  const ecrireAInstant = React.useCallback((morceau: string) => {
    if (!instant.current || voixSansNoms.current) return;
    if (!direct.current) { ecrireLeDirect(morceau); return; }
    instantane.current += morceau;
    majEnAttente();
  }, [ecrireLeDirect, majEnAttente]);

  /** En ligne, les deux écoutes s'ouvrent avec le micro ; sur cet ordinateur (Whisper), rien ne change. */
  const ouvrirDirect = React.useCallback(() => {
    direct.current = null;
    instant.current = null;
    oublierLAttente();
    voixSansNoms.current = false;
    if (choixRef.current.moteur !== "ligne" || DIRECT_COUPE) return;
    apresUnSilence.current = true;
    // Les voix d'une liaison ne valent que pour elle : chaque écoute repart des siennes.
    noms.current = new Map([...noms.current].filter(([, nom]) => !/^Personne \d+$/.test(nom)));
    const voix = ouvrirLeDirect({
      jeton: () => api.mistralJetonTempsReel(),
      surTexte: (morceau) => {
        if (!voixSansNoms.current) { voixSansNoms.current = true; oublierLAttente(); }
        ecrireLeDirect(morceau);
      },
      diarize: true,
      surTour: ecrireUnTour,
      surPanne: (raison) => {
        if (direct.current !== voix) return;
        direct.current = null;
        journal(`RÉUNION reconnaissance des voix interrompue : ${raison}`);
        // Les mots en attente ne trouveront plus de bulle : ils s'écrivent tels quels, et la suite avec eux.
        const reste = enAttenteDeVoix(instantane.current, motsPoses.current);
        oublierLAttente();
        if (instant.current) {
          if (reste) { apresUnSilence.current = true; ecrireLeDirect(reste); }
          toast("La reconnaissance des voix s'est interrompue : la réunion continue de s'écrire, sans les noms.", { icone: "📡", duree: 7000 });
        } else {
          toast("Le direct de Mistral s'est interrompu : la réunion continue de s'écrire par passages.", { icone: "📡", duree: 7000 });
        }
      },
    });
    direct.current = voix;
    const mots = ouvrirLeDirect({
      jeton: () => api.mistralJetonTempsReel(),
      surTexte: ecrireAInstant,
      surPanne: (raison) => {
        if (instant.current !== mots) return;
        instant.current = null;
        oublierLAttente();
        journal(`RÉUNION écoute instantanée interrompue : ${raison}`);
        if (!direct.current) toast("Le direct de Mistral s'est interrompu : la réunion continue de s'écrire par passages.", { icone: "📡", duree: 7000 });
      },
    });
    instant.current = mots;
  }, [ecrireLeDirect, ecrireUnTour, ecrireAInstant, oublierLAttente]);

  /** La fin : l'écoute instantanée se tait, les dernières bulles arrivent, puis tout se ferme. */
  const fermerDirect = React.useCallback(async () => {
    const voix = direct.current, mots = instant.current;
    instant.current = null;
    void mots?.fermer();
    await voix?.fermer();
    direct.current = null;
    oublierLAttente();
  }, [oublierLAttente]);
  React.useEffect(() => () => { void direct.current?.fermer(); void instant.current?.fermer(); }, []);

  const surMorceau = React.useCallback(async (t: TrancheAudio) => {
    // En direct, la parole est déjà écrite : le passage ne dit plus qu'un silence, et le mot suivant ouvre un
    // paragraphe.
    if (direct.current || instant.current) { apresUnSilence.current = true; return; }
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
      const morceau = await transcrire(b64, choixRef.current);
      // Un passage, un paragraphe de la conversation, sans nom : ces moteurs ne reconnaissent pas les voix.
      poserTexte(ajouterUnTour(texteRef.current, "", morceau), true);
    } catch (e) {
      const message = texteErreur(e);
      if (estUnePanneDeReseau(message) && moteurRef.current === "ligne") signalerLaPanne();
      else toast("Un passage n'a pas pu être transcrit : " + message, { icone: "⚠️", duree: 7000 });
    } finally { setTranscrit(false); }
  }, [poserTexte]);

  const ecoute = useEcoute({
    onTranche: (t) => { void surMorceau(t); },
    onTrame: (trame, taux) => { direct.current?.envoyer(trame, taux); instant.current?.envoyer(trame, taux); },
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
    setVue("dialogue");
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
    await relireLeMoteur();
    setHorsLigne(false); horsLigneRef.current = false;
    const r = { ...nouvelleReunion(), ...i };
    await enregistrer(r);
    setCourante(r);
    setVue("dialogue");
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
      else { setConsentementVu(true); ouvrirDirect(); }
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
    await relireLeMoteur();
    setHorsLigne(false); horsLigneRef.current = false;
    const erreur = await ecoute.demarrer(courante.dureeS);
    if (erreur) { toast(erreur, { icone: "🎙" }); return; }
    setConsentementVu(true);
    ouvrirDirect();
  };

  const terminer = () => {
    ecoute.arreter();
    majReunion({ dureeS: ecoute.secondes }, true);
    // En direct, les derniers mots arrivent encore ; rien ne se range ensuite.
    void fermerDirect();
  };

  // ── Le compte rendu ─────────────────────────────────────────────────────

  const auPropre = async () => {
    if (!courante) return;
    setOccupe("Mise au propre…");
    try {
      const envoye = compteRenduRef.current;
      const rendu = await mettreAuPropre(courante, envoye);
      const t = apresLaPasse(envoye, compteRenduRef.current, rendu);
      if (t === null) {
        toast("Le compte rendu a été retouché pendant la mise au propre : rien n'est remplacé. Relancez-la quand vous aurez fini.",
          { icone: "✍️", duree: 8000 });
        return;
      }
      compteRenduRef.current = t;
      setCompteRendu(t);
      majReunion({ compteRendu: t }, true);
    } catch (e) {
      toast("Mise au propre impossible : " + texteErreur(e), { icone: "⚠️", duree: 8000 });
    } finally { setOccupe(""); }
  };

  /**
   * Reformule le passage surligné, et le remet à sa place.
   *
   * La parole continue de s'écrire pendant l'aller-retour : le passage se
   * retrouve donc par son contenu, et non par sa position — laquelle aura
   * bougé de quelques centaines de caractères quand la réponse arrivera. S'il
   * n'est plus là, c'est que l'enseignant l'a modifié entre-temps : on ne
   * touche à rien plutôt que de réécrire au mauvais endroit.
   */
  const reformuler = async () => {
    const passage = choix?.texte;
    if (!passage || reformule) return;
    // Le rangement réécrit le document entier : le laisser partir pendant une
    // reformulation reviendrait à effacer celle-ci au retour. Un seul des deux
    // à la fois — c'est le même verrou.
    if (resumeEnCours.current) { toast("Un instant : le compte rendu est en train d'être rangé.", { icone: "⏳" }); return; }
    resumeEnCours.current = true;
    setReformule(true);
    try {
      const mieux = await reformulerPassage(passage);
      const actuel = compteRenduRef.current;
      const ou = actuel.indexOf(passage);
      if (ou < 0) { toast("Ce passage a changé depuis : rien n'a été remplacé.", { icone: "↩️" }); return; }
      const suite = actuel.slice(0, ou) + mieux + actuel.slice(ou + passage.length);
      compteRenduRef.current = suite;
      setCompteRendu(suite);
      majReunion({ compteRendu: suite }, true);
      setChoix(null);
    } catch (e) {
      const message = texteErreur(e);
      if (estUnePanneDeReseau(message)) signalerLaPanne();
      else toast("Reformulation impossible : " + message, { icone: "⚠️", duree: 7000 });
    } finally { resumeEnCours.current = false; setReformule(false); }
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
    const ici = courante?.id === r.id, avant = ici ? texte : r.texte;
    if (ici) poserTexte("", true);
    else await enregistrer({ ...r, texte: "", dateMaj: nowIso() });
    toastAnnulable("Mot à mot effacé.", async () => {
      if (courante?.id === r.id) poserTexte(avant, true);
      else await enregistrer({ ...r, texte: avant, dateMaj: nowIso() });
    }, "🧹");
  };

  /** Tout ce qu'on peut faire d'une réunion, là où on la voit : dans la liste. */
  const menuDeLaReunion = (e: React.MouseEvent, r: Reunion) => openCtx(e, [
    ...(courante?.id === r.id && !planVide(lirePlan(compteRendu))
      ? [{ label: "Mettre au propre", icon: "✍️", onClick: () => { void auPropre(); } }]
      : []),
    { label: "Modifier les informations…", icon: "✏️", onClick: () => setFiche({ pour: r }) },
    { label: "Copier le compte rendu", icon: "📋", onClick: () => { void copier(r); } },
    { label: "Imprimer", icon: "🖨", onClick: () => imprimer(r) },
    { label: "Effacer le mot à mot", icon: "🧹", sep: true, onClick: () => { void effacerTexte(r); } },
    { label: "Supprimer la réunion", icon: "🗑", danger: true, sep: true, onClick: () => { void supprimer(r); } },
  ]);

  const supprimer = async (r: Reunion) => {
    if (!await confirmer(`Supprimer « ${nomDeLaReunion(r)} » et son compte rendu ?`)) return;
    await api.reunionDelete(r.id);
    let place = -1;
    setListe((l) => { place = (l ?? []).findIndex((x) => x.id === r.id); return (l ?? []).filter((x) => x.id !== r.id); });
    if (courante?.id === r.id) { setCourante(null); setTexte(""); setResumes([]); setCompteRendu(""); }
    toastAnnulable(`« ${nomDeLaReunion(r)} » supprimée.`, async () => {
      await api.reunionSave(r);
      // À sa place dans la liste.
      setListe((l) => { const suite = (l ?? []).filter((x) => x.id !== r.id); suite.splice(place < 0 ? suite.length : Math.min(place, suite.length), 0, r); return suite; });
    });
  };

  const enCours = ecoute.etat !== "repos";
  const aDuTexte = !!texte.trim() || !!compteRendu.trim();
  // L'écran d'accord ne s'affiche que tant qu'il n'a pas été accepté, et
  // seulement sur une réunion qui n'a pas encore commencé.
  const aExpliquer = !enCours && !aDuTexte && !consentementVu && !dejaExplique.current;

  return (
    <Page titre="Réunions" sous="Le texte s'écrit tout seul, au fil de la parole"
      actions={<button className="btn primary" onClick={creer}>＋ Nouvelle réunion</button>}>

      {fiche && (
        <FicheReunion
          titre={fiche.pour ? "Informations de la réunion" : "Nouvelle réunion"}
          bouton={fiche.pour ? "Enregistrer" : "Commencer"}
          infos={fiche.pour
            ? { titre: fiche.pour.titre, genre: fiche.pour.genre, date: fiche.pour.date, participants: fiche.pour.participants }
            : { titre: "", genre: GENRES[0], date: aujourdhui(), participants: "" }}
          onClose={() => setFiche(null)}
          mode={mode} setMode={choisirMode} moteur={moteur}
          transcription={transcription} setTranscription={choisirTranscription} reglagesLocal={reglagesLocal}
          onValider={(i) => { const pour = fiche.pour; void (pour ? reprendreLaFiche(pour, i) : commencer(i)); }}
        />
      )}

      {/* Une seule fenêtre, au milieu. Tant qu'aucune réunion n'est ouverte,
          elle porte la liste ; dès qu'on commence, elle ne porte plus que le
          texte — on écoute, on ne règle pas. */}
      <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
        {!courante ? (
          <div className="card" style={{ padding: 8 }}>
            {liste === null ? (
              <p className="meta" style={{ margin: 8 }}>Chargement…</p>
            ) : liste.length === 0 ? (
              <p className="meta" style={{ margin: 10, fontSize: 13, lineHeight: 1.6 }}>
                Aucune réunion pour l'instant. « ＋ Nouvelle réunion », posez l'ordinateur sur la
                table, et le texte s'écrit tout seul.
              </p>
            ) : liste.map((r) => (
              <button key={r.id} type="button" className="btn ghost" onClick={() => ouvrir(r)}
                onContextMenu={(e) => menuDeLaReunion(e, r)}
                title="Clic droit : informations, copier, imprimer, supprimer"
                style={{
                  width: "100%", justifyContent: "flex-start", textAlign: "left", marginBottom: 4,
                  height: "auto", padding: "10px 12px",
                }}>
                <span style={{ display: "block", minWidth: 0 }}>
                  <b style={{ display: "block", fontSize: 13.5 }}>{nomDeLaReunion(r)}</b>
                  <span className="meta" style={{ fontSize: 11.5 }}>
                    {[r.genre, r.date, r.dureeS ? dureeLisible(r.dureeS) : ""].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : aExpliquer ? (
          /* L'accord des participants se demande une fois — ensuite l'écoute
             part d'elle-même à chaque réunion. */
          <div className="card">
            <b style={{ fontSize: 14 }}>Avant de commencer</b>
            <ul style={{ fontSize: 13, lineHeight: 1.6, margin: "8px 0 0", paddingLeft: 18 }}>
              <li><b>Prévenez les participants</b> que vous enregistrez pour prendre des notes,
                  et recueillez leur accord — en ESS ou devant une famille, cela se demande avant.</li>
              <li>{sortieDeLAudio(moteur)}</li>
              <li>{rangeEnLigne(mode)
                ? "Le compte rendu est rangé par l'IA en ligne : c'est du texte, et les prénoms d'élèves connus sont masqués avant l'envoi."
                : "Vous avez choisi que rien ne sorte d'ici : le texte s'écrira tel quel, sans partir nulle part."}</li>
              <li>Une fois cet écran accepté, l'écoute démarrera d'elle-même à chaque nouvelle
                  réunion. Il ne restera que Pause et Terminer.</li>
            </ul>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button className="btn primary" onClick={accepterEtEcouter}>🎧 J'ai compris, écouter</button>
              <button className="btn" onClick={() => setConsentementVu(true)}>⌨️ Écrire moi-même</button>
            </div>
          </div>
        ) : (
          <>
            {/* Une barre, trois choses : où l'on en est, et les deux boutons
                qui restent une fois l'écoute lancée. */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 18 }}>{enCours ? (ecoute.etat === "pause" ? "⏸" : "🔴") : "⏹"}</span>
              <b style={{ fontSize: 16, fontVariantNumeric: "tabular-nums", minWidth: 56 }}>
                {mmss(enCours ? ecoute.secondes : courante.dureeS)}
              </b>
              <span className="meta" style={{ fontSize: 12 }}>
                {ecoute.etat === "pause" ? "en pause"
                  : occupe ? occupe
                  : horsLigne ? (moteur === "local" ? "hors ligne — le texte s'écrit seul" : "hors ligne — rien ne s'écrit")
                  : enCours ? (direct.current || instant.current ? "à l'écoute — s'écrit en direct" : "à l'écoute")
                  : "écoute arrêtée"}
              </span>
              <div className="spacer" style={{ flex: 1 }} />
              {enCours ? (
                <>
                  {ecoute.etat === "ecoute"
                    ? <button className="btn" onClick={() => { apresUnSilence.current = true; ecoute.pause(); }}>⏸ Pause</button>
                    : <button className="btn primary" onClick={ecoute.reprendre}>▶️ Reprendre</button>}
                  <button className="btn" onClick={terminer}>⏹ Terminer</button>
                </>
              ) : (
                <>
                  {/* Il n'était que dans le menu de la liste, qu'on ne voit pas réunion ouverte. */}
                  {rangeEnLigne(mode) && !planVide(lirePlan(compteRendu)) && (
                    <button className="btn" disabled={!!occupe} onClick={() => { void auPropre(); }}
                      title="Rédiger le compte rendu au propre (l'IA, noms masqués)">✍️ Mettre au propre</button>
                  )}
                  {rangeEnLigne(mode) && texte.trim() && planVide(lirePlan(compteRendu)) && (
                    <button className="btn" disabled={!!occupe} onClick={() => { void rediger(); }}
                      title="L'IA range la conversation en compte rendu, à côté d'elle : la conversation ne change pas (noms masqués)">🗂 Compte rendu par l'IA</button>
                  )}
                  <button className="btn primary" onClick={demarrer}>🎧 Écouter</button>
                  <button className="btn ghost" onClick={() => setCourante(null)}>← Mes réunions</button>
                </>
              )}
            </div>

            {horsLigne && (
              <p style={{ margin: "0 0 10px", fontSize: 12.5, lineHeight: 1.5, color: "var(--text)",
                background: "var(--panel-2)", padding: "8px 10px", borderRadius: 8,
                border: "1px solid var(--border)" }}>
                📡 <b>Pas de réseau.</b>{" "}
                {moteur === "local"
                  ? "La parole continue de s'écrire — elle est transcrite ici."
                  : "La transcription en ligne ne répond pas. Pour que la réunion tienne sans réseau, il faut la transcription sur cet ordinateur (Réglages · IA)."}
                <button className="btn ghost sm" style={{ marginLeft: 8 }}
                  onClick={() => { setHorsLigne(false); horsLigneRef.current = false; }}>Réessayer</button>
              </p>
            )}

            {/* La conversation, telle qu'elle a été dite ; le texte, à corriger ; et le compte rendu de l'IA, s'il y en a un. */}
            {(aDuTexte || compteRendu.trim()) && (
              <div className="seg" role="tablist" aria-label="Ce qu'on regarde" style={{ marginBottom: 10 }}>
                <button type="button" className={vue === "dialogue" ? "active" : ""} onClick={() => setVue("dialogue")}>💬 La conversation</button>
                <button type="button" className={vue === "corriger" ? "active" : ""} onClick={() => setVue("corriger")}>✏️ Corriger</button>
                {compteRendu.trim() && (
                  <button type="button" className={vue === "compteRendu" ? "active" : ""} onClick={() => setVue("compteRendu")}>📄 Compte rendu</button>
                )}
              </div>
            )}
            {vue === "dialogue" && <DialogueReunion dialogue={texte} enCours={enCours} onRenommer={setARenommer} enAttente={enAttente} />}
            {vue === "corriger" && (
              <ZoneVivante cible={texte} minHauteur="62vh" anime={false}
                onChange={(v) => poserTexte(v)}
                placeholder="La conversation, un paragraphe par tour de parole : « Nom : ce qui est dit »." />
            )}
            {aRenommer !== null && (
              <Demander titre={`Renommer « ${aRenommer} »`} label="Son nom, pour toute la conversation" valeur={aRenommer}
                onClose={() => setARenommer(null)}
                onValider={(v) => {
                  const ancien = aRenommer;
                  setARenommer(null);
                  const nouveau = nomPropre(v);
                  if (!nouveau || nouveau === ancien) return;
                  for (const [voix, nom] of noms.current) if (nom === ancien) noms.current.set(voix, nouveau);
                  poserTexte(renommer(texteRef.current, ancien, nouveau), true);
                }} />
            )}
            {/* Le compte rendu de l'IA. Surligner un passage fait apparaître
                « Reformuler » — à la main seulement. */}
            {vue === "compteRendu" && <div style={{ position: "relative" }}>
              <ZoneVivante cible={compteRendu} minHauteur="62vh" anime={enCours || transcrit}
                zoneRef={encadre} onSelection={rangeEnLigne(mode) ? setChoix : undefined}
                onChange={(v) => { compteRenduRef.current = v; setCompteRendu(v); majReunion({ compteRendu: v }); }}
                placeholder={rangeEnLigne(mode)
                  ? "Ce qui se dit s'écrira ici, tout seul. Surlignez un passage pour le faire reformuler."
                  : "Ce qui se dit s'écrira ici, tout seul. Rien ne part en ligne : à vous de corriger, l'encadré s'écrit et se modifie."} />
              {/* Pas de reformulation quand rien ne doit sortir : ce serait
                  la seule chose à partir, et la promesse tomberait. */}
              {choix && rangeEnLigne(mode) && (
                <button className="btn primary sm"
                  style={{ position: "absolute", right: 14, bottom: 14, boxShadow: "var(--shadow)" }}
                  disabled={!!reformule} onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { void reformuler(); }}>
                  {reformule ? "Reformulation…" : "✨ Reformuler"}
                </button>
              )}
            </div>}
          </>
        )}
      </div>

    </Page>
  );
}
