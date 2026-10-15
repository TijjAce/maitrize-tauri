# MaitrizeV2 Compagnon — la fiche de l'App Store

Ce qu'on recopie dans App Store Connect, champ par champ. Chaque phrase
décrit ce que fait l'application : rien de plus. Les limites d'Apple, en
caractères, sont entre parenthèses.

## Informations de l'app

- **Nom** (30) : MaitrizeV2 Compagnon
- **Sous-titre** (30) : Dictées et tablettes en classe
- **Identifiant de lot** : fr.clementsapp.maitrize.dictaphone
- **SKU** : maitrize-compagnon
- **Langue principale** : français (France)
- **Catégorie** : Éducation ; secondaire : Productivité
- **Droits sur le contenu** : l'app montre des pictogrammes ARASAAC (CC BY-NC-SA), et ceux que l'enseignant a importés ; elle ne vend rien.
- **Classification par âge** : aucune case cochée (4+). Ni contenu généré par d'autres utilisateurs, ni navigation web libre, ni messagerie.
- **Prix** : gratuit.
- **Disponibilité** : la France, une fois la déclaration à l'ANSSI faite (voir plus bas).

## Version 1.0

**Texte promotionnel** (170)

Dictez en classe sans sortir l'ordinateur, et donnez à chaque tablette sa consigne, son déroulement et son minuteur. Vos dictées partent chiffrées vers votre ordinateur.

**Description** (4000)

Le compagnon iPhone de Maîtrize, l'application gratuite des enseignants du premier degré, sur Mac et Windows.

DICTER EN CLASSE
Un bouton, un chronomètre. Ce que vous dites à 10 h 12 part, scellé, vers votre ordinateur, par votre Nuage (apps.education.fr). L'ordinateur le transcrit sur place et le range au bon créneau du cahier journal. Le téléphone, lui, ne peut pas le relire.

LE CAHIER JOURNAL DU JOUR
Le prévu de la journée, publié par votre ordinateur et chiffré pour votre téléphone seul. Des notes rapides, écrites ou dictées.

LES TABLETTES DES ÉLÈVES
Le téléphone ouvre un portail sur le réseau de la classe. Les tablettes le rejoignent par un QR code, dans leur navigateur, sans compte ni application.
• Une tablette par élève : ses fiches, son minuteur, et la suivante quand il a fini.
• Le déroulement du créneau en pictogrammes.
• La consigne en étapes, qui se coche du doigt et s'écoute.

PHOTOS ET MANUELS
Photographiez l'objet de la classe pour vos pictogrammes, ou les pages d'un manuel que l'ordinateur vous demande.

VOS DONNÉES
Ni compte Maîtrize, ni serveur Maîtrize, ni publicité, ni pistage. Les dictées, les notes et les photos qui passent par Nuage sont chiffrées de bout en bout pour votre ordinateur.

Il faut l'application Maîtrize sur votre ordinateur (gratuite, maitrize.com) et, pour les dictées et le cahier journal, un compte Nuage de l'Éducation nationale.

**Mots-clés** (100)

dictaphone,enseignant,classe,école,cahier journal,tablette,consigne,pictogramme,minuteur,IME,ULIS

**URL d'assistance** : https://maitrize.com/faq
**URL marketing** : https://maitrize.com
**Politique de confidentialité** : https://maitrize.com/politique-de-confidentialite (le compagnon doit y être décrit avant l'envoi)
**Copyright** : 2026 Clément Titet

## Confidentialité de l'app (App Privacy)

« Aucune donnée collectée ». Au sens d'Apple, « collecter » veut dire
transmettre hors de l'appareil d'une façon qui permet au développeur ou à
ses partenaires d'y accéder. Ici :
- les dictées, notes et photos partent scellées pour l'ordinateur de
  l'enseignant, dans son propre Nuage : ni Maitrize ni personne d'autre ne
  peut les rouvrir ;
- les pages d'un manuel et les photos que l'ordinateur demande par un QR
  code vont droit à lui, sur le réseau de la classe ;
- le cahier journal et l'emploi du temps arrivent chiffrés pour le téléphone ;
- le portail des tablettes reste sur le réseau de la classe ;
- aucune mesure d'audience, aucune publicité, aucun serveur Maitrize.

## Conformité à l'export (chiffrement)

Sur l'iPhone, le compagnon ne chiffre qu'avec Apple :
- CryptoKit scelle les dépôts et ouvre le retour (X25519, HKDF-SHA-256, ChaCha20-Poly1305 : voir `relais/apple`) ;
- le TLS du système (Security) parle à Nuage ;
- le binaire ne contient aucun algorithme de chiffrement à lui (`cargo tree --target aarch64-apple-ios` ; `nm`).

Réponses dans App Store Connect :
- « Votre app utilise-t-elle le chiffrement ? » : oui.
- « Quel type d'algorithmes ? » : aucun de ceux de la liste, c'est-à-dire seulement le chiffrement du système d'Apple.

Aucun document n'est alors demandé, pas même la déclaration française.

## Informations pour la vérification (App Review)

- **Connexion requise** : non — pas de compte Maitrize. Mais le
  téléphone se relie à l'ordinateur par un QR code, et les dictées passent
  par Nuage, le service de l'Éducation nationale réservé à ses personnels.
- **Notes** :

The app is the iPhone companion of Maîtrize, a free and open-source desktop app (Mac/Windows) for French primary-school teachers: https://maitrize.com. It records the teacher's dictations in class and sends them, end-to-end encrypted, to the teacher's own computer through the teacher's Nuage folder (apps.education.fr, the French Ministry of Education's cloud, reserved to its staff). The computer transcribes them and files them in the class diary. The phone also serves a local web page to the students' tablets (task instructions, schedule, timer), over the classroom network.

Without a paired computer and a Nuage account, the Journal and Notes tabs ask to pair. The Tablets tab works on its own: "Ouvrir le portail" shows a QR code that any tablet on the same network can open.

A demo video showing pairing, a dictation and the tablets: [lien de la vidéo]
