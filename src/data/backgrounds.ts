export interface Background {
  id: string;
  name: string;
  url: string;
}

export interface BackgroundCategory {
  id: string;
  name: string;
  backgrounds: Background[];
}

// Placeholder backgrounds - in production, these would be actual coloring page backgrounds
export const backgroundCategories: BackgroundCategory[] = [
  {
    id: "disney",
    name: "Disney",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `disney-${i + 1}`,
      name: `Disney Background ${i + 1}`,
      url: `https://placehold.co/800x1000/FFE5E5/FF6B9D?text=Disney+${i + 1}`
    }))
  },
  {
    id: "vacation",
    name: "Vacation",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `vacation-${i + 1}`,
      name: `Vacation Background ${i + 1}`,
      url: `https://placehold.co/800x1000/E5F3FF/4A90E2?text=Vacation+${i + 1}`
    }))
  },
  {
    id: "zoo",
    name: "Zoo",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `zoo-${i + 1}`,
      name: `Zoo Background ${i + 1}`,
      url: `https://placehold.co/800x1000/E8F5E9/66BB6A?text=Zoo+${i + 1}`
    }))
  },
  {
    id: "underwater",
    name: "Underwater",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `underwater-${i + 1}`,
      name: `Underwater Background ${i + 1}`,
      url: `https://placehold.co/800x1000/E1F5FE/26C6DA?text=Underwater+${i + 1}`
    }))
  },
  {
    id: "space",
    name: "Space",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `space-${i + 1}`,
      name: `Space Background ${i + 1}`,
      url: `https://placehold.co/800x1000/E8EAF6/5C6BC0?text=Space+${i + 1}`
    }))
  },
  {
    id: "garden",
    name: "Garden",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `garden-${i + 1}`,
      name: `Garden Background ${i + 1}`,
      url: `https://placehold.co/800x1000/F3E5F5/AB47BC?text=Garden+${i + 1}`
    }))
  },
  {
    id: "sports",
    name: "Sports",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `sports-${i + 1}`,
      name: `Sports Background ${i + 1}`,
      url: `https://placehold.co/800x1000/FFF3E0/FF9800?text=Sports+${i + 1}`
    }))
  },
  {
    id: "fantasy",
    name: "Fantasy",
    backgrounds: Array.from({ length: 12 }, (_, i) => ({
      id: `fantasy-${i + 1}`,
      name: `Fantasy Background ${i + 1}`,
      url: `https://placehold.co/800x1000/FCE4EC/EC407A?text=Fantasy+${i + 1}`
    }))
  }
];
