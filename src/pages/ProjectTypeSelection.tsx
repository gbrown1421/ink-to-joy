import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Sparkles, Smile, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProjectTypeSelection = () => {
  const [selectedType, setSelectedType] = useState<"coloring" | "toon" | null>(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (selectedType) {
      navigate(`/difficulty/${selectedType}`);
    }
  };

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

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card
            className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
              selectedType === "coloring"
                ? "ring-2 ring-primary shadow-card"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedType("coloring")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">Coloring Book</h3>
              <p className="text-muted-foreground">
                Realistic line art perfect for detailed coloring
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left w-full">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Professional line art conversion</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Maintains photo details and features</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Perfect for family photos and pets</span>
                </li>
              </ul>
            </div>
          </Card>

          <Card
            className={`p-8 cursor-pointer transition-all hover:shadow-xl ${
              selectedType === "toon"
                ? "ring-2 ring-primary shadow-card"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedType("toon")}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <Smile className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold">Cartoon / Caricature Book</h3>
              <p className="text-muted-foreground">
                Fun cartoon-style illustrations with expressive features
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 text-left w-full">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Cartoon caricature conversion</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Playful and kid-friendly style</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                  <span>Bold outlines and expressive eyes</span>
                </li>
              </ul>
            </div>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleContinue}
            disabled={!selectedType}
            size="lg"
            className="px-8"
          >
            Continue
            <Sparkles className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default ProjectTypeSelection;
