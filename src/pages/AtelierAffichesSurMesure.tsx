import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { ChoixPoliceCursive } from "../components/ChoixPoliceCursive";
import { Field, Input, Select, TextareaAuto } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  ECRITURES_PRENOM, REGLAGES_ETIQUETTES_PRENOMS, htmlEtiquettesPrenoms, lirePrenoms, reglagesEtiquettesPrenomsSurs, styleEtiquettesPrenoms,
  titreEtiquettesPrenoms, type EcriturePrenom, type ReglagesEtiquettesPrenoms,
} from "../etiquettesPrenoms";
import {
  GRILLE_DES_SIEGES, PETALES_DE_LA_PEUR, REGLAGES_FLEUR, REGLAGES_GRILLE_SEMIQUE, STYLE_GRILLE_SEMIQUE, htmlFleur, htmlGrilleSemique, motsADessinerFleur,
  motsADessinerGrille, reglagesFleurSurs, reglagesGrilleSemiqueSurs, styleFleur, titreFleur, titreGrilleSemique, type ReglagesFleur, type ReglagesGrilleSemique,
} from "../fleurLexicale";
import {
  REGLAGES_MUR_SYLLABES, VOYELLES_COMPLEXES, VOYELLES_SIMPLES, htmlMurSyllabes, reglagesMurSyllabesSurs, styleMurSyllabes, titreMurSyllabes,
  type EcritureSyllabes, type ReglagesMurSyllabes,
} from "../murSyllabes";
import { REGLAGES_REPERTOIRE, SIGNES, STYLE_REPERTOIRE, htmlRepertoire, reglagesRepertoireSurs, titreRepertoire, type ReglagesRepertoire, type Signe } from "../repertoireGraphique";
import {
  REGLAGES_FRISE, REGLAGES_TABLEAU_NOMBRES, STYLE_TABLEAU_NOMBRES, htmlFrise, htmlTableauNombres, reglagesFriseSurs, reglagesTableauNombresSurs, styleFrise,
  titreFrise, titreTableauNombres, type CasesCachees, type ReglagesFrise, type ReglagesTableauNombres,
} from "../tableauNombres";
import {
  GRANDEURS, REGLAGES_UNITES, STYLE_UNITES, htmlUnites, motsADessinerUnites, reglagesUnitesSurs, titreUnites, type Grandeur, type NiveauUnites,
  type ReglagesUnites,
} from "../tableauUnites";
import { graineAuHasard } from "../hasard";
import { useDessinsDesCartes } from "./AtelierAffichesACartes";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › les affiches sur mesure ───────────────────────────────────
//
// Les affiches que les guides décrivent et qui ne sont pas des cartes : le
// tableau des nombres, la frise numérique, le mur de syllabes, la fleur
// lexicale, la grille sémique, le répertoire graphique, les unités de mesure,
// les étiquettes des prénoms. Leur logique vit chacune dans son module ; d'où
// elles viennent est dit sous le « ? » de leur titre.

const titre = (nom: string, aide: React.ReactNode) => (
  <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
    {nom}
    <Aide titre={nom} vers="droite">{aide}</Aide>
  </h3>
);

// ── Le tableau des nombres ──

