import React from "react";
import { useNavigate } from "react-router-dom";
import { AGENTS_COUPES, api, texteErreur, type DocumentCoffre, ChatMessage, Sequence, Seance, PiloteConversation, CYCLES, MATIERES, MODELES_MISTRAL, MODELE_DEFAUT, nouvelleSequence, nouvelleSeance, couleurPourMatiere, newId, nowIso } from "../api";
import { Modal, Field, Input, Select, Demander, useAsync } from "../components/ui";
import { construireContexteIA } from "../contexteIA";
import { masquerSurLesEleves, nomsAMasquer, pourLaVoix } from "../nomsAMasquer";
import { pseudonymiser, pseudonymiserTout, restaurer } from "../confidentialite";
import { relireAvantEnvoi } from "../relectureEnvoi";
import { DEBUT_OBJECTIF_SEANCE } from "../demarches";
import { openCtx } from "../components/ctxmenu";
import { Markdown } from "../components/Markdown";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useDictee, mmss } from "../dictee";
import { aLaSuite, useDicteeEnDirect } from "../dicteeEnDirect";
import { CONSIGNE_ORALE, lecteurAuFil, questionFinie, type LecteurAuFil } from "../conversationVocale";
import { FENETRE_ECHO_S, detecteurDePriseDeParole, enveloppeDuMp3, niveauJoue, type DetecteurDePriseDeParole } from "../priseDeParole";
import { toast, toastAnnulable } from "../components/Toaster";
import { STYLE_DOCUMENT_IA, feuilleDeLaReponse } from "../documentIa";
import {
  MODELE_GRAND, SUGGESTIONS_DU_DOCUMENT, bilanDesCitations, consigneDuDocument, demandeDuDocument, neLeDitPas, passagesDuDocument, passagesPourLaQuestion,
  verifierLesCitations,
} from "../questionsAuDocument";
import { toutesLesPagesDuPdf } from "../textesDesPdf";
import type { PageLue } from "../quizDesGuides";
import { ChoixDuDocument } from "../components/ChoixDuDocument";
import { enregistrerEnPdf, enregistrerEnWord } from "../exportsDocument";
import { MiseEnPageReponse } from "../components/MiseEnPageReponse";
import { documentImprimable, printHTML } from "../print";
import { nomDeLAtelier } from "../catalogueAteliers";
import { BoutonBureau } from "../components/BoutonBureau";
import { deposerSurLeBureau } from "../impressionAtelier";
import { TrouverUnPicto } from "../components/TrouverUnPicto";
import { TrouverUnLivre } from "../components/LivresDeReference";
import { EVT_QUESTION_ASSISTANT, prendreQuestion } from "../questionAssistant";
import { imagePourLAssistant } from "../components/MesImages";
import { estImage, useFileDropZone } from "../dragdrop";
import { IMAGES_PAR_DEMANDE, TITRE_D_UNE_IMAGE, imagesDeLaDemande } from "../imagesDeLAssistant";
import { lireNiveaux } from "../classe";
import { consigneDeLAssistant, extraitsPourLAssistant, programmesPourLaDemande } from "../consigneAssistant";
import { blocDeMemoire, chargerMemoire, defaireChangements, direLesChangements, memoireCoupee, retenirDuMessage, souvenirsPourLaQuestion } from "../memoireAssistant";
import { MemoireAssistant } from "../components/MemoireAssistant";
import {
  DEMANDE_DE_REDACTION, FICHE_PRETE, RECAP_A_VOIX_HAUTE, TOURS_DE_QUESTIONS_MAX, ateliersDeLaFiche, consigneDeLEntretien, consigneDeLaFiche, conversationDuCadre, demandeDeRetouche, ficheAuFormat, ficheEnMarkdown,
  feuillesDeLaFiche, lignesDuConnu, lireLEntretien, nonPrecise, parleAMistral, questionDeConfirmation, recapitulatif, redigerLaFiche, resumeDuConnu, seancesDeLaFiche, sequenceDeLaFiche, suiteDeLEntretien, tourDuCadre,
  type ConnuDuCadre, type SorteDePreparation, type TourDuCadre,
} from "../cadreDeSeance";
import { graineAuHasard } from "../hasard";
import { ouvrirOnglet } from "../ongletDemande";
import type { ReferenceDeFeuille } from "../supportsDeLAssistant";
import { CLE_INVENTAIRE, MATERIEL_REEL, lireInventaire } from "../materielDeClasse";
import { periodeDuMoment } from "../creationsALaVoix";

// Extrait un objet JSON d'une réponse IA (tolère du texte autour).
function extraireJson(rep: string): any {
  const s = rep.slice(rep.indexOf("{"), rep.lastIndexOf("}") + 1);
  return JSON.parse(s);
}

const SUGGESTIONS = [
  "Propose-moi une séquence de 5 séances sur les fractions en CM1.",
  "Donne 3 ateliers autonomes de lecture pour des CP.",
  "Reformule cet objectif pour qu'il soit observable et évaluable.",
  "Idées de différenciation pour un élève en difficulté en numération.",
];

