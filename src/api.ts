// Couche d'accès au backend Rust via Tauri invoke. Types miroir des structs.
import { invoke as invokeTauri } from "@tauri-apps/api/core";

// La fenêtre de l'application n'a pas de console visible : quand une action
// « ne fait rien », il ne reste aucune trace. Toute commande qui échoue est
// donc écrite dans diagnostic.log (Réglages ▸ Données ▸ Journal d'incidents).
function invoke<T>(cmd: string, ...args: unknown[]): Promise<T> {
  return (invokeTauri as (c: string, ...a: unknown[]) => Promise<T>)(cmd, ...args).catch((err) => {
    if (cmd !== "diag_ecrire") journal(`ÉCHEC ${cmd} : ${texteErreur(err)}`);
    throw err;
  });
}

/** Message lisible : une erreur Tauri est parfois une chaîne, parfois un objet. */
export function texteErreur(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message + (err.stack ? ` | ${err.stack.split("\n")[1]?.trim() ?? ""}` : "");
  try { return JSON.stringify(err); } catch { return String(err); }
}

/** Écrit une ligne dans le journal d'incidents. Ne jette jamais. */
export function journal(ligne: string): void {
  try { (invokeTauri as (c: string, a: unknown) => Promise<void>)("diag_ecrire", { ligne }).catch(() => {}); }
  catch { /* hors application */ }
}

// Touche de modification selon l'OS : ⌘ sur macOS, Ctrl sur Windows/Linux.
export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
/** Libellé de raccourci adaptatif, ex. raccourci("K") → "⌘K" (Mac) ou "Ctrl+K" (Windows). */
export const raccourci = (touche: string) => (isMac ? `⌘${touche}` : `Ctrl+${touche}`);

export const newId = () => crypto.randomUUID();
export const nowIso = () => new Date().toISOString();

