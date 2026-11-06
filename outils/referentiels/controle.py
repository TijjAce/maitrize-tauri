# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

import json, sys, re
res = json.load(open(sys.argv[1]))
n = 0
for r in res:
    for p, t in r["items"]:
        n += 1
        pb = []
        if re.search(r"\bL’élève\b|^Il |\. Il |Exemple", t): pb.append("fuite colonne exemples ?")
        if len(t) > 320: pb.append(f"long ({len(t)})")
        if not t.rstrip().endswith((".", ")", "»", "!", "?")): pb.append("fin sans point")
        if re.search(r"[a-zé],?[A-Z][a-z]", t): pb.append("mots collés ?")
        if pb:
            print(f"- [{r['chemin'][-1]} · {r['niveau']}] {', '.join(pb)}\n    {t[:260]}")
print("items:", n)
