import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Page } from "../App";
import { demarcheDe, demarcheSuggeree, demarchesParFamille, resumeDuCadre, seancesDuCadre, type Demarche } from "../demarches";
import { MATERIEL_DES_MOTS, SEANCE_DES_MOTS, avecLaSeanceDesMots } from "../motsDesProblemes";
import { api, Sequence, Seance, MaterielItem, Jeu, nouvelleSeance, nowIso, newId, DUREES, formatDuree, telechargerTexte, teinteSequence } from "../api";
import { decalee, deplacee, ordonnees, renumerotees } from "../ordreSeances";
import { useSuiviSequences } from "../components/useSuiviSequences";
import { BadgeSuivi } from "../components/SuiviSequence";
import { avancement, dateCourte, jourProche, libelleDuPassage, libelleDuSuivi } from "../suiviSequences";
import { EVT_JOUR } from "../components/CommandPalette";
import { Modal, Field, Input, Textarea, TextareaAuto, Select, Stars, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceTree, CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { ajouterManuelle, consigneSousCompetences, estManuelle, lireSousCompetences } from "../sousCompetences";
import { pseudonymiserTout, restaurer } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import { TableauEditor, MaterielSeance, imageDuPresse, fileToBase64 } from "../components/SeanceParts";
import { IllustrationsEditor, DeroulementRead, CelluleContenu, FichierImg, CitationButton } from "../components/Deroulement";
import { fichierToBlobUrl } from "../components/PdfViewer";
import { printHTML, dataUrlImage, partDeColonne } from "../print";
import { openCtx } from "../components/ctxmenu";
import { PhotoTelephone } from "../components/PhotoTelephone";
import { useFileDropZone, estDocument, estImage, fichierEnBase64 } from "../dragdrop";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { FormSequence } from "../components/FormSequence";
import { ReglesCitees, useLudotheque } from "../components/ReglesDesJeux";
import { sansMarqueurs, STYLE_REGLES } from "../jeuxCites";
import { htmlDeLaSequence, imagesDeLaSequence } from "../sequenceHtml";
import { useCorrecteur, ZoneCorrigeable } from "../components/CorrigerSelection";
import { ExercicesDesManuels } from "../components/ExercicesDesManuels";
import { libelleDeProgrammation } from "../programmation";
import { ConsignesSeance, TapuscritVue } from "../components/Tapuscrit";
import { lireConsignes } from "../tapuscrit";

export default function SequenceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: sequences, reload: reloadSeq } = useAsync(() => api.sequencesList(), []);
  const { data: seances, reload } = useAsync(() => api.seancesList(id), [id]);
  const { data: mats, reload: reloadMat } = useAsync(() => api.materielList().then((all) => all.filter((m) => m.sequenceId === id)), [id]);
  // Où en est la séquence d'après le cahier journal : ses passages en classe, séance par séance.
  const { suivis, aujourdHui, recharger: rechargerSuivi } = useSuiviSequences();
  const [edit, setEdit] = React.useState<Seance | null>(null);
  const [voir, setVoir] = React.useState<Seance | null>(null);
  const [del, setDel] = React.useState<Seance | null>(null);
  const [modifier, setModifier] = React.useState(false);
  // Le glisser-déposer des séances : celle qu'on tient, celle qu'on survole.
  const [saisie, setSaisie] = React.useState("");
  const [survol, setSurvol] = React.useState("");

  // Glisser-déposer natif (Finder/Aperçu). Le hook doit être appelé à chaque
  // rendu (avant tout return conditionnel) — la logique d'import réelle, qui
  // dépend de la séquence chargée, passe par une ref mise à jour plus bas.
  const importerRef = React.useRef<(fichiers: File[]) => void>(() => {});
  const { ref: dropZoneRef, actif: dropActif } = useFileDropZone({
    accept: (c) => estDocument(c) || estImage(c),
    onFiles: (fichiers) => importerRef.current(fichiers),
  });

  const seq = sequences?.find((s) => s.id === id);
  if (!seq) return <Page titre="Séquence"><Empty icone="🔍" titre="Séquence introuvable" /></Page>;
  const suivi = suivis.get(seq.id);
  const passagesDe = (seanceId: string) => suivi?.passages.filter((p) => p.seance?.id === seanceId) ?? [];
  /** Ce que l'enseignant tranche : « pause », « terminee », ou rien — le journal décide. */
  const marquer = async (etat: "" | "pause" | "terminee") => {
    await api.sequenceSave({ ...seq, etat });
    reloadSeq(); rechargerSuivi();
    toast(etat === "pause" ? "Séquence mise en pause." : etat === "terminee" ? "Séquence marquée terminée." : "Le cahier journal décide de nouveau.", { icone: etat === "pause" ? "⏸" : etat === "terminee" ? "✅" : "📓" });
  };
  const ouvrirLeJournal = (iso: string) => {
    nav("/planning");
    setTimeout(() => window.dispatchEvent(new CustomEvent(EVT_JOUR, { detail: iso })), 120);
  };

  let comp: CompetenceSelectionnee | null = null;
  try { comp = seq.competenceVisee ? JSON.parse(seq.competenceVisee) : null; } catch { /* ignore */ }

  const setRating = async (champ: keyof Sequence, v: number) => {
    await api.sequenceSave({ ...seq, [champ]: v, ratingDateMaj: nowIso() } as Sequence);
    reloadSeq();
  };
  const next = (seances?.length ?? 0) + 1;
  // La démarche que la compétence visée appelle, proposée en premier ; les
  // autres restent à portée de menu.
  const suggeree: Demarche = (() => {
    try { return demarcheSuggeree(seq.competenceVisee ? JSON.parse(seq.competenceVisee) : seq.matiere, seq.cycle); }
    catch { return demarcheSuggeree(seq.matiere, seq.cycle); }
  })();
  const poserCadre = async (brute: Demarche) => {
    // Une séquence qui pose des problèmes s'ouvre sur la séance de leurs mots.
    const d = avecLaSeanceDesMots(brute);
    for (const [i, sc] of seancesDuCadre(d, seq.id, next).entries()) {
      await api.seanceSave(i === 0 && d.seances[0] === SEANCE_DES_MOTS ? { ...sc, materiel: MATERIEL_DES_MOTS } : sc);
    }
    await api.sequenceSave({ ...seq, nbSeancesPrevu: d.seances.length });
    reload(); reloadSeq();
    toast(`Cadre posé : ${resumeDuCadre(d)}.`, { icone: "🧭" });
  };

  const liste = seances ?? [];

  /** Écrit un nouvel ordre : seules les séances qui changent sont sauvées. */
  const ranger = async (rangees: Seance[]) => {
    const aEcrire = renumerotees(rangees);
    if (!aEcrire.length) return;
    for (const s of aEcrire) await api.seanceSave(s);
    reload();
  };
  const deplacer = (s: Seance, sens: -1 | 1) => ranger(decalee(liste, s.id, sens));
  /** Glisser-déposer : la séance prise va prendre la place de celle visée. */
  const poserSur = (deId: string, versId: string) => ranger(deplacee(liste, deId, versId));
  const dupliquerSeance = async (s: Seance) => {
    await api.seanceSave({ ...s, id: crypto.randomUUID(), numero: next, titre: s.titre + " (copie)" });
    reload();
  };

  // ── Matériel de la séquence (drag-drop) ──────────────────────────
  const matsSeq = (mats ?? []).filter((m) => !m.seanceId);
  const matsDeSeance = (sid: string) => (mats ?? []).filter((m) => m.seanceId === sid);

  // Déplace un matériel vers une séance (ou le renvoie à la séquence si seanceId=null).
  const assignerMat = async (mid: string, seanceId: string | null) => {
    const m = (mats ?? []).find((x) => x.id === mid);
    if (m) { await api.materielSave({ ...m, seanceId }); reloadMat(); }
  };

  // Dépôt de fichiers (PDF/images) sur la séquence → crée le matériel.
  const creerMaterielDepuisFichier = async (nomOriginal: string, nom: string) => {
    // Tout ce qui n'est pas une image est un document : PDF, Word, LibreOffice…
    const pdf = !estImage(nomOriginal);
    await api.materielSave({
      id: newId(), titre: nomOriginal.replace(/\.[^.]+$/, ""), descriptionMateriel: "",
      competenceId: comp?.competenceRefId ?? "", competenceTitre: comp?.competenceTitre ?? "",
      domaineTitre: comp?.domaineTitre ?? seq.matiere ?? "", sousDomaineTitre: comp?.sousDomaineTitre ?? "",
      cycle: seq.cycle, imagesJson: pdf ? "[]" : JSON.stringify([nom]), pdfsJson: pdf ? JSON.stringify([nom]) : "[]",
      dateCreation: nowIso(), seanceId: null, sequenceId: seq.id,
      dossier: "", videosJson: "[]", coffreJson: "[]",
    });
  };
  const deposerFichiers = async (files: FileList) => {
    for (const file of Array.from(files)) {
      const b64 = await fileToBase64(file);
      const nom = await api.fichierSave(file.name, b64);
      await creerMaterielDepuisFichier(file.name, nom);
    }
    reloadMat();
  };
  // Branche l'import réel sur la ref (séquence désormais disponible).
  importerRef.current = async (fichiers: File[]) => {
    for (const f of fichiers) {
      const nom = await api.fichierSave(f.name, await fichierEnBase64(f));
      await creerMaterielDepuisFichier(f.name, nom);
    }
    reloadMat();
  };

  // Photo prise depuis le téléphone → matériel image de la séquence.
  const photoVersMateriel = async (nom: string) => {
    await api.materielSave({
      id: newId(), titre: "Photo " + new Date().toLocaleDateString("fr-FR"), descriptionMateriel: "",
      competenceId: comp?.competenceRefId ?? "", competenceTitre: comp?.competenceTitre ?? "",
      domaineTitre: comp?.domaineTitre ?? seq.matiere ?? "", sousDomaineTitre: comp?.sousDomaineTitre ?? "",
      cycle: seq.cycle, imagesJson: JSON.stringify([nom]), pdfsJson: "[]",
      dateCreation: nowIso(), seanceId: null, sequenceId: seq.id,
      dossier: "", videosJson: "[]", coffreJson: "[]",
    });
    reloadMat();
  };

  const matChip = (m: MaterielItem) => {
    let pdf = false; try { pdf = (JSON.parse(m.pdfsJson || "[]") as string[]).length > 0; } catch { /* ignore */ }
    return (
      <span key={m.id} className="chip" draggable title="Glisser vers une séance"
        onDragStart={(e) => e.dataTransfer.setData("text/materiel", m.id)} style={{ cursor: "grab" }}>
        {pdf ? "📄" : "📷"} {m.titre}
      </span>
    );
  };

  const supprimerSequence = async () => {
    const n = (seances ?? []).length;
    if (!(await confirmer(`Supprimer la séquence « ${seq.titre} »${n ? ` et ses ${n} séance${n > 1 ? "s" : ""}` : ""} ?`, { oui: "Supprimer", danger: true }))) return;
    await api.sequenceDelete(seq.id);
    toast("Séquence supprimée", { icone: "🗑" });
    nav("/plan");
  };

  return (
    <Page titre={seq.titre} sous={[seq.matiere, seq.cycle, libelleDeProgrammation(seq), seq.annee].filter(Boolean).join(" · ")}
      actions={<>
        <button className="btn" onClick={() => nav("/plan")}>← Retour</button>
        <button className="btn" onClick={() => setModifier(true)}>✏️ Modifier</button>
        <button className="btn" onClick={supprimerSequence} aria-label="Supprimer la séquence">🗑</button>
        <button className="btn" onClick={() => imprimerSequence(seq, seances ?? [])}>🖨 Imprimer / PDF</button>
        <button className="btn" onClick={() => exporterSequence(seq, seances ?? [])}>⬇️ Exporter</button>
        <button className="btn primary" onClick={() => setEdit(nouvelleSeance(seq.id, next))}>+ Séance</button>
      </>}>
      <div className="card" style={{ marginBottom: 18, borderTop: `3px solid ${teinteSequence(seq)}` }}>
        {seq.imageNom && <FichierImg nom={seq.imageNom} style={{ width: "100%", maxHeight: 200, objectFit: "cover", marginBottom: 12 }} />}
        {comp && <div style={{ color: "var(--accent)", fontWeight: 600, marginBottom: 8 }}>🎯 {labelCourt(comp)}</div>}
        {seq.objectifs && <p style={{ marginTop: 0, color: "var(--text-2)" }}>{seq.objectifs}</p>}
        {suivi && (
          <div className="suivi-fiche">
            <BadgeSuivi suivi={suivi} />
            <span className="meta">{libelleDuSuivi(suivi, aujourdHui)}</span>
            {(suivi.etat === "classe" || suivi.etat === "pause") && suivi.prevues > 0 && (
              <div className="suivi-barre" style={{ width: 160 }} aria-label={`${suivi.faites.length} séances faites sur ${suivi.prevues}`}>
                <span style={{ width: `${Math.round(avancement(suivi) * 100)}%` }} />
              </div>
            )}
            <span style={{ flex: 1 }} />
            {suivi.manuel === "terminee" ? (
              <button className="btn ghost sm" onClick={() => void marquer("")} title="Le cahier journal décide de nouveau de l'état">↩ Rouvrir</button>
            ) : suivi.manuel === "pause" ? (
              <>
                <button className="btn ghost sm" onClick={() => void marquer("")} title="Le cahier journal décide de nouveau de l'état">▶ Reprendre</button>
                <button className="btn ghost sm" onClick={() => void marquer("terminee")}>✅ Marquer terminée</button>
              </>
            ) : (
              <>
                {suivi.etat !== "terminee" && <button className="btn ghost sm" onClick={() => void marquer("pause")} title="Elle ne s'affichera plus parmi les séquences en classe">⏸ Mettre en pause</button>}
                <button className="btn ghost sm" onClick={() => void marquer("terminee")} title="Même s'il reste des séances écrites">✅ Marquer terminée</button>
              </>
            )}
          </div>
        )}
        {/* Quand la séquence a été posée dans le cahier journal — et quand elle le sera : un clic ouvre le jour. */}
        {suivi && suivi.passages.length + suivi.aVenir.length > 0 && (
          <div className="suivi-journal">
            <span className="meta">📅 Dans le cahier journal :</span>
            {[...suivi.passages, ...suivi.aVenir].map((p) => (
              <button key={p.creneauId} type="button" className={`chip${p.date > aujourdHui ? " a-venir" : ""}`}
                title={`Ouvrir le cahier journal à ce jour${p.bilan.trim() ? " — un bilan y est écrit" : ""}`} onClick={() => ouvrirLeJournal(p.date)}>
                {libelleDuPassage(p)}{p.date > aujourdHui ? " · à venir" : p.bilan.trim() ? " · 📓" : ""}
              </button>
            ))}
          </div>
        )}
        {seq.video && <VideoSequence video={seq.video} />}
        <div className="row" style={{ marginTop: 6 }}>
          <RatingLine label="Engagement des élèves" value={seq.ratingEngagement} onChange={(v) => setRating("ratingEngagement", v)} />
          <RatingLine label="Facilité de mise en œuvre" value={seq.ratingFacilite} onChange={(v) => setRating("ratingFacilite", v)} />
          <RatingLine label="Apprentissage réel" value={seq.ratingApprentissage} onChange={(v) => setRating("ratingApprentissage", v)} />
        </div>
      </div>

      <div ref={dropZoneRef} className="card"
        style={{ marginBottom: 18, borderStyle: "dashed", ...(dropActif ? { outline: "2px dashed var(--accent)", background: "var(--accent-soft)" } : {}) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const mid = e.dataTransfer.getData("text/materiel");
          if (mid) { assignerMat(mid, null); return; }
          if (e.dataTransfer.files?.length) deposerFichiers(e.dataTransfer.files);
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: matsSeq.length ? 8 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 15 }}>📎 Matériel de la séquence</h3>
          <span className="meta" style={{ flex: 1 }}>Glissez ici vos PDF, documents Word ou LibreOffice, images — puis sur une séance.</span>
          <PhotoTelephone onPhoto={photoVersMateriel} />
        </div>
        {matsSeq.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{matsSeq.map(matChip)}</div>}
      </div>

      {/* Les exercices des manuels qui portent la compétence visée : d'un geste dans une séance. */}
      <ExercicesDesManuels competence={comp} sequenceId={seq.id} cycle={seq.cycle} seances={liste}
        seanceParDefaut={suivi?.suivante?.id} onAjoute={reloadMat} />

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "4px 2px 12px" }}>
        <h3 style={{ margin: 0 }}>Séances</h3>
        {suivi?.prochain && (
          <span className="meta">prochaine : {jourProche(suivi.prochain.date, aujourdHui)}{suivi.prochain.seance ? ` · séance ${suivi.prochain.seance.numero}` : ""}</span>
        )}
        {suivi?.suivante && suivi.etat !== "terminee" && !suivi.prochain && (
          <button className="btn sm" title="Ouvrir le cahier journal d'aujourd'hui : choisissez le créneau, puis « 📚 Poser une séquence »"
            onClick={() => { ouvrirLeJournal(aujourdHui); toast(`Choisissez le créneau, puis « 📚 Poser une séquence » — séance ${suivi.suivante!.numero}.`, { icone: "📅", duree: 6000 }); }}>
            📅 Poser la séance {suivi.suivante.numero} dans le journal
          </button>
        )}
      </div>
      {(seances?.length ?? 0) === 0 ? (
        <>
          <Empty icone="📝" titre="Aucune séance" sous="Ajoutez la première séance, ou posez un cadre : une démarche d'un guide crée les séances et leurs phases." />
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center", marginTop: -6, marginBottom: 18 }}>
            <button className="btn sm primary" title={`${suggeree.source} — ${resumeDuCadre(avecLaSeanceDesMots(suggeree))}`} onClick={() => poserCadre(suggeree)}>
              🧭 {suggeree.nom}
            </button>
            <select className="select" value="" style={{ fontSize: 12.5, maxWidth: 340 }} aria-label="Poser une autre démarche"
              onChange={(e) => { const d = demarcheDe(e.target.value); if (d) poserCadre(d); }}>
              <option value="">Autre démarche…</option>
              {demarchesParFamille().map((g) => (
                <optgroup key={g.famille} label={g.famille}>
                  {g.demarches.map((d) => <option key={d.id} value={d.id}>{d.nom} · {resumeDuCadre(avecLaSeanceDesMots(d))}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </>
      ) : (
        seances!.map((s) => {
          let comps: CompetenceSelectionnee[] = [];
          try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
          return (
            <div key={s.id} className="list-row"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/seance", s.id);
                e.dataTransfer.effectAllowed = "move";
                setSaisie(s.id);
              }}
              onDragEnd={() => { setSaisie(""); setSurvol(""); }}
              onDragOver={(e) => {
                const t = e.dataTransfer.types;
                if (t.includes("text/materiel")) { e.preventDefault(); return; }
                if (t.includes("text/seance") && saisie !== s.id) { e.preventDefault(); setSurvol(s.id); }
              }}
              onDragLeave={() => setSurvol((v) => (v === s.id ? "" : v))}
              onDrop={(e) => {
                const mid = e.dataTransfer.getData("text/materiel");
                if (mid) { e.preventDefault(); assignerMat(mid, s.id); return; }
                const sid = e.dataTransfer.getData("text/seance");
                if (sid && sid !== s.id) { e.preventDefault(); void poserSur(sid, s.id); }
                setSurvol(""); setSaisie("");
              }}
              style={{
                cursor: "grab",
                opacity: saisie === s.id ? 0.4 : 1,
                boxShadow: survol === s.id ? "inset 0 2px 0 0 var(--accent)" : undefined,
              }}
              onContextMenu={(e) => openCtx(e, [
                { label: "Voir", icon: "👁", onClick: () => setVoir(s) },
                { label: "Modifier", icon: "✏️", onClick: () => setEdit(s) },
                { label: "Monter", icon: "⬆️", sep: true, onClick: () => deplacer(s, -1) },
                { label: "Descendre", icon: "⬇️", onClick: () => deplacer(s, 1) },
                { label: "Dupliquer la séance", icon: "📑", onClick: () => dupliquerSeance(s) },
                { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => setDel(s) },
              ])}>
              <span className="badge">{s.numero}</span>
              <div style={{ flex: 1 }}>
                <div className="title">{s.titre || "Séance sans titre"}</div>
                <div className="meta">
                  {formatDuree(s.duree)}{s.date ? " · " + new Date(s.date).toLocaleDateString("fr-FR") : ""}{comps.length ? ` · ${comps.length} compétence(s)` : ""}
                  {passagesDe(s.id).length > 0 && ` · faite le ${passagesDe(s.id).map((p) => dateCourte(p.date)).join(", ")}`}
                </div>
                {passagesDe(s.id).filter((p) => p.bilan.trim()).slice(-1).map((p) => (
                  <div key={p.creneauId} className="meta" style={{ marginTop: 4 }}>
                    📓 Bilan du {dateCourte(p.date)} : {p.bilan.trim().length > 160 ? `${p.bilan.trim().slice(0, 160)}…` : p.bilan.trim()}{" "}
                    <button type="button" className="lien" onClick={(e) => { e.stopPropagation(); ouvrirLeJournal(p.date); }}>voir le journal</button>
                  </div>
                ))}
                {matsDeSeance(s.id).length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>{matsDeSeance(s.id).map(matChip)}</div>
                )}
              </div>
              {passagesDe(s.id).length > 0 && <span className="chip" title="Passée en classe, d'après le cahier journal">🟢 faite{passagesDe(s.id).length > 1 ? ` ×${passagesDe(s.id).length}` : ""}</span>}
              {s.deroulement && <span className="chip">📋 déroulement</span>}
              {s.bilan && <span className="chip">✅ bilan</span>}
              <button className="btn ghost sm" onClick={() => { void deplacer(s, -1); }}
                disabled={ordonnees(liste)[0]?.id === s.id}
                title="Monter cette séance" aria-label="Monter cette séance">⬆</button>
              <button className="btn ghost sm" onClick={() => { void deplacer(s, 1); }}
                disabled={ordonnees(liste)[liste.length - 1]?.id === s.id}
                title="Descendre cette séance" aria-label="Descendre cette séance">⬇</button>
              <button className="btn ghost sm" onClick={() => setVoir(s)}>Voir</button>
              <button className="btn ghost sm" onClick={() => setEdit(s)}>Modifier</button>
              <button className="btn ghost sm" onClick={() => setDel(s)} aria-label="Supprimer">🗑</button>
            </div>
          );
        })
      )}

      {voir && <SeanceReadView seance={voir} onClose={() => setVoir(null)} onEdit={() => { setEdit(voir); setVoir(null); }} />}
      {modifier && <FormSequence sequence={seq} onClose={() => setModifier(false)}
        onSaved={() => { setModifier(false); reloadSeq(); }} />}
      {edit && <SeanceForm seance={edit} cycle={seq.cycle} sequence={seq} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload(); }} />}
      {del && <Confirm message={`Supprimer la séance « ${del.titre || del.numero} » ?`}
        onYes={() => api.seanceDelete(del.id).then(reload)} onClose={() => setDel(null)} />}
    </Page>
  );
}

