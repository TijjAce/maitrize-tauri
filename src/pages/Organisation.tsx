import React from "react";
import { useNavigate } from "react-router-dom";
import { Page } from "../App";
import {
  api, ProgrammationFinale, ProgressionAnnuelle, Sequence, Seance, Ami, Eleve, anneeScolaireActuelle, MATIERES, NIVEAUX_SCOLAIRES, texteErreur,
  HEURES_PROGRAMME, couleurHex, couleurPourMatiere, getMatiereOverrides, matiereDuDomaine, newId, telechargerTexte,
} from "../api";
import { Empty, Input, Select, Modal, ColorPicker, useAsync, useSegmentNav, useOngletDemande } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { toast, toastAnnulable } from "../components/Toaster";
import { Aide } from "../components/Aide";
import { chargerVacances, periodesDeLAnnee, type PeriodeDeClasse } from "../vacances";
import { isoJour } from "../dates";
import { ecrituresTerminees, useCollectionParEcart } from "../ecritureParEcart";
import { COULEUR_PERIODE, htmlPeriode, htmlProgrammation, type LigneProgrammation, type TableauDePeriode } from "../organisationHtml";
import {
  cleNiveauDeLAnnee, copieDesDomaines, deplacerLigne, estALaClasse, ligneNeuve, lireLignes, niveauxDeLAnnee, programmationDe, remettreLigne,
  sourcesDeDomaines, teintesDesLignes,
} from "../programmationAnnuelle";
import {
  avecCase, avecSeances, casesDeLaColonne, cleCase, cleNiveauAjoute, copieDesColonnes, datesDeLaSemaine, deplacerColonne, enJson, ETAT_VIDE, LA_CLASSE,
  lireEtat, memeEtat, niveauxDeLaProgression, nombreDeSemaines, progressionDe, remettreColonne, remplie, sansColonne, semainesDeLaPeriode,
  tableauSansNiveau,
  sourcesDeColonnes, titreConnu, titresProposes, type Colonne, type EtatProg, type GroupeDeTitres, type SemaineDeClasse, type SourceDeColonnes,
} from "../progressionAnnuelle";
import { labelCourt, CompetenceSelectionnee } from "../components/CompetenceTree";
import { choisirCouleurMatiere, teinteSequence } from "../api";
import { printHTML, escapeHtml } from "../print";
import { PlanSalleTab } from "./PlanSalle";
import { ProjetPedagogiqueTab } from "./ProjetPedagogique";
import { InformationsTab } from "./Informations";
import { PagesDeGardeTab } from "./PagesDeGarde";
import { confirmer } from "../components/confirmer";
import { tempsDeLaSemaineType, natureDuSlot, type SlotEdt } from "../organisation";
import { lireNiveaux } from "../classe";
import { duree, plageGrille } from "../heures";
import { ProgrammationIme } from "../components/ProgrammationIme";
import { IndicateurZoom, useZoomPince } from "../components/ZoomPince";

/** Chip de période coloré (P1…P5), sélectionné ou grisé. */
function PeriodeChip({ p, selected, onClick }: { p: number; selected: boolean; onClick: () => void }) {
  const c = COULEUR_PERIODE[p];
  return (
    <button onClick={onClick}
      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 11px", borderRadius: 9,
        border: `1px solid ${selected ? c : "var(--border)"}`, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
        background: selected ? c : "var(--panel-2)", color: selected ? "#fff" : "var(--text-2)",
        boxShadow: selected ? `0 2px 6px ${c}55` : "none" }}>
      <span style={{ background: "rgba(255,255,255,.22)", borderRadius: 100, padding: "1px 6px", fontSize: 10,
        display: selected ? "inline" : "none" }}>P{p}</span>
      {!selected && `P${p}`}{selected && `Période ${p}`}
    </button>
  );
}

/** La période à imprimer : le tableau de la classe puis ceux des niveaux, leurs semaines datées, les retours à la ligne des cases. */
function imprimerProgression(annee: string, periode: number, tableaux: TableauDePeriode[], semainesCal: SemaineDeClasse[], nomSeance: (id: string) => string | undefined) {
  printHTML(`Progression ${annee} P${periode}`, htmlPeriode(annee, periode, tableaux, semainesCal, nomSeance));
}

/** « S2 · Compter jusqu'à 5 » : une séance placée, telle qu'on l'imprime. */
const nomDeSeance = (seances: Seance[]) => (id: string) => {
  const s = seances.find((x) => x.id === id);
  return s ? `S${s.numero} · ${s.titre || "Sans titre"}` : undefined;
};

const SEGMENTS = [
  { id: "prog", label: "Programmation" },
  { id: "annuelle", label: "Progression" },
  { id: "edt", label: "Emploi du temps" },
  { id: "cycle", label: "Travail de cycle" },
  { id: "salle", label: "Plan de salle" },
  { id: "projet", label: "Projet pédagogique" },
  { id: "infos", label: "Informations" },
  { id: "garde", label: "Pages de garde" },
] as const;
type SegId = typeof SEGMENTS[number]["id"];


// Liste d'années scolaires autour de l'année courante (pour le sélecteur).
function anneesScolaires(courante: string): string[] {
  const startY = parseInt(courante.slice(0, 4), 10) || new Date().getFullYear();
  const arr: string[] = [];
  for (let y = startY - 2; y <= startY + 2; y++) arr.push(`${y}-${y + 1}`);
  return arr;
}
/** Sélecteur d'année scolaire (remplace l'étiquette figée). */
function AnneeSelect({ annee, setAnnee }: { annee: string; setAnnee: (a: string) => void }) {
  const opts = anneesScolaires(anneeScolaireActuelle());
  const all = opts.includes(annee) ? opts : [...opts, annee].sort();
  return (
    <Select value={annee} onChange={(e) => setAnnee(e.target.value)} style={{ maxWidth: 170, fontWeight: 600 }}>
      {all.map((a) => <option key={a} value={a}>Année {a}</option>)}
    </Select>
  );
}

const SOUS_TITRE = "Programmation, progression annuelle, emploi du temps et travail de cycle";
export default function Organisation() {
  const [onglet, setOnglet] = React.useState<SegId>("prog");
  const segments = React.useMemo(() => SEGMENTS.slice(), []);
  // Année sélectionnée mémorisée d'une session à l'autre (réglage « anneeCourante »).
  const [annee, setAnneeState] = React.useState(anneeScolaireActuelle());
  React.useEffect(() => { api.settingGet("anneeCourante").then((v) => { if (v) setAnneeState(v); }); }, []);
  const setAnnee = (a: string) => { setAnneeState(a); api.settingSet("anneeCourante", a); };
  useSegmentNav(segments.map((s) => s.id), onglet, setOnglet);
  useOngletDemande("organisation", segments.map((s) => s.id), setOnglet);
  const props = { annee, setAnnee };
  return (
    <Page titre="Organisation" sous={SOUS_TITRE}>
      <div className="onglets">
        {segments.map((s) => <button key={s.id} className={onglet === s.id ? "active" : ""} onClick={() => setOnglet(s.id)}>{s.label}</button>)}
      </div>
      {onglet === "prog" ? <Programmation {...props} />
        : onglet === "annuelle" ? <ProgressionAnnuelleVue {...props} />
        : onglet === "edt" ? <EdtType {...props} />
        : onglet === "salle" ? <PlanSalleTab />
        : onglet === "projet" ? <ProjetPedagogiqueTab annee={annee} />
        : onglet === "infos" ? <InformationsTab annee={annee} />
        : onglet === "garde" ? <PagesDeGardeTab annee={annee} />
        : <TravailDeCycle {...props} />}
    </Page>
  );
}

interface AnneeProps { annee: string; setAnnee: (a: string) => void }

// ── Progression annuelle : par niveau et par période, semaines × colonnes ──
//
// Une classe à plusieurs niveaux tient une progression par niveau dans la
// même année ; celles d'avant, sans niveau, valent pour tous. Les colonnes
// se tirent des matières et domaines de Réglages et des intitulés de
// l'emploi du temps, et en prennent la couleur.
//
// Rien de ce qu'on tape ne doit se perdre : chaque écriture n'envoie que
// l'écart avec ce que l'écran montrait (voir `progression_annuelle_ecrire`),
// une à la fois par progression, et l'écran relit ce qui arrive d'un autre
// ordinateur dès qu'il n'a plus rien en route.

