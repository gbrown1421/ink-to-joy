import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import { UploadTile } from "@/types/upload";
import { useRef, useEffect } from "react";

interface VerticalFilmstripProps {
  tiles: UploadTile[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  onNavigate: (direction: "up" | "down") => void;
}

export function VerticalFilmstrip({ 
  tiles, 
  selectedTileId, 
  onSelectTile,
  onNavigate 
}: VerticalFilmstripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Scroll selected tile into view
  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedTileId]);

  if (tiles.length === 0) {
    return (
      <div className="w-[250px] flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
        <p className="text-center">No photos yet</p>
        <p className="text-center text-xs mt-1">Upload photos to get started</p>
      </div>
    );
  }

  return (
    <div className="w-[250px] flex flex-col h-full">
      {/* Up Arrow */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none border-b border-border/50"
        onClick={() => onNavigate("up")}
        disabled={tiles.length === 0}
      >
        <ChevronUp className="w-5 h-5" />
      </Button>

      {/* Scrollable Filmstrip */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3"
      >
        {tiles.map(tile => {
          const isSelected = selectedTileId === tile.id;
          const isProcessing = tile.status === "uploading" || tile.status === "generating";
          const isFallback = tile.status === "fallback";
          
          return (
            <div
              key={tile.id}
              ref={isSelected ? selectedRef : null}
              onClick={() => onSelectTile(tile.id)}
              className={`
                relative cursor-pointer rounded-lg overflow-hidden transition-all
                ${isSelected ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background" : ""}
                ${tile.accepted && !isSelected ? "ring-2 ring-green-500" : ""}
                ${isFallback && !isSelected ? "ring-2 ring-blue-500" : ""}
              `}
            >
              <Card className={`aspect-[4/3] overflow-hidden ${isFallback ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                {/* Thumbnail content */}
                {tile.status === "ready" && tile.coloringImageUrl ? (
                  <img
                    src={tile.coloringImageUrl}
                    alt="Thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${isFallback ? "bg-blue-50 dark:bg-blue-950/20" : "bg-muted"}`}>
                    {(isProcessing || isFallback) && (
                      <Loader2 className={`w-8 h-8 animate-spin ${isFallback ? "text-blue-500" : "text-primary"}`} />
                    )}
                    {tile.status === "failed" && (
                      <AlertCircle className="w-8 h-8 text-destructive" />
                    )}
                  </div>
                )}

                {/* Status overlay indicators */}
                {tile.accepted && (
                  <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  </div>
                )}
              </Card>
            </div>
          );
        })}
      </div>

      {/* Down Arrow */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none border-t border-border/50"
        onClick={() => onNavigate("down")}
        disabled={tiles.length === 0}
      >
        <ChevronDown className="w-5 h-5" />
      </Button>
    </div>
  );
}
