// Couche d'accès au backend Rust via Tauri invoke. Types miroir des structs.
import { invoke } from "@tauri-apps/api/core";

// Touche de modification selon l'OS : ⌘ sur macOS, Ctrl sur Windows/Linux.
export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
/** Libellé de raccourci adaptatif, ex. raccourci("K") → "⌘K" (Mac) ou "Ctrl+K" (Windows). */
export const raccourci = (touche: string) => (isMac ? `⌘${touche}` : `Ctrl+${touche}`);

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

// ── Année scolaire courante (sept→août) ──────────────────────────────
export function anneeScolaireActuelle(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// ============================================================
// TYPES
// ============================================================
export interface Projet {
  id: string; titre: string; descriptif: string; couleur: string;
  dateCreation: string; annee: string; imageNom: string | null;
}

export interface Sequence {
  id: string; titre: string; matiere: string; cycle: string; objectifs: string;
  competences: string; competenceVisee: string; imageNom: string | null;
  couleur: string; dateCreation: string; periode: number; annee: string;
  ratingEngagement: number; ratingFacilite: number; ratingApprentissage: number;
  ratingDateMaj: string | null; projetId: string | null; video: string;
}

export interface Seance {
  id: string; titre: string; numero: number; objectifs: string; competences: string;
  deroulement: string; materiel: string; duree: number; date: string | null;
  tableauDeroulement: string; imagesDeroulement: string; bilan: string;
  bilanDate: string | null; sequenceId: string | null;
}

export interface Creneau {
  id: string; date: string; heureDebut: string; heureFin: string; matiere: string;
  couleur: string; seanceId: string | null; atelierId: string | null; espaceId: string | null;
}

export interface Atelier {
  id: string; titre: string; matiere: string; objectifs: string; competences: string;
  materiel: string; nbElevesMax: number; duree: number; couleur: string;
  dateCreation: string; imageNom: string | null; dossier: string;
}

export interface Espace {
  id: string; titre: string; descriptionEspace: string; nbElevesMax: number;
  couleur: string; dateCreation: string; imageNom: string | null; dossier: string;
}

export interface ProgressionEleve {
  id: string; nomEleve: string; eleveId: string | null; fait: boolean; espaceId: string | null;
}

export interface Eleve {
  id: string; nom: string; niveau: string; present: boolean; ine: string;
  dateNaissance: string; photoFichier: string | null;
}

export interface AppelJournalier {
  id: string; date: string; statutBrut: string; eleveId: string | null;
}

export interface CommentaireEleve {
  id: string; date: string; texte: string; type: string; eleveId: string | null;
}

export interface Evaluation {
  id: string; titre: string; matiere: string; date: string; bareme: number;
  periode: number; mode: string; competencesJson: string; pdfNomFichier: string | null;
}

export interface NoteEleve {
  id: string; eleveNom: string; eleveId: string | null; note: number | null;
  absent: boolean; commentaire: string; evaluationId: string | null; niveauxJson: string;
}

export interface MaterielItem {
  id: string; titre: string; descriptionMateriel: string; competenceId: string;
  competenceTitre: string; domaineTitre: string; sousDomaineTitre: string; cycle: string;
  imagesJson: string; pdfsJson: string; dateCreation: string; seanceId: string | null;
  sequenceId: string | null;
}

export interface PapierEleve {
  id: string; intitule: string; eleveId: string; type: string; nomFichier: string;
  note: string; dateAjout: string;
}

export interface Referentiel {
  id: string; nom: string; cycle: string; donnees: string; estIntegre: boolean;
  dateAjout: string; actif: boolean;
}

export interface NoteCompetence {
  id: string; competenceRefId: string; texte: string; dateCreation: string; dateModification: string;
}

export interface ProgressionAnnuelle {
  id: string; annee: string; periode: number; colonnesJson: string; cellulesJson: string;
}

export interface ProgrammationFinale {
  id: string; annee: string; lignesJson: string; niveau: string; enseignant: string; estImportee: boolean;
}

export interface EdtTypique { id: string; annee: string; slotsJson: string; }

export interface PieceJointe {
  id: string; nom: string; type: string; nomFichier: string; dateAjout: string;
  seanceId: string | null; aImprimer: boolean;
}

export interface PiloteConversation {
  id: string; titre: string; messagesJson: string; dateCreation: string; dateMaj: string;
}

export interface DocumentCoffre {
  id: string; nom: string; nomFichier: string; tailleOctets: number; dateAjout: string;
}

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string; }
export interface ResultatRecherche { kind: string; id: string; titre: string; sousTitre: string; }
export interface VacancePeriode { description: string; debut: string; fin: string; }

