"""Compare, tableau par tableau, la colonne des objectifs lue sur l'image (OCR) et l'extraction."""
import json, sys, re, difflib, unicodedata

def flux(s):
    s = unicodedata.normalize("NFD", s.lower().replace("œ", "oe").replace("æ", "ae"))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s)

nom = sys.argv[1]
res = json.load(open(nom + ".json"))
ocr = json.load(open(nom + "_ocr.json"))
total_ext = total_diff = 0
problemes = []
for i, r in enumerate(res):
    lu = "\n".join(ocr.get(f"{i}:{p}", "") for p in sorted(r["segments"], key=int))
    extrait = []
    derniere = None
    for per, it in r["items"]:
        if per and per != derniere:
            extrait.append(per); derniere = per
        extrait.append(it)
    a, b = flux(lu), flux(" ".join(extrait))
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    ecarts = [(op, a[i1:i2], b[j1:j2]) for op, i1, i2, j1, j2 in sm.get_opcodes() if op != "equal"]
    n_diff = sum(max(len(x), len(y)) for _, x, y in ecarts)
    total_ext += len(b); total_diff += n_diff
    puces_ocr = sum(1 for l in lu.split("\n") if re.match(r"^\s*[-–—•]", l))
    if n_diff > 3 or (puces_ocr and puces_ocr != len(r["items"])):
        problemes.append((i, r, ecarts, n_diff, puces_ocr))
print(f"{nom} : {len(res)} tableaux, {total_ext} caractères comparés, {total_diff} caractères d'écart")
for i, r, ecarts, n, puces in problemes:
    print(f"\n#{i} [{' › '.join(r['chemin'][1:])}] {r.get('niveau')} — écart {n} car., puces lues {puces} / objectifs {len(r['items'])}")
    for op, x, y in ecarts[:8]:
        print(f"    {op:8} image «{x[:70]}»  référentiel «{y[:70]}»")
