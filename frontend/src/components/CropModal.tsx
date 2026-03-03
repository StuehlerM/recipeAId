import { useRef, useState, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { enhanceForOcr } from "../utils/imageEnhance";

interface Props {
  imageUrl: string;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

/**
 * Fullscreen overlay that lets the user crop a captured image
 * before sending it to OCR. Applies automatic image enhancement
 * (grayscale + contrast + sharpen) to the cropped region.
 */
export default function CropModal({ imageUrl, onConfirm, onCancel }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [processing, setProcessing] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    imgRef.current = e.currentTarget;
    // Default crop: full image
    setCrop({ unit: "%", x: 0, y: 0, width: 100, height: 100 });
  }, []);

  async function handleConfirm() {
    const img = imgRef.current;
    if (!img) return;

    setProcessing(true);
    try {
      // Determine crop region in natural (full-resolution) pixels
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;

      if (completedCrop && completedCrop.width > 0 && completedCrop.height > 0) {
        // completedCrop is in display pixels — scale to natural
        const scaleX = img.naturalWidth / img.width;
        const scaleY = img.naturalHeight / img.height;
        sx = Math.round(completedCrop.x * scaleX);
        sy = Math.round(completedCrop.y * scaleY);
        sw = Math.round(completedCrop.width * scaleX);
        sh = Math.round(completedCrop.height * scaleY);
      }

      // Draw cropped region to canvas
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

      // Enhance for OCR
      const enhanced = enhanceForOcr(canvas);

      // Convert to JPEG
      const blob = await new Promise<Blob>((resolve, reject) => {
        enhanced.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("JPEG conversion failed"))),
          "image/jpeg",
          0.85,
        );
      });

      onConfirm(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-edge">
        <h2 className="text-lg font-semibold text-ink">Crop Image</h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={processing}
          className="text-sm text-ghost hover:text-ink transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      {/* Crop area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-tint">
        <ReactCrop
          crop={crop}
          onChange={(c) => setCrop(c)}
          onComplete={(c) => setCompletedCrop(c)}
          className="max-h-full"
        >
          <img
            src={imageUrl}
            alt="Captured recipe"
            onLoad={onImageLoad}
            className="max-w-full max-h-[70vh] object-contain"
          />
        </ReactCrop>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-ghost px-4 py-2">
        Drag to select the text area, or scan the full image as-is.
      </p>

      {/* Action button */}
      <div className="px-4 pb-6 pt-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={processing}
          className="w-full py-3 rounded-xl bg-sage text-white font-semibold text-base transition-colors hover:bg-sage-light disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <svg className="animate-spin w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
              Processing…
            </>
          ) : (
            <>
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              Crop &amp; Scan
            </>
          )}
        </button>
      </div>
    </div>
  );
}
