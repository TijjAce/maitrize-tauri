import React from "react";
import { api, Creneau, Seance, Eleve, couleurHex, couleurPourMatiere, texteErreur } from "../api";
import { toast } from "./Toaster";
import { useDictee, mmss } from "../dictee";
import { natureDe } from "../heures";

// ── Cahier journal du jour ────────────────────────────────────────────────
//
// Pour chaque créneau de l'emploi du temps : ce qui est prévu, puis ce qui a
// été fait. On l'écrit la veille, le matin ou le soir, et l'on peut revenir
// sur n'importe quel jour passé ou à venir. Au clavier ou à la voix.
//
// Tout s'enregistre seul. Seuls le prévu et le bilan sont écrits : un créneau
// déplacé entre-temps dans la grille garde sa nouvelle place.

type Champ = "prevu" | "bilan";
interface Brouillon { prevu: string; bilan: string }

const LIBELLES: Record<Champ, { titre: string; aide: string }> = {
  prevu: { titre: "Prévu", aide: "Activités, supports, objectifs…" },
  bilan: { titre: "Fait · bilan", aide: "Ce qui s’est passé, ce qui reste à reprendre…" },
};

/** Ajoute une dictée à la fin d'un texte, avec la bonne séparation. */
export function ajouterDictee(texte: string, dicte: string): string {
  const d = dicte.trim();
  if (!d) return texte;
  if (!texte.trim()) return d;
  return texte.replace(/\s+$/, "") + (/[.!?…:]$/.test(texte.trim()) ? " " : ". ") + d;
}

