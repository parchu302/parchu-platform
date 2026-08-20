// Se ejecuta en el navegador antes de enviar el formulario: redimensiona y
// recomprime la imagen para bajar su peso, y devuelve directamente el data
// URL en base64 que viaja en el campo oculto del formulario. Asi el servidor
// nunca recibe el archivo original, solo el resultado ya liviano.

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

export async function compressImageToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("No se pudo acceder al canvas para comprimir la imagen");
    }

    context.drawImage(bitmap, 0, 0, width, height);

    return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}
