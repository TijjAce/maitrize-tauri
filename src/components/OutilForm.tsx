import React from "react";
import {
  api, CATEGORIES_AFFICHAGE, CATEGORIES_OUTIL, PERIODES_AFFICHAGE, couleurHex, texteErreur,
  type DocumentOutil, type Eleve, type OutilClasse,
} from "../api";
import { Modal, Field, Input, Textarea, Select, ColorPicker } from "./ui";
import { FichierImg } from "./Deroulement";
import { VignetteUpload } from "./JeuForm";
import { ChoixCompetencesBo, EtiquettesBo } from "./ChoixCompetencesBo";
import { toast } from "./Toaster";
import { fichierEnBase64 } from "../dragdrop";
import { openCtx } from "./ctxmenu";

// ── Outils pour l'élève et affichages ──────────────────────────────────────
//
// Deux inventaires de la classe, sur une même fiche : les outils dont les
// élèves se servent (bande numérique, sous-main, casque anti-bruit…) — à quoi
// ils servent, où ils sont rangés, qui s'en sert ; et les affichages
// (référentiels, règles de vie, emploi du temps visuel…) — où ils sont, quand
// ils sont au mur, et le fichier pour les réimprimer.

const liste = <T,>(json: string): T[] => {
  try { const v = JSON.parse(json || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
};
export const elevesDe = (o: OutilClasse) => liste<string>(o.elevesJson);
export const documentsDe = (o: OutilClasse) =>
  liste<DocumentOutil>(o.documentsJson).filter((d) => d && typeof d.fichier === "string" && d.fichier);
const prenom = (e: Eleve) => e.nom.trim().split(/\s+/)[0] ?? e.nom;

/** Les libellés qui changent d'un genre à l'autre. */
const MOTS = {
  outil: {
    nouveau: "Nouvel outil", modifier: "Modifier l'outil", titre: "Nom de l'outil", lieu: "Rangement",
    lieuExemple: "ex. Bac bleu du coin maths", usage: "À quoi il sert",
    usageExemple: "Se repérer dans la suite des nombres, compter en avançant…",
    consignes: "Comment s'en servir", consignesExemple: "Le poser à gauche du cahier ; l'élève montre du doigt…",
    documents: "Documents à imprimer",
  },
  affichage: {
    nouveau: "Nouvel affichage", modifier: "Modifier l'affichage", titre: "Titre de l'affichage", lieu: "Où il est affiché",
    lieuExemple: "ex. Au-dessus du tableau", usage: "Ce qu'il apporte aux élèves",
    usageExemple: "Retrouver les sons étudiés, se rappeler les étapes d'une technique…",
    consignes: "À savoir", consignesExemple: "À compléter à chaque nouveau son ; à montrer pendant la dictée…",
    documents: "Fichier pour le réimprimer",
  },
} as const;

export function OutilForm({ o, onClose, onSaved }: { o: OutilClasse; onClose: () => void; onSaved: (o: OutilClasse) => void }) {
  const [v, setV] = React.useState<OutilClasse>(o);
  const up = (p: Partial<OutilClasse>) => setV((x) => ({ ...x, ...p }));
  const mots = MOTS[v.genre];
  const outil = v.genre === "outil";
  const categories: readonly string[] = outil ? CATEGORIES_OUTIL : CATEGORIES_AFFICHAGE;
  const [eleves, setEleves] = React.useState<Eleve[]>([]);
  React.useEffect(() => { if (outil) api.elevesList().then(setEleves).catch(() => {}); }, [outil]);

  const choisis = elevesDe(v);
  const basculerEleve = (id: string) => setV((x) => {
    const actuels = elevesDe(x);
    return { ...x, elevesJson: JSON.stringify(actuels.includes(id) ? actuels.filter((y) => y !== id) : [...actuels, id]) };
  });

  const documents = documentsDe(v);
  const choixDocuments = React.useRef<HTMLInputElement>(null);
  const [ajout, setAjout] = React.useState(false);
  const ajouterDocuments = async (fichiers: File[]) => {
    setAjout(true);
    try {
      const nouveaux: DocumentOutil[] = [];
      for (const f of fichiers) nouveaux.push({ nom: f.name, fichier: await api.fichierSave(f.name, await fichierEnBase64(f)) });
      setV((x) => ({ ...x, documentsJson: JSON.stringify([...documentsDe(x), ...nouveaux]) }));
    } catch (e) {
      toast("Document non ajouté : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
    } finally {
      setAjout(false);
    }
  };

  const [enregistrement, setEnregistrement] = React.useState(false);
  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      onSaved(await api.outilClasseSave(v));
    } catch (e) {
      toast("Fiche non enregistrée : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
      setEnregistrement(false);
    }
  };

  return (
    <Modal titre={o.titre ? mots.modifier : mots.nouveau} onClose={onClose} large
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim() || enregistrement || ajout} onClick={enregistrer}>Enregistrer</button></>}>
      <Field label={mots.titre}><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Catégorie">
          <Select value={v.categorie} onChange={(e) => up({ categorie: e.target.value })}>
            {(categories.includes(v.categorie) || !v.categorie ? categories : [v.categorie, ...categories]).map((c) => <option key={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label={mots.lieu}><Input value={v.lieu} placeholder={mots.lieuExemple} onChange={(e) => up({ lieu: e.target.value })} /></Field>
        {!outil && (
          <Field label="Quand">
            <Select value={v.periode} onChange={(e) => up({ periode: e.target.value })}>
              {PERIODES_AFFICHAGE.map((p) => <option key={p}>{p}</option>)}
            </Select>
          </Field>
        )}
      </div>
      <Field label={mots.usage}>
        <Textarea value={v.usage} placeholder={mots.usageExemple} onChange={(e) => up({ usage: e.target.value })} />
        <ChoixCompetencesBo valeur={v.competencesBo} onChange={(competencesBo) => up({ competencesBo })} />
      </Field>
      <Field label={mots.consignes}>
        <Textarea value={v.consignes} placeholder={mots.consignesExemple} rows={Math.min(10, Math.max(3, v.consignes.split("\n").length + 1))}
          onChange={(e) => up({ consignes: e.target.value })} />
      </Field>
      {outil && (
        <Field label={`Élèves qui s'en servent${choisis.length ? ` (${choisis.length})` : ""}`}>
          {eleves.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--text-2)" }}>Les élèves de la classe apparaîtront ici.</div>
          ) : (
            <div className="outil-eleves">
              {eleves.map((e) => (
                <label key={e.id} className="outil-eleve">
                  <input type="checkbox" checked={choisis.includes(e.id)} onChange={() => basculerEleve(e.id)} />
                  {e.nom}
                </label>
              ))}
            </div>
          )}
        </Field>
      )}
      <Field label={mots.documents}>
        {documents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 6 }}>
            {documents.map((d, i) => (
              <div key={`${d.fichier}-${i}`} className="outil-document">
                <span aria-hidden>📄</span>
                <button type="button" className="lien" onClick={() => api.fichierOuvrir(d.fichier).catch((e) => toast(texteErreur(e), { icone: "⚠️" }))}
                  title="Ouvrir le document">{d.nom}</button>
                <button type="button" className="btn ghost sm" aria-label={`Retirer ${d.nom}`}
                  onClick={() => setV((x) => ({ ...x, documentsJson: JSON.stringify(documentsDe(x).filter((_, j) => j !== i)) }))}>✕</button>
              </div>
            ))}
          </div>
        )}
        <input ref={choixDocuments} type="file" multiple hidden
          onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) void ajouterDocuments(f); }} />
        <button type="button" className="btn sm" disabled={ajout} onClick={() => choixDocuments.current?.click()}>
          {ajout ? "Ajout…" : "📎 Ajouter un document"}
        </button>
      </Field>
      <div className="field">
        <label>Photo</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {v.imageNom
            ? <FichierImg nom={v.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>
                {outil ? "🧰" : "🖼"}
              </div>}
          <VignetteUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {v.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>
      <div className="row">
        <Field label="Dossier (optionnel)"><Input value={v.dossier} placeholder={outil ? "ex. Mathématiques" : "ex. Français"} onChange={(e) => up({ dossier: e.target.value })} /></Field>
        <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
      </div>
    </Modal>
  );
}

