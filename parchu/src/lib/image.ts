// Validacion de la imagen de producto en el borde del servidor. El cliente ya
// comprime y valida el tipo de archivo (ver src/lib/client/compress-image.ts),
// pero un POST directo a la Server Action puede saltarse esa capa: aqui no se
// confia en el mimetype declarado por el data URL, se verifica la firma real
// de los primeros bytes decodificados.

const DATA_URL_PATTERN = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+=*)$/;

// Firma (magic number) de cada formato aceptado, en los primeros bytes del
// binario decodificado.
const SIGNATURES: Record<string, number[]> = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // "RIFF"; el offset 8 lleva "WEBP"
};

// ~1.5 MB decodificados: la compresion en cliente produce archivos muy por
// debajo de esto. El limite real es una red de seguridad, no el control
// principal de tamaño.
export const MAX_IMAGE_DATA_URL_LENGTH = 2_000_000;

export function parseImageDataUrl(
  value: string,
): { mime: string; base64: string } | null {
  const match = DATA_URL_PATTERN.exec(value);
  if (!match) return null;
  return { mime: match[1]!, base64: match[2]! };
}

export function isValidProductImage(value: string): boolean {
  if (value.length === 0 || value.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return false;
  }

  const parsed = parseImageDataUrl(value);
  if (!parsed) return false;

  const signature = SIGNATURES[parsed.mime];
  if (!signature) return false;

  let header: Buffer;
  try {
    header = Buffer.from(parsed.base64.slice(0, 16), "base64");
  } catch {
    return false;
  }

  const matchesSignature = signature.every((byte, index) => header[index] === byte);
  if (!matchesSignature) return false;

  if (parsed.mime === "image/webp") {
    return header.subarray(8, 12).toString("ascii") === "WEBP";
  }

  return true;
}
