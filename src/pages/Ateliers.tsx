import React from "react";
import { Page } from "../App";
import {
  api, Atelier, Espace, Jeu, Eleve, OutilClasse, ProgressionEleve, nouvelAtelier, nouvelEspace, nouveauJeu, nouvelOutil,
  MATIERES, couleurHex, couleurPourMatiere, newId, nowIso,
} from "../api";
import { Modal, Field, Input, Textarea, Select, Empty, ColorPicker, Confirm, useAsync } from "../components/ui";
import { openCtx } from "../components/ctxmenu";
import { FichierImg } from "../components/Deroulement";
import { JeuForm, VignetteUpload } from "../components/JeuForm";
import { EtiquettesBo } from "../components/ChoixCompetencesBo";
import { CarteOutil, OutilForm, elevesDe } from "../components/OutilForm";
import { Rangement, type ElementRange } from "../components/Rangement";
import type { CtxItem } from "../components/ctxmenu";
import { toastAnnulable } from "../components/Toaster";
import { ESPACE_COMMUN, EVT_CHERCHER_ATELIERS, cleDe, decouper, reprendreLesDossiers, type Sorte } from "../bureauAteliers";

/**
 * Un jeu passe-t-il les filtres de la ludothèque ?
 *
 * `joueurs` désigne un effectif réel à la table : le jeu est retenu s'il
 * l'accepte, c'est-à-dire si l'effectif tombe dans son intervalle. Un
 * critère vide ne filtre rien.
 */
export function jeuAccepte(j: Jeu, f: { typeJeu?: string; joueurs?: string; dossier?: string }): boolean {
  if (f.dossier && j.dossier !== f.dossier) return false;
  if (f.typeJeu && j.typeJeu !== f.typeJeu) return false;
  if (f.joueurs) {
    const n = Number(f.joueurs);
    if (!Number.isFinite(n) || n < j.nbJoueursMin || n > j.nbJoueursMax) return false;
  }
  return true;
}

type SorteVue = "ateliers" | "espaces" | "jeux" | "outils" | "affichages";

