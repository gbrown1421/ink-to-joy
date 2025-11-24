import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Download, Loader2, CheckCircle2, Home, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";
import jsPDF from "jspdf";

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
      // Get PDF data from export function
      const { data, error } = await supabase.functions.invoke('export-pdf', {
        body: { bookId }
      });

      if (error) throw error;

      setPdfData(data);
      
      // Generate PDF blob using jsPDF
      const pdfBlob = await generatePDFBlob(data);
      
      // Upload PDF to storage
      const fileName = `${bookId}/book.pdf`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('book-pdfs')
        .upload(fileName, pdfBlob, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('book-pdfs')
        .getPublicUrl(fileName);

      // Update book record with PDF metadata
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const { error: updateError } = await supabase
        .from('books')
        .update({
          status: 'completed',
          pdf_url: publicUrl,
          pdf_created_at: new Date().toISOString(),
          pdf_expires_at: expiresAt.toISOString(),
          pdf_deleted: false,
          total_price: 0, // Set to actual price if available
        })
        .eq('id', bookId);

      if (updateError) throw updateError;

      // Delete page images after PDF is created
      await deletePageImages();

      toast.success("PDF generated and saved for 30 days!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDFBlob = async (pdfData: { bookName: string; pages: PageData[] }): Promise<Blob> => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const pageWidth = 8.5;
    const pageHeight = 11;
    const margin = 0.5;

    for (let i = 0; i < pdfData.pages.length; i++) {
      const page = pdfData.pages[i];
      
      if (i > 0) {
        pdf.addPage();
      }

      if (page.headingText) {
        pdf.setFontSize(24);
        pdf.text(page.headingText, pageWidth / 2, margin + 0.3, { align: 'center' });
      }

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = page.coloringImageUrl;
        });

        // Create canvas to invert image colors (white lines on black → black lines on white)
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        
        if (ctx) {
          // Apply invert filter
          ctx.filter = 'invert(1)';
          ctx.drawImage(img, 0, 0);
          ctx.filter = 'none';
        }

        const availableHeight = pageHeight - (2 * margin) - (page.headingText ? 0.5 : 0);
        const availableWidth = pageWidth - (2 * margin);
        
        const imgAspectRatio = img.width / img.height;
        let imgWidth = availableWidth;
        let imgHeight = imgWidth / imgAspectRatio;
        
        if (imgHeight > availableHeight) {
          imgHeight = availableHeight;
          imgWidth = imgHeight * imgAspectRatio;
        }

        const xPos = (pageWidth - imgWidth) / 2;
        const yPos = margin + (page.headingText ? 0.6 : 0);

        // Use inverted canvas image instead of original
        pdf.addImage(canvas, 'PNG', xPos, yPos, imgWidth, imgHeight);
      } catch (error) {
        console.error(`Error loading image for page ${i + 1}:`, error);
      }
    }

    return pdf.output('blob');
  };

  const deletePageImages = async () => {
    if (!bookId) return;

    try {
      // Delete all pages for this book
      const { error: pagesError } = await supabase
        .from('pages')
        .delete()
        .eq('book_id', bookId);

      if (pagesError) throw pagesError;

      // Delete images from storage
      const { data: files, error: listError } = await supabase.storage
        .from('book-images')
        .list(`books/${bookId}/pages`);

      if (listError) throw listError;

      if (files && files.length > 0) {
        const filePaths = files.map(f => `books/${bookId}/pages/${f.name}`);
        const { error: deleteError } = await supabase.storage
          .from('book-images')
          .remove(filePaths);

        if (deleteError) throw deleteError;
      }

      console.log('Page images deleted successfully');
    } catch (error) {
      console.error('Error deleting page images:', error);
    }
  };

  const handleDownload = async () => {
    if (!pdfData) return;

    try {
      toast.info("Generating PDF file...");
      
      // Create a new PDF with Letter size (8.5" x 11")
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'in',
        format: 'letter'
      });

      // Page dimensions
      const pageWidth = 8.5;
      const pageHeight = 11;
      const margin = 0.5;

      for (let i = 0; i < pdfData.pages.length; i++) {
        const page = pdfData.pages[i];
        
        if (i > 0) {
          pdf.addPage();
        }

        // Add heading if present
        if (page.headingText) {
          pdf.setFontSize(24);
          pdf.text(page.headingText, pageWidth / 2, margin + 0.3, { align: 'center' });
        }

        // Load and add the coloring image
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = page.coloringImageUrl;
          });

          // Calculate image dimensions to fit in the page
          const availableHeight = pageHeight - (2 * margin) - (page.headingText ? 0.5 : 0);
          const availableWidth = pageWidth - (2 * margin);
          
          const imgAspectRatio = img.width / img.height;
          let imgWidth = availableWidth;
          let imgHeight = imgWidth / imgAspectRatio;
          
          if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          const xPos = (pageWidth - imgWidth) / 2;
          const yPos = margin + (page.headingText ? 0.6 : 0);

          pdf.addImage(img, 'PNG', xPos, yPos, imgWidth, imgHeight);
        } catch (error) {
          console.error(`Error loading image for page ${i + 1}:`, error);
          toast.error(`Failed to load image for page ${i + 1}`);
        }
      }

      // Save the PDF
      pdf.save(`${pdfData.bookName}.pdf`);
      toast.success("PDF downloaded successfully!");
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error("Failed to download PDF");
    }
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
            <div className="flex items-center gap-2">
              <ProjectTypeBadge projectType={projectType} />
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/review/${bookId}`, { state: { bookName } })}
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
