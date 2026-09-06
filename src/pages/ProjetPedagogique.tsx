import React from "react";
import { api } from "../api";
import { Field, Input, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { printHTML, escapeHtml } from "../print";

// ── Projet pédagogique ────────────────────────────────────────────────────
// Le document de cadrage de l'année : d'où l'on part, ce qu'on vise, comment
// on s'organise, avec qui, et comment on évalue. Il vit à l'année, pas à
// l'élève — sa place est donc dans Organisation, à côté de la programmation.

/** Un champ du projet : titre, aide de saisie, et hauteur de la zone. */
interface Champ { id: string; label: string; aide?: string; lignes?: number }
interface Section { titre: string; ico: string; champs: Champ[] }

export const SECTIONS: Section[] = [
  {
    titre: "Contexte", ico: "🏫",
    champs: [
      { id: "etablissement", label: "Établissement", lignes: 0 },
      { id: "dispositif", label: "Dispositif ou classe", lignes: 0 },
      { id: "anneeScolaire", label: "Année scolaire", lignes: 0 },
      { id: "cadre", label: "Cadre institutionnel et références",
        aide: "Textes de référence, projet d'établissement dans lequel s'inscrit ce projet.", lignes: 3 },
    ],
  },
  {
    titre: "Le groupe", ico: "👧",
    champs: [
      { id: "composition", label: "Composition du groupe",
        aide: "Effectif, âges, niveaux, dispositifs dont bénéficient les élèves.", lignes: 4 },
      { id: "besoins", label: "Besoins dominants",
        aide: "Ce que l'observation de rentrée fait ressortir, sans nommer les élèves.", lignes: 4 },
      { id: "ressources", label: "Points d'appui du groupe",
        aide: "Ce sur quoi on peut construire : appétences, réussites, dynamique.", lignes: 3 },
    ],
  },
  {
    titre: "Axes de travail", ico: "🎯",
    champs: [
      { id: "axe1", label: "Axe prioritaire 1", lignes: 3 },
      { id: "axe2", label: "Axe prioritaire 2", lignes: 3 },
      { id: "axe3", label: "Axe prioritaire 3", lignes: 3 },
      { id: "objectifs", label: "Objectifs généraux de l'année",
        aide: "Formulés de façon observable, pour pouvoir en faire le bilan en juin.", lignes: 4 },
    ],
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
    titre: "Démarches et supports", ico: "🧰",
    champs: [
      { id: "demarches", label: "Démarches pédagogiques retenues", lignes: 4 },
      { id: "adaptations", label: "Adaptations et compensations",
        aide: "Supports, outils numériques, aménagements récurrents.", lignes: 4 },
      { id: "supports", label: "Supports et matériel", lignes: 3 },
    ],
  },
  {
    titre: "Partenariats", ico: "🤝",
    champs: [
      { id: "familles", label: "Relations avec les familles",
        aide: "Rythme et forme des échanges, association aux décisions.", lignes: 3 },
      { id: "professionnels", label: "Professionnels associés",
        aide: "AESH, éducateurs, rééducateurs, SESSAD, enseignant référent.", lignes: 3 },
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
       ${corps}`);
  };

  const { remplis, total } = compterRempli(v);

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Projet pédagogique {annee}</span>
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{remplis}/{total} rubrique(s) remplie(s)</span>
        <button className="btn sm" onClick={preRemplir}>✨ Pré-remplir</button>
        <button className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
      </div>

      {!charge ? <div /> : SECTIONS.map((s) => (
        <div key={s.titre} className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ margin: "0 0 10px", fontSize: 14 }}>{s.ico} {s.titre}</h3>
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
