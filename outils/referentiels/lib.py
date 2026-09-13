"""Outils d'extraction des programmes officiels (PDF → lignes → tableaux → items)."""
import html, re, unicodedata
from dataclasses import dataclass

MOT = re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>')
PAGE = re.compile(r'<page width="([\d.]+)" height="([\d.]+)">')
PUCES = ("-", "−", "–", "—", "\uf02d")
SOUS_PUCES = ("\uf0b7", "\uf09f", "•", "○", "◯", "◦", "▪", "\uf0a7")


@dataclass
class Mot:
    x0: float; y0: float; x1: float; y1: float; t: str


@dataclass
class Ligne:
    page: int
    mots: list
    hauteur_page: float
    largeur_page: float

    @property
    def y(self): return min(m.y0 for m in self.mots)
    @property
    def x0(self): return self.mots[0].x0
    @property
    def x1(self): return max(m.x1 for m in self.mots)
    @property
    def texte(self): return norm(" ".join(m.t for m in self.mots))

    def plus_grand_ecart(self):
        return max((b.x0 - a.x1 for a, b in zip(self.mots, self.mots[1:])), default=0)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFC", s).replace("'", "’").replace(" ", " ")
    return re.sub(r"\s+", " ", s).strip()


def lire(fichier, marge_haut=0, marge_bas=0):
    """Lignes visuelles d'un PDF, dans l'ordre de lecture page par page."""
    src = open(fichier, encoding="utf-8").read()
    lignes = []
    morceaux = re.split(r"(?=<page width)", src)[1:]
    for num, p in enumerate(morceaux, 1):
        l, h = map(float, PAGE.match(p).groups())
        mots = [Mot(float(a), float(b), float(c), float(d), html.unescape(e)) for a, b, c, d, e in MOT.findall(p)]
        mots = [m for m in mots if m.y0 >= marge_haut and m.y1 <= h - marge_bas]
        mots.sort(key=lambda m: (m.y0 + m.y1) / 2)
        groupe, centre = [], None
        for m in mots:
            c = (m.y0 + m.y1) / 2
            if groupe and abs(c - centre) > 3.2:
                lignes.append(Ligne(num, sorted(groupe, key=lambda w: w.x0), h, l))
                groupe = []
            if not groupe:
                centre = c
            groupe.append(m)
        if groupe:
            lignes.append(Ligne(num, sorted(groupe, key=lambda w: w.x0), h, l))
    return lignes


def gouttieres(lignes, n_colonnes, ecart_min=3.0, reperes=None, tolerance=30):
    """Frontières entre colonnes : les bandes verticales qu'aucun mot ne traverse.

    `reperes` : abscisses attendues des colonnes 2, 3… (souvent le début de leur en-tête). Parmi les
    trous, on retient le plus proche de chaque repère ; à défaut de trou, le repère lui-même."""
    intervalles = sorted((m.x0, m.x1) for li in lignes for m in li.mots)
    trous = []
    if intervalles:
        fusion = [list(intervalles[0])]
        for a, b in intervalles[1:]:
            if a <= fusion[-1][1] + 0.5:
                fusion[-1][1] = max(fusion[-1][1], b)
            else:
                fusion.append([a, b])
        trous = [(fusion[i + 1][0] - fusion[i][1], fusion[i][1], fusion[i + 1][0])
                 for i in range(len(fusion) - 1) if fusion[i + 1][0] - fusion[i][1] >= ecart_min]
    if reperes:
        sortie = []
        for r in reperes:
            proches = [(abs(fin - r), (debut + fin) / 2) for _, debut, fin in trous if abs(fin - r) <= tolerance]
            sortie.append(min(proches)[1] if proches else r - 2)
        return sorted(sortie)
    trous.sort(reverse=True)
    return sorted((d + f) / 2 for _, d, f in trous[: n_colonnes - 1])


