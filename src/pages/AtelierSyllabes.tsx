import React from "react";
import { api, type PictoArasaac } from "../api";
import { Field, Input, Modal, Select } from "../components/ui";
import { toast } from "../components/Toaster";
import { useReglages } from "../components/useMemoire";
import { usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { ApercuFeuille } from "../components/ApercuFeuille";
import { BanqueDeMots } from "../components/BanqueDeMots";
import { useBanqueDeGestes } from "../components/BanqueDeGestes";
import type { MotImage } from "../jeuxSons";
import { estPerso } from "../imagesPerso";
import { graineAuHasard } from "../hasard";
import { ARTICLES, articleDe, cleDeLArticle, type Article } from "../articles";
import { GESTES, STYLE_GESTES, gesteDe, legendeDuGeste } from "../gestesBM";
import { Boutons, Colonnes } from "./AteliersLangage";
import {
  LETTRES_EN_TETE, MOTS_A_ECRIRE_MAX, REGLAGES_SYLLABES, STYLE_SYLLABES, ecritureDuMot, enTeteDesSyllabes, feuillesDeSyllabes, htmlSyllabes, motsAEcrire,
  syllabesCibles, trousPossibles, type LettresEnTete, type MotATrou, type Trou,
} from "../syllabeManquante";

// ── Fabriquer › Sons et lecture › La syllabe qui manque ────────────────────
//
// La fiche des fichiers de lecture : sous chaque dessin, le mot avec un trou
// à la place de la syllabe qu'on travaille ; puis quelques mots à écrire en
// entier. La banque propose les mots où l'on entend ces syllabes — avec leur
// dessin, sans quoi l'élève ne sait pas quel mot compléter.

/** Le mot avec son trou, pour l'écran : « four__ ». */
const avecTrou = (texte: string, t: Trou) => `${texte.slice(0, t.debut)}__${texte.slice(t.fin)}`;

const PAR_GROUPE = 36;
/** Combien de noms la banque rend pour chaque syllabe : assez pour que « marguerite » ne soit pas coupé. */
const PAR_SYLLABE = 300;

function Candidat({ picto, syllabe, pris, onClick }: { picto: PictoArasaac; syllabe: string; pris: boolean; onClick: () => void }) {
  const src = usePictoImage(picto.id);
  const t = trousPossibles(picto.mot, [syllabe])[0];
  return (
    <div className={`loto-tuile${pris ? " choisie" : ""}`}>
      <button type="button" className="loto-tuile-bouton" aria-pressed={pris} onClick={onClick}
        title={pris ? `Retirer « ${picto.mot} »` : `Prendre « ${picto.mot} », avec un trou à la place de « ${syllabe} »`}>
        {src ? <img src={src} alt="" /> : <div className="loto-tuile-vide" />}
        <span className="loto-tuile-mot sm-apercu">
          {t ? <>{picto.mot.slice(0, t.debut)}<b>{picto.mot.slice(t.debut, t.fin)}</b>{picto.mot.slice(t.fin)}</> : picto.mot}
        </span>
        {pris && <span className="loto-coche" aria-hidden="true">✓</span>}
      </button>
    </div>
  );
}

/** Les noms de la banque où l'on entend les syllabes, rangés par syllabe : l'enseignant prend ceux que la classe connaît. */
function MotsDeLaBanque({ cibles, deja, onClose, onAjouter }: {
  cibles: string[]; deja: Set<string>; onClose: () => void;
  onAjouter: (mots: { mot: MotImage; syllabe: string }[]) => void;
}) {
  const [trouves, setTrouves] = React.useState<PictoArasaac[] | null>(null);
  // Un mot n'a qu'un trou : le prendre sous « mi » le retire de « ma ».
  const [pris, setPris] = React.useState<Record<string, { picto: PictoArasaac; syllabe: string }>>({});
  const [montres, setMontres] = React.useState<Record<string, number>>({});
  const [filtre, setFiltre] = React.useState("");
  const cle = cibles.join(",");
  React.useEffect(() => {
    let vivant = true;
    api.arasaacNomsContenant(cibles, PAR_SYLLABE)
      .then((liste) => { if (vivant) setTrouves(liste ?? []); })
      .catch((e) => { toast(String(e), { icone: "⚠️" }); if (vivant) setTrouves([]); });
    return () => { vivant = false; };
  }, [cle]); // eslint-disable-line react-hooks/exhaustive-deps
  const cherche = ecritureDuMot(filtre);
  const groupes = React.useMemo(() => cibles.map((syllabe) => ({
    syllabe,
    // La banque donne les mots où la syllabe s'écrit ; on ne garde que ceux où elle s'entend.
    mots: (trouves ?? []).filter((p) => !deja.has(ecritureDuMot(p.mot)) && p.mot.includes(cherche) && trousPossibles(p.mot, [syllabe]).length > 0),
  })), [trouves, cle, deja, cherche]); // eslint-disable-line react-hooks/exhaustive-deps
  const basculer = (picto: PictoArasaac, syllabe: string) => setPris((avant) => {
    const suite = { ...avant };
    if (suite[picto.mot]?.syllabe === syllabe) delete suite[picto.mot];
    else suite[picto.mot] = { picto, syllabe };
    return suite;
  });
  const choisis = Object.values(pris);
  return (
    <Modal titre={`Des mots avec ${cibles.join(", ")}`} onClose={onClose} large
      footer={<>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!choisis.length}
          onClick={() => onAjouter(choisis.map((x) => ({ mot: { id: x.picto.id, mot: x.picto.mot }, syllabe: x.syllabe })))}>
          {choisis.length ? `Ajouter ${choisis.length} mot${choisis.length > 1 ? "s" : ""}` : "Ajouter"}
        </button>
      </>}>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
        Les noms de la banque où l'on entend ces syllabes : les mots les plus courants d'abord, puis les plus courts. Prenez ceux
        que la classe connaît : le trou se fera à la place de la syllabe sous laquelle vous prenez le mot.
      </p>
      <Input value={filtre} placeholder="Filtrer : dromadaire, marguerite…" aria-label="Filtrer les mots proposés" style={{ maxWidth: 280, marginBottom: 12 }}
        onChange={(e) => setFiltre(e.target.value)} />
      {!trouves ? <p className="meta">Recherche dans la banque…</p> : groupes.map((g) => {
        const combien = montres[g.syllabe] ?? PAR_GROUPE;
        const ici = choisis.filter((x) => x.syllabe === g.syllabe).length;
        return (
          <section key={g.syllabe} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <b style={{ fontSize: 16 }}>{g.syllabe}</b>
              <span className="meta" style={{ fontSize: 12 }}>
                {g.mots.length ? `${g.mots.length} mot${g.mots.length > 1 ? "s" : ""}` : cherche ? "aucun mot ne répond au filtre" : "aucun nom de la banque"}{ici ? ` · ${ici} pris` : ""}
              </span>
            </div>
            <div className="loto-grille">
              {g.mots.slice(0, combien).map((p) => (
                <Candidat key={p.id + p.mot} picto={p} syllabe={g.syllabe} pris={pris[p.mot]?.syllabe === g.syllabe} onClick={() => basculer(p, g.syllabe)} />
              ))}
            </div>
            {g.mots.length > combien && (
              <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setMontres((m) => ({ ...m, [g.syllabe]: combien + PAR_GROUPE }))}>
                Afficher {Math.min(PAR_GROUPE, g.mots.length - combien)} de plus
              </button>
            )}
          </section>
        );
      })}
    </Modal>
  );
}

