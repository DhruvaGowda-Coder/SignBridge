"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import type { Hands, NormalizedLandmarkList, Results } from "@mediapipe/hands";

interface WebcamFeedProps {
  showSkeleton: boolean;
  onLandmarks: (landmarks: number[]) => void;
  onHandDetected?: (detected: boolean) => void;
}

const SINGLE_HAND_FEATURES = 63;

type FeedStatus = "idle" | "loading" | "ready" | "error";

interface CameraDevice {
  deviceId: string;
  label: string;
}

export default function WebcamFeed({ showSkeleton, onLandmarks, onHandDetected }: WebcamFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const showSkeletonRef = useRef(showSkeleton);

  const onHandDetectedRef = useRef(onHandDetected);

  // Camera selection state
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [isMobile] = useState(() => {
    if (typeof navigator === "undefined") return false;
    return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  });
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  // Refs for cleanup
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const lastCameraErrorRef = useRef<"permission-denied" | "unavailable">("unavailable");
  
  useEffect(() => {
    showSkeletonRef.current = showSkeleton;
  }, [showSkeleton]);



  useEffect(() => {
    onHandDetectedRef.current = onHandDetected;
  }, [onHandDetected]);

  useEffect(() => {
    onHandDetectedRef.current?.(isHandDetected);
  }, [isHandDetected]);

  const normalizeLandmarks = useCallback((landmarks?: NormalizedLandmarkList) => {
    if (!landmarks || landmarks.length === 0) return Array(63).fill(0);
    
    const base_x = landmarks[0].x;
    const base_y = landmarks[0].y;
    const base_z = landmarks[0].z;
    
    let normalized = [];
    for (const lm of landmarks) {
      normalized.push(lm.x - base_x, lm.y - base_y, lm.z - base_z);
    }
    
    const max_val = Math.max(...normalized.map(Math.abs));
    if (max_val > 0) {
      normalized = normalized.map((val) => val / max_val);
    }
    
    return normalized;
  }, []);

  const onLandmarksRef = useRef(onLandmarks);
  useEffect(() => {
    onLandmarksRef.current = onLandmarks;
  }, [onLandmarks]);

  // Enumerate cameras
  const enumerateCameras = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera ${i + 1}`,
        }));
      setCameras(videoDevices);
      // Auto-select first camera if none selected
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
    }
  }, [selectedDeviceId]);

  // Stop current camera stream
  const stopStream = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Start camera with given constraints
  const startCamera = useCallback(
    async (deviceId?: string, facing?: "user" | "environment") => {
      stopStream();

      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 640 }, height: { ideal: 480 } }
          : {
              facingMode: facing || "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
        audio: false,
      };

      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMountedRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // After getting a stream, re-enumerate so labels are populated
        await enumerateCameras();
        return true;
      } catch (err: unknown) {
        const permissionDenied =
          err instanceof DOMException && err.name === "NotAllowedError";

        lastCameraErrorRef.current = permissionDenied
          ? "permission-denied"
          : "unavailable";

        if (!permissionDenied) {
          console.error("Camera start failed:", err);
        }
        return false;
      }
    },
    [stopStream, enumerateCameras]
  );

  const startFrameLoop = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const processFrame = async () => {
      if (!isMountedRef.current || !videoRef.current || !handsRef.current) return;
      if (videoRef.current.readyState >= 2) {
        try {
          await handsRef.current.send({ image: videoRef.current });
        } catch {
          // ignore frame processing errors
        }
      }
      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    processFrame();
  }, []);

  const getCameraErrorMessage = () => {
    if (lastCameraErrorRef.current === "permission-denied") {
      return "Camera permission was denied. Click Enable Camera and allow camera access when your browser asks.";
    }

    return "Camera unavailable. Check that a camera is connected and not being used by another application.";
  };

  // Main initialization
  useEffect(() => {
    isMountedRef.current = true;

    const initMediapipe = async () => {
      const mediapipe = await (async () => {
        try {
          const [handsModule, drawingModule] = await Promise.all([
            import("@mediapipe/hands"),
            import("@mediapipe/drawing_utils"),
          ]);

          return {
            HandsSolution: handsModule.Hands || (handsModule as any).default?.Hands || (window as any).Hands,
            handConnections: handsModule.HAND_CONNECTIONS || (handsModule as any).default?.HAND_CONNECTIONS || (window as any).HAND_CONNECTIONS,
            drawHandConnectors: drawingModule.drawConnectors || (drawingModule as any).default?.drawConnectors || (window as any).drawConnectors,
            drawHandLandmarks: drawingModule.drawLandmarks || (drawingModule as any).default?.drawLandmarks || (window as any).drawLandmarks,
          };
        } catch (err: unknown) {
          if (!isMountedRef.current) return null;
          console.error("MediaPipe load failed:", err);
          setStatus("error");
          setErrorMessage(
            "Failed to load hand-tracking library. Reload the page or reinstall frontend dependencies."
          );
          return null;
        }
      })();

      if (!mediapipe) {
        return;
      }

      if (!isMountedRef.current) return;

      let hands: Hands;
      try {
        hands = new mediapipe.HandsSolution({
          locateFile: (file: string) => {
            return `/vendor/mediapipe/hands/${file}`;
          },
        });
      } catch (err: unknown) {
        if (!isMountedRef.current) return;
        console.error("MediaPipe initialization failed:", err);
        setStatus("error");
        setErrorMessage(
          "Failed to initialize hand tracking. Reload the page or reinstall frontend dependencies."
        );
        return;
      }

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults((results: Results) => {
        if (!isMountedRef.current) return;

        const canvasCtx = canvasRef.current?.getContext("2d");
        if (canvasCtx && canvasRef.current) {
          canvasCtx.save();
          canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            setIsHandDetected(true);

            if (showSkeletonRef.current) {
              for (const landmarks of results.multiHandLandmarks) {
                mediapipe.drawHandConnectors(canvasCtx, landmarks, mediapipe.handConnections, {
                  color: "#00ff88",
                  lineWidth: 3,
                });
                mediapipe.drawHandLandmarks(canvasCtx, landmarks, {
                  color: "#ffffff",
                  lineWidth: 1,
                  radius: 3,
                });
              }
            }

            const hand1 = results.multiHandLandmarks[0];
            const norm1 = normalizeLandmarks(hand1);
            onLandmarksRef.current(norm1);
          } else {
            setIsHandDetected(false);
            onLandmarksRef.current(Array(SINGLE_HAND_FEATURES).fill(0));
          }

          canvasCtx.restore();
        }
      });

      handsRef.current = hands;

      if (isMountedRef.current) {
        setStatus("idle");
      }
    };

    initMediapipe();

    return () => {
      isMountedRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      stopStream();
      if (handsRef.current) {
        try {
          handsRef.current.close();
        } catch {}
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizeLandmarks]);

  // Handle device switch
  const handleDeviceSwitch = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    setShowCameraMenu(false);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const started = await startCamera(deviceId);
    if (!started) {
      setStatus("error");
      setErrorMessage(getCameraErrorMessage());
      return;
    }

    // Restart frame loop
    setStatus("ready");
    startFrameLoop();
  };

  // Handle facing mode toggle (mobile)
  const handleFacingToggle = async () => {
    const newFacing = facingMode === "user" ? "environment" : "user";
    setFacingMode(newFacing);
    setShowCameraMenu(false);

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const started = await startCamera(undefined, newFacing);
    if (!started) {
      setStatus("error");
      setErrorMessage(getCameraErrorMessage());
      return;
    }

    // Restart frame loop
    setStatus("ready");
    startFrameLoop();
  };

  const handleRetryCamera = async () => {
    setStatus("loading");
    setErrorMessage("");

    const started = await startCamera(
      selectedDeviceId || undefined,
      selectedDeviceId ? undefined : facingMode
    );

    if (!started) {
      setStatus("error");
      setErrorMessage(getCameraErrorMessage());
      return;
    }

    setStatus("ready");
    startFrameLoop();
  };

  // Friendly label for camera
  const getDeviceLabel = (device: CameraDevice) => {
    const label = device.label.toLowerCase();
    if (label.includes("front")) return "📱 Front Camera";
    if (label.includes("back") || label.includes("rear") || label.includes("environment"))
      return "📸 Back Camera";
    if (label.includes("obs") || label.includes("virtual")) return "🖥️ Virtual Camera";
    if (label.includes("integrated") || label.includes("built-in") || label.includes("laptop"))
      return "💻 Laptop Camera";
    if (label.includes("usb") || label.includes("external")) return "🔌 External Camera";
    return `📷 ${device.label}`;
  };

  // Get the current camera name
  const getCurrentCameraName = () => {
    if (cameras.length === 0) return "Camera";
    const current = cameras.find((c) => c.deviceId === selectedDeviceId);
    if (!current) return "Camera";
    return getDeviceLabel(current);
  };

  // --- Error state ---
  if (status === "error") {
    return (
      <div className="relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-red-500/40 shadow-xl ring-1 ring-red-500/20 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="text-red-400 text-5xl">⚠️</div>
        <p className="text-red-300 font-semibold text-lg">Camera Unavailable</p>
        <p className="text-neutral-400 text-sm max-w-md">{errorMessage}</p>
        <button
          onClick={handleRetryCamera}
          className="mt-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors border border-white/10"
        >
          Enable Camera
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 shadow-xl ring-1 ring-white/10">
      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <p className="text-neutral-400 text-sm font-medium">Initializing camera &amp; hand tracking…</p>
        </div>
      )}

      {/* Camera start overlay */}
      {status === "idle" && (
        <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-4xl">📷</div>
          <div>
            <p className="text-white font-semibold text-lg">Camera Ready</p>
            <p className="text-neutral-400 text-sm max-w-md mt-1">
              Start the camera to begin detecting signs.
            </p>
          </div>
          <button
            onClick={handleRetryCamera}
            className="px-5 py-2.5 bg-[#00ff88] hover:bg-[#00dd77] text-black rounded-lg font-semibold transition-colors"
          >
            Enable Camera
          </button>
        </div>
      )}

      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute inset-0 w-full h-full object-cover transform -scale-x-100 pointer-events-none"
      />

      {/* No hand detected indicator */}
      {status === "ready" && !isHandDetected && (
        <div className="absolute top-4 left-4 bg-black/60 px-3 py-1.5 rounded-full text-neutral-400 text-sm font-medium backdrop-blur-md transition-opacity border border-white/10">
          No hand detected
        </div>
      )}



      {/* Camera switcher button — bottom-left */}
      {status === "ready" && (
        <div className="absolute bottom-4 left-4 z-30">
          <button
            id="camera-switcher-btn"
            onClick={() => setShowCameraMenu((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-2 bg-black/70 hover:bg-black/90 text-white text-xs font-medium rounded-lg backdrop-blur-md border border-white/15 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            title="Switch camera source"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <span className="hidden sm:inline">{getCurrentCameraName()}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`w-3 h-3 transition-transform ${showCameraMenu ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Camera dropdown menu */}
          {showCameraMenu && (
            <div className="absolute bottom-full left-0 mb-2 w-64 bg-neutral-900/95 backdrop-blur-xl border border-neutral-700/60 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 z-40">
              <div className="px-4 py-3 border-b border-neutral-700/40">
                <p className="text-neutral-300 text-xs font-semibold uppercase tracking-widest">
                  Camera Source
                </p>
              </div>

              <div className="p-2 max-h-64 overflow-y-auto">
                {/* Available cameras */}
                {cameras.map((cam) => (
                  <button
                    key={cam.deviceId}
                    id={`camera-option-${cam.deviceId}`}
                    onClick={() => handleDeviceSwitch(cam.deviceId)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedDeviceId === cam.deviceId
                        ? "bg-[#00ff88]/15 text-[#00ff88] ring-1 ring-[#00ff88]/30"
                        : "text-neutral-300 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    <span className="text-base">{getDeviceLabel(cam).split(" ")[0]}</span>
                    <span className="truncate">{getDeviceLabel(cam).split(" ").slice(1).join(" ")}</span>
                    {selectedDeviceId === cam.deviceId && (
                      <svg
                        className="w-4 h-4 ml-auto flex-shrink-0 text-[#00ff88]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}

                {cameras.length === 0 && (
                  <p className="text-neutral-500 text-xs px-3 py-2 text-center">
                    No cameras detected
                  </p>
                )}

                {/* Mobile facing mode toggle */}
                {isMobile && (
                  <>
                    <div className="my-2 border-t border-neutral-700/40" />
                    <button
                      id="camera-flip-btn"
                      onClick={handleFacingToggle}
                      className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 text-neutral-300 hover:bg-white/8 hover:text-white"
                    >
                      <span className="text-base">🔄</span>
                      <span>
                        Flip to {facingMode === "user" ? "Back" : "Front"} Camera
                      </span>
                    </button>
                  </>
                )}

                {/* Info tip */}
                <div className="mt-2 border-t border-neutral-700/40 pt-2 px-3 pb-1">
                  <p className="text-neutral-500 text-[10px] leading-relaxed">
                    💡 {isMobile
                      ? "Use the flip button to switch between front and back cameras."
                      : "Connect your phone as a webcam using apps like DroidCam, Iriun, or Camo to use your phone camera on this laptop."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
