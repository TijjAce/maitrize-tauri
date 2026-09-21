//! Structs serde miroir des tables. `camelCase` côté JSON pour le frontend TS.
#![allow(non_snake_case)]

use rusqlite::Row;
use serde::{Deserialize, Serialize};

/// Génère un nouvel UUID v4 (chaîne).
pub fn new_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

/// Horodatage ISO 8601 (UTC).
pub fn now_iso() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Sequence {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub matiere: String,
    #[serde(default)]
    pub cycle: String,
    #[serde(default)]
    pub objectifs: String,
    #[serde(default)]
    pub competences: String,
    #[serde(default)]
    pub competence_visee: String,
    #[serde(default)]
    pub image_nom: Option<String>,
    #[serde(default = "default_blue")]
    pub couleur: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default = "un")]
    pub periode: i64,
    #[serde(default)]
    pub annee: String,
    #[serde(default)]
    pub rating_engagement: i64,
    #[serde(default)]
    pub rating_facilite: i64,
    #[serde(default)]
    pub rating_apprentissage: i64,
    #[serde(default)]
    pub rating_date_maj: Option<String>,
    #[serde(default)]
    pub projet_id: Option<String>,
    #[serde(default)]
    pub video: String,
    #[serde(default)]
    pub dossier: String,
    /// Combien de séances la séquence prévoit (0 : non précisé). Le cahier
    /// journal écrit alors « séance 3/6 ».
    #[serde(default)]
    pub nb_seances_prevu: i64,
}
fn default_blue() -> String { "blue".into() }
fn un() -> i64 { 1 }

impl Sequence {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            matiere: r.get("matiere")?,
            cycle: r.get("cycle")?,
            objectifs: r.get("objectifs")?,
            competences: r.get("competences")?,
            competence_visee: r.get("competence_visee")?,
            image_nom: r.get("image_nom")?,
            couleur: r.get("couleur")?,
            date_creation: r.get("date_creation")?,
            periode: r.get("periode")?,
            annee: r.get("annee")?,
            rating_engagement: r.get("rating_engagement")?,
            rating_facilite: r.get("rating_facilite")?,
            rating_apprentissage: r.get("rating_apprentissage")?,
            rating_date_maj: r.get("rating_date_maj")?,
            projet_id: r.get("projet_id")?,
            video: r.get("video")?,
            dossier: r.get("dossier").unwrap_or_default(),
            nb_seances_prevu: r.get("nb_seances_prevu").unwrap_or_default(),
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Seance {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default = "un")]
    pub numero: i64,
    #[serde(default)]
    pub objectifs: String,
    #[serde(default)]
    pub competences: String,
    #[serde(default)]
    pub deroulement: String,
    #[serde(default)]
    pub materiel: String,
    #[serde(default = "quarante_cinq")]
    pub duree: i64,
    #[serde(default)]
    pub date: Option<String>,
    #[serde(default = "vide_arr")]
    pub tableau_deroulement: String,
    #[serde(default = "vide_arr")]
    pub images_deroulement: String,
    #[serde(default)]
    pub bilan: String,
    #[serde(default)]
    pub bilan_date: Option<String>,
    #[serde(default)]
    pub sequence_id: Option<String>,
}
fn quarante_cinq() -> i64 { 45 }
fn vide_arr() -> String { "[]".into() }

