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

# (mot, picto : un mot à chercher ou un numéro, nature, dire, page ouverte)
# Natures : personne, verbe, nom, adjectif, social, question, petit mot.
PAGES = [
    ("accueil", "Accueil", 5, 6, [
        ("je veux", "vouloir", "verbe", None, "veux"),
        ("j'aime", "aimer", "verbe", None, None),
        ("je n'aime pas", "ne pas aimer", "verbe", None, None),
        ("je me sens", "sentiment", "verbe", None, "sens"),
        ("j'ai mal", "douleur", "verbe", None, "mal"),
        ("j'ai une question", "question", "question", None, "questions"),
        ("oui", "oui", "social", None, None),
        ("non", "non", "social", None, None),
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "c'est fini", None),
        ("stop", "stop", "social", None, None),
        ("aide", "aider", "social", "aide-moi", None),
        ("manger", "manger", "verbe", None, "manger"),
        ("boire", "boire", "verbe", None, "boire"),
        ("jouer", "jouer", "verbe", None, "jouer"),
        ("aller", "aller", "verbe", None, "lieux"),
        ("les gens", "personnes", "personne", None, "gens"),
        ("toilettes", "toilettes", "nom", "je veux aller aux toilettes", None),
        ("bonjour", "bonjour", "social", None, None),
        ("au revoir", "au revoir", "social", None, None),
        ("merci", "merci", "social", None, None),
        ("s'il te plaît", "s'il te plaît", "social", None, None),
        ("je ne sais pas", "je ne sais pas", "social", None, None),
        ("attends", "attendre", "social", None, None),
        ("ça ne va pas", 25315, "social", "quelque chose ne va pas", "probleme"),
        ("c'est…", 11713, "adjectif", "c'est", "decrire"),
        ("en classe", "classe", "nom", None, "classe"),
        ("dehors", "dehors", "nom", None, None),
        ("maison", "maison", "nom", None, None),
        ("fatigué", "fatigué", "adjectif", "je suis fatigué", None),
    ]),
    ("veux", "Je veux", 4, 6, [
        ("manger", "manger", "verbe", None, "manger"),
        ("boire", "boire", "verbe", None, "boire"),
        ("jouer", "jouer", "verbe", None, "jouer"),
        ("aller", "aller", "verbe", None, "lieux"),
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
        ("arrêter", "arrêter", "verbe", None, None),
        ("encore", "encore", "petit mot", None, None),
        ("autre chose", "autre", "petit mot", None, None),
        ("pas ça", "non", "petit mot", None, None),
        ("parler", "parler", "verbe", None, None),
        ("un bisou", "bisou", "nom", None, None),
        ("rentrer", "rentrer", "verbe", "rentrer à la maison", None),
    ]),
    ("manger", "Manger", 4, 6, [
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
        ("œuf", "œuf", "nom", None, None),
        ("gâteau", "gâteau", "nom", None, None),
        ("biscuit", "biscuit", "nom", None, None),
        ("compote", 34012, "nom", None, None),
        ("chocolat", "chocolat", "nom", None, None),
        ("céréales", "céréales", "nom", None, None),
        ("glace", "glace", "nom", None, None),
        ("c'est bon", "bon", "adjectif", None, None),
        ("fini", "fini", "petit mot", "j'ai fini", None),
    ]),
    ("boire", "Boire", 3, 6, [
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
        ("encore", "encore", "petit mot", None, None),
        ("fini", "fini", "petit mot", "j'ai fini", None),
    ]),
    ("jouer", "Jouer", 4, 6, [
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
        ("déguisement", "déguisement", "nom", None, None),
        ("chanter", "chanter", "verbe", None, None),
        ("danser", "danser", "verbe", None, None),
        ("avec moi", 7064, "social", "joue avec moi", None),
    ]),
    ("lieux", "Aller", 4, 6, [
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
        ("voiture", "voiture", "nom", "en voiture", None),
        ("bus", "bus", "nom", "en bus", None),
        ("magasin", "magasin", "nom", "au magasin", None),
        ("salle de bain", 33954, "nom", "à la salle de bain", None),
        ("chambre", 33068, "nom", "dans ma chambre", None),
        ("école", "école", "nom", "à l'école", None),
        ("médecin", "médecin", "nom", "chez le médecin", None),
        ("promenade", "se promener", "nom", "en promenade", None),
        ("ici", "ici", "petit mot", None, None),
        ("là-bas", "là-bas", "petit mot", None, None),
    ]),
    ("gens", "Les gens", 3, 6, [
        ("moi", "moi", "personne", None, None),
        ("toi", "toi", "personne", None, None),
        ("maman", "maman", "personne", None, None),
        ("papa", "papa", "personne", None, None),
        ("frère", "frère", "personne", None, None),
        ("sœur", "sœur", "personne", None, None),
        ("maîtresse", "maîtresse", "personne", None, None),
        ("maître", "maître", "personne", None, None),
        ("copain", "ami", "personne", None, None),
        ("copine", "amie", "personne", None, None),
        ("mamie", "grand-mère", "personne", None, None),
        ("papi", "grand-père", "personne", None, None),
        ("AESH", 2476, "personne", None, None),
        ("docteur", "médecin", "personne", None, None),
        ("bébé", "bébé", "personne", None, None),
        ("les autres", "groupe", "personne", None, None),
        ("quelqu'un", "personne", "personne", None, None),
        ("tout le monde", "tous", "personne", None, None),
    ]),
    # Chaque case complète « je me sens » (la case de l'accueil qui mène ici se dit d'abord) : des mots seuls,
    # sans « je suis » devant. Chaud, froid, faim, soif, l'ennui sont dans « Ça ne va pas ».
    ("sens", "Je me sens", 3, 6, [
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
    ]),
    ("mal", "J'ai mal", 3, 6, [
        ("tête", "tête", "nom", "j'ai mal à la tête", None),
        ("ventre", "ventre", "nom", "j'ai mal au ventre", None),
        ("dents", "dents", "nom", "j'ai mal aux dents", None),
        ("oreille", "oreille", "nom", "j'ai mal à l'oreille", None),
        ("gorge", "gorge", "nom", "j'ai mal à la gorge", None),
        ("nez", "nez", "nom", "j'ai mal au nez", None),
        ("bras", "bras", "nom", "j'ai mal au bras", None),
        ("main", "main", "nom", "j'ai mal à la main", None),
        ("jambe", "jambe", "nom", "j'ai mal à la jambe", None),
        ("pied", "pied", "nom", "j'ai mal au pied", None),
        ("dos", "dos", "nom", "j'ai mal au dos", None),
        ("œil", "œil", "nom", "j'ai mal à l'œil", None),
        ("ici", "ici", "petit mot", "j'ai mal ici", None),
        ("partout", 2728, "petit mot", "j'ai mal partout", None),
        ("un peu", 5546, "petit mot", None, None),
        ("très", "très", "petit mot", "très mal", None),
        ("ça pique", "piquer", "verbe", None, None),
        ("ça gratte", "gratter", "verbe", None, None),
    ]),
    ("questions", "Questions", 2, 6, [
        ("qui ?", "qui", "question", None, None),
        ("quoi ?", 22620, "question", None, None),
        ("où ?", "où", "question", None, None),
        ("quand ?", "quand", "question", None, None),
        ("pourquoi ?", "pourquoi", "question", None, None),
        ("comment ?", "comment", "question", None, None),
        ("combien ?", "combien", "question", None, None),
        ("c'est quoi ?", 10366, "question", None, None),
        ("on fait quoi ?", "faire", "question", None, None),
        ("c'est quand ?", "quand", "question", None, None),
        ("c'est à qui ?", 32743, "question", None, None),
        ("je peux ?", "pouvoir", "question", None, None),
    ]),
    ("probleme", "Ça ne va pas", 4, 6, [
        ("c'est cassé", "cassé", "adjectif", None, None),
        ("j'ai perdu", "perdre", "verbe", None, None),
        ("je suis tombé", 29674, "verbe", None, None),
        ("on m'a fait mal", "douleur", "verbe", None, None),
        ("je ne comprends pas", "ne pas comprendre", "social", None, None),
        ("c'est trop dur", "difficile", "adjectif", None, None),
        ("trop de bruit", 7157, "nom", "il y a trop de bruit", None),
        ("je veux arrêter", "arrêter", "verbe", None, None),
        ("laisse-moi", 7076, "social", "laisse-moi tranquille", None),
        ("aide-moi", "aider", "social", None, None),
        ("je me suis trompé", 6992, "social", None, None),
        ("on m'embête", "embêter", "verbe", None, None),
        ("il triche", 31414, "verbe", None, None),
        ("j'ai peur", "peur", "adjectif", None, None),
        ("je suis malade", "malade", "adjectif", None, None),
        ("appelle quelqu'un", 36137, "verbe", None, None),
        ("j'ai mal", "douleur", "verbe", None, "mal"),
        ("une pause", "pause", "nom", "j'ai besoin d'une pause", None),
        ("j'ai chaud", "chaud", "adjectif", None, None),
        ("j'ai froid", 2401, "adjectif", None, None),
        ("j'ai faim", "faim", "verbe", None, None),
        ("j'ai soif", "soif", "verbe", None, None),
        ("je m'ennuie", "ennui", "adjectif", None, None),
        ("je veux rentrer", "rentrer", "verbe", "je veux rentrer à la maison", None),
    ]),
    ("decrire", "C'est…", 3, 6, [
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
        ("rouge", "rouge", "adjectif", None, None),
        ("bleu", "bleu", "adjectif", None, None),
        ("vert", "vert", "adjectif", None, None),
        ("jaune", "jaune", "adjectif", None, None),
        ("noir", "noir", "adjectif", None, None),
        ("blanc", "blanc", "adjectif", None, None),
    ]),
    ("classe", "En classe", 3, 6, [
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
    for cle, nom, lignes, colonnes, cases in PAGES:
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
        pages.append({"cle": cle, "nom": nom, "lignes": lignes, "colonnes": colonnes, "cases": sortie_cases})
    cles = {p["cle"] for p in pages}
    for p in pages:
        for c in p["cases"]:
            assert c.get("lien") is None or c["lien"] in cles, c
    os.makedirs(os.path.join(sortie, "src", "donnees"), exist_ok=True)
    with open(os.path.join(sortie, "src", "donnees", "classeur-par-defaut.json"), "w", encoding="utf-8") as f:
        json.dump({"nom": "Classeur complet", "accueil": "accueil", "pages": pages}, f, ensure_ascii=False, indent=1)
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
