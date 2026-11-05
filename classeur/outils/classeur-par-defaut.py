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

    python3 -I classeur/outils/classeur-par-defaut.py "<…>/ARASAAC" classeur

écrit classeur/src/donnees/classeur-par-defaut.json et copie les images,
réduites, dans classeur/public/pictos/ : le classeur marche dès le premier
lancement, sans internet.
"""
import json
import os
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
# « j'ai mal » + « à la tête », « on va » + « à la piscine ».

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
        ("le corps", "corps", "nom", None, "mal"),
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
        ("je suis malade", "malade", "adjectif", None, "mal"),
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
        ("frère", "frère", "personne", None, None),
        ("sœur", "sœur", "personne", None, None),
        ("mamie", "grand-mère", "personne", None, None),
        ("papi", "grand-père", "personne", None, None),
        ("bébé", "bébé", "personne", None, None),
        ("copain", "ami", "personne", None, None),
        ("copine", "amie", "personne", None, None),
        ("maîtresse", "maîtresse", "personne", None, None),
        ("maître", "maître", "personne", None, None),
        ("AESH", 2476, "personne", None, None),
        ("docteur", "médecin", "personne", None, None),
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
        ("s'asseoir", 35033, "verbe", None, None),
        ("se lever", 34367, "verbe", None, None),
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
        ("ballon", "ballon", "nom", None, None),
        ("puzzle", "puzzle", "nom", None, None),
        ("poupée", "poupée", "nom", None, None),
        ("voiture", "voiture", "nom", None, None),
        ("cubes", "cubes", "nom", None, None),
        ("jeu de société", 32580, "nom", None, None),
        ("toboggan", "toboggan", "nom", None, None),
        ("balançoire", "balançoire", "nom", None, None),
        ("trampoline", "trampoline", "nom", None, None),
        ("vélo", "vélo", "nom", None, None),
        ("pâte à modeler", "pâte à modeler", "nom", None, None),
        ("peinture", "peindre", "nom", None, None),
        ("dessiner", 8088, "verbe", None, None),
        ("musique", "musique", "nom", None, None),
        ("livre", "livre", "nom", None, None),
        ("tablette", "tablette", "nom", None, None),
        ("bulles", "bulles", "nom", None, None),
        ("cache-cache", "cache-cache", "nom", None, None),
        ("dînette", "dînette", "nom", None, None),
        ("train", "train", "nom", None, None),
    ]),
    page("jouer-2", "Jouer", [
        ("avec moi", 7064, "social", "joue avec moi", None),
        ("à moi", 7158, "social", "c'est à moi", None),
        ("à toi", 2608, "social", "c'est à toi", None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "c'est fini", None),
        ("gagné", "gagner", "verbe", "j'ai gagné", None),
        ("perdu", 22031, "verbe", "j'ai perdu", None),
        ("lancer", "lancer", "verbe", None, None),
        ("attraper", "attraper", "verbe", None, None),
        ("construire", "construire", "verbe", None, None),
        ("se cacher", "se cacher", "verbe", None, None),
        ("déguisement", "déguisement", "nom", None, None),
        ("chanter", "chanter", "verbe", None, None),
        ("danser", "danser", "verbe", None, None),
        ("histoire", "conte", "nom", "une histoire", None),
        ("sable", "sable", "nom", None, None),
        ("eau", "eau", "nom", "jouer avec l'eau", None),
        ("dehors", "dehors", "nom", "jouer dehors", None),
        ("animaux", "animaux", "nom", None, "animaux"),
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
        ("j'ai faim", "faim", "verbe", None, None),
        ("pain", "pain", "nom", None, None),
        ("pomme", "pomme", "nom", None, None),
        ("banane", "banane", "nom", None, None),
        ("orange", "orange", "nom", None, None),
        ("yaourt", "yaourt", "nom", None, None),
        ("fromage", "fromage", "nom", None, None),
        ("pâtes", "pâtes", "nom", None, None),
        ("riz", "riz", "nom", None, None),
        ("frites", "frites", "nom", None, None),
        ("pizza", "pizza", "nom", None, None),
        ("soupe", "soupe", "nom", None, None),
        ("légumes", "légumes", "nom", None, None),
        ("viande", "viande", "nom", None, None),
        ("poisson", "poisson", "nom", None, None),
        ("c'est bon", "bon", "adjectif", None, None),
        ("pas bon", 32338, "adjectif", "ce n'est pas bon", None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "j'ai fini", None),
        ("à boire", "boire", "verbe", None, "boire"),
    ]),
    page("manger-2", "Manger", [
        ("œuf", "œuf", "nom", None, None),
        ("gâteau", "gâteau", "nom", None, None),
        ("biscuit", "biscuit", "nom", None, None),
        ("compote", 34012, "nom", None, None),
        ("chocolat", "chocolat", "nom", None, None),
        ("céréales", "céréales", "nom", None, None),
        ("glace", "glace", "nom", None, None),
        ("bonbon", "bonbon", "nom", None, None),
        ("sandwich", "sandwich", "nom", None, None),
        ("chips", "chips", "nom", None, None),
        ("carottes", "carotte", "nom", None, None),
        ("tomate", "tomate", "nom", None, None),
        ("haricots verts", "haricots verts", "nom", None, None),
        ("poulet", "poulet", "nom", None, None),
        ("jambon", "jambon", "nom", None, None),
        ("cuillère", "cuillère", "nom", None, None),
        ("fourchette", "fourchette", "nom", None, None),
        ("couteau", "couteau", "nom", None, None),
        ("assiette", "assiette", "nom", None, None),
        ("bol", "bol", "nom", None, None),
    ], suite=True),
    # 14 — Boire.
    page("boire", "Boire", [
        ("j'ai soif", "soif", "verbe", None, None),
        ("eau", "eau", "nom", "de l'eau", None),
        ("lait", "lait", "nom", "du lait", None),
        ("jus d'orange", "jus d'orange", "nom", None, None),
        ("jus de pomme", "jus de pomme", "nom", None, None),
        ("chocolat chaud", "chocolat chaud", "nom", None, None),
        ("sirop", "sirop", "nom", None, None),
        ("verre", "verre", "nom", None, None),
        ("gourde", "gourde", "nom", None, None),
        ("paille", 6164, "nom", None, None),
        ("bouteille", "bouteille", "nom", None, None),
        ("tasse", "tasse", "nom", None, None),
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
        ("triangle", 4763, "nom", None, None),
        ("rectangle", 4731, "nom", None, None),
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
        ("sport", "sport", "nom", None, None),
        ("ordinateur", "ordinateur", "nom", None, None),
        ("ranger", "ranger", "verbe", None, None),
        ("regroupement", 39679, "nom", None, None),
        ("récréation", "récréation", "nom", None, None),
        ("cantine", "cantine", "nom", None, None),
        ("sieste", "sieste", "nom", None, None),
        ("atelier", 32176, "nom", None, None),
        ("travailler", "travailler", "verbe", None, None),
        ("j'ai fini", "fini", "petit mot", None, None),
        ("c'est mon tour", 7158, "social", None, None),
        ("je ne comprends pas", 27363, "social", None, None),
    ]),
    page("classe-2", "En classe", [
        ("crayon", "crayon", "nom", None, None),
        ("feutre", "feutre", "nom", None, None),
        ("ciseaux", "ciseaux", "nom", None, None),
        ("colle", "colle", "nom", None, None),
        ("cahier", "cahier", "nom", None, None),
        ("livre", "livre", "nom", None, None),
        ("feuille", 8349, "nom", None, None),
        ("gomme", "gomme", "nom", None, None),
        ("règle", "règle", "nom", None, None),
        ("cartable", "sac à dos", "nom", None, None),
        ("tableau", 2526, "nom", None, None),
        ("table", "table", "nom", None, None),
        ("chaise", "chaise", "nom", None, None),
        ("porte", "porte", "nom", None, None),
        ("fenêtre", "fenêtre", "nom", None, None),
        ("se laver les mains", 8975, "verbe", None, None),
        ("le manteau", "manteau", "nom", "mettre le manteau", None),
        ("s'asseoir", 35033, "verbe", None, None),
        ("se mettre en rang", 39146, "verbe", None, None),
        ("silence", "silence", "social", None, None),
    ], suite=True),
    # 17 — Les animaux.
    page("animaux", "Les animaux", [
        ("chien", "chien", "nom", None, None),
        ("chat", "chat", "nom", None, None),
        ("oiseau", "oiseau", "nom", None, None),
        ("poisson", "poisson", "nom", None, None),
        ("cheval", "cheval", "nom", None, None),
        ("vache", "vache", "nom", None, None),
        ("cochon", "cochon", "nom", None, None),
        ("mouton", "mouton", "nom", None, None),
        ("poule", "poule", "nom", None, None),
        ("canard", "canard", "nom", None, None),
        ("lapin", "lapin", "nom", None, None),
        ("souris", "souris", "nom", None, None),
        ("lion", "lion", "nom", None, None),
        ("éléphant", "éléphant", "nom", None, None),
        ("singe", "singe", "nom", None, None),
        ("ours", "ours", "nom", None, None),
        ("serpent", "serpent", "nom", None, None),
        ("papillon", "papillon", "nom", None, None),
        ("caresser", 35471, "verbe", None, None),
        ("donner à manger", "nourrir", "verbe", None, None),
    ]),
    # 18 — S'habiller.
    page("habits", "S'habiller", [
        ("manteau", "manteau", "nom", None, None),
        ("bonnet", "bonnet", "nom", None, None),
        ("écharpe", "écharpe", "nom", None, None),
        ("gants", "gants", "nom", None, None),
        ("chaussures", "chaussures", "nom", None, None),
        ("chaussettes", "chaussettes", "nom", None, None),
        ("pantalon", "pantalon", "nom", None, None),
        ("t-shirt", "t-shirt", "nom", None, None),
        ("pull", "pull", "nom", None, None),
        ("robe", "robe", "nom", None, None),
        ("jupe", "jupe", "nom", None, None),
        ("short", "short", "nom", None, None),
        ("pyjama", "pyjama", "nom", None, None),
        ("couche", "couche", "nom", None, None),
        ("lunettes", "lunettes", "nom", None, None),
        ("mettre", 2781, "verbe", None, None),
        ("enlever", 27049, "verbe", None, None),
        ("attacher", 17026, "verbe", None, None),
        ("trop petit", "petit", "adjectif", "c'est trop petit", None),
        ("trop grand", "grand", "adjectif", "c'est trop grand", None),
    ]),
]

COULEURS = {
    "personne": ("#fff2b8", "#e3b800"), "verbe": ("#d9f0d4", "#2e9b3e"), "nom": ("#fce6ca", "#e07b12"),
    "adjectif": ("#d6e6f7", "#2f6fd0"), "social": ("#fadeeb", "#d6408f"), "question": ("#e9ddf6", "#8a4fd8"),
    "petit mot": ("#f0f0f0", "#8a8f98"),
}
# La nature d'ARASAAC qui va avec la nôtre, pour départager deux dessins d'un même mot.
NATURE_ARASAAC = {"personne": 2, "verbe": 3, "nom": 2, "adjectif": 4, "social": 5, "question": 6, "petit mot": 6}


def plier(s):
    s = unicodedata.normalize("NFD", s.lower().replace("’", "'"))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").replace("œ", "oe").strip()


def main(banque, sortie):
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

    pages, manquants, choisis = [], [], {}
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
            sortie_cases.append(c)
            print(f"{nom:14} {mot:22} → {pid} « {libelle} »")
        sortie_page = {"cle": cle, "nom": nom, "lignes": lignes, "colonnes": colonnes, "cases": sortie_cases}
        if pg["suite"]:
            sortie_page["suite"] = True
        pages.append(sortie_page)
    cles = {p["cle"] for p in pages}
    assert len(cles) == len(pages), "deux pages ont la même clé"
    assert not pages[0].get("suite"), "la page 1 ouvre la première section"
    for p in pages:
        for c in p["cases"]:
            assert c.get("lien") is None or c["lien"] in cles, c
    os.makedirs(os.path.join(sortie, "src", "donnees"), exist_ok=True)
    with open(os.path.join(sortie, "src", "donnees", "classeur-par-defaut.json"), "w", encoding="utf-8") as f:
        json.dump({"nom": "Classeur complet", "accueil": "accueil", "categories": "categories", "pages": pages}, f, ensure_ascii=False, indent=1)
    dossier = os.path.join(sortie, "public", "pictos")
    os.makedirs(dossier, exist_ok=True)
    for vieux in os.listdir(dossier):
        if vieux.endswith(".png"):
            os.remove(os.path.join(dossier, vieux))
    for pid in sorted(choisis):
        subprocess.run(["sips", "-Z", "256", os.path.join(images, f"{pid}.png"), "--out", os.path.join(dossier, f"{pid}.png")],
                       check=True, capture_output=True)
    print(f"\n{sum(len(p['cases']) for p in pages)} cases, {len(pages)} pages, {len(choisis)} pictos ; sans picto : {manquants or 'aucune'}")


main(sys.argv[1], sys.argv[2])