/** Les autres dessins qu'un mot a dans la banque : celui qu'on voit décide du mot que l'élève dira. */
function AutreDessin({ mot, id, onClose, onChoisir }: { mot: string; id: number | null; onClose: () => void; onChoisir: (id: number) => void }) {
  const [liste, setListe] = React.useState<PictoArasaac[] | null>(null);
  React.useEffect(() => {
    let vivant = true;
    api.arasaacChercher(mot, 48).then((l) => { if (vivant) setListe(l ?? []); }).catch(() => { if (vivant) setListe([]); });
    return () => { vivant = false; };
  }, [mot]);
  return (
    <Modal titre={`Un autre dessin pour « ${mot} »`} onClose={onClose} large footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      {!liste ? <p className="meta">Recherche dans la banque…</p>
        : !liste.length ? <p className="meta">La banque n'a pas d'autre dessin pour ce mot. « 🖼 Mes images » accepte une photo ou un dessin à vous.</p> : (
          <div className="loto-grille">
            {liste.map((p) => <Dessin key={p.id} picto={p} choisi={p.id === id} onClick={() => onChoisir(p.id)} />)}
          </div>
        )}
    </Modal>
  );
}

function Dessin({ picto, choisi, onClick }: { picto: PictoArasaac; choisi: boolean; onClick: () => void }) {
  const src = usePictoImage(picto.id);
  return (
    <div className={`loto-tuile${choisi ? " choisie" : ""}`}>
      <button type="button" className="loto-tuile-bouton" aria-pressed={choisi} onClick={onClick} title={`Prendre ce dessin (${picto.mot})`}>
        {src ? <img src={src} alt="" /> : <div className="loto-tuile-vide" />}
        <span className="loto-tuile-mot">{picto.mot}</span>
        {choisi && <span className="loto-coche" aria-hidden="true">✓</span>}
      </button>
    </div>
  );
}

