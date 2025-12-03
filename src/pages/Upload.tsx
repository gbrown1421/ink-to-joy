import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload as UploadIcon, ArrowRight, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";
import { ImageTroubleshootingModal } from "@/components/ImageTroubleshootingModal";
import { useUploadTiles } from "@/hooks/useUploadTiles";
import { TileGrid } from "@/components/upload/TileGrid";
import { TilePreview } from "@/components/upload/TilePreview";
import { TileControls } from "@/components/upload/TileControls";

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
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{bookName}</h1>
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

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-6">
          {/* Left Panel - Controls */}
          <div className="space-y-4">
            <TileControls
              tile={selectedTile}
              onAccept={() => selectedTileId && acceptTile(selectedTileId)}
              onRegenerate={() => selectedTileId && regenerateTile(selectedTileId)}
              onDelete={() => selectedTileId && deleteTile(selectedTileId)}
            />
          </div>

          {/* Center Panel - Preview */}
          <div className="space-y-4">
            <TilePreview
              tile={selectedTile}
              onOpenTroubleshooting={() => setShowTroubleshootingModal(true)}
            />

            {/* Filmstrip / Tile Grid */}
            <TileGrid
              tiles={tiles}
              selectedTileId={selectedTileId}
              onSelectTile={selectTile}
            />
          </div>

          {/* Right Panel - Upload & Status */}
          <div className="space-y-4">
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
                <h3 className="font-medium text-sm mb-3">Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total</span>
                    <span>{tiles.length}</span>
                  </div>
                  {processingCount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Processing</span>
                      <span className="text-yellow-600">{processingCount}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ready</span>
                    <span>{readyCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Accepted</span>
                    <span className="text-green-600">{acceptedCount}</span>
                  </div>
                </div>
              </Card>
            )}

            {/* Continue Button */}
            <Button 
              onClick={handleContinue}
              size="lg"
              className="w-full"
              disabled={!canContinue}
            >
              Continue to Review
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>

            {tiles.length > 0 && !canContinue && (
              <p className="text-xs text-muted-foreground text-center">
                {isProcessing 
                  ? "Waiting for images to process..."
                  : acceptedCount < readyCount
                    ? "Accept all images to continue"
                    : "Add at least one image"
                }
              </p>
            )}
          </div>
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
