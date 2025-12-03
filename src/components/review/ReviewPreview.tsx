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
      <Card className="flex-1 flex items-center justify-center bg-muted/30">
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
      <Card className="flex-1 flex flex-col items-center justify-center bg-muted/30 p-6">
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
    <Card className={`flex-1 flex flex-col items-center justify-center p-4 overflow-hidden ${
      page.accepted ? "ring-2 ring-green-500" : ""
    }`}>
      {/* 8.5x11 aspect ratio page container - constrained to fit viewport */}
      <div 
        className="relative bg-white shadow-lg flex-shrink-0"
        style={{
          aspectRatio: "8.5 / 11",
          width: "min(100%, calc((100vh - 200px) * 8.5 / 11))",
          maxWidth: "600px",
          maxHeight: "calc(100vh - 200px)",
        }}
      >
        {/* Title area at top: 0.75" to 2.0" from top */}
        {page.heading_text && (
          <div 
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{
              top: "6.8%",
              height: "11.4%",
              paddingLeft: "8.8%",
              paddingRight: "8.8%",
            }}
          >
            <span 
              className="text-black font-bold uppercase text-center"
              style={{ fontSize: "clamp(12px, 2.5vw, 28px)" }}
            >
              {page.heading_text}
            </span>
          </div>
        )}

        {/* Image area with optional border frame */}
        <div 
          className="absolute flex items-center justify-center"
          style={{
            top: page.heading_text ? "18.2%" : "6.8%",
            left: "8.8%",
            right: "8.8%",
            bottom: "6.8%",
            ...(hasBorder ? borderStyle : {}),
          }}
        >
          <img
            src={page.coloring_image_url}
            alt="Coloring page preview"
            className="max-w-full max-h-full object-contain"
          />
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
