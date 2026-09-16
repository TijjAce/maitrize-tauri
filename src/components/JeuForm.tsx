import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { api, Jeu, SourceWeb, TYPES_JEU, texteErreur } from "../api";
import { Modal, Field, Input, Textarea, Select, ColorPicker } from "./ui";
import { FichierImg } from "./Deroulement";
import { fileToBase64 } from "./SeanceParts";
import { toast } from "./Toaster";
import { questionRegle, texteSimple } from "../jeuxCites";
import { CompetenceTree, labelCourt, type CompetenceSelectionnee } from "./CompetenceTree";

/** Les compétences du BO d'un jeu. */
export function competencesBoDu(jeu: Pick<Jeu, "competencesBo">): CompetenceSelectionnee[] {
  try {
    const v = JSON.parse(jeu.competencesBo || "[]");
    return Array.isArray(v) ? v.filter((c) => c && typeof c.competenceTitre === "string") : [];
  } catch {
    return [];
  }
}

const memeCompetence = (a: CompetenceSelectionnee, b: CompetenceSelectionnee) =>
  a.referentielNom === b.referentielNom && a.sousDomaineTitre === b.sousDomaineTitre
  && (a.competenceRefId ?? a.competenceTitre) === (b.competenceRefId ?? b.competenceTitre);

