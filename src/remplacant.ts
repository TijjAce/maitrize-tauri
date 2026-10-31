// Feuilles d'informations pour la personne qui remplace l'enseignant.
//
// Chaque bloc part de ce que l'application sait déjà — école, emploi du temps,
// élèves et leurs dispositifs, ateliers — et laisse des lignes à compléter pour
// ce qu'elle ne peut pas savoir (rituels, contacts, où est le matériel).
// Les blocs sont du HTML simple, que l'éditeur de feuilles accepte tel quel.

import { echapper } from "./texteRiche";
import { JOURS_EDT, type SlotEdt } from "./organisation";
import { CONTACTS, REPERES, type Etablissement } from "./etablissement";

/** Un point de ce qu'il faut savoir d'un élève — « Communication / langage », « Social »… — et sa phrase (voir aSavoirDesEleves.ts). */
export interface PointASavoir { point: string; texte: string }

export interface DonneesClasse {
  ecole: string;
  enseignant: string;
  /** « Professeur des écoles spécialisé », tel qu'il signe. */
  fonction?: string;
  niveau: string;
  /** La structure, en toutes lettres ; vide en classe ordinaire (voir classe.ts). */
  structure: string;
  annee: string;
  /** `aSavoir` : ce que l'agent en a tiré ; sans lui, la case « À savoir » reprend le dernier axe de travail. */
  eleves: { id: string; nom: string; niveau: string; dispositifs: string[]; axe: string; aSavoir?: PointASavoir[] }[];
  edt: SlotEdt[];
  ateliers: { titre: string; matiere: string }[];
  espaces: { titre: string; description: string }[];
  /** Contacts et repères renseignés dans les réglages ; absents, ils restent à compléter. */
  etablissement?: Etablissement;
}

const aCompleter = "…";
const prenom = (nom: string) => nom.trim().split(/\s+/)[0] ?? nom;

export function blocClasse(d: DonneesClasse, aujourdhui: string): string {
  const lignes = [
    ["École ou établissement", d.ecole || aCompleter],
    ["Classe", [d.structure, d.niveau].filter(Boolean).join(" · ") || aCompleter],
    ["Enseignant·e", [d.enseignant, d.fonction].filter(Boolean).join(" — ") || aCompleter],
    ["Effectif", d.eleves.length ? `${d.eleves.length} élève${d.eleves.length > 1 ? "s" : ""}` : aCompleter],
    ["Année scolaire", d.annee],
  ];
  return `<h1>Informations pour la personne qui remplace</h1>`
    + `<p>${lignes.map(([k, v]) => `<b>${echapper(k)} :</b> ${echapper(v)}`).join("<br>")}</p>`
    + `<p><i>Mise à jour le ${echapper(aujourdhui)}.</i></p>`;
}

export function blocEmploiDuTemps(d: DonneesClasse): string {
  const titre = "<h2>Emploi du temps</h2>";
  if (!d.edt.length) return `${titre}<p>${aCompleter}</p>`;
  const noms = new Map(d.eleves.map((e) => [e.id, prenom(e.nom)]));
  const plages = [...new Set(d.edt.map((s) => `${s.heureDebut}|${s.heureFin}`))]
    .sort((a, b) => a.localeCompare(b));
  const cellule = (jour: string, plage: string) => {
    const [debut, fin] = plage.split("|");
    return d.edt.filter((s) => s.jour === jour && s.heureDebut === debut && s.heureFin === fin)
      .map((s) => {
        const qui = (s.eleves ?? []).map((id) => noms.get(id)).filter(Boolean).join(", ");
        return `<b>${echapper(s.titre)}</b>${qui ? `<br>${echapper(qui)}` : ""}`;
      }).join("<br>");
  };
  const jours = JOURS_EDT.filter((j) => d.edt.some((s) => s.jour === j));
  return titre + `<table><thead><tr><th>Horaire</th>${jours.map((j) => `<th>${j}</th>`).join("")}</tr></thead><tbody>`
    + plages.map((p) => {
      const [debut, fin] = p.split("|");
      return `<tr><td>${echapper(debut.replace(":", "h"))}–${echapper(fin.replace(":", "h"))}</td>${jours.map((j) => `<td>${cellule(j, p)}</td>`).join("")}</tr>`;
    }).join("")
    + `</tbody></table>`;
}