// ── Impression / PDF d'une fiche séquence ──────────────────────────────────
// Export JSON d'une séquence + ses séances (réimportable via la liste).
async function exporterSequence(seq: Sequence, seances: Seance[]) {
  const bundle = { version: 4, type: "sequence", dateExport: nowIso(), appVersion: "tauri", sequence: seq, seances };
  const slug = (seq.titre || "sequence").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "sequence";
  await telechargerTexte(`sequence-${slug}.json`, JSON.stringify(bundle, null, 2));
}

async function imprimerSequence(seq: Sequence, seances: Seance[]) {
  const pieces = (await Promise.all(seances.map((s) => api.piecesJointesList(s.id)))).flat();
  const jeux = await api.jeuxList().catch((): Jeu[] => []);
  // Les images lues une fois, puis intégrées à la page.
  const dataUrls: Record<string, string> = {};
  await Promise.all(imagesDeLaSequence(seances, pieces).map(async (n) => {
    try { dataUrls[n] = dataUrlImage(n, await api.fichierRead(n)); } catch { /* ignore */ }
  }));
  printHTML(seq.titre || "Séquence", htmlDeLaSequence(seq, seances, pieces, jeux, (n) => dataUrls[n]), STYLE_REGLES);
}

// Vidéo explicative : YouTube (iframe), lien direct, ou fichier importé.
function VideoSequence({ video }: { video: string }) {
  const [src, setSrc] = React.useState("");
  const estUrl = video.startsWith("http");
  React.useEffect(() => {
    if (estUrl) return;
    let u = ""; fichierToBlobUrl(video, "video/mp4").then((x) => { u = x; setSrc(x); });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [video, estUrl]);

  const yt = video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  const style: React.CSSProperties = { width: "100%", maxWidth: 560, borderRadius: 10, marginTop: 4 };

  if (yt) return <div style={{ marginTop: 8 }}><iframe style={{ ...style, aspectRatio: "16/9", border: "none" }}
    src={`https://www.youtube.com/embed/${yt[1]}`} title="Vidéo" allowFullScreen /></div>;
  if (estUrl) return <div style={{ marginTop: 8 }}><video style={style} src={video} controls /></div>;
  return <div style={{ marginTop: 8 }}>{src ? <video style={style} src={src} controls /> : <div style={{ color: "var(--text-2)" }}>Chargement de la vidéo…</div>}</div>;
}

function RatingLine({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "var(--text-2)", marginBottom: 3 }}>{label}</div>
      <Stars value={value} onChange={onChange} />
    </div>
  );
}

