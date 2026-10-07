// Images : Cloudinary (envoi non signé depuis l'admin, transformations à l'affichage).
// Les fichiers sont réduits dans le navigateur (1 600 px max) avant l'envoi : plus rapide sur mobile.
const CLOUD = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
  publicId: string;
}

/** URL Cloudinary transformée : cld(url, 'c_fill,ar_1:1,w_360') → …/upload/f_auto,q_auto,c_fill,ar_1:1,w_360/… */
export function cld(url: string, transform = ''): string {
  if (!url.includes('res.cloudinary.com') || !url.includes('/upload/')) return url;
  const t = ['f_auto,q_auto', transform].filter(Boolean).join(',');
  return url.replace('/upload/', `/upload/${t}/`);
}

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_FILE_MB = 15;

/** Réduit l'image à `maxSize` px sur le plus grand côté (WebP, transparence conservée). */
export async function compressImage(file: File, maxSize = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('compression'))), 'image/webp', 0.9),
  );
}

/** Envoie une image vers Cloudinary (preset non signé). onProgress reçoit 0 → 1. */
export function uploadImage(
  file: Blob,
  { folder, onProgress, signal }: { folder: string; onProgress?: (ratio: number) => void; signal?: AbortSignal },
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    if (!CLOUD || !PRESET || CLOUD === 'a-remplacer') {
      reject(new Error('Cloudinary non configuré (VITE_CLOUDINARY_*).'));
      return;
    }
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', PRESET);
    form.append('folder', folder);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      let body: { secure_url?: string; width?: number; height?: number; public_id?: string; error?: { message?: string } } = {};
      try {
        body = JSON.parse(xhr.responseText || '{}');
      } catch {
        /* réponse illisible : traitée comme une erreur ci-dessous */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        resolve({ url: body.secure_url, width: body.width ?? 0, height: body.height ?? 0, publicId: body.public_id ?? '' });
      } else {
        reject(new Error(body.error?.message ?? `Envoi refusé (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Pas de connexion internet.'));
    xhr.onabort = () => reject(new DOMException('Envoi annulé', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}
