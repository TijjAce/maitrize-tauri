"""Gabarit « listes » (français et mathématiques du cycle 3) :
Domaine → Niveau → Rubrique (→ sous-rubriques) → « Objectifs d’apprentissage » → un objectif par ligne."""
import re
from lib import lire, norm, nettoyer

NIVEAUX = {"Cours moyen première année": "CM1", "Cours moyen deuxième année": "CM2"}
ARRET = ("Sixième",)
ENTETE = re.compile(r"^Objectifs? d’apprentissage$")


def extraire(bbox, domaines, marge_haut=0, marge_bas=0, ignorer_titres=()):
    L = [l for l in lire(bbox, marge_haut, marge_bas) if l.texte]
    # Bord droit du texte : le plus grand x1 atteint par les lignes pleines.
    fins = sorted(l.x1 for l in L)
    marge_droite = fins[int(len(fins) * 0.98)] + 1

    def blanc_avant(k):
        return k == 0 or L[k].page != L[k - 1].page or L[k].y - L[k - 1].y > 17

    def est_titre(k, profondeur=0):
        """Un titre est suivi, après un blanc, de l’en-tête des objectifs ou d’un autre titre."""
        if k + 1 >= len(L) or profondeur > 3 or ENTETE.match(L[k].texte) or L[k].texte in ignorer_titres:
            return False
        if not L[k].texte[:1].isupper() or L[k].texte.endswith((".", ";", ",")):
            return False
        suivant = k + 1
        if not blanc_avant(suivant):
            return False
        if ENTETE.match(L[suivant].texte):
            return True
        # Titre suivi d’un sous-titre : il doit lui-même venir après un blanc, sinon c’est le dernier
        # objectif d’une liste, suivi du titre de la rubrique suivante.
        return blanc_avant(k) and est_titre(suivant, profondeur + 1)

    res, domaine, niveau, titres = [], None, None, []
    k, en_objectifs = 0, False
    courant = None
    sortie = None

    def fermer():
        nonlocal courant
        if courant is not None and sortie is not None:
            sortie["items"].append(("", nettoyer(courant)))
        courant = None

    while k < len(L):
        t = L[k].texte
        if t in domaines and blanc_avant(k):
            fermer(); domaine, niveau, titres, en_objectifs = t, None, [], False
        elif t in NIVEAUX:
            fermer(); niveau, titres, en_objectifs = NIVEAUX[t], [], False
        elif t in ARRET or t.startswith(ARRET):
            fermer(); niveau, en_objectifs = None, False
        elif niveau and ENTETE.match(t):
            fermer()
            sortie = {"chemin": [domaine] + titres, "niveau": niveau, "items": [], "page": L[k].page}
            res.append(sortie); en_objectifs = True
        elif niveau and ((t in RUBRIQUES and blanc_avant(k)) or est_titre(k)):
            fermer(); en_objectifs = False
            # Un titre après un blanc : même profondeur que le précédent s’il n’est suivi que d’objectifs.
            if t in RUBRIQUES:
                titres = [t]; k += 1; continue
            if titres and not blanc_avant(k):
                titres = titres[:-1]
            if k + 1 < len(L) and ENTETE.match(L[k + 1].texte):
                titres = (titres[:1] if len(titres) >= 1 and est_rubrique(titres[0]) else []) + [t] \
                    if not est_rubrique(t) else [t]
            else:
                titres = [t]
        elif en_objectifs and niveau:
            prec = L[k - 1]
            # Retour à la ligne automatique : le premier mot n’aurait pas tenu au bout de la ligne précédente.
            premier = L[k].mots[0]
            enveloppe = (prec.page == L[k].page and not blanc_avant(k)
                         and prec.x1 + 3 + (premier.x1 - premier.x0) > marge_droite)
            if courant is None:
                courant = t
            elif continue_objectif(courant, t, enveloppe):
                courant = courant + " " + t
            else:
                fermer(); courant = t
        k += 1
    fermer()
    return res


RUBRIQUES = set()


def est_rubrique(t):
    return t in RUBRIQUES


# Un objectif commence par un verbe à l’infinitif : « Lire », « Restituer », « S’approprier ».
INFINITIF = re.compile(r"^(?:S’|Se |Ne pas )?[A-ZÀÂÉÈÊÎÔÛ][a-zàâçéèêëîïôûùüÿœ]+(?:er|ir|re|oir|dre|ire)\b")
NOMS_EN_RE = {"Terre", "Guerre", "Pierre", "Angleterre", "Ordre", "Titre", "Nombre", "Lettre", "Centre", "Livre",
              "Chiffre", "Cadre", "Membre", "Octobre", "Novembre", "Décembre", "Septembre", "Notre", "Votre", "Entre"}


def continue_objectif(courant, suite, enveloppe):
    """La ligne `suite` prolonge-t-elle l’objectif `courant` ?"""
    if suite[:1].islower() or not suite[:1].isalpha():
        return True
    if courant.endswith((",", ";", ":", "—", "–", "(", "-", "/", "+", "’", ".")):
        return True  # phrase interrompue, ou seconde phrase du même objectif
    premier = suite.split()[0].rstrip(",.;:")
    if INFINITIF.match(suite) and premier not in NOMS_EN_RE:
        return False
    return enveloppe