/** Le texte d'un morceau de HTML, pour comparer deux tableaux sans tenir compte de la mise en forme. */
const texteDuHtml = (h: string) => h.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

/**
 * La feuille avec l'emploi du temps d'aujourd'hui : le tableau qui suit le
 * titre « Emploi du temps… » est refait d'après celui d'Organisation
 * (demande de l'enseignant, octobre 2026). Rien d'autre ne change. Sous ce
 * titre, seul le tableau, ou le « … » laissé à compléter, est remplacé :
 * jamais un texte de l'enseignant. Sans emploi du temps dans Organisation,
 * la feuille garde le sien.
 */
export function avecEmploiDuTempsAJour(html: string, d: DonneesClasse): string {
  if (!d.edt.length) return html;
  for (const m of html.matchAll(/<h2\b[^>]*>((?:(?!<\/h2>)[\s\S])*)<\/h2>/gi)) {
    if (!/^emploi du temps\b/i.test(texteDuHtml(m[1]))) continue;
    const debut = m.index ?? 0;
    const suite = html.slice(debut + m[0].length).match(/^\s*(?:<table\b[\s\S]*?<\/table>|<p\b[^>]*>\s*(?:…|&hellip;)\s*<\/p>)/i);
    if (!suite) return html;
    const ancien = html.slice(debut, debut + m[0].length + suite[0].length);
    const nouveau = blocEmploiDuTemps(d);
    return texteDuHtml(ancien) === texteDuHtml(nouveau) ? html : html.slice(0, debut) + nouveau + html.slice(debut + ancien.length);
  }
  return html;
}

/** La case « À savoir » : chaque point en gras, une ligne chacun ; sinon le dernier axe de travail. */
const caseASavoir = (e: DonneesClasse["eleves"][number]) => (e.aSavoir?.length
  ? e.aSavoir.map((p) => `<b>${echapper(p.point)}</b> : ${echapper(p.texte)}`).join("<br>")
  : echapper(e.axe));

export function blocEleves(d: DonneesClasse): string {
  if (!d.eleves.length) return `<h2>Les élèves</h2><p>${aCompleter}</p>`;
  return `<h2>Les élèves</h2><table><thead><tr><th>Élève</th><th>Niveau</th><th>Dispositifs</th><th>À savoir</th></tr></thead><tbody>`
    + d.eleves.map((e) => `<tr><td>${echapper(e.nom)}</td><td>${echapper(e.niveau)}</td><td>${echapper(e.dispositifs.join(", "))}</td><td>${caseASavoir(e)}</td></tr>`).join("")
    + `</tbody></table>`;
}

/**
 * La feuille avec le tableau des élèves refait — quand l'agent vient de
 * remplir « À savoir » (aSavoirDesEleves.ts). Le tableau qui suit le titre
 * « Les élèves », ou le « … » laissé à compléter, est remplacé ; sous un titre
 * suivi d'un texte de l'enseignant, le tableau vient juste après le titre, et
 * le texte reste. Sans ce titre, le bloc s'ajoute à la fin.
 */
export function avecElevesAJour(html: string, d: DonneesClasse): string {
  const nouveau = blocEleves(d);
  for (const m of html.matchAll(/<h2\b[^>]*>((?:(?!<\/h2>)[\s\S])*)<\/h2>/gi)) {
    if (!/^les élèves/i.test(texteDuHtml(m[1]))) continue;
    const debut = m.index ?? 0;
    const apresTitre = debut + m[0].length;
    const suite = html.slice(apresTitre).match(/^\s*(?:<table\b[\s\S]*?<\/table>|<p\b[^>]*>\s*(?:…|&hellip;)\s*<\/p>)/i);
    return html.slice(0, debut) + nouveau + html.slice(apresTitre + (suite ? suite[0].length : 0));
  }
  return html + nouveau;
}

export function blocDeroulement(): string {
  return `<h2>Déroulement d'une journée</h2><ul>`
    + ["Accueil", "Rituels du matin", "Récréations", "Pause méridienne", "Temps calme", "Fin de journée et départs"]
      .map((t) => `<li><b>${t} :</b> ${aCompleter}</li>`).join("")
    + `</ul>`;
}

export function blocRegles(): string {
  return `<h2>Règles de vie et accompagnement du comportement</h2><ul>`
    + ["Règles affichées dans la classe", "Ce qui apaise un élève en difficulté", "À éviter", "Récompenses et outils visuels"]
      .map((t) => `<li><b>${t} :</b> ${aCompleter}</li>`).join("")
    + `</ul>`;
}

