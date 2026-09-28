//! Convertit une feuille HTML en PDF avec la machinerie de l'application, sans
//! ouvrir l'application : de quoi juger le rendu.
//!
//!   cargo run --example feuille_pdf -- feuille.html sortie.pdf
fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!("usage : feuille_pdf entree.html sortie.pdf");
        std::process::exit(2);
    }
    let sortie = std::path::PathBuf::from(&args[2]);
    let html = std::fs::read_to_string(&args[1]).expect("la feuille se lit");
    let mut contexte = tauri::generate_context!();
    // Pas de fenêtre principale : seule la fenêtre invisible d'impression.
    contexte.config_mut().app.windows.clear();
    tauri::Builder::default()
        .register_uri_scheme_protocol(maitrize_tauri_lib::feuille_pdf::PROTOCOLE, maitrize_tauri_lib::feuille_pdf::servir)
        .manage(maitrize_tauri_lib::feuille_pdf::Feuilles::default())
        .setup(move |app| {
            let poignee = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let resultat = maitrize_tauri_lib::feuille_pdf::ecrire_pdf(&poignee, html, sortie).await;
                match &resultat {
                    Ok(()) => println!("PDF écrit"),
                    Err(e) => eprintln!("ÉCHEC : {e}"),
                }
                poignee.exit(if resultat.is_ok() { 0 } else { 1 });
            });
            Ok(())
        })
        .run(contexte)
        .expect("l'application d'essai démarre");
}
