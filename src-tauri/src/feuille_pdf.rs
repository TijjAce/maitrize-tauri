//! Une feuille HTML devient un PDF, sans passer par l'imprimante.
//!
//! Les feuilles de Fabriquer sont des pages HTML : c'est le navigateur qui
//! les met en page et les imprime. Pour les ranger sur le bureau de
//! l'application, il faut le même rendu dans un fichier. Sur macOS, WebKit
//! sait imprimer une page web dans un PDF : une fenêtre invisible charge la
//! feuille — servie par le protocole `feuille://` —, et son impression
//! part dans un fichier au lieu d'une imprimante, paginée, avec les styles
//! d'impression de la feuille.
//!
//! Ailleurs que sur Mac, la commande le dit : la feuille s'imprime toujours
//! par le navigateur, et le PDF enregistré là se dépose sur le bureau.

use std::collections::HashMap;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, Runtime};

/// Les feuilles en attente d'impression, par identifiant : le protocole les sert.
#[derive(Default)]
pub struct Feuilles(pub Mutex<HashMap<String, String>>);

/// Le nom du protocole qui sert les feuilles à la fenêtre invisible.
pub const PROTOCOLE: &str = "feuille";

/// Répond au protocole `feuille://localhost/<id>.html` : la feuille, ou rien.
pub fn servir<R: Runtime>(ctx: tauri::UriSchemeContext<'_, R>, requete: tauri::http::Request<Vec<u8>>) -> tauri::http::Response<Vec<u8>> {
    let id = requete.uri().path().trim_start_matches('/').trim_end_matches(".html").to_string();
    let html = ctx.app_handle().state::<Feuilles>().0.lock().ok().and_then(|f| f.get(&id).cloned());
    match html {
        Some(html) => tauri::http::Response::builder()
            .status(200)
            .header("Content-Type", "text/html; charset=utf-8")
            .body(html.into_bytes())
            .unwrap_or_else(|_| tauri::http::Response::new(Vec::new())),
        None => tauri::http::Response::builder().status(404).body(Vec::new()).unwrap_or_else(|_| tauri::http::Response::new(Vec::new())),
    }
}

/// Une feuille en paysage se reconnaît à sa règle `@page`.
pub fn est_en_paysage(html: &str) -> bool {
    html.contains("size: A4 landscape") || html.contains("size:A4 landscape") || html.contains("size: landscape")
}

/// Le PDF d'une feuille HTML, écrit dans `sortie`.
///
/// La fenêtre est créée invisible, la feuille chargée par le protocole ; à la
/// fin du chargement, WebKit l'imprime dans le fichier. Le tout attend au
/// plus trente secondes.
#[cfg(target_os = "macos")]
pub async fn ecrire_pdf(app: &AppHandle, html: String, sortie: std::path::PathBuf) -> Result<(), String> {
    use std::sync::mpsc;
    use tauri::webview::PageLoadEvent;
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let paysage = est_en_paysage(&html);
    let id = uuid::Uuid::new_v4().to_string();
    app.state::<Feuilles>().0.lock().map_err(|_| "feuilles verrouillées".to_string())?.insert(id.clone(), html);

    let url = url::Url::parse(&format!("{PROTOCOLE}://localhost/{id}.html")).map_err(|e| e.to_string())?;
    // Un canal synchrone : la fermeture de page doit pouvoir être partagée entre fils.
    let (envoi, reception) = mpsc::sync_channel::<Result<(), String>>(1);
    let chemin = sortie.clone();
    let etiquette = format!("feuille-{id}");
    let fenetre = WebviewWindowBuilder::new(app, &etiquette, WebviewUrl::CustomProtocol(url))
        .title("Impression")
        .visible(false)
        .inner_size(900.0, 1200.0)
        .on_page_load(move |fenetre, charge| {
            if !matches!(charge.event(), PageLoadEvent::Finished) {
                return;
            }
            let envoi = envoi.clone();
            let chemin = chemin.clone();
            let _ = fenetre.with_webview(move |vue| {
                // SAFETY : on est sur le fil principal, avec le WKWebView de cette fenêtre.
                let resultat = unsafe { imprimer_dans(vue.inner().cast(), &chemin, paysage) };
                let _ = envoi.send(resultat);
            });
        })
        .build()
        .map_err(|e| format!("fenêtre d'impression : {e}"))?;

    let attente = tauri::async_runtime::spawn_blocking(move || reception.recv_timeout(std::time::Duration::from_secs(30)));
    let resultat = match attente.await {
        Ok(Ok(r)) => r,
        Ok(Err(_)) => Err("La feuille n'a pas fini de se charger.".into()),
        Err(e) => Err(e.to_string()),
    };
    resultat?;
    // L'impression peut finir d'écrire après avoir rendu la main : on attend
    // que le fichier existe et cesse de grossir.
    let mut taille = None;
    for _ in 0..150 {
        let actuelle = std::fs::metadata(&sortie).ok().map(|m| m.len()).filter(|&n| n > 0);
        if actuelle.is_some() && actuelle == taille {
            break;
        }
        taille = actuelle;
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    }
    let _ = fenetre.close();
    if let Ok(mut f) = app.state::<Feuilles>().0.lock() {
        f.remove(&id);
    }
    if !sortie.exists() {
        return Err("Le PDF n'a pas été écrit.".into());
    }
    Ok(())
}

