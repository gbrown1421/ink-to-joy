import { ReactNode } from "react";

interface BorderWrapperProps {
  children: ReactNode;
  borderStyle: string;
  headingText?: string;
  difficulty: string;
}

export const BorderWrapper = ({ children, borderStyle, headingText, difficulty }: BorderWrapperProps) => {
  const renderBorder = () => {
    // Quick and Easy (3-6 years) - Simple, playful borders
    if (difficulty === "quick-easy") {
      switch (borderStyle) {
        case "balloons":
          return <BalloonsBorder headingText={headingText}>{children}</BalloonsBorder>;
        case "stars":
          return <StarsBorder headingText={headingText}>{children}</StarsBorder>;
        case "clouds":
          return <CloudsBorder headingText={headingText}>{children}</CloudsBorder>;
        default:
          return <SimpleBorder headingText={headingText}>{children}</SimpleBorder>;
      }
    }
    
    // Beginner (7-10 years) - More detailed but still fun
    if (difficulty === "beginner") {
      switch (borderStyle) {
        case "flowers":
          return <FlowersBorder headingText={headingText}>{children}</FlowersBorder>;
        case "animals":
          return <AnimalsBorder headingText={headingText}>{children}</AnimalsBorder>;
        case "nature":
          return <NatureBorder headingText={headingText}>{children}</NatureBorder>;
        default:
          return <SimpleBorder headingText={headingText}>{children}</SimpleBorder>;
      }
    }
    
    // Intermediate (11-15 years) - More mature
    if (difficulty === "intermediate") {
      switch (borderStyle) {
        case "geometric":
          return <GeometricBorder headingText={headingText}>{children}</GeometricBorder>;
        case "art-deco":
          return <ArtDecoBorder headingText={headingText}>{children}</ArtDecoBorder>;
        case "mandala":
          return <MandalaBorder headingText={headingText}>{children}</MandalaBorder>;
        default:
          return <SimpleBorder headingText={headingText}>{children}</SimpleBorder>;
      }
    }
    
    // Advanced (16+ years) - Sophisticated designs
    if (difficulty === "advanced") {
      switch (borderStyle) {
        case "ornate":
          return <OrnateBorder headingText={headingText}>{children}</OrnateBorder>;
        case "botanical":
          return <BotanicalBorder headingText={headingText}>{children}</BotanicalBorder>;
        case "minimalist":
          return <MinimalistBorder headingText={headingText}>{children}</MinimalistBorder>;
        default:
          return <SimpleBorder headingText={headingText}>{children}</SimpleBorder>;
      }
    }

    return <SimpleBorder headingText={headingText}>{children}</SimpleBorder>;
  };

  return renderBorder();
};

// Simple fallback border
const SimpleBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8 border-4 border-border rounded-lg">
    {headingText && (
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background px-6 py-2 rounded-full border-2 border-border">
        <h2 className="text-xl font-bold text-foreground">{headingText}</h2>
      </div>
    )}
    <div className="mt-12">{children}</div>
  </div>
);

// QUICK AND EASY (3-6 years) BORDERS
const BalloonsBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Colorful balloons in corners */}
      <ellipse cx="80" cy="80" rx="40" ry="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-red-500" />
      <line x1="80" y1="130" x2="80" y2="180" stroke="currentColor" strokeWidth="2" className="text-red-500" />
      
      <ellipse cx="720" cy="80" rx="40" ry="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-blue-500" />
      <line x1="720" y1="130" x2="720" y2="180" stroke="currentColor" strokeWidth="2" className="text-blue-500" />
      
      <ellipse cx="80" cy="920" rx="40" ry="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-yellow-500" />
      <line x1="80" y1="870" x2="80" y2="820" stroke="currentColor" strokeWidth="2" className="text-yellow-500" />
      
      <ellipse cx="720" cy="920" rx="40" ry="50" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-500" />
      <line x1="720" y1="870" x2="720" y2="820" stroke="currentColor" strokeWidth="2" className="text-green-500" />
      
      {/* Simple border */}
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-200 to-purple-200 px-8 py-3 rounded-full border-4 border-border shadow-lg">
        <h2 className="text-2xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const StarsBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Stars scattered around border */}
      <path d="M100,100 L105,115 L120,115 L108,125 L112,140 L100,130 L88,140 L92,125 L80,115 L95,115 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
      <path d="M700,100 L705,115 L720,115 L708,125 L712,140 L700,130 L688,140 L692,125 L680,115 L695,115 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
      <path d="M100,900 L105,915 L120,915 L108,925 L112,940 L100,930 L88,940 L92,925 L80,915 L95,915 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
      <path d="M700,900 L705,915 L720,915 L708,925 L712,940 L700,930 L688,940 L692,925 L680,915 L695,915 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
      
      {/* Border */}
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-100 to-orange-100 px-8 py-3 rounded-full border-4 border-border shadow-lg">
        <h2 className="text-2xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const CloudsBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Simple cloud shapes */}
      <ellipse cx="100" cy="60" rx="30" ry="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-400" />
      <ellipse cx="120" cy="70" rx="25" ry="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-400" />
      
      <ellipse cx="700" cy="60" rx="30" ry="20" fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-400" />
      <ellipse cx="680" cy="70" rx="25" ry="18" fill="none" stroke="currentColor" strokeWidth="3" className="text-sky-400" />
      
      {/* Border */}
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-100 to-blue-100 px-8 py-3 rounded-full border-4 border-border shadow-lg">
        <h2 className="text-2xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