def colonnes(lignes, frontieres, tolerance=3.2):
    """Répartit les mots entre colonnes, puis reforme les lignes colonne par colonne.

    Couper d'abord et regrouper ensuite : deux colonnes décalées de deux points ne doivent jamais
    s'entremêler, ce qui arrive si l'on forme les lignes sur toute la largeur."""
    cols = [[] for _ in range(len(frontieres) + 1)]
    mots_par_col = [[] for _ in cols]
    for li in lignes:
        for m in li.mots:
            i = sum(1 for f in frontieres if m.x0 > f)
            mots_par_col[i].append((li.page, li.hauteur_page, li.largeur_page, m))
    for i, mots in enumerate(mots_par_col):
        mots.sort(key=lambda e: (e[0], (e[3].y0 + e[3].y1) / 2))
        groupe, centre, page = [], None, None
        for pg, h, l, m in mots:
            c = (m.y0 + m.y1) / 2
            if groupe and (pg != page or abs(c - centre) > tolerance):
                cols[i].append(Ligne(page, sorted(groupe, key=lambda w: w.x0), h, l)); groupe = []
            if not groupe:
                centre, page = c, pg
            groupe.append(m)
        if groupe:
            cols[i].append(Ligne(page, sorted(groupe, key=lambda w: w.x0), h, l))
    return cols


LIBELLE_PERIODE = re.compile(
    r"^(En fin de période|En début de période|En milieu d’année|En fin d’année|En cours d’année|Dès |"
    r"Tout au long de l’année|Au plus tard|À partir de|À l’issue d|À la fin d|Jusqu’à la fin|En période|Durant l|Pendant l|Au cours d)", re.I)


def items(lignes_col, puces_obligatoires=True, sous_puces_nouvelles=False, seules_puces_separent=False):
    """Items d'une colonne : une puce ouvre un item, les lignes suivantes le prolongent.

    Rend une liste de (libellé de période ou "", texte)."""
    sortie, courant, periode = [], None, ""
    precedente = None
    for li in lignes_col:
        t = li.texte
        if not t:
            continue
        # Liste sans puces : un blanc vertical plus grand qu'un interligne sépare deux items.
        saut = (precedente is not None and precedente.page == li.page and li.y - precedente.y > 19)
        precedente = li
        puce = t[0] in PUCES and (len(t) == 1 or t[1] == " ")
        sous_puce = t[0] in SOUS_PUCES
        if sous_puce and sous_puces_nouvelles:
            puce, sous_puce = True, False
        if sous_puce and courant is not None:
            courant = courant.rstrip() + (" " if courant.rstrip().endswith((":", ";", ",")) else " ; ") + t[1:].strip()
            continue
        if puce:
            if courant is not None:
                sortie.append((periode, courant))
            courant = t[1:].strip()
        elif LIBELLE_PERIODE.match(t) and not t.endswith(".") and len(t) < 45:
            if courant is not None:
                sortie.append((periode, courant))
                courant = None
            periode = re.sub(r"(\d) e ", r"\1e ", t.rstrip(" :"))
        elif courant is None:
            if puces_obligatoires:
                continue  # texte hors item (titre de colonne résiduel)
            courant = t
        else:
            # Sans puce : prolongement, sauf liste sans puces (majuscule après un point).
            if not puces_obligatoires and not seules_puces_separent and t[:1].isupper() and (courant.endswith((".", ";")) or saut):
                sortie.append((periode, courant)); courant = t
            else:
                courant = recoller(courant, t)
    if courant is not None:
        sortie.append((periode, courant))
    return [(p, nettoyer(c)) for p, c in sortie if nettoyer(c)]


def recoller(a, b):
    # Césure en fin de ligne : « grapho- phonémiques » garde le trait, « trente- quatre » aussi ;
    # on ne supprime jamais le trait, on retire seulement l'espace.
    if a.endswith("-") and b[:1].islower():
        return a + b
    return a + " " + b


def nettoyer(s):
    s = norm(s)
    # Exposants détachés par l'extraction : « 3 e groupe », « XIX e siècle », « 1 er ».
    s = re.sub(r"\b(\d+|[IVXLC]+) (e|er|re|ers|res|ème)\b", r"\1\2", s)
    s = re.sub(r"\s+([,.;:!?)])", lambda m: m.group(1) if m.group(1) in ",.)" else " " + m.group(1), s)
    return s.strip(" ;")