export function TableauNombresTab() {
  const ATELIER = "tableauNombres";
  const [brut, maj] = useReglages<ReglagesTableauNombres>(ATELIER, REGLAGES_TABLEAU_NOMBRES);
  const r = React.useMemo(() => reglagesTableauNombresSurs(brut), [brut]);
  const html = React.useMemo(() => htmlTableauNombres(r), [r]);
  return (
    <Colonnes
      gauche={<>
        {titre("Le tableau des nombres", <><p>Le guide du CP : un outil qui « met en lumière les régularités du système de numération écrite
          chiffrée » ; on le complète — quelques cases vides, des lignes —, on y joue aux portraits (p. 110). Avec la frise numérique et les cubes,
          un matériel à mettre à la disposition de chaque élève (p. 114).</p><p>Une ligne par dizaine ; les nombres ronds en bleu.</p></>)}
        <Field label="Chaque ligne">
          <Select value={String(r.depart)} onChange={(e) => maj({ depart: e.target.value === "1" ? 1 : 0 })}>
            <option value="0">De 0 à 9, de 10 à 19… : une dizaine par ligne</option>
            <option value="1">De 1 à 10, de 11 à 20… : la ligne finit par la dizaine</option>
          </Select>
        </Field>
        <Field label="À partir de">
          <Select value={String(r.de)} onChange={(e) => maj({ de: Number(e.target.value) })}>
            {Array.from({ length: 10 }, (_, i) => i).map((c) => <option key={c} value={c}>{c * 100 + r.depart}</option>)}
          </Select>
        </Field>
        <Field label="Jusqu'à">
          <Select value={String(r.centaines)} onChange={(e) => maj({ centaines: Number(e.target.value) })}>
            {Array.from({ length: 10 - r.de }, (_, i) => i + 1).map((c) => <option key={c} value={c}>{(r.de + c) * 100 - 1 + r.depart}{c > 1 ? ` — ${c} pages` : ""}</option>)}
          </Select>
        </Field>
        <Coche on={r.couleurs} libelle="Une couleur par ligne" onChange={(couleurs) => maj({ couleurs })} />
        <Field label="Des nombres à retrouver">
          <Select value={r.caches} onChange={(e) => maj({ caches: e.target.value as CasesCachees })}>
            <option value="aucune">Aucun : le tableau complet, pour le mur</option>
            <option value="quelques">Quelques-uns</option>
            <option value="moitie">La moitié</option>
            <option value="lignes">Trois lignes entières</option>
          </Select>
        </Field>
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "cahier" ? "cahier" : "mur" })}>
            <option value="mur">Pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour chaque élève</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreTableauNombres(r)} html={html} style={STYLE_TABLEAU_NOMBRES} peut
          onTirage={r.caches === "aucune" ? undefined : () => maj({ graine: graineAuHasard() })} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_TABLEAU_NOMBRES} />}
    />
  );
}

// ── La frise numérique ──

