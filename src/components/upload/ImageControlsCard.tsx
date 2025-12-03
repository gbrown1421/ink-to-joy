import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, RefreshCw, Trash2 } from "lucide-react";
import { UploadTile } from "@/types/upload";

interface ImageControlsCardProps {
  tile: UploadTile | null;
  onAccept: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}

export function ImageControlsCard({ tile, onAccept, onRegenerate, onDelete }: ImageControlsCardProps) {
  const canAccept = tile?.status === "ready" && !tile.accepted;
  const canRegenerate = tile?.status === "ready";
  const isProcessing = tile?.status === "uploading" || tile?.status === "generating";
  const isFailed = tile?.status === "failed";

  return (
    <Card className="p-4">
      <h3 className="font-semibold text-sm mb-3">Image Controls</h3>
      
      {!tile ? (
        <p className="text-sm text-muted-foreground">
          Select an image to see controls
        </p>
      ) : (
        <div className="space-y-2">
          <Button
            onClick={onAccept}
            disabled={!canAccept || isProcessing || isFailed}
            className="w-full justify-start bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Check className="w-4 h-4 mr-2" />
            Accept
          </Button>

          <Button
            onClick={onRegenerate}
            disabled={!canRegenerate || isProcessing || isFailed}
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
            <p className="text-xs text-green-600 font-medium text-center pt-2">
              ✓ Image accepted
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
