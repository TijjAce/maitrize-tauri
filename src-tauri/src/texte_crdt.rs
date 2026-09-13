//! Fusion des textes longs, caractère par caractère.
//!
//! La fusion champ par champ règle les modifications qui portent sur des
//! champs différents. Elle ne règle pas le cas où deux machines écrivent dans
//! **le même** champ : là, le plus récent gagnait et l'autre travail
//! disparaissait. Sur un déroulé de séance rédigé le soir de chaque côté,
//! c'est une perte réelle.
//!
//! Ce module confie ces champs à un CRDT de texte (Yjs, via `yrs`). Deux
//! insertions à des endroits différents du même paragraphe coexistent ; deux
//! réécritures du même passage sont ordonnées de façon identique sur les deux
//! machines, sans arbitrage central.
//!
//! ## Ce qui n'y passe pas
//!
//! Les champs qui contiennent du JSON — `documents_eleve.donnees`, les
//! déroulés structurés, les grilles — en sont exclus. Fusionner deux JSON
//! caractère par caractère produirait du JSON invalide : un accolade de l'un
//! au milieu d'un tableau de l'autre. Ils restent en fusion champ par champ,
//! qui est correcte pour eux.

use std::collections::HashMap;
use yrs::updates::decoder::Decode;
use yrs::updates::encoder::Encode;
use yrs::{Doc, GetString, ReadTxn, StateVector, Text, TextRef, Transact, Update};

/// Champs rédigés en prose, confiés au CRDT.
///
/// Liste explicite plutôt que détection automatique : un champ ajouté au
/// hasard dans cette liste alors qu'il contient du JSON casserait les données
/// sans avertissement. On nomme donc ce qu'on sait être du texte libre.
pub const CHAMPS_TEXTE: &[(&str, &str)] = &[
    ("seances", "deroulement"),
    ("seances", "bilan"),
    ("seances", "objectifs"),
    ("seances", "materiel"),
    ("sequences", "objectifs"),
    ("sequences", "competence_visee"),
    ("projets", "descriptif"),
    ("commentaires_eleve", "texte"),
    ("ateliers", "objectifs"),
    ("ateliers", "materiel"),
    ("espaces", "description_espace"),
    ("jeux", "description_jeu"),
    ("jeux", "regles"),
    ("materiel_items", "description_materiel"),
    ("papiers_eleve", "note"),
    ("textes", "contenu"),
    ("creneaux", "prevu"),
    ("creneaux", "bilan"),
];

pub fn est_texte_libre(table: &str, champ: &str) -> bool {
    CHAMPS_TEXTE.iter().any(|(t, c)| *t == table && *c == champ)
}

/// Le nom sous lequel le texte vit dans le document Yjs.
const RACINE: &str = "t";

fn doc_depuis(etat: &[u8]) -> Doc {
    let doc = Doc::new();
    if !etat.is_empty() {
        if let Ok(maj) = Update::decode_v1(etat) {
            if let Ok(mut tx) = doc.try_transact_mut() {
                let _ = tx.apply_update(maj);
            }
        }
    }
    doc
}

fn texte_de(doc: &Doc) -> String {
    let texte = doc.get_or_insert_text(RACINE);
    let tx = doc.transact();
    texte.get_string(&tx)
}

