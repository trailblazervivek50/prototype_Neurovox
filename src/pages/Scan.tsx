import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { ArrowLeft, Camera, Loader2, ScanFace, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../lib/utils";

// Specific landmarks to highlight for the "premium" feel
const HIGHLIGHT_INDICES = [
  234, 454, // Masseter / Jaw width
  152,      // Mentalis / Chin
  50, 280,  // Zygomaticus / Cheekbones
  168       // Nasion / Between eyes
];

type MaskSize = "Small" | "Medium" | "Large" | null;

export default function Scan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const isScanningRef = useRef(false);
  const [isPositioning, setIsPositioning] = useState(false);
  const isPositioningRef = useRef(false);
  const [positionFeedback, setPositionFeedback] = useState<string>("Face not detected");
  const positionFeedbackRef = useRef<string>("Face not detected");
  const [isPositionValid, setIsPositionValid] = useState(false);
  const isPositionValidRef = useRef<boolean>(false);
  const positionValidTimeRef = useRef<number | null>(null);
  const [maskSize, setMaskSize] = useState<MaskSize>(null);
  const [finalMeasurements, setFinalMeasurements] = useState<{ width: number, height: number, ratio: number } | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const updatePositionFeedback = (feedback: string, isValid: boolean) => {
    if (positionFeedbackRef.current !== feedback) {
      positionFeedbackRef.current = feedback;
      setPositionFeedback(feedback);
    }
    if (isPositionValidRef.current !== isValid) {
      isPositionValidRef.current = isValid;
      setIsPositionValid(isValid);
    }
  };

  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const requestRef = useRef<number>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const calculatedSizeRef = useRef<MaskSize>("Medium");
  const widthHistoryRef = useRef<number[]>([]);
  const heightHistoryRef = useRef<number[]>([]);
  const currentMeasurementsRef = useRef<{ width: number, height: number, ratio: number }>({ width: 0, height: 0, ratio: 0 });

  // Initialize MediaPipe
  useEffect(() => {
    let isMounted = true;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        
        const landmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: false,
          runningMode: "VIDEO",
          numFaces: 1
        });

        if (isMounted) {
          landmarkerRef.current = landmarker;
          startCamera();
        }
      } catch (err) {
        console.error("Failed to initialize FaceLandmarker:", err);
        if (isMounted) setError("Failed to load AI models. Please try again.");
      }
    }

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }
        });
        
        if (videoRef.current && isMounted) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            setIsLoaded(true);
            startTracking();
          };
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        if (isMounted) setError("Camera access is required for face scanning.");
      }
    }

    initMediaPipe();

    return () => {
      isMounted = false;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (landmarkerRef.current) landmarkerRef.current.close();
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startTracking = () => {
    if (!videoRef.current || !canvasRef.current || !landmarkerRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const renderLoop = () => {
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        
        // Ensure canvas matches video dimensions
        if (canvas.width !== video.videoWidth) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const results = landmarkerRef.current!.detectForVideo(video, performance.now());
        
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          if (results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            
            // Draw premium tracking UI
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = "rgba(174, 183, 132, 0.6)"; // Sage green with opacity
            ctx.fillStyle = "#AEB784"; // Sage green

            // Draw connecting lines for a tech feel
            const leftJaw = landmarks[234];
            const rightJaw = landmarks[454];
            const nasion = landmarks[168];
            const chin = landmarks[152];

            const p1 = { x: leftJaw.x * canvas.width, y: leftJaw.y * canvas.height };
            const p2 = { x: rightJaw.x * canvas.width, y: rightJaw.y * canvas.height };
            const p3 = { x: nasion.x * canvas.width, y: nasion.y * canvas.height };
            const p4 = { x: chin.x * canvas.width, y: chin.y * canvas.height };

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Draw specific highlight points
            HIGHLIGHT_INDICES.forEach(index => {
              const point = landmarks[index];
              if (!point) return;
              
              const x = point.x * canvas.width;
              const y = point.y * canvas.height;

              // Outer glow
              ctx.beginPath();
              ctx.arc(x, y, 6, 0, 2 * Math.PI);
              ctx.fillStyle = "rgba(174, 183, 132, 0.3)";
              ctx.fill();

              // Inner dot
              ctx.beginPath();
              ctx.arc(x, y, 2, 0, 2 * Math.PI);
              ctx.fillStyle = "#AEB784";
              ctx.fill();
            });

            // Calculate measurements
            const faceWidth = Math.hypot(p2.x - p1.x, p2.y - p1.y);
            const faceHeight = Math.hypot(p4.x - p3.x, p4.y - p3.y);

            // Draw measurement lines
            ctx.strokeStyle = "rgba(174, 183, 132, 0.8)";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);

            // Horizontal
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();

            // Vertical
            ctx.beginPath();
            ctx.moveTo(p3.x, p3.y);
            ctx.lineTo(p4.x, p4.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Add text labels for measurements
            ctx.fillStyle = "#AEB784";
            ctx.font = "12px Inter";
            // Video is mirrored via CSS, so text might appear flipped if drawn directly on canvas.
            // But since we scaleX(-1) on the canvas, text will be flipped.
            // To fix this, we can save context, scaleX(-1), draw text, and restore.
            ctx.save();
            ctx.scale(-1, 1);
            // When scaled by -1, the x coordinate becomes -x.
            ctx.fillText(`${Math.round(faceWidth)}px`, - (p1.x + (p2.x - p1.x)/2 + 15), p1.y - 10);
            ctx.fillText(`${Math.round(faceHeight)}px`, - (p3.x - 10), p3.y + (p4.y - p3.y)/2);
            ctx.restore();

            // Smoothing
            widthHistoryRef.current.push(faceWidth);
            if (widthHistoryRef.current.length > 30) {
              widthHistoryRef.current.shift();
            }
            heightHistoryRef.current.push(faceHeight);
            if (heightHistoryRef.current.length > 30) {
              heightHistoryRef.current.shift();
            }

            const avgWidth = widthHistoryRef.current.reduce((a, b) => a + b, 0) / widthHistoryRef.current.length;
            const avgHeight = heightHistoryRef.current.reduce((a, b) => a + b, 0) / heightHistoryRef.current.length;
            const avgRatio = avgWidth / avgHeight;

            currentMeasurementsRef.current = { width: avgWidth, height: avgHeight, ratio: avgRatio };

            let size: MaskSize = "Medium";
            if (avgRatio < 1.2) size = "Small";
            else if (avgRatio > 1.5) size = "Large";

            calculatedSizeRef.current = size;

            if (isPositioningRef.current) {
              const xs = landmarks.map(l => l.x * canvas.width);
              const ys = landmarks.map(l => l.y * canvas.height);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              
              const faceCenterX = minX + (maxX - minX) / 2;
              const faceCenterY = minY + (maxY - minY) / 2;
              
              const screenCenterX = canvas.width / 2;
              const screenCenterY = canvas.height / 2;
              
              const distFromCenter = Math.hypot(faceCenterX - screenCenterX, faceCenterY - screenCenterY);
              
              let feedback = "";
              let isValid = false;
              
              const boxWidth = maxX - minX;
              const faceWidthRatio = boxWidth / canvas.width;
              
              const lastWidths = widthHistoryRef.current;
              const widthVariance = lastWidths.length > 0 ? Math.max(...lastWidths) - Math.min(...lastWidths) : 0;
              const isStable = widthVariance < avgWidth * 0.08;
              
              if (distFromCenter > canvas.width * 0.15) {
                feedback = "Center your face";
              } else if (faceWidthRatio < 0.18) {
                feedback = "Move closer";
              } else if (faceWidthRatio > 0.35) {
                feedback = "Move back";
              } else if (!isStable) {
                feedback = "Hold still";
              } else {
                feedback = "Hold still";
                isValid = true;
              }
              
              updatePositionFeedback(feedback, isValid);
              
              if (isValid) {
                if (!positionValidTimeRef.current) {
                  positionValidTimeRef.current = performance.now();
                } else if (performance.now() - positionValidTimeRef.current > 1000) {
                  // Valid for 1 second! Start scanning.
                  setIsPositioning(false);
                  isPositioningRef.current = false;
                  positionValidTimeRef.current = null;
                  setIsScanning(true);
                  isScanningRef.current = true;
                }
              } else {
                positionValidTimeRef.current = null;
              }
            }

            if (isScanningRef.current) {
              // Draw face bounding box
              const xs = landmarks.map(l => l.x * canvas.width);
              const ys = landmarks.map(l => l.y * canvas.height);
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);

              ctx.strokeStyle = "rgba(174, 183, 132, 0.8)";
              ctx.lineWidth = 2;
              ctx.setLineDash([10, 10]);
              ctx.strokeRect(minX - 20, minY - 20, maxX - minX + 40, maxY - minY + 40);
              ctx.setLineDash([]);
            }
          } else {
            widthHistoryRef.current = [];
            heightHistoryRef.current = [];
          }
        }
      }
      requestRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  };

  const handleStartScan = () => {
    setIsPositioning(true);
    isPositioningRef.current = true;
    setMaskSize(null);
    setFinalMeasurements(null);
    positionValidTimeRef.current = null;
    updatePositionFeedback("Face not detected", false);
  };

  // Watch for isScanning to start progress
  useEffect(() => {
    isScanningRef.current = isScanning;
    if (isScanning) {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isScanning]);

  // Watch for scan completion
  useEffect(() => {
    if (scanProgress === 100 && isScanning) {
      setIsScanning(false);
      isScanningRef.current = false;
      setMaskSize(calculatedSizeRef.current);
      setFinalMeasurements(currentMeasurementsRef.current);
    }
  }, [scanProgress, isScanning]);

  return (
    <div className="min-h-screen bg-olive-dark text-cream relative overflow-hidden flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 p-6 z-50 flex justify-between items-center">
        <div className="flex items-center gap-2 md:gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-2 text-cream/80 hover:text-cream transition-colors bg-black/20 backdrop-blur-md px-3 py-2 md:px-4 rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium hidden sm:inline">Back</span>
          </Link>
          <div className="hidden sm:flex items-center gap-2 font-bold text-xl tracking-tight bg-black/20 backdrop-blur-md px-4 py-2 rounded-full">
            <ScanFace className="w-5 h-5 text-sage" />
            <span>Neurovox Ai</span>
          </div>
        </div>
        <div className="text-xs sm:text-sm font-medium underline text-cream/80 bg-black/20 backdrop-blur-md px-3 py-2 md:px-4 rounded-full">
          by edge case innovators
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-center space-y-4 p-6 bg-red-500/10 rounded-3xl border border-red-500/20 backdrop-blur-md max-w-md">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-400">
              <Camera className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-semibold text-red-200">Camera Error</h2>
            <p className="text-red-200/80">{error}</p>
            <Link to="/" className="inline-block mt-4 px-6 py-2 bg-red-500/20 text-red-200 rounded-full hover:bg-red-500/30 transition-colors">
              Return Home
            </Link>
          </div>
        ) : (
          <div className="relative w-full max-w-4xl aspect-[4/3] md:aspect-video bg-black/40 rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            
            {/* Camera UI Grid */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-20">
              <div className="absolute top-1/3 left-0 w-full h-px bg-white/50" />
              <div className="absolute top-2/3 left-0 w-full h-px bg-white/50" />
              <div className="absolute top-0 left-1/3 w-px h-full bg-white/50" />
              <div className="absolute top-0 left-2/3 w-px h-full bg-white/50" />
            </div>

            {/* Video Element */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            
            {/* Canvas Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
            />

            {/* Face Position Guide */}
            <AnimatePresence>
              {!maskSize && !isScanning && isLoaded && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-20 flex flex-col items-center justify-center"
                >
                  <div 
                    className={cn(
                      "w-56 h-72 md:w-64 md:h-80 rounded-[100%] border-2 transition-colors duration-300",
                      !isPositioning ? "border-sage/50" : (isPositionValid ? "border-green-400" : "border-red-400")
                    )}
                    style={{ backgroundColor: 'rgba(0,0,0,0.1)' }}
                  />
                  {isPositioning && (
                    <div className="absolute top-12 bg-black/60 backdrop-blur-md px-6 py-2 rounded-full border border-white/10">
                      <span className={cn(
                        "font-medium text-lg",
                        isPositionValid ? "text-green-400" : "text-red-400"
                      )}>
                        {positionFeedback}
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading State */}
            <AnimatePresence>
              {!isLoaded && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-olive-dark/90 backdrop-blur-sm flex flex-col items-center justify-center z-20"
                >
                  <Loader2 className="w-12 h-12 text-sage animate-spin mb-4" />
                  <p className="text-lg font-medium text-cream/80 animate-pulse">
                    Initializing AI Models...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scanning Overlay UI */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none z-10 flex flex-col items-center justify-end pb-12"
                >
                  {/* Scanning Line */}
                  <motion.div
                    className="absolute left-0 right-0 h-0.5 bg-sage shadow-[0_0_15px_rgba(174,183,132,0.8)]"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  />
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-8 left-8 w-16 h-16 border-t-2 border-l-2 border-sage/50 rounded-tl-xl" />
                  <div className="absolute top-8 right-8 w-16 h-16 border-t-2 border-r-2 border-sage/50 rounded-tr-xl" />
                  <div className="absolute bottom-8 left-8 w-16 h-16 border-b-2 border-l-2 border-sage/50 rounded-bl-xl" />
                  <div className="absolute bottom-8 right-8 w-16 h-16 border-b-2 border-r-2 border-sage/50 rounded-br-xl" />

                  {/* Progress Indicator */}
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    className="bg-beige/90 backdrop-blur-xl px-8 py-4 rounded-2xl border border-white/20 shadow-2xl text-olive flex flex-col items-center gap-3 w-72"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-sage animate-pulse" />
                      <span className="font-medium">Analyzing facial dimensions...</span>
                    </div>
                    <div className="w-full h-2 bg-olive/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-sage"
                        initial={{ width: "0%" }}
                        animate={{ width: `${scanProgress}%` }}
                        transition={{ ease: "linear", duration: 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-olive-light font-medium">{scanProgress}%</span>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Results Panel */}
            <AnimatePresence>
              {maskSize && !isScanning && (
                <motion.div
                  initial={{ opacity: 0, y: 50, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 50, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-beige/95 backdrop-blur-xl p-6 rounded-3xl border border-white/20 shadow-2xl text-olive w-80 z-30"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-sage/20 flex items-center justify-center text-olive-dark">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-lg">Scan Complete</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="text-center bg-white/50 rounded-2xl py-4">
                      <p className="text-sm text-olive-light mb-1">Recommended Size</p>
                      <p className="text-5xl font-bold tracking-tight text-olive-dark">
                        {maskSize}
                      </p>
                    </div>
                    
                    <div className="h-px bg-olive/10 w-full" />
                    
                    <ul className="text-sm space-y-2 text-olive-light px-2">
                      <li className="flex justify-between">
                        <span>Jaw Width</span>
                        <span className="font-medium text-olive">
                          {finalMeasurements ? `${Math.round(finalMeasurements.width)}px` : 'Optimal'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Face Height</span>
                        <span className="font-medium text-olive">
                          {finalMeasurements ? `${Math.round(finalMeasurements.height)}px` : 'Standard'}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span>Ratio</span>
                        <span className="font-medium text-olive">
                          {finalMeasurements ? finalMeasurements.ratio.toFixed(2) : '1.00'}
                        </span>
                      </li>
                    </ul>

                    <button 
                      onClick={() => setMaskSize(null)}
                      className="w-full py-3 mt-2 bg-olive text-cream rounded-xl font-medium hover:bg-olive-light transition-colors"
                    >
                      Scan Again
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-30">
              {!isScanning && !maskSize && isLoaded && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleStartScan}
                  className="group relative flex items-center justify-center w-20 h-20 bg-sage text-olive-dark rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  <div className="absolute inset-1 border-2 border-olive-dark/20 rounded-full group-hover:scale-90 transition-transform" />
                  <ScanFace className="w-8 h-8" />
                </motion.button>
              )}
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
