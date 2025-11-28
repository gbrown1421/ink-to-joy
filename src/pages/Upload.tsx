import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Palette, Upload as UploadIcon, ArrowRight, Loader2, X, CheckCircle2, AlertCircle, Home } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useDropzone } from "react-dropzone";
import { ProjectTypeBadge } from "@/components/ProjectTypeBadge";

interface UploadedPage {
  id: string;
  originalFile: File;
  status: "uploading" | "processing" | "ready" | "failed";
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
      status: "uploading" as const,
    }));

    setPages(prev => [...prev, ...newPages]);
    setIsUploading(true);

    for (const page of newPages) {
      try {
        const formData = new FormData();
        formData.append('bookId', bookId);
        formData.append('image', page.originalFile);

        // All uploads (both coloring and toon) now go through upload-page
        const { data, error } = await supabase.functions.invoke("upload-page", {
          body: formData,
        });

        if (error) {
          const msg = error.message || 'Upload / processing failed';
          console.error('upload-page error:', msg);
          toast.error(msg);
          setPages(prev => prev.map(p => 
            p.id === page.id 
              ? { ...p, status: "failed", error: msg } 
              : p
          ));
          continue;
        }

        if (!data || !data.pageId) {
          const msg = 'No pageId returned from upload-page';
          console.error(msg, data);
          toast.error(msg);
          setPages(prev => prev.map(p => 
            p.id === page.id 
              ? { ...p, status: "failed", error: msg } 
              : p
          ));
          continue;
        }

        if (data.status === 'ready' && data.coloringImageUrl) {
          setPages(prev => prev.map(p => 
            p.id === page.id 
              ? { ...p, status: "ready", coloringImageUrl: data.coloringImageUrl as string } 
              : p
          ));
          toast.success("Page processed successfully!");
        } else {
          // Shouldn't really happen with the new backend; treat as failed if it does
          const msg = 'Image processing did not complete';
          console.warn(msg, data);
          toast.error(msg);
          setPages(prev => prev.map(p => 
            p.id === page.id 
              ? { ...p, status: "failed", error: msg } 
              : p
          ));
        }
      } catch (err) {
        console.error('Error uploading/processing page:', err);
        const msg = err instanceof Error ? err.message : 'Upload failed';
        toast.error(msg);
        setPages(prev => prev.map(p => 
          p.id === page.id 
            ? { ...p, status: "failed", error: msg } 
            : p
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
  const processingCount = pages.filter(p => p.status === "processing" || p.status === "uploading").length;

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
                        {page.status === "uploading" || page.status === "processing" ? (
                          <>
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <span className="text-xs text-center text-muted-foreground">
                              {page.status === "uploading" ? "Uploading..." : "Processing..."}
                            </span>
                          </>
                        ) : (
                           <>
                            <AlertCircle className="w-8 h-8 text-destructive" />
                            <span className="text-xs text-center text-destructive font-medium">
                              {page.error || 'Image processing failed – click to retry upload'}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => removePage(page.id)}
                            >
                              Remove
                            </Button>
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
    </div>
  );
};

export default Upload;
