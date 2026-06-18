# Publication — Maitrize V2

App Tauri 2. Identifiant : `fr.clementsapp.maitrizev2`. Nom affiché : **Maitrize V2**.

Config déjà en place :
- Pas d'API privée macOS (fenêtre opaque) → compatible stores.
- App Sandbox via `src-tauri/entitlements.plist` (sandbox + réseau client + fichiers choisis par l'utilisateur).
- Ouverture/impression de fichiers via le plugin **opener** (NSWorkspace) → compatible sandbox (pas de `open`/`osascript`).
- `tauri.conf.json` : catégorie Education, descriptions, copyright, macOS min 11.0.

> ⚠️ L'impression (PDF planning, fiches matériel) **ouvre le document dans Aperçu**, puis l'utilisateur imprime avec ⌘P (dialogue AirPrint). L'ancien déclenchement automatique du dialogue (AppleScript) a été retiré car interdit en sandbox.

---

## 🍎 Mac App Store

### 1. Comptes & identité
- **Apple Developer Program** (99 €/an) : https://developer.apple.com
- Sur **App Store Connect** : nouvelle app → identifiant `fr.clementsapp.maitrizev2`.

### 2. Certificats & profil (depuis le Mac)
Dans Xcode (Réglages → Comptes) ou developer.apple.com, génère :
- **Apple Distribution** (signature de l'app)
- **Mac Installer Distribution** (signature du `.pkg`)
- un **provisioning profile** « Mac App Store » pour `fr.clementsapp.maitrizev2`
  → place-le dans `src-tauri/embedded.provisionprofile`.

### 3. Build signé
```bash
export APPLE_SIGNING_IDENTITY="Apple Distribution: Ton Nom (TEAMID)"
cd maitrize-tauri
npm run tauri build -- --bundles app
```
Puis empaqueter en `.pkg` signé installeur :
```bash
APP="src-tauri/target/release/bundle/macos/Maitrize V2.app"
productbuild --component "$APP" /Applications \
  --sign "3rd Party Mac Developer Installer: Ton Nom (TEAMID)" \
  "Maitrize V2.pkg"
```
> Le provisioning profile doit être embarqué dans l'`.app` (`Contents/embedded.provisionprofile`) et l'`.app` signé avec les entitlements (`entitlements.plist`). Tauri applique `entitlements` automatiquement quand `APPLE_SIGNING_IDENTITY` est défini.

### 4. Envoi
- App **Transporter** (Mac App Store) → glisser le `.pkg`, ou `xcrun iTMSTransporter`.
- Remplir la fiche App Store Connect (captures, description, confidentialité) → soumettre à la revue.

### Points de vigilance revue Apple
- App Sandbox actif ✅ (entitlements fournis).
- Aucune API privée ✅.
- Si tu ajoutes un accès à un dossier hors sandbox plus tard, il faudra l'entitlement correspondant + justification.

---

## 🪟 Microsoft Store

### 1. Compte
- **Microsoft Partner Center** (~19 € une fois) : https://partner.microsoft.com
- Réserver le **nom** « Maitrize V2 ».

### 2. Build Windows
Sur une machine Windows (ou CI Windows) :
```bash
npm run tauri build
```
→ produit un `.msi` (WiX) et un `.exe` (NSIS) dans `src-tauri/target/release/bundle/`.

### 3. Soumission
Deux options selon le format accepté :
- **MSIX** (recommandé Store) : empaqueter la sortie avec le *MSIX Packaging Tool* ou `MakeAppx`, puis soumettre. La signature est gérée par le Store.
- **Installeur classique** (`.msi`/`.exe`) : le Store accepte désormais les apps « non empaquetées » → soumettre directement le `.msi`.

> La signature de code Windows (certificat EV/OV) supprime l'avertissement SmartScreen en distribution directe, mais n'est **pas requise** pour passer par le Microsoft Store.

---

## 🔁 Mises à jour
Pour des mises à jour hors store (distribution directe), ajouter le **plugin updater** de Tauri + héberger les binaires (GitHub Releases). Sur les stores, les mises à jour passent par le store (nouveau build soumis).

## Versionnage
Avant chaque soumission, incrémenter `version` dans `src-tauri/tauri.conf.json` (ex. `1.0.0`).
