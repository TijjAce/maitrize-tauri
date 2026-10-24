import React from "react";
import { toastAnnulable } from "./Toaster";
import { api, newId, nouveauJeu, nouvelOutil, nowIso, type Jeu, type MaterielItem, type OutilClasse } from "../api";
import { Input, Modal } from "./ui";
import { FichierImg } from "./Deroulement";
import { VignettePdf } from "./VignettePdf";
import { OutilForm } from "./OutilForm";
import { JeuForm } from "./JeuForm";
import { FormMateriel } from "./FormMateriel";
import { filDAriane } from "../dossiers";
import { chercherPdfs, copiePourLaSeance, lirePdfs, pdfsDuBureau } from "../materielSeance";
import { fichierEnBase64 } from "../dragdrop";
import type { Citable } from "./EditeurDeroulement";
import {
  GENRES_DE_SUPPORT, chercherElements, dejaPose, elementDuRenvoi, elementsDuBureau, genreDeSupport, lireRenvoi, renvoiVers, supportsDeLaSeance,
  type ElementDeSupport, type GenreDeSupport, type RenvoiDeSupport, type SourcesDuBureau,
} from "../supportsDeSeance";

// Les supports d'une séance (voir supportsDeSeance) : la fenêtre qui les
// prend sur le plan de travail — ou les y crée —, et la ligne qui les montre
// dans la séance.

type Onglet = "pdf" | GenreDeSupport;

const ONGLETS: { id: Onglet; nom: string }[] = [
  { id: "pdf", nom: "📄 Feuilles PDF" },
  ...GENRES_DE_SUPPORT.map((g) => ({ id: g.id as Onglet, nom: `${g.ico} ${g.id === "outil" ? "Outils pour l'élève" : g.pluriel}` })),
];

/** Un support à créer, tel que sa fiche s'ouvre : il naît sur le bureau, et se pose dans la séance. */
type Nouveau =
  | { genre: "outil" | "affichage" | "evaluation"; outil: OutilClasse }
  | { genre: "jeu"; jeu: Jeu }
  | { genre: "materiel"; materiel: MaterielItem };

const materielNeuf = (): MaterielItem => ({
  id: newId(), titre: "", descriptionMateriel: "", competenceId: "", competenceTitre: "", domaineTitre: "",
  sousDomaineTitre: "", cycle: "", imagesJson: "[]", pdfsJson: "[]", dateCreation: nowIso(), seanceId: null,
  sequenceId: null, dossier: "", videosJson: "[]", coffreJson: "[]",
});

const aDesPdfs = (m: MaterielItem) => lirePdfs(m.pdfsJson).length > 0;
const chemin = (dossier: string) => filDAriane(dossier).slice(1).map((x) => x.nom).join(" › ");

/**
 * Prendre un support sur le plan de travail pour la séance : une feuille PDF
 * (copiée, elle s'imprime avec le cahier journal), ou un outil pour l'élève,
 * un affichage, un jeu, une évaluation, un matériel (la séance y renvoie, il
 * reste sur le bureau). Ce qui manque se crée ici, sur le bureau, et se pose
 * dans la séance. La fenêtre reste ouverte : on prend souvent plusieurs
 * supports d'un coup.
 */
