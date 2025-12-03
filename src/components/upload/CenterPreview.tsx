import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, ImageIcon } from "lucide-react";
import { UploadTile } from "@/types/upload";

interface CenterPreviewProps {
  tile: UploadTile | null;
  onOpenTroubleshooting: () => void;
}

export function CenterPreview({ tile, onOpenTroubleshooting }: CenterPreviewProps) {
  if (!tile) {
    return (
      <Card className="flex-1 flex items-center justify-center bg-muted/30 min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select an image to preview</p>
          <p className="text-sm mt-1">Or upload photos to get started</p>
        </div>
      </Card>
    );
  }

  const isProcessing = tile.status === "uploading" || tile.status === "generating";

  return (
    <Card className={`flex-1 overflow-hidden relative min-h-[400px] ${
      tile.accepted ? "ring-2 ring-green-500" : ""
    }`}>
      {/* Processing State */}
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-16 h-16 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">
            {tile.status === "uploading" ? "Uploading..." : "Generating coloring page..."}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This may take a moment
          </p>
        </div>
      )}

      {/* Failed State */}
      {tile.status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 z-10 p-6">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <p className="text-xl text-destructive font-semibold text-center mb-2">
            We couldn't read this image file.
          </p>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            Some photos use special formats our system can't decode.
          </p>
          <Button
            variant="outline"
            size="lg"
            onClick={onOpenTroubleshooting}
          >
            How do I fix this?
          </Button>
        </div>
      )}

      {/* Ready State - Show Image */}
      {tile.status === "ready" && tile.coloringImageUrl && (
        <img
          src={tile.coloringImageUrl}
          alt="Coloring page preview"
          className="w-full h-full object-contain"
          style={{ imageRendering: 'crisp-edges' }}
        />
      )}

      {/* Accepted Badge */}
      {tile.accepted && tile.status === "ready" && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          ✓ Accepted
        </div>
      )}
    </Card>
  );
}
