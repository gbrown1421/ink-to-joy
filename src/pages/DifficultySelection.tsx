import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export type DifficultyLevel = "easy" | "medium" | "hard" | "advanced";

interface DifficultyOption {
  id: DifficultyLevel;
  name: string;
  description: string;
  ageRange: string;
  lineThickness: number;
  detailLevel: string;
}

const difficulties: DifficultyOption[] = [
  {
    id: "easy",
    name: "Quick and Easy",
    description: "Thick lines and simple patterns, perfect for young children",
    ageRange: "3-6 years",
    lineThickness: 4,
    detailLevel: "3-6 sections"
  },
  {
    id: "medium",
    name: "Beginner",
    description: "Medium lines with moderate detail",
    ageRange: "7-10 years",
    lineThickness: 3,
    detailLevel: "7-12 sections"
  },
  {
    id: "hard",
    name: "Intermediate",
    description: "Thinner lines with more intricate patterns",
    ageRange: "11-15 years",
    lineThickness: 2,
    detailLevel: "13-20 sections"
  },
  {
    id: "advanced",
    name: "Advanced",
    description: "Fine lines with detailed and intricate patterns",
    ageRange: "16+ years",
    lineThickness: 1.5,
    detailLevel: "20+ sections"
  }
];

const DifficultySelection = () => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>("medium");
  const [bookName, setBookName] = useState("");
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!bookName.trim()) {
      toast.error("Please enter a name for your coloring book");
      return;
    }

    navigate('/editor', {
      state: {
        difficulty: selectedDifficulty,
        bookName: bookName.trim(),
        lineThickness: difficulties.find(d => d.id === selectedDifficulty)?.lineThickness || 3
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create New Coloring Book</h1>
              <p className="text-sm text-muted-foreground">Step 1: Choose difficulty and name</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          <section className="space-y-4">
            <Label htmlFor="bookName" className="text-lg font-semibold">Coloring Book Name</Label>
            <Input
              id="bookName"
              placeholder="My Amazing Coloring Book"
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
            <Button onClick={handleContinue} size="lg">
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DifficultySelection;
