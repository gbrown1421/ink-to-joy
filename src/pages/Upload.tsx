import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload as UploadIcon, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";
import { ImageTroubleshootingModal } from "@/components/ImageTroubleshootingModal";
import { useUploadTiles } from "@/hooks/useUploadTiles";
import { VerticalFilmstrip } from "@/components/upload/VerticalFilmstrip";
import { CenterPreview } from "@/components/upload/CenterPreview";
import { ImageControlsCard } from "@/components/upload/ImageControlsCard";

const Upload = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookName, difficulty } = location.state || { bookName: "Untitled Book", difficulty: "beginner" };

  const [projectType, setProjectType] = useState<"coloring" | "toon">("coloring");
  const [showTroubleshootingModal, setShowTroubleshootingModal] = useState(false);

  const {
    tiles,
    selectedTileId,
    selectedTile,
    isProcessing,
    canContinue,
    addFiles,
    acceptTile,
    regenerateTile,
    deleteTile,
    selectTile,
  } = useUploadTiles(bookId);

  useEffect(() => {
    loadBookDetails();
  }, [bookId]);

  const loadBookDetails = async () => {
    if (!bookId) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('project_type, difficulty')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      if (data) {
        setProjectType(data.project_type as "coloring" | "toon");
      }
    } catch (error) {
      console.error('Error loading book details:', error);
      toast.error('Failed to load book details');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!bookId) return;
    await addFiles(acceptedFiles);
  }, [bookId, addFiles]);

  const handleNavigate = useCallback((direction: "up" | "down") => {
    if (tiles.length === 0) return;
    
    const currentIndex = tiles.findIndex(t => t.id === selectedTileId);
    let newIndex: number;
    
    if (direction === "up") {
      newIndex = currentIndex <= 0 ? tiles.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= tiles.length - 1 ? 0 : currentIndex + 1;
    }
    
    selectTile(tiles[newIndex].id);
  }, [tiles, selectedTileId, selectTile]);

  const handleContinue = () => {
    if (!canContinue) {
      if (tiles.some(t => t.status === "generating" || t.status === "uploading")) {
        toast.error("Please wait for all images to finish processing");
      } else if (tiles.some(t => !t.accepted && t.status === "ready")) {
        toast.error("Please accept all images before continuing");
      } else if (tiles.length === 0) {
        toast.error("Please upload at least one image");
      }
      return;
    }

    navigate(`/review/${bookId}`, { state: { bookName, difficulty } });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
  });

  const readyCount = tiles.filter(t => t.status === "ready").length;
  const acceptedCount = tiles.filter(t => t.accepted).length;
  const processingCount = tiles.filter(t => 
    t.status === "uploading" || t.status === "generating"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{bookName}</h1>
                <p className="text-sm text-muted-foreground">Step 2: Upload Photos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProjectTypeBadge projectType={projectType} />
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

      {/* Main Content - 3 Column Layout with fixed viewport height */}
      <main className="flex overflow-hidden" style={{ height: 'calc(100vh - 73px)' }}>
        {/* Left Column - Vertical Filmstrip */}
        <div className="border-r border-border/50 bg-card/30">
          <VerticalFilmstrip
            tiles={tiles}
            selectedTileId={selectedTileId}
            onSelectTile={selectTile}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Center Column - Preview */}
        <div className="flex-1 p-6 flex flex-col min-h-0">
          <CenterPreview
            tile={selectedTile}
            onOpenTroubleshooting={() => setShowTroubleshootingModal(true)}
          />
        </div>

        {/* Right Column - Controls & Status */}
        <div className="w-[300px] border-l border-border/50 bg-card/30 p-4 flex flex-col gap-4 overflow-y-auto">
          {/* Upload Area */}
          <Card 
            {...getRootProps()} 
            className={`p-6 border-2 border-dashed cursor-pointer transition-all ${
              isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3 text-center">
              <UploadIcon className="w-10 h-10 text-muted-foreground" />
              <div>
                <h3 className="font-semibold mb-1">
                  {isDragActive ? "Drop here..." : "Add Photos"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Drag & drop or click to select
                </p>
              </div>
            </div>
          </Card>

          {/* Status Summary */}
          {tiles.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Status</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-medium">{tiles.length}</span>
                </div>
                {processingCount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Processing</span>
                    <span className="text-yellow-600 font-medium">{processingCount}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ready</span>
                  <span className="font-medium">{readyCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Accepted</span>
                  <span className="text-green-600 font-medium">{acceptedCount}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Image Controls with Continue Button */}
          <ImageControlsCard
            tile={selectedTile}
            onAccept={() => selectedTileId && acceptTile(selectedTileId)}
            onRegenerate={() => selectedTileId && regenerateTile(selectedTileId)}
            onDelete={() => selectedTileId && deleteTile(selectedTileId)}
            canContinue={canContinue}
            onContinue={handleContinue}
          />
        </div>
      </main>

      <ImageTroubleshootingModal 
        open={showTroubleshootingModal}
        onClose={() => setShowTroubleshootingModal(false)}
      />
    </div>
  );
};

export default Upload;
