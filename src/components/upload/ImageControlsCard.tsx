import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, RefreshCw, Trash2, ArrowRight } from "lucide-react";
import { UploadTile } from "@/types/upload";

interface ImageControlsCardProps {
  tile: UploadTile | null;
  onAccept: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  canContinue: boolean;
  onContinue: () => void;
}

export function ImageControlsCard({ 
  tile, 
  onAccept, 
  onRegenerate, 
  onDelete,
  canContinue,
  onContinue,
}: ImageControlsCardProps) {
  const canAccept = tile?.status === "ready" && !tile.accepted;
  // Allow regenerate for both ready and failed tiles
  const canRegenerate = tile?.status === "ready" || tile?.status === "failed";
  const isProcessing = tile?.status === "uploading" || tile?.status === "generating";

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
            <p className="text-xs text-green-600 font-medium text-center pt-2">
              ✓ Image accepted
            </p>
          )}
        </div>
      )}

      {/* Continue to Review Button */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <Button 
          onClick={onContinue}
          size="lg"
          className="w-full"
          disabled={!canContinue}
        >
          Continue to Review
          <ArrowRight className="ml-2 w-5 h-5" />
        </Button>
        {!canContinue && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Accept all ready images to continue
          </p>
        )}
      </div>
    </Card>
  );
}
