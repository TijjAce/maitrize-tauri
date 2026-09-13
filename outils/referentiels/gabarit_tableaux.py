"""Gabarit « tableaux » : Domaine → Niveau → Rubrique (→ sous-rubrique) → tableau Objectifs | Exemples.

Le sommaire du document donne la suite exacte des titres ; on la suit dans l'ordre pour savoir
où l'on est, et l'on ne retient d'un tableau que sa colonne d'objectifs (ou d'attendus)."""
import re
from lib import lire, norm, gouttieres, colonnes, items

NIVEAUX = {
    "Cours préparatoire": "CP", "Cours élémentaire première année": "CE1", "Cours élémentaire deuxième année": "CE2",
    "Cours moyen première année": "CM1", "Cours moyen deuxième année": "CM2", "Cours moyen": "CM1-CM2",
    "CP :": "CP", "CE1 :": "CE1", "CE2 :": "CE2", "CM1 :": "CM1", "CM2 :": "CM2",
}


def niveau_de(titre):
    for k, v in sorted(NIVEAUX.items(), key=lambda kv: -len(kv[0])):
        if titre.startswith(k):
            return v
    return None


def sommaire(fichier_txt, fin_marqueur, debut=2):
    """Entrées du sommaire (texte, indentation) jusqu'au marqueur de fin."""
    lignes = open(fichier_txt, encoding="utf-8").read().split("\n")
    entrees = []
    for brut in lignes[debut:]:
        if not brut.strip():
            continue
        t = norm(re.sub(r"_{3,}.*$", "", brut))
        if entrees and t == fin_marqueur and any(e[0] == fin_marqueur for e in entrees):
            break
        indent = len(brut) - len(brut.lstrip(" "))
        # Titre du sommaire sur deux lignes : la suite commence par une parenthèse ou une minuscule.
        if entrees and (t.startswith("(") or t[:1].islower()):
            entrees[-1] = (norm(entrees[-1][0] + " " + t), entrees[-1][1])
            continue
        entrees.append((t, indent))
    return entrees


def extraire(bbox, entrees, entete=("Objectifs", "Exemples"), n_col=2, col=0, marge_haut=0, marge_bas=0,
             terminaisons=(), ignorer=(), repere_entete=True, paragraphes=False, debut=None, reperes_fixes=None,
             options_items=None):
    """Suit le document titre par titre et récolte les tableaux.

    Rend une liste de dicts {chemin: [titres], niveau, items: [(période, texte)]}."""
    lignes = lire(bbox, marge_haut, marge_bas)
    attendus = [t for t, _ in entrees if t not in ignorer]
    pos = 0            # prochain titre attendu
    chemin = {}        # indentation → titre
    indents_rubriques = sorted({i for t, i in entrees if i > 0 and not niveau_de(t)})
    def profondeur(t, i):
        if niveau_de(t):
            return 1
        if i == 0:
            return 0
        return 2 if i == indents_rubriques[0] else 3
    indent_de = {t: profondeur(t, i) for t, i in entrees}
    resultats = []
    i = 0
    # On saute le sommaire lui-même : on repart du dernier titre de premier niveau vu deux fois.
    def compact(x):
        return re.sub(r"[^0-9a-zàâäçéèêëîïôöûùüÿœ]", "", x.lower())

    def correspond(k, j):
        if j >= len(attendus):
            return 0
        cible, ccible = attendus[j], compact(attendus[j])
        t = lignes[k].texte
        if t == cible or (len(ccible) > 3 and compact(t) == ccible):
            return 1
        if k + 1 < len(lignes):
            deux = compact(t + " " + lignes[k + 1].texte)
            if len(compact(t)) > 8 and ccible.startswith(compact(t)) and deux == ccible:
                return 2
        return 0

    # Position de départ : après le sommaire (seconde occurrence du premier titre attendu).
    texte_debut, occurrence = debut or (attendus[0], 2)
    vus = 0
    while i < len(lignes):
        if lignes[i].texte == texte_debut:
            vus += 1
            if vus == occurrence:
                break
        i += 1

    dernier_reperes = None   # colonnes du dernier en-tête vu
    attente = False          # un titre vient de passer : son tableau peut suivre sans en-tête
    while i < len(lignes):
        n = correspond(i, pos)
        if n:
            titre = attendus[pos]
            ind = indent_de[titre]
            chemin = {k: v for k, v in chemin.items() if k < ind}
            chemin[ind] = titre
            pos += 1
            i += n
            attente = dernier_reperes is not None
            continue
        li = lignes[i]
        est_entete = all(any(m.t.startswith(e) for m in li.mots) for e in entete)
        # Tableau sans en-tête : il continue celui du titre parent (« Les longueurs et les masses »
        # n'a qu'un en-tête pour ses deux parties). On le reconnaît à une puce en tête de ligne et à
        # du contenu dans la seconde colonne.
        def blanc_a(ligne, x):
            return any(u.x1 < x - 2 and v.x0 > x - 14 and v.x0 - u.x1 >= 6 for u, v in zip(ligne.mots, ligne.mots[1:]))
        sans_entete = (not est_entete and attente and dernier_reperes and li.texte[:1] in "-−–\uf02d"
                       and li.texte[1:].strip()[:1].isupper() and blanc_a(li, dernier_reperes[0]))
        if est_entete or sans_entete:
            if est_entete and repere_entete:
                dernier_reperes = [m.x0 for m in li.mots if any(m.t.startswith(e) for e in entete[1:])][: n_col - 1]
            j = i + 1 if est_entete else i
            rangs = []
            while j < len(lignes) and not correspond(j, pos):
                lj = lignes[j]
                if any(lj.texte.startswith(x) for x in terminaisons):
                    break
                if j > i and all(any(m.t.startswith(e) for m in lj.mots) for e in entete):
                    break  # nouvel en-tête : nouveau tableau
                pleine = paragraphes and (lj.x1 - lj.x0) > 0.72 * (lj.largeur_page - 2 * 50) and lj.plus_grand_ecart() < 9
                if pleine and rangs:
                    break
                if not pleine:
                    rangs.append(lj)
                j += 1
            front = gouttieres(rangs, n_col, reperes=reperes_fixes or (dernier_reperes if repere_entete else None))
            if not repere_entete and front:
                dernier_reperes = [f + 6 for f in front]
            cols = colonnes(rangs, front)
            its = items(cols[col], **(options_items or {})) if len(cols) > col else []
            if not its and len(cols) > col:
                its = items(cols[col], puces_obligatoires=False)  # liste sans puces dans le PDF
            resultats.append({
                "chemin": [chemin[k] for k in sorted(chemin)], "items": its,
                "page": li.page, "y": li.y, "frontieres": [round(f) for f in front], "sans_entete": bool(sans_entete),
            })
            attente = False
            i = max(j, i + 1)
            continue
        i += 1
    if pos < len(attendus):
        print(f"  ⚠ titres non retrouvés à partir de : {attendus[pos:pos+3]}")
    return resultats
