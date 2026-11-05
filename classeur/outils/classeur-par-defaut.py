#!/usr/bin/env python3
"""Le classeur complet, livré avec l'application.

« Faut qu'il soit complété, le PODD, par défaut » (l'enseignant, 5 novembre
2026). Le PODD de Gayle Porter est protégé : ses pages ne sont pas
reproduites. Ce classeur-ci suit les mêmes principes — une page d'accueil
qui part des intentions (je veux, j'ai mal, je me sens, j'ai une question,
ça ne va pas), des pages de vocabulaire liées, les petits mots de tous les
jours — avec un vocabulaire et une organisation à nous, et les pictos
d'ARASAAC (Sergio Palao, Gouvernement d'Aragon, CC BY-NC-SA).

Pour chaque case : le mot écrit, le mot qui cherche son picto dans la banque
(ou son numéro, quand le premier trouvé n'est pas le bon), la nature (sa
couleur), ce qui se dit s'il diffère, la page qu'elle ouvre.

    python3 -I classeur/outils/classeur-par-defaut.py "<…>/ARASAAC" classeur "<…>/Lexique383.tsv"

Le troisième chemin, Lexique 3.83 (New & Pallier, lexique.org, CC BY-SA 4.0 ;
~/Developer/maitrize/sources/lexique), donne la fréquence des mots en
français parlé (sous-titres de films) : elle entre dans le poids des pictos
des ensembles par thème. Sans lui, seul l'ordre des pages compte.

écrit classeur/src/donnees/classeur-par-defaut.json et copie les images,
réduites, dans classeur/public/pictos/ : le classeur marche dès le premier
lancement, sans internet.
"""
import csv
import json
import math
import os
import re
import subprocess
import sys
import unicodedata

# Organisation, d'après la structure du PODD (les fichiers d'information de Gayle Porter) sans en reprendre les
# pages : des pages de 4 × 5 cases ; des sections numérotées (« 5a », « 5b ») que l'on parcourt en tournant
# la page ; une page 1 de l'essentiel, puis les débuts de phrase qui disent l'intention (je veux, ça ne va pas,
# j'ai une question…), puis l'index des catégories, qui mène à toutes les sections ; des liens qui
# devinent la suite (« j'ai mal » ouvre le corps, « j'ai faim » le repas). À droite de chaque page,
# l'application ajoute la colonne fixe (page 1, catégories, début de section, retour, oups) : elle n'est pas ici.
#
# Une case : (mot, picto : un mot à chercher ou un numéro, nature, dire, page ouverte).
# Natures : personne, verbe, nom, adjectif, social, question, petit mot.
# Une case d'une page où l'on arrive par un lien complète ce qui s'est dit avant : « je me sens » + « content »,
# « j'ai mal » + « à la tête », « on va » + « à la piscine », « jouer » + « au ballon », « manger » + « du pain ».
# Ce qui se dit porte donc l'article ou la préposition qui va avec le verbe de la page (« Continue d'améliorer la
# pertinence, fais toi-même les phrases et regarde si elles ont du sens », 5 novembre 2026) ; le mot écrit reste court.

def page(cle, nom, cases, suite=False, lignes=4, colonnes=5):
    return {"cle": cle, "nom": nom, "lignes": lignes, "colonnes": colonnes, "suite": suite, "cases": cases}

