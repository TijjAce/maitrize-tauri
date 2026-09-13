import Foundation
import PDFKit
import Vision
import AppKit

// Usage : swift ocr_zones.swift fichier.pdf zones.json sortie.json
// zones.json : [{"id": "...", "page": 5, "x0": .., "y0": .., "x1": .., "y1": ..}] en points PDF, origine en haut à gauche.
let args = CommandLine.arguments
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else { fatalError("PDF illisible") }
let zones = try JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[2]))) as! [[String: Any]]
let echelle: CGFloat = 4.0
var rendus: [Int: CGImage] = [:]

func rendu(_ n: Int) -> CGImage {
    if let r = rendus[n] { return r }
    let page = doc.page(at: n - 1)!
    let boite = page.bounds(for: .mediaBox)
    let taille = NSSize(width: boite.width * echelle, height: boite.height * echelle)
    let image = NSImage(size: taille)
    image.lockFocus()
    NSColor.white.setFill(); NSRect(origin: .zero, size: taille).fill()
    let ctx = NSGraphicsContext.current!.cgContext
    ctx.scaleBy(x: echelle, y: echelle)
    page.draw(with: .mediaBox, to: ctx)
    image.unlockFocus()
    let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil)!
    rendus[n] = cg
    return cg
}

var sortie: [String: String] = [:]
for z in zones {
    let n = z["page"] as! Int
    let img = rendu(n)
    let k = CGFloat(img.width) / doc.page(at: n - 1)!.bounds(for: .mediaBox).width
    let r = CGRect(x: (z["x0"] as! Double) * Double(k), y: (z["y0"] as! Double) * Double(k),
                   width: ((z["x1"] as! Double) - (z["x0"] as! Double)) * Double(k),
                   height: ((z["y1"] as! Double) - (z["y0"] as! Double)) * Double(k))
    guard let crop = img.cropping(to: r) else { continue }
    let req = VNRecognizeTextRequest()
    req.recognitionLevel = .accurate
    req.recognitionLanguages = ["fr-FR"]
    req.usesLanguageCorrection = false
    try VNImageRequestHandler(cgImage: crop, options: [:]).perform([req])
    let lignes = (req.results ?? []).sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
        .compactMap { $0.topCandidates(1).first?.string }
    sortie[z["id"] as! String] = lignes.joined(separator: "\n")
}
let data = try JSONSerialization.data(withJSONObject: sortie, options: [.prettyPrinted])
try data.write(to: URL(fileURLWithPath: args[3]))
print("zones lues :", sortie.count)
