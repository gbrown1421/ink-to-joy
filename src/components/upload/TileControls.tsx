import { Button } from "@/components/ui/button";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import { UploadTile } from "@/types/upload";

interface TileControlsProps {
  tile: UploadTile | null;
  onAccept: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export function TileControls({ tile, onAccept, onRegenerate, onDelete }: TileControlsProps) {
  if (!tile) {
    return (
      <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground text-center">
          Select an image to see controls
        </p>
      </div>
    );
  }

  const canAccept = tile.status === "ready" && !tile.accepted;
  const canRegenerate = tile.status === "ready" || tile.status === "failed";
  const isProcessing = tile.status === "uploading" || tile.status === "generating";

  return (
    <div className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg">
      <h3 className="font-medium text-sm">Image Controls</h3>
      
      <Button
        onClick={onAccept}
        disabled={!canAccept || isProcessing}
        className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        <Check className="w-4 h-4 mr-2" />
        Accept
      </Button>

      <Button
        onClick={onRegenerate}
        disabled={!canRegenerate || isProcessing}
        className="w-full justify-start bg-yellow-600 hover:bg-yellow-700 text-white"
        size="sm"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        New Image
      </Button>

      <Button
        onClick={onDelete}
        disabled={isProcessing}
        variant="destructive"
        className="w-full justify-start"
        size="sm"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Delete
      </Button>

      {tile.accepted && (
        <p className="text-xs text-green-600 font-medium text-center mt-2">
          ✓ Image accepted
        </p>
      )}
    </div>
  );
}
