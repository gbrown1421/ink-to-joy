import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Palette, Home, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { DropResult } from "@hello-pangea/dnd";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";
import { ReviewFilmstrip, ReviewPage } from "@/components/review/ReviewFilmstrip";
import { ReviewPreview } from "@/components/review/ReviewPreview";
import { ReviewControlsCard } from "@/components/review/ReviewControlsCard";

const Review = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookName, difficulty: navDifficulty } = location.state || { bookName: "Untitled Book" };

  const [pages, setPages] = useState<ReviewPage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<string>("beginner");
  const [projectType, setProjectType] = useState<"coloring" | "toon">("coloring");

  const selectedPage = pages.find(p => p.id === selectedPageId) || null;

  useEffect(() => {
    loadBookAndPages();
  }, [bookId]);

  const loadBookAndPages = async () => {
    if (!bookId) return;

    try {
      // Load book details
      const bookResponse = await supabase
        .from('books')
        .select('difficulty, project_type')
        .eq('id', bookId)
        .maybeSingle();

      if (bookResponse.error) throw bookResponse.error;
      
      const bookDifficulty = bookResponse.data?.difficulty || "beginner";
      const bookProjectType = (bookResponse.data?.project_type as "coloring" | "toon") || 'coloring';
      setDifficulty(bookDifficulty);
      setProjectType(bookProjectType);

      // Load pages - only accepted (keep=true) and ready pages
      const pagesResponse = await supabase
        .from('pages')
        .select('*')
        .eq('book_id', bookId)
        .eq('status', 'ready')
        .eq('keep', true)
        .order('page_order');

      if (pagesResponse.error) throw pagesResponse.error;
      
      // Map to ReviewPage with accepted = false (always reset on visit)
      const pagesData: ReviewPage[] = (pagesResponse.data || []).map(p => ({
        id: p.id,
        coloring_image_url: p.coloring_image_url,
        border_style: p.border_style || "none",
        heading_text: p.heading_text || "",
        keep: p.keep ?? true,
        page_order: p.page_order,
        status: p.status,
        accepted: false, // Always reset on page load
      }));
      
      setPages(pagesData);
      if (pagesData.length > 0) {
        setSelectedPageId(pagesData[0].id);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load pages");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPage = (page: ReviewPage) => {
    setSelectedPageId(page.id);
  };

  const handleNavigate = (direction: "up" | "down") => {
    if (pages.length === 0) return;
    
    const currentIndex = pages.findIndex(p => p.id === selectedPageId);
    let newIndex: number;
    
    if (direction === "up") {
      newIndex = currentIndex <= 0 ? pages.length - 1 : currentIndex - 1;
    } else {
      newIndex = currentIndex >= pages.length - 1 ? 0 : currentIndex + 1;
    }
    
    setSelectedPageId(pages[newIndex].id);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(pages);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update page_order for all pages
    const updatedPages = items.map((page, index) => ({
      ...page,
      page_order: index + 1,
    }));

    setPages(updatedPages);

    // Update in database
    try {
      for (const page of updatedPages) {
        const response = await supabase
          .from('pages')
          .update({ page_order: page.page_order })
          .eq('id', page.id);
        
        if (response.error) throw response.error;
      }
    } catch (error) {
      console.error('Error updating page order:', error);
      toast.error("Failed to update page order");
    }
  };

  const handleAccept = (pageId: string) => {
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, accepted: !p.accepted } : p
    ));
  };

  const handleUpdateTitle = useCallback(async (pageId: string, title: string) => {
    // Update local state immediately
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, heading_text: title } : p
    ));

    // Debounced persist to database
    try {
      await supabase
        .from('pages')
        .update({ heading_text: title })
        .eq('id', pageId);
    } catch (error) {
      console.error('Error updating title:', error);
    }
  }, []);

  const handleUpdateBorder = async (pageId: string, borderStyle: string) => {
    // Update local state
    setPages(prev => prev.map(p => 
      p.id === pageId ? { ...p, border_style: borderStyle } : p
    ));

    // Persist to database
    try {
      await supabase
        .from('pages')
        .update({ border_style: borderStyle })
        .eq('id', pageId);
    } catch (error) {
      console.error('Error updating border:', error);
      toast.error("Failed to update border style");
    }
  };

  const handleContinue = () => {
    const pagesWithImages = pages.filter(p => p.coloring_image_url);
    if (pagesWithImages.length === 0) {
      toast.error("No pages available");
      return;
    }

    const allAccepted = pagesWithImages.every(p => p.accepted);
    if (!allAccepted) {
      toast.error("Please accept all pages before continuing");
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
    <div className="min-h-screen bg-gradient-subtle flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm flex-shrink-0">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">{bookName}</h1>
                <p className="text-sm text-muted-foreground">Step 3: Review & Organize</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProjectTypeBadge projectType={projectType} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/upload/${bookId}`, { state: { bookName, difficulty } })}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-1" />
                Home
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3 column layout */}
      <main 
        className="flex-1 container mx-auto px-4 py-4 flex gap-4"
        style={{ height: 'calc(100vh - 73px)', overflow: 'hidden' }}
      >
        {/* Left: Filmstrip */}
        <ReviewFilmstrip
          pages={pages}
          selectedPageId={selectedPageId}
          onSelectPage={handleSelectPage}
          onDragEnd={handleDragEnd}
          onNavigate={handleNavigate}
        />

        {/* Center: Preview */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <ReviewPreview page={selectedPage} />
        </div>

        {/* Right: Controls */}
        <div className="flex-shrink-0">
          <ReviewControlsCard
            page={selectedPage}
            pages={pages}
            onAccept={handleAccept}
            onUpdateTitle={handleUpdateTitle}
            onUpdateBorder={handleUpdateBorder}
            onContinue={handleContinue}
          />
        </div>
      </main>
    </div>
  );
};

export default Review;
