import React from "react";
import { api, Gabarit, CaseTla, NatureMot, PictoArasaac, caseVide, telechargerTexte } from "../api";
import { Modal, Field, Input, Select, Empty, Confirm, useAsync } from "../components/ui";
import { toast } from "../components/Toaster";
import {
  NATURES, couleurNature, nouveauGabarit, redimensionner,
  casesPerdues, poser, remplies, verifier, lireGabarit, tableauSurTheme,
} from "../tla";
import { SQUELETTES, squelettePour, placesDuTheme, motsDuNoyau } from "../squelettes";
import { libelleCategorie, EXCLUES_PAR_DEFAUT } from "../data/categoriesArasaac";

// ── Tableaux de langage assisté ────────────────────────────────────────────
//
// Un TLA n'est pas un jeu qu'on regénère : c'est un gabarit qu'on pose une
// fois et qu'on ne bouge plus. L'enfant atteint « je » sans le chercher des
// yeux parce que « je » est toujours à la même case ; déplacer les cases
// annulerait l'automatisation que le tableau sert à construire.
//
// L'écran est donc un éditeur, pas un générateur. La banque ARASAAC ne sert
// qu'à trouver le pictogramme que l'enseignant a décidé de poser.

const CLE = "tla:gabarits";

export function TlaTab() {
  const [gabarits, setGabarits] = React.useState<Gabarit[]>([]);
  const [charge, setCharge] = React.useState(false);
  const [ouvert, setOuvert] = React.useState<string>("");
  const [aSupprimer, setASupprimer] = React.useState<Gabarit | null>(null);
  const [surTheme, setSurTheme] = React.useState(false);
  const importInput = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    api.settingGet(CLE).then((s) => {
      try { setGabarits(s ? JSON.parse(s) : []); } catch { setGabarits([]); }
      setCharge(true);
    });
  }, []);

  // Référence à jour : deux modifications rapprochées doivent se composer et
  // non s'écraser, comme sur les autres écrans de saisie de l'application.
  const ref = React.useRef<Gabarit[]>([]);
  ref.current = gabarits;
  const enregistrer = (liste: Gabarit[]) => {
    ref.current = liste; setGabarits(liste);
    api.settingSet(CLE, JSON.stringify(liste));
  };
  const majUn = (g: Gabarit) => enregistrer(ref.current.map((x) => (x.id === g.id ? g : x)));

  const creer = () => {
    const g = nouveauGabarit();
    enregistrer([...ref.current, g]);
    setOuvert(g.id);
  };

  const importer = async (f: File) => {
    try {
      const g = lireGabarit(await f.text());
      enregistrer([...ref.current, g]);
      setOuvert(g.id);
      toast("Gabarit importé.", { icone: "📥" });
    } catch (e: any) {
      toast("Fichier illisible : " + String(e?.message ?? e), { icone: "⚠️" });
    }
  };

  const edite = gabarits.find((g) => g.id === ouvert);
  if (!charge) return <div />;

  if (edite) {
    return <Editeur gabarit={edite} onChange={majUn} onFermer={() => setOuvert("")} />;
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-2)" }}>
          Un tableau de langage se construit une fois puis ne bouge plus : c'est
          la stabilité des emplacements qui permet à l'élève d'atteindre un mot
          sans le chercher. Si l'orthophoniste ou la famille en utilise déjà un,
          <b> importez-le</b> plutôt que d'en créer un autre.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn primary" onClick={() => setSurTheme(true)}>✨ Tableau sur un thème</button>
          <button className="btn" onClick={creer}>➕ Tableau vide</button>
          <button className="btn" onClick={() => importInput.current?.click()}>📥 Importer un gabarit</button>
          <input ref={importInput} type="file" accept="application/json" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        </div>
      </div>

      {!gabarits.length ? (
        <Empty icone="🗣" titre="Aucun tableau"
          sous="Créez un gabarit, ou importez celui déjà utilisé par le SESSAD." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {gabarits.map((g) => (
            <div key={g.id} className="card" style={{ padding: 12 }}>
              <div style={{ fontWeight: 600 }}>{g.nom}</div>
              <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 2 }}>
                {g.eleve && `${g.eleve} · `}{g.colonnes} × {g.lignes} · {remplies(g)} mots
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                <button className="btn sm" onClick={() => setOuvert(g.id)}>✏️ Ouvrir</button>
                <button className="btn sm" onClick={() =>
                  telechargerTexte(`tla-${g.nom.replace(/\W+/g, "-").toLowerCase()}.json`, JSON.stringify(g, null, 2))
                }>📤 Exporter</button>
                <button className="btn sm" onClick={() => setASupprimer(g)}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {surTheme && (
        <SurTheme onClose={() => setSurTheme(false)}
          onCree={(g) => { enregistrer([...ref.current, g]); setSurTheme(false); setOuvert(g.id); }} />
      )}

      {aSupprimer && (
        <Confirm message={`Supprimer le tableau « ${aSupprimer.nom} » ?`}
          onYes={() => { enregistrer(ref.current.filter((x) => x.id !== aSupprimer.id)); setASupprimer(null); }}
          onClose={() => setASupprimer(null)} />
      )}
    </>
  );
}

// ── Éditeur ────────────────────────────────────────────────────────────────

function Editeur({ gabarit, onChange, onFermer }: {
  gabarit: Gabarit; onChange: (g: Gabarit) => void; onFermer: () => void;
}) {
  const { data: eleves } = useAsync(() => api.elevesList(), []);
  const [caseEditee, setCaseEditee] = React.useState<number | null>(null);
  const [redim, setRedim] = React.useState<{ colonnes: number; lignes: number } | null>(null);
  const [occupe, setOccupe] = React.useState(false);

  const changerTaille = (colonnes: number, lignes: number) => {
    const perdues = casesPerdues(gabarit, colonnes, lignes);
    if (perdues > 0) setRedim({ colonnes, lignes });
    else onChange(redimensionner(gabarit, colonnes, lignes));
  };

  const imprimer = async () => {
    const soucis = verifier(gabarit);
    if (soucis.length) { toast(soucis[0], { icone: "⚠️" }); return; }
    setOccupe(true);
    try {
      await api.tlaGenerer(gabarit);
      toast("Tableau créé — le PDF s'ouvre.", { icone: "🖨" });
    } catch (e: any) { toast(String(e), { icone: "⚠️" }); }
    finally { setOccupe(false); }
  };

  return (
    <>
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <button className="btn sm" onClick={onFermer}>← Tous les tableaux</button>
          <Field label="Nom du tableau">
            <Input value={gabarit.nom} onChange={(e) => onChange({ ...gabarit, nom: e.target.value })} />
          </Field>
          <Field label="Élève">
            <Select value={gabarit.eleve} onChange={(e) => onChange({ ...gabarit, eleve: e.target.value })}>
              <option value="">— aucun —</option>
              {(eleves ?? []).map((el) => <option key={el.id} value={el.nom}>{el.nom}</option>)}
            </Select>
          </Field>
          <Field label="Grille">
            <Select value={`${gabarit.colonnes}x${gabarit.lignes}`}
              onChange={(e) => { const [c, l] = e.target.value.split("x").map(Number); changerTaille(c, l); }}>
              {SQUELETTES.map((s) => (
                <option key={s.label} value={`${s.colonnes}x${s.lignes}`}>{s.label}</option>
              ))}
            </Select>
          </Field>
          <Field label="Écart entre les cases">
            <Select value={String(gabarit.ecart)}
              onChange={(e) => onChange({ ...gabarit, ecart: Number(e.target.value) })}
              title="Des cases détachées se visent du poing ; un écart nul rend la place à des cases plus grandes">
              <option value="0">Aucun — cases jointives</option>
              <option value="3">Normal</option>
              <option value="6">Large — pointage du poing</option>
            </Select>
          </Field>
          <Field label="Orientation">
            <Select value={gabarit.paysage ? "paysage" : "portrait"}
              onChange={(e) => onChange({ ...gabarit, paysage: e.target.value === "paysage" })}>
              <option value="paysage">Paysage</option>
              <option value="portrait">Portrait</option>
            </Select>
          </Field>
          <div style={{ flex: 1 }} />
          <button className="btn primary" disabled={occupe} onClick={imprimer}>
            {occupe ? "Création…" : "🖨 Imprimer le tableau"}
          </button>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, flexWrap: "wrap", fontSize: 12 }}>
          {NATURES.map((n) => (
            <span key={n.id} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 12, height: 12, borderRadius: 3, background: n.couleur, border: "1px solid #bbb" }} />
              {n.label}
            </span>
          ))}
          <span style={{ color: "var(--text-2)" }}>
            · {remplies(gabarit)} / {gabarit.cases.length} cases
          </span>
        </div>
      </div>

      <div className="card">
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--text-2)" }}>
          Cliquez sur une case pour y poser un mot. Changer la taille de la
          grille ne déplace jamais les cases déjà posées : elles gardent leurs
          coordonnées.
        </p>
        <div style={{
          display: "grid",
          gridTemplateColumns: `repeat(${gabarit.colonnes}, 1fr)`,
          gap: 3, background: "#c9ccd6", padding: 3, borderRadius: 6,
          maxWidth: gabarit.paysage ? "100%" : 620,
        }}>
          {gabarit.cases.map((c, i) => (
            <CaseBouton key={i} valeur={c} onClick={() => setCaseEditee(i)} />
          ))}
        </div>
      </div>

      {caseEditee !== null && (
        <ChoixMot valeur={gabarit.cases[caseEditee]}
          onClose={() => setCaseEditee(null)}
          onValider={(v) => { onChange(poser(gabarit, caseEditee, v)); setCaseEditee(null); }} />
      )}

      {redim && (
        <Confirm
          message={`Réduire la grille à ${redim.colonnes} × ${redim.lignes} effacera ${casesPerdues(gabarit, redim.colonnes, redim.lignes)} case(s) déjà remplie(s). Continuer ?`}
          onYes={() => { onChange(redimensionner(gabarit, redim.colonnes, redim.lignes)); setRedim(null); }}
          onClose={() => setRedim(null)} />
      )}
    </>
  );
}