PAGES = [
    # 1 — L'essentiel : ce qui se dit vite, et la porte vers le reste.
    page("accueil", "L'essentiel", [
        ("j'ai quelque chose à dire", 28663, "social", None, "dire"),
        ("oui", "oui", "social", None, None),
        ("non", "non", "social", None, None),
        ("je ne sais pas", 7180, "social", None, None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "c'est fini", None),
        ("stop", "stop", "social", None, None),
        ("aide-moi", "aider", "social", None, None),
        ("attends", "attendre", "social", None, None),
        ("regarde", "regarder", "verbe", None, None),
        ("bonjour", "bonjour", "social", None, None),
        ("au revoir", "au revoir", "social", None, None),
        ("merci", "merci", "social", None, None),
        ("s'il te plaît", "s'il te plaît", "social", None, None),
        ("pardon", 11625, "social", None, None),
        ("toilettes", "toilettes", "nom", "je veux aller aux toilettes", None),
        ("je ne comprends pas", 27363, "social", None, None),
        ("ce n'est pas ça", 34639, "social", None, None),
        ("à moi", 7158, "social", "c'est à moi", None),
        ("à toi", 2608, "social", "c'est à toi", None),
    ]),
    # 2 — Les débuts de phrase : l'intention d'abord, chacun ouvre la page qui va avec.
    page("dire", "Je veux dire…", [
        ("je veux", "vouloir", "verbe", None, "veux"),
        ("on va", "aller", "verbe", None, "lieux"),
        ("faire", 11749, "verbe", None, "actions"),
        ("on joue", "jouer", "verbe", None, "jouer"),
        ("toilettes", "toilettes", "nom", "j'ai besoin d'aller aux toilettes", None),
        ("je me sens", "sentiment", "verbe", None, "sens"),
        ("j'ai mal", "douleur", "verbe", None, "mal"),
        ("ça ne va pas", 25315, "social", "quelque chose ne va pas", "probleme"),
        ("j'ai une question", "question", "question", None, "questions"),
        ("une pause", "pause", "nom", "j'ai besoin d'une pause", None),
        ("je te raconte", 6461, "verbe", "je te raconte quelque chose", "categories"),
        ("j'ai une idée", 6531, "verbe", None, "categories"),
        ("je te montre", 36964, "verbe", "je veux te montrer quelque chose", "categories"),
        ("j'aime", "aimer", "verbe", None, "categories"),
        ("je n'aime pas", "ne pas aimer", "verbe", None, "categories"),
        ("c'est…", 11713, "adjectif", "c'est", "decrire"),
        ("je veux quelqu'un", "personne", "personne", None, "gens"),
        ("en classe", "classe", "nom", None, "classe"),
        ("manger", "manger", "verbe", None, "manger"),
        ("autre chose", 17054, "petit mot", None, "categories"),
    ]),
    # 3 — Les catégories : l'index, d'où l'on va partout ; et quand c'est arrivé.
    page("categories", "Catégories", [
        ("les gens", "personnes", "personne", None, "gens"),
        ("faire", 11749, "verbe", None, "actions"),
        ("jouer", "jouer", "verbe", None, "jouer"),
        ("aller", "aller", "verbe", None, "lieux"),
        ("manger", "manger", "verbe", None, "manger"),
        ("boire", "boire", "verbe", None, "boire"),
        ("j'ai mal", "douleur", "verbe", None, "mal"),
        ("je me sens", "sentiment", "verbe", None, "sens"),
        ("c'est…", 11713, "adjectif", "c'est", "decrire"),
        ("les couleurs", "couleurs", "adjectif", None, "couleurs"),
        ("en classe", "classe", "nom", None, "classe"),
        ("les animaux", "animaux", "nom", None, "animaux"),
        ("s'habiller", "s'habiller", "verbe", None, "habits"),
        ("questions", "question", "question", None, "questions"),
        ("autre chose", 17054, "petit mot", None, None),
        ("avant", 9839, "petit mot", "c'était avant", None),
        ("maintenant", "maintenant", "petit mot", None, None),
        ("après", 9829, "petit mot", None, None),
        ("hier", "hier", "petit mot", None, None),
        ("demain", "demain", "petit mot", None, None),
    ]),
    # 4 — Je veux.
    page("veux", "Je veux", [
        ("manger", "manger", "verbe", None, "manger"),
        ("boire", "boire", "verbe", None, "boire"),
        ("jouer", "jouer", "verbe", None, "jouer"),
        ("aller", "aller", "verbe", None, "lieux"),
        ("faire", 11749, "verbe", None, "actions"),
        ("un câlin", 4550, "nom", None, None),
        ("de l'aide", "aider", "nom", None, None),
        ("une pause", "pause", "nom", None, None),
        ("les toilettes", "toilettes", "nom", "aller aux toilettes", None),
        ("dormir", "dormir", "verbe", None, None),
        ("sortir", "sortir", "verbe", None, None),
        ("regarder", "regarder", "verbe", None, None),
        ("écouter", "écouter", "verbe", None, None),
        ("de la musique", "musique", "nom", None, None),
        ("dessiner", 8088, "verbe", None, None),
        ("lire un livre", "lire", "verbe", None, None),
        ("la tablette", "tablette", "nom", None, None),
        ("être tranquille", "calme", "adjectif", None, None),
        ("rentrer", "rentrer", "verbe", "rentrer à la maison", None),
        ("autre chose", 17054, "petit mot", None, None),
    ]),
    # 5 — Ça ne va pas : se plaindre, demander ; « j'ai mal », « j'ai faim »… mènent à la page qui précise.
    page("probleme", "Ça ne va pas", [
        ("j'ai mal", "douleur", "verbe", None, "mal"),
        ("je suis malade", "malade", "adjectif", None, None),
        ("j'ai faim", "faim", "verbe", None, "manger"),
        ("j'ai soif", "soif", "verbe", None, "boire"),
        ("je suis fatigué", "fatigué", "adjectif", None, None),
        ("j'ai chaud", "chaud", "adjectif", None, None),
        ("j'ai froid", 2401, "adjectif", None, None),
        ("j'ai peur", "peur", "adjectif", None, None),
        ("trop de bruit", 7157, "nom", "il y a trop de bruit", None),
        ("une pause", "pause", "nom", "j'ai besoin d'une pause", None),
        ("aide-moi", "aider", "social", None, None),
        ("laisse-moi", 7076, "social", "laisse-moi tranquille", None),
        ("je veux arrêter", "arrêter", "verbe", None, None),
        ("je ne sais pas pourquoi", 7180, "social", "je ne sais pas ce qui ne va pas", None),
        ("je veux quelqu'un", 36137, "personne", None, "gens"),
        ("c'est trop dur", "difficile", "adjectif", None, None),
        ("je ne comprends pas", 27363, "social", None, None),
        ("je me suis trompé", 6992, "social", None, None),
        ("je m'ennuie", "ennui", "adjectif", None, None),
        ("je veux rentrer", "rentrer", "verbe", "je veux rentrer à la maison", None),
    ]),
    page("probleme-2", "Ça ne va pas", [
        ("c'est cassé", "cassé", "adjectif", None, None),
        ("j'ai perdu", "perdre", "verbe", None, None),
        ("je suis tombé", 29674, "verbe", None, None),
        ("on m'a fait mal", "douleur", "verbe", None, None),
        ("on m'embête", "embêter", "verbe", None, None),
        ("il triche", 31414, "verbe", None, None),
        ("il m'a pris", "prendre", "verbe", "il m'a pris quelque chose", None),
        ("il m'a poussé", 15375, "verbe", None, None),
        ("c'est à moi", 12264, "personne", None, None),
        ("il crie", 31127, "verbe", None, None),
        ("je ne veux pas", "ne pas vouloir", "verbe", None, None),
        ("c'est trop long", 37678, "adjectif", None, None),
        ("trop de monde", "foule", "nom", "il y a trop de monde", None),
        ("j'ai envie de vomir", "vomir", "verbe", None, None),
        ("je suis mouillé", "mouillé", "adjectif", None, None),
        ("change-moi", "changer la couche", "verbe", None, None),
        ("j'ai envie de faire pipi", 28613, "verbe", None, None),
        ("il m'a tapé", 34501, "verbe", None, None),
        ("ça me gêne", "gêne", "verbe", None, None),
        ("je suis mal installé", "inconfortable", "adjectif", None, None),
    ], suite=True),
    # 6 — J'ai mal : le corps ; chaque partie complète « j'ai mal ».
    page("mal", "J'ai mal", [
        ("tête", "tête", "nom", "à la tête", None),
        ("ventre", "ventre", "nom", "au ventre", None),
        ("dents", "dents", "nom", "aux dents", None),
        ("oreille", "oreille", "nom", "à l'oreille", None),
        ("gorge", "gorge", "nom", "à la gorge", None),
        ("nez", "nez", "nom", "au nez", None),
        ("bras", "bras", "nom", "au bras", None),
        ("main", "main", "nom", "à la main", None),
        ("jambe", "jambe", "nom", "à la jambe", None),
        ("pied", "pied", "nom", "au pied", None),
        ("dos", "dos", "nom", "au dos", None),
        ("œil", "œil", "nom", "à l'œil", None),
        ("genou", "genou", "nom", "au genou", None),
        ("doigt", "doigt", "nom", "au doigt", None),
        ("fesses", "fesses", "nom", "aux fesses", None),
        ("ici", "ici", "petit mot", None, None),
        ("partout", 2728, "petit mot", None, None),
        ("un peu", 5546, "petit mot", None, None),
        ("très", "très", "petit mot", "très fort", None),
        ("ça gratte", "gratter", "verbe", None, None),
    ]),
    # 7 — Je me sens : chaque case complète « je me sens » ; « parce que » mène aux catégories.
    page("sens", "Je me sens", [
        ("content", "content", "adjectif", None, None),
        ("triste", "triste", "adjectif", None, None),
        ("en colère", "en colère", "adjectif", None, None),
        ("fatigué", "fatigué", "adjectif", None, None),
        ("effrayé", 2261, "adjectif", None, None),
        ("malade", "malade", "adjectif", None, None),
        ("calme", "calme", "adjectif", None, None),
        ("surpris", "surpris", "adjectif", None, None),
        ("fier", "fier", "adjectif", None, None),
        ("énervé", "énervé", "adjectif", None, None),
        ("inquiet", "inquiet", "adjectif", None, None),
        ("timide", 8707, "adjectif", None, None),
        ("seul", 7253, "adjectif", None, None),
        ("jaloux", 36911, "adjectif", None, None),
        ("perdu", 36295, "adjectif", None, None),
        ("bizarre", 32390, "adjectif", None, None),
        ("bien", "bien", "adjectif", None, None),
        ("pas bien", "mal", "adjectif", None, None),
        ("très", "très", "petit mot", None, None),
        ("parce que", "parce que", "petit mot", None, "categories"),
    ]),
    # 8 — Questions : « qui ? » mène aux gens, « où ? » aux lieux.
    page("questions", "Questions", [
        ("qui ?", "qui", "question", None, "gens"),
        ("quoi ?", 22620, "question", None, None),
        ("où ?", "où", "question", None, "lieux"),
        ("quand ?", "quand", "question", None, None),
        ("pourquoi ?", "pourquoi", "question", None, None),
        ("comment ?", "comment", "question", None, None),
        ("combien ?", "combien", "question", None, None),
        ("c'est quoi ?", 10366, "question", None, None),
        ("on fait quoi ?", 11749, "question", None, None),
        ("et après ?", 9829, "question", None, None),
        ("c'est à qui ?", 32743, "question", None, None),
        ("je peux ?", "pouvoir", "question", None, None),
        ("tu veux ?", "vouloir", "question", None, None),
        ("ça va ?", "ça va", "question", None, None),
        ("tu m'aides ?", "aider", "question", None, None),
        ("tu joues avec moi ?", 7064, "question", None, None),
        ("c'est fini ?", "fini", "question", None, None),
        ("c'est qui ?", "qui", "question", None, None),
        ("on va où ?", "où", "question", None, None),
        ("oui ou non ?", "oui", "question", "dis-moi oui ou non", None),
    ]),
    # 9 — Les gens.
    page("gens", "Les gens", [
        ("moi", "moi", "personne", None, None),
        ("toi", "toi", "personne", None, None),
        ("maman", "maman", "personne", None, None),
        ("papa", "papa", "personne", None, None),
        ("frère", "frère", "personne", "mon frère", None),
        ("sœur", "sœur", "personne", "ma sœur", None),
        ("mamie", "grand-mère", "personne", None, None),
        ("papi", "grand-père", "personne", None, None),
        ("bébé", "bébé", "personne", "le bébé", None),
        ("copain", "ami", "personne", "mon copain", None),
        ("copine", "amie", "personne", "ma copine", None),
        ("maîtresse", "maîtresse", "personne", None, None),
        ("maître", "maître", "personne", None, None),
        ("AESH", 2476, "personne", None, None),
        ("docteur", "médecin", "personne", "le docteur", None),
        ("les autres", "groupe", "personne", None, None),
        ("quelqu'un", "personne", "personne", None, None),
        ("tout le monde", "tous", "personne", None, None),
        ("lui", "il", "personne", None, None),
        ("elle", "elle", "personne", None, None),
    ]),
    # 10 — Faire : les actions, avec ce qui va devant et autour (moi, toi, pas, dans, sur…).
    page("actions", "Faire", [
        ("moi", "moi", "personne", None, None),
        ("toi", "toi", "personne", None, None),
        ("pas", "non", "petit mot", None, None),
        ("encore", "encore", "petit mot", None, None),
        ("ça", "ça", "petit mot", None, None),
        ("manger", "manger", "verbe", None, None),
        ("boire", "boire", "verbe", None, None),
        ("jouer", "jouer", "verbe", None, None),
        ("aller", "aller", "verbe", None, None),
        ("venir", "venir", "verbe", None, None),
        ("prendre", "prendre", "verbe", None, None),
        ("donner", "donner", "verbe", None, None),
        ("mettre", "mettre", "verbe", None, None),
        ("faire", 11749, "verbe", None, None),
        ("aider", "aider", "verbe", None, None),
        ("ouvrir", "ouvrir", "verbe", None, None),
        ("fermer", "fermer", "verbe", None, None),
        ("regarder", "regarder", "verbe", None, None),
        ("écouter", "écouter", "verbe", None, None),
        ("attendre", "attendre", "verbe", None, None),
    ]),
    page("actions-2", "Faire", [
        ("dans", "dans", "petit mot", None, None),
        ("sur", "sur", "petit mot", None, None),
        ("sous", "sous", "petit mot", None, None),
        ("avec", "avec", "petit mot", None, None),
        ("à côté", "à côté", "petit mot", None, None),
        ("courir", "courir", "verbe", None, None),
        ("marcher", "marcher", "verbe", None, None),
        ("sauter", "sauter", "verbe", None, None),
        ("s'asseoir", 35033, "verbe", "m'asseoir", None),
        ("se lever", 34367, "verbe", "me lever", None),
        ("dormir", "dormir", "verbe", None, None),
        ("laver", "laver", "verbe", None, None),
        ("chercher", "chercher", "verbe", None, None),
        ("trouver", "trouver", "verbe", None, None),
        ("casser", "casser", "verbe", None, None),
        ("rire", "rire", "verbe", None, None),
        ("pleurer", "pleurer", "verbe", None, None),
        ("parler", "parler", "verbe", None, None),
        ("chanter", "chanter", "verbe", None, None),
        ("danser", "danser", "verbe", None, None),
    ], suite=True),
    # 11 — Jouer.
    page("jouer", "Jouer", [
        ("un jouet", 32568, "nom", "avec un jouet", None),
        ("ballon", "ballon", "nom", "au ballon", None),
        ("puzzle", "puzzle", "nom", "au puzzle", None),
        ("poupée", "poupée", "nom", "à la poupée", None),
        ("voiture", "voiture", "nom", "aux voitures", None),
        ("cubes", "cubes", "nom", "aux cubes", None),
        ("jeu de société", 32580, "nom", "à un jeu de société", None),
        ("toboggan", "toboggan", "nom", "au toboggan", None),
        ("balançoire", "balançoire", "nom", "à la balançoire", None),
        ("trampoline", "trampoline", "nom", "au trampoline", None),
        ("vélo", "vélo", "nom", "au vélo", None),
        ("pâte à modeler", "pâte à modeler", "nom", "à la pâte à modeler", None),
        ("peinture", "peindre", "nom", "à la peinture", None),
        ("memory", 39085, "nom", "au memory", None),
        ("musique", "musique", "nom", "de la musique", None),
        ("loto", 11295, "nom", "au loto", None),
        ("tablette", "tablette", "nom", "à la tablette", None),
        ("bulles", "bulles", "nom", "aux bulles", None),
        ("cache-cache", "cache-cache", "nom", "à cache-cache", None),
        ("train", "train", "nom", "au train", None),
    ]),
    page("jouer-2", "Jouer", [
        ("avec toi", 7064, "social", None, None),
        ("à moi", 7158, "social", "c'est à moi", None),
        ("à toi", 2608, "social", "c'est à toi", None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "c'est fini", None),
        ("gagné", "gagner", "verbe", "j'ai gagné", None),
        ("perdu", 22031, "verbe", "j'ai perdu", None),
        ("lancer", "lancer", "verbe", None, None),
        ("attraper", "attraper", "verbe", None, None),
        ("construire", "construire", "verbe", None, None),
        ("se cacher", "se cacher", "verbe", "me cacher", None),
        ("déguisement", "déguisement", "nom", "avec les déguisements", None),
        ("chanter", "chanter", "verbe", None, None),
        ("danser", "danser", "verbe", None, None),
        ("histoire", "conte", "nom", "une histoire", None),
        ("sable", "sable", "nom", "dans le sable", None),
        ("eau", "eau", "nom", "avec l'eau", None),
        ("dehors", "dehors", "nom", None, None),
        ("dînette", "dînette", "nom", "à la dînette", None),
        ("faire semblant", 33990, "verbe", None, None),
    ], suite=True),
    # 12 — Aller : les lieux ; chacun complète « on va », « je veux aller ».
    page("lieux", "Aller", [
        ("toilettes", "toilettes", "nom", "aux toilettes", None),
        ("cour", "cour de récréation", "nom", "dans la cour", None),
        ("classe", "classe", "nom", "en classe", None),
        ("cantine", "cantine", "nom", "à la cantine", None),
        ("maison", "maison", "nom", "à la maison", None),
        ("dehors", "dehors", "nom", None, None),
        ("parc", "parc", "nom", "au parc", None),
        ("piscine", "piscine", "nom", "à la piscine", None),
        ("gymnase", "gymnase", "nom", "au gymnase", None),
        ("bibliothèque", "bibliothèque", "nom", "à la bibliothèque", None),
        ("infirmerie", "infirmerie", "nom", "à l'infirmerie", None),
        ("jardin", "jardin", "nom", "au jardin", None),
        ("école", "école", "nom", "à l'école", None),
        ("médecin", "médecin", "nom", "chez le médecin", None),
        ("promenade", "se promener", "nom", "en promenade", None),
        ("voiture", "voiture", "nom", "en voiture", None),
        ("bus", "bus", "nom", "en bus", None),
        ("à pied", "marcher", "verbe", None, None),
        ("ici", "ici", "petit mot", None, None),
        ("là-bas", "là-bas", "petit mot", None, None),
    ]),
    page("lieux-2", "Aller", [
        ("magasin", "magasin", "nom", "au magasin", None),
        ("salle de bain", 33954, "nom", "à la salle de bain", None),
        ("chambre", 33068, "nom", "dans ma chambre", None),
        ("cuisine", "cuisine", "nom", "à la cuisine", None),
        ("salon", "salon", "nom", "au salon", None),
        ("plage", "plage", "nom", "à la plage", None),
        ("forêt", "forêt", "nom", "à la forêt", None),
        ("ferme", "ferme", "nom", "à la ferme", None),
        ("zoo", "zoo", "nom", "au zoo", None),
        ("montagne", "montagne", "nom", "à la montagne", None),
        ("hôpital", "hôpital", "nom", "à l'hôpital", None),
        ("cinéma", "cinéma", "nom", "au cinéma", None),
        ("restaurant", "restaurant", "nom", "au restaurant", None),
        ("manège", "manège", "nom", "au manège", None),
        ("chez un copain", "ami", "nom", None, None),
        ("en haut", 5451, "petit mot", None, None),
        ("en bas", "en bas", "petit mot", None, None),
        ("devant", "devant", "petit mot", None, None),
        ("derrière", "derrière", "petit mot", None, None),
        ("loin", "loin", "petit mot", None, None),
    ], suite=True),
    # 13 — Manger.
    page("manger", "Manger", [
        ("plus faim", 38801, "verbe", "je n'ai plus faim", None),
        ("pain", "pain", "nom", "du pain", None),
        ("pomme", "pomme", "nom", "une pomme", None),
        ("banane", "banane", "nom", "une banane", None),
        ("orange", "orange", "nom", "une orange", None),
        ("yaourt", "yaourt", "nom", "un yaourt", None),
        ("fromage", "fromage", "nom", "du fromage", None),
        ("pâtes", "pâtes", "nom", "des pâtes", None),
        ("riz", "riz", "nom", "du riz", None),
        ("frites", "frites", "nom", "des frites", None),
        ("pizza", "pizza", "nom", "de la pizza", None),
        ("soupe", "soupe", "nom", "de la soupe", None),
        ("légumes", "légumes", "nom", "des légumes", None),
        ("viande", "viande", "nom", "de la viande", None),
        ("poisson", "poisson", "nom", "du poisson", None),
        ("c'est bon", "bon", "adjectif", None, None),
        ("pas bon", 32338, "adjectif", "ce n'est pas bon", None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "j'ai fini", None),
        ("boire", "boire", "verbe", None, "boire"),
    ]),
    page("manger-2", "Manger", [
        ("œuf", "œuf", "nom", "un œuf", None),
        ("gâteau", "gâteau", "nom", "du gâteau", None),
        ("biscuit", "biscuit", "nom", "un biscuit", None),
        ("compote", 34012, "nom", "de la compote", None),
        ("chocolat", "chocolat", "nom", "du chocolat", None),
        ("céréales", "céréales", "nom", "des céréales", None),
        ("glace", "glace", "nom", "une glace", None),
        ("bonbon", "bonbon", "nom", "un bonbon", None),
        ("sandwich", "sandwich", "nom", "un sandwich", None),
        ("chips", "chips", "nom", "des chips", None),
        ("carottes", "carotte", "nom", "des carottes", None),
        ("tomate", "tomate", "nom", "une tomate", None),
        ("haricots verts", "haricots verts", "nom", "des haricots verts", None),
        ("poulet", "poulet", "nom", "du poulet", None),
        ("jambon", "jambon", "nom", "du jambon", None),
        ("cuillère", "cuillère", "nom", "avec une cuillère", None),
        ("fourchette", "fourchette", "nom", "avec une fourchette", None),
        ("couteau", "couteau", "nom", "avec un couteau", None),
        ("assiette", "assiette", "nom", "dans une assiette", None),
        ("bol", "bol", "nom", "dans un bol", None),
    ], suite=True),
    # 14 — Boire.
    page("boire", "Boire", [
        ("j'ai soif", "soif", "verbe", None, None),
        ("eau", "eau", "nom", "de l'eau", None),
        ("lait", "lait", "nom", "du lait", None),
        ("jus d'orange", "jus d'orange", "nom", "du jus d'orange", None),
        ("jus de pomme", "jus de pomme", "nom", "du jus de pomme", None),
        ("chocolat chaud", "chocolat chaud", "nom", "du chocolat chaud", None),
        ("sirop", "sirop", "nom", "du sirop", None),
        ("verre", "verre", "nom", "dans un verre", None),
        ("gourde", "gourde", "nom", "à la gourde", None),
        ("paille", 6164, "nom", "avec une paille", None),
        ("bouteille", "bouteille", "nom", "à la bouteille", None),
        ("tasse", "tasse", "nom", "dans une tasse", None),
        ("chaud", "chaud", "adjectif", None, None),
        ("froid", "froid", "adjectif", None, None),
        ("c'est bon", "bon", "adjectif", None, None),
        ("un peu", 5546, "petit mot", None, None),
        ("beaucoup", "beaucoup", "petit mot", None, None),
        ("encore", "encore", "petit mot", None, None),
        ("c'est renversé", "renverser", "verbe", None, None),
        ("fini", "fini", "petit mot", "j'ai fini", None),
    ]),
    # 15 — C'est… : décrire, donner son avis ; les couleurs et les formes à la page suivante.
    page("decrire", "C'est…", [
        ("grand", "grand", "adjectif", None, None),
        ("petit", "petit", "adjectif", None, None),
        ("chaud", "chaud", "adjectif", None, None),
        ("froid", "froid", "adjectif", None, None),
        ("beau", "beau", "adjectif", None, None),
        ("bon", "bon", "adjectif", None, None),
        ("pas bon", 32338, "adjectif", None, None),
        ("propre", "propre", "adjectif", None, None),
        ("sale", 4750, "adjectif", None, None),
        ("cassé", "cassé", "adjectif", None, None),
        ("facile", "facile", "adjectif", None, None),
        ("difficile", "difficile", "adjectif", None, None),
        ("drôle", "drôle", "adjectif", None, None),
        ("gentil", "gentil", "adjectif", None, None),
        ("méchant", "méchant", "adjectif", None, None),
        ("pareil", "pareil", "adjectif", None, None),
        ("différent", "différent", "adjectif", None, None),
        ("plein", "plein", "adjectif", None, None),
        ("vide", "vide", "adjectif", None, None),
        ("mouillé", "mouillé", "adjectif", None, None),
    ]),
    page("couleurs", "Couleurs et formes", [
        ("rouge", "rouge", "adjectif", None, None),
        ("bleu", "bleu", "adjectif", None, None),
        ("vert", "vert", "adjectif", None, None),
        ("jaune", "jaune", "adjectif", None, None),
        ("noir", "noir", "adjectif", None, None),
        ("blanc", "blanc", "adjectif", None, None),
        ("orange", "orange", "adjectif", None, None),
        ("rose", "rose", "adjectif", None, None),
        ("violet", "violet", "adjectif", None, None),
        ("marron", "marron", "adjectif", None, None),
        ("gris", "gris", "adjectif", None, None),
        ("rond", "rond", "adjectif", None, None),
        ("carré", "carré", "adjectif", None, None),
        ("triangle", 4763, "nom", "un triangle", None),
        ("rectangle", 4731, "nom", "un rectangle", None),
        ("long", "long", "adjectif", None, None),
        ("court", "court", "adjectif", None, None),
        ("doux", "doux", "adjectif", None, None),
        ("dur", "dur", "adjectif", None, None),
        ("lourd", "lourd", "adjectif", None, None),
    ], suite=True),
    # 16 — En classe : ce qu'on y fait, puis ce qu'il y a.
    page("classe", "En classe", [
        ("lire", "lire", "verbe", None, None),
        ("écrire", "écrire", "verbe", None, None),
        ("compter", "compter", "verbe", None, None),
        ("dessiner", 8088, "verbe", None, None),
        ("peindre", "peindre", "verbe", None, None),
        ("découper", "découper", "verbe", None, None),
        ("coller", "coller", "verbe", None, None),
        ("chanter", "chanter", "verbe", None, None),
        ("sport", "sport", "nom", "le sport", None),
        ("ordinateur", "ordinateur", "nom", "l'ordinateur", None),
        ("ranger", "ranger", "verbe", None, None),
        ("regroupement", 39679, "nom", "le regroupement", None),
        ("récréation", "récréation", "nom", "la récréation", None),
        ("cantine", "cantine", "nom", "la cantine", None),
        ("sieste", "sieste", "nom", "la sieste", None),
        ("atelier", 32176, "nom", "l'atelier", None),
        ("travailler", "travailler", "verbe", None, None),
        ("j'ai fini", "fini", "petit mot", None, None),
        ("c'est mon tour", 7158, "social", None, None),
        ("je ne comprends pas", 27363, "social", None, None),
    ]),
    page("classe-2", "En classe", [
        ("quelque chose", 11318, "nom", None, None),
        ("crayon", "crayon", "nom", "un crayon", None),
        ("feutre", "feutre", "nom", "un feutre", None),
        ("ciseaux", "ciseaux", "nom", "les ciseaux", None),
        ("colle", "colle", "nom", "la colle", None),
        ("cahier", "cahier", "nom", "mon cahier", None),
        ("livre", "livre", "nom", "un livre", None),
        ("feuille", 8349, "nom", "une feuille", None),
        ("gomme", "gomme", "nom", "une gomme", None),
        ("règle", "règle", "nom", "une règle", None),
        ("cartable", "sac à dos", "nom", "mon cartable", None),
        ("tableau", 2526, "nom", "le tableau", None),
        ("table", "table", "nom", "la table", None),
        ("chaise", "chaise", "nom", "la chaise", None),
        ("porte", "porte", "nom", "la porte", None),
        ("fenêtre", "fenêtre", "nom", "la fenêtre", None),
        ("se laver les mains", 8975, "verbe", "me laver les mains", None),
        ("s'asseoir", 35033, "verbe", "m'asseoir", None),
        ("se mettre en rang", 39146, "verbe", "me mettre en rang", None),
        ("silence", "silence", "social", None, None),
    ], suite=True),
    # 17 — Les animaux.
    page("animaux", "Les animaux", [
        ("un animal", 6901, "nom", None, None),
        ("chien", "chien", "nom", "le chien", None),
        ("chat", "chat", "nom", "le chat", None),
        ("oiseau", "oiseau", "nom", "l'oiseau", None),
        ("poisson", "poisson", "nom", "le poisson", None),
        ("cheval", "cheval", "nom", "le cheval", None),
        ("vache", "vache", "nom", "la vache", None),
        ("cochon", "cochon", "nom", "le cochon", None),
        ("mouton", "mouton", "nom", "le mouton", None),
        ("poule", "poule", "nom", "la poule", None),
        ("canard", "canard", "nom", "le canard", None),
        ("lapin", "lapin", "nom", "le lapin", None),
        ("souris", "souris", "nom", "la souris", None),
        ("lion", "lion", "nom", "le lion", None),
        ("éléphant", "éléphant", "nom", "l'éléphant", None),
        ("ours", "ours", "nom", "l'ours", None),
        ("serpent", "serpent", "nom", "le serpent", None),
        ("papillon", "papillon", "nom", "le papillon", None),
        ("caresser", 35471, "verbe", None, None),
        ("donner à manger", "nourrir", "verbe", None, None),
    ]),
    # 18 — S'habiller.
    page("habits", "S'habiller", [
        ("un vêtement", 34395, "nom", None, None),
        ("manteau", "manteau", "nom", "mon manteau", None),
        ("bonnet", "bonnet", "nom", "mon bonnet", None),
        ("écharpe", "écharpe", "nom", "mon écharpe", None),
        ("gants", "gants", "nom", "mes gants", None),
        ("chaussures", "chaussures", "nom", "mes chaussures", None),
        ("chaussettes", "chaussettes", "nom", "mes chaussettes", None),
        ("pantalon", "pantalon", "nom", "mon pantalon", None),
        ("t-shirt", "t-shirt", "nom", "mon t-shirt", None),
        ("pull", "pull", "nom", "mon pull", None),
        ("robe", "robe", "nom", "ma robe", None),
        ("jupe", "jupe", "nom", "ma jupe", None),
        ("pyjama", "pyjama", "nom", "mon pyjama", None),
        ("couche", "couche", "nom", "ma couche", None),
        ("lunettes", "lunettes", "nom", "mes lunettes", None),
        ("mettre", 2781, "verbe", None, None),
        ("enlever", 27049, "verbe", None, None),
        ("attacher", 17026, "verbe", None, None),
        ("trop petit", "petit", "adjectif", "c'est trop petit", None),
        ("trop grand", "grand", "adjectif", "c'est trop grand", None),
    ]),
]