/// Applique au document l'édition qui mène de `avant` à `apres`.
///
/// On ne dispose pas des frappes réelles, seulement des deux versions. Le
/// préfixe et le suffixe communs sont donc retirés, et ce qui reste au milieu
/// est traité comme un remplacement. C'est une approximation : une phrase
/// déplacée passe pour une suppression suivie d'une insertion. Mais elle est
/// exacte pour le geste courant — écrire à un endroit — qui est justement
/// celui que la fusion doit préserver.
pub fn enregistrer_edition(etat: &[u8], avant: &str, apres: &str) -> Vec<u8> {
    let doc = doc_depuis(etat);
    let avant_doc = texte_de(&doc);
    // Le document fait foi ; si l'état local a divergé, on part de lui.
    let base = if avant_doc.is_empty() && !avant.is_empty() { avant } else { &avant_doc };
    if base == apres {
        return etat.to_vec();
    }

    // Positions en octets : c'est l'unité de `yrs` par défaut. Compter en
    // caractères décalerait tout d'un octet par lettre accentuée — « à garder »
    // devenait « à gardeer ».
    let (prefixe, suffixe) = bornes_communes(base, apres);
    let supprimes = base.len().saturating_sub(prefixe + suffixe);
    let insere = &apres[prefixe..apres.len().saturating_sub(suffixe)];

    // La racine s'obtient du document, pas de la transaction ; elle doit
    // vivre aussi longtemps que lui, d'où sa création avant la transaction.
    let texte: TextRef = doc.get_or_insert_text(RACINE);
    {
        let mut tx = doc.transact_mut();
        if supprimes > 0 {
            texte.remove_range(&mut tx, prefixe as u32, supprimes as u32);
        }
        if !insere.is_empty() {
            texte.insert(&mut tx, prefixe as u32, insere);
        }
    }
    let sortie = doc.transact().encode_state_as_update_v1(&StateVector::default());
    drop(texte);
    sortie
}

/// Longueurs du préfixe et du suffixe communs, **en octets**.
///
/// Les bornes sont ramenées sur une frontière de caractère : couper au milieu
/// d'un « é » produirait deux demi-octets et un texte illisible.
fn bornes_communes(a: &str, b: &str) -> (usize, usize) {
    let (oa, ob) = (a.as_bytes(), b.as_bytes());
    let mut p = 0;
    while p < oa.len() && p < ob.len() && oa[p] == ob[p] {
        p += 1;
    }
    while p > 0 && !a.is_char_boundary(p) {
        p -= 1;
    }
    let mut s = 0;
    while s < oa.len() - p && s < ob.len() - p && oa[oa.len() - 1 - s] == ob[ob.len() - 1 - s] {
        s += 1;
    }
    while s > 0 && (!a.is_char_boundary(a.len() - s) || !b.is_char_boundary(b.len() - s)) {
        s -= 1;
    }
    (p, s)
}

/// Fusionne deux états et renvoie l'état commun plus le texte qui en résulte.
///
/// L'ordre des deux arguments n'a pas d'importance : c'est la propriété qui
/// fait tout l'intérêt d'un CRDT, et c'est ce qui garantit que les deux
/// machines aboutissent au même texte sans se parler.
pub fn fusionner(a: &[u8], b: &[u8]) -> (Vec<u8>, String) {
    let doc = doc_depuis(a);
    if !b.is_empty() {
        if let Ok(maj) = Update::decode_v1(b) {
            if let Ok(mut tx) = doc.try_transact_mut() {
                let _ = tx.apply_update(maj);
            }
        }
    }
    let etat = doc.transact().encode_state_as_update_v1(&StateVector::default());
    (etat, texte_de(&doc))
}

/// Le texte que porte un état, sans rien fusionner.
pub fn texte(etat: &[u8]) -> String {
    texte_de(&doc_depuis(etat))
}