export default function Assistant() {
  const nav = useNavigate();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  // Les images collées (⌘V) dans la zone de saisie : elles partent avec le prochain message.
  const [images, setImages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [showGen, setShowGen] = React.useState(false);
  const [showModif, setShowModif] = React.useState(false);
  const [showPictos, setShowPictos] = React.useState(false);
  const [showMemoire, setShowMemoire] = React.useState(false);
  const [showLivres, setShowLivres] = React.useState(false);
  const [contexteActif, setContexteActif] = React.useState(true);
  const [surLeWeb, setSurLeWeb] = React.useState(false);
  // Le document du coffre-fort auquel l'Assistant répond (« 🗄️ Coffre-fort ») ; rien : il répond comme d'habitude.
  const [documentChoisi, setDocumentChoisi] = React.useState<DocumentCoffre | null>(null);
  const [choixDuDocument, setChoixDuDocument] = React.useState(false);
  // La réponse où le document n'a rien dit : l'Assistant y propose de chercher sur internet, et attend un clic.
  const [rechercheProposee, setRechercheProposee] = React.useState<{ indice: number; question: string; titre: string } | null>(null);
  const saisie = React.useRef<HTMLTextAreaElement>(null);
  const [model, setModel] = React.useState(MODELE_DEFAUT);
  const [convId, setConvId] = React.useState("");
  const { data: convs, reload: reloadConvs } = useAsync(() => api.conversationsList(), []);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const nouvelleConversation = () => { setMessages([]); setConvId(""); setRechercheProposee(null); };
  const chargerConv = (c: PiloteConversation) => {
    setRechercheProposee(null);
    try { setMessages(JSON.parse(c.messagesJson)); } catch { setMessages([]); }
    setConvId(c.id);
  };
  const supprimerConv = async (c: PiloteConversation) => {
    await api.conversationDelete(c.id);
    if (c.id === convId) nouvelleConversation();
    reloadConvs();
    toastAnnulable(`« ${c.titre || "La conversation"} » supprimée.`, async () => { await api.conversationSave(c); reloadConvs(); });
  };
  // `window.prompt` n'existe pas dans la fenêtre de l'application : renommer
  // une conversation ne faisait rien du tout, sans le dire.
  const [aRenommer, setARenommer] = React.useState<PiloteConversation | null>(null);
  const renommerConv = (c: PiloteConversation) => setARenommer(c);
  const appliquerRenommage = async (c: PiloteConversation, titre: string) => {
    await api.conversationSave({ ...c, titre: titre.trim() || c.titre, dateMaj: nowIso() });
    reloadConvs();
  };

  React.useEffect(() => {
    api.settingGet("mistralApiKey").then((k) => setHasKey(!!k && k.trim().length > 0));
    api.settingGet("iaContexte").then((v) => setContexteActif(v !== "0"));
    api.modeleActif().then(setModel);
  }, []);
  const choisirModele = (m: string) => { setModel(m); api.settingSet("mistralModel", m); };
  const basculerContexte = () => {
    setContexteActif((v) => { const n = !v; api.settingSet("iaContexte", n ? "1" : "0"); return n; });
  };
  // Action « Générer une séquence » déclenchée depuis la palette ⌘K.
  React.useEffect(() => {
    const h = () => setShowGen(true);
    window.addEventListener("maitrize:generer-sequence", h);
    return () => window.removeEventListener("maitrize:generer-sequence", h);
  }, []);

  // Une question préparée ailleurs — un livre des listes de référence — vient
  // dans la zone de saisie, à la suite de ce qu'on avait commencé : on la
  // relit, on la complète, on l'envoie soi-même.
  React.useEffect(() => {
    const prendre = () => {
      const q = prendreQuestion();
      if (!q) return;
      setInput((v) => (v.trim() ? v.trimEnd() + "\n\n" : "") + q);
      setTimeout(() => {
        const t = saisie.current;
        if (!t) return;
        t.focus();
        t.setSelectionRange(t.value.length, t.value.length);
        t.scrollTop = t.scrollHeight;
      }, 80);
    };
    prendre();
    window.addEventListener(EVT_QUESTION_ASSISTANT, prendre);
    return () => window.removeEventListener(EVT_QUESTION_ASSISTANT, prendre);
  }, []);

  // Une réponse devient une feuille — retouchée, si on l'a retouchée : imprimée, en PDF sur le bureau ou ailleurs, en Word.
  const imprimerReponse = (m: ChatMessage) => {
    const f = feuilleDeLaReponse(m);
    printHTML(f.titre, f.corps, f.style);
  };
  const feuilleSurLeBureau = async (titre: string, corps: string) => {
    const fichier = await api.feuilleEnPdf(documentImprimable(titre, corps, STYLE_DOCUMENT_IA));
    return deposerSurLeBureau("assistant", titre, fichier);
  };
  const reponseSurLeBureau = (m: ChatMessage) => { const f = feuilleDeLaReponse(m); return feuilleSurLeBureau(f.titre, f.corps); };
  const exporterReponse = async (m: ChatMessage, quoi: "pdf" | "word") => {
    const f = feuilleDeLaReponse(m);
    try {
      const ok = quoi === "pdf" ? await enregistrerEnPdf(f.titre, f.corps, f.style) : await enregistrerEnWord(f.titre, f.corps);
      if (ok) toast(quoi === "pdf" ? `« ${f.titre} » est enregistré en PDF.` : `« ${f.titre} » est enregistré en Word : il s'ouvre dans Word, Pages ou LibreOffice.`, { icone: quoi === "pdf" ? "📄" : "📝" });
    } catch (e) { toast("Non enregistré : " + String(e), { icone: "⚠️", duree: 8000 }); }
  };
  // La réponse qu'on retouche avant de l'imprimer ou de l'exporter ; sa version gardée reste dans la conversation.
  const [aRetoucher, setARetoucher] = React.useState<number | null>(null);
  const garderRetouche = (i: number, html: string | null) => {
    const suite = messages.map((x, j) => (j === i ? { ...x, mise: html ?? undefined } : x));
    setMessages(suite);
    void sauvegarderConv(suite);
  };
  // ── Suivi du bas de la conversation ──────────────────────────────────
  // La réponse arrive token par token : chaque morceau change `messages` et
  // relancerait un défilement vers le bas. Sans garde-fou, impossible de
  // relire le début d'une réponse tant qu'elle n'est pas terminée — on est
  // ramené en bas à chaque token. On ne suit donc que si l'utilisateur est
  // déjà en bas ; dès qu'il remonte, on le laisse lire.
  const colleEnBas = React.useRef(true);
  const [detache, setDetache] = React.useState(false);

  // Dictée : on remplit la zone de saisie, sans envoyer — l'enseignant relit
  // et complète avant de lancer la demande.
  const dictee = useDictee();
  // La dictée en direct : les mots s'écrivent pendant qu'on parle, chuchotés compris (Voxtral, hors de l'Union
  // européenne : voir dicteeEnDirect.ts, et l'avertissement sous la conversation). Si le direct ne répond pas, la
  // dictée d'avant prend le relais.
  const premierMot = React.useRef(true);
  // Ce que la dictée a écrit, tenu à jour à chaque mot : la question d'une conversation part sans attendre l'écran.
  const dite = React.useRef("");
  // Les mots de la question en cours, et l'heure du dernier : deux secondes sans mot nouveau la finissent aussi.
  const motsDuTour = React.useRef(0);
  const dernierMot = React.useRef(0);
  const enDirect = useDicteeEnDirect({
    surMots: (m) => {
      // Pendant la réponse, le micro se tait : un mot en retard de la question ne s'écrit pas dans la suivante.
      if (oralRef.current === "reponse" || oralRef.current === "lecture") return;
      const premier = premierMot.current;
      premierMot.current = false;
      dite.current = aLaSuite(dite.current, m, premier);
      if (m.trim()) { motsDuTour.current++; dernierMot.current = Date.now(); }
      setInput((v) => aLaSuite(v, m, premier));
    },
    surPanne: (raison) => {
      if (oralRef.current !== "non") {
        void finirLaConversation();
        toast(`Le direct de Mistral ne répond pas (${raison}) : la conversation s'arrête.`, { icone: "📡", duree: 7000 });
        return;
      }
      toast(`Le direct de Mistral ne répond pas (${raison}) : la dictée continue par passages.`, { icone: "📡", duree: 7000 });
      void dictee.demarrer().then((e) => { if (e) toast(e, { icone: "🎙" }); });
    },
    // Pendant que la voix parle, chaque trame du micro est comparée à ce qu'elle joue : l'enseignant qui parle
    // par-dessus la fait taire (voir priseDeParole.ts).
    surTrame: ({ micro, fond, duree }) => {
      const d = detecteur.current;
      if (!d || oralRef.current !== "lecture") return;
      const v = voixJouee.current;
      // Ce que joue la voix à cet instant ; entre deux phrases, la traîne de la précédente, puis rien.
      const voix = v ? (v.env ? niveauJoue(v.env, v.audio.currentTime) : null)
        : performance.now() - finDeLaVoix.current.quand < FENETRE_ECHO_S * 1000 ? finDeLaVoix.current.niveau : 0;
      if (d.entendre({ micro, fond, voix, duree })) prendreLaParole(d);
    },
  });
  const enDirectRef = React.useRef(enDirect);
  enDirectRef.current = enDirect;

  // ── La conversation à voix haute ──
  // « Je veux qu'il puisse me répondre également, et je veux bien pouvoir chuchoter », puis « plus rapidement, plus
  // fluide, comme GPT live » (3 novembre 2026). On parle, même tout bas ; la question part dès que la phrase est finie
  // (voir conversationVocale.ts) ; la réponse, courte, se lit phrase après phrase pendant qu'elle s'écrit — voix de
  // Mistral, adresse européenne —, puis l'écoute reprend. Le micro et le direct restent ouverts d'une question à
  // l'autre : pendant la voix, c'est du silence qui part, sinon le micro l'entendrait.
  type EtatOral = "non" | "ecoute" | "reponse" | "lecture";
  const [oral, setOral] = React.useState<EtatOral>("non");
  const oralRef = React.useRef<EtatOral>("non");
  const majOral = (e: EtatOral) => { oralRef.current = e; setOral(e); };
  // L'état relu à chaque fois : entre deux attentes, un clic a pu finir la conversation.
  const etatOral = (): EtatOral => oralRef.current;
  const inputRef = React.useRef(input);
  inputRef.current = input;
  const messagesRef = React.useRef(messages);
  messagesRef.current = messages;
  // Les messages qu'il faudra pour que la réponse soit là : la question, puis la réponse.
  const attendue = React.useRef(0);
  const audio = React.useRef<HTMLAudioElement | null>(null);
  const lecture = React.useRef<LecteurAuFil | null>(null);
  // « Quand je prends la parole, la voix de synthèse se coupe et me laisse parler » (3 novembre 2026). Ce que la voix
  // joue, pour comparer le micro à son écho ; sa fin, pour sa traîne ; le détecteur de la réponse en cours ; et l'écho
  // mesuré, gardé d'une réponse à l'autre (voir priseDeParole.ts).
  const voixJouee = React.useRef<{ audio: HTMLAudioElement; env: Float32Array | null } | null>(null);
  const finDeLaVoix = React.useRef<{ quand: number; niveau: number | null }>({ quand: 0, niveau: 0 });
  const detecteur = React.useRef<DetecteurDePriseDeParole | null>(null);
  const echoConnu = React.useRef<number | null>(null);
  /** L'écho mesuré pendant cette réponse, gardé pour la suivante ; le détecteur s'en va. */
  const retenirLEcho = () => {
    if (detecteur.current) echoConnu.current = detecteur.current.aRetenir() ?? echoConnu.current;
    detecteur.current = null;
  };
  const loadingRef = React.useRef(loading);
  loadingRef.current = loading;
  const envoyerRef = React.useRef<(texte?: string, options?: { oral?: boolean }) => Promise<void>>(async () => {});

  /** Joue une voix jusqu'au bout, ou jusqu'à ce qu'on l'arrête ; son niveau se lit sur l'ordinateur pendant ce temps. */
  const jouer = (b64: string) => new Promise<void>((fin) => {
    const a = new Audio(`data:audio/mpeg;base64,${b64}`);
    audio.current = a;
    const v: { audio: HTMLAudioElement; env: Float32Array | null } = { audio: a, env: null };
    voixJouee.current = v;
    enveloppeDuMp3(b64).then((env) => { v.env = env; }).catch(() => {});
    const finir = () => {
      if (voixJouee.current === v) {
        finDeLaVoix.current = { quand: performance.now(), niveau: v.env ? niveauJoue(v.env, a.currentTime) : null };
        voixJouee.current = null;
      }
      fin();
    };
    a.onended = finir;
    a.onerror = finir;
    a.onpause = finir;
    a.play().catch(finir);
  });

  /** `rattraper` : les dernières secondes que le micro a entendues sans les envoyer — les premiers mots de qui a coupé la voix. */
  const ecouterLaQuestion = async (rattraper = 0) => {
    premierMot.current = true;
    dite.current = inputRef.current;
    motsDuTour.current = 0;
    majOral("ecoute");
    if (enDirectRef.current.etat !== "repos") { enDirectRef.current.taire(false, rattraper); return; }
    const erreur = await enDirectRef.current.demarrer();
    if (erreur) { toast(erreur, { icone: "🎙" }); majOral("non"); }
  };
  const envoyerLaQuestion = () => {
    if (etatOral() !== "ecoute") return;
    const question = dite.current.trim();
    if (!question) return;
    // Le micro se tait aussitôt — la voix va parler —, et la question part sans attendre.
    enDirectRef.current.taire(true);
    attendue.current = messagesRef.current.length + 2;
    majOral("reponse");
    const l = lecteurAuFil({
      // Une réponse s'écrit avec les vrais noms ; la voix, elle, ne les reçoit jamais.
      voix: (t) => pourLaVoix(t).then((dit) => api.voixLire(dit)),
      jouer,
      surDebut: () => {
        if (etatOral() !== "reponse") return;
        detecteur.current = detecteurDePriseDeParole(echoConnu.current);
        majOral("lecture");
      },
      surErreur: (e) => toast("La voix ne répond pas : la réponse reste écrite. " + texteErreur(e), { icone: "🔇", duree: 6000 }),
    });
    lecture.current = l;
    // Toute la réponse lue : on écoute la question suivante.
    void l.fin.then(() => {
      if (lecture.current !== l) return;
      lecture.current = null;
      retenirLEcho();
      if (etatOral() === "reponse" || etatOral() === "lecture") void ecouterLaQuestion();
    });
    void envoyerRef.current(question, { oral: true });
  };
  /**
   * L'enseignant parle par-dessus la voix : elle se tait ; la réponse qui s'écrivait encore s'arrête — la question qui
   * vient doit pouvoir partir — ; l'écoute reprend, avec les premiers mots dits pendant que le micro se taisait.
   */
  const prendreLaParole = (d: DetecteurDePriseDeParole) => {
    if (oralRef.current !== "lecture" || detecteur.current !== d) return;
    const rattraper = Math.min(0.6, d.depuis() + 0.1);
    retenirLEcho();
    const l = lecture.current;
    lecture.current = null;
    l?.arreter();
    audio.current?.pause();
    audio.current = null;
    if (loadingRef.current) arret.current?.();
    void ecouterLaQuestion(rattraper);
  };
  async function finirLaConversation() {
    majOral("non");
    retenirLEcho();
    lecture.current?.arreter();
    lecture.current = null;
    audio.current?.pause();
    audio.current = null;
    if (enDirectRef.current.etat !== "repos") await enDirectRef.current.arreter();
  }

  // La question est finie dès que la phrase l'est — même chuchotée : c'est la prise de son qui dit qu'on parle.
  React.useEffect(() => {
    if (oral !== "ecoute") return;
    const t = window.setInterval(() => {
      if (oralRef.current !== "ecoute" || !motsDuTour.current) return;
      if (questionFinie(enDirectRef.current.activite.current, dite.current, Date.now() - dernierMot.current)) envoyerLaQuestion();
    }, 100);
    return () => window.clearInterval(t);
  }, [oral]); // eslint-disable-line react-hooks/exhaustive-deps

  // La réponse se lit pendant qu'elle s'écrit — sur un document, une fois vérifiée (voir `provisoire`).
  React.useEffect(() => {
    const l = lecture.current;
    if (!l || provisoire.current || (oral !== "reponse" && oral !== "lecture") || messages.length < attendue.current) return;
    const derniere = messages[messages.length - 1];
    if (derniere?.role === "assistant") l.suivre(derniere.dit ?? derniere.content, !loading);
  }, [oral, loading, messages]);

  // L'écran qui se ferme se tait.
  React.useEffect(() => () => { lecture.current?.arreter(); audio.current?.pause(); oralRef.current = "non"; }, []);
  const basculerDictee = async () => {
    if (oralRef.current !== "non") return;
    if (enDirect.etat === "ecoute") { await enDirect.arreter(); return; }
    if (dictee.etat === "enregistrement") {
      const { texte, erreur } = await dictee.arreter();
      if (erreur) { toast("Transcription impossible : " + erreur, { icone: "⚠️" }); return; }
      if (!texte.trim()) { toast("Rien n'a été compris.", { icone: "🤔" }); return; }
      setInput((v) => (v.trim() ? v.trimEnd() + " " : "") + texte);
      return;
    }
    premierMot.current = true;
    dite.current = input;
    const erreur = await enDirect.demarrer();
    if (erreur) toast(erreur, { icone: "🎙" });
  };

  const versLeBas = React.useCallback((lisse = false) => {
    const n = scrollRef.current; if (!n) return;
    // Pendant le streaming le défilement doit être instantané : une animation
    // « smooth » est sans cesse relancée et rend la lecture impossible.
    n.scrollTo({ top: n.scrollHeight, behavior: lisse ? "smooth" : "auto" });
    colleEnBas.current = true; setDetache(false);
  }, []);

  /** Recolle si l'utilisateur revient au bas de lui-même. */
  const surDefilement = React.useCallback(() => {
    const n = scrollRef.current; if (!n) return;
    const enBas = n.scrollHeight - n.scrollTop - n.clientHeight < 48;
    if (colleEnBas.current === enBas) return;
    colleEnBas.current = enBas; setDetache(!enBas);
  }, []);

  /** Un geste vers le haut décroche tout de suite, sans attendre la mesure. */
  const surMolette = React.useCallback((e: React.WheelEvent) => {
    if (e.deltaY >= 0) return;
    colleEnBas.current = false; setDetache(true);
  }, []);

  React.useEffect(() => {
    if (colleEnBas.current) versLeBas();
  }, [messages, loading, versLeBas]);

  // Sauvegarde / met à jour la conversation courante (historique persistant).
  const sauvegarderConv = async (final: ChatMessage[]) => {
    const id = convId || newId();
    const exist = (convs ?? []).find((c) => c.id === id);
    const now = nowIso();
    const premier = final.find((m) => m.role === "user");
    const titre = exist?.titre || (premier?.content || (premier?.images?.length ? TITRE_D_UNE_IMAGE : "Conversation")).slice(0, 60);
    await api.conversationSave({ id, titre, messagesJson: JSON.stringify(final), dateCreation: exist?.dateCreation ?? now, dateMaj: now });
    if (!convId) setConvId(id);
    reloadConvs();
  };

  // La réponse en cours, qu'on peut arrêter si elle ne convient pas : ce qui est écrit reste, la suite ne vient pas.
  const arret = React.useRef<(() => void) | null>(null);
  // Ce qui s'affiche n'est pas encore la réponse : « Lecture du document… », la réponse avant ses vérifications,
  // « Recherche sur internet… ». À voix haute, rien ne se lit tant que c'est vrai.
  const provisoire = React.useRef(false);

  // ⌘V : une image copiée — une capture, une photo — se colle dans la zone de saisie ; du texte se colle comme avant.
  const collerImages = async (fichiers: File[]) => {
    const lues = (await Promise.all(fichiers.map((f) => imagePourLAssistant(f).catch(() => null)))).filter((x): x is string => !!x);
    if (lues.length < fichiers.length) toast("Une image n'a pas pu être lue. Préférez une capture, un PNG ou un JPEG.", { icone: "⚠️" });
    if (images.length + lues.length > IMAGES_PAR_DEMANDE) toast(`${IMAGES_PAR_DEMANDE} images au plus par message.`, { icone: "ℹ️" });
    setImages((v) => [...v, ...lues].slice(0, IMAGES_PAR_DEMANDE));
  };
  const surCollage = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const fichiers = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
    if (!fichiers.length) return;
    // Un fichier copié dans le Finder apporte aussi son nom, en texte : on ne le colle pas.
    const texte = e.clipboardData.getData("text/plain");
    if (!texte.trim() || /\.(png|jpe?g|gif|webp|heic|heif|tiff?|bmp)$/i.test(texte.trim())) e.preventDefault();
    void collerImages(fichiers);
  };
  // Une image se dépose aussi, glissée depuis le Finder ou depuis la vignette d'une capture d'écran.
  const depot = useFileDropZone({
    accept: estImage,
    onFiles: (fichiers) => { void collerImages(fichiers); },
    onRefus: (noms) => toast(`Seules les images vont à l'assistant : ${noms.slice(0, 2).join(", ")}${noms.length > 2 ? "…" : ""} reste${noms.length > 1 ? "nt" : ""} de côté.`, { icone: "ℹ️" }),
  });

  const envoyer = async (texte?: string, options: { oral?: boolean } = {}) => {
    const contenu = (texte ?? input).trim();
    const jointes = images;
    if ((!contenu && !jointes.length) || loading) return;
    // Une séance ou une séquence demandée : le cadre prend la main (voir cadreDeSeance.ts) ; ni sur le web, ni sur un document, ni sur une image.
    const tour: TourDuCadre = surLeWeb || documentChoisi || jointes.length ? { genre: "normal" } : tourDuCadre(messages, contenu);
    const riendAjouter = (tour.genre === "decline" || tour.genre === "cadrer") && tour.seule;
    const suite: ChatMessage[] = [...messages, { role: "user", content: contenu, ...(jointes.length ? { images: jointes } : {}), ...(riendAjouter ? { cadre: { etape: "reponse" } } : {}) }];
    setMessages(suite); setInput(""); setImages([]); setLoading(true); setRechercheProposee(null);
    colleEnBas.current = true; setDetache(false);
    if (tour.genre !== "normal" && tour.genre !== "decline") { await conduireLeCadre(tour, suite, contenu, riendAjouter); return; }
    let cleanup = () => {};

    // Recherche web : l'agent Mistral interroge le web puis répond en citant
    // ses sources. Pas de streaming — la réponse arrive d'un bloc, après la
    // recherche. On dit explicitement si la recherche a bien eu lieu : une
    // réponse de mémoire affichée sous un bandeau « web » paraîtrait vérifiée
    // alors qu'elle ne l'est pas, ce qui est pire que pas de recherche.
    // L'agent qui cherche sur le web ne lit pas les images : un message qui en porte part à l'assistant, sans le web.
    if (surLeWeb && jointes.length) toast("La recherche sur le web ne lit pas les images : l'assistant répond sans le web.", { icone: "🖼" });
    if (surLeWeb && !jointes.length) {
      // La recherche ne se coupe pas en route : arrêtée, sa réponse sera simplement ignorée.
      let arretee = false;
      arret.current = () => {
        arretee = true;
        arret.current = null;
        const final: ChatMessage[] = [...suite, { role: "assistant", content: "_⏹ Recherche arrêtée._" }];
        setMessages(final); setLoading(false); sauvegarderConv(final);
      };
      try {
        // La question part sans les noms connus ; ils reviennent dans la réponse.
        const masque = pseudonymiserTout([contenu], await nomsAMasquer());
        const r = await api.mistralRechercheWeb(masque.textes[0]);
        if (arretee) return;
        r.texte = restaurer(r.texte || "", masque.table).texte;
        const sources = r.sources.length
          ? "\n\n**Sources**\n" + r.sources.map((s) => `- [${s.titre}](${s.url})`).join("\n")
          : "";
        const avertissement = r.aCherche
          ? ""
          : "\n\n_⚠️ Le web n'a pas été consulté : cette réponse vient de la mémoire du modèle._";
        const final: ChatMessage[] = [...suite,
          { role: "assistant", content: (r.texte || "(réponse vide)") + sources + avertissement }];
        setMessages(final); sauvegarderConv(final);
      } catch (e: any) {
        if (!arretee) setMessages([...suite, { role: "assistant", content: "⚠️ " + String(e) }]);
      } finally {
        if (!arretee) { setLoading(false); arret.current = null; }
      }
      return;
    }

    // Un document du coffre-fort choisi (« 🗄️ ») : Mistral Large répond d'après lui seul (voir questionsAuDocument.ts).
    const doc = documentChoisi;
    provisoire.current = !!doc;
    const terminer = (final: ChatMessage[]) => {
      provisoire.current = false;
      setMessages(final); setLoading(false); sauvegarderConv(final);
    };
    try {
      // Contexte activé → le rôle et ses règles, le contexte non personnel de la classe, les attendus du programme qui
      // parlent de la demande, ciblés sur son cycle (voir consigneAssistant.ts). La mémoire a son propre interrupteur
      // (memoireAssistant.ts). Sans rien de tout cela, AUCUN message système : rien d'autre que la conversation.
      // Sur un document, sa seule consigne : répondre d'après lui, en le citant — ni rôle, ni mémoire.
      let prefixe: ChatMessage[] = [];
      let consigne: { role: boolean; contexte: string; programmes: string } = { role: false, contexte: "", programmes: "" };
      let memoire = "";
      if (!doc) {
        const [ctx, programmes, souvenirs] = await Promise.all([
          contexteActif ? construireContexteIA() : Promise.resolve(""),
          contexteActif
            ? Promise.all([api.referentielsList(), api.settingGet("niveauClasse")])
              .then(([refs, niveau]) => extraitsPourLAssistant(programmesPourLaDemande(refs, contenu, lireNiveaux(niveau))))
              .catch(() => "")
            : Promise.resolve(""),
          memoireCoupee().then((coupee) => (coupee ? [] : chargerMemoire())).catch(() => []),
        ]);
        consigne = { role: contexteActif, contexte: ctx, programmes };
        memoire = blocDeMemoire(souvenirsPourLaQuestion(souvenirs, contenu));
      }
      // Le document se lit ici — une fois : textesDesPdf.ts garde ses pages — ; ses passages qui parlent de la
      // question partent avec elle, après les deux derniers échanges.
      let aEnvoyer = suite.filter(parleAMistral);
      let pagesDuDocument: PageLue[] = [];
      if (doc) {
        setMessages([...suite, { role: "assistant", content: `_📖 Lecture de « ${doc.nom} »…_` }]);
        pagesDuDocument = await toutesLesPagesDuPdf(doc.nomFichier, (page, total) =>
          setMessages([...suite, { role: "assistant", content: `_📖 Lecture de « ${doc.nom} »… page ${page} sur ${total}_` }]));
        const passages = passagesPourLaQuestion(passagesDuDocument(pagesDuDocument), contenu);
        if (!passages.length) {
          terminer([...suite, { role: "assistant", content: `⚠️ « ${doc.nom} » n'a pas de texte que Maitrize sache lire — un document scanné, sans doute. Rien n'est parti chez Mistral.` }]);
          return;
        }
        const question = suite[suite.length - 1];
        aEnvoyer = [...suite.slice(0, -1).slice(-4), { ...question, content: demandeDuDocument(passages, contenu) }];
      }
      // La conversation part sans les noms connus — élèves, contacts de
      // l'établissement —, masquée d'un seul tenant, les passages du document
      // compris ; la réponse les retrouve à mesure qu'elle s'écrit.
      // La mémoire part masquée avec elle, de la même table : la réponse retrouve les vrais mots des deux.
      // Le contexte de la classe et le nom du document aussi : une séquence, un fichier portent parfois un prénom.
      const masque = await masquerSurLesEleves([memoire, consigne.contexte, doc?.nom ?? "", ...aEnvoyer.map((m) => m.content)]);
      const [memoireMasquee, contexteMasque, titreMasque, ...textesMasques] = masque.textes;
      const systeme = doc ? consigneDuDocument(titreMasque) : consigneDeLAssistant({ ...consigne, contexte: contexteMasque, memoire: memoireMasquee });
      if (systeme) prefixe = [{ role: "system", content: systeme }];
      // À voix haute : une réponse qui s'écoute (voir conversationVocale.ts).
      if (options.oral) prefixe = [...prefixe, { role: "system", content: CONSIGNE_ORALE }];
      // La version retouchée d'une réponse reste ici : seul le texte part, avec les images les plus récentes.
      // Les images partent telles quelles : un prénom écrit dessus n'est pas masqué.
      const parMessage = imagesDeLaDemande(aEnvoyer);
      const envoyes: ChatMessage[] = aEnvoyer.map((m, i) => ({ role: m.role, content: textesMasques[i] ?? m.content, images: parMessage[i] }));
      const rendre = (t: string) => restaurer(t, masque.table).texte;
      /**
       * La réponse sur le document, finie : chaque citation retrouvée dans le document, ou signalée, et le bilan.
       * Si le document ne dit rien de la question, l'Assistant propose de chercher sur internet (`chercherSurInternet`).
       */
      const apresLeDocument = (texte: string): string => {
        if (!doc) return texte;
        const v = verifierLesCitations(texte, pagesDuDocument);
        const bilan = `\n\n_${bilanDesCitations(v, doc.nom)}_`;
        if (!neLeDitPas(texte)) return v.texte + bilan;
        // « Le document ne le dit pas » : ce qu'il dit tout de même garde son bilan.
        return v.verifiees || v.introuvables ? v.texte + bilan : v.texte;
      };
      // Streaming : la réponse s'affiche au fil des tokens via événements Tauri.
      const reqId = newId();
      let acc = "";
      let arretee = false;
      setMessages([...suite, { role: "assistant", content: "" }]);
      arret.current = () => {
        arretee = true;
        arret.current = null;
        cleanup();
        // Le flux se ferme chez Mistral au morceau suivant : il n'écrit plus, et ne compte plus.
        invoke("mistral_chat_arreter", { requestId: reqId }).catch(() => {});
        const ecrit = rendre(acc).trim();
        terminer([...suite, { role: "assistant", content: (ecrit ? `${ecrit}\n\n` : "") + "_⏹ Réponse arrêtée._" }]);
      };
      const unChunk = await listen<{ id: string; delta: string }>("mistral://chunk", (ev) => {
        if (ev.payload.id !== reqId) return;
        acc += ev.payload.delta;
        setMessages([...suite, { role: "assistant", content: rendre(acc) }]);
      });
      const unDone = await listen<{ id: string }>("mistral://done", (ev) => {
        if (ev.payload.id !== reqId) return;
        cleanup();
        arret.current = null;
        const ecrit = rendre(acc);
        const final: ChatMessage[] = [...suite, { role: "assistant", content: apresLeDocument(ecrit) }];
        terminer(final);
        if (doc && neLeDitPas(ecrit)) setRechercheProposee({ indice: final.length - 1, question: contenu, titre: doc.nom });
        if (!doc) void retenir(contenu);
      });
      const unErr = await listen<{ id: string; message: string }>("mistral://error", (ev) => {
        if (ev.payload.id !== reqId) return;
        cleanup();
        arret.current = null;
        provisoire.current = false;
        setMessages([...suite, { role: "assistant", content: "⚠️ " + ev.payload.message }]); setLoading(false);
      });
      cleanup = () => { unChunk(); unDone(); unErr(); };
      await relireAvantEnvoi({ messages: [...prefixe, ...envoyes], image: envoyes.some((m) => m.images?.length) });
      await invoke("mistral_chat_stream", { messages: [...prefixe, ...envoyes], model: doc ? MODELE_GRAND : model, requestId: reqId });
      if (arretee) return;
    } catch (e: any) {
      cleanup();
      arret.current = null;
      provisoire.current = false;
      setMessages([...suite, { role: "assistant", content: "⚠️ " + String(e) }]);
      setLoading(false);
    }
  };
  envoyerRef.current = envoyer;

  /**
   * Un tour de la préparation d'une séance ou d'une séquence : la confirmation, les questions, la rédaction, la retouche
   * (voir cadreDeSeance.ts). Tout part masqué, comme le reste de la conversation. À voix haute, seul `dit` se lit : il ne
   * fait que s'allonger, la voix reprend là où elle en était.
   */
  const conduireLeCadre = async (tour: Exclude<TourDuCadre, { genre: "normal" | "decline" }>, suite: ChatMessage[], contenu: string, riendAjouter: boolean) => {
    const finir = (m: ChatMessage) => {
      const final = [...suite, m];
      arret.current = null;
      setMessages(final); setLoading(false); void sauvegarderConv(final);
    };
    if (tour.genre === "confirmer") {
      finir({ role: "assistant", content: questionDeConfirmation(tour.sorte), cadre: { etape: "confirmation", sorte: tour.sorte } });
      void retenir(contenu);
      return;
    }
    if (tour.genre === "abandon") { finir({ role: "assistant", content: "D'accord, on laisse cela de côté." }); return; }
    provisoire.current = false;
    let arretee = false;
    arret.current = () => { arretee = true; finir({ role: "assistant", content: "_⏹ Arrêté._", dit: "" }); };
    const attente = (texte: string, dit: string) => { if (!arretee) setMessages([...suite, { role: "assistant", content: `_${texte}_`, dit }]); };
    const sorte: SorteDePreparation = tour.sorte;
    const nom = sorte === "sequence" ? "la séquence" : "la séance";
    const avantLaFiche = tour.genre === "retoucher" ? "Je reprends la fiche." : "Je m'y mets, cela prend une minute.";
    try {
      attente(tour.genre === "retoucher" ? "Je reprends la fiche…" : "…", "");
      // Les programmes qui parlent de ce qu'on sait déjà du sujet, puis de ce qu'il vient de dire.
      const connuAvant: ConnuDuCadre = tour.connu;
      const demande = [connuAvant.niveau, connuAvant.matiere, connuAvant.sujet, connuAvant.objectif, ...conversationDuCadre(suite).filter((m) => m.role === "user").slice(-3).map((m) => m.content)].filter(Boolean).join(" ");
      const [ctx, trouvailles, souvenirs, inventaire] = await Promise.all([
        contexteActif ? construireContexteIA() : Promise.resolve(""),
        Promise.all([api.referentielsList(), contexteActif ? api.settingGet("niveauClasse") : Promise.resolve(null)])
          .then(([refs, niveau]) => programmesPourLaDemande(refs, demande, lireNiveaux(niveau))).catch(() => []),
        memoireCoupee().then((coupee) => (coupee ? [] : chargerMemoire())).catch(() => []),
        contexteActif ? api.settingGet(CLE_INVENTAIRE).catch(() => null) : Promise.resolve(null),
      ]);
      const inv = lireInventaire(inventaire);
      const materiel = MATERIEL_REEL.filter((m) => inv[m.id]?.a).map((m) => `- ${m.nom}`).join("\n");
      const conv = conversationDuCadre(suite);
      // Ce que Fabriquer sait faire sur ce sujet : le modèle y choisit, le générateur fabrique (voir supportsDeLAssistant.ts).
      const S = await import("../supportsDeLAssistant");
      const periode = await periodeDuMoment();
      const classe = S.classeDuNiveau(connuAvant.niveau) ?? S.classeDuNiveau(demande) ?? S.classeDuNiveau(contexteActif ? await api.settingGet("niveauClasse").catch(() => null) : null);
      const supports = S.supportsDuSujet({
        classe, matiere: connuAvant.matiere, periode, deja: tour.genre === "retoucher" ? feuillesDeLaFiche(tour.fiche) : [],
        texte: [connuAvant.sujet, connuAvant.objectif, connuAvant.support, tour.genre === "retoucher" ? tour.fiche.titre : "", ...conv.filter((m) => m.role === "user").slice(-3).map((m) => m.content)].filter(Boolean).join(" "),
      });
      const fiche = tour.genre === "retoucher" ? JSON.stringify(ficheAuFormat(tour.fiche, supports)) : "";
      const masque = await masquerSurLesEleves([blocDeMemoire(souvenirsPourLaQuestion(souvenirs, demande)), ctx, fiche, JSON.stringify(connuAvant), ...conv.map((m) => m.content)]);
      const [memoire, contexte, ficheMasquee, connuMasque, ...textes] = masque.textes;
      const echanges = conv.map((m, i) => ({ role: m.role, content: textes[i] ?? m.content }));
      const rendre = (t: string) => restaurer(t, masque.table).texte;
      const programmes = extraitsPourLAssistant(trouvailles);
      const entrees = { contexte, memoire, materiel };
      if (tour.genre === "cadrer") {
        const lu = lireLEntretien(await api.mistralChat([{ role: "system", content: consigneDeLEntretien(sorte, connuMasque, { ...entrees, programmes, supports: S.blocDesSupports(supports, false) }) }, ...echanges], model, true), rendre);
        if (arretee) return;
        const e = suiteDeLEntretien({ sorte, avant: tour.connu, posees: tour.posees, lu, conversation: suite });
        finir(e.question
          ? { role: "assistant", content: e.question, dit: e.question, cadre: { etape: "questions", sorte, tour: tour.tour, connu: e.connu, posees: e.posees } }
          : { role: "assistant", content: recapitulatif(e.connu, sorte), dit: RECAP_A_VOIX_HAUTE, cadre: { etape: "recap", sorte, tour: tour.tour, connu: e.connu, posees: e.posees } });
        if (!riendAjouter) void retenir(contenu);
        return;
      }
      attente(tour.genre === "retoucher" ? "Je reprends la fiche…" : `Je rédige ${nom}, cela prend une minute…`, avantLaFiche);
      let etabli = "";
      try { etabli = lignesDuConnu(JSON.parse(connuMasque) as ConnuDuCadre, sorte).join("\n"); } catch { /* la conversation le dit aussi */ }
      const systeme = { role: "system" as const, content: consigneDeLaFiche(sorte, { ...entrees, programmes, etabli, supports: S.blocDesSupports(supports) }) };
      const r = await redigerLaFiche({
        sorte, rendre, permis: trouvailles.map((t) => t.texte), connu: connuAvant, supports,
        messages: tour.genre === "retoucher"
          ? [systeme, { role: "user", content: demandeDeRetouche(ficheMasquee, textes[textes.length - 1] ?? contenu) }]
          : [systeme, ...echanges, { role: "user", content: DEMANDE_DE_REDACTION }],
        appeler: (messages) => api.mistralChat(messages, model, true),
        surCorrection: () => attente("Je relis et je corrige…", avantLaFiche),
      });
      if (arretee) return;
      if ("reponse" in r) { finir({ role: "assistant", content: r.reponse, dit: `${avantLaFiche} ${r.reponse}` }); return; }
      finir({
        role: "assistant", content: ficheEnMarkdown(r.fiche, sorte), dit: `${avantLaFiche} ${FICHE_PRETE}`,
        cadre: {
          etape: "fiche", sorte, fiche: r.fiche, connu: connuAvant, graine: (tour.genre === "retoucher" ? tour.graine : undefined) ?? graineAuHasard(),
          notes: [...r.notes, ...(tour.genre === "rediger" ? [nonPrecise(tour.connu, sorte)].filter((n): n is string => !!n) : [])],
        },
      });
      if (!riendAjouter) void retenir(contenu);
    } catch (e) {
      if (arretee) return;
      // La fiche n'est pas venue : le prochain message, ou le bouton, relance la rédaction.
      finir({ role: "assistant", content: `⚠️ ${texteErreur(e)}`, dit: `${avantLaFiche} Cela n'a pas marché, la raison est à l'écran.`, cadre: { etape: "questions", sorte, tour: TOURS_DE_QUESTIONS_MAX, connu: tour.connu } });
    }
  };

  // Une fiche retouchée remplace la précédente : seule la dernière peut devenir une vraie séquence.
  const indiceDeLaDerniereFiche = messages.map((m) => m.cadre?.etape === "fiche").lastIndexOf(true);
  // La fiche devient une vraie séquence, ou une séance de plus dans une séquence qui existe ; la fiche entière, en PDF, dans le matériel de sa première séance.
  const [aPlacer, setAPlacer] = React.useState<number | null>(null);
  const [enCreation, setEnCreation] = React.useState<string | null>(null);
  const creerLaFiche = async (i: number, cible: string | null) => {
    const m = messages[i];
    if (m?.cadre?.etape !== "fiche" || enCreation) return;
    const { fiche, sorte } = m.cadre;
    setEnCreation("Création…");
    try {
      const S = await import("../supportsDeLAssistant");
      const competence = await S.competenceDesFeuilles(feuillesDeLaFiche(fiche));
      const lien = competence ? { competences: JSON.stringify([competence]) } : {};
      const sequence = cible ? null : { ...sequenceDeLaFiche(fiche, await periodeDuMoment()), ...lien, ...(competence ? { competenceVisee: JSON.stringify(competence) } : {}) };
      if (sequence) await api.sequenceSave(sequence);
      const sequenceId = sequence?.id ?? cible!;
      const avant = sequence ? [] : await api.seancesList(sequenceId).catch(() => []);
      const seances = seancesDeLaFiche(fiche, sequenceId, Math.max(0, ...avant.map((s) => s.numero)) + 1).map((s) => ({ ...s, ...lien }));
      for (const s of seances) await api.seanceSave(s);
      // Les feuilles, par leurs générateurs, chacune dans sa séance : elles se rouvrent dans Fabriquer.
      await S.poserLesFeuilles({
        parSeance: fiche.seances.map((s) => s.feuilles ?? []), seances, sequenceId, graine: m.cadre.graine ?? graineAuHasard(), competence,
        surProgres: (fait, total) => setEnCreation(`Feuille ${fait} sur ${total}…`),
        surEchec: (t, e) => toast(`« ${t} » n'a pas pu être fabriquée : ${texteErreur(e)}`, { icone: "⚠️", duree: 7000 }),
      });
      const titre = `Fiche : ${fiche.titre}`;
      try {
        const pdf = await api.feuilleEnPdf(documentImprimable(titre, feuilleDeLaReponse(m).corps, STYLE_DOCUMENT_IA));
        const depose = await deposerSurLeBureau("assistant", titre, pdf);
        await api.materielSave({ ...depose, seanceId: seances[0].id, sequenceId });
      } catch (e) { toast(`La séquence est créée, mais pas le PDF de la fiche : ${texteErreur(e)}`, { icone: "⚠️", duree: 7000 }); }
      const suite = messages.map((x, j) => (j === i && x.cadre?.etape === "fiche" ? { ...x, cadre: { ...x.cadre, creee: { sequenceId, seanceId: seances[0].id } } } : x));
      setMessages(suite);
      void sauvegarderConv(suite);
      toastAnnulable(sorte === "sequence" ? `Séquence « ${fiche.titre} » créée.` : `Séance « ${fiche.titre} » créée.`, async () => {
        if (sequence) await api.sequenceDelete(sequence.id);
        else for (const s of seances) await api.seanceDelete(s.id);
      }, "📚");
      nav(sorte === "sequence" ? `/sequences/${sequenceId}` : `/seances/${seances[0].id}`);
    } catch (e) { toast("Rien n'a été créé : " + texteErreur(e), { icone: "⚠️", duree: 8000 }); }
    finally { setEnCreation(null); }
  };
  /** Une feuille de la fiche, telle que le générateur la fabrique : on la voit avant de créer quoi que ce soit. */
  const voirLaFeuille = async (r: ReferenceDeFeuille, graine: number | undefined) => {
    try {
      const f = await (await import("../supportsDeLAssistant")).fabriquerLaFeuille(r, graine ?? 1);
      printHTML(f.titre, f.html, f.style);
    } catch (e) { toast("Cette feuille ne s'est pas fabriquée : " + texteErreur(e), { icone: "⚠️", duree: 7000 }); }
  };
  /** Un atelier que l'enseignant règle lui-même : Fabriquer s'ouvre dessus. */
  const ouvrirLAtelier = (id: string) => {
    try { localStorage.setItem("fabriquer:onglet", id); } catch { /* stockage indisponible */ }
    nav("/jeux");
    setTimeout(() => ouvrirOnglet("jeux", id), 140);
  };

  /**
   * Ce que l'enseignant vient de dire et qui mérite d'être retenu, relu en arrière-plan après la réponse (voir
   * memoireAssistant.ts) : un bandeau le dit, « Annuler » (ou ⌘Z) le défait. Un échec ne dit rien : la mémoire
   * attendra le message suivant.
   */
  const retenir = async (dit: string) => {
    try {
      const changements = await retenirDuMessage(dit);
      if (changements.length) toastAnnulable(direLesChangements(changements), () => defaireChangements(changements), "🧠");
    } catch { /* rien de retenu cette fois */ }
  };
  /** Envoyer : en pleine conversation, la question dite part comme après un silence. */
  const envoyerOuParler = () => { if (oralRef.current === "ecoute") void envoyerLaQuestion(); else void envoyer(); };

  /**
   * La question à laquelle le document n'a pas répondu, cherchée sur internet — sur un clic seulement : « demande
   * avant chaque recherche sur internet » (l'enseignant, 3 novembre 2026). Mistral Large cite ses sources, hors de
   * l'Union européenne (les agents de Mistral, Brave). La question part sans les noms connus, avec le titre du
   * document — « ce document » ne dirait rien au moteur. Ce qui est trouvé s'ajoute à la réponse.
   */
  const chercherSurInternet = async () => {
    const p = rechercheProposee;
    const avant = p ? messages[p.indice] : undefined;
    if (!p || avant?.role !== "assistant" || loading) return;
    setRechercheProposee(null);
    const avec = (ajout: string): ChatMessage[] =>
      messages.map((m, i) => (i === p.indice ? { ...m, content: `${avant.content}\n\n${ajout}` } : m));
    let arretee = false;
    arret.current = () => {
      arretee = true;
      arret.current = null;
      const final = avec("_⏹ Recherche sur internet arrêtée._");
      setMessages(final); setLoading(false); sauvegarderConv(final);
    };
    setLoading(true);
    setMessages(avec("_🔎 Recherche sur internet…_"));
    try {
      const q = await masquerSurLesEleves([`À propos du document « ${p.titre} » : ${p.question}`]);
      const r = await api.mistralRechercheWebAssistant(q.textes[0]);
      if (arretee) return;
      const web = restaurer(r.texte || "", q.table).texte.trim();
      const sources = r.sources.length ? "\n\n**Sources**\n" + r.sources.map((x) => `- [${x.titre}](${x.url})`).join("\n") : "";
      const sansWeb = r.aCherche ? "" : "\n\n_⚠️ Internet n'a pas été consulté : cette réponse vient de la mémoire du modèle._";
      const final = avec(`🌐 **Sur internet**\n\n${web || "Rien de sûr n'a été trouvé."}${sources}${sansWeb}`);
      setMessages(final); sauvegarderConv(final);
    } catch (e) {
      if (!arretee) setMessages(avec(`_🌐 La recherche sur internet n'a pas abouti : ${texteErreur(e)}_`));
    } finally {
      if (!arretee) { setLoading(false); arret.current = null; }
    }
  };

  if (hasKey === false) {
    return (
      <div className="chat" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🔑</div>
          <h2>Clé API Mistral requise</h2>
          <p style={{ color: "var(--text-2)" }}>
            L'assistant fonctionne en ligne via Mistral. Ajoutez votre clé API dans les Réglages pour l'activer.
          </p>
          <button className="btn primary" onClick={() => nav("/reglages")}>Aller aux Réglages</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
      <aside style={{ width: 230, minWidth: 230, borderRight: "1px solid var(--border)", overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="btn sm primary" onClick={nouvelleConversation}>+ Nouvelle conversation</button>
        {(convs ?? []).length === 0
          ? <div className="meta" style={{ padding: "8px 4px", fontSize: 12 }}>Aucune conversation enregistrée.</div>
          : (convs ?? []).map((c) => (
              <div key={c.id} onClick={() => chargerConv(c)} title={c.titre}
                onContextMenu={(e) => openCtx(e, [
                  { label: "Renommer", icon: "✏️", onClick: () => renommerConv(c) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimerConv(c) },
                ])}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 9px", borderRadius: 8, cursor: "pointer",
                  background: c.id === convId ? "var(--accent-soft)" : "transparent" }}>
                <span style={{ flex: 1, fontSize: 13, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.titre || "Sans titre"}</span>
                <button className="btn ghost sm" aria-label="Supprimer la conversation" onClick={(e) => { e.stopPropagation(); supprimerConv(c); }}>🗑</button>
              </div>
            ))}
      </aside>
      <div className="chat" ref={depot.ref}
        style={{ flex: 1, height: "100%", ...(depot.actif ? { outline: "2px dashed var(--accent)", outlineOffset: -4, background: "var(--accent-soft)" } : {}) }}>
      <div className="topbar"><h1>Assistant IA</h1><span className="sub">propulsé par Mistral</span>
        <div className="spacer" />
        <Select value={documentChoisi ? MODELE_GRAND : model} onChange={(e) => choisirModele(e.target.value)} style={{ maxWidth: 200 }}
          disabled={!!documentChoisi}
          title={documentChoisi ? "Sur un document du coffre-fort, c'est toujours Mistral Large qui répond" : "Modèle Mistral utilisé"}>
          {MODELES_MISTRAL.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
        <button className="btn sm" aria-pressed={contexteActif} onClick={basculerContexte}
          title={contexteActif
            ? "L'IA reçoit le contexte de la classe (niveau, nombre d'élèves, séquences, programmation). Aucune donnée personnelle d'élève n'est transmise."
            : "L'IA ne reçoit aucun contexte sur ta classe."}>
          🏫 Contexte&nbsp;: {contexteActif ? "activé" : "désactivé"}</button>
        <button className="btn sm" onClick={() => setShowMemoire(true)}
          title="Ce que l'Assistant retient de ce que vous lui dites : le voir, le corriger, l'oublier, ou couper la mémoire">
          🧠 Mémoire</button>
        {!AGENTS_COUPES && <button className="btn sm" aria-pressed={surLeWeb} onClick={() => setSurLeWeb((v) => !v)}
          title={surLeWeb
            ? "La question part à un agent qui interroge le web et cite ses sources. Plus lent."
            : "L'assistant répond de mémoire : il ignore tout ce qui suit son entraînement."}>
          🔎 Web&nbsp;: {surLeWeb ? "activé" : "désactivé"}</button>}
        {documentChoisi
          ? <button className="btn sm" aria-pressed onClick={() => setDocumentChoisi(null)}
              title={`Mistral Large répond d'après « ${documentChoisi.nom} », en citant ses pages ; s'il n'y trouve rien, il propose de chercher sur internet. Cliquer pour revenir à l'assistant habituel.`}>
              📕 {documentChoisi.nom.length > 28 ? documentChoisi.nom.slice(0, 27) + "…" : documentChoisi.nom} ✕</button>
          : <button className="btn sm" onClick={() => setChoixDuDocument(true)}
              title="Choisir un document du coffre-fort : Mistral Large y répond en citant ses pages, sans rien inventer ; s'il n'y trouve rien, il propose de chercher sur internet">
              🗄️ Coffre-fort</button>}
        <button className="btn sm" onClick={() => setShowPictos(true)}
          title="Chercher un pictogramme dans ARASAAC, dans Sclera et vos pictos gardés ; s'il n'existe pas, le faire dessiner par l'IA">
          🧩 Pictos</button>
        <button className="btn sm" onClick={() => setShowLivres(true)}
          title="Chercher un album ou un livre dans les listes de référence d'Éduscol (cycles 1, 2 et 3), et en parler à l'assistant">
          📚 Livres</button>
        <button className="btn sm" onClick={() => setShowModif(true)}>✏️ Modifier une séquence</button>
        <button className="btn sm primary" onClick={() => setShowGen(true)}>✨ Générer une séquence</button>
      </div>
      {aRenommer && (
        <Demander titre="Renommer la conversation" label="Titre" valeur={aRenommer.titre}
          onClose={() => setARenommer(null)}
          onValider={(v) => { const c = aRenommer; setARenommer(null); appliquerRenommage(c, v); }} />
      )}
      {showGen && <GenerateurSequence model={model} onClose={() => setShowGen(false)} />}
      {showModif && <ModifierSequence model={model} onClose={() => setShowModif(false)} />}
      {showPictos && <TrouverUnPicto onClose={() => setShowPictos(false)} />}
      {showMemoire && <MemoireAssistant onClose={() => setShowMemoire(false)} />}
      {showLivres && <TrouverUnLivre onClose={() => setShowLivres(false)} />}
      <div className="chat-scroll" ref={scrollRef} onScroll={surDefilement} onWheel={surMolette}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", maxWidth: 520, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <h2 style={{ marginTop: 0 }}>{documentChoisi ? `Que voulez-vous savoir de « ${documentChoisi.nom} » ?` : "Comment puis-je aider ?"}</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {(documentChoisi ? SUGGESTIONS_DU_DOCUMENT : SUGGESTIONS).map((s) => (
                <button key={s} className="btn" style={{ textAlign: "left" }} onClick={() => envoyer(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            {m.images?.length ? <div className="msg-images">{m.images.map((src, k) => <img key={k} src={src} alt={`Image ${k + 1}`} />)}</div> : null}
            {m.role === "assistant" ? <Markdown texte={m.content || "…"} /> : m.content}
            {rechercheProposee?.indice === i && !loading && (
              <div className="msg-actions" role="group" aria-label="Chercher sur internet" style={{ flexWrap: "wrap", alignItems: "center" }}>
                <span>🌐 Chercher sur internet ? Votre question partira hors de l'Union européenne.</span>
                <button type="button" className="btn primary sm" onClick={() => { void chercherSurInternet(); }}>Chercher</button>
                <button type="button" className="btn ghost sm" onClick={() => setRechercheProposee(null)}>Non merci</button>
              </div>
            )}
            {/* Le cadre d'une séance ou d'une séquence : oui ou non, rédiger sans attendre ; à voix haute, ces réponses se disent. */}
            {m.cadre?.etape === "confirmation" && i === messages.length - 1 && !loading && oral === "non" && (
              <div className="msg-actions" role="group" aria-label={questionDeConfirmation(m.cadre.sorte)}>
                <button type="button" className="btn primary sm" onClick={() => { void envoyer("Oui"); }}>Oui</button>
                <button type="button" className="btn ghost sm" onClick={() => { void envoyer("Non"); }}>Non</button>
              </div>
            )}
            {/* Ce qui est noté, d'un coup d'œil : M2PA garde un récapitulatif en vue, « l'antidote à l'éclatement ». */}
            {m.cadre?.etape === "questions" && m.cadre.connu && resumeDuConnu(m.cadre.connu) && i === messages.length - 1 && (
              <p className="meta" style={{ fontSize: 12, margin: "6px 0 0" }}>Noté : {resumeDuConnu(m.cadre.connu)}</p>
            )}
            {m.cadre?.etape === "questions" && i === messages.length - 1 && !loading && oral === "non" && (
              <div className="msg-actions">
                <button type="button" className="btn ghost sm" onClick={() => { void envoyer("Rédige maintenant"); }}>Rédiger sans attendre</button>
              </div>
            )}
            {m.cadre?.etape === "recap" && i === messages.length - 1 && !loading && oral === "non" && (
              <div className="msg-actions">
                <button type="button" className="btn primary sm" onClick={() => { void envoyer("Oui"); }}>Rédiger</button>
              </div>
            )}
            {m.cadre?.etape === "fiche" && m.cadre.notes.length > 0 && <p className="meta" style={{ fontSize: 12, margin: "6px 0 0" }}>{m.cadre.notes.join(" ")}</p>}
            {m.cadre?.etape === "fiche" && i === indiceDeLaDerniereFiche && !loading && (() => {
              const c = m.cadre;
              const feuilles = feuillesDeLaFiche(c.fiche);
              const ateliers = ateliersDeLaFiche(c.fiche);
              const avec = feuilles.length ? ` et ${feuilles.length > 1 ? `ses ${feuilles.length} feuilles` : "sa feuille"}` : "";
              return (
                <>
                  {(feuilles.length > 0 || ateliers.length > 0) && (
                    <div className="msg-actions" role="group" aria-label="Les supports de Fabriquer" style={{ flexWrap: "wrap" }}>
                      {feuilles.map((r) => (
                        <button key={`${r.atelier}|${r.titre}`} type="button" className="btn sm" title={`Voir cette feuille, telle que le générateur la fabrique (atelier ${nomDeLAtelier(r.atelier)})`}
                          onClick={() => { void voirLaFeuille(r, c.graine); }}>👁 {r.titre}</button>
                      ))}
                      {ateliers.map((a) => (
                        <button key={a.id} type="button" className="btn ghost sm" title="Ouvrir cet atelier dans Fabriquer, pour le régler" onClick={() => ouvrirLAtelier(a.id)}>{a.nom}</button>
                      ))}
                    </div>
                  )}
                  <div className="msg-actions">
                    {c.creee ? (
                      <button type="button" className="btn sm" onClick={() => nav(c.sorte === "sequence" ? `/sequences/${c.creee!.sequenceId}` : `/seances/${c.creee!.seanceId}`)}>{c.sorte === "sequence" ? "📚 Ouvrir la séquence" : "📚 Ouvrir la séance"}</button>
                    ) : (
                      <button type="button" className="btn primary sm" disabled={!!enCreation} onClick={() => { if (c.sorte === "sequence") void creerLaFiche(i, null); else setAPlacer(i); }}>
                        {enCreation ?? `📥 Créer la ${c.sorte === "sequence" ? "séquence" : "séance"}${avec} dans Maitrize`}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
            {/* Une réponse finie devient une feuille : imprimée, ou en PDF sur le bureau. */}
            {m.role === "assistant" && m.content.trim() && !(loading && i === messages.length - 1) && !m.content.startsWith("⚠️") && (!m.cadre || m.cadre.etape === "fiche") && (
              <div className="msg-actions">
                <button type="button" className="btn ghost sm" onClick={() => setARetoucher(i)}
                  title="Effacer un passage, aérer un tableau, changer la taille du texte — puis imprimer ou exporter">✏️ Retoucher{m.mise ? " (retouchée)" : ""}</button>
                <button type="button" className="btn ghost sm" onClick={() => imprimerReponse(m)} title="Cette réponse, mise en page, dans le navigateur pour l'imprimer">🖨 Imprimer</button>
                <button type="button" className="btn ghost sm" onClick={() => { void exporterReponse(m, "pdf"); }} title="Enregistrer cette réponse en PDF, là où vous voulez">📄 PDF…</button>
                <button type="button" className="btn ghost sm" onClick={() => { void exporterReponse(m, "word"); }} title="Un document Word (.docx), à retoucher dans Word, Pages ou LibreOffice">📝 Word…</button>
                <BoutonBureau className="btn ghost sm" onEnregistrer={() => reponseSurLeBureau(m)} />
              </div>
            )}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && <div className="msg assistant" style={{ opacity: 0.6 }}>…</div>}
      </div>
      {detache && (
        <button className="chat-retour" onClick={() => versLeBas(true)}
          title="Revenir au bas de la conversation">
          ↓ {loading ? "La réponse continue" : "Revenir en bas"}
        </button>
      )}
      {images.length > 0 && (
        <div className="chat-images">
          {images.map((src, i) => (
            <span key={i} className="chat-image">
              <img src={src} alt={`Image ${i + 1}`} />
              <button type="button" aria-label={`Retirer l'image ${i + 1}`} title="Retirer cette image" onClick={() => setImages((v) => v.filter((_, k) => k !== i))}>×</button>
            </span>
          ))}
          <span className="meta chat-images-note">Les images partent telles quelles chez Mistral : un prénom écrit dessus n'est pas masqué.</span>
        </div>
      )}
      {/* « Mets un panneau d'avertissement : là, les données ne sont pas traitées [en Europe], il ne faut pas en
          envoyer ici » (l'enseignant, 3 novembre 2026). Toujours en vue : c'est un avertissement, pas une aide. */}
      <p className="assistant-avertissement" role="note">
        ⚠️ <b>Ici, la dictée et la recherche sur internet ne sont pas traitées en Europe.</b> Votre voix, et les questions
        que vous choisissez de chercher sur internet, partent chez Mistral, hors de l'Union européenne : n'y mettez rien
        sur vos élèves — ni prénom, ni santé, ni famille.
      </p>
      <div className="chat-input">
        <textarea className="textarea" rows={2} ref={saisie}
          placeholder={oral === "ecoute" ? "Parlez, même tout bas : la question part quand vous vous taisez…"
            : oral === "reponse" ? "L'Assistant réfléchit…"
            : oral === "lecture" ? "L'Assistant vous répond à voix haute : parlez pour l'interrompre…"
            : enDirect.etat === "ecoute" ? "Parlez : les mots s'écrivent en direct…" : dictee.etat === "enregistrement" ? "Enregistrement en cours…" : documentChoisi ? `Une question sur « ${documentChoisi.nom} »…` : "Écrivez ou dictez votre demande…"} value={input}
          onChange={(e) => setInput(e.target.value)} onPaste={surCollage}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerOuParler(); } }} />
        <button className={"btn" + (oral === "non" && (dictee.etat === "enregistrement" || enDirect.etat === "ecoute") ? " danger" : "")}
          onClick={basculerDictee} disabled={loading || oral !== "non" || dictee.etat === "transcription" || enDirect.etat === "fin"}
          title={enDirect.etat === "ecoute" ? "Terminer la dictée"
            : dictee.etat === "enregistrement" ? "Terminer la dictée et transcrire"
            : "Dicter en direct : les mots s'écrivent pendant que vous parlez — la voix part chez Mistral, hors de l'Union européenne"}
          aria-pressed={dictee.etat === "enregistrement" || enDirect.etat === "ecoute"}>
          {oral === "non" && enDirect.etat === "ecoute" ? `⏹ ${mmss(enDirect.secondes)}`
            : oral === "non" && enDirect.etat === "fin" ? "⏳"
            : dictee.etat === "enregistrement" ? `⏹ ${mmss(dictee.secondes)}`
            : dictee.etat === "transcription" ? "⏳" : "🎙"}
        </button>
        <button className={"btn" + (oral !== "non" ? " danger" : "")}
          onClick={() => { void (oral === "non" ? ecouterLaQuestion() : finirLaConversation()); }}
          disabled={oral === "non" && (loading || dictee.etat !== "repos" || enDirect.etat !== "repos")}
          title={oral === "non"
            ? "Parler avec l'Assistant : vous parlez, même tout bas, et il vous répond à voix haute — la voix part chez Mistral, hors de l'Union européenne"
            : "Finir la conversation"}
          aria-pressed={oral !== "non"}>
          {oral === "non" ? "🗣" : oral === "ecoute" ? "⏹ 🎙" : oral === "lecture" ? "⏹ 🔊" : "⏹ ⏳"}
        </button>
        {loading ? (
          <button className="btn danger" onClick={() => arret.current?.()} title="Arrêter la réponse : ce qui est écrit reste, la suite ne vient pas">⏹ Arrêter</button>
        ) : (
          <button className="btn primary" disabled={!input.trim() && !images.length} onClick={envoyerOuParler}>Envoyer</button>
        )}
      </div>
      {choixDuDocument && (
        <ChoixDuDocument onClose={() => setChoixDuDocument(false)}
          onChoisir={(d) => { setDocumentChoisi(d); setChoixDuDocument(false); setTimeout(() => saisie.current?.focus(), 50); }} />
      )}
      {aPlacer !== null && (
        <ChoixDeLaSequence onClose={() => setAPlacer(null)} onChoisir={(cible) => { const i = aPlacer; setAPlacer(null); void creerLaFiche(i, cible); }} />
      )}
      {aRetoucher !== null && messages[aRetoucher] && (
        <MiseEnPageReponse markdown={messages[aRetoucher].content} mise={messages[aRetoucher].mise}
          onFermer={() => setARetoucher(null)} onGarder={(html) => garderRetouche(aRetoucher, html)} onBureau={feuilleSurLeBureau} />
      )}
      </div>
    </div>
  );
}

// ── La séance de la fiche : dans quelle séquence ───────────────────────────
function ChoixDeLaSequence({ onClose, onChoisir }: { onClose: () => void; onChoisir: (sequenceId: string | null) => void }) {
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const [cible, setCible] = React.useState("");
  return (
    <Modal titre="📥 Créer la séance" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={() => onChoisir(cible || null)}>Créer</button>
      </>}>
      <Field label="Dans quelle séquence ?">
        <Select autoFocus value={cible} onChange={(e) => setCible(e.target.value)}>
          <option value="">Une nouvelle séquence</option>
          {(sequences ?? []).map((s: Sequence) => <option key={s.id} value={s.id}>{s.titre || "Sans titre"} ({s.matiere}, P{s.periode})</option>)}
        </Select>
      </Field>
    </Modal>
  );
}

// ── Générateur de séquence (IA → vraies données) ───────────────────────────
function GenerateurSequence({ model, onClose }: { model: string; onClose: () => void }) {
  const nav = useNavigate();
  const [sujet, setSujet] = React.useState("");
  const [matiere, setMatiere] = React.useState("Français");
  const [cycle, setCycle] = React.useState("Cycle 2");
  const [niveau, setNiveau] = React.useState("CP");
  const [nb, setNb] = React.useState(4);
  const [busy, setBusy] = React.useState(false);
  const [erreur, setErreur] = React.useState("");

  const generer = async () => {
    if (!sujet.trim()) return;
    setBusy(true); setErreur("");
    const prompt =
      `Génère une séquence pédagogique pour le primaire français.\n` +
      `Sujet : ${sujet}\nMatière : ${matiere}\nCycle : ${cycle}\nNiveau : ${niveau}\nNombre de séances : ${nb}\n\n` +
      `Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :\n` +
      `{"titre":"...","objectifs":"...","seances":[{"titre":"...","objectifs":"...","deroulement":"...","materiel":"...","duree":45}]}\n` +
      `L'objectif de chaque séance commence par « ${DEBUT_OBJECTIF_SEANCE} » et dit ce qu'ils sauront faire. ` +
      `Le déroulement doit être concret (phases, consignes). duree en minutes.`;
    try {
      const masque = pseudonymiser(prompt, await nomsAMasquer());
      const rep = restaurer(await api.mistralChat(
        [{ role: "system", content: "Tu génères des séquences pédagogiques. Tu réponds en JSON strict uniquement." },
         { role: "user", content: masque.texte }],
        model,
      ), masque.table).texte;
      const data = extraireJson(rep);
      const seq = {
        ...nouvelleSequence(),
        titre: data.titre || sujet,
        matiere, cycle,
        objectifs: data.objectifs || "",
        couleur: couleurPourMatiere(matiere),
      };
      await api.sequenceSave(seq);
      const seances = Array.isArray(data.seances) ? data.seances : [];
      for (let i = 0; i < seances.length; i++) {
        const s = seances[i];
        await api.seanceSave({
          ...nouvelleSeance(seq.id, i + 1),
          titre: s.titre || `Séance ${i + 1}`,
          objectifs: s.objectifs || "",
          deroulement: s.deroulement || "",
          materiel: s.materiel || "",
          duree: typeof s.duree === "number" ? s.duree : 45,
        });
      }
      onClose();
      nav(`/sequences/${seq.id}`);
    } catch (e: any) {
      setErreur("Échec : " + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal titre="✨ Générer une séquence" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={busy || !sujet.trim()} onClick={generer}>{busy ? "Génération…" : "Générer"}</button>
      </>}>
      <Field label="Sujet / thème"><Input autoFocus placeholder="ex. Les fractions, Le cycle de l'eau…" value={sujet} onChange={(e) => setSujet(e.target.value)} /></Field>
      <div className="row">
        <Field label="Matière"><Select value={matiere} onChange={(e) => setMatiere(e.target.value)}>{MATIERES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Cycle"><Select value={cycle} onChange={(e) => setCycle(e.target.value)}>{CYCLES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      </div>
      <div className="row">
        <Field label="Niveau"><Input value={niveau} onChange={(e) => setNiveau(e.target.value)} /></Field>
        <Field label="Nombre de séances"><Input type="number" min={1} max={12} value={nb} onChange={(e) => setNb(+e.target.value)} /></Field>
      </div>
      {erreur && <div style={{ color: "var(--danger)", fontSize: 13 }}>{erreur}</div>}
      <p style={{ color: "var(--text-2)", fontSize: 12.5 }}>L'IA crée une vraie séquence avec ses séances, que vous pourrez ensuite modifier.</p>
    </Modal>
  );
}

// ── Modifier une séquence existante (et ses séances) via l'IA ──────────────
function ModifierSequence({ model, onClose }: { model: string; onClose: () => void }) {
  const nav = useNavigate();
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const [seqId, setSeqId] = React.useState("");
  const [instruction, setInstruction] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [erreur, setErreur] = React.useState("");

  const appliquer = async () => {
    const seq = (sequences ?? []).find((s) => s.id === seqId);
    if (!seq || !instruction.trim()) return;
    setBusy(true); setErreur("");
    try {
      const seancesAct: Seance[] = (await api.seancesList(seq.id)).sort((a, b) => a.numero - b.numero);
      const etat = {
        titre: seq.titre, objectifs: seq.objectifs,
        seances: seancesAct.map((s) => ({ numero: s.numero, titre: s.titre, objectifs: s.objectifs, deroulement: s.deroulement, materiel: s.materiel, duree: s.duree })),
      };
      const prompt =
        `Voici une séquence pédagogique existante (primaire français, ${seq.matiere}, ${seq.cycle}) au format JSON :\n` +
        `${JSON.stringify(etat)}\n\n` +
        `Demande de modification : ${instruction}\n\n` +
        `Réponds UNIQUEMENT avec la séquence MODIFIÉE complète, en JSON valide strict, même format :\n` +
        `{"titre":"...","objectifs":"...","seances":[{"numero":1,"titre":"...","objectifs":"...","deroulement":"...","materiel":"...","duree":45}]}\n` +
        `Conserve ce qui n'est pas visé par la demande. Numérote les séances à partir de 1. duree en minutes. ` +
      `L'objectif d'une séance nouvelle ou réécrite commence par « ${DEBUT_OBJECTIF_SEANCE} » et dit ce qu'ils sauront faire.`;
      const masque = pseudonymiser(prompt, await nomsAMasquer());
      const rep = restaurer(await api.mistralChat(
        [{ role: "system", content: "Tu modifies des séquences pédagogiques. Tu réponds en JSON strict uniquement." },
         { role: "user", content: masque.texte }],
        model,
      ), masque.table).texte;
      const data = extraireJson(rep);
      // Séquence : maj titre + objectifs (les autres champs sont conservés).
      await api.sequenceSave({ ...seq, titre: data.titre || seq.titre, objectifs: data.objectifs ?? seq.objectifs });
      // Séances : appariées par numéro → conserve id, bilan et images des existantes.
      const out: any[] = Array.isArray(data.seances) ? data.seances : [];
      for (let i = 0; i < out.length; i++) {
        const numero = i + 1;
        const base = seancesAct.find((s) => s.numero === numero) ?? nouvelleSeance(seq.id, numero);
        await api.seanceSave({
          ...base, numero,
          titre: out[i].titre ?? base.titre,
          objectifs: out[i].objectifs ?? base.objectifs,
          deroulement: out[i].deroulement ?? base.deroulement,
          materiel: out[i].materiel ?? base.materiel,
          duree: typeof out[i].duree === "number" ? out[i].duree : base.duree,
        });
      }
      // Supprime les séances en trop (au-delà du nouveau total).
      for (const ex of seancesAct) if (ex.numero > out.length) await api.seanceDelete(ex.id);
      onClose();
      nav(`/sequences/${seq.id}`);
    } catch (e: any) {
      setErreur("Échec : " + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal titre="✏️ Modifier une séquence avec l'IA" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={busy || !seqId || !instruction.trim()} onClick={appliquer}>{busy ? "Modification…" : "Appliquer"}</button>
      </>}>
      <Field label="Séquence à modifier">
        <Select value={seqId} onChange={(e) => setSeqId(e.target.value)}>
          <option value="">— choisir —</option>
          {(sequences ?? []).map((s: Sequence) => <option key={s.id} value={s.id}>{s.titre || "Sans titre"} ({s.matiere}, P{s.periode})</option>)}
        </Select>
      </Field>
      <Field label="Que faut-il changer ?">
        <textarea className="textarea" rows={4} value={instruction} onChange={(e) => setInstruction(e.target.value)}
          placeholder="ex. Ajoute une séance d'évaluation finale · Reformule les objectifs · Raccourcis le déroulé de la séance 2 · Différencie pour des élèves en difficulté" />
      </Field>
      {erreur && <div style={{ color: "var(--danger)", fontSize: 13 }}>{erreur}</div>}
      <p style={{ color: "var(--text-2)", fontSize: 12.5 }}>L'IA réécrit la séquence et ses séances selon ta demande. Les <b>bilans et images</b> des séances conservées sont préservés. Vérifie le résultat ensuite (tout reste modifiable à la main).</p>
    </Modal>
  );
}
