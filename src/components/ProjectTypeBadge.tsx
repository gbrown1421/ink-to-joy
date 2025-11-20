import { Badge } from "@/components/ui/badge";
import { Palette, Smile } from "lucide-react";

interface ProjectTypeBadgeProps {
  projectType: "coloring" | "toon";
}

export const ProjectTypeBadge = ({ projectType }: ProjectTypeBadgeProps) => {
  return (
    <Badge variant="secondary" className="flex items-center gap-1.5">
      {projectType === "coloring" ? (
        <>
          <Palette className="w-3.5 h-3.5" />
          <span>Coloring</span>
        </>
      ) : (
        <>
          <Smile className="w-3.5 h-3.5" />
          <span>Toon</span>
        </>
      )}
    </Badge>
  );
};
