import React from "react";
import { api } from "../api";
import { Aide } from "../components/Aide";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { usePictoImages } from "../components/ChoixPicto";
import { Field, Input, Select, TextareaAuto } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import {
  ATELIERS_DES_CARTES, MODELES_CARTES, STYLE_CARTES, enEtapes, htmlCartes, motsADessinerCartes, reglagesCartesParDefaut, reglagesCartesSurs,
  titreCartes, type FormatCartes, type ReglagesCartes, type SorteCartes,
} from "../affichesACartes";
import { CLE_LEXIQUE, lireLexique, motsAChercher, pictosProposes } from "../caa";
import { attributionPour } from "../cartesImprimables";
import { mentionDesPictos, type RefPicto } from "../pictosAppoint";
import { Boutons, Colonnes } from "./AteliersLangage";
import { Chips, Coche } from "./AteliersMaths";

// ── Fabriquer › Les affiches à cartes ─────────────────────────────────────
//
// Un même écran pour toutes les affiches faites de cartes ou d'étapes (voir
// affichesACartes.ts) : une liste de départ, une carte par ligne, les dessins
// de la banque, le mur, le cahier ou de grandes étiquettes.

/** Ce que chaque affiche est, et d'où elle vient : sous le « ? » du titre, avec la source de l'atelier. */
const EXPLICATIONS: Record<SorteCartes, string[]> = {
  consignes: ["« Aménager l'espace » (Éduscol, 2017) range les verbes de consignes parmi les affichages pédagogiques incontournables, avec l'alphabet "
    + "et les mots-repères.", "Les pictos sont ceux de votre lexique des consignes (CAA) quand vous en avez choisi, sinon ceux de la banque."],
  sons: ["Le guide du CE1 veut des affichettes des correspondances graphèmes-phonèmes, présentes en classe (p. 87) ; celui du CP range les "
    + "mots-référents parmi les outils de la classe (p. 100).", "Une carte par graphème : le mot-repère, son dessin, le graphème en rouge. Les "
    + "listes suivent la progression de Maitrize, période par période ; en grandes étiquettes, une affichette par son."],
  listes: ["Le guide du CE1 donne l'exemple d'une liste analogique sur le graphème « ien » (p. 22) et range les listes analogiques parmi les outils "
    + "communs, à garder du CP au CE1 (p. 124).", "Le graphème se colore dans chaque mot."],
  maisons: ["Le guide « Pour préparer l'apprentissage de la lecture et de l'écriture à l'école maternelle » propose les maisons des sons, où l'on "
    + "range les mots de la classe (p. 43) ; le guide des langues vivantes en fait autant pour l'anglais, chaque maison avec son mot repère : "
    + "pig, five, tree (p. 20 et 33)."],
  responsabilites: ["« Aménager l'espace » (Éduscol, 2017) range les responsabilités parmi les affichages organisationnels.",
    "La case sous chaque carte attend l'étiquette d'un prénom, ou une pince."],
  coins: ["« L'écriture à l'école maternelle » (Éduscol, 2015) veut les coins et les activités désignés et illustrés pour les plus jeunes (p. 21) ; "
    + "le programme de l'école maternelle cite les étiquettes de rangement parmi les écrits de la classe (p. 16)."],
  regles: ["Le programme de l'école maternelle (p. 4) : des règles de vie élaborées ensemble, qu'il s'agisse de libertés régulées — s'exprimer, "
    + "jouer, apprendre, faire des erreurs — ou d'instructions données — attendre son tour, partager les objets, ranger, respecter le matériel. "
    + "Le programme d'enseignement moral et civique y revient au CP et au CE2.", "Une trame à compléter avec la classe."],
  langue: ["Le programme de langues vivantes du cycle 2 : un élève indique la date et la météo du jour en montrant ou en déplaçant les étiquettes "
    + "du coin langue. Le guide des langues vivantes cite le panneau des saisons (p. 27) et le double affichage des lieux de l'école (p. 8) ; "
    + "le guide pour l'éveil à la diversité linguistique, « bonjour » dans les langues rencontrées (p. 33)."],
  invariables: ["Le guide de grammaire (p. 167) : des corpus de mots invariables, en affichage notamment ; le programme du CE1 les veut "
    + "organisés, en listes analogiques.", "« Mots invariables » n'étant pas une catégorie grammaticale (p. 182), on les range par le sens ou par "
    + "la ressemblance, jamais en vrac. Le guide du CP met en garde contre les listes de mots-outils (p. 31) : c'est une affiche du CE1."],
  contraires: ["Le guide du CP (p. 105) : un album des contraires, des paires d'antonymes de la même classe de mots, collectés et affichés."],
  familles: ["Le guide du CP (p. 100 et 105) : des familles de mots et des fiches morphologiques, en affichage, une famille par semaine ; le guide "
    + "du vocabulaire en maternelle, les maisons de familles de mots (p. 39)."],
  couleurs: ["Le guide « Pour enseigner le vocabulaire à l'école maternelle » (p. 91) : un affichage référent pour chaque couleur abordée, son nom "
    + "et ce qui a sa couleur. Une page par couleur."],
  emotions: ["Le guide « Pour enseigner le vocabulaire à l'école maternelle » (p. 73) : une affiche des émotions, leurs mots rangés par gradation ; "
    + "le programme d'éducation à la vie affective et relationnelle fait fabriquer au CP deux affiches des sentiments et des émotions, avec "
    + "leurs mots.", "Les points disent la force : du plus faible au plus fort."],
  comprehension: ["Le guide « La compréhension au cours moyen » (figure 7, p. 99) : écrire avant, pendant et après la lecture pour mieux "
    + "comprendre ; les stratégies travaillées se gardent sur des affiches (p. 89 et 111).", "Les phrases sont celles de Maitrize, d'après la figure."],
  demarche: ["« Questionner le monde — mettre en œuvre son enseignement dans la classe » (Éduscol, 2016) : la démarche d'investigation, de la "
    + "question au savoir qu'on retient.", "Les mots des étapes sont ceux de Maitrize."],
  animal: ["Le programme de l'école maternelle, à partir de 5 ans (p. 59) : réaliser une affiche pour réinvestir le lexique — les étapes de la "
    + "vie, la morphologie, la locomotion, l'alimentation, le milieu de vie.", "Chaque rubrique a sa case, à remplir avec la classe."],
  calcul: ["Le guide du CP range les calculs en sept familles — les suivants, + 10, les doubles, les compléments à 10, les presque-doubles, les "
    + "sommes inférieures à 10, le passage par 10 — (p. 61) et structure les connaissances par des affichages (p. 65 et 68).",
  "La plupart des exemples sont ceux du guide ; « Pour calculer vite » ajoute + 9, − 9, + 11, × 10 et × 5."],
  comparer: ["Le guide du CP (p. 45) : le savoir à retenir en affichage collectif — on compare deux nombres grâce à leur écriture chiffrée, les "
    + "dizaines d'abord : 71 est plus grand que 68."],
};

