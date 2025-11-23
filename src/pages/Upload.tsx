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
  mimiKey?: string;
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

        const { data, error } = await supabase.functions.invoke('upload-page', {
          body: formData,
        });

        if (error) {
          console.error('Upload function error:', error);
          const errorMsg = error.message || 'Upload failed';
          toast.error(`Upload failed: ${errorMsg}`);
          throw error;
        }

        if (!data?.pageId) {
          const errorMsg = 'No page ID returned from upload';
          console.error(errorMsg, data);
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        console.log('Upload successful, page ID:', data.pageId);

        setPages(prev => prev.map(p => 
          p.id === page.id 
            ? { ...p, status: "processing", mimiKey: data.mimiKey } 
            : p
        ));

        // Start polling for status
        pollPageStatus(page.id, data.pageId);
      } catch (error) {
        console.error('Error uploading page:', error);
        const errorMsg = error instanceof Error ? error.message : 'Upload failed';
        setPages(prev => prev.map(p => 
          p.id === page.id 
            ? { ...p, status: "failed", error: errorMsg } 
            : p
        ));
      }
    }

    setIsUploading(false);
  }, [bookId]);

  const pollPageStatus = async (tempId: string, pageId: string) => {
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    let attempts = 0;

    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-page-status', {
          body: { pageId },
        });

        if (error) {
          console.error('Status check error:', error);
          const errorMsg = error.message || 'Status check failed';
          toast.error(`Processing error: ${errorMsg}`);
          setPages(prev => prev.map(p => 
            p.id === tempId 
              ? { ...p, status: "failed", error: errorMsg } 
              : p
          ));
          return;
        }

        console.log('Status check response:', data);

        if (data.status === "ready") {
          if (!data.success || !data.masterImageUrl) {
            const errorMsg = data.error || 'No master image returned';
            console.error('Processing failed:', errorMsg);
            toast.error(`Processing failed: ${errorMsg}`);
            setPages(prev => prev.map(p => 
              p.id === tempId 
                ? { ...p, status: "failed", error: errorMsg } 
                : p
            ));
            return;
          }

          console.log('Master image ready');
          
          // Generate Quick & Easy variant client-side if needed
          try {
            let displayUrl = data.masterImageUrl;

            if (bookDifficulty === 'quick-easy' || bookDifficulty === 'quick') {
              console.log('Generating Quick & Easy variant client-side...');
              const { generateQuickEasyFromMaster } = await import('@/lib/quickEasyProcessor');
              const easyBlob = await generateQuickEasyFromMaster(data.masterImageUrl);
              
              // Upload Quick & Easy variant to storage
              const easyFilename = `${pageId}-easy.png`;
              const easyPath = `books/${bookId}/pages/${easyFilename}`;
              
              const { error: uploadError } = await supabase.storage
                .from('book-images')
                .upload(easyPath, easyBlob, {
                  contentType: 'image/png',
                  upsert: true,
                });

              if (uploadError) {
                console.error('Failed to upload Quick & Easy variant:', uploadError);
                throw uploadError;
              }

              const { data: urlData } = supabase.storage
                .from('book-images')
                .getPublicUrl(easyPath);

              displayUrl = urlData.publicUrl;

              // Update page with Quick & Easy URL
              const { error: updateError } = await supabase
                .from('pages')
                .update({ easy_image_url: displayUrl })
                .eq('id', pageId);

              if (updateError) {
                console.error('Failed to save Quick & Easy URL:', updateError);
                throw updateError;
              }

              console.log('Quick & Easy variant generated and saved:', displayUrl);
            }

            toast.success('Page processed successfully!');
            
            setPages(prev => prev.map(p => 
              p.id === tempId 
                ? { ...p, status: "ready", coloringImageUrl: displayUrl } 
                : p
            ));
          } catch (variantError) {
            console.error('Error generating Quick & Easy variant:', variantError);
            // Fall back to master image
            const errorMsg = variantError instanceof Error ? variantError.message : 'Unknown error';
            toast.error(`Quick & Easy generation failed: ${errorMsg}`);
            setPages(prev => prev.map(p => 
              p.id === tempId 
                ? { ...p, status: "ready", coloringImageUrl: data.masterImageUrl } 
                : p
            ));
          }
          return;
        } else if (data.status === "failed") {
          const errorMsg = data.error || 'Processing failed';
          console.error('Processing failed:', errorMsg);
          toast.error(`Processing failed: ${errorMsg}`);
          setPages(prev => prev.map(p => 
            p.id === tempId 
              ? { ...p, status: "failed", error: errorMsg } 
              : p
          ));
          return;
        }

        // Continue polling
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 5000);
        } else {
          const timeoutMsg = 'Processing timeout - please try again';
          toast.error(timeoutMsg);
          setPages(prev => prev.map(p => 
            p.id === tempId 
              ? { ...p, status: "failed", error: timeoutMsg } 
              : p
          ));
        }
      } catch (error) {
        console.error('Error checking page status:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setPages(prev => prev.map(p => 
          p.id === tempId 
            ? { ...p, status: "failed", error: errorMsg } 
            : p
        ));
        toast.error(`Processing error: ${errorMsg}`);
      }
    };

    checkStatus();
  };


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
                        style={{ imageRendering: 'crisp-edges' }}
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
                            {page.error && (
                              <span className="text-xs text-center text-destructive">
                                {page.error}
                              </span>
                            )}
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
