// La voix du classeur : AVSpeechSynthesizer, dans une session audio
// « lecture ». La synthèse de WebKit se tait en mode silencieux ; un élève qui
// parle avec son classeur ne doit pas devenir muet pour autant. La voix est
// celle de l'appareil, en français, sans internet.

import AVFoundation
import Tauri
import UIKit

class ParolePlugin: Plugin {
  private let synthese = AVSpeechSynthesizer()

  struct ADire: Decodable {
    let texte: String
    let voix: String?
    let debit: Float?
  }

  /// La session « lecture » : le son passe même en mode silencieux, et baisse la musique d'une autre app le temps d'un mot.
  private func ouvrirLaSession() {
    let session = AVAudioSession.sharedInstance()
    try? session.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
    try? session.setActive(true)
  }

  @objc public func dire(_ invoke: Invoke) {
    guard let a = try? invoke.parseArgs(ADire.self) else {
      invoke.reject("Rien à dire.")
      return
    }
    let texte = a.texte.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !texte.isEmpty else {
      invoke.resolve()
      return
    }
    DispatchQueue.main.async {
      self.ouvrirLaSession()
      if self.synthese.isSpeaking { self.synthese.stopSpeaking(at: .immediate) }
      let enonce = AVSpeechUtterance(string: texte)
      enonce.voice = a.voix.flatMap { AVSpeechSynthesisVoice(identifier: $0) } ?? AVSpeechSynthesisVoice(language: "fr-FR")
      if let d = a.debit {
        let debit = AVSpeechUtteranceDefaultSpeechRate * d
        enonce.rate = min(max(debit, AVSpeechUtteranceMinimumSpeechRate), AVSpeechUtteranceMaximumSpeechRate)
      }
      self.synthese.speak(enonce)
      invoke.resolve()
    }
  }

  @objc public func taire(_ invoke: Invoke) {
    DispatchQueue.main.async {
      self.synthese.stopSpeaking(at: .immediate)
      invoke.resolve()
    }
  }

  @objc public func voix(_ invoke: Invoke) {
    let francaises = AVSpeechSynthesisVoice.speechVoices()
      .filter { $0.language.hasPrefix("fr") }
      .map { v -> [String: Any] in
        ["id": v.identifier, "nom": v.name, "langue": v.language, "qualite": v.quality.rawValue]
      }
    invoke.resolve(["voix": francaises])
  }
}

// Publique : depuis Xcode 27, une entrée @_cdecl qui ne l'est pas devient
// invisible à l'édition de liens d'une construction de publication (voir le compagnon).
@_cdecl("init_plugin_parole")
public func initPlugin() -> Plugin {
  return ParolePlugin()
}
