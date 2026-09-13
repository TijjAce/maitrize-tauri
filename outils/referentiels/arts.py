"""Tableaux « Compétences travaillées » des enseignements artistiques (programmes 2020, consolidés)."""
import json, re, sys
from lib import norm, nettoyer

def tableau(txt, ligne_entete):
    """Lit un tableau « Compétences travaillées | Domaines du socle » à partir de sa ligne d'en-tête (1-indexée)."""
    lignes = open(txt, encoding="utf-8").read().split("\n")
    col = lignes[ligne_entete - 1].index("Domaines du socle") - 8
    comps, courant = [], None
    for brut in lignes[ligne_entete:]:
        if brut.startswith("©") or "www.education.gouv.fr" in brut:
            continue  # pied de page
        gauche = norm(brut[:col])
        if not brut.strip():
            if comps and comps[-1]["items"]:
                break
            continue
        if not gauche:
            continue  # seulement les domaines du socle
        if gauche.startswith(("-", "−", "–")):
            comps[-1]["items"].append(gauche[1:].strip())
        elif brut.startswith("  ") and comps and comps[-1]["items"]:
            comps[-1]["items"][-1] += " " + gauche
        elif comps and not comps[-1]["items"]:
            comps[-1]["titre"] += " " + gauche   # titre de compétence sur deux lignes
        else:
            comps.append({"titre": gauche, "items": []})
    for c in comps:
        c["titre"] = nettoyer(c["titre"]).rstrip(".")
        c["items"] = [nettoyer(i) for i in c["items"]]
    return comps

if __name__ == "__main__":
    P = "../"
    sortie = {
        "c2_ap": tableau(P + "c2_2020_consolide.txt", 1325),
        "c2_em": tableau(P + "c2_2020_consolide.txt", 1549),
        "c3_ap": tableau(P + "c3_consolide_2023.txt", 2156),
        "c3_em": tableau(P + "c3_consolide_2023.txt", 2469),
        "c3_hda": tableau(P + "c3_consolide_2023.txt", 2702),
    }
    for k, comps in sortie.items():
        print("\n==", k)
        for c in comps:
            print(" *", c["titre"])
            for i in c["items"]:
                print("     -", i)
    json.dump(sortie, open("arts.json", "w"), ensure_ascii=False, indent=1)
