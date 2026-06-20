import React from "react";
import { Page } from "../App";
import { api, NIVEAUX_SCOLAIRES, MATIERES, COULEURS, couleurHex, getMatiereOverrides, setMatiereOverrides, telechargerTexte, anneeScolaireActuelle, MODELES_MISTRAL, MODELE_DEFAUT, type PortableInfo } from "../api";
import { Field, Input, Select, Modal } from "../components/ui";
import { applyTheme, MODES, ACCENTS, STYLES } from "../theme";
import { lireAcceptationCgu, CguAcceptation } from "../components/CGU";
import { genererDonneesTest } from "../devSeed";
import { getVersion } from "@tauri-apps/api/app";

export default function Reglages() {
  const [s, setS] = React.useState<Record<string, string>>({});
  const [chargé, setChargé] = React.useState(false);
  const [testMsg, setTestMsg] = React.useState("");
  const [testEnCours, setTestEnCours] = React.useState(false);
  const [dataMsg, setDataMsg] = React.useState("");
  const [showMatieres, setShowMatieres] = React.useState(false);
  const [cgu, setCgu] = React.useState<CguAcceptation | null>(null);
  const [version, setVersion] = React.useState("");
  React.useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);
  const importInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { api.settingsAll().then((m) => { setS(m); setChargé(true); }); }, []);
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
    if (!confirm("Restaurer cette sauvegarde remplacera vos données actuelles. Continuer ?")) return;
    try {
      const txt = await file.text();
      await api.importData(txt);
      setDataMsg("✅ Restauration terminée — rechargez l'app");
    } catch (e: any) { setDataMsg("❌ " + String(e)); }
  };

  const set = (cle: string, valeur: string) => {
    const next = { ...s, [cle]: valeur };
    setS(next);
    api.settingSet(cle, valeur);
    if (cle === "apparence" || cle === "accent" || cle === "styleInterface") applyTheme(next);
  };

  const tester = async () => {
    setTestEnCours(true); setTestMsg("");
    try { await api.mistralTest(); setTestMsg("✅ Connexion réussie"); }
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
      </div>

      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>🎨 Apparence</h3>

        <Field label="Mode">
          <div className="seg" style={{ flexWrap: "wrap" }}>
            {MODES.map((m) => (
              <button key={m.id} className={(s.apparence || "system") === m.id ? "active" : ""} onClick={() => set("apparence", m.id)}>{m.label}</button>
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

        <Field label="Emploi du temps">
          <button className="btn" onClick={() => setShowMatieres(true)}>🎨 Couleurs des matières…</button>
        </Field>
      </div>

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
          <Select value={s.mistralModel ?? MODELE_DEFAUT} onChange={(e) => set("mistralModel", e.target.value)}>
            {MODELES_MISTRAL.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </Select>
        </Field>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn" disabled={testEnCours || !s.mistralApiKey} onClick={tester}>
            {testEnCours ? "Test en cours…" : "Tester la connexion"}
          </button>
          <span style={{ fontSize: 13 }}>{testMsg}</span>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>💾 Données (sauvegarde)</h3>
        <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
          Exportez toutes vos données dans un fichier JSON, ou restaurez une sauvegarde.
          La clé API n'est jamais incluse dans l'export.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button className="btn" onClick={exporter}>⬇️ Exporter (JSON)</button>
          <button className="btn" onClick={exporterBase}>🗄 Exporter la base (.sqlite3)</button>
          <input ref={importInput} type="file" accept="application/json,.json" style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
          <button className="btn" onClick={() => importInput.current?.click()}>⬆️ Importer</button>
          <span style={{ fontSize: 13 }}>{dataMsg}</span>
        </div>
      </div>

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

      <DevSeedCard />

      <div className="card" style={{ maxWidth: 620 }}>
        <h3 style={{ marginTop: 0 }}>ℹ️ À propos</h3>
        <p style={{ color: "var(--text-2)", margin: 0, fontSize: 13 }}>
          <b>Maitrize V2{version ? ` — v${version}` : ""}</b> · cross-plateforme (Tauri). Données stockées localement, sans compte ni serveur.
        </p>
        {cgu && (
          <p style={{ color: "var(--text-2)", margin: "10px 0 0", fontSize: 12 }}>
            ✅ CGU (v{cgu.version}) acceptées le {new Date(cgu.accepteeLe).toLocaleString("fr-FR")}<br />
            <span style={{ fontFamily: "monospace", fontSize: 11 }}>empreinte&nbsp;: {cgu.hash.slice(0, 24)}…</span>
          </p>
        )}
      </div>

      {showMatieres && <CouleursMatieresModal onClose={() => setShowMatieres(false)} />}
    </Page>
  );
}

// Liste d'années scolaires autour de l'année donnée (pour le sélecteur du seed).
function anneesOptions(courante: string): string[] {
  const base = parseInt(courante.slice(0, 4), 10) || new Date().getFullYear();
  const set = new Set<string>();
  for (let y = base - 1; y <= base + 2; y++) set.add(`${y}-${y + 1}`);
  set.add(courante);
  return [...set].sort();
}

// Carte « Développement » : génère des données factices pour tester rapidement.
function DevSeedCard() {
  const [busy, setBusy] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [annee, setAnnee] = React.useState(anneeScolaireActuelle());
  React.useEffect(() => { api.settingGet("anneeCourante").then((v) => { if (v) setAnnee(v); }); }, []);

  const generer = async () => {
    if (!confirm(`Créer des données de test pour l'année ${annee} ?`)) return;
    setBusy(true); setMsg("");
    try { setMsg("✅ " + await genererDonneesTest(annee)); }
    catch (e) { setMsg("❌ " + String(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>🧪 Développement</h3>
      <p style={{ color: "var(--text-2)", margin: "0 0 10px", fontSize: 13 }}>
        Crée des séquences, des séances et une programmation factices pour tester l'application.
        Choisissez l'année scolaire cible (sans effet sur une programmation déjà existante pour cette année).
      </p>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Select value={annee} onChange={(e) => setAnnee(e.target.value)} style={{ maxWidth: 160, fontWeight: 600 }}>
          {anneesOptions(annee).map((a) => <option key={a} value={a}>Année {a}</option>)}
        </Select>
        <button className="btn" onClick={generer} disabled={busy}>{busy ? "Création…" : "🧪 Générer des données de test"}</button>
        {msg && <span style={{ fontSize: 13 }}>{msg}</span>}
      </div>
    </div>
  );
}

function CouleursMatieresModal({ onClose }: { onClose: () => void }) {
  const [over, setOver] = React.useState<Record<string, string>>(() => ({ ...getMatiereOverrides() }));

  const choisir = (m: string, c: string) => {
    const next = { ...over };
    if (c === "") delete next[m]; else next[m] = c;
    setOver(next);
    setMatiereOverrides(next);
    api.settingSet("matiereCouleursOverride", JSON.stringify(next));
  };

  return (
    <Modal large titre="🎨 Couleurs des matières" onClose={onClose}
      footer={<><div className="spacer" /><button className="btn primary" onClick={onClose}>Terminé</button></>}>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Personnalisez la couleur de chaque matière (utilisée dans le planning, les séquences, etc.).
      </p>
      {MATIERES.map((m) => (
        <div key={m} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
          <div style={{ flex: 1, fontSize: 13.5 }}>{m}</div>
          <div style={{ display: "flex", gap: 5 }}>
            {COULEURS.map((c) => (
              <button key={c} title={c} onClick={() => choisir(m, c)}
                style={{ width: 20, height: 20, borderRadius: 5, background: couleurHex[c], cursor: "pointer",
                  border: over[m] === c ? "2.5px solid var(--text)" : "2px solid transparent" }} />
            ))}
            {over[m] && <button className="btn ghost sm" onClick={() => choisir(m, "")}>défaut</button>}
          </div>
        </div>
      ))}
    </Modal>
  );
}