export function ChoixDeSupport({ bureau, poses, onPoser, onPrendrePdf, onRecharger, onClose }: {
  bureau: SourcesDuBureau;
  /** Les supports déjà dans la séance. */
  poses: MaterielItem[];
  onPoser: (renvoi: RenvoiDeSupport, titre: string) => Promise<void>;
  onPrendrePdf: (m: MaterielItem) => Promise<void>;
  /** Le bureau a changé — un support créé ici — : à relire. */
  onRecharger: () => Promise<void>;
  onClose: () => void;
}) {
  const [onglet, setOnglet] = React.useState<Onglet>("pdf");
  const [recherche, setRecherche] = React.useState("");
  const [pris, setPris] = React.useState<Record<string, "encours" | "fait">>({});
  const [nouveau, setNouveau] = React.useState<Nouveau | null>(null);

  const prendre = async (cle: string, faire: () => Promise<void>) => {
    setPris((p) => ({ ...p, [cle]: "encours" }));
    try { await faire(); setPris((p) => ({ ...p, [cle]: "fait" })); }
    catch { setPris((p) => { const { [cle]: _, ...reste } = p; return reste; }); }
  };

  const creer = (genre: GenreDeSupport) => setNouveau(
    genre === "jeu" ? { genre, jeu: nouveauJeu() }
      : genre === "materiel" ? { genre, materiel: materielNeuf() }
        : { genre, outil: nouvelOutil(genre) });
  /** Créé sur le bureau, puis posé dans la séance. */
  const apresCreation = async (renvoi: RenvoiDeSupport, titre: string) => {
    setNouveau(null);
    await onRecharger();
    await prendre(`${renvoi.genre}:${renvoi.source}`, () => onPoser(renvoi, titre));
  };

  const pdfs = onglet === "pdf" ? chercherPdfs(pdfsDuBureau(bureau.materiel), recherche) : [];
  const elements = onglet === "pdf" ? [] : chercherElements(elementsDuBureau(onglet, bureau, aDesPdfs), recherche);
  const genre = onglet === "pdf" ? null : genreDeSupport(onglet);

  return (
    <>
      <Modal large titre="Ajouter un support à la séance" onClose={onClose}
        footer={<button className="btn" onClick={onClose}>Fermer</button>}>
        <div className="seg choix-support-onglets" role="tablist" aria-label="Sorte de support">
          {ONGLETS.map((o) => (
            <button key={o.id} role="tab" aria-selected={onglet === o.id} className={onglet === o.id ? "active" : ""}
              onClick={() => { setOnglet(o.id); setRecherche(""); }}>{o.nom}</button>
          ))}
        </div>
        <div className="toolbar" style={{ margin: "12px 0 10px" }}>
          <Input value={recherche} onChange={(e) => setRecherche(e.target.value)} className="input search"
            placeholder={genre ? `Chercher : ${genre.pluriel.toLowerCase()} du bureau…` : "Chercher une feuille du bureau…"}
            aria-label="Chercher sur le bureau" />
          {genre && <button className="btn" onClick={() => creer(genre.id)}>＋ {genre.nouveau}</button>}
        </div>

        {onglet === "pdf" ? (
          pdfs.length === 0
            ? <div className="choix-support-vide">{recherche.trim() ? "Aucune feuille du bureau ne correspond." : "Aucune feuille PDF sur le bureau."}</div>
            : pdfs.map((m) => {
              const etat = pris[`pdf:${m.id}`];
              const nb = lirePdfs(m.pdfsJson).length;
              return (
                <div key={m.id} className="list-row choix-support-ligne">
                  <div className="choix-support-vignette"><VignettePdf nom={lirePdfs(m.pdfsJson)[0]} /></div>
                  <div className="choix-support-texte">
                    <div className="title">{m.titre || "Sans titre"}</div>
                    <div className="meta">{[chemin(m.dossier) || "Bureau", nb > 1 ? `${nb} PDF` : ""].filter(Boolean).join(" · ")}</div>
                  </div>
                  {etat === "fait" ? <span className="chip">✓ Ajoutée</span>
                    : <button className="btn sm primary" disabled={etat === "encours"} onClick={() => prendre(`pdf:${m.id}`, () => onPrendrePdf(m))}>
                        {etat === "encours" ? "Copie…" : "＋ Ajouter"}
                      </button>}
                </div>
              );
            })
        ) : (
          elements.length === 0
            ? <div className="choix-support-vide">{recherche.trim() ? "Rien ne correspond sur le bureau." : `Aucun support de cette sorte sur le bureau : « ＋ ${genre!.nouveau} » en crée un.`}</div>
            : elements.map((e) => <LigneAChoisir key={e.renvoi.source} e={e} pose={dejaPose(poses, e.renvoi)}
                etat={pris[`${e.renvoi.genre}:${e.renvoi.source}`]}
                onPoser={() => prendre(`${e.renvoi.genre}:${e.renvoi.source}`, () => onPoser(e.renvoi, e.titre))} />)
        )}
      </Modal>

      {nouveau && "outil" in nouveau && (
        <OutilForm o={nouveau.outil} onClose={() => setNouveau(null)}
          onSaved={(o) => { void apresCreation({ genre: o.genre, source: o.id }, o.titre); }} />
      )}
      {nouveau && "jeu" in nouveau && (
        <JeuForm j={nouveau.jeu} nouveau onClose={() => setNouveau(null)}
          onSaved={(j) => { void apresCreation({ genre: "jeu", source: j.id }, j.titre); }} />
      )}
      {nouveau && "materiel" in nouveau && (
        <FormMateriel m={nouveau.materiel} onClose={() => setNouveau(null)}
          onSaved={() => {
            const id = nouveau.materiel.id;
            void api.materielList().then((tous) => apresCreation({ genre: "materiel", source: id }, tous.find((x) => x.id === id)?.titre ?? ""));
          }} />
      )}
    </>
  );
}

