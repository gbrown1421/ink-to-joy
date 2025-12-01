import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ImageTroubleshootingModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImageTroubleshootingModal({ open, onClose }: ImageTroubleshootingModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">How to fix images that won't process</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-sm">
          <p className="text-muted-foreground">
            Sometimes photos are in a format our system can't read (like HEIC, Live Photos, or certain PNGs). 
            Fix it by making a simple PNG or JPEG copy, then upload that version.
          </p>

          {/* Windows Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Windows</h3>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Open your photo on your computer.</li>
              <li>
                <strong>Quick fix (recommended):</strong> Press <kbd className="px-2 py-0.5 bg-muted rounded">Windows + Shift + S</kbd>, 
                drag to capture the photo, then save the snip as PNG or JPG.
              </li>
              <li>
                <strong>Or in Paint:</strong> Right-click the photo → Open with → Paint → File → Save As → PNG picture.
              </li>
              <li>Come back here and upload the new file.</li>
            </ol>
          </div>

          {/* iPhone/iPad Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">iPhone / iPad</h3>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Open the photo in the Photos app.</li>
              <li>
                <strong>Easiest:</strong> Take a screenshot (<kbd className="px-2 py-0.5 bg-muted rounded">Side Button + Volume Up</kbd>), 
                tap the preview, then Done → Save to Photos.
              </li>
              <li>Upload the screenshot instead of the original.</li>
              <li className="text-muted-foreground">
                <strong>(Optional)</strong> You can also use Share → Save to Files in some apps and export as .jpg or .png if available.
              </li>
            </ol>
          </div>

          {/* Android Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-base">Android</h3>
            <ol className="list-decimal list-inside space-y-2 pl-2">
              <li>Open the photo in your gallery app.</li>
              <li>Use Edit → Save as copy or Share / Export, and choose PNG or JPG/JPEG if the option is there.</li>
              <li>If not, take a screenshot of the photo and upload the screenshot.</li>
            </ol>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border">
            <p className="text-muted-foreground text-sm">
              After you upload the new PNG/JPEG version, we'll process it again with your selected difficulty level.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