// ── Année scolaire courante ──────────────────────────────────────────
// Bascule au 1er août : en août on prépare la rentrée, pas l'année écoulée.
export function anneeScolaireActuelle(): string {
  const d = new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

// ============================================================
// TYPES
// ============================================================
export interface Sequence {
  id: string; titre: string; matiere: string; cycle: string; objectifs: string;
  competences: string; competenceVisee: string; imageNom: string | null;
  couleur: string; dateCreation: string; periode: number; annee: string;
  ratingEngagement: number; ratingFacilite: number; ratingApprentissage: number;
  ratingDateMaj: string | null; projetId: string | null; video: string;
  /** Chemin de rangement dans le plan de travail : « Français/Lecture ». */
  dossier: string;
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
  /** Élèves présents (JSON) — organisation IME en groupes restreints. */
  elevesJson: string;
  /** Temps de classe, ou de réunion / formation : pour compter les heures de la semaine. */
  nature: "classe" | "reunion";
  /** Cahier journal : ce qui est prévu. */
  prevu: string;
  /** Cahier journal : ce qui a été fait, et le bilan. */
  bilan: string;
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

/** Un jeu de la ludothèque de classe. */
export interface Jeu {
  id: string; titre: string; typeJeu: string; descriptionJeu: string; regles: string;
  competences: string;
  /** Compétences des programmes officiels (BO) travaillées, en JSON. */
  competencesBo: string;
  nbJoueursMin: number; nbJoueursMax: number; duree: number;
  ageMin: number; rangement: string; couleur: string; dateCreation: string;
  imageNom: string | null; dossier: string;
}

/** Un outil pour l'élève (bande numérique, casque…) ou un affichage de la classe. */
export interface OutilClasse {
  id: string;
  genre: "outil" | "affichage";
  titre: string; categorie: string;
  /** À quoi il sert, ce qu'il travaille. */
  usage: string;
  /** Compétences des programmes officiels (BO), en JSON. */
  competencesBo: string;
  /** Comment s'en servir (outil), ce qu'il faut savoir (affichage). */
  consignes: string;
  /** Où il est rangé (outil), où il est affiché (affichage). */
  lieu: string;
  /** Quand l'affichage est au mur. */
  periode: string;
  /** Identifiants des élèves qui s'en servent, en JSON. */
  elevesJson: string;
  /** Documents à imprimer, en JSON : DocumentOutil[]. */
  documentsJson: string;
  imageNom: string | null; couleur: string; dossier: string; dateCreation: string;
}
export interface DocumentOutil { nom: string; fichier: string }

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
  /** Objectifs du PPI travaillés, en JSON (voir `objectifsPpi.ts`). */
  objectifs?: string;
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
  /** Rangement libre, comme pour les ateliers et les jeux. */
  dossier: string;
  /** Liens vidéo (YouTube ou autre), en JSON. */
  videosJson: string;
  /** Identifiants de documents du coffre-fort rattachés, en JSON. */
  coffreJson: string;
}

/** Un fichier texte du plan de travail. */
export interface Texte {
  id: string; titre: string; contenu: string; dossier: string;
  dateCreation: string; dateModification: string;
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
export interface ResultatRecherche {
  kind: string; id: string; titre: string; sousTitre: string;
  /** La ligne où les mots ont été trouvés, telle qu'elle est écrite. */
  extrait: string;
  /** Date de ce qu'on a trouvé, pour situer et pour trier. */
  date: string;
  /** Ce dont ça dépend : la séquence d'une séance, l'élève d'une observation, le jour d'un créneau. */
  parent: string;
}
export interface VacancePeriode { description: string; debut: string; fin: string; }
/** Un document du dossier d'un élève (synthèse GS, PPI, GEVA-Sco, dispositif…). */
export interface DocumentEleve {
  id: string; eleveId: string; typeDoc: string; donnees: string; dateMaj: string;
}
/** Une sauvegarde chiffrée présente sur le stockage S3/MinIO. */
export interface SauvegardeDistante {
  cle: string; date: string; octets: number; travailLocalPlusRecent: boolean;
}

/** Bilan d'un passage de synchronisation fine. */
export interface ResultatSync {
  envoyes: number; recus: number; appliques: number; message: string;
}

/** Bilan d'un échange de pièces jointes. */
export interface ResultatFichiers {
  envoyes: number; recus: number; restants: number; message: string;
}

/** Un ordinateur partageant le même stockage. */
export interface Machine {
  id: string; nom: string; plateforme: string; vueLe: string; moi: boolean;
}

/** Où en est la synchronisation entre les machines. */
export interface EtatSync {
  configure: boolean; aEnvoyer: boolean; aRecuperer: boolean; conflit: boolean;
  derniereSync: string; derniereDistante: string; horsLigne: string;
  /** Lignes reçues qui attendent encore : elles seront reprises toutes seules. */
  enAttente: number;
}

/** Ce qu'un essai de restauration a trouvé dans une sauvegarde. */
export interface VerifSauvegarde {
  cle: string; sauvegarde: string; essai: string; octets: number;
  lisible: boolean; lignes: [string, number][]; fichiers: number;
  alertes: string[]; message: string;
}

/** Emplacement des données de l'application. */
export interface DossierDonnees {
  chemin: string; parDefaut: string; personnalise: boolean; octets: number;
}

/** Un passage de la copie du bureau sur l'ordinateur. */
export interface BilanCopie {
  date: string; fichiers: number; ecrits: number; archives: number; erreurs: string[];
  /** Documents cités par le bureau mais absents de Maitrize : rien à recopier. */
  manquants: string[];
  /** Le système a refusé l'écriture (sur Mac : accès au Bureau non accordé). */
  autorisationRefusee: boolean;
}
export interface InfoCopie {
  active: boolean;
  /** Où se trouve la copie : le Bureau, par défaut. */
  emplacement: string; parDefaut: boolean;
  /** Le dossier de la copie elle-même. */
  racine: string;
  derniere: BilanCopie | null;
}
/** Un fichier de la copie, tel qu'envoyé au backend. */
export interface EntreeCopie { chemin: string; empreinte: string; fichier?: string; contenu?: string }

/** Copie quotidienne automatique de la base. */
export interface SauvegardeAuto { nom: string; jour: string; octets: number }

// ============================================================
// FABRIQUES (valeurs par défaut)
// ============================================================
export const nouvelleSequence = (): Sequence => ({
  id: newId(), titre: "", matiere: "", cycle: "", objectifs: "", competences: "",
  competenceVisee: "", imageNom: null, couleur: "blue", dateCreation: nowIso(),
  periode: 1, annee: anneeScolaireActuelle(), ratingEngagement: 0, ratingFacilite: 0,
  ratingApprentissage: 0, ratingDateMaj: null, projetId: null, video: "", dossier: "",
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

export const nouveauJeu = (): Jeu => ({
  id: newId(), titre: "", typeJeu: TYPES_JEU[0], descriptionJeu: "", regles: "", competences: "", competencesBo: "[]",
  nbJoueursMin: 2, nbJoueursMax: 4, duree: 20, ageMin: 3, rangement: "",
  couleur: "purple", dateCreation: nowIso(), imageNom: null, dossier: "",
});

export const CATEGORIES_OUTIL = [
  "Lecture et écriture", "Mathématiques", "Organisation et autonomie", "Communication",
  "Régulation et sensoriel", "Motricité", "Autre",
];
export const CATEGORIES_AFFICHAGE = [
  "Référentiel", "Règles de vie", "Emploi du temps et rituels", "Affiche de leçon", "Travaux d'élèves", "Autre",
];
export const PERIODES_AFFICHAGE = [
  "Toute l'année", "Période 1", "Période 2", "Période 3", "Période 4", "Période 5", "Rangé (plus affiché)",
];

export const nouvelOutil = (genre: OutilClasse["genre"]): OutilClasse => ({
  id: newId(), genre, titre: "", categorie: (genre === "outil" ? CATEGORIES_OUTIL : CATEGORIES_AFFICHAGE)[0],
  usage: "", competencesBo: "[]", consignes: "", lieu: "", periode: genre === "affichage" ? PERIODES_AFFICHAGE[0] : "",
  elevesJson: "[]", documentsJson: "[]", imageNom: null, couleur: genre === "outil" ? "teal" : "orange",
  dossier: "", dateCreation: nowIso(),
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

  // Jeux
  jeuxList: () => invoke<Jeu[]>("jeux_list"),
  jeuSave: (jeu: Jeu) => invoke<Jeu>("jeu_save", { jeu }),
  jeuDelete: (id: string) => invoke<void>("jeu_delete", { id }),
  // Outils pour l'élève et affichages
  outilsClasseList: () => invoke<OutilClasse[]>("outils_classe_list"),
  outilClasseSave: (outil: OutilClasse) => invoke<OutilClasse>("outil_classe_save", { outil }),
  outilClasseDelete: (id: string) => invoke<void>("outil_classe_delete", { id }),

  // Planning
  creneauxList: (debut?: string, fin?: string) =>
    invoke<Creneau[]>("creneaux_list", { debut: debut ?? null, fin: fin ?? null }),
  creneauSave: (creneau: Creneau) => invoke<Creneau>("creneau_save", { creneau }),
  creneauJournalSave: (id: string, prevu: string, bilan: string) =>
    invoke<void>("creneau_journal_save", { id, prevu, bilan }),
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
  textesList: () => invoke<Texte[]>("textes_list"),
  texteSave: (texte: Texte) => invoke<Texte>("texte_save", { texte }),
  texteDelete: (id: string) => invoke<void>("texte_delete", { id }),
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
  fichierOuvrir: (nom: string) => invoke<void>("fichier_ouvrir", { nom }),
  fichierDelete: (nom: string) => invoke<void>("fichier_delete", { nom }),
  fichierImporterDepuisChemin: (chemin: string) => invoke<string>("fichier_importer_depuis_chemin", { chemin }),
  enregistrerTexte: (chemin: string, contenu: string) => invoke<void>("enregistrer_texte", { chemin, contenu }),
  imprimerPdf: (nom: string) => invoke<void>("imprimer_pdf", { nom }),
  ouvrirFichier: (nom: string) => invoke<void>("ouvrir_fichier", { nom }),
  ouvrirHtml: (html: string) => invoke<void>("ouvrir_html", { html }),
  imprimerPlanning: (titre: string, jours: { jour: string; rangs: { heureDebut: string; heureFin: string; matiere: string; seance: string; couleur: string; objectifs: string; deroulement: string }[][] }[]) =>
    invoke<void>("imprimer_planning", { titre, jours }),
  exporterSyntheseGs: (args: {
    ecole: string; eleveNom: string;
    domaines: { titre: string; titreObservations: string; items: { bloc: string | null; label: string; position: number }[]; enonces: string[]; observation: string }[];
    dateVisaEnseignant: string; enseignantNom: string; directeurNom: string; dateVisaDirecteur: string;
  }) => invoke<void>("exporter_synthese_gs", args),
  exporterBilanPpi: (args: {
    eleveNom: string; ecole: string; enseignantNom: string; date: string;
    besoins: string; amenagements: string; prisesEnCharge: string[];
    objectifs: { domaine: string; intitule: string; critere: string; echeance: string; statut: string; notes: string }[];
    bilanTexte: string;
  }) => invoke<void>("exporter_bilan_ppi", args),
  exporterGevasco: (args: {
    reexamen: boolean; eleveNom: string;
    textes: [string, string][]; boutons: [string, string][];
  }) => invoke<void>("exporter_gevasco", args),

  // Recherche
  recherche: (q: string) => invoke<ResultatRecherche[]>("recherche", { q }),

  // Dossier de l'élève (synthèse GS, PPI, GEVA-Sco, progressions, dispositifs)
  documentEleveGet: (eleveId: string, typeDoc: string) =>
    invoke<string | null>("document_eleve_get", { eleveId, typeDoc }),
  documentEleveSet: (eleveId: string, typeDoc: string, donnees: string) =>
    invoke<void>("document_eleve_set", { eleveId, typeDoc, donnees }),
  documentsEleveList: (eleveId?: string, typeDoc?: string) =>
    invoke<DocumentEleve[]>("documents_eleve_list", { eleveId: eleveId ?? null, typeDoc: typeDoc ?? null }),

  /** Transcrit un enregistrement audio (base64) en texte, via Mistral. */
  transcrireAudio: (audioB64: string, nomFichier: string) =>
    invoke<string>("transcrire_audio", { audioB64, nomFichier }),

  // Export / Import (sauvegarde)
  exportData: () => invoke<string>("export_data"),
  importData: (json: string) => invoke<string>("import_data", { json }),
  exporterBase: (chemin: string) => invoke<void>("exporter_base", { chemin }),
  sauvegardesAutoList: () => invoke<SauvegardeAuto[]>("sauvegardes_auto_list"),
  sauvegardesAutoOuvrir: () => invoke<void>("sauvegardes_auto_ouvrir"),
  // Copie du bureau dans un vrai dossier de l'ordinateur
  copieBureauInfo: () => invoke<InfoCopie>("copie_bureau_info"),
  copieBureauRegler: (active: boolean, emplacement?: string) =>
    invoke<InfoCopie>("copie_bureau_regler", { active, emplacement: emplacement ?? null }),
  copieBureauPreparer: (entrees: EntreeCopie[], dossiers: string[]) =>
    invoke<{ aEcrire: string[]; travail: boolean }>("copie_bureau_preparer", { entrees, dossiers }),
  copieBureauAppliquer: (entrees: EntreeCopie[], dossiers: string[]) =>
    invoke<BilanCopie>("copie_bureau_appliquer", { entrees, dossiers }),
  copieBureauOuvrir: () => invoke<void>("copie_bureau_ouvrir"),

  // Vacances scolaires
  vacancesScolaires: (zone: string) => invoke<VacancePeriode[]>("vacances_scolaires", { zone }),

  // IA Mistral
  mistralChat: (messages: ChatMessage[], model?: string) =>
    invoke<string>("mistral_chat", { messages, model: normaliserModele(model) }),
  mistralTest: (model?: string) =>
    invoke<boolean>("mistral_test", { model: normaliserModele(model) }),
  /** Essaie chaque modèle et dit lesquels l'abonnement accepte réellement. */
  mistralModelesDisponibles: (modeles: string[]) =>
    invoke<EtatModele[]>("mistral_modeles_disponibles", { modeles }),

  /** Modèle retenu pour une tâche : réglage de l'utilisateur, ou repli. */
  modeleActif: async (repli = MODELE_DEFAUT) =>
    normaliserModele((await invoke<string | null>("setting_get", { cle: "mistralModel" })) || repli),

  // Générateur de jeux ARASAAC
  arasaacEtat: () => invoke<EtatBanque>("arasaac_etat"),
  arasaacTelecharger: () => invoke<EtatBanque>("arasaac_telecharger"),
  arasaacCategories: () => invoke<CategorieArasaac[]>("arasaac_categories"),
  arasaacSelection: (categories: string[], exclues: string[], intersection: boolean, combien: number, graine: number) =>
    invoke<PictoArasaac[]>("arasaac_selection", { categories, exclues, intersection, combien, graine }),
  arasaacImage: (id: number) => invoke<string>("arasaac_image", { id }),
  arasaacParMots: (mots: string[]) =>
    invoke<[PictoArasaac[], string[]]>("arasaac_par_mots", { mots }),
  jeuGenerer: (jeu: string, pictos: PictoArasaac[], options: OptionsJeu, titre: string) =>
    invoke<string>("jeu_generer", { jeu, pictos, options, titre }),
  mistralRechercheWeb: (question: string) =>
    invoke<ReponseWeb>("mistral_recherche_web", { question }),
  mistralVision: (consigne: string, imageB64: string, model?: string) =>
    invoke<string>("mistral_vision", { consigne, imageB64, model: normaliserModele(model) }),
  arasaacChercher: (q: string, limite = 40) =>
    invoke<PictoArasaac[]>("arasaac_chercher", { q, limite }),
  arasaacNature: (id: number) => invoke<string>("arasaac_nature", { id }),
  tlaGenerer: (gabarit: Gabarit) => invoke<string>("tla_generer", { gabarit }),

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
  sauvegardePull: (cle?: string) => invoke<string>("sauvegarde_pull", { cle: cle ?? null }),
  sauvegardeVerifier: (cle?: string) => invoke<VerifSauvegarde>("sauvegarde_verifier", { cle: cle ?? null }),
  sauvegardeVerifDerniere: () => invoke<VerifSauvegarde | null>("sauvegarde_verif_derniere"),
  sauvegardeListe: () => invoke<SauvegardeDistante[]>("sauvegarde_liste"),
  sauvegardeSupprimer: (cle: string) => invoke<string>("sauvegarde_supprimer", { cle }),
  syncEtat: () => invoke<EtatSync>("sync_etat"),
  syncDeltas: () => invoke<ResultatSync>("sync_deltas"),
  syncFichiers: () => invoke<ResultatFichiers>("sync_fichiers"),
  machinesListe: () => invoke<Machine[]>("machines_liste"),
  machineNomSet: (nom: string) => invoke<void>("machine_nom_set", { nom }),
  appairageCode: () => invoke<string>("appairage_code"),
  appairageAppliquer: (code: string) => invoke<void>("appairage_appliquer", { code }),
  diagOuvrir: () => invoke<void>("diag_ouvrir"),
  dossierDonneesGet: () => invoke<DossierDonnees>("dossier_donnees_get"),
  dossierDonneesSet: (chemin: string | null) => invoke<DossierDonnees>("dossier_donnees_set", { chemin }),
  syncEnvoyer: (amiId: string, texte: string) => invoke<void>("sync_envoyer", { amiId, texte }),
  syncRelever: (amiId: string) => invoke<SyncMessage[]>("sync_relever", { amiId }),
  sequencePartager: (amiId: string, sequenceId: string) => invoke<void>("sequence_partager", { amiId, sequenceId }),
  programmationPartager: (amiId: string, annee: string) => invoke<void>("programmation_partager", { amiId, annee }),
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
/** Familles de jeux, pour filtrer la ludothèque. */
export const TYPES_JEU = [
  "Société", "Coopératif", "Cartes", "Plateau", "Construction",
  "Symbolique", "Motricité", "Sensoriel", "Numérique", "Fabrication maison",
];

export const COULEURS = ["blue", "indigo", "purple", "teal", "cyan", "green", "orange", "brown", "red", "pink", "gray"];

/**
 * Natures d'observation sur un élève.
 *
 * « axe de travail » se distingue des autres : ce n'est pas un constat mais
 * une intention. Le dossier le remonte en tête, et une fiche qui n'en porte
 * aucun se voit tout de suite.
 */
export const TYPES_OBSERVATION = ["axe de travail", "divers", "comportement", "scolaire", "santé"] as const;
export const TYPE_AXE = "axe de travail";

/**
 * Modèles Mistral proposés, du plus fin au plus rapide.
 *
 * Les trois « Ministral » sont ouverts à tous les comptes, y compris gratuits.
 * Les deux derniers demandent un abonnement payant : Mistral les refuse
 * ailleurs avec un quota de zéro requête par minute, d'où le libellé explicite.
 */
export const MODELES_MISTRAL = [
  { id: "ministral-14b-latest", label: "Ministral 14B (qualité)" },
  { id: "ministral-8b-latest", label: "Ministral 8B (équilibré)" },
  { id: "ministral-3b-latest", label: "Ministral 3B (rapide)" },
  { id: "mistral-medium-latest", label: "Mistral Medium (abonnement payant)" },
  { id: "mistral-large-latest", label: "Mistral Large (abonnement payant)" },
];
export const MODELE_DEFAUT = "ministral-8b-latest";
/** Modèle des tâches internes (ranger, classer, reformuler) : rapide et ouvert. */
export const MODELE_TACHES = "ministral-8b-latest";

/**
 * Identifiants qui ne sont plus proposés — retirés par Mistral, ou réservés
 * aux abonnements payants — et leur équivalent ouvert à tous les comptes.
 *
 * Un réglage enregistré il y a plusieurs mois peut encore désigner un modèle
 * qui n'existe plus, ou que l'abonnement refuse : l'appel échoue alors par un
 * 403 ou un 429 incompréhensible. `normaliserModele` répare ces valeurs.
 */
export const MODELES_REMPLACES: Record<string, string> = {
  "open-mistral-nemo": "ministral-8b-latest",
  "open-mistral-7b": "ministral-8b-latest",
  "open-mixtral-8x7b": "ministral-8b-latest",
  "open-mixtral-8x22b": "ministral-14b-latest",
  "mistral-small-latest": "ministral-14b-latest",
  "magistral-small-latest": "ministral-14b-latest",
  "mistral-tiny": "ministral-3b-latest",
  "ministral-3b-2410": "ministral-3b-latest",
  "ministral-8b-2410": "ministral-8b-latest",
};

// ── Générateur de jeux (banque ARASAAC) ───────────────────────────────────
export interface EtatBanque {
  installee: boolean; pictos: number; images: number; octets: number; derniereMaj: string;
}
export interface CategorieArasaac { nom: string; nombre: number }
export interface PictoArasaac { id: number; mot: string; fichier: string; nature?: string }
export interface OptionsJeu {
  libelles: boolean; cartes: boolean; colonnes: number; lignes: number;
  planches: number; graine: number;
}

// ── Tableau de langage assisté (TLA) ──────────────────────────────────────
/** Nature grammaticale d'un mot : elle donne la couleur de la case. */
export type NatureMot = "personne" | "verbe" | "adjectif" | "social" | "petit mot" | "nom";
export interface CaseTla {
  pictoId: number | null; fichier: string; mot: string; nature: NatureMot;
}
export interface Gabarit {
  id: string; nom: string; eleve: string;
  colonnes: number; lignes: number; paysage: boolean; ecart: number; cases: CaseTla[];
}
export const caseVide = (): CaseTla => ({ pictoId: null, fichier: "", mot: "", nature: "nom" });

/** Réponse d'une recherche web, avec ses sources. */
export interface SourceWeb { titre: string; url: string }
export interface ReponseWeb { texte: string; sources: SourceWeb[]; aCherche: boolean }

/** Verdict d'un test réel sur un modèle, pour l'écran des réglages. */
export interface EtatModele { id: string; disponible: boolean; detail: string }

/** Ramène un identifiant de modèle enregistré vers un modèle encore servi. */
export function normaliserModele(id: string | null | undefined): string {
  if (!id || !id.trim()) return MODELE_DEFAUT;
  return MODELES_REMPLACES[id] ?? id;
}

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

// Couleurs choisies par l'enseignant, par matière ou par intitulé d'emploi du
// temps (chargées des réglages au démarrage, partagées entre ses ordinateurs).
export const CLE_COULEURS_MATIERES = "matiereCouleursOverride";
let _matiereOverrides: Record<string, string> = {};
export function setMatiereOverrides(o: Record<string, string>) { _matiereOverrides = o || {}; }
export function getMatiereOverrides(): Record<string, string> { return _matiereOverrides; }

/** Couleur d'une matière ou d'un intitulé, hors choix de l'enseignant. */
export function couleurParDefaut(matiere: string): string {
  if (COULEURS_MATIERES[matiere]) return COULEURS_MATIERES[matiere];
  const palette = ["blue", "green", "orange", "purple", "red", "indigo", "teal", "pink", "cyan", "brown"];
  let h = 0;
  for (const ch of matiere) h = (h + ch.charCodeAt(0)) & 0x7fffffff;
  return palette[h % palette.length];
}

export function couleurPourMatiere(matiere: string): string {
  return _matiereOverrides[matiere] || couleurParDefaut(matiere);
}

/** Les choix de couleurs après en avoir choisi une pour `matiere` ; revenir à la couleur par défaut efface le choix. */
export function avecCouleurChoisie(choix: Record<string, string>, matiere: string, couleur: string): Record<string, string> {
  const suite = { ...choix };
  if (!couleur || couleur === couleurParDefaut(matiere)) delete suite[matiere];
  else suite[matiere] = couleur;
  return suite;
}

/**
 * Retient la couleur d'une matière ou d'un intitulé : tous ses créneaux la
 * prennent, dans l'emploi du temps comme dans le planning.
 */
export function choisirCouleurMatiere(matiere: string, couleur: string): Promise<void> {
  _matiereOverrides = avecCouleurChoisie(_matiereOverrides, matiere, couleur);
  return api.settingSet(CLE_COULEURS_MATIERES, JSON.stringify(_matiereOverrides));
}

/**
 * La teinte d'un créneau : celle de sa matière ou de son intitulé, choix de
 * l'enseignant compris. La couleur enregistrée sur le créneau ne sert qu'à
 * défaut de matière : elle date de sa création et ignorerait un choix fait
 * depuis.
 */
export function teinteCreneau(c: { matiere: string; couleur?: string }): string {
  return (c.matiere ? couleurHex[couleurPourMatiere(c.matiere)] : couleurHex[c.couleur ?? ""]) || couleurHex.blue;
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
