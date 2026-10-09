import React from "react";
import { api, texteErreur, type BilanExportEleves, type Eleve } from "../api";
import { EVT_DONNEES_DISTANTES, Modal } from "./ui";
import { confirmer } from "./confirmer";
import { toast } from "./Toaster";
import { chargerVacances } from "../vacances";
import { dossierExporte } from "../dossierHtml";
import {
  aMontrer, CLE_RAPPEL, derniereFinDAnnee, elevesDeLAnneeFinie, lendemain, type FinDAnnee as Fin,
} from "../finDAnnee";

// La fenêtre de fin d'année (voir `finDAnnee.ts`) : elle s'ouvre d'elle-même
// dès les vacances d'été, tant qu'il reste des élèves de l'année finie.

/** Le jour, ici, en AAAA-MM-JJ. */
const aujourdhui = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function FinDAnneeHost() {
  const [etat, setEtat] = React.useState<{ fin: Fin; eleves: Eleve[] } | null>(null);
  const verifier = React.useCallback(async () => {
    const jour = aujourdhui();
    const [vacances, eleves, rappel] = await Promise.all([
      chargerVacances(jour).catch(() => []),
      api.elevesList().catch((): Eleve[] => []),
      api.settingGet(CLE_RAPPEL).catch(() => null),
    ]);
    const fin = derniereFinDAnnee(jour, vacances);
    if (aMontrer(eleves, fin, rappel, jour)) setEtat({ fin, eleves: elevesDeLAnneeFinie(eleves, fin) });
  }, []);
  React.useEffect(() => {
    // Un peu après l'ouverture : elle ne passe pas devant l'accueil ou les nouveautés.
    const ouverture = window.setTimeout(() => { void verifier(); }, 4000);
    // Et de temps en temps, pour qui laisse l'application ouverte tout l'été.
    const veille = window.setInterval(() => { void verifier(); }, 6 * 3600 * 1000);
    return () => { window.clearTimeout(ouverture); window.clearInterval(veille); };
  }, [verifier]);
  if (!etat) return null;
  return <FenetreFinDAnnee fin={etat.fin} eleves={etat.eleves} onClose={() => setEtat(null)} />;
}