impl Seance {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            numero: r.get("numero")?,
            objectifs: r.get("objectifs")?,
            competences: r.get("competences")?,
            deroulement: r.get("deroulement")?,
            materiel: r.get("materiel")?,
            duree: r.get("duree")?,
            date: r.get("date")?,
            tableau_deroulement: r.get("tableau_deroulement")?,
            images_deroulement: r.get("images_deroulement")?,
            bilan: r.get("bilan")?,
            bilan_date: r.get("bilan_date")?,
            sequence_id: r.get("sequence_id")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Creneau {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default = "now_iso")]
    pub date: String,
    #[serde(default)]
    pub heure_debut: String,
    #[serde(default)]
    pub heure_fin: String,
    #[serde(default)]
    pub matiere: String,
    #[serde(default = "default_blue")]
    pub couleur: String,
    #[serde(default)]
    pub seance_id: Option<String>,
    #[serde(default)]
    pub atelier_id: Option<String>,
    #[serde(default)]
    pub espace_id: Option<String>,
    /// Élèves présents sur ce créneau (JSON), pour les groupes restreints.
    #[serde(default = "vide_arr")]
    pub eleves_json: String,
    /// « classe » ou « reunion » (réunion, formation) : pour compter les heures.
    #[serde(default = "nature_classe")]
    pub nature: String,
    /// Cahier journal : ce qui est prévu sur ce créneau.
    #[serde(default)]
    pub prevu: String,
    /// Cahier journal : ce qui a été fait, et le bilan.
    #[serde(default)]
    pub bilan: String,
}
fn nature_classe() -> String { "classe".into() }

impl Creneau {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            date: r.get("date")?,
            heure_debut: r.get("heure_debut")?,
            heure_fin: r.get("heure_fin")?,
            matiere: r.get("matiere")?,
            couleur: r.get("couleur")?,
            seance_id: r.get("seance_id")?,
            atelier_id: r.get("atelier_id")?,
            espace_id: r.get("espace_id")?,
            eleves_json: r.get("eleves_json").unwrap_or_else(|_| "[]".into()),
            nature: r.get("nature")?,
            prevu: r.get("prevu")?,
            bilan: r.get("bilan")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Atelier {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default = "default_francais")]
    pub matiere: String,
    #[serde(default)]
    pub objectifs: String,
    #[serde(default)]
    pub competences: String,
    #[serde(default)]
    pub materiel: String,
    #[serde(default = "six")]
    pub nb_eleves_max: i64,
    #[serde(default = "trente")]
    pub duree: i64,
    #[serde(default = "default_blue")]
    pub couleur: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default)]
    pub image_nom: Option<String>,
    #[serde(default)]
    pub dossier: String,
}
fn default_francais() -> String { "Français".into() }
fn six() -> i64 { 6 }
fn trente() -> i64 { 30 }

impl Atelier {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            matiere: r.get("matiere")?,
            objectifs: r.get("objectifs")?,
            competences: r.get("competences")?,
            materiel: r.get("materiel")?,
            nb_eleves_max: r.get("nb_eleves_max")?,
            duree: r.get("duree")?,
            couleur: r.get("couleur")?,
            date_creation: r.get("date_creation")?,
            image_nom: r.get("image_nom")?,
            dossier: r.get("dossier")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Espace {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub description_espace: String,
    #[serde(default = "six")]
    pub nb_eleves_max: i64,
    #[serde(default = "default_teal")]
    pub couleur: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default)]
    pub image_nom: Option<String>,
    #[serde(default)]
    pub dossier: String,
}
fn default_teal() -> String { "teal".into() }

impl Espace {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            description_espace: r.get("description_espace")?,
            nb_eleves_max: r.get("nb_eleves_max")?,
            couleur: r.get("couleur")?,
            date_creation: r.get("date_creation")?,
            image_nom: r.get("image_nom")?,
            dossier: r.get("dossier")?,
        })
    }
}

/// Un fichier texte posé sur le plan de travail.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Texte {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub contenu: String,
    #[serde(default)]
    pub dossier: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default)]
    pub date_modification: String,
}

