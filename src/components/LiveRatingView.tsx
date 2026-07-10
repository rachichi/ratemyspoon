import { useEffect, useRef, useState } from "react";
import "@tensorflow/tfjs";
import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import * as faceapi from "@vladmandic/face-api";
import type { SpoonScores } from "../utils/scoring";
import { computeScore, getBadgeColor, BADGE_CLASSES } from "../utils/scoring";
import RatingGraph3D from "./RatingGraph3D";

interface Props {}

const BADGE_DEFS = [
  { key: "bowl"      as const, bx: 0.20, by: 0.28 },
  { key: "enjoyment" as const, bx: 0.72, by: 0.20 },
  { key: "length"    as const, bx: 0.20, by: 0.60 },
  { key: "material"  as const, bx: 0.08, by: 0.45 },
];

const PARALLAX: [number, number][] = [[8, 6], [10, 8], [7, 10], [11, 6]];

interface Anchors {
  bowl:      [number, number];
  enjoyment: [number, number];
  length:    [number, number];
  material:  [number, number];
}

const DEFAULT_ANCHORS: Anchors = {
  bowl:      [0.24, 0.30],
  enjoyment: [0.62, 0.45],
  length:    [0.22, 0.62],
  material:  [0.20, 0.50],
};

// Smoothed spoon axis stored in ref for EMA
interface SpoonAxis { bx: number; by: number; hx: number; hy: number }

const FACE_MODEL_URL = "https://vladmandic.github.io/face-api/model";

const WRIST      = 0;
const FINGERTIPS = [4, 8, 12, 16, 20];
const MID_TIP    = 12;

// Scan the canvas in the region above the fingertips (in the direction the hand points)
// to find the actual spoon head using brightness. Returns the bounding extent of
// the bright region expressed as { topX, topY, botX, botY } along the spoon axis,
// or null if nothing bright is found.
function findSpoonAboveGrip(
  ctx: CanvasRenderingContext2D,
  SW: number, SH: number,
  gripX: number, gripY: number, // average fingertip position
  ux: number, uy: number,       // unit vector pointing toward spoon bowl
  searchLen: number,            // how far to scan (pixels)
): { minT: number; maxT: number; maxLateral: number } | null {
  const STEP   = 4;
  const LAT    = searchLen * 0.25; // lateral scan width (half)
  const BRIGHT = 175;

  // Perpendicular unit vector
  const px = -uy, py = ux;

  // Read the whole bounding region once
  const regionX = Math.max(0, Math.floor(gripX - LAT - searchLen));
  const regionY = Math.max(0, Math.floor(gripY - LAT - searchLen));
  const regionW = Math.min(SW - regionX, Math.ceil(LAT * 2 + searchLen * 2));
  const regionH = Math.min(SH - regionY, Math.ceil(LAT * 2 + searchLen * 2));
  if (regionW <= 0 || regionH <= 0) return null;
  const imgData = ctx.getImageData(regionX, regionY, regionW, regionH);

  let minT = Infinity, maxT = -Infinity, maxLat = 0;
  let found = 0;

  for (let t = searchLen * 0.05; t <= searchLen; t += STEP) {
    for (let l = -LAT; l <= LAT; l += STEP) {
      const cx = Math.round(gripX + ux * t + px * l);
      const cy = Math.round(gripY + uy * t + py * l);
      if (cx < regionX || cx >= regionX + regionW || cy < regionY || cy >= regionY + regionH) continue;
      const ix = cx - regionX, iy = cy - regionY;
      const idx = (iy * regionW + ix) * 4;
      const lum = imgData.data[idx]! * 0.299 + imgData.data[idx + 1]! * 0.587 + imgData.data[idx + 2]! * 0.114;
      if (lum > BRIGHT) {
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
        if (Math.abs(l) > maxLat) maxLat = Math.abs(l);
        found++;
      }
    }
  }

  if (found < 8 || maxT - minT < searchLen * 0.08) return null;
  return { minT, maxT, maxLateral: Math.max(maxLat, searchLen * 0.04) };
}

function ema(prev: number, next: number, alpha: number): number {
  return prev * (1 - alpha) + next * alpha;
}

function snapMaterial(val: number): number {
  if (val > 20) return 25;
  if (val > 7.5) return 15;
  return 0;
}