export function CahierJournal({ dateIso, creneaux, seances, eleves, onGenerer, onModifier }: {
  dateIso: string; creneaux: Creneau[]; seances: Seance[]; eleves: Eleve[];
  onGenerer: () => void; onModifier: (c: Creneau) => void;
}) {
  const duJour = React.useMemo(
    () => creneaux.filter((c) => c.date.slice(0, 10) === dateIso).sort((a, b) => a.heureDebut.localeCompare(b.heureDebut)),
    [creneaux, dateIso]);

  // Brouillons locaux : la saisie ne doit jamais être écrasée par un rechargement.
  const [brouillons, setBrouillons] = React.useState<Record<string, Brouillon>>({});
  const enregistres = React.useRef<Record<string, Brouillon>>({});
  const minuteurs = React.useRef<Record<string, number>>({});
  const [etats, setEtats] = React.useState<Record<string, "enregistrement" | "ok" | "erreur">>({});

  React.useEffect(() => {
    setBrouillons((avant) => {
      const apres = { ...avant };
      for (const c of duJour) {
        const connu = enregistres.current[c.id];
        const local = avant[c.id];
        const propre = !local || (connu && local.prevu === connu.prevu && local.bilan === connu.bilan);
        if (propre) {
          apres[c.id] = { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
          enregistres.current[c.id] = { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
        }
      }
      return apres;
    });
  }, [duJour]);

  const enregistrer = React.useCallback(async (id: string, b: Brouillon) => {
    setEtats((e) => ({ ...e, [id]: "enregistrement" }));
    try {
      await api.creneauJournalSave(id, b.prevu, b.bilan);
      enregistres.current[id] = b;
      setEtats((e) => ({ ...e, [id]: "ok" }));
    } catch (err) {
      setEtats((e) => ({ ...e, [id]: "erreur" }));
      toast("Cahier journal non enregistré : " + texteErreur(err), { icone: "⚠️", duree: 6000 });
    }
  }, []);

  // En quittant le jour ou l'écran : on écrit ce qui attendait encore.
  const aEcrire = React.useRef(brouillons);
  aEcrire.current = brouillons;

  const modifier = (id: string, champ: Champ, valeur: string, immediat = false) => {
    const b = { ...(aEcrire.current[id] ?? { prevu: "", bilan: "" }), [champ]: valeur };
    aEcrire.current = { ...aEcrire.current, [id]: b };
    setBrouillons((avant) => ({ ...avant, [id]: b }));
    window.clearTimeout(minuteurs.current[id]);
    minuteurs.current[id] = window.setTimeout(() => enregistrer(id, b), immediat ? 0 : 800);
  };
  React.useEffect(() => () => {
    for (const [id, t] of Object.entries(minuteurs.current)) {
      window.clearTimeout(t);
      const b = aEcrire.current[id], e = enregistres.current[id];
      if (b && (!e || b.prevu !== e.prevu || b.bilan !== e.bilan)) api.creneauJournalSave(id, b.prevu, b.bilan).catch(() => {});
    }
    minuteurs.current = {};
  }, [dateIso]);

  // ── Dictée : un seul micro ouvert à la fois ──
  const dictee = useDictee();
  const [cible, setCible] = React.useState<{ id: string; champ: Champ } | null>(null);
  const basculerDictee = async (id: string, champ: Champ) => {
    if (dictee.etat === "repos") {
      const erreur = await dictee.demarrer();
      if (erreur) { toast(erreur, { icone: "🎙", duree: 7000 }); return; }
      setCible({ id, champ });
      return;
    }
    if (dictee.etat !== "enregistrement" || !cible || cible.id !== id || cible.champ !== champ) return;
    const { texte, erreur } = await dictee.arreter();
    setCible(null);
    if (erreur) { toast("Dictée impossible : " + erreur, { icone: "⚠️", duree: 7000 }); return; }
    const actuel = aEcrire.current[id]?.[champ] ?? "";
    modifier(id, champ, ajouterDictee(actuel, texte), true);
  };

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const passe = dateIso < aujourdhui;

  if (!duJour.length) {
    return (
      <div className="card" style={{ textAlign: "center", padding: "30px 18px" }}>
        <div style={{ fontSize: 34, marginBottom: 6 }}>📓</div>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Cahier journal</div>
        <div style={{ fontSize: 13, color: "var(--text-2)", marginBottom: 12 }}>
          Aucun créneau ce jour. Posez ceux de l’emploi du temps pour écrire ce qui est prévu et ce qui a été fait.
        </div>
        <button className="btn primary" onClick={onGenerer}>⚡ Générer le jour</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>📓 Cahier journal</div>
        <div style={{ fontSize: 12, color: "var(--text-2)" }}>
          {passe ? "Complétez ce qui a été fait" : "Notez ce qui est prévu"} · au clavier ou 🎙 à la voix
        </div>
      </div>
      {duJour.map((c) => {
        const b = brouillons[c.id] ?? { prevu: c.prevu ?? "", bilan: c.bilan ?? "" };
        const teinte = couleurHex[couleurPourMatiere(c.matiere)] || couleurHex.blue;
        const seance = seances.find((s) => s.id === c.seanceId);
        let ids: string[] = [];
        try { ids = JSON.parse(c.elevesJson || "[]"); } catch { ids = []; }
        const prenoms = ids.map((id) => eleves.find((e) => e.id === id)?.nom.split(" ")[0]).filter(Boolean);
        const reunion = natureDe(c) === "reunion";
        const etat = etats[c.id];
        return (
          <div key={c.id} className="card" style={{ padding: "10px 12px", borderLeft: `4px solid ${teinte}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{c.heureDebut}–{c.heureFin}</span>
              <span style={{ fontWeight: 600 }}>{c.matiere || "Créneau"}</span>
              {reunion && <span className="badge">🗣️ Réunion · formation</span>}
              {seance && <span style={{ fontSize: 12, color: "var(--text-2)" }}>· {seance.titre}</span>}
              {prenoms.length > 0 && <span style={{ fontSize: 12, color: "var(--text-2)" }}>👥 {prenoms.join(", ")}</span>}
              <span style={{ marginLeft: "auto", fontSize: 11, color: etat === "erreur" ? "#c0392b" : "var(--text-2)" }}>
                {etat === "enregistrement" ? "Enregistrement…" : etat === "ok" ? "✓ Enregistré" : etat === "erreur" ? "Non enregistré" : ""}
              </span>
              <button className="btn ghost sm" onClick={() => onModifier(c)} title="Modifier le créneau" aria-label="Modifier le créneau">✏️</button>
            </div>
            {(["prevu", "bilan"] as Champ[]).map((champ) => {
              const actif = cible?.id === c.id && cible.champ === champ;
              const occupe = dictee.etat !== "repos" && !actif;
              return (
                <div key={champ} style={{ marginTop: champ === "bilan" ? 8 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-2)" }}>{LIBELLES[champ].titre}</span>
                    <button className="btn ghost sm" disabled={occupe || dictee.etat === "transcription"}
                      onClick={() => basculerDictee(c.id, champ)}
                      aria-label={actif ? "Arrêter la dictée" : `Dicter : ${LIBELLES[champ].titre}`}
                      style={actif ? { background: "#dc2626", color: "#fff", borderColor: "#dc2626" } : undefined}>
                      {actif && dictee.etat === "enregistrement" ? `⏹ ${mmss(dictee.secondes)}`
                        : actif && dictee.etat === "transcription" ? "Transcription…" : "🎙"}
                    </button>
                  </div>
                  <textarea className="textarea" value={b[champ]} placeholder={LIBELLES[champ].aide}
                    rows={Math.min(8, Math.max(2, b[champ].split("\n").length))}
                    onChange={(e) => modifier(c.id, champ, e.target.value)}
                    aria-label={`${LIBELLES[champ].titre} — ${c.heureDebut} ${c.matiere}`}
                    style={{ width: "100%", resize: "vertical", fontSize: 13.5, lineHeight: 1.45 }} />
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
