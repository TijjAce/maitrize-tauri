// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Reporter un GEVA-Sco dans le LPI, écran par écran, d'après les fiches du ministère : Éduscol 11948
// pour la première demande (version bêta), 64946 pour le réexamen (avril 2025). Les limites de
// caractères sont lues sur les écrans du réexamen.
//
// L'identité, les adresses et les responsables légaux ne sont pas repris : le livret de l'élève les
// connaît déjà, et ils n'ont rien à faire dans le presse-papiers.

import { DOMAINES, JOURS, TABLEAUX_GEVA, commentairesDuTableau, ligneCochee, type GevaData } from "./gevasco";
import type { BlocACocher, EtapeDuReport, TexteAColler } from "./reporterLpi";

const ZONE = 1000;
const EVALUATION = 3000;
const REMARQUE_PAR_PARTICIPANT = 500;

/** Une zone à part dans le LPI, une simple case dans le support de 2015. */
const LIGNE_AMENAGEMENTS = "Aménagements et adaptations pédagogiques";

/** Les noms du LPI, quand ils diffèrent de ceux du support. */
const CASE_DU_LPI: Record<string, string> = {
  SAPAD: "APADHE (SAPAD)",
  "CAMPS / CMP / CMPP": "CAMPS, CMP ou CMPP",
};

/** Le LPI cote en deux temps : une case, puis une liste quand l'activité est réalisée. */
const COTES: Record<string, string> = {
  A: "Activité réalisée, sans difficulté et seul",
  B: "Activité réalisée, avec des difficultés ponctuelles et/ou une aide ponctuelle",
  C: "Activité réalisée, avec des difficultés régulières et/ou une aide régulière",
  D: "Activité non réalisée",
  SO: "Sans objet",
};

/** L'ordre des domaines à l'écran du LPI n'est pas celui du support. */
const DOMAINES_DU_LPI = ["general", "entretien", "mobilite", "communication", "scolarite"];

const MOMENTS = [["matin", "matin"], ["midi", "midi"], ["apresmidi", "après-midi"]] as const;

const propre = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const zone = (libelle: string, valeur: unknown, max?: number): TexteAColler[] => {
  const texte = propre(valeur);
  return texte ? [{ libelle, texte, ...(max ? { max } : {}) }] : [];
};

const dateFr = (iso: unknown) => {
  const [a, m, j] = propre(iso).split("-");
  return a && m && j ? `${j}/${m}/${a}` : propre(iso);
};

/** Ce que le LPI exige pour passer à la suite, et que le document n'a pas encore. */
function obligatoire(...champs: [string, unknown][]): string | undefined {
  const vides = champs.filter(([, rempli]) => !rempli).map(([nom]) => nom);
  return vides.length ? `Obligatoire dans le LPI, encore vide ici : ${vides.join(", ")}.` : undefined;
}

/** Les cases d'une partie : son titre dit déjà de quoi il s'agit. */
const bloc = (lignes: string[]): BlocACocher[] =>
  (lignes.length ? [{ titre: "", groupes: [{ chemin: "", lignes: lignes.map((texte) => ({ texte })) }] }] : []);

const liste = <T,>(v: T[] | undefined): T[] => (Array.isArray(v) ? v.filter(Boolean) : []);

export const nomDuGeva = (type: GevaData["type"]) => (type === "premiere" ? "GEVA-Sco 1re demande" : "GEVA-Sco réexamen");

/** Ce qui se passe une fois le document finalisé : ce n'est pas le même pour les deux. */
export const rappelDuGeva = (type: GevaData["type"]) => (type === "premiere"
  ? "Dans le LPI, finaliser rend le document visible par la famille et bloque sa modification. Il s'imprime ensuite et se remet à la famille pour son dossier MDPH."
  : "Dans le LPI, seuls l'enseignant référent et la direction peuvent finaliser ce document. Il devient alors visible par la famille.");