// ============================================================
// FABRIQUES (valeurs par défaut)
// ============================================================
export const nouveauProjet = (): Projet => ({
  id: newId(), titre: "", descriptif: "", couleur: "indigo",
  dateCreation: nowIso(), annee: anneeScolaireActuelle(), imageNom: null,
});

export const nouvelleSequence = (): Sequence => ({
  id: newId(), titre: "", matiere: "", cycle: "", objectifs: "", competences: "",
  competenceVisee: "", imageNom: null, couleur: "blue", dateCreation: nowIso(),
  periode: 1, annee: anneeScolaireActuelle(), ratingEngagement: 0, ratingFacilite: 0,
  ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "",
});

export const nouvelleSeance = (sequenceId: string, numero: number): Seance => ({
  id: newId(), titre: "", numero, objectifs: "", competences: "", deroulement: "",
  materiel: "", duree: 45, date: null, tableauDeroulement: "[]", imagesDeroulement: "[]",
  bilan: "", bilanDate: null, sequenceId,
});

export const nouvelAtelier = (): Atelier => ({
  id: newId(), titre: "", matiere: "Français", objectifs: "", competences: "", materiel: "",
  nbElevesMax: 6, duree: 30, couleur: "blue", dateCreation: nowIso(), imageNom: null, dossier: "",
});

export const nouvelEspace = (): Espace => ({
  id: newId(), titre: "", descriptionEspace: "", nbElevesMax: 6, couleur: "teal",
  dateCreation: nowIso(), imageNom: null, dossier: "",
});

export const nouvelEleve = (niveau = ""): Eleve => ({
  id: newId(), nom: "", niveau, present: true, ine: "", dateNaissance: "", photoFichier: null,
});

export const nouvelleEvaluation = (): Evaluation => ({
  id: newId(), titre: "", matiere: "", date: nowIso(), bareme: 20, periode: 1,
  mode: "note", competencesJson: "[]", pdfNomFichier: null,
});

