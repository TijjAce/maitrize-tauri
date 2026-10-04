import { describe, it, expect } from "vitest";
import { elider } from "./elisions";

describe("les élisions, sans IA", () => {
  it("élide devant une voyelle, astérisques compris, en gardant la majuscule", () => {
    expect(elider("Je *ai* une citrouille pour la fête.")).toBe("J'*ai* une citrouille pour la fête.");
    expect(elider("Il ne *a* pas peur de la araignée.")).toBe("Il n'*a* pas peur de l'araignée.");
    expect(elider("Le arbre de une sorcière.")).toBe("L'arbre d'une sorcière.");
    expect(elider("Je me amuse. Que il vienne !")).toBe("Je m'amuse. Qu'il vienne !");
    expect(elider("Ce *est* la fête, si il fait beau.")).toBe("C'*est* la fête, s'il fait beau.");
  });

  it("élide devant un h muet, pas devant un h aspiré", () => {
    expect(elider("Le squelette *est* dans le costume de Halloween.")).toBe("Le squelette *est* dans le costume d'Halloween.");
    expect(elider("Le hibou *est* sur la branche.")).toBe("Le hibou *est* sur la branche.");
    expect(elider("La heure de la fête.")).toBe("L'heure de la fête.");
  });

  it("laisse ce qui est déjà juste, et les exceptions", () => {
    for (const juste of ["J'*ai* une lanterne.", "La *suis* une sorcière.", "Le un et le onze.", "Elle *a* un balai.", "Je *suis* déguisé.", "Ce soir, nous *avons* peur."]) {
      expect(elider(juste), juste).toBe(juste);
    }
  });
});
