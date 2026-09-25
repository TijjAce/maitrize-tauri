#!/bin/sh
# Construit le dictaphone pour iPhone, et rend un .ipa signé.
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

CARGO_PROFILE_DEV_OPT_LEVEL=3 \
CARGO_PROFILE_DEV_DEBUG=line-tables-only \
CARGO_PROFILE_DEV_DEBUG_ASSERTIONS=false \
CARGO_PROFILE_DEV_OVERFLOW_CHECKS=false \
LANG=en_US.UTF-8 \
  npm run tauri -- ios build --debug --target aarch64 --export-method debugging "$@"
