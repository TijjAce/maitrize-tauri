// Ce qui a changé, version par version.
//
// L'app se met à jour toute seule : rien ne dit ce qui a bougé, et les
// nouveautés se découvrent par hasard — ou jamais. Cette liste est lue à la
// première ouverture qui suit une mise à jour, puis reste consultable.
//
// Une entrée se lit en classe, entre deux ateliers : des phrases courtes, et
// l'endroit où trouver la chose. Ce qui ne se voit pas — un correctif de
// synchronisation, par exemple — se dit quand même, en une ligne, parce que
// c'est ce qui explique qu'un travail perdu ne se reperde plus.

export interface Nouveaute {
  version: string;
  /** Ce que la version apporte, en une phrase. */
  titre: string;
  points: { quoi: string; ou?: string }[];
}

export const NOUVEAUTES: Nouveaute[] = [
  {
    version: "1.6.15",
    titre: "Les réunions s'écrivent au fil de l'eau",
    points: [
      { quoi: "Le partage vers le téléphone ne se lance plus que depuis les Réglages : le bouton « 📱 Téléphone » quitte le planning. Un seul endroit où l'ouvrir, un seul où le fermer — et c'est là qu'arrivent les vocaux dictés en classe.", ou: "Réglages · Partage WiFi" },
      { quoi: "Un onglet « 🎙 Dicter » sur le téléphone : un gros bouton, on dit ce qu'on vient de voir, on termine. L'enregistrement reste dans le téléphone tant que l'ordinateur n'est pas joignable — il part tout seul au retour, et ce qui n'est pas passé reste en attente plutôt que de disparaître.", ou: "Réglages · Partage WiFi · 🎙 Dicter" },
      { quoi: "Les vocaux dictés depuis le téléphone arrivent dans Réglages · Partage WiFi, à l'endroit même par où ils passent. L'ordinateur les transcrit avec Whisper, sur place, et retrouve le créneau à l'heure : un vocal de 10 h 12 se range sous la numération de 10 h. Dicté en sortant de la salle, il rejoint le créneau qui vient de finir — au-delà d'une demi-heure, on ne devine plus, c'est vous qui choisissez.", ou: "Réglages · Partage WiFi" },
      { quoi: "Rien ne s'écrit tout seul dans un bilan : le texte s'affiche, se corrige, et c'est « ↓ Verser dans le bilan » qui l'y met — à la suite de ce que vous aviez déjà écrit, jamais à la place. Le téléphone, lui, ne connaît ni vos élèves ni votre planning : il n'envoie que du son et une heure.", ou: "Réglages · Partage WiFi" },
      { quoi: "Un onglet « 🌱 Projets » : quatre-vingt-dix projets de classe tout prêts, par thème — vivre ensemble, langage, nombres et monnaie, sciences, arts, corps, autonomie, sorties, fêtes. Chacun dit en une phrase de quoi il s'agit, ce qu'il travaille, et ses quatre étapes.", ou: "Projets" },
      { quoi: "L'année tient en haut de l'écran, en deux lignes de cinq mois. Vous cochez des projets dans le catalogue, et chaque mois tend la main : « ＋ ici ». Un mois s'ouvre sur ses semaines, pour poser un projet sur la semaine du 11 plutôt que sur janvier en entier.", ou: "Projets" },
      { quoi: "Une fois posé, un projet se coche étape par étape et son état suit tout seul : à faire, en cours, terminé. Il se déplace d'un mois à l'autre au clic droit, et rien n'empêche d'en écrire un de zéro.", ou: "Projets" },
      { quoi: "La recherche fouille aussi les domaines : « monnaie » remonte le marché de Noël, la marchande et la kermesse, qui ne portent pas le mot dans leur titre.", ou: "Projets" },
      { quoi: "Hors réseau, la synchronisation ne s'obstine plus : une seule question au stockage avant chaque passage, au lieu d'une douzaine d'appels qui échouaient chacun après quatre secondes — le passage durait une minute entière et le suivant repartait aussitôt. Et l'attente double à chaque échec, jusqu'à cinq minutes, puis repart à zéro dès que le réseau revient.", ou: "Réglages · Données & synchro" },
      { quoi: "L'écran d'une réunion se réduit à un encadré, au milieu, et à deux boutons : Pause et Terminer. La liste, les réglages, les avertissements et les boutons d'IA ont disparu de là — pendant une réunion on écoute, on ne règle pas.", ou: "Réunions" },
      { quoi: "Le choix « rien ne sort d'ici » ou « avec l'IA en ligne » se fait maintenant sur la fiche, avant de commencer, avec ce que chacun implique écrit juste dessous. Une fois lancé, c'est lancé.", ou: "Réunions · nouvelle réunion" },
      { quoi: "Surlignez un passage mal dicté et « ✨ Reformuler » le réécrit — seul ce passage part à l'IA, pas le compte rendu. Et la parole continue de s'écrire pendant ce temps : le passage est retrouvé à son contenu, pas à sa place, qui aura bougé quand la réponse arrive.", ou: "Réunions" },
      { quoi: "La frappe suit désormais les images de l'écran et non un minuteur : les caractères apparaissent régulièrement au lieu d'avancer par à-coups, et l'encadré reste collé au bas du texte tant que vous n'êtes pas remonté lire plus haut.", ou: "Réunions" },
      { quoi: "Le journal d'incidents ne crie plus au loup : il comptait comme « gel » le ralentissement que macOS applique de lui-même aux fenêtres passées derrière une autre. Sur cent vingt alertes relevées, presque toutes venaient de là. Un blocage ne se note plus que si la fenêtre était devant — sinon rien ne bloquait, et personne ne regardait.", ou: "Réglages · Données & synchro · 🩺 Journal d'incidents" },
      { quoi: "Sans réseau, la synchronisation abandonne plus vite : quatre secondes pour établir la connexion et une seule reprise, au lieu de trois essais qui pouvaient occuper dix-huit secondes. Un envoi de photos en cours, lui, a toujours le droit d'être long.", ou: "Réglages · Données & synchro" },
      { quoi: "Une réunion sans réseau ne se perd plus en silence : l'application le voit, le dit une fois, et cesse d'essayer. Le 24 septembre, une ESS avait produit trente et un échecs en six minutes — chaque passage repartait chez Mistral, attendait quarante-cinq secondes et échouait, sans qu'aucun mot ne s'écrive ni qu'on sache pourquoi.", ou: "Réunions" },
      { quoi: "Les réunions se transcrivent sur votre ordinateur, sans rien installer : le moteur est désormais dans l'application. Il ne reste qu'un modèle à télécharger depuis les Réglages — une fois, avec du réseau — et les réunions suivantes s'écrivent sans réseau du tout. L'audio n'est même pas posé sur le disque.", ou: "Réglages · IA · Transcription des réunions" },
      { quoi: "Trois modèles au choix : « tiny » (154 Mo) pour la vitesse, « base » (293 Mo) qui suit la parole sans effort, « small » (970 Mo) pour la justesse. Mesuré sur un portable : huit secondes de parole écrites en deux secondes avec « base » — quatre fois plus vite que la parole, sans carte graphique.", ou: "Réglages · IA · Transcription des réunions" },
      { quoi: "Trois positions remplacent la case « Relecture » : « Rien en ligne », « Ranger », « Ranger + relire ». La case promettait que rien ne sortait, alors que le rangement partait chez Mistral toutes les deux phrases — maintenant c'est vrai. Qui avait décoché la case retrouve « Ranger », son compte rendu inchangé.", ou: "Réunions" },
      { quoi: "Changer de moteur de transcription dans les Réglages prend effet tout de suite : l'onglet Réunions reste ouvert en coulisses, et il gardait le réglage du démarrage de l'application. Passer en local n'avait alors aucun effet avant de tout refermer.", ou: "Réunions" },
      { quoi: "⌘F dans la visionneuse du coffre-fort : on cherche un mot dans tout le document, les passages trouvés se surlignent, et ↵ mène de l'un à l'autre — « 3 sur 12 » dit où l'on en est. Les accents et la casse ne comptent pas, et une expression coupée en deux par la mise en page se trouve quand même.", ou: "Ressources · Coffre-fort · 🔍 Chercher" },
      { quoi: "Les PDF du coffre s'affichaient dans un cadre du système, muet : pas de recherche, et un guide de cent pages se parcourait à la molette. Ils sont maintenant dessinés par l'application, page après page — seules celles qu'on approche se dessinent, pour que l'ouverture reste immédiate.", ou: "Ressources · Coffre-fort" },
      { quoi: "Des rubans en haut de ⌘K disent ce qu'on cherche : Actions, Pages, Dossiers, Coffre-fort, Jeux, Bureau. Un clic restreint la liste, ⇥ passe de l'un à l'autre, et seuls les rubans qui ont vraiment des résultats s'affichent. « Jeux » réunit les jeux rangés sur le bureau et les fabriques — on cherche un loto sans se demander s'il existe déjà.", ou: "⌘K" },
      { quoi: "Le cahier journal ne remonte plus dans ⌘K : il se tient par jour, et comme chaque bilan cite tout ce qui s'est fait, une recherche en ramenait dix avant le reste. Les jours s'ouvrent depuis le tableau de bord et le planning.", ou: "⌘K" },
      { quoi: "Un dossier se cherche par son nom, et non plus par le chemin de ses parents : « voca » remontait « Enrichir son vocabulaire » et ses six enfants, qui ne s'appellent pas comme ça. Au passage, un nom long ne se fait plus écraser par le chemin affiché à côté — c'est le chemin qui cède la place.", ou: "⌘K" },
      { quoi: "La liste ne s'emballe plus quand la souris la survole : elle défilait, le survol changeait la sélection, ce qui la refaisait défiler. Le survol ne compte désormais que si la souris a bougé pour de bon.", ou: "⌘K" },
      { quoi: "Une ligne périmée restait collée en tête des résultats — « Progressions par élève » s'affichait pour n'importe quelle recherche. Deux entrées portaient le même identifiant interne.", ou: "⌘K" },
      { quoi: "Ce que la recherche trouve au milieu d'un bilan, d'un texte ou d'une synthèse ne se perd plus en chemin : la palette ne regardait que les titres et jetait le reste. Ces résultats-là se rangent en fin de liste, mais ils s'affichent.", ou: "⌘K" },
      { quoi: "Les PDF du coffre-fort se retrouvent depuis ⌘K : tapez deux mots du titre — « cycle 2 », « référentiel maths » — et le document s'ouvre, au lieu de passer par Ressources, puis Coffre-fort, puis la liste. Les accents, les tirets et les soulignés des noms de fichiers ne gênent pas, et « coffre » ou « pdf » les liste tous.", ou: "⌘K" },
      { quoi: "Un mode « 👧 Par élève » dans la programmation, pour l'IME : elle part des élèves, et non des matières. Dix à quinze objectifs par élève sur l'année, avec le compte affiché à côté de chaque prénom — c'est là qu'on se trompe, trois à l'un et vingt à l'autre. Un objectif vise un élève, un groupe, ou les deux ; les périodes se cochent d'un clic, et un second clic marque l'objectif atteint.", ou: "Organisation · Programmation" },
      { quoi: "Les groupes évitent la recopie : « demander de l'aide » se travaille avec quatre élèves, on l'écrit une fois. Supprimer un groupe ne vide pas l'année pour autant — ses objectifs restent, attribués élève par élève.", ou: "Organisation · Programmation · 👥 Groupes" },
      { quoi: "Elle s'imprime élève par élève : un tableau par enfant, une ligne par objectif, cinq colonnes de périodes — • programmé, ✔ atteint. De quoi la poser sur la table d'une ESS.", ou: "Organisation · Programmation · 🖨" },
      { quoi: "Le tableau de bord s'allège : les jours de la semaine mènent déjà au cahier journal et disent combien de bilans restent à écrire. Le bouton et le rappel qui doublaient cette ligne ont disparu.", ou: "Tableau de bord" },
      { quoi: "Les séances d'une séquence se réordonnent en les faisant glisser : prenez une séance, posez-la où elle doit être, et les numéros suivent. Deux flèches ⬆⬇ font la même chose au clavier, à côté de « Voir » — jusqu'ici il fallait deviner le clic droit.", ou: "Séquence · liste des séances" },
      { quoi: "⌘K trouve enfin sans les accents : taper « eleves » ou « synthese » remonte « Élèves » et « Synthèse GS ». Le filtre comparait des libellés accentués à ce qu'on tape — il n'a jamais rien trouvé de ce côté-là.", ou: "⌘K" },
      { quoi: "⌘K s'ouvre sur ce que vous faites, et non plus sur un catalogue de cinquante lignes : vos dernières commandes, puis le planning du jour, la préparation de demain et la nouvelle séquence. Les résultats sont classés par pertinence — le titre exact d'une séquence passe devant une action qui contient vaguement le mot — et la ligne sélectionnée reste visible au clavier.", ou: "⌘K" },
      { quoi: "Depuis ⌘K, une séquence, un jeu, du matériel, un texte ou un atelier vous emmène à sa place sur le bureau : le dossier s'ouvre et la tuile se signale quelques secondes. Retrouver quelque chose, c'est aussi voir où c'est rangé.", ou: "⌘K · Plan de travail" },
      { quoi: "Les dossiers du bureau se cherchent aussi : tapez « vocabulaire » et le dossier s'ouvre, avec son chemin rappelé à côté du nom. Les dossiers parents comptent, même vides.", ou: "⌘K" },
      { quoi: "Un bouton « 👁 Observer » dans le cahier journal : en un clic, vous posez un temps d'observation sur un élève du créneau. L'application vous propose des axes d'observation tirés de la grille Cap école inclusive, choisis d'après la compétence que vous travaillez ce jour-là — et vous pouvez en chercher un autre parmi les cent de la grille.", ou: "Planning · cahier journal · 👁 Observer" },
      { quoi: "L'axe décidé s'affiche sur le créneau, en tête, pendant toute la séance — c'est le seul moment où il sert — et il s'imprime avec le jour : la feuille que vous avez en main dit ce que vous avez prévu de regarder.", ou: "Planning · cahier journal · 🖨" },
      { quoi: "Ce que vous écrivez ensuite dans « Fait · bilan » vient nourrir la fiche, et seulement les phrases qui nomment l'élève : un bilan qui parle de trois enfants ne verse pas tout dans le dossier de l'un d'eux.", ou: "Planning · cahier journal" },
      { quoi: "Un onglet « 👁 Observer » dans les observations de l'élève : la grille de l'académie de Versailles, une fiche par temps d'observation — réussites et points d'appui, difficultés et obstacles, hypothèses sur le besoin, aménagements, réajustement. Le bouton « ✨ Ranger le bilan » range ce que vous avez écrit à chaud dans les colonnes, sans jamais écraser ce que vous avez rédigé.", ou: "Élèves · Observations · 👁 Observer" },
      { quoi: "Et l'observation se remplit depuis le téléphone : l'onglet « 👁 Observer » de la version portable (QR code du planning) liste les temps d'observation du jour, avec leurs six champs, et ce que vous y écrivez revient aussitôt sur l'ordinateur. Une observation se note debout, à côté de l'élève — c'est le téléphone qu'on a en main à ce moment-là.", ou: "Réglages · Partage WiFi · 👁 Observer" },
      { quoi: "La grille s'imprime en tableau, comme le document d'origine : date, contexte, axe, puis les cinq colonnes. De quoi la poser sur la table d'une ESS.", ou: "Élèves · Observations · 🖨" },
      { quoi: "Rejoindre un partage se fait en collant un lien et son mot de passe, rien d'autre : plus de choix à faire, plus de compte à configurer. Pour partager vos propres dossiers — votre Nuage, ou un dossier synchronisé sur cet ordinateur —, c'est désormais dans les Réglages, une fois pour toutes.", ou: "Bureaux communs · Réglages · Données & synchro" },
      { quoi: "Une image copiée depuis une page web ou un PDF se colle maintenant dans un texte : elle n'arrive pas sous forme de fichier mais écrite dans le presse-papiers, et l'application ne la voyait pas. Elle est réduite puis posée au curseur, comme une photo.", ou: "Textes · éditeur" },
      { quoi: "Le bouton « ▦ Fiches » disparaît du plan de travail : tout se trouve sur le bureau.", ou: "Plan de travail" },
      { quoi: "Le journal d'incidents porte enfin la date, et dit ce qui tournait quand la fenêtre s'est figée : « FIGÉ 94 s sur /plan (sync_deltas 46s) » au lieu d'un simple « FIGÉ ». Une erreur réseau dit aussi sa cause réelle, et non plus « dispatch failure » tout court.", ou: "Réglages · Données & synchro · 🩺 Journal d'incidents" },
      { quoi: "Le journal de synchronisation s'élague : ce qui est parti depuis plus d'un mois n'est plus relu à chaque passage. Il avait atteint 7 Mo et 7 000 lignes, relues toutes les trente secondes.", ou: "Réglages · Données & synchro" },
      { quoi: "Un seul encadré, de la taille d'une page — le même que l'éditeur de textes —, où la parole s'écrit lettre après lettre pendant la réunion. Le rangement, lui, se fait en arrière-plan : le document rangé se pose d'un coup, sans se retaper sous vos yeux. Vous pouvez mettre la main dedans à tout moment : l'animation s'arrête, tout s'affiche, et vous corrigez.", ou: "Réunions" },
      { quoi: "L'objet, le type, la date et les participants sont demandés une fois, avant de commencer — puis l'écran ne montre plus que le texte. Pour les reprendre, copier le compte rendu, l'imprimer ou supprimer la réunion : clic droit sur elle, dans la liste.", ou: "Réunions" },
      { quoi: "Plus rien à cliquer pour démarrer : l'écoute part dès que la fiche est validée. L'écran d'information ne s'affiche qu'une fois, la première ; ensuite il ne reste que Pause et Terminer.", ou: "Réunions" },
      { quoi: "Un rangement qui échoue ne laisse plus de message rouge : la parole reste en attente à la fin du texte, l'IA réessaie trente secondes plus tard et reprend tout le document. Rien n'est perdu, il n'y a rien à cliquer.", ou: "Réunions" },
      { quoi: "Ce qui vient d'être dit s'écrit en clair à la fin de l'encadré, puis un agent le range — dès deux phrases : la parole brute ne traîne jamais à l'écran. Points abordés, décisions, ce que je dois faire, à revoir : ce qui se répète fusionne, et une piste devenue décision change de rubrique, sous vos yeux.", ou: "Réunions" },
      { quoi: "Toutes les cinq minutes, une seconde IA relit tout le compte rendu et le resserre : elle voit les redites qu'un passage seul ne peut pas voir. Elle ne supprime jamais une décision, une échéance ni un engagement, et si elle échoue, le document d'avant reste intact. La bande dit quand elle repassera.", ou: "Réunions" },
      { quoi: "La case « Relecture » l'arrête quand vous n'en voulez pas, et un avertissement dit ce qu'elle implique : elle passe par l'IA en ligne, même quand la transcription, elle, reste sur votre ordinateur. Décochée, plus rien ne sort de la machine en mode local — ni la voix, ni le texte.", ou: "Réunions" },
      { quoi: "La transcription peut désormais se faire sur votre ordinateur, avec Whisper : l'audio de la réunion ne sort plus de la machine. C'est ce qui compte le plus en ESS — on ne masque pas une voix. Le compte rendu, lui, continue d'être rangé par l'IA en ligne : c'est du texte, et les prénoms y sont masqués.", ou: "Réglages · IA · 🎙 Transcription des réunions" },
      { quoi: "Le texte suit maintenant la parole : l'application écoute le son et coupe quand la personne se tait, au lieu d'attendre un morceau de quarante-cinq secondes. La première ligne arrive en quelques secondes, et chaque morceau est une phrase entière — ce qui se transcrit mieux qu'une phrase coupée en deux.", ou: "Réunions" },
      { quoi: "Un « [P1] » ne peut plus apparaître dans un compte rendu : le marqueur qui masque les prénoms n'est mentionné à l'IA que lorsqu'il y en a vraiment, et tout marqueur sans nom derrière est retiré avant l'affichage.", ou: "Réunions" },
      { quoi: "Les silences ne partent plus se faire transcrire : une salle qui se tait ne consomme rien et n'écrit plus « [BLANK_AUDIO] » dans le compte rendu. Un bouton « Tester le moteur local » vérifie l'installation avant la réunion, plutôt qu'au milieu.", ou: "Réglages · IA" },
      { quoi: "Vos corrections sont conservées : l'IA repart toujours du compte rendu tel qu'il est affiché, le vôtre compris. À la fin, « ✍️ Mettre au propre » relit l'ensemble d'un coup.", ou: "Réunions · Compte rendu" },
      { quoi: "Un passage mal rangé se rejoue d'un clic : le texte est conservé, alors qu'avant l'audio était perdu. « ⤓ Écrire maintenant » transcrit sans attendre, et « ✨ Ranger maintenant » intègre ce qui est en attente.", ou: "Réunions" },
      { quoi: "Vos réunions déjà enregistrées s'ouvrent comme les nouvelles : leurs tranches de cinq minutes sont recousues en un texte suivi, avec leurs résumés.", ou: "Réunions" },
    ],
  },
  {
    version: "1.6.14",
    titre: "Deux agents : les programmes et la veille sur un élève",
    points: [
      { quoi: "« 🔎 Demander aux programmes » : posez votre question en français — « Que disent les programmes sur la numération en GS ? » — et l'application lit d'abord vos référentiels, puis les guides Éduscol. Les compétences citées viennent de vos référentiels, avec leur chemin exact, prêtes à recopier.", ou: "Référentiels · 🔎 Demander aux programmes" },
      { quoi: "La synthèse d'un élève s'appuie maintenant sur tout ce que vous avez écrit sur lui : observations, phrases du cahier journal qui le nomment, comptes rendus de réunion. L'écran dit ce qui est arrivé depuis votre dernière rédaction, et « ✨ Rédiger la synthèse » écrit le bilan et les domaines concernés.", ou: "Élèves · Évaluations · Synthèse" },
      { quoi: "D'un bilan de groupe, seules les phrases qui nomment l'élève sont reprises ; les camarades cités deviennent « un camarade », et son prénom est masqué avant l'envoi à l'IA. Vous pouvez relire la liste des écrits utilisés avant de rédiger.", ou: "Élèves · Évaluations · Synthèse" },
    ],
  },
  {
    version: "1.6.13",
    titre: "Les réunions se résument toutes seules",
    points: [
      { quoi: "Un onglet « Réunions » : l'application écoute l'ESS, le conseil de cycle ou l'équipe éducative, et résume ce qui se dit toutes les cinq minutes. Vous suivez les résumés arriver pendant la réunion, vous les corrigez d'un clic, et « ✨ Rédiger le compte rendu » assemble le tout en points abordés, décisions et ce que vous avez à faire.", ou: "Réunions" },
      { quoi: "Prévenez les participants avant d'enregistrer : l'écran le rappelle. L'audio n'est jamais écrit sur le disque, il disparaît après la transcription, et les prénoms d'élèves connus sont masqués avant le résumé. « 🧹 Effacer le mot à mot » ne garde que les résumés.", ou: "Réunions" },
      { quoi: "Fabriquer range ses générateurs par famille — Langage, Mathématiques, Autonomie — et s'ouvre à de nouveaux jeux.", ou: "Fabriquer" },
      { quoi: "Deux jeux de plus, à partir des mêmes pictogrammes : le mémory (chaque image en double, mêlées pour que les paires ne se touchent pas) et l'imagier (une image, son mot, dans l'ordre que vous avez choisi).", ou: "Fabriquer · Langage · 🃏 Mémory, 📖 Imagier" },
      { quoi: "Un bouton « 📱 Téléphone » dans le planning : scannez le QR code et retrouvez le planning sur votre téléphone, jour par jour, avec ce qui est prévu, le bilan et les élèves de chaque créneau. Par le WiFi, en lecture seule, sans rien installer.", ou: "Réglages · Partage WiFi" },
      { quoi: "Dans le déroulement d'une séance, surligner un passage fait apparaître un bouton « ✨ Corriger » : l'IA en relit l'orthographe et la grammaire, remplace le passage, et le message qui suit permet de revenir en arrière.", ou: "Séance · Déroulement" },
      { quoi: "Le déroulement d'une séance s'écrit dans un cadre à sa taille, et le tableau imprimé donne sa place à la description : phase, durée et posture se resserrent.", ou: "Séance · Déroulement" },
      { quoi: "Le lien de partage d'un bureau commun porte sur le dossier que vous regardez, et non plus sur tout le compte : un collègue invité ne voit que ce que vous lui montrez. À la racine, l'application le dit au lieu de refuser sans expliquer.", ou: "Bureaux communs · 🔗 Inviter" },
      { quoi: "Un bouton « 🔄 » relit le bureau commun sans attendre, et « Vérifier la connexion » montre l'adresse exacte que l'application interroge — de quoi comprendre pourquoi un dépôt n'arrive pas.", ou: "Bureaux communs" },
      { quoi: "Les fenêtres qui s'ouvrent par-dessus l'application ne sortent plus de l'écran : le QR code du téléphone tient en entier, et une fenêtre ouverte depuis la barre du haut s'affiche au centre." },
    ],
  },
  {
    version: "1.6.12",
    titre: "Partager par Nuage, et un cahier journal plus complet",
    points: [
      { quoi: "Ateliers, espaces, jeux, outils et affichages rejoignent le bureau du plan de travail : un dossier « cycle 1 » peut réunir une séquence, ses jeux et l'outil qui va avec. Clic droit sur le bureau pour en créer, double-clic pour ouvrir leur fiche.", ou: "Plan de travail" },
      { quoi: "« Ateliers & Espaces » quitte le menu. Les fiches et leurs filtres — nombre de joueurs, catégorie, élève — restent à portée de main par le bouton « ▦ Fiches » du bureau.", ou: "Plan de travail · ▦ Fiches" },
      { quoi: "Les dossiers créés dans l'ancien bureau des ateliers sont versés dans le plan de travail ; deux dossiers du même nom n'en font plus qu'un." },
      { quoi: "Les évaluations : clic droit sur le bureau › « Nouveau support » › « Évaluation ». Choisissez la compétence évaluée, dites comment faire passer l'évaluation, et joignez le sujet en PDF. Elles se rangent en dossiers comme le reste, et se déposent sur un bureau commun.", ou: "Plan de travail · clic droit · 🧰 Nouveau support" },
      { quoi: "Réglages › Général : votre fonction, le téléphone de l'établissement, les contacts (direction, coordination, collègues, AESH et soignants, secrétariat) et les repères du matériel. La feuille « Informations pour un remplaçant » s'en remplit toute seule.", ou: "Réglages · Général · 🏫 Établissement" },
      { quoi: "Un onglet « Pages de garde » dans Organisation : la première page d'un cahier, le mot aux familles et la liste des fournitures. L'application pose l'établissement, votre nom et l'année ; l'IA rédige le texte si vous le demandez, sans rien recevoir sur vos élèves.", ou: "Organisation · Pages de garde" },
      { quoi: "Le cahier journal cite aussi les manuels : le bouton « 📖 Manuel » ouvre un PDF du coffre-fort, où l'on surligne un passage à citer, ou l'on trace un cadre autour d'un exercice. L'image découpée se pose dans le prévu et s'imprime avec le jour.", ou: "Planning · cahier journal · 📖 Manuel" },
      { quoi: "Le tableau de bord montre la semaine, et non plus le seul jour : un bouton par journée, avec son nombre de créneaux et ce qui reste sans bilan. Un clic ouvre le cahier journal de ce jour-là.", ou: "Tableau de bord · 🗓️ Cette semaine" },
      { quoi: "Quand la fenêtre se fige, c'est maintenant l'application elle-même qui l'écrit sur le disque, pendant le blocage — même si vous la fermez de force. Le journal note aussi chaque démarrage et signale une session précédente interrompue.", ou: "Réglages · Données & synchro · 🩺 Journal d'incidents" },
      { quoi: "« 📋 Copier le rapport » et « 💾 Enregistrer le rapport… » : de quoi aider un collègue dont l'application se bloque — il copie, il vous l'envoie, vous lisez ce qui s'est passé. Le rapport ne contient aucune donnée d'élève.", ou: "Réglages · Données & synchro · 🩺 Journal d'incidents" },
      { quoi: "Un bouton « ✨ Corriger » dans le prévu et dans le bilan : l'IA relit l'orthographe et la grammaire sans reformuler, et propose sa version sous le champ — c'est vous qui la prenez ou non. Surlignez un passage pour ne corriger que lui. Les prénoms des élèves sont masqués avant l'envoi.", ou: "Planning · cahier journal · ✨ Corriger" },
      { quoi: "Le PDF du jour porte le logo Maitrize et l'adresse maitrize.com en bas de chaque page.", ou: "Planning · 🖨 PDF" },
      { quoi: "« 📚 Séquence » montre maintenant les séances directement : un clic sur « Choisir cette séance » pose son contenu — objectifs et déroulement — dans le cahier journal, à l'écran comme à l'impression.", ou: "Planning · cahier journal · 📚 Séquence" },
      { quoi: "Une séquence dit combien de séances elle prévoit (champ « Séances prévues ») : le cahier journal écrit alors « séance 3/6 », et la liste des séquences annonce « 2/6 séances ».", ou: "Séquence · Séances prévues" },
      { quoi: "Les élèves choisis sur un créneau apparaissent dans le PDF du jour : « Élèves : Apolline, Aurélien », en prénoms seuls, comme à l'écran.", ou: "Planning · 🖨 PDF" },
      { quoi: "Le bouton « 🎯 Compétence » pose une compétence des référentiels dans le prévu : on cherche, on clique, c'est écrit. Les boutons du cahier journal se replient au lieu de déborder de la carte.", ou: "Planning · cahier journal · 🎯 Compétence" },
      { quoi: "Le clic droit du bureau se lit en deux temps : « Nouveau support » (matériel, outil, jeu, évaluation, affichage) et « Nouvel atelier ou espace » ouvrent leur propre liste, comme les menus du système.", ou: "Plan de travail · clic droit" },
      { quoi: "Supprimer un dossier du bureau supprime aussi ce qu'il contient, sous-dossiers compris — la question posée avant le dit en toutes lettres. Pour garder les éléments et ne retirer que le dossier : « Sortir le contenu, garder les éléments ».", ou: "Plan de travail · clic droit sur un dossier" },
      { quoi: "Reprendre quelque chose d'un bureau commun se fait en le glissant sur son bureau, comme on y dépose : un seul geste, dans les deux sens.", ou: "Plan de travail · 🤝 Bureaux communs" },
      { quoi: "Sur un bureau commun, un dossier Maitrize dit ce qu'il contient : « 📚 Séquence · 4 séances », « 🎲 2 jeux · 1 matériel », et qui l'a déposé. Le paquet porte son résumé en tête : Maitrize n'en lit que les premiers octets, même sur Nuage.", ou: "Plan de travail · 🤝 Bureaux communs" },
      { quoi: "Inviter un collègue sans lui donner son mot de passe : le menu ⋯ d'un bureau commun crée un lien de partage Nuage (dépôt autorisé ou lecture seule, avec son propre mot de passe). Le collègue colle ce lien dans son Maitrize — « Ajouter › 🔗 Un lien de partage » — et n'a besoin d'aucun compte.", ou: "Plan de travail · 🤝 Bureaux communs · ⋯" },
      { quoi: "Un bureau commun peut être posé directement sur Nuage (apps.education.fr) : on donne son adresse, son identifiant et un mot de passe d'application, et le dossier partagé est le même sur le Mac et sur le PC, sans rien installer. Le mot de passe reste sur l'ordinateur — ni synchronisé, ni exporté.", ou: "Plan de travail · 🤝 Bureaux communs · Ajouter" },
      { quoi: "« 🤝 Bureaux communs » scinde le bureau en deux : le vôtre à gauche, le bureau commun à droite. On glisse un dossier ou un élément de l'un à l'autre, dans les deux sens — et le dépôt se rattrape d'un « Annuler ».", ou: "Plan de travail · 🤝 Bureaux communs" },
      { quoi: "Les bureaux communs : un dossier partagé par Nuage, OneDrive ou Google Drive devient un bureau commun avec vos collègues. On y glisse des fichiers et des dossiers depuis le Finder, on y dépose un dossier de son bureau (séquences, jeux, outils, avec tout leur contenu) par un clic droit, et l'on récupère en copie ce que les autres ont posé. Vous décidez, dans le service de stockage, qui y a accès. Les bilans de séance et les élèves associés aux outils ne partent pas ; les textes et documents partent tels qu'ils sont écrits.", ou: "Plan de travail · 🤝 Bureaux communs" },
    ],
  },
  {
    version: "1.6.11",
    titre: "Un seul bureau pour les ateliers, les jeux, les outils et les affichages",
    points: [
      { quoi: "Ateliers, espaces, jeux, outils et affichages se rangent sur un même bureau : un dossier « cycle 1 » peut réunir un jeu, l'outil qui va avec et l'affichage du coin. Plus d'onglets : la recherche et les filtres (nombre de joueurs, catégorie, élève) suffisent.", ou: "Ateliers & Espaces" },
      { quoi: "Les barres d'onglets ont la même taille et la même place sur toutes les pages." },
    ],
  },
  {
    version: "1.6.10",
    titre: "Retrouver ce qu'on a écrit, et ne plus rien perdre entre les deux ordinateurs",
    points: [
      { quoi: "La recherche ⌘K cherche enfin dans les séances, le cahier journal, les observations, les jeux et les affichages. Elle montre la ligne trouvée et sa date, et mène au bon jour.", ou: "N'importe où · ⌘K" },
      { quoi: "Le tableau de bord montre la journée : ce qui est prévu à chaque créneau, celui en cours, et les bilans qui manquent. Un clic ouvre le cahier journal.", ou: "Tableau de bord" },
      { quoi: "Citer une séquence dans le prévu affiche ses objectifs et le déroulement de la séance, dans l'app et dans le PDF du jour. Le bouton 📚 la pose pour vous.", ou: "Planning · cahier journal" },
      { quoi: "Citer un jeu affiche sa règle, au même endroit et dans le PDF.", ou: "Planning · cahier journal" },
      { quoi: "Les objectifs du PPI se cochent en portant une observation au dossier ; le PPI montre ensuite les preuves datées, et signale un objectif laissé de côté.", ou: "Élèves · PPI" },
      { quoi: "Les tableaux de langage s'échangent au glisser-déposer, et le générateur de lotos a été refait.", ou: "Fabriquer" },
      { quoi: "Nouveaux onglets Outils pour l'élève et Affichage ; jeux, espaces, outils et affichages se rangent comme sur le bureau.", ou: "Ateliers & Espaces" },
      { quoi: "Supports visuels : économie de jetons, « d'abord / ensuite », minuteur visuel, scénarios sociaux.", ou: "Fabriquer" },
      { quoi: "Le bureau se recopie dans un vrai dossier du Bureau de l'ordinateur, lisible sans l'app.", ou: "Réglages · Données" },
      { quoi: "Synchronisation : une ligne qu'une version ne sait pas écrire n'annule plus tout l'envoi, et deux tableaux créés chacun de son côté se gardent tous les deux." },
      { quoi: "Une fois par mois, l'app relit pour de vrai la dernière sauvegarde et prévient si elle n'est pas restaurable.", ou: "Réglages · Données" },
      { quoi: "Un bouton « Ranger » remet les icônes en ordre, dossiers d'abord puis par nom, là où un déplacement a laissé des trous.", ou: "Ateliers & Espaces · Plan de travail" },
      { quoi: "Une fenêtre figée ou une commande qui ne répond plus laisse une trace dans le journal d'incidents, pour qu'on puisse comprendre ce qui s'est passé.", ou: "Réglages · Données" },
    ],
  },
];

/** Compare deux numéros de version : négatif si a est plus ancienne que b. */
export function comparerVersions(a: string, b: string): number {
  const p = (v: string) => (v || "").split(/[.\-+]/).map((x) => parseInt(x, 10) || 0);
  const [xa, xb] = [p(a), p(b)];
  for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
    const d = (xa[i] ?? 0) - (xb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/**
 * Ce qu'il y a de neuf depuis la dernière fois qu'on a regardé.
 *
 * On ne montre rien à qui n'a jamais rien vu : à la première ouverture, l'app
 * est nouvelle tout entière, et un panneau de nouveautés n'y apprendrait rien.
 */
export function nouveautesDepuis(vues: string, version: string, liste = NOUVEAUTES): Nouveaute[] {
  if (!vues.trim()) return [];
  return liste
    .filter((n) => comparerVersions(n.version, vues) > 0 && comparerVersions(n.version, version) <= 0)
    .sort((a, b) => comparerVersions(b.version, a.version));
}
