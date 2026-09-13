import sys, json, re, collections
from lib import norm
src, js = sys.argv[1], sys.argv[2]
lignes = open(src, encoding="utf-8").read().split("\n")
niveau, dans, mots_src = None, False, []
for brut in lignes:
    t = norm(brut)
    if t in ("Cours moyen première année", "Cours moyen deuxième année"): niveau = t; dans = False; continue
    if t.startswith("Sixième"): niveau = None; dans = False; continue
    if re.match(r"^Objectifs? d’apprentissage$", t): dans = niveau is not None; continue
    if dans:
        if not t: dans = False; continue
        mots_src += t.split()
res = json.load(open(js))
norme = lambda ms: collections.Counter(re.sub(r"[^\w’-]", "", m) for m in ms if re.sub(r"[^\w’-]", "", m))
ext = [m for r in res for _, it in r["items"] for m in it.split()]
titres, vus = [], set()
for r in res:
    for t in r["chemin"][1:]:
        if (t, r["niveau"]) not in vus: vus.add((t, r["niveau"])); titres += t.split()
print("source", len(mots_src), "extraction", len(ext))
print("manquants hors titres :", dict(((norme(mots_src) - norme(ext)) - norme(titres)).most_common(40)))
print("en trop :", dict((norme(ext) - norme(mots_src)).most_common(30)))
