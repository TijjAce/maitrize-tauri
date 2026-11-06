// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

//! Le format ouvert des tableaux (Open Board Format, « .obz »), dans les deux sens.
//!
//! Rust ne fait ici que l'archive : l'ouvrir en fichiers, ou la refaire de
//! fichiers. Ce que disent les tableaux — boutons, grilles, liens — se lit et
//! s'écrit dans la page (`src/obz.ts`), comme Maitrize l'écrit
//! (`tla_obz.rs`). Un classeur exporté est posé dans le dossier Documents de
//! l'application, que l'app Fichiers montre : de là, il part par AirDrop vers
//! l'ordinateur.

use super::stockage::ecrire_sur;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::collections::HashMap;
use std::io::{Cursor, Read, Write};
use tauri::{AppHandle, Manager, Runtime};

/// Une archive ouverte : ses fichiers de texte (le manifeste, les tableaux) tels quels, ses images en base64.
#[derive(serde::Serialize, serde::Deserialize, Default, Debug)]
pub struct Fichiers {
    pub textes: HashMap<String, String>,
    pub images: HashMap<String, String>,
}

/// Au plus : de quoi refuser une archive démesurée sans la lire en entier.
const TAILLE_MAX: u64 = 200 * 1024 * 1024;

pub(crate) fn ouvrir(octets: &[u8]) -> Result<Fichiers, String> {
    let mut archive = zip::ZipArchive::new(Cursor::new(octets)).map_err(|e| format!("Ce n'est pas un classeur .obz : {e}"))?;
    let mut f = Fichiers::default();
    let mut total = 0u64;
    for i in 0..archive.len() {
        let mut fichier = archive.by_index(i).map_err(|e| e.to_string())?;
        if fichier.is_dir() {
            continue;
        }
        total += fichier.size();
        if total > TAILLE_MAX {
            return Err("Ce classeur est trop lourd pour être ouvert.".into());
        }
        let nom = fichier.name().map_err(|e| e.to_string())?.trim_start_matches("./").to_string();
        let mut octets = Vec::new();
        fichier.read_to_end(&mut octets).map_err(|e| e.to_string())?;
        let minuscule = nom.to_lowercase();
        if minuscule.ends_with(".json") || minuscule.ends_with(".obf") {
            f.textes.insert(nom, String::from_utf8_lossy(&octets).into_owned());
        } else if [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].iter().any(|x| minuscule.ends_with(x)) {
            f.images.insert(nom, STANDARD.encode(&octets));
        }
    }
    Ok(f)
}

pub(crate) fn refaire(fichiers: &Fichiers) -> Result<Vec<u8>, String> {
    let mut zip = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let options = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let mut noms: Vec<&String> = fichiers.textes.keys().collect();
    noms.sort();
    for nom in noms {
        zip.start_file(nom.as_str(), options).map_err(|e| e.to_string())?;
        zip.write_all(fichiers.textes[nom].as_bytes()).map_err(|e| e.to_string())?;
    }
    let mut images: Vec<&String> = fichiers.images.keys().collect();
    images.sort();
    for nom in images {
        let b64 = fichiers.images[nom].split_once(',').map(|(_, b)| b).unwrap_or(&fichiers.images[nom]);
        let octets = STANDARD.decode(b64.trim()).map_err(|e| format!("Image {nom} illisible : {e}"))?;
        zip.start_file(nom.as_str(), options).map_err(|e| e.to_string())?;
        zip.write_all(&octets).map_err(|e| e.to_string())?;
    }
    Ok(zip.finish().map_err(|e| e.to_string())?.into_inner())
}

/// Ouvre un classeur .obz reçu (en base64) : ses fichiers, pour que la page les lise.
#[tauri::command]
pub async fn obz_ouvrir(donnees: String) -> Result<Fichiers, String> {
    let b64 = donnees.split_once(',').map(|(_, b)| b).unwrap_or(&donnees);
    let octets = STANDARD.decode(b64.trim()).map_err(|e| format!("Fichier illisible : {e}"))?;
    ouvrir(&octets)
}

/// Un nom de fichier sans ce qu'un système refuse.
fn nom_de_fichier(nom: &str) -> String {
    let propre: String = nom
        .chars()
        .map(|c| if c.is_alphanumeric() || " -_'().".contains(c) { c } else { '-' })
        .collect();
    let propre = propre.trim().trim_matches('.').to_string();
    if propre.is_empty() { "Classeur".into() } else { propre.chars().take(80).collect() }
}

/// Écrit le classeur exporté dans les Documents de l'application, visibles dans l'app Fichiers. Rend son nom.
#[tauri::command]
pub async fn obz_enregistrer<R: Runtime>(app: AppHandle<R>, nom: String, fichiers: Fichiers) -> Result<String, String> {
    let octets = refaire(&fichiers)?;
    let dossier = app.path().document_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dossier).map_err(|e| e.to_string())?;
    let nom = format!("{}.obz", nom_de_fichier(&nom));
    ecrire_sur(&dossier.join(&nom), &octets)?;
    Ok(nom)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn une_archive_qui_ment_sur_sa_taille_est_refusee() {
        // 201 Mo de zéros, que le répertoire de l'archive annonce comme 1 octet : zip refuse d'en lire plus.
        let mut octets = Vec::new();
        {
            let mut z = zip::ZipWriter::new(Cursor::new(&mut octets));
            let reglages = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
            z.start_file("bombe.json", reglages).unwrap();
            let bloc = vec![0u8; 1024 * 1024];
            for _ in 0..201 {
                z.write_all(&bloc).unwrap();
            }
            z.finish().unwrap();
        }
        let debut = octets.windows(4).rposition(|f| f == b"PK\x01\x02").unwrap();
        octets[debut + 24..debut + 28].copy_from_slice(&1u32.to_le_bytes());
        assert!(ouvrir(&octets).is_err());
    }

    #[test]
    fn une_archive_refaite_se_rouvre_a_l_identique() {
        let mut f = Fichiers::default();
        f.textes.insert("manifest.json".into(), r#"{"format":"open-board-0.1","root":"boards/page1.obf"}"#.into());
        f.textes.insert("boards/page1.obf".into(), r#"{"id":"page1","buttons":[]}"#.into());
        f.images.insert("images/image1.png".into(), format!("data:image/png;base64,{}", STANDARD.encode([0x89, b'P', b'N', b'G', 1, 2, 3])));
        let octets = refaire(&f).unwrap();
        let relue = ouvrir(&octets).unwrap();
        assert_eq!(relue.textes["manifest.json"], f.textes["manifest.json"]);
        assert_eq!(relue.textes["boards/page1.obf"], f.textes["boards/page1.obf"]);
        assert_eq!(STANDARD.decode(&relue.images["images/image1.png"]).unwrap(), vec![0x89, b'P', b'N', b'G', 1, 2, 3]);
    }

    #[test]
    fn un_fichier_qui_n_est_pas_une_archive_est_refuse() {
        assert!(ouvrir(b"pas une archive").is_err());
    }

    #[test]
    fn un_nom_de_fichier_reste_sage() {
        assert_eq!(nom_de_fichier("Mon classeur (été)"), "Mon classeur (été)");
        assert_eq!(nom_de_fichier("a/b:c"), "a-b-c");
        assert_eq!(nom_de_fichier("..."), "Classeur");
    }
}
