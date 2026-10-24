import React from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Page } from "../App";
import { demarcheDe, demarcheSuggeree, demarchesParFamille, resumeDuCadre, seancesDuCadre, type Demarche } from "../demarches";
import { MATERIEL_DES_MOTS, avecLaSeanceDesMots, estLaSeanceDesMots } from "../motsDesProblemes";
import { api, Sequence, Seance, MaterielItem, Jeu, nouvelleSeance, nowIso, formatDuree, telechargerTexte, teinteSequence } from "../api";
import { decalee, deplacee, ordonnees, renumerotees } from "../ordreSeances";
import { useSuiviSequences } from "../components/useSuiviSequences";
import { BadgeSuivi } from "../components/SuiviSequence";
import { avancement, dateCourte, jourProche, libelleDuPassage, libelleDuSuivi } from "../suiviSequences";
import { EVT_JOUR } from "../components/CommandPalette";
import { Modal, Stars, Empty, Confirm, useAsync } from "../components/ui";
import { CompetenceSelectionnee, labelCourt } from "../components/CompetenceTree";
import { estManuelle } from "../sousCompetences";
import { genreDeSupport, lireRenvoi } from "../supportsDeSeance";
import { FichierImg } from "../components/Deroulement";
import { DeroulementLu } from "../components/EditeurDeroulement";
import { documentDeLaSeance } from "../documentSeance";
import { EVT_SEANCE_ENREGISTREE } from "./SeancePage";
import { fichierToBlobUrl } from "../components/PdfViewer";
import { printHTML, dataUrlImage } from "../print";
import { openCtx } from "../components/ctxmenu";
import { toast } from "../components/Toaster";
import { confirmer } from "../components/confirmer";
import { FormSequence } from "../components/FormSequence";
import { ReglesCitees, useLudotheque } from "../components/ReglesDesJeux";
import { SupportsDeLaSequence } from "../components/SupportsDeTravail";
import { sansMarqueurs, STYLE_REGLES } from "../jeuxCites";
import { htmlDeLaSequence, imagesDeLaSequence, STYLE_DOCUMENT } from "../sequenceHtml";
import { ExercicesDesManuels } from "../components/ExercicesDesManuels";
import { libelleDeProgrammation } from "../programmation";
import { TapuscritVue } from "../components/Tapuscrit";
import { lireConsignes } from "../tapuscrit";
import { TexteAvecLiens } from "../components/TexteAvecLiens";

