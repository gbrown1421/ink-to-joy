function buildColoringPrompt(difficulty: string): string {
  const quickPrompt = `
Convert the input photo into a very simple black-and-white line-art coloring page.

QUICK & EASY difficulty (for ~3–4 year olds):

- Focus only on the main subject(s) from the image (people, pets, or main object).
- Background must be completely BLANK WHITE except for ONE simple straight floor line under their feet / base.
- Do NOT draw furniture, classrooms, shelves, toys, posters, rugs, patterns, or any clutter.
- Shapes must be BIG and SIMPLE:
  - No tiny patterns, no stripes, no textures, no small folds.
- Faces very simple: basic eyes, small nose, gentle smile – no fine facial detail.
- Use THICK, BOLD outlines and large open white areas for easy coloring.
- Absolutely NO gray shading, gradients, hatching, or pencil texture – only solid black lines on white.

If you are about to draw any background object, STOP and leave that area pure white instead.
`;

  const beginnerPrompt = `
Convert the input photo into a clean black-and-white line-art coloring page.

BEGINNER difficulty (for ~4–6 year olds):

- Keep the main subject(s) full-body and clearly outlined.
- Background should be VERY SIMPLE and MINIMAL:
  - At most 2–3 LARGE, simple shapes (for example: one big star, one large framed picture, one simple shelf or window).
  - Do NOT draw lots of small objects, tiny toys, papers, or detailed patterns.
- Lines medium-thick, very clear, no micro-detail on hair, clothes, or furniture.
- No gray shading, gradients, or hatching – only clean black outlines on white.

If the original scene is cluttered, aggressively simplify it: keep only a few big shapes and erase the rest into blank white space.
`;

  const intermediatePrompt = `
Convert the input photo into a detailed but kid-friendly black-and-white line-art coloring page.

INTERMEDIATE difficulty (for ~6–8 year olds):

- Keep the main subject(s) full-body and recognizable.
- Include a recognizable background (e.g. room, classroom, park) with more objects and structure than Beginner,
  but still avoid tiny fussy details that are hard to color.
- Use finer lines than Beginner to allow more detail, but keep everything readable and clean.
- No gray shading, gradients, cross-hatching, or pencil texture – only solid black outlines on white.

This version should feel richer and more detailed than Beginner, but still strictly line art for coloring.
`;

  if (difficulty === "quick") {
    return quickPrompt.trim();
  }

  if (difficulty === "beginner") {
    return beginnerPrompt.trim();
  }

  // default to intermediate if anything else
  return intermediatePrompt.trim();
}
