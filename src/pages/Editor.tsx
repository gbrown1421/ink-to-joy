import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ImageUploader } from "@/components/ImageUploader";
import { EditorSlideshow } from "@/components/EditorSlideshow";
import { convertToColoringPage } from "@/utils/imageProcessing";
import { toast } from "sonner";
import { Palette, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProcessedImage {
  original: string;
  coloringPage: string;
  fileName: string;
  backgroundId?: string;
}

const Editor = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { difficulty, bookName, lineThickness } = location.state || {
    difficulty: "medium",
    bookName: "My Coloring Book",
    lineThickness: 3
  };

  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImagesUploaded = async (files: File[]) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Converting ${files.length} image(s)...`);

    try {
      const processed: ProcessedImage[] = [];

      for (const file of files) {
        const original = URL.createObjectURL(file);
        const coloringPage = await convertToColoringPage(file, lineThickness);
        processed.push({
          original,
          coloringPage,
          fileName: file.name,
        });
      }

      setProcessedImages(prev => [...prev, ...processed]);
      toast.success(`Successfully converted ${files.length} image(s)!`, {
        id: toastId,
      });
    } catch (error) {
      console.error("Error processing images:", error);
      toast.error("Failed to process some images", { id: toastId });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateImages = (images: ProcessedImage[]) => {
    setProcessedImages(images);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/create')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{bookName}</h1>
                <p className="text-xs text-muted-foreground capitalize">
                  {difficulty} difficulty
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {processedImages.length === 0 ? (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-2">Upload Your Photos</h2>
              <p className="text-muted-foreground">
                Add up to 20 photos to create your coloring book
              </p>
            </div>
            <ImageUploader onImagesUploaded={handleImagesUploaded} maxFiles={20} />
          </section>
        ) : (
          <EditorSlideshow
            images={processedImages}
            onUpdateImages={handleUpdateImages}
            lineThickness={lineThickness}
            bookName={bookName}
          />
        )}

        {isProcessing && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card p-8 rounded-2xl shadow-card space-y-4 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-creative animate-pulse" />
              <p className="text-lg font-semibold">Processing your images...</p>
              <p className="text-sm text-muted-foreground">This may take a moment</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Editor;
