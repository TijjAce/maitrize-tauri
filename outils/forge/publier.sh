#!/bin/bash
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.
#
# Publie ce que contient HEAD sur la Forge des communs numériques éducatifs.
#
#   outils/forge/publier.sh             un commit signé sur la branche main de la Forge
#   outils/forge/publier.sh --version   le même commit, plus l'étiquette signée de la version
#                                       (celle de tauri.conf.json) : la Forge met alors en ligne
#                                       le téléchargement de cette version
#
# Sur la Forge, le code a sa propre histoire : un commit par publication, signé. Le dossier de
# travail, l'index et les autres branches n'y vont jamais : seul l'arbre de HEAD part.
set -euo pipefail

FORGE="git@forge.apps.education.fr:clementtitet/maitrize.git"
CLE="$HOME/.ssh/forge_maitrize"
NOM="Clément Titet"
COURRIEL="19336-clementtitet@users.noreply.forge.apps.education.fr"
COPIE="$HOME/Developer/maitrize/maitrize-forge.git"
# Ce qui ne concerne que ce Mac.
A_LAISSER=(.claude)

avec_version=non
premiere=non
essai=non
for argument in "$@"; do
  case "$argument" in
    --version) avec_version=oui ;;
    --premiere) premiere=oui ;; # une seule fois : remplace tout ce que la Forge contient
    --essai) essai=oui ;; # prépare et signe tout, n'envoie rien
    *) echo "Argument inconnu : $argument" >&2; exit 2 ;;
  esac
done

depot=$(git rev-parse --show-toplevel)
version=$(sed -nE 's/^ *"version": "([^"]+)".*/\1/p' "$depot/src-tauri/tauri.conf.json" | head -1)
[ -n "$version" ] || { echo "Version introuvable dans tauri.conf.json." >&2; exit 1; }

# Les notes de la version se lisent dans CHANGELOG.md, tel que HEAD le contient.
if [ "$avec_version" = oui ] && ! git -C "$depot" show HEAD:CHANGELOG.md | grep -qx "## $version"; then
  echo "CHANGELOG.md n'a pas de partie $version : lancer outils/forge/journal-des-versions.mjs et committer." >&2
  exit 1
fi
# Un fichier neuf sans mention d'auteur se signale, sans arrêter la publication.
python3 -I "$depot/outils/forge/mention-auteur.py" --verifier || true

# La clé attend dans le trousseau du Mac.
ssh-add -l 2>/dev/null | grep -q "$(ssh-keygen -lf "$CLE.pub" | awk '{print $2}')" || ssh-add --apple-use-keychain "$CLE"
export GIT_SSH_COMMAND="ssh -i $CLE -o IdentitiesOnly=yes"

# La copie locale de la Forge : un dépôt nu, qui emprunte ses objets à celui-ci.
if [ ! -d "$COPIE" ]; then
  git init --bare -q -b main "$COPIE"
  git --git-dir="$COPIE" remote add origin "$FORGE"
fi
echo "$depot/.git/objects" > "$COPIE/objects/info/alternates"
forge() {
  git --git-dir="$COPIE" -c user.name="$NOM" -c user.email="$COURRIEL" \
    -c gpg.format=ssh -c user.signingkey="$CLE.pub" "$@"
}

parent=""
if [ "$premiere" = non ]; then
  forge fetch -q origin +refs/heads/main:refs/heads/main
  parent=$(forge rev-parse refs/heads/main)
fi

# L'arbre de HEAD, sans ce qui reste ici.
dossier=$(mktemp -d)
trap 'rm -rf "$dossier"' EXIT
export_index="$dossier/index"
GIT_INDEX_FILE="$export_index" git -C "$depot" read-tree HEAD
GIT_INDEX_FILE="$export_index" git -C "$depot" rm -r -q --cached --ignore-unmatch -- "${A_LAISSER[@]}"
arbre=$(GIT_INDEX_FILE="$export_index" git -C "$depot" write-tree)

# Aucun prénom de la classe dans ce qui s'ajoute.
arbre_avant=""
[ -z "$parent" ] || arbre_avant=$(forge rev-parse "$parent^{tree}")
python3 -I "$depot/outils/forge/sans-prenom.py" "$COPIE" "$arbre_avant" "$arbre"

if [ "$arbre_avant" = "$arbre" ] && [ "$avec_version" = non ]; then
  echo "Rien de neuf à publier."
  exit 0
fi

message="Maitrize $version"
if [ "$arbre_avant" = "$arbre" ]; then
  commit="$parent"
else
  commit=$(forge commit-tree -S "$arbre" ${parent:+-p "$parent"} -m "$message")
fi

refs=("$commit:refs/heads/main")
if [ "$avec_version" = oui ]; then
  etiquette="v$version"
  forge tag -s -f -m "$message" "$etiquette" "$commit"
  refs+=("refs/tags/$etiquette")
fi

if [ "$essai" = oui ]; then
  echo "Essai, rien d'envoyé : $commit, arbre $arbre."
  forge log -1 --show-signature --format='%an <%ae> %s' "$commit" 2>&1 | tail -3
  forge ls-tree --name-only "$commit" | tr '\n' ' '
  echo
  exit 0
fi

if [ "$premiere" = oui ]; then
  forge push --force origin "${refs[@]}"
else
  forge push origin "${refs[@]}"
fi
forge update-ref refs/heads/main "$commit"

echo "Publié sur la Forge : $commit ${etiquette:-}"
