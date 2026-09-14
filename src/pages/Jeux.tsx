import React from "react";
import { listen } from "@tauri-apps/api/event";
import { Page } from "../App";
import { api, EtatBanque, PictoArasaac, OptionsJeu } from "../api";
import { Field, Input, Select, Empty, useAsync, useOngletDemande } from "../components/ui";
import { toast } from "../components/Toaster";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";
import { TlaTab } from "./Tla";
import { PartieToutTab, MultiplicatifsTab } from "./ProblemesBarres";
import { completer, candidatsNecessaires } from "../tirage";

// ── Générateur de jeux ARASAAC ─────────────────────────────────────────────
//
// Aucune IA n'intervient dans le choix des pictogrammes. On part des
// catégories de la banque : un picto rangé dans « animaux terrestres » par
// ARASAAC en est un, sans qu'un modèle ait à le deviner. L'enseignant voit
// ensuite tout le vivier et retire ce qu'il ne veut pas : rien ne s'imprime
// sans avoir été regardé.

const OCTETS = (n: number) =>
  n > 1e9 ? `${(n / 1e9).toFixed(1)} Go` : n > 1e6 ? `${Math.round(n / 1e6)} Mo` : `${Math.round(n / 1e3)} ko`;

const ONGLETS = ["jeux", "tla", "partieTout", "multiplicatifs"] as const;
type Onglet = typeof ONGLETS[number];

const ONGLET_MEMORISE = "fabriquer:onglet";

