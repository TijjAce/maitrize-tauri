// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";

/**
 * L'atelier dans lequel on est, pour ce qui, plus bas, doit le savoir :
 * l'aperçu publie la consigne d'origine de sa feuille sous ce nom, et
 * l'éditeur de consigne du bandeau la retrouve.
 */
export const AtelierContext = React.createContext<string>("");
