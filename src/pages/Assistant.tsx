import React from "react";
import { useNavigate } from "react-router-dom";
import { api, ChatMessage, Sequence, Seance, PiloteConversation, CYCLES, MATIERES, MODELES_MISTRAL, MODELE_DEFAUT, nouvelleSequence, nouvelleSeance, couleurPourMatiere, newId, nowIso } from "../api";
import { Modal, Field, Input, Select, useAsync } from "../components/ui";
import { construireContexteIA } from "../contexteIA";
import { openCtx } from "../components/ctxmenu";
import { Markdown } from "../components/Markdown";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

// Extrait un objet JSON d'une réponse IA (tolère du texte autour).
function extraireJson(rep: string): any {
  const s = rep.slice(rep.indexOf("{"), rep.lastIndexOf("}") + 1);
  return JSON.parse(s);
}

const SYSTEME: ChatMessage = {
  role: "system",
  content:
    "Tu es l'assistant pédagogique de Maîtrize, une application pour les enseignants du primaire français (cycles 1, 2 et 3). " +
    "Tu aides à concevoir des séquences et séances, à formuler des objectifs et compétences alignés sur les programmes officiels, " +
    "à différencier, et à organiser la classe. Réponds en français, de façon concrète et structurée.",
};

const SUGGESTIONS = [
  "Propose-moi une séquence de 5 séances sur les fractions en CM1.",
  "Donne 3 ateliers autonomes de lecture pour des CP.",
  "Reformule cet objectif pour qu'il soit observable et évaluable.",
  "Idées de différenciation pour un élève en difficulté en numération.",
];

