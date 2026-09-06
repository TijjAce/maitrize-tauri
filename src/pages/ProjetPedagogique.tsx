import React from "react";
import { api } from "../api";
import { Field, Input, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";

// ── Projet pédagogique ────────────────────────────────────────────────────
// Le document de cadrage de l'année, structuré selon la classification des
// fonctionnements de Bruno Egron (IEN ASH, « Observer et évaluer l'élève en
// difficulté d'apprentissage pour connaître ses besoins »).
//
// Sa logique : on n'écrit pas un projet à partir de bonnes intentions, mais à
// partir de ce qu'on a observé. Chaque axe rappelle donc les items que la
// grille invite à regarder et les besoins qu'elle suggère, puis demande deux
// choses : ce qui a été repéré dans le groupe, et ce qu'on met en place.
//
// Egron insiste sur un point que la trame reprend : l'observation recueille
// des faits, sans jugement ni interprétation ; l'analyse vient après.

/** Un champ du projet : titre, aide de saisie, et hauteur de la zone. */
interface Champ { id: string; label: string; aide?: string; lignes?: number }
interface Section {
  titre: string;
  ico: string;
  /** Ce que la grille Egron invite à observer sur cet axe. */
  observer?: string[];
  /** Besoins que la grille suggère — une palette, pas une liste à cocher. */
  besoins?: string[];
  champs: Champ[];
}

/** Les deux questions posées sur chaque axe de fonctionnement. */
const axe = (id: string): Champ[] => [
  { id: `${id}Besoins`, label: "Besoins repérés dans le groupe",
    aide: "Des faits observés, sans interprétation.", lignes: 4 },
  { id: `${id}Reponses`, label: "Réponses pédagogiques prévues",
    aide: "Ce qui est mis en place cette année, et par qui.", lignes: 4 },
];

export const SECTIONS: Section[] = [
  {
    titre: "Contexte", ico: "🏫",
    champs: [
      { id: "etablissement", label: "Établissement" },
      { id: "dispositif", label: "Dispositif ou classe" },
      { id: "anneeScolaire", label: "Année scolaire" },
      { id: "cadre", label: "Cadre institutionnel et références",
        aide: "Textes de référence, projet d'établissement dans lequel s'inscrit ce projet.", lignes: 3 },
      { id: "composition", label: "Composition du groupe",
        aide: "Effectif, âges, niveaux, dispositifs dont bénéficient les élèves.", lignes: 4 },
    ],
  },
  {
    titre: "Conditions de vie familiales", ico: "🏠",
    observer: ["Le cadre de vie", "Le regard des parents sur la scolarité", "Le projet parental pour l'enfant"],
    besoins: ["D'un cadre contenant", "D'un cadre sécurisant", "D'apprentissages « déscolarisés »",
              "De projet de formation", "De réassurance"],
    champs: axe("familial"),
  },
  {
    titre: "Fonctionnement sensori-moteur", ico: "🤸",
    observer: ["Coordination motrice globale", "Motricité fine", "Parler",
               "Entendre (percevoir les sons et comprendre)", "Voir (distinguer et identifier)"],
    besoins: ["D'aide aux déplacements", "De techniques palliatives à la déficience motrice",
              "De renforcement du développement moteur", "De temps supplémentaire", "D'aide à l'écriture",
              "De matériel adapté", "D'adaptation des supports de travail",
              "D'outils de communication (langue des signes, pictogrammes…)", "De rééducation du langage",
              "D'adaptation du cadre sonore", "D'appareillage"],
    champs: axe("sensoriMoteur"),
  },
  {
    titre: "Fonctionnement psycho-affectif", ico: "💚",
    observer: ["L'estime de soi", "L'autonomie affective", "La maîtrise des émotions", "La projection"],
    besoins: ["De reconnaissance de ses compétences", "De soutien affectif", "D'un cadre bienveillant",
              "D'activités à sa portée", "D'outils d'aide", "De séquençage des apprentissages",
              "De réussite", "De soutien psychologique (hors classe)", "De lieux et de temps d'expression",
              "De supports d'expression (activités artistiques)", "De rappels réguliers du sens de l'action",
              "D'activités de projet", "D'étayage pour soutenir le désir"],
    champs: axe("psychoAffectif"),
  },
  {
    titre: "Fonctionnement psycho-social", ico: "🤝",
    observer: ["Respecter les règles de vie", "Avoir des relations avec autrui conformes aux règles sociales",
               "Maîtriser son comportement"],
    besoins: ["De rapports aux autres dans un cadre social ordinaire", "D'un cadre structurant et contenant",
              "De connaître les règles sociales", "D'une loi, d'un règlement construits avec lui",
              "D'appartenir à un groupe", "De sécurité", "D'affirmation", "D'indépendance",
              "D'outils et de moments d'expression de ses affects"],
    champs: axe("psychoSocial"),
  },
  {
    titre: "Fonctionnement cognitif", ico: "🧠",
    observer: ["Mémoriser", "S'exprimer et communiquer", "Fatigabilité et attention",
               "Vitesse d'exécution", "Autonomie", "S'orienter dans le temps", "S'orienter dans l'espace"],
    besoins: ["De techniques et supports de mémoire", "D'expression culturelle ou artistique",
              "D'outils de communication", "De situations d'échanges", "De durée de travail aménagée",
              "D'activités qui ont du sens pour lui", "De temps de repos", "De temps supplémentaire",
              "D'exercices d'entraînement et d'automatisation", "D'organisation et de repères spatiaux et temporels",
              "D'outils de référence", "De structuration du temps", "De repères et de vocabulaire spatiaux"],
    champs: axe("cognitif"),
  },
  {
    titre: "Relation au savoir", ico: "📖",
    observer: ["Compréhension du sens de l'école et des apprentissages",
               "Compréhension du sens de l'activité", "Gestion de la difficulté d'apprendre"],
    besoins: ["D'activités concrètes", "D'activités finalisées", "De projets", "D'étayage fort",
              "De sécurité", "De reconnaissance de ses compétences"],
    champs: axe("relationSavoir"),
  },
  {
    titre: "Fonctionnement instrumental", ico: "🔧",
    observer: ["Prise d'informations", "Mobilisation des connaissances", "Mise en œuvre d'inférences",
               "Anticipation et planification", "Communication des résultats de son action"],
    besoins: ["De cadres stratégiques", "De notions préalables", "De supports de présentation différents",
              "D'une réduction des paramètres", "De vocabulaire", "D'être confronté à des situations variées",
              "De supports mnésiques", "D'automatisation des procédures", "De manipulation",
              "De développement des connaissances", "De culture", "De modèles de stratégies",
              "D'outils procéduraux", "De diversité des modes de restitution"],
    champs: axe("instrumental"),
  },
  {
    titre: "Organisation pédagogique", ico: "🗂️",
    champs: [
      { id: "emploiDuTemps", label: "Organisation de la semaine",
        aide: "Temps collectifs, ateliers, groupes de besoin, temps individuels.", lignes: 4 },
      { id: "inclusions", label: "Inclusions et temps partagés", lignes: 3 },
      { id: "espaces", label: "Aménagement des espaces",
        aide: "Coins, affichages, outils d'aide à disposition.", lignes: 3 },
    ],
  },
  {
    titre: "Partenariats", ico: "👪",
    observer: ["Les parents, premiers interlocuteurs", "Les professionnels hors Éducation nationale",
               "Les membres de l'équipe éducative"],
    champs: [
      { id: "familles", label: "Relations avec les familles",
        aide: "Rythme et forme des échanges, association aux décisions.", lignes: 3 },
      { id: "professionnels", label: "Professionnels associés",
        aide: "AESH, éducateurs, rééducateurs, SESSAD, enseignant référent, RASED.", lignes: 3 },
      { id: "partenaires", label: "Partenaires extérieurs", lignes: 3 },
    ],
  },
  {
    titre: "Évaluation du projet", ico: "📊",
    champs: [
      { id: "indicateurs", label: "Indicateurs retenus",
        aide: "À quoi verra-t-on, en fin d'année, que les axes ont porté ?", lignes: 4 },
      { id: "modalites", label: "Modalités et échéances de bilan", lignes: 3 },
      { id: "bilan", label: "Bilan et perspectives",
        aide: "À remplir en fin d'année, pour préparer la suivante.", lignes: 5 },
    ],
  },
];

type Valeurs = Record<string, string>;
const cle = (annee: string) => `projetPedagogique:${annee}`;

/** Champs remplis sur le total, pour situer l'avancement. */
export function compterRempli(valeurs: Valeurs): { remplis: number; total: number } {
  const total = SECTIONS.reduce((n, s) => n + s.champs.length, 0);
  const remplis = SECTIONS.reduce(
    (n, s) => n + s.champs.filter((c) => String(valeurs[c.id] ?? "").trim()).length, 0);
  return { remplis, total };
}

export function ProjetPedagogiqueTab({ annee }: { annee: string }) {
  const [v, setV] = React.useState<Valeurs>({});
  const [charge, setCharge] = React.useState(false);
  const { data: ecole } = useAsync(() => api.settingGet("ecole"), []);

  React.useEffect(() => {
    setCharge(false);
    api.settingGet(cle(annee)).then((s) => {
      let lu: Valeurs = {};
      try { lu = s ? JSON.parse(s) : {}; } catch { lu = {}; }
      vRef.current = lu; setV(lu); setCharge(true);
    });
  }, [annee]);

  // Référence à jour : la saisie est continue, deux frappes rapprochées ne
  // doivent pas s'écraser.
  const vRef = React.useRef<Valeurs>({});
  vRef.current = v;
  const saisir = (id: string, texte: string) => {
    const next = { ...vRef.current, [id]: texte };
    vRef.current = next; setV(next);
    api.settingSet(cle(annee), JSON.stringify(next));
  };

  /** Ajoute un besoin de la palette au champ « besoins repérés » de l'axe. */
  const ajouterBesoin = (s: Section, besoin: string) => {
    const champ = s.champs.find((c) => c.id.endsWith("Besoins"));
    if (!champ) return;
    const actuel = String(vRef.current[champ.id] ?? "");
    if (actuel.includes(besoin)) return;   // déjà noté : on n'empile pas
    saisir(champ.id, actuel.trim() ? `${actuel.trimEnd()}\n${besoin}` : besoin);
  };

  const preRemplir = () => {
    const auto = { ...vRef.current };
    if (!auto.etablissement && ecole) auto.etablissement = ecole;
    if (!auto.anneeScolaire) auto.anneeScolaire = annee;
    vRef.current = auto; setV(auto);
    api.settingSet(cle(annee), JSON.stringify(auto));
    toast("Champs connus pré-remplis.", { icone: "✨" });
  };

  const imprimer = () => {
    const corps = SECTIONS.map((s) => {
      const champs = s.champs
        .filter((c) => String(v[c.id] ?? "").trim())
        .map((c) => `<div style="margin:6px 0"><b>${escapeHtml(c.label)}</b><div style="white-space:pre-wrap">${escapeHtml(v[c.id])}</div></div>`)
        .join("");
      // Une section vide est laissée avec ses intitulés : le document imprimé
      // sert aussi de trame à remplir à la main.
      const vide = s.champs.map((c) => `<div style="margin:6px 0;color:#8b93a7"><b>${escapeHtml(c.label)}</b><div>…</div></div>`).join("");
      return `<h2>${escapeHtml(s.titre)}</h2>${champs || vide}`;
    }).join("");
    printHTML(`Projet pédagogique ${annee}`,
      `<h1>Projet pédagogique</h1>
       <div class="meta">${escapeHtml(v.etablissement || ecole || "")}${v.dispositif ? " · " + escapeHtml(v.dispositif) : ""} · ${escapeHtml(annee)}</div>
       ${corps}
       <div class="meta" style="margin-top:18px;font-style:italic">Trame d'après la classification des
       fonctionnements de Bruno Egron, IEN ASH — « Observer et évaluer l'élève en difficulté
       d'apprentissage pour connaître ses besoins ».</div>`);
  };

  const { remplis, total } = compterRempli(v);

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Projet pédagogique {annee}</span>
        <span style={{ fontSize: 11.5, color: "var(--text-2)" }}
          title="Observer et évaluer l'élève en difficulté d'apprentissage pour connaître ses besoins">
          trame Bruno Egron
        </span>
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{remplis}/{total} rubrique(s) remplie(s)</span>
        <button className="btn sm" onClick={preRemplir}>✨ Pré-remplir</button>
        <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
      </div>

      {!charge ? <div /> : SECTIONS.map((s) => (
        <div key={s.titre} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{s.ico} {s.titre}</h3>
          {(s.observer || s.besoins) && (
            <div style={{ background: "var(--panel-2)", borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
              {s.observer && (
                <div style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.5 }}>
                  <b>À observer</b> — {s.observer.join(" · ")}
                </div>
              )}
              {s.besoins && (
                <details style={{ marginTop: 6 }}>
                  <summary style={{ fontSize: 12, color: "var(--text-2)", cursor: "pointer" }}>
                    Besoins suggérés par la grille ({s.besoins.length})
                  </summary>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 6 }}>
                    {s.besoins.map((b) => (
                      <button key={b} className="chip" title="Ajouter aux besoins repérés"
                        style={{ cursor: "pointer", border: "1px solid var(--border)", font: "inherit", fontSize: 11.5 }}
                        onClick={() => ajouterBesoin(s, b)}>+ {b}</button>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
          <div className={s.champs.every((c) => !c.lignes) ? "row" : undefined}>
            {s.champs.map((c) => (
              <Field key={c.id} label={c.label}>
                {c.lignes
                  ? <Textarea rows={c.lignes} value={v[c.id] ?? ""} placeholder={c.aide}
                      onChange={(e) => saisir(c.id, e.target.value)} />
                  : <Input value={v[c.id] ?? ""} placeholder={c.aide}
                      onChange={(e) => saisir(c.id, e.target.value)} />}
              </Field>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