impl Texte {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            contenu: r.get("contenu")?,
            dossier: r.get("dossier")?,
            date_creation: r.get("date_creation")?,
            date_modification: r.get("date_modification")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Jeu {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub type_jeu: String,
    #[serde(default)]
    pub description_jeu: String,
    #[serde(default)]
    pub regles: String,
    #[serde(default)]
    pub competences: String,
    /// Compétences des programmes officiels (BO) que le jeu travaille, en JSON.
    #[serde(default = "vide_arr")]
    pub competences_bo: String,
    #[serde(default = "deux")]
    pub nb_joueurs_min: i64,
    #[serde(default = "quatre")]
    pub nb_joueurs_max: i64,
    #[serde(default = "vingt_min")]
    pub duree: i64,
    #[serde(default = "trois")]
    pub age_min: i64,
    /// Où le jeu est rangé — la question posée en premier quand on le cherche.
    #[serde(default)]
    pub rangement: String,
    #[serde(default = "default_purple")]
    pub couleur: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default)]
    pub image_nom: Option<String>,
    #[serde(default)]
    pub dossier: String,
}
fn deux() -> i64 { 2 }
fn quatre() -> i64 { 4 }
fn vingt_min() -> i64 { 20 }
fn trois() -> i64 { 3 }
fn default_purple() -> String { "purple".into() }

impl Jeu {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            type_jeu: r.get("type_jeu")?,
            description_jeu: r.get("description_jeu")?,
            regles: r.get("regles")?,
            competences: r.get("competences")?,
            // Colonne sans contrainte : une ligne venue d'une version plus
            // ancienne (synchronisation, restauration) n'en porte pas.
            competences_bo: r.get::<_, Option<String>>("competences_bo").ok().flatten().unwrap_or_else(|| "[]".into()),
            nb_joueurs_min: r.get("nb_joueurs_min")?,
            nb_joueurs_max: r.get("nb_joueurs_max")?,
            duree: r.get("duree")?,
            age_min: r.get("age_min")?,
            rangement: r.get("rangement")?,
            couleur: r.get("couleur")?,
            date_creation: r.get("date_creation")?,
            image_nom: r.get("image_nom")?,
            dossier: r.get("dossier")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProgressionEleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub nom_eleve: String,
    #[serde(default)]
    pub eleve_id: Option<String>,
    #[serde(default)]
    pub fait: bool,
    #[serde(default)]
    pub espace_id: Option<String>,
}

impl ProgressionEleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            nom_eleve: r.get("nom_eleve")?,
            eleve_id: r.get("eleve_id")?,
            fait: r.get::<_, i64>("fait")? != 0,
            espace_id: r.get("espace_id")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Eleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub nom: String,
    #[serde(default)]
    pub niveau: String,
    #[serde(default = "vrai")]
    pub present: bool,
    #[serde(default)]
    pub ine: String,
    #[serde(default)]
    pub date_naissance: String,
    #[serde(default)]
    pub photo_fichier: Option<String>,
}
fn vrai() -> bool { true }

impl Eleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            nom: r.get("nom")?,
            niveau: r.get("niveau")?,
            present: r.get::<_, i64>("present")? != 0,
            ine: r.get("ine")?,
            date_naissance: r.get("date_naissance")?,
            photo_fichier: r.get("photo_fichier")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AppelJournalier {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default = "now_iso")]
    pub date: String,
    #[serde(default = "present_str")]
    pub statut_brut: String,
    #[serde(default)]
    pub eleve_id: Option<String>,
}
fn present_str() -> String { "present".into() }

impl AppelJournalier {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            date: r.get("date")?,
            statut_brut: r.get("statut_brut")?,
            eleve_id: r.get("eleve_id")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CommentaireEleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default = "now_iso")]
    pub date: String,
    #[serde(default)]
    pub texte: String,
    #[serde(default = "divers")]
    pub r#type: String,
    #[serde(default)]
    pub eleve_id: Option<String>,
    /// Objectifs du PPI travaillés, en JSON : `[{"id":"…","reussite":"aide"}]`.
    ///
    /// Colonne ajoutée après coup, donc facultative : une base d'une version
    /// plus ancienne n'a rien à y mettre.
    #[serde(default)]
    pub objectifs: String,
}
fn divers() -> String { "divers".into() }

