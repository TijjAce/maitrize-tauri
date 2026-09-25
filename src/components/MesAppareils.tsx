import React from "react";
import { api, Machine } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";

// ── Mes appareils ──────────────────────────────────────────────────────────
//
// Deux machines se rejoignent dès qu'elles pointent vers le même stockage avec
// la même phrase secrète : il n'y a rien à apparier au sens cryptographique,
// la phrase est l'appariement.
//
// Ce qui manquait n'est pas de la sécurité mais de la **confirmation**. Une
// configuration erronée ressemble trait pour trait à « je n'ai rien modifié
// sur l'autre ordinateur » : même écran vide, même absence de message. Voir
// l'autre machine, et quand elle est passée, lève l'ambiguïté.

/** « 2026-09-12-143005 » → « 12/09 à 14:30 ». */
function vu(brut: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})/.exec(brut);
  return m ? `${m[3]}/${m[2]} à ${m[4]}:${m[5]}` : "jamais";
}

export function MesAppareils() {
  const [machines, setMachines] = React.useState<Machine[] | null>(null);
  const [nom, setNom] = React.useState("");
  const [occupe, setOccupe] = React.useState("");
  const [code, setCode] = React.useState<string | null>(null);
  const [saisie, setSaisie] = React.useState<string | null>(null);

  const relire = React.useCallback(() => {
    setOccupe("liste");
    api.machinesListe()
      .then((m) => { setMachines(m); setNom(m.find((x) => x.moi)?.nom ?? ""); })
      .catch(() => setMachines(null))
      .finally(() => setOccupe(""));
  }, []);
  React.useEffect(relire, [relire]);

  const renommer = async () => {
    await api.machineNomSet(nom.trim());
    toast("Nom enregistré.", { icone: "🖥" });
    relire();
  };

  const montrerCode = async () => {
    try { setCode(await api.appairageCode()); }
    catch (e: any) { toast(String(e), { icone: "⚠️" }); }
  };

  const appliquer = async (saisi: string) => {
    try {
      await api.appairageAppliquer(saisi);
      setSaisie(null);
      toast("Cet ordinateur rejoint le même stockage.", { icone: "🔗" });
      relire();
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
  };

  const oublier = async (m: Machine) => {
    if (!await confirmer(`Retirer « ${m.nom} » de la liste ? S'il se synchronise encore, il y reviendra tout seul.`)) return;
    try {
      await api.machineOublier(m.id);
      relire();
      toast(`« ${m.nom} » retiré.`, { icone: "🗑" });
    } catch (e) {
      toast("Retrait impossible : " + String(e), { icone: "⚠️" });
    }
  };

  const moi = machines?.find((m) => m.moi);
  const autres = machines?.filter((m) => !m.moi) ?? [];

  return (
    <div className="card" style={{ marginBottom: 18, maxWidth: 620 }}>
      <h3 style={{ marginTop: 0 }}>🖥 Mes appareils</h3>
      <p style={{ color: "var(--text-2)", marginTop: 0, fontSize: 13 }}>
        Les ordinateurs qui partagent vos données. Ils se rejoignent par le même
        stockage et la même phrase secrète — l'appariement ne fait que les
        recopier d'une machine à l'autre.
      </p>

      <Field label="Nom de cet ordinateur">
        <div style={{ display: "flex", gap: 8 }}>
          <Input value={nom} placeholder="Bureau, Portable…" onChange={(e) => setNom(e.target.value)} />
          <button className="btn" style={{ flex: "none" }} onClick={renommer}>Renommer</button>
        </div>
      </Field>

      <div style={{ marginTop: 12 }}>
        {moi && <LigneMachine m={moi} />}
        {autres.map((m) => (
          <LigneMachine key={m.id} m={m} onOublier={() => { void oublier(m); }} />
        ))}
        {machines && !autres.length && (
          <p style={{ fontSize: 13, color: "var(--text-2)", margin: "8px 0 0" }}>
            Aucun autre ordinateur pour l'instant. Il apparaîtra ici après sa
            première synchronisation.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button className="btn primary" disabled={!!occupe} onClick={montrerCode}>
          🔗 Appairer un autre ordinateur
        </button>
        <button className="btn" onClick={() => setSaisie("")}>
          📥 J'ai un code d'appairage
        </button>
        <button className="btn" disabled={!!occupe} onClick={relire}>
          {occupe === "liste" ? "…" : "🔄 Actualiser"}
        </button>
      </div>

      {code !== null && (
        <Modal titre="Code d'appairage" onClose={() => setCode(null)}
          footer={<>
            <button className="btn" onClick={() => {
              navigator.clipboard?.writeText(code).then(
                () => toast("Code copié.", { icone: "📋" }),
                () => toast("Copie impossible — sélectionnez le texte.", { icone: "⚠️" }));
            }}>📋 Copier</button>
            <button className="btn primary" onClick={() => setCode(null)}>Fermer</button>
          </>}>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Sur l'autre ordinateur : Réglages → Mes appareils → <b>J'ai un code
            d'appairage</b>, puis collez ceci.
          </p>
          <textarea readOnly value={code} rows={5}
            style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: 11,
                     wordBreak: "break-all", resize: "vertical" }} />
          <p style={{ fontSize: 12, color: "var(--danger, #b03030)", marginBottom: 0 }}>
            ⚠️ Ce code contient les accès à votre stockage <b>et</b> votre phrase
            secrète. Il vaut un mot de passe : transmettez-le par un moyen sûr —
            une clé USB, pas un courriel — et ne le laissez pas traîner.
          </p>
        </Modal>
      )}

      {saisie !== null && (
        <Modal titre="Rejoindre un ordinateur" onClose={() => setSaisie(null)}
          footer={<>
            <button className="btn" onClick={() => setSaisie(null)}>Annuler</button>
            <button className="btn primary" disabled={saisie.trim().length < 20}
              onClick={() => appliquer(saisie)}>Rejoindre</button>
          </>}>
          <p style={{ fontSize: 13, marginTop: 0 }}>
            Collez le code produit sur votre autre ordinateur. Les réglages de
            stockage et la phrase secrète de cette machine seront remplacés.
          </p>
          <textarea value={saisie} onChange={(e) => setSaisie(e.target.value)} rows={5} autoFocus
            style={{ width: "100%", fontFamily: "ui-monospace, monospace", fontSize: 11,
                     wordBreak: "break-all", resize: "vertical" }} />
        </Modal>
      )}
    </div>
  );
}

function LigneMachine({ m, onOublier }: { m: Machine; onOublier?: () => void }) {
  const ico = m.plateforme === "Windows" ? "🪟" : m.plateforme === "macOS" ? "🍎" : "🐧";
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0",
      borderTop: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ fontSize: 18 }}>{ico}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <b>{m.nom}</b>{m.moi && <span style={{ color: "var(--text-2)" }}> — cet ordinateur</span>}
        <div className="meta">
          {m.plateforme} · {m.moi ? "dernière synchro" : "vu"} {vu(m.vueLe)}
        </div>
      </span>
      {/* Un poste réinstallé, ou annoncé deux fois, laisse une ligne qui ne
          correspond plus à rien. On peut la retirer : s'il existe encore, il
          se réinscrira à sa prochaine synchronisation. */}
      {onOublier && (
        <button className="btn ghost sm" onClick={onOublier}
          title="Retirer cet ordinateur de la liste">🗑</button>
      )}
    </div>
  );
}
