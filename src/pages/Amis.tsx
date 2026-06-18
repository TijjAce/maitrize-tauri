import React from "react";
import { Page } from "../App";
import { api, Identite, Ami, SyncConfig, SyncMessage, BoiteItem } from "../api";
import { Field, Input, Modal, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { releverBoiteAuxLettres, messageRecu } from "../inbox";

// Page « Amis » : identité de l'appareil + appariement par code d'invitation.
// 100 % local pour l'instant (aucun échange réseau) — la synchro chiffrée
// viendra dans un second temps.
export default function Amis() {
  const { data: identite, reload: reloadId } = useAsync(() => api.identiteGet(), []);
  const { data: amis, reload: reloadAmis } = useAsync(() => api.amisList(), []);
  const [inviter, setInviter] = React.useState(false);
  const [ajouter, setAjouter] = React.useState(false);
  const [vu, setVu] = React.useState<Ami | null>(null);
  const [supp, setSupp] = React.useState<Ami | null>(null);
  const [echange, setEchange] = React.useState<Ami | null>(null);

  return (
    <Page titre="Amis" sous="Reliez votre app à celle d'un collègue, en toute confidentialité"
      actions={<>
        <button className="btn" onClick={() => setAjouter(true)}>➕ Ajouter un ami</button>
        <button className="btn primary" onClick={() => setInviter(true)}>📤 Inviter</button>
      </>}>

      {identite && <CarteIdentite identite={identite} onRename={reloadId} />}

      <div className="card" style={{ marginTop: 14 }}>
        <h3 style={{ marginTop: 0 }}>Mes amis</h3>
        {(amis?.length ?? 0) === 0
          ? <Empty icone="🤝" titre="Aucun ami pour l'instant"
              sous="Cliquez « Inviter » pour générer un code à transmettre à un collègue, ou « Ajouter un ami » pour saisir le sien." />
          : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {amis!.map((a) => (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "var(--bg)" }}>
                  <span style={{ fontSize: 20 }}>{a.verifie ? "✅" : "👤"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }}>{a.nom || "Sans nom"}</div>
                    <div className="meta">{a.verifie ? "Identité vérifiée" : "Non vérifié — comparez le numéro de sécurité"}</div>
                  </div>
                  <button className="btn ghost sm" onClick={() => setEchange(a)}>✉️ Tester</button>
                  <button className="btn ghost sm" onClick={() => setVu(a)}>🔒 Sécurité</button>
                  <button className="btn ghost sm" onClick={() => setSupp(a)} aria-label="Supprimer">🗑</button>
                </div>
              ))}
            </div>}
      </div>

      <BoiteAuxLettresCard />

      <SyncConfigCard />

      {inviter && <InviterModal onClose={() => setInviter(false)} />}
      {echange && <EchangeModal ami={echange} onClose={() => setEchange(null)} />}
      {ajouter && <AjouterModal onClose={() => setAjouter(false)}
        onAjoute={(a) => { reloadAmis(); setAjouter(false); setVu(a); }} />}
      {vu && <SecuriteModal ami={vu} onClose={() => setVu(null)} onChange={reloadAmis} />}
      {supp && <Confirm message={`Supprimer ${supp.nom || "cet ami"} ?`}
        onYes={() => api.amiSupprimer(supp.id).then(reloadAmis)} onClose={() => setSupp(null)} />}
    </Page>
  );
}

function CarteIdentite({ identite, onRename }: { identite: Identite; onRename: () => void }) {
  const [nom, setNom] = React.useState(identite.nom);
  const [edit, setEdit] = React.useState(!identite.nom);
  const enregistrer = async () => { await api.identiteSetNom(nom.trim()); setEdit(false); onRename(); };
  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Mon identité</h3>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          {edit ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Input placeholder="Votre nom affiché (ex. Mme Dupont)" value={nom}
                onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && enregistrer()} />
              <button className="btn primary" onClick={enregistrer}>OK</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 16 }}>{identite.nom}</span>
              <button className="btn ghost sm" onClick={() => setEdit(true)} aria-label="Modifier">✏️</button>
            </div>
          )}
          <div className="meta" style={{ marginTop: 4 }}>Empreinte : <code>{identite.empreinte}</code></div>
        </div>
      </div>
    </div>
  );
}

