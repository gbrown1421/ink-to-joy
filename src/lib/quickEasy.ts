/**
 * Client-side Quick & Easy simplifier for toddler coloring pages
 * Takes a Mimi Panda line-art image and creates a much simpler version
 * by downscaling (merges details) and hard thresholding (removes grays)
 */

export async function makeQuickEasyFromBase(baseUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      // Downscale to merge fine details and create thicker lines
      const scale = 0.45;
      const w = Math.floor(img.naturalWidth * scale);
      const h = Math.floor(img.naturalHeight * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      // Draw smaller to merge fine details
      ctx.drawImage(img, 0, 0, w, h);

      const imageData = ctx.getImageData(0, 0, w, h);
      const data = imageData.data;

      // Hard threshold → black lines or white, no gray
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const luminosity = 0.299 * r + 0.587 * g + 0.114 * b;
        const v = luminosity > 210 ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }

      ctx.putImageData(imageData, 0, 0);
      const out = canvas.toDataURL('image/png');
      resolve(out);
    };
    
    img.onerror = (err) => reject(err);
    img.src = baseUrl;
  });
}

/**
 * Convert data URL to Blob for uploading
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