function LigneAChoisir({ e, pose, etat, onPoser }: { e: ElementDeSupport; pose: boolean; etat?: "encours" | "fait"; onPoser: () => void }) {
  return (
    <div className="list-row choix-support-ligne">
      <div className="choix-support-vignette">
        {e.image ? <FichierImg nom={e.image} style={{ width: 40, height: 40, objectFit: "cover" }} alt="" />
          : <span aria-hidden="true">{genreDeSupport(e.renvoi.genre).ico}</span>}
      </div>
      <div className="choix-support-texte">
        <div className="title">{e.titre}</div>
        <div className="meta">{[e.detail, chemin(e.dossier)].filter(Boolean).join(" · ") || genreDeSupport(e.renvoi.genre).nom}</div>
      </div>
      {pose || etat === "fait" ? <span className="chip">✓ Dans la séance</span>
        : <button className="btn sm primary" disabled={etat === "encours"} onClick={onPoser}>{etat === "encours" ? "…" : "＋ Ajouter"}</button>}
    </div>
  );
}

/**
 * Un support de la séance, tel qu'il est aujourd'hui sur le bureau. « Ouvrir »
 * montre sa fiche ; la corbeille le retire de la séance, pas du bureau.
 */
export function LigneDeSupport({ lien, bureau, onOuvrir, onRetirer }: {
  lien: MaterielItem; bureau: SourcesDuBureau; onOuvrir: (r: RenvoiDeSupport) => void; onRetirer: () => void;
}) {
  const r = lireRenvoi(lien.supportJson);
  if (!r) return null;
  const g = genreDeSupport(r.genre);
  const e = elementDuRenvoi(r, bureau);
  return (
    <div className="list-row support-seance">
      <div className="choix-support-vignette">
        {e?.image ? <FichierImg nom={e.image} style={{ width: 40, height: 40, objectFit: "cover" }} alt="" />
          : <span aria-hidden="true">{g.ico}</span>}
      </div>
      <div className="choix-support-texte">
        <div className="title">{e?.titre || lien.titre}</div>
        <div className="meta">{[g.nom, e ? e.detail : "n'est plus sur le plan de travail"].filter(Boolean).join(" · ")}</div>
      </div>
      <button className="btn sm" disabled={!e} onClick={() => onOuvrir(r)}>Ouvrir</button>
      <button className="btn ghost sm" onClick={onRetirer} aria-label={`Retirer « ${e?.titre || lien.titre} » de la séance`}
        title="Retirer de la séance : il reste sur le plan de travail">🗑</button>
    </div>
  );
}

/** La fiche d'un support de la séance, ouverte depuis elle. */
export function FicheDuSupport({ renvoi, bureau, onClose, onSaved }: {
  renvoi: RenvoiDeSupport; bureau: SourcesDuBureau; onClose: () => void; onSaved: () => void;
}) {
  if (renvoi.genre === "jeu") {
    const j = bureau.jeux.find((x) => x.id === renvoi.source);
    return j ? <JeuForm j={j} onClose={onClose} onSaved={onSaved} /> : null;
  }
  if (renvoi.genre === "materiel") {
    const m = bureau.materiel.find((x) => x.id === renvoi.source);
    return m ? <FormMateriel m={m} onClose={onClose} onSaved={onSaved} /> : null;
  }
  const o = bureau.outils.find((x) => x.id === renvoi.source);
  return o ? <OutilForm o={o} onClose={onClose} onSaved={onSaved} /> : null;
}

/** Ce que le bureau porte, relu ensemble : le matériel, les outils, affichages et évaluations, les jeux. */
export async function lireLeBureau(): Promise<SourcesDuBureau> {
  const [materiel, outils, jeux] = await Promise.all([api.materielList(), api.outilsClasseList(), api.jeuxList()]);
  return { materiel, outils, jeux };
}

// ── Les supports d'une séance, pour sa page ───────────────────────────────