impl CommentaireEleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            date: r.get("date")?,
            texte: r.get("texte")?,
            r#type: r.get("type")?,
            eleve_id: r.get("eleve_id")?,
            objectifs: r.get::<_, Option<String>>("objectifs").unwrap_or_default().unwrap_or_default(),
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Evaluation {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub matiere: String,
    #[serde(default = "now_iso")]
    pub date: String,
    #[serde(default = "vingt")]
    pub bareme: f64,
    #[serde(default = "un")]
    pub periode: i64,
    #[serde(default = "note_str")]
    pub mode: String,
    #[serde(default = "vide_arr")]
    pub competences_json: String,
    #[serde(default)]
    pub pdf_nom_fichier: Option<String>,
}
fn vingt() -> f64 { 20.0 }
fn note_str() -> String { "note".into() }

impl Evaluation {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            matiere: r.get("matiere")?,
            date: r.get("date")?,
            bareme: r.get("bareme")?,
            periode: r.get("periode")?,
            mode: r.get("mode")?,
            competences_json: r.get("competences_json")?,
            pdf_nom_fichier: r.get("pdf_nom_fichier")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteEleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub eleve_nom: String,
    #[serde(default)]
    pub eleve_id: Option<String>,
    #[serde(default)]
    pub note: Option<f64>,
    #[serde(default)]
    pub absent: bool,
    #[serde(default)]
    pub commentaire: String,
    #[serde(default)]
    pub evaluation_id: Option<String>,
    #[serde(default = "vide_obj")]
    pub niveaux_json: String,
}
fn vide_obj() -> String { "{}".into() }

impl NoteEleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            eleve_nom: r.get("eleve_nom")?,
            eleve_id: r.get("eleve_id")?,
            note: r.get("note")?,
            absent: r.get::<_, i64>("absent")? != 0,
            commentaire: r.get("commentaire")?,
            evaluation_id: r.get("evaluation_id")?,
            niveaux_json: r.get("niveaux_json")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct MaterielItem {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub description_materiel: String,
    #[serde(default)]
    pub competence_id: String,
    #[serde(default)]
    pub competence_titre: String,
    #[serde(default)]
    pub domaine_titre: String,
    #[serde(default)]
    pub sous_domaine_titre: String,
    #[serde(default)]
    pub cycle: String,
    #[serde(default = "vide_arr")]
    pub images_json: String,
    #[serde(default = "vide_arr")]
    pub pdfs_json: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    // Lien optionnel vers la séance d'origine (matériel ajouté depuis une séance).
    #[serde(default)]
    pub seance_id: Option<String>,
    // Lien optionnel vers la séquence (matériel déposé au niveau de la séquence).
    #[serde(default)]
    pub sequence_id: Option<String>,
    #[serde(default)]
    pub dossier: String,
    #[serde(default = "vide_arr")]
    pub videos_json: String,
    #[serde(default = "vide_arr")]
    pub coffre_json: String,
}

impl MaterielItem {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            description_materiel: r.get("description_materiel")?,
            competence_id: r.get("competence_id")?,
            competence_titre: r.get("competence_titre")?,
            domaine_titre: r.get("domaine_titre")?,
            sous_domaine_titre: r.get("sous_domaine_titre")?,
            cycle: r.get("cycle")?,
            images_json: r.get("images_json")?,
            pdfs_json: r.get("pdfs_json")?,
            date_creation: r.get("date_creation")?,
            seance_id: r.get("seance_id").ok(),
            sequence_id: r.get("sequence_id").ok(),
            dossier: r.get("dossier").unwrap_or_default(),
            videos_json: r.get("videos_json").unwrap_or_else(|_| "[]".into()),
            coffre_json: r.get("coffre_json").unwrap_or_else(|_| "[]".into()),
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PapierEleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub intitule: String,
    #[serde(default)]
    pub eleve_id: String,
    #[serde(default = "coche")]
    pub r#type: String,
    #[serde(default)]
    pub nom_fichier: String,
    #[serde(default)]
    pub note: String,
    #[serde(default = "now_iso")]
    pub date_ajout: String,
}
fn coche() -> String { "coche".into() }

