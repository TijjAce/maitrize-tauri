import React from "react";
import { api, Creneau, Eleve, couleurHex, couleurPourMatiere, newId } from "../api";
import { Field, Input, Select, Modal, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { printHTML, escapeHtml } from "../print";
import { isoJour, hhmm } from "../dates";

// ── Plan de salle ─────────────────────────────────────────────────────────
// L'aménagement (mobilier + places) est unique pour la salle ; le placement
// des élèves suit l'emploi du temps réel : un plan par créneau de la journée,
// et seuls les élèves présents sur ce créneau apparaissent dans la salle.
// La roulette fait défiler la journée, créneau par créneau.

type TypeElem = "place" | "table" | "bureau" | "tapis" | "meuble" | "mur" | "porte" | "fenetre";
interface ElemSalle { id: string; type: TypeElem; x: number; y: number; w: number; h: number; label: string }
/** Qui est assis où, et pourquoi, sur un créneau donné. */
interface Plan { places: Record<string, string>; notes: Record<string, string> }

/**
 * Un agencement nommé de la salle : « Îlots », « Frontal », « En U »…
 *
 * Une même classe se dispose autrement selon le travail visé. Chaque profil a
 * son mobilier et ses places ; les identifiants de place étant uniques, les
 * placements de deux profils coexistent sans se marcher dessus — revenir à un
 * agencement retrouve le placement qu'on y avait fait.
 */
interface Profil { id: string; nom: string; elements: ElemSalle[] }

const PLAN_VIDE: Plan = { places: {}, notes: {} };
const CANVAS_W = 900, CANVAS_H = 560, GRILLE = 10;

const MODELES: { t: TypeElem; label: string; ico: string; w: number; h: number }[] = [
  { t: "place", label: "Place élève", ico: "🪑", w: 70, h: 70 },
  { t: "table", label: "Table", ico: "▭", w: 170, h: 70 },
  { t: "bureau", label: "Bureau enseignant", ico: "🧑‍🏫", w: 150, h: 60 },
  { t: "tapis", label: "Coin regroupement", ico: "🟩", w: 200, h: 130 },
  { t: "meuble", label: "Meuble / étagère", ico: "🗄", w: 130, h: 40 },
  { t: "mur", label: "Mur", ico: "🧱", w: 240, h: 14 },
  { t: "porte", label: "Porte", ico: "🚪", w: 60, h: 16 },
  { t: "fenetre", label: "Fenêtre", ico: "🪟", w: 140, h: 12 },
];

const STYLE_ELEM: Record<TypeElem, React.CSSProperties> = {
  place: { background: "var(--panel-2)", border: "2px dashed var(--border)", borderRadius: 12 },
  table: { background: "color-mix(in srgb, #b98a5a 26%, var(--panel-2))", border: "1px solid #b98a5a", borderRadius: 8 },
  bureau: { background: "color-mix(in srgb, var(--accent) 20%, var(--panel-2))", border: "1px solid var(--accent)", borderRadius: 8 },
  tapis: { background: "color-mix(in srgb, #57b873 20%, var(--panel-2))", border: "1px dashed #57b873", borderRadius: 14 },
  meuble: { background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 4 },
  mur: { background: "var(--text-2)", border: "none", borderRadius: 2 },
  porte: { background: "#b98a5a", border: "none", borderRadius: 3 },
  fenetre: { background: "#7cb7e8", border: "none", borderRadius: 2 },
};

const snap = (v: number) => Math.round(v / GRILLE) * GRILLE;

const P = 70;  // côté d'une place
/** Bureau, porte et fenêtre, communs à tous les agencements proposés. */
const decor = (): ElemSalle[] => [
  { id: newId(), type: "bureau", x: 375, y: 30, w: 150, h: 60, label: "Bureau" },
  { id: newId(), type: "porte", x: 40, y: 14, w: 60, h: 16, label: "" },
  { id: newId(), type: "fenetre", x: 700, y: 14, w: 160, h: 12, label: "" },
];
const place = (x: number, y: number, label = ""): ElemSalle =>
  ({ id: newId(), type: "place", x, y, w: P, h: P, label });

/**
 * Agencements types : ils épargnent une longue mise en place à la souris.
 * Tout reste déplaçable ensuite.
 */
const AGENCEMENTS: { id: string; nom: string; ico: string; sous: string; build: () => ElemSalle[] }[] = [
  {
    id: "ilots", nom: "Îlots", ico: "🧩", sous: "Travail de groupe — 4 îlots de 4",
    build: () => {
      const els = decor();
      const coins: [number, number][] = [[130, 170], [500, 170], [130, 380], [500, 380]];
      coins.forEach(([x, y], i) => {
        els.push({ id: newId(), type: "table", x: x + P, y: y + 18, w: 110, h: 100, label: `Îlot ${i + 1}` });
        els.push(place(x, y, `Îlot ${i + 1}·1`), place(x + P + 110, y, `Îlot ${i + 1}·2`));
        els.push(place(x, y + 70, `Îlot ${i + 1}·3`), place(x + P + 110, y + 70, `Îlot ${i + 1}·4`));
      });
      return els;
    },
  },
  {
    id: "frontal", nom: "Frontal", ico: "🎯", sous: "Face au tableau — 4 rangs de 4",
    build: () => {
      const els = decor();
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          // Un couloir central sépare les deux colonnes doubles.
          const x = 110 + c * (P + 8) + (c >= 2 ? 90 : 0);
          els.push(place(x, 170 + r * (P + 30), `Rang ${r + 1}·${c + 1}`));
        }
      }
      return els;
    },
  },
  {
    id: "u", nom: "En U", ico: "🅄", sous: "Débat, échange — tous se voient",
    build: () => {
      const els = decor();
      let n = 0;
      const nom = () => `U·${++n}`;
      for (let i = 0; i < 5; i++) els.push(place(120, 150 + i * (P + 14), nom()));
      for (let i = 0; i < 4; i++) els.push(place(210 + i * (P + 14), 490, nom()));
      for (let i = 4; i >= 0; i--) els.push(place(620, 150 + i * (P + 14), nom()));
      return els;
    },
  },
  {
    id: "regroupement", nom: "Coin regroupement", ico: "🟩", sous: "Rassemblement au sol + quelques places",
    build: () => {
      const els = decor();
      els.push({ id: newId(), type: "tapis", x: 280, y: 150, w: 320, h: 200, label: "Coin regroupement" });
      for (let i = 0; i < 4; i++) els.push(place(140 + i * (P + 20), 420, `Table ${i + 1}`));
      return els;
    },
  },
];
const iso = isoJour;
const fmtJour = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const teinte = (c: Creneau) => couleurHex[c.couleur] || couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue;
/**
 * Élèves présents sur un créneau : la liste restreinte s'il y en a une,
 * sinon toute la classe (cas de la classe ordinaire, où personne n'est coché).
 * Les identifiants inconnus sont écartés — un élève supprimé ne doit pas
 * laisser un fantôme dans la salle.
 */