function Card({ titre, children, right }: { titre: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--text-2)" }}>{titre}</div>
        <div className="spacer" />{right}
      </div>
      {children}
    </div>
  );
}

export function SeanceForm({ seance, cycle = "", sequence, onClose, onSaved }: {
  seance: Seance; cycle?: string; sequence?: Sequence; onClose: () => void; onSaved: () => void;
}) {
  const [s, setS] = React.useState<Seance>(seance);
  const { jeux, recharger: rechargerJeux } = useLudotheque();
  const up = (p: Partial<Seance>) => setS((cur) => ({ ...cur, ...p }));
  const [dateActive, setDateActive] = React.useState(!!seance.date);
  // Dernière position du curseur dans le déroulement (pour insérer une image au bon endroit).
  const curseurDer = React.useRef<number | null>(null);
  // Un passage surligné dans le déroulement se corrige d'un bouton.
  const zoneDer = React.useRef<HTMLTextAreaElement | null>(null);
  const correcteur = useCorrecteur({
    valeur: s.deroulement, onChange: (deroulement) => up({ deroulement }), zone: zoneDer,
  });
  // Insère le marqueur [img:nom] à la position du curseur (ou à la fin).
  const insererImage = (nom: string) => {
    const t = s.deroulement;
    const pos = curseurDer.current ?? t.length;
    const next = (t.slice(0, pos).trimEnd() + `\n[img:${nom}]\n` + t.slice(pos).trimStart()).replace(/^\n/, "");
    up({ deroulement: next });
  };

  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  let grid: string[][] = [];
  try { grid = JSON.parse(s.tableauDeroulement || "[]"); } catch { /* ignore */ }
  let illustrations: string[] = [];
  try { illustrations = JSON.parse(s.imagesDeroulement || "[]"); } catch { /* ignore */ }

  const setComps = (next: CompetenceSelectionnee[]) => up({ competences: JSON.stringify(next) });
  const toggleComp = (c: CompetenceSelectionnee) => {
    // Une compétence du référentiel se reconnaît à son entrée ; une compétence
    // écrite à la main, à elle-même — deux manuelles ne se confondent pas.
    const exists = comps.find((x) => x.id === c.id
      || (!!c.competenceRefId && x.competenceRefId === c.competenceRefId));
    setComps(exists ? comps.filter((x) => x !== exists) : [...comps, c]);
  };

  // ── Les sous-compétences : écrites à la main, ou proposées par l'assistant ──
  //
  // La compétence de la séquence est celle du programme ; la séance y mène
  // par des marches plus petites, que le référentiel n'écrit pas.
  let competenceVisee: CompetenceSelectionnee | null = null;
  try { competenceVisee = sequence?.competenceVisee ? JSON.parse(sequence.competenceVisee) : null; } catch { /* ignore */ }
  const contexteManuel = { domaineTitre: competenceVisee?.domaineTitre ?? sequence?.matiere ?? "", competenceVisee: competenceVisee?.competenceTitre ?? "" };
  const [saisie, setSaisie] = React.useState("");
  const ajouterSaisie = () => {
    const suite = ajouterManuelle(comps, saisie, contexteManuel);
    if (suite === comps && saisie.trim()) toast("Cette compétence est déjà là.", { icone: "ℹ️" });
    setComps(suite); setSaisie("");
  };
  const [propositions, setPropositions] = React.useState<{ texte: string; cochee: boolean }[] | null>(null);
  const [proposeEnCours, setProposeEnCours] = React.useState(false);
  const proposer = async () => {
    setProposeEnCours(true);
    try {
      const consigne = consigneSousCompetences({
        competenceVisee: competenceVisee?.competenceTitre ?? "", domaineTitre: contexteManuel.domaineTitre, cycle: sequence?.cycle ?? cycle,
        titreSeance: s.titre, objectifs: s.objectifs, dejaLa: comps.map((c) => c.competenceTitre),
      });
      // Le titre et l'objectif de la séance partent sans les noms connus.
      const masque = pseudonymiserTout(consigne.map((m) => m.content), await nomsAMasquer());
      const reponse = restaurer(await api.mistralChat(consigne.map((m, i) => ({ ...m, content: masque.textes[i] }))), masque.table).texte;
      const lues = lireSousCompetences(reponse);
      if (!lues.length) { toast("L'assistant n'a rien proposé de lisible ; réessayez.", { icone: "⚠️" }); return; }
      setPropositions(lues.map((texte) => ({ texte, cochee: true })));
    } catch (e) { toast(String(e), { icone: "⚠️" }); }
    finally { setProposeEnCours(false); }
  };
  const garderPropositions = () => {
    let suite = comps;
    for (const p of propositions ?? []) if (p.cochee) suite = ajouterManuelle(suite, p.texte, contexteManuel);
    setComps(suite); setPropositions(null);
  };

  const save = async () => {
    const bilanDate = s.bilan && s.bilan !== seance.bilan ? nowIso() : s.bilanDate;
    await api.seanceSave({ ...s, date: dateActive ? (s.date ?? nowIso()) : null, bilanDate });
    onSaved();
  };

  return (
    <Modal large titre={`Séance ${s.numero}`} onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={save} disabled={!s.titre.trim()}>Enregistrer</button>
      </>}>
      <Card titre="Informations">
        <div className="row">
          <Field label="Titre"><Input value={s.titre} autoFocus onChange={(e) => up({ titre: e.target.value })} /></Field>
          <Field label="Durée">
            <Select value={s.duree} onChange={(e) => up({ duree: +e.target.value })} style={{ maxWidth: 130 }}>
              {DUREES.map((d) => <option key={d} value={d}>{formatDuree(d)}</option>)}
            </Select>
          </Field>
        </div>
        <Field label="Date prévue">
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={dateActive} onChange={(e) => setDateActive(e.target.checked)} />
            {dateActive ? <Input type="date" value={(s.date ?? nowIso()).slice(0, 10)} onChange={(e) => up({ date: e.target.value })} style={{ maxWidth: 180 }} />
              : <span style={{ color: "var(--text-2)" }}>Non définie</span>}
          </div>
        </Field>
      </Card>

      <Card titre="Objectifs">
        <Textarea value={s.objectifs} onChange={(e) => up({ objectifs: e.target.value })} placeholder="Ce que les élèves doivent apprendre…" />
      </Card>

      <Card titre="Consignes pour les élèves">
        <ConsignesSeance valeur={s.consignes ?? ""} onChange={(consignes) => up({ consignes })} />
      </Card>

      <Card titre="Compétences">
        {comps.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
            {comps.map((c, i) => (
              <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                title={estManuelle(c) ? "Sous-compétence écrite à la main" : c.referentielNom}>
                {estManuelle(c) ? "✍️ " : ""}{labelCourt(c)} <button className="btn ghost sm" style={{ padding: 0, marginLeft: 4 }} onClick={() => toggleComp(c)} aria-label="Retirer">✕</button>
              </span>
            ))}
          </div>
        )}
        {competenceVisee && (
          <div className="meta" style={{ fontSize: 12.5, marginBottom: 6 }}>🎯 Vers : {labelCourt(competenceVisee)}</div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
          <Input value={saisie} onChange={(e) => setSaisie(e.target.value)} placeholder="Écrire une sous-compétence : Reconnaître son prénom parmi trois étiquettes…"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); ajouterSaisie(); } }} style={{ flex: 1, minWidth: 220 }} aria-label="Sous-compétence à écrire" />
          <button type="button" className="btn sm" disabled={!saisie.trim()} onClick={ajouterSaisie}>＋ Ajouter</button>
          <button type="button" className="btn sm" disabled={proposeEnCours} onClick={proposer}
            title="L'assistant propose des sous-compétences à partir de la compétence visée et de l'objectif ; vous gardez celles qui conviennent.">
            {proposeEnCours ? "L'assistant cherche…" : "✨ Proposer des sous-compétences"}
          </button>
        </div>
        {propositions && (
          <div className="deroulement-propose" style={{ marginBottom: 10 }}>
            <b>✨ Propositions de l'assistant</b>
            <div className="meta" style={{ fontSize: 12.5, margin: "2px 0 6px" }}>Décochez ce qui ne convient pas ; le reste s'écrit comme une sous-compétence, modifiable ensuite.</div>
            {propositions.map((p, i) => (
              <label key={i} className="pb-coche">
                <input type="checkbox" checked={p.cochee} onChange={(e) => setPropositions(propositions.map((x, k) => (k === i ? { ...x, cochee: e.target.checked } : x)))} />
                <span>{p.texte}</span>
              </label>
            ))}
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button type="button" className="btn primary sm" disabled={!propositions.some((p) => p.cochee)} onClick={garderPropositions}>
                ✓ Garder les cochées ({propositions.filter((p) => p.cochee).length})
              </button>
              <button type="button" className="btn ghost sm" onClick={() => setPropositions(null)}>Ne rien garder</button>
            </div>
          </div>
        )}
        <CompetenceTree mode="multi" selection={comps} onToggle={(c) => toggleComp(c)} />
      </Card>

      <Card titre="Déroulement">
        <ZoneCorrigeable>
        {correcteur.bulle}
        <TextareaAuto ref={zoneDer} value={s.deroulement} onChange={(e) => up({ deroulement: e.target.value })}
          onSelect={(e) => { curseurDer.current = e.currentTarget.selectionStart; correcteur.surSelection(); }}
          onKeyUp={(e) => { curseurDer.current = e.currentTarget.selectionStart; correcteur.surSelection(); }}
          onClick={(e) => { curseurDer.current = e.currentTarget.selectionStart; correcteur.surSelection(); }}
          placeholder="Phases de la séance, consignes, organisation… (collez une image directement)"
          onPaste={async (e) => {
            const file = imageDuPresse(e);
            if (!file) return;
            e.preventDefault();
            const el = e.currentTarget; const pos = el.selectionStart ?? s.deroulement.length;
            const nom = await api.fichierSave(file.name || "image.png", await fileToBase64(file));
            const t = s.deroulement;
            const next = (t.slice(0, pos).trimEnd() + `\n[img:${nom}]\n` + t.slice(pos).trimStart()).replace(/^\n/, "");
            up({ deroulement: next, imagesDeroulement: JSON.stringify([...illustrations, nom]) });
          }} />
        </ZoneCorrigeable>
        <ReglesCitees texte={sansMarqueurs(s.deroulement)} jeux={jeux} onJeuModifie={rechargerJeux} />
        <div style={{ marginTop: 8 }}>
          <CitationButton onInsert={(mq) => up({ deroulement: (s.deroulement.trimEnd() + "\n" + mq + "\n").trimStart() })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <TableauEditor grid={grid} illustrations={illustrations} onChange={(g) => up({ tableauDeroulement: JSON.stringify(g) })} />
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 650, color: "var(--text-2)", marginBottom: 4 }}>Illustrations (insérables au fil du texte)</div>
          <IllustrationsEditor texte={s.deroulement} fichiers={illustrations}
            onChange={(f) => up({ imagesDeroulement: JSON.stringify(f) })}
            onInsert={insererImage} />
        </div>
      </Card>

      <Card titre="Notes matériel">
        <Textarea value={s.materiel} onChange={(e) => up({ materiel: e.target.value })} placeholder="Matériel nécessaire…" />
      </Card>

      <Card titre="Matériel pédagogique (PDF)">
        <MaterielSeance seanceId={s.id} cycle={cycle} />
      </Card>

      <Card titre="Bilan (après la séance)">
        <Textarea value={s.bilan} onChange={(e) => up({ bilan: e.target.value })} placeholder="Ce qui a marché, à reprendre, pour la prochaine fois…" />
      </Card>
    </Modal>
  );
}