/** Les titres que proposent colonnes et domaines : matières et domaines de Réglages, intitulés de l'emploi du temps. */
function useSourcesDeTitres(): GroupeDeTitres[] {
  const [sources, setSources] = React.useState<GroupeDeTitres[]>([{ groupe: "Matières", titres: MATIERES }]);
  React.useEffect(() => {
    let vivant = true;
    Promise.all([api.referentielsList().catch(() => []), api.edtTypiqueList().catch(() => [])]).then(([refs, edts]) => {
      const domaines = refs.filter((r) => r.actif).flatMap((r) => {
        try { return ((JSON.parse(r.donnees)?.domaines ?? []) as { titre?: string }[]).map((d) => d.titre ?? ""); } catch { return []; }
      });
      const duPlanning = edts.flatMap((e) => { try { return (JSON.parse(e.slotsJson) as SlotEdt[]).map((s) => s.titre ?? ""); } catch { return []; } });
      const choisis = Object.keys(getMatiereOverrides()).filter((m) => !MATIERES.includes(m) && !matiereDuDomaine(m));
      const intitules = [...new Set([...duPlanning, ...choisis].map((t) => t.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
      if (vivant) setSources([{ groupe: "Matières", titres: MATIERES }, { groupe: "Domaines de vos référentiels", titres: domaines }, { groupe: "Emploi du temps", titres: intitules }]);
    });
    return () => { vivant = false; };
  }, []);
  return sources;
}

/** La couleur d'un titre : celle que lui donne Réglages s'il vient de ses listes, sinon la sienne. */
const teinteDuTitre = (sources: GroupeDeTitres[], titre: string, couleur?: string) =>
  couleurHex[titreConnu(sources, titre) ? couleurPourMatiere(titre) : couleur ?? "blue"] ?? couleurHex.blue;

/** Les périodes de l'année scolaire, datées quand le calendrier de la zone est connu. */
function usePeriodesDeLAnnee(annee: string): PeriodeDeClasse[] {
  const [periodes, setPeriodes] = React.useState<PeriodeDeClasse[]>([]);
  React.useEffect(() => {
    let vivant = true;
    chargerVacances(isoJour(new Date())).then((v) => { if (vivant) setPeriodes(periodesDeLAnnee(v, parseInt(annee.slice(0, 4), 10))); })
      .catch(() => { if (vivant) setPeriodes([]); });
    return () => { vivant = false; };
  }, [annee]);
  return periodes;
}

interface Cible { annee: string; niveau: string; periode: number }
const cleCible = (c: Cible) => `${c.annee}|${c.niveau}|${c.periode}`;
const lireCle = (k: string): Cible => { const [a, n, p] = k.split("|"); return { annee: a, niveau: n, periode: Number(p) }; };

function ProgressionAnnuelleVue({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.progressionsAnnuelleList(), []);
  const liste = React.useMemo(() => data ?? [], [data]);
  // Les séquences et leurs séances, qu'on place dans les cases.
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const { data: seances } = useAsync(() => api.seancesList(), []);
  const [periode, setPeriode] = React.useState(1);
  // Les niveaux ajoutés à l'année par « + Niveau », le temps qu'ils reçoivent leur progression.
  const [ajoutes, setAjoutes] = React.useState<string[]>([]);
  // Le tableau où l'on travaille : c'est lui que ⌘Z annule.
  const [actif, setActif] = React.useState("");
  // Un niveau vaut pour l'année : il a son tableau à chaque période.
  const niveaux = niveauxDeLaProgression(NIVEAUX_SCOLAIRES, liste, annee, ajoutes);
  const avecClasse = tableauSansNiveau(liste, annee, niveaux);
  const libres = NIVEAUX_SCOLAIRES.filter((n) => !niveaux.includes(n));

  // Les titres proposés, et la couleur qu'ils donnent à leur colonne.
  const sources = useSourcesDeTitres();
  const teinte = (c: Colonne) => teinteDuTitre(sources, c.titre, c.couleur);

  // Les semaines de la période, datées quand le calendrier de la zone est connu.
  const periodesCal = usePeriodesDeLAnnee(annee);
  const periodeCal = periodesCal.find((p) => p.numero === periode);
  const semainesCal = periodeCal ? semainesDeLaPeriode(periodeCal) : [];
  const dates = periodeCal ? `${datesDeLaSemaine({ numero: 0, debut: periodeCal.debut, fin: periodeCal.fin })} · ${semainesCal.length} semaines` : "";

  // Ce que montre chaque tableau, pour imprimer la période entière.
  const etats = React.useRef(new Map<string, EtatProg>());
  const tableaux = [...(avecClasse ? [""] : []), ...niveaux];
  const etatDe = (n: string) => etats.current.get(cleCible({ annee, niveau: n, periode })) ?? lireEtat(progressionDe(liste, annee, n, periode));
  const imprimer = () => imprimerProgression(annee, periode, tableaux.map((n) => {
    const e = etatDe(n);
    return { niveau: n, colonnes: e.colonnes.map((c) => ({ ...c, teinte: teinte(c) })), cellules: e.cellules, seances: e.seances };
  }), semainesCal, nomDeSeance(seances ?? []));

  const ajouterNiveau = (e: React.MouseEvent) => openCtx(e, libres.map((n) => ({
    label: n, onClick: () => { setAjoutes((a) => [...a, cleNiveauAjoute(annee, n)]); setActif(n); },
  })));
  /** Donne au tableau `de` le niveau `vers`, pour toute l'année ; vide : sans niveau. */
  const changerNiveau = async (de: string, vers: string) => {
    await ecrituresTerminees();
    try {
      await api.progressionAnnuelleNiveau(annee, de, vers);
      setAjoutes((a) => [...a.filter((k) => k !== cleNiveauAjoute(annee, de)), ...(vers ? [cleNiveauAjoute(annee, vers)] : [])]);
      setActif(vers);
      reload();
    } catch (err) { toast(texteErreur(err), { icone: "⚠️" }); }
  };
  /** Retire un niveau de l'année : ses progressions se vident, et reviennent par « Annuler ». */
  const retirerNiveau = async (n: string) => {
    await ecrituresTerminees();
    try {
      const siennes = (await api.progressionsAnnuelleList()).filter((p) => p.annee === annee && (p.niveau ?? "") === n && remplie(p));
      const avant = siennes.map((p) => ({ periode: p.periode, etat: lireEtat(p) }));
      setAjoutes((a) => a.filter((k) => k !== cleNiveauAjoute(annee, n)));
      for (const x of avant) await api.progressionAnnuelleEcrire(annee, n, x.periode, enJson(x.etat), enJson(ETAT_VIDE));
      reload();
      toastAnnulable(`${n} retiré de la progression ${annee}.`, async () => {
        for (const x of avant) await api.progressionAnnuelleEcrire(annee, n, x.periode, enJson(ETAT_VIDE), enJson(x.etat));
        setAjoutes((a) => [...a, cleNiveauAjoute(annee, n)]);
        reload();
      });
    } catch (err) { toast(`Niveau non retiré : ${texteErreur(err)}`, { icone: "⚠️" }); }
  };

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} />
        <div className="spacer" />
        {/* Ce qui est enregistré dit s'il y a de quoi imprimer : l'écran des tableaux ne se lit qu'après leur rendu. */}
        <button className="btn" onClick={imprimer}
          disabled={tableaux.every((n) => lireEtat(progressionDe(liste, annee, n, periode)).colonnes.length === 0)}>🖨 PDF</button>
      </div>
      <div className="prog-periodes">
        {[1, 2, 3, 4, 5].map((p) => <PeriodeChip key={p} p={p} selected={periode === p} onClick={() => setPeriode(p)} />)}
        {dates && <span className="meta">{dates}</span>}
      </div>
      {tableaux.map((n) => (
        <SectionProgression key={n || "classe"} cible={{ annee, niveau: n, periode }} liste={liste} lecture={data} relire={reload}
          sources={sources} teinte={teinte} semainesCal={semainesCal} clavier={actif === n} onActif={() => setActif(n)}
          surEtat={(e) => etats.current.set(cleCible({ annee, niveau: n, periode }), e)}
          sequences={sequences ?? []} seances={seances ?? []}
          niveauUI={<NiveauDuTableau niveau={n} libres={libres} sansNiveau={!avecClasse} quoi="cette progression"
            onChanger={(vers) => { void changerNiveau(n, vers); }} onRetirer={n ? () => { void retirerNiveau(n); } : undefined} />} />
      ))}
      <div className="prog-ajout-niveau">
        <button className="btn" onClick={ajouterNiveau} disabled={!libres.length} title="Ajouter à l'année la progression d'un niveau">+ Niveau</button>
      </div>
    </>
  );
}

/**
 * Le niveau d'un tableau, en tête : on le donne, on en change, on le retire.
 * Chaque progression et chaque programmation peut avoir le sien (l'enseignant,
 * octobre 2026) ; il vaut pour toute l'année.
 */
function NiveauDuTableau({ niveau, libres, sansNiveau, quoi, onChanger, onRetirer }: {
  niveau: string; libres: string[];
  /** Vrai si le tableau peut redevenir sans niveau : il n'y en a pas déjà un. */
  sansNiveau: boolean;
  /** « cette progression », « cette programmation » : pour le titre du bouton. */
  quoi: string;
  onChanger: (vers: string) => void; onRetirer?: () => void;
}) {
  const vers = libres.map((n) => ({ label: n, onClick: () => onChanger(n) }));
  if (!niveau) {
    return (
      <button className="btn sm ghost prog-niveau-vide" disabled={!libres.length}
        onClick={(e) => openCtx(e, vers)} title={`Donner un niveau de classe à ${quoi}`}>Niveau…</button>
    );
  }
  const menu = (e: React.MouseEvent) => openCtx(e, [
    ...(libres.length ? [{ label: "Changer de niveau", icon: "🔁", enfants: vers }] : []),
    ...(sansNiveau ? [{ label: "Sans niveau", icon: "∅", onClick: () => onChanger("") }] : []),
    ...(onRetirer ? [{ label: `Retirer ${niveau} de l'année`, icon: "🗑", danger: true, sep: true, onClick: onRetirer }] : []),
  ]);
  return (
    <button className="prog-niveau" onClick={menu} title={`Le niveau de ${quoi} : en changer, ou le retirer`}>
      {niveau}<span aria-hidden="true"> ▾</span>
    </button>
  );
}

/**
 * Le tableau d'une progression : celle de la classe, ou d'un niveau ajouté à
 * la période. Il s'écrit par écart, comme tout ce qui se range en collection.
 */
function SectionProgression({ cible, liste, lecture, relire, sources, teinte, semainesCal, clavier, onActif, surEtat, niveauUI, sequences, seances }: {
  cible: Cible; liste: ProgressionAnnuelle[]; lecture: unknown; relire: () => void;
  sources: GroupeDeTitres[]; teinte: (c: Colonne) => string; semainesCal: SemaineDeClasse[];
  clavier: boolean; onActif: () => void; surEtat: (e: EtatProg) => void;
  /** Le niveau du tableau, en tête : voir `NiveauDuTableau`. */
  niveauUI: React.ReactNode;
  /** Les séquences et leurs séances, à placer dans les cases. */
  sequences: Sequence[]; seances: Seance[];
}) {
  const { annee, niveau, periode } = cible;
  const cle = cleCible(cible);
  const prog = progressionDe(liste, annee, niveau, periode);
  const { present: etat, commit, modifier } = useCollectionParEcart<EtatProg>({
    cle, lecture, vide: ETAT_VIDE, relire, pareil: memeEtat, echec: "Progression non enregistrée", clavier,
    enBase: (k) => { const c = lireCle(k); return lireEtat(progressionDe(liste, c.annee, c.niveau, c.periode)); },
    ecrire: (k, avant, apres) => { const c = lireCle(k); return api.progressionAnnuelleEcrire(c.annee, c.niveau, c.periode, enJson(avant), enJson(apres)); },
  });
  surEtat(etat);

  const { colonnes, cellules, seances: placees } = etat;
  const nb = nombreDeSemaines(semainesCal.length, cellules, placees);
  // La case où l'on place des séances.
  const [placer, setPlacer] = React.useState<{ semaine: number; colonne: Colonne } | null>(null);
  const semaines = Array.from({ length: nb }, (_, i) => {
    const s = semainesCal[i];
    return { numero: i + 1, dates: s ? datesDeLaSemaine(s) : "" };
  });

  const [editCol, setEditCol] = React.useState<{ colonne: Colonne; nouvelle: boolean } | null>(null);
  const ajouterCol = () => setEditCol({ colonne: { id: newId(), titre: "", couleur: "blue" }, nouvelle: true });
  const validerCol = (c: Colonne) => {
    const existe = colonnes.some((x) => x.id === c.id);
    commit({ ...etat, colonnes: existe ? colonnes.map((x) => (x.id === c.id ? c : x)) : [...colonnes, c] });
    setEditCol(null);
  };
  const supprimerCol = (c: Colonne) => {
    const ici = cleCible(cible);
    const place = colonnes.findIndex((x) => x.id === c.id);
    const cases = casesDeLaColonne(etat, c.id);
    const n = new Set([...Object.keys(cases.cellules), ...Object.keys(cases.seances)]).size;
    commit(sansColonne(etat, c.id));
    setEditCol(null);
    toastAnnulable(`Colonne « ${c.titre || "sans titre"} » supprimée${n ? `, avec ${n} case${n > 1 ? "s" : ""}` : ""}.`,
      () => modifier(ici, (e) => remettreColonne(e, c, place, cases)));
  };
  const menuCol = (e: React.MouseEvent, c: Colonne) => {
    const i = colonnes.findIndex((x) => x.id === c.id);
    openCtx(e, [
      { label: "Modifier…", icon: "✏️", onClick: () => setEditCol({ colonne: c, nouvelle: false }) },
      ...(i > 0 ? [{ label: "Déplacer à gauche", icon: "←", onClick: () => commit(deplacerColonne(etat, c.id, -1)) }] : []),
      ...(i < colonnes.length - 1 ? [{ label: "Déplacer à droite", icon: "→", onClick: () => commit(deplacerColonne(etat, c.id, 1)) }] : []),
      { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimerCol(c) },
    ]);
  };
  const setCase = (semaine: number, colonne: string, texte: string) => commit(avecCase(etat, semaine, colonne, texte));
  const reprises = colonnes.length === 0 ? sourcesDeColonnes(liste, annee, niveau, periode) : [];
  const reprendre = (src: SourceDeColonnes) => commit({ ...etat, colonnes: copieDesColonnes(src.colonnes, newId) });

  // ── Export / Import JSON (format compatible app native) ───────────────
  // L'année est neutralisée à l'export (champ vide) : à l'import, le tableau
  // atterrit sur l'année, le niveau et la période affichés, comme dans l'app
  // native — pratique pour partager en travail de cycle.
  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => {
    const { colonnesJson, cellulesJson, seancesJson } = enJson(etat);
    const bundle = {
      version: 4, type: "progression", dateExport: new Date().toISOString(), appVersion: "tauri",
      progressionsAnnuelles: [{ id: prog?.id ?? newId(), annee: "", periode, niveau, colonnesJSON: colonnesJson, cellulesJSON: cellulesJson, seancesJSON: seancesJson }],
    };
    const d = new Date().toISOString().slice(0, 10);
    telechargerTexte(`Progression_${annee}_${niveau || "classe"}_P${periode}_${d}.json`, JSON.stringify(bundle, null, 2));
  };
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      // Formats acceptés : export ciblé natif (progressionsAnnuelles), backup
      // complet (même clé), ou forme simple { colonnes, cellules }.
      const dtos: { periode?: number; colonnesJSON?: string; cellulesJSON?: string; seancesJSON?: string }[] =
        b.progressionsAnnuelles ?? (b.colonnes ? [{ periode, colonnesJSON: JSON.stringify(b.colonnes), cellulesJSON: JSON.stringify(b.cellules ?? {}) }] : []);
      if (dtos.length === 0) throw new Error();
      // On privilégie le tableau correspondant à la période affichée, sinon le premier.
      const dto = dtos.find((d) => d.periode === periode) ?? dtos[0];
      const recu = lireEtat({ colonnesJson: dto.colonnesJSON || "[]", cellulesJson: dto.cellulesJSON || "{}", seancesJson: dto.seancesJSON || "{}" });
      if (recu.colonnes.length === 0) throw new Error();
      if (colonnes.length > 0 && !(await confirmer("Remplacer ce tableau par celui du fichier ?", { oui: "Remplacer", danger: true }))) return;
      commit(recu);
    } catch { toast("Fichier de progression invalide.", { icone: "⚠️" }); }
  };
  const menuTableau = (e: React.MouseEvent) => openCtx(e, [
    ...(colonnes.length > 0 ? [{ label: "Exporter ce tableau", icon: "⬇️", onClick: exporter }] : []),
    { label: "Importer un tableau…", icon: "⬆️", onClick: () => fileRef.current?.click() },
  ]);

  return (
    <section className="prog-section" onFocusCapture={onActif} onMouseDown={onActif}>
      <div className="prog-section-tete">
        {niveauUI}
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importer(f); e.target.value = ""; }} />
        <button className="btn sm" onClick={ajouterCol}>+ Colonne</button>
        <button className="btn sm ghost" aria-label={`Actions du tableau ${niveau || LA_CLASSE}`} onClick={menuTableau}>⋯</button>
      </div>
      {colonnes.length === 0 ? (
        <div className="prog-vide">
          <Empty icone="📅" titre={`${niveau ? `${niveau} · ` : ""}P${periode} : aucune colonne`} />
          <div className="prog-vide-actions">
            {reprises.map((s) => (
              <button key={s.libelle} className="btn" onClick={() => reprendre(s)}>
                Reprendre les colonnes de {s.libelle} ({s.colonnes.map((c) => c.titre).join(", ")})
              </button>
            ))}
            <button className="btn primary" onClick={ajouterCol}>+ Colonne</button>
          </div>
        </div>
      ) : (
        <div className="prog-cadre">
          <table className="prog-tableau">
            <colgroup><col style={{ width: 96 }} />{colonnes.map((c) => <col key={c.id} />)}</colgroup>
            <thead>
              <tr>
                <th className="prog-semaine">Semaine</th>
                {colonnes.map((c) => (
                  <th key={c.id} onContextMenu={(e) => menuCol(e, c)}>
                    <div className="prog-entete" style={{ "--couleur": teinte(c) } as React.CSSProperties}>
                      <button className="prog-titre" onClick={() => setEditCol({ colonne: c, nouvelle: false })} title="Modifier la colonne">
                        {c.titre || "Sans titre"}
                      </button>
                      <button className="prog-plus" aria-label={`Actions de la colonne ${c.titre}`} onClick={(e) => menuCol(e, c)}>⋯</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {semaines.map((s) => (
                <tr key={s.numero}>
                  <td className="prog-semaine"><b>S{s.numero}</b>{s.dates && <span>{s.dates}</span>}</td>
                  {colonnes.map((c) => (
                    <td key={c.id} className="prog-case" style={{ "--couleur": teinte(c) } as React.CSSProperties}>
                      <div className="progm-case-haut un-bouton">
                        <CaseProgression valeur={cellules[cleCase(s.numero, c.id)] ?? ""} onChange={(v) => setCase(s.numero, c.id, v)}
                          libelle={`${niveau ? `${niveau}, ` : ""}${c.titre}, semaine ${s.numero}`} />
                        {/* Au coin de la case, au survol : y placer des séances de ses séquences. */}
                        <div className="progm-coin">
                          <button className="progm-lier" title="Placer des séances" aria-label={`Placer des séances, ${c.titre}, semaine ${s.numero}`}
                            onClick={() => setPlacer({ semaine: s.numero, colonne: c })}>📚</button>
                        </div>
                      </div>
                      <SeancesPlacees ids={placees[cleCase(s.numero, c.id)] ?? []} seances={seances} sequences={sequences} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editCol && <ColonneForm colonne={editCol.colonne} nouvelle={editCol.nouvelle} sources={sources} teinte={teinte}
        onClose={() => setEditCol(null)} onValider={validerCol} onSupprimer={editCol.nouvelle ? undefined : () => supprimerCol(editCol.colonne)} />}
      {placer && (
        <ChoisirSeances titre={placer.colonne.titre} semaine={placer.semaine} niveau={niveau} periode={periode}
          sequences={sequences} seances={seances} selection={placees[cleCase(placer.semaine, placer.colonne.id)] ?? []}
          onClose={() => setPlacer(null)}
          onValider={(ids) => { commit(avecSeances(etat, placer.semaine, placer.colonne.id, ids)); setPlacer(null); }} />
      )}
    </section>
  );
}

/** Les séances placées dans une case : un clic ouvre la séance dans sa séquence. */
function SeancesPlacees({ ids, seances, sequences }: { ids: string[]; seances: Seance[]; sequences: Sequence[] }) {
  const nav = useNavigate();
  const trouvees = ids.map((id) => seances.find((s) => s.id === id)).filter((s): s is Seance => !!s);
  if (!trouvees.length) return null;
  return (
    <div className="prog-seances">
      {trouvees.map((s) => {
        const seq = sequences.find((x) => x.id === s.sequenceId);
        return (
          <button key={s.id} className="chip prog-seance" title={seq ? `Séquence « ${seq.titre} »` : "Séance"}
            onClick={() => { if (seq) nav(`/sequences/${seq.id}?seance=${s.id}`); }}>
            <span className="dot" style={{ background: seq ? teinteSequence(seq) : "var(--border)" }} />
            <span className="prog-seance-nom">S{s.numero} · {s.titre || "Sans titre"}</span>
          </button>
        );
      })}
    </div>
  );
}

const sansAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Placer des séances dans une case : celles des séquences de la matière de la
 * colonne d'abord — du niveau du tableau et de la période, en tête —, puis
 * les autres, repliées.
 */
function ChoisirSeances({ titre, semaine, niveau, periode, sequences, seances, selection, onClose, onValider }: {
  titre: string; semaine: number; niveau: string; periode: number;
  sequences: Sequence[]; seances: Seance[]; selection: string[];
  onClose: () => void; onValider: (ids: string[]) => void;
}) {
  // Une séance supprimée depuis ne reste pas cochée en silence.
  const [sel, setSel] = React.useState<string[]>(() => selection.filter((id) => seances.some((s) => s.id === id)));
  const [cherche, setCherche] = React.useState("");
  const parSequence = React.useMemo(() => {
    const m = new Map<string, Seance[]>();
    for (const s of seances) if (s.sequenceId) m.set(s.sequenceId, [...(m.get(s.sequenceId) ?? []), s]);
    for (const l of m.values()) l.sort((a, b) => a.numero - b.numero);
    return m;
  }, [seances]);
  const q = sansAccents(cherche.trim());
  const visibles = sequences.filter((x) => (parSequence.get(x.id)?.length ?? 0) > 0)
    .filter((x) => !q || sansAccents(x.titre).includes(q) || (parSequence.get(x.id) ?? []).some((s) => sansAccents(s.titre).includes(q)));
  const correspond = (x: Sequence) => sansAccents(x.matiere) === sansAccents(titre) || matiereDuDomaine(titre) === x.matiere;
  const rang = (x: Sequence) => (niveau && x.niveau && x.niveau !== niveau ? 2 : 0) + (x.periode === periode ? 0 : 1);
  const tri = (a: Sequence, b: Sequence) => rang(a) - rang(b) || a.titre.localeCompare(b.titre, "fr");
  const siennes = visibles.filter(correspond).sort(tri);
  const autres = visibles.filter((x) => !correspond(x)).sort(tri);
  const basculer = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const bloc = (x: Sequence) => (
    <div key={x.id} className="choix-seq">
      <div className="choix-seq-titre">
        <span className="dot" style={{ background: teinteSequence(x) }} />{x.titre || "Sans titre"}
        <span className="meta">{[x.matiere, x.niveau, x.periode ? `P${x.periode}` : ""].filter(Boolean).join(" · ")}</span>
      </div>
      {(parSequence.get(x.id) ?? []).map((s) => (
        <label key={s.id} className="choix-seance">
          <input type="checkbox" checked={sel.includes(s.id)} onChange={() => basculer(s.id)} />
          <span>S{s.numero} · {s.titre || "Sans titre"}</span>
        </label>
      ))}
    </div>
  );
  return (
    <Modal titre={`Séances · ${titre || "Colonne"}, semaine ${semaine}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={() => onValider(sel)}>Valider{sel.length ? ` (${sel.length})` : ""}</button>
      </>}>
      <Input autoFocus value={cherche} placeholder="Chercher une séquence ou une séance" onChange={(e) => setCherche(e.target.value)} />
      <div className="choix-seances">
        {siennes.length > 0 && <><div className="prog-titres-groupe">{titre}</div>{siennes.map(bloc)}</>}
        {autres.length > 0 && (siennes.length > 0 && !q
          ? <details><summary className="prog-titres-groupe">Autres séquences ({autres.length})</summary>{autres.map(bloc)}</details>
          : <>{siennes.length > 0 && <div className="prog-titres-groupe">Autres séquences</div>}{autres.map(bloc)}</>)}
        {visibles.length === 0 && <Empty icone="📚" titre={q ? "Aucune séance ne correspond" : "Aucune séance dans vos séquences"} />}
      </div>
    </Modal>
  );
}

/** Une case de la progression : elle s'agrandit avec ce qu'on écrit, rien n'est jamais coupé. */
function CaseProgression({ valeur, onChange, libelle }: { valeur: string; onChange: (v: string) => void; libelle: string }) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  // La hauteur du texte, bordures comprises : la case les compte dans sa hauteur.
  const ajuster = React.useCallback(() => {
    const el = ref.current;
    if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; }
  }, []);
  React.useLayoutEffect(ajuster, [valeur, ajuster]);
  // Une colonne de plus rétrécit les autres : le texte passe à la ligne, la case doit grandir.
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // La première mesure ajuste aussi : la largeur a pu changer entre le rendu et l'observation.
    let largeur = -1;
    const obs = new ResizeObserver(() => { if (el.clientWidth !== largeur) { largeur = el.clientWidth; ajuster(); } });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ajuster]);
  return <textarea ref={ref} rows={1} value={valeur} spellCheck={false} aria-label={libelle} onChange={(e) => onChange(e.target.value)} />;
}

/**
 * Une colonne de la progression, ou un domaine de la programmation : son titre
 * se tire des matières, domaines et intitulés de l'emploi du temps, dont il
 * prend la couleur.
 */
function ColonneForm({ colonne, nouvelle, sources, teinte, onClose, onValider, onSupprimer, quoi = "colonne" }: {
  colonne: Colonne; nouvelle: boolean; sources: GroupeDeTitres[]; teinte: (c: Colonne) => string;
  onClose: () => void; onValider: (c: Colonne) => void; onSupprimer?: () => void;
  quoi?: "colonne" | "domaine";
}) {
  const [c, setC] = React.useState<Colonne>(colonne);
  const connu = titreConnu(sources, c.titre);
  const groupes = titresProposes(sources, connu ? "" : c.titre);
  const valider = () => c.titre.trim() && onValider({ ...c, titre: c.titre.trim() });
  return (
    <Modal titre={quoi === "domaine" ? (nouvelle ? "Nouveau domaine" : "Domaine") : (nouvelle ? "Nouvelle colonne" : "Colonne")} onClose={onClose}
      footer={<>
        {onSupprimer && <button className="btn danger" style={{ marginRight: "auto" }} onClick={onSupprimer}>Supprimer</button>}
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!c.titre.trim()} onClick={valider}>Valider</button>
      </>}>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Titre
          <Aide titre="D'où viennent les titres" vers="droite">
            <p>Des matières et des domaines de Réglages › Personnalisation, et des intitulés de votre emploi du temps.
              {quoi === "domaine" ? " Le domaine" : " La colonne"} en prend la couleur : la changer là-bas la change ici, dans la
              progression comme dans la programmation. Un titre écrit à la main garde la couleur choisie ici.</p>
          </Aide>
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="prog-pastille" style={{ background: teinte(c) }} />
          <Input autoFocus value={c.titre} placeholder="Une matière, un domaine, un intitulé…" onChange={(e) => setC({ ...c, titre: e.target.value })}
            onKeyDown={(e) => { if (e.key === "Enter") valider(); }} />
        </div>
      </div>
      <div className="prog-titres">
        {groupes.map((g) => (
          <div key={g.groupe}>
            <div className="prog-titres-groupe">{g.groupe}</div>
            <div className="prog-titres-liste">
              {g.titres.map((t) => (
                <button key={t} className={`chip${t === c.titre ? " actif" : ""}`} onClick={() => setC({ ...c, titre: t })}>
                  <span className="dot" style={{ background: couleurHex[couleurPourMatiere(t)] }} />{t}
                </button>
              ))}
            </div>
          </div>
        ))}
        {groupes.length === 0 && <div className="meta">Aucun titre de vos listes ne contient « {c.titre} » : il sera gardé tel quel.</div>}
      </div>
      {!connu && c.titre.trim() && (
        <div className="field"><label>Couleur</label><ColorPicker value={c.couleur} onChange={(col) => setC({ ...c, couleur: col })} /></div>
      )}
    </Modal>
  );
}

/** Une liste rangée en JSON ; rien d'illisible ne fait tomber l'écran. */
function lireListe<T>(json: string | null | undefined): T[] {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v as T[] : []; } catch { return []; }
}
/** Le mode de programmation choisi sur ce poste : classe, ou par élève. */
const CLE_MODE_PROG = "programmationMode";

// ── Programmation de l'année : la classe, puis ses niveaux ─────────────────
//
// Comme la progression (l'enseignant, octobre 2026) : sous la programmation
// de la classe, « + Niveau » en ajoute une par niveau. Les domaines prennent
// la couleur de leur matière dans Réglages — celle des colonnes de la
// progression —, leurs activités en ont les cases teintées, et les périodes
// gardent leur couleur. Chaque tableau s'écrit par écart, comme la progression.
type Ligne = LigneProgrammation;
const PCOLS: ("p1" | "p2" | "p3" | "p4" | "p5")[] = ["p1", "p2", "p3", "p4", "p5"];
/** La couleur d'une activité sans domaine au-dessus d'elle. */
const TEINTE_NEUTRE = "#94a3b8";

function Programmation({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const liste = React.useMemo(() => data ?? [], [data]);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  // Programmer par classe ou par élève : le choix de l'enseignant, que la
  // structure ne décide pas (voir classe.ts). Qui programmait par élève parce
  // que son emploi du temps était une « Organisation IME » — réglage que plus
  // rien n'écrit — le garde : ce défaut d'avant devient son choix.
  const [mode, setMode] = React.useState<"classe" | "ime">("classe");
  React.useEffect(() => {
    api.settingsAll().then((r) => {
      const choisi = r[CLE_MODE_PROG];
      if (choisi === "ime" || choisi === "classe") { setMode(choisi); return; }
      if (r["edt:mode"] === "ime") { setMode("ime"); api.settingSet(CLE_MODE_PROG, "ime").catch(() => {}); }
    }).catch(() => {});
  }, []);
  const choisirMode = (m: "classe" | "ime") => {
    setMode(m);
    api.settingSet(CLE_MODE_PROG, m).catch(() => {});
  };

  // Les couleurs : celles de Réglages, comme les colonnes de la progression.
  const sources = useSourcesDeTitres();
  const teinteDomaine = (l: Ligne) => teinteDuTitre(sources, l.label, l.couleur);
  const periodesCal = usePeriodesDeLAnnee(annee);
  // Les niveaux ajoutés par « + Niveau », le temps qu'ils reçoivent leur programmation.
  const [ajoutes, setAjoutes] = React.useState<string[]>([]);
  // Le tableau où l'on travaille : c'est lui que ⌘Z annule.
  const [actif, setActif] = React.useState("");
  const niveaux = niveauxDeLAnnee(NIVEAUX_SCOLAIRES, liste, annee, ajoutes);
  // Le tableau sans niveau : tant qu'il n'y a pas de niveau, ou qu'il a des lignes.
  const avecClasse = niveaux.length === 0 || lireLignes(programmationDe(liste, annee, "")).length > 0;
  const libres = NIVEAUX_SCOLAIRES.filter((n) => !niveaux.includes(n));
  const tableaux = [...(avecClasse ? [""] : []), ...niveaux];

  // Ce que montre chaque tableau, pour imprimer l'année entière.
  const etats = React.useRef(new Map<string, Ligne[]>());
  const lignesDe = (n: string) => etats.current.get(cleNiveauDeLAnnee(annee, n)) ?? lireLignes(programmationDe(liste, annee, n));
  const imprimer = () => printHTML(`Programmation ${annee}`, htmlProgrammation(annee, tableaux.map((n) => {
    const lignes = lignesDe(n);
    return { niveau: n, lignes, teintes: teintesDesLignes(lignes, teinteDomaine, TEINTE_NEUTRE) };
  })));

  const ajouterNiveau = (e: React.MouseEvent) => {
    openCtx(e, libres.map((n) => ({ label: n, onClick: () => { setAjoutes((a) => [...a, cleNiveauDeLAnnee(annee, n)]); setActif(n); } })));
  };
  /** Donne au tableau `de` le niveau `vers` ; vide : sans niveau. */
  const changerNiveau = async (de: string, vers: string) => {
    await ecrituresTerminees();
    try {
      await api.programmationFinaleNiveau(annee, de, vers);
      setAjoutes((a) => [...a.filter((k) => k !== cleNiveauDeLAnnee(annee, de)), ...(vers ? [cleNiveauDeLAnnee(annee, vers)] : [])]);
      setActif(vers);
      reload();
    } catch (err) { toast(texteErreur(err), { icone: "⚠️" }); }
  };
  /** Retire un niveau de l'année : sa programmation se vide, et revient par « Annuler ». */
  const retirerNiveau = async (n: string) => {
    await ecrituresTerminees();
    const avant = lignesDe(n);
    setAjoutes((a) => a.filter((k) => k !== cleNiveauDeLAnnee(annee, n)));
    try {
      await api.programmationFinaleEcrire(annee, false, JSON.stringify(avant), "[]", n);
      reload();
      toastAnnulable(`${n} retiré de la programmation ${annee}.`, async () => {
        await api.programmationFinaleEcrire(annee, false, "[]", JSON.stringify(avant), n);
        setAjoutes((a) => [...a, cleNiveauDeLAnnee(annee, n)]);
        reload();
      });
    } catch (err) { toast(`Niveau non retiré : ${String(err)}`, { icone: "⚠️" }); }
  };

  if (mode === "ime") {
    return (
      <>
        <div className="toolbar">
          <AnneeSelect annee={annee} setAnnee={setAnnee} />
          <div className="seg">
            <button className={""} onClick={() => choisirMode("classe")}>Classe</button>
            <button className="active">👧 Par élève (IME)</button>
          </div>
          <div className="spacer" />
        </div>
        <ProgrammationIme annee={annee} />
      </>
    );
  }

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} />
        {/* Deux façons de programmer, selon ce qu'on enseigne : une grille de
            domaines pour une classe, des objectifs par élève en IME. */}
        <div className="seg">
          <button className="active">Classe</button>
          <button onClick={() => choisirMode("ime")}>👧 Par élève (IME)</button>
        </div>
        <div className="spacer" />
        <button className="btn" onClick={imprimer} disabled={tableaux.every((n) => lireLignes(programmationDe(liste, annee, n)).length === 0)}>🖨 PDF</button>
      </div>
      {tableaux.map((n) => (
        <SectionProgrammation key={n || "classe"} annee={annee} niveau={n} liste={liste} lecture={data} relire={reload}
          sequences={sequences ?? []} sources={sources} teinteDomaine={teinteDomaine} periodesCal={periodesCal}
          clavier={actif === n} onActif={() => setActif(n)}
          surLignes={(l) => etats.current.set(cleNiveauDeLAnnee(annee, n), l)}
          niveauUI={<NiveauDuTableau niveau={n} libres={libres} sansNiveau={!avecClasse} quoi="cette programmation"
            onChanger={(vers) => { void changerNiveau(n, vers); }} onRetirer={n ? () => { void retirerNiveau(n); } : undefined} />} />
      ))}
      <div className="prog-ajout-niveau">
        <button className="btn" onClick={ajouterNiveau} disabled={!libres.length} title="Ajouter la programmation d'un niveau">+ Niveau</button>
      </div>
    </>
  );
}

/**
 * Le tableau d'une programmation : celle de la classe, ou d'un niveau ajouté
 * à l'année. Il s'écrit par écart, comme tout ce qui se range en collection.
 */
function SectionProgrammation({ annee, niveau, liste, lecture, relire, sequences, sources, teinteDomaine, periodesCal, clavier, onActif, surLignes, niveauUI }: {
  annee: string; niveau: string; liste: ProgrammationFinale[]; lecture: unknown; relire: () => void;
  sequences: Sequence[]; sources: GroupeDeTitres[]; teinteDomaine: (l: Ligne) => string; periodesCal: PeriodeDeClasse[];
  clavier: boolean; onActif: () => void; surLignes: (l: Ligne[]) => void;
  /** Le niveau du tableau, en tête : voir `NiveauDuTableau`. */
  niveauUI: React.ReactNode;
}) {
  const nav = useNavigate();
  const cle = cleNiveauDeLAnnee(annee, niveau);
  // Une ligne ajoutée sur un autre ordinateur reste quand on en modifie une ici.
  const { present: lignes, commit: persister, modifier } = useCollectionParEcart<Ligne[]>({
    cle, lecture, vide: [], relire, echec: "Programmation non enregistrée", clavier,
    enBase: (k) => { const [a, n = ""] = k.split("|"); return lireLignes(programmationDe(liste, a, n)); },
    ecrire: (k, avant, apres) => {
      const [a, n = ""] = k.split("|");
      return api.programmationFinaleEcrire(a, false, JSON.stringify(avant), JSON.stringify(apres), n);
    },
  });
  surLignes(lignes);
  const teintes = teintesDesLignes(lignes, teinteDomaine, TEINTE_NEUTRE);
  const [lien, setLien] = React.useState<{ ligneId: string; col: string } | null>(null);
  const [partager, setPartager] = React.useState(false);
  // Le domaine qu'on crée (sous une ligne, ou à la fin), ou qu'on modifie.
  const [editDomaine, setEditDomaine] = React.useState<{ ligne: Ligne; nouvelle: boolean; apres?: string } | null>(null);

  const majLigne = (id: string, patch: Partial<Ligne>) => persister(lignes.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const inserer = (ligne: Ligne, apres?: string) => {
    const i = apres ? lignes.findIndex((l) => l.id === apres) : -1;
    if (i < 0) { persister([...lignes, ligne]); return; }
    const next = [...lignes];
    next.splice(i + 1, 0, ligne);
    persister(next);
  };
  const ajouterActivite = (apres?: string) => inserer(ligneNeuve(newId(), false), apres);
  const nouveauDomaine = (apres?: string) => setEditDomaine({ ligne: ligneNeuve(newId(), true), nouvelle: true, apres });
  const validerDomaine = (c: Colonne) => {
    if (!editDomaine) return;
    if (editDomaine.nouvelle) inserer({ ...editDomaine.ligne, label: c.titre, couleur: c.couleur }, editDomaine.apres);
    else majLigne(editDomaine.ligne.id, { label: c.titre, couleur: c.couleur });
    setEditDomaine(null);
  };
  const supprimer = (l: Ligne) => {
    const place = lignes.findIndex((x) => x.id === l.id);
    persister(lignes.filter((x) => x.id !== l.id));
    setEditDomaine(null);
    toastAnnulable(`${l.estDomaine ? "Domaine" : "Activité"} « ${l.label.trim() || "sans titre"} » supprimé${l.estDomaine ? "" : "e"}.`,
      () => modifier(cle, (ls) => remettreLigne(ls, l, place)));
  };

  const seqIdsDe = (l: Ligne, col: string) => l.seqs?.[col] ?? [];
  const setSeqIds = (ligneId: string, col: string, ids: string[]) =>
    persister(lignes.map((l) => (l.id === ligneId ? { ...l, seqs: { ...(l.seqs ?? {}), [col]: ids } } : l)));
  const numPeriode = (col: string) => Number(col.slice(1));
  const estFaite = (l: Ligne, col: string) => (l.periodesFaites ?? []).includes(numPeriode(col));
  const basculerFaite = (l: Ligne, col: string) => {
    const p = numPeriode(col);
    const faites = new Set(l.periodesFaites ?? []);
    if (faites.has(p)) faites.delete(p); else faites.add(p);
    majLigne(l.id, { periodesFaites: [...faites].sort() });
  };
  const competenceDe = (seqId: string): string | null => {
    const s = sequences.find((x) => x.id === seqId);
    if (!s?.competenceVisee) return null;
    try { return labelCourt(JSON.parse(s.competenceVisee) as CompetenceSelectionnee); } catch { return null; }
  };

  // Glisser une ligne : un domaine emporte ses activités.
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const menuLigne = (e: React.MouseEvent, l: Ligne) => openCtx(e, [
    ...(l.estDomaine ? [{ label: "Modifier le domaine…", icon: "✏️", onClick: () => setEditDomaine({ ligne: l, nouvelle: false }) }] : []),
    { label: "Ajouter une activité dessous", icon: "➕", onClick: () => ajouterActivite(l.id) },
    { label: "Ajouter un domaine dessous", icon: "📁", onClick: () => nouveauDomaine(l.id) },
    { label: "Supprimer la ligne", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(l) },
  ]);

  // Un tableau s'exporte et s'importe seul : il atterrit sur l'année et le niveau affichés.
  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => {
    const bundle = { version: 1, type: "programmation", annee, niveau, lignes };
    telechargerTexte(`Programmation_${annee}_${niveau || "classe"}_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
  };
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      const ls = b.lignes as Ligne[] | undefined;
      if (!Array.isArray(ls)) throw new Error();
      if (lignes.length > 0 && !(await confirmer("Remplacer ce tableau par celui du fichier ?", { oui: "Remplacer", danger: true }))) return;
      persister(ls.map((l) => ({ ...l, id: newId() })));
    } catch { toast("Fichier de programmation invalide.", { icone: "⚠️" }); }
  };
  const menuTableau = (e: React.MouseEvent) => openCtx(e, [
    ...(lignes.length > 0 ? [{ label: "Partager à un ami", icon: "🤝", onClick: () => setPartager(true) }] : []),
    ...(lignes.length > 0 ? [{ label: "Exporter ce tableau", icon: "⬇️", onClick: exporter }] : []),
    { label: "Importer un tableau…", icon: "⬆️", onClick: () => fileRef.current?.click() },
  ]);
  const reprises = lignes.length === 0 ? sourcesDeDomaines(liste, annee, niveau) : [];

  const datesDe = (p: number) => {
    const per = periodesCal.find((x) => x.numero === p);
    return per ? datesDeLaSemaine({ numero: 0, debut: per.debut, fin: per.fin }) : "";
  };
  const ligneLien = lignes.find((l) => l.id === lien?.ligneId);

  return (
    <section className="prog-section" onFocusCapture={onActif} onMouseDown={onActif}>
      <div className="prog-section-tete">
        {niveauUI}
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void importer(f); e.target.value = ""; }} />
        <button className="btn sm" onClick={() => nouveauDomaine()}>+ Domaine</button>
        <button className="btn sm" onClick={() => ajouterActivite()}>+ Activité</button>
        <button className="btn sm ghost" aria-label={`Actions de la programmation de ${niveau || LA_CLASSE}`} onClick={menuTableau}>⋯</button>
      </div>
      {lignes.length === 0 ? (
        <div className="prog-vide">
          <Empty icone="🗂️" titre={niveau ? `${niveau} : programmation vide` : "Programmation vide"} />
          <div className="prog-vide-actions">
            {reprises.map((s) => (
              <button key={s.libelle} className="btn" onClick={() => persister(copieDesDomaines(s.domaines, newId))}>
                Reprendre les domaines de {s.libelle} ({s.domaines.map((d) => d.label).join(", ")})
              </button>
            ))}
            <button className="btn primary" onClick={() => nouveauDomaine()}>+ Domaine</button>
            <button className="btn" onClick={() => ajouterActivite()}>+ Activité</button>
          </div>
        </div>
      ) : (
        <div className="prog-cadre">
          <table className="prog-tableau progm-tableau">
            {/* Les périodes se partagent la largeur : l'année tient d'un coup d'œil. */}
            <colgroup><col className="progm-col-libelle" />{PCOLS.map((c) => <col key={c} />)}<col className="progm-col-actions" /></colgroup>
            <thead>
              <tr>
                <th className="progm-libelle">Domaine / Activité</th>
                {[1, 2, 3, 4, 5].map((p) => (
                  <th key={p}>
                    <div className="prog-entete progm-periode" style={{ "--couleur": COULEUR_PERIODE[p] } as React.CSSProperties}>
                      <b>P{p}</b>{datesDe(p) && <span>{datesDe(p)}</span>}
                    </div>
                  </th>
                ))}
                <th className="progm-actions"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l) => {
                const style = { "--couleur": teintes[l.id] } as React.CSSProperties;
                const survol = overId === l.id && dragId !== l.id ? " progm-survol" : "";
                const ligneProps = {
                  style,
                  onDragOver: (e: React.DragEvent) => { e.preventDefault(); setOverId(l.id); },
                  onDragLeave: () => setOverId((o) => (o === l.id ? null : o)),
                  onDrop: (e: React.DragEvent) => {
                    e.preventDefault();
                    if (dragId) persister(deplacerLigne(lignes, dragId, l.id));
                    setDragId(null); setOverId(null);
                  },
                  onContextMenu: (e: React.MouseEvent) => menuLigne(e, l),
                };
                const poignee = (
                  <span className="progm-poignee" draggable title="Glisser pour déplacer"
                    onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", l.id); setDragId(l.id); }}
                    onDragEnd={() => { setDragId(null); setOverId(null); }}>⠿</span>
                );
                const actions = (
                  <td className="progm-actions">
                    <button className="prog-plus" aria-label={`Actions de la ligne ${l.label}`} onClick={(e) => menuLigne(e, l)}>⋯</button>
                  </td>
                );
                if (l.estDomaine) return (
                  <tr key={l.id} className={`progm-domaine${survol}`} {...ligneProps}>
                    <td colSpan={6}>
                      <div className="progm-domaine-tete">
                        {poignee}
                        <button className="prog-titre" onClick={() => setEditDomaine({ ligne: l, nouvelle: false })} title="Modifier le domaine">
                          {l.label.trim() || "Domaine sans titre"}
                        </button>
                      </div>
                    </td>
                    {actions}
                  </tr>
                );
                return (
                  <tr key={l.id} className={`progm-activite${survol}`} {...ligneProps}>
                    <td className="progm-libelle">
                      <div className="progm-libelle-ligne">
                        {poignee}
                        <CaseProgression valeur={l.label} onChange={(v) => majLigne(l.id, { label: v })}
                          libelle={`Activité${niveau ? ` (${niveau})` : ""}`} />
                      </div>
                    </td>
                    {PCOLS.map((c) => {
                      const faite = estFaite(l, c);
                      const seqs = seqIdsDe(l, c);
                      return (
                        <td key={c} className={`prog-case progm-case${faite ? " faite" : ""}`}>
                          <div className="progm-case-haut">
                            <CaseProgression valeur={l[c] ?? ""} onChange={(v) => majLigne(l.id, { [c]: v } as Partial<Ligne>)}
                              libelle={`${l.label || "Activité"}, ${c.toUpperCase()}`} />
                            {/* Au coin de la case, au survol : lier une séquence, marquer fait. */}
                            <div className="progm-coin">
                              <button className="progm-lier" title="Lier une séquence" aria-label={`Lier une séquence, ${c.toUpperCase()}`}
                                onClick={() => setLien({ ligneId: l.id, col: c })}>📚</button>
                              <button className={`progm-fait${faite ? " fait" : ""}`} aria-pressed={faite}
                                title={faite ? "Marquer non fait" : "Marquer fait"} onClick={() => basculerFaite(l, c)}>{faite ? "✓" : "○"}</button>
                            </div>
                          </div>
                          {seqs.map((sid) => {
                            const s = sequences.find((x) => x.id === sid);
                            const comp = competenceDe(sid);
                            return s ? (
                              <div key={sid} className="progm-seq">
                                <button className="chip" title="Ouvrir la séquence" onClick={() => nav(`/sequences/${sid}`)}>📚 {s.titre} ↗</button>
                                {comp && <div className="meta">🎯 {comp}</div>}
                              </div>
                            ) : null;
                          })}
                        </td>
                      );
                    })}
                    {actions}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lien && ligneLien && (
        <LierSequences sequences={sequences} selection={seqIdsDe(ligneLien, lien.col)}
          onClose={() => setLien(null)}
          onValider={(ids) => { setSeqIds(lien.ligneId, lien.col, ids); setLien(null); }} />
      )}
      {partager && <EnvoyerProgModal annee={annee} niveau={niveau} peutEnvoyer={lignes.length > 0} onClose={() => setPartager(false)} />}
      {editDomaine && (
        <ColonneForm quoi="domaine" nouvelle={editDomaine.nouvelle} sources={sources}
          colonne={{ id: editDomaine.ligne.id, titre: editDomaine.nouvelle ? "" : editDomaine.ligne.label, couleur: editDomaine.ligne.couleur ?? "blue" }}
          teinte={(c) => teinteDuTitre(sources, c.titre, c.couleur)}
          onClose={() => setEditDomaine(null)} onValider={validerDomaine}
          onSupprimer={editDomaine.nouvelle ? undefined : () => supprimer(editDomaine.ligne)} />
      )}
    </section>
  );
}

// Partage chiffré de la programmation finale : envoyer (à un ami) + recevoir.
// Envoi chiffré de la programmation de l'année. La réception est centralisée
// dans Réglages › Amis (« Boîte aux lettres ») : les programmations reçues
// apparaissent automatiquement comme colonnes de comparaison.
function EnvoyerProgModal({ annee, niveau, peutEnvoyer, onClose }: {
  annee: string; niveau: string; peutEnvoyer: boolean; onClose: () => void;
}) {
  const { data: amis } = useAsync(() => api.amisList(), []);
  const [msg, setMsg] = React.useState("");
  const [enCours, setEnCours] = React.useState("");
  const [envoyes, setEnvoyes] = React.useState<Record<string, boolean>>({});
  const envoyer = async (a: Ami) => {
    setEnCours(a.id); setMsg("");
    try { await api.programmationPartager(a.id, annee, niveau); setEnvoyes((s) => ({ ...s, [a.id]: true })); setMsg(`Envoyée à ${a.nom || "cet ami"} ✅`); }
    catch (e) { setMsg(String(e)); }
    finally { setEnCours(""); }
  };
  return (
    <Modal titre={`Partager la programmation ${niveau ? `${niveau} ` : ""}${annee}`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {(amis?.length ?? 0) === 0
        ? <Empty icone="🤝" titre="Aucun ami" sous="Ajoutez un collègue dans Réglages › Amis." />
        : <>
            {!peutEnvoyer && <p className="meta" style={{ marginTop: 0 }}>Ajoutez au moins une ligne pour pouvoir envoyer.</p>}
            <p className="meta" style={{ marginTop: 0 }}>Chiffrée de bout en bout. Elle arrivera dans la boîte aux lettres du destinataire.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {amis!.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: "var(--bg)" }}>
                  <span style={{ fontSize: 18 }} aria-hidden="true">{a.verifie ? "✅" : "👤"}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{a.nom || "Sans nom"}</span>
                  <button className="btn primary sm" disabled={enCours === a.id || !peutEnvoyer} onClick={() => envoyer(a)}>
                    {enCours === a.id ? "…" : envoyes[a.id] ? "✓ Renvoyer" : "📤 Envoyer"}</button>
                </div>
              ))}
            </div>
          </>}
      {msg && <div style={{ marginTop: 10, fontSize: 13 }} role="status">{msg}</div>}
    </Modal>
  );
}

function LierSequences({ sequences, selection, onClose, onValider }: {
  sequences: Sequence[]; selection: string[]; onClose: () => void; onValider: (ids: string[]) => void;
}) {
  const [sel, setSel] = React.useState<string[]>(selection);
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  return (
    <Modal titre="Lier des séquences" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button><button className="btn primary" onClick={() => onValider(sel)}>Valider</button></>}>
      {sequences.length === 0 ? <Empty icone="📚" titre="Aucune séquence" /> :
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {sequences.map((s) => (
            <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 7, background: "var(--bg)" }}>
              <input type="checkbox" checked={sel.includes(s.id)} onChange={() => toggle(s.id)} />
              <span className="dot" style={{ background: teinteSequence(s) }} />
              <span style={{ flex: 1 }}>{s.titre}</span>
              <span className="meta">{s.matiere} P{s.periode}</span>
            </label>
          ))}
        </div>}
    </Modal>
  );
}

// ── Emploi du temps + bilan vs volumes officiels ──────────────────────────────────
/** Créneau de l'emploi du temps : sa nature et, s'il y a lieu, les élèves présents. */
type Slot = SlotEdt;
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const toMin = (s: string) => { const [h, m] = s.split(":").map(Number); return (h || 0) * 60 + (m || 0); };
const minHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const EDT_H_PX = 56;

// Répartit en colonnes (lanes) les slots qui se chevauchent dans un jour.
function layoutSlots(ss: Slot[]): Map<string, { lane: number; lanes: number }> {
  const res = new Map<string, { lane: number; lanes: number }>();
  const sorted = [...ss].sort((a, b) => toMin(a.heureDebut) - toMin(b.heureDebut) || toMin(a.heureFin) - toMin(b.heureFin));
  let i = 0;
  while (i < sorted.length) {
    let clusterEnd = toMin(sorted[i].heureFin); const cluster = [sorted[i]]; let j = i;
    while (j + 1 < sorted.length && toMin(sorted[j + 1].heureDebut) < clusterEnd) {
      j++; cluster.push(sorted[j]); clusterEnd = Math.max(clusterEnd, toMin(sorted[j].heureFin));
    }
    const laneEnds: number[] = [];
    for (const c of cluster) {
      let lane = laneEnds.findIndex((e) => e <= toMin(c.heureDebut));
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(0); }
      laneEnds[lane] = toMin(c.heureFin); res.set(c.id, { lane, lanes: 0 });
    }
    for (const c of cluster) res.get(c.id)!.lanes = laneEnds.length;
    i = j + 1;
  }
  return res;
}

