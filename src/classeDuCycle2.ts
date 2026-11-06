// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import type { Classe, ClasseC2 } from "./feuillesDesSequences";

/** Une classe du cycle 3, ramenée au CE2 pour les ateliers et les séquences du cycle 2 qui ne connaissent pas le cours moyen. */
export const classeDuCycle2 = (c: Classe): ClasseC2 => (c === "CM1" || c === "CM2" ? "CE2" : c);
