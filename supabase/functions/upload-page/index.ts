function buildColoringPrompt(rawDifficulty: string | null | undefined): string {
  const basePrompt = `
Create a black-and-white line-art coloring page from the uploaded reference image.

General rules:
- Only black outlines on pure white background
- No color, no gray shading, no gradients, no hatching, no pencil texture
- Portrait orientation like an 8.5×11 inch coloring book page
- Keep subjects in frame – don't crop off heads, feet, or important parts
- Clean, printable line art suitable for children to color
`;

  const normalizedDifficulty = (rawDifficulty || "intermediate").toLowerCase().trim();

  let difficultyPrompt: string;

  if (normalizedDifficulty === "quick" || normalizedDifficulty === "easy" || normalizedDifficulty === "quick_easy") {
    difficultyPrompt = `
QUICK & EASY difficulty (for ~3–4 year olds):

- Focus only on the main subject(s) from the image
- Background must be completely BLANK WHITE except for ONE simple straight floor line under the subject's base
- Do NOT draw furniture, shelves, toys, posters, rugs, patterns, or any clutter
- Shapes must be BIG and SIMPLE: no tiny patterns, no stripes, no textures, no small folds
- Faces very simple: basic eyes, small nose, gentle smile – no fine facial detail
- Use THICK, BOLD outlines and large open white areas for easy coloring

If you are about to draw any background object, STOP and leave that area pure white instead.
`;
  } else if (normalizedDifficulty === "beginner" || normalizedDifficulty === "beginners") {
    difficultyPrompt = `
BEGINNER difficulty (for ~4–6 year olds):

- Keep the main subject(s) full-body and clearly outlined
- Background should be VERY SIMPLE and MINIMAL: at most 2–3 LARGE, simple shapes (e.g., one big star, one large framed picture, one simple shelf or window)
- Do NOT draw lots of small objects, tiny toys, papers, or detailed patterns
- Lines medium-thick, very clear, no micro-detail
- If the original scene is cluttered, aggressively simplify it: keep only a few big shapes and erase the rest into blank white space
`;
  } else {
    // default: intermediate
    difficultyPrompt = `
INTERMEDIATE difficulty (for ~6–8 year olds):

- Keep the main subject(s) full-body and recognizable
- Include a recognizable background with more objects and structure than Beginner, but still avoid tiny fussy details that are hard to color
- Use finer lines than Beginner to allow more detail, but keep everything readable and clean
- This version should feel richer and more detailed than Beginner, but still strictly line art for coloring
`;
  }

  return (basePrompt + "\n" + difficultyPrompt).trim();
}
