import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";

interface ImageUploaderProps {
  onImagesUploaded: (files: File[]) => void;
}

export const ImageUploader = ({ onImagesUploaded }: ImageUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      toast.error("Please upload image files only");
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} image(s) added`);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    toast.success(`${files.length} image(s) added`);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConvert = () => {
    if (selectedFiles.length === 0) {
      toast.error("Please add some images first");
      return;
    }
    onImagesUploaded(selectedFiles);
  };

  return (
    <div className="space-y-6">
      <Card
        className={`border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gradient-creative flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Upload Your Photos</h3>
          <p className="text-muted-foreground mb-4">
            Drag and drop images here, or click to browse
          </p>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileInput}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button variant="outline" className="cursor-pointer" asChild>
              <span>Choose Files</span>
            </Button>
          </label>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">
              Selected Images ({selectedFiles.length})
            </h3>
            <Button onClick={handleConvert} className="bg-gradient-creative border-0">
              Convert to Coloring Pages
            </Button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <Card key={index} className="relative group overflow-hidden shadow-card">
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-32 object-cover"
                />
                <div className="p-2">
                  <p className="text-xs text-muted-foreground truncate">
                    {file.name}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
