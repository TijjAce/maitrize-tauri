#!/usr/bin/env bash
# Build + packaging Mac App Store pour Maitrize V2.
#
# Prérequis (une fois) :
#   - certificats "Apple Distribution" et "Mac Installer Distribution" installés
#     dans le trousseau ;
#   - provisioning profile « Mac App Store » déposé : src-tauri/embedded.provisionprofile
#
# Usage :
#   export APPLE_SIGNING_IDENTITY="Apple Distribution: Ton Nom (TEAMID)"
#   export APPLE_INSTALLER_IDENTITY="3rd Party Mac Developer Installer: Ton Nom (TEAMID)"
#   ./build-mas.sh
set -euo pipefail
cd "$(dirname "$0")"

APP_NAME="Maitrize V2"
APP_CERT="${APPLE_SIGNING_IDENTITY:?Définis APPLE_SIGNING_IDENTITY (voir: security find-identity -v -p codesigning)}"
INSTALLER_CERT="${APPLE_INSTALLER_IDENTITY:?Définis APPLE_INSTALLER_IDENTITY (voir: security find-identity -v)}"
PROFILE="src-tauri/embedded.provisionprofile"
ENTITLEMENTS="src-tauri/entitlements.plist"

[ -f "$PROFILE" ]      || { echo "❌ Manque $PROFILE"; exit 1; }
[ -f "$ENTITLEMENTS" ] || { echo "❌ Manque $ENTITLEMENTS"; exit 1; }

echo "▶︎ 0/4 Cibles Rust (arm64 + x86_64 pour binaire universel)…"
rustup target add aarch64-apple-darwin x86_64-apple-darwin >/dev/null 2>&1 || true

echo "▶︎ 1/4 Build universel (Tauri signe l'app avec $APP_CERT)…"
npm run tauri build -- --bundles app --target universal-apple-darwin

APP="src-tauri/target/universal-apple-darwin/release/bundle/macos/${APP_NAME}.app"
[ -d "$APP" ] || { echo "❌ App introuvable : $APP"; exit 1; }

echo "▶︎ 2/4 Embarquement du provisioning profile…"
cp "$PROFILE" "$APP/Contents/embedded.provisionprofile"

echo "▶︎ 3/4 Nettoyage des attributs étendus (quarantine) + re-signature…"
# com.apple.quarantine (fichiers issus du web) est interdit sur l'App Store.
xattr -cr "$APP"
codesign --force --deep --entitlements "$ENTITLEMENTS" --sign "$APP_CERT" "$APP"

echo "▶︎ 4/4 Création du .pkg signé installeur…"
rm -f "${APP_NAME}.pkg"
productbuild --component "$APP" /Applications --sign "$INSTALLER_CERT" "${APP_NAME}.pkg"

echo "✅ Terminé : ${APP_NAME}.pkg"
echo "   → Envoie-le avec l'app Transporter (ou: xcrun altool/notarytool)."
