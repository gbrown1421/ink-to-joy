import { Card } from "@/components/ui/card";
import { ImageIcon, AlertCircle } from "lucide-react";
import { ReviewPage } from "./ReviewFilmstrip";

interface ReviewPreviewProps {
  page: ReviewPage | null;
}

// Border inset styling based on border_style
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
      <Card className="flex-1 flex items-center justify-center bg-muted/30 overflow-auto">
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
      <Card className="flex-1 flex flex-col items-center justify-center bg-muted/30 overflow-auto p-6">
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
    <Card className={`flex-1 overflow-auto relative flex flex-col items-center justify-center p-4 ${
      page.accepted ? "ring-2 ring-green-500" : ""
    }`}>
      {/* 8.5x11 aspect ratio container */}
      <div 
        className="relative bg-white shadow-lg"
        style={{
          aspectRatio: "8.5 / 11",
          maxHeight: "100%",
          maxWidth: "100%",
          width: "auto",
          height: "auto",
        }}
      >
        {/* Title area: top 0.75" to 2.0" (about 11.4% from top, 11.4% height of total) */}
        {page.heading_text && (
          <div 
            className="absolute left-0 right-0 flex items-center justify-center"
            style={{
              top: "6.8%", // ~0.75" / 11"
              height: "11.4%", // ~1.25" / 11"
              paddingLeft: "8.8%", // ~0.75" / 8.5"
              paddingRight: "8.8%",
            }}
          >
            <span 
              className="text-black font-bold uppercase text-center"
              style={{ fontSize: "clamp(14px, 3vw, 36px)" }}
            >
              {page.heading_text}
            </span>
          </div>
        )}

        {/* Image container with border frame */}
        <div 
          className="absolute flex items-center justify-center"
          style={{
            top: "18.2%", // ~2" / 11" (below title area)
            left: "8.8%", // ~0.75" / 8.5"
            right: "8.8%",
            bottom: "6.8%", // ~0.75" / 11"
            ...borderStyle,
          }}
        >
          <img
            src={page.coloring_image_url!}
            alt="Coloring page preview"
            className="max-w-full max-h-full object-contain"
            style={{ imageRendering: "crisp-edges" }}
          />
        </div>

        {/* Border frame indicator if no title */}
        {!page.heading_text && hasBorder && (
          <div 
            className="absolute"
            style={{
              top: "6.8%",
              left: "8.8%",
              right: "8.8%",
              bottom: "6.8%",
              ...borderStyle,
            }}
          />
        )}
      </div>

      {/* Accepted badge */}
      {page.accepted && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm font-medium shadow-lg">
          ✓ Accepted
        </div>
      )}

      {/* Tip text below preview */}
      <p className="text-xs text-muted-foreground text-center mt-4 max-w-md">
        Tip: Accept each page when it looks right. You can still go back to change photos later; titles and borders will be remembered.
      </p>
    </Card>
  );
}