function generateReview(scores: SpoonScores): string {
  const total = computeScore(scores);
  const mat   = scores.material === 25 ? "metal" : scores.material === 15 ? "wood" : "plastic";
  const expr  = scores.enjoyment >= 21 ? "You look happy — must be a great spoon."
              : scores.enjoyment >= 14 ? "Expression neutral. Warming up to it."
              : "You look unimpressed. Can't blame you.";
  const prop  = scores.length >= 20 && scores.bowl >= 20 ? "Good proportions."
              : scores.length >= 15 ? "Decent length." : "Handle could be longer.";
  if (total >= 85) return `${prop} Excellent ${mat} spoon. ${expr}`;
  if (total >= 65) return `Solid ${mat} spoon. ${prop} ${expr}`;
  if (total >= 40) return `Average ${mat}. ${prop} ${expr}`;
  return `This ${mat} spoon leaves a lot to be desired. ${expr}`;
}

export default function LiveRatingView(_props: Props) {
  const videoRef     = useRef<HTMLVideoElement>(null);
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const stageRef     = useRef<HTMLDivElement>(null);
  const handRef      = useRef<handPoseDetection.HandDetector | null>(null);
  const emaRef        = useRef<SpoonScores>({ bowl: 12, enjoyment: 12, length: 12, material: 25 });
  const axisRef       = useRef<SpoonAxis | null>(null);
  const matRef        = useRef<number | null>(null);
  const stageSizeRef  = useRef({ w: 1024, h: 600 });
  const frameCountRef = useRef(0);
  const mouseTarget   = useRef({ x: 0, y: 0 });
  const mouseSmooth   = useRef({ x: 0, y: 0 });
  const rafRef        = useRef<number>(0);

  const [scores,      setScores]      = useState<SpoonScores>({ bowl: 12, enjoyment: 12, length: 12, material: 25 });
  const [anchors,     setAnchors]     = useState<Anchors>(DEFAULT_ANCHORS);
  // SVG polygon points string for the oriented spoon box
  const [spoonPoly,   setSpoonPoly]   = useState<string | null>(null);
  const [spoonFound,  setSpoonFound]  = useState(false);
  const [stageSize,   setStageSize]   = useState({ w: 1024, h: 600 });
  const [smoothMouse, setSmoothMouse] = useState({ x: 0, y: 0 });
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [matOverride, setMatOverride] = useState<number | null>(null);
  const [loadingMsg,  setLoadingMsg]  = useState<string>("Loading models…");
  const [modelsReady, setModelsReady] = useState(false);
  const [debugText,   setDebugText]   = useState<string>("");

  useEffect(() => { stageSizeRef.current = stageSize; }, [stageSize]);

  // ── Load models ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingMsg("Loading hand detector…");
      handRef.current = await handPoseDetection.createDetector(
        handPoseDetection.SupportedModels.MediaPipeHands,
        { runtime: "tfjs", modelType: "lite", maxHands: 1 },
      );
      setLoadingMsg("Loading face model…");
      await faceapi.nets.tinyFaceDetector.loadFromUri(FACE_MODEL_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(FACE_MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(FACE_MODEL_URL);
      setModelsReady(true);
    }
    load().catch(e => {
      console.error("Model load failed:", e);
      setLoadingMsg("Model load failed — check console.");
    });
  }, []);

  // ── Stage resize ────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => { const r = el.getBoundingClientRect(); setStageSize({ w: r.width, h: r.height }); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Mouse parallax ──────────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouseTarget.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      };
    };
    window.addEventListener("mousemove", onMove);
    function tick() {
      mouseSmooth.current.x += (mouseTarget.current.x - mouseSmooth.current.x) * 0.07;
      mouseSmooth.current.y += (mouseTarget.current.y - mouseSmooth.current.y) * 0.07;
      setSmoothMouse({ x: mouseSmooth.current.x, y: mouseSmooth.current.y });
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(rafRef.current); };
  }, []);

  // ── Camera stream ───────────────────────────────────────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 } } })
      .then(s => { stream = s; if (videoRef.current) videoRef.current.srcObject = s; })
      .catch(() => setCameraError("Camera access denied. Allow camera permissions to rate your spoon."));
    return () => { stream?.getTracks().forEach(t => t.stop()); };
  }, []);

  // ── Analysis loop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!modelsReady) return;
    let cancelled = false;

    async function analyze() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const hand  = handRef.current;

      if (!video || !canvas || !hand || video.videoWidth === 0) {
        if (!cancelled) setTimeout(analyze, 500);
        return;
      }

      const VW = video.videoWidth;
      const VH = video.videoHeight;
      const { w: SW, h: SH } = stageSizeRef.current;

      const scale = Math.max(SW / VW, SH / VH);
      const ox    = (SW - VW * scale) / 2;
      const oy    = (SH - VH * scale) / 2;

      canvas.width  = SW;
      canvas.height = SH;
      const ctx = canvas.getContext("2d")!;
      ctx.save();
      ctx.translate(SW, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, SW - ox - VW * scale, oy, VW * scale, VH * scale);
      ctx.restore();

      try {
        // Hand every frame; face every 3rd (expressions change slowly)
        frameCountRef.current++;
        const runFace = frameCountRef.current % 3 === 0;

        const [hands, face] = await Promise.all([
          hand.estimateHands(video, { flipHorizontal: true }),
          runFace
            ? faceapi
                .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks(true)
                .withFaceExpressions()
            : Promise.resolve(undefined),
        ]);

        if (cancelled) return;

        const detected = hands[0];
        let dbg = `h:${hands.length} sc:${detected?.score?.toFixed(2) ?? "—"} rd:${video.readyState}`;
        let next = { ...emaRef.current };

        if (detected) {
          const kp = detected.keypoints;
          dbg += ` kp:${kp.length}`;
          // Transform keypoints from video pixel space → stage pixel space (object-cover)
          const sp = kp.map(k => ({ x: k.x * scale + ox, y: k.y * scale + oy }));

          const wristPt  = sp[WRIST]!;
          const midTipPt = sp[MID_TIP]!;

          // Average fingertip position for a stable grip-tip centre
          const tipAvg = FINGERTIPS.reduce(
            (acc, i) => ({ x: acc.x + sp[i]!.x / FINGERTIPS.length, y: acc.y + sp[i]!.y / FINGERTIPS.length }),
            { x: 0, y: 0 },
          );

          // Unit vector from wrist toward fingertips (= spoon axis direction)
          const dx      = midTipPt.x - wristPt.x;
          const dy      = midTipPt.y - wristPt.y;
          const handLen = Math.sqrt(dx * dx + dy * dy) || 1;
          const ux = dx / handLen, uy = dy / handLen;

          // Scan above the fingertips for the actual bright spoon region
          const searchLen = handLen * 2.0;
          const scan = findSpoonAboveGrip(ctx, SW, SH, tipAvg.x, tipAvg.y, ux, uy, searchLen);

          // Fall back to estimated positions if scan finds nothing
          const spoonTopT  = scan ? scan.minT : handLen * 0.15;
          const spoonBotT  = scan ? scan.maxT : handLen * 0.90;
          const spoonHalfW = scan ? scan.maxLateral : handLen * 0.10;

          // Spoon tip (far end, toward bowl) and base (near grip)
          const rawBowlX   = tipAvg.x + ux * spoonBotT;
          const rawBowlY   = tipAvg.y + uy * spoonBotT;
          const rawBaseX   = tipAvg.x + ux * spoonTopT;
          const rawBaseY   = tipAvg.y + uy * spoonTopT;

          // EMA smooth the axis endpoints
          const prev = axisRef.current ?? { bx: rawBowlX, by: rawBowlY, hx: rawBaseX, hy: rawBaseY };
          const smooth: SpoonAxis = {
            bx: ema(prev.bx, rawBowlX, 0.30),
            by: ema(prev.by, rawBowlY, 0.22),
            hx: ema(prev.hx, rawBaseX, 0.30),
            hy: ema(prev.hy, rawBaseY, 0.22),
          };
          axisRef.current = smooth;

          // Oriented polygon fitted to the scanned spoon region
          const adx  = smooth.bx - smooth.hx;
          const ady  = smooth.by - smooth.hy;
          const alen = Math.sqrt(adx * adx + ady * ady) || 1;
          const hw   = Math.max(spoonHalfW, alen * 0.06);
          const perpX = (-ady / alen) * hw;
          const perpY = ( adx / alen) * hw;

          const pts: [number, number][] = [
            [smooth.hx + perpX, smooth.hy + perpY],
            [smooth.hx - perpX, smooth.hy - perpY],
            [smooth.bx - perpX, smooth.by - perpY],
            [smooth.bx + perpX, smooth.by + perpY],
          ];
          setSpoonPoly(pts.map(([x, y]) => `${x},${y}`).join(" "));
          setSpoonFound(true);
          dbg += " FOUND";

          // Anchors as fractions of stage
          setAnchors(prev => ({
            ...prev,
            bowl:     [smooth.bx / SW, smooth.by / SH] as [number, number],
            length:   [(smooth.bx + smooth.hx) / 2 / SW, (smooth.by + smooth.hy) / 2 / SH] as [number, number],
            material: [smooth.hx / SW, smooth.hy / SH] as [number, number],
          }));

          // Scores from spoon geometry
          const spoonLen  = alen;
          const handSpread = Math.max(...FINGERTIPS.map(i => {
            const p = sp[i]!;
            return Math.sqrt((p.x - tipAvg.x) ** 2 + (p.y - tipAvg.y) ** 2);
          }));

          const lengthScore = Math.round(Math.min(25, Math.max(5, (spoonLen / SH) * 55)));
          const bowlScore   = Math.round(Math.min(25, Math.max(5, (handSpread / handLen) * 55)));

          // Material: pixel sample around the bowl region
          const bx = Math.max(0, Math.floor(smooth.bx - hw * 3));
          const by = Math.max(0, Math.floor(smooth.by - hw * 3));
          const bw = Math.min(SW - bx, Math.max(1, Math.floor(hw * 6)));
          const bh = Math.min(SH - by, Math.max(1, Math.floor(hw * 6)));
          let matRaw = 0;
          if (bw > 0 && bh > 0 && bx < SW && by < SH) {
          const rd = ctx.getImageData(bx, by, bw, bh).data;
          let spec = 0, warm = 0, tot = 0;
          for (let i = 0; i < rd.length; i += 16) {
            const r = rd[i]!, g = rd[i + 1]!, b = rd[i + 2]!;
            const lum = r * 0.299 + g * 0.587 + b * 0.114;
            if (lum > 215) spec++;
            if (r - b > 28 && lum > 65 && lum < 185) warm++;
            tot++;
          }
          matRaw = spec / tot > 0.05 ? 25 : warm / tot > 0.14 ? 15 : 0;
          }

          next = {
            ...next,
            bowl:     Math.round(ema(next.bowl,     bowlScore,   0.25)),
            length:   Math.round(ema(next.length,   lengthScore, 0.25)),
            material: snapMaterial(ema(next.material, matRef.current ?? matRaw, 0.22)),
          };
        } else {
          axisRef.current = null;
          setSpoonPoly(null);
          setSpoonFound(false);
        }

        // ── Smile → enjoyment ─────────────────────────────────────────
        if (face?.expressions) {
          const happy      = face.expressions.happy;
          const happyScore = Math.round(Math.max(8, Math.min(25, happy * 25)));
          next = { ...next, enjoyment: Math.round(ema(next.enjoyment, happyScore, 0.15)) };
          const box = face.detection.box;
          setAnchors(prev => ({
            ...prev,
            enjoyment: [
              (box.x + box.width  * 0.5) / SW,
              (box.y + box.height * 0.72) / SH,
            ] as [number, number],
          }));
        }

        emaRef.current = next;
        setScores({ ...next });
        setDebugText(dbg);
      } catch (e) {
        console.error("Analysis error:", e);
        setDebugText(`ERR: ${String(e).slice(0, 60)}`);
      }

      if (!cancelled) setTimeout(analyze, 280);
    }

    analyze();
    return () => { cancelled = true; };
  }, [modelsReady]);

  // ── Sync material override ──────────────────────────────────────────────────
  useEffect(() => {
    matRef.current = matOverride;
    if (matOverride !== null) {
      emaRef.current = { ...emaRef.current, material: matOverride };
      setScores(prev => ({ ...prev, material: matOverride }));
    }
  }, [matOverride]);

  const { w, h } = stageSize;
  // Show 0 for everything until a spoon is in frame
  const displayScores: SpoonScores = spoonFound
    ? scores
    : { bowl: 0, enjoyment: 0, length: 0, material: 0 };
  const score = spoonFound ? computeScore(scores) : 0;
  const badgeOffsets = BADGE_DEFS.map((_, i) => ({
    px: smoothMouse.x * (PARALLAX[i]?.[0] ?? 8),
    py: smoothMouse.y * (PARALLAX[i]?.[1] ?? 6),
  }));

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Video stage ─────────────────────────────────────────────────── */}
      <div ref={stageRef} className="relative flex-1 overflow-hidden bg-black">
        <video ref={videoRef} autoPlay playsInline muted
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera denied — grey the stage, keep a legible message */}
        {cameraError && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60">
            <p className="text-white/80 text-sm text-center max-w-xs leading-relaxed px-6">{cameraError}</p>
          </div>
        )}

        {!modelsReady && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
            <p className="text-white text-[10px] tracking-widest uppercase">{loadingMsg}</p>
          </div>
        )}

        {modelsReady && debugText && (
          <div className="absolute bottom-2 left-2 z-40 bg-black/60 text-white text-[9px] font-mono px-2 py-1 rounded">
            {debugText}
          </div>
        )}

        {/* Spoon polygon + annotation lines — only when spoon is in frame */}
        {modelsReady && spoonFound && (
          <svg
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 15, overflow: "visible" }}
            viewBox={`0 0 ${w} ${h}`}
          >
            {spoonPoly && (
              <polygon
                points={spoonPoly}
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.65"
              />
            )}
            {BADGE_DEFS.map(({ key, bx, by }, i) => {
              const val   = displayScores[key];
              const color = getBadgeColor(val);
              const { px, py } = badgeOffsets[i]!;
              const [ax, ay]   = anchors[key];
              const badgeCx = bx * w + px;
              const badgeCy = by * h + py;
              const anchorX = ax * w;
              const anchorY = ay * h;
              const dx = anchorX - badgeCx, dy = anchorY - badgeCy;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const edge = Math.min(55, dist * 0.4);
              const stroke = color === "green" ? "#3a8a3a" : color === "amber" ? "#9a6020" : "#8a2020";
              return (
                <g key={key}>
                  <line
                    x1={badgeCx + (dx / dist) * edge} y1={badgeCy + (dy / dist) * edge}
                    x2={anchorX} y2={anchorY}
                    stroke={stroke} strokeWidth="1.5" strokeDasharray="5 4" opacity="0.8"
                  />
                  <circle cx={anchorX} cy={anchorY} r={3.5} fill={stroke} opacity="0.9" />
                </g>
              );
            })}
          </svg>
        )}

        {modelsReady && spoonFound && BADGE_DEFS.map(({ key, bx, by }, i) => {
          const val   = displayScores[key];
          const color = getBadgeColor(val);
          const { px, py } = badgeOffsets[i]!;
          return (
            <div key={key}
              style={{
                position: "absolute",
                left: `${bx * 100}%`, top: `${by * 100}%`,
                transform: `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`,
                zIndex: 20,
                transition: "background-color 0.5s ease",
              }}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${BADGE_CLASSES[color]}`}
            >
              {key}: {val}/25
            </div>
          );
        })}
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`w-64 shrink-0 border-l border-warm-black/20 flex flex-col bg-white overflow-y-auto ${cameraError ? "opacity-40 pointer-events-none select-none" : ""}`}>
        <div className="p-5 flex flex-col gap-5">

          <div className="text-center pt-1">
            <div className={`text-3xl font-light tabular-nums transition-colors ${spoonFound ? "text-warm-black" : "text-warm-black/25"}`}>
              {spoonFound ? `${score}/100` : "—/100"}
            </div>
          </div>

          <p className="text-xs leading-relaxed text-warm-black/70 text-center">
            {spoonFound ? generateReview(scores) : "No spoon detected."}
          </p>

          <div className="flex flex-col gap-2">
            {(["bowl", "enjoyment", "length", "material"] as const).map(cat => {
              const val   = displayScores[cat];
              const color = getBadgeColor(val);
              return (
                <div key={cat} className={`flex items-center gap-2 transition-opacity ${spoonFound ? "opacity-100" : "opacity-30"}`}>
                  <span className="text-[10px] uppercase tracking-wide text-warm-black/50 w-20">{cat}</span>
                  <div className="flex-1 h-1 bg-warm-black/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        spoonFound
                          ? color === "green" ? "bg-[#4a9a4a]" : color === "amber" ? "bg-[#c07a20]" : "bg-[#c03030]"
                          : "bg-warm-black/20"
                      }`}
                      style={{ width: `${(val / 25) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-warm-black/50 w-6 text-right tabular-nums">{spoonFound ? val : "—"}</span>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-warm-black/40 mb-2">Material</p>
            <div className="flex gap-1">
              {([null, 0, 15, 25] as const).map(v => (
                <button key={String(v)} onClick={() => setMatOverride(v)}
                  className={`flex-1 py-1.5 text-[9px] uppercase tracking-wide border transition-colors ${
                    matOverride === v
                      ? "border-warm-black bg-warm-black text-cream"
                      : "border-warm-black/25 text-warm-black/45 hover:border-warm-black hover:text-warm-black"
                  }`}
                >
                  {v === null ? "auto" : v === 0 ? "plastic" : v === 15 ? "wood" : "metal"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-warm-black/40 mb-2">Rating Surface</p>
            <div style={{ height: 240 }}>
              <RatingGraph3D />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