const borne = (v: string, min: number, max: number) => Math.max(min, Math.min(max, Math.round(Number(v)) || 0));

/** La syllabe qui manque : les dessins et leurs mots à trou, puis les mots à écrire. */
export function SyllabeManquanteTab({ banque }: { banque: boolean }) {
  const gestes = useBanqueDeGestes();
  const [mots, setMots] = React.useState<MotImage[]>([]);
  const [r, maj] = useReglages("syllabeManquante", REGLAGES_SYLLABES);
  // « Un » ou « une » : ce que l'enseignant a corrigé se garde, d'une fiche à l'autre.
  const [gardes, majGardes] = useReglages("articles", { mots: {} as Record<string, string> });
  // Quel trou pour un mot qui en offre plusieurs : le temps de la fiche.
  const [choix, setChoix] = React.useState<Record<string, number>>({});
  const [graine, setGraine] = React.useState(graineAuHasard);
  const [recherche, setRecherche] = React.useState(false);
  // Le mot dont on change le dessin, par sa place dans la liste.
  const [aRedessiner, setARedessiner] = React.useState<number | null>(null);
  const cibles = React.useMemo(() => syllabesCibles(r.syllabes), [r.syllabes]);
  const pictos = usePictoImages(mots.map((m) => m.id).filter((x): x is number => x != null));

  const lignes = React.useMemo(() => mots.map((m) => {
    const texte = ecritureDuMot(m.mot);
    return { m, texte, trous: trousPossibles(m.mot, cibles), image: m.id != null ? pictos[m.id] : undefined };
  }), [mots, cibles, pictos]);
  const prets: MotATrou[] = React.useMemo(() => lignes.flatMap((l) => {
    const trou = l.trous[choix[l.texte] ?? 0] ?? l.trous[0];
    return trou && l.image ? [{ mot: l.m.mot, texte: l.texte, trou, image: l.image, id: l.m.id }] : [];
  }), [lignes, choix]);
  const sansSyllabe = lignes.filter((l) => !l.trous.length).map((l) => l.texte);
  // Tant que les images se lisent, on ne dit pas qu'un mot n'en a pas.
  const sansDessin = lignes.filter((l) => l.trous.length && l.m.id == null).map((l) => l.texte);

  // Dans l'en-tête, la vignette du geste suffit.
  const imagesDesGestes = React.useMemo(() => ({ ...gestes.images, ...gestes.vignettes }), [gestes.images, gestes.vignettes]);
  // Un réglage d'en-tête qu'on ne connaît plus revient au choix d'origine.
  const sonChoisi = r.son === "auto" || r.son === "" || gesteDe(r.son) ? r.son : "auto";
  const entete = React.useMemo(() => enTeteDesSyllabes({ ...r, son: sonChoisi }, cibles, imagesDesGestes), [r, sonChoisi, cibles, imagesDesGestes]);
  // Les mots à écrire en entier : les plus courts, moins ceux que l'enseignant ne veut pas faire écrire.
  const [ecartes, setEcartes] = React.useState<string[]>([]);
  const ecrits = React.useMemo(() => motsAEcrire(prets.filter((m) => !ecartes.includes(m.texte)), r.aEcrire), [prets, ecartes, r.aEcrire]);
  const articles = React.useMemo(() => Object.fromEntries(ecrits.map((m) => [m.texte, articleDe(m.texte, gardes.mots)])) as Record<string, Article>,
    [ecrits, gardes.mots]);
  const html = React.useMemo(() => htmlSyllabes(prets, ecrits, cibles, r, articles, entete, imagesDesGestes, graine),
    [prets, ecrits, cibles, r, articles, entete, imagesDesGestes, graine]);
  const feuilles = feuillesDeSyllabes(prets, ecrits, r, !!entete);

  const ajouterDeLaBanque = (liste: { mot: MotImage; syllabe: string }[]) => {
    setMots((avant) => [...avant, ...liste.map((x) => x.mot)]);
    // Le trou se fait à la place de la syllabe sous laquelle on a pris le mot.
    setChoix((avant) => ({ ...avant, ...Object.fromEntries(liste.map((x) => [ecritureDuMot(x.mot.mot),
      Math.max(0, trousPossibles(x.mot.mot, cibles).findIndex((t) => t.syllabe === x.syllabe))])) }));
    setRecherche(false);
  };
  const deja = React.useMemo(() => new Set(mots.map((m) => ecritureDuMot(m.mot))), [mots]);

  return (
    <>
      <Colonnes
        gauche={<>
          <h3 style={{ marginTop: 0 }}>La syllabe qui manque</h3>
          <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
            Sous chaque dessin, le mot avec un trou : l'élève dit le mot, et écrit la syllabe qu'il entend.
          </p>
          <Field label="Les syllabes à retrouver">
            <Input value={r.syllabes} placeholder="ma, mi, mu" onChange={(e) => maj({ syllabes: e.target.value })} />
          </Field>
          {banque && (
            <button type="button" className="btn sm primary" style={{ marginBottom: 12 }} disabled={!cibles.length} onClick={() => setRecherche(true)}>
              🔎 Des mots de la banque avec {cibles.length ? cibles.join(", ") : "ces syllabes"}
            </button>
          )}
          <BanqueDeMots mots={mots} onChange={setMots} banque={banque}
            aide="Ou écrivez vos mots : chacun prend son dessin dans la banque. Un mot sans dessin, ou sans l'une de ces syllabes, reste hors de la feuille." />
          {lignes.length > 0 && (
            <Field label="Le trou de chaque mot">
              <div className="gb-codages">
                {lignes.map((l, k) => {
                  const trou = l.trous[choix[l.texte] ?? 0] ?? l.trous[0];
                  return (
                    <div key={`${l.texte}-${k}`} className="gb-codage">
                      <span className="gb-codage-mot sm-apercu">
                        {trou ? <>{l.texte.slice(0, trou.debut)}<b>{l.texte.slice(trou.debut, trou.fin)}</b>{l.texte.slice(trou.fin)}</> : l.texte}
                      </span>
                      {!trou ? <span className="meta" style={{ fontSize: 12 }}>on n'y entend aucune de ces syllabes</span>
                        : l.trous.length > 1 ? (
                          <select className="sm-choix" value={Math.min(choix[l.texte] ?? 0, l.trous.length - 1)} aria-label={`Le trou de ${l.texte}`}
                            onChange={(e) => setChoix((avant) => ({ ...avant, [l.texte]: Number(e.target.value) }))}>
                            {l.trous.map((t, j) => <option key={j} value={j}>{avecTrou(l.texte, t)}</option>)}
                          </select>
                        ) : <span className="meta" style={{ fontSize: 12 }}>{avecTrou(l.texte, trou)}</span>}
                      {trou && l.m.id == null && <span className="meta" style={{ fontSize: 12, color: "var(--orange)" }}>sans dessin</span>}
                      {trou && banque && !estPerso(l.m.id) && (
                        <button type="button" className="btn ghost sm" title="Choisir un autre dessin pour ce mot" aria-label={`Un autre dessin pour ${l.texte}`}
                          onClick={() => setARedessiner(k)}>🔄</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Field>
          )}
          <Field label="Dessins par rangée">
            <Select value={String(r.colonnes === 3 ? 3 : 4)} onChange={(e) => maj({ colonnes: Number(e.target.value) })}>
              <option value="4">Quatre — douze mots sur une page</option>
              <option value="3">Trois — des cases plus larges</option>
            </Select>
          </Field>
          <Field label="Mots à écrire en entier, sous leur dessin">
            <Input type="number" min={0} max={MOTS_A_ECRIRE_MAX} value={r.aEcrire} style={{ width: 80 }}
              onChange={(e) => maj({ aEcrire: borne(e.target.value, 0, MOTS_A_ECRIRE_MAX) })} />
          </Field>
          {(ecrits.length > 0 || ecartes.length > 0) && (
            <Field label="« Un » ou « une » devant ces mots — les plus courts de la liste">
              <div className="gb-codages">
                {ecrits.map((m) => (
                  <div key={m.texte} className="gb-codage">
                    <select className="sm-choix" value={articles[m.texte] ?? ""} aria-label={`L'article de ${m.texte}`}
                      onChange={(e) => majGardes({ mots: { ...gardes.mots, [cleDeLArticle(m.texte)]: e.target.value } })}>
                      {ARTICLES.map((a) => <option key={a.id} value={a.id}>{a.libelle}</option>)}
                    </select>
                    <span className="gb-codage-mot">{m.texte}</span>
                    <button type="button" className="btn ghost sm" title="Faire écrire un autre mot que celui-ci" aria-label={`Ne pas faire écrire ${m.texte}`}
                      onClick={() => setEcartes((avant) => [...avant, m.texte])}>×</button>
                  </div>
                ))}
              </div>
              {ecartes.length > 0 && (
                <button type="button" className="lien" style={{ fontSize: 12.5, marginTop: 4 }} onClick={() => setEcartes([])}>Reprendre les plus courts</button>
              )}
            </Field>
          )}
          <Field label="Le son étudié, en tête de la feuille">
            <Select value={sonChoisi} onChange={(e) => maj({ son: e.target.value })}>
              <option value="auto">Celui des syllabes, si son geste a une image</option>
              <option value="">Pas d'en-tête</option>
              {GESTES.map((g) => <option key={g.id} value={g.id}>{legendeDuGeste(g, true)}</option>)}
            </Select>
          </Field>
          {entete && (
            <Field label="Les lettres de l'en-tête">
              <Select value={r.lettres} onChange={(e) => maj({ lettres: e.target.value as LettresEnTete })}>
                {LETTRES_EN_TETE.map((l) => <option key={l.id} value={l.id}>{l.libelle}</option>)}
              </Select>
              {r.lettres === "cursive" && (
                <p className="meta" style={{ fontSize: 12, lineHeight: 1.45, margin: "4px 0 0" }}>
                  La cursive prend la police d'école installée sur l'ordinateur (Belle Allure, Écriture A, Cursive standard…) ; à défaut, celle du système.
                </p>
              )}
            </Field>
          )}
          <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
            {prets.length
              ? `${prets.length} mot${prets.length > 1 ? "s" : ""}, ${feuilles} feuille${feuilles > 1 ? "s" : ""} avec le corrigé.`
              : !cibles.length ? "Écrivez les syllabes à retrouver." : "Ajoutez des mots où l'on entend ces syllabes."}
            {entete && gestes.pret && !gestes.images[entete.son] && (
              <span style={{ color: "var(--orange)" }}> Il manque l'image du geste « {gesteDe(entete.son)?.graphies[0]} ».</span>
            )}
            {sansSyllabe.length > 0 && <span style={{ color: "var(--orange)" }}> Sans ces syllabes, donc écarté{sansSyllabe.length > 1 ? "s" : ""} : {sansSyllabe.join(", ")}.</span>}
            {sansDessin.length > 0 && <span style={{ color: "var(--orange)" }}> Sans dessin, donc écarté{sansDessin.length > 1 ? "s" : ""} : {sansDessin.join(", ")}.</span>}
          </div>
          <Boutons atelier="syllabeManquante" titre="La syllabe qui manque" html={html} style={STYLE_GESTES + STYLE_SYLLABES} peut={prets.length > 0}
            onTirage={() => setGraine(graineAuHasard())} />
        </>}
        droite={<ApercuFeuille html={html} style={STYLE_GESTES + STYLE_SYLLABES} />}
      />
      {recherche && <MotsDeLaBanque cibles={cibles} deja={deja} onClose={() => setRecherche(false)} onAjouter={ajouterDeLaBanque} />}
      {aRedessiner != null && mots[aRedessiner] && (
        <AutreDessin mot={ecritureDuMot(mots[aRedessiner].mot)} id={mots[aRedessiner].id} onClose={() => setARedessiner(null)}
          onChoisir={(id) => { setMots((avant) => avant.map((m, k) => (k === aRedessiner ? { ...m, id } : m))); setARedessiner(null); }} />
      )}
    </>
  );
}
