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
/// À côté, pour chacune, de quoi prévenir qu'elle est prête à imprimer (voir `prete_a_imprimer`).
#[derive(Default)]
pub struct Feuilles(pub Mutex<HashMap<String, String>>, pub Mutex<HashMap<String, std::sync::mpsc::SyncSender<()>>>);

/// Le nom du protocole qui sert les feuilles à la fenêtre invisible.
pub const PROTOCOLE: &str = "feuille";

/// Imprimée par WebKit, une page compte 1 px CSS pour 0,8 point — 1/72 de
/// pouce réduit de 1,25 —, au lieu des 0,75 point d'un écran à 96 points par
/// pouce : tout sortait 6,7 % trop grand, et les feuilles calculées au
/// millimètre débordaient sur une page de plus. Un zoom de la feuille rend
/// aux millimètres leur taille ; l'échelle de l'impression, elle, faussait
/// le découpage des pages, que WebKit calcule avant de la lui appliquer.
/// Le document imprimable (`print.ts`) pose le même zoom pour Safari : les
/// deux règles portent sur la même propriété du même élément, elles ne
/// s'additionnent pas.
pub const ZOOM_WEBKIT: f64 = 0.75 / 0.8;

/// La feuille telle que WebKit doit l'imprimer : ramenée à sa taille (voir
/// `ZOOM_WEBKIT`), et qui prévient quand elle est prête — chargée, ses
/// images décodées : imprimée avant, une image encore en cours de décodage
/// sort blanche —, en appelant `feuille://localhost/<id>.pret`.
pub fn prete_a_imprimer(html: &str, id: &str) -> String {
    let style = format!("<style>html{{zoom:{ZOOM_WEBKIT}}}</style>");
    let script = format!(
        r#"<script>(function(){{function pret(){{fetch("{PROTOCOLE}://localhost/{id}.pret").catch(function(){{}});}}
function attendre(){{Promise.all([].slice.call(document.images).map(function(i){{return i.decode?i.decode().catch(function(){{}}):null;}}))
.then(function(){{return document.fonts?document.fonts.ready:null;}}).then(pret,pret);}}
if(document.readyState==="complete")attendre();else window.addEventListener("load",attendre);}})();</script>"#
    );
    let avec_style = match html.find("</head>") {
        Some(i) => format!("{}{style}{}", &html[..i], &html[i..]),
        None => format!("{style}{html}"),
    };
    match avec_style.rfind("</body>") {
        Some(i) => format!("{}{script}{}", &avec_style[..i], &avec_style[i..]),
        None => format!("{avec_style}{script}"),
    }
}