/** La carte d'un outil ou d'un affichage, dans son onglet. */
export function CarteOutil({ o, eleves, onOuvrir, onDupliquer, onSupprimer }: {
  o: OutilClasse; eleves: Eleve[];
  onOuvrir: () => void; onDupliquer: () => void; onSupprimer: () => void;
}) {
  const outil = o.genre === "outil";
  const qui = elevesDe(o).map((id) => eleves.find((e) => e.id === id)).filter((e): e is Eleve => !!e).map(prenom);
  const documents = documentsDe(o);
  return (
    <div className="card" style={{ borderTop: `3px solid ${couleurHex[o.couleur] ?? couleurHex.teal}`, cursor: "pointer" }}
      onClick={onOuvrir}
      onContextMenu={(ev) => openCtx(ev, [
        { label: "Ouvrir", icon: "📂", onClick: onOuvrir },
        { label: "Dupliquer", icon: "📑", onClick: onDupliquer },
        { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: onSupprimer },
      ])}>
      {o.imageNom && <FichierImg nom={o.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
      <div style={{ display: "flex", alignItems: "start" }}>
        <div style={{ fontWeight: 700, flex: 1 }}>{o.titre}</div>
        <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); onOuvrir(); }} aria-label="Modifier">✏️</button>
        <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); onSupprimer(); }} aria-label="Supprimer">🗑</button>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
        {o.categorie && <span className="chip">{o.categorie}</span>}
        {o.lieu && <span className="chip">{outil ? "📦" : "📍"} {o.lieu}</span>}
        {!outil && o.periode && <span className="chip">🗓 {o.periode}</span>}
        {qui.length > 0 && <span className="chip" title={qui.join(", ")}>👥 {qui.length > 3 ? `${qui.slice(0, 3).join(", ")} +${qui.length - 3}` : qui.join(", ")}</span>}
        {documents.length > 0 && <span className="chip">📄 {documents.length}</span>}
        {o.dossier && <span className="chip">📁 {o.dossier}</span>}
      </div>
      {o.usage && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>🎯 {o.usage.slice(0, 90)}</div>}
      <EtiquettesBo valeur={o.competencesBo} />
    </div>
  );
}
