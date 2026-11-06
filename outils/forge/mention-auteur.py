# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.
#
# Pose la mention d'auteur et de licence en tête de chaque fichier source du projet.
#
#   python3 -I outils/forge/mention-auteur.py             pose ce qui manque
#   python3 -I outils/forge/mention-auteur.py --verifier  compte ce qui manque, ne touche à rien
#
# Le contenu des fichiers ne bouge pas : seules les deux lignes s'ajoutent, en respectant ce qui
# doit rester en première ligne (#! d'un script, version de Swift, @charset) et les fins de ligne.
import os
import subprocess
import sys

LICENCE = "SPDX-License-Identifier: AGPL-3.0-or-later"
AUTEUR = "Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet."

COMMENTAIRES = {
    ".ts": "// {}", ".tsx": "// {}", ".mjs": "// {}", ".js": "// {}", ".rs": "// {}", ".swift": "// {}",
    ".py": "# {}", ".sh": "# {}", ".ps1": "# {}",
    ".css": "/* {} */",
}
# Ce qui n'est pas de lui, ou que les outils régénèrent.
A_LAISSER = ("compagnon/public/jsQR.js",)
DOSSIERS_GENERES = ("src-tauri/gen/", "compagnon/src-tauri/gen/", "classeur/src-tauri/gen/")


def a_marquer(chemin):
    if chemin in A_LAISSER or chemin.startswith(DOSSIERS_GENERES) or chemin.endswith(".d.ts"):
        return False
    return os.path.splitext(chemin)[1] in COMMENTAIRES and os.path.isfile(chemin) and not os.path.islink(chemin)


def premieres_lignes_a_garder(contenu):
    """Le nombre d'octets qui doivent rester avant la mention."""
    debut = 3 if contenu.startswith(b"\xef\xbb\xbf") else 0
    position = debut
    for _ in range(2):
        fin = contenu.find(b"\n", position)
        if fin < 0:
            return position
        ligne = contenu[position:fin]
        if position == debut and (
            ligne.startswith(b"#!/") or ligne.startswith(b"#! /")
            or ligne.startswith(b"// swift-tools-version") or ligne.startswith(b"@charset")
        ):
            position = fin + 1
        elif b"coding" in ligne and ligne.startswith(b"#"):  # l'encodage d'un script Python
            position = fin + 1
        else:
            break
    return position


def marquer(chemin):
    with open(chemin, "rb") as f:
        contenu = f.read()
    gabarit = COMMENTAIRES[os.path.splitext(chemin)[1]]
    premiere_fin = contenu.find(b"\n")
    fin = b"\r\n" if premiere_fin > 0 and contenu[premiere_fin - 1:premiere_fin] == b"\r" else b"\n"
    mention = (gabarit.format(LICENCE).encode() + fin + gabarit.format(AUTEUR).encode() + fin + fin)
    position = premieres_lignes_a_garder(contenu)
    with open(chemin, "wb") as f:  # écrit dans le même fichier : ses droits ne bougent pas
        f.write(contenu[:position] + mention + contenu[position:])


def main():
    verifier = "--verifier" in sys.argv[1:]
    racine = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, check=True, text=True).stdout.strip()
    os.chdir(racine)
    fichiers = subprocess.run(["git", "ls-files", "-z"], capture_output=True, check=True).stdout.decode().split("\0")
    manquants = []
    for chemin in filter(a_marquer, fichiers):
        with open(chemin, "rb") as f:
            if LICENCE.encode() not in f.read(600):
                manquants.append(chemin)
    if verifier:
        if manquants:
            print(f"{len(manquants)} fichiers sans mention d'auteur, à poser avec outils/forge/mention-auteur.py :")
            for chemin in manquants[:10]:
                print(f"  {chemin}")
            return 1
        return 0
    for chemin in manquants:
        marquer(chemin)
    print(f"Mention posée sur {len(manquants)} fichiers.")
    return 0


sys.exit(main())