/** Le nom de l'atelier, en titre de l'écran. */
export const NOMS_DES_CARTES: Record<SorteCartes, string> = {
  consignes: "Les verbes des consignes", sons: "Les affichettes des sons", listes: "Les listes analogiques", maisons: "Les maisons des sons",
  responsabilites: "Les responsabilités", coins: "Coins et rangements", regles: "Les règles de vie", langue: "Le coin langue",
  invariables: "Les mots invariables", contraires: "Les contraires", familles: "Les familles de mots", couleurs: "Les couleurs",
  emotions: "Les émotions", comprehension: "Écrire pour mieux comprendre", demarche: "La démarche d'investigation", animal: "L'affiche d'un animal",
  calcul: "Les familles de calculs", comparer: "Comparer deux nombres",
};

/**
 * Les dessins des cartes, par mot : le picto de votre lexique des consignes
 * s'il y en a un pour ce mot ; sinon celui de la banque sous ce nom exact ;
 * sinon celui qu'elle donne à la classe pour ce verbe ou l'un de ses
 * synonymes. La mention suit les banques des pictos posés.
 */
function useDessinsDesCartes(mots: string[], actif: boolean): { images: Record<string, string>; mention: string } {
  const [refs, setRefs] = React.useState<Record<string, RefPicto>>({});
  const cle = mots.join("|");
  React.useEffect(() => {
    if (!actif || !mots.length) { setRefs({}); return; }
    let vivant = true;
    void (async () => {
      const lexique = lireLexique(await api.settingGet(CLE_LEXIQUE).catch(() => null));
      const sortie: Record<string, RefPicto> = {};
      for (const m of mots) if (lexique[m] !== undefined) sortie[m] = lexique[m];
      const reste = mots.filter((m) => sortie[m] === undefined);
      if (reste.length) {
        const [trouves] = await api.arasaacParMots(reste).catch((): [{ id: number; mot: string }[], string[]] => [[], []]);
        const exacts = new Map(trouves.map((p) => [p.mot.toLowerCase(), p.id]));
        for (const m of reste) { const id = exacts.get(m); if (id !== undefined) sortie[m] = id; }
        const encore = reste.filter((m) => sortie[m] === undefined);
        if (encore.length) {
          const consignes = await api.arasaacPourConsignes([...new Set(encore.flatMap(motsAChercher))]).catch(() => []);
          Object.assign(sortie, pictosProposes(encore, consignes));
        }
      }
      if (vivant) setRefs(sortie);
    })();
    return () => { vivant = false; };
  }, [cle, actif]); // eslint-disable-line react-hooks/exhaustive-deps
  const liste = React.useMemo(() => [...new Set(Object.values(refs))], [refs]);
  const vues = usePictoImages(liste);
  return React.useMemo(() => {
    const images = Object.fromEntries(Object.entries(refs).flatMap(([mot, ref]) => (vues[ref] ? [[mot, vues[ref]]] : [])));
    const posees = liste.filter((ref) => vues[ref]);
    const mention = attributionPour(posees.filter((r): r is number => typeof r === "number"))
      + mentionDesPictos(posees.filter((r) => typeof r === "string"), "", "attribution");
    return { images, mention };
  }, [refs, vues, liste]);
}

