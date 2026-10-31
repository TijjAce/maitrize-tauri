import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select, ouvrirOnglet } from "../components/ui";
import { useMotsGardes, useReglages } from "../components/useMemoire";
import { usePictoImages } from "../components/ChoixPicto";
import { toast } from "../components/Toaster";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { ApercuExemple, useMotsExemple } from "../components/Exemple";
import { AssistantDesMots, FIN_SANS_MOTS, type QuestionDeReglage } from "../components/AssistantDesMots";
import { MOTS_EXEMPLE } from "../exemplesDesAteliers";
import { BanqueDeGestes, demanderLesGestesAuJeu, useBanqueDeGestes } from "../components/BanqueDeGestes";
import { graineAuHasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { SONS } from "../lectureSons";
import { Boutons, Coche, Colonnes } from "./AteliersLangage";
import {
  GESTES, GESTES_MAX_PAR_MOT, MOTS_CODES_MINIMUM, REGLAGES_CARTES, REGLAGES_MOTS_CODES, STYLE_GESTES, TAILLES_CARTES, cleDuMot, codageCorrige,
  coderMot, enCorrection, gesteDe, gestesRetenus, htmlCartesGestes, htmlMotsCodes, legendeDuGeste, motCode, motsCodables,
  motsDuPlan, pagesDeCartesGestes, planDesMotsCodes,
  type FormeMotsCodes, type MotCode, type Pas, type TailleCartes,
} from "../gestesBM";

// ── Fabriquer › Sons et lecture › Gestes Borel-Maisonny ────────────────────
//
// Deux ateliers autour des mêmes images. Le premier les range et les imprime
// en cartes — petites pour les mains, grandes pour le tableau. Le second
// écrit des mots en gestes, pour les relier, les reconnaître ou les écrire —
// sur une fiche qui ressemble à celles des fichiers de la méthode.

const borne = (v: string, min: number, max: number, defaut: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || defaut));

/** Les cartes des gestes : la banque d'images, et les planches à découper. */
export function GestesTab() {
  const banque = useBanqueDeGestes();
  const [r, maj] = useReglages("gestesCartes", REGLAGES_CARTES);
  const retenus = React.useMemo(() => gestesRetenus(r, banque.images), [r, banque.images]);
  // Sans image ni son choisi, les cartes d'un exemple : leur place, leur son, le cadre où viendra votre image du geste.
  const exemple = React.useMemo(() => (retenus.length ? [] : GESTES.slice(0, 6)), [retenus.length]);
  const montres = retenus.length ? retenus : exemple;
  // En petit, la vignette suffit et allège la feuille ; au-delà, l'image entière.
  const images = r.taille === "petit" ? { ...banque.images, ...banque.vignettes } : banque.images;
  const html = React.useMemo(() => htmlCartesGestes(montres, images, r), [montres, images, r]);
  const pages = pagesDeCartesGestes(retenus.length, r);
  const choisis = new Set(r.choisis);
  const basculer = (id: string) => maj({ choisis: choisis.has(id) ? r.choisis.filter((x) => x !== id) : [...r.choisis, id] });
  // Un loto, un mémory : les mêmes gestes, dans les jeux d'images de Fabriquer.
  const aJouer = retenus.filter((g) => banque.images[g.id]).map((g) => g.id);
  const jouer = (jeu: "jeux" | "memory") => { demanderLesGestesAuJeu(aJouer); ouvrirOnglet("jeux", jeu); };
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Gestes Borel-Maisonny
          <Aide titre="Gestes Borel-Maisonny" vers="droite"><p>Un geste pour chaque son, quelles que soient ses écritures : on « dit » un mot avec les mains avant de le lire. Les cartes des gestes, à découper ; vos images des gestes, apportées une fois, restent chez vous.</p></Aide>
        </h3>
        <BanqueDeGestes banque={banque} />
        <Field label="Taille des cartes">
          <Select value={r.taille} onChange={(e) => maj({ taille: e.target.value as TailleCartes })}>
            {(Object.keys(TAILLES_CARTES) as TailleCartes[]).map((t) => <option key={t} value={t}>{TAILLES_CARTES[t].libelle}</option>)}
          </Select>
        </Field>
        <Coche on={r.lettres} libelle="Écrire le son sous l'image" onChange={(v) => maj({ lettres: v })} />
        {r.lettres && <Coche on={r.toutesLesGraphies} libelle="Avec toutes ses écritures : o · au · eau" onChange={(v) => maj({ toutesLesGraphies: v })} />}
        <Field label="Combien de jeux de cartes">
          <Input type="number" min={1} max={12} value={r.exemplaires} style={{ width: 80 }}
            onChange={(e) => maj({ exemplaires: borne(e.target.value, 1, 12, 1) })} />
        </Field>
        <Field label={r.choisis.length ? `Les sons à imprimer (${r.choisis.length})` : "Les sons à imprimer : tous ceux qui ont une image"}>
          <div className="gb-sons">
            {GESTES.map((g) => (
              <button key={g.id} type="button" className={`gb-son${choisis.has(g.id) ? " on" : ""}`} aria-pressed={choisis.has(g.id)}
                title={banque.images[g.id] ? g.graphies.join(", ") : `${g.graphies.join(", ")} — image à ajouter`}
                onClick={() => basculer(g.id)}>{g.graphies[0]}</button>
            ))}
            {r.choisis.length > 0 && <button type="button" className="btn ghost sm" onClick={() => maj({ choisis: [] })}>Tous</button>}
          </div>
        </Field>
        <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
          {retenus.length
            ? `${retenus.length * r.exemplaires} carte${retenus.length * r.exemplaires > 1 ? "s" : ""}, ${pages} page${pages > 1 ? "s" : ""} à découper.`
            : "Aucune carte : importez vos images, ou choisissez des sons."}
        </div>
        <Boutons atelier="gestes" titre="Gestes Borel-Maisonny" html={html} style={STYLE_GESTES} peut={retenus.length > 0} />
        {aJouer.length >= 2 && (
          <div className="gb-jouer">
            <span className="meta" style={{ fontSize: 12.5 }}>Jouer avec ces {aJouer.length} gestes :</span>
            <button type="button" className="btn sm" onClick={() => jouer("jeux")}>🎲 En faire un loto</button>
            <button type="button" className="btn sm" onClick={() => jouer("memory")}>🃏 En faire un mémory</button>
          </div>
        )}
      </>}
      droite={retenus.length ? <ApercuFeuille html={html} style={STYLE_GESTES} />
        : <ApercuExemple onPrendre={() => maj({ choisis: exemple.map((g) => g.id) })}><ApercuFeuille html={html} style={STYLE_GESTES} /></ApercuExemple>}
    />
  );
}