function conditions(d: GevaData, premiere: boolean): EtapeDuReport[] {
  const parties = TABLEAUX_GEVA.map((t) => {
    const lignes = t.lignes.filter((l) => l !== LIGNE_AMENAGEMENTS);
    const cochees = lignes.filter((l) => ligneCochee(d, t.id, l));
    const precisions = commentairesDuTableau(lignes, d[t.id]);
    return {
      titre: "Scolarisation",
      sous: `Conditions actuelles : ${t.titre}`,
      ...(premiere && t.id === "plans" ? { aSaisir: "Le PPRE ou le PAP s'il y en a un, et le cycle où il a été mis en place" } : {}),
      blocs: bloc(cochees.map((l) => CASE_DU_LPI[l] ?? l)),
      textes: zone("Veuillez préciser", precisions, ZONE),
      // Sans ces précisions, le réexamen ne laisse pas passer l'accompagnement et les soins.
      ...(!premiere && t.id === "accompagnements" && cochees.length && !precisions
        ? { alerte: "Obligatoire dans le LPI, encore vide ici : les professionnels, la fréquence et le type de soins, les effets sur la situation scolaire." }
        : {}),
    };
  });
  const amenagements: EtapeDuReport = {
    titre: "Scolarisation",
    sous: `Conditions actuelles : ${LIGNE_AMENAGEMENTS}`,
    blocs: [],
    textes: zone("Veuillez préciser", d.materiel?.[LIGNE_AMENAGEMENTS], ZONE),
  };
  // Le LPI les présente dans cet ordre : plans, soins, aménagements, matériel.
  const [plans, accompagnement, materiel] = parties;
  return [plans, accompagnement, amenagements, materiel].filter((e) => e.blocs.length || e.textes.length || e.aSaisir);
}

function activites(d: GevaData, premiere: boolean): EtapeDuReport[] {
  return DOMAINES_DU_LPI.map((id) => {
    const dom = DOMAINES.find((x) => x.id === id)!;
    const cotees = dom.activites.filter((a) => COTES[d.activites?.[a.id]?.code ?? ""]);
    const cadre = d.cadres?.[dom.id];
    const bati = dom.id === "mobilite" && d.accessibiliteBati ? `Accessibilité du bâti : ${d.accessibiliteBati}` : "";
    const obstacles = [bati, propre(cadre?.obstacles)].filter(Boolean).join("\n");
    const aCommenter = cotees.some((a) => ["C", "D"].includes(d.activites[a.id].code))
      && !(propre(cadre?.obstacles) && propre(cadre?.appuis));
    const sansCote = dom.activites.length - cotees.length;
    const alertes = [
      sansCote ? (sansCote > 1 ? `${sansCote} activités pas encore cotées ici.` : "1 activité pas encore cotée ici.") : "",
      aCommenter ? "Activité cotée C ou D : les deux cadres sont à remplir." : "",
    ].filter(Boolean);
    return {
      titre: "Observations",
      sous: `Activités de l'élève : ${dom.titre}`,
      blocs: bloc(cotees.map((a) => `${a.label} : ${COTES[d.activites[a.id].code]}`)),
      textes: [
        ...zone(premiere ? "Obstacles à la réalisation de l'activité" : "Nature des difficultés rencontrées", obstacles, ZONE),
        ...zone("Points d'appui et commentaires", cadre?.appuis, ZONE),
      ],
      ...(alertes.length ? { alerte: alertes.join(" ") } : {}),
    };
  });
}

