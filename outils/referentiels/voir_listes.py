import sys, json, re
import gabarit_listes as G
from lib import norm
P = "../"

def rubriques_du_sommaire(txt, fin):
    lignes = open(P + txt, encoding="utf-8").read().split("\n")
    # Titre de rubrique sur deux lignes : la première n’a pas de points de conduite.
    recollees = []
    for brut in lignes:
        if recollees and recollees[-1].startswith(" ") and "__" not in recollees[-1] and brut.startswith("  ") \
                and "__" in brut and brut.strip()[:1].islower():
            recollees[-1] = recollees[-1].rstrip() + " " + brut.strip()
        else:
            recollees.append(brut)
    lignes = recollees
    doms, rubs = [], []
    for brut in lignes[2:]:
        t = norm(re.sub(r"_{3,}.*$", "", brut))
        if not t: continue
        if t == fin and doms and not brut[:1].isspace(): break
        if brut[:1].isspace(): rubs.append(t)
        elif t not in ("Principes", "Sommaire") and not t.startswith(("Cours moyen", "Sixième")): doms.append(t)
    return doms, rubs

doc = sys.argv[1]
txt = {"c3_fr": "c3_francais.txt", "c3_maths": "c3_maths.txt"}[doc]
doms, rubs = rubriques_du_sommaire(txt, "Principes")
G.RUBRIQUES = set(rubs)
res = G.extraire(P + txt.replace(".txt", ".bbox.html"), set(doms) - {"Culture littéraire et artistique"},
                 ignorer_titres=("Principes", "Points de vigilance pour les professeurs", "Point de vigilance pour les professeurs", "Repères"))
tot = 0
for r in res:
    tot += len(r["items"])
    print(f"\n[{' › '.join(r['chemin'])}] {r['niveau']} p{r['page']} ({len(r['items'])})")
    for _, t in r["items"]: print("   ", t)
print("\nTOTAL", tot, "tableaux", len(res))
json.dump(res, open(doc + ".json", "w"), ensure_ascii=False, indent=1)