/** Les mots tout prêts, son par son : ceux des fiches de sons, déchiffrables et connus. */
const MOTS_PAR_SON = SONS.map((s) => ({ libelle: `${s.son} — ${s.graphemes.join(", ")}`, mots: s.mots }));

/** Un mot et ses pas : chaque pas se corrige d'un choix, parce que le français a ses exceptions. */
function CodageDuMot({ mot, pas, corrige, onChange, onRetablir }: {
  mot: string; pas: Pas[]; corrige: boolean; onChange: (pas: Pas[]) => void; onRetablir: () => void;
}) {
  return (
    <div className="gb-codage">
      <span className="gb-codage-mot">{mot}</span>
      <span className="gb-codage-pas">
        {pas.map((p, k) => (
          <label key={k} className={`gb-pas${p.geste ? "" : " muet"}`}>
            <span>{p.graphie}</span>
            <select value={p.geste ?? "-"} aria-label={`Le geste de « ${p.graphie} » dans ${mot}`}
              onChange={(e) => onChange(pas.map((x, j) => (j === k ? { ...x, geste: e.target.value === "-" ? null : e.target.value } : x)))}>
              <option value="-">muet</option>
              {GESTES.map((g) => <option key={g.id} value={g.id}>{g.id}</option>)}
            </select>
          </label>
        ))}
      </span>
      {corrige && <button type="button" className="btn ghost sm" title="Revenir au codage automatique" onClick={onRetablir}>↺</button>}
    </div>
  );
}

/** Les mots codés en gestes : à relier au mot, à reconnaître par son dessin, ou à écrire. */
/** Ce que fait l'élève, pour la question de l'assistant. */
const FORMES: { id: FormeMotsCodes; libelle: string; description: string }[] = [
  { id: "fiche", libelle: "Colorier, puis relier", description: "colorier le bon dessin, puis relier les gestes au bon mot" },
  { id: "relier", libelle: "Relier", description: "les gestes au bon mot" },
  { id: "colorier", libelle: "Colorier", description: "le dessin du mot écrit en gestes" },
  { id: "ecrire", libelle: "Écrire le mot", description: "lu en gestes" },
];

