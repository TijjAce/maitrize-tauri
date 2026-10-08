// node --test .github/scripts/totp-verification.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { base32, code, diagnostic, lireSecret, secondesRestantes } from "./totp.mjs";

// RFC 6238, annexe B : les codes à huit chiffres des trois algorithmes.
const SECRETS = {
  sha1: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
  sha256: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZA====",
  sha512: "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQGEZDGNA=",
};
const VECTEURS = [
  [59, "94287082", "46119246", "90693936"],
  [1111111109, "07081804", "68084774", "25091201"],
  [1111111111, "14050471", "67062674", "99943326"],
  [1234567890, "89005924", "91819424", "93441116"],
  [2000000000, "69279037", "90698825", "38618901"],
  [20000000000, "65353130", "77737706", "47863826"],
];

test("les vecteurs de la RFC 6238, en SHA-1, SHA-256 et SHA-512", () => {
  for (const [t, ...attendus] of VECTEURS) {
    ["sha1", "sha256", "sha512"].forEach((algo, i) => {
      assert.equal(code({ cle: base32(SECRETS[algo]), algorithme: algo, chiffres: 8, periode: 30 }, t), attendus[i], `${algo} à ${t}`);
    });
  }
});

test("l'adresse du code QR : son algorithme, ses chiffres, sa période", () => {
  const s = lireSecret(`otpauth://totp/Certum:jean%40exemple.fr?secret=${SECRETS.sha256}&issuer=Certum&algorithm=SHA256&digits=6&period=30`);
  assert.equal(s.algorithme, "sha256");
  assert.equal(s.explicite, true);
  assert.equal(code(s, 59), "119246");
  const sans = lireSecret(`otpauth://totp/x?secret=${SECRETS.sha1}`);
  assert.equal(sans.algorithme, "sha1");
  assert.equal(sans.explicite, false);
  assert.equal(code(sans, 59), "287082");
});

test("le secret seul : SHA-256 d'abord, en minuscules et avec des espaces", () => {
  const s = lireSecret(" gezd gnbv gy3t qojq gezd gnbv gy3t qojq gezd gnbv gy3t qojq geza ");
  assert.equal(s.algorithme, "sha256");
  assert.equal(code(s, 59), "119246");
  assert.throws(() => lireSecret("pas du base 32 !"));
  assert.throws(() => lireSecret(""));
});

test("le temps qui reste au code", () => {
  assert.equal(secondesRestantes(30, 60), 30);
  assert.equal(secondesRestantes(30, 89.5), 1);
});

test("ce qui ne va pas dans le secret, dit sans le montrer", () => {
  assert.equal(diagnostic(`otpauth://totp/x?secret=${SECRETS.sha1}`), null);
  assert.equal(diagnostic(SECRETS.sha256), null);
  assert.match(diagnostic(""), /vide/);
  assert.match(diagnostic("jean.dupont@exemple.fr"), /adresse e-mail/);
  assert.match(diagnostic("482913"), /code à chiffres/);
  assert.match(diagnostic("234567"), /code à chiffres/);
  assert.match(diagnostic("otpauth://totp/x?issuer=Certum"), /pas de secret lisible/);
  assert.match(diagnostic("https://certum.eu/activation?jeton=abc"), /« https:\/\/ »/);
  assert.match(diagnostic("bonjour !"), /ni un lien/);
  for (const v of ["jean.dupont@exemple.fr", "482913", "https://certum.eu/activation?jeton=abc"]) {
    assert.ok(!diagnostic(v).includes(v), "le message ne contient jamais la valeur");
  }
});

