import React from "react";
import { listen } from "@tauri-apps/api/event";
import { api, type PortableInfo } from "../api";
import { Field, Input, Modal, Select, Textarea, useAsync } from "../components/ui";
import { lirePartage, ouvrirPartage } from "../partageWifi";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { printHTML } from "../print";
import { nombreDePages, octetsDuFichier, rendrePage } from "../pdfRendu";
import {
  CLE_INDEX, OPTIONS_PAR_DEFAUT, STYLE_FICHE_ADAPTEE, TYPES_EXERCICE, ajouterPagePhoto, cleManuel, consigneExtraction, consigneReadaptation,
  ecrireManuel, ficheDepuisLExercice, htmlFicheAdaptee, indexAvec, indexSans, lireExercices, lireFicheAdaptee, lireIndex, lireManuel,
  nouveauManuel, retirerPage, texteExercice, type ExerciceManuel, type FicheAdaptee, type Manuel, type OptionsReadaptation, type PageManuel,
  type ResumeManuel,
} from "../manuels";

// ── Adapter une fiche › Manuels ───────────────────────────────────────────
//
// Un manuel entier, photographié page à page avec le téléphone ou importé en
// PDF ; le modèle relit ses exercices ; l'enseignant en réadapte un et
// l'imprime. Les images restent ici ; une page ne part chez le modèle que
// quand on lui demande de la relire.

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

/**
 * Les pages scannées par le compagnon iPhone.
 *
 * Le téléphone scanne comme Notes, puis envoie ; ici on attend, on compte,
 * et l'on range chaque page dans le manuel. Il faut que le partage WiFi soit
 * ouvert : c'est par lui que le téléphone parle à l'ordinateur.
 */
