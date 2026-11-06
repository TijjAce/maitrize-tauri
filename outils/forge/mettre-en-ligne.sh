#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.
#
# Met en ligne sur la Forge le téléchargement d'une version : lancé par la construction de la
# Forge sur une étiquette v1.2.3 (voir .gitlab-ci.yml), jamais à la main.
#
# Les fichiers viennent de la version publiée sur GitHub : le Mac ne se construit et ne se notarise
# que sur un Mac, et l'installeur Windows y est signé. Publier sur GitHub d'abord, sur la Forge ensuite.
#
# Le lien de téléchargement ne change jamais d'une version à l'autre :
#   https://forge.apps.education.fr/clementtitet/maitrize/-/releases/permalink/latest/downloads/Maitrize-Mac.dmg
#   https://forge.apps.education.fr/clementtitet/maitrize/-/releases/permalink/latest/downloads/Maitrize-Windows.exe
set -euo pipefail

etiquette="${CI_COMMIT_TAG:?Ce script ne tourne que sur une étiquette de version, sur la Forge.}"
version="${etiquette#v}"
github="https://github.com/TijjAce/maitrize-tauri/releases/download/$etiquette"
paquets="$CI_API_V4_URL/projects/$CI_PROJECT_ID/packages/generic/maitrize/$version"
dossier=$(mktemp -d)
trap 'rm -rf "$dossier"' EXIT

# Reprend un fichier de GitHub, le dépose sur la Forge. Répond par l'adresse de son dépôt.
reprendre() {
  local origine="$1" nom="$2"
  curl --fail --location --silent --show-error --retry 3 --output "$dossier/$nom" "$github/$origine" || {
    echo "$origine n'est pas sur GitHub pour $etiquette : publier d'abord la version sur GitHub, puis relancer ce job." >&2
    exit 1
  }
  curl --fail --silent --show-error --retry 3 --header "JOB-TOKEN: $CI_JOB_TOKEN" \
    --upload-file "$dossier/$nom" "$paquets/$nom" > /dev/null
  rm -f "$dossier/$nom"
  echo "$nom déposé." >&2
  echo "$paquets/$nom"
}

mac=$(reprendre "Maitrize.V2_${version}_universal.dmg" "Maitrize-$version-Mac.dmg")
windows=$(reprendre "Maitrize.V2_${version}_x64-setup.exe" "Maitrize-$version-Windows.exe")

# Une seconde tentative du job trouve la version déjà créée : ses liens sont déjà les bons.
code=$(curl --silent --output /dev/null --write-out '%{http_code}' --header "JOB-TOKEN: $CI_JOB_TOKEN" \
  "$CI_API_V4_URL/projects/$CI_PROJECT_ID/releases/$etiquette")
if [ "$code" = 200 ]; then
  echo "La version $etiquette existe déjà : ses fichiers sont remplacés, ses liens restent."
  exit 0
fi

# Les notes : la partie de cette version dans CHANGELOG.md.
notes=$(awk -v titre="## $version" '$0 == titre { dedans = 1; next } /^## / { dedans = 0 } dedans' CHANGELOG.md)
[ -n "$notes" ] || { echo "CHANGELOG.md n'a pas de partie $version." >&2; exit 1; }

jq --null-input \
  --arg nom "Maitrize $version" --arg tag "$etiquette" --arg notes "$notes" \
  --arg mac "$mac" --arg windows "$windows" '{
    name: $nom, tag_name: $tag, description: $notes,
    assets: { links: [
      { name: "Maitrize pour Mac", url: $mac, direct_asset_path: "/Maitrize-Mac.dmg", link_type: "package" },
      { name: "Maitrize pour Windows", url: $windows, direct_asset_path: "/Maitrize-Windows.exe", link_type: "package" }
    ] }
  }' > "$dossier/version.json"

curl --fail-with-body --silent --show-error --header "JOB-TOKEN: $CI_JOB_TOKEN" \
  --header "Content-Type: application/json" --data "@$dossier/version.json" \
  "$CI_API_V4_URL/projects/$CI_PROJECT_ID/releases" > /dev/null

echo "Version $etiquette en ligne sur la Forge."
