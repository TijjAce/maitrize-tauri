import React from "react";
import { api, Texte, newId, nowIso, TYPE_AXE } from "../api";
import { Empty, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { EditeurRiche, EditeurRicheHandle } from "../components/EditeurRiche";
import { useTexteAutosave, LIBELLE_ENREGISTREMENT } from "../components/useTexteAutosave";
import { printHTML } from "../print";
import { nettoyerHtml } from "../texteRiche";
import { avecImages } from "../components/imagesTexte";
import { documentRempli } from "../dossier";
import { organisationPour } from "../organisation";
import { BLOCS_REMPLACANT, DOSSIER_INFORMATIONS, feuilleRemplacant, type DonneesClasse } from "../remplacant";

// ── Organisation → Informations ────────────────────────────────────────────
// Des feuilles à imprimer pour la personne qui remplace : l'application y
// reprend ce qu'elle sait (classe, emploi du temps, élèves et dispositifs,
// ateliers) et l'enseignant complète le reste. Chaque feuille est un texte
// mis en forme, enregistré tout seul, rangé hors du plan de travail.

const NOMS_DISPOSITIFS: Record<string, string> = {
  "dispositif:pps": "PPS", "dispositif:pap": "PAP", "dispositif:pai": "PAI", "dispositif:ppre": "PPRE", ppi: "PPI",
};

/** Ce que l'application sait de la classe, pour les blocs de la feuille. */
async function lireDonneesClasse(annee: string): Promise<DonneesClasse> {
  const [reglages, eleves, documents, observations, edts, ateliers, espaces] = await Promise.all([
    api.settingsAll(), api.elevesList(), api.documentsEleveList(), api.commentairesList(),
    api.edtTypiqueList(), api.ateliersList().catch(() => []), api.espacesList().catch(() => []),
  ]);
  const ime = reglages.typeStructure === "ime" || reglages["edt:mode"] === "ime";
  const trouve = organisationPour(edts, new Date(), ime);
  let edt: DonneesClasse["edt"] = [];
  try { edt = trouve ? JSON.parse(trouve.edt.slotsJson) : []; } catch { /* organisation illisible */ }
  return {
    ecole: reglages.ecole ?? "", enseignant: reglages.enseignantNom ?? "", niveau: reglages.niveauClasse ?? "", ime, annee,
    eleves: eleves.map((e) => {
      const axes = observations.filter((o) => o.eleveId === e.id && o.type === TYPE_AXE).sort((a, b) => b.date.localeCompare(a.date));
      const axe = axes[0]?.texte.trim() ?? "";
      return {
        id: e.id, nom: e.nom, niveau: e.niveau,
        dispositifs: documents.filter((d) => d.eleveId === e.id && NOMS_DISPOSITIFS[d.typeDoc] && documentRempli(d.donnees))
          .map((d) => NOMS_DISPOSITIFS[d.typeDoc]),
        axe: axe.length > 160 ? `${axe.slice(0, 157).trimEnd()}…` : axe,
      };
    }),
    edt, sourceEdt: trouve?.source ?? null,
    ateliers: ateliers.map((a) => ({ titre: a.titre, matiere: a.matiere })),
    espaces: espaces.map((e) => ({ titre: e.titre, description: e.descriptionEspace })),
  };
}

const aujourdhuiFr = () => new Date().toLocaleDateString("fr-FR");

export function InformationsTab({ annee }: { annee: string }) {
  const { data: textes, reload } = useAsync(() => api.textesList(), []);
  const feuilles = React.useMemo(() => (textes ?? []).filter((t) => t.dossier === DOSSIER_INFORMATIONS)
    .sort((a, b) => (b.dateModification || b.dateCreation).localeCompare(a.dateModification || a.dateCreation)), [textes]);
  const [choisie, setChoisie] = React.useState<string>("");
  const feuille = feuilles.find((f) => f.id === choisie) ?? null;

  React.useEffect(() => { if (!choisie && feuilles[0]) setChoisie(feuilles[0].id); }, [feuilles, choisie]);

  const creer = async (preRemplie: boolean) => {
    try {
      const contenu = preRemplie ? feuilleRemplacant(await lireDonneesClasse(annee), aujourdhuiFr()) : "";
      const t: Texte = {
        id: newId(), titre: preRemplie ? "Informations pour le remplaçant" : "Nouvelle feuille", contenu,
        dossier: DOSSIER_INFORMATIONS, dateCreation: nowIso(), dateModification: nowIso(),
      };
      await api.texteSave(t);
      reload();
      setChoisie(t.id);
      if (preRemplie) toast("Feuille pré-remplie avec la classe, l'emploi du temps et les élèves : complétez les « … ».", { icone: "📋", duree: 6000 });
    } catch (e) {
      toast(`Création impossible : ${e}`, { icone: "⚠️" });
    }
  };

  const dupliquer = async (f: Texte) => {
    const t: Texte = { ...f, id: newId(), titre: `${f.titre} (copie)`, dateCreation: nowIso(), dateModification: nowIso() };
    await api.texteSave(t);
    reload();
    setChoisie(t.id);
  };

  const supprimer = async (f: Texte) => {
    if (!(await confirmer(`Supprimer la feuille « ${f.titre} » ?`, { oui: "Supprimer", danger: true }))) return;
    await api.texteDelete(f.id);
    setChoisie("");
    reload();
  };

  return (
    <div className="informations">
      <aside className="informations-liste" aria-label="Feuilles d'informations">
        <button className="btn primary" style={{ width: "100%" }} onClick={(e) => openCtx(e, [
          { label: "Feuille pour un remplaçant (pré-remplie)", icon: "📋", onClick: () => creer(true) },
          { label: "Feuille vierge", icon: "📄", onClick: () => creer(false) },
        ])}>＋ Nouvelle feuille</button>
        {feuilles.length === 0 && (
          <p style={{ fontSize: 13, color: "var(--text-2)" }}>
            Préparez ce qu'il faut savoir pour vous remplacer : la classe, l'emploi du temps, les élèves, la sécurité, les contacts.
          </p>
        )}
        {feuilles.map((f) => (
          <button key={f.id} className={`informations-feuille${f.id === choisie ? " active" : ""}`} onClick={() => setChoisie(f.id)}
            onContextMenu={(e) => openCtx(e, [
              { label: "Dupliquer", icon: "📑", onClick: () => dupliquer(f) },
              { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(f) },
            ])}>
            <span className="informations-feuille-titre">📄 {f.titre || "Sans titre"}</span>
            <span className="informations-feuille-date">{new Date(f.dateModification || f.dateCreation).toLocaleDateString("fr-FR")}</span>
          </button>
        ))}
      </aside>
      <section style={{ minWidth: 0 }}>
        {feuille
          ? <EditeurFeuille key={feuille.id} feuille={feuille} annee={annee} onEnregistre={reload}
              onDupliquer={() => dupliquer(feuille)} onSupprimer={() => supprimer(feuille)} />
          : <Empty icone="📋" titre="Aucune feuille" sous="« Nouvelle feuille » en crée une, pré-remplie avec les informations de la classe." />}
      </section>
    </div>
  );
}

function EditeurFeuille({ feuille, annee, onEnregistre, onDupliquer, onSupprimer }: {
  feuille: Texte; annee: string; onEnregistre: () => void; onDupliquer: () => void; onSupprimer: () => void;
}) {
  const { titre, setTitre, contenu, setContenu, etat, sauver } = useTexteAutosave(feuille, onEnregistre);
  const editeur = React.useRef<EditeurRicheHandle>(null);

  // Menu sous le bouton. L'événement réel est gardé pour arrêter sa
  // propagation : sinon le clic, remontant jusqu'à la fenêtre, refermerait le
  // menu aussitôt ouvert.
  const inserer = (e: React.MouseEvent<HTMLButtonElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const sousLeBouton = { clientX: r.left, clientY: r.bottom + 4,
      preventDefault: () => e.preventDefault(), stopPropagation: () => e.stopPropagation() } as unknown as React.MouseEvent;
    openCtx(sousLeBouton, BLOCS_REMPLACANT.map((b) => ({
      label: b.libelle, icon: b.icone,
      onClick: async () => {
        const d = await lireDonneesClasse(annee);
        editeur.current?.inserer(b.html(d, aujourdhuiFr()));
      },
    })));
  };

  const imprimer = async () => {
    await sauver();
    printHTML(titre || "Informations", await avecImages(nettoyerHtml(contenu)),
      "h1 { font-size: 20px; } h2 { page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; }");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} aria-label="Titre de la feuille"
          style={{ flex: "1 1 260px", fontSize: 16, fontWeight: 700 }} />
        <span style={{ fontSize: 12, color: etat === "erreur" ? "var(--danger, #c0392b)" : "var(--text-2)" }}>{LIBELLE_ENREGISTREMENT[etat]}</span>
        <button className="btn" onClick={imprimer}>🖨 Imprimer</button>
        <button className="btn ghost" onClick={onDupliquer} title="Dupliquer">📑</button>
        <button className="btn ghost" onClick={onSupprimer} title="Supprimer" aria-label="Supprimer la feuille">🗑</button>
      </div>
      <EditeurRiche ref={editeur} valeur={feuille.contenu} onChange={setContenu} minHauteur="58vh"
        placeholder="Écrivez, ou « Insérer » pour reprendre l'emploi du temps, les élèves…"
        outils={<button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={inserer}>📥 Insérer ▾</button>} />
      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
        « Insérer » reprend l'emploi du temps de l'année, les élèves et leurs dispositifs, les axes de travail, les ateliers.
        Relisez avant d'imprimer : la feuille sort de l'application.
      </div>
    </div>
  );
}