function InviterModal({ onClose }: { onClose: () => void }) {
  const [code, setCode] = React.useState("");
  const [copie, setCopie] = React.useState(false);
  React.useEffect(() => { api.invitationCreer().then(setCode); }, []);
  const copier = async () => { await navigator.clipboard.writeText(code); setCopie(true); setTimeout(() => setCopie(false), 1500); };
  return (
    <Modal titre="Inviter un ami" onClose={onClose}
      footer={<button className="btn primary" onClick={onClose}>Fermer</button>}>
      <p style={{ marginTop: 0, color: "var(--text-2)" }}>
        Transmettez ce code à votre collègue <b>par un autre canal</b> (mail, message, en personne).
        Il le collera dans « Ajouter un ami ».
      </p>
      <textarea readOnly value={code} className="input" style={{ width: "100%", minHeight: 90, fontFamily: "monospace", fontSize: 12, resize: "none" }} />
      <div style={{ marginTop: 10 }}>
        <button className="btn primary" onClick={copier}>{copie ? "✓ Copié" : "📋 Copier le code"}</button>
      </div>
    </Modal>
  );
}

function AjouterModal({ onClose, onAjoute }: { onClose: () => void; onAjoute: (a: Ami) => void }) {
  const [code, setCode] = React.useState("");
  const [err, setErr] = React.useState("");
  const valider = async () => {
    setErr("");
    try { onAjoute(await api.invitationAccepter(code.trim())); }
    catch (e) { setErr(String(e)); }
  };
  return (
    <Modal titre="Ajouter un ami" onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" onClick={valider} disabled={!code.trim()}>Ajouter</button></>}>
      <Field label="Code d'invitation reçu">
        <textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="MZ1...."
          className="input" style={{ width: "100%", minHeight: 90, fontFamily: "monospace", fontSize: 12, resize: "none" }} />
      </Field>
      {err && <div style={{ color: "var(--red)", fontSize: 13 }}>{err}</div>}
    </Modal>
  );
}

// Boîte de réception : ce que les amis envoient arrive « en attente » ; on
// choisit de récupérer (importer) ou de jeter chaque élément.
const BOITE_ICO: Record<BoiteItem["type"], string> = { sequence: "📘", projet: "📁", programmation: "🗓" };
const BOITE_LIB: Record<BoiteItem["type"], string> = { sequence: "Séquence", projet: "Projet", programmation: "Programmation" };

