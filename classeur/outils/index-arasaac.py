#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

"""L'index des pictos d'ARASAAC en français, embarqué dans le classeur.

La recherche d'ARASAAC passe par son service en ligne, qui peut tomber (le
5 novembre 2026, il répondait « erreur 500 » à toute recherche). L'index des
mots, lui, tient en quelques centaines de kilo-octets : embarqué, la
recherche marche hors ligne et sans attendre ; seule l'image choisie se
télécharge, une fois.

Il se tire du fichier des métadonnées que Maitrize garde sur l'ordinateur
(Réglages › banque ARASAAC) :
    python3 -I classeur/outils/index-arasaac.py "<…>/ARASAAC/metadata.json" classeur/src/donnees/arasaac-fr.json

Chaque entrée : [identifiant, « mot|autre mot|pluriel… », nature du premier
mot (1 nom propre, 2 nom commun, 3 verbe, 4 descriptif, 5 social, 6 divers)].
Tous les pictos y sont, ceux qu'ARASAAC marque « sexe » ou « violence »
compris : « dans le milieu du handicap, parfois il faut pouvoir interdire à
l'enfant d'avoir des comportements violents » (l'enseignant, 5 novembre
2026) — dire « on ne tape pas », nommer le corps, poser les règles de
l'intimité.

Les pictogrammes et leurs mots sont de Sergio Palao, pour ARASAAC
(https://arasaac.org), propriété du Gouvernement d'Aragon, sous licence
Creative Commons BY-NC-SA.
"""
import json
import sys

source, sortie = sys.argv[1], sys.argv[2]
pictos = json.load(open(source, encoding="utf-8"))
index = []
for p in pictos:
    if not isinstance(p.get("_id"), int):
        continue
    mots = []
    for k in p.get("keywords") or []:
        for m in (k.get("keyword"), k.get("plural")):
            if isinstance(m, str) and m.strip() and m.strip() not in mots:
                mots.append(m.strip())
    if not mots:
        continue
    nature = (p.get("keywords") or [{}])[0].get("type") or 6
    index.append([p["_id"], "|".join(mots), nature])
index.sort(key=lambda e: e[0])
with open(sortie, "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, separators=(",", ":"))
print(f"{len(index)} pictos, {sum(len(e[1]) for e in index)} caractères de mots")