impl PapierEleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            intitule: r.get("intitule")?,
            eleve_id: r.get("eleve_id")?,
            r#type: r.get("type")?,
            nom_fichier: r.get("nom_fichier")?,
            note: r.get("note")?,
            date_ajout: r.get("date_ajout")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Referentiel {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub nom: String,
    #[serde(default)]
    pub cycle: String,
    #[serde(default)]
    pub donnees: String,
    #[serde(default)]
    pub est_integre: bool,
    #[serde(default = "now_iso")]
    pub date_ajout: String,
    #[serde(default = "vrai")]
    pub actif: bool,
}

impl Referentiel {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            nom: r.get("nom")?,
            cycle: r.get("cycle")?,
            donnees: r.get("donnees")?,
            est_integre: r.get::<_, i64>("est_integre")? != 0,
            date_ajout: r.get("date_ajout")?,
            actif: r.get::<_, i64>("actif")? != 0,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteCompetence {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub competence_ref_id: String,
    #[serde(default)]
    pub texte: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default = "now_iso")]
    pub date_modification: String,
}

impl NoteCompetence {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            competence_ref_id: r.get("competence_ref_id")?,
            texte: r.get("texte")?,
            date_creation: r.get("date_creation")?,
            date_modification: r.get("date_modification")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProgressionAnnuelle {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub annee: String,
    #[serde(default = "un")]
    pub periode: i64,
    #[serde(default = "vide_arr")]
    pub colonnes_json: String,
    #[serde(default = "vide_obj")]
    pub cellules_json: String,
}

impl ProgressionAnnuelle {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            annee: r.get("annee")?,
            periode: r.get("periode")?,
            colonnes_json: r.get("colonnes_json")?,
            cellules_json: r.get("cellules_json")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ProgrammationFinale {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub annee: String,
    #[serde(default = "vide_arr")]
    pub lignes_json: String,
    #[serde(default)]
    pub niveau: String,
    #[serde(default)]
    pub enseignant: String,
    #[serde(default)]
    pub est_importee: bool,
}

impl ProgrammationFinale {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            annee: r.get("annee")?,
            lignes_json: r.get("lignes_json")?,
            niveau: r.get("niveau")?,
            enseignant: r.get("enseignant")?,
            est_importee: r.get::<_, i64>("est_importee")? != 0,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DocumentEleve {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub eleve_id: String,
    /// « syntheseGS », « ppi », « gevasco », « progressions », « dispositif:pap »…
    #[serde(default)]
    pub type_doc: String,
    #[serde(default = "vide_obj")]
    pub donnees: String,
    #[serde(default)]
    pub date_maj: String,
}

impl DocumentEleve {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            eleve_id: r.get("eleve_id")?,
            type_doc: r.get("type")?,
            donnees: r.get("donnees")?,
            date_maj: r.get("date_maj")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct EdtTypique {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub annee: String,
    #[serde(default = "vide_arr")]
    pub slots_json: String,
}

impl EdtTypique {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            annee: r.get("annee")?,
            slots_json: r.get("slots_json")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PieceJointe {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub nom: String,
    #[serde(default)]
    pub r#type: String,
    #[serde(default)]
    pub nom_fichier: String,
    #[serde(default = "now_iso")]
    pub date_ajout: String,
    #[serde(default)]
    pub seance_id: Option<String>,
    #[serde(default)]
    pub a_imprimer: bool,
}

impl PieceJointe {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            nom: r.get("nom")?,
            r#type: r.get("type")?,
            nom_fichier: r.get("nom_fichier")?,
            date_ajout: r.get("date_ajout")?,
            seance_id: r.get("seance_id")?,
            a_imprimer: r.get::<_, i64>("a_imprimer")? != 0,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DocumentCoffre {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub nom: String,
    #[serde(default)]
    pub nom_fichier: String,
    #[serde(default)]
    pub taille_octets: i64,
    #[serde(default = "now_iso")]
    pub date_ajout: String,
}

impl DocumentCoffre {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            nom: r.get("nom")?,
            nom_fichier: r.get("nom_fichier")?,
            taille_octets: r.get("taille_octets")?,
            date_ajout: r.get("date_ajout")?,
        })
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct PiloteConversation {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default = "vide_arr")]
    pub messages_json: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default = "now_iso")]
    pub date_maj: String,
}

impl PiloteConversation {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            messages_json: r.get("messages_json")?,
            date_creation: r.get("date_creation")?,
            date_maj: r.get("date_maj")?,
        })
    }
}