export default function Jeux() {
  const [onglet, setOngletBrut] = React.useState<Onglet>(() => {
    try {
      const lu = localStorage.getItem(ONGLET_MEMORISE);
      return ONGLETS.includes(lu as Onglet) ? (lu as Onglet) : "jeux";
    } catch {
      return "jeux";
    }
  });
  const setOnglet = React.useCallback((o: Onglet) => {
    setOngletBrut(o);
    try { localStorage.setItem(ONGLET_MEMORISE, o); } catch { /* stockage indisponible */ }
  }, []);
  useOngletDemande("jeux", ONGLETS, setOnglet);
  const [etat, setEtat] = React.useState<EtatBanque | null>(null);
  const [progression, setProgression] = React.useState<{ etape: string; faits: number; total: number } | null>(null);
  const rafraichir = React.useCallback(() => { api.arasaacEtat().then(setEtat).catch(() => {}); }, []);
  React.useEffect(rafraichir, [rafraichir]);

  React.useEffect(() => {
    const p = listen<{ etape: string; faits: number; total: number }>("arasaac://avancement", (e) => setProgression(e.payload));
    return () => { p.then((off) => off()); };
  }, []);

  const telecharger = async () => {
    setProgression({ etape: "Démarrage", faits: 0, total: 0 });
    try {
      setEtat(await api.arasaacTelecharger());
      toast("Banque ARASAAC à jour.", { icone: "✅" });
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally {
      setProgression(null);
    }
  };

  // La banque est commune aux jeux et aux tableaux : tant qu'elle n'est pas
  // là, ces deux onglets n'ont de quoi travailler. Les problèmes en barres,
  // eux, n'en ont pas besoin.
  const avecPictos = (contenu: React.ReactNode) =>
    !etat ? <div /> : !etat.installee ? <Banque progression={progression} onTelecharger={telecharger} /> : contenu;

  return (
    <Page titre="Fabriquer" sous="Jeux et tableaux de langage à partir des pictogrammes ARASAAC, problèmes en barres">
      <div className="seg" style={{ marginBottom: 14 }}>
        <button className={onglet === "jeux" ? "active" : ""} onClick={() => setOnglet("jeux")}>🎲 Jeux</button>
        <button className={onglet === "tla" ? "active" : ""} onClick={() => setOnglet("tla")}>🗣 Tableaux de langage</button>
        <button className={onglet === "partieTout" ? "active" : ""} onClick={() => setOnglet("partieTout")}>➕ Problèmes partie-tout</button>
        <button className={onglet === "multiplicatifs" ? "active" : ""} onClick={() => setOnglet("multiplicatifs")}>✖️ Problèmes multiplicatifs</button>
      </div>
      {onglet === "partieTout" ? <PartieToutTab />
        : onglet === "multiplicatifs" ? <MultiplicatifsTab />
        : onglet === "jeux" ? avecPictos(etat && <Generateur etat={etat} progression={progression} onTelecharger={telecharger} />)
        : avecPictos(<TlaTab />)}
    </Page>
  );
}

// ── La banque ──────────────────────────────────────────────────────────────

function Banque({ progression, onTelecharger }: {
  progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const pourcent = progression && progression.total > 0
    ? Math.round((progression.faits / progression.total) * 100) : null;
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3 style={{ marginTop: 0 }}>🗃 Banque de pictogrammes</h3>
      <p style={{ color: "var(--text-2)", fontSize: 13, marginTop: 0 }}>
        Les 13 800 pictogrammes d'ARASAAC descendent une seule fois, puis tout
        fonctionne hors ligne. Comptez environ 330 Mo et une dizaine de minutes.
        Le téléchargement reprend là où il s'est arrêté si vous le relancez.
      </p>
      {progression ? (
        <>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {progression.etape}
            {progression.total > 0 && ` — ${progression.faits} / ${progression.total}`}
          </div>
          <div style={{ height: 8, background: "var(--panel-2)", borderRadius: 100, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pourcent ?? 0}%`, background: "var(--accent)", transition: "width .3s" }} />
          </div>
        </>
      ) : (
        <button className="btn primary" onClick={onTelecharger}>⬇ Télécharger la banque</button>
      )}
    </div>
  );
}

// ── Le générateur ──────────────────────────────────────────────────────────

function Generateur({ etat, progression, onTelecharger }: {
  etat: EtatBanque; progression: { etape: string; faits: number; total: number } | null;
  onTelecharger: () => void;
}) {
  const { data: categories } = useAsync(() => api.arasaacCategories(), []);
  const [q, setQ] = React.useState("");
  const [choisies, setChoisies] = React.useState<string[]>([]);
  const [intersection, setIntersection] = React.useState(false);
  const [sansVerbes, setSansVerbes] = React.useState(true);
  const [combien, setCombien] = React.useState(18);
  const [graine, setGraine] = React.useState(() => Math.floor(Math.random() * 1e6));
  const [vivier, setVivier] = React.useState<PictoArasaac[]>([]);
  const [ecartes, setEcartes] = React.useState<Set<number>>(new Set());
  // Tout ce qui a été écarté pour ce thème : un nouveau tirage ne le ramène pas.
  const [bannis, setBannis] = React.useState<Set<number>>(new Set());
  React.useEffect(() => { setBannis(new Set()); }, [choisies, intersection, sansVerbes]);
  const [options, setOptions] = React.useState<OptionsJeu>({
    libelles: false, cartes: true, colonnes: 3, lignes: 2, planches: 6, graine: 0,
  });
  const [occupe, setOccupe] = React.useState(false);

  // Les catégories sans effectif utile encombrent la liste plus qu'elles
  // n'aident : une catégorie de trois pictos ne fait pas un loto.
  const visibles = React.useMemo(() => {
    const filtre = q.trim().toLowerCase();
    return (categories ?? [])
      .filter((c) => c.nombre >= 6)
      .filter((c) => !filtre
        || libelleCategorie(c.nom).toLowerCase().includes(filtre)
        || c.nom.toLowerCase().includes(filtre))
      .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
  }, [categories, q]);

  const basculer = (nom: string) =>
    setChoisies((v) => (v.includes(nom) ? v.filter((x) => x !== nom) : [...v, nom]));

  const retenus = vivier.filter((p) => !ecartes.has(p.id));

  /**
   * Tire des pictogrammes. `garder` : on conserve les retenus et l'on ne
   * remplace que les écartés ; sinon tout est retiré au sort. Dans les deux
   * cas, les écartés rejoignent les bannis et ne reviennent plus.
   */
  const tirer = async (nouvelleGraine?: number, garder = false) => {
    if (!choisies.length) return;
    const g = nouvelleGraine ?? graine;
    setGraine(g);
    const exclus = new Set([...bannis, ...ecartes]);
    const gardes = garder ? retenus : [];
    try {
      const candidats = await api.arasaacSelection(choisies, sansVerbes ? EXCLUES_PAR_DEFAUT : [], intersection,
        candidatsNecessaires(combien, exclus.size, gardes.length), g);
      const p = completer(gardes, candidats, exclus, combien);
      setBannis(exclus);
      setVivier(p);
      setEcartes(new Set());
      if (!p.length) toast("Aucun pictogramme pour cette sélection.", { icone: "⚠️" });
      else if (p.length < combien) toast(`Ce thème n’a plus d’autres pictogrammes : ${p.length} sur ${combien}.`, { icone: "ℹ️" });
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
  };
  const parPlanche = options.colonnes * options.lignes;

  const generer = async () => {
    setOccupe(true);
    try {
      const titre = choisies.map(libelleCategorie).join(" + ");
      await api.jeuGenerer("loto", retenus, { ...options, graine }, titre);
      toast("Loto créé — le PDF s'ouvre.", { icone: "🎲" });
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--text-2)" }}>
            🗃 {etat.pictos.toLocaleString("fr")} pictogrammes · {etat.images.toLocaleString("fr")} images · {OCTETS(etat.octets)}
            {etat.derniereMaj && ` · mise à jour le ${etat.derniereMaj}`}
          </div>
          <div className="spacer" style={{ flex: 1 }} />
          {progression
            ? <span style={{ fontSize: 13 }}>{progression.etape} {progression.faits}/{progression.total}</span>
            : <button className="btn sm" onClick={onTelecharger}>🔄 Resynchroniser</button>}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", gap: 14, alignItems: "start" }}>
        {/* ── Catégories ── */}
        <div className="card">
          <h3 style={{ marginTop: 0 }}>1. Choisir un thème</h3>
          <Input placeholder="Chercher une catégorie…" value={q} onChange={(e) => setQ(e.target.value)} />
          <div style={{ maxHeight: 380, overflowY: "auto", marginTop: 8, border: "1px solid var(--border)", borderRadius: 8 }}>
            {visibles.map((c) => (
              <label key={c.nom} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "5px 8px", fontSize: 13,
                cursor: "pointer", background: choisies.includes(c.nom) ? "var(--panel-2)" : undefined,
              }}>
                <input type="checkbox" checked={choisies.includes(c.nom)} onChange={() => basculer(c.nom)} />
                <span style={{ flex: 1 }}>{libelleCategorie(c.nom)}</span>
                <span style={{ color: "var(--text-2)", fontSize: 12 }}>{c.nombre}</span>
              </label>
            ))}
            {!visibles.length && <div style={{ padding: 10, fontSize: 13, color: "var(--text-2)" }}>Aucune catégorie.</div>}
          </div>

          {choisies.length > 1 && (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10, fontSize: 13 }}>
              <input type="checkbox" checked={intersection} onChange={(e) => setIntersection(e.target.checked)} />
              <span>
                <b>Croiser les catégories</b><br />
                <span style={{ color: "var(--text-2)" }}>
                  Le picto doit appartenir à toutes celles cochées. « Mammifères »
                  seul ramène les baleines ; croisé avec « Animaux domestiques », il
                  donne la ferme.
                </span>
              </span>
            </label>
          )}

          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 10, fontSize: 13 }}>
            <input type="checkbox" checked={sansVerbes} onChange={(e) => setSansVerbes(e.target.checked)} />
            <span>
              <b>Écarter les verbes</b><br />
              <span style={{ color: "var(--text-2)" }}>
                ARASAAC range « baisser le pantalon » dans les vêtements. À décocher
                pour un loto d'actions.
              </span>
            </span>
          </label>

          <Field label="Nombre de pictogrammes tirés">
            <Input type="number" min={parPlanche} max={60} value={combien}
              onChange={(e) => setCombien(Math.max(parPlanche, Number(e.target.value) || parPlanche))} />
          </Field>

          <button className="btn primary" style={{ width: "100%", marginTop: 8 }}
            disabled={!choisies.length} onClick={() => tirer()}>
            🎲 Tirer les pictogrammes
          </button>
        </div>

        {/* ── Vivier + options ── */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>2. Vérifier</h3>
              <span style={{ fontSize: 13, color: "var(--text-2)" }}>
                {retenus.length} retenus{ecartes.size > 0 && ` · ${ecartes.size} écartés`}
              </span>
              <div style={{ flex: 1 }} />
              {ecartes.size > 0 && (
                <button className="btn sm primary" onClick={() => tirer(Math.floor(Math.random() * 1e6), true)}
                  title="Garde les pictogrammes retenus et tire seulement de quoi remplacer les écartés">
                  🔁 Remplacer les {ecartes.size} écartés
                </button>
              )}
              {vivier.length > 0 && (
                <button className="btn sm" onClick={() => tirer(Math.floor(Math.random() * 1e6))}
                  title="Tire un nouveau lot, sans jamais reprendre un pictogramme écarté">
                  🔀 Tout retirer au sort
                </button>
              )}
            </div>
            {!vivier.length ? (
              <div style={{ marginTop: 10 }}>
                <Empty icone="🎴" titre="Aucun pictogramme tiré"
                  sous="Choisissez un thème à gauche, puis tirez." />
              </div>
            ) : (
              <>
                <p style={{ fontSize: 13, color: "var(--text-2)", margin: "8px 0" }}>
                  Cliquez sur un pictogramme pour l'écarter : il ne reviendra plus dans
                  les tirages de ce thème. Rien ne s'imprime sans que vous l'ayez vu.
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 8 }}>
                  {vivier.map((p) => (
                    <Vignette key={p.id} picto={p} ecarte={ecartes.has(p.id)}
                      onClick={() => setEcartes((s) => {
                        const n = new Set(s);
                        if (n.has(p.id)) n.delete(p.id); else n.add(p.id);
                        return n;
                      })} />
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>3. Imprimer</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <Field label="Grille">
                <Select value={`${options.colonnes}x${options.lignes}`}
                  onChange={(e) => {
                    const [c, l] = e.target.value.split("x").map(Number);
                    setOptions((o) => ({ ...o, colonnes: c, lignes: l }));
                  }}>
                  <option value="3x2">3 × 2 — six cases</option>
                  <option value="2x2">2 × 2 — quatre cases</option>
                  <option value="4x3">4 × 3 — douze cases</option>
                </Select>
              </Field>
              <Field label="Nombre de planches">
                <Input type="number" min={1} max={20} value={options.planches}
                  onChange={(e) => setOptions((o) => ({ ...o, planches: Math.max(1, Number(e.target.value) || 1) }))} />
              </Field>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, marginTop: 6 }}>
              <input type="checkbox" checked={options.libelles}
                onChange={(e) => setOptions((o) => ({ ...o, libelles: e.target.checked }))} />
              <span>
                <b>Écrire le mot sous le pictogramme</b><br />
                <span style={{ color: "var(--text-2)" }}>
                  Désactivé par défaut : pour un non-lecteur, le texte n'apporte rien
                  et charge l'image.
                </span>
              </span>
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, marginTop: 6 }}>
              <input type="checkbox" checked={options.cartes}
                onChange={(e) => setOptions((o) => ({ ...o, cartes: e.target.checked }))} />
              <b>Ajouter les cartes à découper</b>
            </label>

            {retenus.length > 0 && retenus.length < parPlanche && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--danger, #b03030)" }}>
                Il faut au moins {parPlanche} pictogrammes pour une planche {options.colonnes} × {options.lignes}.
              </div>
            )}
            <button className="btn primary" style={{ marginTop: 12 }}
              disabled={occupe || retenus.length < parPlanche} onClick={generer}>
              {occupe ? "Création…" : "🖨 Créer le PDF"}
            </button>
            <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, marginBottom: 0 }}>
              Pictogrammes ARASAAC — auteur Sergio Palao, origine Gouvernement d'Aragon,
              licence CC BY-NC-SA. L'attribution est portée sur chaque page. Usage
              pédagogique non commercial.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function Vignette({ picto, ecarte, onClick }: { picto: PictoArasaac; ecarte: boolean; onClick: () => void }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.arasaacImage(picto.id).then((b) => { if (vivant) setSrc(`data:image/png;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [picto.id]);
  return (
    <button onClick={onClick} title={ecarte ? "Remettre" : "Écarter"}
      style={{
        border: "1px solid var(--border)", borderRadius: 8, background: "#fff", padding: 4,
        cursor: "pointer", opacity: ecarte ? 0.25 : 1, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 2,
      }}>
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
           : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 11, color: "#444", textAlign: "center", lineHeight: 1.15,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {picto.mot}
      </span>
    </button>
  );
}
