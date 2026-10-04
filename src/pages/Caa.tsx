import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Page } from "../App";
import { api, EtatBanque } from "../api";
import { Field, Input, Select, useOngletDemande } from "../components/ui";
import { useMemoire, useReglages } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { ChoixPictoConsigne, texteTelechargement, useBanquesAppoint } from "../components/ChoixPictoConsigne";
import { CompetencesAtelier } from "../components/CompetencesAtelier";
import { Banque } from "./Jeux";
import { TlaTab } from "./Tla";
import { SupportsVisuelsTab, retenirSupport } from "./SupportsVisuels";
import {
  CLE_ACTIF, CLE_LEXIQUE, EVT_LEXIQUE, STYLE_CONSIGNES_PICTOS, VERBES_CONSIGNE, consignesActives, decorerConsignesHtml, ecrireLexique,
  lireLexique, type Lexique, motsAChercher, motsPourLaBanque, pictosAppointProposes, pictosProposes,
} from "../caa";
import { BANQUES_APPOINT, banqueDe, garderImageAppoint, infoBanque, type RefPicto } from "../pictosAppoint";
import {
  REGLAGES_CARTES_PICTOS, STYLE_CARTES_PICTOS, TAILLES_PICTOS, htmlCartesPictos, pagesDesCartesPictos, verbesAImprimer, verbesAvecPicto,
  type TaillePictos,
} from "../cartesPictosConsignes";
import { Boutons, Coche } from "./AteliersLangage";

// ── CAA : communication alternative et augmentée ──────────────────────────
//
// Trois outils qui parlent en pictogrammes : les consignes en pictos, que
// toutes les feuilles de Fabriquer reprennent ; les tableaux de langage,
// pour dire ; les supports visuels, pour se repérer. Ils vivaient dans
// Fabriquer, parmi les jeux : ils ont leur place à eux.

const ONGLETS = ["consignes", "tla", "supports"] as const;
type Onglet = typeof ONGLETS[number];
const lireOnglet = (brut: unknown): Onglet => (ONGLETS.includes(brut as Onglet) ? (brut as Onglet) : "consignes");

export default function Caa() {
  const [onglet, setOnglet] = useMemoire<Onglet>("caa:onglet", lireOnglet);
  // La palette demande un support (« minuteur »…) : l'onglet des supports s'ouvre dessus.
  useOngletDemande("caa", ONGLETS, setOnglet, (o) => { if (retenirSupport(o)) setOnglet("supports"); });

  const [etat, setEtat] = React.useState<EtatBanque | null>(null);
  const [progression, setProgression] = React.useState<{ etape: string; faits: number; total: number } | null>(null);
  React.useEffect(() => { api.arasaacEtat().then(setEtat).catch(() => {}); }, []);
  React.useEffect(() => {
    const p = listen<{ etape: string; faits: number; total: number }>("arasaac://avancement", (e) => setProgression(e.payload));
    return () => { p.then((off) => off()); };
  }, []);
  const telecharger = async () => {
    setProgression({ etape: "Démarrage", faits: 0, total: 0 });
    try { setEtat(await api.arasaacTelecharger()); toast("Banque ARASAAC à jour.", { icone: "✅" }); }
    catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setProgression(null); }
  };
  const banque = Boolean(etat?.installee);
  const avecPictos = (contenu: React.ReactNode) =>
    !etat ? <div /> : !etat.installee ? <Banque progression={progression} onTelecharger={telecharger} /> : contenu;

  return (
    <Page titre="CAA" sous="Communication alternative et augmentée : des pictogrammes pour comprendre et pour dire">
      <div className="onglets" style={{ marginBottom: 16 }}>
        <button className={onglet === "consignes" ? "active" : ""} onClick={() => setOnglet("consignes")}>🔤 Consignes en pictos</button>
        <button className={onglet === "tla" ? "active" : ""} onClick={() => setOnglet("tla")}>🗣 Tableaux de langage</button>
        <button className={onglet === "supports" ? "active" : ""} onClick={() => setOnglet("supports")}>🖼 Supports visuels</button>
      </div>
      {onglet === "consignes" ? avecPictos(<ConsignesEnPictos banque={banque} />)
        : onglet === "tla" ? avecPictos(<><CompetencesAtelier atelier="tla" nom="Tableaux de langage" /><TlaTab /></>)
        : <><CompetencesAtelier atelier="supports" nom="Supports visuels" /><SupportsVisuelsTab banque={banque} /></>}
    </Page>
  );
}

