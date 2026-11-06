// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import { describe, it, expect } from "vitest";
import { avecUnPointDePlus } from "./notesRapides";

describe("un point de plus aux notes rapides", () => {
  it("s'ajoute à la ligne, sous ce qui est écrit, avec un tiret", () => {
    expect(avecUnPointDePlus("", "acheter des feutres")).toBe("- acheter des feutres");
    expect(avecUnPointDePlus("- appeler le SESSAD", " rendre les cahiers \n")).toBe("- appeler le SESSAD\n- rendre les cahiers");
    expect(avecUnPointDePlus("Idées\n  - un atelier\n\n\n", "photos")).toBe("Idées\n  - un atelier\n- photos");
  });

  it("garde une note de plusieurs lignes en un seul point", () => {
    expect(avecUnPointDePlus("", "Sortie au musée\r\n\n  prévoir 3 accompagnateurs")).toBe("- Sortie au musée\n  prévoir 3 accompagnateurs");
  });

  it("ne change rien quand il n'y a rien à dire", () => {
    expect(avecUnPointDePlus("- a", "  \n ")).toBe("- a");
  });
});
