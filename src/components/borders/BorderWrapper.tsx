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
      {/* Top ribbon banner */}
      <path 
        d="M 150 60 L 180 40 L 620 40 L 650 60 L 620 80 L 180 80 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <path d="M 180 40 L 150 20 L 180 60 Z" fill="none" stroke="currentColor" strokeWidth="3" />
      <path d="M 620 40 L 650 20 L 650 60 Z" fill="none" stroke="currentColor" strokeWidth="3" />
      
      {/* Left side - balloons, hearts, stars chain */}
      {/* Balloon 1 */}
      <ellipse cx="60" cy="150" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="57" cy="140" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="185" x2="60" y2="210" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 2 */}
      <ellipse cx="60" cy="250" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="57" cy="240" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="285" x2="60" y2="310" stroke="currentColor" strokeWidth="2" />
      
      {/* Heart */}
      <path 
        d="M 60 340 C 60 335 55 330 50 330 C 45 330 40 335 40 342 C 40 348 50 358 60 365 C 70 358 80 348 80 342 C 80 335 75 330 70 330 C 65 330 60 335 60 340 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="60" y1="365" x2="60" y2="385" stroke="currentColor" strokeWidth="2" />
      
      {/* Star */}
      <path 
        d="M 60 410 L 64 422 L 77 422 L 67 430 L 71 442 L 60 434 L 49 442 L 53 430 L 43 422 L 56 422 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="60" y1="442" x2="60" y2="462" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 3 */}
      <ellipse cx="60" cy="502" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="57" cy="492" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="537" x2="60" y2="557" stroke="currentColor" strokeWidth="2" />
      
      {/* Star 2 */}
      <path 
        d="M 60 582 L 64 594 L 77 594 L 67 602 L 71 614 L 60 606 L 49 614 L 53 602 L 43 594 L 56 594 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="60" y1="614" x2="60" y2="634" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 4 */}
      <ellipse cx="60" cy="674" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="57" cy="664" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="709" x2="60" y2="729" stroke="currentColor" strokeWidth="2" />
      
      {/* Star 3 */}
      <path 
        d="M 60 754 L 64 766 L 77 766 L 67 774 L 71 786 L 60 778 L 49 786 L 53 774 L 43 766 L 56 766 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="60" y1="786" x2="60" y2="806" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 5 */}
      <ellipse cx="60" cy="846" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="57" cy="836" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="60" y1="881" x2="60" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Right side - heart, balloon, star, balloon, star, balloon, star, balloon chain */}
      {/* Heart */}
      <path 
        d="M 740 130 C 740 125 735 120 730 120 C 725 120 720 125 720 132 C 720 138 730 148 740 155 C 750 148 760 138 760 132 C 760 125 755 120 750 120 C 745 120 740 125 740 130 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="740" y1="155" x2="740" y2="175" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 1 */}
      <ellipse cx="740" cy="215" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="737" cy="205" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="740" y1="250" x2="740" y2="275" stroke="currentColor" strokeWidth="2" />
      
      {/* Star */}
      <path 
        d="M 740 300 L 744 312 L 757 312 L 747 320 L 751 332 L 740 324 L 729 332 L 733 320 L 723 312 L 736 312 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="740" y1="332" x2="740" y2="352" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 2 */}
      <ellipse cx="740" cy="392" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="737" cy="382" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="740" y1="427" x2="740" y2="447" stroke="currentColor" strokeWidth="2" />
      
      {/* Star 2 */}
      <path 
        d="M 740 472 L 744 484 L 757 484 L 747 492 L 751 504 L 740 496 L 729 504 L 733 492 L 723 484 L 736 484 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="740" y1="504" x2="740" y2="524" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 3 */}
      <ellipse cx="740" cy="564" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="737" cy="554" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="740" y1="599" x2="740" y2="619" stroke="currentColor" strokeWidth="2" />
      
      {/* Star 3 */}
      <path 
        d="M 740 644 L 744 656 L 757 656 L 747 664 L 751 676 L 740 668 L 729 676 L 733 664 L 723 656 L 736 656 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="740" y1="676" x2="740" y2="696" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 4 */}
      <ellipse cx="740" cy="736" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="737" cy="726" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="740" y1="771" x2="740" y2="791" stroke="currentColor" strokeWidth="2" />
      
      {/* Star 4 */}
      <path 
        d="M 740 816 L 744 828 L 757 828 L 747 836 L 751 848 L 740 840 L 729 848 L 733 836 L 723 828 L 736 828 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="740" y1="848" x2="740" y2="868" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 5 */}
      <ellipse cx="740" cy="908" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="737" cy="898" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="740" y1="943" x2="740" y2="960" stroke="currentColor" strokeWidth="2" />
      
      {/* Bottom border - heart, balloon, star, balloon, star, heart */}
      <line x1="60" y1="920" x2="150" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Heart */}
      <path 
        d="M 180 920 C 180 915 175 910 170 910 C 165 910 160 915 160 922 C 160 928 170 938 180 945 C 190 938 200 928 200 922 C 200 915 195 910 190 910 C 185 910 180 915 180 920 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="200" y1="920" x2="280" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon */}
      <ellipse cx="310" cy="920" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="307" cy="910" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="340" y1="920" x2="400" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Star */}
      <path 
        d="M 430 920 L 434 932 L 447 932 L 437 940 L 441 952 L 430 944 L 419 952 L 423 940 L 413 932 L 426 932 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="447" y1="920" x2="520" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Balloon 2 */}
      <ellipse cx="550" cy="920" rx="30" ry="35" fill="none" stroke="currentColor" strokeWidth="3" />
      <ellipse cx="547" cy="910" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="580" y1="920" x2="640" y2="920" stroke="currentColor" strokeWidth="2" />
      
      {/* Heart 2 */}
      <path 
        d="M 670 920 C 670 915 665 910 660 910 C 655 910 650 915 650 922 C 650 928 660 938 670 945 C 680 938 690 928 690 922 C 690 915 685 910 680 910 C 675 910 670 915 670 920 Z" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3"
      />
      <line x1="690" y1="920" x2="740" y2="920" stroke="currentColor" strokeWidth="2" />
    </svg>
    {headingText && (
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <h2 className="text-2xl font-bold text-foreground text-center px-4">{headingText}</h2>
      </div>
    )}
    <div className="relative z-0 mt-24 mb-12 mx-24">{children}</div>
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
