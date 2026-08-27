import React from "react";
import { api, newId, anneeScolaireActuelle } from "../api";
import { Select, Empty, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";

// ── GEVA-Sco — aide à la préparation ──────────────────────────────────────
// Reprend la structure du support officiel (arrêté du 6 février 2015,
// « Éléments relatifs à un parcours de scolarisation ») : identification,
// points saillants, conditions de scolarisation, emploi du temps, observation
// des activités cotées A/B/C/D, bilan, perspectives, remarques, participants.
// L'écran reproduit les pages du support ; l'impression remplit le vrai
// formulaire interactif CNSA, qui reste modifiable dans un lecteur PDF.

type Code = "" | "A" | "B" | "C" | "D" | "SO";
const CODES: { k: Code; label: string; aide: string; couleur: string }[] = [
  { k: "A", label: "A", aide: "Activité réalisée sans difficulté et seul", couleur: "#57b873" },
  { k: "B", label: "B", aide: "Réalisée avec des difficultés ponctuelles et/ou une aide ponctuelle", couleur: "#9ac74f" },
  { k: "C", label: "C", aide: "Réalisée avec des difficultés régulières et/ou une aide régulière (commentaires indispensables)", couleur: "#eb9e33" },
  { k: "D", label: "D", aide: "Activité non réalisée (commentaires indispensables)", couleur: "#d64d4d" },
  { k: "SO", label: "SO", aide: "Sans objet", couleur: "var(--text-2)" },
];

// Domaines et activités, dans l'ordre exact du support officiel (p. 4 et 5).
const DOMAINES: { id: string; titre: string; activites: { id: string; label: string }[] }[] = [
  {
    id: "general", titre: "Tâches et exigences générales, relation avec autrui",
    activites: [
      { id: "g1", label: "S'orienter dans le temps" },
      { id: "g2", label: "S'orienter dans l'espace" },
      { id: "g3", label: "Fixer son attention" },
      { id: "g4", label: "Mémoriser" },
      { id: "g5", label: "Gérer sa sécurité" },
      { id: "g6", label: "Respecter les règles de vie" },
      { id: "g7", label: "Avoir des relations avec autrui conformes aux règles sociales" },
      { id: "g8", label: "Maîtriser son comportement dans ses relations avec autrui" },
    ],
  },
  {
    id: "mobilite", titre: "Mobilité, manipulation",
    activites: [
      { id: "m1", label: "Faire ses transferts (ex. : du fauteuil roulant à la chaise dans la classe)" },
      { id: "m2", label: "Se déplacer à l'intérieur, à l'extérieur (dans le cadre des activités scolaires)" },
      { id: "m3", label: "Utiliser les transports en commun" },
      { id: "m4", label: "Avoir des activités de motricité fine" },
    ],
  },
  {
    id: "entretien", titre: "Entretien personnel",
    activites: [
      { id: "e1", label: "Assurer l'élimination et utiliser les toilettes" },
      { id: "e2", label: "S'habiller / se déshabiller" },
      { id: "e3", label: "Prendre ses repas (manger, boire)" },
      { id: "e4", label: "Prendre soin de sa santé" },
    ],
  },
  {
    id: "communication", titre: "Communication",
    activites: [
      { id: "c1", label: "Parler" },
      { id: "c2", label: "Comprendre la parole en face à face" },
      { id: "c3", label: "Comprendre une phrase simple" },
      { id: "c4", label: "Produire et recevoir des messages non verbaux" },
    ],
  },
  {
    id: "scolarite", titre: "Tâches et exigences en relation avec la scolarité",
    activites: [
      { id: "s1", label: "Lire" },
      { id: "s2", label: "Écrire" },
      { id: "s3", label: "Calculer" },
      { id: "s4", label: "Organiser son travail" },
      { id: "s5", label: "Contrôler son travail" },
      { id: "s6", label: "Accepter des consignes" },
      { id: "s7", label: "Suivre des consignes" },
      { id: "s8", label: "S'installer dans la classe" },
      { id: "s9", label: "Utiliser des supports pédagogiques" },
      { id: "s10", label: "Utiliser du matériel adapté à son handicap" },
      { id: "s11", label: "Prendre des notes (quel que soit le support)" },
      { id: "s12", label: "Participer à des sorties scolaires" },
    ],
  },
];

const LIGNES_PLANS = ["PAI", "Mesures éducatives", "Autres"];
const LIGNES_ACCOMP = ["RASED", "SAPAD", "CNED", "Soins hospitaliers", "CAMPS / CMP / CMPP", "EMS", "SESSAD", "Soins en libéral", "Autres"];
const LIGNES_MATERIEL = ["Aménagements et adaptations pédagogiques", "Outils de communication",
  "Matériel informatique et audiovisuel", "Matériel déficience auditive", "Matériel déficience visuelle",
  "Mobilier et petits matériels", "Transport", "Autres"];
const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

interface Activite { code: Code; obstacles: string; appuis: string }
interface Responsable {
  id: string; civilite: "" | "Mme" | "M"; nom: string;
  rue: string; cp: string; ville: string; tel: string; courriel: string;
}
interface GevaData {
  type: "premiere" | "reexamen";
  numDossier: string; anneeScolaire: string; dateReunion: string;
  dateNaissance: string; adresse: string; cp: string; ville: string; tel: string; courriel: string;
  representants: string;
  responsables: Responsable[];
  /** Cases à cocher des dispositifs (clé = libellé de ligne). */
  coches: Record<string, boolean>;
  referentNom: string; referentTel: string; referentCourriel: string;
  etablissement: string; classe: string;
  etabRue: string; etabCp: string; etabVille: string;
  parcours: { id: string; annee: string; scolarisation: string }[];
  plans: Record<string, string>;
  accompagnements: Record<string, string>;
  materiel: Record<string, string>;
  niveauApprentissages: string;
  acquisitions: "" | "atteintes" | "nonatteintes";
  edt: Record<string, { matin: string; midi: string; apresmidi: string }>;
  activites: Record<string, Activite>;
  /** Cadres « obstacles » / « points d'appui », un par domaine (support officiel). */
  cadres: Record<string, { obstacles: string; appuis: string }>;
  accessibiliteBati: "" | "oui" | "non" | "partielle";
  natureDifficultes: string;
  evolutions: string;
  bilanAmenagements: string; bilanDispositifs: string; bilanAideHumaine: string; bilanAccompagnements: string;
  perspectives: string;
  remarquesFamille: string; remarquesProfessionnels: string;
  participants: { id: string; nom: string; fonction: string }[];
}

const VIDE: GevaData = {
  type: "reexamen", numDossier: "", anneeScolaire: anneeScolaireActuelle(), dateReunion: "",
  dateNaissance: "", adresse: "", cp: "", ville: "", tel: "", courriel: "",
  representants: "", responsables: [], coches: {},
  referentNom: "", referentTel: "", referentCourriel: "",
  etablissement: "", classe: "", etabRue: "", etabCp: "", etabVille: "", parcours: [],
  plans: {}, accompagnements: {}, materiel: {},
  niveauApprentissages: "", acquisitions: "",
  edt: {}, activites: {}, cadres: {}, accessibiliteBati: "", natureDifficultes: "", evolutions: "",
  bilanAmenagements: "", bilanDispositifs: "", bilanAideHumaine: "", bilanAccompagnements: "",
  perspectives: "", remarquesFamille: "", remarquesProfessionnels: "", participants: [],
};


// ── Correspondance avec les champs du formulaire officiel ─────────────────
// Noms relevés dans les supports interactifs CNSA (réexamen et 1re demande).
// Les deux variantes diffèrent sur quelques intitulés : on envoie les deux
// orthographes, seul le champ réellement présent est renseigné.
const CHAMP_ACTIVITE: Record<string, string> = {
  g1: "Orientation-dans-le-temps", g2: "Orientation-dans-l-espace", g3: "Fixer-son-attention",
  g4: "Memoriser", g5: "Gerer-sa-securite", g6: "Respecter-les-regles-de-vie",
  g7: "Relations-avec-autrui", g8: "Maitriser-son-comportement",
  m1: "Faire-ses-transferts", m2: "Se-deplacer", m3: "Utiliser-les-transports-communs", m4: "Activites-de-motricite",
  e1: "Assurer-l-elimination", e2: "S-habiller-se-deshabiller", e3: "Prendre-ses-repas", e4: "Prendre-soin-de-sa-sante",
  c1: "Parler", c2: "Comprendre-la-parole", c3: "Comprendre-une-phrase-simple", c4: "Produire-recevoir-des-messages-non-verbaux",
  s1: "Lire", s2: "Ecrire", s3: "Calculer", s4: "Organiser-son-travail", s5: "Controler-son-travail",
  s6: "Accepter-des-consignes", s7: "Suivre-des-consignes", s8: "S-installer-dans-la-classe",
  s9: "Utiliser-des-supports-pedagogiques", s10: "Utiliser-du-materiel-adapte-a-son-handicap",
  s11: "Prendre-des-notes", s12: "Participer-a-des-sorties-scolaires",
};
// Cadres « obstacles » / « points d'appui », fusionnés par domaine sur le support.
const CHAMP_CADRE: Record<string, [string, string]> = {
  general: ["Taches-et-exigences-generales-relation-avec-autrui_Cadre", ""],
  mobilite: ["Mobilite-manipulation_Cadre1", "Mobilite-manipulation_Cadre2"],
  entretien: ["Entretien-personnel_Cadre1", "Entretien-personnel_Cadre2"],
  communication: ["Communication_Cadre1", "Communication_Cadre2"],
  scolarite: ["Taches-et-exigences-relation-scolarite_Cadre1", "Taches-et-exigences-relation-scolarite_Cadre2"],
};
const CHAMP_COCHE: Record<string, string> = {
  "PAI": "PAI", "Mesures éducatives": "Mesures-educatives", "Autres": "Autres-plan-ou-projet-formalises",
  "RASED": "RASED", "SAPAD": "SAPAD", "CNED": "CNED", "Soins hospitaliers": "Soins-hospitaliers",
  "CAMPS / CMP / CMPP": "CAMPS", "EMS": "EMS", "SESSAD": "SESSAD", "Soins en libéral": "Soins-en-liberal",
  "Aménagements et adaptations pédagogiques": "Amenagements-et-adaptations-pedagogiques",
  "Outils de communication": "Outils-communication",
  "Matériel informatique et audiovisuel": "Materiel-informatique-audiovisuel",
  "Matériel déficience auditive": "Materiel-deficience-auditive",
  "Matériel déficience visuelle": "Materiel-deficience-visuelle",
  "Mobilier et petits matériels": "Mobilier-et-petits-materiels", "Transport": "Transport",
};
const JOUR_CHAMP: Record<string, string> = {
  Lundi: "Lundi", Mardi: "Mardi", Mercredi: "Mercredi", Jeudi: "Jeudi", Vendredi: "Vendredi", Samedi: "Samedi",
};

/** Découpe une date ISO en jour / mois / année (année sur 2 ou 4 chiffres). */
const partsDate = (iso: string, anneeCourte = false) => {
  const [y, m, j] = (iso || "").split("-");
  if (!y || !m || !j) return { j: "", m: "", a: "" };
  return { j, m, a: anneeCourte ? y.slice(-2) : y };
};

const todayIso = () => new Date().toISOString().slice(0, 10);
// ── Feuille A4 (aperçu fidèle du support officiel) ────────────────────────
function Feuille({ paysage, num, type, nomEleve, children }: {
  paysage?: boolean; num: string; type: string; nomEleve: string; children: React.ReactNode;
}) {
  return (
    <div className="gs-feuille" style={{ width: paysage ? 1123 : 794, minHeight: paysage ? 794 : 1123 }}>
      <div className="gs-corps">{children}</div>
      <div className="gs-pied">
        <span className="gs-logo">GEVA<span>-Sco</span></span>
        <b>{type}</b><span className="gs-sep">|</span>
        <b>NOM DE L'ÉLÈVE :</b> <span className="gs-nom">{nomEleve}</span>
        <div className="spacer" /><span>{num}</span>
      </div>
    </div>
  );
}

/** Champ sur ligne pointillée, comme sur le formulaire papier. */
function L({ label, value, onChange, largeur, type }: {
  label: string; value: string; onChange: (v: string) => void; largeur?: number | string; type?: string;
}) {
  return (
    <span className="gs-l" style={{ flex: largeur ? "none" : 1, width: largeur }}>
      <label>{label}</label>
      <input type={type ?? "text"} value={value} onChange={(e) => onChange(e.target.value)} />
    </span>
  );
}

const STYLE_FEUILLE = `
.gs { display: flex; flex-direction: column; align-items: center; gap: 22px; padding-bottom: 30px; }
.gs-feuille { background: #fff; color: #1a1a1a; box-shadow: 0 3px 14px rgba(0,0,0,.35); border-radius: 3px;
  display: flex; flex-direction: column; font-family: "Helvetica Neue", Arial, sans-serif; font-size: 11px; flex: none; }
.gs-corps { flex: 1; padding: 30px 34px 10px; }
.gs-pied { display: flex; align-items: center; gap: 8px; padding: 8px 34px 14px; font-size: 10px; color: #333; }
.gs-logo { font-weight: 800; font-size: 15px; color: #4a4a4a; } .gs-logo span { color: #8cc63f; }
.gs-sep { color: #8cc63f; font-weight: 700; } .gs-nom { border-bottom: 1px dotted #999; min-width: 150px; display: inline-block; }
.gs-titre-doc { font-size: 15px; font-weight: 800; line-height: 1.25; }
.gs-badge { background: #9a9a9a; color: #fff; font-weight: 700; padding: 9px 26px; font-size: 13px; letter-spacing: .5px; }
.gs-h { font-size: 15px; font-weight: 800; margin: 14px 0 8px; }
.gs-h.orange { color: #e8630a; } .gs-h.bleu { color: #0aa5c8; }
.gs-ligne { display: flex; gap: 14px; align-items: flex-end; margin: 5px 0; }
.gs-l { display: flex; align-items: baseline; gap: 5px; min-width: 0; }
.gs-l label { white-space: nowrap; font-size: 10.5px; }
.gs-l input { flex: 1; min-width: 0; background: transparent; border: none; border-bottom: 1px dotted #8a8a8a;
  font: inherit; font-size: 11px; color: #10305c; padding: 1px 3px; outline: none; }
.gs-l input:focus { border-bottom-color: #0aa5c8; background: #f2fbfd; }
.gs table { width: 100%; border-collapse: collapse; }
.gs th, .gs td { border: 1px solid #2b2b2b; padding: 3px 5px; font-size: 10.5px; vertical-align: top; }
.gs th { font-weight: 700; text-align: center; }
.gs td.lbl { font-weight: 400; }
.gs textarea { width: 100%; border: none; background: transparent; font: inherit; font-size: 10.5px;
  color: #10305c; resize: vertical; outline: none; padding: 2px; }
.gs textarea:focus { background: #f2fbfd; }
.gs .gs-zone { border: 1px solid #2b2b2b; }
.gs .gs-zone textarea { min-height: 110px; }
.gs-cot { width: 20px; text-align: center; cursor: pointer; user-select: none; padding: 0; }
.gs-cot span { display: block; line-height: 17px; font-weight: 800; color: #10305c; }
.gs-cot:hover { background: #eaf7fb; }
.gs-cot.on { background: #10305c; } .gs-cot.on span { color: #fff; }
.gs-dom { text-align: center; font-size: 10px; vertical-align: middle !important; }
.gs-legende { font-size: 9.5px; margin-top: 7px; line-height: 1.5; }
.gs-case { display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }
.gs-case input { margin: 0; }
.gs-plain { width: 100%; border: none; background: transparent; font: inherit; font-size: 10.5px;
  color: #10305c; outline: none; padding: 1px 2px; }
.gs-plain:focus { background: #f2fbfd; }
.gs td textarea[readonly] { color: #444; cursor: default; }
`;

export function GevaScoTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [eleveId, setEleveId] = React.useState("");
  const [d, setD] = React.useState<GevaData>(VIDE);
  const [ecole, setEcole] = React.useState("");
  const [enseignantNom, setEnseignantNom] = React.useState("");
  const [zoom, setZoom] = React.useState(() => { const v = Number(localStorage.getItem("gevasco-zoom")); return v >= 0.5 && v <= 1.6 ? v : 0.85; });
  const [enCours, setEnCours] = React.useState(false);
  // La barre d'action reste visible pendant le défilement, mais l'en-tête de
  // page est lui aussi collé en haut : sans décalage, il recouvre les boutons
  // et intercepte les clics. On mesure sa hauteur pour se placer dessous.
  const barreRef = React.useRef<HTMLDivElement>(null);
  const [hautEntete, setHautEntete] = React.useState(64);
  React.useLayoutEffect(() => {
    const maj = () => {
      const tb = barreRef.current?.closest(".page-scroll")?.querySelector(".topbar") as HTMLElement | null;
      const h = tb ? Math.ceil(tb.getBoundingClientRect().height) : 0;
      if (h) setHautEntete(h);
    };
    maj();
    window.addEventListener("resize", maj);
    return () => window.removeEventListener("resize", maj);
  }, []);

  React.useEffect(() => {
    api.settingGet("ecole").then((v) => setEcole(v ?? ""));
    api.settingGet("enseignantNom").then((v) => setEnseignantNom(v ?? ""));
  }, []);
  React.useEffect(() => { if (!eleveId && eleves?.[0]) setEleveId(eleves[0].id); }, [eleves, eleveId]);

  const eleve = eleves?.find((e) => e.id === eleveId);

  React.useEffect(() => {
    if (!eleveId) return;
    api.documentEleveGet(eleveId, "gevasco").then((v) => {
      let charge = VIDE;
      try { charge = v ? { ...VIDE, ...JSON.parse(v) } : VIDE; } catch { charge = VIDE; }
      dRef.current = charge; setD(charge);
    });
  }, [eleveId]);

  // Référence toujours à jour : deux saisies rapprochées (clics enchaînés,
  // tabulation entre champs) doivent se composer et non s'écraser.
  const dRef = React.useRef(d);
  dRef.current = d;
  const persister = (next: GevaData) => {
    dRef.current = next;
    setD(next);
    if (eleveId) api.documentEleveSet(eleveId, "gevasco", JSON.stringify(next));
  };
  const up = (p: Partial<GevaData>) => persister({ ...dRef.current, ...p });
  const upAct = (id: string, p: Partial<Activite>) => {
    const cur = dRef.current;
    const base: Activite = cur.activites[id] ?? { code: "", obstacles: "", appuis: "" };
    up({ activites: { ...cur.activites, [id]: { ...base, ...p } } });
  };
  const upCadre = (domId: string, p: Partial<{ obstacles: string; appuis: string }>) => {
    const cur = dRef.current;
    const base = cur.cadres[domId] ?? { obstacles: "", appuis: "" };
    up({ cadres: { ...cur.cadres, [domId]: { ...base, ...p } } });
  };
  const upEdt = (jour: string, p: Partial<{ matin: string; midi: string; apresmidi: string }>) => {
    const cur = dRef.current;
    const base = cur.edt[jour] ?? { matin: "", midi: "", apresmidi: "" };
    up({ edt: { ...cur.edt, [jour]: { ...base, ...p } } });
  };
  const majZoom = (v: number) => { const z = Math.max(0.5, Math.min(1.6, v)); setZoom(z); localStorage.setItem("gevasco-zoom", String(z)); };

  // Reprend ce que l'app sait déjà : élève, école, enseignant, date du jour.
  const preRemplir = () => {
    if (!eleve) return;
    up({
      dateNaissance: d.dateNaissance || (eleve.dateNaissance ?? "").slice(0, 10),
      etablissement: d.etablissement || ecole,
      dateReunion: d.dateReunion || todayIso(),
      anneeScolaire: d.anneeScolaire || anneeScolaireActuelle(),
      participants: d.participants.length ? d.participants : [{ id: newId(), nom: enseignantNom, fonction: "Enseignant·e" }],
      responsables: d.responsables.length ? d.responsables : [{ id: newId(), civilite: "", nom: "", rue: "", cp: "", ville: "", tel: "", courriel: "" }],
    });
    toast("Champs connus pré-remplis.", { icone: "✨" });
  };

  // Remplit le formulaire officiel interactif : le PDF produit EST le support
  // CNSA, renseigné et encore modifiable dans un lecteur PDF.
  const exporterFormulaire = async () => {
    if (!eleve) return;
    const textes: [string, string][] = [];
    const boutons: [string, string][] = [];
    const T = (nom: string, v: string) => { if (v && v.trim()) textes.push([nom, v]); };

    // Identification
    T("Numero-dossier-MDPH", d.numDossier);
    const [an1, an2] = (d.anneeScolaire || "").split("-");
    for (const n of ["Annee-scolaire-debut", "Annee-scolaire_Debut"]) T(n, (an1 || "").slice(-2));
    for (const n of ["Annee-scolaire-fin", "Anne-scolaire_Fin", "Annee-scolaire_Fin"]) T(n, (an2 || "").slice(-2));
    const dr = partsDate(d.dateReunion, true);
    T("Date-reunion_Jour", dr.j); T("Date-reunion_Mois", dr.m); T("Date-reunion_Annee", dr.a);
    T("Nom-et-prenom-de-l-eleve", eleve.nom);
    T("Nom-eleve", eleve.nom);
    const dn = partsDate(d.dateNaissance);
    T("Date-naissance_Jour", dn.j); T("Date-naissance_Mois", dn.m); T("Date-naissance_Annee", dn.a);
    T("Numero-et-rue", d.adresse); T("Ville", d.ville); T("Code-postal", d.cp);
    T("Tel", d.tel); T("Courriel", d.courriel);

    // Représentants légaux (Personne1 à 3 sur le support)
    d.responsables.slice(0, 3).forEach((r, i) => {
      const p = `Personne${i + 1}`;
      T(`${p}_Nom-ligne1`, r.nom);
      T(`${p}_Numero-et-rue`, r.rue);
      T(`${p}_Code-postal`, r.cp);
      T(`${p}_Ville`, r.ville);
      T(`${p}_Telephone`, r.tel);
      T(`${p}_Courriel`, r.courriel);
      if (r.civilite) boutons.push([p, r.civilite]);
    });

    // Points saillants
    T("Coordonnees-enseignant_Nom", d.referentNom);
    T("Coordonnees-enseignant_Telephone", d.referentTel);
    T("Coordonnees-enseignant_Courriel", d.referentCourriel);
    T("Etablissement-scolaire", d.etablissement);
    T("Classe-frequentee", d.classe);
    T("Etablissement-scolaire_Numero-et-rue", d.etabRue);
    T("Etablissement-scolaire_Ville", d.etabVille);
    T("Points-saillants-scolarisation_Code-postal", d.etabCp);
    d.parcours.slice(0, 6).forEach((p, i) => {
      T(`Parcours-de-scolarisation_Annee${i + 1}`, p.annee);
      T(`Parcours-de-scolarisation_Scolarisation${i + 1}`, p.scolarisation);
    });

    // Conditions actuelles : commentaires fusionnés + cases cochées
    const fusion = (lignes: string[], vals: Record<string, string>) =>
      lignes.filter((l) => (vals[l] ?? "").trim()).map((l) => `${l} : ${vals[l].trim()}`).join("\n");
    T("Plan-projets-formalises_Commentaires", fusion(LIGNES_PLANS, d.plans));
    T("Accompagnement-soins_Commentaires", fusion(LIGNES_ACCOMP, d.accompagnements));
    T("Conditions-materielles_Commentaires", fusion(LIGNES_MATERIEL, d.materiel));
    for (const [libelle, champ] of Object.entries(CHAMP_COCHE)) {
      const rempli = (d.plans[libelle] ?? d.accompagnements[libelle] ?? d.materiel[libelle] ?? "").trim();
      if (d.coches[libelle] || rempli) boutons.push([champ, "Oui"]);
    }
    if (d.coches["Autres"] || (d.accompagnements["Autres"] ?? "").trim()) boutons.push(["Autres-accompagnements-et-soins", "Oui"]);
    if ((d.materiel["Autres"] ?? "").trim()) boutons.push(["Autres-coditions-materielles", "Oui"]);
    T("Niveau-d-enseignement-dans-les-apprentissages", d.niveauApprentissages);
    // Les deux états portent des libellés longs : on les désigne par motif.
    if (d.acquisitions === "atteintes") boutons.push(["Scolarite", "~avec"]);
    if (d.acquisitions === "nonatteintes") boutons.push(["Scolarite", "!avec"]);

    // Emploi du temps
    for (const j of JOURS) {
      const l = d.edt[j] ?? { matin: "", midi: "", apresmidi: "" };
      const base = JOUR_CHAMP[j];
      T(`${base}-matin`, l.matin);
      T(`${base}-midi`, l.midi);
      T(`${base}-apres-midi`, l.apresmidi);
    }

    // Observation des activités : cotation + cadres fusionnés par domaine
    for (const dom of DOMAINES) {
      for (const a of dom.activites) {
        const v = d.activites[a.id];
        if (v?.code) boutons.push([CHAMP_ACTIVITE[a.id], v.code]);
      }
      const cadre = d.cadres[dom.id] ?? { obstacles: "", appuis: "" };
      let obstacles = cadre.obstacles;
      if (dom.id === "mobilite" && d.natureDifficultes.trim()) {
        obstacles = `Nature des difficultés : ${d.natureDifficultes.trim()}\n${obstacles}`.trim();
      }
      const [c1, c2] = CHAMP_CADRE[dom.id];
      // Le domaine « tâches générales » n'expose qu'un seul cadre sur le support.
      if (c2) { T(c1, obstacles); T(c2, cadre.appuis); }
      else T(c1, [obstacles, cadre.appuis].filter((x) => x.trim()).join("\n"));
    }
    if (d.accessibiliteBati) {
      boutons.push(["Accessibilite-du-bati", d.accessibiliteBati === "oui" ? "Oui" : d.accessibiliteBati === "non" ? "Non" : "Partielle"]);
    }
    T("Evolutions-observées-et-persepectives-projet-professionnel", d.evolutions);

    // Bilan (réexamen) et perspectives
    T("Amenagements-adaptations-pedagogiques", d.bilanAmenagements);
    T("Dispositifs-collectifs-de-scolarisation", d.bilanDispositifs);
    T("Missions-realisees-par-la-personne-chargee-de-l-aide-humaine", d.bilanAideHumaine);
    T("Accompagnement-et-soins", d.bilanAccompagnements);
    T("Objectifs-pedagogiques-et-axes-a-travailler-pour-suite-parcours", d.perspectives);
    T("Remarques-de-l-eleve-et-des-parents", d.remarquesFamille);
    T("Remarques-des-professionnels", d.remarquesProfessionnels);
    d.participants.slice(0, 15).forEach((p, i) => {
      T(`Participant${i + 1}`, p.nom);
      T(`Fonction${i + 1}`, p.fonction);
    });

    try {
      await api.exporterGevasco({ reexamen: d.type === "reexamen", eleveNom: eleve.nom, textes, boutons });
      toast("Formulaire ouvert dans l'aperçu PDF.", { icone: "📄" });
    } catch (e: any) {
      toast("Export impossible : " + String(e?.message ?? e), { icone: "⚠️", duree: 6000 });
    }
  };

  const imprimer = async () => { setEnCours(true); try { await exporterFormulaire(); } finally { setEnCours(false); } };

  const cotees = Object.values(d.activites).filter((a) => a.code).length;
  const totalAct = DOMAINES.reduce((n, dom) => n + dom.activites.length, 0);
  // Le support impose de commenter dès qu'une cotation C ou D est cochée :
  // on compte les domaines concernés dont les deux cadres restent vides.
  const manquants = React.useMemo(() => DOMAINES.filter((dom) => {
    const exige = dom.activites.some((a) => { const v = d.activites[a.id]; return v?.code === "C" || v?.code === "D"; });
    const c = d.cadres[dom.id];
    return exige && !(c?.obstacles ?? "").trim() && !(c?.appuis ?? "").trim();
  }).length, [d.activites, d.cadres]);

  if (!eleve) return <Empty icone="📋" titre="Aucun élève" sous="Ajoutez vos élèves dans l'onglet Classe." />;

  const TYPE = d.type === "reexamen" ? "RÉEXAMEN" : "1RE DEMANDE";
  const cot = (a: { id: string; label: string }, c: Code) => {
    const v = d.activites[a.id];
    const on = v?.code === c;
    return <td key={c} className={"gs-cot" + (on ? " on" : "")} title={CODES.find((x) => x.k === c)!.aide}
      onClick={() => upAct(a.id, { code: on ? "" : c })}><span>{on ? "✗" : ""}</span></td>;
  };
  const zoneTexte = (v: string, set: (s: string) => void, min = 110) => (
    <div className="gs-zone"><textarea value={v} onChange={(e) => set(e.target.value)} style={{ minHeight: min }} /></div>
  );

  // Grille d'activités d'un ou plusieurs domaines (pages 4 et 5 du support).
  const grille = (ids: string[]) => (
    <table>
      <tbody>
        <tr>
          <th style={{ width: 110, border: "none" }} />
          <th style={{ width: 330 }}>ACTIVITÉS<div style={{ fontWeight: 400, fontSize: 9 }}>(Au regard de l'autonomie d'un élève du même âge)</div>
            <div style={{ color: "#c00", fontSize: 9, fontWeight: 700 }}>Si vous cochez les cases C ou D, veuillez remplir les 2 cases de commentaires en vis-à-vis</div></th>
          {["A", "B", "C", "D"].map((c) => <th key={c} style={{ width: 20 }}>{c}</th>)}
          <th style={{ width: 22, fontSize: 8 }}>Sans objet</th>
          <th style={{ width: 230 }}><span style={{ color: "#c00" }}>Cadre 1</span><div>OBSTACLES À LA RÉALISATION DE L'ACTIVITÉ</div></th>
          <th style={{ width: 230 }}><span style={{ color: "#c00" }}>Cadre 2</span><div>POINTS D'APPUI ET COMMENTAIRES</div></th>
        </tr>
        {ids.map((domId) => {
          const dom = DOMAINES.find((x) => x.id === domId)!;
          const n = dom.activites.length;
          return dom.activites.map((a, i) => (
            <tr key={a.id}>
              {i === 0 && <td className="gs-dom" rowSpan={n}>{dom.titre}</td>}
              <td className="lbl">{a.label}</td>
              {(["A", "B", "C", "D", "SO"] as Code[]).map((c) => cot(a, c))}
              {i === 0 && <td rowSpan={n} style={{ padding: 0 }}>
                {domId === "mobilite" && (
                  <div style={{ padding: "3px 5px", borderBottom: "1px solid #ccc" }}>
                    <b style={{ fontSize: 9.5 }}>Accessibilité du bâti :</b>{" "}
                    {(["oui", "non", "partielle"] as const).map((o) => (
                      <label key={o} className="gs-case" style={{ marginRight: 7 }}>
                        <input type="checkbox" checked={d.accessibiliteBati === o}
                          onChange={() => up({ accessibiliteBati: d.accessibiliteBati === o ? "" : o })} />{o}
                      </label>
                    ))}
                  </div>
                )}
                <textarea style={{ minHeight: n * 19 }} value={d.cadres[dom.id]?.obstacles ?? ""}
                  onChange={(e) => upCadre(dom.id, { obstacles: e.target.value })} />
              </td>}
              {i === 0 && <td rowSpan={n} style={{ padding: 0 }}>
                <textarea style={{ minHeight: n * 19 }} value={d.cadres[dom.id]?.appuis ?? ""}
                  onChange={(e) => upCadre(dom.id, { appuis: e.target.value })} />
              </td>}
            </tr>
          ));
        })}
      </tbody>
    </table>
  );

  return (
    <>
      <style>{STYLE_FEUILLE}</style>
      <div ref={barreRef} className="toolbar" style={{ flexWrap: "wrap", position: "sticky", top: hautEntete, zIndex: 4, background: "var(--bg)", paddingTop: 6, paddingBottom: 8 }}>
        <Select value={eleveId} onChange={(e) => setEleveId(e.target.value)} style={{ maxWidth: 200 }}>
          {eleves?.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
        </Select>
        <div className="seg">
          <button className={d.type === "premiere" ? "active" : ""} onClick={() => up({ type: "premiere" })}>1re demande</button>
          <button className={d.type === "reexamen" ? "active" : ""} onClick={() => up({ type: "reexamen" })}>Réexamen</button>
        </div>
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>
          {cotees}/{totalAct} activités cotées{manquants > 0 && <b style={{ color: "#eb9e33" }}> · {manquants} domaine(s) C/D à commenter</b>}
        </span>
        <div className="spacer" />
        <button className="btn sm" onClick={() => majZoom(zoom - 0.1)} aria-label="Réduire">−</button>
        <span style={{ fontSize: 12, minWidth: 38, textAlign: "center" }}>{Math.round(zoom * 100)}%</span>
        <button className="btn sm" onClick={() => majZoom(zoom + 0.1)} aria-label="Agrandir">+</button>
        <button className="btn sm" onClick={preRemplir}>✨ Pré-remplir</button>
        <button className="btn primary sm" onClick={imprimer} disabled={enCours}>{enCours ? "…" : "🖨 Imprimer"}</button>
      </div>

      <div className="gs" style={{ zoom }}>
        {/* ── Page 1 : identification ─────────────────────────────────── */}
        <Feuille num="1/8" type={TYPE} nomEleve={eleve.nom}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 20, marginBottom: 16 }}>
            <span className="gs-logo" style={{ fontSize: 30 }}>GEVA<span>-Sco</span></span>
            <div className="spacer" />
            <div style={{ border: "1px solid #2b2b2b", width: 250, height: 90, color: "#aaa",
              display: "flex", alignItems: "flex-end", justifyContent: "flex-end", padding: 6, fontWeight: 700 }}>Cachet MDPH</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div className="gs-titre-doc">Éléments relatifs à un parcours de scolarisation<br />et/ou de formation : support de recueil d'informations</div>
            <div className="spacer" /><div className="gs-badge">{TYPE}</div>
          </div>
          <div className="gs-ligne" style={{ marginTop: 14 }}>
            <L label="N° de dossier MDPH :" value={d.numDossier} onChange={(v) => up({ numDossier: v })} />
            <L label="Pour l'année scolaire" value={d.anneeScolaire} onChange={(v) => up({ anneeScolaire: v })} largeur={130} />
            <L label="Date de réunion de l'équipe de suivi de la scolarisation" value={d.dateReunion} onChange={(v) => up({ dateReunion: v })} largeur={150} type="date" />
          </div>

          <div className="gs-h orange">Identification</div>
          <div className="gs-ligne">
            <L label="Nom et prénom de l'élève :" value={eleve.nom} onChange={() => {}} />
            <L label="Date de naissance :" value={d.dateNaissance} onChange={(v) => up({ dateNaissance: v })} largeur={150} type="date" />
          </div>
          <div className="gs-ligne"><L label="N° et rue :" value={d.adresse} onChange={(v) => up({ adresse: v })} /></div>
          <div className="gs-ligne">
            <L label="Ville :" value={d.ville} onChange={(v) => up({ ville: v })} />
            <L label="Code postal :" value={d.cp} onChange={(v) => up({ cp: v })} largeur={140} />
          </div>
          <div className="gs-ligne">
            <L label="Tél. :" value={d.tel} onChange={(v) => up({ tel: v })} />
            <L label="Courriel :" value={d.courriel} onChange={(v) => up({ courriel: v })} />
          </div>

          <table style={{ marginTop: 12 }}>
            <tbody>
              <tr><th colSpan={3}>Coordonnées des représentants légaux</th></tr>
              <tr><th colSpan={2}>Parents</th><th>Autre responsable légal</th></tr>
              <tr>
                {[0, 1, 2].map((i) => {
                  const r = d.responsables[i];
                  const assure = () => {
                    if (r) return r;
                    const n = { id: newId(), civilite: "" as const, nom: "", rue: "", cp: "", ville: "", tel: "", courriel: "" };
                    const liste = [...d.responsables]; liste[i] = n; up({ responsables: liste });
                    return n;
                  };
                  const upR = (p: Partial<Responsable>) => {
                    const base = assure();
                    const liste = [...d.responsables]; liste[i] = { ...base, ...p };
                    up({ responsables: liste });
                  };
                  return (
                    <td key={i} style={{ width: "33.33%" }}>
                      <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                        {(["Mme", "M"] as const).map((c) => (
                          <label key={c} className="gs-case">
                            <input type="checkbox" checked={r?.civilite === c} onChange={() => upR({ civilite: r?.civilite === c ? "" : c })} />{c}
                          </label>
                        ))}
                        <L label=":" value={r?.nom ?? ""} onChange={(v) => upR({ nom: v })} />
                      </div>
                      <div className="gs-ligne"><L label="N° et rue :" value={r?.rue ?? ""} onChange={(v) => upR({ rue: v })} /></div>
                      <div className="gs-ligne">
                        <L label="CP :" value={r?.cp ?? ""} onChange={(v) => upR({ cp: v })} largeur={70} />
                        <L label="Ville :" value={r?.ville ?? ""} onChange={(v) => upR({ ville: v })} />
                      </div>
                      <div className="gs-ligne"><L label="Tél. :" value={r?.tel ?? ""} onChange={(v) => upR({ tel: v })} /></div>
                      <div className="gs-ligne"><L label="Courriel :" value={r?.courriel ?? ""} onChange={(v) => upR({ courriel: v })} /></div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>

          <div className="gs-h orange">Points saillants liés à la scolarisation</div>
          <div className="gs-ligne"><L label="Nom et coordonnées de l'enseignant référent du secteur :" value={d.referentNom} onChange={(v) => up({ referentNom: v })} /></div>
          <div className="gs-ligne">
            <L label="Tél :" value={d.referentTel} onChange={(v) => up({ referentTel: v })} />
            <L label="Courriel :" value={d.referentCourriel} onChange={(v) => up({ referentCourriel: v })} />
          </div>
          <div className="gs-ligne">
            <L label="Établissement scolaire fréquenté :" value={d.etablissement} onChange={(v) => up({ etablissement: v })} />
            <L label="Classe fréquentée :" value={d.classe} onChange={(v) => up({ classe: v })} largeur={190} />
          </div>
          <div className="gs-ligne"><L label="N° et rue :" value={d.etabRue} onChange={(v) => up({ etabRue: v })} /></div>
          <div className="gs-ligne">
            <L label="Ville :" value={d.etabVille} onChange={(v) => up({ etabVille: v })} />
            <L label="Code postal :" value={d.etabCp} onChange={(v) => up({ etabCp: v })} largeur={140} />
          </div>

          <div style={{ fontWeight: 700, margin: "14px 0 4px", fontSize: 10.5 }}>Parcours de scolarisation</div>
          <table>
            <tbody>
              <tr><th style={{ width: 150 }}>Années</th><th>Scolarisation</th></tr>
              {Array.from({ length: 6 }, (_, i) => {
                const p = d.parcours[i];
                const upP = (champ: "annee" | "scolarisation", v: string) => {
                  const liste = [...d.parcours];
                  liste[i] = { id: p?.id ?? newId(), annee: p?.annee ?? "", scolarisation: p?.scolarisation ?? "", [champ]: v };
                  up({ parcours: liste });
                };
                return (
                  <tr key={i}>
                    <td><input className="gs-plain" value={p?.annee ?? ""} onChange={(e) => upP("annee", e.target.value)} /></td>
                    <td><input className="gs-plain" value={p?.scolarisation ?? ""} onChange={(e) => upP("scolarisation", e.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Feuille>

        {/* ── Page 2 : conditions actuelles ───────────────────────────── */}
        <Feuille num="2/8" type={TYPE} nomEleve={eleve.nom}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Conditions actuelles de scolarisation (accompagnement ou aide spécifique, conditions matérielles, décloisonnement, autres…)</div>
          {([["Plan ou projets formalisés", LIGNES_PLANS, d.plans, "Commentaires (durée de mise en œuvre, effets…)"],
             ["Accompagnement et soins", LIGNES_ACCOMP, d.accompagnements, "Commentaires, précisions"],
             ["Conditions matérielles", LIGNES_MATERIEL, d.materiel, "Commentaires, précisions"]] as const).map(([titre, lignes, vals, entete]) => (
            <table key={titre} style={{ marginBottom: 14 }}>
              <tbody>
                <tr><th style={{ width: 240, textAlign: "left" }}>{titre}</th><th style={{ textAlign: "left" }}>{entete}</th></tr>
                {lignes.map((l, i) => (
                  <tr key={l}>
                    <td>
                      <label className="gs-case">
                        <input type="checkbox" checked={d.coches[l] || !!(vals[l] ?? "").trim()}
                          onChange={(e) => up({ coches: { ...d.coches, [l]: e.target.checked } })} />{l}
                      </label>
                    </td>
                    {i === 0 && <td rowSpan={lignes.length} style={{ padding: 0, verticalAlign: "top" }}>
                      <textarea style={{ minHeight: lignes.length * 19 }}
                        value={lignes.filter((x) => (vals[x] ?? "").trim()).map((x) => `${x} : ${vals[x]}`).join("\n")}
                        onChange={() => {}} readOnly
                        title="Renseignez le détail ligne par ligne dans le champ à droite de chaque dispositif" />
                    </td>}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
          <div style={{ fontWeight: 700, marginTop: 10 }}>Évaluation de la scolarité (à renseigner obligatoirement)</div>
          <div style={{ margin: "3px 0 4px" }}>Niveau d'enseignement dans les apprentissages (CP, CE1…). Si le niveau n'est pas homogène, préciser :</div>
          {zoneTexte(d.niveauApprentissages, (v) => up({ niveauApprentissages: v }), 190)}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
            {([["atteintes", "Scolarité ayant permis les acquisitions attendues pour la moyenne de la classe d'âge"],
               ["nonatteintes", "Scolarité n'ayant pas permis d'accéder aux acquisitions attendues pour la moyenne de la classe d'âge"]] as const).map(([k, l]) => (
              <label key={k} className="gs-case">
                <input type="checkbox" checked={d.acquisitions === k} onChange={() => up({ acquisitions: d.acquisitions === k ? "" : k })} />{l}
              </label>
            ))}
          </div>
        </Feuille>

        {/* ── Page 3 : emploi du temps ────────────────────────────────── */}
        <Feuille num="3/8" type={TYPE} nomEleve={eleve.nom}>
          <div style={{ fontWeight: 700 }}>Emploi du temps actuel de l'élève</div>
          <div style={{ marginBottom: 8 }}>(temps de scolarisation, activités périscolaires, accompagnement et soins, lieux…)</div>
          <table>
            <tbody>
              <tr><th style={{ width: 90 }} /><th>MATIN</th><th style={{ width: 110 }}>MIDI</th><th style={{ width: 250 }}>APRÈS-MIDI</th></tr>
              {JOURS.map((j) => {
                const l = d.edt[j] ?? { matin: "", midi: "", apresmidi: "" };
                return (
                  <tr key={j}>
                    <td className="gs-dom" style={{ fontSize: 11 }}>{j}</td>
                    <td style={{ padding: 0 }}><textarea style={{ minHeight: 76 }} value={l.matin} onChange={(e) => upEdt(j, { matin: e.target.value })} /></td>
                    <td style={{ padding: 0 }}><textarea style={{ minHeight: 76 }} value={l.midi} onChange={(e) => upEdt(j, { midi: e.target.value })} /></td>
                    <td style={{ padding: 0 }}>{j !== "Samedi" && <textarea style={{ minHeight: 76 }} value={l.apresmidi} onChange={(e) => upEdt(j, { apresmidi: e.target.value })} />}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Feuille>

        {/* ── Pages 4 et 5 : observation des activités (paysage) ──────── */}
        {([["4/8", ["general", "mobilite", "entretien", "communication"], false],
           ["5/8", ["scolarite"], true]] as const).map(([num, ids, suite]) => (
          <Feuille key={num} paysage num={num} type={TYPE} nomEleve={eleve.nom}>
            <div className="gs-h bleu">Observation des activités de l'élève{suite ? " (suite)" : ""}</div>
            {grille([...ids])}
            <div className="gs-legende">
              {CODES.filter((c) => c.k !== "SO").map((c) => <div key={c.k}><b>{c.label}</b> : {c.aide.toLowerCase()}.</div>)}
            </div>
            {suite && <>
              <div style={{ fontWeight: 700, margin: "16px 0 4px" }}>Évolutions observées et perspectives, notamment en matière de projet professionnel :</div>
              {zoneTexte(d.evolutions, (v) => up({ evolutions: v }), 150)}
            </>}
          </Feuille>
        ))}

        {/* ── Pages 6-7 : bilan et perspectives ───────────────────────── */}
        {d.type === "reexamen" && (
          <Feuille num="6/8" type={TYPE} nomEleve={eleve.nom}>
            <div className="gs-h bleu">Bilan de la période écoulée</div>
            <div style={{ marginBottom: 10 }}>En quoi les aménagements, adaptations, orientations et compensations ont-ils facilité la scolarisation de l'élève, permis d'acquérir de nouvelles compétences et connaissances, ou permis d'augmenter la durée de scolarisation ?</div>
            {([["Aménagement et adaptations pédagogiques (dont matériel pédagogique adapté)", d.bilanAmenagements, (v: string) => up({ bilanAmenagements: v })],
               ["Dispositifs collectifs de scolarisation (ULIS, unité d'enseignement, SEGPA…)", d.bilanDispositifs, (v: string) => up({ bilanDispositifs: v })],
               ["Missions réalisées par la personne chargée de l'aide humaine", d.bilanAideHumaine, (v: string) => up({ bilanAideHumaine: v })]] as const).map(([t, v, set]) => (
              <div key={t} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>{t}</div>
                {zoneTexte(v, set, 175)}
              </div>
            ))}
          </Feuille>
        )}
        <Feuille num={d.type === "reexamen" ? "7/8" : "5/6"} type={TYPE} nomEleve={eleve.nom}>
          {d.type === "reexamen" && <>
            <div style={{ fontWeight: 700, marginBottom: 3 }}>Accompagnements et soins (ESMS, libéraux, autres…)</div>
            {zoneTexte(d.bilanAccompagnements, (v) => up({ bilanAccompagnements: v }), 200)}
          </>}
          <div className="gs-h bleu" style={{ marginTop: 18 }}>Perspectives</div>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Objectifs pédagogiques et axes à travailler pour la suite du parcours de formation et/ou du projet professionnel</div>
          {zoneTexte(d.perspectives, (v) => up({ perspectives: v }), 230)}
        </Feuille>

        {/* ── Page 8 : remarques et participants ──────────────────────── */}
        <Feuille num={d.type === "reexamen" ? "8/8" : "6/6"} type={TYPE} nomEleve={eleve.nom}>
          <div style={{ fontWeight: 700, marginBottom: 3 }}>Remarques de l'élève et/ou de ses parents, particulièrement par rapport au projet de vie ou au projet professionnel :</div>
          {zoneTexte(d.remarquesFamille, (v) => up({ remarquesFamille: v }), 165)}
          <div style={{ fontWeight: 700, margin: "12px 0 3px" }}>Remarques des professionnels :</div>
          {zoneTexte(d.remarquesProfessionnels, (v) => up({ remarquesProfessionnels: v }), 165)}
          <div style={{ fontWeight: 700, margin: "14px 0 4px" }}>Participants à la réunion</div>
          <table>
            <tbody>
              <tr><th style={{ width: "50%" }}>Nom-Prénom</th><th>Fonction</th></tr>
              {Array.from({ length: 14 }, (_, i) => {
                const p = d.participants[i];
                const upP = (champ: "nom" | "fonction", v: string) => {
                  const liste = [...d.participants];
                  liste[i] = { id: p?.id ?? newId(), nom: p?.nom ?? "", fonction: p?.fonction ?? "", [champ]: v };
                  up({ participants: liste });
                };
                return (
                  <tr key={i}>
                    <td><input className="gs-plain" value={p?.nom ?? ""} onChange={(e) => upP("nom", e.target.value)} /></td>
                    <td><input className="gs-plain" value={p?.fonction ?? ""} onChange={(e) => upP("fonction", e.target.value)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div style={{ marginTop: 12, fontSize: 9.5, lineHeight: 1.5 }}>
            Ce document est un recueil d'informations destiné à la maison départementale des personnes handicapées (MDPH).<br />
            Il ne préjuge pas des avis et des décisions de la commission des droits et de l'autonomie des personnes handicapées (CDAPH).
          </div>
        </Feuille>
      </div>
    </>
  );
}
