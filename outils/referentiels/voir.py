"""Affiche l'extraction d'un document pour relecture : python3 voir.py <config>"""
import sys, json
from gabarit_tableaux import sommaire, extraire, niveau_de
P = "../"
CONFIGS = {
    "c2_fr": dict(txt="c2_francais.txt", fin="Principes", retirer=("Sommaire", "Principes", "Fréquence des temps d’apprentissage"),
                  options=dict(entete=("Objectif", "Exemples"))),
    "c2_maths": dict(txt="c2_maths.txt", fin="Principes", retirer=("Sommaire", "Principes"),
                     options=dict(entete=("Objectif", "Exemples"))),
    "c2_eps": dict(txt="c2_eps_2026.txt", fin="Principes", retirer=("Sommaire", "Principes"),
                   options=dict(entete=("Objectif", "Exemples"), repere_entete=False)),
}

def lancer(nom, montrer=True):
    c = CONFIGS[nom]
    ent = sommaire(P + c["txt"], c["fin"], debut=c.get("debut", 2))
    ent = [(t, i) for t, i in ent if t not in c["retirer"]]
    res = extraire(P + c["txt"].replace(".txt", ".bbox.html"), ent, **c.get("options", {}))
    total = 0
    for r in res:
        niv = next((niveau_de(x) for x in r["chemin"] if niveau_de(x)), "?")
        r["niveau"] = niv
        total += len(r["items"])
        if montrer:
            print(f"\n[{' › '.join(r['chemin'])}] {niv} p{r['page']} front={r['frontieres']} ({len(r['items'])})")
            for p, t in r["items"]:
                print(f"   {('('+p+') ') if p else ''}{t}")
    print(f"\nTOTAL {total} objectifs, {len(res)} tableaux")
    return res



def entrees_langues(txt, activites_fin="Préambule"):
    """Titres du programme de langues, lus dans le corps : activité, niveau, rubrique « (CO-CP) »."""
    import re
    from lib import norm
    lignes = [norm(l) for l in open(txt, encoding="utf-8").read().split("\n")]
    # Activités : titres de premier niveau du sommaire, qui finissent par un code entre parenthèses.
    activites = [re.sub(r"\s*\((CO|EOC|EOI|CE|EE|M)\)$", "", l) for l in lignes[:60]
                 if re.search(r"\((CO|EOC|EOI|CE|EE|M)\)$", l)]
    code = re.compile(r"\((CO|EOC|EOI|CE|EE|M)-(CP|CE1|CE2|CM1|CM2)\)$")
    debut = lignes.index(activites_fin, 5)  # corps après le sommaire
    entrees, k = [], debut
    while k < len(lignes):
        l = lignes[k]
        if l in activites:
            entrees.append((l, 0))
        elif l in ("Cours préparatoire", "Cours élémentaire première année", "Cours élémentaire deuxième année",
                   "Cours moyen première année", "Cours moyen deuxième année"):
            entrees.append((l, 0))
        elif code.search(l):
            # Titre éventuellement sur deux lignes : la première n'a pas le code.
            if entrees and entrees[-1][1] == -1:
                l = norm(entrees.pop()[0] + " " + l)
            entrees.append((l, 2))
        elif k + 1 < len(lignes) and code.search(lignes[k + 1]) and l and l[0].isupper() and len(l) > 40 \
                and not l.endswith((".", ":", ";")):
            entrees.append((l, -1))
        k += 1
    return [(t, i) for t, i in entrees if i >= 0]


CONFIGS["c2_hg"] = dict(txt="c2_hg_2026.txt", fin="Principes", retirer=("Sommaire", "Principes"),
                        options=dict(entete=("Objectif", "Attendus", "Repères"), n_col=3, col=1, repere_entete=False,
                                     terminaisons=("Mots-clés", "Mots clés", "Mot-clé", "Mot clé"), reperes_fixes=[200, 386]))
CONFIGS["c3_hg"] = dict(txt="c3_hg_2026.txt", fin="Principes", retirer=("Sommaire", "Principes"),
                        options=dict(entete=("Objectif", "Attendus", "Repères"), n_col=3, col=1, repere_entete=False,
                                     terminaisons=("Mots-clés", "Mots clés", "Mot-clé", "Mot clé"), reperes_fixes=[200, 386]))
CONFIGS["c2_lv"] = dict(txt="c2_lver_2026.txt", langues=True,
                        options=dict(entete=("Objectif", "Exemples"), repere_entete=False, debut=("Préambule", 2)))
CONFIGS["c3_lv"] = dict(txt="c3_lver_2026.txt", langues=True,
                        options=dict(entete=("Objectif", "Exemples"), repere_entete=False, debut=("Préambule", 2)))

_lancer_origine = lancer
def lancer(nom, montrer=True):
    c = CONFIGS[nom]
    if not c.get("langues"):
        return _lancer_origine(nom, montrer)
    from gabarit_tableaux import extraire, niveau_de
    ent = entrees_langues(P + c["txt"])
    res = extraire(P + c["txt"].replace(".txt", ".bbox.html"), ent, **c.get("options", {}))
    total = 0
    for r in res:
        r["niveau"] = next((niveau_de(x) for x in r["chemin"] if niveau_de(x)), "?")
        total += len(r["items"])
        if montrer:
            print(f"\n[{' › '.join(r['chemin'])}] {r['niveau']} p{r['page']} front={r['frontieres']} ({len(r['items'])})")
            for p, t in r["items"]:
                print(f"   {('('+p+') ') if p else ''}{t}")
    print(f"\nTOTAL {total} objectifs, {len(res)} tableaux")
    return res

if __name__ == "__main__":
    res = lancer(sys.argv[1])
    json.dump(res, open(sys.argv[1] + ".json", "w"), ensure_ascii=False, indent=1)