export function FriseNumeriqueTab() {
  const ATELIER = "friseNumerique";
  const [brut, maj] = useReglages<ReglagesFrise>(ATELIER, REGLAGES_FRISE);
  const r = React.useMemo(() => reglagesFriseSurs(brut), [brut]);
  const html = React.useMemo(() => htmlFrise(r), [r]);
  const style = styleFrise(r);
  return (
    <Colonnes
      gauche={<>
        {titre("La frise numérique", <><p>Le guide du CP : disposée en ligne, la frise est « un des éléments incontournables à mettre en place
          dans la classe de CP » (p. 109). Ses sept sections — de 1 à 19, vingt, trente, quarante, cinquante, soixante jusqu'à 79, quatre-vingts
          jusqu'à 100 — s'affichent les unes après les autres et forment une seule file, pas un tableau (p. 37) : pour lire 72, on remonte à
          « soixante » et l'on compte.</p><p>Une deuxième frise écrit chaque nombre en dizaines et unités (p. 110).</p></>)}
        <Field label="Jusqu'à">
          <Select value={String(r.jusqua)} onChange={(e) => maj({ jusqua: Number(e.target.value) })}>
            {[19, 29, 39, 49, 59, 79, 100].map((n) => <option key={n} value={n}>{n}</option>)}
          </Select>
        </Field>
        <Coche on={r.depart === 0} libelle="Commencer à 0" onChange={(zero) => maj({ depart: zero ? 0 : 1 })} />
        <Coche on={r.sections} libelle="Les sept sections du guide, chacune à sa couleur" onChange={(sections) => maj({ sections })} />
        {r.sections && <Coche on={r.noms} libelle="Le nom au début de chaque section : vingt, trente…" onChange={(noms) => maj({ noms })} />}
        <Coche on={r.unites} libelle="Chaque nombre en dizaines et unités : 4d 7u" onChange={(unites) => maj({ unites })} />
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "eleve" ? "eleve" : "mur" })}>
            <option value="mur">Pour le mur : des bandes à mettre bout à bout</option>
            <option value="eleve">Pour l'élève : une ligne par section, sur une page</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreFrise(r)} html={html} style={style} peut />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}

// ── Le mur de syllabes ──

export function MurSyllabesTab() {
  const ATELIER = "murSyllabes";
  const [brut, maj] = useReglages<ReglagesMurSyllabes>(ATELIER, REGLAGES_MUR_SYLLABES);
  const r = React.useMemo(() => reglagesMurSyllabesSurs(brut), [brut]);
  const html = React.useMemo(() => htmlMurSyllabes(r), [r]);
  const style = styleMurSyllabes(r);
  return (
    <Colonnes
      gauche={<>
        {titre("Le mur de syllabes", <><p>Le guide du CP range le tableau de syllabes parmi les outils de la classe (p. 100) ; celui du CE1 fait
          lire chaque jour des « gammes » sur les murs de syllabes (p. 98).</p><p>Une ligne par consonne, une colonne par voyelle ; les voyelles
          peuvent être des graphèmes — ou, on, an, oi — pour les syllabes complexes.</p></>)}
        <Field label="Les consonnes">
          <Input value={r.consonnes} onChange={(e) => maj({ consonnes: e.target.value })} spellCheck={false} />
        </Field>
        <Field label="Les voyelles">
          <Input value={r.voyelles} onChange={(e) => maj({ voyelles: e.target.value })} spellCheck={false} />
        </Field>
        <div style={{ display: "flex", gap: 6, margin: "-4px 0 8px" }}>
          <button type="button" className="btn ghost sm" onClick={() => maj({ voyelles: VOYELLES_SIMPLES })}>a, e, i, o, u, é</button>
          <button type="button" className="btn ghost sm" onClick={() => maj({ voyelles: VOYELLES_COMPLEXES })}>ou, on, an, in, oi, eu</button>
        </div>
        <Field label="L'écriture">
          <Select value={r.ecriture} onChange={(e) => maj({ ecriture: e.target.value as EcritureSyllabes })}>
            <option value="script">En script</option>
            <option value="cursive">En cursive</option>
            <option value="deux">Les deux</option>
          </Select>
        </Field>
        {r.ecriture !== "script" && <ChoixPoliceCursive />}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "cahier" ? "cahier" : "mur" })}>
            <option value="mur">Pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreMurSyllabes()} html={html} style={style} peut />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}

// ── La fleur lexicale ──

export function FleurLexicaleTab({ banque }: { banque: boolean }) {
  const ATELIER = "fleurLexicale";
  const [brut, maj] = useReglages<ReglagesFleur>(ATELIER, REGLAGES_FLEUR);
  const r = React.useMemo(() => reglagesFleurSurs(brut), [brut]);
  const mots = React.useMemo(() => motsADessinerFleur(r), [r]);
  const { images } = useDessinsDesCartes(mots, banque && r.pictos);
  const html = React.useMemo(() => htmlFleur(r, images), [r, images]);
  const style = styleFleur(r);
  return (
    <Colonnes
      gauche={<>
        {titre("La fleur lexicale", <><p>Le guide du CP : la fleur lexicale récapitule et classe, dans ses pétales, les noms, les verbes, les
          adjectifs, les expressions d'un même champ lexical, relevés dans un texte (p. 104) ; son exemple est celui de la peur, repris ici. Le guide
          du vocabulaire en maternelle en fait des fleurs d'images (p. 38 et 84) ; celui de la grammaire demande de ne pas saturer ces schémas
          (p. 273).</p><p>Un pétale par ligne : « Les verbes : effrayer, hurler ». Six pétales au plus, huit mots chacun.</p></>)}
        <Field label="Au cœur de la fleur">
          <Input value={r.coeur} onChange={(e) => maj({ coeur: e.target.value })} />
        </Field>
        <Field label="Les pétales, un par ligne">
          <TextareaAuto value={r.petales} minHauteur={120} maxHauteur="40vh" onChange={(e) => maj({ petales: e.target.value })} />
        </Field>
        {r.petales !== PETALES_DE_LA_PEUR && <button type="button" className="btn ghost sm" onClick={() => maj({ coeur: "la peur", petales: PETALES_DE_LA_PEUR })}>Remettre l'exemple du guide</button>}
        {banque && <Coche on={r.pictos} libelle="Les dessins des mots : une fleur d'images" onChange={(pictos) => maj({ pictos })} />}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "cahier" ? "cahier" : "mur" })}>
            <option value="mur">Pour le mur, en paysage</option>
            <option value="cahier">En petit, deux par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreFleur(r)} html={html} style={style} peut={r.petales.trim().length > 0} />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}