/// États CRDT d'une ligne, par champ. Voyage avec le changement.
pub type EtatsTexte = HashMap<String, Vec<u8>>;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn un_texte_ecrit_se_relit() {
        let etat = enregistrer_edition(&[], "", "Bonjour la classe");
        assert_eq!(texte(&etat), "Bonjour la classe");
    }

    #[test]
    fn une_edition_successive_sempile() {
        let e1 = enregistrer_edition(&[], "", "Bonjour");
        let e2 = enregistrer_edition(&e1, "Bonjour", "Bonjour la classe");
        assert_eq!(texte(&e2), "Bonjour la classe");
    }

    #[test]
    fn deux_ajouts_a_des_endroits_differents_coexistent() {
        // Le cœur de l'affaire : avec la fusion par champ, l'un des deux
        // ajouts écrasait l'autre. Ici les deux doivent survivre.
        let commun = enregistrer_edition(&[], "", "Phase 1.\nPhase 2.");
        let bureau = enregistrer_edition(&commun, "Phase 1.\nPhase 2.", "Phase 1 : rituel.\nPhase 2.");
        let portable = enregistrer_edition(&commun, "Phase 1.\nPhase 2.", "Phase 1.\nPhase 2 : ateliers.");
        let (_, texte_final) = fusionner(&bureau, &portable);
        assert!(texte_final.contains("rituel"), "l'ajout du bureau doit survivre : {texte_final}");
        assert!(texte_final.contains("ateliers"), "celui du portable aussi : {texte_final}");
    }

    #[test]
    fn la_fusion_donne_le_meme_texte_dans_les_deux_sens() {
        // Sans cette propriété, les deux machines afficheraient deux textes
        // différents en se croyant synchronisées.
        let commun = enregistrer_edition(&[], "", "Séance de lecture.");
        let a = enregistrer_edition(&commun, "Séance de lecture.", "Séance de lecture partagée.");
        let b = enregistrer_edition(&commun, "Séance de lecture.", "Longue séance de lecture.");
        let (_, ab) = fusionner(&a, &b);
        let (_, ba) = fusionner(&b, &a);
        assert_eq!(ab, ba);
    }

    #[test]
    fn fusionner_deux_fois_ne_duplique_rien() {
        let commun = enregistrer_edition(&[], "", "texte");
        let a = enregistrer_edition(&commun, "texte", "texte long");
        let (une, t1) = fusionner(&a, &commun);
        let (_, t2) = fusionner(&une, &a);
        assert_eq!(t1, t2, "réappliquer un état déjà fusionné doit être sans effet");
        assert_eq!(t2, "texte long");
    }

    #[test]
    fn une_suppression_se_propage() {
        let e1 = enregistrer_edition(&[], "", "à garder et à retirer");
        let e2 = enregistrer_edition(&e1, "à garder et à retirer", "à garder");
        assert_eq!(texte(&e2), "à garder");
    }

    #[test]
    fn les_accents_ne_decalent_pas_les_positions() {
        // Yjs compte en unités UTF-16, Rust en octets : confondre les deux
        // couperait un mot accentué en plein milieu.
        let e1 = enregistrer_edition(&[], "", "élève très éveillé");
        let e2 = enregistrer_edition(&e1, "élève très éveillé", "élève très éveillé et curieux");
        assert_eq!(texte(&e2), "élève très éveillé et curieux");
    }

    #[test]
    fn le_json_nest_pas_confie_au_crdt() {
        assert!(est_texte_libre("seances", "deroulement"));
        assert!(!est_texte_libre("documents_eleve", "donnees"));
        assert!(!est_texte_libre("seances", "tableau_deroulement"));
    }

    #[test]
    fn bornes_communes_reperent_le_milieu_modifie() {
        assert_eq!(bornes_communes("abcdef", "abXYef"), (2, 2));
        assert_eq!(bornes_communes("abc", "abc"), (3, 0));
        assert_eq!(bornes_communes("", "neuf"), (0, 0));
        // « é » pèse deux octets : la borne ne doit pas tomber entre les deux.
        let (p, s) = bornes_communes("élève sage", "élève très sage");
        assert!("élève sage".is_char_boundary(p) && "élève sage".is_char_boundary(10 - s));
    }
}

#[cfg(test)]
mod tests_schema {
    use super::CHAMPS_TEXTE;

    /// Une colonne mal nommée ne provoque aucune erreur : le CRDT ne s'y
    /// applique simplement jamais, et la fusion de ce champ retombe en
    /// silence sur « le plus récent gagne ». Deux entrées l'ont été.
    /// Ce test relit le schéma que l'application crée vraiment.
    #[test]
    fn les_champs_de_prose_existent_dans_le_schema() {
        let c = rusqlite::Connection::open_in_memory().unwrap();
        crate::db::migrer_pour_test(&c);
        for (table, champ) in CHAMPS_TEXTE {
            let cols: Vec<String> = {
                let mut st = c.prepare(&format!("PRAGMA table_info({table})")).unwrap();
                let v = st.query_map([], |r| r.get::<_, String>(1)).unwrap().flatten().collect();
                v
            };
            assert!(!cols.is_empty(), "table « {table} » inconnue");
            assert!(cols.iter().any(|x| x == champ),
                    "colonne « {table}.{champ} » absente ; colonnes : {cols:?}");
        }
    }
}