# Les cases qui ouvrent leur page sans rien dire : une catégorie qu'un nom désigne (« les gens », « les animaux »), et
# « faire », qui mène aux actions. « J'aime » + « les gens » + « maman » disait « j'aime les gens maman » ; il dit
# « j'aime maman ». Les verbes qui ouvrent leur page parlent, eux : « j'aime » + « jouer » + « au ballon ».
MUETTES = {
    ("dire", "faire"), ("dire", "en classe"), ("veux", "faire"),
    ("categories", "les gens"), ("categories", "faire"), ("categories", "les couleurs"), ("categories", "en classe"),
    ("categories", "les animaux"), ("categories", "s'habiller"), ("categories", "questions"),
}

# Les cases renommées : un classeur complet que l'enseignant a retouché les reçoit à la place des anciennes — leur mot,
# et leur picto, leur couleur, ce qu'elles disent, là où il ne les a pas changés. Pour chacune, ce qu'elle était :
# (mot, ce qu'il disait, picto, nature). On n'en retire pas : un classeur d'une version ancienne peut encore arriver.
RENOMMEES = {
    ("categories", "j'ai mal"): [("le corps", "", 2728, "nom")],
    ("manger", "plus faim"): [("j'ai faim", "", 35559, "verbe")],
    ("manger", "boire"): [("à boire", "", 2276, "verbe")],
    ("jouer", "memory"): [("dessiner", "", 8088, "verbe")],
    ("jouer", "loto"): [("livre", "", 2450, "nom")],
    ("jouer-2", "avec toi"): [("avec moi", "joue avec moi", 7064, "social")],
}

