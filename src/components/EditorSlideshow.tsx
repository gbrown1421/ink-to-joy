import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  Share2,
  Printer,
} from "lucide-react";
import { ProcessedImage } from "@/pages/Editor";
import { backgroundCategories } from "@/data/backgrounds";
import { convertToColoringPage, downloadImage } from "@/utils/imageProcessing";
import { toast } from "sonner";
import { Slider } from "./ui/slider";
import { Label } from "./ui/label";

interface EditorSlideshowProps {
  images: ProcessedImage[];
  onUpdateImages: (images: ProcessedImage[]) => void;
  lineThickness: number;
  bookName: string;
}

export const EditorSlideshow = ({
  images,
  onUpdateImages,
  lineThickness: initialThickness,
  bookName,
}: EditorSlideshowProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showFullSize, setShowFullSize] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [adjustedThickness, setAdjustedThickness] = useState(initialThickness);
  const [isReconverting, setIsReconverting] = useState(false);

  const currentImage = images[currentIndex];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handleMoveLeft = () => {
    if (currentIndex === 0) return;
    const newImages = [...images];
    [newImages[currentIndex], newImages[currentIndex - 1]] = [
      newImages[currentIndex - 1],
      newImages[currentIndex],
    ];
    onUpdateImages(newImages);
    setCurrentIndex(currentIndex - 1);
    toast.success("Page moved left");
  };

  const handleMoveRight = () => {
    if (currentIndex === images.length - 1) return;
    const newImages = [...images];
    [newImages[currentIndex], newImages[currentIndex + 1]] = [
      newImages[currentIndex + 1],
      newImages[currentIndex],
    ];
    onUpdateImages(newImages);
    setCurrentIndex(currentIndex + 1);
    toast.success("Page moved right");
  };

  const handleRedoConversion = async () => {
    setIsReconverting(true);
    try {
      const response = await fetch(currentImage.original);
      const blob = await response.blob();
      const file = new File([blob], currentImage.fileName, { type: blob.type });
      
      const newColoringPage = await convertToColoringPage(file, adjustedThickness);
      
      const newImages = [...images];
      newImages[currentIndex] = {
        ...newImages[currentIndex],
        coloringPage: newColoringPage,
      };
      onUpdateImages(newImages);
      toast.success("Conversion redone successfully!");
    } catch (error) {
      toast.error("Failed to redo conversion");
    } finally {
      setIsReconverting(false);
    }
  };

  const handleApplyBackground = () => {
    if (!selectedBackground) return;
    
    const newImages = [...images];
    newImages[currentIndex] = {
      ...newImages[currentIndex],
      backgroundId: selectedBackground,
    };
    onUpdateImages(newImages);
    toast.success("Background applied!");
    setEditingIndex(null);
  };

  const handleFinalize = () => {
    toast.success("Coloring book finalized! Ready to share or print.");
  };

  const handleDownloadAll = () => {
    images.forEach((image, index) => {
      downloadImage(image.coloringPage, `${bookName}-page-${index + 1}.png`);
    });
    toast.success(`Downloaded ${images.length} pages!`);
  };

  return (
    <div className="space-y-6">
      {/* Slideshow Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="p-6 shadow-card">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  Page {currentIndex + 1} of {images.length}
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevious}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleNext}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div
                className="relative aspect-[3/4] bg-white rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowFullSize(true)}
              >
                <img
                  src={currentImage.coloringPage}
                  alt={`Page ${currentIndex + 1}`}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingIndex(currentIndex)}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Redo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditingIndex(currentIndex)}
                  className="w-full"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Background
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMoveLeft}
                  disabled={currentIndex === 0}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Move Left
                </Button>
                <Button
                  variant="outline"
                  onClick={handleMoveRight}
                  disabled={currentIndex === images.length - 1}
                  className="w-full"
                >
                  Move Right
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button onClick={handleFinalize} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  Finalize
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Thumbnail Grid */}
        <div>
          <Card className="p-4 shadow-card">
            <h3 className="text-lg font-semibold mb-4">All Pages</h3>
            <ScrollArea className="h-[500px]">
              <div className="grid grid-cols-2 gap-3">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                      index === currentIndex
                        ? "border-primary shadow-md"
                        : "border-transparent hover:border-primary/50"
                    }`}
                    onClick={() => setCurrentIndex(index)}
                  >
                    <img
                      src={image.coloringPage}
                      alt={`Page ${index + 1}`}
                      className="w-full h-full object-cover bg-white"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <p className="text-white text-xs font-medium">Page {index + 1}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="p-6 shadow-card">
        <div className="flex flex-wrap gap-4 justify-center">
          <Button onClick={handleDownloadAll} size="lg">
            <Download className="w-5 h-5 mr-2" />
            Download All Pages
          </Button>
          <Button variant="outline" size="lg">
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="lg">
            <Printer className="w-5 h-5 mr-2" />
            Print Services
          </Button>
        </div>
      </Card>

      {/* Full Size Dialog */}
      <Dialog open={showFullSize} onOpenChange={setShowFullSize}>
        <DialogContent className="max-w-4xl">
          <img
            src={currentImage.coloringPage}
            alt="Full size"
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editingIndex !== null} onOpenChange={() => setEditingIndex(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <Tabs defaultValue="thickness" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="thickness">Adjust Lines</TabsTrigger>
              <TabsTrigger value="background">Change Background</TabsTrigger>
            </TabsList>

            <TabsContent value="thickness" className="space-y-4">
              <div className="space-y-4">
                <Label>Line Thickness: {adjustedThickness.toFixed(1)}</Label>
                <Slider
                  value={[adjustedThickness]}
                  onValueChange={(value) => setAdjustedThickness(value[0])}
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full"
                />
                <Button
                  onClick={handleRedoConversion}
                  disabled={isReconverting}
                  className="w-full"
                >
                  {isReconverting ? "Converting..." : "Apply New Thickness"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="background">
              <ScrollArea className="h-[500px]">
                <div className="space-y-6">
                  {backgroundCategories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {category.backgrounds.map((bg) => (
                          <div
                            key={bg.id}
                            className={`relative aspect-[4/5] rounded-lg overflow-hidden cursor-pointer border-2 transition-all ${
                              selectedBackground === bg.id
                                ? "border-primary shadow-md"
                                : "border-transparent hover:border-primary/50"
                            }`}
                            onClick={() => setSelectedBackground(bg.id)}
                          >
                            <img
                              src={bg.url}
                              alt={bg.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button
                onClick={handleApplyBackground}
                disabled={!selectedBackground}
                className="w-full mt-4"
              >
                Apply Background
              </Button>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};
