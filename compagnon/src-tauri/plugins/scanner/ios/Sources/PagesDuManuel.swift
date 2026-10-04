// Ce que l'on fait d'une photo de page : trouver la page, la redresser, la
// nettoyer, l'écrire.
//
// Sans UIKit : ce fichier se compile aussi sur le Mac, où l'on peut l'essayer
// sur de vraies photos avant de l'envoyer sur le téléphone.

import CoreImage
import CoreImage.CIFilterBuiltins
import Foundation
import ImageIO
import Vision

enum PagesDuManuel {
  /// Le plus grand côté d'une page écrite : lisible à l'écran comme à l'impression, et léger.
  static let cote: CGFloat = 2000

  /// Toute la photo : le cadre quand on ne veut rien rogner.
  static let toutePhoto: [CGPoint] = [CGPoint(x: 0, y: 0), CGPoint(x: 1, y: 0), CGPoint(x: 1, y: 1), CGPoint(x: 0, y: 1)]

  /// Le cadre posé quand Vision n'a rien trouvé : la photo, à peine rognée.
  static let parDefaut: [CGPoint] = [CGPoint(x: 0.04, y: 0.04), CGPoint(x: 0.96, y: 0.04), CGPoint(x: 0.96, y: 0.96), CGPoint(x: 0.04, y: 0.96)]

  /**
   * Les coins de la page dans une photo, ou `nil` si Vision n'a rien trouvé de sûr.
   *
   * Partout ici, les coins sont normalisés (0…1), origine en haut à gauche,
   * dans l'ordre : haut gauche, haut droit, bas droit, bas gauche. Vision,
   * lui, compte depuis le bas.
   */
  static func pageTrouvee(dans image: CGImage) -> [CGPoint]? {
    let demande = VNDetectDocumentSegmentationRequest()
    guard (try? VNImageRequestHandler(cgImage: image, options: [:]).perform([demande])) != nil,
      let page = demande.results?.first, page.confidence >= 0.5
    else { return nil }
    return [page.topLeft, page.topRight, page.bottomRight, page.bottomLeft].map { CGPoint(x: $0.x, y: 1 - $0.y) }
  }

  /// Les quatre coins remis dans l'ordre, quel que soit celui qu'on a tiré où.
  static func ordonnes(_ p: [CGPoint]) -> [CGPoint] {
    guard p.count == 4 else { return p }
    let c = CGPoint(x: p.map(\.x).reduce(0, +) / 4, y: p.map(\.y).reduce(0, +) / 4)
    // L'origine est en haut : l'angle croît dans le sens des aiguilles d'une montre.
    let tour = p.sorted { atan2($0.y - c.y, $0.x - c.x) < atan2($1.y - c.y, $1.x - c.x) }
    // On part du coin le plus proche du haut gauche de la photo.
    let premier = tour.indices.min { tour[$0].x + tour[$0].y < tour[$1].x + tour[$1].y } ?? 0
    return (0..<4).map { tour[(premier + $0) % 4] }
  }

  /// Un coin, une fois la photo tournée d'un quart de tour dans le sens des aiguilles d'une montre.
  static func apresUnQuart(_ p: CGPoint) -> CGPoint { CGPoint(x: 1 - p.y, y: p.x) }

  /// La photo tournée de `quarts` quarts de tour, dans le sens des aiguilles d'une montre.
  static func tournee(_ image: CIImage, quarts: Int) -> CIImage {
    var sortie = image
    for _ in 0..<((quarts % 4 + 4) % 4) { sortie = sortie.oriented(.right) }
    return sortie
  }

  /// La photo réduite à `cote` pixels au plus : ce que l'écran d'ajustement montre, et ce que Vision lit.
  static func reduite(_ image: CIImage, cote: CGFloat, contexte: CIContext) -> CGImage? {
    let k = min(1, cote / max(image.extent.width, image.extent.height))
    let petite = image.transformed(by: CGAffineTransform(scaleX: k, y: k))
    return contexte.createCGImage(petite, from: petite.extent.integral)
  }

  /**
   * La page : redressée selon ses coins, ramenée à `cote` pixels, nettoyée
   * (fond blanchi, ombres effacées — ce que fait le scanner de Notes), en JPEG.
   */
  static func page(depuis photo: CIImage, coins: [CGPoint], quarts: Int, contexte: CIContext) -> Data? {
    let image = tournee(photo, quarts: quarts)
    let e = image.extent
    // Core Image compte depuis le bas.
    let px = ordonnes(coins).map { CGPoint(x: e.minX + $0.x * e.width, y: e.maxY - $0.y * e.height) }
    let redressement = CIFilter.perspectiveCorrection()
    redressement.inputImage = image
    redressement.topLeft = px[0]
    redressement.topRight = px[1]
    redressement.bottomRight = px[2]
    redressement.bottomLeft = px[3]
    guard var page = redressement.outputImage, page.extent.width >= 1, page.extent.height >= 1 else { return nil }
    let k = min(1, cote / max(page.extent.width, page.extent.height))
    if k < 1 {
      let reduction = CIFilter.lanczosScaleTransform()
      reduction.inputImage = page
      reduction.scale = Float(k)
      reduction.aspectRatio = 1
      page = reduction.outputImage ?? page
    }
    if #available(iOS 16.0, macOS 13.0, *) {
      let nettoyage = CIFilter.documentEnhancer()
      nettoyage.inputImage = page
      nettoyage.amount = 1
      page = nettoyage.outputImage ?? page
    }
    guard let srgb = CGColorSpace(name: CGColorSpace.sRGB) else { return nil }
    return contexte.jpegRepresentation(
      of: page, colorSpace: srgb,
      options: [CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.85])
  }

  /// La vignette d'une page écrite, lue sans décoder toute l'image.
  static func vignette(de jpeg: Data, cote: CGFloat) -> CGImage? {
    guard let source = CGImageSourceCreateWithData(jpeg as CFData, nil) else { return nil }
    let options: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceThumbnailMaxPixelSize: cote,
      kCGImageSourceCreateThumbnailWithTransform: true,
    ]
    return CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary)
  }

  /// Le nom d'une page : l'heure à la milliseconde, pour que l'ordre des noms soit celui des pages.
  static func nom(le date: Date) -> String {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.dateFormat = "yyyyMMdd-HHmmss-SSS"
    return "page-\(f.string(from: date)).jpg"
  }
}
