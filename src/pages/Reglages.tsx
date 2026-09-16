import React from "react";
import { Page } from "../App";
import { api, isMac, texteErreur, type InfoCopie, type SauvegardeDistante, type DossierDonnees, NIVEAUX_SCOLAIRES, MATIERES, COULEURS, couleurHex, couleurPourMatiere, choisirCouleurMatiere, getMatiereOverrides, telechargerTexte, MODELES_MISTRAL, normaliserModele, type EtatModele, type PortableInfo } from "../api";
import { Field, Input, Select, Modal, Confirm, useAsync } from "../components/ui";
import { MesAppareils } from "../components/MesAppareils";
import { confirmer } from "../components/confirmer";
import { toast } from "../components/Toaster";
import { applyTheme, MODES, ACCENTS, STYLES } from "../theme";
import { lireAcceptationCgu, CguAcceptation } from "../components/CGU";
import { getVersion } from "@tauri-apps/api/app";
import { copierLeBureau, suivreLaCopie } from "../components/CopieDuBureau";

const ONGLETS = [
  ["general", "Général"],
  ["ia", "Assistant IA"],
  ["donnees", "Données & synchro"],
  ["partage", "Partage WiFi"],
] as const;
type Onglet = typeof ONGLETS[number][0];

export default function Reglages() {
  const [onglet, setOnglet] = React.useState<Onglet>("general");
  const [s, setS] = React.useState<Record<string, string>>({});
  const [chargé, setChargé] = React.useState(false);
  const [testMsg, setTestMsg] = React.useState("");
  const [testEnCours, setTestEnCours] = React.useState(false);
  const [etats, setEtats] = React.useState<EtatModele[] | null>(null);
  const [dataMsg, setDataMsg] = React.useState("");
  const [showMatieres, setShowMatieres] = React.useState(false);
  const [cgu, setCgu] = React.useState<CguAcceptation | null>(null);
  const [version, setVersion] = React.useState("");
  React.useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);
  const importInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.settingsAll().then((m) => {
      // Un modèle enregistré peut avoir été retiré par Mistral depuis. On répare
      // le réglage à l'ouverture, sinon la liste afficherait un choix corrigé
      // pendant que la base garde la valeur qui échoue.
      const corrigé = normaliserModele(m.mistralModel);
      if (m.mistralModel && m.mistralModel !== corrigé) {
        m = { ...m, mistralModel: corrigé };
        api.settingSet("mistralModel", corrigé);
      }
      setS(m); setChargé(true);
    });
  }, []);
  React.useEffect(() => { lireAcceptationCgu().then(setCgu); }, []);

  const exporter = async () => {
    try {
      const json = await api.exportData();
      const ok = await telechargerTexte(`maitrize-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`, json);
      setDataMsg(ok ? "✅ Sauvegarde enregistrée" : "Export annulé");
    } catch (e: any) { setDataMsg("❌ " + String(e)); }
  };

  // Export du fichier de base SQLite (copie consistante via le backend).
  const exporterBase = async () => {
    try {
      const { save } = await import("@tauri-apps/plugin-dialog");
      const chemin = await save({
        defaultPath: `maitrize-v2-${new Date().toISOString().slice(0, 10)}.sqlite3`,
        filters: [{ name: "Base SQLite", extensions: ["sqlite3"] }],
      });
      if (!chemin) { setDataMsg("Export annulé"); return; }
      await api.exporterBase(chemin);
      setDataMsg("✅ Base exportée");
    } catch (e: any) { setDataMsg("❌ " + String(e)); }
  };

  const importer = async (file: File) => {
    if (!(await confirmer("Restaurer cette sauvegarde remplacera vos données actuelles.\nUne copie de sécurité de vos données sera faite avant.", { oui: "Restaurer", danger: true }))) return;
    try {
      const txt = await file.text();
      const copie = await api.importData(txt);
      setDataMsg(`✅ Restauration terminée — rechargez l'app. Vos données d'avant sont gardées dans « ${copie} ».`);
    } catch (e: any) { setDataMsg("❌ " + String(e)); }
  };

  const set = (cle: string, valeur: string) => {
    const next = { ...s, [cle]: valeur };
    setS(next);
    api.settingSet(cle, valeur);
    if (cle === "apparence" || cle === "accent" || cle === "styleInterface" || cle === "liseret") applyTheme(next);
  };

  const tester = async () => {
    setTestEnCours(true); setTestMsg(""); setEtats(null);
    try { await api.mistralTest(s.mistralModel); setTestMsg("✅ Connexion réussie"); }
    catch (e: any) { setTestMsg("❌ " + String(e)); }
    finally { setTestEnCours(false); }
  };

  // Mistral n'ouvre pas les mêmes modèles à tous les abonnements, et refuse
  // ceux qu'il n'accorde pas par un message de débit trompeur. Un essai réel
  // sur chacun évite de chercher longtemps pourquoi l'assistant reste muet.
  const testerLesModeles = async () => {
    setTestEnCours(true); setTestMsg(""); setEtats(null);
    try { setEtats(await api.mistralModelesDisponibles(MODELES_MISTRAL.map((m) => m.id))); }
    catch (e: any) { setTestMsg("❌ " + String(e)); }
    finally { setTestEnCours(false); }
  };

  // ── Version portable (serveur local WiFi + QR) ──────────────────
  const [portable, setPortable] = React.useState<PortableInfo | null>(null);
  const [portMsg, setPortMsg] = React.useState("");
  const activerPortable = async () => {
    setPortMsg("");
    try { setPortable(await api.portableDemarrer()); }
    catch (e: any) { setPortMsg("❌ " + String(e)); }
  };
  const arreterPortable = async () => {
    try { await api.portableArreter(); } catch { /* ignore */ }
    setPortable(null);
  };
  // Arrête le partage si on quitte les Réglages (sécurité).
  React.useEffect(() => () => { api.portableArreter().catch(() => {}); }, []);

  if (!chargé) return <Page titre="Réglages"><div /></Page>;

  return (
    <Page titre="Réglages">
      <div className="seg" style={{ marginBottom: 18 }}>
        {ONGLETS.map(([k, l]) => (
          <button key={k} className={onglet === k ? "active" : ""} onClick={() => setOnglet(k as Onglet)}>{l}</button>
        ))}
      </div>
      {onglet === "general" && <>
      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>👤 Identité enseignant</h3>
        <Field label="Nom"><Input value={s.enseignantNom ?? ""} onChange={(e) => set("enseignantNom", e.target.value)} /></Field>
        <Field label="École"><Input value={s.ecole ?? ""} onChange={(e) => set("ecole", e.target.value)} /></Field>
        <div className="row">
          <Field label="Niveau de la classe">
            <Select value={s.niveauClasse ?? ""} onChange={(e) => set("niveauClasse", e.target.value)}>
              <option value="">—</option>{NIVEAUX_SCOLAIRES.map((n) => <option key={n}>{n}</option>)}
            </Select>
          </Field>
          <Field label="Zone de vacances">
            <Select value={s.zoneVacances ?? "A"} onChange={(e) => set("zoneVacances", e.target.value)}>
              <option value="A">Zone A</option><option value="B">Zone B</option><option value="C">Zone C</option>
            </Select>
          </Field>
        </div>
        <Field label="Type de structure">
          <Select value={s.typeStructure ?? "ordinaire"} onChange={(e) => set("typeStructure", e.target.value)}>
            <option value="ordinaire">Classe ordinaire</option>
            <option value="ime">IME / ULIS / inclusion (suivi individualisé)</option>
          </Select>
        </Field>
        {(s.typeStructure ?? "ordinaire") === "ime" && (
          <div style={{ fontSize: 12, color: "var(--text-2)" }}>
            Active les onglets <b>Dispositifs</b> (PPS, PAP, PAI, PPRE, PPI) et <b>GEVA-Sco</b> dans Élèves,
            et l'<b>organisation IME par semaine</b> dans l'emploi du temps, dont « Générer le jour » tient compte.
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>🎨 Apparence</h3>

        <Field label="Mode">
          <div className="seg" style={{ flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <button key={m.id} className={(s.apparence || "clair") === m.id ? "active" : ""} onClick={() => set("apparence", m.id)}>{m.label}</button>
            ))}
          </div>
        </Field>

        <Field label="Thème de couleur">
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {ACCENTS.map((a) => {
              const on = (s.accent || "indigo") === a.id;
              return (
                <button key={a.id} title={a.id} onClick={() => set("accent", a.id)}
                  style={{ width: 30, height: 30, borderRadius: "50%", background: a.hex, cursor: "pointer",
                    border: on ? "3px solid var(--text)" : "2px solid transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                  {on ? "✓" : ""}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Style d'interface">
          <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            {STYLES.map((st) => {
              const on = (s.styleInterface || "doux") === st.id;
              return (
                <button key={st.id} onClick={() => set("styleInterface", st.id)}
                  style={{ textAlign: "left", padding: "10px 12px", borderRadius: 10, cursor: "pointer",
                    border: on ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: on ? "var(--accent-soft)" : "var(--bg)", color: "var(--text)" }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5 }}>{st.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-2)" }}>{st.desc}</div>
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Liseré lumineux">
          <div className="seg">
            {[{ id: "on", label: "Activé" }, { id: "off", label: "Désactivé" }].map((o) => (
              <button key={o.id} className={(s.liseret || "on") === o.id ? "active" : ""}
                onClick={() => set("liseret", o.id)}>{o.label}</button>
            ))}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 6 }}>
            Halo coloré animé autour de la fenêtre. En pause quand l'app n'est pas au premier plan.
          </div>
        </Field>

        <Field label="Emploi du temps">
          <button className="btn" onClick={() => setShowMatieres(true)}>🎨 Couleurs des matières…</button>
        </Field>
      </div>

      </>}

      {onglet === "ia" && <>
      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>✨ Assistant IA — Mistral (en ligne)</h3>
        <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
          Obtenez une clé sur console.mistral.ai. Elle est stockée localement sur votre machine.
        </p>
        <Field label="Clé API Mistral">
          <Input type="password" placeholder="••••••••••••" value={s.mistralApiKey ?? ""}
            onChange={(e) => set("mistralApiKey", e.target.value)} />
        </Field>
        <Field label="Modèle">
          <Select value={normaliserModele(s.mistralModel)} onChange={(e) => set("mistralModel", e.target.value)}>
            {MODELES_MISTRAL.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" disabled={testEnCours || !s.mistralApiKey} onClick={tester}>
            {testEnCours ? "Test en cours…" : "Tester la connexion"}
          </button>
          <button className="btn" disabled={testEnCours || !s.mistralApiKey} onClick={testerLesModeles}>
            Quels modèles puis-je utiliser ?
          </button>
          <span style={{ fontSize: 13 }}>{testMsg}</span>
        </div>
        {etats && (
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", fontSize: 13 }}>
            {etats.map((e) => {
              const nom = MODELES_MISTRAL.find((m) => m.id === e.id)?.label ?? e.id;
              return (
                <li key={e.id} style={{ padding: "5px 0", borderTop: "1px solid var(--border)" }}>
                  <strong>{e.disponible ? "✅" : "❌"} {nom}</strong>
                  {!e.disponible && (
                    <div style={{ color: "var(--text-2)", marginTop: 2 }}>{e.detail}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      </>}

      {onglet === "donnees" && <>
      {/* Du plus courant au plus rare : ce qu'on fait tous les jours d'abord,
          l'emplacement des fichiers et l'export de secours à la fin. */}
      <MesAppareils />
      <SauvegardeS3Card />
      <CopieDuBureauCard />
      <CopiesAutomatiques />
      <DossierDesDonnees />
      <JournalIncidents />

      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>💾 Export manuel</h3>
        <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
          Un fichier unique contenant tout, pièces jointes comprises — à garder
          sur une clé avant une manipulation délicate. La clé API n'y figure jamais.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={exporter}>⬇️ Exporter (JSON)</button>
          <input ref={importInput} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
          <button className="btn" onClick={() => importInput.current?.click()}>⬆️ Importer</button>
          <button className="btn ghost sm" onClick={exporterBase} title="Copie brute de la base, pour l'ouvrir dans un outil SQLite">
            base .sqlite3
          </button>
          <span style={{ fontSize: 13 }}>{dataMsg}</span>
        </div>
      </div>
      </>}

      {onglet === "partage" && <>
      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>📱 Version portable (WiFi)</h3>
        <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
          Consultez vos données sur votre téléphone, sur le même réseau WiFi. Rien n'est
          envoyé sur internet : tout reste sur le réseau local, et le partage s'arrête
          quand vous quittez cette page.
        </p>
        {!portable ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn primary" onClick={activerPortable}>📤 Envoyer vers le téléphone</button>
            {portMsg && <span style={{ fontSize: 13 }}>{portMsg}</span>}
          </div>
        ) : (
          <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
            <div className="qr-portable" aria-label="QR code de connexion"
              dangerouslySetInnerHTML={{ __html: portable.qrSvg }} />
            <div style={{ minWidth: 220, flex: 1 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 600 }}>Scannez ce QR code avec l'appareil photo de votre téléphone.</p>
              <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--text-2)" }}>
                Ou ouvrez cette adresse dans le navigateur : <br />
                <code style={{ fontSize: 12 }}>{portable.url.replace(/\?t=.*/, "")}</code>
              </p>
              <button className="btn danger" onClick={arreterPortable}>⏹ Arrêter le partage</button>
            </div>
          </div>
        )}
      </div>

      </>}

      {onglet === "general" && (
      <div className="card" style={{ maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>ℹ️ À propos</h3>
        <p style={{ color: "var(--text-2)", margin: 0, fontSize: 13 }}>
          <b>Maitrize V2{version ? ` — v${version}` : ""}</b> · cross-plateforme (Tauri). Données stockées localement, sans compte ni serveur.
        </p>
        {cgu && (
          <p style={{ color: "var(--text-2)", margin: "10px 0 0", fontSize: 12 }}>
            ✅ CGU (v{cgu.version}) acceptées le {new Date(cgu.accepteeLe).toLocaleDateString("fr-FR")}
          </p>
        )}
      </div>
      )}

      {showMatieres && <CouleursMatieresModal onClose={() => setShowMatieres(false)} />}
    </Page>
  );
}

// Liste d'années scolaires autour de l'année donnée (pour le sélecteur du seed).

// Carte « Développement » : génère des données factices pour tester rapidement.
function CouleursMatieresModal({ onClose }: { onClose: () => void }) {
  const [over, setOver] = React.useState<Record<string, string>>(() => ({ ...getMatiereOverrides() }));
  // Les intitulés de l'emploi du temps (organisation IME) dont la couleur a été choisie.
  const [intitules] = React.useState(() => Object.keys(getMatiereOverrides()).filter((m) => !MATIERES.includes(m))
    .sort((a, b) => a.localeCompare(b, "fr")));

  const choisir = (m: string, c: string) => {
    choisirCouleurMatiere(m, c).catch((e) => toast(`Couleur non enregistrée : ${e}`, { icone: "⚠️" }));
    setOver({ ...getMatiereOverrides() });
  };
  const ligne = (m: string) => (
    <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
      <div style={{ flex: 1, fontSize: 13.5 }}>{m}</div>
      <div style={{ display: "flex", gap: 5 }}>
        {COULEURS.map((c) => (
          <button key={c} title={c} onClick={() => choisir(m, c)}
            style={{ width: 20, height: 20, borderRadius: 5, background: couleurHex[c], cursor: "pointer",
              border: couleurPourMatiere(m) === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />
        ))}
        {over[m] && <button className="btn ghost sm" onClick={() => choisir(m, "")}>défaut</button>}
      </div>
    </div>
  );

  return (
    <Modal large titre="🎨 Couleurs des matières" onClose={onClose}
      footer={<><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Personnalisez la couleur de chaque matière (utilisée dans le planning, les séquences, etc.).
      </p>
      {MATIERES.map(ligne)}
      {intitules.length > 0 && (
        <>
          <h4 style={{ margin: "16px 0 2px" }}>Intitulés de l'emploi du temps</h4>
          <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 12.5 }}>
            Couleurs choisies dans Organisation, sur un créneau.
          </p>
          {intitules.map(ligne)}
        </>
      )}
    </Modal>
  );
}

// Sauvegarde chiffrée de toute la base sur un stockage S3-compatible
// (MinIO local aujourd'hui ; serveur en ligne plus tard = juste l'adresse change).
function SauvegardeS3Card() {
  const [cfg, setCfg] = React.useState({ endpoint: "", region: "us-east-1", bucket: "", access: "", secret: "", aSecret: false });
  const [phrase, setPhrase] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [busy, setBusy] = React.useState("");
  const [versions, setVersions] = React.useState<SauvegardeDistante[] | null>(null);
  const [aRestaurer, setARestaurer] = React.useState<SauvegardeDistante | null>(null);

  React.useEffect(() => {
    api.syncConfigGet().then((c) => setCfg((p) => ({ ...p, endpoint: c.endpoint, region: c.region || "us-east-1", bucket: c.bucket, access: c.access, aSecret: c.aSecret }))).catch(() => {});
    api.settingGet("sauvegarde_phrase").then((v) => setPhrase(v || "")).catch(() => {});
  }, []);

  const enregistrer = async () => {
    await api.syncConfigSet({ endpoint: cfg.endpoint.trim(), region: cfg.region.trim() || "us-east-1", bucket: cfg.bucket.trim(), access: cfg.access.trim(), secret: cfg.secret ? cfg.secret : undefined });
    await api.settingSet("sauvegarde_phrase", phrase.trim());
  };
  const action = async (cle: string, fn: () => Promise<string>) => {
    setBusy(cle); setMsg("");
    try { await enregistrer(); setMsg(await fn()); } catch (e: any) { setMsg("❌ " + String(e)); } finally { setBusy(""); }
  };
  // Lister avant de restaurer : choisir sa version est tout l'intérêt d'un
  // historique, et voir la date évite d'écraser un mois de travail par une
  // sauvegarde plus ancienne qu'on croyait récente.
  const voirVersions = async () => {
    setBusy("liste"); setMsg("");
    try { await enregistrer(); setVersions(await api.sauvegardeListe()); }
    catch (e: any) { setMsg("❌ " + String(e)); }
    finally { setBusy(""); }
  };

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>☁️ Sauvegarde sur mon stockage (S3 / MinIO)</h3>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Sauvegarde chiffrée de toutes vos données sur votre propre stockage (MinIO en local, un NAS, ou un serveur en ligne — il suffira de changer l'adresse). Le stockage ne voit que du contenu chiffré.
      </p>
      <div className="row">
        <Field label="Adresse (endpoint)"><Input value={cfg.endpoint} placeholder="http://192.168.1.20:9000" onChange={(e) => setCfg({ ...cfg, endpoint: e.target.value })} /></Field>
        <Field label="Bucket"><Input value={cfg.bucket} placeholder="maitrize" onChange={(e) => setCfg({ ...cfg, bucket: e.target.value })} /></Field>
      </div>
      <div className="row">
        <Field label="Clé d'accès"><Input value={cfg.access} onChange={(e) => setCfg({ ...cfg, access: e.target.value })} /></Field>
        <Field label="Clé secrète"><Input type="password" placeholder={cfg.aSecret ? "•••••••• (déjà enregistrée)" : ""} value={cfg.secret} onChange={(e) => setCfg({ ...cfg, secret: e.target.value })} /></Field>
      </div>
      <Field label="Phrase secrète de sauvegarde (chiffre les données — à conserver précieusement !)">
        <Input type="password" value={phrase} placeholder="une phrase que vous seul connaissez" onChange={(e) => setPhrase(e.target.value)} />
      </Field>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
        <button className="btn" disabled={!!busy} onClick={enregistrer}>💾 Enregistrer la config</button>
        <button className="btn" disabled={!!busy} onClick={() => action("test", () => api.syncTest())}>{busy === "test" ? "…" : "🔌 Tester"}</button>
        <button className="btn primary" disabled={!!busy} onClick={() => action("push", () => api.sauvegardePush())}>{busy === "push" ? "Envoi…" : "☁️ Sauvegarder maintenant"}</button>
        <button className="btn" disabled={!!busy} onClick={voirVersions}>{busy === "liste" ? "…" : "🕓 Sauvegardes en ligne"}</button>
      </div>
      {msg && <p style={{ fontSize: 13, marginBottom: 0 }}>{msg}</p>}

      {versions && (
        <div style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
          {!versions.length ? (
            <p style={{ fontSize: 13, color: "var(--text-2)", margin: 0 }}>
              Aucune sauvegarde sur ce stockage pour l'instant.
            </p>
          ) : (
            <>
              <p style={{ fontSize: 13, color: "var(--text-2)", margin: "0 0 6px" }}>
                Les {versions.length} dernières sauvegardes, la plus récente en haut.
                Restaurer <b>remplace</b> vos données locales.
              </p>
              {versions.map((v) => (
                <div key={v.cle} style={{ display: "flex", gap: 10, alignItems: "center",
                  padding: "5px 0", borderTop: "1px solid var(--border)", fontSize: 13 }}>
                  <span style={{ flex: 1 }}>
                    {v.date ? formatDateSauvegarde(v.date) : "Ancienne sauvegarde (sans date)"}
                    <div className="meta">
                      {Math.round(v.octets / 1024)} Ko
                      {v.travailLocalPlusRecent && " · ⚠️ vous avez travaillé ici depuis"}
                    </div>
                  </span>
                  <button className="btn sm" disabled={!!busy}
                    onClick={() => setARestaurer(v)}>Restaurer</button>
                  <button className="btn ghost sm" disabled={!!busy} aria-label="Supprimer cette sauvegarde"
                    onClick={async () => {
                      const quand = v.date ? formatDateSauvegarde(v.date) : "(sans date)";
                      if (!(await confirmer(`Supprimer définitivement la sauvegarde du ${quand} de votre stockage ?`, { oui: "Supprimer", danger: true }))) return;
                      setBusy("suppr");
                      try { setMsg(await api.sauvegardeSupprimer(v.cle)); setVersions((vs) => (vs ?? []).filter((x) => x.cle !== v.cle)); }
                      catch (e: any) { setMsg("❌ " + String(e)); }
                      finally { setBusy(""); }
                    }}>🗑</button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {aRestaurer && (
        <Confirm
          message={`Restaurer la sauvegarde du ${aRestaurer.date ? formatDateSauvegarde(aRestaurer.date) : "(sans date)"} ? Toutes vos données actuelles seront remplacées par celles de cette sauvegarde, sur cet ordinateur.${aRestaurer.travailLocalPlusRecent ? " Attention : vous avez modifié des données sur cet ordinateur APRÈS cette sauvegarde." : ""} Une copie de sécurité de vos données actuelles est faite juste avant.`}
          onYes={() => { const v = aRestaurer; setARestaurer(null); action("pull", () => api.sauvegardePull(v.cle)); }}
          onClose={() => setARestaurer(null)} />
      )}
    </div>
  );
}

/**
 * Emplacement des données.
 *
 * Utile pour poser le dossier sur un disque externe ou une autre partition.
 * Un chemin réseau est refusé par le backend : une base SQLite ne survit pas
 * à un partage SMB, et l'échec arrive des jours plus tard.
 */
function DossierDesDonnees() {
  const [d, setD] = React.useState<DossierDonnees | null>(null);
  const [msg, setMsg] = React.useState("");
  React.useEffect(() => { api.dossierDonneesGet().then(setD).catch(() => {}); }, []);

  const changer = async () => {
    setMsg("");
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const choix = await open({ directory: true, multiple: false, title: "Dossier des données Maitrize" });
      if (typeof choix !== "string") return;
      setD(await api.dossierDonneesSet(choix));
      setMsg("✅ Emplacement enregistré. Fermez et rouvrez l'application. Vos données actuelles ne sont pas déplacées : copiez-les vous-même, ou restaurez une sauvegarde.");
    } catch (e: any) { setMsg("❌ " + String(e)); }
  };

  const revenir = async () => {
    setMsg("");
    try {
      setD(await api.dossierDonneesSet(null));
      setMsg("✅ Retour à l'emplacement par défaut. Fermez et rouvrez l'application.");
    } catch (e: any) { setMsg("❌ " + String(e)); }
  };

  if (!d) return null;
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>📂 Emplacement des données</h3>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Base, fichiers joints et copies quotidiennes. Doit rester un dossier
        <b> local</b> : sur un partage réseau, la base se corrompt.
      </p>
      <div style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", wordBreak: "break-all",
        background: "var(--panel-2)", padding: "6px 8px", borderRadius: 6 }}>
        {d.chemin}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 0 10px" }}>
        {d.personnalise ? "Emplacement personnalisé" : "Emplacement par défaut"}
        {d.octets > 0 && ` · ${Math.round(d.octets / 1024)} Ko à la racine`}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn" onClick={changer}>Choisir un autre dossier…</button>
        {d.personnalise && <button className="btn" onClick={revenir}>Revenir au dossier par défaut</button>}
      </div>
      {msg && <p style={{ fontSize: 13, marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}

/** « aujourd'hui à 14:32 », « hier à 9:05 », « le 12/09 à 14:32 ». */
function quandCopie(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const heure = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const ecart = Math.round((jour(new Date()) - jour(d)) / 86_400_000);
  if (ecart === 0) return `aujourd'hui à ${heure}`;
  if (ecart === 1) return `hier à ${heure}`;
  return `le ${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} à ${heure}`;
}

/**
 * La copie du bureau dans un vrai dossier de l'ordinateur : de vrais fichiers,
 * qui restent là si les données de Maitrize venaient à manquer.
 */
function CopieDuBureauCard() {
  const [info, setInfo] = React.useState<InfoCopie | null>(null);
  const [msg, setMsg] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const relire = React.useCallback(() => { api.copieBureauInfo().then(setInfo).catch(() => {}); }, []);
  React.useEffect(() => {
    relire();
    return suivreLaCopie(relire);
  }, [relire]);

  const regler = async (active: boolean, emplacement?: string) => {
    setMsg("");
    try {
      setInfo(await api.copieBureauRegler(active, emplacement));
      if (active) copierLeBureau().then(relire).catch(() => {});
    } catch (e) { setMsg("❌ " + texteErreur(e)); }
  };
  const choisir = async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const choix = await open({ directory: true, multiple: false, title: "Où poser la copie du bureau ?" });
    if (typeof choix === "string") await regler(true, choix);
  };
  const copierMaintenant = async () => {
    setOccupe(true);
    setMsg("");
    try {
      const r = await copierLeBureau();
      if (r.aJour) setMsg("✅ La copie est déjà à jour.");
      else if (r.bilan) {
        const b = r.bilan;
        setMsg(b.erreurs.length
          ? `⚠️ Copie faite, avec ${b.erreurs.length} fichier${b.erreurs.length > 1 ? "s" : ""} en erreur.`
          : `✅ Copie à jour : ${b.ecrits} fichier${b.ecrits > 1 ? "s" : ""} écrit${b.ecrits > 1 ? "s" : ""}`
            + (b.archives ? `, ${b.archives} ancienne${b.archives > 1 ? "s" : ""} version${b.archives > 1 ? "s" : ""} rangée${b.archives > 1 ? "s" : ""}.` : "."));
      }
      relire();
    } catch (e) {
      setMsg("❌ " + texteErreur(e));
    } finally {
      setOccupe(false);
    }
  };

  if (!info) return null;
  const d = info.derniere;
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🖥 Copie du bureau sur l'ordinateur</h3>
        {info.active && (
          <span style={{ fontSize: 12, color: d?.erreurs.length ? "var(--danger, #ef4444)" : "var(--text-2)" }}>
            {d ? `dernière : ${quandCopie(d.date)}` : "pas encore faite"}
          </span>
        )}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 13, margin: "6px 0 10px" }}>
        Le plan de travail est recopié dans un vrai dossier, avec de vrais fichiers : les documents tels
        que vous les avez déposés, les textes et les séquences en pages web, les liens en raccourcis. Si
        les données de Maitrize venaient à manquer, votre travail reste là. La copie se met à jour toute
        seule, au plus deux minutes après un changement. Rien n'est effacé sans filet : ce qui est
        remplacé ou supprimé part dans « Anciennes versions », où cela reste trois mois.
      </p>
      <label className="pb-coche" style={{ marginBottom: 8 }}>
        <input type="checkbox" checked={info.active} onChange={(e) => regler(e.target.checked)} />
        <span>Faire la copie sur cet ordinateur</span>
      </label>
      {info.active && <>
        <div style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", wordBreak: "break-all",
          background: "var(--panel-2)", padding: "6px 8px", borderRadius: 6 }}>
          {info.racine}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-2)", margin: "6px 0 10px" }}>
          {info.parDefaut ? "Sur le Bureau" : "Emplacement choisi"}
          {d && ` · ${d.fichiers} fichier${d.fichiers > 1 ? "s" : ""} dans la copie`}
        </div>
        {d?.autorisationRefusee && (
          <p style={{ fontSize: 13, color: "var(--danger, #ef4444)", margin: "0 0 10px" }}>
            {isMac
              ? "macOS refuse à Maitrize l'accès à ce dossier. Ouvrez Réglages Système → Confidentialité et sécurité → Fichiers et dossiers, et cochez « Dossier Bureau » sous Maitrize ; ou choisissez un autre emplacement."
              : "Windows refuse l'écriture dans ce dossier (dossier protégé ou en lecture seule) : choisissez un autre emplacement."}
          </p>
        )}
        {d && (d.manquants?.length ?? 0) > 0 && (
          <details style={{ fontSize: 12.5, margin: "0 0 10px", color: "var(--text-2)" }}>
            <summary style={{ cursor: "pointer" }}>
              {d.manquants.length} document{d.manquants.length > 1 ? "s" : ""} absent{d.manquants.length > 1 ? "s" : ""} de Maitrize, donc non copié{d.manquants.length > 1 ? "s" : ""}
            </summary>
            <div style={{ margin: "4px 0" }}>
              Le bureau les cite, mais leur fichier n'est pas sur cet ordinateur : pas encore arrivé de l'autre
              ordinateur, ou perdu. La copie les prendra dès qu'ils seront là.
            </div>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{d.manquants.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        )}
        {d && d.erreurs.length > 0 && !d.autorisationRefusee && (
          <details style={{ fontSize: 12.5, margin: "0 0 10px" }}>
            <summary style={{ cursor: "pointer", color: "var(--danger, #ef4444)" }}>
              {d.erreurs.length} problème{d.erreurs.length > 1 ? "s" : ""} lors de la dernière copie
            </summary>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{d.erreurs.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" disabled={occupe} onClick={copierMaintenant}>
            {occupe ? "Copie en cours…" : "Copier maintenant"}
          </button>
          <button className="btn" onClick={() => api.copieBureauOuvrir().catch((e) => setMsg("❌ " + texteErreur(e)))}>📂 Ouvrir le dossier</button>
          <button className="btn" onClick={choisir}>Choisir un autre emplacement…</button>
          {!info.parDefaut && <button className="btn" onClick={() => regler(true, "")}>Revenir au Bureau</button>}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-2)", margin: "8px 0 0" }}>
          Chaque ordinateur fait sa propre copie : choisissez un dossier propre à cet ordinateur, pas un
          dossier partagé avec l'autre. Ce que vous modifiez dans la copie ne revient pas dans Maitrize.
          Changer d'emplacement laisse l'ancienne copie où elle est.
        </p>
      </>}
      {msg && <p style={{ fontSize: 13, marginBottom: 0 }}>{msg}</p>}
    </div>
  );
}

/** « 2026-09-12-143005 » → « 12/09/2026 à 14:30 ». */
function formatDateSauvegarde(brut: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(brut);
  return m ? `${m[3]}/${m[2]}/${m[1]} à ${m[4]}:${m[5]}` : brut;
}

/** Copies quotidiennes de la base, faites au lancement de l'app. */
function CopiesAutomatiques() {
  const { data: copies } = useAsync(() => api.sauvegardesAutoList(), []);
  const liste = copies ?? [];
  const derniere = liste[0];

  // Écart en jours entre la dernière copie et aujourd'hui.
  const jours = React.useMemo(() => {
    if (!derniere) return null;
    const d = new Date(derniere.jour + "T00:00:00");
    const auj = new Date(); auj.setHours(0, 0, 0, 0);
    return Math.round((auj.getTime() - d.getTime()) / 86_400_000);
  }, [derniere]);

  const quand = jours === null ? "aucune copie pour l'instant"
    : jours <= 0 ? "aujourd'hui"
    : jours === 1 ? "hier"
    : `il y a ${jours} jours`;
  const mo = (o: number) => (o / 1_048_576).toFixed(1).replace(".", ",") + " Mo";
  // Au-delà de deux jours sans copie, l'app n'a pas été lancée : on le signale.
  const alerte = jours !== null && jours > 2;

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>🗂 Copies automatiques</h3>
        <span style={{ fontSize: 12, color: alerte ? "var(--danger, #ef4444)" : "var(--text-2)" }}>
          dernière : {quand}
        </span>
        <div className="spacer" />
        {liste.length > 0 && (
          <button className="btn sm" onClick={() => api.sauvegardesAutoOuvrir()}>📂 Ouvrir le dossier</button>
        )}
      </div>
      <p style={{ color: "var(--text-2)", fontSize: 12, margin: "6px 0 0" }}>
        L'app copie sa base à chaque premier lancement de la journée et garde les 7 dernières.
        Ces copies restent sur cet ordinateur : pour être vraiment à l'abri, exportez de temps
        en temps sur une clé ou un disque externe.
      </p>
      {liste.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
          {liste.map((c) => (
            <span key={c.nom} title={`${c.nom} · ${mo(c.octets)}`}
              style={{ fontSize: 11, padding: "3px 7px", borderRadius: 6, background: "var(--panel-2)", color: "var(--text-2)" }}>
              {c.jour}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Journal d'incidents.
 *
 * La fenêtre de l'application n'a pas de console : jusqu'ici, une action qui
 * échouait ne laissait aucune trace et ne se distinguait pas d'un bouton mort.
 * Chaque échec est désormais écrit sur le disque, horodaté.
 */
function JournalIncidents() {
  const [msg, setMsg] = React.useState("");
  const ouvrir = async () => {
    setMsg("");
    try { await api.diagOuvrir(); }
    catch (e: any) { setMsg(String(e)); }
  };
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>🩺 Journal d'incidents</h3>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Si une action semble ne rien faire, ce fichier dit pourquoi. À ouvrir
        avant de signaler un problème — il ne contient aucune donnée d'élève.
      </p>
      <button className="btn" onClick={ouvrir}>Ouvrir le journal</button>
      {msg && <p style={{ fontSize: 13, marginBottom: 0, color: "var(--text-2)" }}>{msg}</p>}
    </div>
  );
}
