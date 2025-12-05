import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Palette, ArrowRight, Home, ArrowLeft, CheckCircle2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import wideFrame from "@/assets/wide-frame.png";
import orangeTileBg from "@/assets/orange-tile-bg.png";

const ORANGE = "#FF7A3C";

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
    <div className="min-h-screen bg-gray-100">
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

      {/* Orange banner line */}
      <div className="w-full h-2" style={{ backgroundColor: ORANGE }} />

      {/* Full-width Orange Banner with content */}
      <div 
        className="w-full relative"
        style={{
          backgroundImage: `url(${orangeTileBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Text section with padding */}
        <div className="relative container mx-auto px-4 pt-12 pb-8 max-w-5xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-3 text-white">Select Difficulty Level</h2>
            <p className="text-white/90 text-lg">
              Choose the complexity that's right for your audience
            </p>
          </div>
        </div>

        {/* Difficulty tiles */}
        <div className="relative container mx-auto px-4 pb-16 max-w-6xl">
          <div className={`grid gap-6 justify-items-center ${
            difficulties.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'
          }`}>
            {difficulties.map((difficulty) => {
              const isSelected = selectedDifficulty === difficulty.id;
              
              return (
                <div
                  key={difficulty.id}
                  className={`relative cursor-pointer transition-all duration-300 ${
                    isSelected ? "scale-[1.02]" : "hover:scale-[1.01]"
                  }`}
                  onClick={() => setSelectedDifficulty(difficulty.id)}
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
                    <div className="absolute inset-[15%] flex flex-col items-center justify-center text-center p-3">
                      {/* Sample Image */}
                      <img 
                        src={difficulty.sampleImage} 
                        alt={`${difficulty.name} sample`}
                        className="w-24 h-24 object-cover rounded-lg mb-3"
                        style={{ border: `3px solid ${ORANGE}` }}
                      />

                      {/* Title with radio indicator */}
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-bold text-gray-900">{difficulty.name}</h3>
                        <div className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0" style={{ borderColor: ORANGE }}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ORANGE }} />
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {difficulty.description}
                      </p>

                      {/* Details */}
                      <div className="flex flex-col gap-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: ORANGE }} />
                          Age: {difficulty.ageRange}
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: ORANGE }} />
                          {difficulty.detailLevel}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Name input and continue section */}
      <div className="bg-gray-100 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
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
            </div>

            <Button 
              onClick={handleContinue} 
              size="lg"
              disabled={isCreating}
              className="text-white font-semibold rounded-full shadow-md hover:opacity-90 px-8 h-12"
              style={{ backgroundColor: ORANGE }}
            >
              {isCreating ? "Creating..." : "Continue to Upload"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DifficultySelection;