function BoiteAuxLettresCard() {
  const { data: items, reload } = useAsync(() => api.boiteListe(), []);
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // Recharge la liste quand la relève automatique (App) signale une réception.
  React.useEffect(() => {
    const onRecu = () => reload();
    window.addEventListener("maitrize:recu", onRecu);
    return () => window.removeEventListener("maitrize:recu", onRecu);
  }, [reload]);

  const relever = async () => {
    setBusy(true); setMsg("Relève en cours…");
    try {
      const recus = await releverBoiteAuxLettres();
      for (const r of recus) toast(messageRecu(r));
      reload();
      setMsg(recus.length === 0 ? "Rien de nouveau." : `${recus.length} nouvel(s) élément(s) reçu(s).`);
    } catch (e) { setMsg(String(e)); }
    finally { setBusy(false); }
  };
  const recuperer = async (it: BoiteItem) => {
    setMsg("");
    try { await api.boiteRecuperer(it.id); reload(); toast(`${BOITE_LIB[it.type]} « ${it.titre || "Sans titre"} » récupéré ✅`, { icone: "✅" }); }
    catch (e) { setMsg(String(e)); }
  };
  const jeter = async (it: BoiteItem) => { setMsg(""); try { await api.boiteSupprimer(it.id); reload(); } catch (e) { setMsg(String(e)); } };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <h3 style={{ margin: 0, flex: 1 }}>📬 Boîte de réception{(items?.length ?? 0) > 0 ? ` (${items!.length})` : ""}</h3>
        <button className="btn sm" onClick={relever} disabled={busy}>{busy ? "…" : "🔄 Relever"}</button>
      </div>
      <p className="meta" style={{ marginTop: 6 }}>
        Ce que vos amis vous envoient arrive ici. <b>Rien n'est importé</b> tant que vous ne l'avez pas récupéré.
        La relève est aussi automatique toutes les 2 minutes.
      </p>
      {(items?.length ?? 0) === 0
        ? <Empty icone="📭" titre="Boîte vide" sous="Aucun élément en attente." />
        : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {items!.map((it) => (
              <div key={it.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, background: "var(--bg)" }}>
                <span style={{ fontSize: 20 }} aria-hidden="true">{BOITE_ICO[it.type]}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{BOITE_LIB[it.type]} « {it.titre || "Sans titre"} »</div>
                  <div className="meta">De {it.deNom || "un ami"}{it.ts ? ` · ${new Date(it.ts).toLocaleDateString("fr-FR")}` : ""}</div>
                </div>
                <button className="btn primary sm" onClick={() => recuperer(it)}>✅ Récupérer</button>
                <button className="btn ghost sm" aria-label="Jeter" onClick={() => jeter(it)}>🗑</button>
              </div>
            ))}
          </div>}
      {msg && <div className="meta" style={{ marginTop: 8 }} role="status">{msg}</div>}
    </div>
  );
}

// Configuration du stockage S3 (MinIO en local pour tester) + bouton de test.
function SyncConfigCard() {
  const { data: cfg, reload } = useAsync(() => api.syncConfigGet(), []);
  const [form, setForm] = React.useState<SyncConfig | null>(null);
  const [secret, setSecret] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [ouvert, setOuvert] = React.useState(false);
  React.useEffect(() => { if (cfg) setForm(cfg); }, [cfg]);
  if (!form) return null;
  const up = (p: Partial<SyncConfig>) => setForm({ ...form, ...p });
  const enregistrer = async () => {
    await api.syncConfigSet({ endpoint: form.endpoint, region: form.region, bucket: form.bucket, access: form.access, secret: secret || undefined });
    setSecret(""); setMsg("Enregistré."); reload();
  };
  const tester = async () => {
    setMsg("Test en cours…");
    try { setMsg(await api.syncTest()); } catch (e) { setMsg(String(e)); }
  };
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setOuvert((v) => !v)}>
        <h3 style={{ margin: 0, flex: 1 }}>⚙️ Stockage de synchro {cfg?.aSecret ? "✅" : "(non configuré)"}</h3>
        <span>{ouvert ? "▲" : "▼"}</span>
      </div>
      {ouvert && <div style={{ marginTop: 12 }}>
        <p className="meta" style={{ marginTop: 0 }}>Test local : lancez MinIO et renseignez l'endpoint <code>http://localhost:9000</code>, un bucket, et les clés MinIO.</p>
        <div className="row">
          <Field label="Endpoint"><Input value={form.endpoint} placeholder="http://localhost:9000" onChange={(e) => up({ endpoint: e.target.value })} /></Field>
          <Field label="Région"><Input value={form.region} placeholder="us-east-1" onChange={(e) => up({ region: e.target.value })} /></Field>
        </div>
        <div className="row">
          <Field label="Bucket"><Input value={form.bucket} placeholder="maitrize-sync" onChange={(e) => up({ bucket: e.target.value })} /></Field>
          <Field label="Access Key"><Input value={form.access} onChange={(e) => up({ access: e.target.value })} /></Field>
        </div>
        <Field label={"Secret Key" + (cfg?.aSecret ? " (déjà enregistré — laissez vide pour garder)" : "")}>
          <Input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} />
        </Field>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
          <button className="btn primary" onClick={enregistrer}>Enregistrer</button>
          <button className="btn" onClick={tester}>🔌 Tester la connexion</button>
          {msg && <span className="meta">{msg}</span>}
        </div>
      </div>}
    </div>
  );
}

