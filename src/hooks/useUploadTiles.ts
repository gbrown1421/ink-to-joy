import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UploadTile } from "@/types/upload";
import { normalizeToPng } from "@/utils/normalizeImage";
import { toast } from "sonner";

export function useUploadTiles(bookId: string | undefined) {
  const [tiles, setTiles] = useState<UploadTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File, tileId: string) => {
    if (!bookId) return;

    try {
      // Normalize to PNG first
      const normalizedFile = await normalizeToPng(file);

      const formData = new FormData();
      formData.append("bookId", bookId);
      formData.append("image", normalizedFile);

      const { data, error } = await supabase.functions.invoke("upload-page", {
        body: formData,
      });

      if (error || !data) {
        const msg = error?.message || "Upload failed";
        console.error("upload-page error:", msg);
        toast.error("We couldn't read this image file.");
        setTiles(prev => prev.map(t =>
          t.id === tileId ? { ...t, status: "failed" as const, error: msg } : t
        ));
        return;
      }

      // Check response
      if (data.status === "failed") {
        const msg = data.error || "Image processing failed";
        console.error("upload-page failed:", msg);
        toast.error("We couldn't read this image file.");
        setTiles(prev => prev.map(t =>
          t.id === tileId ? { ...t, status: "failed" as const, error: msg } : t
        ));
        return;
      }

      // Success path - if we have pageId, treat as success
      if (data.pageId) {
        setTiles(prev => prev.map(t =>
          t.id === tileId ? {
            ...t,
            pageId: data.pageId,
            coloringImageUrl: data.coloringImageUrl,
            status: "ready" as const,
            error: undefined,
          } : t
        ));
        toast.success("Page processed successfully!");
      } else {
        // Weird response but no pageId - treat as failed
        console.warn("Unexpected response:", data);
        toast.error("We couldn't read this image file.");
        setTiles(prev => prev.map(t =>
          t.id === tileId ? { ...t, status: "failed" as const, error: "Unexpected response" } : t
        ));
      }
    } catch (err) {
      console.error("Upload error:", err);
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast.error("We couldn't read this image file.");
      setTiles(prev => prev.map(t =>
        t.id === tileId ? { ...t, status: "failed" as const, error: msg } : t
      ));
    }
  }, [bookId]);

  const addFiles = useCallback(async (files: File[]) => {
    const newTiles: UploadTile[] = files.map(file => ({
      id: crypto.randomUUID(),
      originalFile: file,
      status: "generating" as const,
      accepted: false,
    }));

    setTiles(prev => [...prev, ...newTiles]);

    // Select first new tile if nothing selected
    if (!selectedTileId && newTiles.length > 0) {
      setSelectedTileId(newTiles[0].id);
    }

    // Upload each file
    for (const tile of newTiles) {
      await uploadFile(tile.originalFile, tile.id);
    }
  }, [uploadFile, selectedTileId]);

  const acceptTile = useCallback(async (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.status !== "ready") return;

    setTiles(prev => prev.map(t =>
      t.id === tileId ? { ...t, accepted: true } : t
    ));

    if (tile.pageId) {
      const { error } = await supabase
        .from("pages")
        .update({ keep: true })
        .eq("id", tile.pageId);

      if (error) {
        console.error("Failed to update page keep status:", error);
        toast.error("Failed to accept image");
        // Revert
        setTiles(prev => prev.map(t =>
          t.id === tileId ? { ...t, accepted: false } : t
        ));
      } else {
        toast.success("Image accepted!");
      }
    }
  }, [tiles]);

  const regenerateTile = useCallback(async (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || !tile.originalFile) return;

    // Mark old page as not kept if it exists
    if (tile.pageId) {
      await supabase
        .from("pages")
        .update({ keep: false })
        .eq("id", tile.pageId);
    }

    // Reset tile state
    setTiles(prev => prev.map(t =>
      t.id === tileId ? {
        ...t,
        status: "generating" as const,
        accepted: false,
        coloringImageUrl: undefined,
        pageId: undefined,
        error: undefined,
      } : t
    ));

    // Re-upload
    await uploadFile(tile.originalFile, tileId);
  }, [tiles, uploadFile]);

  const deleteTile = useCallback(async (tileId: string) => {
    const tile = tiles.find(t => t.id === tileId);
    
    // Mark page as not kept in Supabase
    if (tile?.pageId) {
      const { error } = await supabase
        .from("pages")
        .update({ keep: false })
        .eq("id", tile.pageId);

      if (error) {
        console.error("Failed to mark page as deleted:", error);
      }
    }

    // Remove from state
    setTiles(prev => {
      const newTiles = prev.filter(t => t.id !== tileId);
      
      // Adjust selection
      if (selectedTileId === tileId) {
        const deletedIndex = prev.findIndex(t => t.id === tileId);
        const nextTile = newTiles[deletedIndex] || newTiles[deletedIndex - 1] || null;
        setSelectedTileId(nextTile?.id || null);
      }
      
      return newTiles;
    });

    toast.success("Image removed");
  }, [tiles, selectedTileId]);

  const selectTile = useCallback((tileId: string) => {
    setSelectedTileId(tileId);
  }, []);

  const selectedTile = tiles.find(t => t.id === selectedTileId) || null;

  const isProcessing = tiles.some(t => t.status === "uploading" || t.status === "generating");
  const canContinue = tiles.length > 0 && 
    tiles.every(t => t.status === "ready" && t.accepted);

  return {
    tiles,
    selectedTileId,
    selectedTile,
    isProcessing,
    canContinue,
    addFiles,
    acceptTile,
    regenerateTile,
    deleteTile,
    selectTile,
  };
}
