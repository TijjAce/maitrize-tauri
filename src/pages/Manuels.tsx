import React from "react";
import { MODELE_TACHES, api, newId, nowIso, texteErreur } from "../api";
import { Field, Input, Modal, Select, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { BoutonBureau } from "../components/BoutonBureau";
import { PageEncadree, teinteExercice } from "../components/PageEncadree";
import { CompetenceTree, labelCourt } from "../components/CompetenceTree";
import { basculerCompetence, memeCompetence } from "../ateliersCompetences";
import { STYLE_ENTETE_COMPETENCES, enteteCompetencesHtml, materielDuBureau } from "../impressionAtelier";
import { printHTML } from "../print";
import { nombreDePages, octetsDuFichier, rendrePage } from "../pdfRendu";
import { imageDeLaPage, pngDeLaZone } from "../exercicesDesManuels";
import {
  CLE_INDEX, OPTIONS_PAR_DEFAUT, STYLE_FICHE_ADAPTEE, TYPES_EXERCICE, ajouterPagePhoto, cleManuel, consigneLectureEncadre,
  consigneReadaptation, ecrireManuel, estLu, exerciceEncadre, exercicesParCompetence, ficheDepuisLExercice, htmlFicheAdaptee, indexAvec,
  indexSans, lireExerciceDeLEncadre, lireFicheAdaptee, lireIndex, lireManuel, nomExercice, nouveauManuel, retirerPage,
  type ExerciceManuel, type FicheAdaptee, type Manuel, type OptionsReadaptation, type PageManuel, type ResumeManuel, type Zone,
} from "../manuels";

// ── Adapter une fiche › Manuels ───────────────────────────────────────────
//
// Un manuel entier, photographié page à page avec le téléphone ou importé en
// PDF. Sur une page, l'enseignant encadre lui-même un exercice : c'est lui qui
// sait ce qui en fait un. Le modèle lit l'encadré — et lui seul — pour en
// tirer un modèle simplifié ; l'enseignant le corrige, l'imprime, et met sur
// l'exercice la compétence du BO qu'il veut : il le retrouvera dans les
// séquences qui la visent. Le manuel se range aussi en PDF, sur le bureau ou
// là où l'on veut.

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Les octets d'un fichier de Fichiers/, relus. */
async function octetsDuFichierStocke(nom: string): Promise<Uint8Array> {
  return Uint8Array.from(atob(await api.fichierRead(nom)), (c) => c.charCodeAt(0));
}

/**
 * Un fichier reçu du téléphone, en pages : une image fait une page ; un PDF
 * — celui que rend le scanner de l'application Fichiers — en fait autant que
 * de pages, chacune rendue en image et rangée à son tour.
 */
async function pagesDuFichierRecu(nom: string): Promise<string[]> {
  if (!nom.toLowerCase().endsWith(".pdf")) return [nom];
  const octets = await octetsDuFichierStocke(nom);
  const n = await nombreDePages(octets);
  const noms: string[] = [];
  for (let i = 1; i <= n; i++) {
    const image = (await rendrePage(octets, i)).image;
    noms.push(await api.fichierSave(`page-${i}.png`, image));
  }
  api.fichierDelete(nom).catch(() => {});
  return noms;
}

/** Un titre qui peut nommer un fichier : sans les signes que Finder ou Windows refusent. */
const nomDeFichier = (titre: string) => titre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Manuel";

export function ManuelsPanel() {
  const { data: indexBrut, reload: relireIndex } = useAsync(() => api.settingGet(CLE_INDEX), []);
  const index = React.useMemo(() => lireIndex(indexBrut), [indexBrut]);
  const [manuel, setManuel] = React.useState<Manuel | null>(null);
  const [pageId, setPageId] = React.useState("");
  const [exerciceId, setExerciceId] = React.useState("");
  const [vue, setVue] = React.useState<"pages" | "competences">("pages");
  const [occupe, setOccupe] = React.useState("");
  const [images, setImages] = React.useState<Record<string, string>>({});
  const entree = React.useRef<HTMLInputElement>(null);

  // Le manuel tel qu'il est à l'instant, pour ce qui finit plus tard (le modèle d'un encadré) :
  // repartir d'une copie prise avant l'attente effacerait ce qui s'est fait entre-temps.
  const manuelCourant = React.useRef<Manuel | null>(null);
  manuelCourant.current = manuel;
  const enregistrer = React.useCallback(async (m: Manuel) => {
    manuelCourant.current = m;
    setManuel(m);
    await api.settingSet(cleManuel(m.id), ecrireManuel(m));
    await api.settingSet(CLE_INDEX, JSON.stringify(indexAvec(lireIndex(await api.settingGet(CLE_INDEX)), m)));
    relireIndex();
  }, [relireIndex]);
  const majPage = (m: Manuel, pid: string, f: (p: PageManuel) => PageManuel): Manuel => ({ ...m, pages: m.pages.map((p) => (p.id === pid ? f(p) : p)) });
  const majDansLaPage = (m: Manuel, pid: string, eid: string, f: (e: ExerciceManuel) => ExerciceManuel): Manuel =>
    majPage(m, pid, (p) => ({ ...p, exercices: p.exercices.map((e) => (e.id === eid ? f(e) : e)) }));

  const ouvrir = async (id: string) => {
    const m = lireManuel(await api.settingGet(cleManuel(id)));
    if (!m) { toast("Ce manuel ne se relit pas.", { icone: "⚠️" }); return; }
    setManuel(m); setPageId(m.pages[0]?.id ?? ""); setExerciceId(""); setVue("pages");
  };

  const supprimer = async (r: ResumeManuel) => {
    if (!(await confirmer(`Supprimer le manuel « ${r.titre} » et ses ${r.pages} page${r.pages > 1 ? "s" : ""} ? Ses exercices encadrés partent avec.`, { oui: "Supprimer", danger: true }))) return;
    const m = lireManuel(await api.settingGet(cleManuel(r.id)));
    for (const p of m?.pages ?? []) if (p.fichier) api.fichierDelete(p.fichier).catch(() => {});
    if (m?.fichierPdf) api.fichierDelete(m.fichierPdf).catch(() => {});
    await api.settingSet(cleManuel(r.id), "");
    await api.settingSet(CLE_INDEX, JSON.stringify(indexSans(lireIndex(await api.settingGet(CLE_INDEX)), r.id)));
    if (manuel?.id === r.id) { setManuel(null); setPageId(""); }
    relireIndex();
  };

  // ── Entrées : le téléphone, page après page ; ou un PDF ──
  const manuelEnCours = React.useRef<Manuel | null>(null);
  const commencerParPhotos = async () => {
    // Le nom se donne sur la page du manuel, une fois les pages là.
    const m = nouveauManuel(`Manuel du ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}`, "telephone", todayIso());
    manuelEnCours.current = m;
    await enregistrer(m);
    setPageId(""); setExerciceId("");
    return true;
  };
  const continuerParPhotos = async () => { manuelEnCours.current = manuel; return !!manuel; };
  // La fenêtre du QR code vit au-dessus des deux vues : créer le manuel change
  // de vue, et la fenêtre ouverte depuis l'accueil disparaissait avec lui —
  // les pages arrivaient alors sans personne pour les ranger.
  const [demandeDeScan, setDemandeDeScan] = React.useState(0);
  const scanner = async (avant: () => Promise<boolean>) => { if (await avant()) setDemandeDeScan((n) => n + 1); };
  // Les fichiers arrivent dans l'ordre ; on les range dans l'ordre, un à la fois.
  const fileDArrivee = React.useRef(Promise.resolve());
  const photoRecue = React.useCallback((fichier: string) => {
    fileDArrivee.current = fileDArrivee.current.then(async () => {
      const m = manuelEnCours.current;
      if (!m) return;
      let suite = m;
      for (const nom of await pagesDuFichierRecu(fichier)) suite = ajouterPagePhoto(suite, nom);
      manuelEnCours.current = suite;
      await enregistrer(suite);
    }).catch((e) => toast(`Page reçue mais illisible : ${e}`, { icone: "⚠️" }));
  }, [enregistrer]);
  const finDePhotos = React.useCallback((recues: number) => {
    void fileDArrivee.current.then(() => {
      const m = manuelEnCours.current;
      if (m && recues) { toast(`${recues} page${recues > 1 ? "s" : ""} reçue${recues > 1 ? "s" : ""} dans « ${m.titre} ».`, { icone: "📚" }); setPageId(m.pages[m.pages.length - 1]?.id ?? ""); }
      manuelEnCours.current = null;
    });
  }, []);

  const importerPdf = async (f: File) => {
    setOccupe("Lecture du PDF…");
    try {
      const octets = await octetsDuFichier(f);
      const n = await nombreDePages(octets);
      const b64 = btoa(Array.from(octets, (b) => String.fromCharCode(b)).join(""));
      const nom = await api.fichierSave(f.name, b64);
      const m = nouveauManuel(f.name.replace(/\.pdf$/i, ""), "pdf", todayIso(), nom, n);
      await enregistrer(m);
      setPageId(m.pages[0]?.id ?? ""); setExerciceId("");
      toast(`${n} page${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}.`, { icone: "📚" });
    } catch (e: any) { toast("PDF illisible : " + String(e?.message ?? e), { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };

  // ── L'image d'une page, gardée le temps de la visite ──
  const imageDe = React.useCallback(async (m: Manuel, p: PageManuel): Promise<string> => {
    if (images[p.id]) return images[p.id];
    const url = await imageDeLaPage(m, p);
    setImages((im) => ({ ...im, [p.id]: url }));
    return url;
  }, [images]);

  const page = manuel?.pages.find((p) => p.id === pageId) ?? null;
  React.useEffect(() => {
    if (!manuel || !page || images[page.id]) return;
    let vivant = true;
    imageDe(manuel, page).catch((e) => { if (vivant) toast(String(e), { icone: "⚠️" }); });
    return () => { vivant = false; };
  }, [manuel, page, images, imageDe]);

  // ── Le manuel en PDF : sur le bureau, ou là où l'on veut ──
  const pdfDuManuel = async (m: Manuel): Promise<string> => {
    const r = await api.manuelEnPdf(m.titre, m.pages.map((p) => p.fichier).filter(Boolean), m.source === "pdf" ? m.fichierPdf : null);
    if (r.illisibles.length) {
      const n = r.illisibles.length;
      toast(`Page${n > 1 ? "s" : ""} ${r.illisibles.join(", ")} laissée${n > 1 ? "s" : ""} de côté : illisible${n > 1 ? "s" : ""}.`, { icone: "⚠️", duree: 7000 });
    }
    return r.fichier;
  };
  const enregistrerLePdf = async () => {
    if (!manuel) return;
    const { save } = await import("@tauri-apps/plugin-dialog");
    const chemin = await save({ defaultPath: `${nomDeFichier(manuel.titre)}.pdf`, filters: [{ name: "PDF", extensions: ["pdf"] }] });
    if (!chemin) return;
    setOccupe("Le PDF se fabrique…");
    try {
      const fichier = await pdfDuManuel(manuel);
      await api.fichierExporter(fichier, chemin);
      api.fichierDelete(fichier).catch(() => {});
      toast(`« ${manuel.titre} » est enregistré en PDF.`, { icone: "📄" });
    } catch (e) { toast("PDF non enregistré : " + texteErreur(e), { icone: "⚠️", duree: 7000 }); }
    finally { setOccupe(""); }
  };
  // Le manuel déjà posé sur le bureau y est remplacé : refaire le PDF après de nouvelles pages n'en pose pas un second.
  const poserSurLeBureau = async () => {
    if (!manuel) throw new Error("Aucun manuel ouvert.");
    const fichier = await pdfDuManuel(manuel);
    const ancien = manuel.surLeBureau;
    const deja = ancien ? (await api.materielList()).find((x) => x.id === ancien.materielId) : undefined;
    let materiel = materielDuBureau("manuels", manuel.titre, fichier, [], newId(), nowIso());
    if (deja && ancien) {
      let pdfs: string[] = [];
      try { const lus = JSON.parse(deja.pdfsJson); if (Array.isArray(lus)) pdfs = lus.map(String); } catch { /* une liste abîmée se refait */ }
      materiel = { ...deja, titre: manuel.titre, pdfsJson: JSON.stringify(pdfs.includes(ancien.fichier) ? pdfs.map((x) => (x === ancien.fichier ? fichier : x)) : [fichier, ...pdfs]) };
    }
    await api.materielSave(materiel);
    if (ancien && ancien.fichier !== fichier) api.fichierDelete(ancien.fichier).catch(() => {});
    await enregistrer({ ...manuel, surLeBureau: { materielId: materiel.id, fichier } });
    return materiel;
  };

  // ── Les encadrés : l'enseignant trace l'exercice, le modèle en fait le modèle simplifié ──
  //
  // En deux temps : le modèle lit l'encadré — l'exercice tel qu'il est écrit —,
  // puis le simplifie d'après ce texte. Deux demandes simples réussissent mieux
  // qu'une double à un petit modèle, et la lecture se corrige avant de refaire.
  const [encadrer, setEncadrer] = React.useState(false);
  const [options, setOptions] = React.useState<OptionsReadaptation>(OPTIONS_PAR_DEFAUT);
  const [phases, setPhases] = React.useState<Record<string, "lecture" | "simplification">>({});
  const phase = (eid: string, p: "lecture" | "simplification" | null) =>
    setPhases((x) => { const { [eid]: _, ...reste } = x; return p ? { ...reste, [eid]: p } : reste; });
  const fileDesModeles = React.useRef(Promise.resolve());

  /** Simplifie un exercice lu, d'après son texte ; rend vrai si le modèle simplifié est enregistré. */
  const simplifier = async (pid: string, eid: string, o: OptionsReadaptation): Promise<boolean> => {
    const m = manuelCourant.current;
    const e = m?.pages.find((x) => x.id === pid)?.exercices.find((x) => x.id === eid);
    if (!m || !e || !estLu(e)) return false;
    phase(eid, "simplification");
    const fiche = lireFicheAdaptee(await api.mistralChat(consigneReadaptation(e, o, m.niveau), await api.modeleActif(MODELE_TACHES)));
    if (!fiche) { toast("Le modèle n'a pas renvoyé de modèle simplifié lisible : « Refaire » le redemandera.", { icone: "🤔", duree: 6000 }); return false; }
    const actuel = manuelCourant.current;
    if (actuel) await enregistrer(majDansLaPage(actuel, pid, eid, (x) => ({ ...x, modele: { fiche, options: o, faitLe: todayIso() } })));
    return true;
  };

  /** Lit l'encadré seul, puis simplifie l'exercice lu ; les demandes passent une à une. */
  const lireEtSimplifier = (pid: string, eid: string, o: OptionsReadaptation) => {
    phase(eid, "lecture");
    fileDesModeles.current = fileDesModeles.current.then(async () => {
      const m = manuelCourant.current;
      const p = m?.pages.find((x) => x.id === pid);
      const e = p?.exercices.find((x) => x.id === eid);
      if (!m || !p || !e?.zone) return;
      try {
        const lu = lireExerciceDeLEncadre(await api.mistralVision(consigneLectureEncadre(m.niveau), await pngDeLaZone(await imageDe(m, p), e.zone), await api.modeleActif()));
        if (!lu) { toast("Le modèle n'a rien lu de sûr dans cet encadré : réessayez, ou écrivez l'exercice dans « Ce que dit le manuel ».", { icone: "🤔", duree: 7000 }); return; }
        const actuel = manuelCourant.current;
        if (!actuel) return;
        await enregistrer(majDansLaPage(actuel, pid, eid, (x) => ({ ...x, ...lu })));
        await simplifier(pid, eid, o);
      } catch (err) { toast("Modèle simplifié impossible : " + texteErreur(err), { icone: "⚠️", duree: 7000 }); }
      finally { phase(eid, null); }
    });
  };
  const tracer = (z: Zone) => {
    if (!manuel || !page) return;
    const e = exerciceEncadre(z, newId());
    void enregistrer(majPage(manuel, page.id, (p) => ({ ...p, exercices: [...p.exercices, e] })));
    setExerciceId(e.id);
    lireEtSimplifier(page.id, e.id, options);
  };
  const ajuster = (id: string, z: Zone) => {
    if (!manuel || !page) return;
    void enregistrer(majDansLaPage(manuel, page.id, id, (e) => ({ ...e, zone: z })));
  };

  // ── L'exercice choisi ──
  const exercice = page?.exercices.find((e) => e.id === exerciceId) ?? null;
  // Un exercice qui a son modèle rouvre les choix avec lesquels on l'a fait.
  React.useEffect(() => { if (exercice?.modele) setOptions(exercice.modele.options); }, [exercice?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const majExercice = (patch: Partial<ExerciceManuel>) => {
    if (!manuel || !page || !exercice) return;
    void enregistrer(majDansLaPage(manuel, page.id, exercice.id, (e) => ({ ...e, ...patch })));
  };
  const retirerExercice = async () => {
    if (!manuel || !page || !exercice) return;
    if (!(await confirmer(`Retirer l'exercice « ${nomExercice(exercice)} » et son modèle simplifié ?`, { oui: "Retirer", danger: true }))) return;
    void enregistrer(majPage(manuel, page.id, (p) => ({ ...p, exercices: p.exercices.filter((e) => e.id !== exercice.id) })));
    setExerciceId("");
  };
  /** Refaire le modèle : d'après le texte lu — corrigé, peut-être —, ou en relisant l'encadré s'il n'a pas été lu. */
  const refaireLeModele = async () => {
    if (!manuel || !page || !exercice) return;
    if (!estLu(exercice)) { if (exercice.zone) lireEtSimplifier(page.id, exercice.id, options); return; }
    const eid = exercice.id;
    try { await simplifier(page.id, eid, options); }
    catch (e) { toast(texteErreur(e), { icone: "⚠️" }); }
    finally { phase(eid, null); }
  };
  /** Relire l'encadré : quand le modèle a mal lu, ou que le cadre a changé. */
  const relireLEncadre = () => { if (page && exercice?.zone) lireEtSimplifier(page.id, exercice.id, options); };
  const telQuel = () => {
    if (!exercice) return;
    majExercice({ modele: { fiche: ficheDepuisLExercice(exercice, options), options, faitLe: todayIso() } });
  };
  const majFiche = (patch: Partial<FicheAdaptee>) => {
    if (!exercice?.modele) return;
    majExercice({ modele: { ...exercice.modele, fiche: { ...exercice.modele.fiche, ...patch } } });
  };
  const majOption = (patch: Partial<OptionsReadaptation>) => setOptions((o) => ({ ...o, ...patch }));
  const imprimer = () => {
    if (!exercice?.modele || !manuel || !page) return;
    const { fiche, options: o } = exercice.modele;
    printHTML(`${fiche.titre || "Exercice adapté"} — ${manuel.titre}`,
      enteteCompetencesHtml(exercice.competences) + htmlFicheAdaptee(fiche, o, { manuel: manuel.titre, page: page.numero, numero: exercice.numero }),
      STYLE_FICHE_ADAPTEE + (exercice.competences.length ? STYLE_ENTETE_COMPETENCES : ""));
  };

  // ── La compétence du BO, que l'enseignant met sur l'exercice ──
  const [choixCompetence, setChoixCompetence] = React.useState(false);
  const [recherche, setRecherche] = React.useState("");

  /** Un exercice de la vue « par compétence », montré sur sa page. */
  const montrer = (pid: string, eid: string) => { setVue("pages"); setPageId(pid); setExerciceId(eid); };
  const fermer = () => { setManuel(null); setPageId(""); setExerciceId(""); setVue("pages"); setEncadrer(false); };

  // ── L'accueil : on choisit, puis on change d'écran ──
  //
  // Un nouveau manuel par le compagnon, par QR code ou par PDF, ou un manuel
  // déjà là : quatre portes, rien d'autre. Le manuel ouvert a l'écran pour lui.
  const fenetreDuScan = <PhotoTelephone serie sansBouton demande={demandeDeScan} onPhoto={photoRecue} onFin={finDePhotos} />;

  if (!manuel) {
    const carte = (icone: string, nom: string, quoi: string) => (
      <><span className="atelier-icone">{icone}</span><span className="atelier-nom">{nom}</span><span className="atelier-quoi">{quoi}</span></>
    );
    return (
      <div style={{ maxWidth: 1040 }}>
        {fenetreDuScan}
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>Un nouveau manuel</h3>
          <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
            Photographiez ses pages ou importez son PDF, puis encadrez-y les exercices : le modèle en fait un modèle simplifié. Tout reste sur cet ordinateur.
          </p>
          <div className="ateliers">
            <button type="button" className="atelier" onClick={() => { void scanner(commencerParPhotos); }}>
              {carte("📱", "Scanner avec le téléphone", "Un QR code s'affiche : le Dictaphone photographie les pages, chacune ajustée aussitôt ; n'importe quel téléphone peut aussi les envoyer.")}
            </button>
            <button type="button" className="atelier" disabled={!!occupe} onClick={() => entree.current?.click()}>
              {carte("📄", "Importer un PDF", occupe || "Le manuel en PDF, page à page.")}
            </button>
            <input ref={entree} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importerPdf(f); e.target.value = ""; }} />
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Ouvrir un manuel</h3>
          {index.length === 0
            ? <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>Aucun manuel encore : il apparaîtra ici dès sa première page.</p>
            : index.map((r) => (
              <div key={r.id} className="man-ligne">
                <button type="button" className="man-ouvrir" onClick={() => ouvrir(r.id)}>
                  <b>{r.titre}</b>
                  <span className="meta">{r.source === "pdf" ? "PDF" : "📱 photos"} · {r.pages} page{r.pages > 1 ? "s" : ""} · {r.exercices} exercice{r.exercices > 1 ? "s" : ""}</span>
                </button>
                <button type="button" className="btn ghost sm" aria-label={`Supprimer ${r.titre}`} onClick={() => supprimer(r)}>🗑</button>
              </div>
            ))}
        </div>
      </div>
    );
  }

  const total = manuel.pages.reduce((n, p) => n + p.exercices.length, 0);

  // ── La page du manuel ──
  return (
    <div style={{ minWidth: 0 }}>
      {fenetreDuScan}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn ghost sm" onClick={fermer} title="Revenir aux manuels">← Manuels</button>
          <Input value={manuel.titre} onChange={(e) => setManuel({ ...manuel, titre: e.target.value })} onBlur={() => enregistrer(manuel)} style={{ maxWidth: 260, fontWeight: 700 }} aria-label="Titre du manuel" />
          <Input value={manuel.niveau} onChange={(e) => setManuel({ ...manuel, niveau: e.target.value })} onBlur={() => enregistrer(manuel)} placeholder="Niveau (CP, CE2…)" style={{ maxWidth: 140 }} aria-label="Niveau" />
          <div style={{ flex: 1 }} />
          <button type="button" className="btn sm" disabled={!!occupe || manuel.pages.length === 0} onClick={enregistrerLePdf}
            title="Toutes les pages à la suite, une par feuille, là où vous voulez">📄 Enregistrer en PDF</button>
          <BoutonBureau disabled={!!occupe || manuel.pages.length === 0} onEnregistrer={poserSurLeBureau} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
          <div className="seg">
            <button className={vue === "pages" ? "active" : ""} onClick={() => setVue("pages")}>Pages</button>
            <button className={vue === "competences" ? "active" : ""} onClick={() => setVue("competences")}>
              Par compétence{total ? ` · ${total} exercice${total > 1 ? "s" : ""}` : ""}
            </button>
          </div>
          <div style={{ flex: 1 }} />
          {occupe && <span className="meta" style={{ fontSize: 12.5 }}>⏳ {occupe}</span>}
          {manuel.source === "telephone" && (
            <button type="button" className="btn sm" onClick={() => { void scanner(continuerParPhotos); }}>📱 Scanner d'autres pages</button>
          )}
        </div>
        {vue === "pages" && <div className="man-pages">
          {manuel.pages.map((p) => (
            <button key={p.id} type="button" className={`man-page${p.id === pageId ? " on" : ""}`} onClick={() => { setPageId(p.id); setExerciceId(""); }}
              title={p.exercices.length ? `${p.exercices.length} exercice${p.exercices.length > 1 ? "s" : ""} encadré${p.exercices.length > 1 ? "s" : ""}` : "Aucun exercice encadré"}>
              <span className="man-page-num">{p.numero}</span>
              <span className="man-page-etat">{p.exercices.length ? `${p.exercices.length} ex.` : "·"}</span>
            </button>
          ))}
          {manuel.pages.length === 0 && <span className="meta" style={{ fontSize: 12.5 }}>Aucune page : photographiez-les depuis le téléphone.</span>}
        </div>}
      </div>

      {vue === "competences" && <ExercicesParCompetence manuel={manuel} onMontrer={montrer} />}

      {vue === "pages" && page && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 1fr) minmax(340px, 1fr)", gap: 14, alignItems: "start" }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 13 }}>Page {page.numero}</b>
              <div style={{ flex: 1 }} />
              {manuel.source === "telephone" && (
                <button type="button" className="btn ghost sm" aria-label="Retirer cette page" onClick={async () => {
                  if (!(await confirmer(`Retirer la page ${page.numero}${page.exercices.length ? ` et ses ${page.exercices.length} exercice${page.exercices.length > 1 ? "s" : ""} encadré${page.exercices.length > 1 ? "s" : ""}` : ""} ?`, { oui: "Retirer", danger: true }))) return;
                  if (page.fichier) api.fichierDelete(page.fichier).catch(() => {});
                  const suite = retirerPage(manuel, page.id);
                  await enregistrer(suite); setPageId(suite.pages[0]?.id ?? "");
                }}>🗑</button>
              )}
            </div>
            <button type="button" className={encadrer ? "btn primary sm" : "btn sm"} style={{ width: "100%", marginBottom: 8 }}
              disabled={!images[page.id]} onClick={() => setEncadrer(!encadrer)} aria-pressed={encadrer}
              title="Tracez un cadre autour d'un exercice : le modèle en fait un modèle simplifié">
              {encadrer ? "✏️ Tracez un cadre autour d'un exercice — terminer" : "✏️ Encadrer un exercice"}
            </button>
            {images[page.id] ? (
              <PageEncadree image={images[page.id]} exercices={page.exercices} choisi={exerciceId} encadrer={encadrer}
                onChoisir={setExerciceId} onTracer={tracer} onAjuster={ajuster} />
            ) : <div style={{ aspectRatio: "3 / 4", background: "var(--panel-2)", borderRadius: 6 }} />}
            <p className="meta man-legende">
              {page.exercices.length
                ? "Cliquez un cadre pour choisir l'exercice, puis déplacez-le ou tirez ses coins. Seul l'encadré part chez Mistral."
                : "Encadrez un exercice : ce qui est dans le cadre en est un, et seul ce morceau de la page part chez Mistral."}
            </p>
          </div>

          <div style={{ minWidth: 0 }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <h3 style={{ margin: "0 0 6px", fontSize: 15 }}>Exercices de la page</h3>
              {page.exercices.length === 0 ? (
                <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>Aucun exercice encadré sur cette page.</p>
              ) : page.exercices.map((e, i) => (
                <button key={e.id} type="button" className={`man-exo${e.id === exerciceId ? " on" : ""}`} onClick={() => setExerciceId(e.id)}
                  style={{ boxShadow: e.zone ? `inset 3px 0 0 ${teinteExercice(i)}` : undefined }}>
                  <span className="man-exo-num">{TYPES_EXERCICE.find((t) => t.id === e.type)?.icone} {e.numero || i + 1}</span>
                  <span className="man-exo-texte">
                    {phases[e.id] === "lecture" ? "✨ Le modèle lit l'encadré…" : phases[e.id] === "simplification" ? "✨ Le modèle simplifie l'exercice…" : nomExercice(e)}
                    {e.competences.length > 0 && <span className="man-exo-competence">🎯 {e.competences.map(labelCourt).join(" · ")}</span>}
                  </span>
                </button>
              ))}
            </div>

            {exercice && (
              <div className="card">
                <div className="man-exercice-tete">
                  <h3>{nomExercice(exercice)}</h3>
                  <span className="meta">p. {page.numero}{exercice.numero ? ` · ex. ${exercice.numero}` : ""}</span>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn ghost sm" onClick={() => { void retirerExercice(); }}>🗑 Retirer</button>
                </div>

                <div className="man-competences">
                  {exercice.competences.map((c) => (
                    <span key={c.id} className="chip">🎯 {labelCourt(c)}
                      <button type="button" aria-label={`Retirer ${c.competenceTitre}`}
                        onClick={() => majExercice({ competences: exercice.competences.filter((x) => !memeCompetence(x, c)) })}>×</button>
                    </span>
                  ))}
                  <button type="button" className={exercice.competences.length ? "btn ghost sm" : "btn sm"} onClick={() => { setChoixCompetence(true); setRecherche(""); }}>
                    🎯 {exercice.competences.length ? "Modifier" : "Choisir la compétence du BO"}
                  </button>
                </div>

                <div className="man-modele">
                  {phases[exercice.id] ? (
                    <p className="meta" style={{ margin: 0 }}>{phases[exercice.id] === "lecture" ? "✨ Le modèle lit l'encadré…" : "✨ Le modèle simplifie l'exercice…"}</p>
                  ) : exercice.modele ? (<>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <b style={{ fontSize: 13 }}>Le modèle simplifié</b>
                      <div style={{ flex: 1 }} />
                      <button type="button" className="btn primary sm" onClick={imprimer}>🖨 Imprimer</button>
                    </div>
                    <div className="pb-apercu-page">
                      <style>{STYLE_FICHE_ADAPTEE}</style>
                      <div dangerouslySetInnerHTML={{ __html: htmlFicheAdaptee({ ...exercice.modele.fiche, items: exercice.modele.fiche.items.filter((x) => x.trim()) }, exercice.modele.options, { manuel: manuel.titre, page: page.numero, numero: exercice.numero }) }} />
                    </div>
                    <details className="pli">
                      <summary>✏️ Corriger le modèle</summary>
                      <Field label="Titre"><Input value={exercice.modele.fiche.titre} onChange={(e) => majFiche({ titre: e.target.value })} /></Field>
                      <Field label="Consigne"><Textarea value={exercice.modele.fiche.consigne} rows={2} onChange={(e) => majFiche({ consigne: e.target.value })} /></Field>
                      <Field label="Exemple (vide : pas d'exemple)"><Textarea value={exercice.modele.fiche.exemple} rows={2} onChange={(e) => majFiche({ exemple: e.target.value })} /></Field>
                      <Field label="Items (un par ligne)"><Textarea value={exercice.modele.fiche.items.join("\n")} rows={5} onChange={(e) => majFiche({ items: e.target.value.split("\n") })} /></Field>
                      <Field label="Pour l'adulte"><Textarea value={exercice.modele.fiche.aide} rows={2} onChange={(e) => majFiche({ aide: e.target.value })} /></Field>
                    </details>
                  </>) : (
                    <p className="meta" style={{ margin: 0 }}>Pas encore de modèle simplifié.</p>
                  )}
                </div>

                <details className="pli">
                  <summary>Ce qu'on change</summary>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                    <label className="pb-coche"><input type="checkbox" checked={options.simplifier} onChange={(e) => majOption({ simplifier: e.target.checked })} /><span>Consigne simplifiée : une action, des mots connus</span></label>
                    <label className="pb-coche"><input type="checkbox" checked={options.exemple} onChange={(e) => majOption({ exemple: e.target.checked })} /><span>Un exemple fait</span></label>
                    <label className="pb-coche"><input type="checkbox" checked={options.zonesReponse} onChange={(e) => majOption({ zonesReponse: e.target.checked })} /><span>Une ligne pour chaque réponse</span></label>
                    <label className="pb-coche"><input type="checkbox" checked={options.grosCaracteres} onChange={(e) => majOption({ grosCaracteres: e.target.checked })} /><span>Gros caractères, aéré</span></label>
                    <label className="pb-coche"><input type="checkbox" checked={options.etapes} onChange={(e) => majOption({ etapes: e.target.checked })} /><span>La tâche en étapes</span></label>
                    <label className="pb-coche" style={{ alignItems: "center" }}>
                      <span>Garder</span>
                      <Input type="number" min={0} max={20} value={options.items} onChange={(e) => majOption({ items: Math.max(0, Math.min(20, Number(e.target.value) || 0)) })} style={{ width: 60, margin: "0 6px" }} aria-label="Nombre d'items" />
                      <span>items (0 : tous)</span>
                    </label>
                  </div>
                  <Input value={options.precision} onChange={(e) => majOption({ precision: e.target.value })} placeholder="Précision pour le modèle : avec des jetons, nombres jusqu'à 20…" style={{ marginTop: 6 }} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button type="button" className="btn primary sm" disabled={!!phases[exercice.id]} onClick={() => { void refaireLeModele(); }}>✨ Refaire le modèle simplifié</button>
                    <button type="button" className="btn sm" disabled={!estLu(exercice)} onClick={telQuel} title="Sans le modèle : la consigne et les items tels quels, mis en page">📝 Tel quel</button>
                  </div>
                </details>

                <details className="pli">
                  <summary>Ce que dit le manuel <span className="meta">· ce que le modèle a lu, à corriger s'il s'est trompé</span></summary>
                  <div className="row">
                    <Field label="Numéro"><Input value={exercice.numero} onChange={(e) => majExercice({ numero: e.target.value })} style={{ maxWidth: 150 }} /></Field>
                    <Field label="Type">
                      <Select value={exercice.type} onChange={(e) => majExercice({ type: e.target.value as ExerciceManuel["type"] })}>
                        {TYPES_EXERCICE.map((t) => <option key={t.id} value={t.id}>{t.icone} {t.libelle}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <Field label="Titre"><Input value={exercice.titre} onChange={(e) => majExercice({ titre: e.target.value })} /></Field>
                  <Field label="Consigne (une par ligne)"><Textarea value={exercice.consigne} rows={3} onChange={(e) => majExercice({ consigne: e.target.value })} /></Field>
                  <Field label="Contenu (un item par ligne)"><Textarea value={exercice.contenu} rows={4} onChange={(e) => majExercice({ contenu: e.target.value })} /></Field>
                  {exercice.zone && (
                    <button type="button" className="btn sm" disabled={!!phases[exercice.id]} onClick={relireLEncadre}
                      title="Le modèle relit le cadre — après l'avoir agrandi, par exemple —, puis refait le modèle simplifié">🔎 Relire l'encadré</button>
                  )}
                </details>

                {choixCompetence && (
                  <Modal titre={`🎯 « ${nomExercice(exercice)} »`} onClose={() => setChoixCompetence(false)} large
                    footer={<button className="btn primary" onClick={() => setChoixCompetence(false)}>Terminé</button>}>
                    <Input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)}
                      placeholder="Chercher une compétence (ex. : accord, sujet, verbe…)" aria-label="Chercher une compétence" />
                    <div style={{ maxHeight: "52vh", overflowY: "auto", marginTop: 8 }}>
                      <CompetenceTree mode="multi" selection={exercice.competences} recherche={recherche}
                        onToggle={(c) => majExercice({ competences: basculerCompetence(exercice.competences, c) })} />
                    </div>
                    <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
                      L'exercice s'offrira dans les séquences qui visent cette compétence, prêt à poser dans une séance.
                    </div>
                  </Modal>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Les exercices du manuel, par compétence ────────────────────────────────

function ExercicesParCompetence({ manuel, onMontrer }: { manuel: Manuel; onMontrer: (pageId: string, exerciceId: string) => void }) {
  const { groupes, sans } = exercicesParCompetence(manuel);
  const ligne = ({ page, exercice: e }: { page: PageManuel; exercice: ExerciceManuel }) => (
    <li key={`${page.id}:${e.id}`} className="man-liste-exo">
      <button type="button" className="man-ou" onClick={() => onMontrer(page.id, e.id)} title="Voir l'exercice sur sa page">
        p. {page.numero}{e.numero ? ` · ${e.numero}` : ""}
      </button>
      <span className="man-liste-nom">{nomExercice(e)}</span>
      {e.modele && <span className="meta" title="Il a son modèle simplifié">✨</span>}
    </li>
  );
  return (
    <div className="card">
      <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Les exercices par compétence</h3>
      <p className="meta" style={{ fontSize: 12.5, margin: "0 0 6px" }}>
        Chaque exercice s'offre dans les séquences qui visent sa compétence, prêt à poser dans une séance.
      </p>
      {groupes.map((g) => (
        <section key={`${g.competence.referentielNom}|${g.competence.competenceRefId ?? g.competence.competenceTitre}`} className="man-par-competence">
          <h4>🎯 {labelCourt(g.competence)} <span className="meta">· {g.exercices.length}</span></h4>
          <ul className="man-liste-exos">{g.exercices.map(ligne)}</ul>
        </section>
      ))}
      {sans.length > 0 && (
        <section className="man-par-competence">
          <h4>Sans compétence <span className="meta">· {sans.length}</span></h4>
          <ul className="man-liste-exos">{sans.map(ligne)}</ul>
        </section>
      )}
      {!groupes.length && !sans.length && (
        <p className="meta" style={{ fontSize: 12.5 }}>Aucun exercice encadré : sur une page, « ✏️ Encadrer un exercice ».</p>
      )}
    </div>
  );
}