// ============================================================
// API
// ============================================================
export const api = {
  // Projets
  projetsList: () => invoke<Projet[]>("projets_list"),
  projetSave: (projet: Projet) => invoke<Projet>("projet_save", { projet }),
  projetDelete: (id: string) => invoke<void>("projet_delete", { id }),

  // Séquences
  sequencesList: () => invoke<Sequence[]>("sequences_list"),
  sequenceSave: (sequence: Sequence) => invoke<Sequence>("sequence_save", { sequence }),
  sequenceDelete: (id: string) => invoke<void>("sequence_delete", { id }),

  // Séances
  seancesList: (sequenceId?: string) => invoke<Seance[]>("seances_list", { sequenceId: sequenceId ?? null }),
  seanceSave: (seance: Seance) => invoke<Seance>("seance_save", { seance }),
  seanceDelete: (id: string) => invoke<void>("seance_delete", { id }),

  // Ateliers / espaces
  ateliersList: () => invoke<Atelier[]>("ateliers_list"),
  atelierSave: (atelier: Atelier) => invoke<Atelier>("atelier_save", { atelier }),
  atelierDelete: (id: string) => invoke<void>("atelier_delete", { id }),
  espacesList: () => invoke<Espace[]>("espaces_list"),
  espaceSave: (espace: Espace) => invoke<Espace>("espace_save", { espace }),
  espaceDelete: (id: string) => invoke<void>("espace_delete", { id }),
  atelierEspaceList: () => invoke<[string, string][]>("atelier_espace_list"),
  atelierEspaceSet: (espaceId: string, atelierIds: string[]) =>
    invoke<void>("atelier_espace_set", { espaceId, atelierIds }),
  progressionsEleveList: (espaceId?: string) =>
    invoke<ProgressionEleve[]>("progressions_eleve_list", { espaceId: espaceId ?? null }),
  progressionEleveSave: (progression: ProgressionEleve) =>
    invoke<ProgressionEleve>("progression_eleve_save", { progression }),
  progressionEleveDelete: (id: string) => invoke<void>("progression_eleve_delete", { id }),

  // Planning
  creneauxList: (debut?: string, fin?: string) =>
    invoke<Creneau[]>("creneaux_list", { debut: debut ?? null, fin: fin ?? null }),
  creneauSave: (creneau: Creneau) => invoke<Creneau>("creneau_save", { creneau }),
  creneauDelete: (id: string) => invoke<void>("creneau_delete", { id }),

  // Élèves
  elevesList: () => invoke<Eleve[]>("eleves_list"),
  eleveSave: (eleve: Eleve) => invoke<Eleve>("eleve_save", { eleve }),
  eleveDelete: (id: string) => invoke<void>("eleve_delete", { id }),
  appelsList: (date?: string) => invoke<AppelJournalier[]>("appels_list", { date: date ?? null }),
  appelSave: (appel: AppelJournalier) => invoke<AppelJournalier>("appel_save", { appel }),
  appelDelete: (id: string) => invoke<void>("appel_delete", { id }),
  commentairesList: (eleveId?: string) =>
    invoke<CommentaireEleve[]>("commentaires_list", { eleveId: eleveId ?? null }),
  commentaireSave: (commentaire: CommentaireEleve) =>
    invoke<CommentaireEleve>("commentaire_save", { commentaire }),
  commentaireDelete: (id: string) => invoke<void>("commentaire_delete", { id }),

  // Évaluations
  evaluationsList: () => invoke<Evaluation[]>("evaluations_list"),
  evaluationSave: (evaluation: Evaluation) => invoke<Evaluation>("evaluation_save", { evaluation }),
  evaluationDelete: (id: string) => invoke<void>("evaluation_delete", { id }),
  notesEleveList: (evaluationId?: string) =>
    invoke<NoteEleve[]>("notes_eleve_list", { evaluationId: evaluationId ?? null }),
  noteEleveSave: (note: NoteEleve) => invoke<NoteEleve>("note_eleve_save", { note }),
  noteEleveDelete: (id: string) => invoke<void>("note_eleve_delete", { id }),

  // Matériel
  materielList: () => invoke<MaterielItem[]>("materiel_list"),
  materielSave: (materiel: MaterielItem) => invoke<MaterielItem>("materiel_save", { materiel }),
  materielDelete: (id: string) => invoke<void>("materiel_delete", { id }),

  // Papiers
  papiersList: () => invoke<PapierEleve[]>("papiers_list"),
  papierSave: (papier: PapierEleve) => invoke<PapierEleve>("papier_save", { papier }),
  papierDelete: (id: string) => invoke<void>("papier_delete", { id }),

  // Référentiels
  referentielsList: () => invoke<Referentiel[]>("referentiels_list"),
  referentielSave: (referentiel: Referentiel) => invoke<Referentiel>("referentiel_save", { referentiel }),
  referentielDelete: (id: string) => invoke<void>("referentiel_delete", { id }),
  notesCompetenceList: () => invoke<NoteCompetence[]>("notes_competence_list"),
  noteCompetenceSave: (note: NoteCompetence) => invoke<NoteCompetence>("note_competence_save", { note }),

  // Organisation
  progressionsAnnuelleList: () => invoke<ProgressionAnnuelle[]>("progressions_annuelle_list"),
  progressionAnnuelleSave: (p: ProgressionAnnuelle) =>
    invoke<ProgressionAnnuelle>("progression_annuelle_save", { p }),
  programmationsFinaleList: () => invoke<ProgrammationFinale[]>("programmations_finale_list"),
  programmationFinaleSave: (p: ProgrammationFinale) =>
    invoke<ProgrammationFinale>("programmation_finale_save", { p }),
  programmationFinaleDelete: (id: string) => invoke<void>("programmation_finale_delete", { id }),
  edtTypiqueList: () => invoke<EdtTypique[]>("edt_typique_list"),
  edtTypiqueSave: (edt: EdtTypique) => invoke<EdtTypique>("edt_typique_save", { edt }),

  // Pièces jointes
  piecesJointesList: (seanceId?: string) =>
    invoke<PieceJointe[]>("pieces_jointes_list", { seanceId: seanceId ?? null }),
  pieceJointeSave: (piece: PieceJointe) => invoke<PieceJointe>("piece_jointe_save", { piece }),
  pieceJointeDelete: (id: string) => invoke<void>("piece_jointe_delete", { id }),

  // Conversations IA
  conversationsList: () => invoke<PiloteConversation[]>("conversations_list"),
  conversationSave: (conversation: PiloteConversation) =>
    invoke<PiloteConversation>("conversation_save", { conversation }),
  conversationDelete: (id: string) => invoke<void>("conversation_delete", { id }),

  // Coffre-fort
  coffreList: () => invoke<DocumentCoffre[]>("coffre_list"),
  coffreSave: (document: DocumentCoffre) => invoke<DocumentCoffre>("coffre_save", { document }),
  coffreDelete: (id: string, nomFichier: string) => invoke<void>("coffre_delete", { id, nomFichier }),
  coffreDownload: (url: string, nom: string) => invoke<DocumentCoffre>("coffre_download", { url, nom }),

  // Réglages
  settingsAll: () => invoke<Record<string, string>>("settings_all"),
  settingGet: (cle: string) => invoke<string | null>("setting_get", { cle }),
  settingSet: (cle: string, valeur: string) => invoke<void>("setting_set", { cle, valeur }),

  // Fichiers
  fichierSave: (nom: string, base64: string) => invoke<string>("fichier_save", { nom, base64 }),
  fichierRead: (nom: string) => invoke<string>("fichier_read", { nom }),
  fichierPath: (nom: string) => invoke<string>("fichier_path", { nom }),
  fichierDelete: (nom: string) => invoke<void>("fichier_delete", { nom }),
  enregistrerTexte: (chemin: string, contenu: string) => invoke<void>("enregistrer_texte", { chemin, contenu }),
  imprimerPdf: (nom: string) => invoke<void>("imprimer_pdf", { nom }),
  ouvrirFichier: (nom: string) => invoke<void>("ouvrir_fichier", { nom }),
  ouvrirHtml: (html: string) => invoke<void>("ouvrir_html", { html }),
  imprimerPlanning: (titre: string, jours: { jour: string; rangs: { heureDebut: string; heureFin: string; matiere: string; seance: string; couleur: string; objectifs: string; deroulement: string }[][] }[]) =>
    invoke<void>("imprimer_planning", { titre, jours }),
  exporterSyntheseGs: (args: {
    ecole: string; eleveNom: string; positions: number[][]; observations: string[];
    dateVisaEnseignant: string; enseignantNom: string; directeurNom: string; dateVisaDirecteur: string;
  }) => invoke<void>("exporter_synthese_gs", args),

  // Recherche
  recherche: (q: string) => invoke<ResultatRecherche[]>("recherche", { q }),

  // Export / Import (sauvegarde)
  exportData: () => invoke<string>("export_data"),
  importData: (json: string) => invoke<void>("import_data", { json }),
  exporterBase: (chemin: string) => invoke<void>("exporter_base", { chemin }),

  // Vacances scolaires
  vacancesScolaires: (zone: string) => invoke<VacancePeriode[]>("vacances_scolaires", { zone }),

  // IA Mistral
  mistralChat: (messages: ChatMessage[], model?: string) =>
    invoke<string>("mistral_chat", { messages, model: model ?? null }),
  mistralTest: () => invoke<boolean>("mistral_test"),

  // Amis (appariement chiffré, 100 % local pour l'instant)
  identiteGet: () => invoke<Identite>("identite_get"),
  identiteSetNom: (nom: string) => invoke<Identite>("identite_set_nom", { nom }),
  invitationCreer: () => invoke<string>("invitation_creer"),
  invitationAccepter: (code: string) => invoke<Ami>("invitation_accepter", { code }),
  amisList: () => invoke<Ami[]>("amis_list"),
  amiSetVerifie: (id: string, verifie: boolean) => invoke<void>("ami_set_verifie", { id, verifie }),
  amiSupprimer: (id: string) => invoke<void>("ami_supprimer", { id }),

  // Synchro chiffrée E2E (S3 — MinIO en local, Scaleway/Hetzner ensuite)
  syncConfigGet: () => invoke<SyncConfig>("sync_config_get"),
  syncConfigSet: (c: { endpoint: string; region: string; bucket: string; access: string; secret?: string }) =>
    invoke<void>("sync_config_set", { endpoint: c.endpoint, region: c.region, bucket: c.bucket, access: c.access, secret: c.secret ?? null }),
  syncTest: () => invoke<string>("sync_test"),
  // Sauvegarde chiffrée de toute la base sur le stockage S3/MinIO.
  sauvegardePush: () => invoke<string>("sauvegarde_push"),
  sauvegardePull: () => invoke<string>("sauvegarde_pull"),
  syncEnvoyer: (amiId: string, texte: string) => invoke<void>("sync_envoyer", { amiId, texte }),
  syncRelever: (amiId: string) => invoke<SyncMessage[]>("sync_relever", { amiId }),
  sequencePartager: (amiId: string, sequenceId: string) => invoke<void>("sequence_partager", { amiId, sequenceId }),
  programmationPartager: (amiId: string, annee: string) => invoke<void>("programmation_partager", { amiId, annee }),
  projetPartager: (amiId: string, projetId: string) => invoke<void>("projet_partager", { amiId, projetId }),
  // Boîte de réception : relever (met en attente), lister, récupérer (importer), jeter.
  boiteRelever: (amiId: string) => invoke<BoiteItem[]>("boite_relever", { amiId }),
  boiteListe: () => invoke<BoiteItem[]>("boite_liste"),
  boiteRecuperer: (id: string) => invoke<void>("boite_recuperer", { id }),
  boiteSupprimer: (id: string) => invoke<void>("boite_supprimer", { id }),
  // Version portable : serveur local sur le WiFi + QR code (lecture seule).
  portableDemarrer: () => invoke<PortableInfo>("portable_demarrer"),
  portableArreter: () => invoke<void>("portable_arreter"),
  // Capture photo depuis le téléphone (émet l'événement "photo:recue").
  photoCaptureDemarrer: () => invoke<PortableInfo>("photo_capture_demarrer"),
  photoCaptureArreter: () => invoke<void>("photo_capture_arreter"),
};

