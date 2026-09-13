import json
from gabarit_tableaux import sommaire, extraire, niveau_de
ent = sommaire("../emc_2024.txt", "Préambule")
# Seulement l'école élémentaire : de « CP : » jusqu'à « Sixième : ».
debut = next(i for i, (t, _) in enumerate(ent) if t.startswith("CP :"))
fin = next(i for i, (t, _) in enumerate(ent) if t.startswith("Sixième :"))
ent = ent[debut:fin]
res = extraire("../emc_2024.bbox.html", ent, entete=("Notions", "Contenus", "Démarches"), n_col=3, col=1,
               debut=("ÉCOLE ÉLÉMENTAIRE", 1), options_items=dict(puces_obligatoires=False, sous_puces_nouvelles=True, seules_puces_separent=True),
               terminaisons=("Attendus et objectifs",))
# Borne : le titre « Sixième : … » dans le corps du texte.
from lib import lire
page_6e = next(l.page for l in lire("../emc_2024.bbox.html") if l.texte.startswith("Sixième : Apprendre") and l.page > 3)
ligne_6e_y = next(l.y for l in lire("../emc_2024.bbox.html") if l.texte.startswith("Sixième : Apprendre") and l.page > 3)
res = [r for r in res if (r["page"], r["y"]) < (page_6e, ligne_6e_y)]
tot = 0
for r in res:
    r["niveau"] = next((niveau_de(x) for x in r["chemin"] if niveau_de(x)), "?")
    tot += len(r["items"])
    print(f"\n[{' › '.join(r['chemin'])}] {r['niveau']} p{r['page']} front={r['frontieres']} ({len(r['items'])})")
    for _, t in r["items"]: print("   ", t)
print("\nTOTAL", tot, len(res))
json.dump(res, open("emc.json", "w"), ensure_ascii=False, indent=1)
