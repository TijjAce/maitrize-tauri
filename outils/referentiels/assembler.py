"""Assemble les référentiels des cycles 2 et 3 à partir des extractions relues."""
import json, re, unicodedata
from collections import OrderedDict

def charger(f):
    return json.load(open(f, encoding="utf-8"))

# ── Corrections explicites (constatées à la relecture, vérifiées sur le PDF) ──────────────
CORRECTIONS = {
    # Fractions écrites en hauteur dans le PDF, éparpillées par l'extraction.
    "Savoir interpréter, représenter, écrire et lire les 1 1 1 1 1 1 1 fractions,,,,, et. 2 3 4 5 6 8 10":
        "Savoir interpréter, représenter, écrire et lire les fractions 1/2, 1/3, 1/4, 1/5, 1/6, 1/8 et 1/10.",
    # Point égaré dans le texte officiel.
    "mise en mots avec vigilance. orthographique": "mise en mots avec vigilance orthographique",
    # Reconnaissance de caractères : ligne de la colonne voisine lue d'un trait.
    "d’agir, - L’élève décrit ses émotions lors de sa confrontation à la tant individuellement": "d’agir, tant individuellement",
    # Reconnaissance de caractères : dernière ligne sautée (lue sur l'image de la page).
    "et gazeux (ni forme propre ni": "et gazeux (ni forme propre ni volume propre).",
}
IGNORER = (re.compile(r"^Cette compétence se consolide"),)

def corriger(t):
    for a, b in CORRECTIONS.items():
        if a in t:
            t = t.replace(a, b)
    t = re.sub(r"\bEtats\b", "États", t)
    return t[:1].upper() + t[1:] if t else t

def titre_propre(t):
    t = corriger(t)
    # Durées de mise en œuvre retirées des titres de thèmes : « (deux périodes) », « (première période) ».
    t = re.sub(r"\s*\((?:[^()]*\bpériodes?\b[^()]*)\)\s*$", "", t)
    t = re.sub(r"\s*\((?:[^()]*\bpériodes?\b[^()]*)\)\s*$", "", t)
    return t.strip()

def slug(t, n=10):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", t)[:n]

class Ref:
    def __init__(self, cycle):
        self.cycle = cycle
        self.domaines = OrderedDict()

    def ajouter(self, dom_id, dom_titre, sd_titre, cg_titre, texte, niveau):
        texte = corriger(texte)
        if not texte or any(r.match(texte) for r in IGNORER):
            return
        d = self.domaines.setdefault(dom_id, {"titre": dom_titre, "sd": OrderedDict()})
        sd = d["sd"].setdefault(sd_titre, OrderedDict())
        cg = sd.setdefault(cg_titre, [])
        if not any(c["texte"] == texte and c["niveau"] == niveau for c in cg):
            cg.append({"texte": texte, "niveau": niveau})

    def json(self, titre, sources):
        doms = []
        for dom_id, d in self.domaines.items():
            sds = []
            for i, (sd_titre, cgs) in enumerate(d["sd"].items(), 1):
                sd_id = f"{dom_id}.SD{i}"
                liste = []
                for j, (cg_titre, comps) in enumerate(cgs.items(), 1):
                    cg_id = f"{sd_id}.CG{j}"
                    compteur = {}
                    cs = []
                    for c in comps:
                        cle = c["niveau"] or "cycle"
                        compteur[cle] = compteur.get(cle, 0) + 1
                        cid = f"c{self.cycle}.{dom_id}.{i}.{j}.{slug(cle, 6)}.{compteur[cle]:02d}"
                        cs.append({"id": cid, "texte": c["texte"], "niveau": c["niveau"]})
                    if cg_titre is None:
                        sd_comps = cs
                    else:
                        liste.append({"id": cg_id, "titre": cg_titre, "competences": cs})
                entree = {"id": sd_id, "titre": sd_titre}
                if liste:
                    entree["competencesGenerales"] = liste
                else:
                    entree["competences"] = sd_comps
                sds.append(entree)
            doms.append({"id": dom_id, "titre": d["titre"], "sousDomaines": sds})
        return {"cycle": self.cycle, "titre": titre, "version": "rentrée 2026", "sources": sources, "domaines": doms}


