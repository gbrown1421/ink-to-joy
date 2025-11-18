export const convertToColoringPage = async (
  file: File,
  lineThickness: number = 3
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("Could not get canvas context"));
      return;
    }

    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Convert to grayscale first
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      // Apply edge detection with adjustable line thickness
      const width = canvas.width;
      const height = canvas.height;
      const outputData = ctx.createImageData(width, height);
      const thickness = Math.max(1, Math.round(lineThickness));
      
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;

          // Sobel kernels
          const gx =
            -data[((y - 1) * width + (x - 1)) * 4] +
            data[((y - 1) * width + (x + 1)) * 4] +
            -2 * data[(y * width + (x - 1)) * 4] +
            2 * data[(y * width + (x + 1)) * 4] +
            -data[((y + 1) * width + (x - 1)) * 4] +
            data[((y + 1) * width + (x + 1)) * 4];

          const gy =
            -data[((y - 1) * width + (x - 1)) * 4] +
            -2 * data[((y - 1) * width + x) * 4] +
            -data[((y - 1) * width + (x + 1)) * 4] +
            data[((y + 1) * width + (x - 1)) * 4] +
            2 * data[((y + 1) * width + x) * 4] +
            data[((y + 1) * width + (x + 1)) * 4];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          
          // Threshold and invert for black lines on white
          const value = magnitude > 50 ? 0 : 255;

          outputData.data[idx] = value;
          outputData.data[idx + 1] = value;
          outputData.data[idx + 2] = value;
          outputData.data[idx + 3] = 255;
        }
      }

      // Apply line thickness
      if (thickness > 1) {
        const thickened = ctx.createImageData(width, height);
        for (let i = 0; i < outputData.data.length; i++) {
          thickened.data[i] = outputData.data[i];
        }

        for (let y = thickness; y < height - thickness; y++) {
          for (let x = thickness; x < width - thickness; x++) {
            const idx = (y * width + x) * 4;
            if (outputData.data[idx] === 0) {
              for (let dy = -thickness + 1; dy < thickness; dy++) {
                for (let dx = -thickness + 1; dx < thickness; dx++) {
                  const ni = ((y + dy) * width + (x + dx)) * 4;
                  thickened.data[ni] = 0;
                  thickened.data[ni + 1] = 0;
                  thickened.data[ni + 2] = 0;
                  thickened.data[ni + 3] = 255;
                }
              }
            }
          }
        }
        ctx.putImageData(thickened, 0, 0);
      } else {
        ctx.putImageData(outputData, 0, 0);
      }
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
};

export const downloadImage = (dataUrl: string, fileName: string) => {
  const link = document.createElement("a");
  link.download = `coloring-page-${fileName}`;
  link.href = dataUrl;
  link.click();
};
