import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowRight, Type, Square } from "lucide-react";
import { ReviewPage } from "./ReviewFilmstrip";

interface ReviewControlsCardProps {
  page: ReviewPage | null;
  pages: ReviewPage[];
  onAccept: (pageId: string) => void;
  onUpdateTitle: (pageId: string, title: string) => void;
  onUpdateBorder: (pageId: string, borderStyle: string) => void;
  onContinue: () => void;
}

const BORDER_OPTIONS = [
  { id: "thick", label: "Thick" },
  { id: "thin", label: "Thin" },
  { id: "dashed", label: "Dashed" },
  { id: "none", label: "None" },
];

export function ReviewControlsCard({
  page,
  pages,
  onAccept,
  onUpdateTitle,
  onUpdateBorder,
  onContinue,
}: ReviewControlsCardProps) {
  const [localTitle, setLocalTitle] = useState("");

  // Sync local title with selected page
  useEffect(() => {
    setLocalTitle(page?.heading_text || "");
  }, [page?.id, page?.heading_text]);

  const hasImage = page?.coloring_image_url;
  const canAccept = !!page && !!hasImage;
  const canEditTitle = !!page && !!hasImage;
  const canEditBorder = !!page && !!hasImage;

  // Check if all pages with images are accepted
  const pagesWithImages = pages.filter(p => p.coloring_image_url);
  const allAccepted = pagesWithImages.length > 0 && pagesWithImages.every(p => p.accepted);
  const canContinue = allAccepted;

  const handleTitleChange = (value: string) => {
    // Max 26 characters
    const trimmed = value.slice(0, 26);
    setLocalTitle(trimmed);
    if (page) {
      onUpdateTitle(page.id, trimmed);
    }
  };

  const handleTitleBlur = () => {
    // Persist is already handled in onUpdateTitle with debounce
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-xs">
      {/* Image Controls Card */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold text-sm">Page Controls</h3>

        {/* Accept Button */}
        <Button
          variant={page?.accepted ? "default" : "outline"}
          className={`w-full justify-start ${
            page?.accepted 
              ? "bg-green-600 hover:bg-green-700 text-white" 
              : "border-green-500 text-green-600 hover:bg-green-50"
          }`}
          onClick={() => page && onAccept(page.id)}
          disabled={!canAccept}
        >
          <Check className="w-4 h-4 mr-2" />
          {page?.accepted ? "Accepted" : "Accept"}
        </Button>

        {/* Add Title */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Type className="w-4 h-4" />
            Add Title
          </Label>
          <Input
            value={localTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Enter title (max 26 chars)"
            maxLength={26}
            disabled={!canEditTitle}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            {localTitle.length}/26 characters
          </p>
        </div>

        {/* Add Border */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Square className="w-4 h-4" />
            Add Border
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {BORDER_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={page?.border_style === option.id ? "default" : "outline"}
                size="sm"
                onClick={() => page && onUpdateBorder(page.id, option.id)}
                disabled={!canEditBorder}
                className="text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {/* Create Coloring Book Button */}
      <Button
        size="lg"
        className="w-full"
        onClick={onContinue}
        disabled={!canContinue}
      >
        Create Coloring Book
        <ArrowRight className="w-5 h-5 ml-2" />
      </Button>
      
      {!canContinue && (
        <p className="text-xs text-muted-foreground text-center">
          {pagesWithImages.length === 0 
            ? "No pages available"
            : "Accept all pages to continue"}
        </p>
      )}
    </div>
  );
}