# ── Les ensembles par thème : les poids, calculés ici, une fois pour toutes ──
#
# « Les poids sont calculés à l'avance pour le classeur normal, pas d'IA intégrée. » Après une case, l'application
# propose quelques thèmes — chacun avec ses pictos — dans une bande au-dessus de la grille ; elle ne fait que lire
# ce qui suit. Deux sortes de poids :
#  - SUITES : après tel mot, quels thèmes viennent, et combien (en pour cent, ramenés à 1). Une règle par mot ;
#    toutes les cases qui écrivent ce mot la reçoivent. Le thème est une page : on y propose ses pictos et ceux de
#    la suite de sa section.
#  - le poids d'un picto dans son thème : l'ordre de la page (le plus courant d'abord, comme dans le PODD), et la
#    sorte de mot qui fait la page (les aliments sur « Manger », pas « j'ai faim »).
GENS = ["moi", "toi", "maman", "papa", "frère", "sœur", "mamie", "papi", "bébé", "copain", "copine", "maîtresse", "maître",
        "AESH", "docteur", "les autres", "quelqu'un", "tout le monde", "lui", "elle"]
OBJETS = [("classe-2", 40), ("jouer", 40), ("habits", 20)]
SUITES = {
    # Les débuts de phrase.
    "je veux": [("manger", 30), ("jouer", 25), ("boire", 15), ("lieux", 15), ("actions", 10), ("gens", 5)],
    "on va": [("lieux", 70), ("jouer", 20), ("gens", 10)],
    "faire": [("actions", 60), ("jouer", 25), ("classe", 15)],
    "on joue": [("jouer", 80), ("gens", 20)],
    "je me sens": [("sens", 100)],
    "j'ai mal": [("mal", 100)],
    "ça ne va pas": [("probleme", 70), ("mal", 20), ("sens", 10)],
    "j'ai une question": [("questions", 100)],
    "je te raconte": [("gens", 30), ("actions", 25), ("lieux", 25), ("jouer", 20)],
    "j'ai une idée": [("jouer", 40), ("actions", 30), ("lieux", 30)],
    "je te montre": [("classe-2", 30), ("jouer", 30), ("animaux", 20), ("gens", 20)],
    "j'aime": [("manger", 30), ("jouer", 30), ("animaux", 20), ("gens", 20)],
    "je n'aime pas": [("manger", 40), ("jouer", 20), ("decrire", 20), ("probleme", 20)],
    "c'est…": [("decrire", 70), ("couleurs", 30)],
    "je veux quelqu'un": [("gens", 100)],
    "en classe": [("classe", 100)],
    "parce que": [("probleme", 40), ("gens", 30), ("jouer", 30)],
    # Les verbes qui appellent un thème.
    "manger": [("manger", 85), ("boire", 15)],
    "boire": [("boire", 100)],
    "jouer": [("jouer", 80), ("gens", 20)],
    "aller": [("lieux", 100)],
    "venir": [("lieux", 60), ("gens", 40)],
    "courir": [("lieux", 100)],
    "marcher": [("lieux", 100)],
    "sortir": [("lieux", 100)],
    "prendre": OBJETS,
    "donner": [("gens", 40), ("classe-2", 30), ("jouer", 30)],
    "mettre": [("habits", 50), ("classe-2", 30), ("jouer", 20)],
    "ouvrir": [("classe-2", 60), ("jouer", 40)],
    "fermer": [("classe-2", 60), ("jouer", 40)],
    "chercher": OBJETS,
    "trouver": OBJETS,
    "regarder": [("animaux", 50), ("classe-2", 50)],
    "aider": [("gens", 100)],
    "dessiner": [("animaux", 40), ("couleurs", 30), ("gens", 30)],
    "caresser": [("animaux", 100)],
    "donner à manger": [("animaux", 100)],
    "s'habiller": [("habits", 100)],
    "enlever": [("habits", 100)],
    "attacher": [("habits", 100)],
    # Les questions.
    "qui ?": [("gens", 100)],
    "où ?": [("lieux", 100)],
    "on fait quoi ?": [("actions", 50), ("jouer", 50)],
    "tu veux ?": [("jouer", 40), ("manger", 30), ("boire", 30)],
    "je peux ?": [("jouer", 50), ("actions", 50)],
    # Ce qui ne va pas : la suite qui précise.
    "j'ai faim": [("manger", 100)],
    "j'ai soif": [("boire", 100)],
    "je suis malade": [("mal", 100)],
    "je suis tombé": [("mal", 100)],
    "on m'a fait mal": [("mal", 70), ("gens", 30)],
    "on m'embête": [("gens", 100)],
    "il m'a poussé": [("gens", 100)],
    "il m'a tapé": [("gens", 100)],
    "il triche": [("gens", 100)],
    "il crie": [("gens", 100)],
    "il m'a pris": [("jouer", 50), ("classe-2", 50)],
    "j'ai perdu": OBJETS,
    "c'est cassé": [("jouer", 50), ("classe-2", 50)],
}
# Les gens : ce qu'ils font, où ils sont, comment ils vont.
for _qui in GENS:
    SUITES.setdefault(_qui, [("actions", 50), ("lieux", 30), ("sens", 20)])

