import { useState } from "react";
import { ImageUploader } from "@/components/ImageUploader";
import { ColoringGallery } from "@/components/ColoringGallery";
import { convertToColoringPage, downloadImage } from "@/utils/imageProcessing";
import { toast } from "sonner";
import { Palette, Sparkles } from "lucide-react";

interface ProcessedImage {
  original: string;
  coloringPage: string;
  fileName: string;
}

const Index = () => {
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleImagesUploaded = async (files: File[]) => {
    setIsProcessing(true);
    const toastId = toast.loading(`Converting ${files.length} image(s)...`);

    try {
      const processed: ProcessedImage[] = [];

      for (const file of files) {
        const original = URL.createObjectURL(file);
        const coloringPage = await convertToColoringPage(file);
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

  const handleDownload = (index: number) => {
    const image = processedImages[index];
    downloadImage(image.coloringPage, image.fileName);
    toast.success("Coloring page downloaded!");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-creative bg-clip-text text-transparent">
                Coloring Book Creator
              </h1>
              <p className="text-sm text-muted-foreground">
                Transform your photos into beautiful coloring pages
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 space-y-12">
        {/* Hero Section */}
        <section className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 text-accent-foreground text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Create Custom Coloring Books</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold max-w-3xl mx-auto">
            Turn Your Memories Into
            <span className="bg-gradient-creative bg-clip-text text-transparent">
              {" "}Art to Color
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload your favorite photos and we'll convert them into printable coloring pages.
            Perfect for kids, gifts, or creative relaxation!
          </p>
        </section>

        {/* Upload Section */}
        <section>
          <ImageUploader onImagesUploaded={handleImagesUploaded} />
        </section>

        {/* Gallery Section */}
        {processedImages.length > 0 && (
          <section>
            <ColoringGallery images={processedImages} onDownload={handleDownload} />
          </section>
        )}

        {/* Processing Indicator */}
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

export default Index;
