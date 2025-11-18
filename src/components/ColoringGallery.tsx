import { Download, Palette } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ColoringGalleryProps {
  images: { original: string; coloringPage: string; fileName: string }[];
  onDownload: (index: number) => void;
}

export const ColoringGallery = ({ images, onDownload }: ColoringGalleryProps) => {
  if (images.length === 0) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-creative flex items-center justify-center">
          <Palette className="w-5 h-5 text-primary-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Your Coloring Pages</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {images.map((image, index) => (
          <Card key={index} className="overflow-hidden shadow-card hover:shadow-xl transition-shadow">
            <div className="grid grid-cols-2 gap-0">
              <div className="relative">
                <img
                  src={image.original}
                  alt="Original"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium">Original</p>
                </div>
              </div>
              <div className="relative">
                <img
                  src={image.coloringPage}
                  alt="Coloring page"
                  className="w-full h-48 object-cover bg-white"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium">Coloring Page</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <p className="text-sm font-medium truncate">{image.fileName}</p>
              <Button
                onClick={() => onDownload(index)}
                className="w-full"
                variant="outline"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Page
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