export default function Assistant() {
  const nav = useNavigate();
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [hasKey, setHasKey] = React.useState<boolean | null>(null);
  const [showGen, setShowGen] = React.useState(false);
  const [showModif, setShowModif] = React.useState(false);
  const [contexteActif, setContexteActif] = React.useState(true);
  const [model, setModel] = React.useState(MODELE_DEFAUT);
  const [convId, setConvId] = React.useState("");
  const { data: convs, reload: reloadConvs } = useAsync(() => api.conversationsList(), []);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const nouvelleConversation = () => { setMessages([]); setConvId(""); };
  const chargerConv = (c: PiloteConversation) => {
    try { setMessages(JSON.parse(c.messagesJson)); } catch { setMessages([]); }
    setConvId(c.id);
  };
  const supprimerConv = async (c: PiloteConversation) => {
    await api.conversationDelete(c.id);
    if (c.id === convId) nouvelleConversation();
    reloadConvs();
  };
  const renommerConv = async (c: PiloteConversation) => {
    const t = prompt("Titre de la conversation :", c.titre);
    if (t == null) return;
    await api.conversationSave({ ...c, titre: t.trim() || c.titre, dateMaj: nowIso() });
    reloadConvs();
  };

  React.useEffect(() => {
    api.settingGet("mistralApiKey").then((k) => setHasKey(!!k && k.trim().length > 0));
    api.settingGet("iaContexte").then((v) => setContexteActif(v !== "0"));
    api.settingGet("mistralModel").then((v) => { if (v) setModel(v); });
  }, []);
  const choisirModele = (m: string) => { setModel(m); api.settingSet("mistralModel", m); };
  const basculerContexte = () => {
    setContexteActif((v) => { const n = !v; api.settingSet("iaContexte", n ? "1" : "0"); return n; });
  };
  // Action « Générer une séquence » déclenchée depuis la palette ⌘K.
  React.useEffect(() => {
    const h = () => setShowGen(true);
    window.addEventListener("maitrize:generer-sequence", h);
    return () => window.removeEventListener("maitrize:generer-sequence", h);
  }, []);
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  // Sauvegarde / met à jour la conversation courante (historique persistant).
  const sauvegarderConv = async (final: ChatMessage[]) => {
    const id = convId || newId();
    const exist = (convs ?? []).find((c) => c.id === id);
    const now = nowIso();
    const titre = exist?.titre || (final.find((m) => m.role === "user")?.content ?? "Conversation").slice(0, 60);
    await api.conversationSave({ id, titre, messagesJson: JSON.stringify(final), dateCreation: exist?.dateCreation ?? now, dateMaj: now });
    if (!convId) setConvId(id);
    reloadConvs();
  };

  const envoyer = async (texte?: string) => {
    const contenu = (texte ?? input).trim();
    if (!contenu || loading) return;
    const suite: ChatMessage[] = [...messages, { role: "user", content: contenu }];
    setMessages(suite); setInput(""); setLoading(true);
    let cleanup = () => {};
    try {
      // Contexte désactivé → on n'envoie AUCUN message système (rien d'autre que
      // la conversation). Activé → rôle pédagogique + contexte non personnel.
      let prefixe: ChatMessage[] = [];
      if (contexteActif) {
        const ctx = await construireContexteIA();
        prefixe = [{ role: "system", content: `${SYSTEME.content}\n\nContexte de la classe (données non personnelles, aucune information nominative sur les élèves) :\n${ctx}` }];
      }
      // Streaming : la réponse s'affiche au fil des tokens via événements Tauri.
      const reqId = newId();
      let acc = "";
      setMessages([...suite, { role: "assistant", content: "" }]);
      const unChunk = await listen<{ id: string; delta: string }>("mistral://chunk", (ev) => {
        if (ev.payload.id !== reqId) return;
        acc += ev.payload.delta;
        setMessages([...suite, { role: "assistant", content: acc }]);
      });
      const unDone = await listen<{ id: string }>("mistral://done", (ev) => {
        if (ev.payload.id !== reqId) return;
        cleanup();
        const final: ChatMessage[] = [...suite, { role: "assistant", content: acc }];
        setMessages(final); setLoading(false);
        sauvegarderConv(final);
      });
      const unErr = await listen<{ id: string; message: string }>("mistral://error", (ev) => {
        if (ev.payload.id !== reqId) return;
        cleanup();
        setMessages([...suite, { role: "assistant", content: "⚠️ " + ev.payload.message }]); setLoading(false);
      });
      cleanup = () => { unChunk(); unDone(); unErr(); };
      await invoke("mistral_chat_stream", { messages: [...prefixe, ...suite], model, requestId: reqId });
    } catch (e: any) {
      cleanup();
      setMessages([...suite, { role: "assistant", content: "⚠️ " + String(e) }]);
      setLoading(false);
    }
  };

  if (hasKey === false) {
    return (
      <div className="chat" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🔑</div>
          <h2>Clé API Mistral requise</h2>
          <p style={{ color: "var(--text-2)" }}>
            L'assistant fonctionne en ligne via Mistral. Ajoutez votre clé API dans les Réglages pour l'activer.
          </p>
          <button className="btn primary" onClick={() => nav("/reglages")}>Aller aux Réglages</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
      <aside style={{ width: 230, minWidth: 230, borderRight: "1px solid var(--border)", overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        <button className="btn sm primary" onClick={nouvelleConversation}>+ Nouvelle conversation</button>
        {(convs ?? []).length === 0
          ? <div className="meta" style={{ padding: "8px 4px", fontSize: 12 }}>Aucune conversation enregistrée.</div>
          : (convs ?? []).map((c) => (
              <div key={c.id} onClick={() => chargerConv(c)} title={c.titre}
                onContextMenu={(e) => openCtx(e, [
                  { label: "Renommer", icon: "✏️", onClick: () => renommerConv(c) },
                  { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimerConv(c) },
                ])}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 9px", borderRadius: 8, cursor: "pointer",
                  background: c.id === convId ? "var(--accent-soft)" : "transparent" }}>
                <span style={{ flex: 1, fontSize: 13, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{c.titre || "Sans titre"}</span>
                <button className="btn ghost sm" aria-label="Supprimer la conversation" onClick={(e) => { e.stopPropagation(); supprimerConv(c); }}>🗑</button>
              </div>
            ))}
      </aside>
      <div className="chat" style={{ flex: 1, height: "100%" }}>
      <div className="topbar"><h1>Assistant IA</h1><span className="sub">propulsé par Mistral</span>
        <div className="spacer" />
        <Select value={model} onChange={(e) => choisirModele(e.target.value)} style={{ maxWidth: 200 }}
          title="Modèle Mistral utilisé">
          {MODELES_MISTRAL.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
        </Select>
        <button className="btn sm" aria-pressed={contexteActif} onClick={basculerContexte}
          title={contexteActif
            ? "L'IA reçoit le contexte de la classe (niveau, nombre d'élèves, séquences, programmation). Aucune donnée personnelle d'élève n'est transmise."
            : "L'IA ne reçoit aucun contexte sur ta classe."}>
          🏫 Contexte&nbsp;: {contexteActif ? "activé" : "désactivé"}</button>
        <button className="btn sm" onClick={() => setShowModif(true)}>✏️ Modifier une séquence</button>
        <button className="btn sm primary" onClick={() => setShowGen(true)}>✨ Générer une séquence</button>
      </div>
      {showGen && <GenerateurSequence model={model} onClose={() => setShowGen(false)} />}
      {showModif && <ModifierSequence model={model} onClose={() => setShowModif(false)} />}
      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", maxWidth: 520, textAlign: "center" }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✨</div>
            <h2 style={{ marginTop: 0 }}>Comment puis-je aider ?</h2>
            <div style={{ display: "grid", gap: 10, marginTop: 18 }}>
              {SUGGESTIONS.map((s) => (
                <button key={s} className="btn" style={{ textAlign: "left" }} onClick={() => envoyer(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={"msg " + m.role}>
            {m.role === "assistant" ? <Markdown texte={m.content || "…"} /> : m.content}
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && <div className="msg assistant" style={{ opacity: 0.6 }}>…</div>}
      </div>
      <div className="chat-input">
        <textarea className="textarea" rows={2} placeholder="Écrivez votre demande…" value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }} />
        <button className="btn primary" disabled={loading || !input.trim()} onClick={() => envoyer()}>Envoyer</button>
      </div>
      </div>
    </div>
  );
}

// ── Générateur de séquence (IA → vraies données) ───────────────────────────
function GenerateurSequence({ model, onClose }: { model: string; onClose: () => void }) {
  const nav = useNavigate();
  const [sujet, setSujet] = React.useState("");
  const [matiere, setMatiere] = React.useState("Français");
  const [cycle, setCycle] = React.useState("Cycle 2");
  const [niveau, setNiveau] = React.useState("CP");
  const [nb, setNb] = React.useState(4);
  const [busy, setBusy] = React.useState(false);
  const [erreur, setErreur] = React.useState("");

  const generer = async () => {
    if (!sujet.trim()) return;
    setBusy(true); setErreur("");
    const prompt =
      `Génère une séquence pédagogique pour le primaire français.\n` +
      `Sujet : ${sujet}\nMatière : ${matiere}\nCycle : ${cycle}\nNiveau : ${niveau}\nNombre de séances : ${nb}\n\n` +
      `Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, au format exact :\n` +
      `{"titre":"...","objectifs":"...","seances":[{"titre":"...","objectifs":"...","deroulement":"...","materiel":"...","duree":45}]}\n` +
      `Le déroulement doit être concret (phases, consignes). duree en minutes.`;
    try {
      const rep = await api.mistralChat(
        [{ role: "system", content: "Tu génères des séquences pédagogiques. Tu réponds en JSON strict uniquement." },
         { role: "user", content: prompt }],
        model,
      );
      const data = extraireJson(rep);
      const seq = {
        ...nouvelleSequence(),
        titre: data.titre || sujet,
        matiere, cycle,
        objectifs: data.objectifs || "",
        couleur: couleurPourMatiere(matiere),
      };
      await api.sequenceSave(seq);
      const seances = Array.isArray(data.seances) ? data.seances : [];
      for (let i = 0; i < seances.length; i++) {
        const s = seances[i];
        await api.seanceSave({
          ...nouvelleSeance(seq.id, i + 1),
          titre: s.titre || `Séance ${i + 1}`,
          objectifs: s.objectifs || "",
          deroulement: s.deroulement || "",
          materiel: s.materiel || "",
          duree: typeof s.duree === "number" ? s.duree : 45,
        });
      }
      onClose();
      nav(`/sequences/${seq.id}`);
    } catch (e: any) {
      setErreur("Échec : " + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal titre="✨ Générer une séquence" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={busy || !sujet.trim()} onClick={generer}>{busy ? "Génération…" : "Générer"}</button>
      </>}>
      <Field label="Sujet / thème"><Input autoFocus placeholder="ex. Les fractions, Le cycle de l'eau…" value={sujet} onChange={(e) => setSujet(e.target.value)} /></Field>
      <div className="row">
        <Field label="Matière"><Select value={matiere} onChange={(e) => setMatiere(e.target.value)}>{MATIERES.map((m) => <option key={m}>{m}</option>)}</Select></Field>
        <Field label="Cycle"><Select value={cycle} onChange={(e) => setCycle(e.target.value)}>{CYCLES.map((c) => <option key={c}>{c}</option>)}</Select></Field>
      </div>
      <div className="row">
        <Field label="Niveau"><Input value={niveau} onChange={(e) => setNiveau(e.target.value)} /></Field>
        <Field label="Nombre de séances"><Input type="number" min={1} max={12} value={nb} onChange={(e) => setNb(+e.target.value)} /></Field>
      </div>
      {erreur && <div style={{ color: "var(--danger)", fontSize: 13 }}>{erreur}</div>}
      <p style={{ color: "var(--text-2)", fontSize: 12.5 }}>L'IA crée une vraie séquence avec ses séances, que vous pourrez ensuite modifier.</p>
    </Modal>
  );
}

// ── Modifier une séquence existante (et ses séances) via l'IA ──────────────
function ModifierSequence({ model, onClose }: { model: string; onClose: () => void }) {
  const nav = useNavigate();
  const { data: sequences } = useAsync(() => api.sequencesList(), []);
  const [seqId, setSeqId] = React.useState("");
  const [instruction, setInstruction] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [erreur, setErreur] = React.useState("");

  const appliquer = async () => {
    const seq = (sequences ?? []).find((s) => s.id === seqId);
    if (!seq || !instruction.trim()) return;
    setBusy(true); setErreur("");
    try {
      const seancesAct: Seance[] = (await api.seancesList(seq.id)).sort((a, b) => a.numero - b.numero);
      const etat = {
        titre: seq.titre, objectifs: seq.objectifs,
        seances: seancesAct.map((s) => ({ numero: s.numero, titre: s.titre, objectifs: s.objectifs, deroulement: s.deroulement, materiel: s.materiel, duree: s.duree })),
      };
      const prompt =
        `Voici une séquence pédagogique existante (primaire français, ${seq.matiere}, ${seq.cycle}) au format JSON :\n` +
        `${JSON.stringify(etat)}\n\n` +
        `Demande de modification : ${instruction}\n\n` +
        `Réponds UNIQUEMENT avec la séquence MODIFIÉE complète, en JSON valide strict, même format :\n` +
        `{"titre":"...","objectifs":"...","seances":[{"numero":1,"titre":"...","objectifs":"...","deroulement":"...","materiel":"...","duree":45}]}\n` +
        `Conserve ce qui n'est pas visé par la demande. Numérote les séances à partir de 1. duree en minutes.`;
      const rep = await api.mistralChat(
        [{ role: "system", content: "Tu modifies des séquences pédagogiques. Tu réponds en JSON strict uniquement." },
         { role: "user", content: prompt }],
        model,
      );
      const data = extraireJson(rep);
      // Séquence : maj titre + objectifs (les autres champs sont conservés).
      await api.sequenceSave({ ...seq, titre: data.titre || seq.titre, objectifs: data.objectifs ?? seq.objectifs });
      // Séances : appariées par numéro → conserve id, bilan et images des existantes.
      const out: any[] = Array.isArray(data.seances) ? data.seances : [];
      for (let i = 0; i < out.length; i++) {
        const numero = i + 1;
        const base = seancesAct.find((s) => s.numero === numero) ?? nouvelleSeance(seq.id, numero);
        await api.seanceSave({
          ...base, numero,
          titre: out[i].titre ?? base.titre,
          objectifs: out[i].objectifs ?? base.objectifs,
          deroulement: out[i].deroulement ?? base.deroulement,
          materiel: out[i].materiel ?? base.materiel,
          duree: typeof out[i].duree === "number" ? out[i].duree : base.duree,
        });
      }
      // Supprime les séances en trop (au-delà du nouveau total).
      for (const ex of seancesAct) if (ex.numero > out.length) await api.seanceDelete(ex.id);
      onClose();
      nav(`/sequences/${seq.id}`);
    } catch (e: any) {
      setErreur("Échec : " + String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal titre="✏️ Modifier une séquence avec l'IA" onClose={onClose}
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={busy || !seqId || !instruction.trim()} onClick={appliquer}>{busy ? "Modification…" : "Appliquer"}</button>
      </>}>
      <Field label="Séquence à modifier">
        <Select value={seqId} onChange={(e) => setSeqId(e.target.value)}>
          <option value="">— choisir —</option>
          {(sequences ?? []).map((s: Sequence) => <option key={s.id} value={s.id}>{s.titre || "Sans titre"} ({s.matiere}, P{s.periode})</option>)}
        </Select>
      </Field>
      <Field label="Que faut-il changer ?">
        <textarea className="textarea" rows={4} value={instruction} onChange={(e) => setInstruction(e.target.value)}
          placeholder="ex. Ajoute une séance d'évaluation finale · Reformule les objectifs · Raccourcis le déroulé de la séance 2 · Différencie pour des élèves en difficulté" />
      </Field>
      {erreur && <div style={{ color: "var(--danger)", fontSize: 13 }}>{erreur}</div>}
      <p style={{ color: "var(--text-2)", fontSize: 12.5 }}>L'IA réécrit la séquence et ses séances selon ta demande. Les <b>bilans et images</b> des séances conservées sont préservés. Vérifie le résultat ensuite (tout reste modifiable à la main).</p>
    </Modal>
  );
}
