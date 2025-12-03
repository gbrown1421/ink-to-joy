import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, ImageIcon } from "lucide-react";
import { UploadTile } from "@/types/upload";
import { Button } from "@/components/ui/button";

interface TilePreviewProps {
  tile: UploadTile | null;
  onOpenTroubleshooting: () => void;
}

export function TilePreview({ tile, onOpenTroubleshooting }: TilePreviewProps) {
  if (!tile) {
    return (
      <Card className="aspect-[3/4] flex items-center justify-center bg-muted/30">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Select an image to preview</p>
        </div>
      </Card>
    );
  }

  const isProcessing = tile.status === "uploading" || tile.status === "generating";

  return (
    <Card className={`aspect-[3/4] overflow-hidden relative ${
      tile.accepted ? "ring-2 ring-green-500" : ""
    }`}>
      {isProcessing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">
            {tile.status === "uploading" ? "Uploading..." : "Generating coloring page..."}
          </p>
        </div>
      )}

      {tile.status === "failed" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10 p-4">
          <AlertCircle className="w-12 h-12 text-destructive mb-4" />
          <p className="text-destructive font-medium text-center mb-2">
            We couldn't read this image file.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTroubleshooting}
          >
            How do I fix this?
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-4 px-4">
            Some photos use special formats our system can't decode. Click "How do I fix this?" for quick steps to repair and re-upload.
          </p>
        </div>
      )}

      {tile.status === "ready" && tile.coloringImageUrl && (
        <img
          src={tile.coloringImageUrl}
          alt="Coloring page preview"
          className="w-full h-full object-contain"
          style={{ imageRendering: 'crisp-edges' }}
        />
      )}

      {tile.accepted && (
        <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs font-medium">
          Accepted
        </div>
      )}
    </Card>
  );
}
