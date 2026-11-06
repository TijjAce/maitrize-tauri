# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.
#
# Refuse une publication si ce qu'elle ajoute contient le prénom d'un élève de la classe.
#
#   python3 -I sans-prenom.py <dépôt> <arbre d'avant, ou rien> <arbre à publier>
#
# La liste se lit dans la base de cet ordinateur, en lecture seule. Le script ne montre
# jamais un prénom : il donne des comptes, par fichier. Sans base (un autre ordinateur), il le dit
# et laisse passer : la vérification n'a de sens que là où se trouve la classe.
import os
import re
import sqlite3
import subprocess
import sys
import unicodedata

BASE = os.path.expanduser("~/Library/Application Support/fr.clementsapp.maitrize/maitrize.sqlite3")
# Ce qui a déjà été vérifié : homonymes publics et listes génériques, sans lien avec la classe.
ACCEPTES = {
    "src/prenomsCourants.ts",
    "src/confidentialite.ts",
    "src/data/livresDeReference.json",
    "classeur/src/donnees/arasaac-fr.json",
}


def plat(texte):
    texte = unicodedata.normalize("NFD", texte)
    return "".join(c for c in texte if not unicodedata.combining(c)).casefold()


MOT = re.compile(r"[^\W\d_]+", re.UNICODE)


def mots(texte):
    texte = re.sub(r"\\[ntr]", " ", texte)  # « \nPrénom » : l'échappement collé au mot
    texte = re.sub(r"(?<=[a-zà-ÿ])(?=[A-ZÀ-Ý])", " ", texte)  # camelCase
    return [plat(m) for m in MOT.findall(texte)]


def main():
    depot, avant, apres = sys.argv[1], sys.argv[2], sys.argv[3]
    if not os.path.exists(BASE):
        print("Pas de base sur cet ordinateur : prénoms non vérifiés.")
        return 0
    connexion = sqlite3.connect(f"file:{BASE}?mode=ro", uri=True)
    prenoms = set()
    for (nom,) in connexion.execute("select nom from eleves"):
        prenoms.update(m for m in mots(nom or "") if len(m) >= 3)
    if not prenoms:
        print("Liste des élèves vide : prénoms non vérifiés.", file=sys.stderr)
        return 1

    if avant:
        sortie = subprocess.run(
            ["git", "-C", depot, "diff", "--unified=0", "--no-renames", avant, apres],
            capture_output=True, check=True,
        ).stdout.decode("utf-8", "replace")
    else:
        sortie = subprocess.run(
            ["git", "-C", depot, "diff", "--unified=0", "--no-renames",
             "4b825dc642cb6eb9a060e54bf8d69288fbee4904", apres],
            capture_output=True, check=True,
        ).stdout.decode("utf-8", "replace")

    fichier, comptes = "", {}
    for ligne in sortie.split("\n"):
        if ligne.startswith("+++ "):
            fichier = ligne[6:] if ligne.startswith("+++ b/") else ""
        elif ligne.startswith("+") and fichier and fichier not in ACCEPTES:
            n = sum(1 for m in mots(ligne[1:]) if m in prenoms)
            if n:
                comptes[fichier] = comptes.get(fichier, 0) + n

    if not comptes:
        print("Aucun prénom de la classe dans ce qui s'ajoute.")
        return 0
    print("Mots qui ressemblent à un prénom de la classe, à vérifier avant de publier :", file=sys.stderr)
    for f, n in sorted(comptes.items(), key=lambda x: -x[1]):
        print(f"  {n:4d}  {f}", file=sys.stderr)
    if os.environ.get("FORGE_PRENOMS_VERIFIES") == "oui":
        print("Vérifiés à la main : la publication continue.", file=sys.stderr)
        return 0
    print("Publication arrêtée. Une fois vérifié, relancer avec FORGE_PRENOMS_VERIFIES=oui.", file=sys.stderr)
    return 1


sys.exit(main())