export function MotsEnGestesTab({ banque }: { banque: boolean }) {
  const gestes = useBanqueDeGestes();
  const [mots, setMots] = useMotsGardes("motsGestes:mots");
  const [r, maj] = useReglages("motsGestes", REGLAGES_MOTS_CODES);
  // Les corrections se gardent : « ville » ne se corrige qu'une fois.
  const [gardees, majGardees] = useReglages("gestesCorrections", { mots: {} as Record<string, string[]> });
  const [graine, setGraine] = useGraine();
  // Sans mots, ceux d'un exemple : ce que donnera la feuille.
  const exemple = useMotsExemple(MOTS_EXEMPLE.motsGestes, !mots.length);
  const montres = mots.length ? mots : exemple ?? [];
  const ids = montres.map((m) => m.id).filter((x): x is number => x != null);
  const pictos = usePictoImages(ids);

  const codages = React.useMemo(() => montres.map((m) => codageCorrige(m.mot, gardees.mots, { eFinal: r.eFinal })), [montres, gardees.mots, r.eFinal]);
  const codes: MotCode[] = React.useMemo(() => montres.map((m, k) => motCode(m.mot, codages[k], m.id != null ? pictos[m.id] : undefined, m.id)),
    [montres, codages, pictos]);
  // Dans la suite d'un mot, la vignette suffit : la feuille reste légère.
  const images = React.useMemo(() => ({ ...gestes.images, ...gestes.vignettes }), [gestes.images, gestes.vignettes]);
  const html = React.useMemo(() => htmlMotsCodes(codes, images, r, graine), [codes, images, r, graine]);

  const corriger = (mot: string, pas: Pas[]) => {
    const cle = cleDuMot(mot);
    const suite = { ...gardees.mots };
    // Revenu au codage automatique, le mot n'a plus rien à garder.
    const automatique = enCorrection(coderMot(mot, { eFinal: r.eFinal })).join(" ");
    if (enCorrection(pas).join(" ") === automatique) delete suite[cle];
    else suite[cle] = enCorrection(pas);
    majGardees({ mots: suite });
  };

  const prets = motsCodables(codes);
  const plan = React.useMemo(() => planDesMotsCodes(codes, r), [codes, r]);
  const utiles = motsDuPlan(plan);
  const tropLongs = codes.filter((c) => c.gestes.length > GESTES_MAX_PAR_MOT).map((c) => c.mot);
  const sansImage = r.forme === "colorier" ? prets.filter((c) => !c.image).map((c) => c.mot) : [];
  // Les sons dont l'image manque encore, parmi ceux que la feuille demande — l'en-tête compris.
  const demandes = [...new Set([...utiles.flatMap((c) => c.gestes), ...(gesteDe(r.son) ? [r.son] : [])])];
  const manquants = demandes.filter((id) => gestes.pret && !gestes.images[id]).map((id) => gesteDe(id)?.graphies[0] ?? id);
  const feuilles = plan.length ? plan.length + 1 : 0;
  const aColorier = plan.reduce((n, p) => n + p.colorier.length, 0);
  const peut = mots.length > 0 && utiles.length >= MOTS_CODES_MINIMUM;
  const bilan = !peut
    ? (r.forme === "colorier" && prets.length >= MOTS_CODES_MINIMUM
      ? "Il faut au moins deux mots qui aient une image, pour en faire choisir une."
      : "Ajoutez au moins deux mots.")
    : `${utiles.length} mot${utiles.length > 1 ? "s" : ""}${r.forme === "fiche" && aColorier ? `, dont ${aColorier} à colorier` : ""}, `
      + `${feuilles} feuille${feuilles > 1 ? "s" : ""} avec le corrigé.`;

  // L'assistant (31 octobre 2026) : les mots, puis ce que fait l'élève, le son en tête, les mots par page, le e final.
  const forme = (id: FormeMotsCodes) => (FORMES.find((x) => x.id === id) ?? FORMES[0]).libelle;
  const enTete = (id: string) => { const g = gesteDe(id); return g ? `En tête : ${legendeDuGeste(g, true)}` : "Pas d'en-tête"; };
  const parPage = (n: number) => `${n} mots par page, au plus`;
  const eFinal = (oui: boolean) => (oui ? "Le e final a son geste : fè-ve" : "Le e final n'a pas de geste");
  const reglages: QuestionDeReglage[] = [
    {
      question: { id: "forme", puce: "La fiche", titre: "Que fait l'élève ?", choix: FORMES },
      repondre: (c) => { const f = FORMES.find((x) => x.id === c) ?? FORMES[0]; maj({ forme: f.id }); return f.libelle; },
      actuelle: () => forme(r.forme),
    },
    {
      question: {
        id: "son", puce: "En tête", titre: "Le son étudié, en tête de la feuille ?",
        choix: [
          { id: "aucun", libelle: "Pas d'en-tête", description: "la feuille garde son titre" },
          ...(gesteDe(r.son) ? [{ id: r.son, libelle: legendeDuGeste(gesteDe(r.son)!, true), description: "le son de la dernière feuille" }] : []),
        ],
        autre: { placeholder: "Le son, tel qu'il s'écrit : ch, on, ou, an…" },
      },
      repondre: (c, texte) => {
        const ecrit = (texte ?? "").trim().toLowerCase();
        const g = c === "autre" ? GESTES.find((x) => x.id === ecrit || x.graphies.includes(ecrit)) : gesteDe(c);
        if (c === "autre" && !g) { toast(`« ${ecrit} » : aucun geste ne s'écrit ainsi.`, { icone: "ℹ️" }); return enTete(r.son); }
        maj({ son: g?.id ?? "" });
        return enTete(g?.id ?? "");
      },
      actuelle: () => enTete(r.son),
    },
    {
      question: {
        id: "parPage", puce: "Mots par page", titre: "Combien de mots par page, au plus ?",
        choix: [4, 6, 8].map((n) => ({ id: String(n), libelle: `${n} mots` })),
        autre: { placeholder: "Un autre nombre, de 2 à 8", nombre: { min: 2, max: 8 } },
      },
      repondre: (c, texte) => { const n = borne(texte ?? c, 2, 8, REGLAGES_MOTS_CODES.parPage); maj({ parPage: n }); return parPage(n); },
      actuelle: () => parPage(r.parPage),
    },
    {
      question: {
        id: "eFinal", puce: "Le e final", titre: "Le « e » final se dit-il avec son geste ?",
        choix: [
          { id: "oui", libelle: "Oui : fè-ve", description: "on le prononce, il a son geste" },
          { id: "non", libelle: "Non : fève", description: "muet, il n'a pas de geste" },
        ],
      },
      repondre: (c) => { maj({ eFinal: c === "oui" }); return eFinal(c === "oui"); },
      actuelle: () => eFinal(r.eFinal),
    },
  ];
  return (
    <Colonnes
      gauche={<>
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Mots codés en gestes
          <Aide titre="Mots codés en gestes" vers="droite"><p>Des mots écrits en gestes Borel-Maisonny, un geste par son : à relier, à reconnaître ou à écrire.</p></Aide>
        </h3>
        {gestes.pret && gestes.combien === 0 && (
          <p className="gb-alerte">
            Aucune image de geste pour l'instant : les mots s'écrivent avec les lettres à la place.{" "}
            <button type="button" className="lien" onClick={() => ouvrirOnglet("jeux", "gestes")}>Importer mes images</button>
          </p>
        )}
        <BanqueDeMots mots={mots} onChange={setMots} banque={banque} assistant propositions={MOTS_PAR_SON}
          aide="Chaque mot s'écrit en gestes, un par son. L'élève dit les syllabes en faisant les gestes, puis retrouve le mot." />
        {mots.length > 0 && (
          <Field label="Le codage de chaque mot — corrigez un pas si la règle s'est trompée">
            <div className="gb-codages">
              {mots.map((m, k) => (
                <CodageDuMot key={`${m.mot}-${k}`} mot={m.mot} pas={codages[k]} corrige={!!gardees.mots[cleDuMot(m.mot)]}
                  onChange={(pas) => corriger(m.mot, pas)}
                  onRetablir={() => { const suite = { ...gardees.mots }; delete suite[cleDuMot(m.mot)]; majGardees({ mots: suite }); }} />
              ))}
            </div>
          </Field>
        )}
        {mots.length > 0 && (manquants.length > 0 || sansImage.length > 0 || tropLongs.length > 0) && (
          <div className="meta" style={{ fontSize: 12.5, marginTop: 6, color: "var(--orange)" }}>
            {manquants.length > 0 && <span>Il manque l'image de : {manquants.join(", ")}. </span>}
            {sansImage.length > 0 && <span>Sans dessin, donc écarté{sansImage.length > 1 ? "s" : ""} : {sansImage.join(", ")}. </span>}
            {tropLongs.length > 0 && <span>Trop long{tropLongs.length > 1 ? "s" : ""} pour une ligne : {tropLongs.join(", ")}.</span>}
          </div>
        )}
      </>}
      droite={
        <div className="loto-droite">
          <AssistantDesMots titre="Préparer les mots en gestes" mots={mots} onMots={setMots} banque={banque} reglages={reglages} parTheme={12}
            fin={mots.length ? (peut ? `C'est prêt : ${bilan}` : `⚠️ ${bilan}`) : FIN_SANS_MOTS} />
          <Boutons sousLAssistant atelier="motsGestes" titre="Les mots en gestes" html={html} style={STYLE_GESTES} peut={peut} onTirage={() => setGraine(graineAuHasard())} />
          {!mots.length && utiles.length
            ? <ApercuExemple onPrendre={() => setMots(montres)}><ApercuFeuille html={html} style={STYLE_GESTES} /></ApercuExemple>
            : <ApercuFeuille html={html} style={STYLE_GESTES} />}
        </div>
      }
    />
  );
}
