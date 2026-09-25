import React from "react";
import { api, Texte, newId, nowIso, texteErreur } from "../api";
import { Empty, Field, Input, Modal, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { EditeurRiche } from "../components/EditeurRiche";
import { useTexteAutosave, LIBELLE_ENREGISTREMENT } from "../components/useTexteAutosave";
import { printHTML } from "../print";
import { nettoyerHtml } from "../texteRiche";
import { avecImages } from "../components/imagesTexte";
import {
  assembler, basculer, choixParDefaut, consigneIA, demandeIA, DOSSIER_GARDE, groupesDe,
  htmlDeLaReponse, modeleLocal, optionsDe, SORTES, type InfosGarde, type SorteGarde,
} from "../pagesDeGarde";

// ── Organisation → Pages de garde ─────────────────────────────────────────
//
// La première page d'un cahier, le mot qui l'accompagne et la liste des
// fournitures : trois documents de rentrée que l'application prépare avec ce
// qu'elle sait (établissement, enseignant, année), et que l'IA rédige si on
// le lui demande. Chacun est un texte mis en forme, enregistré tout seul,
// rangé hors du plan de travail.

/** Les réglages qui remplissent l'en-tête et la signature. */
async function infosParDefaut(annee: string, sorte: SorteGarde): Promise<InfosGarde> {
  const r = await api.settingsAll().catch(() => ({} as Record<string, string>));
  const ime = r.typeStructure === "ime" || r["edt:mode"] === "ime";
  return {
    sorte, titre: SORTES.find((s) => s.id === sorte)!.titre, annee,
    ecole: r.ecole ?? "", enseignant: r.enseignantNom ?? "", fonction: r.enseignantFonction ?? "",
    telephone: r["etab:telephone"] ?? "", niveau: r.niveauClasse ?? "",
    ime, choix: choixParDefaut(sorte, ime), precisions: "",
  };
}

export function PagesDeGardeTab({ annee }: { annee: string }) {
  const { data: textes, reload } = useAsync(() => api.textesList(), []);
  const pages = React.useMemo(() => (textes ?? []).filter((t) => t.dossier === DOSSIER_GARDE)
    .sort((a, b) => (b.dateModification || b.dateCreation).localeCompare(a.dateModification || a.dateCreation)), [textes]);
  const [choisie, setChoisie] = React.useState("");
  const page = pages.find((p) => p.id === choisie) ?? null;
  const [nouvelle, setNouvelle] = React.useState<InfosGarde | null>(null);

  React.useEffect(() => { if (!choisie && pages[0]) setChoisie(pages[0].id); }, [pages, choisie]);

  const ouvrirNouvelle = async (sorte: SorteGarde) => {
    setNouvelle(await infosParDefaut(annee, sorte));
  };

  /** Crée le document : le modèle tout de suite, le texte de l'IA si elle répond. */
  const creer = async (i: InfosGarde, avecIA: boolean) => {
    let contenu = modeleLocal(i);
    if (avecIA) {
      try {
        const modele = await api.modeleActif();
        const reponse = await api.mistralChat(
          [{ role: "system", content: consigneIA(i) }, { role: "user", content: demandeIA(i) }], modele);
        const corps = htmlDeLaReponse(reponse);
        if (corps) contenu = nettoyerHtml(assembler(i, corps));
        else toast("L'IA n'a rien renvoyé : voici le modèle, à compléter.", { icone: "⚠️", duree: 6000 });
      } catch (e) {
        toast(`L'IA n'a pas répondu (${texteErreur(e)}). Le modèle est créé : à vous de l'ajuster.`, { icone: "⚠️", duree: 9000 });
      }
    }
    const t: Texte = {
      id: newId(), titre: i.titre.trim() || SORTES.find((s) => s.id === i.sorte)!.titre, contenu,
      dossier: DOSSIER_GARDE, dateCreation: nowIso(), dateModification: nowIso(),
    };
    await api.texteSave(t);
    setNouvelle(null);
    reload();
    setChoisie(t.id);
    if (avecIA) toast("Relisez avant d'imprimer : ce document part aux familles.", { icone: "👀", duree: 7000 });
  };

  const dupliquer = async (p: Texte) => {
    const t: Texte = { ...p, id: newId(), titre: `${p.titre} (copie)`, dateCreation: nowIso(), dateModification: nowIso() };
    await api.texteSave(t);
    reload();
    setChoisie(t.id);
  };

  const supprimer = async (p: Texte) => {
    if (!(await confirmer(`Supprimer « ${p.titre} » ?`, { oui: "Supprimer", danger: true }))) return;
    await api.texteDelete(p.id);
    setChoisie("");
    reload();
  };

  return (
    <div className="informations">
      <aside className="informations-liste" aria-label="Pages de garde">
        <button className="btn primary" style={{ width: "100%" }} onClick={(e) => openCtx(e,
          SORTES.map((s) => ({ label: s.libelle, icon: s.icone, onClick: () => { void ouvrirNouvelle(s.id); } })))}>
          ＋ Nouveau document
        </button>
        {pages.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            La page de garde d'un cahier, le mot qui l'accompagne, la liste des fournitures :
            l'application pose l'établissement, votre nom et l'année, l'IA peut écrire le reste.
          </p>
        )}
        {pages.map((p) => (
          <button key={p.id} className={`informations-feuille${p.id === choisie ? " active" : ""}`} onClick={() => setChoisie(p.id)}
            onContextMenu={(e) => openCtx(e, [
              { label: "Dupliquer", icon: "📑", onClick: () => dupliquer(p) },
              { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(p) },
            ])}>
            <span className="informations-feuille-titre">📄 {p.titre || "Sans titre"}</span>
            <span className="informations-feuille-date">{new Date(p.dateModification || p.dateCreation).toLocaleDateString("fr-FR")}</span>
          </button>
        ))}
      </aside>
      <section style={{ minWidth: 0 }}>
        {page
          ? <EditeurPage key={page.id} page={page} onEnregistre={reload}
              onDupliquer={() => dupliquer(page)} onSupprimer={() => supprimer(page)} />
          : <Empty icone="📘" titre="Aucun document"
              sous="« Nouveau document » prépare une page de garde, un mot aux familles ou une liste de fournitures." />}
      </section>
      {nouvelle && (
        <NouveauDocument infos={nouvelle} onChange={setNouvelle} onClose={() => setNouvelle(null)} onCreer={creer} />
      )}
    </div>
  );
}