export function blocSecurite(d: DonneesClasse): string {
  const pai = d.eleves.filter((e) => e.dispositifs.includes("PAI")).map((e) => e.nom);
  return `<h2>Sécurité et santé</h2><ul>`
    + `<li><b>Élèves avec un PAI :</b> ${pai.length ? echapper(pai.join(", ")) : "aucun enregistré"} — protocole et trousse d'urgence : ${aCompleter}</li>`
    + `<li><b>Allergies et régimes :</b> ${aCompleter}</li>`
    + `<li><b>Exercices incendie et PPMS :</b> point de rassemblement ${aCompleter}</li>`
    + `<li><b>Infirmerie, numéros d'urgence :</b> ${aCompleter}</li>`
    + `</ul>`;
}

export function blocContacts(d?: DonneesClasse): string {
  const connus = d?.etablissement?.contacts ?? {};
  const tel = d?.etablissement?.telephone ?? "";
  return `<h2>Contacts utiles</h2><ul>`
    + (tel ? `<li><b>Téléphone de l'établissement :</b> ${echapper(tel)}</li>` : "")
    + CONTACTS.map((c) => `<li><b>${c.libelle} :</b> ${connus[c.id] ? echapper(connus[c.id]!) : aCompleter}</li>`).join("")
    + `</ul>`;
}

export function blocAteliers(d: DonneesClasse): string {
  if (!d.ateliers.length && !d.espaces.length) return `<h2>Ateliers et espaces</h2><p>${aCompleter}</p>`;
  return `<h2>Ateliers et espaces</h2><ul>`
    + d.ateliers.map((a) => `<li><b>${echapper(a.titre)}</b>${a.matiere ? ` — ${echapper(a.matiere)}` : ""}</li>`).join("")
    + d.espaces.map((e) => `<li><b>${echapper(e.titre)}</b>${e.description ? ` — ${echapper(e.description)}` : ""}</li>`).join("")
    + `</ul>`;
}

export function blocMateriel(d?: DonneesClasse): string {
  const connus = d?.etablissement?.materiel ?? {};
  return `<h2>Où trouver le matériel</h2><ul>`
    + REPERES.map((r) => `<li><b>${r.libelle} :</b> ${connus[r.id] ? echapper(connus[r.id]!) : aCompleter}</li>`).join("")
    + `</ul>`;
}

export function blocTravail(): string {
  return `<h2>Travail prévu</h2><p>${aCompleter}</p>`;
}

/** Les blocs proposés à l'insertion, dans l'ordre d'une feuille complète. */
export const BLOCS_REMPLACANT: { id: string; libelle: string; icone: string; html: (d: DonneesClasse, aujourdhui: string) => string }[] = [
  { id: "classe", libelle: "La classe", icone: "🏫", html: blocClasse },
  { id: "edt", libelle: "Emploi du temps", icone: "🗓", html: (d) => blocEmploiDuTemps(d) },
  { id: "deroulement", libelle: "Déroulement d'une journée", icone: "⏱", html: () => blocDeroulement() },
  { id: "eleves", libelle: "Les élèves", icone: "👥", html: (d) => blocEleves(d) },
  { id: "regles", libelle: "Règles de vie et comportement", icone: "🤝", html: () => blocRegles() },
  { id: "securite", libelle: "Sécurité et santé", icone: "🩹", html: (d) => blocSecurite(d) },
  { id: "ateliers", libelle: "Ateliers et espaces", icone: "🧩", html: (d) => blocAteliers(d) },
  { id: "materiel", libelle: "Où trouver le matériel", icone: "🧰", html: (d) => blocMateriel(d) },
  { id: "contacts", libelle: "Contacts utiles", icone: "📞", html: (d) => blocContacts(d) },
  { id: "travail", libelle: "Travail prévu", icone: "📝", html: () => blocTravail() },
];

/** Une feuille complète, prête à relire et à compléter. */
export const feuilleRemplacant = (d: DonneesClasse, aujourdhui: string) =>
  BLOCS_REMPLACANT.map((b) => b.html(d, aujourdhui)).join("");

/** Le dossier réservé des feuilles, hors du plan de travail. */
export const DOSSIER_INFORMATIONS = "@informations";
