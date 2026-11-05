#!/bin/sh
# Construit le classeur pour iPad et iPhone, et rend un .ipa signé.
#
#   sh construire-ios.sh                              pour les appareils de l'enseignant
#   EXPORT=app-store-connect sh construire-ios.sh     pour l'App Store (plus tard)
#
# Le numéro de build (CFBundleVersion) est `bundle.iOS.bundleVersion` dans
# src-tauri/tauri.conf.json : l'App Store en veut un nouveau à chaque envoi.
# Monté comme le compagnon (../compagnon/construire-iphone.sh), sauf qu'il
# garde l'iPad : un classeur de communication se lit d'abord sur une tablette.

set -e
cd "$(dirname "$0")"

# Le Rust de rustup, qui a les cibles iOS, devant celui de Homebrew (sans elles : « can't find crate for `std` »).
if [ -d "$HOME/.cargo/bin" ]; then
  export PATH="$HOME/.cargo/bin:$PATH"
fi
# La ligne de commande de Tauri du classeur (npm install), épinglée sur celle du compagnon : Xcode la rappelle par npm.
[ -x node_modules/.bin/tauri ] || npm install --no-audit --no-fund

# Le projet Xcode est généré (`tauri ios init`) et n'est pas suivi par git.
APPLE=src-tauri/gen/apple
if [ ! -d "$APPLE" ]; then
  LANG=en_US.UTF-8 npm run tauri -- ios init --ci
fi
# Tauri n'y recopie pas ce qui suit : on le remet à chaque construction.
#  - Les icônes : la bulle aux quatre cases devant le Z.
cp src-tauri/icons/ios/*.png "$APPLE/Assets.xcassets/AppIcon.appiconset/"
#  - Le manifeste de confidentialité, parmi les ressources de l'application.
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
