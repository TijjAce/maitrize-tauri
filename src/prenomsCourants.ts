// Des prénoms donnés en France, pour reconnaître une personne que
// l'application ne connaît pas : le frère d'un élève, une copine, un
// voisin. La liste est écrite pour Maitrize — les prénoms les plus donnés
// depuis les années 1940, de toutes origines, filles et garçons —, sans
// accents ni majuscules : on la compare au mot plié (voir `confidentialite`).
// Elle ne prétend pas tout couvrir : la relecture avant envoi montre ce qui
// part, et les noms que l'enseignant a notés sont masqués par ailleurs.

const LISTE = `
aaron abdel abdallah abdelkader abdou abdoul abdoulaye abdourahmane abel abigail abraham achille ada adam adama adel adele adeline adem adil
adriana adrian adrien agathe agnes ahmad ahmed aicha aida aimee aissa aissata ajna akim aksel alain alan alba albane albert alberto aldo alec
alessandro alessia alex alexandra alexandre alexane alexia alexis alfred ali alia alice alicia alienor alima alina aline alisha alissa alix aliya
aliyah alma alois aloise alya alyssa amadou amaia amal amandine amani amara amaury ambroise amel amelia amelie amine amir amira amjad amna anael
anais anas anastasia anatole andre andrea andree andy ange angela angele angelina angelique angelo anissa anita anna annabelle anne annie anouk
anselme anthony antoine antoinette anton antonin antonio anya apolline aris aristide arlette armand armel arnaud arno aron arsene arthur artur
arwen arya asma assa assia assiya astrid athenais aubin aude audrey augustin aurele aurelie aurelien auriane aurore axel axelle aya ayaan ayanna
ayden ayline ayman aymane aymeric ayoub ayse aziz azra baptiste barbara barnabe basile bastien baya beatrice beatriz benedicte benjamin benoit
berenice bernadette bernard bertrand betty bianca bilal binta blaise blandine bonnie boris boubacar brahim brandon brendan brice brieuc brigitte
bruno bryan cali calixte callie calvin camelia camil camille candice capucine carl carla carlos carmen carole caroline cassandra cassie catherine
cecile cedric celestin celia celian celina celine cesar chahine chaima chantal charles charlie charline charlize charlotte chayma chiara chloe
christel christelle christian christiane christine christophe claire clara clarisse claude claudette claudia claudine clea clelia clement clemence
clementine cleo cleophee clotilde clovis colette colin coline colombe come constance constant coralie corentin corinne cyprien cyril cyrielle
daisy dalia damien dan dani daniel daniela danielle danny dante daphne david davy deborah delphine denis denise diane didier dimitri dina diogo
djamel djamila djibril domitille dominique dorian doriane dorothee dounia dylan eden edgar edith edmond edouard eduardo ela elea eleanor elena
eleonore eli elia elias eliana elie elif elina elio eliot eliott elisa elisabeth elise eliza ella elliot elodie eloane eloi eloise elouan elsa
elyas elyes elyne elsie emeline emile emilia emilie emilien emir emma emmanuel emmanuelle emna emy enola enora enzo ephraim eric erin ernest erwan
esma esteban estelle esther ethan etienne eugene eugenie eva evan evann eve evelyne evy eymen ezio fabien fabienne fabrice fanny fanta farah
farid farida fatima fatou fatoumata fausto faustine felicie felix ferdinand fernand fernande fiona flavie flavien flora florence florent florian
florine foucauld franck francis francisco francine francois francoise frederic frederique gabin gabriel gabriela gabriella gabrielle gael gaelle
gaetan gaia garance gaspard gaston gatien gauthier gautier genevieve geoffrey georges georgette gerald gerard germaine ghislain gilbert gilberte
gilles gina ginette giovanni gisele giulia giuliana gloria goran gregoire gregory guilhem guillaume gustave guy gwen gwenael gwendal gwendoline
gwenaelle hadrien hafsa haley hamid hamza hana hanae hannah haroun harry hassan hawa hector helena helene heloise henri henriette herve hicham
hilona hippolyte hortense hugo hugues hugues hugette huguette ian ibrahim ibrahima idris ilan ilana ilian iliana ilias ilona ilyan ilyas ilyes
imane imen imran ines ingrid ioana irene irina isaac isabelle isaure isis islem ismael israe issa issam iyad izia jack jacqueline jacques jade
jamel jamila james jana janine jason jawad jean jeanne jeannine jennifer jenny jeremie jeremy jerome jessica jessy jibril joachim joan joanna
joaquim jocelyne joe joel joelle johan johanna john jonas jonathan jordan jose josee joseph josephine josette josiane josue jovan juan jude jules
julia julian juliana julie julien juliette julio justin justine kaelig kais kamel kamil kaou karim karima karine kassandra kayla keira kelly kelyan
kenan kendji kenny kenza kenzi kenzo kerem kevin khadija khalil kiara kilian killian kim kimberley kylian kyllian lahna laila lana lara larissa
laura laure laurence laurent lea leana leandre leane leila lena lenny leo leon leonard leonie leonore leopold lesly lewis lia liam liana lila
lilas lili lilia lilian liliane lilou lily lina lindsay lino lisa lise lison livia lohan loic lois lola lorena lorenzo lorine lou louane louca
louis louisa louise louisette louka louna lounes loup luc luca lucas lucette lucia lucie lucien lucienne lucile lucille ludivine ludovic luigi
luis lukas luna lyam lydia lyes lyna lyne lysandre mael maela maelle maelys maeva magali mahault mahe mahdi mahe mahamadou maia maiwenn malak
malek mali malia malik malika malo malone mamadou manel manon manuel manuela mara marc marceau marcel marcelle marco margaux margot marguerite
maria mariam mariama mariana marianne marie marielle marilou marin marina marine mario marion marius marjorie marley marlon marouane marta marthe
martial martin martine marvin marwa marwan marya maryam maryse matheo mathias mathieu mathilde mathis mathys matias matteo mattheo matthias
matthieu maud maureen maurice max maxence maxime maximilien maya mayssa medhi mehdi melanie melia melina melinda melissa melodie melvin melvyn
meriem meryem mia micha michael michel michele michelle mickael mila milan milena milo mina mira mireille mirko mohamed mohammed moira mona
monique morgan morgane moussa muriel murielle myla mylene myriam nabil nadia nadine nael nahel naim naima naomi narges nassim natacha nathalie
nathan nathanael nelia nell nelly nelson nesrine neyla nicolas nicole nila nina ninon nisrine noa noah noam noe noela noelie noemie noham nolan
nolwenn nora norah nour nourane ocean oceane octave octavia odette odile ofelia olga olivia olivier omar ombeline orlane oscar oumar oumou
ousmane owen pablo paloma pascal pascale patrice patricia patrick paul paula paule pauline paulette pedro penelope perrine philippe philomene
pierre pierrick priscilla quentin rachel rachid rafael rahma raphael raphaelle rayan rayane raymond raymonde rebecca regis remi remy renaud
rene renee riad richard rita robert roberto robin rodrigo roger rokia romain romane romeo romy ronan rosa rosalie rose roxane ruben ryad ryan
saad sabine sabrina sacha safa safia safiya salim salma salome sam samantha sami samia samir samira samuel sana sandra sandrine sara sarah
saskia selena selim selma serena serge severine shana sharon sheryne sidonie siham simon simone sirine sixtine slimane sofia sofian sofiane
soline solene solenn solal soledad sonia sophia sophie souleymane soumaya stacy stanislas stella stephane stephanie steven suzanne sven sybille
sylvain sylvie syrine tahar tais tania tanguy tatiana teddy tess tessa thais thea theo theodore theophile therese thibault thibaut thierry
thomas tiago tiffany tim timeo timothe timothee titouan tom tommy tony tristan ulysse valentin valentina valentine valerie valerian vanessa
vera veronique victor victoria victoire vincent violette virginie vivien vivienne walid wassim wendy william willy xavier yacine yael yaelle
yanis yann yannick yaya yasmina yasmine yassine yassir yohan youcef younes younes youssef youssouf yuna yvan yves yvette yvonne zacharie
zakaria zara zelie zeynep zina zineb zoe zohra zoubida
`;

/** Les prénoms, pliés : en minuscules, sans accents. */
export const PRENOMS = new Set(LISTE.split(/\s+/).filter(Boolean));
