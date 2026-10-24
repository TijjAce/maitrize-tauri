import { describe, expect, it } from "vitest";
import { choisir, inscrireAnnulable, noterFrappe, type SourceAnnulable } from "./annulation";

const source = (quand: number, visible = true, refaitLe = 0): SourceAnnulable =>
  ({ aDefaire: () => quand, defaire: () => {}, aRefaire: () => refaitLe, refaire: () => {}, visible: () => visible });
const champ = () => ({ isConnected: true }) as unknown as HTMLElement;
const avec = (sources: SourceAnnulable[], faire: () => void) => {
  const retirer = sources.map(inscrireAnnulable);
  try { faire(); } finally { retirer.forEach((r) => r()); }
};

describe("⌘Z partout : le geste le plus récent de ce qu'on voit", () => {
  it("défait la source la plus récente, et jamais celle d'une page cachée", () => {
    const ancienne = source(100), recente = source(300), cachee = source(900, false);
    avec([ancienne, recente, cachee], () => {
      expect(choisir(false, { dansUnChamp: null, propre: false, natif: false })).toEqual({ source: recente });
    });
    // Une page cachée seule ne défait rien : WebKit garde la main.
    avec([cachee], () => {
      expect(choisir(false, { dansUnChamp: null, propre: false, natif: true })).toBe("frappe");
      expect(choisir(false, { dansUnChamp: null, propre: false, natif: false })).toBeNull();
    });
  });

  it("dans un champ, défait la frappe ou le geste d'après elle, selon ce qui est venu en dernier", () => {
    const ici = champ();
    noterFrappe(ici, 200);
    // Une suppression après la frappe : ⌘Z défait la suppression, pas la frappe.
    const suppression = source(250);
    avec([suppression], () => {
      expect(choisir(false, { dansUnChamp: ici, propre: false, natif: true })).toEqual({ source: suppression });
    });
    // Une suppression avant la frappe : la frappe d'abord.
    avec([source(150)], () => {
      expect(choisir(false, { dansUnChamp: ici, propre: false, natif: true })).toBe("frappe");
      // WebKit n'a plus rien à défaire : la suppression.
      expect(choisir(false, { dansUnChamp: ici, propre: false, natif: false })).not.toBe("frappe");
    });
    // Un autre champ, où l'on n'a rien tapé : la suppression, même plus ancienne que la frappe d'ailleurs.
    const ailleurs = champ();
    const vieille = source(150);
    avec([vieille], () => {
      expect(choisir(false, { dansUnChamp: ailleurs, propre: false, natif: true })).toEqual({ source: vieille });
    });
  });

  it("hors des champs, compte la dernière frappe tant que son champ est là", () => {
    const parti = { isConnected: false } as unknown as HTMLElement;
    noterFrappe(champ(), 500);
    avec([source(400)], () => expect(choisir(false, { dansUnChamp: null, propre: false, natif: true })).toBe("frappe"));
    noterFrappe(parti, 600);
    const s = source(400);
    avec([s], () => expect(choisir(false, { dansUnChamp: null, propre: false, natif: true })).toEqual({ source: s }));
  });

  it("dans un éditeur qui défait lui-même, ne laisse jamais WebKit défaire", () => {
    noterFrappe(champ(), 10_000);
    const editeur = source(50);
    avec([editeur], () => expect(choisir(false, { dansUnChamp: null, propre: true, natif: true })).toEqual({ source: editeur }));
    avec([], () => expect(choisir(false, { dansUnChamp: null, propre: true, natif: true })).toBeNull());
  });

  it("refait le geste défait le plus récemment", () => {
    const a = source(0, true, 120), b = source(0, true, 80), c = source(0, true, 0);
    avec([a, b, c], () => expect(choisir(true, { dansUnChamp: null, propre: false, natif: false })).toEqual({ source: a }));
  });
});