export const idsDuCreneau = (c: Creneau | undefined, tous: Eleve[]) => {
  if (!c) return [] as string[];
  try {
    const ids = JSON.parse(c.elevesJson || "[]") as string[];
    if (ids.length) return ids.filter((id) => tous.some((e) => e.id === id));
  } catch { /* liste illisible : on retombe sur la classe entière */ }
  return tous.map((e) => e.id);
};

/**
 * Assied les élèves non placés sur les places libres, dans l'ordre de lecture
 * (de haut en bas, puis de gauche à droite). Une place tenue par un élève
 * absent de ce créneau compte comme libre. S'il y a plus d'élèves que de
 * places, les derniers restent debout plutôt que d'en déloger un.
 */
/**
 * Nom affichable de chaque place : l'étiquette saisie, sinon « Place N »
 * numérotée dans l'ordre de lecture. Sans quoi une liste déroulante de places
 * n'offrirait que des identifiants illisibles.
 */
/** Tout ce qui décrit la salle, hors élèves : agencements et placements. */
export interface EtatSalle {
  profils: Profil[];
  plans: Record<string, Plan>;
  plansMatiere: Record<string, Plan>;
  profilCreneau: Record<string, string>;
  profilMatiere: Record<string, string>;
}

const lireJson = <T,>(brut: string | null, defaut: T): T => {
  try { return brut ? JSON.parse(brut) as T : defaut; } catch { return defaut; }
};

/** Lit l'état de la salle depuis les réglages. */
export async function chargerEtatSalle(): Promise<EtatSalle> {
  const [pr, pl, pm, pc, pmat] = await Promise.all([
    api.settingGet("salle:profils"), api.settingGet("salle:plans"), api.settingGet("salle:plansMatiere"),
    api.settingGet("salle:profilCreneau"), api.settingGet("salle:profilMatiere"),
  ]);
  return {
    profils: lireJson<Profil[]>(pr, []),
    plans: lireJson<Record<string, Plan>>(pl, {}),
    plansMatiere: lireJson<Record<string, Plan>>(pm, {}),
    profilCreneau: lireJson<Record<string, string>>(pc, {}),
    profilMatiere: lireJson<Record<string, string>>(pmat, {}),
  };
}

/**
 * Agencement d'un créneau : celui qu'on lui a donné, sinon celui retenu pour
 * sa matière, sinon le premier. Une seule définition, partagée par l'onglet et
 * par l'aperçu du planning — deux règles séparées finiraient par diverger.
 */
export function profilDuCreneau(etat: EtatSalle, c: Creneau | undefined): Profil | undefined {
  const id = (c ? (etat.profilCreneau[c.id] ?? etat.profilMatiere[c.matiere]) : undefined) ?? etat.profils[0]?.id;
  return etat.profils.find((p) => p.id === id);
}

/** Placement d'un créneau, avec la même cascade que l'agencement. */
export function planDuCreneau(etat: EtatSalle, c: Creneau | undefined): Plan {
  if (!c) return PLAN_VIDE;
  return etat.plans[c.id] ?? etat.plansMatiere[c.matiere] ?? PLAN_VIDE;
}

export function nomsDesPlaces(places: ElemSalle[]): Record<string, string> {
  const ordre = [...places].sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const out: Record<string, string> = {};
  ordre.forEach((pl, i) => { out[pl.id] = pl.label.trim() || `Place ${i + 1}`; });
  return out;
}

/**
 * Élèves réellement assis dans cet agencement.
 *
 * Un plan porte les placements de **tous** les agencements — chaque place a
 * son identifiant propre. Compter sans filtrer sur les places de l'agencement
 * courant gonfle le total avec les sièges d'une autre disposition.
 */
export function assisDansProfil(
  places: { id: string }[],
  plan: Plan,
  estPresent: (id: string | undefined) => boolean,
): [string, string][] {
  const ids = new Set(places.map((p) => p.id));
  return Object.entries(plan.places).filter(([k, id]) => ids.has(k) && estPresent(id));
}

export function remplirPlacesLibres(
  places: { id: string; x: number; y: number }[],
  occupation: Record<string, string>,
  aPlacer: string[],
  estPresent: (id: string | undefined) => boolean,
): Record<string, string> {
  const libres = places
    .filter((pl) => !occupation[pl.id] || !estPresent(occupation[pl.id]))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));
  const out = { ...occupation };
  for (let i = 0; i < Math.min(libres.length, aPlacer.length); i++) out[libres[i].id] = aPlacer[i];
  return out;
}

function usePhotos(eleves: Eleve[]) {
  const [photos, setPhotos] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let annule = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const e of eleves) {
        if (!e.photoFichier) continue;
        try { out[e.id] = `data:image;base64,${await api.fichierRead(e.photoFichier)}`; } catch { /* ignore */ }
      }
      if (!annule) setPhotos(out);
    })();
    return () => { annule = true; };
  }, [eleves.map((e) => e.id + ":" + (e.photoFichier ?? "")).join("|")]);
  return photos;
}

