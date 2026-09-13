// Feuilles d'informations pour la personne qui remplace l'enseignant.
//
// Chaque bloc part de ce que l'application sait déjà — école, emploi du temps,
// élèves et leurs dispositifs, ateliers — et laisse des lignes à compléter pour
// ce qu'elle ne peut pas savoir (rituels, contacts, où est le matériel).
// Les blocs sont du HTML simple, que l'éditeur de feuilles accepte tel quel.

import { echapper } from "./texteRiche";
import { JOURS_EDT, type SlotEdt } from "./organisation";

export interface DonneesClasse {
  ecole: string;
  enseignant: string;
  niveau: string;
  ime: boolean;
  annee: string;
  eleves: { id: string; nom: string; niveau: string; dispositifs: string[]; axe: string }[];
  edt: SlotEdt[];
  sourceEdt: "ime" | "classe" | null;
  ateliers: { titre: string; matiere: string }[];
  espaces: { titre: string; description: string }[];
}

const aCompleter = "…";
const prenom = (nom: string) => nom.trim().split(/\s+/)[0] ?? nom;

export function blocClasse(d: DonneesClasse, aujourdhui: string): string {
  const lignes = [
    ["École ou établissement", d.ecole || aCompleter],
    ["Classe", [d.ime ? "Unité d'enseignement (IME)" : "", d.niveau].filter(Boolean).join(" · ") || aCompleter],
    ["Enseignant·e", d.enseignant || aCompleter],
    ["Effectif", d.eleves.length ? `${d.eleves.length} élève${d.eleves.length > 1 ? "s" : ""}` : aCompleter],
    ["Année scolaire", d.annee],
  ];
  return `<h1>Informations pour la personne qui remplace</h1>`
    + `<p>${lignes.map(([k, v]) => `<b>${echapper(k)} :</b> ${echapper(v)}`).join("<br>")}</p>`
    + `<p><i>Mise à jour le ${echapper(aujourdhui)}.</i></p>`;
}

export function blocEmploiDuTemps(d: DonneesClasse): string {
  const titre = `<h2>Emploi du temps${d.sourceEdt === "ime" ? " (organisation IME)" : ""}</h2>`;
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

export function blocEleves(d: DonneesClasse): string {
  if (!d.eleves.length) return `<h2>Les élèves</h2><p>${aCompleter}</p>`;
  return `<h2>Les élèves</h2><table><thead><tr><th>Élève</th><th>Niveau</th><th>Dispositifs</th><th>À savoir</th></tr></thead><tbody>`
    + d.eleves.map((e) => `<tr><td>${echapper(e.nom)}</td><td>${echapper(e.niveau)}</td><td>${echapper(e.dispositifs.join(", "))}</td><td>${echapper(e.axe)}</td></tr>`).join("")
    + `</tbody></table>`;
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

export function blocContacts(): string {
  return `<h2>Contacts utiles</h2><ul>`
    + ["Direction", "Coordination ou chef de service", "Collègues de l'équipe", "AESH, éducateurs, soignants", "Secrétariat"]
      .map((t) => `<li><b>${t} :</b> ${aCompleter}</li>`).join("")
    + `</ul>`;
}

export function blocAteliers(d: DonneesClasse): string {
  if (!d.ateliers.length && !d.espaces.length) return `<h2>Ateliers et espaces</h2><p>${aCompleter}</p>`;
  return `<h2>Ateliers et espaces</h2><ul>`
    + d.ateliers.map((a) => `<li><b>${echapper(a.titre)}</b>${a.matiere ? ` — ${echapper(a.matiere)}` : ""}</li>`).join("")
    + d.espaces.map((e) => `<li><b>${echapper(e.titre)}</b>${e.description ? ` — ${echapper(e.description)}` : ""}</li>`).join("")
    + `</ul>`;
}

export function blocMateriel(): string {
  return `<h2>Où trouver le matériel</h2><ul>`
    + ["Cahiers et classeurs des élèves", "Matériel de manipulation", "Outils de communication (pictogrammes, CAA)", "Clés et badges"]
      .map((t) => `<li><b>${t} :</b> ${aCompleter}</li>`).join("")
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
  { id: "materiel", libelle: "Où trouver le matériel", icone: "🧰", html: () => blocMateriel() },
  { id: "contacts", libelle: "Contacts utiles", icone: "📞", html: () => blocContacts() },
  { id: "travail", libelle: "Travail prévu", icone: "📝", html: () => blocTravail() },
];

/** Une feuille complète, prête à relire et à compléter. */
export const feuilleRemplacant = (d: DonneesClasse, aujourdhui: string) =>
  BLOCS_REMPLACANT.map((b) => b.html(d, aujourdhui)).join("");

/** Le dossier réservé des feuilles, hors du plan de travail. */
export const DOSSIER_INFORMATIONS = "@informations";
