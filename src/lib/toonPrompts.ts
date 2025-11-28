export type ToonDifficulty = 'Quick and Easy' | 'Adv Beginner';

export function buildToonColoringPrompt(difficulty: ToonDifficulty): string {
  const basePrompt = `
Convert the uploaded photo into a black-and-white line-art coloring page
drawn in a cute 2D cartoon style.

Global rules (ALWAYS obey these):
- Keep the same main subject(s), pose(s), and overall composition as the photo.
- Style: simple 2D cartoon / storybook line art, NOT photorealistic, NOT 3D.
- Output MUST be black outlines on a pure white background.
- NO color anywhere. NO grey shading, gradients, or pencil texture.
- Clear, confident outlines, clean shapes, no sketchy noise.
- Show the full main subject(s) in frame; don't crop important parts off.
`;

  const quickPrompt = `
CARTOON COLORING PAGE → QUICK AND EASY

Target: very young kids; maximum simplicity.

- Characters / main subject:
  - Slightly larger cartoon heads, simplified faces (simple eyes, tiny nose, friendly smile).
  - Clothing simplified into big flat areas; remove tiny folds, textures, and small accessories.
- Lines:
  - THICK, bold outlines around characters and key shapes.
  - Very few internal details; avoid tiny lines on hair, clothes, or objects.
- Background:
  - Extremely minimal.
  - Keep at most 1–2 large simple shapes to hint at the setting (e.g. a floor line and one big block shape).
  - Remove small objects, clutter, and fine background detail.
- Absolutely NO hatching, cross-hatching, or grey tones. Only thick black lines on white.
`;

  const advBeginnerPrompt = `
CARTOON COLORING PAGE → ADV BEGINNER

Target: early elementary; more detail, still clean and kid-friendly.

- Characters / main subject:
  - Standard cartoon proportions (not chibi, not realistic).
  - Clear features and hair shape; you can include a few simple folds in clothing.
  - Simple patterns (stripes, flowers, pockets) are OK, but avoid micro-detail.
- Lines:
  - Medium-thick outlines for the main forms, with some internal detail lines.
  - Still NO grey shading or tonal rendering; all information must come from line work.
- Background:
  - Show a simplified version of the real environment (room, outdoors, etc.).
  - Include key large objects (walls, furniture, a few props) but aggressively remove clutter.
  - Prefer bigger, readable shapes over lots of tiny items.
- Overall: more to look at and color than Quick and Easy, but still clean, readable line art with no shading.
`;

  if (difficulty === 'Quick and Easy') {
    return `${basePrompt}\n\n${quickPrompt}`;
  }

  // Adv Beginner
  return `${basePrompt}\n\n${advBeginnerPrompt}`;
}