const COLONNES: number[] = [1, 2, 3, 4, 5, 6];

export function AfficheCartesTab({ sorte, banque }: { sorte: SorteCartes; banque: boolean }) {
  const m = MODELES_CARTES[sorte];
  const atelier = ATELIERS_DES_CARTES[sorte];
  const defaut = React.useMemo(() => reglagesCartesParDefaut(sorte), [sorte]);
  const [brut, maj] = useReglages<ReglagesCartes>(atelier, defaut);
  const r = React.useMemo(() => reglagesCartesSurs(sorte, brut), [sorte, brut]);
  const mots = React.useMemo(() => motsADessinerCartes(sorte, r), [sorte, r]);
  const { images, mention } = useDessinsDesCartes(mots, banque && r.pictos);
  const html = React.useMemo(() => htmlCartes(sorte, r, images, mention), [sorte, r, images, mention]);
  const etapes = enEtapes(sorte);
  const listeChoisie = m.listes?.find((l) => l.lignes === r.lignes)?.id ?? "";
  const changees = r.lignes !== m.lignes && !listeChoisie;
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          {NOMS_DES_CARTES[sorte]}
          <Aide titre={NOMS_DES_CARTES[sorte]} vers="droite">
            {EXPLICATIONS[sorte].map((p) => <p key={p}>{p}</p>)}
            <p>Une ligne par {etapes ? "étape" : "carte"} — {m.syntaxe}</p>
          </Aide>
        </h3>
        {m.listes && (
          <Field label="Remplir avec">
            <Select value={listeChoisie} onChange={(e) => {
              const l = m.listes?.find((x) => x.id === e.target.value);
              if (l) maj({ lignes: l.lignes, titre: l.titre, colonnes: l.colonnes ?? m.colonnes });
            }}>
              {!listeChoisie && <option value="">Vos cartes</option>}
              {m.listes.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Le titre">
          <Input value={r.titre} onChange={(e) => maj({ titre: e.target.value })} />
        </Field>
        <Field label={etapes ? "Les étapes, une par ligne" : "Les cartes, une par ligne"}>
          <TextareaAuto value={r.lignes} minHauteur={140} maxHauteur="45vh" spellCheck={false}
            onChange={(e) => maj({ lignes: e.target.value })} />
        </Field>
        {changees && <button type="button" className="btn ghost sm" onClick={() => maj({ lignes: m.lignes, titre: m.titre })}>Remettre les cartes de départ</button>}
        {!etapes && r.format !== "etiquettes" && (
          <Field label="Cartes par rangée">
            <Chips liste={COLONNES} choisis={[r.colonnes]} onChange={(c) => { const n = c.find((x) => x !== r.colonnes); if (n) maj({ colonnes: n }); }} />
          </Field>
        )}
        {banque && <Coche on={r.pictos} libelle="Les dessins" onChange={(pictos) => maj({ pictos })} />}
        <Coche on={r.capitales} libelle="Les mots en capitales" onChange={(capitales) => maj({ capitales })} />
        <Field label="Ce qu'on imprime">
          <Select value={r.format} onChange={(e) => maj({ format: e.target.value as FormatCartes })}>
            <option value="mur">Pour le mur</option>
            <option value="cahier">En petit, quatre par page, pour le cahier</option>
            {!etapes && <option value="etiquettes">De grandes étiquettes, quatre par page</option>}
          </Select>
        </Field>
        <Boutons atelier={atelier} titre={titreCartes(sorte, r)} html={html} style={STYLE_CARTES} peut={r.lignes.trim().length > 0} />
      </>}
      droite={<ApercuFeuille html={html} style={STYLE_CARTES} />}
    />
  );
}
