import React from "react";
import { api, texteErreur, type PictoAppoint, type PictoArasaac } from "../api";
import { Field, Input, Modal } from "./ui";
import { toast } from "./Toaster";
import { confirmer } from "./confirmer";
import { pseudonymiserTout } from "../confidentialite";
import { nomsAMasquer } from "../nomsAMasquer";
import { EtiquetteMonPicto, usePictoImage } from "./ChoixPicto";
import { texteTelechargement, useBanquesAppoint } from "./ChoixPictoConsigne";
import { infoBanque } from "../pictosAppoint";
import {
  ETIQUETTES, chercherDans, cleDuMot, garderMonPicto, lireMesPictos, oublierMonPicto, renommerMonPicto, type MonPicto,
} from "../mesPictos";

// ── Trouver un pictogramme, ou le faire dessiner ──────────────────────────
//
// On cherche un mot dans ARASAAC, dans Sclera, et parmi ses pictos gardés.
// Quand aucune banque ne l'a, l'IA de Mistral en dessine un à la manière
// d'ARASAAC ; on le garde dans « Mes pictos », et il revient ensuite dans
// les ateliers, les listes de mots et le loto — avec son étiquette « IA » :
// ce n'est pas un pictogramme ARASAAC, et l'application le dit partout,
// jusqu'en bas des feuilles imprimées.

/** Ce qu'on regarde : un picto d'une banque, un picto gardé, ou un dessin pas encore gardé. */
type Choix =
  | { sorte: "arasaac"; id: number; mot: string }
  | { sorte: "sclera"; reference: string; mot: string }
  | { sorte: "mien"; picto: MonPicto }
  | { sorte: "dessin"; base64: string; mot: string; precision: string };

/** Le dessin reçu, en PNG carré de 512 pixels sur fond blanc : léger et net, comme un picto. */
async function enPngCarre(src: string, cote = 512): Promise<string> {
  const image = new Image();
  image.src = src;
  await image.decode();
  const toile = document.createElement("canvas");
  toile.width = toile.height = cote;
  const pinceau = toile.getContext("2d");
  if (!pinceau || !image.naturalWidth || !image.naturalHeight) throw new Error("Image illisible.");
  pinceau.fillStyle = "#fff";
  pinceau.fillRect(0, 0, cote, cote);
  const k = Math.min(cote / image.naturalWidth, cote / image.naturalHeight);
  const [l, h] = [image.naturalWidth * k, image.naturalHeight * k];
  pinceau.drawImage(image, (cote - l) / 2, (cote - h) / 2, l, h);
  return toile.toDataURL("image/png").split(",")[1] ?? "";
}

/**
 * L'image dans le presse-papiers, en PNG : Word, Pages ou LibreOffice la
 * collent telle quelle. L'image se lit pendant la copie, dans le même geste :
 * sans quoi le navigateur refuserait d'écrire.
 */
function copierImage(src: string) {
  // Une photo est un JPEG : elle passe par une toile pour devenir un PNG, que le presse-papiers accepte.
  const png = src.startsWith("data:image/png")
    ? fetch(src).then((r) => r.blob()).then((b) => new Blob([b], { type: "image/png" }))
    : (async () => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const toile = document.createElement("canvas");
      toile.width = image.naturalWidth;
      toile.height = image.naturalHeight;
      toile.getContext("2d")?.drawImage(image, 0, 0);
      return new Promise<Blob>((ok, ko) => toile.toBlob((b) => (b ? ok(b) : ko(new Error("Image illisible."))), "image/png"));
    })();
  navigator.clipboard.write([new ClipboardItem({ "image/png": png })])
    .then(() => toast("Image copiée : collez-la où vous voulez.", { icone: "📋" }))
    .catch((e) => toast("Copie impossible : " + String(e), { icone: "⚠️" }));
}

function Vignette({ src, mot, actif, etiquette, onClick }: {
  src: string; mot: string; actif: boolean; etiquette?: React.ReactNode; onClick: () => void;
}) {
  return (
    <button type="button" className={`tp-vignette${actif ? " actif" : ""}`} onClick={onClick} title={mot}>
      {etiquette}
      {src ? <img src={src} alt="" /> : <span className="tp-vide" />}
      <span className="tp-mot">{mot}</span>
    </button>
  );
}
const VignetteArasaac = ({ p, actif, onClick }: { p: PictoArasaac; actif: boolean; onClick: () => void }) =>
  <Vignette src={usePictoImage(p.id)} mot={p.mot} actif={actif} onClick={onClick} />;
