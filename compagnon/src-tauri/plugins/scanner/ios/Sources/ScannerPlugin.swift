// Le scanner de documents d'iOS, tel que l'application Notes l'ouvre.
//
// VisionKit trouve les bords de la page, la prend au bon moment, la
// redresse et la nettoie ; l'enseignant enchaîne les pages puis touche
// « Enregistrer ». Chaque page est ramenée à 2 000 px de côté au plus et
// écrite en JPEG dans le dossier temporaire : c'est Rust qui la lit et
// l'envoie, et qui l'efface une fois arrivée.
//
// Et la page de connexion à Nuage, plus bas.

import AuthenticationServices
import Tauri
import UIKit
import VisionKit
import WebKit

class ScannerPlugin: Plugin, VNDocumentCameraViewControllerDelegate {
  private var enAttente: Invoke? = nil

  @objc public func scanner(_ invoke: Invoke) {
    guard VNDocumentCameraViewController.isSupported else {
      invoke.reject("Le scanner de documents n'est pas disponible sur cet appareil.")
      return
    }
    if enAttente != nil {
      invoke.reject("Le scanner est déjà ouvert.")
      return
    }
    enAttente = invoke
    DispatchQueue.main.async {
      let ecran = VNDocumentCameraViewController()
      ecran.delegate = self
      guard let hote = self.manager.viewController else {
        self.enAttente = nil
        invoke.reject("Aucun écran où ouvrir le scanner.")
        return
      }
      hote.present(ecran, animated: true, completion: nil)
    }
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFinishWith scan: VNDocumentCameraScan) {
    var fichiers: [String] = []
    let dossier = FileManager.default.temporaryDirectory
    for i in 0..<scan.pageCount {
      let image = ScannerPlugin.reduite(scan.imageOfPage(at: i), cote: 2000)
      guard let donnees = image.jpegData(compressionQuality: 0.85) else { continue }
      let chemin = dossier.appendingPathComponent("scan-\(UUID().uuidString).jpg")
      if (try? donnees.write(to: chemin)) != nil {
        fichiers.append(chemin.path)
      }
    }
    controller.dismiss(animated: true, completion: nil)
    enAttente?.resolve(["fichiers": fichiers])
    enAttente = nil
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    controller.dismiss(animated: true, completion: nil)
    enAttente?.resolve(["fichiers": [String]()])
    enAttente = nil
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController, didFailWithError error: Error) {
    controller.dismiss(animated: true, completion: nil)
    enAttente?.reject(error.localizedDescription)
    enAttente = nil
  }

  // ── La page de connexion à Nuage ───────────────────────────────────────
  //
  // Une feuille de Safari propre à l'application, éphémère : rien n'y reste
  // une fois refermée — ni cookie, ni session —, et iOS n'a pas à demander la
  // permission de l'ouvrir. Nuage ne renvoie vers aucune adresse de
  // l'application à la fin : c'est Rust qui voit la connexion aboutir, et qui
  // demande alors de refermer la feuille (`fermerConnexion`).

  private var connexion: ASWebAuthenticationSession? = nil
  private var connexionEnAttente: Invoke? = nil

  struct Page: Decodable {
    let url: String
  }

  @objc public func ouvrirConnexion(_ invoke: Invoke) {
    guard let page = try? invoke.parseArgs(Page.self),
      let url = URL(string: page.url),
      url.scheme == "https"
    else {
      invoke.reject("Adresse de connexion invalide.")
      return
    }
    DispatchQueue.main.async {
      if self.connexion != nil {
        invoke.reject("La page de connexion est déjà ouverte.")
        return
      }
      let session = ASWebAuthenticationSession(url: url, callbackURLScheme: nil) { _, _ in
        // Refermée par « Annuler » — ou de force, une fois la connexion faite :
        // la réponse est alors déjà partie, et ceci ne fait plus rien.
        DispatchQueue.main.async { self.terminerConnexion(annulee: true) }
      }
      session.presentationContextProvider = self
      session.prefersEphemeralWebBrowserSession = true
      self.connexion = session
      self.connexionEnAttente = invoke
      if !session.start() {
        self.connexion = nil
        self.connexionEnAttente = nil
        invoke.reject("La page de connexion n'a pas pu s'ouvrir.")
      }
    }
  }

  @objc public func fermerConnexion(_ invoke: Invoke) {
    DispatchQueue.main.async {
      let session = self.connexion
      // Répondre avant de refermer : sinon la feuille refermée croirait à une annulation.
      self.terminerConnexion(annulee: false)
      session?.cancel()
      invoke.resolve(["annulee": false])
    }
  }

  private func terminerConnexion(annulee: Bool) {
    let enAttente = connexionEnAttente
    connexionEnAttente = nil
    connexion = nil
    enAttente?.resolve(["annulee": annulee])
  }

  /// La page ramenée à `cote` pixels au plus : lisible, et dix fois plus légère.
  private static func reduite(_ image: UIImage, cote: CGFloat) -> UIImage {
    let plusGrand = max(image.size.width, image.size.height)
    guard plusGrand > cote else { return image }
    let echelle = cote / plusGrand
    let taille = CGSize(width: image.size.width * echelle, height: image.size.height * echelle)
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    return UIGraphicsImageRenderer(size: taille, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: taille))
    }
  }
}

extension ScannerPlugin: ASWebAuthenticationPresentationContextProviding {
  func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
    return self.manager.viewController?.view.window ?? ASPresentationAnchor()
  }
}

@_cdecl("init_plugin_scanner")
func initPlugin() -> Plugin {
  return ScannerPlugin()
}
