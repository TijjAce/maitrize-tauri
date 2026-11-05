import React from "react";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { api, texteErreur, type EtatAppoint, type EtatBanque } from "../api";
import logo from "../assets/logo.png";
import { BANQUES_APPOINT, infoBanque } from "../pictosAppoint";
import {
  CLE_PREMIER_LANCEMENT, ETAPES_DU_LANCEMENT, pictosInstalles, suiteDuLancement, type EtapeDuLancement,
} from "../premierLancement";
import { texteTelechargement, type Telechargement } from "./ChoixPictoConsigne";
import { EntrainementACouper } from "./EntrainementMistral";
import { Field, Input, ouvrirOnglet } from "./ui";

// Le premier lancement, juste après les conditions d'utilisation : les
// pictogrammes (obligatoires), la clé Mistral (facultative), puis l'emploi du
// temps, par où commencer (voir premierLancement.ts).

export function PremierLancement() {
  const nav = useNavigate();
  const [etape, setEtape] = React.useState<EtapeDuLancement | null>(null);
  React.useEffect(() => {
    Promise.all([api.settingGet(CLE_PREMIER_LANCEMENT), api.settingGet("onboardingVu")]).then(([fait, vu]) => {
      const suite = suiteDuLancement(fait, vu);
      if (suite === "montrer") setEtape("pictos");
      else if (suite === "deja-installee") void api.settingSet(CLE_PREMIER_LANCEMENT, "deja-installee");
    }).catch(() => {});
  }, []);

  const finir = async (versLEmploiDuTemps: boolean) => {
    await api.settingSet(CLE_PREMIER_LANCEMENT, new Date().toISOString()).catch(() => {});
    await api.settingSet("onboardingVu", "1").catch(() => {});
    setEtape(null);
    if (versLEmploiDuTemps) {
      nav("/organisation");
      // La page peut mettre un moment à se monter la première fois : la demande se répète, sans effet si l'onglet est déjà ouvert.
      for (const ms of [150, 600]) window.setTimeout(() => ouvrirOnglet("organisation", "edt"), ms);
    }
  };

  if (!etape) return null;
  const rang = ETAPES_DU_LANCEMENT.findIndex((e) => e.id === etape);
  return (
    <div className="premier-lancement" role="dialog" aria-modal="true" aria-labelledby="premier-lancement-titre">
      <div className="card premier-lancement-carte">
        <div className="premier-lancement-tete">
          <img src={logo} alt="" />
          <div>
            <div id="premier-lancement-titre" className="premier-lancement-nom">Bienvenue dans Maitrize</div>
            <ol className="premier-lancement-etapes" aria-label="Les étapes">
              {ETAPES_DU_LANCEMENT.map((e, i) => (
                <li key={e.id} className={i === rang ? "active" : i < rang ? "faite" : ""} aria-current={i === rang ? "step" : undefined}>
                  {i < rang ? "✓" : i + 1} · {e.nom}
                </li>
              ))}
            </ol>
          </div>
        </div>
        <div className="premier-lancement-corps">
          {etape === "pictos" && <EtapePictos onSuite={() => setEtape("cle")} />}
          {etape === "cle" && <EtapeCle onSuite={() => setEtape("edt")} />}
          {etape === "edt" && <EtapeEmploiDuTemps onCommencer={() => { void finir(true); }} onPlusTard={() => { void finir(false); }} />}
        </div>
      </div>
    </div>
  );
}

type Avancement = { etape: string; faits: number; total: number };

