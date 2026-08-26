import React from "react";
import { api, Eleve, newId } from "../api";
import { Field, Input, Select, Modal, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import { openCtx } from "../components/ctxmenu";
import { printHTML, escapeHtml } from "../print";

// ── Plan de salle ─────────────────────────────────────────────────────────
// L'aménagement (mobilier + places) est unique ; le placement des élèves est
// enregistré dans des « configurations » nommées. En IME le groupe change à
// chaque temps de la journée : on crée donc une configuration par créneau
// (« Mardi — 1er temps », « Scolarité 9h »…) plutôt qu'un plan figé.

type TypeElem = "place" | "table" | "bureau" | "tapis" | "meuble" | "mur" | "porte" | "fenetre";
interface ElemSalle { id: string; type: TypeElem; x: number; y: number; w: number; h: number; label: string }
interface ConfigSalle { id: string; nom: string; places: Record<string, string>; notes: Record<string, string> }

const CANVAS_W = 900, CANVAS_H = 560, GRILLE = 10;

const MODELES: { t: TypeElem; label: string; ico: string; w: number; h: number }[] = [
  { t: "place", label: "Place élève", ico: "🪑", w: 70, h: 70 },
  { t: "table", label: "Table", ico: "▭", w: 170, h: 70 },
  { t: "bureau", label: "Bureau enseignant", ico: "🧑‍🏫", w: 150, h: 60 },
  { t: "tapis", label: "Coin regroupement", ico: "🟩", w: 200, h: 130 },
  { t: "meuble", label: "Meuble / étagère", ico: "🗄", w: 130, h: 40 },
  { t: "mur", label: "Mur", ico: "🧱", w: 240, h: 14 },
  { t: "porte", label: "Porte", ico: "🚪", w: 60, h: 16 },
  { t: "fenetre", label: "Fenêtre", ico: "🪟", w: 140, h: 12 },
];

const STYLE_ELEM: Record<TypeElem, React.CSSProperties> = {
  place: { background: "var(--panel-2)", border: "2px dashed var(--border)", borderRadius: 12 },
  table: { background: "color-mix(in srgb, #b98a5a 26%, var(--panel-2))", border: "1px solid #b98a5a", borderRadius: 8 },
  bureau: { background: "color-mix(in srgb, var(--accent) 20%, var(--panel-2))", border: "1px solid var(--accent)", borderRadius: 8 },
  tapis: { background: "color-mix(in srgb, #57b873 20%, var(--panel-2))", border: "1px dashed #57b873", borderRadius: 14 },
  meuble: { background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 4 },
  mur: { background: "var(--text-2)", border: "none", borderRadius: 2 },
  porte: { background: "#b98a5a", border: "none", borderRadius: 3 },
  fenetre: { background: "#7cb7e8", border: "none", borderRadius: 2 },
};

const snap = (v: number) => Math.round(v / GRILLE) * GRILLE;

function usePhotos(eleves: Eleve[]) {
  const [photos, setPhotos] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let annule = false;
    (async () => {
      const out: Record<string, string> = {};
      for (const e of eleves) {
        if (!e.photoFichier) continue;
        try { out[e.id] = `data:image;base64,${await api.fichierRead(e.photoFichier)}`; } catch { /* ignore */ }
      }
      if (!annule) setPhotos(out);
    })();
    return () => { annule = true; };
  }, [eleves.map((e) => e.id + ":" + (e.photoFichier ?? "")).join("|")]);
  return photos;
}

