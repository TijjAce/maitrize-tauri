import { describe, expect, it } from "vitest";
import { NOMBRES_DE_10_A_20, planDixAVingt } from "./demarcheDixAVingt";
import { demarchesPour, demarcheDe } from "./demarches";
import { planDesFeuilles } from "./feuillesDesSequences";
import { htmlDixAVingt, type FeuilleDixAVingt } from "./nombresDixAVingt";
import { repereDeLaDemarche } from "./sequencesToutesFaites";

const TOUTES: FeuilleDixAVingt[] = ["jusqua-9", "paquet-de-dix", "dix-a-seize", "billes-dispersees", "billes-et-calots", "abaque", "frise-20", "comparer-20", "evaluation"];
const eleve = (html: string) => html.split('class="page corrige"')[0];
const corrige = (html: string) => html.split('class="page corrige"')[1];
/** Les billes d'un dessin : le rond de leur couleur, d'un rayon donné. */
const billes = (html: string, rayon: number) => [...html.matchAll(new RegExp(`<circle cx="([\\d.]+)" cy="([\\d.]+)" r="${rayon}" fill="#(?:4a86e8|e05252|38a169)"`, "g"))]
  .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));

describe("la connaissance des nombres de 10 à 20, d'après le manuel du CRPE de l'enseignant", () => {
  it("dit d'où elle vient, ce qui est ajouté, et sert la valeur des chiffres au CP, en période 2", () => {
    const d = demarcheDe("nombres-10-20-cp")!;
    expect(d).toBe(NOMBRES_DE_10_A_20);
    expect(d.nom).toBe("La connaissance des nombres de 10 à 20 (CP)");
    expect(d.source).toMatch(/Réussir mon CRPE.*Nathan.*p\. 40-43/);
    expect(d.source).toMatch(/séances 5 et 6 ajoutées par Maitrize/);
    expect(d.seances).toHaveLength(6);
    // La séance 4 du manuel : six phases, leur forme de travail, leur durée.
    const s4 = d.seances[3];
    expect(s4.phases.map((p) => p.phase)).toEqual(["Phase 1 – Collectif", "Phase 2 – Individuel", "Phase 3 – Collectif", "Phase 4 – Binômes", "Phase 5 – Binômes", "Phase 6 – Individuel"]);
    expect(s4.phases.map((p) => parseInt(p.duree, 10))).toEqual([5, 10, 2, 10, 5, 10]);
    expect(s4.objectifs).toMatch(/selon sa place/);
    // On la propose à côté de la séquence du livret, pour la valeur des chiffres au CP — pas au CE1.
    const cible = (niveau: string) => ({ domaineTitre: "Mathématiques", sousDomaineTitre: "Nombres, calcul et résolution de problèmes",
      competenceTitre: "Connaitre la valeur des chiffres en fonction de leur position (unités, dizaines).", niveau });
    expect(demarchesPour(cible("CP"), "", 2).map((x) => x.id)).toEqual(["nombres-livret-cp-59", "nombres-10-20-cp"]);
    expect(demarchesPour(cible("CE1"), "", 2).map((x) => x.id)).not.toContain("nombres-10-20-cp");
    // La période : celle que le manuel donne, citée.
    const repere = repereDeLaDemarche("nombres-10-20-cp", "CP")!;
    expect(repere.periode).toBe(2);
    expect(repere.raison).toMatch(/^Manuel « Réussir mon CRPE .+ : « avec des élèves de CP en période 2 »$/);
  });

  it("a ses feuilles à chaque séance, la feuille de cubes de la dizaine comprise, et leur matériel", () => {
    const plan = planDesFeuilles("nombres-10-20-cp", { classe: "CP", periode: 2 })!;
    expect(plan.materiel).toHaveLength(6);
    for (let s = 0; s < 6; s++) expect(plan.feuilles.some((f) => f.seance === s), `séance ${s + 1}`).toBe(true);
    const cubes = plan.feuilles.find((f) => f.atelier === "cubes" && f.titre === "Lire les cubes, écrire le nombre")!;
    expect(cubes.seance).toBe(1);
    // Les cubes jusqu'à 19 : « dix et quelques », pas les nombres jusqu'à 59 de la période 2.
    expect(cubes.fabriquer(1).refaire).toMatchObject({ cubes: { niveau: "cp-19" } });
    expect(plan.materiel[1]).toMatch(/les feuilles « Un paquet de dix » et « Lire les cubes, écrire le nombre »\.$/);
    expect(plan.materiel[3]).toMatch(/« Combien de billes \? », « Qui a gagné \? », « L'abaque à deux tiges » et « La frise jusqu'à 20 »\.$/);
    expect(planDixAVingt().feuilles).toHaveLength(9);
  });

  it("fabriquent des feuilles complètes, avec un corrigé et des consignes à la première personne", () => {
    for (const quoi of TOUTES) for (const graine of [1, 2, 3, 4]) {
      const html = htmlDixAVingt(quoi, graine);
      expect(html, quoi).not.toMatch(/NaN|undefined|Infinity|\[object/);
      expect(html, quoi).toContain('class="page corrige"');
      for (const m of html.matchAll(/<div class="regle">([^<]*)/g)) expect(m[1], quoi).toMatch(/^(Je |J'|Un )/);
      for (const m of html.matchAll(/<div class="dv-consigne"><b>\d\.<\/b> ([^<]*)/g)) expect(m[1], quoi).toMatch(/^(Je |J'|Un )/);
      // Le même tirage pour la même graine.
      expect(htmlDixAVingt(quoi, graine)).toBe(html);
    }
  });

  it("dessinent les billes des cartes du manuel, sans qu'aucune en cache une autre", () => {
    for (const graine of [1, 2, 3, 4, 5, 6]) {
      const cartes = eleve(htmlDixAVingt("billes-dispersees", graine)).split('class="dv-carte"').slice(1);
      expect(cartes.map((c) => billes(c, 3).length)).toEqual([19, 18, 17]);
      for (const c of cartes) {
        const pts = billes(c, 3);
        for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) expect(Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y)).toBeGreaterThanOrEqual(6);
        // Dans son cadre de 160 mm sur 44.
        for (const p of pts) expect(p.x >= 3 && p.x <= 157 && p.y >= 3 && p.y <= 41).toBe(true);
      }
    }
  });

  it("corrigent juste : les billes comptées, le paquet de dix, les parties, les abaques, la frise", () => {
    for (const graine of [1, 2, 3, 4, 5, 6]) {
      // Le paquet de dix : le nombre écrit est celui des billes dessinées ; le corrigé en numérote dix.
      const paquet = corrige(htmlDixAVingt("paquet-de-dix", graine));
      for (const bloc of paquet.split('class="dv-bloc"').slice(1)) {
        const n = billes(bloc, 3).length;
        expect(bloc).toContain(`<b class="dv-rep">${n - 10}</b> billes seules : <b class="dv-rep">${n}</b> billes en tout`);
        expect((bloc.match(/fill="#fff">(\d+)<\/text>/g) ?? []).length).toBe(10);
      }
      // Qui a gagné : la valeur de chaque joueur, et le gagnant entouré.
      for (const partie of corrige(htmlDixAVingt("billes-et-calots", graine)).split('class="dv-partie"').slice(1)) {
        const joueurs = partie.split('class="dv-joueur"').slice(1, 3).map((j) => j.split('class="dv-ligne"')[0]);
        const valeurs = joueurs.map((j) => 10 * (j.match(/fill="#f2c94c"/g) ?? []).length + billes(j, 2.6).length);
        expect(valeurs[0]).not.toBe(valeurs[1]);
        expect(partie).toContain(`A : <b class="dv-rep">${valeurs[0]}</b> billes.`);
        expect(partie).toContain(`B : <b class="dv-rep">${valeurs[1]}</b> billes.`);
        expect(partie).toContain(`<span class="dv-lettre dv-gagne">${valeurs[0] > valeurs[1] ? "A" : "B"}</span>`);
      }
      // L'abaque : dix pour un jeton rouge, un pour un vert.
      const abaques = corrige(htmlDixAVingt("abaque", graine)).split('class="dv-abaques"')[1];
      for (const a of abaques.split("<div><svg").slice(1)) {
        const valeur = 10 * (a.match(/fill="#e05252"/g) ?? []).length + (a.match(/<ellipse[^>]*fill="#38a169"/g) ?? []).length;
        expect(a).toMatch(new RegExp(`<b class="dv-rep">${valeur}</b>`));
      }
      // La frise : de 1 à 20, dans l'ordre.
      for (const f of corrige(htmlDixAVingt("frise-20", graine)).match(/<table class="dv-frise">.*?<\/table>/g) ?? []) {
        expect(f.replace(/<[^>]+>/g, " ").trim().split(/\s+/).map(Number)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
      }
    }
    // La première frise est celle du manuel : 7, 8, 9 et 17, 18, 19 à retrouver.
    const premiere = eleve(htmlDixAVingt("frise-20", 1)).match(/<table class="dv-frise">.*?<\/table>/)![0];
    expect(premiere.replace(/<td class="dv-trou"><\/td>/g, " _ ").replace(/<[^>]+>/g, " ").trim().split(/\s+/).join(" "))
      .toBe("1 2 3 4 5 6 _ _ _ _ 11 12 13 14 15 16 _ _ _ 20");
  });
});
