// Le chiffrement du relais, sur l'iPhone : celui d'Apple.
//
// Le dictaphone scelle ses dépôts pour l'ordinateur, et ouvre ce que
// l'ordinateur lui laisse. Sur l'iPhone, tout passe par CryptoKit, la
// bibliothèque du système : l'application n'embarque aucun algorithme de
// chiffrement à elle, et l'App Store ne demande alors aucune déclaration.
//
// Le format est la version 2 de `relais` (lib.rs), que l'ordinateur écrit et
// lit en Rust :
//
//   dépôt  : « MTZ2 » · clé publique jetable (32) · nonce (12) · chiffré · étiquette (16)
//   retour : « MTR2 » · nonce (12) · chiffré · étiquette (16)
//
// ChaCha20-Poly1305 (RFC 8439). La clé d'un dépôt est tirée par HKDF-SHA-256
// de l'échange X25519 entre une clé jetable et celle de l'ordinateur, le sel
// liant les deux clés publiques — comme l'ordinateur la tire de son côté.
//
// Rust passe des tampons à la bonne taille : rien n'est alloué de ce côté-ci
// qui soit à rendre de l'autre.

import CryptoKit
import Foundation

private let marqueDepot = Data("MTZ2".utf8)
private let marqueRetour = Data("MTR2".utf8)
private let contexteDepot = Data("maitrize-relais-depot-v1".utf8)

/// Scelle `longueur` octets pour la clé publique de l'ordinateur (32 octets).
/// `sortie` a la place de 4 + 32 + 12 + longueur + 16 octets. Rend 0, ou 1 si
/// la clé de l'ordinateur ne va pas.
@_cdecl("maitrize_sceller")
public func maitrizeSceller(
  _ destinataire: UnsafePointer<UInt8>,
  _ clair: UnsafePointer<UInt8>,
  _ longueur: Int,
  _ sortie: UnsafeMutablePointer<UInt8>
) -> Int32 {
  do {
    let ordinateur = try Curve25519.KeyAgreement.PublicKey(rawRepresentation: Data(bytes: destinataire, count: 32))
    let jetable = Curve25519.KeyAgreement.PrivateKey()
    let ephemere = jetable.publicKey.rawRepresentation
    let partage = try jetable.sharedSecretFromKeyAgreement(with: ordinateur)
    let cle = partage.hkdfDerivedSymmetricKey(
      using: SHA256.self, salt: ephemere + ordinateur.rawRepresentation, sharedInfo: contexteDepot, outputByteCount: 32)
    let boite = try ChaChaPoly.seal(Data(bytes: clair, count: longueur), using: cle, authenticating: marqueDepot)
    let blob = marqueDepot + ephemere + boite.combined
    blob.copyBytes(to: sortie, count: blob.count)
    return 0
  } catch {
    return 1
  }
}

/// Ouvre un retour de l'ordinateur avec la clé du retour (32 octets).
/// `sortie` a la place de longueur − 32 octets. Rend 0, ou 1 si le retour ne
/// s'ouvre pas : autre clé, ou fichier abîmé.
@_cdecl("maitrize_ouvrir_retour")
public func maitrizeOuvrirRetour(
  _ cle: UnsafePointer<UInt8>,
  _ blob: UnsafePointer<UInt8>,
  _ longueur: Int,
  _ sortie: UnsafeMutablePointer<UInt8>
) -> Int32 {
  let octets = Data(bytes: blob, count: longueur)
  guard octets.count >= 4 + 12 + 16, octets.prefix(4) == marqueRetour else { return 1 }
  do {
    let boite = try ChaChaPoly.SealedBox(combined: octets.dropFirst(4))
    let clair = try ChaChaPoly.open(boite, using: SymmetricKey(data: Data(bytes: cle, count: 32)), authenticating: marqueRetour)
    clair.copyBytes(to: sortie, count: clair.count)
    return 0
  } catch {
    return 1
  }
}
