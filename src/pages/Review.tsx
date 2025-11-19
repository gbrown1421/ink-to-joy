import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Palette, ArrowRight, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface Page {
  id: string;
  coloring_image_url: string;
  border_style: string;
  heading_text: string;
  keep: boolean;
  order_index: number;
}

const borderStyles = [
  { id: "classic", name: "Classic" },
  { id: "stars", name: "Stars" },
  { id: "clouds", name: "Clouds" },
  { id: "blocks", name: "Blocks" },
  { id: "balloons", name: "Balloons" },
  { id: "ribbons", name: "Ribbons" },
];

const Review = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookName } = location.state || { bookName: "Untitled Book" };

  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  useEffect(() => {
    loadPages();
  }, [bookId]);

  const loadPages = async () => {
    if (!bookId) return;

    try {
      const response: any = await (supabase as any)
        .from('pages')
        .select('*')
        .eq('book_id', bookId)
        .eq('status', 'ready')
        .order('order_index');

      if (response.error) throw response.error;
      setPages(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedPage(response.data[0]);
      }
    } catch (error) {
      console.error('Error loading pages:', error);
      toast.error("Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update order_index for all pages
    const updatedPages = items.map((page, index) => ({
      ...page,
      order_index: index + 1,
    }));

    setPages(updatedPages);

    // Update in database
    try {
      for (const page of updatedPages) {
        const response: any = await (supabase as any)
          .from('pages')
          .update({ order_index: page.order_index })
          .eq('id', page.id);
        
        if (response.error) throw response.error;
      }
    } catch (error) {
      console.error('Error updating page order:', error);
      toast.error("Failed to update page order");
    }
  };

  const updatePage = async (pageId: string, updates: Partial<Page>) => {
    try {
      const response: any = await (supabase as any)
        .from('pages')
        .update(updates)
        .eq('id', pageId);

      if (response.error) throw response.error;

      setPages(prev => prev.map(p => p.id === pageId ? { ...p, ...updates } : p));
      if (selectedPage?.id === pageId) {
        setSelectedPage(prev => prev ? { ...prev, ...updates } : null);
      }
    } catch (error) {
      console.error('Error updating page:', error);
      toast.error("Failed to update page");
    }
  };

  const handleContinue = () => {
    const keptPages = pages.filter(p => p.keep);
    if (keptPages.length === 0) {
      toast.error("Please keep at least one page");
      return;
    }

    navigate(`/finalize/${bookId}`, { state: { bookName } });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center">
          <Palette className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
              <Palette className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{bookName}</h1>
              <p className="text-sm text-muted-foreground">Step 3: Review & Organize</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Preview */}
          <div className="lg:col-span-2">
            {selectedPage && (
              <Card className="p-6 space-y-6">
                <img 
                  src={selectedPage.coloring_image_url} 
                  alt="Coloring page preview"
                  className="w-full rounded-lg"
                />

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Heading Text</Label>
                    <Input
                      value={selectedPage.heading_text || ''}
                      onChange={(e) => updatePage(selectedPage.id, { heading_text: e.target.value })}
                      placeholder="Enter a heading (optional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Border Style</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {borderStyles.map(border => (
                        <Button
                          key={border.id}
                          variant={selectedPage.border_style === border.id ? "default" : "outline"}
                          onClick={() => updatePage(selectedPage.id, { border_style: border.id })}
                          className="h-auto py-4"
                        >
                          {border.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Page List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Pages ({pages.filter(p => p.keep).length} of {pages.length})</h3>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="pages">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {pages.map((page, index) => (
                      <Draggable key={page.id} draggableId={page.id} index={index}>
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-3 cursor-pointer ${
                              selectedPage?.id === page.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => setSelectedPage(page)}
                          >
                            <div className="flex items-center gap-3">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <img 
                                src={page.coloring_image_url} 
                                alt={`Page ${index + 1}`}
                                className="w-16 h-16 object-cover rounded"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium">Page {index + 1}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {page.heading_text || "No heading"}
                                </p>
                              </div>
                              <Checkbox
                                checked={page.keep}
                                onCheckedChange={(checked) => 
                                  updatePage(page.id, { keep: !!checked })
                                }
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Button 
              onClick={handleContinue}
              size="lg"
              className="w-full"
            >
              Continue to Finalize
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Review;