// ── La grille sémique ──

export function GrilleSemiqueTab({ banque }: { banque: boolean }) {
  const ATELIER = "grilleSemique";
  const [brut, maj] = useReglages<ReglagesGrilleSemique>(ATELIER, REGLAGES_GRILLE_SEMIQUE);
  const r = React.useMemo(() => reglagesGrilleSemiqueSurs(brut), [brut]);
  const mots = React.useMemo(() => motsADessinerGrille(r), [r]);
  const { images } = useDessinsDesCartes(mots, banque && r.pictos);
  const html = React.useMemo(() => htmlGrilleSemique(r, images), [r, images]);
  return (
    <Colonnes
      gauche={<>
        {titre("La grille sémique", <><p>Le guide du CP : les mots d'un même champ lexical — chaise, fauteuil, canapé — ont des traits en commun,
          « a des pieds », « a un dossier » ; la grille les croise, et sa lecture en ligne montre ce qui caractérise chaque mot (p. 104).</p>
          <p>Un mot par ligne, puis ses traits : « chaise : a des pieds, a un dossier ». Sans les croix, la grille se remplit avec la classe.</p></>)}
        <Field label="Le titre">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label="Les mots et leurs traits, un par ligne">
          <TextareaAuto value={r.lignes} minHauteur={120} maxHauteur="40vh" onChange={(e) => maj({ lignes: e.target.value })} />
        </Field>
        {r.lignes !== GRILLE_DES_SIEGES && <button type="button" className="btn ghost sm" onClick={() => maj({ titre: "Les sièges", lignes: GRILLE_DES_SIEGES })}>Remettre l'exemple du guide</button>}
        <Coche on={r.croix} libelle="Les croix (sinon, la grille est à remplir)" onChange={(croix) => maj({ croix })} />
        {banque && <Coche on={r.pictos} libelle="Le dessin de chaque mot" onChange={(pictos) => maj({ pictos })} />}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "cahier" ? "cahier" : "mur" })}>
            <option value="mur">Pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreGrilleSemique(r)} html={html} style={STYLE_GRILLE_SEMIQUE} peut={r.lignes.trim().length > 0} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_GRILLE_SEMIQUE} />}
    />
  );
}

// ── Le répertoire graphique ──

