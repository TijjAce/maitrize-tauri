import React from "react";
import { api, Texte, newId, nowIso, texteErreur, TYPE_AXE } from "../api";
import { redigerASavoir } from "../aSavoirDesEleves";
import { isoJour } from "../dates";
import { Empty, useAsync } from "../components/ui";
import { toast, toastAnnulable } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { openCtx } from "../components/ctxmenu";
import { EditeurRiche, EditeurRicheHandle } from "../components/EditeurRiche";
import { useTexteAutosave, LIBELLE_ENREGISTREMENT } from "../components/useTexteAutosave";
import { printHTML } from "../print";
import { nettoyerHtml } from "../texteRiche";
import { avecImages } from "../components/imagesTexte";
import { documentRempli } from "../dossier";
import { organisationPour } from "../organisation";
import { structureDe } from "../classe";
import {
  BLOCS_REMPLACANT, DOSSIER_INFORMATIONS, avecElevesAJour, avecEmploiDuTempsAJour, feuilleRemplacant, type DonneesClasse, type PointASavoir,
} from "../remplacant";
import { lireEtablissement } from "../etablissement";

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
  const structure = structureDe(reglages);
  const trouve = organisationPour(edts, new Date());
  let edt: DonneesClasse["edt"] = [];
  try { edt = trouve ? JSON.parse(trouve.slotsJson) : []; } catch { /* emploi du temps illisible */ }
  return {
    ecole: reglages.ecole ?? "", enseignant: reglages.enseignantNom ?? "", fonction: reglages.enseignantFonction ?? "",
    niveau: reglages.niveauClasse ?? "", structure: structure.specialisee ? structure.libelle : "", annee, etablissement: lireEtablissement(reglages),
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
    edt,
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
    toastAnnulable(`Feuille « ${f.titre} » supprimée.`, async () => { await api.texteSave(f); reload(); setChoisie(f.id); });
  };

  // Les feuilles en onglets au-dessus : toute la largeur va à la feuille (demande de l'enseignant, octobre 2026).
  return (
    <div className="informations">
      <div className="informations-onglets" role="tablist" aria-label="Feuilles d'informations">
        {feuilles.map((f) => (
          <button key={f.id} role="tab" aria-selected={f.id === choisie} className={`informations-feuille${f.id === choisie ? " active" : ""}`}
            onClick={() => setChoisie(f.id)}
            onContextMenu={(e) => openCtx(e, [
              { label: "Dupliquer", icon: "📑", onClick: () => dupliquer(f) },
              { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimer(f) },
            ])}>
            <span className="informations-feuille-titre">📄 {f.titre || "Sans titre"}</span>
            <span className="informations-feuille-date">{new Date(f.dateModification || f.dateCreation).toLocaleDateString("fr-FR")}</span>
          </button>
        ))}
        <button className="btn sm" onClick={(e) => openCtx(e, [
          { label: "Feuille pour un remplaçant (pré-remplie)", icon: "📋", onClick: () => creer(true) },
          { label: "Feuille vierge", icon: "📄", onClick: () => creer(false) },
        ])}>＋ Nouvelle feuille</button>
      </div>
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
  const { titre, setTitre, contenu, setContenu, etat, sauver, version } = useTexteAutosave(feuille, onEnregistre);
  const editeur = React.useRef<EditeurRicheHandle>(null);
  // Le contenu le plus récent — ce qu'on tape pendant que l'agent lit compte —, et de quoi redessiner l'éditeur quand on le remplace.
  const dernier = React.useRef(contenu);
  dernier.current = contenu;
  const [rendu, setRendu] = React.useState(0);
  const remplacer = (html: string) => { setContenu(html); setRendu((r) => r + 1); };
  // L'emploi du temps de la feuille suit celui d'Organisation : refait à l'ouverture, avant que l'éditeur ne la montre.
  const [depart, setDepart] = React.useState<string | null>(null);
  React.useEffect(() => {
    let vivant = true;
    lireDonneesClasse(annee).then((d) => avecEmploiDuTempsAJour(feuille.contenu, d)).catch(() => feuille.contenu).then((html) => {
      if (!vivant) return;
      setDepart(html);
      if (html !== feuille.contenu) {
        setContenu(html);
        toast("L'emploi du temps de la feuille suit celui d'Organisation : il est à jour.", { icone: "🗓" });
      }
    });
    return () => { vivant = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // « À savoir » par l'agent (demande de l'enseignant, 31 octobre 2026) : un élève après l'autre, il lit ce qu'on sait de lui
  // — sa synthèse d'abord — et en tire cinq phrases au plus ; le tableau des élèves est refait, et « Annuler » le remet.
  const [agent, setAgent] = React.useState<{ fait: number; total: number } | null>(null);
  const arreter = React.useRef(false);
  const remplirASavoir = async () => {
    arreter.current = false;
    try {
      const [d, tous] = await Promise.all([lireDonneesClasse(annee), api.elevesList()]);
      const debut = `${annee.slice(0, 4)}-08-01`, fin = isoJour(new Date());
      const points = new Map<string, PointASavoir[]>();
      setAgent({ fait: 0, total: d.eleves.length });
      for (const [i, e] of d.eleves.entries()) {
        if (arreter.current) break;
        const eleve = tous.find((x) => x.id === e.id);
        if (eleve) points.set(e.id, await redigerASavoir({ eleve, autresEleves: tous.filter((x) => x.id !== e.id).map((x) => x.nom), debut, fin }));
        setAgent({ fait: i + 1, total: d.eleves.length });
      }
      const remplis = d.eleves.filter((e) => points.get(e.id)?.length).length;
      if (!remplis) {
        toast("L'agent n'a rien trouvé à dire : écrivez d'abord des observations, ou la synthèse des élèves.", { icone: "🐾", duree: 6000 });
        return;
      }
      const avant = dernier.current;
      remplacer(avecElevesAJour(avant, { ...d, eleves: d.eleves.map((e) => (points.get(e.id)?.length ? { ...e, aSavoir: points.get(e.id) } : e)) }));
      toastAnnulable(`« À savoir » rempli par l'agent pour ${remplis} élève${remplis > 1 ? "s" : ""}. Relisez avant d'imprimer.`, () => remplacer(avant), "🐾");
    } catch (err) {
      toast(`L'agent n'a pas pu remplir « À savoir » : ${texteErreur(err)}`, { icone: "⚠️", duree: 6000 });
    } finally {
      setAgent(null);
    }
  };

  const imprimer = async () => {
    await sauver();
    printHTML(titre || "Informations", await avecImages(nettoyerHtml(contenu)),
      "h1 { font-size: 20px; } h2 { page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; }"
      // Un mot ne se coupe pas lettre à lettre dans une colonne étroite (« Horair-e », « Lund-i »).
      + " th, td { word-break: normal; overflow-wrap: break-word; }");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input className="input" value={titre} onChange={(e) => setTitre(e.target.value)} aria-label="Titre de la feuille"
          style={{ flex: "1 1 260px", fontSize: 16, fontWeight: 700 }} />
        <span style={{ fontSize: 12, color: etat === "erreur" ? "var(--danger, #c0392b)" : "var(--text-2)" }}>{LIBELLE_ENREGISTREMENT[etat]}</span>
        {agent ? (
          <>
            <span className="meta" role="status">🐾 L'agent lit… {agent.fait}/{agent.total}</span>
            <button className="btn sm" onClick={() => { arreter.current = true; }}>Arrêter</button>
          </>
        ) : (
          <button className="btn" onClick={() => { void remplirASavoir(); }}
            title="L'agent lit ce qu'on sait de chaque élève, sa synthèse d'abord, et remplit « À savoir » : communication et langage, social, autonomie, niveau, comportement — cinq phrases au plus">
            🐾 Remplir « À savoir »
          </button>
        )}
        <button className="btn" onClick={imprimer}>🖨 Imprimer</button>
        <button className="btn ghost" onClick={onDupliquer} title="Dupliquer">📑</button>
        <button className="btn ghost" onClick={onSupprimer} title="Supprimer" aria-label="Supprimer la feuille">🗑</button>
      </div>
      {depart === null ? <div style={{ minHeight: "58vh" }} /> : (
        <EditeurRiche key={`${version}:${rendu}`} ref={editeur} valeur={version || rendu ? contenu : depart} onChange={setContenu} minHauteur="58vh"
          placeholder="Écrivez, ou « Insérer » pour reprendre l'emploi du temps, les élèves…"
          outils={<button type="button" className="btn sm" onMouseDown={(e) => e.preventDefault()} onClick={inserer}>📥 Insérer ▾</button>} />
      )}
      <div style={{ fontSize: 12, color: "var(--text-2)" }}>
        « Insérer » reprend l'emploi du temps de l'année, les élèves et leurs dispositifs, les axes de travail, les ateliers.
        L'emploi du temps se met à jour tout seul d'après Organisation. Relisez avant d'imprimer : la feuille sort de l'application.
      </div>
    </div>
  );
}