/** Les supports d'une séance et ce qu'on en fait : les poser, les retirer, prendre une feuille du bureau, ajouter un PDF. */
export function useSupportsDeLaSeance(seanceId: string, sequenceId: string | null, cycle = "") {
  const [items, setItems] = React.useState<MaterielItem[]>([]);
  const [bureau, setBureau] = React.useState<SourcesDuBureau>({ outils: [], jeux: [], materiel: [] });
  const reload = React.useCallback(async () => {
    const lu = await lireLeBureau();
    setItems(lu.materiel.filter((m) => m.seanceId === seanceId));
    setBureau(lu);
  }, [seanceId]);
  React.useEffect(() => { void reload(); }, [reload]);
  const supports = supportsDeLaSeance(items, seanceId);
  const feuilles = items.filter((m) => !lireRenvoi(m.supportJson)).sort((a, b) => a.dateCreation.localeCompare(b.dateCreation));
  const poser = async (renvoi: RenvoiDeSupport, titre: string) => {
    const lien = renvoiVers({ id: seanceId, sequenceId }, renvoi, titre, newId(), nowIso());
    await api.materielSave(lien);
    await reload();
    return lien;
  };
  const retirer = async (lien: MaterielItem) => {
    await api.materielDelete(lien.id);
    await reload();
    toastAnnulable(`« ${lien.titre || "Le support"} » retiré de la séance.`, async () => { await api.materielSave(lien); await reload(); }, "📎");
  };
  /** Une feuille du bureau, copiée dans la séance, fichiers compris : le bureau garde la sienne. */
  const prendrePdf = async (m: MaterielItem) => {
    const copies: string[] = [];
    for (const nom of lirePdfs(m.pdfsJson)) copies.push(await api.fichierSave(nom, await api.fichierRead(nom)));
    const copie = copiePourLaSeance(m, seanceId, copies, newId(), nowIso());
    await api.materielSave({ ...copie, sequenceId });
    await reload();
    return copie;
  };
  const ajouterPdf = async (fichier: File) => {
    const nom = await api.fichierSave(fichier.name, await fichierEnBase64(fichier));
    const m: MaterielItem = {
      id: newId(), titre: fichier.name.replace(/\.[^.]+$/, ""), descriptionMateriel: "", competenceId: "", competenceTitre: "",
      domaineTitre: "", sousDomaineTitre: "", cycle, imagesJson: "[]", pdfsJson: JSON.stringify([nom]), dateCreation: nowIso(),
      seanceId, sequenceId, dossier: "", videosJson: "[]", coffreJson: "[]",
    };
    await api.materielSave(m);
    await reload();
    return m;
  };
  const supprimerFeuille = async (m: MaterielItem) => {
    const fichiers = lirePdfs(m.pdfsJson);
    for (const f of fichiers) await api.fichierDelete(f).catch(() => {});
    await api.materielDelete(m.id);
    await reload();
    // « Annuler » (ou ⌘Z) : la feuille revient, ses PDF sortent de la corbeille.
    toastAnnulable(`« ${m.titre || "La feuille"} » supprimée.`, async () => { await api.fichiersRamener(fichiers); await api.materielSave(m); await reload(); });
  };
  return { items, bureau, supports, feuilles, reload, poser, retirer, prendrePdf, ajouterPdf, supprimerFeuille };
}

export type SupportsDeLaSeanceEtat = ReturnType<typeof useSupportsDeLaSeance>;

/**
 * Ce que le menu « @ » propose : les supports de la séance, puis ceux du
 * bureau — qui se posent dans la séance en même temps qu'on les cite ; une
 * feuille du bureau y est copiée.
 */
export function citablesDeLaSeance(etat: SupportsDeLaSeanceEtat): Citable[] {
  const { bureau, supports, feuilles, poser, prendrePdf } = etat;
  const dansLaSeance: Citable[] = [
    ...supports.flatMap((lien): Citable[] => {
      const r = lireRenvoi(lien.supportJson)!;
      const e = elementDuRenvoi(r, bureau);
      return [{ genre: r.genre, id: r.source, titre: e?.titre || lien.titre, detail: genreDeSupport(r.genre).nom.toLowerCase(), groupe: "seance" }];
    }),
    ...feuilles.map((m): Citable => ({ genre: "feuille", id: m.id, titre: m.titre || "Feuille", detail: "feuille", groupe: "seance" })),
  ];
  const poses = new Set(dansLaSeance.map((c) => `${c.genre}:${c.id}`));
  const duBureau: Citable[] = GENRES_DE_SUPPORT.flatMap((g) => elementsDuBureau(g.id, bureau, aDesPdfs)
    .filter((e) => !poses.has(`${e.renvoi.genre}:${e.renvoi.source}`))
    .map((e): Citable => ({
      genre: e.renvoi.genre, id: e.renvoi.source, titre: e.titre, detail: [g.nom.toLowerCase(), e.detail].filter(Boolean).join(" · "), groupe: "bureau",
      poser: async () => { await poser(e.renvoi, e.titre); return { genre: e.renvoi.genre, id: e.renvoi.source, titre: e.titre }; },
    })));
  const pdfs: Citable[] = pdfsDuBureau(bureau.materiel).map((m) => ({
    genre: "feuille", id: m.id, titre: m.titre || "Feuille", detail: "feuille du bureau, copiée dans la séance", groupe: "bureau",
    poser: async () => { const copie = await prendrePdf(m); return { genre: "feuille", id: copie.id, titre: copie.titre || "Feuille" }; },
  }));
  return [...dansLaSeance, ...duBureau, ...pdfs];
}
