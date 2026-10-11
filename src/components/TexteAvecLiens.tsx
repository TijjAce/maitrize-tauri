import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { morceauxAvecLiens } from "../liens";

/** Le site d'une adresse, pour l'écrire court : « archeologie.culture.gouv.fr ». */
const siteDe = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

/**
 * Un texte dont les adresses web s'ouvrent d'un clic, dans le navigateur : le
 * matériel d'une séance, ses documents à montrer. Chaque adresse s'écrit par
 * son site ; l'adresse entière est dans la bulle, et dans le texte qu'on modifie.
 */
export function TexteAvecLiens({ texte }: { texte: string }) {
  return (
    <>
      {morceauxAvecLiens(texte).map((m, i) => (m.lien
        ? <a key={i} href={m.texte} title={m.texte}
            onClick={(e) => { e.preventDefault(); openUrl(m.texte).catch(() => window.open(m.texte, "_blank")); }}>{siteDe(m.texte)} ↗</a>
        : <React.Fragment key={i}>{m.texte}</React.Fragment>))}
    </>
  );
}
