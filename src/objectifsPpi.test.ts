import { describe, it, expect } from "vitest";
import type { CommentaireEleve } from "./api";
import {
  basculerLien, ecrireLiens, joursEntre, lireLiens, resumeSuivi, sansNouvelles, suivreObjectif,
} from "./objectifsPpi";

const obs = (id: string, date: string, objectifs?: string): CommentaireEleve =>
  ({ id, date, texte: `observation ${id}`, type: "scolaire", eleveId: "e1", objectifs });

const lien = (id: string, reussite: string) => `[{"id":"${id}","reussite":"${reussite}"}]`;
const auj = new Date("2026-09-17T09:00:00");

describe("objectifs du PPI travaillés", () => {
  it("relit les liens, et ne perd rien sur un contenu abîmé", () => {
    expect(lireLiens(lien("o1", "reussi"))).toEqual([{ id: "o1", reussite: "reussi" }]);
    expect(lireLiens("")).toEqual([]);
    expect(lireLiens("pas du json")).toEqual([]);
    expect(lireLiens('{"id":"o1"}')).toEqual([]);
    // Une appréciation inconnue ne fait pas disparaître l'objectif.
    expect(lireLiens('[{"id":"o1","reussite":"bizarre"},{"texte":"sans id"}]'))
      .toEqual([{ id: "o1", reussite: "aide" }]);
    expect(ecrireLiens([])).toBe("");
  });

  it("coche, change d'appréciation, et décoche du même geste", () => {
    let l = basculerLien([], "o1", "reussi");
    expect(l).toEqual([{ id: "o1", reussite: "reussi" }]);
    l = basculerLien(l, "o1", "aide");
    expect(l).toEqual([{ id: "o1", reussite: "aide" }]);
    l = basculerLien(l, "o2", "pasencore");
    expect(l).toHaveLength(2);
    // Recliquer sur le même choix retire le lien.
    expect(basculerLien(l, "o1", "aide")).toEqual([{ id: "o2", reussite: "pasencore" }]);
  });

  it("rassemble ce qu'un objectif a récolté, du plus récent au plus ancien", () => {
    const commentaires = [
      obs("c1", "2026-09-15", lien("o1", "aide")),
      obs("c2", "2026-09-16", lien("o1", "reussi")),
      obs("c3", "2026-09-16", lien("o2", "pasencore")),
      obs("c4", "2026-09-10"),
    ];
    const s = suivreObjectif("o1", commentaires, auj);
    expect(s.total).toBe(2);
    expect(s.preuves.map((p) => p.commentaire.id)).toEqual(["c2", "c1"]);
    expect(s.compte).toEqual({ reussi: 1, aide: 1, pasencore: 0 });
    expect(s.jours).toBe(1);
    expect(resumeSuivi(s)).toBe("2 fois · la dernière hier");
    expect(sansNouvelles(s)).toBe(false);
  });

  it("signale un objectif laissé de côté, mais pas un objectif tout neuf", () => {
    const vieux = suivreObjectif("o1", [obs("c1", "2026-08-01", lien("o1", "aide"))], auj);
    expect(vieux.jours).toBe(47);
    expect(sansNouvelles(vieux)).toBe(true);
    expect(resumeSuivi(vieux)).toBe("1 fois · la dernière il y a 47 jours");

    const jamais = suivreObjectif("o9", [obs("c1", "2026-09-16", lien("o1", "aide"))], auj);
    expect(jamais.total).toBe(0);
    expect(jamais.jours).toBeNull();
    expect(sansNouvelles(jamais)).toBe(false);
    expect(resumeSuivi(jamais)).toBe("Aucune observation pour l'instant");
  });

  it("compte les jours sans se soucier des heures", () => {
    expect(joursEntre("2026-09-17T23:30:00Z", auj)).toBe(0);
    expect(joursEntre("2026-09-16", auj)).toBe(1);
    expect(joursEntre("n'importe quoi", auj)).toBeNull();
  });
});