def avec_periode(periode, texte):
    if not periode:
        return texte
    p = periode[:1].lower() + periode[1:]
    return texte.rstrip() + f" ({p})"

ORDRE_NIV = {"CP": 1, "CE1": 2, "CE2": 3, "CM1": 4, "CM2": 5, "CM1-CM2": 6}

# ════════════════════════════════════ CYCLE 2 ════════════════════════════════════
c2 = Ref(2)
# Français — BO n° 41 du 31 octobre 2024
TITRES_FR = {"Enrichir son vocabulaire dans tous les enseignements": "Enrichir son vocabulaire dans toutes les disciplines",
             "Mémoriser l’orthographe lexicale": "Mémoriser l’orthographe des mots"}
for r in charger("c2_fr.json"):
    dom, rub = r["chemin"][0], TITRES_FR.get(r["chemin"][-1], r["chemin"][-1])
    for per, it in r["items"]:
        c2.ajouter("FR", "Français", dom, rub, avec_periode(per, it), r["niveau"])

# Mathématiques — BO n° 41 du 31 octobre 2024
for r in charger("c2_maths.json"):
    ch = r["chemin"]
    dom = ch[0]
    if len(ch) >= 4:
        parent, sous = ch[2], ch[3]
        cg = sous if "longueurs" in parent.lower() else f"{parent} : {sous[:1].lower() + sous[1:]}"
    elif len(ch) == 3:
        cg = ch[2]
    else:
        cg = dom
    for per, it in r["items"]:
        c2.ajouter("MA", "Mathématiques", dom, cg, avec_periode(per, it), r["niveau"])

# Sciences et technologie — BO n° 24 du 11 juin 2026
for r in charger("c2_sciences.json"):
    ch = [titre_propre(x) for x in r["chemin"]]
    dom = ch[0]
    cg = ch[3] if len(ch) >= 4 else (ch[2] if len(ch) >= 3 else dom)
    for _, it in r["items"]:
        c2.ajouter("ST", "Sciences et technologie", dom, cg, it, r["niveau"])

# Histoire-géographie — BO n° 22 du 28 mai 2026 (attendus)
for r in charger("c2_hg.json"):
    ch = [titre_propre(x) for x in r["chemin"]]
    for _, it in r["items"]:
        c2.ajouter("HG", "Histoire-géographie", ch[0], ch[2], it, r["niveau"])

# Enseignement moral et civique — BO n° 24 du 13 juin 2024 (contenus d’enseignement)
for r in charger("emc.json"):
    if r["niveau"] not in ("CP", "CE1", "CE2"):
        continue
    niv, theme = r["chemin"][0].split(" : ", 1)
    for _, it in r["items"]:
        c2.ajouter("EMC", "Enseignement moral et civique", f"{niv} : {theme}", r["chemin"][1], it, r["niveau"])

# Éducation physique et sportive — BO n° 22 du 28 mai 2026
for r in charger("c2_eps.json"):
    for _, it in r["items"]:
        c2.ajouter("EPS", "Éducation physique et sportive", r["chemin"][0], r["chemin"][2], it, r["niveau"])

# Enseignements artistiques — BO n° 31 du 30 juillet 2020 (compétences travaillées)
arts = charger("arts.json")
for cle, sd in (("c2_ap", "Arts plastiques"), ("c2_em", "Éducation musicale")):
    for c in arts[cle]:
        for it in c["items"]:
            c2.ajouter("EA", "Enseignements artistiques", sd, c["titre"], it, "")

