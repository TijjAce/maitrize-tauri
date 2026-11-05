// ── Ce que la page demande à l'appareil ──────────────────────────────────
//
// Sur l'iPad et l'iPhone, tout passe par Rust et par le greffon de la voix.
// Dans un navigateur — pour essayer l'écran pendant qu'on le construit —, le
// stockage est celui du navigateur et la voix celle de WebKit.

import { lireClasseur, type Classeur } from "./modele";
import type { FichiersObz } from "./obz";
import { chercherDans, indexArasaac } from "./recherche";

const enTauri = (): boolean => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

async function appeler<T>(commande: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(commande, args);
}

const memoire = {
  lire: (cle: string): string | null => { try { return localStorage.getItem(cle); } catch { return null; } },
  ecrire: (cle: string, v: string) => { try { localStorage.setItem(cle, v); } catch { /* navigateur sans stockage */ } },
  oublier: (cle: string) => { try { localStorage.removeItem(cle); } catch { /* idem */ } },
};
const CLE_ESSAI = "classeur:essai:";

// ── Les classeurs ──────────────────────────────────────────────────────────

export async function listerClasseurs(): Promise<Classeur[]> {
  const bruts = enTauri()
    ? await appeler<string[]>("classeurs_lister")
    : Object.keys(localStorage).filter((k) => k.startsWith(CLE_ESSAI)).map((k) => memoire.lire(k) ?? "");
  return bruts.map((b) => lireClasseur(b)).filter((c): c is Classeur => !!c)
    .sort((a, b) => b.modifieLe.localeCompare(a.modifieLe));
}

export async function garderClasseur(c: Classeur): Promise<void> {
  const contenu = JSON.stringify(c);
  if (enTauri()) await appeler("classeur_ecrire", { id: c.id, contenu });
  else memoire.ecrire(CLE_ESSAI + c.id, contenu);
}

export async function supprimerClasseur(id: string): Promise<void> {
  if (enTauri()) await appeler("classeur_supprimer", { id });
  else memoire.oublier(CLE_ESSAI + id);
}

// ── Les images ─────────────────────────────────────────────────────────────

const imagesDEssai = new Map<string, string>();

/** Les images demandées, en adresses `data:`. */
export async function lireImages(ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  if (enTauri()) return appeler<Record<string, string>>("images_lire", { ids });
  return Object.fromEntries(ids.flatMap((id) => {
    const v = imagesDEssai.get(id) ?? memoire.lire(`classeur:image:${id}`);
    return v ? [[id, v]] : [];
  }));
}

/** Garde une image (une photo, une image importée) sous son identifiant. */
export async function garderImage(id: string, donnees: string): Promise<void> {
  const dataUrl = donnees.startsWith("data:") ? donnees : `data:image/png;base64,${donnees}`;
  if (enTauri()) await appeler("image_ecrire", { id, donnees });
  else { imagesDEssai.set(id, dataUrl); memoire.ecrire(`classeur:image:${id}`, dataUrl); }
}

// ── ARASAAC ────────────────────────────────────────────────────────────────

export interface PictoTrouve { id: number; mot: string; nature?: number }

export const vignetteArasaac = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

/** Les pictos d'un mot : dans l'index embarqué d'abord ; s'il ne trouve rien, au service d'ARASAAC, en ligne. */
export async function chercherPictos(mot: string): Promise<PictoTrouve[]> {
  const locaux = chercherDans(await indexArasaac(), mot);
  if (locaux.length) return locaux;
  if (enTauri()) return appeler<PictoTrouve[]>("arasaac_chercher", { mot });
  const r = await fetch(`https://api.arasaac.org/v1/pictograms/fr/search/${encodeURIComponent(mot.trim())}`);
  if (r.status === 404) return [];
  if (!r.ok) throw new Error(`ARASAAC ne répond pas (${r.status}).`);
  const liste = (await r.json()) as { _id: number; keywords?: { keyword?: string }[] }[];
  return liste.slice(0, 40).map((p) => ({ id: p._id, mot: p.keywords?.[0]?.keyword ?? mot }));
}

/** Prend un picto : gardé sur l'appareil, il sert ensuite sans internet. Rend son identifiant et son image. */
export async function prendrePicto(id: number): Promise<{ image: string; donnees: string }> {
  const image = `arasaac-${id}`;
  if (enTauri()) return { image, donnees: await appeler<string>("arasaac_prendre", { id }) };
  const r = await fetch(vignetteArasaac(id));
  const blob = await r.blob();
  const donnees = await new Promise<string>((ok, ko) => {
    const lecteur = new FileReader();
    lecteur.onload = () => ok(String(lecteur.result));
    lecteur.onerror = () => ko(lecteur.error);
    lecteur.readAsDataURL(blob);
  });
  await garderImage(image, donnees);
  return { image, donnees };
}

// ── Le format ouvert ───────────────────────────────────────────────────────

export async function ouvrirObz(base64: string): Promise<FichiersObz> {
  if (!enTauri()) throw new Error("L'import d'un classeur .obz se fait sur l'iPad ou l'iPhone.");
  return appeler<FichiersObz>("obz_ouvrir", { donnees: base64 });
}

/** Pose le classeur exporté dans les Documents de l'application (app Fichiers). Rend le nom du fichier. */
export async function enregistrerObz(nom: string, fichiers: FichiersObz): Promise<string> {
  if (!enTauri()) throw new Error("L'export d'un classeur .obz se fait sur l'iPad ou l'iPhone.");
  return appeler<string>("obz_enregistrer", { nom, fichiers });
}

// ── La voix ────────────────────────────────────────────────────────────────

export interface VoixDisponible { id: string; nom: string; langue: string; qualite: number }

export async function dire(texte: string, voix?: { id?: string; debit?: number }): Promise<void> {
  const t = texte.trim();
  if (!t) return;
  if (enTauri()) {
    try {
      await appeler("plugin:parole|dire", { texte: t, voix: voix?.id ?? null, debit: voix?.debit ?? null });
      return;
    } catch { /* sur un ordinateur, la page parle elle-même */ }
  }
  if (typeof speechSynthesis === "undefined") return;
  speechSynthesis.cancel();
  const enonce = new SpeechSynthesisUtterance(t);
  enonce.lang = "fr-FR";
  enonce.rate = voix?.debit ?? 1;
  speechSynthesis.speak(enonce);
}

export async function voixDisponibles(): Promise<VoixDisponible[]> {
  if (enTauri()) {
    try { return (await appeler<{ voix: VoixDisponible[] }>("plugin:parole|voix")).voix; } catch { /* voir plus bas */ }
  }
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.startsWith("fr")).map((v) => ({ id: v.voiceURI, nom: v.name, langue: v.lang, qualite: 1 }));
}
