// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

// Rendu Markdown minimal et sûr dans la conversation : le même que celui des
// documents imprimés (voir `documentIa`), aux titres près — ce qu'on lit dans
// la bulle est ce qui sortira sur le papier.
import { markdownVersHtml } from "../documentIa";

export function Markdown({ texte }: { texte: string }) {
  return <div className="md" dangerouslySetInnerHTML={{ __html: markdownVersHtml(texte, { titres: "chat" }) }} />;
}