// BEGINNER (7-10 years) BORDERS
const FlowersBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Flower patterns in corners */}
      {[...Array(6)].map((_, i) => (
        <circle key={`petal-tl-${i}`} cx={80 + Math.cos(i * Math.PI / 3) * 20} cy={80 + Math.sin(i * Math.PI / 3) * 20} r="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-pink-400" />
      ))}
      <circle cx="80" cy="80" r="8" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-400" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-100 to-rose-100 px-8 py-3 rounded-lg border-3 border-border shadow-lg">
        <h2 className="text-xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const AnimalsBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Paw prints */}
      <g className="text-amber-600">
        <circle cx="80" cy="80" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="70" cy="95" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="90" cy="95" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="75" cy="105" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="85" cy="105" r="4" fill="none" stroke="currentColor" strokeWidth="2" />
      </g>
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-100 to-orange-100 px-8 py-3 rounded-lg border-3 border-border shadow-lg">
        <h2 className="text-xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const NatureBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Leaves and vines */}
      <path d="M50,50 Q60,60 50,70 Q40,60 50,50" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500" />
      <path d="M750,50 Q740,60 750,70 Q760,60 750,50" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" rx="10" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-100 to-emerald-100 px-8 py-3 rounded-lg border-3 border-border shadow-lg">
        <h2 className="text-xl font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

// INTERMEDIATE (11-15 years) BORDERS
const GeometricBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Geometric corner patterns */}
      <path d="M50,50 L80,50 L80,80 M720,50 L750,50 L750,80 M50,950 L80,950 L80,920 M720,950 L750,950 L750,920" stroke="currentColor" strokeWidth="3" className="text-primary" />
      <circle cx="65" cy="65" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" />
      <circle cx="735" cy="65" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
      <rect x="30" y="30" width="740" height="940" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-background px-8 py-2 border-2 border-primary shadow-lg">
        <h2 className="text-lg font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const ArtDecoBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Art deco fan patterns */}
      <path d="M400,30 L380,50 L420,50 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <path d="M400,40 L370,60 L430,60 Z" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
      <line x1="40" y1="40" x2="100" y2="40" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <line x1="700" y1="40" x2="760" y2="40" stroke="currentColor" strokeWidth="2" className="text-primary" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-background px-8 py-2 border-2 border-primary shadow-lg">
        <h2 className="text-lg font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const MandalaBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Mandala corner elements */}
      <circle cx="80" cy="80" r="30" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <circle cx="80" cy="80" r="20" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent" />
      <circle cx="80" cy="80" r="10" fill="none" stroke="currentColor" strokeWidth="1" className="text-accent" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="3" className="text-border" />
    </svg>
    
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-background px-8 py-2 border-2 border-primary shadow-lg">
        <h2 className="text-lg font-bold text-primary">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

// ADVANCED (16+ years) BORDERS
const OrnateBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Ornate flourishes */}
      <path d="M30,30 Q50,50 30,70" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      <path d="M770,30 Q750,50 770,70" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
      <rect x="25" y="25" width="750" height="950" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />
      <rect x="30" y="30" width="740" height="940" fill="none" stroke="currentColor" strokeWidth="1" className="text-muted-foreground" />
    </svg>
    
    {headingText && (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-background px-6 py-1 border border-primary">
        <h2 className="text-base font-semibold text-primary tracking-wide">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const BotanicalBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Botanical illustrations */}
      <path d="M50,100 Q50,80 60,70 Q70,80 70,100" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      <line x1="60" y1="85" x2="50" y2="90" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="60" y1="85" x2="70" y2="90" stroke="currentColor" strokeWidth="1" className="text-primary" />
      
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="2" className="text-border" />
    </svg>
    
    {headingText && (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-background px-6 py-1 border border-primary">
        <h2 className="text-base font-semibold text-primary italic">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);

const MinimalistBorder = ({ children, headingText }: { children: ReactNode; headingText?: string }) => (
  <div className="relative w-full h-full p-8">
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 800 1000" preserveAspectRatio="none">
      {/* Clean minimalist lines */}
      <rect x="20" y="20" width="760" height="960" fill="none" stroke="currentColor" strokeWidth="1" className="text-border" />
      <line x1="40" y1="50" x2="120" y2="50" stroke="currentColor" strokeWidth="1" className="text-primary" />
      <line x1="680" y1="50" x2="760" y2="50" stroke="currentColor" strokeWidth="1" className="text-primary" />
    </svg>
    
    {headingText && (
      <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-background px-6 py-1">
        <h2 className="text-sm font-light text-primary tracking-widest uppercase">{headingText}</h2>
      </div>
    )}
    <div className="relative mt-20">{children}</div>
  </div>
);