/** Les trois banques, à installer avant d'aller plus loin : ARASAAC d'abord, la plus grosse, puis les banques d'appoint. */
function EtapePictos({ onSuite }: { onSuite: () => void }) {
  const [arasaac, setArasaac] = React.useState<EtatBanque | null>(null);
  const [appoint, setAppoint] = React.useState<EtatAppoint[]>([]);
  const [avancement, setAvancement] = React.useState<Avancement | null>(null);
  const [avancementAppoint, setAvancementAppoint] = React.useState<Telechargement | null>(null);
  const [enCours, setEnCours] = React.useState(false);
  const [erreur, setErreur] = React.useState("");

  React.useEffect(() => {
    api.arasaacEtat().then(setArasaac).catch(() => {});
    api.pictosAppointEtat().then(setAppoint).catch(() => {});
    const a = listen<Avancement>("arasaac://avancement", (e) => setAvancement(e.payload));
    const b = listen<Telechargement>("pictos-appoint://avancement", (e) => setAvancementAppoint(e.payload));
    return () => { a.then((off) => off()); b.then((off) => off()); };
  }, []);

  const appointInstallee = (cle: string) => appoint.some((e) => e.banque === cle && e.installee);
  const tout = pictosInstalles(!!arasaac?.installee, appoint, BANQUES_APPOINT.map((b) => b.cle));

  const installer = async () => {
    setEnCours(true);
    setErreur("");
    try {
      if (!arasaac?.installee) {
        setAvancement({ etape: "Démarrage", faits: 0, total: 0 });
        setArasaac(await api.arasaacTelecharger());
        setAvancement(null);
      }
      for (const b of BANQUES_APPOINT) {
        if (appointInstallee(b.cle)) continue;
        setAvancementAppoint({ banque: b.cle, recus: 0, total: 0 });
        const etat = await api.pictosAppointTelecharger(b.cle);
        setAppoint((avant) => [...avant.filter((e) => e.banque !== b.cle), etat]);
        setAvancementAppoint(null);
      }
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setEnCours(false);
      setAvancement(null);
      setAvancementAppoint(null);
    }
  };

  const ligne = (nom: string, taille: string, installee: boolean, progres: React.ReactNode) => (
    <li className={installee ? "installee" : ""}>
      <span className="premier-lancement-banque">{installee ? "✓" : "⬇"} {nom}</span>
      <span className="premier-lancement-taille">{installee ? "installée" : progres || taille}</span>
    </li>
  );
  const pourcent = avancement && avancement.total > 0 ? Math.round((avancement.faits / avancement.total) * 100) : null;

  return (
    <>
      <h2>Les pictogrammes</h2>
      <p>
        Les feuilles, les consignes et les tableaux de communication de Maitrize s'illustrent avec trois banques de
        pictogrammes libres. Elles s'installent une fois sur cet ordinateur, puis tout fonctionne hors ligne : comptez
        une dizaine de minutes.
      </p>
      <ul className="premier-lancement-banques">
        {ligne("ARASAAC, 13 800 pictogrammes", "environ 330 Mo", !!arasaac?.installee,
          avancement && `${avancement.etape}${avancement.total > 0 ? ` — ${pourcent} %` : ""}`)}
        {BANQUES_APPOINT.map((b) => (
          <React.Fragment key={b.cle}>
            {ligne(b.nom, b.taille, appointInstallee(b.cle), avancementAppoint?.banque === b.cle && texteTelechargement(avancementAppoint).replace(`${infoBanque(b.cle).nom} : `, ""))}
          </React.Fragment>
        ))}
      </ul>
      {pourcent !== null && (
        <div className="premier-lancement-jauge" aria-hidden="true"><div style={{ width: `${pourcent}%` }} /></div>
      )}
      {erreur && <p className="premier-lancement-erreur" role="alert">Le téléchargement s'est arrêté : {erreur}. Il reprendra là où il s'est arrêté.</p>}
      <div className="premier-lancement-boutons">
        {tout
          ? <button className="btn primary" onClick={onSuite}>Continuer</button>
          : <button className="btn primary" disabled={enCours || !arasaac} onClick={() => { void installer(); }}>
            {enCours ? "Installation…" : erreur ? "Réessayer" : "⬇ Installer les pictogrammes"}
          </button>}
      </div>
    </>
  );
}

/** La clé Mistral, si l'on en a une : on peut la donner maintenant, ou plus tard dans les réglages. */
function EtapeCle({ onSuite }: { onSuite: () => void }) {
  const [cle, setCle] = React.useState("");
  const [essai, setEssai] = React.useState("");
  const [enCours, setEnCours] = React.useState(false);
  const [entrainementCoupe, setEntrainementCoupe] = React.useState(false);
  React.useEffect(() => { api.settingGet("mistralEntrainementCoupe").then((v) => setEntrainementCoupe(!!v)).catch(() => {}); }, []);

  const enregistrer = async () => {
    if (cle.trim()) await api.settingSet("mistralApiKey", cle.trim()).catch(() => {});
  };
  const tester = async () => {
    setEnCours(true);
    setEssai("");
    try {
      await enregistrer();
      await api.mistralTest();
      setEssai("✅ La clé fonctionne.");
    } catch (e) {
      setEssai(`❌ ${texteErreur(e)}`);
    } finally {
      setEnCours(false);
    }
  };

  return (
    <>
      <h2>L'assistant IA</h2>
      <p>
        Facultatif. Avec une clé Mistral, l'assistant rédige, reformule et règle les ateliers. Les demandes sont traitées
        dans l'Union européenne, et les noms des élèves partent masqués. Sans clé, tout le reste fonctionne.
      </p>
      <Field label="Clé API Mistral (console.mistral.ai)">
        <Input type="password" autoComplete="off" value={cle} placeholder="Collez votre clé" onChange={(e) => { setCle(e.target.value); setEssai(""); }} />
      </Field>
      {cle.trim() && !entrainementCoupe && (
        <EntrainementACouper onFait={() => { setEntrainementCoupe(true); void api.settingSet("mistralEntrainementCoupe", new Date().toISOString()); }} />
      )}
      {essai && <p className="premier-lancement-essai">{essai}</p>}
      <div className="premier-lancement-boutons">
        <button className="btn" onClick={onSuite}>Plus tard</button>
        <button className="btn" disabled={!cle.trim() || enCours} onClick={() => { void tester(); }}>{enCours ? "Essai…" : "Tester"}</button>
        <button className="btn primary" disabled={!cle.trim() || enCours} onClick={() => { void enregistrer().then(onSuite); }}>Enregistrer et continuer</button>
      </div>
    </>
  );
}

/** L'emploi du temps, par où commencer : ses créneaux servent ensuite partout. */
function EtapeEmploiDuTemps({ onCommencer, onPlusTard }: { onCommencer: () => void; onPlusTard: () => void }) {
  return (
    <>
      <h2>Votre emploi du temps</h2>
      <p>
        Commencez par votre emploi du temps : ses créneaux servent ensuite partout — le cahier journal, le planning,
        les tablettes, la feuille du remplaçant.
      </p>
      <div className="premier-lancement-boutons">
        <button className="btn" onClick={onPlusTard}>Plus tard</button>
        <button className="btn primary" onClick={onCommencer}>Créer mon emploi du temps</button>
      </div>
    </>
  );
}
