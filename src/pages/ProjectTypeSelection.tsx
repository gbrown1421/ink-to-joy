import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Smile, Home, CheckCircle2, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import wideFrame from "@/assets/wide-frame.png";
import orangeTileBg from "@/assets/orange-tile-bg.png";

const ORANGE = "#FF7A3C";

const ProjectTypeSelection = () => {
  const [selectedType, setSelectedType] = useState<"coloring" | "toon" | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/difficulty/${selectedType}`);
    }
  };

  const projectTypes = [
    {
      id: "coloring" as const,
      icon: Image,
      title: "Coloring Books",
      subtitle: "Realistic line art from photos",
      description: "Transform photos into fun line art.",
      features: [
        "4 difficulty levels",
        "Custom borders & titles",
        "Print-ready PDF export",
      ],
      cta: "Create Coloring Book",
    },
    {
      id: "toon" as const,
      icon: Smile,
      title: "Cartoon Books",
      subtitle: "Fun caricatures from photos",
      description: "Turn photos into playful cartoons.",
      features: [
        "Expressive cartoon style",
        "Bold outlines & features",
        "Print-ready PDF export",
      ],
      cta: "Create Cartoon Book",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-creative bg-clip-text text-transparent">
                  Choose Project Type
                </h1>
                <p className="text-sm text-muted-foreground">
                  Select the style for your book
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-1" />
              Home
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">What would you like to create?</h2>
          <p className="text-muted-foreground text-lg">
            Choose between realistic line art or cartoon caricatures
          </p>
        </div>

      </main>

      {/* Full-width Orange Banner */}
      <div 
        className="w-full py-16"
        style={{
          backgroundImage: `url(${orangeTileBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container mx-auto px-4 max-w-5xl">
          {/* Tiles Grid */}
          <div className="grid md:grid-cols-2 gap-8 justify-items-center">
            {projectTypes.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              
              return (
                <div
                  key={type.id}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
                  }`}
                  onClick={() => setSelectedType(type.id)}
                >
                  {/* Gray background behind frame */}
                  <div className="relative">
                    {/* Light gray background - sits behind the frame */}
                    <div 
                      className={`absolute inset-[12%] bg-gradient-to-b from-gray-50 to-gray-100 ${
                        isSelected ? "ring-2 ring-offset-2" : ""
                      }`}
                      style={{ 
                        ...(isSelected && { boxShadow: `0 0 0 2px ${ORANGE}` })
                      }}
                    />
                    
                    {/* Frame overlay */}
                    <img 
                      src={wideFrame} 
                      alt="" 
                      className="relative w-full h-auto pointer-events-none"
                      style={{ maxWidth: '380px' }}
                    />
                    
                    {/* Content positioned inside the frame */}
                    <div className="absolute inset-[15%] flex flex-col items-center justify-center text-center p-4">
                      {/* Icon */}
                      <div 
                        className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 shadow-md"
                        style={{ backgroundColor: ORANGE }}
                      >
                        <Icon className="w-6 h-6 text-white" />
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {type.title}
                      </h3>

                      {/* Subtitle */}
                      <p className="font-medium text-sm mb-2" style={{ color: ORANGE }}>
                        {type.subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-gray-600 text-xs mb-3">
                        {type.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-1 mb-4 w-full">
                        {type.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2 text-gray-700 text-xs">
                            <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: ORANGE }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      {/* CTA Button */}
                      <Button
                        className="w-full text-white font-semibold py-2 rounded-full shadow-md hover:opacity-90 text-sm"
                        style={{ backgroundColor: ORANGE }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedType(type.id);
                          navigate(`/difficulty/${type.id}`);
                        }}
                      >
                        {type.cta}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Continue section */}
      <div className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-5xl flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            size="lg"
            className="px-8"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProjectTypeSelection;
