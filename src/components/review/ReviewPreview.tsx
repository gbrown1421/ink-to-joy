import { Card } from "@/components/ui/card";
import { ImageIcon, AlertCircle } from "lucide-react";
import { ReviewPage } from "./ReviewFilmstrip";

interface ReviewPreviewProps {
  page: ReviewPage | null;
}

// Border styling based on border_style
const getBorderStyle = (style: string) => {
  switch (style) {
    case "thick":
      return { border: "3px solid black" };
    case "thin":
      return { border: "1px solid black" };
    case "dashed":
      return { border: "2px dashed black" };
    case "none":
    default:
      return {};
  }
};

export function ReviewPreview({ page }: ReviewPreviewProps) {
  if (!page) {
    return (
      <Card className="flex-1 flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Select a page to preview</p>
          <p className="text-sm mt-1">Click on a thumbnail in the filmstrip</p>
        </div>
      </Card>
    );
  }

  const hasImage = !!page.coloring_image_url;

  if (!hasImage) {
    return (
      <Card className="flex-1 flex flex-col items-center justify-start pt-8 bg-card p-6">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <p className="text-xl text-destructive font-semibold text-center mb-2">
          This page doesn't have a coloring image yet.
        </p>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Go back to the Upload step to fix or remove this photo.
        </p>
      </Card>
    );
  }

  const borderStyle = getBorderStyle(page.border_style);
  const hasBorder = page.border_style && page.border_style !== "none";

  return (
    <Card className={`flex-1 flex flex-col items-center justify-start p-6 overflow-hidden bg-card ${
      page.accepted ? "ring-2 ring-green-500" : ""
    }`}>
      {/* 8.5x11 aspect ratio page container - top-aligned with constrained size */}
      <div 
        className="relative bg-white shadow-lg flex-shrink-0"
        style={{
          aspectRatio: "8.5 / 11",
          width: "min(100%, calc((100vh - 240px) * 8.5 / 11))",
          maxWidth: "550px",
          maxHeight: "calc(100vh - 240px)",
        }}
      >
        {/* Inner content area with 0.75" margin from all edges */}
        {/* 0.75" on 8.5" = ~8.8% margin */}
        <div 
          className="absolute flex flex-col"
          style={{
            top: "6.8%",
            left: "8.8%",
            right: "8.8%",
            bottom: "6.8%",
            ...(hasBorder ? borderStyle : {}),
          }}
        >
          {/* Title area inside the border: from top to ~1.25" down (which is 2" - 0.75" = 1.25" for title band) */}
          {/* 1.25" on 11" = ~11.4% of page height, but relative to the inner area */}
          {page.heading_text && (
            <div 
              className="flex items-center justify-center flex-shrink-0"
              style={{
                height: "14.5%", // ~1.25" relative to inner content area height
                paddingTop: hasBorder ? "4px" : "0",
                paddingLeft: hasBorder ? "4px" : "0",
                paddingRight: hasBorder ? "4px" : "0",
              }}
            >
              <span 
                className="text-black font-bold uppercase text-center"
                style={{ fontSize: "clamp(14px, 2.5vw, 28px)" }}
              >
                {page.heading_text}
              </span>
            </div>
          )}

          {/* Image area - fills remaining space inside border */}
          <div 
            className="flex-1 flex items-center justify-center min-h-0"
            style={{
              padding: hasBorder ? "4px" : "0",
            }}
          >
            <img
              src={page.coloring_image_url}
              alt="Coloring page preview"
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Accepted badge */}
      {page.accepted && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          ✓ Accepted
        </div>
      )}

      {/* Tip text below preview */}
      <p className="text-xs text-muted-foreground text-center mt-4 max-w-md flex-shrink-0">
        Tip: Accept each page when it looks right. You can still go back to change photos later; titles and borders will be remembered.
      </p>
    </Card>
  );
}