export default function Ateliers() {
  const { data: ateliers, reload: rA } = useAsync(() => api.ateliersList(), []);
  const { data: espaces, reload: rE } = useAsync(() => api.espacesList(), []);
  const { data: liens, reload: rL } = useAsync(() => api.atelierEspaceList(), []);
  const { data: jeux, reload: rJ } = useAsync(() => api.jeuxList(), []);
  const { data: outilsClasse, reload: rO } = useAsync(() => api.outilsClasseList(), []);
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const outils = (outilsClasse ?? []).filter((o) => o.genre === "outil");
  const affichages = (outilsClasse ?? []).filter((o) => o.genre === "affichage");
  const [editO, setEditO] = React.useState<OutilClasse | null>(null);
  // Filtres des outils et affichages : la catégorie, et pour les outils l'élève.
  const [categorie, setCategorie] = React.useState("");
  const [pourEleve, setPourEleve] = React.useState("");
  const [editA, setEditA] = React.useState<Atelier | null>(null);
  const [editE, setEditE] = React.useState<Espace | null>(null);
  const [delA, setDelA] = React.useState<Atelier | null>(null);

  // Supprimer tout de suite, et laisser dix secondes pour revenir en arrière.
  // Un jeu, un outil ou un affichage se recrée tel quel : il n'emporte rien
  // d'autre avec lui, contrairement à un atelier ou à une séquence.
  const supprimerJeu = async (j: Jeu) => {
    await api.jeuDelete(j.id);
    rJ();
    toastAnnulable(`« ${j.titre} » supprimé.`, async () => { await api.jeuSave(j); rJ(); });
  };
  const supprimerOutil = async (o: OutilClasse) => {
    await api.outilClasseDelete(o.id);
    rO();
    const quoi = o.genre === "outil" ? "outil" : "affichage";
    toastAnnulable(`${quoi === "outil" ? "L'outil" : "L'affichage"} « ${o.titre} » supprimé.`,
      async () => { await api.outilClasseSave(o); rO(); });
  };

  const [delE, setDelE] = React.useState<Espace | null>(null);
  const [suivi, setSuivi] = React.useState<Espace | null>(null);
  const [editJ, setEditJ] = React.useState<Jeu | null>(null);
  // Filtre propre aux jeux : on cherche d'abord « à combien » et « quel type ».
  const [typeJeu, setTypeJeu] = React.useState("");
  const [joueurs, setJoueurs] = React.useState("");
  const [recherche, setRecherche] = React.useState("");

  // Le bureau se range comme celui du plan de travail ; la vue en cartes
  // montre tout d'un coup d'œil, et une recherche ou un filtre y bascule
  // d'office.
  const [vue, setVueBrute] = React.useState<"bureau" | "cartes">(() => {
    try { return localStorage.getItem("ateliers:vue") === "cartes" ? "cartes" : "bureau"; } catch { return "bureau"; }
  });
  const setVue = (v: "bureau" | "cartes") => {
    setVueBrute(v);
    try { localStorage.setItem("ateliers:vue", v); } catch { /* stockage indisponible */ }
  };
  // Le dossier ouvert sur le bureau commun.
  const [dossier, setDossier] = React.useState("");

  // Les dossiers des anciens bureaux d'onglet sont repris une fois dans le
  // bureau commun avant de l'afficher, pour qu'aucun dossier vide ne manque.
  const [bureauPret, setBureauPret] = React.useState(false);
  React.useEffect(() => {
    let vivant = true;
    (async () => {
      try {
        const ecritures = reprendreLesDossiers(await api.settingsAll());
        for (const [cle, valeur] of Object.entries(ecritures)) await api.settingSet(cle, valeur);
      } catch { /* le bureau s'affiche quand même */ }
      if (vivant) setBureauPret(true);
    })();
    return () => { vivant = false; };
  }, []);

  // Plus d'onglets : il n'y a qu'un bureau, et il montre tout. Seuls les
  // filtres propres à une sorte — le nombre de joueurs d'un jeu, la catégorie
  // d'un outil — la font passer au premier plan, en cartes.
  const filtreJeux = Boolean(joueurs || typeJeu);
  const filtreOutils = Boolean(categorie || pourEleve);
  /** Cette sorte est-elle montrée, compte tenu des filtres ? */
  const montre = (o: SorteVue) => (!filtreJeux && !filtreOutils)
    || (o === "jeux" && filtreJeux) || ((o === "outils" || o === "affichages") && filtreOutils);

  // ⌘K ouvre la page sur un élément précis en le cherchant : sans onglets,
  // c'est la recherche qui mène jusqu'à lui.
  React.useEffect(() => {
    const chercher = (e: Event) => setRecherche(String((e as CustomEvent).detail ?? ""));
    window.addEventListener(EVT_CHERCHER_ATELIERS, chercher);
    return () => window.removeEventListener(EVT_CHERCHER_ATELIERS, chercher);
  }, []);

  const cherche = recherche.trim().toLowerCase();
  const filtrer = <T extends { titre: string }>(l: T[]) => (cherche ? l.filter((x) => x.titre.toLowerCase().includes(cherche)) : l);
  const filtreActif = Boolean(cherche) || filtreJeux || filtreOutils;
  const enBureau = vue === "bureau" && !filtreActif;

  // Ce qu'on peut créer, dans le dossier ouvert : les cinq sortes.
  const creations = [
    { court: "Atelier", label: "Nouvel atelier", icon: "🧩", onClick: () => setEditA({ ...nouvelAtelier(), dossier: enBureau ? dossier : "" }) },
    { court: "Espace", label: "Nouvel espace", icon: "🪑", onClick: () => setEditE({ ...nouvelEspace(), dossier: enBureau ? dossier : "" }) },
    { court: "Jeu", label: "Nouveau jeu", icon: "🎲", onClick: () => setEditJ({ ...nouveauJeu(), dossier: enBureau ? dossier : "" }) },
    { court: "Outil", label: "Nouvel outil", icon: "🧰", onClick: () => setEditO({ ...nouvelOutil("outil"), dossier: enBureau ? dossier : "" }) },
    { court: "Affichage", label: "Nouvel affichage", icon: "🖼", onClick: () => setEditO({ ...nouvelOutil("affichage"), dossier: enBureau ? dossier : "" }) },
  ];

  return (
    <Page titre="Ateliers & Espaces" sous="Activités en autonomie, stations de classe, jeux, outils des élèves et affichages"
      actions={<button className="btn primary"
        onClick={(e) => openCtx(e, creations.map((c) => ({ label: c.label, icon: c.icon, onClick: c.onClick })))}>
        + Ajouter
      </button>}>
      <div className="toolbar">
        <Input className="search" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} style={{ maxWidth: 170 }} />
        {(jeux?.length ?? 0) > 0 && <>
          <Select value={joueurs} onChange={(e) => setJoueurs(e.target.value)} style={{ maxWidth: 150 }}
            title="Jeux jouables à ce nombre de joueurs">
            <option value="">Tous les effectifs</option>
            {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>À {n} joueur{n > 1 ? "s" : ""}</option>)}
          </Select>
          <Select value={typeJeu} onChange={(e) => setTypeJeu(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">Tous les types</option>
            {Array.from(new Set((jeux ?? []).map((j) => j.typeJeu).filter(Boolean))).map((ty) => <option key={ty}>{ty}</option>)}
          </Select>
        </>}
        {(outilsClasse?.length ?? 0) > 0 && <>
          {(eleves ?? []).some((e) => outils.some((o) => elevesDe(o).includes(e.id))) && (
            <Select value={pourEleve} onChange={(e) => setPourEleve(e.target.value)} style={{ maxWidth: 170 }}
              title="Les outils dont se sert cet élève">
              <option value="">Tous les élèves</option>
              {(eleves ?? []).filter((e) => outils.some((o) => elevesDe(o).includes(e.id)))
                .map((e) => <option key={e.id} value={e.id}>Pour {e.nom.split(" ")[0]}</option>)}
            </Select>
          )}
          <Select value={categorie} onChange={(e) => setCategorie(e.target.value)} style={{ maxWidth: 190 }}>
            <option value="">Toutes les catégories</option>
            {Array.from(new Set((outilsClasse ?? []).map((o) => o.categorie).filter(Boolean)))
              .map((c) => <option key={c}>{c}</option>)}
          </Select>
        </>}
        <div className="spacer" />
        <div className="seg" title={filtreActif ? "Une recherche ou un filtre montre les cartes" : undefined}>
          <button className={enBureau ? "active" : ""} disabled={filtreActif} onClick={() => setVue("bureau")}
            aria-label="Ranger comme sur le bureau">🗂 Bureau</button>
          <button className={!enBureau ? "active" : ""} onClick={() => setVue("cartes")} aria-label="Voir en cartes">▦ Cartes</button>
        </div>
      </div>

      {enBureau && bureauPret && (() => {
        const apercu = (image: string | null, emoji: string) => image
          ? <FichierImg nom={image} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <span style={{ fontSize: 40 }}>{emoji}</span>;
        const joueursDe = (j: Jeu) => (j.nbJoueursMin === j.nbJoueursMax ? `${j.nbJoueursMin}` : `${j.nbJoueursMin}–${j.nbJoueursMax}`);
        const trouver = <T extends { id: string }>(l: T[] | null | undefined, id: string) => (l ?? []).find((x) => x.id === id);

        // Chaque sorte garde ses gestes — ouvrir, ranger, supprimer — mais le
        // bureau, ses dossiers et ses places sont communs à toutes.
        type Gestes = {
          ouvrir: (id: string) => void; ranger: (id: string, d: string) => Promise<unknown>;
          supprimer: (id: string) => void; recharger: () => void; actions: (id: string) => CtxItem[];
        };
        const gestes: Record<Sorte, Gestes> = {
          atelier: {
            ouvrir: (id) => { const a = trouver(ateliers, id); if (a) setEditA(a); },
            ranger: async (id, d) => { const a = trouver(ateliers, id); if (a) await api.atelierSave({ ...a, dossier: d }); },
            supprimer: (id) => { const a = trouver(ateliers, id); if (a) setDelA(a); },
            recharger: rA,
            actions: (id) => [{ label: "Dupliquer", icon: "📑", onClick: () => { const a = trouver(ateliers, id); if (a) api.atelierSave({ ...a, id: newId(), titre: a.titre + " (copie)" }).then(rA); } }],
          },
          espace: {
            ouvrir: (id) => { const e = trouver(espaces, id); if (e) setEditE(e); },
            ranger: async (id, d) => { const e = trouver(espaces, id); if (e) await api.espaceSave({ ...e, dossier: d }); },
            supprimer: (id) => { const e = trouver(espaces, id); if (e) setDelE(e); },
            recharger: rE,
            actions: (id) => [{ label: "Suivi des élèves", icon: "📋", onClick: () => { const e = trouver(espaces, id); if (e) setSuivi(e); } }],
          },
          jeu: {
            ouvrir: (id) => { const j = trouver(jeux, id); if (j) setEditJ(j); },
            ranger: async (id, d) => { const j = trouver(jeux, id); if (j) await api.jeuSave({ ...j, dossier: d }); },
            supprimer: (id) => { const j = trouver(jeux, id); if (j) void supprimerJeu(j); },
            recharger: rJ,
            actions: (id) => [{ label: "Dupliquer", icon: "📑", onClick: () => { const j = trouver(jeux, id); if (j) api.jeuSave({ ...j, id: newId(), titre: j.titre + " (copie)" }).then(rJ); } }],
          },
          outil: {
            ouvrir: (id) => { const o = trouver(outilsClasse, id); if (o) setEditO(o); },
            ranger: async (id, d) => { const o = trouver(outilsClasse, id); if (o) await api.outilClasseSave({ ...o, dossier: d }); },
            supprimer: (id) => { const o = trouver(outilsClasse, id); if (o) void supprimerOutil(o); },
            recharger: rO,
            actions: (id) => [{ label: "Dupliquer", icon: "📑", onClick: () => { const o = trouver(outilsClasse, id); if (o) api.outilClasseSave({ ...o, id: newId(), titre: o.titre + " (copie)", dateCreation: nowIso() }).then(rO); } }],
          },
        };
        const aiguiller = (cle: string) => { const d = decouper(cle); return d ? { g: gestes[d.sorte], id: d.id } : null; };

        const elements: ElementRange[] = [
          ...(montre("ateliers") ? (ateliers ?? []).map((a) => ({ cle: cleDe("atelier", a.id), titre: a.titre || "Sans titre", dossier: a.dossier,
            sousTitre: [a.matiere, `👥 ${a.nbElevesMax}`].filter(Boolean).join(" · "), couleur: couleurHex[a.couleur], apercu: apercu(a.imageNom, "🧩") })) : []),
          ...(montre("espaces") ? (espaces ?? []).map((e) => ({ cle: cleDe("espace", e.id), titre: e.titre || "Sans titre", dossier: e.dossier,
            sousTitre: `Espace · 👥 ${e.nbElevesMax}`, couleur: couleurHex[e.couleur], apercu: apercu(e.imageNom, "🪑") })) : []),
          ...(montre("jeux") ? (jeux ?? []).map((j) => ({ cle: cleDe("jeu", j.id), titre: j.titre || "Sans titre", dossier: j.dossier,
            sousTitre: [j.typeJeu, `👥 ${joueursDe(j)}`].filter(Boolean).join(" · "), couleur: couleurHex[j.couleur], apercu: apercu(j.imageNom, "🎲") })) : []),
          ...(outilsClasse ?? []).filter((o) => montre(o.genre === "outil" ? "outils" : "affichages")).map((o) => ({
            cle: cleDe("outil", o.id), titre: o.titre || "Sans titre", dossier: o.dossier,
            sousTitre: o.genre === "affichage" ? ["Affichage", o.periode].filter(Boolean).join(" · ") : ["Outil", o.categorie].filter(Boolean).join(" · "),
            couleur: couleurHex[o.couleur], apercu: apercu(o.imageNom, o.genre === "outil" ? "🧰" : "🖼") })),
        ];
        return (
          <Rangement key={ESPACE_COMMUN} espace={ESPACE_COMMUN} racine="Ateliers & Espaces" elements={elements}
            dossier={dossier} setDossier={setDossier}
            onOuvrir={(cle) => { const a = aiguiller(cle); a?.g.ouvrir(a.id); }}
            onRanger={async (cle, d) => { const a = aiguiller(cle); if (a) await a.g.ranger(a.id, d); }}
            onSupprimer={(cle) => { const a = aiguiller(cle); a?.g.supprimer(a.id); }}
            onRecharger={() => { rA(); rE(); rJ(); rO(); }}
            actions={(cle) => { const a = aiguiller(cle); return a ? a.g.actions(a.id) : []; }}
            creations={creations.map(({ label, icon, onClick }) => ({ label, icon, onClick }))}
            vide={{ icone: "🗂", titre: "Le bureau est vide", sous: "Clic droit sur le bureau, ou « + Ajouter », pour y poser un atelier, un espace, un jeu, un outil ou un affichage." }} />
        );
      })()}

      {/* En cartes, « Tout » montre chaque sorte à la suite, sous son titre ;
          une sorte vide se tait au lieu d'afficher son « Aucun… ». */}
      {!enBureau
        && filtrer<{ titre: string }>([...(ateliers ?? []), ...(espaces ?? []), ...(jeux ?? []), ...(outilsClasse ?? [])]).length === 0 && (
        <Empty icone="🔍" titre={cherche ? "Rien ne correspond" : "Rien pour l'instant"}
          sous={cherche ? "Essayez un autre mot." : "Ajoutez un atelier, un espace, un jeu, un outil ou un affichage avec « + Ajouter »."} />
      )}

      {!enBureau && montre("ateliers") && filtrer(ateliers ?? []).length > 0 && <h3 className="titre-sorte">🧩 Ateliers</h3>}
      {!enBureau && montre("ateliers") && filtrer(ateliers ?? []).length > 0 && (
        (ateliers?.length ?? 0) === 0 ? <Empty icone="🧩" titre="Aucun atelier" /> :
        <div className="grid cols">
          {filtrer(ateliers!).map((a) => (
            <div key={a.id} className="card" style={{ borderTop: `3px solid ${couleurHex[a.couleur]}`, cursor: "pointer" }}
              onClick={() => setEditA(a)}
              onContextMenu={(e) => openCtx(e, [
                { label: "Ouvrir", icon: "📂", onClick: () => setEditA(a) },
                { label: "Dupliquer", icon: "📑", onClick: () => api.atelierSave({ ...a, id: crypto.randomUUID(), titre: a.titre + " (copie)" }).then(rA) },
                { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDelA(a) },
              ])}>
              {a.imageNom && <FichierImg nom={a.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
              <div style={{ display: "flex", alignItems: "start" }}>
                <div style={{ fontWeight: 700, flex: 1 }}>{a.titre}</div>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setEditA(a); }} aria-label="Modifier">✏️</button>
                <button className="btn ghost sm" onClick={(e) => { e.stopPropagation(); setDelA(a); }} aria-label="Supprimer">🗑</button>
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                <span className="chip">{a.matiere}</span>
                <span className="chip">👥 {a.nbElevesMax}</span>
                <span className="chip">⏱ {a.duree} min</span>
                {a.dossier && <span className="chip">📁 {a.dossier}</span>}
              </div>
              {a.objectifs && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{a.objectifs.slice(0, 100)}</div>}
            </div>
          ))}
        </div>
      )}

      {!enBureau && montre("espaces") && filtrer(espaces ?? []).length > 0 && <h3 className="titre-sorte">🪑 Espaces</h3>}
      {!enBureau && montre("espaces") && filtrer(espaces ?? []).length > 0 && (
        (espaces?.length ?? 0) === 0 ? <Empty icone="🪑" titre="Aucun espace" /> :
        <div className="grid cols">
          {filtrer(espaces!).map((e) => {
            const nbAteliers = (liens ?? []).filter((l) => l[1] === e.id).length;
            return (
              <div key={e.id} className="card" style={{ borderTop: `3px solid ${couleurHex[e.couleur]}`, cursor: "pointer" }}
                onClick={() => setEditE(e)}
                onContextMenu={(ev) => openCtx(ev, [
                  { label: "Ouvrir", icon: "📂", onClick: () => setEditE(e) },
                  { label: "Suivi des élèves", icon: "📋", onClick: () => setSuivi(e) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDelE(e) },
                ])}>
                <div style={{ display: "flex", alignItems: "start" }}>
                  <div style={{ fontWeight: 700, flex: 1 }}>{e.titre}</div>
                  <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setEditE(e); }} aria-label="Modifier">✏️</button>
                  <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setDelE(e); }} aria-label="Supprimer">🗑</button>
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="chip">👥 {e.nbElevesMax}</span>
                  {nbAteliers > 0 && <span className="chip">🧩 {nbAteliers} atelier(s)</span>}
                  {e.dossier && <span className="chip">📁 {e.dossier}</span>}
                </div>
                {e.descriptionEspace && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>{e.descriptionEspace.slice(0, 90)}</div>}
                <button className="btn sm" style={{ marginTop: 10 }} onClick={(ev) => { ev.stopPropagation(); setSuivi(e); }}>📋 Suivi des élèves</button>
              </div>
            );
          })}
        </div>
      )}

      {!enBureau && montre("jeux") && filtrer(jeux ?? []).length > 0 && <h3 className="titre-sorte">🎲 Jeux</h3>}
      {!enBureau && montre("jeux") && filtrer(jeux ?? []).length > 0 && (
        (jeux?.length ?? 0) === 0
          ? <Empty icone="🎲" titre="Aucun jeu"
              sous="Recensez les jeux de la classe : à combien on y joue, combien de temps, ce qu'ils travaillent et où ils sont rangés." />
          : (() => {
            const liste = filtrer(jeux!.filter((j) => jeuAccepte(j, { typeJeu, joueurs })));
            if (liste.length === 0) {
              return <Empty icone="🔍" titre="Aucun jeu ne correspond"
                sous="Élargissez le nombre de joueurs ou le type." />;
            }
            return (
              <div className="grid cols">
                {liste.map((j) => (
                  <div key={j.id} className="card" style={{ borderTop: `3px solid ${couleurHex[j.couleur]}`, cursor: "pointer" }}
                    onClick={() => setEditJ(j)}
                    onContextMenu={(ev) => openCtx(ev, [
                      { label: "Ouvrir", icon: "📂", onClick: () => setEditJ(j) },
                      { label: "Dupliquer", icon: "📑", onClick: () => api.jeuSave({ ...j, id: newId(), titre: j.titre + " (copie)" }).then(rJ) },
                      { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => void supprimerJeu(j) },
                    ])}>
                    {j.imageNom && <FichierImg nom={j.imageNom} style={{ width: "100%", height: 110, objectFit: "cover", marginBottom: 8 }} />}
                    <div style={{ display: "flex", alignItems: "start" }}>
                      <div style={{ fontWeight: 700, flex: 1 }}>{j.titre}</div>
                      <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); setEditJ(j); }} aria-label="Modifier">✏️</button>
                      <button className="btn ghost sm" onClick={(ev) => { ev.stopPropagation(); void supprimerJeu(j); }} aria-label="Supprimer">🗑</button>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                      {j.typeJeu && <span className="chip">{j.typeJeu}</span>}
                      <span className="chip">👥 {j.nbJoueursMin === j.nbJoueursMax ? j.nbJoueursMin : `${j.nbJoueursMin}–${j.nbJoueursMax}`}</span>
                      <span className="chip">⏱ {j.duree} min</span>
                      <span className="chip">🎂 {j.ageMin} ans et +</span>
                      {j.dossier && <span className="chip">📁 {j.dossier}</span>}
                    </div>
                    {j.competences && <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 8 }}>🎯 {j.competences.slice(0, 90)}</div>}
                    <EtiquettesBo valeur={j.competencesBo} />
                    {j.rangement && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>📦 {j.rangement}</div>}
                  </div>
                ))}
              </div>
            );
          })()
      )}

      {!enBureau && (["outil", "affichage"] as const)
        .filter((genre) => montre(genre === "outil" ? "outils" : "affichages"))
        .filter((genre) => filtrer(genre === "outil" ? outils : affichages).length > 0)
        .map((genre) => <React.Fragment key={genre}>
        <h3 className="titre-sorte">{genre === "outil" ? "🧰 Outils pour l'élève" : "🖼 Affichages"}</h3>
        {(() => {
        const tous = genre === "outil" ? outils : affichages;
        if (tous.length === 0) {
          return genre === "outil"
            ? <Empty icone="🧰" titre="Aucun outil"
                sous="Recensez les outils des élèves : bande numérique, sous-main, casque anti-bruit, time timer… À quoi ils servent, où ils sont rangés, qui s'en sert." />
            : <Empty icone="🖼" titre="Aucun affichage"
                sous="Recensez les affichages de la classe : référentiels, règles de vie, emploi du temps visuel… Où ils sont, quand ils sont au mur, et le fichier pour les réimprimer." />;
        }
        const retenus = filtrer(tous)
          .filter((o) => !categorie || o.categorie === categorie)
          .filter((o) => !pourEleve || elevesDe(o).includes(pourEleve));
        if (retenus.length === 0) return <Empty icone="🔍" titre="Rien ne correspond" sous="Changez de catégorie, d'élève ou de dossier." />;
        return (
          <div className="grid cols">
            {retenus.map((o) => (
              <CarteOutil key={o.id} o={o} eleves={eleves ?? []} onOuvrir={() => setEditO(o)} onSupprimer={() => void supprimerOutil(o)}
                onDupliquer={() => api.outilClasseSave({ ...o, id: newId(), titre: o.titre + " (copie)", dateCreation: nowIso() }).then(rO)} />
            ))}
          </div>
        );
      })()}
        </React.Fragment>)}

      {editA && <AtelierForm a={editA} onClose={() => setEditA(null)} onSaved={() => { setEditA(null); rA(); }} />}
      {editE && <EspaceForm e={editE} ateliers={ateliers ?? []} liens={liens ?? []}
        onClose={() => setEditE(null)} onSaved={() => { setEditE(null); rE(); rL(); }} />}
      {suivi && <SuiviEspace espace={suivi} onClose={() => setSuivi(null)} />}
      {delA && <Confirm message={`Supprimer l'atelier « ${delA.titre} » ?`} onYes={() => api.atelierDelete(delA.id).then(rA)} onClose={() => setDelA(null)} />}
      {delE && <Confirm message={`Supprimer l'espace « ${delE.titre} » ?`} onYes={() => api.espaceDelete(delE.id).then(rE)} onClose={() => setDelE(null)} />}
      {editJ && <JeuForm j={editJ} onClose={() => setEditJ(null)} onSaved={() => { setEditJ(null); rJ(); }} />}

      {editO && <OutilForm o={editO} onClose={() => setEditO(null)} onSaved={() => { setEditO(null); rO(); }} />}

    </Page>
  );
}

