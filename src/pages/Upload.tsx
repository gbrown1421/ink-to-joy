import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload as UploadIcon, ArrowRight, Loader2, X, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";
import { normalizeToPng } from "@/utils/normalizeImage";
import { ImageTroubleshootingModal } from "@/components/ImageTroubleshootingModal";

interface UploadedPage {
  id: string;
  originalFile: File;
  status: "accepted" | "preparing" | "prepared" | "processing" | "ready" | "failed";
  coloringImageUrl?: string;
  error?: string;
}

const Upload = () => {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { bookName, difficulty } = location.state || { bookName: "Untitled Book", difficulty: "beginner" };

  const [pages, setPages] = useState<UploadedPage[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [projectType, setProjectType] = useState<"coloring" | "toon">("coloring");
  const [bookDifficulty, setBookDifficulty] = useState<string>("intermediate");
  const [showTroubleshootingModal, setShowTroubleshootingModal] = useState(false);

  useEffect(() => {
    loadBookDetails();
  }, [bookId]);

  const loadBookDetails = async () => {
    if (!bookId) return;
    
    try {
      const { data, error } = await supabase
        .from('books')
        .select('project_type, difficulty')
        .eq('id', bookId)
        .single();

      if (error) throw error;
      if (data) {
        setProjectType(data.project_type as "coloring" | "toon");
        setBookDifficulty(data.difficulty || "intermediate");
      }
    } catch (error) {
      console.error('Error loading book details:', error);
      toast.error('Failed to load book details');
    }
  };


  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!bookId) return;

    const newPages: UploadedPage[] = acceptedFiles.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      status: "accepted" as const,
    }));

    setPages(prev => [...prev, ...newPages]);
    setIsUploading(true);

    for (const page of newPages) {
      try {
        // 1. Just accepted
        setPages(prev => prev.map(p =>
          p.id === page.id ? { ...p, status: "accepted", error: undefined } : p
        ));

        // 2. Prep: normalize to PNG
        setPages(prev => prev.map(p =>
          p.id === page.id ? { ...p, status: "preparing" } : p
        ));

        const normalizedFile = await normalizeToPng(page.originalFile);

        setPages(prev => prev.map(p =>
          p.id === page.id ? { ...p, status: "prepared" } : p
        ));

        // 3. Call upload-page with the normalized file
        setPages(prev => prev.map(p =>
          p.id === page.id ? { ...p, status: "processing" } : p
        ));

        const formData = new FormData();
        formData.append("bookId", bookId);
        formData.append("image", normalizedFile);

        const { data, error } = await supabase.functions.invoke("upload-page", {
          body: formData,
        });

        if (error) {
          const msg = error.message || "Upload / processing failed";
          console.error("upload-page error:", msg);
          toast.error(msg);
          setPages(prev => prev.map(p =>
            p.id === page.id ? { ...p, status: "failed", error: msg } : p
          ));
          continue;
        }

        if (data?.status === "ready" && data.coloringImageUrl) {
          setPages(prev => prev.map(p =>
            p.id === page.id
              ? { ...p, status: "ready", coloringImageUrl: data.coloringImageUrl as string }
              : p
          ));
          toast.success("Page processed successfully!");
        } else {
          const msg = "We couldn't read this image file.";
          console.warn(msg, data);
          toast.error(msg);
          setPages(prev => prev.map(p =>
            p.id === page.id ? { ...p, status: "failed", error: msg } : p
          ));
        }
      } catch (err) {
        console.error("Error uploading/processing page:", err);
        const msg = err instanceof Error ? err.message : "Unexpected error during upload";
        toast.error(msg);
        setPages(prev => prev.map(p =>
          p.id === page.id ? { ...p, status: "failed", error: msg } : p
        ));
      }
    }

    setIsUploading(false);
  }, [bookId, projectType]);

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const handleContinue = () => {
    const readyPages = pages.filter(p => p.status === "ready");
    if (readyPages.length === 0) {
      toast.error("Please wait for at least one page to be ready");
      return;
    }

    navigate(`/review/${bookId}`, { state: { bookName, difficulty } });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: true,
  });


  const readyCount = pages.filter(p => p.status === "ready").length;
  const processingCount = pages.filter(p => 
    p.status === "preparing" || 
    p.status === "prepared" || 
    p.status === "processing"
  ).length;

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
                <p className="text-sm text-muted-foreground">Step 2: Upload Photos</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ProjectTypeBadge projectType={projectType} />
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

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="space-y-6">
          {/* Upload Area */}
          <Card 
            {...getRootProps()} 
            className={`p-12 border-2 border-dashed cursor-pointer transition-all ${
              isDragActive ? "border-primary bg-primary/5" : "hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 text-center">
              <UploadIcon className="w-16 h-16 text-muted-foreground" />
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {isDragActive ? "Drop photos here..." : "Upload Photos"}
                </h3>
                <p className="text-muted-foreground">
                  Drag and drop images here, or click to select files
                </p>
              </div>
            </div>
          </Card>

          {/* Status Summary */}
          {pages.length > 0 && (
            <div className="flex gap-4 text-sm">
              <span className="text-muted-foreground">
                {readyCount} ready, {processingCount} processing, {pages.length} total
              </span>
            </div>
          )}

          {/* Pages Grid */}
          {pages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {pages.map(page => (
                <Card key={page.id} className="relative p-2">
                  <div className="aspect-square rounded overflow-hidden bg-muted mb-2">
                     {page.status === "ready" && page.coloringImageUrl ? (
                       <img 
                         src={page.coloringImageUrl} 
                         alt="Processed coloring page" 
                         className="w-full h-full object-contain"
                         style={{ 
                           imageRendering: 'crisp-edges'
                         }}
                       />
                     ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-2">
                         {page.status === "accepted" && (
                           <>
                             <CheckCircle2 className="w-8 h-8 text-muted-foreground" />
                             <span className="text-xs text-center text-muted-foreground">
                               Image accepted
                             </span>
                           </>
                         )}
                         {page.status === "preparing" && (
                           <>
                             <Loader2 className="w-8 h-8 animate-spin text-primary" />
                             <span className="text-xs text-center text-muted-foreground">
                               Preparing image…
                             </span>
                           </>
                         )}
                         {page.status === "prepared" && (
                           <>
                             <CheckCircle2 className="w-8 h-8 text-primary" />
                             <span className="text-xs text-center text-muted-foreground">
                               Image prep complete
                             </span>
                           </>
                         )}
                         {page.status === "processing" && (
                           <>
                             <Loader2 className="w-8 h-8 animate-spin text-primary" />
                             <span className="text-xs text-center text-muted-foreground">
                               Generating coloring page…
                             </span>
                           </>
                         )}
                          {page.status === "failed" && (
                            <>
                              <AlertCircle className="w-8 h-8 text-destructive" />
                              <span className="text-xs text-center text-destructive font-medium">
                                We couldn't read this image file.
                              </span>
                              <div className="flex gap-2 mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => removePage(page.id)}
                                >
                                  Remove
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowTroubleshootingModal(true)}
                                >
                                  How do I fix this?
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground text-center mt-2 px-2">
                                Some photos use special formats our system can't decode. Click "How do I fix this?" for quick steps to repair and re-upload.
                              </p>
                            </>
                          )}
                       </div>
                     )}
                   </div>
                   <div className="flex items-center justify-between">
                     <span className="text-xs text-muted-foreground truncate flex-1">
                       {page.originalFile.name}
                     </span>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="h-6 w-6 p-0"
                       onClick={() => removePage(page.id)}
                     >
                       <X className="w-4 h-4" />
                     </Button>
                   </div>
                   {page.status === "ready" && (
                     <CheckCircle2 className="absolute top-4 right-4 w-6 h-6 text-primary" />
                   )}
                </Card>
              ))}
            </div>
          )}

          {/* Continue Button */}
          {pages.length > 0 && (
            <div className="flex justify-end">
              <Button 
                onClick={handleContinue}
                size="lg"
                disabled={readyCount === 0}
              >
                Continue to Review
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          )}
        </div>
      </main>

      <ImageTroubleshootingModal 
        open={showTroubleshootingModal}
        onClose={() => setShowTroubleshootingModal(false)}
      />
    </div>
  );
};

export default Upload;
