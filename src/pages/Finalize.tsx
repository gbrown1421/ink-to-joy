import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Download, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";

interface PageData {
  coloringImageUrl: string;
  borderStyle: string;
  headingText: string;
}

const Finalize = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookName } = location.state || { bookName: "Untitled Book" };

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfData, setPdfData] = useState<{ bookName: string; pages: PageData[] } | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [projectType, setProjectType] = useState<"coloring" | "toon">("coloring");

  useEffect(() => {
    loadPageCount();
    loadBookDetails();
  }, [bookId]);

  const loadBookDetails = async () => {
    if (!bookId) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('project_type')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      if (data) {
        setProjectType(data.project_type as "coloring" | "toon");
      }
    } catch (error) {
      console.error('Error loading book details:', error);
    }
  };

  const loadPageCount = async () => {
    if (!bookId) return;

    try {
      const response: any = await (supabase as any)
        .from('pages')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', bookId)
        .eq('keep', true)
        .eq('status', 'ready');

      setPageCount(response.count || 0);
    } catch (error) {
      console.error('Error loading page count:', error);
    }
  };

  const handleGeneratePDF = async () => {
    if (!bookId) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-pdf', {
        body: { bookId }
      });

      if (error) throw error;

      setPdfData(data);
      toast.success("PDF data ready! Download functionality coming soon.");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    // TODO: Implement actual PDF download
    // For now, this will use the pdfData to create a downloadable PDF
    toast.info("PDF download functionality will be implemented in the next phase");
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-creative flex items-center justify-center">
                <Palette className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{bookName}</h1>
                <p className="text-sm text-muted-foreground">Step 4: Finalize & Export</p>
              </div>
            </div>
            <ProjectTypeBadge projectType={projectType} />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="space-y-8">
          <Card className="p-8 text-center space-y-6">
            {!pdfData ? (
              <>
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">Ready to Export!</h2>
                  <p className="text-muted-foreground">
                    Your coloring book contains {pageCount} page{pageCount !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="space-y-4 pt-4">
                  <div className="text-sm text-muted-foreground text-left space-y-2">
                    <p>Your book will include:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>All selected pages with chosen borders</li>
                      <li>Custom headings for each page</li>
                      <li>Print-ready 8.5" x 11" format</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleGeneratePDF}
                    size="lg"
                    className="w-full"
                    disabled={isGenerating || pageCount === 0}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 w-5 h-5" />
                        Generate PDF
                      </>
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold">PDF Generated!</h2>
                  <p className="text-muted-foreground">
                    Your coloring book is ready to download
                  </p>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    onClick={handleDownload}
                    size="lg"
                    className="w-full"
                  >
                    <Download className="mr-2 w-5 h-5" />
                    Download PDF
                  </Button>

                  <Button 
                    onClick={() => navigate('/')}
                    variant="outline"
                    size="lg"
                    className="w-full"
                  >
                    Create Another Book
                  </Button>
                </div>
              </>
            )}
          </Card>

          {!pdfData && (
            <div className="flex justify-center">
              <Button 
                onClick={() => navigate(`/review/${bookId}`, { state: { bookName } })}
                variant="ghost"
              >
                Back to Review
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Finalize;
