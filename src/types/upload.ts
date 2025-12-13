export type TileStatus = "uploading" | "generating" | "ready" | "failed" | "fallback";

export interface UploadTile {
  id: string; // local uuid
  pageId?: string; // Supabase pages.id
  originalFile: File;
  coloringImageUrl?: string;
  status: TileStatus;
  accepted: boolean;
  error?: string;
}