export interface PortableInfo {
  url: string;
  ip: string;
  port: number;
  qrSvg: string;
}

export interface Identite { clePublique: string; nom: string; empreinte: string; }
export interface Ami {
  id: string; nom: string; clePublique: string; mailboxId: string;
  numeroSecurite: string; verifie: boolean; dateAjout: string;
}
export interface SyncConfig { endpoint: string; region: string; bucket: string; access: string; aSecret: boolean; }
export interface SyncMessage { de: string; nom: string; texte: string; ts: string; }
export interface BoiteItem { id: string; type: "sequence" | "projet" | "programmation"; deNom: string; titre: string; ts: string; }

// Statuts de présence (miroir de StatutPresence Swift), avec demi-journées.
export const STATUTS_PRESENCE = [
  { v: "present", label: "Présent", symbole: "", couleur: "#22c55e" },
  { v: "absentMatin", label: "Absent matin", symbole: "—", couleur: "#ef4444" },
  { v: "absentAprem", label: "Absent après-midi", symbole: "|", couleur: "#ef4444" },
  { v: "absent", label: "Absent journée", symbole: "+", couleur: "#ef4444" },
  { v: "retard", label: "Retard", symbole: "R", couleur: "#f59e0b" },
];
export const estAbsence = (s: string) => s === "absentMatin" || s === "absentAprem" || s === "absent";

