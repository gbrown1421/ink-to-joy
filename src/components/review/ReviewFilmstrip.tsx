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
      return "border-2 border-destructive/50";
    }
    if (isSelected && isAccepted) {
      return "ring-2 ring-orange-500 border-2 border-green-500";
    }
    if (isSelected) {
      return "ring-2 ring-orange-500 border-2 border-border";
    }
    if (isAccepted) {
      return "border-2 border-green-500";
    }
    return "border-2 border-border";
  };

  return (
    <div className="flex flex-col h-full w-[250px] bg-card rounded-lg border border-border">
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
                          className={`relative rounded-lg overflow-hidden cursor-pointer transition-all ${getBorderClasses(page)} ${
                            snapshot.isDragging ? "shadow-lg" : ""
                          }`}
                          onClick={() => onSelectPage(page)}
                        >
                          <div className="flex items-center gap-2 p-2 bg-background">
                            <div {...provided.dragHandleProps} className="cursor-grab">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                            </div>
                            
                            <div className="relative w-14 h-14 flex-shrink-0">
                              {page.coloring_image_url ? (
                                <img
                                  src={page.coloring_image_url}
                                  alt={`Page ${index + 1}`}
                                  className="w-full h-full object-cover rounded"
                                  style={{ imageRendering: "crisp-edges" }}
                                />
                              ) : (
                                <div className="w-full h-full bg-muted rounded flex items-center justify-center">
                                  <AlertCircle className="w-5 h-5 text-destructive" />
                                </div>
                              )}
                              
                              {/* Accepted badge */}
                              {page.accepted && page.coloring_image_url && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                  <Check className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium">Page {index + 1}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {page.heading_text || "No title"}
                              </p>
                            </div>
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
