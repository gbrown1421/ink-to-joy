import { useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown, GripVertical, Check, AlertCircle } from "lucide-react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

export interface ReviewPage {
  id: string;
  coloring_image_url: string | null;
  border_style: string;
  heading_text: string;
  keep: boolean;
  page_order: number;
  status: string;
  accepted: boolean; // local UI state
}

interface ReviewFilmstripProps {
  pages: ReviewPage[];
  selectedPageId: string | null;
  onSelectPage: (page: ReviewPage) => void;
  onDragEnd: (result: DropResult) => void;
  onNavigate: (direction: "up" | "down") => void;
}

export function ReviewFilmstrip({
  pages,
  selectedPageId,
  onSelectPage,
  onDragEnd,
  onNavigate,
}: ReviewFilmstripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedTileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTileRef.current && scrollContainerRef.current) {
      selectedTileRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedPageId]);

  const getBorderClasses = (page: ReviewPage) => {
    const isSelected = page.id === selectedPageId;
    const isAccepted = page.accepted;
    const hasImage = !!page.coloring_image_url;

    if (!hasImage) {
      return "ring-2 ring-destructive/50 border-2 border-destructive/30";
    }
    if (isSelected && isAccepted) {
      return "ring-2 ring-orange-500 border-2 border-green-500";
    }
    if (isSelected) {
      return "ring-2 ring-orange-500 border-2 border-muted";
    }
    if (isAccepted) {
      return "border-2 border-green-500";
    }
    return "border-2 border-muted";
  };

  return (
    <div className="flex flex-col h-full w-[220px] bg-card rounded-lg border border-border">
      {/* Up navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none rounded-t-lg"
        onClick={() => onNavigate("up")}
        disabled={pages.length === 0}
      >
        <ChevronUp className="w-5 h-5" />
      </Button>

      {/* Scrollable filmstrip */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-2"
      >
        {pages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No pages to display
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="review-pages">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2"
                >
                  {pages.map((page, index) => (
                    <Draggable key={page.id} draggableId={page.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={(el) => {
                            provided.innerRef(el);
                            if (page.id === selectedPageId) {
                              (selectedTileRef as any).current = el;
                            }
                          }}
                          {...provided.draggableProps}
                          className={`relative rounded-lg overflow-hidden cursor-pointer transition-all bg-background ${getBorderClasses(page)} ${
                            snapshot.isDragging ? "shadow-lg scale-105" : ""
                          }`}
                          onClick={() => onSelectPage(page)}
                        >
                          {/* Square thumbnail area */}
                          <div className="relative aspect-square w-full bg-muted/30">
                            {page.coloring_image_url ? (
                              <img
                                src={page.coloring_image_url}
                                alt={`Page ${index + 1}`}
                                className="w-full h-full object-contain p-1"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <AlertCircle className="w-8 h-8 text-destructive" />
                              </div>
                            )}
                            
                            {/* Drag handle overlay */}
                            <div 
                              {...provided.dragHandleProps} 
                              className="absolute top-1 left-1 p-1 bg-background/80 rounded cursor-grab hover:bg-background"
                            >
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            
                            {/* Accepted badge */}
                            {page.accepted && page.coloring_image_url && (
                              <div className="absolute top-1 right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-sm">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          
                          {/* Page info below thumbnail */}
                          <div className="p-2 border-t border-border/50">
                            <p className="text-xs font-medium">Page {index + 1}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {page.heading_text || "No title"}
                            </p>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Down navigation */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full rounded-none rounded-b-lg"
        onClick={() => onNavigate("down")}
        disabled={pages.length === 0}
      >
        <ChevronDown className="w-5 h-5" />
      </Button>
    </div>
  );
}