// Niveaux de maîtrise LSU (1-4).
export const NIVEAUX_MAITRISE = [
  { n: 1, label: "Non atteint", court: "Non atteint", couleur: "#d64d4d" },
  { n: 2, label: "Partiellement atteint", court: "Partiel", couleur: "#eb9e33" },
  { n: 3, label: "Atteint", court: "Atteint", couleur: "#57b873" },
  { n: 4, label: "Dépassé", court: "Dépassé", couleur: "#268550" },
];

// Jours fériés français (légaux) pour une année — calcul de Pâques inclus.
export function joursFeriesFR(annee: number): Record<string, string> {
  // Algorithme de Gauss/Meeus pour le dimanche de Pâques.
  const a = annee % 19, b = Math.floor(annee / 100), c = annee % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  const paques = new Date(annee, mois - 1, jour);
  const plus = (n: number) => { const x = new Date(paques); x.setDate(x.getDate() + n); return iso(x); };
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
  const f2 = (mo: number, d2: number) => `${annee}-${String(mo).padStart(2, "0")}-${String(d2).padStart(2, "0")}`;
  return {
    [f2(1, 1)]: "Jour de l'an", [plus(1)]: "Lundi de Pâques", [f2(5, 1)]: "Fête du travail",
    [f2(5, 8)]: "Victoire 1945", [plus(39)]: "Ascension", [plus(50)]: "Lundi de Pentecôte",
    [f2(7, 14)]: "Fête nationale", [f2(8, 15)]: "Assomption", [f2(11, 1)]: "Toussaint",
    [f2(11, 11)]: "Armistice", [f2(12, 25)]: "Noël",
  };
}