function AtelierForm({ a, onClose, onSaved }: { a: Atelier; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState<Atelier>(a);
  const up = (p: Partial<Atelier>) => setV({ ...v, ...p });
  return (
    <Modal titre={a.titre ? "Modifier l'atelier" : "Nouvel atelier"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={() => api.atelierSave(v).then(onSaved)}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(e) => up({ titre: e.target.value })} /></Field>
      <div className="row">
        <Field label="Matière"><Select value={v.matiere} onChange={(e) => up({ matiere: e.target.value, couleur: couleurPourMatiere(e.target.value) })}>{MATIERES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Élèves max"><Input type="number" value={v.nbElevesMax} onChange={(e) => up({ nbElevesMax: +e.target.value })} /></Field>
        <Field label="Durée (min)"><Input type="number" value={v.duree} onChange={(e) => up({ duree: +e.target.value })} /></Field>
      </div>
      <Field label="Objectifs"><Textarea value={v.objectifs} onChange={(e) => up({ objectifs: e.target.value })} /></Field>
      <Field label="Matériel"><Textarea value={v.materiel} onChange={(e) => up({ materiel: e.target.value })} /></Field>
      <div className="field">
        <label>Vignette (image de couverture)</label>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {v.imageNom
            ? <FichierImg nom={v.imageNom} style={{ width: 96, height: 72, objectFit: "cover", border: "1px solid var(--border)" }} />
            : <div style={{ width: 96, height: 72, borderRadius: 8, background: "var(--panel-2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🖼</div>}
          <VignetteUpload onUploaded={(nom) => up({ imageNom: nom })} />
          {v.imageNom && <button className="btn ghost sm" onClick={() => up({ imageNom: null })}>Retirer</button>}
        </div>
      </div>
      <div className="row">
        <Field label="Dossier (optionnel)"><Input value={v.dossier} placeholder="ex. Mathématiques" onChange={(e) => up({ dossier: e.target.value })} /></Field>
        <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
      </div>
    </Modal>
  );
}

function EspaceForm({ e, ateliers, liens, onClose, onSaved }: {
  e: Espace; ateliers: Atelier[]; liens: [string, string][]; onClose: () => void; onSaved: () => void;
}) {
  const [v, setV] = React.useState<Espace>(e);
  const up = (p: Partial<Espace>) => setV({ ...v, ...p });
  const [sel, setSel] = React.useState<string[]>(() => liens.filter((l) => l[1] === e.id).map((l) => l[0]));
  const toggle = (id: string) => setSel((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const save = async () => {
    await api.espaceSave(v);
    await api.atelierEspaceSet(v.id, sel);
    onSaved();
  };

  return (
    <Modal titre={e.titre ? "Modifier l'espace" : "Nouvel espace"} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!v.titre.trim()} onClick={save}>Enregistrer</button></>}>
      <Field label="Titre"><Input autoFocus value={v.titre} onChange={(ev) => up({ titre: ev.target.value })} /></Field>
      <div className="row">
        <Field label="Élèves max"><Input type="number" value={v.nbElevesMax} onChange={(ev) => up({ nbElevesMax: +ev.target.value })} /></Field>
        <Field label="Dossier (optionnel)"><Input value={v.dossier} onChange={(ev) => up({ dossier: ev.target.value })} /></Field>
      </div>
      <Field label="Description"><Textarea value={v.descriptionEspace} onChange={(ev) => up({ descriptionEspace: ev.target.value })} /></Field>
      <div className="field">
        <label>Ateliers proposés dans cet espace</label>
        {ateliers.length === 0 ? <div style={{ fontSize: 13, color: "var(--text-2)" }}>Aucun atelier créé.</div> :
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflowY: "auto" }}>
            {ateliers.map((a) => (
              <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", borderRadius: 7, background: "var(--bg)", fontSize: 13 }}>
                <input type="checkbox" checked={sel.includes(a.id)} onChange={() => toggle(a.id)} />
                <span className="dot" style={{ background: couleurHex[a.couleur] }} />{a.titre}
              </label>
            ))}
          </div>}
      </div>
      <Field label="Couleur"><ColorPicker value={v.couleur} onChange={(c) => up({ couleur: c })} /></Field>
    </Modal>
  );
}

function SuiviEspace({ espace, onClose }: { espace: Espace; onClose: () => void }) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const { data: progs, reload } = useAsync(() => api.progressionsEleveList(espace.id), [espace.id]);

  const progDe = (eleveId: string) => progs?.find((p) => p.eleveId === eleveId);
  const toggle = async (e: Eleve) => {
    const exist = progDe(e.id);
    const p: ProgressionEleve = exist ? { ...exist, fait: !exist.fait }
      : { id: newId(), nomEleve: e.nom, eleveId: e.id, fait: true, espaceId: espace.id };
    await api.progressionEleveSave(p); reload();
  };
  const faits = (eleves ?? []).filter((e) => progDe(e.id)?.fait).length;

  return (
    <Modal titre={`Suivi — ${espace.titre}`} onClose={onClose}
      footer={<><span className="chip">{faits} / {eleves?.length ?? 0} ont fait l'atelier</span><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      {(eleves?.length ?? 0) === 0 ? <Empty icone="👧" titre="Aucun élève" /> :
        eleves!.map((e) => {
          const fait = progDe(e.id)?.fait ?? false;
          return (
            <label key={e.id} className="list-row" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={fait} onChange={() => toggle(e)} />
              <div className="title" style={{ flex: 1 }}>{e.nom}</div>
              {fait && <span className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>✓ fait</span>}
            </label>
          );
        })}
    </Modal>
  );
}
