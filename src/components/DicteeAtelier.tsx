import React from "react";
import { api, Eleve, ChatMessage, MODELE_TACHES, newId, nowIso } from "../api";
import { Modal, Field, Input, Select, Textarea } from "./ui";
import { toast } from "./Toaster";
import { useDictee, mmss } from "../dictee";

// ── Dictée d'atelier ──────────────────────────────────────────────────────
//
// Après un atelier, l'enseignant raconte à voix haute ce que chacun a fait ;
// l'app transcrit, répartit les observations par élève, et les propose à la
// validation avant de les écrire dans les fiches.
//
// Rien n'est enregistré sans relecture : une observation portée au dossier
// d'un élève engage l'enseignant, et une attribution automatique se trompe de
// prénom tôt ou tard. L'écran propose, l'enseignant dispose.

const TYPES = ["divers", "comportement", "scolaire", "santé"];

/** Une observation proposée pour un élève, avant validation. */
interface Proposition {
  id: string;
  eleveId: string;
  texte: string;
  type: string;
  garder: boolean;
}

const prenom = (e: Eleve) => e.nom.split(" ")[0];

/**
 * Découpe la réponse du modèle en propositions.
 *
 * Le modèle répond en JSON, mais peut l'entourer de texte ou de balises de
 * code : on récupère le premier tableau bien formé plutôt que d'exiger une
 * réponse parfaite.
 */
export function lirePropositions(reponse: string, eleves: Eleve[]): Proposition[] {
  const debut = reponse.indexOf("[");
  const fin = reponse.lastIndexOf("]");
  if (debut < 0 || fin <= debut) return [];
  let brut: unknown;
  try { brut = JSON.parse(reponse.slice(debut, fin + 1)); } catch { return []; }
  if (!Array.isArray(brut)) return [];

  return brut.flatMap((ligne): Proposition[] => {
    if (!ligne || typeof ligne !== "object") return [];
    const o = ligne as Record<string, unknown>;
    const texte = typeof o.observation === "string" ? o.observation.trim() : "";
    const cible = typeof o.eleve === "string" ? o.eleve.trim().toLowerCase() : "";
    if (!texte || !cible) return [];
    // Le modèle renvoie un prénom : on retrouve l'élève, sinon on abandonne
    // la ligne plutôt que de l'attribuer au hasard.
    const eleve = eleves.find((e) => prenom(e).toLowerCase() === cible)
      ?? eleves.find((e) => e.nom.toLowerCase() === cible);
    if (!eleve) return [];
    const type = typeof o.type === "string" && TYPES.includes(o.type) ? o.type : "divers";
    return [{ id: newId(), eleveId: eleve.id, texte, type, garder: true }];
  });
}

/** Prompt de répartition : prénoms seuls, consignes strictes. */
export function promptRepartition(prenoms: string[], transcription: string): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "Tu aides un enseignant spécialisé à ranger ses observations d'atelier. " +
        "On te donne la liste des prénoms présents et la transcription de ce qu'il a dit. " +
        "Réponds UNIQUEMENT par un tableau JSON, sans texte autour, de la forme " +
        '[{"eleve":"Prénom","observation":"…","type":"divers|comportement|scolaire|santé"}]. ' +
        "Règles : n'invente rien, reformule sans ajouter d'interprétation, " +
        "n'attribue une observation qu'à un prénom de la liste, " +
        "ignore ce qui ne concerne aucun élève nommé, " +
        "et sépare en plusieurs entrées si plusieurs élèves sont cités.",
    },
    {
      role: "user",
      content: `Prénoms présents : ${prenoms.join(", ")}\n\nTranscription :\n${transcription}`,
    },
  ];
}