function SlotForm({ slot, onClose, onSave, onDelete, eleves, intitules }: {
  slot: Slot; onClose: () => void; onSave: (s: Slot) => void; onDelete: () => void;
  eleves: Eleve[]; intitules: string[];
}) {
  const [s, setS] = React.useState<Slot>(slot);
  const up = (p: Partial<Slot>) => setS((c) => ({ ...c, ...p }));
  // La couleur appartient à l'intitulé : tous ses créneaux la partagent, ici et
  // dans le planning. Tant que l'enseignant n'en choisit pas, elle suit l'intitulé tapé.
  const [couleur, setCouleur] = React.useState(() => couleurPourMatiere(slot.titre));
  const [couleurChoisie, setCouleurChoisie] = React.useState(false);
  const changerTitre = (titre: string) => {
    up({ titre });
    if (!couleurChoisie) setCouleur(couleurPourMatiere(titre));
  };
  const enregistrer = () => {
    if (couleurChoisie && s.titre.trim()) {
      choisirCouleurMatiere(s.titre, couleur).catch((e) => toast(`Couleur non enregistrée : ${e}`, { icone: "⚠️" }));
    }
    onSave({ ...s, couleur });
  };
  const presents = s.eleves ?? [];
  const basculer = (id: string) =>
    up({ eleves: presents.includes(id) ? presents.filter((x) => x !== id) : [...presents, id] });
  return (
    <Modal titre="Créneau" onClose={onClose}
      footer={<>
        <button className="btn danger" onClick={onDelete}>Supprimer</button>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={enregistrer}>Enregistrer</button>
      </>}>
      <div className="row">
        <div className="field"><label>Jour</label>
          <Select value={s.jour} onChange={(e) => up({ jour: e.target.value })}>{JOURS.map((j) => <option key={j}>{j}</option>)}</Select></div>
        <div className="field"><label>Début</label><Input type="time" value={s.heureDebut} onChange={(e) => up({ heureDebut: e.target.value })} /></div>
        <div className="field"><label>Fin</label><Input type="time" value={s.heureFin} onChange={(e) => up({ heureFin: e.target.value })} /></div>
      </div>
      {/* Une matière ou un intitulé libre : les deux se proposent à la frappe. */}
      <div className="field"><label>Intitulé</label>
        <Input list="edt-intitules" value={s.titre} placeholder="Français, Scolarité, Piscine, Atelier artistique…"
          onChange={(e) => changerTitre(e.target.value)} />
        <datalist id="edt-intitules">{[...new Set([...intitules, ...MATIERES])].map((t) => <option key={t} value={t} />)}</datalist>
      </div>
      <ChoixCouleur titre={s.titre} couleur={couleur} onChange={(c) => { setCouleur(c); setCouleurChoisie(true); }}
        portee={(t) => MATIERES.includes(t) ? `Pour toute la matière « ${t} », dans toute l'application.`
          : `Pour tous les créneaux « ${t} », ici et dans le planning.`} />
      <div className="field"><label>Nature du temps</label>
        <div className="seg" role="radiogroup" aria-label="Nature du temps">
          {([["classe", "🧑‍🏫 Temps de classe"], ["reunion", "🗣️ Réunion ou formation"]] as const).map(([n, libelle]) => (
            <button key={n} type="button" role="radio" aria-checked={natureDuSlot(s) === n}
              className={natureDuSlot(s) === n ? "active" : ""} onClick={() => up({ nature: n })}>{libelle}</button>
          ))}
        </div>
        {!s.nature && s.titre && (
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>Déduit de l’intitulé — cliquez pour choisir.</div>
        )}
      </div>
      <div className="field">
        <label>Élèves présents ({presents.length})</label>
        {eleves.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--text-2)", fontStyle: "italic" }}>
            Ajoutez vos élèves dans l'onglet Élèves.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
              <button className="btn sm" onClick={() => up({ eleves: eleves.map((e) => e.id) })}>Tous</button>
              <button className="btn sm" onClick={() => up({ eleves: [] })}>Aucun</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 2, maxHeight: 220, overflowY: "auto" }}>
              {eleves.map((e) => (
                <label key={e.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 4px",
                  borderRadius: 6, cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={presents.includes(e.id)} onChange={() => basculer(e.id)} />
                  {e.nom}
                </label>
              ))}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Le choix de la couleur d'un intitulé ou d'une matière, avec un aperçu du créneau. */
function ChoixCouleur({ titre, couleur, onChange, portee }: {
  titre: string; couleur: string; onChange: (c: string) => void; portee: (titre: string) => string;
}) {
  return (
    <div className="field">
      <label>Couleur</label>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <ColorPicker value={couleur} onChange={onChange} />
        <span style={{ background: couleurHex[couleur] || couleurHex.blue, color: "#fff", borderRadius: 7, padding: "4px 10px",
          fontSize: 12, fontWeight: 700, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {titre.trim() || "Aperçu"}
        </span>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
        {titre.trim() ? portee(titre.trim()) : "Donnez un intitulé : la couleur s'y attache."}
      </div>
    </div>
  );
}

interface EdtDrag { id: string; jourIndex: number; startMin: number; durMin: number; grabOffMin: number }

function EdtType({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.edtTypiqueList(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  // Un seul emploi du temps par année, posé à l'année : chaque créneau dit sa
  // nature et, s'il y a lieu, les élèves présents. L'EDT de classe et
  // l'organisation IME n'en font plus qu'un (voir `fusionner_emplois_du_temps`,
  // côté Rust).
  const [niveau, setNiveau] = React.useState("");
  const [edit, setEdit] = React.useState<Slot | null>(null);
  const [deplacer, setDeplacer] = React.useState(false);
  const [drag, setDrag] = React.useState<EdtDrag | null>(null);
  const dragRef = React.useRef<EdtDrag | null>(null);
  const colsRef = React.useRef<HTMLDivElement>(null);
  const majDrag = (d: EdtDrag | null) => { dragRef.current = d; setDrag(d); };

  // État des créneaux avec annuler/rétablir (⌘Z / Ctrl+Z, ⌘⇧Z / Ctrl+Y), écrit par écart :
  // un créneau posé sur un autre ordinateur reste quand on en déplace un ici.
  const { present: slots, commit: persister } = useCollectionParEcart<Slot[]>({
    cle: annee, lecture: data, vide: [], relire: reload, echec: "Emploi du temps non enregistré",
    enBase: (k) => lireListe<Slot>(data?.find((e) => e.annee === k)?.slotsJson),
    ecrire: (k, avant, apres) => api.edtTypiqueEcrire(k, JSON.stringify(avant), JSON.stringify(apres)),
  });
  React.useEffect(() => { api.settingGet("niveauClasse").then((v) => setNiveau(v ?? "")); }, []);
  const upsert = (s: Slot) => persister(slots.some((x) => x.id === s.id) ? slots.map((x) => x.id === s.id ? s : x) : [...slots, s]);

  const supprimer = (id: string) => persister(slots.filter((s) => s.id !== id));
  // Vide l'emploi du temps de l'année affichée. Les créneaux déjà posés dans le
  // planning ne bougent pas ; ⌘Z rétablit tout.
  const viderAnnee = async () => {
    if (!(await confirmer(`Supprimer l'emploi du temps ${annee} (${slots.length} créneau${slots.length > 1 ? "x" : ""}) ?\n\n`
      + "Les créneaux déjà posés dans le planning restent. ⌘Z (Ctrl+Z) annule la suppression.",
      { oui: "Supprimer", danger: true }))) return;
    persister([]);
    toast(`L'emploi du temps ${annee} est supprimé.`, { icone: "🗑" });
  };
  const temps = tempsDeLaSemaineType(slots);

  const fileRef = React.useRef<HTMLInputElement>(null);
  const exporter = () => {
    telechargerTexte(`emploi-du-temps-${annee}.json`, JSON.stringify({ annee, slots }, null, 2));
  };
  const importer = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      const arr: Slot[] = Array.isArray(b) ? b : (b.slots ?? []);
      if (!Array.isArray(arr)) throw new Error();
      persister(arr.map((s) => ({ ...s, id: s.id || newId() })));
    } catch { toast("Fichier d'emploi du temps illisible.", { icone: "⚠️" }); }
  };
  const imprimer = () => {
    const hex = (c: string) => couleurHex[c] || couleurHex.blue;
    const fmtD = (m: number) => { const h = Math.floor(m / 60), mm = m % 60; return mm ? `${h}h${String(mm).padStart(2, "0")}min` : `${h}h`; };
    // Lignes = intervalles horaires distincts (debut–fin), triés.
    const ivMap = new Map<string, { debut: string; fin: string }>();
    for (const s of slots) ivMap.set(`${s.heureDebut}-${s.heureFin}`, { debut: s.heureDebut, fin: s.heureFin });
    const intervalles = [...ivMap.values()].sort((a, b) => a.debut.localeCompare(b.debut) || a.fin.localeCompare(b.fin));

    const bloc = (s: Slot) =>
      `<div style="background:${hex(couleurPourMatiere(s.titre))}2b;border-radius:6px;padding:6px 4px;height:100%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:11px;line-height:1.25;color:#1f2937">${escapeHtml(s.titre)}</div>`;
    const cell = (jour: string, iv: { debut: string; fin: string }) => {
      const ss = slots.filter((s) => s.jour === jour && s.heureDebut === iv.debut && s.heureFin === iv.fin).sort((a, b) => a.titre.localeCompare(b.titre));
      if (ss.length === 0) return `<td></td>`;
      if (ss.length === 1) return `<td style="padding:3px">${bloc(ss[0])}</td>`;
      return `<td style="padding:3px"><div style="display:flex;gap:3px">${ss.map((s) => `<div style="flex:1">${bloc(s)}</div>`).join("")}</div></td>`;
    };

    const head = `<tr><th style="width:84px">Horaire</th>${JOURS.map((j) => `<th style="text-align:center">${j}</th>`).join("")}</tr>`;
    const rows = intervalles.map((iv) =>
      `<tr><td style="white-space:nowrap;font-weight:600;font-size:11px;background:#f3f4f6">${iv.debut}–${iv.fin}</td>${JOURS.map((j) => cell(j, iv)).join("")}</tr>`).join("");

    // Légende : durée totale par intitulé, avec sa couleur.
    const couleurTitre: Record<string, string> = {};
    for (const s of slots) couleurTitre[s.titre] = couleurPourMatiere(s.titre);
    const legende = Object.entries(minutesParMatiere).sort((a, b) => b[1] - a[1])
      .map(([titre, min]) => `<span style="display:inline-block;background:${hex(couleurTitre[titre] || "blue")}2b;border:1px solid ${hex(couleurTitre[titre] || "blue")};border-radius:12px;padding:3px 10px;margin:3px;font-size:12px;color:#1f2937">${escapeHtml(titre)} (${fmtD(min)})</span>`).join(" ");

    const html =
      `<style>@page { size: A4 landscape; }</style>` +
      `<h1 style="text-align:center;margin:0 0 10px">Emploi du temps ${escapeHtml(annee)}${niveau ? " — " + escapeHtml(niveau) : ""}</h1>` +
      `<table style="table-layout:fixed">${head}${rows}</table>` +
      `<div style="margin-top:14px;font-weight:700">Répartition horaire :</div>` +
      `<div style="margin-top:4px">${legende}</div>`;
    printHTML(`Emploi du temps ${annee}`, html);
  };

  // De 8h à 20h, plus si un créneau déborde.
  const { debut: EDT_H_DEBUT, fin: EDT_H_FIN } = plageGrille(slots);
  const heures = Array.from({ length: EDT_H_FIN - EDT_H_DEBUT + 1 }, (_, i) => EDT_H_DEBUT + i);
  // Pincement trackpad → zoom de la grille (hauteur des heures), retenu par ordinateur.
  const { zoom, majZoom, cadre } = useZoomPince("edt-zoom");
  const hpx = EDT_H_PX * zoom;
  const hauteur = (EDT_H_FIN - EDT_H_DEBUT) * hpx;

  const creerA = (jour: string, e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest(".cren-block")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const start = Math.max(EDT_H_DEBUT * 60, Math.min((EDT_H_FIN - 1) * 60,
      EDT_H_DEBUT * 60 + Math.floor(((e.clientY - rect.top) / hpx) * 60 / 30) * 30));
    setEdit({ id: newId(), jour, heureDebut: minHHMM(start), heureFin: minHHMM(start + 60), titre: "Français", couleur: couleurPourMatiere("Français") });
  };

  // Glisser-déposer d'un créneau (mode « Déplacer »).
  const onDragStart = (s: Slot, e: React.MouseEvent) => {
    if (!deplacer) return;
    e.preventDefault(); e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const grabOffMin = (e.clientY - rect.top) / hpx * 60;
    majDrag({ id: s.id, jourIndex: Math.max(0, JOURS.indexOf(s.jour)), startMin: toMin(s.heureDebut), durMin: toMin(s.heureFin) - toMin(s.heureDebut), grabOffMin });

    const onMove = (ev: MouseEvent) => {
      const cur = dragRef.current; const box = colsRef.current?.getBoundingClientRect();
      if (!cur || !box) return;
      const colW = (box.width - 44) / 5;
      const ji = Math.max(0, Math.min(4, Math.floor((ev.clientX - box.left - 44) / colW)));
      const yMin = EDT_H_DEBUT * 60 + (ev.clientY - box.top) / hpx * 60 - cur.grabOffMin;
      const start = Math.max(EDT_H_DEBUT * 60, Math.min(EDT_H_FIN * 60 - cur.durMin, Math.round(yMin / 15) * 15));
      majDrag({ ...cur, jourIndex: ji, startMin: start });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      const d = dragRef.current; majDrag(null);
      if (!d) return;
      const s2 = slots.find((x) => x.id === d.id); if (!s2) return;
      const nj = JOURS[d.jourIndex], nd = minHHMM(d.startMin), nf = minHHMM(d.startMin + d.durMin);
      if (nj !== s2.jour || nd !== s2.heureDebut) {
        persister(slots.map((x) => x.id === d.id ? { ...x, jour: nj, heureDebut: nd, heureFin: nf } : x));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  // Bilan minutes/matière
  const minutesParMatiere: Record<string, number> = {};
  for (const s of slots) minutesParMatiere[s.titre] = (minutesParMatiere[s.titre] ?? 0) + (toMin(s.heureFin) - toMin(s.heureDebut));
  // Une classe à plusieurs niveaux se compare aux volumes du premier qui en a.
  const niveaux = lireNiveaux(niveau);
  const repere = niveaux.find((n) => HEURES_PROGRAMME[n]);
  const officiel = repere ? HEURES_PROGRAMME[repere] : {};
  const matieresBilan = Array.from(new Set([...Object.keys(officiel), ...Object.keys(minutesParMatiere).filter((m) => MATIERES.includes(m))])).sort();

  return (
    <>
      <div className="toolbar"><AnneeSelect annee={annee} setAnnee={setAnnee} />
        <div className="spacer" />
        {slots.length > 0 && <button className="btn" onClick={() => setDeplacer((v) => !v)}
          style={deplacer ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : undefined}
          title="Glisser les créneaux pour les déplacer">{deplacer ? "✋ Déplacement activé" : "✋ Déplacer"}</button>}
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        <button className="btn" onClick={(e) => openCtx(e, [
          ...(slots.length > 0 ? [{ label: "Imprimer (PDF)", icon: "🖨", onClick: imprimer }] : []),
          ...(slots.length > 0 ? [{ label: "Exporter (fichier)", icon: "⬇️", onClick: exporter }] : []),
          { label: "Importer (fichier)", icon: "⬆️", onClick: () => fileRef.current?.click() },
          ...(slots.length > 0 ? [{ label: `Supprimer l'emploi du temps ${annee}`,
            icon: "🗑", danger: true, sep: true, onClick: viderAnnee }] : []),
        ])}>📄 Fichier ▾</button>
      </div>
      {zoom !== 1 && (
        <div style={{ fontSize: 12, color: "var(--text-2)", margin: "-8px 0 12px", display: "flex", alignItems: "center", gap: 10 }}>
          <div className="spacer" />
          <IndicateurZoom zoom={zoom} onReinitialiser={() => majZoom(1)} />
        </div>
      )}

      {slots.length > 0 && (
        <div className="heures-semaine" aria-label="Temps de travail de la semaine">
          <span>⏱ Temps de travail de la semaine <b>{duree(temps.semaine.total)}</b></span>
          <span>🧑‍🏫 Classe <b>{duree(temps.semaine.classe)}</b></span>
          <span>🗣️ Réunions et formations <b>{duree(temps.semaine.reunion)}</b></span>
        </div>
      )}

      <div ref={cadre} className="card" style={{ padding: 0, overflow: "hidden" }}>
        {/* En-têtes jours */}
        <div style={{ display: "grid", gridTemplateColumns: `44px repeat(5, 1fr)`, borderBottom: "1px solid var(--border)" }}>
          <div />
          {JOURS.map((j) => <div key={j} style={{ textAlign: "center", padding: "8px 0", borderLeft: "1px solid var(--border)", background: "var(--panel-2)", fontWeight: 700, fontSize: 13 }}>{j}</div>)}
        </div>
        {/* Grille */}
        <div ref={colsRef} style={{ display: "grid", gridTemplateColumns: `44px repeat(5, 1fr)` }}>
          <div style={{ position: "relative", height: hauteur }}>
            {heures.map((h, i) => <div key={h} style={{ position: "absolute", top: Math.min(i * hpx - 7, hauteur - 14), right: 6, fontSize: 11, color: "var(--text-2)" }}>{h}h</div>)}
          </div>
          {JOURS.map((j, ji) => {
            const dayNormal = slots.filter((s) => s.jour === j && s.id !== drag?.id);
            const lay = layoutSlots(dayNormal);
            const dragged = drag && drag.jourIndex === ji ? slots.find((s) => s.id === drag.id) : null;
            return (
              <div key={j} onClick={(e) => { if (!deplacer) creerA(j, e); }}
                style={{ position: "relative", height: hauteur, borderLeft: "1px solid var(--border)", cursor: deplacer ? "default" : "pointer" }}>
                {heures.map((_, i) => <div key={i} style={{ position: "absolute", top: i * hpx, left: 0, right: 0, borderTop: "1px solid var(--border)", opacity: 0.5 }} />)}
                {dayNormal.map((s) => {
                  const top = (toMin(s.heureDebut) - EDT_H_DEBUT * 60) / 60 * hpx;
                  const h = Math.max(20, (toMin(s.heureFin) - toMin(s.heureDebut)) / 60 * hpx);
                  const { lane, lanes } = lay.get(s.id) || { lane: 0, lanes: 1 };
                  return (
                    <div key={s.id} className="cren-block"
                      onMouseDown={(e) => onDragStart(s, e)}
                      onClick={(e) => { e.stopPropagation(); if (!deplacer) setEdit(s); }}
                      onContextMenu={(e) => openCtx(e, [
                        { label: "Modifier", icon: "✏️", onClick: () => setEdit(s) },
                        { label: "Dupliquer", icon: "📑", onClick: () => persister([...slots, { ...s, id: newId() }]) },
                        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(s.id) },
                      ])}
                      style={{ position: "absolute", top, height: h - 2, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`,
                        background: couleurHex[couleurPourMatiere(s.titre)] || couleurHex.blue, borderRadius: 7, color: "#fff", padding: "3px 6px",
                        overflow: "hidden", fontSize: 11, lineHeight: 1.25, boxShadow: "0 1px 3px rgba(0,0,0,.2)",
                        outline: deplacer ? "2px dashed rgba(255,255,255,.7)" : "none", cursor: deplacer ? "grab" : "pointer", userSelect: "none" }}>
                      <div style={{ opacity: 0.9 }}>{s.heureDebut}–{s.heureFin}</div>
                      <div style={{ fontWeight: 700 }}>{natureDuSlot(s) === "reunion" ? "🗣️ " : ""}{s.titre}</div>
                      {(s.eleves?.length ?? 0) > 0 && (
                        <div style={{ opacity: 0.92, fontSize: 10, lineHeight: 1.2 }}>
                          👥 {s.eleves!.length} · {s.eleves!
                            .map((id) => (eleves ?? []).find((e) => e.id === id)?.nom.split(" ")[0])
                            .filter(Boolean).join(", ")}
                        </div>
                      )}
                    </div>
                  );
                })}
                {dragged && (() => {
                  const top = (drag!.startMin - EDT_H_DEBUT * 60) / 60 * hpx;
                  const h = Math.max(20, drag!.durMin / 60 * hpx);
                  return (
                    <div className="cren-block" style={{ position: "absolute", top, height: h - 2, left: 3, width: "calc(100% - 6px)",
                      background: couleurHex[couleurPourMatiere(dragged.titre)] || couleurHex.blue, borderRadius: 7, color: "#fff", padding: "3px 6px",
                      overflow: "hidden", fontSize: 11, lineHeight: 1.25, boxShadow: "0 4px 14px rgba(0,0,0,.35)", opacity: 0.92, zIndex: 10, userSelect: "none" }}>
                      <div style={{ opacity: 0.9 }}>{minHHMM(drag!.startMin)}–{minHHMM(drag!.startMin + drag!.durMin)}</div>
                      <div style={{ fontWeight: 700 }}>{dragged.titre}</div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </div>

      {edit && <SlotForm slot={edit} onClose={() => setEdit(null)} eleves={eleves ?? []}
        intitules={[...new Set(slots.map((x) => x.titre).filter(Boolean))]}
        onSave={(s) => { upsert(s); setEdit(null); }} onDelete={() => { supprimer(edit.id); setEdit(null); }} />}

      {/* Bilan hebdomadaire vs volumes officiels */}
      <div className="card" style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>📊 Bilan hebdomadaire {niveaux.length ? `(${niveaux.join(", ")})` : ""}</h3>
        {niveaux.length > 1 && repere && <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>Comparé aux volumes officiels du {repere}.</p>}
        {!repere ? <p style={{ color: "var(--text-2)" }}>Cochez les niveaux de la classe dans les Réglages pour comparer aux volumes officiels.</p> :
          <table className="tbl">
            <thead><tr><th>Matière</th><th>Planifié</th><th>Officiel</th><th>Écart</th></tr></thead>
            <tbody>
              {matieresBilan.map((m) => {
                const planMin = minutesParMatiere[m] ?? 0;
                const refH = officiel[m] ?? 0;
                const ecartMin = planMin - refH * 60;
                return (
                  <tr key={m}>
                    <td>{m}</td>
                    <td>{(planMin / 60).toFixed(1)} h</td>
                    <td>{refH ? refH.toFixed(1) + " h" : "—"}</td>
                    <td style={{ color: Math.abs(ecartMin) <= 15 ? "var(--green)" : ecartMin < 0 ? "var(--danger)" : "var(--orange)", fontWeight: 600 }}>
                      {refH ? (ecartMin >= 0 ? "+" : "") + (ecartMin / 60).toFixed(1) + " h" : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>}
      </div>

      {slots.length > 0 && (
        <div className="card" style={{ marginTop: 18 }}>
          <h3 style={{ marginTop: 0 }}>⏱ Temps de travail de la semaine</h3>
          <table className="tbl">
            <thead><tr><th>Jour</th><th>🧑‍🏫 Classe</th><th>🗣️ Réunions et formations</th><th>Total</th></tr></thead>
            <tbody>
              {JOURS.map((j) => (
                <tr key={j}>
                  <td>{j}</td>
                  <td>{temps.jours[j].classe ? duree(temps.jours[j].classe) : "—"}</td>
                  <td>{temps.jours[j].reunion ? duree(temps.jours[j].reunion) : "—"}</td>
                  <td style={{ fontWeight: 600 }}>{temps.jours[j].total ? duree(temps.jours[j].total) : "—"}</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700 }}>
                <td>Semaine</td>
                <td>{duree(temps.semaine.classe)}</td>
                <td>{duree(temps.semaine.reunion)}</td>
                <td>{duree(temps.semaine.total)}</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
            Le temps de chaque créneau compte en classe ou en réunion selon la nature choisie dans le créneau.
            Deux groupes pris en même temps ne comptent qu’une fois.
          </div>
        </div>
      )}

    </>
  );
}

// ── Travail de cycle : comparaison des programmations entre collègues ────────
const NIVEAUX_ORDRE = ["TPS", "PS", "MS", "GS", "CP", "CE1", "CE2", "CM1", "CM2", "6e"];
const PALETTE_COLLEGUES = ["teal", "orange", "pink", "green", "indigo", "brown", "cyan"];
const rangNiveau = (n: string) => { const i = NIVEAUX_ORDRE.findIndex((x) => n.toUpperCase().includes(x)); return i < 0 ? 99 : i; };
const initiales = (col: { mienne: boolean; enseignant: string }) =>
  col.mienne ? "★" : (col.enseignant.split(/[^A-Za-zÀ-ÿ]+/).filter(Boolean).slice(0, 2).map((m) => m[0]).join("").toUpperCase() || "?");

// Contenu réel d'une activité : son intitulé + ce qui est prévu par période
// (texte de la case + séquences reliées).
interface ActCell { p: number; texte: string; seqs: string[] }
interface Activite { label: string; cellules: ActCell[] }

// Parse lignesJSON → domaines { clé → { label, activités détaillées } }.
function parseDomaines(lignesJson: string): { ordre: string[]; labels: Record<string, string>; acts: Record<string, Activite[]> } {
  let lignes: Ligne[] = []; try { lignes = JSON.parse(lignesJson); } catch { /* */ }
  const ordre: string[] = []; const labels: Record<string, string> = {}; const acts: Record<string, Activite[]> = {};
  let courant: string | null = null;
  for (const l of lignes) {
    if (l.estDomaine) {
      const lab = (l.label || "").trim(); if (!lab) { courant = null; continue; }
      const cle = lab.toLowerCase(); courant = cle;
      if (!labels[cle]) { labels[cle] = lab; ordre.push(cle); acts[cle] = []; }
    } else if (courant) {
      const cellules: ActCell[] = [];
      [l.p1, l.p2, l.p3, l.p4, l.p5].forEach((texte, i) => {
        const p = i + 1;
        const seqs = l.seqs?.[`p${p}`] ?? [];
        const t = (texte || "").trim();
        if (t || seqs.length) cellules.push({ p, texte: t, seqs });
      });
      const label = (l.label || "").trim();
      if (label || cellules.length) (acts[courant] ??= []).push({ label, cellules });
    }
  }
  return { ordre, labels, acts };
}

function TravailDeCycle({ annee, setAnnee }: AnneeProps) {
  const { data, reload } = useAsync(() => api.programmationsFinaleList(), []);
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const seqTitre: Record<string, string> = {};
  for (const s of sequences ?? []) seqTitre[s.id] = s.titre;
  const [moi, setMoi] = React.useState({ niveau: "", nom: "" });
  const [pending, setPending] = React.useState<{ lignesJson: string; annee: string } | null>(null);
  const [tag, setTag] = React.useState({ niveau: "CP", enseignant: "" });
  const fileRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    Promise.all([api.settingGet("niveauClasse"), api.settingGet("enseignantNom")]).then(([n, nm]) => setMoi({ niveau: n ?? "", nom: nm ?? "" }));
  }, []);

  // La programmation de la classe, et celles de ses niveaux.
  const miennes = (data ?? []).filter((p) => p.annee === annee && estALaClasse(p) && lireLignes(p).length > 0);
  const mienne = miennes.find((p) => !p.niveau) ?? miennes[0];
  const importees = (data ?? []).filter((p) => p.estImportee && p.annee === annee);
  const colonnes = [
    // La classe se distingue de ses niveaux, et se range à son niveau à elle.
    ...miennes.map((p) => ({ prog: p, niveau: p.niveau || (moi.niveau ? `Ma classe (${moi.niveau})` : "Ma classe"), enseignant: "Moi", mienne: true })),
    ...importees.map((p) => ({ prog: p, niveau: p.niveau || "?", enseignant: p.enseignant || "Collègue", mienne: false })),
  ].sort((a, b) => rangNiveau(a.niveau) - rangNiveau(b.niveau));

  const parsed = colonnes.map((c) => ({ col: c, dom: parseDomaines(c.prog.lignesJson) }));
  // Union ordonnée des domaines (tri alpha).
  const labels: Record<string, string> = {};
  for (const { dom } of parsed) for (const cle of dom.ordre) if (!labels[cle]) labels[cle] = dom.labels[cle];
  const domaines = Object.keys(labels).sort((a, b) => labels[a].localeCompare(labels[b]));

  const exporter = () => {
    if (!mienne) return;
    const bundle = { annee: mienne.annee, lignesJson: mienne.lignesJson, niveau: moi.niveau, enseignant: moi.nom || "Moi" };
    telechargerTexte(`programmation-${moi.niveau || "classe"}-${annee}.json`, JSON.stringify(bundle, null, 2));
  };
  const onFichier = async (file: File) => {
    try {
      const b = JSON.parse(await file.text());
      setPending({ lignesJson: b.lignesJson || "[]", annee: b.annee || annee });
      setTag({ niveau: b.niveau || "CP", enseignant: b.enseignant || file.name.replace(/\.json$/, "") });
    } catch { toast("Fichier de programmation invalide.", { icone: "⚠️" }); }
  };
  const confirmerImport = async () => {
    if (!pending) return;
    await api.programmationFinaleSave({ id: newId(), annee: pending.annee, lignesJson: pending.lignesJson, niveau: tag.niveau, enseignant: tag.enseignant.trim() || "Collègue", estImportee: true });
    setPending(null); reload();
  };

  return (
    <>
      <div className="toolbar">
        <AnneeSelect annee={annee} setAnnee={setAnnee} />
        <span className="chip">Comparaison par domaine</span>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFichier(f); e.target.value = ""; }} />
        <button className="btn" onClick={exporter} disabled={!mienne}>⬇️ Exporter ma programmation</button>
        <button className="btn primary" onClick={() => fileRef.current?.click()}>⬆️ Importer un collègue</button>
      </div>
      {colonnes.length === 0 ? <Empty icone="👥" titre="Aucune programmation" sous="Créez votre programmation, puis importez celles de vos collègues pour comparer par domaine." /> :
        <div className="card" style={{ padding: 0, overflow: "auto" }}>
          <table className="tbl" style={{ minWidth: 200 + colonnes.length * 220 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 160, position: "sticky", left: 0, background: "var(--panel-2)" }}>Domaine</th>
                {parsed.map(({ col }, i) => {
                  const c = col.mienne ? "var(--accent)" : couleurHex[PALETTE_COLLEGUES[i % PALETTE_COLLEGUES.length]];
                  return (
                    <th key={i} style={{ minWidth: 200, borderTop: `3px solid ${c}` }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 30, height: 30, borderRadius: "50%", background: c, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12 }}>{initiales(col)}</span>
                        <div style={{ textTransform: "none" }}>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{col.enseignant}</div>
                          <div className="meta" style={{ fontSize: 11 }}>{col.niveau}</div>
                        </div>
                        {!col.mienne && <button className="btn ghost sm" onClick={() => api.programmationFinaleDelete(col.prog.id).then(reload)} aria-label="Supprimer">🗑</button>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {domaines.map((cle) => (
                <tr key={cle}>
                  <td style={{ fontWeight: 700, position: "sticky", left: 0, background: "var(--panel)" }}>📁 {labels[cle]}</td>
                  {parsed.map(({ dom }, i) => {
                    const a = dom.acts[cle] ?? [];
                    return <td key={i} style={{ verticalAlign: "top", fontSize: 12.5 }}>
                      {a.length === 0 ? <span style={{ color: "var(--text-2)" }}>—</span> :
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {a.map((act, k) => (
                            <div key={k}>
                              {act.label && <div style={{ fontWeight: 600 }}>{act.label}</div>}
                              {act.cellules.length > 0 && (
                                <ul style={{ margin: "2px 0 0", paddingLeft: 15 }}>
                                  {act.cellules.map((cel) => (
                                    <li key={cel.p} style={{ marginBottom: 3 }}>
                                      <b>P{cel.p}</b>{cel.texte ? ` · ${cel.texte}` : ""}
                                      {cel.seqs.filter((id) => seqTitre[id]).map((id) => (
                                        <span key={id} className="chip" style={{ marginLeft: 4, fontSize: 10.5 }}>📚 {seqTitre[id]}</span>
                                      ))}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>}
                    </td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

      {pending && (
        <Modal titre="Programmation d'un collègue" onClose={() => setPending(null)}
          footer={<><button className="btn" onClick={() => setPending(null)}>Annuler</button>
            <button className="btn primary" disabled={!tag.enseignant.trim()} onClick={confirmerImport}>Importer</button></>}>
          <p style={{ marginTop: 0, color: "var(--text-2)", fontSize: 13 }}>Indiquez le niveau et le nom de l'enseignant pour ce tableau.</p>
          <div className="row">
            <div className="field"><label>Niveau</label>
              <Select value={tag.niveau} onChange={(e) => setTag({ ...tag, niveau: e.target.value })}>{NIVEAUX_ORDRE.map((n) => <option key={n}>{n}</option>)}</Select></div>
            <div className="field"><label>Enseignant</label>
              <Input value={tag.enseignant} placeholder="Nom du collègue" onChange={(e) => setTag({ ...tag, enseignant: e.target.value })} /></div>
          </div>
        </Modal>
      )}
    </>
  );
}