// ── Vue lecture d'une séance ───────────────────────────────────────────────
export function SeanceReadView({ seance: s, onClose, onEdit }: { seance: Seance; onClose: () => void; onEdit: () => void }) {
  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  let grid: string[][] = [];
  try { grid = JSON.parse(s.tableauDeroulement || "[]"); } catch { /* ignore */ }
  const { data: materiels } = useAsync(() => api.materielList().then((all) => all.filter((m) => m.seanceId === s.id)), [s.id]);
  const { jeux, recharger: rechargerJeux } = useLudotheque();

  const Section = ({ titre, children }: { titre: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".4px", color: "var(--text-2)", marginBottom: 6 }}>{titre}</div>
      {children}
    </div>
  );

  return (
    <Modal large titre={`Séance ${s.numero} — ${s.titre}`} onClose={onClose}
      footer={<><div className="spacer" /><button className="btn" onClick={onClose}>Fermer</button><button className="btn primary" onClick={onEdit}>Modifier</button></>}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <span className="chip">{formatDuree(s.duree)}</span>
        {s.date && <span className="chip">{new Date(s.date).toLocaleDateString("fr-FR")}</span>}
      </div>
      {s.objectifs && <Section titre="Objectifs"><div style={{ whiteSpace: "pre-wrap" }}>{s.objectifs}</div></Section>}
      {lireConsignes(s.consignes).length > 0 && <Section titre="Consignes pour les élèves"><TapuscritVue consignes={lireConsignes(s.consignes)} /></Section>}
      {comps.length > 0 && <Section titre="Compétences">
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {comps.map((c, i) => <span key={i} className="chip" style={{ background: "var(--accent-soft)", color: "var(--accent)" }} title={estManuelle(c) ? "Sous-compétence écrite à la main" : c.referentielNom}>{estManuelle(c) ? "✍️ " : ""}{labelCourt(c)}</span>)}
        </div>
      </Section>}
      {s.deroulement && <Section titre="Déroulement"><DeroulementRead texte={s.deroulement} /></Section>}
      {s.deroulement && (
        <div style={{ marginTop: -10, marginBottom: 16 }}>
          <ReglesCitees texte={sansMarqueurs(s.deroulement)} jeux={jeux} onJeuModifie={rechargerJeux} />
        </div>
      )}
      {grid.length > 0 && <Section titre="Tableau">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl" style={{ tableLayout: "fixed", width: "100%" }}>
            {/* Chaque colonne à sa mesure : la durée tient en trois chiffres, la description porte tout. */}
            <colgroup>{(() => {
              const parts = grid[0].map(partDeColonne);
              const total = parts.reduce((a, b) => a + b, 0) || 1;
              return parts.map((p, c) => <col key={c} style={{ width: `${(p / total) * 100}%` }} />);
            })()}</colgroup>
            <tbody>{grid.map((row, r) => <tr key={r} style={r === 0 ? { fontWeight: 700, background: "var(--panel-2)" } : undefined}>
              {row.map((cell, c) => <td key={c} style={{ verticalAlign: "top" }}>{r === 0 ? cell : <CelluleContenu texte={cell} />}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Section>}
      {s.materiel && <Section titre="Matériel"><div style={{ whiteSpace: "pre-wrap" }}>{s.materiel}</div></Section>}
      {(materiels?.length ?? 0) > 0 && <Section titre="Matériel pédagogique (PDF)">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {materiels!.map((m) => <span key={m.id} className="chip">📄 {m.titre}</span>)}
        </div>
      </Section>}
      {s.bilan && <Section titre="Bilan"><div style={{ whiteSpace: "pre-wrap" }}>{s.bilan}</div></Section>}
    </Modal>
  );
}
