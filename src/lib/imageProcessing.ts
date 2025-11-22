export type Difficulty = "quick-easy" | "beginner" | "intermediate" | "advanced";

export async function prepareImageForDifficulty(
  file: File,
  difficulty: Difficulty
): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = reject;
    image.src = url;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context");

  // Normalize advanced to intermediate
  const normalized: Difficulty =
    difficulty === "advanced" ? "intermediate" : difficulty;

  // Smaller + blurrier for easier modes
  const maxSize =
    normalized === "quick-easy" ? 800 :
    normalized === "beginner" ? 1200 :
    1600;

  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // Apply blur based on difficulty
  if (normalized === "quick-easy") {
    ctx.filter = "blur(1.8px)";
  } else if (normalized === "beginner") {
    ctx.filter = "blur(1px)";
  } else {
    ctx.filter = "blur(0.3px)";
  }

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );

  return blob;
}