const VignetteSclera = ({ p, actif, onClick }: { p: PictoAppoint; actif: boolean; onClick: () => void }) =>
  <Vignette src={usePictoImage(p.reference)} mot={p.mot} actif={actif} onClick={onClick} />;
const VignetteMienne = ({ p, actif, onClick }: { p: MonPicto; actif: boolean; onClick: () => void }) =>
  <Vignette src={usePictoImage(p.id)} mot={p.mot} actif={actif} onClick={onClick} etiquette={<EtiquetteMonPicto id={p.id} />} />;

export function TrouverUnPicto({ onClose }: { onClose: () => void }) {
  const [q, setQ] = React.useState("");
  const [arasaacLa, setArasaacLa] = React.useState<boolean | null>(null);
  const [arasaac, setArasaac] = React.useState<PictoArasaac[]>([]);
  const [sclera, setSclera] = React.useState<PictoAppoint[]>([]);
  // Le mot dont les résultats sont affichés : tant qu'il diffère de la saisie, on cherche encore.
  const [cherche, setCherche] = React.useState("");
  const [miens, setMiens] = React.useState<MonPicto[]>([]);
  const [choix, setChoix] = React.useState<Choix | null>(null);
  const [precision, setPrecision] = React.useState("");
  const [dessinOuvert, setDessinOuvert] = React.useState(false);
  const [dessine, setDessine] = React.useState(false);
  const [occupe, setOccupe] = React.useState(false);
  const banques = useBanquesAppoint();
  const scleraLa = banques.installee("sclera");

  const relireMiens = React.useCallback(() => lireMesPictos().then(setMiens).catch(() => {}), []);
  React.useEffect(() => { void relireMiens(); }, [relireMiens]);
  React.useEffect(() => { api.arasaacEtat().then((e) => setArasaacLa(Boolean(e.installee))).catch(() => setArasaacLa(false)); }, []);

  const mot = q.trim();
  React.useEffect(() => {
    const t = setTimeout(async () => {
      if (cleDuMot(mot).length < 2) { setArasaac([]); setSclera([]); setCherche(mot); return; }
      const [a, s] = await Promise.all([
        arasaacLa ? api.arasaacChercher(mot, 36).catch((): PictoArasaac[] => []) : Promise.resolve([]),
        scleraLa ? api.pictosAppointChercher("sclera", mot, 36).catch((): PictoAppoint[] => []) : Promise.resolve([]),
      ]);
      setArasaac(a); setSclera(s); setCherche(mot);
    }, 250);
    return () => clearTimeout(t);
  }, [mot, arasaacLa, scleraLa]);

  const lesMiens = chercherDans(miens, mot);
  const pret = cherche === mot && arasaacLa !== null;
  // Rien nulle part, pas même parmi ses pictos gardés : on propose le dessin.
  const rienDansLesBanques = pret && cleDuMot(mot).length >= 2 && !arasaac.length && !sclera.length && !lesMiens.length;

  const dessiner = async () => {
    if (!mot) return;
    setDessine(true);
    try {
      // Un nom connu ne part pas, même pour un dessin.
      const [motMasque, precisionMasquee] = pseudonymiserTout([mot, precision], await nomsAMasquer()).textes;
      const brut = await api.mistralDessinerPicto(motMasque, precisionMasquee);
      setChoix({ sorte: "dessin", base64: await enPngCarre(`data:image;base64,${brut}`), mot, precision: precision.trim() });
    } catch (e) {
      toast(texteErreur(e), { icone: "⚠️", duree: 10000 });
    } finally { setDessine(false); }
  };

  const garder = async (base64: () => Promise<string>, origine: "ia" | "sclera", leMot: string, laPrecision?: string) => {
    setOccupe(true);
    try {
      const p = await garderMonPicto({ mot: leMot, base64: await base64(), origine, precision: laPrecision });
      await relireMiens();
      setChoix({ sorte: "mien", picto: p });
      toast(`« ${p.mot} » est dans Mes pictos : les ateliers le trouvent désormais sous ce mot.`, { icone: "⭐", duree: 6000 });
    } catch (e) { toast(texteErreur(e), { icone: "⚠️" }); } finally { setOccupe(false); }
  };

  const section = (titre: React.ReactNode, contenu: React.ReactNode) => (
    <div><div className="tp-section">{titre}</div>{contenu}</div>
  );
  const note = (texte: React.ReactNode) => <p className="meta" style={{ fontSize: 12.5, margin: "0 0 12px" }}>{texte}</p>;
  const enCoursSclera = banques.enCours?.banque === "sclera" ? banques.enCours : null;

  return (
    <Modal large titre="🧩 Trouver un pictogramme" onClose={onClose}
      footer={<>
        <span className="meta" style={{ fontSize: 12 }}>{miens.length} picto{miens.length > 1 ? "s" : ""} dans Mes pictos</span>
        <div className="spacer" />
        <button className="btn" onClick={onClose}>Fermer</button>
      </>}>
      <div className="tp-corps">
        <div className="tp-resultats">
          <Field label="Le mot">
            <Input autoFocus value={q} placeholder="trottinette, ranger, piscine…" onChange={(e) => setQ(e.target.value)} />
          </Field>

          {lesMiens.length > 0 && section(`Mes pictos (${lesMiens.length})`, (
            <div className="tp-grille">
              {lesMiens.map((p) => <VignetteMienne key={p.id} p={p} actif={choix?.sorte === "mien" && choix.picto.id === p.id}
                onClick={() => setChoix({ sorte: "mien", picto: p })} />)}
            </div>
          ))}

          {cleDuMot(mot).length >= 2 && (<>
            {section(`ARASAAC${pret ? ` (${arasaac.length})` : ""}`, arasaacLa === false
              ? note("La banque ARASAAC n'est pas encore sur cet ordinateur : l'onglet 🎲 Jeux la télécharge.")
              : arasaac.length
                ? <div className="tp-grille">{arasaac.map((p) => <VignetteArasaac key={p.id} p={p}
                    actif={choix?.sorte === "arasaac" && choix.id === p.id} onClick={() => setChoix({ sorte: "arasaac", id: p.id, mot: p.mot })} />)}</div>
                : note(pret ? `Aucun pictogramme ARASAAC pour « ${mot} ».` : "Recherche…"))}
            {section(`Sclera${scleraLa && pret ? ` (${sclera.length})` : ""}`, !scleraLa
              ? (
                <p className="meta" style={{ fontSize: 12.5, margin: "0 0 12px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span>La banque Sclera n'est pas encore sur cet ordinateur.</span>
                  <button type="button" className="btn sm" disabled={!!banques.enCours} onClick={() => { void banques.telecharger("sclera"); }}>
                    {enCoursSclera ? `⏳ ${texteTelechargement(enCoursSclera)}` : `⬇️ Télécharger (${infoBanque("sclera").taille})`}
                  </button>
                </p>
              )
              : sclera.length
                ? <div className="tp-grille">{sclera.map((p) => <VignetteSclera key={p.reference} p={p}
                    actif={choix?.sorte === "sclera" && choix.reference === p.reference}
                    onClick={() => setChoix({ sorte: "sclera", reference: p.reference, mot: p.mot })} />)}</div>
                : note(pret ? `Aucun pictogramme Sclera pour « ${mot} ».` : "Recherche…"))}

            {rienDansLesBanques || dessinOuvert ? (
              <div className="tp-dessin">
                <b>{rienDansLesBanques ? `Ni ARASAAC, ni Sclera, ni vos pictos gardés n'ont « ${mot} ».` : `Faire dessiner « ${mot} »`}</b>
                <p className="meta" style={{ fontSize: 12.5, margin: "4px 0 8px", lineHeight: 1.5 }}>
                  L'IA de Mistral peut en dessiner un, à la manière d'ARASAAC, en 10 à 30 secondes (environ 0,09 € l'image, sur
                  votre compte Mistral). Ce ne sera pas un pictogramme ARASAAC : gardé, il portera partout l'étiquette « IA ».
                </p>
                <Field label="Ce qu'on doit y voir (facultatif)">
                  <Input value={precision} placeholder="un enfant debout sur une trottinette" onChange={(e) => setPrecision(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !dessine) void dessiner(); }} />
                </Field>
                <button type="button" className="btn primary sm" disabled={dessine} onClick={() => { void dessiner(); }}>
                  {dessine ? `✨ L'IA dessine « ${mot} »…` : `✨ Dessiner « ${mot} » à la manière d'ARASAAC`}
                </button>
              </div>
            ) : pret && (
              <button type="button" className="lien" style={{ fontSize: 12.5 }} onClick={() => setDessinOuvert(true)}>
                Aucun ne convient ? Le faire dessiner par l'IA, à la manière d'ARASAAC
              </button>
            )}
          </>)}

          {!mot && !miens.length && note("Écrivez un mot : ARASAAC, Sclera et vos pictos gardés répondent ensemble.")}
        </div>

        <Apercu choix={choix} occupe={occupe} dessine={dessine}
          onGarder={(c) => {
            if (c.sorte === "dessin") void garder(async () => c.base64, "ia", c.mot, c.precision);
            else if (c.sorte === "sclera") void garder(() => api.pictosAppointImage(c.reference), "sclera", c.mot);
          }}
          onRedessiner={() => { void dessiner(); }}
          onRenommer={async (p, nouveau) => {
            try { const suite = await renommerMonPicto(p, nouveau); await relireMiens(); setChoix({ sorte: "mien", picto: suite }); }
            catch (e) { toast(texteErreur(e), { icone: "⚠️" }); }
          }}
          onOublier={async (p) => {
            if (!(await confirmer(`Retirer « ${p.mot} » de Mes pictos ? Les listes où vous l'avez mis le perdront.`, { oui: "Retirer", danger: true }))) return;
            await oublierMonPicto(p);
            await relireMiens();
            setChoix(null);
          }} />
      </div>
    </Modal>
  );
}

/** Le picto choisi, en grand, et ce qu'on peut en faire. */
function Apercu({ choix, occupe, dessine, onGarder, onRedessiner, onRenommer, onOublier }: {
  choix: Choix | null; occupe: boolean; dessine: boolean;
  onGarder: (c: Choix & { sorte: "dessin" | "sclera" }) => void;
  onRedessiner: () => void;
  onRenommer: (p: MonPicto, mot: string) => void;
  onOublier: (p: MonPicto) => void;
}) {
  const cle = choix?.sorte === "arasaac" ? choix.id : choix?.sorte === "sclera" ? choix.reference : choix?.sorte === "mien" ? choix.picto.id : null;
  const charge = usePictoImage(cle);
  const src = choix?.sorte === "dessin" ? `data:image/png;base64,${choix.base64}` : charge;
  const [mot, setMot] = React.useState("");
  React.useEffect(() => {
    setMot(choix?.sorte === "mien" ? choix.picto.mot : choix?.mot ?? "");
  }, [choix]);

  if (!choix) {
    return (
      <div className="tp-choix">
        <p className="meta" style={{ fontSize: 12.5, margin: 0, lineHeight: 1.5 }}>
          {dessine ? "✨ L'IA dessine…" : "Cliquez sur un picto pour le voir en grand, le copier, ou le garder dans Mes pictos."}
        </p>
      </div>
    );
  }
  const origine = choix.sorte === "dessin" ? "ia" : choix.sorte === "mien" ? choix.picto.origine : null;
  return (
    <div className="tp-choix">
      <div style={{ position: "relative" }}>
        {origine && <span className={`mp-etiquette mp-${origine}`} title={ETIQUETTES[origine].long}>{ETIQUETTES[origine].court}</span>}
        {src ? <img className="tp-choix-image" src={src} alt={mot} /> : <div className="tp-choix-image" />}
      </div>
      <div className="meta" style={{ fontSize: 12, lineHeight: 1.45 }}>
        {choix.sorte === "arasaac" && <>Pictogramme ARASAAC n° {choix.id}. Il est déjà dans tous les ateliers : cherchez « {choix.mot} ».</>}
        {choix.sorte === "sclera" && <>Pictogramme Sclera. Gardé dans Mes pictos, il rejoint les ateliers et les listes de mots.</>}
        {origine === "ia" && <>{ETIQUETTES.ia.long}.{choix.sorte === "dessin" && " Pas encore gardé : il disparaît si vous fermez."}</>}
        {choix.sorte === "mien" && choix.picto.origine !== "ia" && <>{ETIQUETTES[choix.picto.origine].long}, gardé dans Mes pictos.</>}
      </div>
      {choix.sorte !== "arasaac" && (
        <Field label={choix.sorte === "mien" ? "Son mot" : "Gardé sous le mot"}>
          <Input value={mot} onChange={(e) => setMot(e.target.value)} />
        </Field>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(choix.sorte === "dessin" || choix.sorte === "sclera") && (
          <button type="button" className="btn primary sm" disabled={occupe || !mot.trim()}
            onClick={() => onGarder({ ...choix, mot: mot.trim() })}>⭐ Garder dans Mes pictos</button>
        )}
        {choix.sorte === "mien" && mot.trim() && mot.trim() !== choix.picto.mot && (
          <button type="button" className="btn primary sm" onClick={() => onRenommer(choix.picto, mot)}>✔ Changer son mot</button>
        )}
        {src && <button type="button" className="btn sm" onClick={() => copierImage(src)}>📋 Copier l'image</button>}
        {choix.sorte === "dessin" && (
          <button type="button" className="btn sm" disabled={dessine} onClick={onRedessiner}>{dessine ? "✨ L'IA dessine…" : "🔄 Redessiner"}</button>
        )}
        {choix.sorte === "mien" && (
          <button type="button" className="btn ghost sm" onClick={() => onOublier(choix.picto)}>🗑 Retirer de Mes pictos</button>
        )}
      </div>
    </div>
  );
}
