import React from "react";
import { api, DocumentCoffre, Eleve, newId, nowIso } from "../api";
import { isoJour } from "../dates";
import { CompetenceTree, CompetenceSelectionnee } from "./CompetenceTree";
import { LecteurPdfCitable } from "./LecteurPdfCitable";
import { toast } from "./Toaster";
import { CompetenceTravaillee, depuisReferentiel, depuisDocument } from "../competencesTravaillees";
import { PROGRAMMES_OFFICIELS, nomDansLeCoffre } from "../data/programmesOfficiels";

// Citer les compétences travaillées par un ou plusieurs élèves.
//
// Deux chemins vers le même texte officiel : les programmes intégrés (déjà
// découpés en compétences, on coche), ou un PDF du coffre-fort où l'on
// surligne le passage — typiquement le programme officiel qu'on y a enregistré.

const taille = (o: number) => (o >= 1e6 ? `${(o / 1e6).toFixed(1).replace(".", ",")} Mo` : `${Math.round(o / 1e3)} Ko`);

const enBase64 = (f: File) => new Promise<string>((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1] ?? "");
  r.onerror = ko;
  r.readAsDataURL(f);
});

/** Les programmes officiels, à enregistrer d'un clic dans le coffre-fort. */
export function ProgrammesPourLeCoffre({ docs, onAjoute, onOuvrir }: {
  docs: DocumentCoffre[];
  onAjoute: (d: DocumentCoffre) => void;
  onOuvrir?: (d: DocumentCoffre) => void;
}) {
  const [enCours, setEnCours] = React.useState<Record<string, "telechargement" | "echec">>({});
  const enregistrer = async (id: string) => {
    const p = PROGRAMMES_OFFICIELS.find((x) => x.id === id)!;
    setEnCours((s) => ({ ...s, [id]: "telechargement" }));
    try {
      const d = await api.coffreDownload(p.url, nomDansLeCoffre(p));
      setEnCours((s) => { const n = { ...s }; delete n[id]; return n; });
      onAjoute(d);
    } catch (e) {
      setEnCours((s) => ({ ...s, [id]: "echec" }));
      toast(`« ${p.discipline} » n’a pas pu être téléchargé : ${e}`, { icone: "⚠️", duree: 7000 });
    }
  };
  const cycles = [...new Set(PROGRAMMES_OFFICIELS.map((p) => p.cycle))];
  return (
    <div>
      {cycles.map((cycle) => (
        <div key={cycle}>
          <div className="programmes-coffre-cycle">{cycle}</div>
          {PROGRAMMES_OFFICIELS.filter((p) => p.cycle === cycle).map((p) => {
            const present = docs.find((d) => d.nom === nomDansLeCoffre(p));
            const etat = enCours[p.id];
            return (
              <div key={p.id} className="list-row">
                <span aria-hidden>📕</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="title">{p.discipline}</div>
                  <div className="meta">{p.reference} · {taille(p.octets)}</div>
                </div>
                {present
                  ? (onOuvrir
                      ? <button className="btn sm" onClick={() => onOuvrir(present)}>✓ Au coffre-fort · Ouvrir</button>
                      : <span className="chip">✓ Au coffre-fort</span>)
                  : <button className="btn sm" disabled={etat === "telechargement"} onClick={() => enregistrer(p.id)}>
                      {etat === "telechargement" ? "⏳ Enregistrement…" : etat === "echec" ? "↻ Réessayer" : "⬇️ Enregistrer au coffre-fort"}
                    </button>}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function CiterCompetences({ eleves, eleveId, ongletInitial = "programmes", onClose, onValider }: {
  eleves: Eleve[];
  eleveId: string;
  ongletInitial?: "programmes" | "coffre";
  onClose: () => void;
  onValider: (competences: CompetenceTravaillee[], eleveIds: string[]) => Promise<void>;
}) {
  const [onglet, setOnglet] = React.useState(ongletInitial);
  const [recherche, setRecherche] = React.useState("");
  const [choisies, setChoisies] = React.useState<CompetenceSelectionnee[]>([]);
  const [citations, setCitations] = React.useState<CompetenceTravaillee[]>([]);
  const [docs, setDocs] = React.useState<DocumentCoffre[] | null>(null);
  const [docId, setDocId] = React.useState("");
  const [voirProgrammes, setVoirProgrammes] = React.useState(false);
  const [pour, setPour] = React.useState<string[]>([eleveId]);
  const [envoi, setEnvoi] = React.useState(false);
  const importRef = React.useRef<HTMLInputElement>(null);

  const chargerDocs = React.useCallback(() => api.coffreList().then(setDocs).catch(() => setDocs([])), []);
  React.useEffect(() => { chargerDocs(); }, [chargerDocs]);
  const doc = docs?.find((d) => d.id === docId) ?? null;

  const basculer = (c: CompetenceSelectionnee) => setChoisies((l) => {
    const i = l.findIndex((x) => x.competenceRefId === c.competenceRefId && x.referentielNom === c.referentielNom
      && x.sousDomaineTitre === c.sousDomaineTitre);
    return i >= 0 ? l.filter((_, j) => j !== i) : [...l, c];
  });

  const importer = async (f: File) => {
    try {
      const nomFichier = await api.fichierSave(f.name, await enBase64(f));
      const d = await api.coffreSave({ id: newId(), nom: f.name.replace(/\.pdf$/i, ""), nomFichier, tailleOctets: f.size, dateAjout: nowIso() });
      await chargerDocs();
      setDocId(d.id);
      setVoirProgrammes(false);
    } catch (e) {
      toast(`Import impossible : ${e}`, { icone: "⚠️" });
    }
  };

  const total = choisies.length + citations.length;
  const valider = async () => {
    const jour = isoJour(new Date());
    setEnvoi(true);
    try {
      await onValider([...choisies.map((c) => depuisReferentiel(c, jour)), ...citations], pour);
    } finally {
      setEnvoi(false);
    }
  };

  const listeProgrammes = !doc || voirProgrammes;

  return (
    <div className="overlay" style={{ zIndex: 150 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }}>
      <div className="modal citer-competences" role="dialog" aria-modal="true" aria-label="Citer des compétences travaillées">
        <div className="modal-head">
          <h2>❝ Citer des compétences travaillées</h2>
          <div className="spacer" />
          <button className="btn ghost sm" onClick={onClose} aria-label="Fermer">✕</button>
        </div>

        <div className="citer-competences-corps">
          <div className="citer-competences-principal">
            <div className="seg" style={{ alignSelf: "flex-start" }}>
              <button className={onglet === "programmes" ? "active" : ""} onClick={() => setOnglet("programmes")}>📚 Programmes officiels</button>
              <button className={onglet === "coffre" ? "active" : ""} onClick={() => setOnglet("coffre")}>🗄️ PDF du coffre-fort</button>
            </div>

            {onglet === "programmes" ? (
              <>
                <input className="input" value={recherche} onChange={(e) => setRecherche(e.target.value)} autoFocus
                  placeholder="Chercher une compétence (ex. : CP lire syllabes, nombres jusqu’à 10…)" aria-label="Chercher une compétence" />
                <div className="citer-competences-defile">
                  <CompetenceTree mode="multi" selection={choisies} onToggle={basculer} recherche={recherche} />
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <select className="select" value={docId} onChange={(e) => { setDocId(e.target.value); setVoirProgrammes(false); }}
                    style={{ flex: "1 1 240px", minWidth: 0 }} aria-label="Document du coffre-fort">
                    <option value="">— Choisir un document du coffre-fort —</option>
                    {(docs ?? []).map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                  <input ref={importRef} type="file" accept="application/pdf" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
                  <button className="btn sm" onClick={() => importRef.current?.click()}>＋ Importer un PDF</button>
                  {doc && <button className="btn sm" onClick={() => setVoirProgrammes((v) => !v)}>
                    {voirProgrammes ? "📄 Revenir au document" : "📥 Programmes officiels"}</button>}
                </div>
                {listeProgrammes ? (
                  <div className="citer-competences-defile">
                    <p style={{ fontSize: 13, color: "var(--text-2)", margin: "4px 0 6px" }}>
                      Enregistrez un programme officiel dans le coffre-fort, puis ouvrez-le pour surligner les compétences à citer.
                    </p>
                    <ProgrammesPourLeCoffre docs={docs ?? []} onAjoute={(d) => { chargerDocs(); setDocId(d.id); setVoirProgrammes(false); }}
                      onOuvrir={(d) => { setDocId(d.id); setVoirProgrammes(false); }} />
                  </div>
                ) : (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <LecteurPdfCitable nomFichier={doc!.nomFichier}
                      onCiter={(texte, page) => setCitations((l) => [...l, depuisDocument(texte, doc!, page || "", isoJour(new Date()))])} />
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="citer-competences-panier" aria-label="Compétences à citer">
            <div style={{ fontWeight: 700 }}>À citer ({total})</div>
            {total === 0 && (
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
                Cochez des compétences des programmes, ou surlignez un passage d’un PDF puis « Citer la sélection ».
              </p>
            )}
            {choisies.map((c) => (
              <div key={`${c.referentielNom}|${c.sousDomaineTitre}|${c.competenceRefId}`} className="panier-item">
                <div>{c.niveau && <span className="badge" style={{ marginRight: 6 }}>{c.niveau}</span>}{c.competenceTitre}</div>
                <div className="meta">{c.referentielNom}</div>
                <button className="btn ghost sm panier-retirer" onClick={() => basculer(c)} aria-label="Retirer">✕</button>
              </div>
            ))}
            {citations.map((c) => (
              <div key={c.id} className="panier-item">
                <textarea className="textarea" value={c.texte} rows={3} aria-label="Passage cité"
                  onChange={(e) => setCitations((l) => l.map((x) => (x.id === c.id ? { ...x, texte: e.target.value } : x)))}
                  style={{ minHeight: 0, fontSize: 13 }} />
                <div className="meta">{c.source}{c.page ? `, p. ${c.page}` : ""}</div>
                <button className="btn ghost sm panier-retirer" onClick={() => setCitations((l) => l.filter((x) => x.id !== c.id))} aria-label="Retirer">✕</button>
              </div>
            ))}
          </aside>
        </div>

        <div className="modal-foot" style={{ flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Pour :</span>
          <div className="citer-pour">
            {eleves.map((e) => (
              <label key={e.id} className="chip" style={{ cursor: "pointer", background: pour.includes(e.id) ? "var(--accent-soft)" : undefined }}>
                <input type="checkbox" checked={pour.includes(e.id)} style={{ marginRight: 4 }}
                  onChange={() => setPour((p) => (p.includes(e.id) ? p.filter((x) => x !== e.id) : [...p, e.id]))} />
                {e.nom}
              </label>
            ))}
          </div>
          <div className="spacer" />
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn primary" disabled={total === 0 || pour.length === 0 || envoi} onClick={valider}>
            ❝ Citer{total ? ` (${total})` : ""}{pour.length > 1 ? ` pour ${pour.length} élèves` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
