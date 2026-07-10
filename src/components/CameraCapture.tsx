import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (dataUrl: string) => void;
}

export default function CameraCapture({ onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setStreaming(true);
        }
      })
      .catch(() => setError("Camera access denied. Please allow camera permissions."));

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    onCapture(canvas.toDataURL("image/jpeg"));
  }

  if (error) return <p className="text-sm text-red-600 p-6">{error}</p>;

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-w-lg border border-warm-black/20"
      />
      <canvas ref={canvasRef} className="hidden" />
      <p className="text-xs text-warm-black/50 text-center">
        Place a coin next to the spoon as a size reference.
      </p>
      <button
        onClick={capture}
        disabled={!streaming}
        className="border border-warm-black/80 px-6 py-2 text-xs tracking-widest uppercase hover:bg-warm-black hover:text-cream transition-colors disabled:opacity-30"
      >
        Capture
      </button>
    </div>
  );
}
