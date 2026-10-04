// Les pages d'un manuel, photographiées une à une, et la page de connexion à
// Nuage.
//
// L'appareil (AppareilPages) ajuste chaque photo aussitôt prise et écrit la
// page gardée dans le dossier que Rust lui donne — celui de l'application,
// pas un dossier temporaire : une page gardée y reste jusqu'à ce qu'on la
// supprime. Chaque page écrite est annoncée à la page web, qui l'envoie à
// l'ordinateur sans attendre la fin.

import AVFoundation
import AuthenticationServices
import Tauri
import UIKit
import WebKit

class ScannerPlugin: Plugin {
  // ── Les pages d'un manuel ──────────────────────────────────────────────

  private var appareilEnAttente: Invoke? = nil

  struct Appareil: Decodable {
    let dossier: String
    let surPage: Channel?
  }

  @objc public func photographier(_ invoke: Invoke) {
    guard let args = try? invoke.parseArgs(Appareil.self), !args.dossier.isEmpty else {
      invoke.reject("Le dossier des pages manque.")
      return
    }
    let dossier = URL(fileURLWithPath: args.dossier, isDirectory: true)
    do {
      try FileManager.default.createDirectory(at: dossier, withIntermediateDirectories: true)
    } catch {
      invoke.reject("Le dossier des pages ne peut pas être créé : \(error.localizedDescription)")
      return
    }
    DispatchQueue.main.async {
      guard self.appareilEnAttente == nil else {
        invoke.reject("L'appareil est déjà ouvert.")
        return
      }
      self.appareilEnAttente = invoke
      self.avecLaCamera { permise in
        guard permise else {
          self.repondreAppareil { $0.reject("La caméra est refusée à Maitrize : Réglages › Maitrize Dictaphone › Caméra.") }
          return
        }
        guard let hote = self.manager.viewController else {
          self.repondreAppareil { $0.reject("Aucun écran où ouvrir l'appareil.") }
          return
        }
        let appareil = AppareilPages(
          dossier: dossier,
          quandGardee: { nom, gardees in args.surPage?.send(["fichier": nom, "gardees": gardees]) },
          quandFini: { gardees in self.repondreAppareil { $0.resolve(["gardees": gardees]) } })
        hote.present(appareil, animated: true, completion: nil)
      }
    }
  }

  private func repondreAppareil(_ reponse: (Invoke) -> Void) {
    let invoke = appareilEnAttente
    appareilEnAttente = nil
    if let invoke { reponse(invoke) }
  }

  /// La caméra est-elle permise ? On la demande la première fois ; la réponse revient sur le fil principal.
  private func avecLaCamera(_ suite: @escaping (Bool) -> Void) {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: suite(true)
    case .notDetermined:
      AVCaptureDevice.requestAccess(for: .video) { ok in DispatchQueue.main.async { suite(ok) } }
    default: suite(false)
    }
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
