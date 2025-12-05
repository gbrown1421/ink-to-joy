import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Palette, Smile, Home, CheckCircle2, Image } from "lucide-react";
import { useNavigate } from "react-router-dom";
import wideFrame from "@/assets/wide-frame-2.png";

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
    <div className="min-h-screen bg-gradient-subtle">
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

        <div className="grid md:grid-cols-2 gap-8 mb-8">
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
                {/* Wide Frame */}
                <div 
                  className="relative p-8"
                  style={{
                    backgroundImage: `url(${wideFrame})`,
                    backgroundSize: '100% 100%',
                    backgroundRepeat: 'no-repeat',
                  }}
                >
                  {/* Inner Content Area */}
                  <div 
                    className={`bg-white p-8 flex flex-col items-center text-center ${
                      isSelected ? "ring-2 ring-offset-2" : ""
                    }`}
                    style={{ 
                      ...(isSelected && { boxShadow: `0 0 0 2px ${ORANGE}` })
                    }}
                  >
                    {/* Icon */}
                    <div 
                      className="w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-md"
                      style={{ backgroundColor: ORANGE }}
                    >
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      {type.title}
                    </h3>

                    {/* Subtitle */}
                    <p className="font-medium mb-3" style={{ color: ORANGE }}>
                      {type.subtitle}
                    </p>

                    {/* Description */}
                    <p className="text-gray-600 text-sm mb-5">
                      {type.description}
                    </p>

                    {/* Features List */}
                    <ul className="space-y-2 mb-6 w-full max-w-xs">
                      {type.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-gray-700 text-sm">
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: ORANGE }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* CTA Button */}
                    <Button
                      className="w-full max-w-xs text-white font-semibold py-3 rounded-full shadow-md hover:opacity-90"
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

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            size="lg"
            className="px-8"
          >
            Continue
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProjectTypeSelection;
