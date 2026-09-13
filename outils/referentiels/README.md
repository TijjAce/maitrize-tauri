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
2. Les programmes de sciences 2026 n’ont pas de texte extractible : `swift ocr.swift fichier.pdf`.
3. Lancer les extractions (`voir.py`, `voir_listes.py`, `emc.py`, `sciences.py`, `c3_eps.py`,
   `arts.py`, `langues.py`), relire leur sortie, puis `assembler.py`.

Contrôles : `controle.py` (fuites de colonne, fins tronquées) et `verif_listes.py` (aucun mot
perdu ni ajouté). Les corrections manuelles sont listées dans `assembler.py` (`CORRECTIONS`).