function ScanCompagnon({ label, className = "btn", avantDOuvrir, onPage, onFin }: {
  label: string; className?: string;
  avantDOuvrir: () => boolean | Promise<boolean>;
  onPage: (fichier: string) => void;
  onFin: (recues: number) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [partage, setPartage] = React.useState<PortableInfo | null | undefined>(undefined);
  const [recues, setRecues] = React.useState(0);
  const recuesRef = React.useRef(0);
  const ouvrir = async () => {
    if (!(await avantDOuvrir())) return;
    setRecues(0); recuesRef.current = 0; setOpen(true);
    try { setPartage(await lirePartage()); } catch { setPartage(null); }
  };
  const terminer = () => { setOpen(false); onFin(recuesRef.current); };
  const allumer = async () => {
    try { setPartage(await ouvrirPartage()); } catch (e) { toast(String(e), { icone: "⚠️" }); }
  };
  React.useEffect(() => {
    if (!open) return;
    let actif = true;
    const un = listen<string>("photo:recue", (e) => {
      if (!actif) return;
      onPage(e.payload);
      recuesRef.current += 1; setRecues(recuesRef.current);
    });
    return () => { actif = false; un.then((f) => f()); };
  }, [open, onPage]);
  return (
    <>
      <button type="button" className={className} onClick={ouvrir}>{label}</button>
      {open && (
        <Modal titre="📱 Scanner avec le compagnon" onClose={terminer}
          footer={<button className="btn primary" onClick={terminer}>{recues ? `✅ Terminer (${recues} page${recues > 1 ? "s" : ""})` : "Fermer"}</button>}>
          {partage === undefined ? <p>On regarde le partage WiFi…</p> : partage ? (
            <div>
              <p style={{ marginTop: 0 }}>Sur le téléphone, dans <b>Maitrize Dictaphone</b> : <b>📄 Scanner des pages</b>. Le scanner d'iOS — celui de Notes —
                cadre chaque page et la redresse ; enchaînez-les, puis « Enregistrer » : elles arrivent ici.</p>
              <p className="meta">Partage ouvert sur {partage.urlNom || partage.url}. Le téléphone doit être appairé et sur le même WiFi.</p>
              <p className="meta" style={{ fontSize: 14 }}>{recues ? `✅ ${recues} page${recues > 1 ? "s" : ""} reçue${recues > 1 ? "s" : ""} — en attente de la suite…` : "⏳ En attente de la première page…"}</p>
            </div>
          ) : (
            <div>
              <p style={{ marginTop: 0 }}>Le partage WiFi est éteint : le téléphone ne peut pas joindre l'ordinateur.</p>
              <button type="button" className="btn primary" onClick={allumer}>📡 Ouvrir le partage WiFi</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function ManuelsPanel() {
  const { data: indexBrut, reload: relireIndex } = useAsync(() => api.settingGet(CLE_INDEX), []);
  const index = React.useMemo(() => lireIndex(indexBrut), [indexBrut]);
  const [manuel, setManuel] = React.useState<Manuel | null>(null);
  const [titreNouveau, setTitreNouveau] = React.useState("");
  const [pageId, setPageId] = React.useState("");
  const [exerciceId, setExerciceId] = React.useState("");
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
    setManuel(m); setPageId(m.pages[0]?.id ?? ""); setExerciceId("");
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
    const m = nouveauManuel(titreNouveau, "telephone", todayIso());
    manuelEnCours.current = m;
    await enregistrer(m);
    setPageId(""); setExerciceId(""); setTitreNouveau("");
    return true;
  };
  const continuerParPhotos = async () => { manuelEnCours.current = manuel; return !!manuel; };
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
  const imprimer = () => {
    if (!fiche || !manuel || !page) return;
    printHTML(`${fiche.titre || "Exercice adapté"} — ${manuel.titre}`,
      htmlFicheAdaptee(fiche, options, { manuel: manuel.titre, page: page.numero, numero: exercice?.numero ?? "" }), STYLE_FICHE_ADAPTEE);
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
    const e: ExerciceManuel = { id: crypto.randomUUID(), numero: "", consigne: "", contenu: "", type: "autre" };
    void enregistrer({ ...manuel, pages: manuel.pages.map((p) => (p.id === page.id ? { ...p, exercices: [...p.exercices, e] } : p)) });
    setExerciceId(e.id);
  };

  const aRelire = manuel?.pages.filter((p) => !p.extraitLe).length ?? 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) 1fr", gap: 14, alignItems: "start" }}>
      {/* ── Les manuels ── */}
      <div>
        <div className="card" style={{ marginBottom: 14 }}>
          <h3 style={{ marginTop: 0 }}>📚 Manuels</h3>
          {index.length === 0 && <p className="meta" style={{ fontSize: 12.5, lineHeight: 1.5 }}>Aucun manuel encore. Photographiez ses pages avec le téléphone, ou importez son PDF.</p>}
          {index.map((r) => (
            <div key={r.id} className={`man-ligne${manuel?.id === r.id ? " on" : ""}`}>
              <button type="button" className="man-ouvrir" onClick={() => ouvrir(r.id)}>
                <b>{r.titre}</b>
                <span className="meta">{r.source === "pdf" ? "PDF" : "📱 photos"} · {r.pages} page{r.pages > 1 ? "s" : ""} · {r.exercices} exercice{r.exercices > 1 ? "s" : ""}</span>
              </button>
              <button type="button" className="btn ghost sm" aria-label={`Supprimer ${r.titre}`} onClick={() => supprimer(r)}>🗑</button>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 style={{ marginTop: 0, fontSize: 14 }}>Nouveau manuel</h3>
          <Field label="Titre">
            <Input value={titreNouveau} onChange={(e) => setTitreNouveau(e.target.value)} placeholder="Maths CE1, Lecture CP…" />
          </Field>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <ScanCompagnon label="📱 Scanner avec le compagnon" className="btn primary" avantDOuvrir={commencerParPhotos} onPage={photoRecue} onFin={finDePhotos} />
            <PhotoTelephone serie label="📷 Photographier par QR code" avantDOuvrir={commencerParPhotos} onPhoto={photoRecue} onFin={finDePhotos} />
            <input ref={entree} type="file" accept="application/pdf" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) importerPdf(f); e.target.value = ""; }} />
            <button type="button" className="btn" disabled={!!occupe} onClick={() => entree.current?.click()}>📄 Importer un PDF</button>
          </div>
          <p className="meta" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 0 }}>
            Avec le compagnon iPhone, c'est le scanner de Notes : la page se cadre et se redresse. Par QR code, n'importe quel téléphone
            prend des photos, ou scanne avec l'application Fichiers. Tout reste sur cet ordinateur.
          </p>
        </div>
      </div>

      {/* ── Le manuel ouvert ── */}
      {!manuel ? (
        <div className="card" style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.6 }}>
          Ouvrez un manuel, ou créez-en un : ses pages s'afficheront ici, et le modèle en relira les exercices quand vous le lui demanderez.
        </div>
      ) : (
        <div style={{ minWidth: 0 }}>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <Input value={manuel.titre} onChange={(e) => setManuel({ ...manuel, titre: e.target.value })} onBlur={() => enregistrer(manuel)} style={{ maxWidth: 260, fontWeight: 700 }} aria-label="Titre du manuel" />
              <Input value={manuel.niveau} onChange={(e) => setManuel({ ...manuel, niveau: e.target.value })} onBlur={() => enregistrer(manuel)} placeholder="Niveau (CP, CE2…)" style={{ maxWidth: 140 }} aria-label="Niveau" />
              <div style={{ flex: 1 }} />
              {manuel.source === "telephone" && (<>
                <ScanCompagnon label="📱 Scanner d'autres pages" className="btn sm" avantDOuvrir={continuerParPhotos} onPage={photoRecue} onFin={finDePhotos} />
                <PhotoTelephone serie label="📷 Par QR code" className="btn sm" avantDOuvrir={continuerParPhotos} onPhoto={photoRecue} onFin={finDePhotos} />
              </>)}
              {occupe ? (
                <button type="button" className="btn sm" onClick={() => { arret.current = true; }}>⏹ {occupe}</button>
              ) : (
                <button type="button" className="btn sm" disabled={aRelire === 0} onClick={relireTout} title="Chaque page part chez Mistral, l'une après l'autre">
                  {aRelire === 1 ? "🔎 Relire la page restante" : `🔎 Relire les ${aRelire} pages restantes`}
                </button>
              )}
            </div>
            <div className="man-pages">
              {manuel.pages.map((p) => (
                <button key={p.id} type="button" className={`man-page${p.id === pageId ? " on" : ""}`} onClick={() => { setPageId(p.id); setExerciceId(""); }}
                  title={p.extraitLe ? `${p.exercices.length} exercice${p.exercices.length > 1 ? "s" : ""}` : "Pas encore relue"}>
                  <span className="man-page-num">{p.numero}</span>
                  <span className="man-page-etat">{p.extraitLe ? `${p.exercices.length} ex.` : "·"}</span>
                </button>
              ))}
              {manuel.pages.length === 0 && <span className="meta" style={{ fontSize: 12.5 }}>Aucune page : photographiez-les depuis le téléphone.</span>}
            </div>
          </div>

          {page && (
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
                      <span className="man-exo-texte">{texteExercice({ ...e, numero: "" }).slice(0, 140)}</span>
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
                    </div>
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
      )}
    </div>
  );
}