// Test de liaison chiffrée avec un ami (envoyer/relever un message).
// Le partage de séquences se fait désormais nativement dans l'onglet Séquences.
function EchangeModal({ ami, onClose }: { ami: Ami; onClose: () => void }) {
  const [texte, setTexte] = React.useState("");
  const [recus, setRecus] = React.useState<SyncMessage[] | null>(null);
  const [msg, setMsg] = React.useState("");
  const envoyer = async () => {
    setMsg("Envoi…");
    try { await api.syncEnvoyer(ami.id, texte); setTexte(""); setMsg("Message envoyé ✅"); }
    catch (e) { setMsg(String(e)); }
  };
  const relever = async () => {
    setMsg("Relève…");
    try { const m = await api.syncRelever(ami.id); setRecus(m); setMsg(`${m.length} message(s) reçu(s).`); }
    catch (e) { setMsg(String(e)); }
  };
  return (
    <Modal titre={`Tester la liaison — ${ami.nom || "ami"}`} onClose={onClose}
      footer={<button className="btn" onClick={onClose}>Fermer</button>}>
      <p className="meta" style={{ marginTop: 0 }}>Vérifie que la liaison chiffrée fonctionne. Pour partager une séquence, va dans l'onglet Séquences → 🤝.</p>
      <Field label="Message à envoyer (chiffré de bout en bout)">
        <textarea value={texte} onChange={(e) => setTexte(e.target.value)} className="input"
          style={{ width: "100%", minHeight: 60, resize: "none" }} placeholder="Tape un test…" />
      </Field>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className="btn primary" onClick={envoyer} disabled={!texte.trim()}>📤 Envoyer</button>
        <button className="btn" onClick={relever}>📥 Relever</button>
        {msg && <span className="meta">{msg}</span>}
      </div>
      {recus && recus.length > 0 && <div style={{ marginTop: 12 }}>
        {recus.map((m, i) => (
          <div key={i} style={{ padding: "8px 10px", borderRadius: 8, background: "var(--bg)", marginBottom: 6 }}>
            <div className="meta">{m.nom} · {new Date(m.ts).toLocaleString("fr-FR")}</div>
            <div style={{ whiteSpace: "pre-wrap" }}>{m.texte}</div>
          </div>
        ))}
      </div>}
    </Modal>
  );
}

function SecuriteModal({ ami, onClose, onChange }: { ami: Ami; onClose: () => void; onChange: () => void }) {
  const basculer = async () => { await api.amiSetVerifie(ami.id, !ami.verifie); onChange(); onClose(); };
  return (
    <Modal titre={`Numéro de sécurité — ${ami.nom || "ami"}`} onClose={onClose}
      footer={<><button className="btn" onClick={onClose}>Fermer</button>
        <button className={"btn " + (ami.verifie ? "" : "primary")} onClick={basculer}>
          {ami.verifie ? "Marquer non vérifié" : "✅ Les numéros correspondent"}</button></>}>
      <p style={{ marginTop: 0, color: "var(--text-2)" }}>
        Comparez ce numéro avec celui affiché sur l'appareil de votre ami (par téléphone, en personne…).
        S'ils sont <b>identiques</b>, personne n'intercepte votre liaison.
      </p>
      <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, letterSpacing: 1, textAlign: "center",
        padding: "16px 8px", background: "var(--bg)", borderRadius: 9, userSelect: "all" }}>
        {ami.numeroSecurite}
      </div>
    </Modal>
  );
}
