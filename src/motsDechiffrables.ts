// Des mots que les élèves connaissent, pour les grilles de fluence.
//
// On ne les range pas à la main : le découpage en graphèmes dit, pour chaque
// étape de la progression, lesquels se déchiffrent déjà et lesquels portent
// le graphème de la semaine. Un mot ajouté ici trouve sa place tout seul.
//
// Des mots de la classe et de la maison, pas de dictionnaire : une grille de
// fluence se lit vite parce que chaque mot est connu une fois déchiffré.

const MOTS = `
il or ri lu le je lira rira joli filou fou joujou loulou roulé foulé ourlé filé juré relu élu feu jeu fera ouf réjoui ajouré

vélo lavabo cave vide vite valise olive livre vol volé ravi lavé avoue vu
chat chou cheval chemise vache niche bouche mouche riche poche roche cache chute chéri marché chose biche louche douche ruche
papa pipe purée soupe poule pile pré prune épée pirate papi pépite pétale pédale pédalo poupée pou épi
table tapis tortue tomate patate tulipe tirelire été petit moto tasse toupie tour tétine tarte titre trou tribu
bébé robe bol balade boule bobo tuba bise abri sabot arbre barbe robot bolide bijou biberon débat bidule
dur dame salade malade midi dodo radis domino dé épinard dune ordinateur dos doudou dodu
ami mur lime ramé momie mari mule mal matelas marmite mardi samedi mamie mimosa
nid nu narine nous numéro lune nature animal avenue menu minute
ligne vigne signe
zéro lézard douze bazar zébu
sol sourd sofa souris rose vase salut sous sardine chasseur
les mes tes des ses
lit rat jus lilas fort joue roue fée deux doux lourd foulard jolie rue amie riz rapide rire
four jour leur fleur sur par pour frite troupe

car cou clou école cube cabane canard coq sucre carte cartable colis coude crabe crocodile cravate cacao
kilo ski koala képi kimono
qui que chaque équipe quatre requin coquelicot moustique musique banquise
gare légume guitare bague figue gros grue langue guêpe gâteau gourde regard glu
un lundi brun chacun
maman banane enfant tante cantine blanche ampoule jambe lampe chambre pantalon dimanche manteau gant sandale jambon
dent vent endive vendre prendre décembre trente membre ventre tempête encre pendule
mouton melon pont bonbon montagne nombre savon ongle oncle ombre bombe poisson bouton cochon carton dindon
lapin sapin matin jardin fin brin timbre moulin coussin patin
oie moi toi roi boîte fois poire noir étoile armoire voiture mouchoir oiseau toit bois soir
loin foin moins coin point pointu
lui nuit fuir bruit pluie fruit cuisine puits biscuit
pyjama stylo y pyramide type rugby
à là âne bâton pâte château déjà voilà
auto autre eau peau chapeau bateau cadeau taureau journaux chaud saut épaule jaune rideau couteau marteau tableau
œuf bœuf sœur cœur nœud vœu œil œuvre
élève père mère frère tête fête crème chèvre rêve forêt fenêtre zèbre flèche pêche lèvre vipère noël bête fève règle très après

elle nouvelle belle tresse pressé terre verre galette chaussette poubelle vaisselle caresse maîtresse princesse lessive dessert
baguette fourchette trompette assiette serviette pelle dentelle pierre
merci perte perle ferme mercredi serpent vert rectangle insecte geste reste veste escargot herbe escalier festin couvercle perdu merle lecture
air aide faire chaise lait balai maison fraise neige peine reine baleine raisin aile semaine laine craie vrai baignoire treize seize peigne
chanter jouer nez chez assez jouet paquet bouquet poulet robinet cahier panier rocher boucher déjeuner parler volet navet carnet
heure habit hibou hache hérisson thé théâtre haricot huile hamac
photo pharmacie dauphin éléphant téléphone alphabet phoque phare
garçon leçon glaçon cerise citron cinéma cygne ourson veston piscine scie morceau police pouce sorcière cent cinq
cirque facile racine pinceau maçon reçu ciseaux danse chanson piste poste liste costume
girafe pigeon genou orange plage image page rouge singe bougie nageoire gilet géant magie manger gymnase nager fromage garage plongeon
ciel miel pied piano lion avion camion radio viande papier rivière pieuvre violon diable pitié moitié
examen exemple exercice taxi boxe texte saxophone exact boxeur luxe excuse expliquer
pain bain main train faim daim plein ceinture peinture symbole parfum demain copain sympa frein
chien bien rien musicien magicien lien gardien indien pharmacien
récréation opération multiplication punition potion natation lotion invitation
yoga yaourt crayon payer noyer rayure voyage joyeux tuyau rayon noyau balayer royaume
ail portail travail soleil réveil orteil fauteuil écureuil fenouil éventail pareil chevreuil

abbé addition chiffre appel carotte patte accord accent attention sifflet lettre nappe lunettes grotte botte carré beurre arrosoir effacer
pomme gomme somme emmener femme bonnet bonne ennui antenne tonneau année homme comme flamme couronne lionne
allée ballon balle mille ville village collier aller colle bulle pull salle
abeille fille cheville vanille oreille bouteille grenouille citrouille papillon feuille paille maillot chenille coquille billet famille bataille médaille caillou
où hôpital héroïque maïs île dîner flûte côte drôle goûter rôti naïf mûr sûr côté fantôme hôtel
alouette kiwi wagon mouette chouette pirouette fouet
mer amer net brut bec sel hiver fer chef avec os bus ours naturel cactus huit sud hier
plomb tabac clef outil compte automne loup drap trop champ blanc long sang gentil sirop beaucoup temps corps banc étang poing
monsieur faisan paysan second dix six deuxième short schéma orchestre écho chorale oignon

classe pleurer flambeau sable déclarer peuple plume bleu clé glace glisser placard plat aigle boucle plafond flaque
écriture froid acrobate fronde apprendre découvrir traduire grand prince trois drapeau fromage brouette poivre
`;

/** Des verbes au pluriel, avec « ils » ou « elles » : -ent ne se lit pas. */
const AVEC_ILS = [
  "ils jouent", "ils chantent", "ils parlent", "ils lavent", "ils filent", "ils tapent", "ils sautent", "ils volent",
  "ils roulent", "ils dorment", "ils marchent", "ils tombent", "ils posent", "ils lisent", "ils rient", "elles jouent",
  "elles dansent", "elles rêvent",
];

export const MOTS_DECHIFFRABLES: readonly string[] = [...new Set([...MOTS.split(/\s+/).filter(Boolean), ...AVEC_ILS])];
