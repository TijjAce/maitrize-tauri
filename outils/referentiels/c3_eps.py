import json, re
from lib import norm, nettoyer
lignes = [norm(l) for l in open("../c3_eps_2026.txt", encoding="utf-8").read().split("\n")]
som = lignes[:lignes.index("Sixième")]
domaines, rubriques = [], []
brutes = open("../c3_eps_2026.txt", encoding="utf-8").read().split("\n")[:len(som)]
for brut in brutes:
    t = norm(brut)
    if not t or t in ("Programme d’éducation physique et sportive du cycle 3", "Sommaire", "Propos introductif", "Cours moyen", "Principes"):
        continue
    (rubriques if brut[:1].isspace() else domaines).append(t)
# Corps : du second « Cours moyen » au second « Sixième ».
debut = [i for i, t in enumerate(lignes) if t == "Cours moyen"][1]
fin = [i for i, t in enumerate(lignes) if t == "Sixième"][1]
res, dom, rub, dans = [], None, None, False
for t in lignes[debut:fin]:
    if t in domaines: dom, dans = t, False; continue
    if t in rubriques: rub, dans = t, False; continue
    if re.match(r"^Objectifs? d’apprentissage$", t):
        res.append({"chemin": [dom, rub], "niveau": "CM1-CM2", "items": []}); dans = True; continue
    if dans:
        if not t or t in domaines or t in rubriques: dans = False; continue
        its = res[-1]["items"]
        if its and (t[:1].islower() or not its[-1][1].endswith(".")):
            its[-1] = ("", its[-1][1] + " " + t)
        else:
            its.append(("", nettoyer(t)))
tot = 0
for r in res:
    tot += len(r["items"]); print(f"[{' › '.join(r['chemin'])}] ({len(r['items'])})")
    for _, t in r["items"]: print("   ", t)
print("TOTAL", tot, len(res))
json.dump(res, open("c3_eps.json", "w"), ensure_ascii=False, indent=1)
