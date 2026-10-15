#!/bin/sh
# Construit le dictaphone pour iPhone, et rend un .ipa signé.
#
#   sh construire-iphone.sh                              pour le téléphone de l'enseignant
#   EXPORT=app-store-connect sh construire-iphone.sh     pour l'App Store
#
# Le numéro de build (CFBundleVersion) est `bundle.iOS.bundleVersion` dans
# tauri.conf.json : l'App Store en veut un nouveau à chaque envoi.
#
# Le détour par `--debug` n'est pas un choix : Xcode 27 embarque Swift 6.4,
# dont le nouveau moteur de compilation donne une visibilité locale aux
# fonctions `@_cdecl` non publiques. En release, les symboles du pont Swift de
# Tauri — `run_plugin_command`, `string_from_bytes`, `retain_object` — ne sont
# plus exportés, et l'édition de liens échoue.
#
#   https://github.com/tauri-apps/tauri/issues/16130
#
# Le contournement, donné par le rapport : compiler en configuration debug,
# où la visibilité reste correcte, et optimiser la partie Rust par les
# variables du profil. On obtient un binaire optimisé sans le bogue.
#
# À retirer quand Tauri aura marqué ses entrées `@_cdecl` comme publiques.

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

CARGO_PROFILE_DEV_OPT_LEVEL=3 \
CARGO_PROFILE_DEV_DEBUG=line-tables-only \
CARGO_PROFILE_DEV_DEBUG_ASSERTIONS=false \
CARGO_PROFILE_DEV_OVERFLOW_CHECKS=false \
LANG=en_US.UTF-8 \
  npm run tauri -- ios build --debug --target aarch64 --export-method "${EXPORT:-debugging}" "$@"
