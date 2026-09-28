import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Page } from "../App";
import { api, EtatBanque, PictoArasaac, OptionsJeu } from "../api";
import { Field, Input, Select, Empty, Modal, useAsync, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { PartieToutTab, MultiplicatifsTab } from "./ProblemesBarres";
import { ColoriageMagiqueTab } from "./ColoriageMagique";
import { LectureSonsTab } from "./LectureSons";
import { CompetencesAtelier } from "../components/CompetencesAtelier";
import { ConsigneAtelier } from "../components/ConsigneAtelier";
import { AtelierContext } from "../components/AtelierContext";
import { deposerSurLeBureau, lignesCompetencesAtelier } from "../impressionAtelier";
import { BoutonBureau } from "../components/BoutonBureau";
import { DominosTab, FluenceTab, IntrusTab, LettresTab, LotoSyllabesTab, PairesTab, SyllabaireTab } from "./AteliersSons";
import {
  ArbreCalculTab, CartesCalculTab, CartesNombresTab, CompteEstBonTab, CubesTab, FractionsTab, HeureTab, JeuDeLOieTab, MartiniereTab, NumerationTab, PyramidesTab,
} from "./AteliersMaths";
import { EtiquettesTab, MotsMelesTab, PhrasesTab } from "./AteliersLangage";
import { ajouter, completerAuHasard, imagesConseillees, motsDeLaListe, remplacer, uneImageParMot } from "../loto";
import { usePictoImage } from "../components/ChoixPicto";

// ── Loto et tableaux à partir des pictogrammes ARASAAC ────────────────────
//
// Aucune IA n'intervient dans le choix des pictogrammes. On part des
// catégories de la banque : un picto rangé dans « animaux terrestres » par
// ARASAAC en est un, sans qu'un modèle ait à le deviner. L'enseignant voit
// ensuite tout le vivier et retire ce qu'il ne veut pas : rien ne s'imprime
// sans avoir été regardé.

const OCTETS = (n: number) =>
  n > 1e9 ? `${(n / 1e9).toFixed(1)} Go` : n > 1e6 ? `${Math.round(n / 1e6)} Mo` : `${Math.round(n / 1e3)} ko`;

const ONGLETS = [
  "jeux", "memory", "imagier", "etiquettes",
  "sons", "lotoSyllabes", "dominos", "intrus", "paires", "fluence", "syllabaire", "lettres",
  "phrases", "motsMeles",
  "martiniere", "compteEstBon", "pyramides", "partieTout", "multiplicatifs", "coloriage", "nombres", "cubes", "calcul", "arbre", "fractions", "oie", "heure", "numeration",
] as const;
type Onglet = typeof ONGLETS[number];

/**
 * Les ateliers, rangés par famille.
 *
 * Une rangée d'onglets s'allonge à chaque nouveau générateur et finit par ne
 * plus rien dire : « 🎲 Loto » ne dit pas ce qu'on obtient, et il faut ouvrir
 * pour savoir. La page s'ouvre donc sur les ateliers eux-mêmes, chacun disant
 * ce qu'il fabrique — puis l'on entre dans celui qu'on veut.
 */
interface Outil {
  id: Onglet;
  nom: string;
  icone: string;
  /** Ce qu'on obtient, en une phrase : c'est la question qu'on se pose. */
  quoi: string;
  /** Vrai si l'atelier a besoin de la banque de pictogrammes. */
  pictos?: boolean;
  /** Pour qui : « Cycle 2 », « Cycles 2 et 3 »… */
  cycles?: string;
}

const FAMILLES: { id: string; libelle: string; aide: string; outils: Outil[] }[] = [
  {
    id: "langage", libelle: "🗣 Langage",
    aide: "Vocabulaire et désignation à partir des pictogrammes.",
    outils: [
      { id: "jeux", nom: "Loto", icone: "🎲", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des planches et leurs cartes à découper, sur les thèmes que vous choisissez." },
      { id: "memory", nom: "Mémory", icone: "🃏", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des paires à retourner : image et image, ou image et mot." },
      { id: "imagier", nom: "Imagier", icone: "📖", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Une page d'images légendées, à afficher ou à coller dans un cahier." },
      { id: "etiquettes", nom: "Étiquettes à catégoriser", icone: "🏷", cycles: "Cycles 2 et 3",
        quoi: "Les mots collectés en grand pour le tableau, en petit par enveloppe, et la corolle lexicale." },
    ],
  },
  {
    id: "sons", libelle: "🔤 Sons et lecture",
    aide: "Ce que les guides de lecture font manipuler : syllabes, sons, lettres, fluence.",
    outils: [
      { id: "sons", nom: "Fiches de sons", icone: "🔤", cycles: "Cycle 2",
        quoi: "Syllabes, mots à lire, à entourer, à compléter — une fiche par graphème." },
      { id: "lotoSyllabes", nom: "Loto des syllabes", icone: "🎯", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Des cases qui imposent un nombre de syllabes : on pioche une image, on scande, on compte." },
      { id: "dominos", nom: "Dominos des syllabes", icone: "🁡", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "La fin d'une image commence la suivante : micro – crocodile." },
      { id: "intrus", nom: "Chasse à l'intrus", icone: "🔍", pictos: true, cycles: "Cycles 1 et 2",
        quoi: "Trois mots qui commencent pareil, un intrus à entourer : bateau, banane, tapis, ballon." },
      { id: "paires", nom: "Paires de mots proches", icone: "👂", pictos: true, cycles: "Cycle 2",
        quoi: "Mouche / mousse, chou / joue : les cartes du trésor et du téléphone." },
      { id: "fluence", nom: "Grille de fluence", icone: "⏱", cycles: "Cycles 2 et 3",
        quoi: "Syllabes, pseudo-mots et mots à lire en une minute, le score noté chaque jour." },
      { id: "syllabaire", nom: "Syllabaire", icone: "🛗", cycles: "Cycle 2",
        quoi: "Le jeu de l'ascenseur : deux bandes qui glissent, la syllabe apparaît." },
      { id: "lettres", nom: "Les lettres", icone: "🔠", cycles: "Cycles 1 et 2",
        quoi: "Mémory, mistigri et loto des lettres, majuscule et minuscule ; la planche de l'ophtalmologue." },
    ],
  },
  {
    id: "ecrit", libelle: "✍️ Lecture et écriture",
    aide: "Des mots et des phrases à manipuler : phrases à remettre en ordre, mots mêlés.",
    outils: [
      { id: "phrases", nom: "Phrases en désordre", icone: "✂️", cycles: "Cycle 2",
        quoi: "Les mots d'une phrase sur des étiquettes mélangées : on découpe, on remet en ordre, on colle." },
      { id: "motsMeles", nom: "Mots mêlés", icone: "🔎", cycles: "Cycles 2 et 3",
        quoi: "Les mots de la semaine cachés dans une grille de lettres, la liste dessous, le corrigé à la suite." },
    ],
  },
  {
    id: "maths", libelle: "🔢 Mathématiques",
    aide: "Du calcul mental, des problèmes à la structure choisie, des cartes, des pistes, et des calculs qui font apparaître un dessin.",
    outils: [
      { id: "martiniere", nom: "Calcul mental", icone: "🧮", cycles: "Cycles 2 et 3",
        quoi: "Le procédé La Martinière : la fiche du maître avec les réponses, et les ardoises papier des élèves." },
      { id: "compteEstBon", nom: "Le compte est bon", icone: "🎯", cycles: "Cycles 2 et 3",
        quoi: "Une cible, quelques nombres, les opérations permises : on cherche un chemin, une solution au corrigé." },
      { id: "pyramides", nom: "Pyramides et carrés magiques", icone: "🔺", cycles: "Cycles 2 et 3",
        quoi: "Des briques à additionner en montant, des carrés où chaque ligne fait la même somme." },
      { id: "partieTout", nom: "Problèmes partie-tout", icone: "➕", cycles: "Cycles 2 et 3",
        quoi: "Un tout et ses parties, avec leur schéma en barres." },
      { id: "multiplicatifs", nom: "Problèmes multiplicatifs", icone: "✖️", cycles: "Cycles 2 et 3",
        quoi: "Parts égales et comparaisons, avec leur schéma en barres." },
      { id: "coloriage", nom: "Coloriage magique", icone: "🎨", cycles: "Cycles 2 et 3",
        quoi: "On calcule, le résultat dit la couleur, le dessin apparaît." },
      { id: "nombres", nom: "Cartes des nombres", icone: "🔢", cycles: "Cycles 1 et 2",
        quoi: "Chiffre, constellation, boîte de dix, mot : le même nombre sous toutes ses formes." },
      { id: "cubes", nom: "Nombres en cubes", icone: "🧱", cycles: "Cycle 2",
        quoi: "Unités, barres de dix, plaques de cent : lire les cubes et écrire le nombre, ou l'inverse." },
      { id: "calcul", nom: "Cartes de calcul", icone: "🃏", cycles: "Cycles 2 et 3",
        quoi: "Le calcul devant, le résultat derrière : se tester, ou la bataille des tables." },
      { id: "arbre", nom: "Arbre à calcul", icone: "🌳", cycles: "Cycle 2",
        quoi: "Ajouter deux nombres en dizaines et unités, l'arbre à compléter." },
      { id: "fractions", nom: "Fractions", icone: "🍰", cycles: "Cycle 3",
        quoi: "Cartes, bandes à plier, règle graduée en quarts ou en dixièmes, course des nageurs." },
      { id: "oie", nom: "Jeu de l'oie", icone: "🎲", cycles: "Cycles 1 et 2",
        quoi: "Une piste au dé, avec des nombres, des lettres ou des syllabes, et le patron du dé." },
      { id: "heure", nom: "Lire l'heure", icone: "🕰", cycles: "Cycles 2 et 3",
        quoi: "Des horloges à lire, des cadrans où dessiner les aiguilles — heures pile, demies, quarts, cinq minutes." },
      { id: "numeration", nom: "Grands nombres et décimaux", icone: "💯", cycles: "Cycle 3",
        quoi: "Tableau de numération, écriture en lettres, décomposition, comparaison, encadrement." },
    ],
  },
];

/** L'atelier lui-même. */
const outilDe = (o: Onglet) => FAMILLES.flatMap((f) => f.outils).find((x) => x.id === o);

/** Les ateliers qui répondent à ce qu'on cherche — nom, phrase ou famille. */
export function chercherAteliers(
  familles: { libelle: string; outils: Outil[] }[], recherche: string,
): Outil[] {
  const q = recherche.trim().toLowerCase();
  if (!q) return [];
  const sans = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cible = sans(q);
  return familles.flatMap((f) => f.outils.filter((o) =>
    sans(`${o.nom} ${o.quoi} ${f.libelle} ${o.cycles ?? ""}`).includes(cible)));
}

const ONGLET_MEMORISE = "fabriquer:onglet";

/** Un atelier, tel qu'on le voit avant d'entrer : ce qu'il fabrique. */
function CarteAtelier({ o, onOuvrir }: { o: Outil; onOuvrir: () => void }) {
  return (
    <button className="atelier" onClick={onOuvrir}>
      <span className="atelier-icone">{o.icone}</span>
      <span className="atelier-nom">{o.nom}</span>
      <span className="atelier-quoi">{o.quoi}</span>
      {(o.cycles || o.pictos) && (
        <span className="atelier-besoin">{[o.cycles, o.pictos ? "pictogrammes ARASAAC" : ""].filter(Boolean).join(" · ")}</span>
      )}
    </button>
  );
}

export default function Jeux() {
  // Vide : on est devant les ateliers, et non dans l'un d'eux.
  const [onglet, setOngletBrut] = React.useState<Onglet | "">(() => {
    try {
      const lu = localStorage.getItem(ONGLET_MEMORISE);
      return ONGLETS.includes(lu as Onglet) ? (lu as Onglet) : "";
    } catch {
      return "";
    }
  });
  const [recherche, setRecherche] = React.useState("");
  const setOnglet = React.useCallback((o: Onglet | "") => {
    setOngletBrut(o);
    try { localStorage.setItem(ONGLET_MEMORISE, o); } catch { /* stockage indisponible */ }
  }, []);
  useOngletDemande("jeux", ONGLETS, setOnglet);
  const [etat, setEtat] = React.useState<EtatBanque | null>(null);
  const [progression, setProgression] = React.useState<{ etape: string; faits: number; total: number } | null>(null);
  const rafraichir = React.useCallback(() => { api.arasaacEtat().then(setEtat).catch(() => {}); }, []);
  React.useEffect(rafraichir, [rafraichir]);

  React.useEffect(() => {
    const p = listen<{ etape: string; faits: number; total: number }>("arasaac://avancement", (e) => setProgression(e.payload));
    return () => { p.then((off) => off()); };
  }, []);

  const telecharger = async () => {
    setProgression({ etape: "Démarrage", faits: 0, total: 0 });
    try {
      setEtat(await api.arasaacTelecharger());
      toast("Banque ARASAAC à jour.", { icone: "✅" });
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally {
      setProgression(null);
    }
  };

  // La banque est commune au loto et aux tableaux : tant qu'elle n'est pas
  // là, ces deux onglets n'ont de quoi travailler. Les supports visuels s'en
  // passent (ils portent alors le mot seul), les problèmes en barres aussi.
  const avecPictos = (contenu: React.ReactNode) =>
    !etat ? <div /> : !etat.installee ? <Banque progression={progression} onTelecharger={telecharger} /> : contenu;

  const outil = onglet ? outilDe(onglet) : undefined;
  const trouves = chercherAteliers(FAMILLES, recherche);

  // ── Devant les ateliers ──
  if (!onglet) {
    return (
      <Page titre="Fabriquer" sous="Jeux et feuilles à imprimer : langage, sons, lecture et écriture, mathématiques — du cycle 1 au cycle 3">
        <Input value={recherche} onChange={(e) => setRecherche(e.target.value)}
          placeholder="Chercher un atelier : loto, syllabes, calcul mental, fractions, cycle 3…"
          aria-label="Chercher un atelier" style={{ maxWidth: 420, marginBottom: 16 }} />
        {recherche.trim() ? (
          trouves.length ? (
            <div className="ateliers">
              {trouves.map((o) => <CarteAtelier key={o.id} o={o} onOuvrir={() => setOnglet(o.id)} />)}
            </div>
          ) : (
            <Empty icone="🔍" titre="Aucun atelier" sous="Essayez « loto », « problèmes », « sons »…" />
          )
        ) : FAMILLES.map((f) => (
          <section key={f.id} style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <b style={{ fontSize: 15 }}>{f.libelle}</b>
              <span className="meta" style={{ fontSize: 12.5 }}>{f.aide}</span>
            </div>
            <div className="ateliers">
              {f.outils.map((o) => <CarteAtelier key={o.id} o={o} onOuvrir={() => setOnglet(o.id)} />)}
            </div>
          </section>
        ))}
      </Page>
    );
  }

  // ── Dans un atelier ──
  return (
    <Page titre={outil ? `${outil.icone} ${outil.nom}` : "Fabriquer"} sous={outil?.quoi}
      actions={<button className="btn ghost sm" onClick={() => setOnglet("")}>← Tous les ateliers</button>}>
      {outil && <CompetencesAtelier atelier={outil.id} nom={outil.nom} />}
      {outil && <ConsigneAtelier atelier={outil.id} />}
      <AtelierContext.Provider value={onglet}>
      {onglet === "partieTout" ? <PartieToutTab />
        : onglet === "multiplicatifs" ? <MultiplicatifsTab />
        : onglet === "coloriage" ? <ColoriageMagiqueTab />
        : onglet === "sons" ? <LectureSonsTab />
        : onglet === "fluence" ? <FluenceTab />
        : onglet === "syllabaire" ? <SyllabaireTab />
        : onglet === "lettres" ? <LettresTab />
        : onglet === "nombres" ? <CartesNombresTab />
        : onglet === "cubes" ? <CubesTab />
        : onglet === "calcul" ? <CartesCalculTab />
        : onglet === "arbre" ? <ArbreCalculTab />
        : onglet === "fractions" ? <FractionsTab />
        : onglet === "oie" ? <JeuDeLOieTab />
        : onglet === "martiniere" ? <MartiniereTab />
        : onglet === "compteEstBon" ? <CompteEstBonTab />
        : onglet === "pyramides" ? <PyramidesTab />
        : onglet === "heure" ? <HeureTab />
        : onglet === "numeration" ? <NumerationTab />
        : onglet === "motsMeles" ? <MotsMelesTab />
        : onglet === "phrases" ? <PhrasesTab />
        : onglet === "etiquettes" ? <EtiquettesTab banque={Boolean(etat?.installee)} />
        : onglet === "lotoSyllabes" ? avecPictos(<LotoSyllabesTab banque />)
        : onglet === "dominos" ? avecPictos(<DominosTab banque />)
        : onglet === "intrus" ? avecPictos(<IntrusTab banque />)
        : onglet === "paires" ? avecPictos(<PairesTab banque />)
        : avecPictos(etat && (
          <Loto key={onglet} gen={GENERATEURS[onglet === "jeux" ? "loto" : onglet]} atelier={onglet} etat={etat}
            progression={progression} onTelecharger={telecharger} />
        ))}
      </AtelierContext.Provider>
    </Page>
  );
}

// ── La banque ──────────────────────────────────────────────────────────────

export function Banque({ progression, onTelecharger }: {
  progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const pourcent = progression && progression.total > 0
    ? Math.round((progression.faits / progression.total) * 100) : null;
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>🗃 Banque de pictogrammes</h3>
      <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 0 }}>
        Les 13 800 pictogrammes d'ARASAAC descendent une seule fois, puis tout
        fonctionne hors ligne. Comptez environ 330 Mo et une dizaine de minutes.
        Le téléchargement reprend là où il s'est arrêté si vous le relancez.
      </p>
      {progression ? (
        <>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {progression.etape}
            {progression.total > 0 && ` — ${progression.faits} / ${progression.total}`}
          </div>
          <div style={{ height: 8, background: "var(--panel-2)", borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pourcent ?? 0}%`, background: "var(--accent)", transition: "width .3s" }} />
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={onTelecharger}>⬇ Télécharger la banque</button>
      )}
    </div>
  );
}

// ── Le loto ────────────────────────────────────────────────────────────────
//
// On choisit ses images de trois façons, qui remplissent une même sélection :
// par thème (une image par mot, cochée d'un clic), par une liste de mots
// écrite d'un trait, ou par recherche. Le hasard ne sert plus qu'à compléter,
// et une image retirée n'y revient pas.

type Mode = "theme" | "mots" | "recherche";
const PAR_PAGE = 60;

/**
 * Ce qui distingue un générateur d'un autre.
 *
 * Le choix des images est le même pour tous — thèmes, liste de mots,
 * recherche —, et c'est le plus gros de l'écran. Seules changent les options
 * d'impression et la façon de compter ce qu'il faut d'images.
 */
interface Generateur {
  /** Le nom que le moteur attend. */
  id: string;
  quoi: string;
  exemple: string;
  /** Combien d'images il faut au minimum, vu les options. */
  minimum: (o: OptionsJeu) => number;
  /** Ce qu'on dit quand il en manque. */
  manque: (o: OptionsJeu) => string;
  grilles: [string, string][];
  /** Les réglages montrés : tous n'ont pas de sens partout. */
  montre: { planches?: boolean; cartes?: boolean; libelles?: boolean };
  defauts: Partial<OptionsJeu>;
  bouton: string;
  icone: string;
}

export const GENERATEURS: Record<string, Generateur> = {
  loto: {
    id: "loto", quoi: "loto", exemple: "Loto de la famille",
    minimum: (o) => o.colonnes * o.lignes,
    manque: (o) => `Il faut au moins ${o.colonnes * o.lignes} images pour une planche ${o.colonnes} × ${o.lignes}.`,
    grilles: [["2x2", "2 × 2 — quatre cases"], ["3x2", "3 × 2 — six cases"], ["3x3", "3 × 3 — neuf cases"], ["4x3", "4 × 3 — douze cases"]],
    montre: { planches: true, cartes: true, libelles: true },
    defauts: { colonnes: 3, lignes: 2, planches: 6, cartes: true },
    bouton: "🖨 Créer le PDF du loto", icone: "🎲",
  },
  memory: {
    id: "memory", quoi: "mémory", exemple: "Mémory des animaux",
    // Une feuille de seize cartes, ce sont huit images, chacune en double.
    minimum: (o) => Math.max(2, Math.floor((o.colonnes * o.lignes) / 2)),
    manque: (o) => `Il faut au moins ${Math.max(2, Math.floor((o.colonnes * o.lignes) / 2))} images : chacune sort en double.`,
    grilles: [["3x2", "6 cartes — 3 paires"], ["4x3", "12 cartes — 6 paires"], ["4x4", "16 cartes — 8 paires"]],
    montre: { planches: true, libelles: true },
    defauts: { colonnes: 4, lignes: 4, planches: 1, cartes: false },
    bouton: "🖨 Créer le PDF du mémory", icone: "🃏",
  },
  imagier: {
    id: "imagier", quoi: "imagier", exemple: "Imagier de la cuisine",
    minimum: () => 1,
    manque: () => "Choisissez au moins une image.",
    grilles: [["1x2", "2 grandes fiches par page"], ["2x2", "4 fiches par page"], ["3x3", "9 petites fiches"]],
    // Toutes les images choisies y passent : le nombre de pages en découle.
    montre: { libelles: true },
    defauts: { colonnes: 2, lignes: 2, planches: 1, cartes: false, libelles: true },
    bouton: "🖨 Créer le PDF de l'imagier", icone: "📖",
  },
};

function Loto({ gen, atelier, etat, progression, onTelecharger }: {
  gen: Generateur;
  /** L'onglet de Fabriquer, où l'enseignant a choisi les compétences. */
  atelier: string;
  etat: EtatBanque; progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const { data: categories } = useAsync(() => api.arasaacCategories(), []);
  const [mode, setMode] = React.useState<Mode>("theme");

  // ── La sélection ──
  const [selection, setSelection] = React.useState<PictoArasaac[]>([]);
  // Retirées : le hasard ne les ramène plus (on peut toujours les recocher).
  const [retires, setRetires] = React.useState<Set<number>>(new Set());
  const choisis = React.useMemo(() => new Set(selection.map((p) => p.id)), [selection]);
  const basculer = (p: PictoArasaac) => {
    if (choisis.has(p.id)) {
      setSelection((s) => s.filter((x) => x.id !== p.id));
      setRetires((r) => new Set(r).add(p.id));
    } else {
      setSelection((s) => ajouter(s, [p]));
    }
  };
  const [variantesDe, setVariantesDe] = React.useState<PictoArasaac | null>(null);

  // ── Par thème ──
  const [q, setQ] = React.useState("");
  const [themes, setThemes] = React.useState<string[]>([]);
  const [intersection, setIntersection] = React.useState(false);
  const [sansVerbes, setSansVerbes] = React.useState(true);
  const [uneParMot, setUneParMot] = React.useState(true);
  const [filtre, setFiltre] = React.useState("");
  const [limite, setLimite] = React.useState(PAR_PAGE);
  const [vivier, setVivier] = React.useState<PictoArasaac[] | null>(null);
  React.useEffect(() => {
    setLimite(PAR_PAGE);
    if (!themes.length) { setVivier(null); return; }
    let vivant = true;
    api.arasaacSelection(themes, sansVerbes ? EXCLUES_PAR_DEFAUT : [], intersection, 0, 1)
      .then((v) => { if (vivant) setVivier(v); })
      .catch((e) => toast(String(e), { icone: "⚠️" }));
    return () => { vivant = false; };
  }, [themes, intersection, sansVerbes]);

  const visibles = React.useMemo(() => {
    const f = q.trim().toLowerCase();
    return (categories ?? [])
      .filter((c) => c.nombre >= 6)
      .filter((c) => !f || libelleCategorie(c.nom).toLowerCase().includes(f) || c.nom.toLowerCase().includes(f))
      .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
  }, [categories, q]);

  const candidatsTheme = React.useMemo(() => {
    const f = filtre.trim().toLowerCase();
    const liste = (vivier ?? []).filter((p) => !f || p.mot.toLowerCase().includes(f));
    return uneParMot ? uneImageParMot(liste) : liste.map((picto) => ({ picto, variantes: 1 }));
  }, [vivier, filtre, uneParMot]);

  // ── Par liste de mots ──
  const [texteMots, setTexteMots] = React.useState("");
  const [absents, setAbsents] = React.useState<string[]>([]);
  const ajouterMots = async () => {
    const mots = motsDeLaListe(texteMots);
    if (!mots.length) return;
    try {
      const [trouves, pasTrouves] = await api.arasaacParMots(mots);
      const avant = selection.length;
      const suite = ajouter(selection, trouves);
      setSelection(suite);
      setAbsents(pasTrouves);
      toast(`${suite.length - avant} image${suite.length - avant > 1 ? "s" : ""} ajoutée${suite.length - avant > 1 ? "s" : ""}`
        + (pasTrouves.length ? ` · ${pasTrouves.length} mot${pasTrouves.length > 1 ? "s" : ""} à chercher` : ""), { icone: "✏️" });
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
  };

  // ── Par recherche ──
  const [recherche, setRecherche] = React.useState("");
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (recherche.trim().length < 2) { setResultats([]); return; }
      api.arasaacChercher(recherche.trim(), 60).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [recherche]);
  const chercher = (mot: string) => { setMode("recherche"); setRecherche(mot); };

  // ── Impression ──
  const [options, setOptions] = React.useState<OptionsJeu>({
    libelles: false, cartes: true, colonnes: 3, lignes: 2, planches: 6, graine: 0, ...gen.defauts,
  });
  // Changer de générateur remet ses réglages : un imagier n'est pas un loto.
  React.useEffect(() => {
    setOptions((o) => ({ ...o, libelles: false, cartes: true, ...gen.defauts }));
  }, [gen]);
  const [titre, setTitre] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const minimum = gen.minimum(options);
  const parPlanche = options.colonnes * options.lignes;
  const conseille = imagesConseillees(parPlanche, options.planches);
  const [jusqua, setJusqua] = React.useState(12);
  const completer = () => {
    if (!vivier?.length) return;
    const suite = completerAuHasard(selection, vivier, retires, jusqua);
    if (suite.length === selection.length) toast("Ce thème n'a plus d'autres images.", { icone: "ℹ️" });
    setSelection(suite);
  };
  const generer = async () => {
    setOccupe(true);
    try {
      const nom = titre.trim() || themes.map(libelleCategorie).join(" + ") || gen.quoi;
      // Les compétences de l'atelier s'écrivent dans la marge haute du PDF.
      const competences = await lignesCompetencesAtelier(atelier);
      await api.jeuGenerer(gen.id, selection, { ...options, graine: Math.floor(Math.random() * 1e9), competences }, nom);
      toast(`${gen.quoi.charAt(0).toUpperCase()}${gen.quoi.slice(1)} créé — le PDF s'ouvre.`, { icone: gen.icone });
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            🗃 {etat.pictos.toLocaleString("fr")} pictogrammes · {etat.images.toLocaleString("fr")} images · {OCTETS(etat.octets)}
            {etat.derniereMaj && ` · mise à jour le ${etat.derniereMaj}`}
          </div>
          <div className="spacer" style={{ flex: 1 }} />
          {progression
            ? <span style={{ fontSize: 13 }}>{progression.etape} {progression.faits}/{progression.total}</span>
            : <button className="btn sm" onClick={onTelecharger}>🔄 Resynchroniser</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) minmax(0, 1fr)", gap: 14, alignItems: "start" }}>
        {/* ── Trouver des images ── */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>1. Trouver des images</h3>
          <div className="seg" style={{ marginBottom: 10, display: "flex" }}>
            <button className={mode === "theme" ? "active" : ""} onClick={() => setMode("theme")}>📚 Thème</button>
            <button className={mode === "mots" ? "active" : ""} onClick={() => setMode("mots")}>✏️ Mots</button>
            <button className={mode === "recherche" ? "active" : ""} onClick={() => setMode("recherche")}>🔎 Chercher</button>
          </div>

          {mode === "theme" && <>
            <Input placeholder="Chercher un thème : famille, fruits, ferme…" value={q} onChange={(e) => setQ(e.target.value)} />
            <div style={{ maxHeight: 340, overflowY: "auto", marginTop: 8, border: "1px solid var(--border)", borderRadius: 8 }}>
              {visibles.map((c) => (
                <label key={c.nom} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 13,
                  cursor: "pointer", background: themes.includes(c.nom) ? "var(--panel-2)" : undefined,
                }}>
                  <input type="checkbox" checked={themes.includes(c.nom)}
                    onChange={() => setThemes((v) => (v.includes(c.nom) ? v.filter((x) => x !== c.nom) : [...v, c.nom]))} />
                  <span style={{ flex: 1 }}>{libelleCategorie(c.nom)}</span>
                  <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.nombre}</span>
                </label>
              ))}
              {!visibles.length && <div style={{ padding: 10, fontSize: 13, color: "var(--text-2)" }}>Aucun thème.</div>}
            </div>
            {themes.length > 1 && (
              <label className="pb-coche" style={{ marginTop: 10 }}>
                <input type="checkbox" checked={intersection} onChange={(e) => setIntersection(e.target.checked)} />
                <span><b>Croiser les thèmes</b><br />
                  <span style={{ color: "var(--text-2)" }}>L'image doit appartenir à tous : « Mammifères » croisé avec « Animaux domestiques » donne la ferme.</span>
                </span>
              </label>
            )}
            <label className="pb-coche">
              <input type="checkbox" checked={sansVerbes} onChange={(e) => setSansVerbes(e.target.checked)} />
              <span><b>Écarter les verbes</b><br />
                <span style={{ color: "var(--text-2)" }}>À décocher pour un loto d'actions.</span>
              </span>
            </label>
          </>}

          {mode === "mots" && <>
            <Field label="Les mots du loto">
              <textarea className="textarea" rows={8} value={texteMots} onChange={(e) => setTexteMots(e.target.value)}
                placeholder={"papa, maman, bébé, frère, sœur…\nou un mot par ligne"} style={{ width: "100%", resize: "vertical" }} />
            </Field>
            <button className="btn primary" style={{ width: "100%" }} disabled={!motsDeLaListe(texteMots).length} onClick={ajouterMots}>
              ✏️ Ajouter ces mots
            </button>
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
              Chaque mot prend l'image qui porte exactement ce nom ; « 🔄 » en propose d'autres dessins.
            </p>
            {absents.length > 0 && (
              <div style={{ marginTop: 10, fontSize: 13 }}>
                <b>Pas trouvés tels quels :</b>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  {absents.map((m) => (
                    <button key={m} className="btn sm" onClick={() => chercher(m)} title="Chercher des images proches">🔎 {m}</button>
                  ))}
                </div>
              </div>
            )}
          </>}

          {mode === "recherche" && <>
            <Input autoFocus placeholder="Chercher une image : maman, pomme, dormir…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
            <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
              Cliquez sur une image pour l'ajouter au loto, ou la retirer.
            </p>
          </>}
        </div>

        <div>
          {/* ── Choisir ── */}
          {mode !== "mots" && (
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0 }}>2. Choisir</h3>
                {mode === "theme" && vivier && (
                  <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                    {candidatsTheme.length} {uneParMot ? "mots" : "images"}
                  </span>
                )}
                <div style={{ flex: 1 }} />
                {mode === "theme" && vivier && <>
                  <Input placeholder="Filtrer : cousin, maman…" value={filtre} onChange={(e) => setFiltre(e.target.value)} style={{ maxWidth: 200 }} />
                  <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={uneParMot} onChange={(e) => setUneParMot(e.target.checked)} /> Une image par mot
                  </label>
                </>}
              </div>
              {mode === "theme" ? (
                !vivier ? (
                  <div style={{ marginTop: 10 }}><Empty icone="📚" titre="Choisissez un thème" sous="Ses images s'affichent ici : cliquez sur celles du loto." /></div>
                ) : (
                  <>
                    <div className="loto-grille">
                      {candidatsTheme.slice(0, limite).map(({ picto, variantes }) => (
                        <Tuile key={picto.id} picto={picto} choisi={choisis.has(picto.id)} variantes={uneParMot ? variantes : 1}
                          onClick={() => basculer(picto)} />
                      ))}
                    </div>
                    {candidatsTheme.length > limite && (
                      <button className="btn sm" style={{ marginTop: 10 }} onClick={() => setLimite((l) => l + PAR_PAGE)}>
                        Afficher {Math.min(PAR_PAGE, candidatsTheme.length - limite)} de plus
                      </button>
                    )}
                  </>
                )
              ) : (
                recherche.trim().length < 2 ? (
                  <div style={{ marginTop: 10 }}><Empty icone="🔎" titre="Cherchez une image" sous="Tapez un mot à gauche." /></div>
                ) : !resultats.length ? (
                  <div style={{ marginTop: 10, fontSize: 13, color: "var(--text-2)" }}>Aucune image pour « {recherche} ».</div>
                ) : (
                  <div className="loto-grille">
                    {resultats.map((p) => <Tuile key={p.id} picto={p} choisi={choisis.has(p.id)} onClick={() => basculer(p)} />)}
                  </div>
                )
              )}
            </div>
          )}

          {/* ── La sélection ── */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>{mode === "mots" ? "2" : "3"}. Mon loto</h3>
              <span style={{ fontSize: 13, color: selection.length && selection.length < parPlanche ? "var(--danger, #b03030)" : "var(--text-2)" }}>
                {selection.length} image{selection.length > 1 ? "s" : ""}
                {selection.length < conseille && ` · ${conseille} conseillées pour ${options.planches} planches variées`}
              </span>
              <div style={{ flex: 1 }} />
              {themes.length > 0 && vivier && (
                <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
                  <button className="btn sm" onClick={completer} title="Ajoute au hasard des images du thème, d'autres mots que ceux déjà choisis">
                    🎲 Compléter au hasard jusqu'à
                  </button>
                  <Input type="number" min={1} max={80} value={jusqua} style={{ width: 64 }} aria-label="Nombre d'images voulues"
                    onChange={(e) => setJusqua(Math.max(1, Math.min(80, Number(e.target.value) || 1)))} />
                </span>
              )}
              {selection.length > 0 && (
                <button className="btn sm ghost" onClick={() => { setRetires((r) => new Set([...r, ...selection.map((p) => p.id)])); setSelection([]); }}>
                  Tout retirer
                </button>
              )}
            </div>
            {!selection.length ? (
              <div style={{ marginTop: 10 }}>
                <Empty icone="🎴" titre="Aucune image pour l'instant"
                  sous="Cochez des images d'un thème, écrivez une liste de mots ou cherchez : elles se rangent ici." />
              </div>
            ) : (
              <div className="loto-grille">
                {selection.map((p) => (
                  <Tuile key={p.id} picto={p} choisi onClick={() => basculer(p)}
                    actions={<button className="btn sm loto-variantes" title="Choisir un autre dessin pour ce mot"
                      onClick={(e) => { e.stopPropagation(); setVariantesDe(p); }}>🔄</button>} />
                ))}
              </div>
            )}
          </div>

          {/* ── Imprimer ── */}
          <div className="card">
            <h3 style={{ marginTop: 0 }}>{mode === "mots" ? "3" : "4"}. Imprimer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <Field label={`Nom du ${gen.quoi}`}>
                <Input value={titre} placeholder={themes.map(libelleCategorie).join(" + ") || gen.exemple} onChange={(e) => setTitre(e.target.value)} />
              </Field>
              <Field label={gen.id === "imagier" ? "Fiches par page" : "Grille"}>
                <Select value={`${options.colonnes}x${options.lignes}`}
                  onChange={(e) => {
                    const [c, l] = e.target.value.split("x").map(Number);
                    setOptions((o) => ({ ...o, colonnes: c, lignes: l }));
                  }}>
                  {gen.grilles.map(([v, libelle]) => <option key={v} value={v}>{libelle}</option>)}
                </Select>
              </Field>
              {gen.montre.planches && (
                <Field label={gen.id === "memory" ? "Nombre de feuilles" : "Nombre de planches"}>
                  <Input type="number" min={1} max={20} value={options.planches}
                    onChange={(e) => setOptions((o) => ({ ...o, planches: Math.max(1, Math.min(20, Number(e.target.value) || 1)) }))} />
                </Field>
              )}
            </div>
            {gen.montre.libelles && (
              <label className="pb-coche">
                <input type="checkbox" checked={options.libelles} onChange={(e) => setOptions((o) => ({ ...o, libelles: e.target.checked }))} />
                <span><b>Écrire le mot sous l'image</b><br />
                  <span style={{ color: "var(--text-2)" }}>
                    {gen.id === "imagier"
                      ? "Un imagier sans mot devient un jeu de cartes : à vous de voir."
                      : "Pour un non-lecteur, le texte n'apporte rien et charge l'image."}
                  </span>
                </span>
              </label>
            )}
            {gen.montre.cartes && (
              <label className="pb-coche">
                <input type="checkbox" checked={options.cartes} onChange={(e) => setOptions((o) => ({ ...o, cartes: e.target.checked }))} />
                <span><b>Ajouter les cartes à découper</b></span>
              </label>
            )}
            {selection.length > 0 && selection.length < minimum && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger, #b03030)" }}>{gen.manque(options)}</div>
            )}
            <BoutonBureau className="btn" disabled={occupe || selection.length < minimum} onEnregistrer={async () => {
              const nom = titre.trim() || themes.map(libelleCategorie).join(" + ") || gen.quoi;
              const competences = await lignesCompetencesAtelier(atelier);
              const chemin = await api.jeuGenerer(gen.id, selection, { ...options, graine: Math.floor(Math.random() * 1e9), competences }, nom, false);
              return deposerSurLeBureau(atelier, nom, await api.fichierImporterDepuisChemin(chemin));
            }} />
            <button className="btn primary" style={{ marginTop: 12 }} disabled={occupe || selection.length < minimum} onClick={generer}>
              {occupe ? "Création…" : gen.bouton}
            </button>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, marginBottom: 0 }}>
              Pictogrammes ARASAAC — auteur Sergio Palao, origine Gouvernement d'Aragon,
              licence CC BY-NC-SA. L'attribution est portée sur chaque page. Usage
              pédagogique non commercial.
            </p>
          </div>
        </div>
      </div>

      {variantesDe && (
        <Variantes picto={variantesDe} onClose={() => setVariantesDe(null)}
          onChoisir={(p) => { setSelection((s) => remplacer(s, variantesDe.id, p)); setVariantesDe(null); }} />
      )}
    </>
  );
}

/** Une image à cocher : cadre coloré et coche quand elle est dans le loto. */
function Tuile({ picto, choisi, variantes = 1, onClick, actions }: {
  picto: PictoArasaac; choisi: boolean; variantes?: number; onClick: () => void; actions?: React.ReactNode;
}) {
  const src = usePictoImage(picto.id);
  return (
    <div className={`loto-tuile${choisi ? " choisie" : ""}`}>
      <button type="button" className="loto-tuile-bouton" onClick={onClick}
        title={choisi ? `Retirer « ${picto.mot} » du loto` : `Ajouter « ${picto.mot} » au loto`} aria-pressed={choisi}>
        {src ? <img src={src} alt="" /> : <div className="loto-tuile-vide" />}
        <span className="loto-tuile-mot">{picto.mot}</span>
        {choisi && <span className="loto-coche" aria-hidden="true">✓</span>}
        {variantes > 1 && <span className="loto-nb-variantes" title={`${variantes} dessins pour ce mot`}>+{variantes - 1}</span>}
      </button>
      {actions}
    </div>
  );
}

/** Les autres dessins d'un mot, pour remplacer celui du loto. */
function Variantes({ picto, onClose, onChoisir }: {
  picto: PictoArasaac; onClose: () => void; onChoisir: (p: PictoArasaac) => void;
}) {
  const [liste, setListe] = React.useState<PictoArasaac[] | null>(null);
  React.useEffect(() => {
    api.arasaacChercher(picto.mot, 48).then(setListe).catch(() => setListe([]));
  }, [picto.mot]);
  return (
    <Modal titre={`Autres dessins pour « ${picto.mot} »`} onClose={onClose} large
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {!liste ? <div style={{ fontSize: 13, color: "var(--text-2)" }}>Recherche…</div> : (
        <div className="loto-grille">
          {liste.map((p) => <Tuile key={p.id} picto={p} choisi={p.id === picto.id} onClick={() => onChoisir(p)} />)}
        </div>
      )}
    </Modal>
  );
}