/** Un exemple de consigne, pour voir ce que les feuilles feront. */
const EXEMPLE = `<p class="consigne">Lis la phrase, entoure le verbe, puis écris-le en lettres.</p><p class="consigne">Découpe les étiquettes et colle-les dans l'ordre.</p>`;

function ConsignesEnPictos({ banque }: { banque: boolean }) {
  const [lexique, setLexique] = React.useState<Lexique>({});
  const [reglageActif, setReglageActif] = React.useState<string | null>(null);
  const [choix, setChoix] = React.useState<string>("");
  const [occupe, setOccupe] = React.useState(false);
  const banques = useBanquesAppoint();
  React.useEffect(() => {
    let vivant = true;
    api.settingGet(CLE_LEXIQUE).then((v) => { if (vivant) setLexique(lireLexique(v)); }).catch(() => {});
    api.settingGet(CLE_ACTIF).then((v) => { if (vivant) setReglageActif(v); }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  const enregistrer = (suite: Lexique) => {
    setLexique(suite);
    api.settingSet(CLE_LEXIQUE, ecrireLexique(suite))
      .then(() => window.dispatchEvent(new Event(EVT_LEXIQUE)))
      .catch((e) => toast("Lexique non enregistré : " + String(e), { icone: "⚠️" }));
  };
  const actif = consignesActives(reglageActif, lexique);
  const basculer = () => {
    const suite = actif ? "0" : "1";
    setReglageActif(suite);
    api.settingSet(CLE_ACTIF, suite).then(() => window.dispatchEvent(new Event(EVT_LEXIQUE))).catch(() => {});
  };
  // Un picto pour chaque verbe qui n'en a pas encore : ce qu'ARASAAC connaît sous ce mot ou sous un synonyme ;
  // à défaut, les consignes de F. Bajard ; puis Sclera — téléchargées au passage s'il le faut.
  const proposer = async () => {
    setOccupe(true);
    try {
      const verbes = VERBES_CONSIGNE.map((v) => v.verbe).filter((v) => !lexique[v]);
      const trouves = await api.arasaacPourConsignes([...new Set(verbes.flatMap(motsAChercher))]);
      const proposes: Record<string, RefPicto> = pictosProposes(verbes, trouves);
      const parBanque: string[] = [];
      const compter = (nom: string, n: number) => { if (n) parBanque.push(`${n} ${nom}`); };
      compter("d'ARASAAC", Object.keys(proposes).length);
      for (const b of BANQUES_APPOINT) {
        const manquants = verbes.filter((v) => !proposes[v]);
        if (!manquants.length) break;
        if (!banques.installee(b.cle) && !await banques.telecharger(b.cle)) continue;
        const appoint = pictosAppointProposes(manquants, await api.pictosAppointParMots(b.cle, [...new Set(manquants.flatMap((v) => motsPourLaBanque(v, b.cle)))]), b.cle);
        // La copie de chaque image part avec le lexique : l'autre ordinateur l'imprime sans la banque.
        await Promise.all(Object.values(appoint).map(garderImageAppoint));
        Object.assign(proposes, appoint);
        compter(b.cle === "bajard" ? "de F. Bajard" : "de Sclera", Object.keys(appoint).length);
      }
      enregistrer({ ...lexique, ...proposes });
      const combien = Object.keys(proposes).length;
      const absents = verbes.filter((v) => !proposes[v]);
      const detail = parBanque.length > 1 ? ` (${parBanque.join(", ")})` : "";
      const sansImage = absents.length ? ` — sans image nulle part : ${absents.slice(0, 5).join(", ")}${absents.length > 5 ? ` et ${absents.length - 5} autres` : ""}` : "";
      toast(`${combien} picto${combien > 1 ? "s" : ""} proposé${combien > 1 ? "s" : ""}${detail}${sansImage}.`, { icone: "🔤", duree: 9000 });
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };
  const images = usePictoImages([...new Set(Object.values(lexique))]);
  const apercu = React.useMemo(() => decorerConsignesHtml(EXEMPLE, lexique, images), [lexique, images]);
  const nb = Object.keys(lexique).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Les verbes des consignes</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Choisissez, pour chaque verbe d'action, le pictogramme que vos élèves connaissent. Toutes les feuilles de Fabriquer mettront
          ces pictos devant leurs consignes — « écris », « colorie », « entoure » — pour que l'élève voie ce qu'il doit faire.
        </p>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          Les pictos viennent d'ARASAAC ; quand un verbe n'y est pas, des consignes de F. Bajard, puis de Sclera.{" "}
          {BANQUES_APPOINT.map((b, i) => (
            <React.Fragment key={b.cle}>{i ? " · " : ""}{b.nom} : {banques.installee(b.cle) ? `${banques.nombre(b.cle).toLocaleString("fr-FR")} pictos` : `à télécharger (${b.taille})`}</React.Fragment>
          ))}
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <button type="button" className="btn sm primary" disabled={!banque || occupe} onClick={proposer}
            title="ARASAAC propose son premier picto pour chaque verbe qui n'en a pas ; à défaut, les consignes de F. Bajard, puis Sclera, téléchargées au passage. Vous changez ensuite ceux qui ne vont pas.">
            {banques.enCours ? `⏳ ${texteTelechargement(banques.enCours)}` : occupe ? "⏳ Recherche…" : "🔎 Proposer un picto pour chaque verbe"}
          </button>
          <label className="pb-coche" style={{ margin: 0 }} title={nb ? "" : "Choisissez d'abord au moins un picto"}>
            <input type="checkbox" checked={actif} disabled={!nb} onChange={basculer} />
            <span>Mettre les pictos devant les consignes des feuilles</span>
          </label>
        </div>
        <div className="meta" style={{ fontSize: 12.5 }}>{nb ? `${nb} verbe${nb > 1 ? "s" : ""} avec un picto sur ${VERBES_CONSIGNE.length}.` : "Aucun picto choisi pour l'instant."}</div>
        <div className="caa-apercu">
          <style>{STYLE_CONSIGNES_PICTOS}</style>
          <div className="meta" style={{ fontSize: 11.5, marginBottom: 4 }}>Ce que donnera une consigne :</div>
          <div dangerouslySetInnerHTML={{ __html: apercu }} />
        </div>
      </div>
      <ImprimerLesPictos lexique={lexique} />
      </div>
      <div className="card">
        <div className="caa-verbes">
          {VERBES_CONSIGNE.map((v) => (
            <VerbeCarte key={v.verbe} verbe={v.verbe} refPicto={lexique[v.verbe] ?? null}
              onChoisir={() => setChoix(v.verbe)}
              onRetirer={() => { const suite = { ...lexique }; delete suite[v.verbe]; enregistrer(suite); }} />
          ))}
        </div>
      </div>
      {choix && (
        <ChoixPictoConsigne verbe={choix} actuel={lexique[choix] ?? null} onClose={() => setChoix("")}
          onValider={(ref) => {
            const suite = { ...lexique };
            if (ref == null) delete suite[choix]; else suite[choix] = ref;
            enregistrer(suite);
            setChoix("");
          }} />
      )}
    </div>
  );
}

/** Les pictos des verbes en cartes à découper : en petit pour les manipuler, en grand pour le tableau. */
function ImprimerLesPictos({ lexique }: { lexique: Lexique }) {
  const [r, maj] = useReglages("caaCartesPictos", REGLAGES_CARTES_PICTOS);
  const verbes = verbesAImprimer(lexique, r);
  const tous = verbesAvecPicto(lexique);
  const images = usePictoImages([...new Set(verbes.map((v) => lexique[v]))]);
  const html = React.useMemo(() => htmlCartesPictos(verbes, lexique, images, r), [verbes, lexique, images, r]);
  const combien = verbes.length * Math.max(1, r.exemplaires);
  const pages = pagesDesCartesPictos(verbes.length, r);
  const choisis = new Set(r.choisis);
  const basculer = (v: string) => maj({ choisis: choisis.has(v) ? r.choisis.filter((x) => x !== v) : [...r.choisis, v] });
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 style={{ marginTop: 0 }}>🖨 Imprimer les pictos</h3>
      <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
        En cartes à découper : en petit, ils se manipulent — plan de travail, bande velcro, table de l'élève ; en grand, ils s'affichent au tableau.
      </p>
      <Field label="Taille">
        <Select value={r.taille} onChange={(e) => maj({ taille: e.target.value as TaillePictos })}>
          {(Object.keys(TAILLES_PICTOS) as TaillePictos[]).map((t) => <option key={t} value={t}>{TAILLES_PICTOS[t].libelle}</option>)}
        </Select>
      </Field>
      <Coche on={r.verbe} libelle="Écrire le verbe sous le picto" onChange={(v) => maj({ verbe: v })} />
      <Field label="Combien de jeux">
        <Input type="number" min={1} max={12} value={r.exemplaires} style={{ width: 80 }}
          onChange={(e) => maj({ exemplaires: Math.max(1, Math.min(12, Number(e.target.value) || 1)) })} />
      </Field>
      <Field label={r.choisis.length ? `Les verbes à imprimer (${verbes.length})` : "Les verbes à imprimer : tous ceux qui ont un picto"}>
        <div className="gb-sons">
          {tous.map((v) => (
            <button key={v} type="button" className={`gb-son${choisis.has(v) ? " on" : ""}`} aria-pressed={choisis.has(v)} onClick={() => basculer(v)}>{v}</button>
          ))}
          {r.choisis.length > 0 && <button type="button" className="btn ghost sm" onClick={() => maj({ choisis: [] })}>Tous</button>}
        </div>
      </Field>
      <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
        {verbes.length ? `${combien} carte${combien > 1 ? "s" : ""}, ${pages} page${pages > 1 ? "s" : ""} à découper.` : "Aucun verbe n'a encore de picto."}
      </div>
      <Boutons atelier="caaPictos" titre="Pictos des consignes" html={html} style={STYLE_CARTES_PICTOS} peut={verbes.length > 0} />
    </div>
  );
}

function VerbeCarte({ verbe, refPicto, onChoisir, onRetirer }: { verbe: string; refPicto: RefPicto | null; onChoisir: () => void; onRetirer: () => void }) {
  const src = usePictoImage(refPicto);
  const banque = banqueDe(refPicto);
  const appoint = banque && banque !== "arasaac" ? infoBanque(banque) : null;
  return (
    <div className={`caa-verbe${refPicto ? " on" : ""}`}>
      <button type="button" className="caa-verbe-picto" onClick={onChoisir} title={refPicto ? "Changer le pictogramme" : "Choisir un pictogramme"}>
        {src ? <img src={src} alt="" /> : <span className="caa-verbe-vide">{refPicto ? "…" : "＋"}</span>}
      </button>
      <div className="caa-verbe-nom">{verbe}{appoint && <small className="caa-verbe-source" title={`Picto de la banque ${appoint.nom}`}>{appoint.cle === "bajard" ? "F. Bajard" : appoint.nom}</small>}</div>
      {refPicto && <button type="button" className="btn ghost sm" aria-label={`Retirer le picto de ${verbe}`} onClick={onRetirer}>✕</button>}
    </div>
  );
}