export function RepertoireGraphiqueTab() {
  const ATELIER = "repertoireGraphique";
  const [brut, maj] = useReglages<ReglagesRepertoire>(ATELIER, REGLAGES_REPERTOIRE);
  const r = React.useMemo(() => reglagesRepertoireSurs(brut), [brut]);
  const html = React.useMemo(() => htmlRepertoire(r), [r]);
  return (
    <Colonnes
      gauche={<>
        {titre("Le répertoire graphique", <><p>Le programme de l'école maternelle : les élèves réalisent « un répertoire graphique commun constitué de
          signes simples », et s'en servent pour s'entraîner à reproduire différents motifs (p. 28).</p><p>Chaque carte montre le signe, tracé en
          bande, et son nom ; la case de la photo attend l'endroit où la classe l'a trouvé.</p></>)}
        <Field label="Les signes">
          <Chips liste={SIGNES.map((s) => s.id)} choisis={r.signes} libelle={(id: Signe) => SIGNES.find((s) => s.id === id)?.nom ?? id}
            onChange={(signes) => { if (signes.length) maj({ signes: SIGNES.map((s) => s.id).filter((s) => signes.includes(s)) }); }} />
        </Field>
        <Coche on={r.capitales} libelle="Les noms en capitales" onChange={(capitales) => maj({ capitales })} />
        <Coche on={r.photo} libelle="Une case pour la photo de l'endroit où on l'a trouvé" onChange={(photo) => maj({ photo })} />
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "etiquettes" || e.target.value === "repasser" ? e.target.value : "mur" })}>
            <option value="mur">Six signes par page</option>
            <option value="etiquettes">De grandes cartes, quatre par page</option>
            <option value="repasser">Une fiche à repasser, trois signes par page</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreRepertoire(r)} html={html} style={STYLE_REPERTOIRE} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_REPERTOIRE} />}
    />
  );
}

// ── Les unités de mesure ──

export function UnitesMesureTab({ banque }: { banque: boolean }) {
  const ATELIER = "unitesMesure";
  const [brut, maj] = useReglages<ReglagesUnites>(ATELIER, REGLAGES_UNITES);
  const r = React.useMemo(() => reglagesUnitesSurs(brut), [brut]);
  const mots = React.useMemo(() => motsADessinerUnites(r), [r]);
  const { images } = useDessinsDesCartes(mots, banque && r.pictos);
  const html = React.useMemo(() => htmlUnites(r, images), [r, images]);
  return (
    <Colonnes
      gauche={<>
        {titre("Les unités de mesure", <><p>Au cycle 2, pas de tableau de conversion : les élèves s'appuient sur les relations connues entre les unités
          (programme de mathématiques du cycle 2), et l'affiche les écrit — celles du CE1, puis celles du CE2.</p><p>Au cours moyen, un tableau peut
          présenter les unités multiples et sous-multiples du mètre, du gramme ou du litre et leurs relations ; il ne sert pas à convertir
          (programme du cycle 3).</p></>)}
        <Field label="La classe">
          <Select value={r.niveau} onChange={(e) => maj({ niveau: e.target.value as NiveauUnites })}>
            <option value="CE1">CE1 : les relations du programme</option>
            <option value="CE2">CE2 : les relations du programme</option>
            <option value="CM">CM1, CM2 : le tableau des unités</option>
          </Select>
        </Field>
        <Field label="Les grandeurs">
          <Chips liste={GRANDEURS.map((g) => g.id)} choisis={r.grandeurs} libelle={(id: Grandeur) => GRANDEURS.find((g) => g.id === id)?.nom ?? id}
            onChange={(grandeurs) => { if (grandeurs.length) maj({ grandeurs }); }} />
        </Field>
        {banque && <Coche on={r.pictos} libelle="Un dessin pour chaque grandeur" onChange={(pictos) => maj({ pictos })} />}
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value === "cahier" ? "cahier" : "mur" })}>
            <option value="mur">Pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
          </Select>
        </Field>
        <Boutons atelier={ATELIER} titre={titreUnites(r)} html={html} style={STYLE_UNITES} peut />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_UNITES} />}
    />
  );
}

// ── Les étiquettes des prénoms ──
//
// Les prénoms viennent de la liste de la classe ; ce qu'on y change reste à
// l'écran le temps de l'impression, et ne s'enregistre pas.

