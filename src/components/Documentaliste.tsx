import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { texteErreur } from "../api";
import { Modal, Input } from "./ui";
import { Markdown } from "./Markdown";
import { toast } from "./Toaster";
import {
  demanderAuxProgrammes, type ReponseDocumentaliste, type TrouvailleBO,
} from "../documentaliste";

// ── Demander aux programmes ───────────────────────────────────────────────
//
// On cherche rarement une compétence : on cherche ce que le programme attend
// sur un sujet, et par où commencer. Le documentaliste lit les référentiels
// installés, va voir les guides Éduscol, et rend une réponse où chaque
// citation porte son chemin — de quoi la recopier dans une séquence sans
// avoir à vérifier qu'elle existe.

const EXEMPLES = [
  "Que disent les programmes sur la numération en GS ?",
  "Ce qui est attendu en phonologie en maternelle",
  "Le repérage dans le temps au cycle 2",
  "Les gestes d'écriture : par où commencer ?",
];

/** Une compétence trouvée, avec son chemin — telle qu'on la recopie. */
function Trouvaille({ c }: { c: TrouvailleBO }) {
  const ligne = `${c.niveau ? `[${c.niveau}] ` : ""}${c.texte} — ${c.referentiel} › ${c.chemin}`;
  return (
    <div style={{ borderLeft: "3px solid var(--border)", paddingLeft: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 13 }}>
        {c.niveau && <span className="chip" style={{ marginRight: 6 }}>{c.niveau}</span>}
        {c.texte}
      </div>
      <div className="meta" style={{ fontSize: 11.5, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
          {c.referentiel} › {c.chemin}
        </span>
        <button className="btn ghost sm" title="Copier la compétence avec son chemin"
          onClick={() => { void navigator.clipboard.writeText(ligne); toast("Compétence copiée.", { icone: "📋" }); }}>
          📋
        </button>
      </div>
    </div>
  );
}

export function Documentaliste({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = React.useState("");
  const [avecWeb, setAvecWeb] = React.useState(true);
  const [occupe, setOccupe] = React.useState("");
  const [reponse, setReponse] = React.useState<ReponseDocumentaliste | null>(null);
  const [erreur, setErreur] = React.useState("");

  const chercher = async (q = question) => {
    if (!q.trim() || occupe) return;
    setQuestion(q);
    setErreur("");
    setReponse(null);
    // Le premier temps est local : il donne déjà la réponse si le web échoue.
    setOccupe(avecWeb ? "Lecture des référentiels, puis des guides…" : "Lecture des référentiels…");
    try {
      setReponse(await demanderAuxProgrammes(q, { web: avecWeb }));
    } catch (e) {
      setErreur(texteErreur(e));
    } finally { setOccupe(""); }
  };

  return (
    <Modal titre="🔎 Demander aux programmes" onClose={onClose} large
      footer={<>
        <span className="meta" style={{ fontSize: 12 }}>{occupe}</span>
        <div className="spacer" style={{ flex: 1 }} />
        <button className="btn" onClick={onClose}>Fermer</button>
      </>}>
      <form onSubmit={(e) => { e.preventDefault(); void chercher(); }}
        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Input autoFocus value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Que disent les programmes sur… ?" style={{ flex: 1, minWidth: 220 }} />
        <button className="btn primary" type="submit" disabled={!!occupe || !question.trim()}>
          {occupe ? "…" : "Chercher"}
        </button>
      </form>

      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, margin: "8px 0 0", color: "var(--text-2)" }}>
        <input type="checkbox" checked={avecWeb} onChange={(e) => setAvecWeb(e.target.checked)} />
        Aller aussi voir les guides Éduscol en ligne
      </label>

      {!reponse && !occupe && !erreur && (
        <div style={{ marginTop: 12 }}>
          <div className="meta" style={{ fontSize: 12, marginBottom: 6 }}>Par exemple :</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {EXEMPLES.map((x) => (
              <button key={x} className="btn ghost sm" onClick={() => { void chercher(x); }}>{x}</button>
            ))}
          </div>
          <p className="meta" style={{ fontSize: 12, marginTop: 12, lineHeight: 1.55 }}>
            Les référentiels installés sont lus en premier, et les compétences citées
            viennent de là — pas de la mémoire du modèle. Rien sur vos élèves n'est envoyé.
          </p>
        </div>
      )}

      {erreur && <p style={{ color: "var(--danger, #ef4444)", fontSize: 13 }}>{erreur}</p>}

      {reponse && (
        <div style={{ marginTop: 14 }}>
          {reponse.avertissement && (
            <p style={{ fontSize: 12.5, color: "var(--text-2)", background: "var(--panel-2)",
              padding: "8px 10px", borderRadius: 8 }}>⚠️ {reponse.avertissement}</p>
          )}
          <Markdown texte={reponse.texte} />

          {reponse.competences.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <b style={{ fontSize: 13.5 }}>Dans vos référentiels</b>
              <div className="meta" style={{ fontSize: 11.5, marginBottom: 8 }}>
                {reponse.competences.length} compétence(s), la plus proche d'abord.
              </div>
              {reponse.competences.map((c) => <Trouvaille key={c.id} c={c} />)}
            </div>
          )}

          {reponse.ressources.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <b style={{ fontSize: 13.5 }}>Guides et documents Éduscol</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {reponse.ressources.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} onClick={(e) => { e.preventDefault(); void openUrl(r.url); }}>{r.titre}</a>
                    <span className="meta" style={{ fontSize: 11.5 }}> — {r.categorie}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {reponse.sources.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <b style={{ fontSize: 13.5 }}>Sources trouvées en ligne</b>
              <ul style={{ margin: "6px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.6 }}>
                {reponse.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} onClick={(e) => { e.preventDefault(); void openUrl(s.url); }}>{s.titre || s.url}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!reponse.aCherche && !reponse.avertissement && avecWeb && (
            <p className="meta" style={{ fontSize: 12, marginTop: 10 }}>
              Le web n'a pas été interrogé pour cette question : la réponse vient
              de vos référentiels et des guides déjà connus de l'application.
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
