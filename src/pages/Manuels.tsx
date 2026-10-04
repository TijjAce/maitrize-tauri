import React from "react";
import { MODELE_TACHES, api, newId, nowIso, texteErreur } from "../api";
import { Field, Input, Modal, Select, Textarea, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { BoutonBureau } from "../components/BoutonBureau";
import { CompetenceTree, labelCourt } from "../components/CompetenceTree";
import { basculerCompetence, memeCompetence } from "../ateliersCompetences";
import { STYLE_ENTETE_COMPETENCES, enteteCompetencesHtml, materielDuBureau } from "../impressionAtelier";
import { printHTML } from "../print";
import { nombreDePages, octetsDuFichier, rendrePage } from "../pdfRendu";
import {
  CLE_INDEX, DOMAINES_MANUEL, OPTIONS_PAR_DEFAUT, PAR_LOT, STYLE_FICHE_ADAPTEE, TYPES_EXERCICE, ajouterPagePhoto, appliquerClassement,
  classementDeLaReponse, cleManuel, consigneClassement, consigneExtraction, consigneReadaptation, ecrireManuel, exercicesAClasser,
  exercicesDeLaNotion, ficheDepuisLExercice, htmlFicheAdaptee, indexAvec, indexSans, lireExercices, lireFicheAdaptee, lireIndex, lireManuel,
  notionsRangees, nouveauManuel, retirerPage, texteExercice, type ExerciceAClasser, type ExerciceManuel, type FicheAdaptee, type Manuel,
  type NotionManuel, type OptionsReadaptation, type PageManuel, type ResumeManuel,
} from "../manuels";

// ── Adapter une fiche › Manuels ───────────────────────────────────────────
//
// Un manuel entier, photographié page à page avec le téléphone ou importé en
// PDF ; le modèle relit ses exercices ; l'enseignant en réadapte un et
// l'imprime. Les images restent ici ; une page ne part chez le modèle que
// quand on lui demande de la relire.
//
// Le manuel se range aussi : en PDF, sur le bureau ou là où l'on veut ; et
// ses exercices par notion, dans « Classement », où l'enseignant met sur
// chaque notion la compétence du BO qu'il veut.

const todayIso = () => new Date().toISOString().slice(0, 10);

/** Une image (data URL) ramenée à une taille raisonnable, en PNG base64 : un manuel photographié à 12 Mpx n'a pas besoin d'y aller. */
async function pngReduit(dataUrl: string, maxCote = 1600): Promise<string> {
  const img = new Image();
  await new Promise<void>((ok, ko) => { img.onload = () => ok(); img.onerror = () => ko(new Error("Image illisible")); img.src = dataUrl; });
  const echelle = Math.min(1, maxCote / Math.max(img.width, img.height));
  const toile = document.createElement("canvas");
  toile.width = Math.max(1, Math.round(img.width * echelle));
  toile.height = Math.max(1, Math.round(img.height * echelle));
  const ctx = toile.getContext("2d");
  if (!ctx) throw new Error("Rendu impossible dans cette fenêtre.");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, toile.width, toile.height);
  ctx.drawImage(img, 0, 0, toile.width, toile.height);
  const url = toile.toDataURL("image/png");
  return url.slice(url.indexOf(",") + 1);
}

