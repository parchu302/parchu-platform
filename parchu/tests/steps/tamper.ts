// Un JWE compacto es header.encryptedKey.iv.ciphertext.tag
// Alterar el ULTIMO caracter no es fiable: en base64 los bits sobrantes del
// final pueden decodificar a los mismos bytes. Se altera uno del centro del
// ciphertext, donde los 6 bits del caracter si son significativos.
export function tamperJweToken(token: string): string {
  const parts = token.split(".");
  const ciphertext = parts[3] ?? "";

  const middle = Math.floor(ciphertext.length / 2);
  const original = ciphertext[middle];
  const replacement = original === "a" ? "b" : "a";

  parts[3] =
    ciphertext.slice(0, middle) + replacement + ciphertext.slice(middle + 1);

  return parts.join(".");
}
