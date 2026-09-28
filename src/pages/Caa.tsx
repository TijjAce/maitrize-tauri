import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Page } from "../App";
import { api, EtatBanque } from "../api";
import { useOngletDemande } from "../components/ui";
import { useMemoire } from "../components/useMemoire";
import { toast } from "../components/Toaster";
import { ChoixPicto, usePictoImage, usePictoImages } from "../components/ChoixPicto";
import { CompetencesAtelier } from "../components/CompetencesAtelier";
import { Banque } from "./Jeux";
import { TlaTab } from "./Tla";
import { SupportsVisuelsTab, retenirSupport } from "./SupportsVisuels";
import {
  CLE_ACTIF, CLE_LEXIQUE, STYLE_CONSIGNES_PICTOS, VERBES_CONSIGNE, consignesActives, decorerConsignesHtml, ecrireLexique, lireLexique,
  type Lexique,
} from "../caa";

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
  React.useEffect(() => {
    let vivant = true;
    api.settingGet(CLE_LEXIQUE).then((v) => { if (vivant) setLexique(lireLexique(v)); }).catch(() => {});
    api.settingGet(CLE_ACTIF).then((v) => { if (vivant) setReglageActif(v); }).catch(() => {});
    return () => { vivant = false; };
  }, []);
  const enregistrer = (suite: Lexique) => {
    setLexique(suite);
    api.settingSet(CLE_LEXIQUE, ecrireLexique(suite)).catch((e) => toast("Lexique non enregistré : " + String(e), { icone: "⚠️" }));
  };
  const actif = consignesActives(reglageActif, lexique);
  const basculer = () => {
    const suite = actif ? "0" : "1";
    setReglageActif(suite);
    api.settingSet(CLE_ACTIF, suite).catch(() => {});
  };
  // Un picto pour chaque verbe qui n'en a pas encore : le premier que la banque connaît sous ce mot.
  const proposer = async () => {
    setOccupe(true);
    try {
      const manquants = VERBES_CONSIGNE.map((v) => v.verbe).filter((v) => !lexique[v]);
      const [trouves, absents] = await api.arasaacParMots(manquants);
      const suite = { ...lexique };
      for (const p of trouves) {
        const verbe = manquants.find((v) => v.toLowerCase() === p.mot.toLowerCase());
        if (verbe && !suite[verbe]) suite[verbe] = p.id;
      }
      enregistrer(suite);
      const combien = Object.keys(suite).length - Object.keys(lexique).length;
      const sansImage = absents.length ? ` — sans image dans la banque : ${absents.slice(0, 5).join(", ")}${absents.length > 5 ? ` et ${absents.length - 5} autres` : ""}` : "";
      toast(`${combien} picto${combien > 1 ? "s" : ""} proposé${combien > 1 ? "s" : ""}${sansImage}.`, { icone: "🔤", duree: 8000 });
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };
  const images = usePictoImages([...new Set(Object.values(lexique))]);
  const apercu = React.useMemo(() => decorerConsignesHtml(EXEMPLE, lexique, images), [lexique, images]);
  const nb = Object.keys(lexique).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 380px) 1fr", gap: 14, alignItems: "start" }}>
      <div className="card">
        <h3 style={{ marginTop: 0 }}>Les verbes des consignes</h3>
        <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
          Choisissez, pour chaque verbe d'action, le pictogramme que vos élèves connaissent. Toutes les feuilles de Fabriquer mettront
          ces pictos devant leurs consignes — « écris », « colorie », « entoure » — pour que l'élève voie ce qu'il doit faire.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <button type="button" className="btn sm primary" disabled={!banque || occupe} onClick={proposer}
            title="La banque ARASAAC propose son premier picto pour chaque verbe qui n'en a pas ; vous changez ensuite ceux qui ne vont pas">
            {occupe ? "⏳ Recherche…" : "🔎 Proposer un picto pour chaque verbe"}
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
      <div className="card">
        <div className="caa-verbes">
          {VERBES_CONSIGNE.map((v) => (
            <VerbeCarte key={v.verbe} verbe={v.verbe} id={lexique[v.verbe] ?? null}
              onChoisir={() => setChoix(v.verbe)}
              onRetirer={() => { const suite = { ...lexique }; delete suite[v.verbe]; enregistrer(suite); }} />
          ))}
        </div>
      </div>
      {choix && (
        <ChoixPicto valeur={{ id: lexique[choix] ?? null, mot: choix }} banque={banque} titre={`Le pictogramme de « ${choix} »`}
          onClose={() => setChoix("")}
          onValider={(p) => { if (p.id != null) enregistrer({ ...lexique, [choix]: p.id }); setChoix(""); }} />
      )}
    </div>
  );
}

function VerbeCarte({ verbe, id, onChoisir, onRetirer }: { verbe: string; id: number | null; onChoisir: () => void; onRetirer: () => void }) {
  const src = usePictoImage(id);
  return (
    <div className={`caa-verbe${id ? " on" : ""}`}>
      <button type="button" className="caa-verbe-picto" onClick={onChoisir} title={id ? "Changer le pictogramme" : "Choisir un pictogramme"}>
        {src ? <img src={src} alt="" /> : <span className="caa-verbe-vide">{id ? "…" : "＋"}</span>}
      </button>
      <div className="caa-verbe-nom">{verbe}</div>
      {id && <button type="button" className="btn ghost sm" aria-label={`Retirer le picto de ${verbe}`} onClick={onRetirer}>✕</button>}
    </div>
  );
}
