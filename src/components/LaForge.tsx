// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Aide } from "./Aide";
import { PliDuCatalogue, SousPliDuCatalogue, type Unite } from "./PliDuCatalogue";
import { Empty, Input, Select } from "./ui";
import {
  ADRESSE_DE_LA_RESSOURCERIE, DATE_DE_LA_SELECTION, RUBRIQUES, chercherDansLaForge, type RessourceDeLaForge, type SorteDeRessource,
} from "../ressourcesDeLaForge";

// La Forge dans Maitrize : des cartes qui ouvrent un site dans le navigateur, et rien d'autre. Aucune page n'est chargée ni lue ici.

const SITES: Unite = ["site", "sites"];
/** Ce que Fabriquer en montre : les sites qui créent de vraies feuilles, et ceux qui fonctionnent au tableau. */
export const SORTES_DE_FABRIQUER: readonly SorteDeRessource[] = ["feuilles", "tableau"];
/** Les plis de la Forge dans le catalogue, pour « Tout replier ». */
export const PLIS_DE_LA_FORGE = ["forge", ...SORTES_DE_FABRIQUER.map((s) => `forge:${s}`)];

const ouvrirLeSite = (url: string) => { openUrl(url).catch(() => window.open(url, "_blank")); };

export function CarteDeLaForge({ r }: { r: RessourceDeLaForge }) {
  return (
    <div role="link" tabIndex={0} className="atelier atelier-forge" title={r.url} onClick={() => ouvrirLeSite(r.url)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ouvrirLeSite(r.url); } }}>
      <span className="atelier-icone" aria-hidden="true">{RUBRIQUES.find((x) => x.sorte === r.sorte)?.icone}</span>
      <span className="atelier-nom">{r.nom}<span className="atelier-sortant" aria-label="ouvre le site dans le navigateur"> ↗</span></span>
      <span className="atelier-quoi">{r.quoi}</span>
      <span className="atelier-besoin">{r.niveaux.join(" · ")}</span>
    </div>
  );
}

/** Le bloc de Fabriquer, après les familles de l'enseignant : à part, puisque ce ne sont pas ses générateurs. */
export function CatalogueDeLaForge({ plis, plier }: { plis: string[]; plier: (cle: string, plie: boolean) => void }) {
  return (
    <section id="famille-forge" className="famille-catalogue">
      <PliDuCatalogue ouvert={!plis.includes("forge")} onBasculer={(o) => plier("forge", !o)} icone="🌐" titre="Sur la Forge"
        aide="Des sites libres d'enseignants, hors de Maitrize : un clic les ouvre dans votre navigateur."
        nombre={chercherDansLaForge("", SORTES_DE_FABRIQUER).length} unite={SITES}>
        {SORTES_DE_FABRIQUER.map((sorte) => {
          const rubrique = RUBRIQUES.find((x) => x.sorte === sorte);
          const sites = chercherDansLaForge("", [sorte]);
          return (
            <SousPliDuCatalogue key={sorte} ouvert={!plis.includes(`forge:${sorte}`)} onBasculer={(o) => plier(`forge:${sorte}`, !o)}
              titre={`${rubrique?.icone} ${rubrique?.titre}`} nombre={sites.length} unite={SITES}>
              <div className="ateliers">{sites.map((r) => <CarteDeLaForge key={r.id} r={r} />)}</div>
            </SousPliDuCatalogue>
          );
        })}
      </PliDuCatalogue>
    </section>
  );
}

/** L'onglet de Ressources : toute la sélection, par rubrique. */
export function LaForge() {
  const [q, setQ] = React.useState("");
  const [rubrique, setRubrique] = React.useState<SorteDeRessource | "">("");
  const [niveau, setNiveau] = React.useState("");
  const trouves = chercherDansLaForge(q, rubrique ? [rubrique] : undefined).filter((r) => !niveau || r.niveaux.includes(niveau));
  return (
    <>
      <div className="toolbar">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un site…" style={{ maxWidth: 260 }} />
        <Select value={rubrique} aria-label="La rubrique" onChange={(e) => setRubrique(e.target.value as SorteDeRessource | "")} style={{ maxWidth: 240 }}>
          <option value="">Toutes les rubriques</option>
          {RUBRIQUES.map((x) => <option key={x.sorte} value={x.sorte}>{x.icone} {x.titre}</option>)}
        </Select>
        <Select value={niveau} aria-label="Le niveau" onChange={(e) => setNiveau(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="">Tous les niveaux</option>
          <option>Maternelle</option>
          <option>Élémentaire</option>
        </Select>
        <Aide titre="La Forge des communs numériques éducatifs">
          <p>Une sélection de sites libres faits par des enseignants. Maitrize n'en garde ni n'en exécute rien : un clic ouvre le site dans votre navigateur, et chaque site reste à ses auteurs, sous sa licence.</p>
          <p>D'après <a href={ADRESSE_DE_LA_RESSOURCERIE} onClick={(e) => { e.preventDefault(); ouvrirLeSite(ADRESSE_DE_LA_RESSOURCERIE); }}>la Ressourcerie</a> (Licence Ouverte 2.0), lue le {DATE_DE_LA_SELECTION}.</p>
        </Aide>
        <div className="spacer" />
        <span style={{ fontSize: 12, color: "var(--text-2)" }}>{trouves.length} site{trouves.length > 1 ? "s" : ""}</span>
      </div>
      {trouves.length === 0 && <Empty icone="🔍" titre="Aucun site ne correspond" sous="Essayez un autre mot ou une autre rubrique." />}
      {RUBRIQUES.map((x) => {
        const sites = trouves.filter((r) => r.sorte === x.sorte);
        return sites.length > 0 && (
          <div key={x.sorte} style={{ marginBottom: 18 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 14, color: "var(--text-2)" }}>{x.icone} {x.titre}</h3>
            <div className="ateliers">{sites.map((r) => <CarteDeLaForge key={r.id} r={r} />)}</div>
          </div>
        );
      })}
    </>
  );
}
