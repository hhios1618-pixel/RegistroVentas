// src/lib/image.ts
// Comprime un dataURL JPEG/PNG a JPG con ancho máx y quality.
// Devuelve un dataURL "image/jpeg".
export async function compressDataUrl(
    dataUrl: string,
    maxW = 720,
    quality = 0.72
  ): Promise<string> {
    return await new Promise<string>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
  
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('no_canvas'));
        ctx.drawImage(img, 0, 0, w, h);
  
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out);
      };
      img.onerror = () => reject(new Error('img_load_error'));
      img.src = dataUrl;
    });
  }