function CaseBouton({ valeur, onClick }: { valeur: CaseTla; onClick: () => void }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    if (valeur.pictoId === null) { setSrc(""); return; }
    let vivant = true;
    api.arasaacImage(valeur.pictoId).then((b) => { if (vivant) setSrc(`data:image/png;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [valeur.pictoId]);
  const vide = valeur.pictoId === null;
  return (
    <button onClick={onClick} title={vide ? "Poser un mot" : valeur.mot}
      style={{
        background: vide ? "#fff" : couleurNature(valeur.nature),
        border: "none", borderRadius: 3, aspectRatio: "1", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: 3, gap: 2, minHeight: 60,
      }}>
      {src
        ? <img src={src} alt="" style={{ width: "100%", flex: 1, objectFit: "contain", minHeight: 0 }} />
        : <span style={{ flex: 1, display: "flex", alignItems: "center", color: "#bbb", fontSize: 18 }}>+</span>}
      {!vide && (
        <span style={{ fontSize: 10, color: "#333", lineHeight: 1.1, textAlign: "center",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
          {valeur.mot}
        </span>
      )}
    </button>
  );
}

// ── Choix du mot d'une case ────────────────────────────────────────────────
//
// La recherche propose, l'enseignant tranche. C'est ce qui autorise ici la
// correspondance partielle, interdite dans la génération de jeux : chercher
// « terre » ramène aussi des drapeaux, mais on les voit avant de choisir.

function ChoixMot({ valeur, onClose, onValider }: {
  valeur: CaseTla; onClose: () => void; onValider: (v: CaseTla) => void;
}) {
  const [q, setQ] = React.useState(valeur.mot);
  const [resultats, setResultats] = React.useState<PictoArasaac[]>([]);
  const [choisi, setChoisi] = React.useState<PictoArasaac | null>(
    valeur.pictoId !== null ? { id: valeur.pictoId, mot: valeur.mot, fichier: valeur.fichier } : null,
  );
  const [mot, setMot] = React.useState(valeur.mot);
  const [nature, setNature] = React.useState<NatureMot>(valeur.nature);

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (q.trim().length < 2) { setResultats([]); return; }
      api.arasaacChercher(q, 40).then(setResultats).catch(() => setResultats([]));
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // La nature vient des catégories ARASAAC, jamais d'une lecture du mot. Elle
  // reste modifiable : « manger » se pose parfois comme nom sur un tableau.
  const prendre = async (p: PictoArasaac) => {
    setChoisi(p);
    if (!mot.trim() || mot === choisi?.mot) setMot(p.mot);
    try { setNature((await api.arasaacNature(p.id)) as NatureMot); } catch { /* on garde */ }
  };

  return (
    <Modal titre="Poser un mot" onClose={onClose} large
      footer={<>
        {valeur.pictoId !== null && (
          <button className="btn" onClick={() => onValider(caseVide())}>Vider la case</button>
        )}
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={!choisi || !mot.trim()}
          onClick={() => choisi && onValider({ pictoId: choisi.id, fichier: choisi.fichier, mot: mot.trim(), nature })}>
          Poser
        </button>
      </>}>
      <Field label="Chercher un pictogramme">
        <Input autoFocus placeholder="manger, encore, content…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(84px, 1fr))",
        gap: 6, maxHeight: 260, overflowY: "auto", marginTop: 6,
      }}>
        {resultats.map((p) => (
          <Resultat key={p.id} picto={p} actif={choisi?.id === p.id} onClick={() => prendre(p)} />
        ))}
        {q.trim().length >= 2 && !resultats.length && (
          <div style={{ gridColumn: "1/-1", fontSize: 13, color: "var(--text-2)" }}>
            Aucun pictogramme pour « {q} ».
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <Field label="Mot écrit sous le pictogramme">
          <Input value={mot} onChange={(e) => setMot(e.target.value)} />
        </Field>
        <Field label="Nature (couleur de la case)">
          <Select value={nature} onChange={(e) => setNature(e.target.value as NatureMot)}>
            {NATURES.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

function Resultat({ picto, actif, onClick }: { picto: PictoArasaac; actif: boolean; onClick: () => void }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    let vivant = true;
    api.arasaacImage(picto.id).then((b) => { if (vivant) setSrc(`data:image/png;base64,${b}`); }).catch(() => {});
    return () => { vivant = false; };
  }, [picto.id]);
  return (
    <button onClick={onClick} title={picto.mot}
      style={{
        border: actif ? "2px solid var(--accent)" : "1px solid var(--border)",
        borderRadius: 8, background: "#fff", padding: 4, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      }}>
      {src ? <img src={src} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "contain" }} />
           : <div style={{ width: "100%", aspectRatio: "1" }} />}
      <span style={{ fontSize: 10, color: "#444", lineHeight: 1.1, textAlign: "center",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
        {picto.mot}
      </span>
    </button>
  );
}


// ── Tableau sur un thème ───────────────────────────────────────────────────
//
// Le thème ne remplit que les cases de rôle « nom ». Le reste — mots
// interrogatifs, pronoms, verbes, petits mots, adjectifs — vient du noyau et
// se pose toujours aux mêmes coordonnées. Sans cela on produirait un tableau
// de choix : une liste de noms où l'on désigne un objet, mais où l'on ne peut
// ni demander, ni questionner, ni commenter, ni refuser.

function SurTheme({ onClose, onCree }: { onClose: () => void; onCree: (g: Gabarit) => void }) {
  const { data: categories } = useAsync(() => api.arasaacCategories(), []);
  const [taille, setTaille] = React.useState("5x4");
  const [q, setQ] = React.useState("");
  const [theme, setTheme] = React.useState<string[]>([]);
  const [nom, setNom] = React.useState("");
  const [occupe, setOccupe] = React.useState(false);
  const [absents, setAbsents] = React.useState<string[]>([]);

  const [c, l] = taille.split("x").map(Number);
  const squelette = squelettePour(c, l);
  const places = placesDuTheme(squelette);

  const visibles = React.useMemo(() => {
    const f = q.trim().toLowerCase();
    return (categories ?? [])
      .filter((x) => x.nombre >= 6)
      .filter((x) => !f || libelleCategorie(x.nom).toLowerCase().includes(f) || x.nom.toLowerCase().includes(f))
      .sort((a, b) => libelleCategorie(a.nom).localeCompare(libelleCategorie(b.nom), "fr"));
  }, [categories, q]);

  const creer = async () => {
    setOccupe(true); setAbsents([]);
    try {
      // Le noyau se résout par correspondance exacte : un mot introuvable
      // laisse sa case vide, il ne se remplace pas par une approximation.
      const [trouves, manquants] = await api.arasaacParMots(motsDuNoyau(squelette));
      const noyau = new Map(trouves.map((p) => [p.mot, p]));
      const mots = places > 0
        ? await api.arasaacSelection(theme, EXCLUES_PAR_DEFAUT, false, places, Math.floor(Math.random() * 1e6))
        : [];
      const titre = nom.trim() || theme.map(libelleCategorie).join(" + ") || "Tableau";
      setAbsents(manquants);
      onCree(tableauSurTheme(squelette, titre, noyau, mots));
    } catch (e: any) {
      toast(String(e), { icone: "⚠️" });
    } finally { setOccupe(false); }
  };

  return (
    <Modal titre="Tableau sur un thème" onClose={onClose} large
      footer={<>
        <button className="btn" onClick={onClose}>Annuler</button>
        <button className="btn primary" disabled={occupe} onClick={creer}>
          {occupe ? "Construction…" : "Construire le tableau"}
        </button>
      </>}>
      <p style={{ marginTop: 0, fontSize: 13, color: "var(--text-2)" }}>
        Le thème ne remplit que la colonne des noms. Les mots interrogatifs,
        les pronoms, les verbes et les adjectifs viennent du noyau et se posent
        toujours aux mêmes cases : c'est ce qui permet de <b>demander,
        questionner, commenter et refuser</b>, et pas seulement de désigner.
      </p>

      <Field label="Taille de la grille">
        <Select value={taille} onChange={(e) => setTaille(e.target.value)}>
          {SQUELETTES.map((s) => (
            <option key={s.label} value={`${s.colonnes}x${s.lignes}`}>
              {s.label}{s.documente ? " — disposition publiée" : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div style={{ fontSize: 13, margin: "8px 0" }}>
        Structure : {squelette.roles.map((pile, i) => (
          <span key={i} style={{
            display: "inline-block", padding: "2px 7px", margin: "0 4px 4px 0",
            borderRadius: 4, background: "var(--panel-2)", fontSize: 12,
          }}>{pile.join(" + ")}</span>
        ))}
        <div style={{ color: "var(--text-2)", marginTop: 4 }}>
          {places} case{places > 1 ? "s" : ""} pour le thème sur {squelette.colonnes * squelette.lignes}.
          {places < 4 && " C'est peu, et c'est voulu : un tableau de langage est surtout du vocabulaire noyau. Prenez une grille plus grande s'il vous faut plus de noms."}
        </div>
      </div>

      <Field label="Nom du tableau">
        <Input placeholder="La cuisine, le bain, la récréation…" value={nom} onChange={(e) => setNom(e.target.value)} />
      </Field>

      <Field label="Thème (remplit les noms)">
        <Input placeholder="Chercher une catégorie…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Field>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 8, marginTop: 6 }}>
        {visibles.map((x) => (
          <label key={x.nom} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", fontSize: 13, cursor: "pointer",
            background: theme.includes(x.nom) ? "var(--panel-2)" : undefined,
          }}>
            <input type="checkbox" checked={theme.includes(x.nom)}
              onChange={() => setTheme((v) => v.includes(x.nom) ? v.filter((y) => y !== x.nom) : [...v, x.nom])} />
            <span style={{ flex: 1 }}>{libelleCategorie(x.nom)}</span>
            <span style={{ color: "var(--text-2)", fontSize: 12 }}>{x.nombre}</span>
          </label>
        ))}
      </div>
      {!!absents.length && (
        <div style={{ marginTop: 10, fontSize: 13 }}>
          Sans pictogramme, cases laissées libres : {absents.join(", ")}
        </div>
      )}
      <p style={{ fontSize: 12, color: "var(--text-2)", marginTop: 12, marginBottom: 0 }}>
        Le tableau s'ouvre ensuite dans l'éditeur : rien n'est figé, tout se
        déplace et se complète avant impression. Un TLA se range avec son
        activité — celui du repas à table, celui du bain dans la salle de bain.
      </p>
    </Modal>
  );
}