# « Quand je dis regarde, j'ai pas forcément ce qui pourrait suivre » (5 novembre 2026) : tout ce qui appelle une
# suite en reçoit une — d'abord par mot, puis par page.
SUITES.update({
    # L'essentiel.
    "regarde": [("animaux", 25), ("gens", 25), ("jouer", 20), ("lieux", 15), ("classe-2", 15)],
    "encore": [("manger", 30), ("jouer", 30), ("boire", 20), ("actions", 20)],
    "fini": [("veux", 60), ("jouer", 40)],
    "stop": [("probleme", 100)],
    "aide-moi": [("actions", 40), ("habits", 30), ("classe", 30)],
    "attends": [("gens", 100)],
    "à moi": [("jouer", 60), ("classe-2", 40)],
    "à toi": [("jouer", 60), ("classe-2", 40)],
    "avec toi": [("jouer", 100)],
    "bonjour": [("gens", 100)],
    "au revoir": [("gens", 100)],
    "merci": [("gens", 100)],
    "pardon": [("gens", 100)],
    "non": [("dire", 60), ("probleme", 40)],
    "ce n'est pas ça": [("dire", 100)],
    "je ne comprends pas": [("questions", 100)],
    # Le temps, aux catégories : on raconte ce qui s'est passé, ce qui va venir.
    "avant": [("actions", 40), ("lieux", 30), ("jouer", 30)],
    "maintenant": [("actions", 40), ("lieux", 30), ("jouer", 30)],
    "après": [("actions", 40), ("lieux", 30), ("jouer", 30)],
    "hier": [("lieux", 40), ("actions", 30), ("jouer", 30)],
    "demain": [("lieux", 40), ("actions", 30), ("jouer", 30)],
    # Je veux.
    "un câlin": [("gens", 100)],
    "de l'aide": [("actions", 50), ("habits", 25), ("classe", 25)],
    "dormir": [("lieux-2", 100)],
    # Ça ne va pas.
    "je suis fatigué": [("veux", 100)],
    "j'ai chaud": [("habits", 100)],
    "j'ai froid": [("habits", 100)],
    "j'ai peur": [("gens", 40), ("animaux", 30), ("lieux", 30)],
    "je veux arrêter": [("classe", 50), ("jouer", 50)],
    "c'est trop dur": [("classe", 100)],
    "je m'ennuie": [("jouer", 60), ("veux", 40)],
    "je ne veux pas": [("actions", 40), ("manger", 30), ("jouer", 30)],
    "c'est à moi": [("jouer", 60), ("classe-2", 40)],
    "je suis mouillé": [("habits", 100)],
    "ça me gêne": [("habits", 50), ("mal", 50)],
    # Questions.
    "et après ?": [("actions", 50), ("jouer", 50)],
    "tu m'aides ?": [("actions", 60), ("habits", 40)],
    "tu joues avec moi ?": [("jouer", 100)],
    # Faire.
    "attendre": [("gens", 100)],
    "dans": [("classe-2", 40), ("lieux-2", 30), ("jouer", 30)],
    "sur": [("classe-2", 40), ("lieux-2", 30), ("jouer", 30)],
    "sous": [("classe-2", 40), ("lieux-2", 30), ("jouer", 30)],
    "à côté": [("gens", 40), ("classe-2", 30), ("lieux-2", 30)],
    "avec": [("gens", 70), ("animaux", 30)],
    "sauter": [("jouer", 60), ("lieux", 40)],
    "s'asseoir": [("classe-2", 100)],
    "casser": [("jouer", 50), ("classe-2", 50)],
    "rire": [("gens", 100)],
    "pleurer": [("sens", 50), ("probleme", 50)],
    "parler": [("gens", 100)],
    "chanter": [("jouer", 60), ("gens", 40)],
    "danser": [("jouer", 60), ("gens", 40)],
    # Jouer.
    "lancer": [("jouer", 100)],
    "attraper": [("jouer", 100)],
    "construire": [("jouer", 100)],
    "faire semblant": [("jouer", 50), ("gens", 50)],
    # En classe.
    "lire": [("classe-2", 60), ("jouer", 40)],
    "écrire": [("classe-2", 100)],
    "compter": [("classe-2", 100)],
    "peindre": [("couleurs", 60), ("classe-2", 40)],
    "découper": [("classe-2", 100)],
    "coller": [("classe-2", 100)],
    "ranger": [("classe-2", 60), ("jouer", 40)],
    "travailler": [("classe-2", 100)],
})
# Les sentiments agréables : avec qui, à quoi l'on joue (pas « ça ne va pas »).
for _bien in ("content", "calme", "fier", "bien", "surpris"):
    SUITES[_bien] = [("gens", 50), ("jouer", 50)]
