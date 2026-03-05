import { useEffect, useRef, useState } from "react";
import {
  computeSharpnessVariance,
  detectShadow,
  SHARPNESS_THRESHOLD,
  ANALYSIS_WIDTH,
  ANALYSIS_HEIGHT,
} from "../utils/imageAnalysis";

interface Orientation {
  beta: number;
  gamma: number;
}

interface LevelIndicatorProps {
  orientation: Orientation;
  isLevel: boolean;
}

function LevelIndicator({ orientation, isLevel }: LevelIndicatorProps) {
  const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
  const x = clamp(orientation.gamma / 30, -1, 1) * 24;
  const y = clamp(orientation.beta / 30, -1, 1) * 24;

  return (
    <div
      className="w-16 h-16 rounded-full border border-white/30 bg-black/30 relative flex items-center justify-center"
      aria-label="Level indicator"
    >
      {/* Crosshair */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full h-px bg-white/20" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="h-full w-px bg-white/20" />
      </div>
      {/* Bubble */}
      <div
        className={[
          "w-5 h-5 rounded-full transition-transform",
          isLevel ? "bg-sage" : "bg-white/70",
        ].join(" ")}
        style={{ transform: `translate(${x}px, ${y}px)` }}
      />
    </div>
  );
}

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
  hidden?: boolean;
}

const RAF_THROTTLE_MS = 150;

export default function CameraCapture({ onCapture, onClose, hidden }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafIdRef = useRef<number>(0);
  const lastAnalysisRef = useRef<number>(0);

  const [sharpnessVariance, setSharpnessVariance] = useState(100);
  const [hasShadow, setHasShadow] = useState(false);
  const [orientation, setOrientation] = useState<Orientation | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [canToggleTorch, setCanToggleTorch] = useState(false);

  const isBlurry = sharpnessVariance < SHARPNESS_THRESHOLD;
  const isLevel = orientation !== null && Math.abs(orientation.beta) < 10 && Math.abs(orientation.gamma) < 10;
  const showLevel = orientation !== null;

  // Effect 1: Camera stream
  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check torch capability
        const videoTrack = stream.getVideoTracks()[0];
        const capabilities = videoTrack?.getCapabilities?.() as Record<string, unknown> | undefined;
        if (capabilities && "torch" in capabilities) {
          setCanToggleTorch(true);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Offscreen analysis canvas
        const canvas = document.createElement("canvas");
        canvas.width = ANALYSIS_WIDTH;
        canvas.height = ANALYSIS_HEIGHT;
        analysisCanvasRef.current = canvas;

        // Start rAF analysis loop
        function analyzeFrame(timestamp: number) {
          if (cancelled) return;

          const video = videoRef.current;
          const ctx = analysisCanvasRef.current?.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D | null;

          if (video && ctx && video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
            if (timestamp - lastAnalysisRef.current >= RAF_THROTTLE_MS) {
              lastAnalysisRef.current = timestamp;
              ctx.drawImage(video, 0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
              const imageData = ctx.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT);
              setSharpnessVariance(computeSharpnessVariance(imageData));
              setHasShadow(detectShadow(imageData));
            }
          }

          rafIdRef.current = requestAnimationFrame(analyzeFrame);
        }

        rafIdRef.current = requestAnimationFrame(analyzeFrame);
      } catch {
        if (!cancelled) {
          onClose();
        }
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafIdRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect 2: Device orientation
  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    function handleOrientation(e: DeviceOrientationEvent) {
      if (!mounted) return;
      if (e.beta !== null && e.gamma !== null) {
        setOrientation({ beta: e.beta, gamma: e.gamma });
      }
    }

    async function setupOrientation() {
      // iOS 13+ requires permission
      const DevOri = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<PermissionState>;
      };
      if (typeof DevOri.requestPermission === "function") {
        try {
          const result = await DevOri.requestPermission();
          if (result !== "granted") return;
        } catch {
          return;
        }
      }
      window.addEventListener("deviceorientation", handleOrientation);
      // If no event arrives within 1s, leave orientation null (desktop)
      timeoutId = setTimeout(() => {
        // orientation will remain null if no events came
      }, 1000);
    }

    setupOrientation();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, []);

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(new File([blob], "camera.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  }

  async function toggleTorch() {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;
    const nextTorch = !torchOn;
    try {
      await videoTrack.applyConstraints({
        advanced: [{ torch: nextTorch } as unknown as MediaTrackConstraintSet],
      });
      setTorchOn(nextTorch);
    } catch {
      // Torch not supported or failed — ignore
    }
  }

  return (
    <div
      className={[
        "fixed inset-0 z-[70] bg-black flex flex-col",
        hidden ? "hidden" : "",
      ].join(" ")}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center"
          aria-label="Close camera"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {canToggleTorch && (
          <button
            type="button"
            onClick={toggleTorch}
            className={[
              "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
              torchOn ? "bg-amber-400 text-black" : "bg-black/50 text-white",
            ].join(" ")}
            aria-label={torchOn ? "Turn off torch" : "Turn on torch"}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
        )}
      </div>

      {/* Video area */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Guide overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="relative w-[80%] aspect-[3/4] rounded-2xl border-2 border-white/30"
            style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
          >
            {/* Corner accents */}
            {/* Top-left */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-card rounded-tl-lg" />
            {/* Top-right */}
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-card rounded-tr-lg" />
            {/* Bottom-left */}
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-card rounded-bl-lg" />
            {/* Bottom-right */}
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-card rounded-br-lg" />

            <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs">
              Align recipe card here
            </p>
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className="px-4 pt-3 pb-6"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Status badges */}
        <div className="flex justify-center gap-3 h-6 mb-4">
          {hasShadow && (
            <span className="px-2 py-0.5 rounded-full border border-rose/30 bg-rose/10 text-rose text-xs font-medium">
              Shadow detected
            </span>
          )}
          {isBlurry && (
            <span className="px-2 py-0.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-medium">
              Blurry — hold still
            </span>
          )}
        </div>

        {/* Level + Capture row */}
        <div className="relative flex items-center justify-center">
          {showLevel && orientation && (
            <div className="absolute left-4">
              <LevelIndicator orientation={orientation} isLevel={isLevel} />
            </div>
          )}

          {/* Capture button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={isBlurry}
            className={[
              "w-20 h-20 rounded-full border-4 border-card bg-white/90 transition-opacity",
              isBlurry ? "opacity-40 cursor-not-allowed" : "active:scale-95",
            ].join(" ")}
            aria-label="Capture photo"
          >
            <span className="sr-only">Capture</span>
          </button>
        </div>
      </div>
    </div>
  );
}
