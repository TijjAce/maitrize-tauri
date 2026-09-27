// Le scanner de documents d'iOS, tel que l'application Notes l'ouvre.
//
// VisionKit trouve les bords de la page, la prend au bon moment, la
// redresse et la nettoie ; l'enseignant enchaîne les pages puis touche
// « Enregistrer ». Chaque page est ramenée à 2 000 px de côté au plus et
// écrite en JPEG dans le dossier temporaire : c'est Rust qui la lit et
// l'envoie, et qui l'efface une fois arrivée.

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

@_cdecl("init_plugin_scanner")
func initPlugin() -> Plugin {
  return ScannerPlugin()
}