# Une même case, sur une page donnée, appelle autre chose : « encore », « fini » sur la page du jeu.
SUITES_SUR_LA_PAGE = {
    ("jouer-2", "encore"): [("jouer", 100)],
    ("jouer-2", "fini"): [("veux", 60), ("manger", 40)],
}
# Par page, pour les cases qui n'ont pas de règle à elles : après un lieu, ce qu'on y fait et avec qui ; après un jouet,
# avec qui, comment il est, sa couleur ; après un aliment, la boisson et comment c'est… Les mots de la liste qui suit
# chaque page n'en reçoivent pas : ils finissent une phrase.
LIEUX = [("actions", 40), ("gens", 30), ("jouer", 30)]
SUITES_PAR_PAGE = {
    "sens": ([("gens", 40), ("probleme", 30), ("jouer", 30)], {"très"}),
    "jouer": ([("gens", 40), ("decrire", 30), ("couleurs", 30)], set()),
    "lieux": (LIEUX, {"ici", "là-bas", "à pied", "toilettes", "voiture", "bus"}),
    "lieux-2": (LIEUX, {"en haut", "en bas", "devant", "derrière", "loin"}),
    "manger": ([("boire", 50), ("decrire", 50)], {"c'est bon", "pas bon", "encore", "fini", "plus faim"}),
    "manger-2": ([("boire", 50), ("decrire", 50)], {"cuillère", "fourchette", "couteau", "assiette", "bol"}),
    "boire": ([("decrire", 60), ("manger", 40)], {"chaud", "froid", "c'est bon", "un peu", "beaucoup", "encore", "fini", "c'est renversé",
                                                  "verre", "gourde", "paille", "bouteille", "tasse", "j'ai soif"}),
    "classe-2": ([("couleurs", 50), ("actions", 50)], {"se laver les mains", "s'asseoir", "se mettre en rang", "silence"}),
    "animaux": ([("decrire", 40), ("actions", 30), ("couleurs", 30)], set()),
    "habits": ([("couleurs", 50), ("actions", 30), ("decrire", 20)], {"trop petit", "trop grand", "couche", "lunettes"}),
}

# ── Les pictos de chaque suite, choisis pour le mot d'avant (« travaille à améliorer », 5 novembre 2026) ──
# D'ordinaire, un thème montre ses pictos les plus lourds. Pour certaines suites, ceux qui vont avec ce qui précède :
# « bonjour » → maman, papa… (pas « moi, toi ») ; « j'ai froid » → manteau, bonnet… ; « peindre » → rouge, bleu…
# Les mots sont cherchés dans toute la section du thème (« dormir » → chambre, mais aussi maison, une page avant).
COULEURS_VIVES = ["rouge", "bleu", "jaune", "vert"]
GENS_NOMMES = ["maman", "papa", "maîtresse", "copain"]
AUTRES_ENFANTS = ["copain", "copine", "les autres", "quelqu'un"]
POUR_AIDER = {"actions": ["mettre", "ouvrir", "fermer", "prendre"], "habits": ["manteau", "chaussures", "attacher", "enlever"]}
CHOIX = {
    **{(m, "gens"): GENS_NOMMES for m in ("bonjour", "au revoir", "merci", "pardon", "parler")},
    **{(m, "gens"): AUTRES_ENFANTS for m in ("on m'embête", "il m'a poussé", "il m'a tapé", "il triche", "il crie", "on m'a fait mal")},
    **{(m, t): v for m in ("aide-moi", "de l'aide", "tu m'aides ?") for t, v in POUR_AIDER.items()},
    **{(m, "classe-2"): ["crayon", "cahier", "livre", "cartable"] for m in ("à moi", "à toi", "c'est à moi")},
    ("un câlin", "gens"): ["maman", "papa", "mamie", "papi"],
    # « Quand je clique sur regarde, il me faudrait des pictos génériques, par exemple pour animaux » : le générique en tête.
    ("regarde", "gens"): ["quelqu'un", "moi", "maman", "papa"],
    ("regarde", "animaux"): ["un animal", "chien", "chat", "oiseau"],
    ("regarde", "jouer"): ["un jouet", "ballon", "voiture", "puzzle"],
    ("regarde", "classe-2"): ["quelque chose", "cahier", "livre", "feuille"],
    ("regarde", "lieux"): ["là-bas", "ici", "dehors", "maison"],
    # Montrer, raconter, avoir peur, perdre : un générique d'abord, quand on ne trouve pas le bon mot.
    ("je te montre", "classe-2"): ["quelque chose", "cahier", "livre", "feuille"],
    ("je te montre", "animaux"): ["un animal", "chien", "chat", "oiseau"],
    ("je te montre", "jouer"): ["un jouet", "ballon", "voiture", "puzzle"],
    ("je te raconte", "gens"): ["quelqu'un", "maman", "papa", "copain"],
    # Pour demander, un jouet précis vaut mieux que « un jouet ».
    ("je veux", "jouer"): ["voiture", "ballon", "jeu de société", "poupée"],
    **{(m, "jouer"): ["ballon", "un jouet", "cubes", "voiture"] for m in ("lancer", "attraper")},
    ("attends", "gens"): ["moi", "maman", "papa", "maîtresse"],
    ("je veux quelqu'un", "gens"): ["maman", "papa", "maîtresse", "AESH"],
    ("rire", "gens"): ["copain", "copine", "maman", "papa"],
    ("donner", "gens"): ["moi", "toi", "maman", "copain"],
    ("j'ai froid", "habits"): ["manteau", "bonnet", "écharpe", "gants"],
    ("j'ai chaud", "habits"): ["enlever", "pull", "manteau", "t-shirt"],
    ("je suis mouillé", "habits"): ["pantalon", "chaussettes", "couche", "chaussures"],
    ("ça me gêne", "habits"): ["chaussures", "lunettes", "pull", "pantalon"],
    ("mettre", "habits"): ["manteau", "chaussures", "bonnet", "pull"],
    ("dormir", "lieux-2"): ["chambre", "maison", "salon", "chez un copain"],
    ("lire", "classe-2"): ["livre", "cahier", "tableau", "feuille"],
    ("lire", "jouer"): ["histoire", "tablette"],
    ("écrire", "classe-2"): ["crayon", "feutre", "cahier", "tableau"],
    ("découper", "classe-2"): ["ciseaux", "feuille", "colle", "cahier"],
    ("coller", "classe-2"): ["colle", "feuille", "cahier", "ciseaux"],
    ("peindre", "couleurs"): COULEURS_VIVES,
    ("peindre", "classe-2"): ["feuille", "tableau"],
    ("dessiner", "couleurs"): COULEURS_VIVES,
    ("dessiner", "gens"): ["moi", "maman", "papa", "copain"],
    ("c'est…", "couleurs"): COULEURS_VIVES,
    ("j'ai peur", "animaux"): ["un animal", "chien", "serpent", "lion"],
    # Les objets de la classe, selon le geste.
    **{(m, "classe-2"): ["quelque chose", "crayon", "ciseaux", "colle"] for m in ("prendre", "chercher", "trouver", "j'ai perdu", "il m'a pris")},
    **{(m, "classe-2"): ["porte", "fenêtre", "cahier", "cartable"] for m in ("ouvrir", "fermer")},
    **{(m, "classe-2"): ["table", "chaise", "cartable", "cahier"] for m in ("dans", "sur", "sous")},
    **{(m, "lieux-2"): ["chambre", "cuisine", "salon", "salle de bain"] for m in ("dans", "sur", "sous")},
    **{(m, "classe-2"): ["cahier", "crayon", "feuille", "tableau"] for m in ("compter", "travailler")},
    **{(m, "classe-2"): ["crayon", "règle", "chaise", "table"] for m in ("casser", "c'est cassé")},
    ("donner", "classe-2"): ["crayon", "ciseaux", "colle", "cahier"],
    ("mettre", "classe-2"): ["cartable", "table", "chaise", "cahier"],
    ("ranger", "classe-2"): ["crayon", "cahier", "ciseaux", "cartable"],
    ("s'asseoir", "classe-2"): ["chaise", "table"],
    ("je te montre", "classe-2"): ["cahier", "livre", "feuille", "crayon"],
    # Avec qui l'on joue.
    **{(m, "gens"): ["copain", "copine", "maman", "papa"] for m in ("on joue", "jouer", "faire semblant")},
    # Ce qu'on aime, ce qu'on n'aime pas, à table.
    ("j'aime", "manger"): ["gâteau", "chocolat", "frites", "pizza"],
    **{(m, "manger"): ["légumes", "soupe", "poisson", "viande"] for m in ("je n'aime pas", "je ne veux pas")},
    # Ce qui ne va pas.
    ("ça ne va pas", "sens"): ["triste", "en colère", "pas bien", "inquiet"],
    ("stop", "probleme"): ["trop de bruit", "j'ai peur", "je veux arrêter", "laisse-moi"],
    ("non", "probleme"): ["je ne veux pas", "laisse-moi", "je veux arrêter", "trop de bruit"],
    ("j'ai peur", "gens"): ["maman", "papa", "maîtresse", "AESH"],
    # Ce qu'on veut, quand c'est fini, qu'on est fatigué, qu'on s'ennuie.
    ("fini", "veux"): ["une pause", "sortir", "jouer", "la tablette"],
    ("je suis fatigué", "veux"): ["dormir", "une pause", "être tranquille", "un câlin"],
    ("je m'ennuie", "veux"): ["jouer", "sortir", "la tablette", "de la musique"],
    # Les sentiments agréables : avec qui.
    **{(m, "gens"): GENS_NOMMES for m in ("content", "calme", "fier", "bien", "surpris")},
    ("j'ai peur", "lieux"): ["dehors", "piscine", "médecin", "hôpital"],
}
# Pour les règles de page : (page, thème) → pictos.
CHOIX_PAR_PAGE = {
    ("jouer", "gens"): ["copain", "copine", "moi", "toi"],
    ("jouer", "decrire"): ["grand", "petit", "cassé", "beau"],
    ("jouer", "couleurs"): COULEURS_VIVES,
    **{(pg, "decrire"): ["bon", "pas bon", "chaud", "froid"] for pg in ("manger", "manger-2")},
    ("boire", "decrire"): ["chaud", "froid", "bon", "pas bon"],
    ("animaux", "decrire"): ["grand", "petit", "gentil", "méchant"],
    ("animaux", "actions"): ["manger", "dormir", "courir", "sauter"],
    ("animaux", "couleurs"): ["noir", "blanc", "marron", "gris"],
    ("habits", "couleurs"): COULEURS_VIVES,
    ("habits", "actions"): ["mettre", "prendre", "ouvrir", "fermer"],
    ("habits", "decrire"): ["grand", "petit", "sale", "mouillé"],
    ("classe-2", "couleurs"): COULEURS_VIVES,
    ("classe-2", "actions"): ["prendre", "donner", "mettre", "chercher"],
    **{(pg, "actions"): ["jouer", "manger", "courir", "dormir"] for pg in ("lieux", "lieux-2")},
    **{(pg, "gens"): GENS_NOMMES for pg in ("lieux", "lieux-2", "sens")},
    ("sens", "probleme"): ["trop de bruit", "on m'embête", "c'est trop dur", "j'ai perdu"],
}