/** Un jeu de la ludothèque, à créer ou à modifier — depuis la ludothèque ou le cahier journal. */
export function JeuForm({ j, nouveau = !j.titre, onClose, onSaved }: {
  j: Jeu;
  /** Un jeu pas encore dans la ludothèque, même si son nom est déjà écrit. */
  nouveau?: boolean;
  onClose: () => void; onSaved: (jeu: Jeu) => void;
}) {
  const [v, setV] = React.useState<Jeu>(j);
  const up = (p: Partial<Jeu>) => setV((x) => ({ ...x, ...p }));

  // Les compétences du BO, cochées dans les programmes officiels.
  const bo = competencesBoDu(v);
  const [choixBo, setChoixBo] = React.useState(false);
  const [filtreBo, setFiltreBo] = React.useState("");
  const basculer = (c: CompetenceSelectionnee) => setV((x) => {
    const liste = competencesBoDu(x);
    const suite = liste.some((y) => memeCompetence(y, c)) ? liste.filter((y) => !memeCompetence(y, c)) : [...liste, c];
    return { ...x, competencesBo: JSON.stringify(suite) };
  });
  // Le maximum ne peut pas passer sous le minimum, et inversement : sinon le
  // jeu n'apparaît sous aucun effectif dans le filtre.
  const setMin = (n: number) => setV((x) => ({ ...x, nbJoueursMin: n, nbJoueursMax: Math.max(n, x.nbJoueursMax) }));
  const setMax = (n: number) => setV((x) => ({ ...x, nbJoueursMax: n, nbJoueursMin: Math.min(n, x.nbJoueursMin) }));

  // La règle cherchée en ligne : seul le nom du jeu part. Elle s'ajoute au
  // champ, à relire avant d'enregistrer.
  const [recherche, setRecherche] = React.useState(false);
  const [sources, setSources] = React.useState<SourceWeb[]>([]);
  const chercherRegle = async () => {
    setRecherche(true);
    try {
      const r = await api.mistralRechercheWeb(questionRegle(v.titre));
      const regle = texteSimple(r.texte);
      if (!regle) { toast(`Aucune règle trouvée pour « ${v.titre.trim()} ».`, { icone: "🔎" }); return; }
      setV((x) => ({ ...x, regles: x.regles.trim() ? `${x.regles.trim()}\n\n${regle}` : regle }));
      setSources(r.sources);
      toast("Règle ajoutée : relisez-la avant d'enregistrer.", { icone: "✨" });
    } catch (e) {
      toast("Recherche impossible : " + texteErreur(e), { icone: "⚠️", duree: 7000 });
    } finally {
      setRecherche(false);
    }
  };

  const [enregistrement, setEnregistrement] = React.useState(false);
  const enregistrer = async () => {
    setEnregistrement(true);
    try {
      onSaved(await api.jeuSave(v));
    } catch (e) {
      toast("Jeu non enregistré : " + texteErreur(e), { icone: "⚠️", duree: 6000 });
      setEnregistrement(false);
    }
  };

  return (
    <Modal titre={nouveau ? "Nouveau jeu" : "Modifier le jeu"} onClose={onClose} large
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim() || enregistrement} onClick={enregistrer}>Enregistrer</button></>}>
      <Field label="Nom du jeu"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Type"><Select value={v.typeJeu} onChange={(e) => up({ typeJeu: e.target.value })}>
          {TYPES_JEU.map((ty) => <option key={ty}>{ty}</option>)}</Select></Field>
        <Field label="Joueurs (min)"><Input type="number" min={1} value={v.nbJoueursMin} onChange={(e) => setMin(+e.target.value)} /></Field>
        <Field label="Joueurs (max)"><Input type="number" min={1} value={v.nbJoueursMax} onChange={(e) => setMax(+e.target.value)} /></Field>
      </div>
      <div className="row">
        <Field label="Durée (min)"><Input type="number" value={v.duree} onChange={(e) => up({ duree: +e.target.value })} /></Field>
        <Field label="Âge minimum"><Input type="number" value={v.ageMin} onChange={(e) => up({ ageMin: +e.target.value })} /></Field>
        <Field label="Rangement"><Input value={v.rangement} placeholder="ex. Armoire du fond, bac 3" onChange={(e) => up({ rangement: e.target.value })} /></Field>
      </div>
      <Field label="Ce que le jeu travaille">
        <Textarea value={v.competences} placeholder="Attendre son tour, dénombrer jusqu'à 10, langage oral…"
          onChange={(e) => up({ competences: e.target.value })} />
        {bo.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {bo.map((c) => (
              <span key={`${c.referentielNom}|${c.sousDomaineTitre}|${c.competenceRefId ?? c.competenceTitre}`} className="chip"
                title={[c.referentielNom, c.domaineTitre, c.sousDomaineTitre].filter(Boolean).join(" › ")}
                style={{ background: "var(--accent-soft)", color: "var(--accent)", maxWidth: "100%" }}>
                🎯 {labelCourt(c)}
                <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => basculer(c)}
                  aria-label={`Retirer « ${labelCourt(c)} »`}>✕</button>
              </span>
            ))}
          </div>
        )}
        <button type="button" className="btn sm" style={{ marginTop: 8 }} onClick={() => setChoixBo((x) => !x)} aria-expanded={choixBo}>
          {choixBo ? "Fermer les programmes" : `🎯 Choisir des compétences du BO${bo.length ? ` (${bo.length})` : ""}`}
        </button>
        {choixBo && (
          <div className="jeu-choix-bo">
            <input className="input" value={filtreBo} onChange={(e) => setFiltreBo(e.target.value)} autoFocus
              placeholder="Chercher une compétence (ex. : nombres jusqu'à 30, attendre son tour…)" aria-label="Chercher une compétence du BO" />
            <div className="jeu-choix-bo-liste">
              <CompetenceTree mode="multi" selection={bo} onToggle={basculer} recherche={filtreBo} />
            </div>
          </div>
        )}
      </Field>
      {/* Le champ Description a disparu ; un jeu qui en avait une la garde sous les yeux, pour la déplacer ou la vider. */}
      {j.descriptionJeu.trim() !== "" && (
        <Field label="Description (ancien champ)">
          <Textarea value={v.descriptionJeu} onChange={(e) => up({ descriptionJeu: e.target.value })} />
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 4 }}>
            Ce champ n'existe plus pour les nouveaux jeux : déplacez ce texte dans la règle ou dans « Ce que le jeu travaille », puis videz-le.
          </div>
        </Field>
      )}
      <Field label="Règle du jeu / variantes">
        <Textarea value={v.regles} rows={Math.min(12, Math.max(4, v.regles.split("\n").length + 1))}
          placeholder="Règle simplifiée, adaptations pour certains élèves… Elle s'affiche dans le cahier journal et le PDF du jour quand le jeu y est cité."
          onChange={(e) => up({ regles: e.target.value })} />
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <button className="btn sm" disabled={!v.titre.trim() || recherche} onClick={chercherRegle}
            title="Demande la règle à l'assistant, qui la cherche en ligne. Seul le nom du jeu est envoyé.">
            {recherche ? "Recherche en cours…" : "✨ Chercher la règle en ligne"}
          </button>
          {sources.length > 0 && (
            <span style={{ fontSize: 12, color: "var(--text-2)" }}>
              Sources :{" "}
              {sources.slice(0, 3).map((s, i) => (
                <React.Fragment key={s.url}>
                  {i > 0 && ", "}
                  <a href={s.url} onClick={(e) => { e.preventDefault(); openUrl(s.url).catch(() => window.open(s.url, "_blank")); }}>
                    {s.titre || s.url}
                  </a>
                </React.Fragment>
              ))}
            </span>
          )}
        </div>
      </Field>
      <div className="field">
        <label>Vignette (photo de la boîte)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {v.imageNom
            ? <FichierImg nom={v.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎲</div>}
          <VignetteUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {v.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>
      <div className="row">
        <Field label="Dossier (optionnel)"><Input value={v.dossier} placeholder="ex. Jeux de langage" onChange={(e) => up({ dossier: e.target.value })} /></Field>
        <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
      </div>
    </Modal>
  );
}

export function VignetteUpload({ onUploaded }: { onUploaded: (nom: string) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const up = async (file: File) => {
    setBusy(true);
    try { onUploaded(await api.fichierSave(file.name, await fileToBase64(file))); }
    finally { setBusy(false); }
  };
  return (
    <>
      <input ref={ref} type="file" accept="image/*" style={{ display: "none" }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) up(f); e.target.value = ""; }} />
      <button className="btn" style={{ flex: "none" }} disabled={busy} onClick={() => ref.current?.click()}>{busy ? "…" : "📷 Choisir une image"}</button>
    </>
  );
}
