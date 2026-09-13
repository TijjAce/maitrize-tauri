import Foundation
import PDFKit
import Vision
import AppKit

// Usage : swift ocr.swift fichier.pdf  → texte sur la sortie standard, page par page.
let chemin = CommandLine.arguments[1]
guard let doc = PDFDocument(url: URL(fileURLWithPath: chemin)) else { fatalError("PDF illisible") }
let modeOCR = CommandLine.arguments.count > 2 && CommandLine.arguments[2] == "ocr"
for i in 0..<doc.pageCount {
    guard let page = doc.page(at: i) else { continue }
    print("=== PAGE \(i + 1) ===")
    if !modeOCR, let s = page.string, !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
        print(s); continue
    }
    let boite = page.bounds(for: .mediaBox)
    let echelle: CGFloat = 3.0
    let taille = NSSize(width: boite.width * echelle, height: boite.height * echelle)
    let image = NSImage(size: taille)
    image.lockFocus()
    NSColor.white.setFill(); NSRect(origin: .zero, size: taille).fill()
    if let ctx = NSGraphicsContext.current?.cgContext {
        ctx.scaleBy(x: echelle, y: echelle)
        page.draw(with: .mediaBox, to: ctx)
    }
    image.unlockFocus()
    guard let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else { continue }
    let requete = VNRecognizeTextRequest()
    requete.recognitionLevel = .accurate
    requete.recognitionLanguages = ["fr-FR"]
    requete.usesLanguageCorrection = true
    try VNImageRequestHandler(cgImage: cg, options: [:]).perform([requete])
    // Chaque ligne avec sa position : colonne gauche/droite reconstituables ensuite.
    for obs in (requete.results ?? []) {
        guard let texte = obs.topCandidates(1).first?.string else { continue }
        let b = obs.boundingBox
        print(String(format: "%.3f\t%.3f\t%.3f\t%@", 1 - b.maxY, b.minX, b.maxX, texte))
    }
}