/** Les étapes du LPI pour ce GEVA-Sco, avec ce qu'il contient. */
export function etapesDuGeva(d: GevaData): EtapeDuReport[] {
  const premiere = d.type === "premiere";
  const participants = liste(d.participants).flatMap((p) => zone(propre(p.fonction) || "Participant", p.nom));
  const parcours = liste(d.parcours)
    .map((p) => [propre(p.annee), propre(p.scolarisation)].filter(Boolean).join(" : "))
    .filter(Boolean).join("\n");
  const emploiDuTemps = JOURS.flatMap((j) => MOMENTS.flatMap(([cle, nom]) => zone(`${j} ${nom}`, d.edt?.[j]?.[cle])));
  const evolutions = [propre(d.evolutions), propre(d.perspectives)].filter(Boolean).join("\n\n");
  const acquisitions = d.acquisitions === "atteintes" ? "Oui" : d.acquisitions === "nonatteintes" ? "Non" : "";

  const etapes: (EtapeDuReport | undefined)[] = [
    {
      titre: "Réunion équipe éducative",
      aSaisir: "Le nom et le prénom dans deux cases, la fonction dans sa liste",
      blocs: [],
      textes: [
        ...(premiere ? [] : zone("N° de dossier MDPH", d.numDossier)),
        ...zone("Date de la réunion", dateFr(d.dateReunion)),
        ...participants,
      ],
      alerte: obligatoire(["la date de la réunion", propre(d.dateReunion)], ["les participants", participants.length]),
    },
    {
      titre: "Scolarisation",
      sous: "Points saillants liés à la scolarisation",
      blocs: [],
      textes: [
        ...zone("Enseignant référent : nom", d.referentNom),
        ...zone("Enseignant référent : téléphone", d.referentTel),
        ...zone("Enseignant référent : courriel", d.referentCourriel),
      ],
    },
    ...conditions(d, premiere),
    {
      titre: "Scolarisation",
      sous: "Évaluation de la scolarité",
      ...(premiere ? { aSaisir: "Si le niveau d'enseignement est homogène, si la scolarité se fait avec ou sans aménagements" } : {}),
      blocs: bloc(acquisitions ? [`Acquisitions attendues pour la moyenne de la classe d'âge : ${acquisitions}`] : []),
      textes: [
        ...zone("Évaluation de la scolarité", d.niveauApprentissages, EVALUATION),
        ...zone("Parcours de scolarisation, à ajouter si utile", parcours),
      ],
      alerte: obligatoire(["les acquisitions attendues", acquisitions], ["l'évaluation de la scolarité", propre(d.niveauApprentissages)]),
    },
    {
      titre: "Scolarisation",
      sous: "Emploi du temps",
      blocs: [],
      textes: emploiDuTemps,
      alerte: obligatoire(["au moins une case de l'emploi du temps", emploiDuTemps.length]),
    },
    ...activites(d, premiere),
    {
      titre: "Observations",
      sous: "Observations et perspectives",
      blocs: [],
      textes: zone("Évolutions observées et perspectives", evolutions, ZONE),
      alerte: obligatoire(["les évolutions observées et les perspectives", evolutions]),
    },
    premiere ? undefined : {
      titre: "Observations",
      sous: "Bilan de la période écoulée",
      blocs: [],
      textes: [
        ...zone("Aménagement et adaptations pédagogiques (dont matériel pédagogique adapté)", d.bilanAmenagements, ZONE),
        ...zone("Dispositifs collectifs de scolarisation (ULIS, UE, EA)", d.bilanDispositifs, ZONE),
        ...zone("Missions réalisées par la personne en charge de l'aide humaine", d.bilanAideHumaine, ZONE),
        ...zone("Accompagnements et soins (ESMS, libéraux…)", d.bilanAccompagnements, ZONE),
      ],
      alerte: obligatoire(["les aménagements et adaptations pédagogiques", propre(d.bilanAmenagements)]),
    },
    {
      titre: "Remarques",
      sous: "Remarques de l'élève et de la famille",
      aSaisir: "Une zone pour l'élève, une pour ses parents",
      blocs: [],
      textes: zone("Remarques de l'élève et/ou de ses parents", d.remarquesFamille, ZONE),
    },
    {
      titre: "Remarques",
      sous: "Autres remarques",
      aSaisir: "Une zone par participant",
      blocs: [],
      textes: zone("Remarques des professionnels", d.remarquesProfessionnels, REMARQUE_PAR_PARTICIPANT),
    },
  ];
  return etapes.filter((e): e is EtapeDuReport => !!e).map((e) => {
    const { alerte, ...reste } = e;
    return alerte ? { ...reste, alerte } : reste;
  });
}
