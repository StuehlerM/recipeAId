import { useOcrCapture } from "../hooks/useOcrCapture";
import type { RecipeOcrDraftDto } from "../api/types";
import CropModal from "./CropModal";

interface Props {
  onResult: (draft: RecipeOcrDraftDto) => void;
  label?: string;
  className?: string;
}

export default function OcrCaptureButton({ onResult, label = "Scan", className }: Props) {
  const { capture, isLoading, error, clearError, pendingImageUrl, submitCroppedImage, cancelCrop } = useOcrCapture();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          clearError();
          capture(onResult);
        }}
        disabled={isLoading}
        className={[
          "flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sage text-sage text-sm font-medium transition-colors",
          "hover:bg-sage hover:text-card disabled:opacity-50 disabled:cursor-not-allowed",
          className ?? "",
        ].join(" ")}
        aria-label="Scan with camera"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            Scanning…
          </>
        ) : (
          <>
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
              <circle cx="12" cy="13" r="3"/>
            </svg>
            {label}
          </>
        )}
      </button>
      {error && (
        <p className="mt-1 text-rose text-xs">{error}</p>
      )}

      {pendingImageUrl && (
        <CropModal
          imageUrl={pendingImageUrl}
          onConfirm={submitCroppedImage}
          onCancel={cancelCrop}
        />
      )}
    </div>
  );
}
