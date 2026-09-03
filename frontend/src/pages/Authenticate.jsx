import React, { useEffect, useRef, useState } from "react";
import {
  Camera, CheckCircle2, Mic, Play, ShieldCheck,
  ShieldX, Waves, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

// Weighted fusion — same weights as server, shown in UI
const FACE_W   = 0.6;
const VOICE_W  = 0.4;
const THRESHOLD = 60; // % — grant if face OR voice independently clears this

export default function Authenticate() {
  const [robots,       setRobots]       = useState([]);
  const [selectedRobot,setSelectedRobot]= useState("");
  const [phase,        setPhase]        = useState("idle");
  // idle | capturing | processing | result

  // Scores (0–100 %)
  const [faceScore,  setFaceScore]  = useState(0);
  const [voiceScore, setVoiceScore] = useState(0);
  const [fusedScore, setFusedScore] = useState(0);
  const [authResult, setAuthResult] = useState(null); // full response from /api/authenticate

  // Camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [camStream, setCamStream] = useState(null);
  const streamRef = useRef(null);
  const [camError, setCamError] = useState(null);

  // Assign stream to video element whenever either node or stream changes
  const setVideoRef = (node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  };

  // Keep video element in sync if stream changes after mount
  useEffect(() => {
    if (videoRef.current && camStream) {
      videoRef.current.srcObject = camStream;
      videoRef.current.play().catch(() => {});
    }
  }, [camStream]);

  // Mic
  const [micStream, setMicStream] = useState(null);

  // Embeddings collected during session
  const faceEmbeddingRef = useRef(null);
  const voiceEmbeddingRef = useRef(null);

  // Animated waveform ticker
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (phase !== "capturing") return;
    const id = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(id);
  }, [phase]);

  // Load robots
  useEffect(() => {
    api.getRobots()
      .then((r) => { setRobots(r); if (r.length) setSelectedRobot(r[0].id); })
      .catch(console.error);
  }, []);

  // ── Camera helpers ────────────────────────────────────────────────────────
  const startCamera = async () => {
    setCamError(null);
    if (streamRef.current && streamRef.current.active) {
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
      return streamRef.current;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = s;
      setCamStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      // Wait for video element to be ready with valid dimensions
      await new Promise((resolve) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          if (
            (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) ||
            attempts > 20
          ) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });
      return s;
    } catch (e) {
      console.error("Camera error:", e);
      setCamError("Could not access camera. Please allow camera permissions.");
      return null;
    }
  };

  // Auto-start camera when mounting component
  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const stopCamera = () => {
    if (videoRef.current) videoRef.current.srcObject = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCamStream(null);
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return null;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg");
  };

  // ── Face capture — grab frames, retry until face detected ──────────────────
  const captureFaceEmbedding = async () => {
    // Wait for video to be ready if needed
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const frame = captureFrame();
      if (!frame) continue;
      try {
        const res = await fetch("/api/authenticate-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: frame }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.face_detected && data.embedding) {
            faceEmbeddingRef.current = data.embedding;
            return true;
          }
        }
      } catch (e) {
        console.error("Face authentication fetch error:", e);
      }
    }
    return false; // no face found after 20 attempts
  };

  // ── WAV encoding helpers (same as Enroll) ────────────────────────────────
  const encodeWav = (pcmData, sampleRate) => {
    const numChannels = 1, bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataLength = pcmData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, "RIFF"); view.setUint32(4, 36 + dataLength, true);
    writeStr(8, "WAVE"); writeStr(12, "fmt ");
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true); view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true); writeStr(36, "data");
    view.setUint32(40, dataLength, true);
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  const blobToWavBase64 = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();
    const wavBlob = encodeWav(decoded.getChannelData(0), 16000);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => resolve(reader.result);
    });
  };

  // ── Voice capture — record 5 s, convert to WAV, send to pipeline ─────────
  const captureVoiceEmbedding = (activeMicStream) =>
    new Promise((resolve) => {
      if (!activeMicStream) return resolve(false);
      const recorder = new MediaRecorder(activeMicStream);
      const chunks = [];

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = async () => {
        try {
          const blob = new Blob(chunks, { type: "audio/webm" });
          const wavBase64 = await blobToWavBase64(blob);
          const res = await fetch("/api/authenticate-voice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audio: wavBase64, min_vad: 0.3, min_snr: 5 }),
          });
          const data = await res.json();
          if (data.accepted && data.embedding?.length) {
            voiceEmbeddingRef.current = data.embedding;
            resolve(true);
          } else {
            resolve(false);
          }
        } catch { resolve(false); }
      };

      recorder.start();
      setTimeout(() => recorder.stop(), 5000);
    });

  // ── Main session flow ─────────────────────────────────────────────────────
  const startSession = async () => {
    setPhase("capturing");
    setFaceScore(0);
    setVoiceScore(0);
    setFusedScore(0);
    setAuthResult(null);
    faceEmbeddingRef.current = null;
    voiceEmbeddingRef.current = null;

    // Ensure camera is active
    await startCamera();

    // Start mic fresh each session — pass the stream directly to avoid stale state
    let activeMic = null;
    try {
      activeMic = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      setMicStream(activeMic);
    } catch (e) {
      console.error("Mic error:", e);
    }

    // Run face + voice capture in parallel
    await Promise.all([
      captureFaceEmbedding(),
      captureVoiceEmbedding(activeMic),
    ]);

    setPhase("processing");

    // Send embeddings to Node for matching
    try {
      const result = await api.authenticate({
        faceEmbedding: faceEmbeddingRef.current,
        voiceEmbedding: voiceEmbeddingRef.current,
        robotId: selectedRobot,
      });

      setFaceScore(result.faceScore);
      setVoiceScore(result.voiceScore);
      setFusedScore(result.fusedScore);
      setAuthResult(result);
    } catch (e) {
      console.error("Auth error:", e);
      setAuthResult({ result: "denied", reason: "Server error during matching.", faceScore: 0, voiceScore: 0, fusedScore: 0 });
    }

    // Clean up mic
    activeMic?.getTracks().forEach((t) => t.stop());
    setMicStream(null);
    setPhase("result");
    // Keep camera running so live feed remains active
  };

  const reset = () => {
    micStream?.getTracks().forEach((t) => t.stop());
    setMicStream(null);
    setPhase("idle");
    setFaceScore(0);
    setVoiceScore(0);
    setFusedScore(0);
    setAuthResult(null);
    faceEmbeddingRef.current = null;
    voiceEmbeddingRef.current = null;
  };

  const isRunning = phase === "capturing" || phase === "processing";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Live session"
        title="Multimodal authentication"
        description="Verify a subject using synchronized face and voice capture. Scores are computed separately and fused."
        actions={
          robots.length > 0 ? (
            <Select value={selectedRobot} onValueChange={setSelectedRobot}>
              <SelectTrigger className="h-9 w-64 bg-surface shadow-none">
                <SelectValue placeholder="Target robot" />
              </SelectTrigger>
              <SelectContent>
                {robots.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {r.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <span className="text-sm text-muted-foreground">No robots registered</span>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Camera + Mic panels */}
        <Card className="border-border shadow-none lg:col-span-2">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">

            {/* Camera */}
            <div className="relative overflow-hidden rounded-lg border border-border bg-[oklch(0.20_0.02_250)]">
              <div className="aspect-[4/3] w-full relative">
                {/* Video always mounted so ref is stable — hidden when no stream */}
                <video
                  ref={setVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`absolute inset-0 h-full w-full object-cover ${camStream ? "opacity-100" : "opacity-0"}`}
                />
                {!camStream && (
                  <div className="absolute inset-0 grid place-items-center text-primary-foreground/60 p-4 text-center">
                    <div>
                      <Camera className="mx-auto h-6 w-6 opacity-50 mb-2" />
                      {camError ? (
                        <div className="space-y-2">
                          <p className="text-xs text-red-400 font-medium">{camError}</p>
                          <Button size="sm" variant="outline" onClick={startCamera} className="text-xs h-7">
                            Retry Camera
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <div className="text-xs opacity-50">Camera stream · Cam-01</div>
                          <Button size="sm" variant="ghost" onClick={startCamera} className="mt-2 text-xs h-7 text-primary-foreground/80">
                            Start Camera Stream
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="pointer-events-none absolute inset-6 rounded-md border border-primary-foreground/20" />
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">
                <span className={`h-1.5 w-1.5 rounded-full ${camStream ? (isRunning ? "animate-pulse bg-red-500" : "bg-emerald-500") : "bg-white/40"}`} />
                {camStream ? (isRunning ? "LIVE SCAN" : "CAMERA ACTIVE") : "STANDBY"}
              </div>
              <div className="absolute inset-x-4 bottom-3 text-[11px] text-white/70 bg-black/50 backdrop-blur px-2.5 py-1 rounded">
                Face detection ·{" "}
                {phase === "idle" ? (camStream ? "Ready" : "Standby")
                  : phase === "capturing" ? "Scanning face…"
                  : phase === "processing" ? "Processing embedding…"
                  : faceEmbeddingRef.current ? "Captured ✓" : "No face found"}
              </div>
            </div>

            {/* Microphone */}
            <div className="relative overflow-hidden rounded-lg border border-border bg-[oklch(0.20_0.02_250)] p-5">
              <div className="text-xs text-primary-foreground/70">Microphone · Mic-01</div>
              <div className="mt-6 flex h-28 items-end gap-[2px]">
                {Array.from({ length: 48 }).map((_, i) => {
                  const active = isRunning;
                  const h = active
                    ? 10 + Math.abs(Math.sin(i * 0.5 + tick * 0.3)) * 85
                    : 6;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary-foreground/50 transition-all duration-75"
                      style={{ height: `${h}%`, opacity: active ? 0.85 : 0.25 }}
                    />
                  );
                })}
              </div>
              <div className="mt-5 flex items-center justify-between text-[11px] text-primary-foreground/60">
                <span className="flex items-center gap-1.5">
                  <Waves className="h-3 w-3" />
                  {phase === "capturing" ? "Recording passphrase…" : "Passphrase channel"}
                </span>
                <span>
                  {phase === "result" && voiceEmbeddingRef.current
                    ? "Captured ✓"
                    : "Noise: −42 dB"}
                </span>
              </div>
              <div className="mt-3 rounded border border-primary-foreground/10 bg-black/20 px-3 py-2 text-center text-[11px] italic text-primary-foreground/60">
                "My voice is my key, verify me on AVAR."
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scores panel */}
        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Confidence fusion</CardTitle>
            <p className="text-xs text-muted-foreground">
              Grant if Face ≥ {THRESHOLD}% OR Voice ≥ {THRESHOLD}% · Fused = {FACE_W} face + {VOICE_W} voice
            </p>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Face score */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Camera className="h-3.5 w-3.5" /> Face
                </span>
                <span className="tabular-nums font-medium">{faceScore.toFixed(1)}%</span>
              </div>
              <Progress value={faceScore} className="h-1.5" />
            </div>

            {/* Voice score */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Mic className="h-3.5 w-3.5" /> Voice
                </span>
                <span className="tabular-nums font-medium">{voiceScore.toFixed(1)}%</span>
              </div>
              <Progress value={voiceScore} className="h-1.5" />
            </div>

            {/* Fused score */}
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fused score</span>
                <span className="tabular-nums font-semibold text-foreground">
                  {fusedScore.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={fusedScore}
                className={`mt-2 h-2 ${fusedScore >= THRESHOLD ? "[&>div]:bg-green-500" : ""}`}
              />
              <div className="mt-1.5 text-[10px] text-muted-foreground">
                = Face × {FACE_W} + Voice × {VOICE_W}
              </div>
            </div>

            {/* Status / result */}
            <div className="rounded-lg border border-border bg-surface p-4">
              {phase === "idle" && (
                <div className="text-center text-sm text-muted-foreground">
                  Session ready. Begin capture to authenticate.
                </div>
              )}
              {phase === "capturing" && (
                <div className="space-y-2">
                  <StatusBadge tone="info">Capturing face &amp; voice…</StatusBadge>
                  <p className="text-xs text-muted-foreground">
                    Please look at the camera and read the passphrase aloud.
                  </p>
                </div>
              )}
              {phase === "processing" && (
                <StatusBadge tone="warning">Running decision engine…</StatusBadge>
              )}
              {phase === "result" && authResult && (
                <div className="text-center space-y-2">
                  {authResult.result === "granted" ? (
                    <>
                      <CheckCircle2 className="mx-auto h-7 w-7 text-green-500" />
                      <div className="text-sm font-semibold text-green-600">Access granted</div>
                      <div className="text-xs text-muted-foreground">
                        Identified as{" "}
                        <span className="font-medium text-foreground">
                          {authResult.matchedUser?.name}
                        </span>
                        {" "}· {authResult.matchedUser?.role}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Latency: {authResult.latencyMs} ms
                      </div>
                    </>
                  ) : (
                    <>
                      <XCircle className="mx-auto h-7 w-7 text-red-500" />
                      <div className="text-sm font-semibold text-red-600">Access denied</div>
                      <div className="text-xs text-muted-foreground">{authResult.reason}</div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={phase === "result" ? reset : startSession}
                disabled={isRunning}
              >
                <Play className="mr-1.5 h-4 w-4" />
                {phase === "result" ? "Run again" : "Start session"}
              </Button>
              <Button variant="outline" onClick={reset} disabled={isRunning}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline steps */}
      <Card className="border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Session pipeline</CardTitle>
          <p className="text-xs text-muted-foreground">
            Steps executed by the AVAR authentication engine.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {[
            { label: "Input capture",        done: phase !== "idle" },
            { label: "Noise reduction",      done: phase === "processing" || phase === "result" },
            { label: "Feature extraction",   done: phase === "processing" || phase === "result" },
            { label: "Cosine matching",      done: phase === "result" },
            { label: "Decision & logging",   done: phase === "result" },
          ].map((s, i) => (
            <div
              key={s.label}
              className={`rounded-lg border p-4 transition-colors ${
                s.done ? "border-green-500/30 bg-green-500/5" : "border-border bg-surface"
              }`}
            >
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className={`h-4 w-4 ${s.done ? "text-green-500" : "text-primary"}`} />
                {s.label}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
