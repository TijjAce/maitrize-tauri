#!/bin/sh
# Construit le dictaphone pour iPhone, et rend un .ipa signé.
#
#   sh construire-iphone.sh                              pour le téléphone de l'enseignant
#   EXPORT=app-store-connect sh construire-iphone.sh     pour l'App Store
#
# Le numéro de build (CFBundleVersion) est `bundle.iOS.bundleVersion` dans
# tauri.conf.json : l'App Store en veut un nouveau à chaque envoi.
#
# Une construction de publication : l'App Store refuse celle de débogage, où
# Xcode sépare l'application en un lanceur et une bibliothèque de débogage
# (« Invalid Signature » à l'envoi). Le détour par `--debug` n'est plus
# nécessaire : Xcode 27 rendait invisibles les entrées `@_cdecl` non
# publiques des paquets Swift (https://github.com/tauri-apps/tauri/issues/16130),
# et Tauri 2.12.3, le greffon de dialogue 2.8.3 et notre scanner les
# déclarent maintenant publiques.

set -e
cd "$(dirname "$0")"

# rustup fournit les cibles iOS, et vit dans ~/.cargo — que `sh` ne connaît
# pas si le script est lancé autrement que depuis un terminal ouvert.
if [ -f "$HOME/.cargo/env" ]; then
  . "$HOME/.cargo/env"
fi

# Le projet Xcode, généré, n'est pas suivi par git, et Tauri n'y recopie pas
# ce qui suit : on le remet à chaque construction.
#  - Les icônes du « Z », dans le catalogue d'images : le projet gardait
#    celles de Tauri par défaut.
#  - L'iPhone seul : l'écran est fait pour le pouce, pas pour l'iPad, qui
#    peut toujours l'ouvrir comme une application d'iPhone.
APPLE=src-tauri/gen/apple
cp src-tauri/icons/ios/*.png "$APPLE/Assets.xcassets/AppIcon.appiconset/"
sed -i '' 's/TARGETED_DEVICE_FAMILY = "1,2";/TARGETED_DEVICE_FAMILY = 1;/' "$APPLE"/*.xcodeproj/project.pbxproj
#  - Le manifeste de confidentialité, que l'App Store exige, parmi les
#    ressources de l'application : à côté de l'écran de lancement.
cp src-tauri/PrivacyInfo.xcprivacy "$APPLE/"
python3 - "$APPLE"/*.xcodeproj/project.pbxproj <<'PY'
import sys
p = sys.argv[1]
s = open(p, encoding="utf-8").read()
if "PrivacyInfo.xcprivacy" not in s:
    fichier, ressource = "A1B2C3D4E5F6A7B8C9D0E1F2", "F2E1D0C9B8A7F6E5D4C3B2A1"
    def apres(ancre, ajout):
        global s
        i = s.index(ancre) + len(ancre)
        s = s[:i] + ajout + s[i:]
    apres("/* Begin PBXBuildFile section */\n",
          f"\t\t{ressource} /* PrivacyInfo.xcprivacy in Resources */ = {{isa = PBXBuildFile; fileRef = {fichier} /* PrivacyInfo.xcprivacy */; }};\n")
    apres("/* Begin PBXFileReference section */\n",
          f"\t\t{fichier} /* PrivacyInfo.xcprivacy */ = {{isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = \"<group>\"; }};\n")
    # Le groupe et la phase des ressources : ceux de l'écran de lancement.
    reference = s.split(" /* LaunchScreen.storyboard */ = {isa = PBXFileReference")[0].rsplit("\t", 1)[1]
    construit = s.split(" /* LaunchScreen.storyboard in Resources */ = {isa = PBXBuildFile")[0].rsplit("\t", 1)[1]
    apres(f"\t\t\t\t{reference} /* LaunchScreen.storyboard */,\n", f"\t\t\t\t{fichier} /* PrivacyInfo.xcprivacy */,\n")
    apres(f"\t\t\t\t{construit} /* LaunchScreen.storyboard in Resources */,\n", f"\t\t\t\t{ressource} /* PrivacyInfo.xcprivacy in Resources */,\n")
    open(p, "w", encoding="utf-8").write(s)
PY

LANG=en_US.UTF-8 \
  npm run tauri -- ios build --target aarch64 --export-method "${EXPORT:-debugging}" "$@"