export function DicteeAtelier({ eleves, onClose, onEnregistre, texteInitial, titre }: {
  eleves: Eleve[];
  onClose: () => void;
  onEnregistre: () => void;
  /** Texte déjà écrit ailleurs (assistant) : on saute l'enregistrement. */
  texteInitial?: string;
  titre?: string;
}) {
  type Etape = "consentement" | "enregistrement" | "texte" | "relecture";
  const [etape, setEtape] = React.useState<Etape>(texteInitial ? "texte" : "consentement");
  const [occupe, setOccupe] = React.useState("");
  const [transcription, setTranscription] = React.useState(texteInitial ?? "");
  const [props, setProps] = React.useState<Proposition[]>([]);
  const [type, setType] = React.useState("divers");

  const dictee = useDictee();

  const demarrer = async () => {
    const erreur = await dictee.demarrer();
    if (erreur) { toast(erreur, { icone: "🎙" }); return; }
    setEtape("enregistrement");
  };

  const arreter = async () => {
    setOccupe("Transcription en cours…");
    const { texte, erreur } = await dictee.arreter();
    setOccupe("");
    if (erreur) toast("Transcription impossible : " + erreur, { icone: "⚠️" });
    else setTranscription(texte);
    setEtape("texte"); // le texte reste saisissable à la main
  };

  const repartir = async () => {
    if (!transcription.trim()) return;
    setOccupe("Répartition par élève…");
    try {
      // Le modèle par défaut du backend (« large ») n'est pas inclus dans tous
      // les abonnements Mistral : on reprend celui choisi dans les Réglages,
      // comme le fait l'assistant.
      const modele = (await api.settingGet("mistralModel")) || MODELE_TACHES;
      const reponse = await api.mistralChat(promptRepartition(eleves.map(prenom), transcription), modele);
      const p = lirePropositions(reponse, eleves);
      if (p.length === 0) {
        toast("Aucun élève reconnu dans le texte. Ajoutez les observations à la main.", { icone: "🤔" });
      }
      setProps(p);
      setEtape("relecture");
    } catch (e: any) {
      toast("Répartition impossible : " + String(e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  const enregistrer = async () => {
    const retenues = props.filter((p) => p.garder && p.texte.trim());
    if (!retenues.length) { toast("Rien à enregistrer.", { icone: "ℹ️" }); return; }
    setOccupe("Enregistrement…");
    try {
      for (const p of retenues) {
        await api.commentaireSave({ id: newId(), date: nowIso(), texte: p.texte.trim(), type: p.type, eleveId: p.eleveId });
      }
      toast(`${retenues.length} observation(s) ajoutée(s).`, { icone: "✅" });
      onEnregistre();
      onClose();
    } catch (e: any) {
      toast("Enregistrement impossible : " + String(e), { icone: "⚠️" });
    } finally { setOccupe(""); }
  };

  const maj = (id: string, patch: Partial<Proposition>) =>
    setProps((l) => l.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const fermer = () => { dictee.annuler(); onClose(); };
  const retenues = props.filter((p) => p.garder).length;

  return (
    <Modal titre={titre ?? "🎙 Dictée d'atelier"} onClose={fermer} footer={
      <>
        {etape === "texte" && (
          <button className="btn" onClick={() => {
            setTranscription("");
            if (!texteInitial) setEtape("consentement");
          }}>↺ Recommencer</button>
        )}
        {etape === "relecture" && (
          <button className="btn" onClick={() => setEtape("texte")}>← Revenir au texte</button>
        )}
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{occupe}</span>
        {etape === "texte" && (
          <button className="btn primary" disabled={!!occupe || !transcription.trim()} onClick={repartir}>
            Répartir par élève →
          </button>
        )}
        {etape === "relecture" && (
          <button className="btn primary" disabled={!!occupe || retenues === 0} onClick={enregistrer}>
            Enregistrer {retenues > 0 ? `(${retenues})` : ""}
          </button>
        )}
        <button className="btn" onClick={fermer}>Fermer</button>
      </>
    }>
      {etape === "consentement" && (
        <>
          <p style={{ marginTop: 0, fontSize: 13.5, lineHeight: 1.55 }}>
            Racontez ce que chaque élève a fait pendant l'atelier. L'application transcrit,
            range les observations par élève, et vous les soumet avant de les écrire.
          </p>
          <div className="card" style={{ background: "var(--panel-2)", fontSize: 13, lineHeight: 1.55 }}>
            <b>Ce qui sort de votre ordinateur</b>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              <li>L'enregistrement part chez <b>Mistral</b> (serveurs en Europe) pour être transcrit.
                  S'il contient des prénoms d'élèves, ils sont transmis.</li>
              <li>Pour la répartition, seuls les <b>prénoms</b> sont envoyés — jamais les noms de
                  famille, dates de naissance, INE ni dossiers.</li>
              <li>L'audio n'est jamais enregistré sur le disque et n'est pas conservé après la
                  transcription.</li>
            </ul>
          </div>
          <p style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            Si cela ne convient pas à votre cadre, saisissez vos observations à la main dans
            l'onglet Observations : rien n'est alors transmis.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button className="btn primary" onClick={demarrer}>🎙 J'ai compris, démarrer</button>
            <button className="btn" onClick={() => setEtape("texte")}>Écrire au lieu de dicter</button>
          </div>
        </>
      )}

      {etape === "enregistrement" && (
        <div style={{ textAlign: "center", padding: "18px 0" }}>
          <div style={{ fontSize: 44 }}>🔴</div>
          <div style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mmss(dictee.secondes)}</div>
          <p style={{ color: "var(--text-2)", fontSize: 13 }}>
            Enregistrement en cours. Nommez chaque élève par son prénom.
          </p>
          <button className="btn primary" onClick={arreter} disabled={!!occupe}>⏹ Terminer et transcrire</button>
        </div>
      )}

      {etape === "texte" && (
        <>
          <Field label="Ce qui a été dit (modifiable)">
            <Textarea rows={9} value={transcription} onChange={(e) => setTranscription(e.target.value)}
              placeholder="Ex. : Apolline a réussi le tri des couleurs seule. Ayyûb a eu besoin d'aide pour tenir les ciseaux…" />
          </Field>
          <p style={{ fontSize: 12.5, color: "var(--text-2)", margin: 0 }}>
            Relisez avant de répartir : la transcription se trompe parfois sur les prénoms.
          </p>
        </>
      )}

      {etape === "relecture" && (
        props.length === 0 ? (
          <p style={{ fontSize: 13.5 }}>
            Aucune observation n'a pu être attribuée. Revenez au texte pour le corriger,
            en citant clairement les prénoms.
          </p>
        ) : (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <Field label="Appliquer un type à toutes">
                <Select value={type} onChange={(e) => { setType(e.target.value); setProps((l) => l.map((p) => ({ ...p, type: e.target.value }))); }}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {props.map((p) => {
                const e = eleves.find((x) => x.id === p.eleveId);
                return (
                  <div key={p.id} className="card" style={{ padding: 10, opacity: p.garder ? 1 : 0.5 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <input type="checkbox" checked={p.garder} onChange={(ev) => maj(p.id, { garder: ev.target.checked })}
                        title="Retenir cette observation" />
                      <Select value={p.eleveId} onChange={(ev) => maj(p.id, { eleveId: ev.target.value })} style={{ maxWidth: 190 }}>
                        {eleves.map((x) => <option key={x.id} value={x.id}>{x.nom}</option>)}
                      </Select>
                      <Select value={p.type} onChange={(ev) => maj(p.id, { type: ev.target.value })} style={{ maxWidth: 150 }}>
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                      <div className="spacer" />
                      <span style={{ fontSize: 11, color: "var(--text-2)" }}>{e ? e.nom : "élève inconnu"}</span>
                    </div>
                    <Input value={p.texte} onChange={(ev) => maj(p.id, { texte: ev.target.value })} />
                  </div>
                );
              })}
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-2)", marginBottom: 0 }}>
              Corrigez ce qui doit l'être : ces phrases partiront telles quelles dans les fiches.
            </p>
          </>
        )
      )}
    </Modal>
  );
}
