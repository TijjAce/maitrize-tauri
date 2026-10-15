import { describe, it, expect } from "vitest";
import { avecLaVoix, texteDeLEtape } from "./voixDesConsignes";

const page = `<!doctype html><html><head><title>Fiche</title></head><body><div class="page"><div class="regle cs"><ol class="cs-etapes">
  <li class="cs-etape cs-action"><span class="cs-num">1</span><span class="cs-texte"><b class="cs-verbe">Je colorie</b> les ronds.</span></li>
  <li class="cs-etape cs-action"><span class="cs-num">2</span><span class="cs-texte"><b class="cs-verbe">Je découpe</b>   les carrés &amp; les triangles.</span></li>
</ol></div><div class="grille"><div class="case">…</div></div></div></body></html>`;

/** Les haut-parleurs posés : où, quoi dire, avec quel audio. */
const voix = (html: string) => [...html.matchAll(/<button type="button" class="voix" aria-label="Écouter" data-lire="([^"]*)"(?: data-audio="([^"]*)")?><\/button><\/(\w+)>/g)]
  .map((m) => ({ lire: m[1], audio: m[2], dans: m[3] }));

describe("la voix des consignes", () => {
  it("lit le texte d'une étape, sans son numéro ni ses marques", () => {
    expect(texteDeLEtape('<span class="cs-num">1</span><span class="cs-texte"><b>Je colorie</b> les ronds.</span>')).toBe("Je colorie les ronds.");
    expect(texteDeLEtape('<span class="cs-num cs-marque">​</span><span class="cs-texte">Rappel : la marge.</span>')).toBe("Rappel : la marge.");
    // Sans texte balisé : tout, sauf le numéro.
    expect(texteDeLEtape('<span class="at-num">3</span><img src="x.png" alt=""> Je range <i>mes</i> cubes')).toBe("Je range mes cubes");
    expect(texteDeLEtape("Il a 2&nbsp;ans &#233;t&#xE9;")).toBe("Il a 2 ans été");
  });

  it("pose un haut-parleur au bout de chaque étape, avec son texte et son audio", async () => {
    const lus: string[] = [];
    const html = await avecLaVoix(page, async (t) => { lus.push(t); return "QUJD"; });
    expect(voix(html)).toEqual([
      { lire: "Je colorie les ronds.", audio: "data:audio/mpeg;base64,QUJD", dans: "li" },
      { lire: "Je découpe les carrés &amp; les triangles.", audio: "data:audio/mpeg;base64,QUJD", dans: "li" },
    ]);
    expect(lus).toEqual(["Je colorie les ronds.", "Je découpe les carrés & les triangles."]);
    // Le reste de la page ne bouge pas, et le haut-parleur a son allure.
    expect(html).toContain('<div class="grille"><div class="case">…</div></div>');
    expect(html.indexOf(".voix {")).toBeLessThan(html.indexOf("</head>"));
  });

  it("trouve les étapes d'une aide, même avec des blocs dedans, et laisse les cachées", async () => {
    const aide = '<html><head></head><body><div class="at-etape dr-etape"><img src="a.png" alt=""><span class="dr-mots"><span class="dr-matiere">Maths</span>'
      + '<span class="at-texte">Les pyramides</span></span><div class="at-case"></div></div><div class="at-etape at-cachee"><span class="at-texte">Cachée</span></div></body></html>';
    const html = await avecLaVoix(aide, async () => "eA==");
    expect(voix(html).map((v) => [v.lire, v.dans])).toEqual([["Les pyramides", "div"]]);
    expect(html).toContain('<div class="at-case"></div><button type="button" class="voix"');
  });

  it("sans clé ni réseau, garde le texte pour la voix de la tablette, et n'insiste pas", async () => {
    let appels = 0;
    const etapes = Array.from({ length: 5 }, (_, i) => `<li class="cs-etape"><span class="cs-texte">Étape ${i + 1}.</span></li>`).join("");
    const html = await avecLaVoix(`<html><head></head><body><ol>${etapes}</ol></body></html>`, async () => {
      appels++;
      throw new Error("Clé API Mistral absente.");
    });
    expect(voix(html).map((v) => [v.lire, v.audio])).toEqual([1, 2, 3, 4, 5].map((n) => [`Étape ${n}.`, undefined]));
    expect(appels).toBe(2);
  });

  it("laisse telle quelle une page sans étape, et ne pose pas deux fois le haut-parleur", async () => {
    const sans = "<html><head></head><body><p>Rien à lire.</p></body></html>";
    expect(await avecLaVoix(sans, async () => "x")).toBe(sans);
    const une = await avecLaVoix(page, async () => "x");
    expect(voix(await avecLaVoix(une, async () => "x"))).toHaveLength(2);
  });
});