// Volumes horaires officiels hebdomadaires par niveau (miroir HEURES_PROGRAMME).
export const HEURES_PROGRAMME: Record<string, Record<string, number>> = {
  CP: { "Français": 10, "Mathématiques": 5, "Questionner le monde": 2, "LVE / Anglais": 1.5, "Arts plastiques": 1, "Éducation musicale": 1, "EPS": 3, "EMC": 0.5 },
  CE1: { "Français": 8.5, "Mathématiques": 5, "Questionner le monde": 3, "LVE / Anglais": 1.5, "Arts plastiques": 1, "Éducation musicale": 1, "EPS": 3, "EMC": 0.5 },
  CE2: { "Français": 8, "Mathématiques": 5, "Questionner le monde": 3, "LVE / Anglais": 1.5, "Arts plastiques": 1, "Éducation musicale": 1, "EPS": 3, "EMC": 0.5 },
  CM1: { "Français": 6, "Mathématiques": 5, "Histoire-Géographie": 3, "Sciences et techno.": 2, "LVE / Anglais": 2, "Arts plastiques": 1, "Éducation musicale": 1, "EPS": 3, "EMC": 0.5 },
  CM2: { "Français": 6, "Mathématiques": 5, "Histoire-Géographie": 3, "Sciences et techno.": 2, "LVE / Anglais": 2, "Arts plastiques": 1, "Éducation musicale": 1, "EPS": 3, "EMC": 0.5 },
};

