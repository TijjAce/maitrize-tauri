// Reconnaissance des liens vidéo collés ou déposés.
//
// YouTube expose une demi-douzaine de formes d'adresse, et une variante non
// reconnue ne provoque aucune erreur : la vignette reste vide et le lien ne
// s'ouvre pas. C'est le genre de défaut qu'on ne voit qu'en classe, au moment
// de lancer la vidéo. D'où un module isolé et couvert par des tests.

export interface Video {
  /** L'adresse telle que collée, qui reste la source de vérité. */
  url: string;
  /** Identifiant YouTube, s'il s'agit d'une vidéo YouTube. */
  youtubeId?: string;
  /** Titre saisi par l'enseignant, facultatif. */
  titre?: string;
}

/**
 * Extrait l'identifiant d'une adresse YouTube.
 *
 * Couvre les formes rencontrées en pratique : `watch?v=`, `youtu.be/`,
 * `embed/`, `shorts/`, `live/`, avec ou sans paramètres. L'identifiant fait
 * onze caractères — l'exiger évite de prendre un fragment d'adresse pour une
 * vidéo.
 */
export function youtubeId(url: string): string | undefined {
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^#]*&)?v=|embed\/|shorts\/|live\/|v\/))([\w-]{11})(?![\w-])/,
  );
  return m?.[1];
}

/** Adresse de la vignette d'une vidéo YouTube. */
export function vignetteYoutube(id: string): string {
  // `hqdefault` existe pour toutes les vidéos ; `maxresdefault` manque souvent
  // et laisserait un cadre vide.
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

/** Adresse d'intégration, pour lire la vidéo dans l'application. */
export const integrationYoutube = (id: string) => `https://www.youtube.com/embed/${id}`;

/**
 * Transforme un texte déposé ou collé en vidéo.
 *
 * Renvoie `null` si ce n'est pas une adresse : mieux vaut ne rien ajouter
 * qu'une ligne vide qu'il faudra retrouver et supprimer.
 */
export function lireLien(texte: string, titre?: string): Video | null {
  const url = texte.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  const id = youtubeId(url);
  return { url, youtubeId: id, titre: titre?.trim() || undefined };
}

/** Relit la liste stockée en base, en écartant ce qui n'est pas exploitable. */
export function lireVideos(json: string): Video[] {
  try {
    const brut = JSON.parse(json);
    if (!Array.isArray(brut)) return [];
    return brut.flatMap((v: any): Video[] => {
      // Tolère l'ancien format, où une vidéo n'était qu'une chaîne.
      if (typeof v === "string") {
        const lu = lireLien(v);
        return lu ? [lu] : [];
      }
      const url = String(v?.url ?? "").trim();
      if (!url) return [];
      return [{ url, youtubeId: youtubeId(url), titre: v?.titre || undefined }];
    });
  } catch {
    return [];
  }
}

/** Nom affichable d'une vidéo, à défaut de titre saisi. */
export function nomVideo(v: Video): string {
  if (v.titre) return v.titre;
  try {
    const u = new URL(v.url);
    return v.youtubeId ? `YouTube · ${v.youtubeId}` : u.hostname.replace(/^www\./, "");
  } catch {
    return v.url;
  }
}