#[cfg(not(target_os = "macos"))]
pub async fn ecrire_pdf(_app: &AppHandle, _html: String, _sortie: std::path::PathBuf) -> Result<(), String> {
    Err("L'enregistrement en PDF n'est disponible que sur Mac pour l'instant : imprimez la feuille, enregistrez-la en PDF, puis déposez-la sur le bureau.".into())
}

/// Imprime la page du WKWebView dans un fichier PDF, sans panneau.
///
/// Les marges viennent de la feuille elle-même (`@page`), que WebKit honore :
/// celles de l'impression sont mises à zéro.
#[cfg(target_os = "macos")]
unsafe fn imprimer_dans(vue: *mut objc2_web_kit::WKWebView, chemin: &std::path::Path, paysage: bool) -> Result<(), String> {
    use objc2::msg_send;
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{
        NSPaperOrientation, NSPrintAllPages, NSPrintFirstPage, NSPrintInfo, NSPrintJobSavingURL, NSPrintLastPage, NSPrintSaveJob,
    };
    use objc2_foundation::{NSCopying, NSNumber, NSPoint, NSRect, NSSize, NSString, NSURL};

    /// Aucune feuille n'a autant de pages : au-delà, c'est WebKit qui tourne en rond.
    const PAGES_MAX: i64 = 300;

    if vue.is_null() {
        return Err("pas de vue web".into());
    }
    let vue = &*vue;
    let info = NSPrintInfo::sharedPrintInfo().copy();
    info.setPaperSize(NSSize::new(595.276, 841.89));
    info.setOrientation(if paysage { NSPaperOrientation::Landscape } else { NSPaperOrientation::Portrait });
    info.setTopMargin(0.0);
    info.setBottomMargin(0.0);
    info.setLeftMargin(0.0);
    info.setRightMargin(0.0);
    info.setHorizontallyCentered(false);
    info.setVerticallyCentered(false);
    info.setJobDisposition(NSPrintSaveJob);
    let cible = NSURL::fileURLWithPath(&NSString::from_str(&chemin.to_string_lossy()));
    let dictionnaire = info.dictionary();
    let poser = |cle: &NSString, valeur: &AnyObject| {
        let _: () = msg_send![&*dictionnaire, setObject: valeur, forKey: cle];
    };
    poser(NSPrintJobSavingURL, &cible);
    // Garde-fou : une impression qui n'en finit pas remplirait le disque.
    poser(NSPrintAllPages, &NSNumber::new_bool(false));
    poser(NSPrintFirstPage, &NSNumber::new_i64(1));
    poser(NSPrintLastPage, &NSNumber::new_i64(PAGES_MAX));

    let operation = vue.printOperationWithPrintInfo(&info);
    // La vue d'impression de WebKit naît sans dimensions : sans cadre, elle
    // découpe des pages à l'infini.
    if let Some(vue_impression) = operation.view() {
        vue_impression.setFrame(NSRect::new(NSPoint::new(0.0, 0.0), info.paperSize()));
    }
    operation.setShowsPrintPanel(false);
    operation.setShowsProgressPanel(false);
    operation.setCanSpawnSeparateThread(true);
    // Lancée en modal sur sa fenêtre — invisible —, l'opération laisse WebKit
    // compter ses pages avant de les dessiner. Lancée en synchrone, il rend
    // des pages vides sans fin « en attendant » le compte. L'écriture finit
    // après le retour : l'appelant attend le fichier.
    let fenetre = vue.window().ok_or_else(|| "pas de fenêtre".to_string())?;
    operation.runOperationModalForWindow_delegate_didRunSelector_contextInfo(&fenetre, None, None, std::ptr::null_mut());
    Ok(())
}

/// La commande : la feuille en PDF, rangée dans les fichiers de l'application.
/// Renvoie le nom du fichier, à mettre dans un matériel du bureau.
#[tauri::command(async)]
pub async fn feuille_en_pdf(app: AppHandle, html: String) -> Result<String, String> {
    let nom = format!("{}.pdf", uuid::Uuid::new_v4());
    let sortie = crate::db::fichiers_dir().join(&nom);
    ecrire_pdf(&app, html, sortie).await?;
    Ok(nom)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn le_paysage_se_lit_dans_la_regle_page() {
        assert!(est_en_paysage("<style>@page { size: A4 landscape; margin: 10mm; }</style>"));
        assert!(!est_en_paysage("<style>@page { size: A4; margin: 14mm; }</style>"));
        assert!(!est_en_paysage(""));
    }
}