export function PlanSalleTab() {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const photos = usePhotos(eleves ?? []);
  const [elements, setElements] = React.useState<ElemSalle[]>([]);
  const [configs, setConfigs] = React.useState<ConfigSalle[]>([]);
  const [configId, setConfigId] = React.useState("");
  const [mode, setMode] = React.useState<"placement" | "amenagement">("placement");
  const [choix, setChoix] = React.useState<ElemSalle | null>(null);
  const [selId, setSelId] = React.useState<string | null>(null);
  const [supprConfig, setSupprConfig] = React.useState<ConfigSalle | null>(null);
  const [charge, setCharge] = React.useState(false);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    (async () => {
      const [el, cf] = await Promise.all([api.settingGet("salle:elements"), api.settingGet("salle:configs")]);
      try { setElements(el ? JSON.parse(el) : []); } catch { setElements([]); }
      let liste: ConfigSalle[] = [];
      try { liste = cf ? JSON.parse(cf) : []; } catch { liste = []; }
      setConfigs(liste);
      setConfigId(liste[0]?.id ?? "");
      setCharge(true);
    })();
  }, []);

  // Référence toujours à jour : le glisser-déposer met l'état à jour à chaque
  // frame mais n'enregistre qu'au relâchement (lecture via la ref, jamais
  // d'effet de bord dans un updater d'état).
  const elementsRef = React.useRef<ElemSalle[]>([]);
  elementsRef.current = elements;
  const persistElements = (e: ElemSalle[]) => { setElements(e); api.settingSet("salle:elements", JSON.stringify(e)); };
  const persistConfigs = (c: ConfigSalle[]) => { setConfigs(c); api.settingSet("salle:configs", JSON.stringify(c)); };

  const config = configs.find((c) => c.id === configId);
  const upConfig = (patch: Partial<ConfigSalle>) =>
    persistConfigs(configs.map((c) => c.id === configId ? { ...c, ...patch } : c));

  const places = elements.filter((e) => e.type === "place");
  // Élèves déjà placés dans la configuration courante (pour les griser au choix).
  const placesOccupees = config ? Object.values(config.places).filter(Boolean) : [];

  const ajouterElement = (m: typeof MODELES[number]) => {
    const el: ElemSalle = { id: newId(), type: m.t, x: snap(40 + Math.random() * 60), y: snap(40 + Math.random() * 60), w: m.w, h: m.h, label: "" };
    persistElements([...elements, el]);
    setSelId(el.id);
  };

  // Supprime un élément et libère la place correspondante dans tous les créneaux.
  const supprimerElement = (id: string) => {
    persistElements(elements.filter((e) => e.id !== id));
    if (configs.some((c) => c.places[id] || c.notes[id])) {
      persistConfigs(configs.map((c) => {
        const places = { ...c.places }; const notes = { ...c.notes };
        delete places[id]; delete notes[id];
        return { ...c, places, notes };
      }));
    }
    if (selId === id) setSelId(null);
  };

  const dupliquerElement = (el: ElemSalle) => {
    const copie: ElemSalle = { ...el, id: newId(), x: Math.min(CANVAS_W - el.w, el.x + 20), y: Math.min(CANVAS_H - el.h, el.y + 20) };
    persistElements([...elements, copie]);
    setSelId(copie.id);
  };

  // Touche Suppr/Retour arrière sur l'élément sélectionné (mode aménagement).
  React.useEffect(() => {
    if (mode !== "amenagement" || !selId) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key !== "Delete" && ev.key !== "Backspace") return;
      const t = ev.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      ev.preventDefault();
      supprimerElement(selId);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, selId, elements, configs]);

  const salleParDefaut = () => {
    const els: ElemSalle[] = [
      { id: newId(), type: "bureau", x: 370, y: 40, w: 150, h: 60, label: "Bureau" },
      { id: newId(), type: "porte", x: 40, y: 20, w: 60, h: 16, label: "" },
      { id: newId(), type: "fenetre", x: 620, y: 20, w: 140, h: 12, label: "" },
      { id: newId(), type: "table", x: 190, y: 200, w: 170, h: 70, label: "" },
      { id: newId(), type: "table", x: 530, y: 200, w: 170, h: 70, label: "" },
      { id: newId(), type: "place", x: 200, y: 290, w: 70, h: 70, label: "" },
      { id: newId(), type: "place", x: 280, y: 290, w: 70, h: 70, label: "" },
      { id: newId(), type: "place", x: 540, y: 290, w: 70, h: 70, label: "" },
      { id: newId(), type: "place", x: 620, y: 290, w: 70, h: 70, label: "" },
      { id: newId(), type: "tapis", x: 340, y: 400, w: 200, h: 130, label: "Coin regroupement" },
    ];
    persistElements(els);
  };

  const nouvelleConfig = (depuis?: ConfigSalle) => {
    const c: ConfigSalle = {
      id: newId(),
      nom: depuis ? `${depuis.nom} (copie)` : "Nouveau créneau",
      places: depuis ? { ...depuis.places } : {},
      notes: depuis ? { ...depuis.notes } : {},
    };
    persistConfigs([...configs, c]);
    setConfigId(c.id);
  };

  // ── Déplacement / redimensionnement (mode aménagement) ────────────────
  const dragRef = React.useRef<{ id: string; dx: number; dy: number; resize: boolean; w0: number; h0: number; x0: number; y0: number } | null>(null);
  const onMouseDownElem = (el: ElemSalle, e: React.MouseEvent, resize = false) => {
    if (mode !== "amenagement") return;
    e.preventDefault(); e.stopPropagation();
    setSelId(el.id);
    const box = canvasRef.current!.getBoundingClientRect();
    dragRef.current = { id: el.id, dx: e.clientX - box.left - el.x, dy: e.clientY - box.top - el.y, resize, w0: el.w, h0: el.h, x0: e.clientX, y0: e.clientY };
    const onMove = (ev: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      setElements((cur) => cur.map((x) => {
        if (x.id !== d.id) return x;
        if (d.resize) {
          return { ...x, w: Math.max(20, snap(d.w0 + (ev.clientX - d.x0))), h: Math.max(12, snap(d.h0 + (ev.clientY - d.y0))) };
        }
        const nx = Math.max(0, Math.min(CANVAS_W - x.w, snap(ev.clientX - box.left - d.dx)));
        const ny = Math.max(0, Math.min(CANVAS_H - x.h, snap(ev.clientY - box.top - d.dy)));
        return { ...x, x: nx, y: ny };
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      dragRef.current = null;
      api.settingSet("salle:elements", JSON.stringify(elementsRef.current));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp, { once: true });
  };

  const imprimer = () => {
    if (!config) return;
    const el = (e: ElemSalle) => {
      const eleveId = config.places[e.id];
      const eleve = (eleves ?? []).find((x) => x.id === eleveId);
      const base = `position:absolute;left:${e.x}px;top:${e.y}px;width:${e.w}px;height:${e.h}px;box-sizing:border-box;`;
      const styles: Record<TypeElem, string> = {
        place: "border:2px dashed #9aa6c2;border-radius:12px;background:#f6f7fb;",
        table: "border:1px solid #b98a5a;background:#efe1d2;border-radius:8px;",
        bureau: "border:1px solid #5b6bd6;background:#e3e7fb;border-radius:8px;",
        tapis: "border:1px dashed #57b873;background:#e6f5ec;border-radius:14px;",
        meuble: "border:1px solid #cfd4e2;background:#f0f2f8;border-radius:4px;",
        mur: "background:#4b5262;border-radius:2px;",
        porte: "background:#b98a5a;border-radius:3px;",
        fenetre: "background:#7cb7e8;border-radius:2px;",
      };
      const contenu = e.type === "place"
        ? (eleve ? `<div style="font-size:11px;font-weight:700;text-align:center;padding-top:6px">${escapeHtml(eleve.nom)}</div>
             ${config.notes[e.id] ? `<div style="font-size:9px;text-align:center;color:#687087">${escapeHtml(config.notes[e.id])}</div>` : ""}` : "")
        : (e.label ? `<div style="font-size:10px;text-align:center;padding-top:4px;color:#3b4252">${escapeHtml(e.label)}</div>` : "");
      return `<div style="${base}${styles[e.type]}">${contenu}</div>`;
    };
    const html = `<h1>Plan de salle — ${escapeHtml(config.nom)}</h1>
      <div class="meta">${placesOccupees.length} élève(s) placé(s)</div>
      <div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;border:1px solid #cfd4e2;border-radius:8px;background:#fff">
        ${elements.map(el).join("")}
      </div>`;
    printHTML(`Plan de salle — ${config.nom}`, html);
  };

  if (!charge) return <div />;

  return (
    <>
      <div className="toolbar" style={{ flexWrap: "wrap" }}>
        <Select value={configId} onChange={(e) => setConfigId(e.target.value)} style={{ maxWidth: 240 }}>
          {configs.length === 0 && <option value="">— aucun créneau —</option>}
          {configs.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </Select>
        <button className="btn sm" onClick={() => nouvelleConfig()}>+ Créneau</button>
        {config && <button className="btn sm" title="Dupliquer ce créneau" onClick={() => nouvelleConfig(config)}>📑</button>}
        {config && <button className="btn ghost sm" aria-label="Supprimer le créneau" onClick={() => setSupprConfig(config)}>🗑</button>}
        <div className="spacer" />
        <div className="seg">
          <button className={mode === "placement" ? "active" : ""} onClick={() => { setMode("placement"); setSelId(null); }}>Placement</button>
          <button className={mode === "amenagement" ? "active" : ""} onClick={() => setMode("amenagement")}>Aménagement</button>
        </div>
        <button className="btn sm" onClick={imprimer} disabled={!config}>🖨 Imprimer</button>
      </div>

      {config && (
        <div className="row" style={{ marginBottom: 10 }}>
          <Field label="Nom du créneau">
            <Input value={config.nom} onChange={(e) => upConfig({ nom: e.target.value })} placeholder="Mardi — 1er temps (Scolarité)" />
          </Field>
        </div>
      )}

      {mode === "amenagement" && (
        <div className="card" style={{ marginBottom: 10, padding: 10 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-2)", marginRight: 4 }}>Ajouter :</span>
            {MODELES.map((m) => (
              <button key={m.t + m.label} className="btn sm" onClick={() => ajouterElement(m)}>{m.ico} {m.label}</button>
            ))}
            <div className="spacer" />
            {elements.length === 0 && <button className="btn sm" onClick={salleParDefaut}>✨ Salle type</button>}
            {selId && <>
              <button className="btn sm" onClick={() => dupliquerElement(elements.find((e) => e.id === selId)!)}>📑 Dupliquer</button>
              <button className="btn danger sm" onClick={() => supprimerElement(selId)}>🗑 Supprimer</button>
            </>}
          </div>
          {selId && (() => {
            const el = elements.find((e) => e.id === selId);
            return el && el.type !== "place" ? (
              <div style={{ marginTop: 8 }}>
                <Input value={el.label} placeholder="Étiquette (ex. « Coin calme »)"
                  onChange={(ev) => persistElements(elements.map((x) => x.id === el.id ? { ...x, label: ev.target.value } : x))} />
              </div>
            ) : null;
          })()}
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 8 }}>
            Glissez pour déplacer · poignée en bas à droite pour redimensionner · clic droit ou touche Suppr pour supprimer.
            Un mur se met à la verticale en le rendant étroit et haut. L'aménagement est commun à tous les créneaux.
          </div>
        </div>
      )}

      {elements.length === 0 ? (
        <Empty icone="🪑" titre="Salle vide" sous="Passez en « Aménagement » et cliquez sur « Salle type » pour démarrer." />
      ) : (
        <div className="card" style={{ padding: 12, overflow: "auto" }}>
          <div ref={canvasRef} onClick={() => mode === "amenagement" && setSelId(null)}
            style={{ position: "relative", width: CANVAS_W, height: CANVAS_H, flexShrink: 0,
              background: `var(--panel-2) repeating-linear-gradient(0deg, transparent, transparent ${GRILLE - 1}px, color-mix(in srgb, var(--border) 40%, transparent) ${GRILLE}px), repeating-linear-gradient(90deg, transparent, transparent ${GRILLE - 1}px, color-mix(in srgb, var(--border) 40%, transparent) ${GRILLE}px)`,
              borderRadius: 10, border: "1px solid var(--border)" }}>
            {elements.map((el) => {
              const eleveId = config?.places[el.id];
              const eleve = (eleves ?? []).find((x) => x.id === eleveId);
              const selection = selId === el.id && mode === "amenagement";
              return (
                <div key={el.id}
                  onMouseDown={(e) => onMouseDownElem(el, e)}
                  onClick={(e) => { e.stopPropagation(); if (mode === "placement" && el.type === "place" && config) setChoix(el); }}
                  onContextMenu={(e) => {
                    if (mode !== "amenagement") return;
                    e.preventDefault(); e.stopPropagation();
                    setSelId(el.id);
                    openCtx(e, [
                      { label: "Dupliquer", icon: "📑", onClick: () => dupliquerElement(el) },
                      { label: "Supprimer", icon: "🗑", danger: true, sep: true, onClick: () => supprimerElement(el.id) },
                    ]);
                  }}
                  title={mode === "placement" && el.type === "place" ? "Cliquer pour placer un élève" : el.label}
                  style={{
                    position: "absolute", left: el.x, top: el.y, width: el.w, height: el.h, boxSizing: "border-box",
                    ...STYLE_ELEM[el.type],
                    ...(eleve ? { border: "2px solid var(--accent)", background: "var(--panel)" } : {}),
                    outline: selection ? "2px solid var(--accent)" : "none",
                    cursor: mode === "amenagement" ? "move" : (el.type === "place" && config ? "pointer" : "default"),
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    overflow: "hidden", userSelect: "none", fontSize: 11,
                  }}>
                  {el.type === "place" ? (
                    eleve ? (() => {
                      const note = config?.notes[el.id];
                      // Avatar réduit quand une note doit tenir dans la place.
                      const av = Math.max(18, Math.min(note ? 26 : 34, el.h - (note ? 34 : 26)));
                      return (
                        <>
                          {photos[eleve.id]
                            ? <img src={photos[eleve.id]} alt="" style={{ width: av, height: av, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                            : <div style={{ width: av, height: av, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{eleve.nom.charAt(0).toUpperCase()}</div>}
                          <div style={{ fontWeight: 700, marginTop: 2, textAlign: "center", lineHeight: 1.15, padding: "0 2px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {eleve.nom.split(" ")[0]}
                          </div>
                          {note && (
                            <div title={note} style={{ fontSize: 9, lineHeight: 1.15, color: "var(--text-2)", textAlign: "center", padding: "0 3px", maxWidth: "100%",
                              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{note}</div>
                          )}
                        </>
                      );
                    })() : <span style={{ color: "var(--text-2)", opacity: 0.8 }}>libre</span>
                  ) : (
                    el.label && <span style={{ color: "var(--text-2)", textAlign: "center", padding: "0 4px" }}>{el.label}</span>
                  )}
                  {selection && (
                    <div onMouseDown={(e) => onMouseDownElem(el, e, true)}
                      style={{ position: "absolute", right: -5, bottom: -5, width: 12, height: 12, borderRadius: 3, background: "var(--accent)", cursor: "nwse-resize" }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {config && mode === "placement" && (
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 10 }}>
          {places.length === 0
            ? "Aucune place dans la salle — passez en « Aménagement » pour en ajouter."
            : `${placesOccupees.length}/${places.length} place(s) occupée(s) · cliquez sur une place pour y installer un élève.`}
        </div>
      )}
      {!config && configs.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 10 }}>
          Créez un créneau (« + Créneau ») : un par temps de la journée, chacun avec son propre placement.
        </div>
      )}

      {choix && config && (
        <ChoixEleveModal place={choix} config={config} eleves={eleves ?? []} photos={photos}
          onClose={() => setChoix(null)}
          onChoisir={(eleveId, note) => {
            const p = { ...config.places };
            const n = { ...config.notes };
            // Un élève ne peut occuper qu'une place à la fois dans un créneau.
            if (eleveId) { for (const k of Object.keys(p)) if (p[k] === eleveId) delete p[k]; p[choix.id] = eleveId; }
            else delete p[choix.id];
            if (note) n[choix.id] = note; else delete n[choix.id];
            upConfig({ places: p, notes: n });
            setChoix(null);
          }} />
      )}
      {supprConfig && (
        <Confirm message={`Supprimer le créneau « ${supprConfig.nom} » ? L'aménagement de la salle est conservé.`}
          onYes={() => {
            const reste = configs.filter((c) => c.id !== supprConfig.id);
            persistConfigs(reste); setConfigId(reste[0]?.id ?? "");
            toast("Créneau supprimé.", { icone: "🗑" });
          }}
          onClose={() => setSupprConfig(null)} />
      )}
    </>
  );
}

function ChoixEleveModal({ place, config, eleves, photos, onClose, onChoisir }: {
  place: ElemSalle; config: ConfigSalle; eleves: Eleve[]; photos: Record<string, string>;
  onClose: () => void; onChoisir: (eleveId: string | null, note: string) => void;
}) {
  const actuel = config.places[place.id] ?? "";
  const [note, setNote] = React.useState(config.notes[place.id] ?? "");
  const occupePar = (id: string) => Object.entries(config.places).find(([k, v]) => v === id && k !== place.id);
  return (
    <Modal titre="Qui s'installe ici ?" onClose={onClose}
      footer={<>
        {actuel && <button className="btn danger" onClick={() => onChoisir(null, "")}>Libérer la place</button>}
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Annuler</button>
      </>}>
      <Field label="Note de placement (optionnelle)">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dos à la fenêtre, moins de stimulations…" />
      </Field>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 8 }}>
        {eleves.length === 0 && <div style={{ color: "var(--text-2)", fontSize: 13 }}>Aucun élève enregistré.</div>}
        {eleves.map((e) => {
          const ailleurs = occupePar(e.id);
          return (
            <button key={e.id} onClick={() => onChoisir(e.id, note)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 8px", borderRadius: 8, cursor: "pointer",
                border: "1px solid " + (actuel === e.id ? "var(--accent)" : "transparent"),
                background: actuel === e.id ? "var(--accent-soft)" : "transparent", textAlign: "left", color: "inherit", font: "inherit" }}>
              {photos[e.id]
                ? <img src={photos[e.id]} alt="" style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                : <div style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>{(e.nom || "?").charAt(0).toUpperCase()}</div>}
              <span style={{ flex: 1 }}>{e.nom}</span>
              {ailleurs && <span style={{ fontSize: 11, color: "var(--text-2)" }}>déjà placé — sera déplacé</span>}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
