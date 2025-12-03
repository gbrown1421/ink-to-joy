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

// PDF dimensions in points (72 points = 1 inch)
const PAGE_WIDTH_PT = 612;  // 8.5"
const PAGE_HEIGHT_PT = 792; // 11"
const MARGIN_PT = 54;       // 0.75"
const BORDER_X = MARGIN_PT;
const BORDER_Y = MARGIN_PT;
const BORDER_WIDTH = PAGE_WIDTH_PT - 2 * MARGIN_PT;  // 504 pt
const BORDER_HEIGHT = PAGE_HEIGHT_PT - 2 * MARGIN_PT; // 684 pt
const HEADER_HEIGHT_PT = 90; // 1.25" (from 0.75" to 2" = 1.25")

// Convert points to inches for jsPDF
const ptToIn = (pt: number) => pt / 72;

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

  const drawBorder = (pdf: jsPDF, borderStyle: string) => {
    if (borderStyle === "none" || !borderStyle) return;

    const x = ptToIn(BORDER_X);
    const y = ptToIn(BORDER_Y);
    const w = ptToIn(BORDER_WIDTH);
    const h = ptToIn(BORDER_HEIGHT);

    pdf.setDrawColor(0, 0, 0); // Black

    if (borderStyle === "thick") {
      pdf.setLineWidth(ptToIn(3));
      pdf.rect(x, y, w, h, 'S');
    } else if (borderStyle === "thin") {
      pdf.setLineWidth(ptToIn(1));
      pdf.rect(x, y, w, h, 'S');
    } else if (borderStyle === "dashed") {
      pdf.setLineWidth(ptToIn(2));
      pdf.setLineDashPattern([ptToIn(6), ptToIn(4)], 0);
      pdf.rect(x, y, w, h, 'S');
      pdf.setLineDashPattern([], 0); // Reset dash pattern
    }
  };

  const drawTitle = (pdf: jsPDF, headingText: string) => {
    const title = (headingText || "").toUpperCase().trim();
    if (!title) return;

    pdf.setFontSize(36);
    pdf.setTextColor(0, 0, 0);

    // Header band: from y=54pt to y=144pt (0.75" to 2")
    // Center title vertically within header band
    const headerTopIn = ptToIn(BORDER_Y);
    const headerCenterY = headerTopIn + ptToIn(HEADER_HEIGHT_PT) / 2;
    
    // Center horizontally within the page
    const pageCenterX = ptToIn(PAGE_WIDTH_PT) / 2;
    
    pdf.text(title, pageCenterX, headerCenterY, { 
      align: 'center',
      baseline: 'middle'
    });
  };

  const drawImage = async (pdf: jsPDF, imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = imageUrl;
    });

    // Image area: below header, inside border
    const imageAreaTop = BORDER_Y + HEADER_HEIGHT_PT; // 54 + 90 = 144 pt
    const imageAreaBottom = BORDER_Y + BORDER_HEIGHT; // 54 + 684 = 738 pt
    const imageAreaHeight = imageAreaBottom - imageAreaTop; // 594 pt
    const imageAreaWidth = BORDER_WIDTH; // 504 pt

    // Convert to inches
    const areaTopIn = ptToIn(imageAreaTop);
    const areaWidthIn = ptToIn(imageAreaWidth);
    const areaHeightIn = ptToIn(imageAreaHeight);
    const areaLeftIn = ptToIn(BORDER_X);

    // Calculate scaled dimensions preserving aspect ratio
    const imgAspectRatio = img.width / img.height;
    let imgWidthIn = areaWidthIn;
    let imgHeightIn = imgWidthIn / imgAspectRatio;
    
    if (imgHeightIn > areaHeightIn) {
      imgHeightIn = areaHeightIn;
      imgWidthIn = imgHeightIn * imgAspectRatio;
    }

    // Center image within the area
    const xPos = areaLeftIn + (areaWidthIn - imgWidthIn) / 2;
    const yPos = areaTopIn + (areaHeightIn - imgHeightIn) / 2;

    // Draw to canvas first for CORS handling
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(img, 0, 0);
    }

    pdf.addImage(canvas, 'PNG', xPos, yPos, imgWidthIn, imgHeightIn);
  };

  const generatePDFBlob = async (pdfData: { bookName: string; pages: PageData[] }): Promise<Blob> => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    for (let i = 0; i < pdfData.pages.length; i++) {
      const page = pdfData.pages[i];
      
      if (i > 0) {
        pdf.addPage();
      }

      // Draw border based on borderStyle
      drawBorder(pdf, page.borderStyle);

      // Draw title (uppercase, centered in header band)
      drawTitle(pdf, page.headingText);

      // Draw coloring image below header
      try {
        await drawImage(pdf, page.coloringImageUrl);
      } catch (error) {
        console.error(`Error loading image for page ${i + 1}:`, error);
      }
    }

    return pdf.output('blob');
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
          total_price: 0,
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
      
      const pdfBlob = await generatePDFBlob(pdfData);
      
      // Create download link
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${pdfData.bookName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
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
