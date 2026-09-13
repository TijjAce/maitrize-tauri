# Référentiels des cycles 2 et 3

Les fichiers `src-tauri/referentiels/competences_cycle2.json` et `competences_cycle3.json`
sont produits par ces scripts à partir des programmes officiels en vigueur à la rentrée 2026.

| Discipline | Texte officiel | Ce qui est retenu |
|---|---|---|
| Français, mathématiques (C2) | BO n° 41 du 31 octobre 2024 | objectifs d’apprentissage par année |
| Français, mathématiques (C3) | BO n° 16 du 17 avril 2025 | objectifs d’apprentissage par année |
| Sciences et technologie | BO n° 24 du 11 juin 2026 | objectifs d’apprentissage par année |
| Histoire-géographie | BO n° 22 du 28 mai 2026 | attendus par thème |
| Éducation physique et sportive | BO n° 22 du 28 mai 2026 | objectifs d’apprentissage |
| Enseignement moral et civique | BO n° 24 du 13 juin 2024 | contenus d’enseignement par année |
| Enseignements artistiques | BO n° 31 du 30 juillet 2020 | compétences travaillées |
| Langues vivantes | BO n° 12 du 19 mars 2026 | rubriques par activité langagière |

Les nouveaux programmes d’EPS, d’histoire-géographie, de sciences et de langues entrent en
vigueur progressivement (CP et CM1 à la rentrée 2026) ; ils sont retenus pour tous les niveaux.

## Refaire l’extraction

1. Télécharger les PDF (liens sur éduscol, pages « Enseigner au cycle 2 / 3 »), puis
   `pdftotext -layout` et `pdftotext -bbox-layout` pour chacun.
2. Sciences 2026 : les premières versions publiées (juin 2026) sont des images, d’où l’OCR
   (`swift ocr.swift fichier.pdf`). Depuis le 10 juillet 2026, le ministère publie des versions texte
   (`annexe-1-programme-de-sciences-et-technologie-du-cycle-2-519020.pdf`, `…-cycle-3-519023.pdf`) :
   les prendre pour une nouvelle extraction.
3. Lancer les extractions (`voir.py`, `voir_listes.py`, `emc.py`, `sciences.py`, `c3_eps.py`,
   `arts.py`, `langues.py`), relire leur sortie, puis `assembler.py`.

## Contrôles

- `controle.py` : fuites de la colonne voisine, fins tronquées, objectifs anormalement longs.
- `verif_listes.py` (cycle 3) : aucun mot perdu ni ajouté dans les listes d’objectifs.
- `decoupe_geo.py` (cycle 3) : découpage des objectifs par la seule géométrie — deux lignes d’un
  même objectif sont espacées de ~12 points, deux objectifs de 14 à 15 — comparé à l’extraction.
- `ocr_zones.swift` + `comparer_ocr.py` (cycle 2) : la colonne des objectifs de chaque tableau est
  relue sur l’image de la page, puis comparée caractère par caractère ; le nombre de puces lues
  doit égaler le nombre d’objectifs.

Dernière vérification (septembre 2026) : cycle 2, 3 caractères d’écart sur 16 214 en français et
13 sur 13 536 en mathématiques, tous dus à la lecture de l’image (exposants, fractions en hauteur) ;
cycle 3, aucun mot manquant ni ajouté et découpage conforme dans tous les blocs.

Sciences, contrôle sur les versions texte (septembre 2026) : chaque objectif extrait par OCR a été
retrouvé mot pour mot dans le texte officiel (en tolérant l’entrelacement des deux colonnes), sauf un :
au CE1, deux objectifs lus d’un trait et tronqués. Corrigé à la main dans le JSON : `c2.ST.2.3.ce1.01`
(« S’impliquer dans une action de préservation de l’environnement proche de l’école. ») et
`c2.ST.2.3.ce1.03` ajouté (« Développer un rapport sensible à la nature. »), sans renuméroter les
autres pour ne pas casser les compétences déjà citées.

Les corrections manuelles sont listées dans `assembler.py` (`CORRECTIONS`).