# Langues vivantes étrangères et régionales — BO n° 12 du 19 mars 2026 (rubriques par activité langagière)
langues = charger("langues.json")
for a in langues["c2"]:
    for rub in a["rubriques"]:
        c2.ajouter("LVE", "Langues vivantes étrangères et régionales", f"{a['titre']} ({a['code']})", None,
                   rub["titre"], "-".join([rub["niveaux"][0], rub["niveaux"][-1]]) if len(rub["niveaux"]) > 1 else rub["niveaux"][0])

SOURCES_C2 = [
    {"discipline": "Français", "reference": "Arrêté du 22 octobre 2024, BO n° 41 du 31 octobre 2024", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Mathématiques", "reference": "Arrêté du 22 octobre 2024, BO n° 41 du 31 octobre 2024", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Sciences et technologie", "reference": "BO n° 24 du 11 juin 2026 (en vigueur au CP à la rentrée 2026, puis progressivement)", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Histoire-géographie", "reference": "BO n° 22 du 28 mai 2026 (en vigueur au CP à la rentrée 2026, puis progressivement)", "retenu": "attendus (connaissances et compétences) par thème"},
    {"discipline": "Enseignement moral et civique", "reference": "Arrêté du 17 juin 2024, BO n° 24 du 13 juin 2024", "retenu": "contenus d’enseignement par année"},
    {"discipline": "Éducation physique et sportive", "reference": "BO n° 22 du 28 mai 2026 (en vigueur au CP à la rentrée 2026, puis progressivement)", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Enseignements artistiques", "reference": "BO n° 31 du 30 juillet 2020", "retenu": "compétences travaillées du cycle"},
    {"discipline": "Langues vivantes étrangères et régionales", "reference": "BO n° 12 du 19 mars 2026 (en vigueur au CP à la rentrée 2026, puis progressivement)", "retenu": "rubriques de chaque activité langagière, avec leurs niveaux"},
]

# ════════════════════════════════════ CYCLE 3 ════════════════════════════════════
c3 = Ref(3)
for r in charger("c3_fr.json"):
    ch = r["chemin"]
    dom = ch[0]
    cg = ch[-1] if len(ch) >= 2 else dom
    if len(ch) >= 3:
        cg = f"{ch[1]} : {ch[2][:1].lower() + ch[2][1:]}"
    for _, it in r["items"]:
        c3.ajouter("FR", "Français", dom, cg, it, r["niveau"])

for r in charger("c3_maths.json"):
    ch = r["chemin"]
    dom = ch[0]
    if len(ch) >= 3:
        cg = f"{ch[1]} : {ch[2][:1].lower() + ch[2][1:]}"
    elif len(ch) == 2:
        cg = ch[1]
    else:
        cg = dom
    for _, it in r["items"]:
        c3.ajouter("MA", "Mathématiques", dom, cg, it, r["niveau"])

for r in charger("c3_sciences.json"):
    ch = [titre_propre(x) for x in r["chemin"]]
    dom = ch[0]
    if len(ch) >= 4:
        cg = f"{ch[2]} : {ch[3][:1].lower() + ch[3][1:]}"
    else:
        cg = ch[2] if len(ch) >= 3 else dom
    for _, it in r["items"]:
        c3.ajouter("ST", "Sciences et technologie", dom, cg, it, r["niveau"])

for r in charger("c3_hg.json"):
    if r["niveau"] not in ("CM1", "CM2"):
        continue
    ch = [titre_propre(x) for x in r["chemin"]]
    for _, it in r["items"]:
        c3.ajouter("HG", "Histoire-géographie", ch[0], ch[2], it, r["niveau"])

for r in charger("emc.json"):
    if r["niveau"] not in ("CM1", "CM2"):
        continue
    niv, theme = r["chemin"][0].split(" : ", 1)
    for _, it in r["items"]:
        c3.ajouter("EMC", "Enseignement moral et civique", f"{niv} : {theme}", r["chemin"][1], it, r["niveau"])

for r in charger("c3_eps.json"):
    for _, it in r["items"]:
        c3.ajouter("EPS", "Éducation physique et sportive", r["chemin"][0], r["chemin"][1], it, "CM1-CM2")

for cle, sd in (("c3_ap", "Arts plastiques"), ("c3_em", "Éducation musicale"), ("c3_hda", "Histoire des arts")):
    for c in arts[cle]:
        for it in c["items"]:
            c3.ajouter("EA", "Enseignements artistiques", sd, c["titre"], it, "")

for a in langues["c3"]:
    for rub in a["rubriques"]:
        c3.ajouter("LVE", "Langues vivantes étrangères et régionales", f"{a['titre']} ({a['code']})", None,
                   rub["titre"], "-".join([rub["niveaux"][0], rub["niveaux"][-1]]) if len(rub["niveaux"]) > 1 else rub["niveaux"][0])

SOURCES_C3 = [
    {"discipline": "Français", "reference": "Arrêté du 10 avril 2025, BO n° 16 du 17 avril 2025 (CM2 à la rentrée 2026)", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Mathématiques", "reference": "Arrêté du 10 avril 2025, BO n° 16 du 17 avril 2025 (CM2 à la rentrée 2026)", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Sciences et technologie", "reference": "BO n° 24 du 11 juin 2026 (en vigueur au CM1 à la rentrée 2026, puis au CM2)", "retenu": "objectifs d’apprentissage par année"},
    {"discipline": "Histoire-géographie", "reference": "BO n° 22 du 28 mai 2026 (en vigueur au CM1 à la rentrée 2026, puis au CM2)", "retenu": "attendus (connaissances et compétences) par thème"},
    {"discipline": "Enseignement moral et civique", "reference": "Arrêté du 17 juin 2024, BO n° 24 du 13 juin 2024", "retenu": "contenus d’enseignement par année"},
    {"discipline": "Éducation physique et sportive", "reference": "BO n° 22 du 28 mai 2026 (cours moyen ; en vigueur au CM1 à la rentrée 2026)", "retenu": "objectifs d’apprentissage du cours moyen"},
    {"discipline": "Enseignements artistiques", "reference": "BO n° 31 du 30 juillet 2020", "retenu": "compétences travaillées du cycle"},
    {"discipline": "Langues vivantes étrangères et régionales", "reference": "BO n° 12 du 19 mars 2026 (cours moyen ; en vigueur au CM1 à la rentrée 2026)", "retenu": "rubriques de chaque activité langagière, avec leurs niveaux"},
]

if __name__ == "__main__":
    for ref, titre, sources, nom in ((c2, "Cycle 2 – CP, CE1, CE2 (programmes en vigueur à la rentrée 2026)", SOURCES_C2, "competences_cycle2.json"),
                                     (c3, "Cycle 3 – CM1, CM2 (programmes en vigueur à la rentrée 2026)", SOURCES_C3, "competences_cycle3.json")):
        data = ref.json(titre, sources)
        json.dump(data, open(nom, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        total = 0
        print("\n=====", titre)
        for d in data["domaines"]:
            n = sum(len(cg["competences"]) for sd in d["sousDomaines"] for cg in sd.get("competencesGenerales", [])) + \
                sum(len(sd.get("competences", [])) for sd in d["sousDomaines"])
            total += n
            print(f"  {d['id']:4} {d['titre']:45} {len(d['sousDomaines']):3} sous-domaines  {n:4} compétences")
        ids = [c["id"] for d in data["domaines"] for sd in d["sousDomaines"] for cg in sd.get("competencesGenerales", []) for c in cg["competences"]] + \
              [c["id"] for d in data["domaines"] for sd in d["sousDomaines"] for c in sd.get("competences", [])]
        print("  TOTAL", total, "| identifiants uniques :", len(set(ids)) == len(ids))
