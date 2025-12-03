import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { UploadTile } from "@/types/upload";

interface TileGridProps {
  tiles: UploadTile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
}

export function TileGrid({ tiles, selectedTileId, onSelectTile }: TileGridProps) {
  if (tiles.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
      {tiles.map(tile => (
        <Card
          key={tile.id}
          onClick={() => onSelectTile(tile.id)}
          className={`aspect-square cursor-pointer overflow-hidden relative transition-all ${
            selectedTileId === tile.id
              ? "ring-2 ring-orange-500 ring-offset-2"
              : ""
          } ${
            tile.accepted
              ? "ring-2 ring-green-500"
              : ""
          }`}
        >
          {/* Thumbnail content */}
          {tile.status === "ready" && tile.coloringImageUrl ? (
            <img
              src={tile.coloringImageUrl}
              alt="Thumbnail"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              {(tile.status === "uploading" || tile.status === "generating") && (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              )}
              {tile.status === "failed" && (
                <AlertCircle className="w-6 h-6 text-destructive" />
              )}
            </div>
          )}

          {/* Status indicators */}
          {tile.accepted && (
            <div className="absolute top-1 right-1">
              <CheckCircle2 className="w-4 h-4 text-green-500 fill-white" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