/// Répond au protocole `feuille://localhost/<id>.html` : la feuille, ou rien ;
/// et à `feuille://localhost/<id>.pret` : la feuille est prête à imprimer.
pub fn servir<R: Runtime>(ctx: tauri::UriSchemeContext<'_, R>, requete: tauri::http::Request<Vec<u8>>) -> tauri::http::Response<Vec<u8>> {
    let chemin = requete.uri().path().trim_start_matches('/');
    if let Some(id) = chemin.strip_suffix(".pret") {
        if let Some(envoi) = ctx.app_handle().state::<Feuilles>().1.lock().ok().and_then(|mut p| p.remove(id)) {
            let _ = envoi.try_send(());
        }
        return tauri::http::Response::builder()
            .status(204)
            .header("Access-Control-Allow-Origin", "*")
            .body(Vec::new())
            .unwrap_or_else(|_| tauri::http::Response::new(Vec::new()));
    }
    let id = chemin.trim_end_matches(".html").to_string();
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
/// La fenêtre est créée invisible, la feuille chargée par le protocole. On
/// imprime quand la page se dit prête — chargée, ses images décodées (voir
/// `prete_a_imprimer`) — ou, si elle ne le dit pas, deux secondes après la fin
/// du chargement. Le tout attend au plus trente secondes.
#[cfg(target_os = "macos")]
pub async fn ecrire_pdf(app: &AppHandle, html: String, sortie: std::path::PathBuf) -> Result<(), String> {
    use std::sync::mpsc;
    use std::time::Duration;
    use tauri::webview::PageLoadEvent;
    use tauri::{WebviewUrl, WebviewWindowBuilder};

    let paysage = est_en_paysage(&html);
    let id = uuid::Uuid::new_v4().to_string();
    // Le signal « prête » : la page l'envoie par le protocole, la fin du chargement le double, en retard.
    let (pret, attendre_pret) = mpsc::sync_channel::<()>(2);
    app.state::<Feuilles>().1.lock().map_err(|_| "feuilles verrouillées".to_string())?.insert(id.clone(), pret.clone());
    app.state::<Feuilles>().0.lock().map_err(|_| "feuilles verrouillées".to_string())?.insert(id.clone(), prete_a_imprimer(&html, &id));

    let url = url::Url::parse(&format!("{PROTOCOLE}://localhost/{id}.html")).map_err(|e| e.to_string())?;
    let etiquette = format!("feuille-{id}");
    let fenetre = WebviewWindowBuilder::new(app, &etiquette, WebviewUrl::CustomProtocol(url))
        .title("Impression")
        .visible(false)
        .inner_size(900.0, 1200.0)
        .on_page_load(move |_fenetre, charge| {
            if !matches!(charge.event(), PageLoadEvent::Finished) {
                return;
            }
            let pret = pret.clone();
            std::thread::spawn(move || {
                std::thread::sleep(Duration::from_secs(2));
                let _ = pret.try_send(());
            });
        })
        .build()
        .map_err(|e| format!("fenêtre d'impression : {e}"))?;

    let attente = tauri::async_runtime::spawn_blocking(move || attendre_pret.recv_timeout(Duration::from_secs(30)));
    let pret_a_temps = matches!(attente.await, Ok(Ok(())));
    if let Ok(mut p) = app.state::<Feuilles>().1.lock() {
        p.remove(&id);
    }
    if !pret_a_temps {
        let _ = fenetre.close();
        if let Ok(mut f) = app.state::<Feuilles>().0.lock() {
            f.remove(&id);
        }
        return Err("La feuille n'a pas fini de se charger.".into());
    }

    // Un canal synchrone : la fermeture de page doit pouvoir être partagée entre fils.
    let (envoi, reception) = mpsc::sync_channel::<Result<(), String>>(1);
    let chemin = sortie.clone();
    fenetre
        .with_webview(move |vue| {
            // SAFETY : on est sur le fil principal, avec le WKWebView de cette fenêtre.
            let resultat = unsafe { imprimer_dans(vue.inner().cast(), &chemin, paysage) };
            let _ = envoi.send(resultat);
        })
        .map_err(|e| format!("fenêtre d'impression : {e}"))?;
    let attente = tauri::async_runtime::spawn_blocking(move || reception.recv_timeout(Duration::from_secs(30)));
    let resultat = match attente.await {
        Ok(Ok(r)) => r,
        Ok(Err(_)) => Err("La feuille ne s'est pas imprimée.".into()),
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
    fn la_feuille_dit_qu_elle_est_prete_une_fois_ses_images_decodees() {
        let html = prete_a_imprimer("<html><head><title>t</title></head><body><img src=\"a.png\"></body></html>", "abc");
        // Le script se pose à la fin du corps, avant la balise fermante.
        assert!(html.contains("<img src=\"a.png\"><script>"));
        assert!(html.ends_with("</script></body></html>"));
        assert!(html.contains("feuille://localhost/abc.pret"));
        assert!(html.contains("i.decode()"));
        // Sans en-tête ni corps, le style ouvre la feuille et le script la ferme.
        let nue = prete_a_imprimer("<p>x</p>", "z");
        assert!(nue.starts_with("<style>html{zoom:"));
        assert!(nue.contains("<p>x</p><script>"));
    }

    #[test]
    fn le_zoom_rend_aux_millimetres_leur_taille() {
        // 1 px CSS : 0,8 point imprimé par WebKit, 0,75 attendu.
        assert!((ZOOM_WEBKIT * 0.8 - 0.75).abs() < 1e-9);
        let html = prete_a_imprimer("<html><head><style>a{}</style></head><body></body></html>", "abc");
        assert!(html.contains("<style>a{}</style><style>html{zoom:0.9375}</style></head>"));
    }

    #[test]
    fn le_paysage_se_lit_dans_la_regle_page() {
        assert!(est_en_paysage("<style>@page { size: A4 landscape; margin: 10mm; }</style>"));
        assert!(!est_en_paysage("<style>@page { size: A4; margin: 14mm; }</style>"));
        assert!(!est_en_paysage(""));
    }
}