function FenetreFinDAnnee({ fin, eleves, onClose }: { fin: Fin; eleves: Eleve[]; onClose: () => void }) {
  const [restent, setRestent] = React.useState<Set<string>>(new Set());
  const [bilan, setBilan] = React.useState<BilanExportEleves | null>(null);
  const [occupe, setOccupe] = React.useState<"" | "export" | "fin">("");
  const [erreur, setErreur] = React.useState("");
  const partent = eleves.filter((e) => !restent.has(e.id));
  const gardes = eleves.filter((e) => restent.has(e.id));

  const basculer = (id: string) => setRestent((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const exporter = async () => {
    setErreur("");
    const { open } = await import("@tauri-apps/plugin-dialog");
    const choix = await open({ directory: true, multiple: false, title: "Où exporter les dossiers des élèves ?" });
    if (typeof choix !== "string") return;
    setOccupe("export");
    try {
      const ime = (await api.settingGet("typeStructure").catch(() => null)) === "ime";
      const dossiers: { id: string; html: string }[] = [];
      for (const e of eleves) dossiers.push({ id: e.id, html: await dossierExporte(e, ime, fin.annee) });
      setBilan(await api.elevesExporter(choix, fin.annee, dossiers));
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setOccupe("");
    }
  };

  // Fermer, c'est remettre à demain : la fenêtre revient tant que l'année n'est pas close.
  const plusTard = () => {
    api.settingSet(CLE_RAPPEL, lendemain(aujourdhui())).catch(() => {});
    onClose();
  };

  const terminer = async () => {
    setErreur("");
    if (partent.length) {
      const noms = partent.map((e) => e.nom).join(", ");
      const ok = await confirmer(
        `Supprimer ${pluriel(partent.length, "élève")} — ${noms} — et tout leur dossier : observations, documents, photos ? C'est définitif.`
          + (bilan ? "" : "\n\nVous n'avez pas exporté leurs données."),
        { oui: `Supprimer ${pluriel(partent.length, "élève")}`, danger: true });
      if (!ok) return;
    }
    setOccupe("fin");
    try {
      for (const e of gardes) await api.eleveSave({ ...e, anneeScolaire: fin.suivante });
      for (const e of partent) await api.eleveDelete(e.id);
      window.dispatchEvent(new CustomEvent(EVT_DONNEES_DISTANTES));
      toast([
        partent.length ? `${pluriel(partent.length, "élève")} supprimé${partent.length > 1 ? "s" : ""}` : "",
        gardes.length ? `${pluriel(gardes.length, "élève")} gardé${gardes.length > 1 ? "s" : ""} pour ${fin.suivante}` : "",
      ].filter(Boolean).join(" ; ") + ". Bonne rentrée !", { icone: "🎒" });
      onClose();
    } catch (e) {
      setErreur(texteErreur(e));
    } finally {
      setOccupe("");
    }
  };

  return (
    <Modal titre={`Fin de l'année scolaire ${fin.annee}`} onClose={plusTard} large
      footer={<>
        <button className="btn" onClick={plusTard} disabled={!!occupe}>Plus tard</button>
        <button className={`btn ${partent.length ? "danger" : "primary"}`} onClick={() => { void terminer(); }} disabled={!!occupe}>
          {occupe === "fin" ? "En cours…"
            : partent.length ? `Supprimer ${pluriel(partent.length, "élève")} qui ${partent.length > 1 ? "partent" : "part"}`
              : `Garder ${gardes.length > 1 ? "ces élèves" : "cet élève"} pour ${fin.suivante}`}
        </button>
      </>}>
      <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.55 }}>
        L'année est finie : les élèves de {fin.annee} vont être supprimés de Maitrize pour laisser place à la classe
        de {fin.suivante}. Leurs dossiers parlent de santé, de handicap, de familles : ils n'ont pas à rester une fois
        les élèves partis.
      </p>

      <div className="card" style={{ margin: "0 0 14px", padding: "12px 14px" }}>
        <p style={{ marginTop: 0, fontSize: 13, lineHeight: 1.5 }}>
          <b>Avant, exportez leurs données</b> : un dossier par élève, lisible sans Maitrize — à remettre à l'équipe
          qui l'accueille, ou à archiver selon les consignes de votre établissement.
        </p>
        <button className="btn" onClick={() => { void exporter(); }} disabled={!!occupe}>
          {occupe === "export" ? "Export en cours…" : "📦 Exporter les données des élèves…"}
        </button>
        {bilan && (
          <div style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 10 }}>
            <p style={{ margin: 0 }}>
              ✅ {pluriel(bilan.eleves, "dossier")} dans « {bilan.racine} » : pour chaque élève, son dossier à lire et à
              imprimer (dossier.html), toutes ses données (donnees.json), sa photo et ses papiers.
            </p>
            {bilan.synchronise && (
              <p style={{ margin: "6px 0 0", color: "var(--danger, #ef4444)" }}>
                ⚠️ Ce dossier est synchronisé par {bilan.synchronise} : les dossiers des élèves y partent.
              </p>
            )}
            <p style={{ margin: "6px 0 0", color: "var(--text-2)" }}>
              Ces dossiers contiennent des données personnelles d'élèves : rangez-les en lieu sûr, et ne les gardez
              que le temps que demande votre établissement.
            </p>
          </div>
        )}
      </div>

      <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 8px" }}>
        Cochez ceux qui <b>restent avec vous</b> en {fin.suivante} — en IME ou en ULIS, c'est souvent le cas : leur
        dossier est gardé.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "4px 14px",
        maxHeight: 260, overflow: "auto", padding: "2px 0" }}>
        {eleves.map((e) => (
          <label key={e.id} className="pb-coche" style={{ margin: 0 }}>
            <input type="checkbox" checked={restent.has(e.id)} onChange={() => basculer(e.id)} />
            <span>{e.nom}{e.niveau ? <span style={{ color: "var(--text-2)" }}> · {e.niveau}</span> : null}</span>
          </label>
        ))}
      </div>
      {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13, marginBottom: 0 }}>❌ {erreur}</p>}
    </Modal>
  );
}