export function EtiquettesPrenomsTab() {
  const ATELIER = "etiquettesPrenoms";
  const [brut, maj] = useReglages<ReglagesEtiquettesPrenoms>(ATELIER, REGLAGES_ETIQUETTES_PRENOMS);
  const r = React.useMemo(() => reglagesEtiquettesPrenomsSurs(brut), [brut]);
  const [saisie, setSaisie] = React.useState<string | null>(null);
  const [classe, setClasse] = React.useState<string>("");
  const reprendre = React.useCallback(() => {
    api.elevesList().then((eleves) => {
      const liste = [...new Set(eleves.map((e) => e.nom.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")).join("\n");
      setClasse(liste);
      setSaisie(null);
    }).catch(() => setClasse(""));
  }, []);
  React.useEffect(reprendre, [reprendre]);
  const texte = saisie ?? classe;
  const prenoms = React.useMemo(() => lirePrenoms(texte), [texte]);
  const html = React.useMemo(() => htmlEtiquettesPrenoms(prenoms, r), [prenoms, r]);
  const style = styleEtiquettesPrenoms(r);
  return (
    <Colonnes
      gauche={<>
        {titre("Les étiquettes des prénoms", <><p>« L'écriture à l'école maternelle » (Éduscol, 2015) range la liste des élèves, en listes et en
          étiquettes, parmi les affichages incontournables (p. 21) ; en moyenne section, la correspondance entre capitales et script s'appuie sur les
          étiquettes des prénoms (p. 8), puis la cursive se généralise avec le prénom (p. 13). Le programme de l'école maternelle fait utiliser
          l'étiquette de son prénom pour marquer sa présence (p. 13).</p><p>Les prénoms viennent de la liste de la classe ; ce que vous changez ici
          ne s'enregistre pas.</p></>)}
        <Field label="Les prénoms, un par ligne">
          <TextareaAuto value={texte} minHauteur={140} maxHauteur="40vh" spellCheck={false} onChange={(e) => setSaisie(e.target.value)} />
        </Field>
        {saisie !== null && <button type="button" className="btn ghost sm" onClick={reprendre}>Reprendre la liste de la classe</button>}
        <Field label="Ce qu'on imprime">
          <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value === "lettres" ? "lettres" : "etiquettes" })}>
            <option value="etiquettes">Les étiquettes</option>
            <option value="lettres">Pour chaque élève, la fiche des lettres de son prénom</option>
          </Select>
        </Field>
        {r.forme === "lettres" ? (
          <Field label="Les cases à colorier">
            <Select value={String(r.cases)} onChange={(e) => maj({ cases: e.target.value === "20" ? 20 : 12 })}>
              <option value="12">Douze grandes cases : la petite section</option>
              <option value="20">Vingt cases : la moyenne section</option>
            </Select>
          </Field>
        ) : <>
          <Field label="Les écritures">
            <Chips liste={ECRITURES_PRENOM.map((e) => e.id)} choisis={r.ecritures} libelle={(id: EcriturePrenom) => ECRITURES_PRENOM.find((e) => e.id === id)?.nom ?? id}
              onChange={(ecritures) => { if (ecritures.length) maj({ ecritures: ECRITURES_PRENOM.map((e) => e.id).filter((e) => ecritures.includes(e)) }); }} />
          </Field>
          {r.ecritures.includes("cursive") && <ChoixPoliceCursive />}
          <Coche on={r.photo} libelle="Une case pour la photo" onChange={(photo) => maj({ photo })} />
          <Field label="Les étiquettes">
            <Select value={r.taille} onChange={(e) => maj({ taille: e.target.value === "petites" ? "petites" : "grandes" })}>
              <option value="grandes">Grandes, huit par page : la présence, le portemanteau</option>
              <option value="petites">Petites, vingt-quatre par page : les casiers, les cahiers</option>
            </Select>
          </Field>
        </>}
        <Boutons atelier={ATELIER} titre={titreEtiquettesPrenoms(r)} html={html} style={style} peut={prenoms.length > 0}
          onTirage={r.forme === "lettres" ? () => maj({ graine: graineAuHasard() }) : undefined} />
      </>}
      droite={<ApercuFeuille html={html} style={style} />}
    />
  );
}