export default function SequenceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { data: sequences, reload: reloadSeq } = useAsync(() => api.sequencesList(), []);
  const { data: seances, reload } = useAsync(() => api.seancesList(id), [id]);
  const { data: mats, reload: reloadMat } = useAsync(() => api.materielList().then((all) => all.filter((m) => m.sequenceId === id)), [id]);
  // Où en est la séquence d'après le cahier journal : ses passages en classe, séance par séance.
  const { suivis, aujourdHui, recharger: rechargerSuivi } = useSuiviSequences();
  const [voir, setVoir] = React.useState<Seance | null>(null);
  // Une séance écrite sur sa page, qu'on vient de quitter : la liste se relit quand l'écriture finit.
  React.useEffect(() => {
    const relire = () => reload();
    window.addEventListener(EVT_SEANCE_ENREGISTREE, relire);
    return () => window.removeEventListener(EVT_SEANCE_ENREGISTREE, relire);
  }, [reload]);
  // « ?seance=… » : on arrive d'une case de la progression, sur la séance qu'elle place.
  const [params, setParams] = useSearchParams();
  const aOuvrir = params.get("seance");
  React.useEffect(() => {
    if (!aOuvrir || !seances) return;
    const s = seances.find((x) => x.id === aOuvrir);
    if (s) setVoir(s);
    setParams((p) => { p.delete("seance"); return p; }, { replace: true });
  }, [aOuvrir, seances, setParams]);
  const [del, setDel] = React.useState<Seance | null>(null);
  const [modifier, setModifier] = React.useState(false);
  // Le glisser-déposer des séances : celle qu'on tient, celle qu'on survole.
  const [saisie, setSaisie] = React.useState("");
  const [survol, setSurvol] = React.useState("");

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
      await api.seanceSave(i === 0 && estLaSeanceDesMots(d.seances[0]) ? { ...sc, materiel: MATERIEL_DES_MOTS } : sc);
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

  // ── Matériel de la séquence ──────────────────────────────────────
  // La zone où l'on déposait des fichiers pour la séquence est partie (demande de l'enseignant, octobre 2026) :
  // les supports s'ajoutent à la page de la séance. Ceux qu'on y avait déposés restent, à glisser sur une séance.
  const matsSeq = (mats ?? []).filter((m) => !m.seanceId);
  const matsDeSeance = (sid: string) => (mats ?? []).filter((m) => m.seanceId === sid);

  // Déplace un matériel vers une séance (ou le renvoie à la séquence si seanceId=null).
  const assignerMat = async (mid: string, seanceId: string | null) => {
    const m = (mats ?? []).find((x) => x.id === mid);
    if (m) { await api.materielSave({ ...m, seanceId }); reloadMat(); }
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
        <button className="btn primary" onClick={() => { const neuve = nouvelleSeance(seq.id, next); nav(`/seances/${neuve.id}`, { state: { nouvelle: neuve } }); }}>+ Séance</button>
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

      {matsSeq.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}
          onDragOver={(e) => { if (e.dataTransfer.types.includes("text/materiel")) e.preventDefault(); }}
          onDrop={(e) => { const mid = e.dataTransfer.getData("text/materiel"); if (mid) { e.preventDefault(); void assignerMat(mid, null); } }}>
          <span className="meta">📎 Matériel de la séquence</span>
          {matsSeq.map(matChip)}
        </div>
      )}

      {/* Les photos du dictaphone rattachées à la séquence dans les réglages : ses supports de travail. */}
      <SupportsDeLaSequence sequenceId={seq.id} />

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
                { label: "Modifier", icon: "✏️", onClick: () => nav(`/seances/${s.id}`) },
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
              <button className="btn ghost sm" onClick={() => nav(`/seances/${s.id}`)}>Modifier</button>
              <button className="btn ghost sm" onClick={() => setDel(s)} aria-label="Supprimer">🗑</button>
            </div>
          );
        })
      )}

      {voir && <SeanceReadView seance={voir} onClose={() => setVoir(null)} onEdit={() => { setVoir(null); nav(`/seances/${voir.id}`); }} />}
      {modifier && <FormSequence sequence={seq} onClose={() => setModifier(false)}
        onSaved={() => { setModifier(false); reloadSeq(); }} />}
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
  printHTML(seq.titre || "Séquence", htmlDeLaSequence(seq, seances, pieces, jeux, (n) => dataUrls[n]), STYLE_REGLES + STYLE_DOCUMENT);
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

// ── Vue lecture d'une séance ───────────────────────────────────────────────
export function SeanceReadView({ seance: s, onClose, onEdit }: { seance: Seance; onClose: () => void; onEdit: () => void }) {
  let comps: CompetenceSelectionnee[] = [];
  try { comps = s.competences ? JSON.parse(s.competences) : []; } catch { /* ignore */ }
  const doc = documentDeLaSeance(s);
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
      {doc && <Section titre="Déroulement"><DeroulementLu document={doc} /></Section>}
      {doc && (
        <div style={{ marginTop: -10, marginBottom: 16 }}>
          <ReglesCitees texte={sansMarqueurs(doc)} jeux={jeux} onJeuModifie={rechargerJeux} />
        </div>
      )}
      {s.materiel && <Section titre="Matériel"><div style={{ whiteSpace: "pre-wrap" }}><TexteAvecLiens texte={s.materiel} /></div></Section>}
      {(materiels?.length ?? 0) > 0 && <Section titre="Supports de la séance">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {materiels!.map((m) => {
            const r = lireRenvoi(m.supportJson);
            return <span key={m.id} className="chip">{r ? genreDeSupport(r.genre).ico : "📄"} {m.titre}</span>;
          })}
        </div>
      </Section>}
      {s.bilan && <Section titre="Bilan"><div style={{ whiteSpace: "pre-wrap" }}>{s.bilan}</div></Section>}
    </Modal>
  );
}
