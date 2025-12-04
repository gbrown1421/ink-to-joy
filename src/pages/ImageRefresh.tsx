import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Check, RefreshCw, Trash2, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type LocalStatus = "processing" | "ready" | "accepted" | "failed";

interface LocalImage {
  id: string;
  name: string;
  originalFile: File;
  normalizedBlob?: Blob;
  previewUrl?: string;
  status: LocalStatus;
  error?: string;
}

const MAX_EDGE = 1600;

// Normalize any image to a boring, OpenAI-safe PNG (RGB, no alpha, downscaled)
async function normalizeToPng(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      const maxEdge = Math.max(width, height);
      if (maxEdge > MAX_EDGE) {
        const scale = MAX_EDGE / maxEdge;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas is not supported in this browser."));
        return;
      }

      // White background so we kill weird alpha modes
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to export normalized image."));
            return;
          }
          resolve(blob);
        },
        "image/png",
        0.92
      );
    };

    img.onerror = () => reject(new Error("Failed to load image in browser."));
    img.src = URL.createObjectURL(file);
  });
}

export default function ImageRefresh() {
  const navigate = useNavigate();
  const [images, setImages] = useState<LocalImage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.previewUrl) URL.revokeObjectURL(img.previewUrl);
      });
    };
  }, [images]);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);

    files.forEach((file) => {
      const id = crypto.randomUUID();
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const item: LocalImage = {
        id,
        name: `${baseName}-refreshed.png`,
        originalFile: file,
        status: "processing",
      };

      setImages((prev) => [...prev, item]);
      setSelectedId((current) => current ?? id);

      normalizeToPng(file)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? { ...img, normalizedBlob: blob, previewUrl: url, status: "ready" }
                : img
            )
          );
        })
        .catch((err) => {
          setImages((prev) =>
            prev.map((img) =>
              img.id === id
                ? { ...img, status: "failed", error: err.message }
                : img
            )
          );
        });
    });
  };

  const selected = images.find((i) => i.id === selectedId) ?? images[0] ?? null;

  const handleAccept = () => {
    if (!selected || selected.status === "failed" || !selected.normalizedBlob) return;
    setImages((prev) =>
      prev.map((img) =>
        img.id === selected.id ? { ...img, status: "accepted" } : img
      )
    );
  };

  const handleDelete = () => {
    if (!selected) return;
    setImages((prev) => prev.filter((img) => img.id !== selected.id));
    setSelectedId((prevId) => {
      if (prevId !== selected.id) return prevId;
      const remaining = images.filter((img) => img.id !== selected.id);
      return remaining[0]?.id ?? null;
    });
  };

  const handleNewImage = () => {
    // Re-run normalization on the same original file
    if (!selected) return;

    const { originalFile, id } = selected;
    setImages((prev) =>
      prev.map((img) =>
        img.id === id
          ? { ...img, status: "processing", error: undefined }
          : img
      )
    );

    normalizeToPng(originalFile)
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? {
                  ...img,
                  normalizedBlob: blob,
                  previewUrl: url,
                  status: "ready",
                }
              : img
          )
        );
      })
      .catch((err) => {
        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, status: "failed", error: err.message }
              : img
          )
        );
      });
  };

  const allAccepted =
    images.length > 0 && images.every((img) => img.status === "accepted");

  const handleDownloadAll = async () => {
    if (!allAccepted) return;
    setIsDownloading(true);

    try {
      for (const img of images) {
        if (!img.normalizedBlob) continue;

        const url = URL.createObjectURL(img.normalizedBlob);
        const a = document.createElement("a");
        a.href = url;
        a.download = img.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-muted/50">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-foreground">Image Refresh</h1>
          <p className="text-xs text-muted-foreground">
            Normalize photos to simple PNGs for AI tools
          </p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left filmstrip */}
        <aside className="w-64 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 space-y-2">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setSelectedId(img.id)}
                className={`w-full flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs transition-colors ${
                  img.id === selected?.id
                    ? "border-primary bg-primary/10"
                    : img.status === "accepted"
                    ? "border-green-500 bg-green-500/10"
                    : "border-border bg-muted/50 hover:bg-muted"
                }`}
              >
                <div className="w-10 h-10 flex-shrink-0 bg-background border border-border rounded overflow-hidden flex items-center justify-center">
                  {img.previewUrl ? (
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-muted-foreground">
                      {img.status === "processing"
                        ? "…"
                        : img.status === "failed"
                        ? "ERR"
                        : "IMG"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden flex-1">
                  <span className="truncate text-foreground">{img.name}</span>
                  <span className="text-[11px] text-muted-foreground capitalize">
                    {img.status}
                  </span>
                </div>
                {img.status === "accepted" && (
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                )}
              </button>
            ))}
            {images.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">
                No images yet. Use "Add Photos" on the right to start.
              </p>
            )}
          </div>
        </aside>

        {/* Center preview */}
        <main className="flex-1 flex items-center justify-center overflow-auto px-8 py-6">
          {selected && selected.previewUrl && (
            <Card className="max-w-[700px] w-full">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="w-[480px] h-[620px] bg-muted/50 border border-border rounded flex items-center justify-center">
                  <img
                    src={selected.previewUrl}
                    alt={selected.name}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground text-center">
                  These refreshed images are downscaled to ~{MAX_EDGE}px max edge,
                  flattened to RGB, and saved as PNG. They should be safe for AI
                  tools that complain about "invalid image file or mode".
                </p>
                {selected.status === "failed" && (
                  <p className="mt-2 text-xs text-destructive">
                    Error: {selected.error ?? "Unknown error while refreshing."}
                  </p>
                )}
              </CardContent>
            </Card>
          )}
          {!selected && (
            <p className="text-sm text-muted-foreground">
              Upload images on the right to begin.
            </p>
          )}
        </main>

        {/* Right controls */}
        <aside className="w-80 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <label className="flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="font-medium text-foreground">Add Photos</span>
                <span>Drag & drop or click to select</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </label>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between">
              <span>Total</span>
              <span className="text-foreground">{images.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Ready</span>
              <span className="text-foreground">
                {images.filter((i) => i.status === "ready").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Accepted</span>
              <span className="text-foreground">
                {images.filter((i) => i.status === "accepted").length}
              </span>
            </div>
          </div>

          <div className="p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-foreground">Image Controls</h2>

            <Button
              className="w-full"
              variant={selected?.status === "accepted" ? "secondary" : "default"}
              onClick={handleAccept}
              disabled={
                !selected || selected.status === "failed" || !selected.normalizedBlob
              }
            >
              <Check className="w-4 h-4 mr-2" />
              {selected?.status === "accepted" ? "Accepted" : "Accept"}
            </Button>

            <Button
              className="w-full"
              variant="outline"
              onClick={handleNewImage}
              disabled={!selected}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Re-refresh
            </Button>

            <Button
              className="w-full"
              variant="destructive"
              onClick={handleDelete}
              disabled={!selected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>

            <div className="mt-4 text-[11px] text-muted-foreground space-y-1">
              <p>1. Upload your photos.</p>
              <p>
                2. Wait for each to finish processing, then click{" "}
                <span className="font-semibold text-foreground">Accept</span>.
              </p>
              <p>
                3. When all are accepted, click{" "}
                <span className="font-semibold text-foreground">Download All</span> to save the
                refreshed PNGs.
              </p>
            </div>
          </div>

          <div className="mt-auto p-4 border-t border-border">
            <Button
              className="w-full"
              onClick={handleDownloadAll}
              disabled={!allAccepted || isDownloading}
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloading ? "Downloading…" : "Download All"}
            </Button>
            <p className="mt-2 text-[11px] text-muted-foreground text-center">
              Download All is enabled after every image has been accepted.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
