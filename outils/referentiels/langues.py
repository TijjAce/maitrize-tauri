"""Langues vivantes 2026 : activités langagières → rubriques, avec les niveaux où chacune s'applique (sommaire)."""
import json, re
from lib import norm

def structure(txt, niveaux):
    lignes = open(txt, encoding="utf-8").read().split("\n")
    fin = next(i for i, l in enumerate(lignes) if norm(l) == "Préambule" and i > 5)
    activites, en_attente = [], ""
    for brut in lignes[:fin]:
        t = norm(brut)
        m = re.match(r"^(.*)\((CO|EOC|EOI|CE|EE|M)\)$", t)
        if m and not brut[:1].isspace():
            activites.append({"titre": norm(m.group(1)), "code": m.group(2), "rubriques": []}); continue
        if not activites or not t:
            continue
        if "__" in t:
            titre = norm(en_attente + " " + re.sub(r"_{2,}.*$", "", t))
            niv = [n for n in niveaux if re.search(rf"\b{n}\b", t.split("_")[-1])]
            activites[-1]["rubriques"].append({"titre": titre, "niveaux": niv})
            en_attente = ""
        elif brut[:1].isspace():
            en_attente = norm(en_attente + " " + t)
    return activites

if __name__ == "__main__":
    sortie = {"c2": structure("../c2_lver_2026.txt", ["CP", "CE1", "CE2"]),
              "c3": structure("../c3_lver_2026.txt", ["CM1", "CM2"])}
    for k, acts in sortie.items():
        print("==", k)
        for a in acts:
            print(f" [{a['code']}] {a['titre']}")
            for r in a["rubriques"]:
                print(f"     - {r['titre']}  {r['niveaux']}")
    json.dump(sortie, open("langues.json", "w"), ensure_ascii=False, indent=1)