/**
 * Les cases à cocher : ce que le document doit contenir.
 *
 * Elles servent deux fois — elles composent le document écrit sans l'IA, et
 * elles forment la demande envoyée au modèle. On coche ce qu'on veut y lire
 * plutôt que de le décrire dans un champ libre, qui reste là pour le reste.
 */
function CasesDuDocument({ infos, onChange }: { infos: InfosGarde; onChange: (i: InfosGarde) => void }) {
  const groupes = groupesDe(infos.sorte, infos.ime);
  const toutes = optionsDe(infos.sorte, infos.ime);
  const coche = (choix: string[]) => onChange({ ...infos, choix });
  return (
    <Field label={`Ce que le document doit contenir — ${infos.choix.length} sur ${toutes.length}`}>
      <div className="garde-cases">
        {groupes.map((g) => (
          <div key={g.titre}>
            <div className="garde-groupe">{g.titre}</div>
            {g.options.map((o) => (
              <label key={o.id} className={`garde-case${infos.choix.includes(o.id) ? " cochee" : ""}`}>
                <input type="checkbox" checked={infos.choix.includes(o.id)}
                  onChange={() => coche(basculer(infos.choix, o.id))} />
                <span>{o.libelle}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <button className="btn ghost sm" onClick={() => coche(toutes.map((o) => o.id))}>Tout cocher</button>
        <button className="btn ghost sm" onClick={() => coche([])}>Tout décocher</button>
        <button className="btn ghost sm" onClick={() => coche(choixParDefaut(infos.sorte, infos.ime))}>Rétablir</button>
      </div>
    </Field>
  );
}

/** Ce qu'on demande avant d'écrire : la sorte, le nom du document, le contexte. */
function NouveauDocument({ infos, onChange, onClose, onCreer }: {
  infos: InfosGarde; onChange: (i: InfosGarde) => void; onClose: () => void;
  onCreer: (i: InfosGarde, avecIA: boolean) => Promise<void>;
}) {
  const [occupe, setOccupe] = React.useState<"" | "modele" | "ia">("");
  const sorte = SORTES.find((s) => s.id === infos.sorte)!;
  const lancer = async (avecIA: boolean) => {
    setOccupe(avecIA ? "ia" : "modele");
    try { await onCreer(infos, avecIA); } finally { setOccupe(""); }
  };
  return (
    <Modal titre={`${sorte.icone} Nouveau document`} onClose={onClose} large
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn" disabled={!!occupe} onClick={() => { void lancer(false); }}>
          {occupe === "modele" ? "Création…" : "Partir d'un modèle"}
        </button>
        <button className="btn primary" disabled={!!occupe} onClick={() => { void lancer(true); }}>
          {occupe === "ia" ? "L'IA rédige…" : "✨ Rédiger avec l'IA"}
        </button>
      </>}>
      <Field label="Sorte de document">
        <div className="seg" style={{ flexWrap: "wrap" }}>
          {SORTES.map((s) => (
            <button key={s.id} className={s.id === infos.sorte ? "active" : ""}
              onClick={() => onChange({
                ...infos, sorte: s.id, choix: choixParDefaut(s.id, infos.ime),
                titre: infos.titre === sorte.titre ? s.titre : infos.titre,
              })}>
              {s.icone} {s.libelle}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12.5, color: "var(--text-2)", marginTop: 4 }}>{sorte.aide}</div>
      </Field>
      <div className="row">
        <Field label="Nom du document">
          <Input value={infos.titre} onChange={(e) => onChange({ ...infos, titre: e.target.value })} />
        </Field>
        <Field label="Niveau (facultatif)">
          <Input value={infos.niveau} placeholder="ex. CE1, cycle 2" onChange={(e) => onChange({ ...infos, niveau: e.target.value })} />
        </Field>
      </div>
      <CasesDuDocument infos={infos} onChange={onChange} />
      <Field label="À ajouter, en vos mots (facultatif)">
        <Textarea value={infos.precisions} rows={2}
          placeholder="ex. élèves non lecteurs, beaucoup de manipulation ; la piscine commence en janvier…"
          onChange={(e) => onChange({ ...infos, precisions: e.target.value })} />
      </Field>
      <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
        L'en-tête et la signature viennent de vos réglages : {infos.ecole || "établissement à renseigner"}
        {infos.enseignant ? ` · ${infos.enseignant}` : ""}{infos.telephone ? ` · ${infos.telephone}` : ""}.
        L'IA n'écrit que le texte, et ne reçoit aucune information sur vos élèves.
      </div>
    </Modal>
  );
}

function EditeurPage({ page, onEnregistre, onDupliquer, onSupprimer }: {
  page: Texte; onEnregistre: () => void; onDupliquer: () => void; onSupprimer: () => void;
}) {
  const { titre, setTitre, contenu, setContenu, etat, sauver } = useTexteAutosave(page, onEnregistre);

  const imprimer = async () => {
    await sauver();
    printHTML(titre || "Document", await avecImages(nettoyerHtml(contenu)),
      "h1 { font-size: 26px; margin-bottom: 18px; } p { font-size: 14px; } li { margin: 3px 0; }");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} aria-label="Titre du document"
          style={{ flex: "1 1 260px", fontSize: 16, fontWeight: 700 }} />
        <span style={{ fontSize: 12, color: etat === "erreur" ? "var(--danger, #c0392b)" : "var(--text-2)" }}>{LIBELLE_ENREGISTREMENT[etat]}</span>
        <button className="btn" onClick={imprimer}>🖨 Imprimer</button>
        <button className="btn ghost" onClick={onDupliquer} title="Dupliquer">📑</button>
        <button className="btn ghost" onClick={onSupprimer} title="Supprimer" aria-label="Supprimer le document">🗑</button>
      </div>
      <EditeurRiche valeur={page.contenu} onChange={setContenu} minHauteur="58vh"
        placeholder="Écrivez le document…" />
      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
        Relisez avant d'imprimer : ce document part aux familles.
      </div>
    </div>
  );
}
