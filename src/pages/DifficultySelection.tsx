import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowRight, Home, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type DifficultyLevel = "Quick and Easy" | "Beginner" | "Intermediate";
export type ToonDifficultyLevel = "Quick and Easy" | "Adv Beginner";

interface DifficultyOption {
  id: DifficultyLevel | ToonDifficultyLevel;
  name: string;
  description: string;
  ageRange: string;
  detailLevel: string;
  sampleImage: string;
}

const coloringDifficulties: DifficultyOption[] = [
  {
    id: "Quick and Easy",
    name: "Quick and Easy",
    description: "Ultra thick bold outlines, removes entire background",
    ageRange: "3-6 years",
    detailLevel: "3-6 sections",
    sampleImage: "/images/difficulty-samples/difficulty-quick-sample.jpg"
  },
  {
    id: "Beginner",
    name: "Beginner",
    description: "Medium lines with simple backgrounds, 2-3 large elements",
    ageRange: "7-10 years",
    detailLevel: "7-12 sections",
    sampleImage: "/images/difficulty-samples/difficulty-beginner-sample.jpg"
  },
  {
    id: "Intermediate",
    name: "Intermediate",
    description: "Fuller scene with recognizable background details",
    ageRange: "11-15 years",
    detailLevel: "13-20 sections",
    sampleImage: "/images/difficulty-samples/difficulty-intermediate-sample.jpg"
  }
];

const toonDifficulties: DifficultyOption[] = [
  {
    id: "Quick and Easy",
    name: "Quick and Easy",
    description: "Simple, clean 2D cartoon with flat colors and minimal background",
    ageRange: "3-6 years",
    detailLevel: "Very simple",
    sampleImage: "/images/difficulty-samples/difficulty-quick-sample.jpg"
  },
  {
    id: "Adv Beginner",
    name: "Adv Beginner",
    description: "Richer cartoon with recognizable scene and simple shading",
    ageRange: "7-10 years",
    detailLevel: "More detailed",
    sampleImage: "/images/difficulty-samples/difficulty-beginner-sample.jpg"
  }
];

const DifficultySelection = () => {
  const navigate = useNavigate();
  const { type } = useParams();
  const projectType = (type as "coloring" | "toon") || "coloring";
  
  const difficulties = projectType === "toon" ? toonDifficulties : coloringDifficulties;
  const defaultDifficulty = projectType === "toon" ? "Quick and Easy" : "Beginner";
  
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>(defaultDifficulty);
  const [bookName, setBookName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleContinue = async () => {
    if (!bookName.trim()) {
      toast.error("Please enter a name for your coloring book");
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-book', {
        body: { name: bookName.trim(), difficulty: selectedDifficulty, projectType }
      });

      if (error) throw error;

      toast.success("Book created! Now upload your photos.");
      navigate(`/upload/${data.bookId}`, {
        state: { bookName: bookName.trim(), difficulty: selectedDifficulty }
      });
    } catch (error) {
      console.error('Error creating book:', error);
      toast.error("Failed to create book. Please try again.");
    } finally {
      setIsCreating(false);
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
                <h1 className="text-2xl font-bold">
                  Create New {projectType === "toon" ? "Cartoon Book" : "Coloring Book"}
                </h1>
                <p className="text-sm text-muted-foreground">Step 1: Choose difficulty and name</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/project-type')}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <section className="space-y-4">
            <Label htmlFor="bookName" className="text-lg font-semibold">
              {projectType === "toon" ? "Cartoon Book" : "Coloring Book"} Name
            </Label>
            <Input
              id="bookName"
              placeholder={projectType === "toon" ? "My Amazing Cartoon Book" : "My Amazing Coloring Book"}
              value={bookName}
              onChange={(e) => setBookName(e.target.value)}
              className="text-lg h-12"
            />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold">Select Difficulty Level</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {difficulties.map((difficulty) => (
                <Card
                  key={difficulty.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    selectedDifficulty === difficulty.id
                      ? "ring-2 ring-primary shadow-card"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedDifficulty(difficulty.id)}
                >
                  <div className="space-y-3">
                    <img 
                      src={difficulty.sampleImage} 
                      alt={`${difficulty.name} sample`}
                      className="w-24 h-24 mx-auto object-cover rounded-lg border border-border/50"
                    />
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold">{difficulty.name}</h3>
                      <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center">
                        {selectedDifficulty === difficulty.id && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{difficulty.description}</p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Age: {difficulty.ageRange}</span>
                      <span>•</span>
                      <span>{difficulty.detailLevel}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <div className="flex justify-end">
            <Button 
              onClick={handleContinue} 
              size="lg"
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Continue to Upload"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DifficultySelection;
