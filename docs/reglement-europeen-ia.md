# Maîtrize et le règlement européen sur l'IA

*2 novembre 2026 — analyse de l'éditeur pour la version 1.6.41, à faire vérifier par un juriste. Ce n'est pas un avis juridique.*

Le règlement (UE) 2024/1689 sur l'intelligence artificielle (« RIA ») classe certains usages de l'IA dans l'éducation parmi les systèmes « à haut risque ». Cette note dit ce que fait l'IA dans Maîtrize, comment la lire au regard du règlement, et ce qui reste à trancher.

## Ce que fait l'IA dans Maîtrize

L'IA de Maîtrize est celle de Mistral AI, appelée depuis l'ordinateur de l'enseignant avec sa propre clé : l'éditeur ne voit passer aucune donnée. Maîtrize n'est pas un modèle d'IA à usage général ; elle se sert de ceux de Mistral, à qui reviennent les obligations de ces modèles.

Les usages, tous facultatifs :

- **préparer la classe** : l'assistant, les séquences, les feuilles et les générateurs de feuilles, les ateliers de langage, la règle d'un jeu, un picto dessiné, le documentaliste des programmes ;
- **écrire** : corriger ou reformuler un texte, un bilan de PPI compris ; le compte rendu d'une réunion ; les points « À savoir » de la feuille du remplaçant ;
- **la synthèse d'un élève**, par l'agent de synthèse : il lit ce que l'enseignant a écrit sur l'élève — dossier, observations, cahier journal, évaluations, plans, PPI, GEVA-Sco, réunions — et en rédige un premier jet, domaine par domaine ;
- **la voix** : la transcription en ligne (Voxtral), si l'enseignant la choisit plutôt que celle de l'ordinateur ; la lecture des consignes à voix haute sur les tablettes ; la télécommande du tableau.

Les garde-fous, tels que l'application les applique :

- les noms des élèves et des personnes que l'application connaît sont remplacés par des marqueurs avant tout envoi de texte, et remis à leur place sur l'ordinateur (`src/confidentialite.ts`) ;
- l'agent de synthèse ne lit ni la santé (PAI, observations de santé, prises en charge), ni les coordonnées, ni la famille, ni l'orientation, ni les papiers scannés (`src/agentSynthese.ts`) ;
- **l'IA ne pose ni note, ni niveau d'acquisition, ni appréciation** : les évaluations sont celles que l'enseignant saisit. Ce qu'elle rédige est un premier jet, que l'enseignant relit et corrige ; les conditions d'utilisation le disent (article 6), et une synthèse rédigée par l'agent reste marquée « ✨ Rédigée par l'IA · à relire » jusqu'à ce que l'enseignant la marque relue (`parLIA`, `src/synthese.ts`).

## Au regard du règlement

**Hors du haut risque, pour presque tout.** Préparer la classe, écrire, transcrire : rien de cela n'« évalue les acquis d'apprentissage » au sens de l'annexe III, point 3 b), ni ne décide de l'accès, de l'orientation ou de la surveillance des élèves (points 3 a), c) et d)).

**L'agent de synthèse, à surveiller.** Il rédige un texte sur les progrès d'un élève, à partir des évaluations et des observations de l'enseignant ; il ne fixe aucun niveau.

- *Pour l'exclure du haut risque* (article 6, paragraphe 3) : c'est une tâche préparatoire ; il améliore le résultat d'une activité humaine déjà faite, les évaluations de l'enseignant ; et l'enseignant relit tout.
- *La limite* : le même paragraphe précise qu'un système de l'annexe III qui effectue un **profilage** de personnes physiques est toujours à haut risque. Une synthèse rédigée par l'IA à partir de tout ce qui est écrit sur un élève pourrait être lue comme un profilage, au sens de l'article 4, paragraphe 4, du RGPD. C'est la question à faire trancher.

**Le logiciel libre.** L'article 2, paragraphe 12, écarte du règlement les systèmes publiés sous licence libre — Maîtrize l'est, sous AGPL-3.0 —, sauf s'ils sont mis sur le marché comme systèmes à haut risque, ou relèvent des articles 5 (pratiques interdites) ou 50 (transparence). L'exclusion tient donc tant que l'agent n'est pas à haut risque ; les obligations de transparence de l'article 50, elles, s'appliquent quand même : à vérifier pour le texte que l'IA rédige.

**Le calendrier.** Les obligations des systèmes à haut risque de l'annexe III, prévues pour le 2 août 2026, ont été reportées au 2 décembre 2027 par le règlement « omnibus numérique » (vote du Parlement le 16 juin 2026, accord du Conseil fin juin ; règlement (UE) 2026/1744 selon des sources secondaires, à vérifier au Journal officiel).

## Ce qui est fait, ce qui reste

Fait :

- les garde-fous ci-dessus ;
- la politique de confidentialité du site dit chaque envoi à Mistral, et ce que l'IA ne fait pas ;
- cette note, qui consigne l'analyse (l'article 6, paragraphe 4, demande de documenter l'évaluation quand on écarte le haut risque).

À faire, avant le 2 décembre 2027 :

1. faire trancher par un juriste la question du profilage pour l'agent de synthèse, et celle de l'enregistrement prévu par l'article 49, paragraphe 2, pour un logiciel libre et gratuit ;
2. si l'agent devait être à haut risque : le limiter à reformuler ce que l'enseignant a écrit, sans lire tout le dossier, le désactiver par défaut, ou le retirer — les obligations d'un système à haut risque ne sont pas à la portée d'un logiciel gratuit maintenu par une personne ;
3. vérifier ce que l'article 50 demande pour le texte rédigé par l'IA.

## Sources

- Règlement (UE) 2024/1689, sur EUR-Lex : <https://eur-lex.europa.eu/eli/reg/2024/1689/oj>
- Le report des obligations de l'annexe III (sources secondaires) : <https://www.iubenda.com/en/blog/ai-omnibus-parliament-adoption-june-2026>, <https://www.euaiact.com/digital-omnibus-ai>, <https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-high-risk-deadline-omnibus-20260/>
- L'exception de l'article 6, paragraphe 3, et le profilage (commentaire) : <https://www.casrai.org/dictionary/term/eu-ai-act-article-6-high-risk-classification-rules>