function Avatar({ eleve, photo, taille }: { eleve: Eleve; photo?: string; taille: number }) {
  if (photo) return <img src={photo} alt="" style={{ width: taille, height: taille, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: taille, height: taille, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: taille * 0.45, flexShrink: 0 }}>
      {(eleve.nom || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export function PlanSalleTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const photos = usePhotos(eleves ?? []);

  const [jour, setJour] = React.useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
  const jourIso = iso(jour);
  const { data: creneauxBruts } = useAsync(() => api.creneauxList(jourIso, jourIso), [jourIso]);
  const creneaux = React.useMemo(
    () => [...(creneauxBruts ?? [])].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
    [creneauxBruts]);

  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => { setIdx(0); }, [jourIso]);
  const creneau = creneaux[Math.min(idx, Math.max(0, creneaux.length - 1))];

  const [profils, setProfils] = React.useState<Profil[]>([]);
  // Agencement retenu pour un créneau, puis pour sa matière : la « Scolarité »
  // du mardi retrouve la disposition de celle de lundi.
  const [profilCreneau, setProfilCreneau] = React.useState<Record<string, string>>({});
  const [profilMatiere, setProfilMatiere] = React.useState<Record<string, string>>({});
  // Plans explicites par créneau, et dernier plan retenu pour chaque matière :
  // un créneau sans plan reprend celui de la même matière (la « Scolarité » du
  // mardi retrouve le placement de celle de lundi) sans rien réenregistrer.
  const [plans, setPlans] = React.useState<Record<string, Plan>>({});
  const [plansMatiere, setPlansMatiere] = React.useState<Record<string, Plan>>({});
  const [mode, setMode] = React.useState<"placement" | "amenagement">("placement");
  const [choix, setChoix] = React.useState<ElemSalle | null>(null);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [arme, setArme] = React.useState<string | null>(null);
  // Affectation place par place au clic, ou élève par élève dans une liste.
  const [parEleve, setParEleve] = React.useState(false);
  const [charge, setCharge] = React.useState(false);
  const [renommer, setRenommer] = React.useState<Profil | null>(null);
  const [supprProfil, setSupprProfil] = React.useState<Profil | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      const [pr, el, pl, pm, pc, pmat] = await Promise.all([
        api.settingGet("salle:profils"), api.settingGet("salle:elements"),
        api.settingGet("salle:plans"), api.settingGet("salle:plansMatiere"),
        api.settingGet("salle:profilCreneau"), api.settingGet("salle:profilMatiere"),
      ]);
      let liste: Profil[] = [];
      try { liste = pr ? JSON.parse(pr) : []; } catch { liste = []; }
      if (liste.length === 0) {
        // Migration : l'agencement unique d'avant devient le premier profil.
        let anciens: ElemSalle[] = [];
        try { anciens = el ? JSON.parse(el) : []; } catch { anciens = []; }
        if (anciens.length) {
          liste = [{ id: newId(), nom: "Ma salle", elements: anciens }];
          api.settingSet("salle:profils", JSON.stringify(liste));
        }
      }
      profilsRef.current = liste; setProfils(liste);
      try { const v = pl ? JSON.parse(pl) : {}; plansRef.current = v; setPlans(v); } catch { /* vide */ }
      try { const v = pm ? JSON.parse(pm) : {}; matRef.current = v; setPlansMatiere(v); } catch { /* vide */ }
      try { setProfilCreneau(pc ? JSON.parse(pc) : {}); } catch { /* vide */ }
      try { setProfilMatiere(pmat ? JSON.parse(pmat) : {}); } catch { /* vide */ }
      setCharge(true);
    })();
  }, []);

  // Références toujours à jour : le glisser-déposer met l'état à jour à chaque
  // frame mais n'enregistre qu'au relâchement, et deux placements rapprochés
  // ne doivent pas s'écraser l'un l'autre.
  const profilsRef = React.useRef<Profil[]>([]);
  profilsRef.current = profils;
  const plansRef = React.useRef<Record<string, Plan>>({});
  const matRef = React.useRef<Record<string, Plan>>({});

  const persistProfils = (liste: Profil[]) => {
    profilsRef.current = liste; setProfils(liste);
    api.settingSet("salle:profils", JSON.stringify(liste));
  };

  // ── Agencement courant ────────────────────────────────────────────────
  // Choisi pour ce créneau, sinon retenu pour sa matière, sinon le premier.
  const etat: EtatSalle = { profils, plans, plansMatiere, profilCreneau, profilMatiere };
  const profil = profilDuCreneau(etat, creneau);
  const profilId = profil?.id ?? "";
  const elements = profil?.elements ?? [];

  /** Enregistre les éléments dans l'agencement courant seulement. */
  const persistElements = (e: ElemSalle[]) =>
    persistProfils(profilsRef.current.map((p) => p.id === profilId ? { ...p, elements: e } : p));

  /** Rattache un agencement au créneau courant, et le retient pour sa matière. */
  const choisirProfil = (id: string) => {
    if (!creneau) return;
    const pc = { ...profilCreneau, [creneau.id]: id };
    const pm = { ...profilMatiere, [creneau.matiere]: id };
    setProfilCreneau(pc); setProfilMatiere(pm);
    api.settingSet("salle:profilCreneau", JSON.stringify(pc));
    api.settingSet("salle:profilMatiere", JSON.stringify(pm));
    setSelId(null);
  };

  const heritage = creneau ? plansMatiere[creneau.matiere] : undefined;
  const explicite = creneau ? plans[creneau.id] : undefined;
  const plan = explicite ?? heritage ?? PLAN_VIDE;

  /** Enregistre le plan du créneau courant, et le retient pour sa matière. */
  const persistPlan = (p: Plan) => {
    if (!creneau) return;
    const np = { ...plansRef.current, [creneau.id]: p };
    const nm = { ...matRef.current, [creneau.matiere]: p };
    plansRef.current = np; matRef.current = nm;
    setPlans(np); setPlansMatiere(nm);
    api.settingSet("salle:plans", JSON.stringify(np));
    api.settingSet("salle:plansMatiere", JSON.stringify(nm));
  };

  const places = elements.filter((e) => e.type === "place");
  const nomsPlaces = React.useMemo(() => nomsDesPlaces(places), [elements]);
  // Un plan porte les placements de TOUS les agencements : les places d'un
  // autre profil ne doivent ni compter, ni bloquer un élève ici.
  const idsPlaces = React.useMemo(() => new Set(places.map((pl) => pl.id)), [elements]);
  const presents = React.useMemo(() => {
    const ids = idsDuCreneau(creneau, eleves ?? []);
    return (eleves ?? []).filter((e) => ids.includes(e.id));
  }, [creneau, eleves]);
  const estPresent = (id: string | undefined) => !!id && presents.some((e) => e.id === id);
  // Un plan hérité peut contenir des élèves absents ce créneau-là : ils ne
  // s'affichent pas dans la salle, mais restent enregistrés pour le créneau
  // d'origine.
  const assis = assisDansProfil(places, plan, estPresent);
  const nonPlaces = presents.filter((e) => !assis.some(([, id]) => id === e.id));

  /** Installe un élève sur une place, en le retirant de son ancienne. */
  const asseoir = (placeId: string, eleveId: string | null, note?: string) => {
    const p = { ...plan.places }; const n = { ...plan.notes };
    // On ne libère que ses places dans cet agencement : sa place dans une
    // autre disposition doit survivre à un aller-retour.
    if (eleveId) { for (const k of Object.keys(p)) if (p[k] === eleveId && idsPlaces.has(k)) delete p[k]; p[placeId] = eleveId; }
    else delete p[placeId];
    if (note) n[placeId] = note; else delete n[placeId];
    persistPlan({ places: p, notes: n });
  };

  const placerAuto = () => {
    const avant = Object.keys(plan.places).length;
    const p = remplirPlacesLibres(places, plan.places, nonPlaces.map((e) => e.id), estPresent);
    const poses = Object.keys(p).length - avant;
    if (!poses) { toast("Rien à placer.", { icone: "ℹ️" }); return; }
    persistPlan({ places: p, notes: plan.notes });
    toast(`${poses} élève(s) placé(s).`, { icone: "🪑" });
  };

  const viderPlan = () => {
    const p = { ...plan.places };
    for (const [k, id] of Object.entries(p)) if (idsPlaces.has(k) && estPresent(id)) delete p[k];
    persistPlan({ places: p, notes: plan.notes });
  };

  const ajouterElement = (m: typeof MODELES[number]) => {
    const el: ElemSalle = { id: newId(), type: m.t, x: snap(40 + Math.random() * 60), y: snap(40 + Math.random() * 60), w: m.w, h: m.h, label: "" };
    persistElements([...elements, el]);
    setSelId(el.id);
  };

  // Supprime un élément et libère la place correspondante dans tous les plans.
  const supprimerElement = (id: string) => {
    persistElements(elements.filter((e) => e.id !== id));
    const nettoie = (src: Record<string, Plan>) => {
      let touche = false;
      const out: Record<string, Plan> = {};
      for (const [k, p] of Object.entries(src)) {
        if (!p.places[id] && !p.notes[id]) { out[k] = p; continue; }
        const places = { ...p.places }; const notes = { ...p.notes };
        delete places[id]; delete notes[id];
        out[k] = { places, notes }; touche = true;
      }
      return touche ? out : null;
    };
    const np = nettoie(plansRef.current);
    const nm = nettoie(matRef.current);
    if (np) { plansRef.current = np; setPlans(np); api.settingSet("salle:plans", JSON.stringify(np)); }
    if (nm) { matRef.current = nm; setPlansMatiere(nm); api.settingSet("salle:plansMatiere", JSON.stringify(nm)); }
    if (selId === id) setSelId(null);
  };

  const dupliquerElement = (el: ElemSalle) => {
    const copie: ElemSalle = { ...el, id: newId(), x: Math.min(CANVAS_W - el.w, el.x + 20), y: Math.min(CANVAS_H - el.h, el.y + 20) };
    persistElements([...elements, copie]);
    setSelId(copie.id);
  };

  // Touche Suppr/Retour arrière sur l'élément sélectionné (mode aménagement).
  React.useEffect(() => {
    if (mode !== "amenagement" || !selId) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      const t = ev.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      ev.preventDefault();
      supprimerElement(selId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selId, elements, plans, plansMatiere]);

  // Flèches ← → : passer d'un créneau à l'autre sans quitter le plan.
  React.useEffect(() => {
    if (mode !== "placement" || creneaux.length < 2) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      const t = ev.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      setIdx((i) => Math.max(0, Math.min(creneaux.length - 1, i + (ev.key === "ArrowRight" ? 1 : -1))));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, creneaux.length]);

  /** Crée un agencement à partir d'un modèle, et le rend actif. */
  const creerProfil = (modele?: typeof AGENCEMENTS[number]) => {
    const p: Profil = {
      id: newId(),
      nom: modele ? modele.nom : `Agencement ${profils.length + 1}`,
      elements: modele ? modele.build() : [],
    };
    persistProfils([...profilsRef.current, p]);
    choisirProfil(p.id);
    toast(modele ? `Agencement « ${modele.nom} » créé.` : "Agencement vide créé.", { icone: "🪑" });
  };

  /** Copie l'agencement courant : point de départ pour une variante. */
  const dupliquerProfil = () => {
    if (!profil) return;
    // Les places reçoivent de nouveaux identifiants : la copie a ses propres
    // placements, modifier l'une ne touche pas l'autre.
    const copie: Profil = {
      id: newId(), nom: `${profil.nom} (copie)`,
      elements: profil.elements.map((e) => ({ ...e, id: newId() })),
    };
    persistProfils([...profilsRef.current, copie]);
    choisirProfil(copie.id);
  };

  const supprimerProfil = (cible: Profil) => {
    const reste = profilsRef.current.filter((p) => p.id !== cible.id);
    persistProfils(reste);
    // Les créneaux qui pointaient dessus retombent sur le premier agencement.
    const nettoie = (m: Record<string, string>) =>
      Object.fromEntries(Object.entries(m).filter(([, v]) => v !== cible.id));
    const pc = nettoie(profilCreneau); const pm = nettoie(profilMatiere);
    setProfilCreneau(pc); setProfilMatiere(pm);
    api.settingSet("salle:profilCreneau", JSON.stringify(pc));
    api.settingSet("salle:profilMatiere", JSON.stringify(pm));
    toast("Agencement supprimé.", { icone: "🗑" });
  };

  // ── Déplacement / redimensionnement (mode aménagement) ────────────────
  const dragRef = React.useRef<{ id: string; dx: number; dy: number; resize: boolean; w0: number; h0: number; x0: number; y0: number } | null>(null);
  const onMouseDownElem = (el: ElemSalle, e: React.MouseEvent, resize = false) => {
    if (mode !== "amenagement") return;
    e.preventDefault(); e.stopPropagation();
    setSelId(el.id);
    const box = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { id: el.id, dx: e.clientX - box.left - el.x, dy: e.clientY - box.top - el.y, resize, w0: el.w, h0: el.h, x0: e.clientX, y0: e.clientY };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      // Mise à jour à chaque frame, enregistrement au relâchement seulement.
      setProfils((cur) => {
        const suite = cur.map((pr) => pr.id !== profilId ? pr : { ...pr, elements: pr.elements.map((x) => {
          if (x.id !== d.id) return x;
          if (d.resize) return { ...x, w: Math.max(20, snap(d.w0 + (ev.clientX - d.x0))), h: Math.max(12, snap(d.h0 + (ev.clientY - d.y0))) };
          const nx = Math.max(0, Math.min(CANVAS_W - x.w, snap(ev.clientX - box.left - d.dx)));
          const ny = Math.max(0, Math.min(CANVAS_H - x.h, snap(ev.clientY - box.top - d.dy)));
          return { ...x, x: nx, y: ny };
        }) });
        profilsRef.current = suite;
        return suite;
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      dragRef.current = null;
      api.settingSet("salle:profils", JSON.stringify(profilsRef.current));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  // ── Impression ────────────────────────────────────────────────────────
  const planHtml = (c: Creneau, p: Plan) => {
    const ids = idsDuCreneau(c, eleves ?? []);
    const el = (e: ElemSalle) => {
      const eleveId = p.places[e.id];
      const eleve = ids.includes(eleveId ?? "") ? (eleves ?? []).find((x) => x.id === eleveId) : undefined;
      const base = `position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;box-sizing:border-box;`;
      const styles: Record<TypeElem, string> = {
        place: "border:2px dashed #9aa6c2;border-radius:12px;background:#f6f7fb;",
        table: "border:1px solid #b98a5a;background:#efe1d2;border-radius:8px;",
        bureau: "border:1px solid #5b6bd6;background:#e3e7fb;border-radius:8px;",
        tapis: "border:1px dashed #57b873;background:#e6f5ec;border-radius:14px;",
        meuble: "border:1px solid #cfd4e2;background:#f0f2f8;border-radius:4px;",
        mur: "background:#4b5262;border-radius:2px;",
        porte: "background:#b98a5a;border-radius:3px;",
        fenetre: "background:#7cb7e8;border-radius:2px;",
      };
      const contenu = e.type === "place"
        ? (eleve ? `<div style="font-size:11px;font-weight:700;text-align:center;padding-top:6px">${escapeHtml(eleve.nom)}</div>
             ${p.notes[e.id] ? `<div style="font-size:9px;text-align:center;color:#687087">${escapeHtml(p.notes[e.id])}</div>` : ""}` : "")
        : (e.label ? `<div style="font-size:10px;text-align:center;padding-top:4px;color:#3b4252">${escapeHtml(e.label)}</div>` : "");
      return `<div style="${base}${styles[e.type]}">${contenu}</div>`;
    };
    const n = Object.values(p.places).filter((id) => ids.includes(id)).length;
    return `<h2 style="margin:0 0 2px">${hhmm(c.heureDebut)}–${hhmm(c.heureFin)} · ${escapeHtml(c.matiere || "Créneau")}</h2>
      <div class="meta">${n} élève(s) placé(s) sur ${ids.length} présent(s)</div>
      <div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;border:1px solid #cfd4e2;border-radius:8px;background:#fff">
        ${elements.map(el).join("")}
      </div>`;
  };

  const imprimer = () => {
    if (!creneau) return;
    printHTML(`Plan de salle — ${fmtJour(jour)}`,
      `<h1>Plan de salle — ${escapeHtml(fmtJour(jour))}</h1>${planHtml(creneau, plan)}`);
  };

  const imprimerJournee = () => {
    if (!creneaux.length) return;
    const pages = creneaux.map((c, i) => {
      const p = plans[c.id] ?? plansMatiere[c.matiere] ?? PLAN_VIDE;
      return `<div style="${i ? "page-break-before:always;" : ""}">${planHtml(c, p)}</div>`;
    }).join("");
    printHTML(`Plan de salle — journée du ${fmtJour(jour)}`,
      `<h1>Plans de salle — ${escapeHtml(fmtJour(jour))}</h1>${pages}`);
  };

  const decalerJour = (n: number) => { const d = new Date(jour); d.setDate(d.getDate() + n); setJour(d); };
  const estAujourdhui = jourIso === iso(new Date());

  if (!charge) return <div />;

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <button className="btn sm" onClick={() => decalerJour(-1)} aria-label="Jour précédent">←</button>
        <b style={{ minWidth: 180, textAlign: "center", textTransform: "capitalize" }}>{fmtJour(jour)}</b>
        <button className="btn sm" onClick={() => decalerJour(1)} aria-label="Jour suivant">→</button>
        {!estAujourdhui && <button className="btn sm" onClick={() => { const d = new Date(); d.setHours(0, 0, 0, 0); setJour(d); }}>Aujourd'hui</button>}
        <div className="spacer" />
        <div className="seg">
          <button className={mode === "placement" ? "active" : ""} onClick={() => { setMode("placement"); setSelId(null); }}>Placement</button>
          <button className={mode === "amenagement" ? "active" : ""} onClick={() => { setMode("amenagement"); setArme(null); }}>Aménagement</button>
        </div>
        <button className="btn sm" onClick={imprimer} disabled={!creneau}>🖨 Imprimer</button>
        <BarreProfils profils={profils} profilId={profilId} creneau={creneau}
          onChoisir={choisirProfil} onCreer={creerProfil} onDupliquer={dupliquerProfil}
          onRenommer={() => profil && setRenommer(profil)} onSupprimer={() => profil && setSupprProfil(profil)} />
        {creneaux.length > 1 && <button className="btn sm" onClick={imprimerJournee}>🖨 La journée</button>}
      </div>

      {mode === "placement" && (
        creneaux.length === 0 ? (
          <div className="card" style={{ marginBottom: 10, padding: 14, textAlign: "center", color: "var(--text-2)", fontSize: 13 }}>
            Aucun créneau ce jour-là. Créez la journée depuis le <b>Planning</b> (« Générer le jour »),
            puis revenez ici : les élèves présents sur chaque créneau s'installeront dans la salle.
          </div>
        ) : (
          <Roulette creneaux={creneaux} idx={idx} setIdx={setIdx} eleves={eleves ?? []} />
        )
      )}

      {mode === "placement" && creneau && (
        <div className="card" style={{ marginBottom: 10, padding: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>
              {presents.length === 0
                ? "Aucun élève sur ce créneau — cochez-les dans l'organisation de la semaine."
                : nonPlaces.length ? `À placer (${nonPlaces.length}) :` : `Tous les présents sont placés (${presents.length}).`}
            </span>
            {presents.map((e) => {
              const place = assis.some(([, id]) => id === e.id);
              const actif = arme === e.id;
              return (
                <button key={e.id} className="btn sm" onClick={() => setArme(actif ? null : e.id)}
                  title={place ? "Cliquer puis choisir une place pour le déplacer" : "Cliquer puis choisir une place"}
                  style={{ display: "flex", alignItems: "center", gap: 6, opacity: place && !actif ? 0.45 : 1,
                    borderColor: actif ? "var(--accent)" : undefined, background: actif ? "var(--accent-soft)" : undefined }}>
                  <Avatar eleve={e} photo={photos[e.id]} taille={18} />
                  {e.nom.split(" ")[0]}{place && !actif ? " ✓" : ""}
                </button>
              );
            })}
            <div className="spacer" />
            {nonPlaces.length > 0 && places.length > 0 && <button className="btn sm" onClick={placerAuto}>✨ Placer automatiquement</button>}
            {assis.length > 0 && <button className="btn ghost sm" onClick={viderPlan}>Vider le plan</button>}
            {places.length > 0 && (
              <button className="btn sm" aria-pressed={parEleve} onClick={() => { setParEleve((v) => !v); setArme(null); }}
                title="Affecter une place à chaque élève depuis une liste">
                {parEleve ? "▣" : "▢"} Par élève
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
            {arme
              ? "Cliquez maintenant sur une place de la salle."
              : places.length === 0
                ? "Aucune place dans la salle — passez en « Aménagement » pour en ajouter."
                : `${assis.length}/${places.length} place(s) occupée(s)${!explicite && heritage ? " · plan repris de la dernière séance de « " + creneau.matiere + " »" : ""}.`}
          </div>

          {parEleve && places.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8, marginTop: 12,
              paddingTop: 12, borderTop: "1px solid var(--border)" }}>
              {presents.map((e) => {
                const placeId = Object.entries(plan.places).find(([k, id]) => id === e.id && idsPlaces.has(k))?.[0] ?? "";
                return (
                  <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar eleve={e} photo={photos[e.id]} taille={26} />
                    <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.nom}</span>
                    <Select value={placeId} style={{ maxWidth: 130 }}
                      onChange={(ev) => asseoir(ev.target.value || placeId, ev.target.value ? e.id : null)}
                      title={`Place de ${e.nom}`}>
                      <option value="">— non placé —</option>
                      {[...places].sort((a, b) => (a.y - b.y) || (a.x - b.x)).map((pl) => {
                        const occupant = plan.places[pl.id];
                        const pris = occupant && occupant !== e.id && estPresent(occupant);
                        const qui = pris ? (eleves ?? []).find((x) => x.id === occupant)?.nom.split(" ")[0] : "";
                        return (
                          <option key={pl.id} value={pl.id}>
                            {nomsPlaces[pl.id]}{pris ? ` — ${qui}` : ""}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {mode === "amenagement" && (
        <div className="card" style={{ marginBottom: 10, padding: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-2)", marginRight: 4 }}>Ajouter :</span>
            {MODELES.map((m) => (
              <button key={m.t + m.label} className="btn sm" onClick={() => ajouterElement(m)}>{m.ico} {m.label}</button>
            ))}
            <div className="spacer" />
            {selId && <>
              <button className="btn sm" onClick={() => dupliquerElement(elements.find((e) => e.id === selId)!)}>📑 Dupliquer</button>
              <button className="btn danger sm" onClick={() => supprimerElement(selId)}>🗑 Supprimer</button>
            </>}
          </div>
          {selId && (() => {
            const el = elements.find((e) => e.id === selId);
            return el ? (
              <div style={{ marginTop: 8 }}>
                <Input value={el.label}
                  placeholder={el.type === "place" ? "Nom de la place (ex. « Îlot 2·3 », « Rang 1 gauche »)" : "Étiquette (ex. « Coin calme »)"}
                  onChange={(ev) => persistElements(elements.map((x) => x.id === el.id ? { ...x, label: ev.target.value } : x))} />
              </div>
            ) : null;
          })()}
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
            Glissez pour déplacer · poignée en bas à droite pour redimensionner · <b>croix rouge en haut à droite</b>,
            clic droit ou touche Suppr pour supprimer. Un mur se met à la verticale en le rendant étroit et haut.
            Nommer les places (« Îlot 2·3 ») aide à les retrouver dans la liste par élève.
            Vous modifiez ici l'agencement « {profil?.nom} » — les autres ne bougent pas.
          </div>
        </div>
      )}

      {elements.length === 0 ? (
        <Empty icone="🪑" titre={profils.length === 0 ? "Aucun agencement" : `« ${profil?.nom} » est vide`}
          sous={profils.length === 0
            ? "Créez une salle depuis le bouton « ✨ Créer une salle » : îlots, frontal, en U ou coin regroupement."
            : "Passez en « Aménagement » pour y poser des tables et des places."} />
      ) : (
        <div className="card" style={{ padding: 12, overflow: "auto" }}>
          <div ref={canvasRef} onClick={() => { if (mode === "amenagement") setSelId(null); else setArme(null); }}
            style={{ position: "relative", width: CANVAS_W, height: CANVAS_H, flexShrink: 0,
              background: `var(--panel-2) repeating-linear-gradient(0deg, transparent, transparent ${GRILLE - 1}px, color-mix(in srgb, var(--border) 40%, transparent) ${GRILLE}px), repeating-linear-gradient(90deg, transparent, transparent ${GRILLE - 1}px, color-mix(in srgb, var(--border) 40%, transparent) ${GRILLE}px)`,
              borderRadius: 10, border: "1px solid var(--border)" }}>
            {elements.map((el) => {
              const eleveId = plan.places[el.id];
              const eleve = estPresent(eleveId) ? (eleves ?? []).find((x) => x.id === eleveId) : undefined;
              const selection = selId === el.id && mode === "amenagement";
              const cible = mode === "placement" && el.type === "place" && !!arme;
              return (
                <div key={el.id}
                  onMouseDown={(e) => onMouseDownElem(el, e)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode !== "placement" || el.type !== "place" || !creneau) return;
                    if (arme) { asseoir(el.id, arme); setArme(null); } else setChoix(el);
                  }}
                  onContextMenu={(e) => {
                    if (mode !== "amenagement") return;
                    e.preventDefault(); e.stopPropagation();
                    setSelId(el.id);
                    openCtx(e, [
                      { label: "Dupliquer", icon: "📑", onClick: () => dupliquerElement(el) },
                      { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimerElement(el.id) },
                    ]);
                  }}
                  title={mode === "placement" && el.type === "place" ? (arme ? "Installer ici" : "Cliquer pour placer un élève") : el.label}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, boxSizing: "border-box",
                    ...STYLE_ELEM[el.type],
                    ...(eleve ? { border: "2px solid var(--accent)", background: "var(--panel)" } : {}),
                    ...(cible ? { border: "2px dashed var(--accent)", background: "var(--accent-soft)" } : {}),
                    outline: selection ? "2px solid var(--accent)" : "none",
                    cursor: mode === "amenagement" ? "move" : (el.type === "place" && creneau ? "pointer" : "default"),
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    overflow: "visible", userSelect: "none", fontSize: 11,
                  }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    width: "100%", height: "100%", overflow: "hidden" }}>
                    {el.type === "place" ? (
                      eleve ? (() => {
                        const note = plan.notes[el.id];
                        // Avatar réduit quand une note doit tenir dans la place.
                        const av = Math.max(18, Math.min(note ? 26 : 34, el.h - (note ? 34 : 26)));
                        return (
                          <>
                            <Avatar eleve={eleve} photo={photos[eleve.id]} taille={av} />
                            <div style={{ fontWeight: 700, marginTop: 2, textAlign: "center", lineHeight: 1.15, padding: "0 2px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {eleve.nom.split(" ")[0]}
                            </div>
                            {note && (
                              <div title={note} style={{ fontSize: 9, lineHeight: 1.15, color: "var(--text-2)", textAlign: "center", padding: "0 3px", maxWidth: "100%",
                                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note}</div>
                            )}
                          </>
                        );
                      })() : <span style={{ color: "var(--text-2)", opacity: 0.8 }}>libre</span>
                    ) : (
                      el.label && <span style={{ color: "var(--text-2)", textAlign: "center", padding: "0 4px" }}>{el.label}</span>
                    )}
                  </div>
                  {mode === "amenagement" && (
                    <button aria-label="Supprimer cet élément" title="Supprimer"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); supprimerElement(el.id); }}
                      style={{ position: "absolute", right: -7, top: -7, width: 18, height: 18, borderRadius: "50%",
                        border: "none", background: "#ef4444", color: "#fff", fontSize: 12, lineHeight: "18px",
                        padding: 0, cursor: "pointer", opacity: selection ? 1 : 0.55, zIndex: 2 }}>×</button>
                  )}
                  {selection && (
                    <div onMouseDown={(e) => onMouseDownElem(el, e, true)}
                      style={{ position: "absolute", right: -5, bottom: -5, width: 12, height: 12, borderRadius: 3, background: "var(--accent)", cursor: "nwse-resize" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renommer && (
        <Modal titre="Renommer l'agencement" onClose={() => setRenommer(null)}
          footer={<button className="btn" onClick={() => setRenommer(null)}>Fermer</button>}>
          <Field label="Nom">
            <Input autoFocus value={renommer.nom}
              onChange={(e) => {
                const nom = e.target.value;
                setRenommer({ ...renommer, nom });
                persistProfils(profilsRef.current.map((p) => p.id === renommer.id ? { ...p, nom } : p));
              }} />
          </Field>
        </Modal>
      )}
      {supprProfil && (
        <Confirm message={`Supprimer l'agencement « ${supprProfil.nom} » ? Les placements qui lui sont propres partent avec.`}
          onYes={() => supprimerProfil(supprProfil)} onClose={() => setSupprProfil(null)} />
      )}

      {choix && creneau && (
        <ChoixEleveModal place={choix} plan={plan} presents={presents} autres={(eleves ?? []).filter((e) => !presents.some((p) => p.id === e.id))}
          photos={photos} onClose={() => setChoix(null)}
          onChoisir={(eleveId, note) => { asseoir(choix.id, eleveId, note); setChoix(null); }} />
      )}
    </>
  );
}

// ── Roulette des créneaux ─────────────────────────────────────────────────
// Carrousel en perspective : la molette / le trackpad fait défiler la journée,
// le créneau au centre est celui affiché dans la salle.
function Roulette({ creneaux, idx, setIdx, eleves }: {
  creneaux: Creneau[]; idx: number; setIdx: React.Dispatch<React.SetStateAction<number>>; eleves: Eleve[];
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const accum = React.useRef(0);

  // Écouteur natif non passif : sans cela le navigateur défile la page au
  // lieu de faire tourner la roulette.
  React.useEffect(() => {
    const n = ref.current; if (!n) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      accum.current += Math.abs(ev.deltaX) > Math.abs(ev.deltaY) ? ev.deltaX : ev.deltaY;
      const pas = 55;
      const crans = Math.trunc(accum.current / pas);
      if (!crans) return;
      accum.current -= crans * pas;
      setIdx((i) => Math.max(0, Math.min(creneaux.length - 1, i + crans)));
    };
    n.addEventListener("wheel", onWheel, { passive: false });
    return () => n.removeEventListener("wheel", onWheel);
  }, [creneaux.length, setIdx]);

  const courant = creneaux[idx];
  return (
    <div className="card" style={{ marginBottom: 10, padding: "10px 6px 6px" }}>
      <div ref={ref} style={{ position: "relative", height: 104, perspective: 900, overflow: "hidden", cursor: "grab" }}>
        {/* Repère du créneau actif */}
        <div style={{ position: "absolute", left: "50%", top: 4, bottom: 4, width: 200, marginLeft: -100,
          borderRadius: 12, border: "1px solid color-mix(in srgb, var(--accent) 45%, transparent)", pointerEvents: "none" }} />
        {creneaux.map((c, i) => {
          const d = i - idx;
          if (Math.abs(d) > 3) return null;
          const ids = idsDuCreneau(c, eleves);
          const col = teinte(c);
          return (
            <button key={c.id} onClick={() => setIdx(i)}
              style={{
                position: "absolute", left: "50%", top: 10, width: 190, marginLeft: -95, height: 84,
                transform: `translateX(${d * 128}px) rotateY(${-d * 34}deg) translateZ(${-Math.abs(d) * 80}px) scale(${d === 0 ? 1 : 0.92})`,
                opacity: d === 0 ? 1 : Math.max(0.18, 0.5 - Math.abs(d) * 0.12),
                transition: "transform .3s cubic-bezier(.22,.8,.3,1), opacity .3s",
                zIndex: 10 - Math.abs(d), cursor: "pointer", textAlign: "left", font: "inherit", color: "inherit",
                borderRadius: 12, padding: "8px 10px", overflow: "hidden",
                background: `color-mix(in srgb, ${col} ${d === 0 ? 22 : 12}%, var(--panel-2))`,
                border: `1px solid ${d === 0 ? col : "var(--border)"}`,
                boxShadow: d === 0 ? `0 6px 18px color-mix(in srgb, ${col} 30%, transparent)` : "none",
              }}>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>{hhmm(c.heureDebut)} – {hhmm(c.heureFin)}</div>
              <div style={{ fontWeight: 700, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.matiere || "Créneau"}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                👥 {ids.length} élève{ids.length > 1 ? "s" : ""}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12, color: "var(--text-2)" }}>
        <button className="btn ghost sm" disabled={idx <= 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} aria-label="Créneau précédent">←</button>
        <span>{idx + 1} / {creneaux.length} · molette ou flèches pour parcourir la journée</span>
        <button className="btn ghost sm" disabled={idx >= creneaux.length - 1} onClick={() => setIdx((i) => Math.min(creneaux.length - 1, i + 1))} aria-label="Créneau suivant">→</button>
      </div>
      {courant && (
        <div style={{ height: 3, borderRadius: 2, marginTop: 4, background: "var(--panel-2)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((idx + 1) / creneaux.length) * 100}%`, background: teinte(courant), transition: "width .3s" }} />
        </div>
      )}
    </div>
  );
}

function ChoixEleveModal({ place, plan, presents, autres, photos, onClose, onChoisir }: {
  place: ElemSalle; plan: Plan; presents: Eleve[]; autres: Eleve[]; photos: Record<string, string>;
  onClose: () => void; onChoisir: (eleveId: string | null, note: string) => void;
}) {
  const actuel = plan.places[place.id] ?? "";
  const [note, setNote] = React.useState(plan.notes[place.id] ?? "");
  const [tous, setTous] = React.useState(false);
  const occupePar = (id: string) => Object.entries(plan.places).find(([k, v]) => v === id && k !== place.id);

  const ligne = (e: Eleve, absent = false) => {
    const ailleurs = occupePar(e.id);
    return (
      <button key={e.id} onClick={() => onChoisir(e.id, note)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, cursor: "pointer",
          border: "1px solid " + (actuel === e.id ? "var(--accent)" : "transparent"),
          background: actuel === e.id ? "var(--accent-soft)" : "transparent", textAlign: "left", color: "inherit", font: "inherit",
          opacity: absent ? 0.65 : 1 }}>
        <Avatar eleve={e} photo={photos[e.id]} taille={30} />
        <span style={{ flex: 1 }}>{e.nom}</span>
        {ailleurs && <span style={{ fontSize: 11, color: "var(--text-2)" }}>déjà placé — sera déplacé</span>}
      </button>
    );
  };

  return (
    <Modal titre="Qui s'installe ici ?" onClose={onClose}
      footer={<>
        {actuel && <button className="btn danger" onClick={() => onChoisir(null, "")}>Libérer la place</button>}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
      </>}>
      <Field label="Note de placement (optionnelle)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dos à la fenêtre, moins de stimulations…" />
      </Field>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
        {presents.length === 0 && <div style={{ color: "var(--text-2)", fontSize: 13 }}>Aucun élève sur ce créneau.</div>}
        {presents.map((e) => ligne(e))}
        {autres.length > 0 && (
          tous
            ? <>
                <div style={{ fontSize: 11, color: "var(--text-2)", margin: "8px 0 2px" }}>Absents de ce créneau</div>
                {autres.map((e) => ligne(e, true))}
              </>
            : <button className="btn ghost sm" style={{ alignSelf: "flex-start", marginTop: 8 }} onClick={() => setTous(true)}>
                Voir les {autres.length} autre(s) élève(s)
              </button>
        )}
      </div>
    </Modal>
  );
}

/**
 * Choix de l'agencement de la salle pour le créneau courant.
 *
 * Une classe ne se dispose pas pareil pour un travail en îlots et pour un
 * cours frontal : le créneau retient sa disposition, et la matière la retient
 * pour les fois suivantes.
 */
function BarreProfils({ profils, profilId, creneau, onChoisir, onCreer, onDupliquer, onRenommer, onSupprimer }: {
  profils: Profil[]; profilId: string; creneau: Creneau | undefined;
  onChoisir: (id: string) => void;
  onCreer: (modele?: typeof AGENCEMENTS[number]) => void;
  onDupliquer: () => void; onRenommer: () => void; onSupprimer: () => void;
}) {
  const menuAgencements = (e: React.MouseEvent) => {
    e.preventDefault();
    openCtx(e, [
      ...AGENCEMENTS.map((a) => ({ label: `${a.nom} — ${a.sous}`, icon: a.ico, onClick: () => onCreer(a) })),
      { label: "Agencement vide", icon: "▢", sep: true, onClick: () => onCreer() },
    ]);
  };

  if (profils.length === 0) {
    return <button className="btn sm primary" onClick={menuAgencements} title="Partir d'un agencement type">✨ Créer une salle</button>;
  }
  return (
    <>
      <Select value={profilId} onChange={(e) => onChoisir(e.target.value)} style={{ maxWidth: 190 }}
        disabled={!creneau} title={creneau ? "Agencement utilisé sur ce créneau" : "Choisissez d'abord un créneau"}>
        {profils.map((p) => <option key={p.id} value={p.id}>🪑 {p.nom}</option>)}
      </Select>
      <button className="btn sm" onClick={menuAgencements} title="Nouvel agencement">+</button>
      <button className="btn ghost sm" title="Options de l'agencement"
        onClick={(e) => openCtx(e, [
          { label: "Renommer", icon: "✏️", onClick: onRenommer },
          { label: "Dupliquer", icon: "📑", onClick: onDupliquer },
          { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
        ])}>⋯</button>
    </>
  );
}

/** Rendu figé d'une salle : même dessin que l'onglet, sans interaction. */
export function SalleStatique({ elements, plan, eleves, photos, echelle = 1 }: {
  elements: ElemSalle[]; plan: Plan; eleves: Eleve[]; photos: Record<string, string>; echelle?: number;
}) {
  return (
    <div style={{ width: CANVAS_W * echelle, height: CANVAS_H * echelle, flexShrink: 0 }}>
      <div style={{ position: "relative", width: CANVAS_W, height: CANVAS_H,
        transform: `scale(${echelle})`, transformOrigin: "top left",
        background: "var(--panel-2)", borderRadius: 10, border: "1px solid var(--border)" }}>
        {elements.map((el) => {
          const eleve = eleves.find((x) => x.id === plan.places[el.id]);
          const note = plan.notes[el.id];
          return (
            <div key={el.id} style={{
              position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, boxSizing: "border-box",
              ...STYLE_ELEM[el.type],
              ...(eleve ? { border: "2px solid var(--accent)", background: "var(--panel)" } : {}),
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden", fontSize: 11,
            }}>
              {el.type === "place" ? (
                eleve ? (
                  <>
                    <Avatar eleve={eleve} photo={photos[eleve.id]} taille={Math.max(18, Math.min(note ? 26 : 34, el.h - (note ? 34 : 26)))} />
                    <div style={{ fontWeight: 700, marginTop: 2, textAlign: "center", lineHeight: 1.15,
                      maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>
                      {eleve.nom.split(" ")[0]}
                    </div>
                    {note && <div style={{ fontSize: 9, color: "var(--text-2)", textAlign: "center", padding: "0 3px",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note}</div>}
                  </>
                ) : <span style={{ color: "var(--text-2)", opacity: 0.7 }}>{el.label || "libre"}</span>
              ) : (
                el.label && <span style={{ color: "var(--text-2)", textAlign: "center", padding: "0 4px" }}>{el.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Aperçu du plan de salle d'une journée, ouvert depuis le planning.
 *
 * On y arrive au moment où l'on prépare sa journée : il faut voir qui est
 * assis où, créneau par créneau, sans quitter le planning ni refaire le
 * chemin par l'onglet Organisation.
 */
export function ApercuSalleJour({ dateIso, creneauId, onClose }: {
  dateIso: string; creneauId?: string; onClose: () => void;
}) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: creneauxBruts } = useAsync(() => api.creneauxList(dateIso, dateIso), [dateIso]);
  const { data: etat } = useAsync(() => chargerEtatSalle(), []);
  const photos = usePhotos(eleves ?? []);

  const creneaux = React.useMemo(
    () => [...(creneauxBruts ?? [])].sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
    [creneauxBruts]);

  const [idx, setIdx] = React.useState(0);
  // Ouvre sur le créneau cliqué, une fois la liste chargée.
  const cale = React.useRef(false);
  React.useEffect(() => {
    if (cale.current || !creneaux.length) return;
    const i = creneauId ? creneaux.findIndex((c) => c.id === creneauId) : -1;
    if (i >= 0) setIdx(i);
    cale.current = true;
  }, [creneaux, creneauId]);

  const creneau = creneaux[Math.min(idx, Math.max(0, creneaux.length - 1))];
  const profil = etat ? profilDuCreneau(etat, creneau) : undefined;
  const plan = etat ? planDuCreneau(etat, creneau) : PLAN_VIDE;
  // Seuls les élèves du créneau apparaissent, comme dans l'onglet.
  const presents = React.useMemo(() => {
    const ids = idsDuCreneau(creneau, eleves ?? []);
    return (eleves ?? []).filter((e) => ids.includes(e.id));
  }, [creneau, eleves]);
  const assis = assisDansProfil(profil?.elements.filter((e) => e.type === "place") ?? [], plan,
    (id) => presents.some((e) => e.id === id)).length;

  const titre = creneau
    ? `${hhmm(creneau.heureDebut)}–${hhmm(creneau.heureFin)} · ${creneau.matiere || "Créneau"}`
    : "Plan de salle";

  return (
    <Modal titre={titre} onClose={onClose}
      footer={<>
        <button className="btn" disabled={idx <= 0} onClick={() => setIdx((i) => Math.max(0, i - 1))}>← Précédent</button>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          {creneaux.length ? `${idx + 1} / ${creneaux.length}` : ""}
        </span>
        <button className="btn" disabled={idx >= creneaux.length - 1} onClick={() => setIdx((i) => Math.min(creneaux.length - 1, i + 1))}>Suivant →</button>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Fermer</button>
      </>}>
      {creneaux.length === 0 ? (
        <Empty icone="🗓️" titre="Aucun créneau ce jour-là" sous="Générez la journée depuis le planning." />
      ) : !profil || profil.elements.length === 0 ? (
        <Empty icone="🪑" titre="Aucune salle aménagée"
          sous="Organisation → Plan de salle : créez un agencement (îlots, frontal, en U…)." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, fontSize: 12, color: "var(--text-2)" }}>
            <span>🪑 {profil.nom}</span>
            <span>👥 {assis} placé(s) sur {presents.length} présent(s)</span>
          </div>
          <div style={{ overflow: "auto" }}>
            <SalleStatique elements={profil.elements} plan={plan} eleves={presents} photos={photos} echelle={0.72} />
          </div>
        </>
      )}
    </Modal>
  );
}