// Constantes pédagogiques partagées
export const NIVEAUX_SCOLAIRES = ["TPS", "PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2"];
export const CYCLES = ["Cycle 1", "Cycle 2", "Cycle 3"];
export const MATIERES = [
  "Français", "Mathématiques", "Questionner le monde", "Histoire-Géographie",
  "Sciences et techno.", "EMC", "Arts plastiques", "Éducation musicale", "EPS",
  "LVE / Anglais", "Mobiliser le langage", "Activité physique", "Activités artistiques",
  "Structurer sa pensée", "Explorer le monde", "Accueil", "Rituel", "Récréation",
  "Pause méridienne", "APC", "Temps calme", "Autre",
];
export const COULEURS = ["blue", "indigo", "purple", "teal", "green", "orange", "red", "pink", "gray"];

// Modèles Mistral proposés (du plus puissant au plus rapide/économe).
export const MODELES_MISTRAL = [
  { id: "mistral-large-latest", label: "Mistral Large (qualité max)" },
  { id: "mistral-small-latest", label: "Mistral Small (rapide)" },
  { id: "open-mistral-nemo", label: "Mistral Nemo (léger)" },
];
export const MODELE_DEFAUT = "mistral-large-latest";

// Palette de durées (miroir Swift) + format lisible.
export const DUREES = [5, 10, 15, 20, 25, 30, 40, 45, 50, 60, 75, 90, 105, 120, 150, 180];
export function formatDuree(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

export const couleurHex: Record<string, string> = {
  blue: "#3b82f6", indigo: "#6366f1", purple: "#a855f7", teal: "#14b8a6",
  green: "#22c55e", orange: "#f59e0b", red: "#ef4444", pink: "#ec4899", gray: "#6b7280",
  cyan: "#06b6d4", brown: "#a16207", yellow: "#eab308",
};

// Couleur par défaut d'une matière (miroir de COULEURS_MATIERES côté Swift).
const COULEURS_MATIERES: Record<string, string> = {
  "Mobiliser le langage": "blue", "Activité physique": "red", "Activités artistiques": "pink",
  "Structurer sa pensée": "orange", "Explorer le monde": "green",
  "Français": "blue", "Mathématiques": "orange", "Questionner le monde": "cyan",
  "Histoire-Géographie": "brown", "Sciences et techno.": "green", "EMC": "indigo",
  "Arts plastiques": "pink", "Éducation musicale": "purple", "EPS": "red", "LVE / Anglais": "teal",
  "Accueil": "cyan", "Rituel": "indigo", "Récréation": "yellow", "Pause méridienne": "orange",
  "APC": "brown", "Temps calme": "teal", "Autre": "gray",
};

// Surcharges utilisateur des couleurs de matière (chargées des réglages au démarrage).
let _matiereOverrides: Record<string, string> = {};
export function setMatiereOverrides(o: Record<string, string>) { _matiereOverrides = o || {}; }
export function getMatiereOverrides(): Record<string, string> { return _matiereOverrides; }

export function couleurPourMatiere(matiere: string): string {
  if (_matiereOverrides[matiere]) return _matiereOverrides[matiere];
  if (COULEURS_MATIERES[matiere]) return COULEURS_MATIERES[matiere];
  const palette = ["blue", "green", "orange", "purple", "red", "indigo", "teal", "pink", "cyan", "brown"];
  let h = 0;
  for (const ch of matiere) h = (h + ch.charCodeAt(0)) & 0x7fffffff;
  return palette[h % palette.length];
}

// ── Téléchargement d'un fichier texte (JSON) via dialog "Enregistrer sous" ──
// Le pattern <a download> + blob ne déclenche rien dans la webview Tauri ;
// on passe par le dialog natif puis on écrit le fichier côté Rust.
export async function telechargerTexte(nomDefaut: string, contenu: string): Promise<boolean> {
  const { save } = await import("@tauri-apps/plugin-dialog");
  const ext = (nomDefaut.split(".").pop() || "json").toLowerCase();
  const chemin = await save({ defaultPath: nomDefaut, filters: [{ name: ext.toUpperCase(), extensions: [ext] }] });
  if (!chemin) return false; // annulé
  await api.enregistrerTexte(chemin, contenu);
  return true;
}