/// Une réunion écoutée par l'application : ESS, équipe éducative, conseil de
/// cycle… Les tranches de cinq minutes (texte transcrit et résumé) vivent dans
/// `tranches_json` ; l'audio, lui, n'est jamais gardé.
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Reunion {
    #[serde(default = "new_id")]
    pub id: String,
    #[serde(default)]
    pub titre: String,
    /// La sorte de réunion, telle que l'enseignant l'a choisie (« ESS »…).
    #[serde(default)]
    pub genre: String,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub participants: String,
    #[serde(default = "vide_arr")]
    pub tranches_json: String,
    #[serde(default)]
    pub compte_rendu: String,
    /// Durée écoutée, en secondes.
    #[serde(default)]
    pub duree_s: i64,
    #[serde(default = "now_iso")]
    pub date_creation: String,
    #[serde(default = "now_iso")]
    pub date_maj: String,
}

impl Reunion {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            titre: r.get("titre")?,
            genre: r.get("genre")?,
            date: r.get("date")?,
            participants: r.get("participants")?,
            tranches_json: r.get("tranches_json")?,
            compte_rendu: r.get("compte_rendu")?,
            duree_s: r.get("duree_s")?,
            date_creation: r.get("date_creation")?,
            date_maj: r.get("date_maj")?,
        })
    }
}

/// Un outil pour l'élève (bande numérique, sous-main, casque…) ou un affichage
/// de la classe (référentiel, règles de vie…).
#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct OutilClasse {
    #[serde(default = "new_id")]
    pub id: String,
    /// « outil » ou « affichage ».
    #[serde(default = "genre_outil")]
    pub genre: String,
    #[serde(default)]
    pub titre: String,
    #[serde(default)]
    pub categorie: String,
    /// À quoi il sert, ce qu'il travaille.
    #[serde(default)]
    pub usage: String,
    /// Compétences des programmes officiels (BO), en JSON.
    #[serde(default = "vide_arr")]
    pub competences_bo: String,
    /// Comment s'en servir, ou ce qu'il faut savoir de l'affichage.
    #[serde(default)]
    pub consignes: String,
    /// Où il est rangé (outil), où il est affiché (affichage).
    #[serde(default)]
    pub lieu: String,
    /// Quand l'affichage est au mur.
    #[serde(default)]
    pub periode: String,
    /// Élèves qui s'en servent, en JSON.
    #[serde(default = "vide_arr")]
    pub eleves_json: String,
    /// Documents à imprimer : [{ nom, fichier }], en JSON.
    #[serde(default = "vide_arr")]
    pub documents_json: String,
    #[serde(default)]
    pub image_nom: Option<String>,
    #[serde(default = "couleur_teal")]
    pub couleur: String,
    #[serde(default)]
    pub dossier: String,
    #[serde(default = "now_iso")]
    pub date_creation: String,
}
fn genre_outil() -> String { "outil".into() }
fn couleur_teal() -> String { "teal".into() }

impl OutilClasse {
    pub fn from_row(r: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: r.get("id")?,
            genre: r.get("genre")?,
            titre: r.get("titre")?,
            categorie: r.get("categorie")?,
            usage: r.get("usage")?,
            competences_bo: r.get("competences_bo")?,
            consignes: r.get("consignes")?,
            lieu: r.get("lieu")?,
            periode: r.get("periode")?,
            eleves_json: r.get("eleves_json")?,
            documents_json: r.get("documents_json")?,
            image_nom: r.get("image_nom")?,
            couleur: r.get("couleur")?,
            dossier: r.get("dossier")?,
            date_creation: r.get("date_creation")?,
        })
    }
}
