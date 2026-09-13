"""Programmes de sciences 2026 (PDF sans texte, lus par reconnaissance de caractères)."""
import sys, json, re, unicodedata
from lib import norm, nettoyer

NIV = {"Cours préparatoire": "CP", "Cours élémentaire première année": "CE1", "Cours élémentaire deuxième année": "CE2",
       "Cours moyen première année": "CM1", "Cours moyen deuxième année": "CM2", "Sixième": None}


def compact(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)))


def lire_ocr(fichier):
    pages, courante = [], None
    for ligne in open(fichier, encoding="utf-8"):
        ligne = ligne.rstrip("\n")
        if ligne.startswith("=== PAGE"):
            courante = []; pages.append(courante); continue
        parts = ligne.split("\t")
        if len(parts) == 4 and courante is not None:
            y, x0, x1, t = float(parts[0]), float(parts[1]), float(parts[2]), norm(parts[3])
            courante.append((y, x0, x1, t))
    return pages


def extraire(fichier):
    pages = lire_ocr(fichier)
    p1 = sorted(pages[0])
    k0 = next(i for i, l in enumerate(p1) if l[3] == "Organisation du programme")
    attendus = []  # (texte, profondeur)
    for y, x0, x1, t in p1[k0 + 1:]:
        if t == "Principes":
            break
        attendus.append((t, 1 if t in NIV else (0 if x0 < 0.07 else 2)))
    # Corps : colonne de gauche, page après page, en ignorant le sommaire.
    lignes = []
    for num, page in enumerate(pages[1:], 2):
        for y, x0, x1, t in sorted(l for l in page if l[1] < 0.5):
            lignes.append((num, y, x0, x1, t))
    res, pos, chemin, niveau, dans = [], 0, {}, None, False
    entete = re.compile(r"^Objectifs? d.apprentissage$")
    for idx, (num, y, x0, x1, t) in enumerate(lignes):
        if pos < len(attendus) and compact(t) == compact(attendus[pos][0]):
            titre, prof = attendus[pos]
            pos += 1
            chemin = {k: v for k, v in chemin.items() if k < prof}
            chemin[prof] = titre
            if prof == 1:
                niveau = NIV.get(titre)
            dans = False
            continue
        if re.match(r"^Objectifs? d.apprentissage$", t):
            if niveau:
                res.append({"chemin": [chemin[k] for k in sorted(chemin)], "niveau": niveau, "items": [], "page": num})
                dans = True
            continue
        # Sous-rubrique (« Masse et volume », « Mélanges ») : à la marge des titres, sans puce ni point.
        suivi_entete = any(entete.match(l[4]) for l in lignes[idx + 1: idx + 3])
        if niveau and t[:1] not in "-–—•" and not t.endswith(".") and len(t) < 90 and 2 in chemin \
                and (x0 < 0.0635 or suivi_entete) and x0 < 0.072:
            chemin = {k: v for k, v in chemin.items() if k < 3}
            chemin[3] = t
            dans = False
            continue
        # Étiquette de groupe dans le tableau (« Lumière ») : courte, sans puce ni point, suivie d’une puce.
        if dans and niveau and t[:1] not in "-–—•" and not t.endswith((".", ",", ";")) and len(t) < 70 \
                and idx + 1 < len(lignes) and lignes[idx + 1][4][:1] in "-–—•" and t[:1].isupper():
            base = res[-1]["chemin"][:3]
            if res[-1]["items"]:
                res.append({"chemin": base + [t], "niveau": niveau, "items": [], "page": num})
            else:
                res[-1]["chemin"] = base + [t]
            continue
        if dans and niveau:
            its = res[-1]["items"]
            puce = t[:1] in "-–—•"
            texte = t[1:].strip() if puce else t
            if puce or not its or (its[-1].endswith(".") and texte[:1].isupper()):
                its.append(texte)
            else:
                # Ligne perdue par la reconnaissance ? L'interligne normal vaut ~0,015 de la page.
                prec = lignes[idx - 1]
                if prec[0] == num and y - prec[1] > 0.022:
                    print(f"⚠ ligne possiblement perdue p{num} y={y:.3f} : …{its[-1][-40:]} ‖ {texte[:40]}")
                its[-1] = its[-1] + " " + texte
    if pos < len(attendus):
        print("⚠ titres non retrouvés :", attendus[pos:pos + 3])
    for r in res:
        r["items"] = [("", nettoyer(i)) for i in r["items"]]
    return res


if __name__ == "__main__":
    nom = sys.argv[1]
    res = extraire(f"../{nom}_sciences_2026.ocr")
    tot = 0
    for r in res:
        tot += len(r["items"])
        print(f"\n[{' › '.join(r['chemin'])}] {r['niveau']} p{r['page']} ({len(r['items'])})")
        for _, t in r["items"]: print("   ", t)
    print("\nTOTAL", tot, len(res))
    json.dump(res, open(f"{nom}_sciences.json", "w"), ensure_ascii=False, indent=1)
