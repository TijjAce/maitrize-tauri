# Déclaration de fourniture d'un moyen de cryptologie — le compagnon

Pour diffuser « MaitrizeV2 Compagnon » sur l'App Store en France, Apple
demande la déclaration française. Le compagnon chiffre avec ses propres
algorithmes, standard, et non avec ceux d'iOS. Fournir en France un moyen
de cryptologie qui assure la confidentialité se déclare à l'ANSSI, au moins
un mois avant la fourniture (décret n° 2007-663 du 2 mai 2007, art. 3 à 5).
Aucune des dispenses de son annexe 1 ne vise une application de ce genre.

La démarche se fait en ligne : cyber.gouv.fr › Réglementation › Contrôle
relatif à un moyen de cryptologie, sur la plateforme demarches.numeriques.
L'ANSSI délivre un récépissé. Sans réponse au bout d'un mois, la fourniture
est libre. C'est ce document qu'on dépose ensuite dans App Store Connect.

Ce qui suit est la partie technique du dossier. La partie administrative
(identité, adresse, contact du déclarant) se remplit sur la plateforme.

## Le moyen

- **Nom** : MaitrizeV2 Compagnon (identifiant iOS fr.clementsapp.maitrize.dictaphone), version 1.0.
- **Nature** : application pour iPhone, compagnon de Maîtrize, logiciel de bureau pour les enseignants du premier degré (macOS, Windows).
- **Diffusion** : gratuite, par l'App Store ; le logiciel de bureau, par maitrize.com et GitHub.
- **Licence** : logiciel libre, AGPL-3.0. Le code source est public : https://github.com/TijjAce/maitrize-tauri (dossiers `relais` et `compagnon`).
- **Usage** : l'enseignant dicte en classe sur son téléphone. Les enregistrements, les notes et les photos rejoignent son propre ordinateur par un dossier de son espace Nuage (apps.education.fr), ou par le réseau local. Le chiffrement protège ces données pédagogiques entre les deux appareils de l'enseignant. Il n'offre aucune fonction de chiffrement à l'utilisateur pour d'autres données, et l'utilisateur ne peut pas le modifier.

## Les fonctions cryptographiques

Toutes sont dans la bibliothèque `relais`, commune au téléphone et à
l'ordinateur.

1. **Dépôts du téléphone vers l'ordinateur** (dictées, notes, photos) : un chiffrement hybride vers la clé publique de l'ordinateur.
   - Une paire de clés X25519 jetable par dépôt (courbe 25519, 256 bits), et l'échange Diffie-Hellman avec la clé publique de l'ordinateur.
   - La dérivation HKDF-SHA-256. Le sel lie la clé aux deux clés publiques.
   - Le chiffrement authentifié XChaCha20-Poly1305 : clé de 256 bits, nonce aléatoire de 192 bits.
   - Le téléphone ne garde rien qui permette de rouvrir un dépôt. Seule la clé privée de l'ordinateur, qui ne le quitte pas, le déchiffre.
2. **Retour de l'ordinateur vers le téléphone** (emploi du temps, cahier journal) : XChaCha20-Poly1305 avec une clé symétrique de 256 bits. Elle est tirée par l'ordinateur et remise au téléphone à l'appairage, par un QR code affiché à l'écran.
3. **Transport** : HTTPS (TLS 1.2 et 1.3) vers Nuage, par la bibliothèque rustls, pour le protocole WebDAV.
4. **Intégrité** : SHA-256.
5. **Mot de passe d'application Nuage** : gardé dans le trousseau d'iOS. C'est le chiffrement du système, pas celui de l'application.

**Bibliothèques** (Rust, libres) : x25519-dalek 2, chacha20poly1305 0.10
(XChaCha20-Poly1305), hkdf 0.12, sha2 0.10, rustls (par reqwest 0.12).
L'aléa vient du générateur du système (getrandom).

**Classement « grand public »** : à demander dans la déclaration. Les trois
conditions du point 3 de l'annexe 2 du décret sont remplies :
- le moyen est mis à la disposition du public sans restriction (App Store, gratuit) ;
- l'utilisateur ne peut pas modifier facilement la fonction cryptographique ;
- l'utilisateur l'installe seul, sans assistance du fournisseur.

**À noter** : le logiciel de bureau Maîtrize contient la même bibliothèque
`relais`. Il chiffre aussi de bout en bout le partage entre collègues. Il
est déjà fourni en France, depuis maitrize.com. Une seule déclaration
couvrant les deux applications est sans doute le plus simple : à préciser
avec l'ANSSI.
