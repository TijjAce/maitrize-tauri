// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import React from "react";
import { Field, Input, Select } from "./ui";
import {
  abonnerPoliceCursive, choisirPoliceCursive, choixActuel, policesAuChoix, type IdPoliceCursive,
} from "../policesEcriture";

/** Le choix de la police cursive, partagé par toutes les feuilles (voir policesEcriture.ts). */
export const usePoliceCursive = () => React.useSyncExternalStore(abonnerPoliceCursive, choixActuel);

/**
 * La police cursive des feuilles : Marelle, la police du ministère, et ses
 * variantes ; les polices d'école trouvées sur l'ordinateur ; ou une autre,
 * par son nom. Le choix vaut pour toutes les feuilles qui écrivent en cursive.
 */
export function ChoixPoliceCursive({ label = "La police cursive" }: { label?: string }) {
  const choix = usePoliceCursive();
  const polices = React.useMemo(() => policesAuChoix(choix.id), [choix.id]);
  const embarquees = polices.filter((p) => p.fichier);
  const installees = polices.filter((p) => !p.fichier);
  return (
    <Field label={label}>
      <Select value={choix.id} onChange={(e) => choisirPoliceCursive({ id: e.target.value as IdPoliceCursive })}>
        <optgroup label="La police du ministère">
          {embarquees.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </optgroup>
        <optgroup label="Sur cet ordinateur">
          {installees.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}
        </optgroup>
      </Select>
      {choix.id === "autre" && (
        <Input value={choix.autre} maxLength={60} placeholder="Le nom exact de la police installée" style={{ marginTop: 6 }}
          onChange={(e) => choisirPoliceCursive({ autre: e.target.value })} />
      )}
    </Field>
  );
}