COULEURS = {
    "personne": ("#fff2b8", "#e3b800"), "verbe": ("#d9f0d4", "#2e9b3e"), "nom": ("#fce6ca", "#e07b12"),
    "adjectif": ("#d6e6f7", "#2f6fd0"), "social": ("#fadeeb", "#d6408f"), "question": ("#e9ddf6", "#8a4fd8"),
    "petit mot": ("#f0f0f0", "#8a8f98"),
}
# La nature d'ARASAAC qui va avec la nôtre, pour départager deux dessins d'un même mot.
NATURE_ARASAAC = {"personne": 2, "verbe": 3, "nom": 2, "adjectif": 4, "social": 5, "question": 6, "petit mot": 6}


# ── Lexique 3.83 : la fréquence des mots en français parlé ──
# freqlemfilms2 : occurrences du lemme par million de mots de sous-titres de films. On cherche le mot avec la
# catégorie qui va avec sa nature (« porte » le nom, pas « porter » ; « couche » le nom, pas « coucher »).
CATEGORIES = {
    "nom": {"NOM"}, "verbe": {"VER"}, "adjectif": {"ADJ", "VER"}, "personne": {"NOM", "PRO:per", "PRO:ind"},
    "question": {"PRO:int", "ADV:int", "ADV"}, "petit mot": {"ADV", "PRE", "ADJ", "PRO:ind", "CON", "ADJ:ind"},
}
MOTS_VIDES = set("je j' tu il elle on nous vous ils me m' te t' se s' le la les l' un une des de d' du au aux à a ai as est "
                 "c' ce ça ne n' pas y en que qu' et ou pour".split())


