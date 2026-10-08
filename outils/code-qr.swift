// Lit le code QR copié dans le presse-papiers (⌘ ⇧ ⌃ 4 sur le code QR) et y
// met à la place le texte qu'il contient — pour SimplySign, le lien
// otpauth:// —, sans jamais l'afficher. On le colle ensuite dans les secrets
// de GitHub, puis l'on copie autre chose.
//
//   swift outils/code-qr.swift
//
// QR_PRESSE_PAPIERS nomme un autre presse-papiers que celui du Mac : les
// essais ne touchent pas à ce que l'enseignant a copié.

import AppKit
import CoreImage

let nom = ProcessInfo.processInfo.environment["QR_PRESSE_PAPIERS"]
let pp = nom.map { NSPasteboard(name: NSPasteboard.Name($0)) } ?? NSPasteboard.general

guard let image = NSImage(pasteboard: pp), let tiff = image.tiffRepresentation, let ci = CIImage(data: tiff) else {
    print("Pas d'image dans le presse-papiers : faites ⌘ ⇧ ⌃ 4 sur le code QR, puis relancez.")
    exit(1)
}
let detecteur = CIDetector(ofType: CIDetectorTypeQRCode, context: nil, options: [CIDetectorAccuracy: CIDetectorAccuracyHigh])
guard let texte = detecteur?.features(in: ci).compactMap({ ($0 as? CIQRCodeFeature)?.messageString }).first else {
    print("Aucun code QR lisible dans l'image : refaites la capture, le code QR en entier et bien net.")
    exit(1)
}
pp.clearContents()
pp.setString(texte, forType: .string)
if texte.lowercased().hasPrefix("otpauth://") {
    print("C'est bon : le lien otpauth:// est dans le presse-papiers. Collez-le dans GitHub (⌘ V), puis copiez un autre texte.")
} else {
    print("Ce code QR ne contient pas de lien otpauth:// ; son texte est quand même dans le presse-papiers.")
}
