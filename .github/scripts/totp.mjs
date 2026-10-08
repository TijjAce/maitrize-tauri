// Le code à six chiffres de SimplySign, calculé comme l'application du téléphone.
//
// Le code QR d'activation de SimplySign porte une adresse otpauth:// ordinaire
// (RFC 6238) : un secret en base 32, l'algorithme, le nombre de chiffres, la
// durée d'un code. On accepte l'adresse entière — c'est ce qu'il faut ranger
// dans les secrets de GitHub — ou le secret seul. Sans algorithme écrit,
// l'adresse vaut SHA-1, comme le veut le format ; un secret seul est essayé
// en SHA-256, celui de Certum, puis en SHA-1 (voir `simplysign-connexion.mjs`).

import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** Les octets d'un texte en base 32 ; les espaces, les tirets et le remplissage final ne comptent pas. */
export function base32(texte) {
  const propre = String(texte ?? "").toUpperCase().replace(/[\s-]/g, "").replace(/=+$/, "");
  if (!propre) throw new Error("Le secret est vide.");
  const octets = [];
  let valeur = 0;
  let bits = 0;
  for (const c of propre) {
    const i = BASE32.indexOf(c);
    if (i < 0) throw new Error("Le secret contient un caractère qui n'est pas de la base 32.");
    valeur = (valeur << 5) | i;
    bits += 5;
    if (bits >= 8) {
      octets.push((valeur >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(octets);
}

const ALGORITHMES = { SHA1: "sha1", SHA256: "sha256", SHA512: "sha512" };

/** « SHA-256 », « sha256 » → « sha256 ». */
export function algorithme(nom) {
  const a = ALGORITHMES[String(nom ?? "").toUpperCase().replace(/[-_\s]/g, "")];
  if (!a) throw new Error("Algorithme inconnu : SHA1, SHA256 ou SHA512 seulement.");
  return a;
}

/**
 * Ce que dit le secret rangé : l'adresse otpauth:// du code QR, ou le secret
 * seul. `explicite` dit si l'algorithme est écrit dans l'adresse.
 */
export function lireSecret(valeur) {
  const v = String(valeur ?? "").trim();
  if (/^otpauth:\/\//i.test(v)) {
    const p = new URL(v).searchParams;
    const ecrit = p.get("algorithm");
    return {
      cle: base32(p.get("secret")),
      algorithme: algorithme(ecrit ?? "SHA1"),
      explicite: ecrit !== null,
      chiffres: Number(p.get("digits") ?? 6),
      periode: Number(p.get("period") ?? 30),
      secretBrut: p.get("secret") ?? "",
    };
  }
  return { cle: base32(v), algorithme: "sha256", explicite: false, chiffres: 6, periode: 30, secretBrut: v };
}

/**
 * Ce qui ne va pas dans la valeur rangée, dit sans la montrer : sa forme
 * seulement — une adresse e-mail, un code du moment, un autre lien. Rien si
 * elle se lit.
 */
export function diagnostic(valeur) {
  const v = String(valeur ?? "").trim();
  if (!v) return "CERTUM_TOTP est vide.";
  // Six chiffres de 2 à 7 se liraient en base 32 : on les reconnaît d'abord.
  if (/^\d{6,8}$/.test(v)) return "CERTUM_TOTP contient un code à chiffres : il faut le lien du code QR, qui ne change pas, et non le code du moment.";
  try {
    lireSecret(v);
    return null;
  } catch { /* on dit ci-dessous ce qu'elle semble être */ }
  if (/^otpauth:\/\//i.test(v)) return "Le lien otpauth:// de CERTUM_TOTP ne contient pas de secret lisible (paramètre « secret »).";
  if (/^[^\s@]+@[^\s@]+$/.test(v)) return "CERTUM_TOTP contient une adresse e-mail : les deux secrets sont peut-être inversés.";
  const schema = /^([a-z][a-z0-9+.-]*):\/\//i.exec(v)?.[1];
  if (schema) return `CERTUM_TOTP contient un lien « ${schema.toLowerCase()}:// », et non otpauth:// : ce n'est pas le code QR attendu.`;
  return "CERTUM_TOTP n'est ni un lien otpauth:// ni un secret en base 32.";
}

/** Le code d'un instant (en secondes depuis 1970) : HMAC du compteur, troncature dynamique. */
export function code({ cle, algorithme: algo, chiffres = 6, periode = 30 }, secondes = Date.now() / 1000) {
  const compteur = Buffer.alloc(8);
  compteur.writeBigUInt64BE(BigInt(Math.floor(secondes / periode)));
  const hmac = createHmac(algo, cle).update(compteur).digest();
  const decalage = hmac[hmac.length - 1] & 0x0f;
  const nombre = hmac.readUInt32BE(decalage) & 0x7fffffff;
  return String(nombre % 10 ** chiffres).padStart(chiffres, "0");
}

/** Ce qui reste, en secondes, au code en cours. */
export const secondesRestantes = (periode = 30, secondes = Date.now() / 1000) => periode - (Math.floor(secondes) % periode);