def lire_lexique(chemin):
    lex = {}
    with open(chemin, encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            lex.setdefault(r["ortho"].lower(), []).append((r["cgram"], float(r["freqlemfilms2"] or 0)))
    return lex


def frequence(lex, mot, nature):
    """La fréquence d'un picto : celle de son mot, ou du plus rare de ses mots pleins (« jus d'orange » : jus, orange)."""
    if not lex:
        return 0.0

    def cherche(t, categories):
        lignes = lex.get(t) or lex.get(t.replace("œ", "oe")) or []
        bonnes = [f for c, f in lignes if not categories or c in categories]
        pleines = [f for c, f in lignes if c != "AUX"]
        return max(bonnes or pleines or [0.0])

    m = mot.lower().replace("’", "'").replace("…", "").replace("?", "").replace("!", "").strip()
    if m in lex or m.replace("œ", "oe") in lex:
        return cherche(m, CATEGORIES.get(nature))
    jetons = [t for t in re.split(r"\s+|(?<=')", m) if t and t not in MOTS_VIDES]
    valeurs = [cherche(t, None) for t in jetons]
    valeurs = [v for v in valeurs if v > 0]
    return min(valeurs) if valeurs else 0.0


def plier(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("œ", "oe").strip()


def main(banque, sortie, chemin_lexique=None):
    lex = lire_lexique(chemin_lexique) if chemin_lexique else None
    pictos = json.load(open(os.path.join(banque, "metadata.json"), encoding="utf-8"))
    images = os.path.join(banque, "images")
    par_mot, par_mot_exact = {}, {}
    for p in pictos:
        if not os.path.exists(os.path.join(images, f"{p['_id']}.png")):
            continue
        for rang, k in enumerate(p.get("keywords") or []):
            for m in (k.get("keyword"), k.get("plural")):
                if isinstance(m, str) and m.strip():
                    par_mot.setdefault(plier(m), []).append((p, rang, k.get("type")))
                    par_mot_exact.setdefault(m.strip().lower().replace("’", "'"), []).append((p, rang, k.get("type")))

    def choisir(cherche, nature):
        if isinstance(cherche, int):
            return cherche, "(numéro donné)"
        trouves = par_mot_exact.get(cherche.strip().lower(), []) or par_mot.get(plier(cherche), [])
        if not trouves:
            return None, None
        # Le libellé du dessin d'abord, la bonne nature ensuite, puis le plus téléchargé.
        meilleur = max(trouves, key=lambda t: (t[1] == 0, t[2] == NATURE_ARASAAC[nature], t[0].get("downloads") or 0))
        return meilleur[0]["_id"], (meilleur[0]["keywords"][0].get("keyword") or "")

    pages, manquants, choisis, muettes, renommees = [], [], {}, set(), set()
    for pg in PAGES:
        cle, nom, lignes, colonnes, cases = pg["cle"], pg["nom"], pg["lignes"], pg["colonnes"], pg["cases"]
        assert len(cases) <= lignes * colonnes, nom
        sortie_cases = []
        for mot, cherche, nature, dire, lien in cases:
            assert dire != mot, f"{nom} › {mot} : la phrase à dire est le mot lui-même"
            pid, libelle = choisir(cherche, nature)
            if pid is None:
                manquants.append(f"{nom} › {mot} ({cherche})")
            else:
                choisis[pid] = libelle
            fond, bord = COULEURS[nature]
            c = {"mot": mot, "fond": fond, "bord": bord}
            if pid is not None:
                c["arasaac"] = pid
            if dire:
                c["dire"] = dire
            if lien:
                c["lien"] = lien
            if (cle, mot) in RENOMMEES:
                c["avant"] = []
                for vieux, vieux_dire, vieux_picto, vieille_nature in RENOMMEES[(cle, mot)]:
                    assert vieux not in {x[0] for x in cases}, f"{nom} › {vieux} : encore sur la page"
                    a = {"mot": vieux, "arasaac": vieux_picto, "fond": COULEURS[vieille_nature][0], "bord": COULEURS[vieille_nature][1]}
                    if vieux_dire:
                        a["dire"] = vieux_dire
                    c["avant"].append(a)
                renommees.add((cle, mot))
            if (cle, mot) in MUETTES:
                assert lien, f"{nom} › {mot} : une case muette ouvre une page"
                c["muette"] = True
                muettes.add((cle, mot))
            regle, de_la_page = SUITES_SUR_LA_PAGE.get((cle, mot)) or SUITES.get(mot), False
            if regle is None and not lien and cle in SUITES_PAR_PAGE and mot not in SUITES_PAR_PAGE[cle][1]:
                regle, de_la_page = SUITES_PAR_PAGE[cle][0], True
            if regle:
                total = sum(x for _, x in regle)
                c["suites"] = []
                for cible, x in regle:
                    suite = {"page": cible, "poids": round(x / total, 3)}
                    choix = CHOIX_PAR_PAGE.get((cle, cible)) if de_la_page else CHOIX.get((mot, cible))
                    if choix:
                        suite["_choix"] = choix
                    c["suites"].append(suite)
            c["_nature"] = nature
            c["_frequence"] = frequence(lex, mot, nature)
            sortie_cases.append(c)
            print(f"{nom:14} {mot:22} → {pid} « {libelle} »")
        sortie_page = {"cle": cle, "nom": nom, "lignes": lignes, "colonnes": colonnes, "cases": sortie_cases}
        if pg["suite"]:
            sortie_page["suite"] = True
        pages.append(sortie_page)
    cles = {p["cle"] for p in pages}
    assert len(cles) == len(pages), "deux pages ont la même clé"
    assert muettes == MUETTES, f"des cases muettes introuvables : {MUETTES - muettes}"
    assert renommees == set(RENOMMEES), f"des cases renommées introuvables : {set(RENOMMEES) - renommees}"
    assert not pages[0].get("suite"), "la page 1 ouvre la première section"
    for p in pages:
        for c in p["cases"]:
            assert c.get("lien") is None or c["lien"] in cles, c
            for x in c.get("suites", []):
                assert x["page"] in cles, (c["mot"], x)
    # Les choix de pictos : chaque mot, dans la section du thème, devient « clé de page:rang de la case ».
    section_de = {}
    courante = []
    for p in pages:
        if not p.get("suite"):
            courante = []
        courante.append(p)
        for q in courante:
            section_de[q["cle"]] = courante
    servis = set()
    for p in pages:
        for c in p["cases"]:
            for suite in c.get("suites", []):
                choix = suite.pop("_choix", None)
                if not choix:
                    continue
                refs = []
                for m in choix:
                    trouve = next((f"{q['cle']}:{i}" for q in section_de[suite["page"]] for i, x in enumerate(q["cases"]) if x["mot"] == m), None)
                    assert trouve, f"« {m} » n'est pas dans le thème {suite['page']} ({c['mot']})"
                    refs.append(trouve)
                suite["cases"] = refs
                servis.add(id(choix))
    for (m, cible), choix in CHOIX.items():
        regles = SUITES.get(m, []) + [x for (pg, mm), r in SUITES_SUR_LA_PAGE.items() if mm == m for x in r]
        assert any(cible == x for x, _ in regles), f"choix sans règle : {m} → {cible}"
    for (pg, cible), choix in CHOIX_PAR_PAGE.items():
        assert any(cible == x for x, _ in SUITES_PAR_PAGE.get(pg, ([], set()))[0]), f"choix sans règle de page : {pg} → {cible}"
    for cle, (regle, sans) in SUITES_PAR_PAGE.items():
        assert cle in cles and all(x in cles for x, _ in regle), cle
        mots = {c["mot"] for p in pages if p["cle"] == cle for c in p["cases"]}
        assert sans <= mots, (cle, sans - mots)
    inconnus = sorted(set(SUITES) - {c["mot"] for p in pages for c in p["cases"]})
    assert not inconnus, f"des suites pour des mots absents : {inconnus}"
    # Le poids d'un picto dans son thème : sa fréquence en français parlé (Lexique, moitié) et son rang dans la
    # section (le plus courant d'abord, comme dans le PODD, moitié) — les sous-titres de films parlent en adultes,
    # l'ordre des pages garde la part de l'école ; et la sorte de mot qui fait la section (les autres pèsent
    # moins : un début de phrase, un petit mot, une case qui mène ailleurs).
    sections = []
    for p in pages:
        if p.get("suite"):
            sections[-1].append(p)
        else:
            sections.append([p])
    for section in sections:
        rang = 0
        for p in section:
            # La sorte de mot qui fait la page (les activités d'« En classe », puis ses objets à la page suivante).
            natures = [c["_nature"] for c in p["cases"]]
            dominante = max(set(natures), key=natures.count)
            plus_frequent = max([c["_frequence"] for c in p["cases"] if c["_nature"] == dominante] + [0.0])
            for c in p["cases"]:
                facteur = (1.0 if c["_nature"] == dominante else 0.3) * (0.5 if c.get("lien") else 1.0)
                ordre = 1 / (1 + 0.08 * rang)
                rang += 1
                if lex and plus_frequent > 0:
                    f = min(1.0, math.log10(1 + c["_frequence"]) / math.log10(1 + plus_frequent))
                    c["poids"] = round(facteur * (0.5 * f + 0.5 * ordre), 3)
                else:
                    c["poids"] = round(facteur * ordre, 3)
        for p in section:
            reste = [c for q in section[section.index(p):] for c in q["cases"]]
            meilleurs = sorted(reste, key=lambda c: -c["poids"])[:4]
            print(f"  ensemble « {p['nom']} » ({p['cle']}) : {', '.join(c['mot'] for c in meilleurs)}")
    for p in pages:
        for c in p["cases"]:
            del c["_nature"], c["_frequence"]
    # Ce que chaque case disait dans les modèles d'avant : un classeur complet que l'enseignant a retouché reçoit la
    # nouvelle forme là où la case dit encore une ancienne (« ballon » → « au ballon ») ; ce qu'il a écrit lui-même
    # ne bouge pas. "" : la case disait son mot.
    fichier = os.path.join(sortie, "src", "donnees", "classeur-par-defaut.json")
    avant = {}
    if os.path.exists(fichier):
        with open(fichier, encoding="utf-8") as f:
            for p in json.load(f)["pages"]:
                for c in p["cases"]:
                    avant[(p["cle"], c["mot"])] = c
    for p in pages:
        for c in p["cases"]:
            vieille = avant.get((p["cle"], c["mot"]))
            if not vieille:
                continue
            formes = set(vieille.get("direAvant", [])) | {vieille.get("dire", "")}
            formes.discard(c.get("dire", ""))
            if formes:
                c["direAvant"] = sorted(formes)
    os.makedirs(os.path.join(sortie, "src", "donnees"), exist_ok=True)
    with open(fichier, "w", encoding="utf-8") as f:
        modele = {"nom": "Classeur complet", "accueil": "accueil", "categories": "categories", "pages": pages}
        # La version des poids : un classeur complet déjà posé reçoit ceux-ci au lancement quand elle change.
        modele["versionDesPoids"] = "2026-11-05-lexique383-phrases7" if lex else "2026-11-05-ordre"
        if lex:
            modele["sources"] = ["Fréquences : Lexique 3.83 (B. New, C. Pallier, lexique.org), CC BY-SA 4.0"]
        json.dump(modele, f, ensure_ascii=False, indent=1)
    dossier = os.path.join(sortie, "public", "pictos")
    os.makedirs(dossier, exist_ok=True)
    for vieux in os.listdir(dossier):
        if vieux.endswith(".png"):
            os.remove(os.path.join(dossier, vieux))
    for pid in sorted(choisis):
        subprocess.run(["sips", "-Z", "256", os.path.join(images, f"{pid}.png"), "--out", os.path.join(dossier, f"{pid}.png")],
                       check=True, capture_output=True)
    avec_suites = sum(1 for p in pages for c in p["cases"] if c.get("suites"))
    print(f"\n{sum(len(p['cases']) for p in pages)} cases, {len(pages)} pages, {len(choisis)} pictos, {avec_suites} cases avec des suites ; sans picto : {manquants or 'aucune'}")


main(sys.argv[1], sys.argv[2], sys.argv[3] if len(sys.argv) > 3 else None)
