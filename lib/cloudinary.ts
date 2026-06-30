// Subida de imágenes a Cloudinary (unsigned upload desde el cliente).
//
// Requiere dos variables de entorno públicas (inlinadas en build por Next):
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    → el "cloud name" de tu cuenta
//   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET → un "upload preset" en modo Unsigned
//
// Cómo crear el preset:
//   Cloudinary → Settings → Upload → Upload presets → Add upload preset
//   Signing Mode: Unsigned. (Opcional) limitá formatos a jpg/png/webp.

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB antes de procesar
const OUTPUT_DIM = 512; // lado del cuadrado final (px)

export function isCloudinaryConfigured(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

/** Valida tipo y tamaño del archivo elegido. Devuelve un mensaje de error o null. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato no soportado. Usá una imagen JPG, PNG o WebP.";
  }
  if (file.size > MAX_FILE_BYTES) {
    return "La imagen es muy pesada (máximo 8 MB).";
  }
  return null;
}

/**
 * Recorta la imagen a un cuadrado centrado y la reescala a OUTPUT_DIM px.
 * Mantiene las subidas chicas (~30-80 KB) y consistentes para un avatar.
 */
async function toSquareJpegBlob(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - side) / 2;
    const sy = (bitmap.height - side) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_DIM;
    canvas.height = OUTPUT_DIM;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No se pudo procesar la imagen");
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_DIM, OUTPUT_DIM);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("No se pudo procesar la imagen");
    return blob;
  } finally {
    bitmap.close();
  }
}

/**
 * Sube la foto de perfil del negocio a Cloudinary y devuelve la secure_url.
 * Procesa la imagen (recorte cuadrado + reescala) antes de subir.
 */
export async function uploadTenantLogo(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "La subida de imágenes no está configurada. Faltan las variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const blob = await toSquareJpegBlob(file);

  const form = new FormData();
  form.append("file", blob, "logo.jpg");
  form.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.error?.message ?? "No se pudo subir la imagen. Probá de nuevo.",
    );
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Respuesta inesperada de Cloudinary.");
  return data.secure_url;
}
