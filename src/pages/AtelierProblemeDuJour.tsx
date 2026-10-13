import React from "react";
import { Aide } from "../components/Aide";
import { Field, Input, Select } from "../components/ui";
import { useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { chargerImages, usePictoImages } from "../components/ChoixPicto";
import { CasePicto } from "../components/CasePicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BoutonBureau } from "../components/BoutonBureau";
import { CasesFeuille, useOptionsFeuille } from "../components/OptionsFeuille";
import { useCompetencesAtelier } from "../components/CompetencesAtelier";
import { SequenceDuProblemeDuJour } from "../components/SequenceDuProblemeDuJour";
import { enregistrerSurLeBureau, imprimerAtelier } from "../impressionAtelier";
import { STYLE_FEUILLE } from "../cartesImprimables";
import { graineAuHasard, hasard } from "../hasard";
import { useGraine } from "../modifierFeuille";
import { NIVEAUX, type Niveau } from "../categoriser";
import {
  FORMES, JUSQUA_DU_PROGRAMME, NOMS_DES_MODES, QUANTITE_MAX, REGLAGES_PROBLEME, STYLE_PROBLEME_DU_JOUR,
  autresSituations, cequiManque, htmlProblemeDuJour, idsDesImages, modesDeLaPeriode, nomDeLaForme, quoiDuMode, reglagesDuNiveau,
  reglagesDuType, reglagesSurs, situationDe, typeDe, typesDuNiveau,
  type Forme, type ReglagesProbleme, type SituationId, type SituationPerso, type TypeDeProbleme,
} from "../problemeDuJour";
import { ATELIER_PROBLEME_DU_JOUR } from "../sequenceProblemeDuJour";

// ── Fabriquer › Le problème du jour — maternelle ──────────────────────────
//
// Une sorte de problème pour une période : on choisit la classe, la sorte
// de problème et la situation de référence ; l'atelier prépare la période —
// un problème par jour, des nombres qui grandissent dans les limites de
// l'âge — et ce qu'il faut imprimer. La feuille se voit à droite telle
// qu'elle s'imprimera ; la période devient une séquence d'un clic.

const ATELIER = ATELIER_PROBLEME_DU_JOUR;

const NOMBRES = Array.from({ length: QUANTITE_MAX - 1 }, (_, i) => i + 2);

export function ProblemeDuJourTab({ banque }: { banque: boolean }) {
  const [brut, maj] = useReglages<ReglagesProbleme>(ATELIER, REGLAGES_PROBLEME);
  const r = React.useMemo(() => reglagesSurs(brut), [brut]);
  const [graine, setGraine] = useGraine();
  const [enSequence, setEnSequence] = React.useState(false);
  const [competences] = useCompetencesAtelier(ATELIER);
  const ids = React.useMemo(() => (banque ? idsDesImages(r) : []), [banque, r]);
  const images = usePictoImages(ids);
  const t = typeDe(r.type);
  const s = situationDe(r.situation, r.perso);
  const manque = cequiManque(r);
  const html = React.useMemo(() => htmlProblemeDuJour(r, images, hasard(graine)), [r, images, graine]);
  const titre = `${nomDeLaForme(r.forme)} — ${s.nom}`;
  // L'impression attend les images, et garde le tirage de l'aperçu.
  const feuilleImprimee = async () => htmlProblemeDuJour(r, banque ? await chargerImages(ids) : {}, hasard(graine));
  const imprimer = async () => {
    try { await imprimerAtelier(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_PROBLEME_DU_JOUR); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  const { options } = useOptionsFeuille(ATELIER);
  const resume = [`${r.semaines} semaines`, `${r.jours} jours par semaine`, !options.corrige && "sans les réponses"].filter(Boolean).join(", ");
  const piste = t.famille === "piste";
  // La mascotte prépare sa valise : son nom se règle quand elle paraît dans la période.
  const avecMascotte = r.situation === "valise" || r.situation === "perso" || autresSituations(r).includes("valise");
  const majPerso = (p: Partial<SituationPerso>) => maj({ perso: { ...r.perso, ...p } });
  const modes = modesDeLaPeriode(r.semaines);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 400px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0, display: "flex", alignItems: "center", gap: 8 }}>
          Le problème du jour
          <Aide titre="D'où vient ce déroulement" vers="droite">
            <p>Une sorte de problème travaillée pendant une période, quelques minutes chaque jour, dans une situation de référence : avec les objets, puis leurs images, puis des jetons, puis sans manipuler — on cherche, on dit, puis on vérifie —, enfin dans d'autres situations.</p>
            <p>D'après le programme de l'école maternelle (2025), les livrets d'accompagnement « Avant 4 ans », « À partir de 4 ans » et « À partir de 5 ans » (2025) et le guide « La construction du nombre à l'école maternelle » (Éduscol, 2023). Les énoncés sont écrits pour l'application, sur le modèle de ces documents.</p>
          </Aide>
        </h3>
        <Field label="Classe">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="seg">
              {NIVEAUX.map((n) => (
                <button key={n.id} type="button" className={r.niveau === n.id ? "active" : ""}
                  onClick={() => maj(reglagesDuNiveau(r, n.id as Niveau))} title={n.age}>{n.id}</button>
              ))}
            </div>
            <Aide titre={`Les nombres en ${r.niveau}`} vers="droite">
              <p><b>{NIVEAUX.find((n) => n.id === r.niveau)?.age}</b> : des quantités jusqu'à {JUSQUA_DU_PROGRAMME[r.niveau]}{r.niveau === "PS" ? ", voire 4" : r.niveau === "GS" ? ", voire au-delà" : ""} (programme 2025).
                {r.niveau === "PS" ? " Avant 4 ans, on ajoute et on enlève ; ni groupements ni partages." : ""}</p>
            </Aide>
          </div>
        </Field>
        <Field label="La sorte de problème de la période">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Select value={r.type} onChange={(e) => maj(reglagesDuType(r, e.target.value as TypeDeProbleme))}>
              {typesDuNiveau(r.niveau).map((x) => (
                <option key={x.id} value={x.id}>{x.nom}{x.quand?.[r.niveau] ? ` (${x.quand[r.niveau]})` : ""}</option>
              ))}
            </Select>
            <Aide titre={t.nom} vers="gauche">
              <p>{t.quoi}</p>
              <p>D'après {t.source}.</p>
            </Aide>
          </div>
        </Field>
        <Field label="La situation de référence">
          <Select value={r.situation} onChange={(e) => maj({ situation: e.target.value as SituationId })}>
            {t.situations.map((id) => <option key={id} value={id}>{id === "perso" ? "Votre situation…" : situationDe(id).nom}</option>)}
          </Select>
        </Field>
        {r.situation === "perso" ? (
          <div className="pdj-perso">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <Field label="Le contenant, avec son article">
                <Input value={r.perso.lieu} placeholder="le panier" onChange={(e) => majPerso({ lieu: e.target.value })} />
              </Field>
              <Field label="L'objet">
                <Input value={r.perso.objet} placeholder="pomme" onChange={(e) => majPerso({ objet: e.target.value, objets: r.perso.objets === `${r.perso.objet}s` || !r.perso.objets ? `${e.target.value}s` : r.perso.objets })} />
              </Field>
              <Field label="Au pluriel">
                <Input value={r.perso.objets} placeholder="pommes" onChange={(e) => majPerso({ objets: e.target.value })} />
              </Field>
              <Field label="Le mot est">
                <div className="seg">
                  <button type="button" className={!r.perso.feminin ? "active" : ""} onClick={() => majPerso({ feminin: false })}>un</button>
                  <button type="button" className={r.perso.feminin ? "active" : ""} onClick={() => majPerso({ feminin: true })}>une</button>
                </div>
              </Field>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <CasePicto valeur={r.perso.pictoLieu} onChange={(pictoLieu) => majPerso({ pictoLieu })} banque={banque} titre="L'image du contenant" />
              <CasePicto valeur={r.perso.pictoObjet} onChange={(pictoObjet) => majPerso({ pictoObjet })} banque={banque} titre="L'image de l'objet" />
            </div>
          </div>
        ) : (
          <div className="cl-situation">
            {[s.groupe ?? s.lieu, ...s.objets].filter(Boolean).slice(0, 5).map((o) => (
              o && o.picto != null && images[o.picto] ? <img key={String(o.picto)} src={images[o.picto]} alt="" title={o.sing} /> : null
            ))}
            <Aide titre={s.nom} vers="droite"><p>D'après {s.source}.</p></Aide>
          </div>
        )}
        {avecMascotte && (
          <Field label="Le nom de la mascotte de la classe">
            <Input value={r.mascotte} placeholder="Lulu" onChange={(e) => maj({ mascotte: e.target.value })} />
          </Field>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <Field label={piste ? "La piste va jusqu'à" : "Des nombres jusqu'à"}>
            <Select value={r.max} onChange={(e) => maj({ max: Number(e.target.value) })}>
              {NOMBRES.map((n) => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="La période">
            <Select value={`${r.semaines}-${r.jours}`} onChange={(e) => { const [semaines, jours] = e.target.value.split("-").map(Number); maj({ semaines, jours, semaine: Math.min(r.semaine, semaines) }); }}>
              {[4, 5, 6].flatMap((sem) => [4, 5].map((j) => <option key={`${sem}-${j}`} value={`${sem}-${j}`}>{sem} semaines, {j} jours</option>))}
            </Select>
          </Field>
        </div>
        <Field label="Le matériel">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Select value={r.forme} onChange={(e) => maj({ forme: e.target.value as Forme })}>
              {FORMES.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </Select>
            {FORMES.find((f) => f.id === r.forme) && (
              <Aide titre={nomDeLaForme(r.forme)} vers="gauche">
                <p>{(({ quoi }) => quoi.charAt(0).toUpperCase() + quoi.slice(1))(FORMES.find((f) => f.id === r.forme)!)}.</p>
              </Aide>
            )}
          </div>
        </Field>
        {r.forme === "cartes" && (
          <Field label="Les semaines">
            <Select value={r.semaine} onChange={(e) => maj({ semaine: Number(e.target.value) })}>
              <option value={0}>Toute la période, avec son plan</option>
              {modes.map((m, i) => <option key={i} value={i + 1}>Semaine {i + 1} — {NOMS_DES_MODES[m]}</option>)}
            </Select>
          </Field>
        )}
        <details className="pli">
          <summary>La période{resume && <span className="meta"> · {resume}</span>}</summary>
          <ol className="pdj-semaines">
            {modes.map((m, i) => (
              <li key={i}><b>Semaine {i + 1} — {NOMS_DES_MODES[m]}.</b> {quoiDuMode(m, t.famille)}</li>
            ))}
          </ol>
          <CasesFeuille />
        </details>
        {manque && <div className="meta" style={{ fontSize: 12.5, color: "var(--danger, #c92a2a)", margin: "6px 0" }}>{manque}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <button type="button" className="btn sm" onClick={() => setGraine(graineAuHasard())} title="D'autres nombres pour la période">🎲 Autre tirage</button>
          <button type="button" className="btn primary sm" disabled={Boolean(manque)} onClick={() => { void imprimer(); }}>🖨 Imprimer</button>
          <BoutonBureau disabled={Boolean(manque)}
            onEnregistrer={async () => enregistrerSurLeBureau(ATELIER, titre, await feuilleImprimee(), STYLE_FEUILLE + STYLE_PROBLEME_DU_JOUR)} />
        </div>
        <button type="button" className="btn sm" style={{ marginTop: 8 }} disabled={Boolean(manque)} onClick={() => setEnSequence(true)}
          title="La période en séquence : la séance des mots, puis une séance par semaine, chacune avec ses problèmes du jour et ses feuilles">
          📚 Créer la séquence de la période
        </button>
        {enSequence && <SequenceDuProblemeDuJour reglages={r} graine={graine} competences={competences} banque={banque} onClose={() => setEnSequence(false)} />}
      </div>
      <div style={{ minWidth: 0 }}>
        <ApercuFeuille html={html} style={STYLE_PROBLEME_DU_JOUR} />
      </div>
    </div>
  );
}
