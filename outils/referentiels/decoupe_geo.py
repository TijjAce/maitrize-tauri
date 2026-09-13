"""Découpage des objectifs du cycle 3 par la seule géométrie (écart vertical entre lignes), comparé à l'extraction."""
import re, json, sys, unicodedata, difflib
from lib import lire, norm

def flux(s):
    s = unicodedata.normalize("NFD", s.lower().replace("œ", "oe"))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))

doc, js = sys.argv[1], sys.argv[2]
SEUIL = float(sys.argv[3]) if len(sys.argv) > 3 else 13.8
L = [l for l in lire(f"../{doc}.bbox.html") if l.texte]
ENTETE = re.compile(r"^Objectifs? d’apprentissage$")
NIV = {"Cours moyen première année": "CM1", "Cours moyen deuxième année": "CM2"}
blocs, niveau, k = [], None, 0
while k < len(L):
    t = L[k].texte
    if t in NIV: niveau = NIV[t]
    elif t.startswith("Sixième"): niveau = None
    elif ENTETE.match(t) and niveau:
        items, courant, prec = [], [], L[k]
        j = k + 1
        while j < len(L):
            l = L[j]
            if ENTETE.match(l.texte) or l.texte in NIV or l.texte.startswith("Sixième"):
                break
            if l.page != prec.page:
                break  # fin de page : on arrête le bloc (vérifié à part)
            ecart = l.y - prec.y
            if ecart > 16.5:
                break
            if ecart >= SEUIL and courant:
                items.append(" ".join(courant)); courant = []
            courant.append(l.texte)
            prec = l; j += 1
        if courant: items.append(" ".join(courant))
        blocs.append({"niveau": niveau, "page": L[k].page, "items": items, "coupe_page": j < len(L) and L[j].page != prec.page and not (ENTETE.match(L[j].texte) or L[j].texte in NIV)})
        k = j; continue
    k += 1

ext = [r for r in json.load(open(js))]
print(f"{doc} : {len(blocs)} blocs géométriques, {len(ext)} blocs extraits ; seuil {SEUIL}")
accord = desaccord = 0
for i, (g, e) in enumerate(zip(blocs, ext)):
    ei = [t for _, t in e["items"]]
    gi = g["items"]
    if [flux(x) for x in gi] == [flux(x) for x in ei]:
        accord += 1; continue
    desaccord += 1
    print(f"\n#{i} {g['niveau']} p{g['page']} {' › '.join(e['chemin'])}  géométrie {len(gi)} / extraction {len(ei)}{'  [coupé par une page]' if g['coupe_page'] else ''}")
    for op, a1, a2, b1, b2 in difflib.SequenceMatcher(None, [flux(x) for x in gi], [flux(x) for x in ei], autojunk=False).get_opcodes():
        if op == "equal": continue
        for x in gi[a1:a2]: print("   géométrie :", x[:150])
        for x in ei[b1:b2]: print("   extraction:", x[:150])
print(f"\nblocs identiques : {accord}, différents : {desaccord}")