const mimeDe = (fichier: string) => (fichier.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");

/** Un titre qui peut nommer un fichier : sans les signes que Finder ou Windows refusent. */
const nomDeFichier = (titre: string) => titre.replace(/[\\/:*?"<>|]+/g, "-").trim() || "Manuel";

/** Le choix « nouvelle notion » dans la liste où l'on range un exercice. */
const NOUVELLE = "+nouvelle";

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

export function ManuelsPanel() {
  const { data: indexBrut, reload: relireIndex } = useAsync(() => api.settingGet(CLE_INDEX), []);
  const index = React.useMemo(() => lireIndex(indexBrut), [indexBrut]);
  const [manuel, setManuel] = React.useState<Manuel | null>(null);
  const [pageId, setPageId] = React.useState("");
  const [exerciceId, setExerciceId] = React.useState("");
  const [vue, setVue] = React.useState<"pages" | "classement">("pages");
  const [occupe, setOccupe] = React.useState("");
  const arret = React.useRef(false);
  // Les octets des PDF et les images des pages, gardés le temps de la visite.
  const pdfs = React.useRef(new Map<string, Uint8Array>());
  const [images, setImages] = React.useState<Record<string, string>>({});
  const entree = React.useRef<HTMLInputElement>(null);

  const enregistrer = React.useCallback(async (m: Manuel) => {
    setManuel(m);
    await api.settingSet(cleManuel(m.id), ecrireManuel(m));
    await api.settingSet(CLE_INDEX, JSON.stringify(indexAvec(lireIndex(await api.settingGet(CLE_INDEX)), m)));
    relireIndex();
  }, [relireIndex]);

  const ouvrir = async (id: string) => {
    const m = lireManuel(await api.settingGet(cleManuel(id)));
    if (!m) { toast("Ce manuel ne se relit pas.", { icone: "⚠️" }); return; }
    setManuel(m); setPageId(m.pages[0]?.id ?? ""); setExerciceId(""); setVue("pages");
  };

  const supprimer = async (r: ResumeManuel) => {
    if (!(await confirmer(`Supprimer le manuel « ${r.titre} » et ses ${r.pages} page${r.pages > 1 ? "s" : ""} ? Les exercices relus partent avec.`, { oui: "Supprimer", danger: true }))) return;
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
      pdfs.current.set(m.id, octets);
      await enregistrer(m);
      setPageId(m.pages[0]?.id ?? ""); setExerciceId("");
      toast(`${n} page${n > 1 ? "s" : ""} importée${n > 1 ? "s" : ""}.`, { icone: "📚" });
    } catch (e: any) { toast("PDF illisible : " + String(e?.message ?? e), { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };

  // ── L'image d'une page ──
  const imageDe = React.useCallback(async (m: Manuel, p: PageManuel): Promise<string> => {
    if (images[p.id]) return images[p.id];
    let url: string;
    if (p.fichier) url = `data:${mimeDe(p.fichier)};base64,${await api.fichierRead(p.fichier)}`;
    else {
      let octets = pdfs.current.get(m.id);
      if (!octets) {
        const b64 = await api.fichierRead(m.fichierPdf);
        octets = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        pdfs.current.set(m.id, octets);
      }
      url = `data:image/png;base64,${(await rendrePage(octets, p.numero)).image}`;
    }
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

  // ── Relire les exercices ──
  const relire = async (m: Manuel, p: PageManuel): Promise<Manuel> => {
    const url = await imageDe(m, p);
    const b64 = await pngReduit(url);
    const reponse = await api.mistralVision(consigneExtraction(m.niveau), b64);
    const exercices = lireExercices(reponse);
    const suite = { ...m, pages: m.pages.map((x) => (x.id === p.id ? { ...x, exercices, extraitLe: todayIso() } : x)) };
    await enregistrer(suite);
    return suite;
  };
  const relirePage = async () => {
    if (!manuel || !page) return;
    setOccupe("Le modèle relit la page…");
    try { const m = await relire(manuel, page); setExerciceId(m.pages.find((x) => x.id === page.id)?.exercices[0]?.id ?? ""); }
    catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };
  const relireTout = async () => {
    if (!manuel) return;
    arret.current = false;
    let m = manuel;
    const restantes = m.pages.filter((p) => !p.extraitLe);
    let faites = 0;
    try {
      for (const p of restantes) {
        if (arret.current) break;
        setOccupe(`Le modèle relit la page ${p.numero} (${faites + 1}/${restantes.length})…`);
        m = await relire(m, m.pages.find((x) => x.id === p.id)!);
        faites++;
      }
      toast(`${faites} page${faites > 1 ? "s" : ""} relue${faites > 1 ? "s" : ""}${arret.current ? " — arrêté" : ""}.`, { icone: "📚" });
    } catch (e) { toast(`Arrêté à la page suivante : ${e}`, { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };

  // ── Réadapter ──
  const [options, setOptions] = React.useState<OptionsReadaptation>(OPTIONS_PAR_DEFAUT);
  const [fiche, setFiche] = React.useState<FicheAdaptee | null>(null);
  const exercice = page?.exercices.find((e) => e.id === exerciceId) ?? null;
  React.useEffect(() => { setFiche(null); }, [exerciceId]);
  const readapter = async () => {
    if (!exercice || !manuel) return;
    setOccupe("Le modèle réécrit l'exercice…");
    try {
      const reponse = await api.mistralChat(consigneReadaptation(exercice, options, manuel.niveau));
      const f = lireFicheAdaptee(reponse);
      if (!f) { toast("Le modèle n'a pas renvoyé de fiche lisible ; réessayez.", { icone: "⚠️" }); return; }
      setFiche(f);
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(""); }
  };
  // La notion de l'exercice, et la compétence du BO qu'on y a mise : elle s'imprime en tête de la fiche.
  const notionDe = (e: ExerciceManuel | null) => (e && manuel ? manuel.notions.find((n) => n.id === e.notion) ?? null : null);
  const imprimer = () => {
    if (!fiche || !manuel || !page) return;
    const competences = notionDe(exercice)?.competences ?? [];
    printHTML(`${fiche.titre || "Exercice adapté"} — ${manuel.titre}`,
      enteteCompetencesHtml(competences) + htmlFicheAdaptee(fiche, options, { manuel: manuel.titre, page: page.numero, numero: exercice?.numero ?? "" }),
      STYLE_FICHE_ADAPTEE + (competences.length ? STYLE_ENTETE_COMPETENCES : ""));
  };
  const majFiche = (patch: Partial<FicheAdaptee>) => setFiche((f) => (f ? { ...f, ...patch } : f));
  const majOption = (patch: Partial<OptionsReadaptation>) => setOptions((o) => ({ ...o, ...patch }));

  const majExercice = (patch: Partial<ExerciceManuel>) => {
    if (!manuel || !page || !exercice) return;
    void enregistrer({ ...manuel, pages: manuel.pages.map((p) => (p.id === page.id ? { ...p, exercices: p.exercices.map((e) => (e.id === exercice.id ? { ...e, ...patch } : e)) } : p)) });
  };
  const retirerExercice = () => {
    if (!manuel || !page || !exercice) return;
    void enregistrer({ ...manuel, pages: manuel.pages.map((p) => (p.id === page.id ? { ...p, exercices: p.exercices.filter((e) => e.id !== exercice.id) } : p)) });
    setExerciceId("");
  };
  const ajouterExercice = () => {
    if (!manuel || !page) return;
    const e: ExerciceManuel = { id: crypto.randomUUID(), numero: "", consigne: "", contenu: "", type: "autre", notion: "" };
    void enregistrer({ ...manuel, pages: manuel.pages.map((p) => (p.id === page.id ? { ...p, exercices: [...p.exercices, e] } : p)) });
    setExerciceId(e.id);
  };

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

  // ── Le classement : relire ce qui ne l'est pas, puis ranger par notion ──
  const classer = async () => {
    if (!manuel) return;
    arret.current = false;
    let m = manuel;
    try {
      // On ne classe que ce qu'on a lu : les pages pas encore relues passent d'abord.
      const restantes = m.pages.filter((p) => !p.extraitLe);
      for (const [i, p] of restantes.entries()) {
        if (arret.current) break;
        setOccupe(`Le modèle relit la page ${p.numero} (${i + 1}/${restantes.length})…`);
        m = await relire(m, m.pages.find((x) => x.id === p.id)!);
      }
      const aClasser = exercicesAClasser(m);
      const modele = await api.modeleActif(MODELE_TACHES);
      let illisibles = 0;
      for (let debut = 0; debut < aClasser.length && !arret.current; debut += PAR_LOT) {
        const lot = aClasser.slice(debut, debut + PAR_LOT);
        setOccupe(`Le modèle classe les exercices (${Math.min(debut + PAR_LOT, aClasser.length)}/${aClasser.length})…`);
        const notions = m.notions;
        const groupes = classementDeLaReponse(await api.mistralChat(consigneClassement(m, lot, notions), modele), lot.length, notions.length);
        if (!groupes.length) illisibles++;
        m = appliquerClassement(m, lot, groupes, notions);
        await enregistrer(m);
      }
      const restent = exercicesAClasser(m).length;
      toast([
        `${m.notions.length} notion${m.notions.length > 1 ? "s" : ""}`,
        restent ? `${restent} exercice${restent > 1 ? "s" : ""} encore à classer${illisibles ? " (réponse illisible : relancez)" : ""}` : "",
        arret.current ? "arrêté" : "",
      ].filter(Boolean).join(", ") + ". Donnez à chacune sa compétence du BO.", { icone: "🗂", duree: 7000 });
    } catch (e) { toast("Classement interrompu : " + texteErreur(e), { icone: "⚠️", duree: 7000 }); }
    finally { setOccupe(""); }
  };
  /** Un exercice du classement, montré sur sa page. */
  const montrer = (id: string) => {
    const p = manuel?.pages.find((x) => x.exercices.some((e) => e.id === id));
    if (!p) return;
    setVue("pages"); setPageId(p.id); setExerciceId(id);
  };

  const aRelire = manuel?.pages.filter((p) => !p.extraitLe).length ?? 0;
  const fermer = () => { setManuel(null); setPageId(""); setExerciceId(""); setFiche(null); setVue("pages"); };

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
            Photographiez ses pages ou importez son PDF : le manuel s'ouvre, et le modèle relit ses exercices quand vous le lui demandez. Tout reste sur cet ordinateur.
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
            <button className={vue === "classement" ? "active" : ""} onClick={() => setVue("classement")}>
              Classement{manuel.notions.length ? ` · ${manuel.notions.length} notion${manuel.notions.length > 1 ? "s" : ""}` : ""}
            </button>
          </div>
          <div style={{ flex: 1 }} />
          {manuel.source === "telephone" && (<>
            <button type="button" className="btn sm" onClick={() => { void scanner(continuerParPhotos); }}>📱 Scanner d'autres pages</button>
          </>)}
          {occupe ? (
            <button type="button" className="btn sm" onClick={() => { arret.current = true; }}>⏹ {occupe}</button>
          ) : vue === "pages" && (
            <button type="button" className="btn sm" disabled={aRelire === 0} onClick={relireTout} title="Chaque page part chez Mistral, l'une après l'autre">
              {aRelire === 0 ? "✓ Toutes les pages sont relues" : aRelire === 1 ? "🔎 Relire la page restante" : `🔎 Relire les ${aRelire} pages restantes`}
            </button>
          )}
        </div>
        {vue === "pages" && <div className="man-pages">
          {manuel.pages.map((p) => (
            <button key={p.id} type="button" className={`man-page${p.id === pageId ? " on" : ""}`} onClick={() => { setPageId(p.id); setExerciceId(""); }}
              title={p.extraitLe ? `${p.exercices.length} exercice${p.exercices.length > 1 ? "s" : ""}` : "Pas encore relue"}>
              <span className="man-page-num">{p.numero}</span>
              <span className="man-page-etat">{p.extraitLe ? `${p.exercices.length} ex.` : "·"}</span>
            </button>
          ))}
          {manuel.pages.length === 0 && <span className="meta" style={{ fontSize: 12.5 }}>Aucune page : photographiez-les depuis le téléphone.</span>}
        </div>}
      </div>

      {vue === "classement" && (
        <ClassementDuManuel manuel={manuel} enregistrer={enregistrer} occupe={occupe} aLire={aRelire} onClasser={() => { void classer(); }} onMontrer={montrer} />
      )}

      {vue === "pages" && page && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 300px) 1fr", gap: 14, alignItems: "start" }}>
          <div className="card">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <b style={{ fontSize: 13 }}>Page {page.numero}</b>
              <div style={{ flex: 1 }} />
              {manuel.source === "telephone" && (
                <button type="button" className="btn ghost sm" aria-label="Retirer cette page" onClick={async () => {
                  if (!(await confirmer(`Retirer la page ${page.numero} ?`, { oui: "Retirer", danger: true }))) return;
                  if (page.fichier) api.fichierDelete(page.fichier).catch(() => {});
                  const suite = retirerPage(manuel, page.id);
                  await enregistrer(suite); setPageId(suite.pages[0]?.id ?? "");
                }}>🗑</button>
              )}
            </div>
            {images[page.id] ? <img src={images[page.id]} alt="" style={{ width: "100%", borderRadius: 6, border: "1px solid var(--border)" }} />
              : <div style={{ aspectRatio: "3 / 4", background: "var(--panel-2)", borderRadius: 6 }} />}
            <button type="button" className="btn primary sm" style={{ width: "100%", marginTop: 10 }} disabled={!!occupe || !images[page.id]} onClick={relirePage}>
              {page.extraitLe ? "🔎 Relire cette page" : "🔎 Récupérer les exercices"}
            </button>
            <p className="meta" style={{ fontSize: 11.5, lineHeight: 1.5, margin: "8px 0 0" }}>L'image de la page part chez Mistral, réduite ; les exercices reviennent en texte, à corriger si besoin.</p>
          </div>

          <div style={{ minWidth: 0 }}>
            <div className="card" style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <h3 style={{ margin: 0, fontSize: 15 }}>Exercices de la page</h3>
                <span className="meta" style={{ fontSize: 12 }}>{page.extraitLe ? `relue le ${page.extraitLe.split("-").reverse().join("/")}` : "pas encore relue"}</span>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn sm" onClick={ajouterExercice}>＋ Exercice à la main</button>
              </div>
              {page.exercices.length === 0 ? (
                <p className="meta" style={{ fontSize: 12.5, margin: 0 }}>{page.extraitLe ? "Le modèle n'a trouvé aucun exercice sur cette page." : "Récupérez les exercices : ils s'afficheront ici."}</p>
              ) : page.exercices.map((e) => (
                <button key={e.id} type="button" className={`man-exo${e.id === exerciceId ? " on" : ""}`} onClick={() => setExerciceId(e.id)}>
                  <span className="man-exo-num">{TYPES_EXERCICE.find((t) => t.id === e.type)?.icone} {e.numero || "—"}</span>
                  <span className="man-exo-texte">
                    {texteExercice({ ...e, numero: "" }).slice(0, 140)}
                    {notionDe(e) && <span className="man-exo-notion">🗂 {notionDe(e)!.titre}</span>}
                  </span>
                </button>
              ))}
            </div>

            {exercice && (
              <div className="card">
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                  <h3 style={{ margin: 0, fontSize: 15 }}>✨ Réadapter l'exercice {exercice.numero}</h3>
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn ghost sm" onClick={retirerExercice}>🗑 Retirer</button>
                </div>
                <div className="row">
                  <Field label="Numéro"><Input value={exercice.numero} onChange={(e) => majExercice({ numero: e.target.value })} style={{ maxWidth: 90 }} /></Field>
                  <Field label="Type">
                    <Select value={exercice.type} onChange={(e) => majExercice({ type: e.target.value as ExerciceManuel["type"] })}>
                      {TYPES_EXERCICE.map((t) => <option key={t.id} value={t.id}>{t.icone} {t.libelle}</option>)}
                    </Select>
                  </Field>
                  <Field label="Notion">
                    <Select value={notionDe(exercice)?.id ?? ""} onChange={(e) => majExercice({ notion: e.target.value })}>
                      <option value="">À classer</option>
                      {notionsRangees(manuel).map((n) => <option key={n.id} value={n.id}>{n.titre}</option>)}
                    </Select>
                  </Field>
                </div>
                {(notionDe(exercice)?.competences.length ?? 0) > 0 && (
                  <div className="man-notion-competences" style={{ marginBottom: 10 }}>
                    {notionDe(exercice)!.competences.map((c) => <span key={c.id} className="chip">🎯 {labelCourt(c)}</span>)}
                  </div>
                )}
                <Field label="Consigne du manuel"><Textarea value={exercice.consigne} rows={2} onChange={(e) => majExercice({ consigne: e.target.value })} /></Field>
                <Field label="Contenu (un item par ligne)"><Textarea value={exercice.contenu} rows={4} onChange={(e) => majExercice({ contenu: e.target.value })} /></Field>

                <Field label="Ce qu'on change">
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
                </Field>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn primary sm" disabled={!!occupe} onClick={readapter}>{occupe === "Le modèle réécrit l'exercice…" ? occupe : "✨ Réadapter avec Mistral"}</button>
                  <button type="button" className="btn sm" onClick={() => setFiche(ficheDepuisLExercice(exercice, options))} title="Sans le modèle : la consigne et les items tels quels, mis en page">📝 Mettre en page tel quel</button>
                </div>

                {fiche && (
                  <div style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <b style={{ fontSize: 13 }}>La fiche — à relire et corriger</b>
                      <div style={{ flex: 1 }} />
                      <button type="button" className="btn primary sm" onClick={imprimer}>🖨 Imprimer la fiche</button>
                    </div>
                    <div className="row">
                      <Field label="Titre"><Input value={fiche.titre} onChange={(e) => majFiche({ titre: e.target.value })} /></Field>
                    </div>
                    <Field label="Consigne"><Textarea value={fiche.consigne} rows={2} onChange={(e) => majFiche({ consigne: e.target.value })} /></Field>
                    <Field label="Exemple (vide : pas d'exemple)"><Textarea value={fiche.exemple} rows={2} onChange={(e) => majFiche({ exemple: e.target.value })} /></Field>
                    <Field label="Items (un par ligne)"><Textarea value={fiche.items.join("\n")} rows={5} onChange={(e) => majFiche({ items: e.target.value.split("\n") })} /></Field>
                    <Field label="Pour l'adulte"><Textarea value={fiche.aide} rows={2} onChange={(e) => majFiche({ aide: e.target.value })} /></Field>
                    <div className="pb-apercu-page">
                      <style>{STYLE_FICHE_ADAPTEE}</style>
                      <div dangerouslySetInnerHTML={{ __html: htmlFicheAdaptee({ ...fiche, items: fiche.items.filter((x) => x.trim()) }, options, { manuel: manuel.titre, page: page.numero, numero: exercice.numero }) }} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Le classement : les exercices de tout le manuel, par notion ────────────
//
// Le modèle range ; l'enseignant relit, déplace un exercice mal rangé,
// renomme une notion, et met sur chacune la compétence du BO qu'il veut —
// tous les exercices de la notion la portent.

function ClassementDuManuel({ manuel, enregistrer, occupe, aLire, onClasser, onMontrer }: {
  manuel: Manuel;
  enregistrer: (m: Manuel) => Promise<void>;
  occupe: string;
  /** Les pages pas encore relues : le classement les relit d'abord. */
  aLire: number;
  onClasser: () => void;
  onMontrer: (exerciceId: string) => void;
}) {
  const [choix, setChoix] = React.useState("");
  const [recherche, setRecherche] = React.useState("");
  const notions = notionsRangees(manuel);
  const aClasser = exercicesAClasser(manuel);
  const total = manuel.pages.reduce((n, p) => n + p.exercices.length, 0);
  const choisie = manuel.notions.find((n) => n.id === choix) ?? null;
  const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

  const majNotion = (id: string, patch: Partial<NotionManuel>) =>
    void enregistrer({ ...manuel, notions: manuel.notions.map((n) => (n.id === id ? { ...n, ...patch } : n)) });

  const ranger = (exerciceId: string, vers: string) => {
    let suite = manuel;
    let cible = vers;
    if (vers === NOUVELLE) {
      const e = manuel.pages.flatMap((p) => p.exercices).find((x) => x.id === exerciceId);
      const nouvelle: NotionManuel = { id: newId(), titre: (e?.consigne ?? "").slice(0, 60).trim() || "Nouvelle notion", domaine: "Autre", competences: [] };
      suite = { ...suite, notions: [...suite.notions, nouvelle] };
      cible = nouvelle.id;
    }
    void enregistrer({ ...suite, pages: suite.pages.map((p) => ({ ...p, exercices: p.exercices.map((e) => (e.id === exerciceId ? { ...e, notion: cible } : e)) })) });
  };

  const retirer = async (n: NotionManuel) => {
    const nb = exercicesDeLaNotion(manuel, n.id).length;
    const question = `Retirer la notion « ${n.titre} » ? ${nb ? `Ses ${pluriel(nb, "exercice")} redeviennent à classer` : "Elle n'a plus d'exercice"}${n.competences.length ? ", et ses compétences partent avec elle" : ""}.`;
    if (!(await confirmer(question, { oui: "Retirer", danger: true }))) return;
    void enregistrer({
      ...manuel, notions: manuel.notions.filter((x) => x.id !== n.id),
      pages: manuel.pages.map((p) => ({ ...p, exercices: p.exercices.map((e) => (e.notion === n.id ? { ...e, notion: "" } : e)) })),
    });
  };

  const ligne = ({ page, exercice: e }: ExerciceAClasser) => (
    <li key={e.id} className="man-notion-exo">
      <button type="button" className="man-notion-ou" onClick={() => onMontrer(e.id)} title="Voir l'exercice sur sa page">
        p. {page}{e.numero ? ` · ${e.numero}` : ""}
      </button>
      <span className="man-notion-consigne">{e.consigne}</span>
      <Select className="select man-ranger" value={notions.some((n) => n.id === e.notion) ? e.notion : ""}
        onChange={(ev) => ranger(e.id, ev.target.value)} aria-label="Ranger dans une autre notion">
        <option value="">À classer</option>
        {notions.map((n) => <option key={n.id} value={n.id}>{n.titre}</option>)}
        <option value={NOUVELLE}>＋ Nouvelle notion</option>
      </Select>
    </li>
  );

  const libelle = aLire
    ? `✨ Relire ${pluriel(aLire, "page")}, puis classer`
    : aClasser.length ? `✨ Classer ${pluriel(aClasser.length, "exercice")}` : "✓ Tout est classé";
  const domaines = [...new Set(notions.map((n) => n.domaine))];

  return (
    <div style={{ minWidth: 0 }}>
      <div className="card man-classement-tete">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>Le classement des exercices</h3>
          <span className="meta" style={{ fontSize: 12.5 }}>
            {pluriel(total, "exercice")} · {pluriel(notions.length, "notion")}{aClasser.length ? ` · ${aClasser.length} à classer` : ""}
          </span>
        </div>
        <button type="button" className="btn primary sm" disabled={!!occupe || (!aLire && !aClasser.length)} onClick={onClasser}
          title="Le modèle range les exercices par notion ; la compétence du BO, c'est vous qui la donnez">{libelle}</button>
      </div>

      {domaines.map((d) => (
        <section key={d} className="man-domaine">
          <h4>{d}</h4>
          {notions.filter((n) => n.domaine === d).map((n) => (
            <div key={n.id} className="card man-notion">
              <div className="man-notion-tete">
                <Input key={`${n.id}:${n.titre}`} defaultValue={n.titre} aria-label="Titre de la notion"
                  onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== n.titre) majNotion(n.id, { titre: v }); }} />
                <Select value={n.domaine} onChange={(e) => majNotion(n.id, { domaine: e.target.value })} aria-label="Domaine">
                  {DOMAINES_MANUEL.map((x) => <option key={x} value={x}>{x}</option>)}
                </Select>
                <button type="button" className="btn ghost sm" aria-label={`Retirer la notion ${n.titre}`} onClick={() => { void retirer(n); }}>🗑</button>
              </div>
              <div className="man-notion-competences">
                {n.competences.map((c) => (
                  <span key={c.id} className="chip">🎯 {labelCourt(c)}
                    <button type="button" aria-label={`Retirer ${c.competenceTitre}`}
                      onClick={() => majNotion(n.id, { competences: n.competences.filter((x) => !memeCompetence(x, c)) })}>×</button>
                  </span>
                ))}
                <button type="button" className={n.competences.length ? "btn ghost sm" : "btn sm"} onClick={() => { setChoix(n.id); setRecherche(""); }}>
                  🎯 {n.competences.length ? "Modifier" : "Choisir la compétence du BO"}
                </button>
              </div>
              <ul className="man-notion-exos">{exercicesDeLaNotion(manuel, n.id).map(ligne)}</ul>
            </div>
          ))}
        </section>
      ))}

      {aClasser.length > 0 && (
        <section className="man-domaine">
          <h4>À classer</h4>
          <div className="card man-notion"><ul className="man-notion-exos">{aClasser.map(ligne)}</ul></div>
        </section>
      )}

      {!total && !aLire && (
        <p className="meta" style={{ fontSize: 12.5 }}>Aucun exercice relu : photographiez des pages, et le classement les rangera.</p>
      )}

      {choisie && (
        <Modal titre={`🎯 « ${choisie.titre} »`} onClose={() => setChoix("")} large
          footer={<button className="btn primary" onClick={() => setChoix("")}>Terminé</button>}>
          <Input autoFocus value={recherche} onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher une compétence (ex. : accord, sujet, verbe…)" aria-label="Chercher une compétence" />
          <div style={{ maxHeight: "52vh", overflowY: "auto", marginTop: 8 }}>
            <CompetenceTree mode="multi" selection={choisie.competences} recherche={recherche}
              onToggle={(c) => majNotion(choisie.id, { competences: basculerCompetence(choisie.competences, c) })} />
          </div>
          <div className="meta" style={{ fontSize: 12.5, marginTop: 6 }}>
            Les {pluriel(exercicesDeLaNotion(manuel, choisie.id).length, "exercice")} de cette notion la porteront, jusque sur leur fiche imprimée.
          </div>
        </Modal>
      )}
    </div>
  );
}
