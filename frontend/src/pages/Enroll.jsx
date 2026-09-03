import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Check, Mic, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

const steps = [
  { key: "profile", label: "Profile" },
  { key: "face", label: "Face capture" },
  { key: "voice", label: "Voice capture" },
  { key: "review", label: "Review" },
];

export default function Enroll() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [faceProgress, setFaceProgress] = useState(0);
  const [voiceProgress, setVoiceProgress] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Operator");
  const [department, setDepartment] = useState("");

  // Webcam States & Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [faceImages, setFaceImages] = useState([]);       // InsightFace-processed crops
  const [faceEmbeddings, setFaceEmbeddings] = useState([]); // 512-d embeddings
  const [isScanning, setIsScanning] = useState(false);

  // Microphone States
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const [voiceAudios, setVoiceAudios] = useState([]);
  const [voiceEmbeddings, setVoiceEmbeddings] = useState([]);
  const [voiceStatus, setVoiceStatus] = useState(""); // feedback message per clip
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

  // Per-step completion checks
  const isStepComplete = (s) => {
    if (s === 0) return name.trim() !== "" && email.trim() !== "" && role !== "" && department.trim() !== "";
    if (s === 1) return faceProgress >= 20;
    if (s === 2) return voiceProgress >= 2;
    if (s === 3) return true;
    return false;
  };

  // Initialize/cleanup camera for Step 1
  useEffect(() => {
    if (step === 1) {
      navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } })
        .then((s) => {
          setStream(s);
        })
        .catch((err) => console.error("Webcam access error:", err));
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  // Callback ref to bind stream to video element when it mounts
  const setVideoRef = (node) => {
    videoRef.current = node;
    if (node && stream) {
      node.srcObject = stream;
    }
  };

  // Converts a raw PCM Float32Array → WAV Blob (no external lib needed)
  const encodeWav = (pcmData, sampleRate) => {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const dataLength = pcmData.length * 2; // int16 = 2 bytes
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataLength, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, dataLength, true);
    // Convert float32 → int16
    let offset = 44;
    for (let i = 0; i < pcmData.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, pcmData[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Blob([buffer], { type: "audio/wav" });
  };

  // Decode MediaRecorder blob → float32 PCM via AudioContext, then re-encode as WAV
  const blobToWavBase64 = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext({ sampleRate: 16000 });
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    audioCtx.close();
    const pcm = decoded.getChannelData(0); // mono
    const wavBlob = encodeWav(pcm, 16000);
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(wavBlob);
      reader.onloadend = () => resolve(reader.result);
    });
  };

  // Initialize/cleanup microphone for Step 2
  useEffect(() => {
    if (step === 2) {
      navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl:  true,
      }})
        .then((s) => {
          setAudioStream(s);
          const recorder = new MediaRecorder(s);
          setMediaRecorder(recorder);

          let chunks = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
          };

          recorder.onstop = async () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            chunks = [];
            setIsProcessingVoice(true);
            setVoiceStatus("Processing clip…");

            try {
              // Re-encode as 16 kHz mono WAV — scipy can decode this natively
              const base64Audio = await blobToWavBase64(blob);

              const res = await fetch("/api/process-voice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ audio: base64Audio }),
              });

              if (res.ok) {
                const result = await res.json();
                if (result.accepted) {
                  setVoiceAudios((prev) => [...prev, base64Audio]);
                  setVoiceEmbeddings((prev) => [...prev, result.embedding || []]);
                  setVoiceProgress((prev) => Math.min(prev + 1, 2));
                  setVoiceStatus(
                    `✓ Clip accepted — SNR ${result.snr_db} dB, voice activity ${(result.vad_ratio * 100).toFixed(0)}%`
                  );
                } else {
                  setVoiceStatus(`✗ ${result.reject_reason}`);
                }
              } else {
                // Pipeline server error — accept clip as-is
                setVoiceAudios((prev) => [...prev, base64Audio]);
                setVoiceEmbeddings((prev) => [...prev, []]);
                setVoiceProgress((prev) => Math.min(prev + 1, 2));
                setVoiceStatus("✓ Clip saved (pipeline unavailable).");
              }
            } catch (err) {
              console.error("Voice processing error:", err);
              setVoiceStatus("✗ Failed to process audio. Please try again.");
            } finally {
              setIsProcessingVoice(false);
            }
          };
        })
        .catch((err) => console.error("Microphone access error:", err));
    } else {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
        setAudioStream(null);
      }
    }
    return () => {
      if (audioStream) {
        audioStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [step]);

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) return null;
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg");
    }
    return null;
  };

  const captureBatch = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setFaceProgress(0);
    setFaceImages([]);
    setFaceEmbeddings([]);

    let captured = 0;
    const collectedImages = [];
    const collectedEmbeddings = [];

    for (let attempt = 0; attempt < 60 && captured < 20; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 250));

      const dataUrl = captureFrame();
      if (!dataUrl) continue;

      try {
        const response = await fetch("/api/detect-face", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUrl }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.face_detected && result.processed_image) {
            // Store the InsightFace-processed crop, not the raw webcam frame
            collectedImages.push(result.processed_image);
            collectedEmbeddings.push(result.embedding || []);
            captured++;
            setFaceImages([...collectedImages]);
            setFaceEmbeddings([...collectedEmbeddings]);
            setFaceProgress(captured);
          }
          // If face not detected in this frame, skip it (don't store)
        } else {
          // Pipeline server error — fall back to raw frame
          collectedImages.push(dataUrl);
          collectedEmbeddings.push([]);
          captured++;
          setFaceImages([...collectedImages]);
          setFaceEmbeddings([...collectedEmbeddings]);
          setFaceProgress(captured);
        }
      } catch {
        // Pipeline server unreachable — fall back to raw frame
        collectedImages.push(dataUrl);
        collectedEmbeddings.push([]);
        captured++;
        setFaceImages([...collectedImages]);
        setFaceEmbeddings([...collectedEmbeddings]);
        setFaceProgress(captured);
      }
    }

    setIsScanning(false);
  };

  const recordClip = () => {
    if (mediaRecorder && mediaRecorder.state === "inactive") {
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingCountdown(10);

      let timeLeft = 10;
      const interval = setInterval(() => {
        timeLeft -= 1;
        setRecordingCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          mediaRecorder.stop();
          setIsRecording(false);
        }
      }, 1000);
    }
  };

  const handleComplete = async () => {
    try {
      await api.enrollUser({
        name,
        email,
        role,
        department,
        faceSamples: faceProgress,
        voiceSamples: voiceProgress,
        faceImages,
        faceEmbeddings,
        voiceAudios,
        voiceEmbeddings,
      });
      navigate("/users");
    } catch (error) {
      console.error("Error enrolling user:", error);
      alert("Failed to enroll user. Please make sure the backend server is running on port 5001.");
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access management"
        title="Enroll new user"
        description="Follow the four-step flow to capture identity, face samples, and voice samples for a new authorized user."
      />

      <ol className="grid grid-cols-4 gap-2">
        {steps.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li
              key={s.key}
              className={`rounded-lg border p-3 transition-colors ${
                active
                  ? "border-primary/40 bg-primary/5"
                  : done
                    ? "border-border bg-surface"
                    : "border-border bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className={`grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold ${
                    done
                      ? "bg-success text-success-foreground"
                      : active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
            </li>
          );
        })}
      </ol>

      <Card className="border-border shadow-none">
        <CardContent className="p-6">
          {step === 0 && (
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">Full name</Label>
                <Input
                  id="fn"
                  placeholder="e.g. Marcus Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em">Corporate email</Label>
                <Input
                  id="em"
                  type="email"
                  placeholder="name@avar.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrator">Administrator</SelectItem>
                    <SelectItem value="Operator">Operator</SelectItem>
                    <SelectItem value="Technician">Technician</SelectItem>
                    <SelectItem value="Researcher">Researcher</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dep">Department</Label>
                <Input
                  id="dep"
                  placeholder="e.g. Warehouse A"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes scan {
                  0% { top: 0%; }
                  50% { top: 100%; }
                  100% { top: 0%; }
                }
                .scan-line {
                  animation: scan 2.5s linear infinite;
                }
              `}} />
              <div className="relative overflow-hidden grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border bg-surface">
                {stream ? (
                  <>
                    <video
                      ref={setVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 h-full w-full object-cover transform -scale-x-100"
                    />
                    {isScanning && (
                      <div className="absolute inset-x-0 h-1.5 bg-green-500 shadow-[0_0_12px_#22c55e] scan-line z-20 pointer-events-none" />
                    )}
                  </>
                ) : (
                  <div className="text-center z-10">
                    <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
                      <Camera className="h-5 w-5" />
                    </div>
                    <div className="mt-3 text-sm font-medium">Camera preview</div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Position the subject's face within the frame.
                    </p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Face samples</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Capture at least 20 samples across different angles and lighting.
                  </p>
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="tabular-nums font-medium">{faceProgress}/20</span>
                  </div>
                  <Progress value={(faceProgress / 20) * 100} className="h-1.5" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={captureBatch}
                    disabled={isScanning || faceProgress >= 20}
                    className={isScanning ? "border-green-500 text-green-500 bg-green-500/5 animate-pulse" : ""}
                  >
                    {isScanning ? "YOLO Auto-Scanning..." : "YOLO Auto-Capture (20 Pics)"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setFaceProgress(0); setFaceImages([]); setFaceEmbeddings([]); }}>
                    Reset
                  </Button>
                </div>
                <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
                  <li>· Front-facing</li>
                  <li>· Left / right profile (±30°)</li>
                  <li>· Neutral and speaking expressions</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className={`grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border transition-colors ${isRecording ? "bg-red-500/10 border-red-500/40 animate-pulse" : isProcessingVoice ? "bg-yellow-500/10 border-yellow-500/40" : "bg-surface"}`}>
                <div className="text-center">
                  <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${isRecording ? "bg-red-500 text-white" : isProcessingVoice ? "bg-yellow-500 text-white" : "bg-accent text-accent-foreground"}`}>
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium">
                    {isRecording
                      ? `Recording... (${recordingCountdown}s)`
                      : isProcessingVoice
                        ? "Analysing clip…"
                        : "Microphone input"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isRecording
                      ? "Read the passphrase clearly"
                      : isProcessingVoice
                        ? "Checking for noise and voice activity"
                        : "Read the passphrase clearly in a quiet environment."}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Voice samples</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Two 10-second clips are used to build the speaker embedding. Background noise is automatically filtered.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-sm font-medium text-center italic border-primary/20">
                  &ldquo;My voice is my key, verify me on AVAR.&rdquo;
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="tabular-nums font-medium">{voiceProgress}/2</span>
                  </div>
                  <Progress value={(voiceProgress / 2) * 100} className="h-1.5" />
                </div>
                {voiceStatus && (
                  <div className={`rounded-md px-3 py-2 text-xs ${
                    voiceStatus.startsWith("✓")
                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                      : voiceStatus.startsWith("✗")
                        ? "bg-red-500/10 text-red-600 border border-red-500/20"
                        : "bg-muted text-muted-foreground"
                  }`}>
                    {voiceStatus}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={recordClip}
                    disabled={isRecording || isProcessingVoice || voiceProgress >= 2}
                  >
                    {isRecording
                      ? `Recording… (${recordingCountdown}s)`
                      : isProcessingVoice
                        ? "Analysing…"
                        : `Record clip ${voiceProgress + 1}/2 (10s)`}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => {
                    setVoiceProgress(0);
                    setVoiceAudios([]);
                    setVoiceEmbeddings([]);
                    setVoiceStatus("");
                  }}>
                    Reset
                  </Button>
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>· Speak in a quiet room</li>
                  <li>· Hold microphone 15–30 cm away</li>
                  <li>· Clips with too much noise are automatically rejected</li>
                </ul>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                    <UserPlus className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">Ready to enroll</div>
                    <p className="text-xs text-muted-foreground">
                      Biometric templates will be encrypted and stored securely.
                    </p>
                  </div>
                </div>
              </div>
              <dl className="grid gap-3 text-sm md:grid-cols-2">
                {[
                  ["Face samples captured", `${faceProgress}/20`],
                  ["Voice samples captured", `${voiceProgress}/2`],
                  ["Template encryption", "AES-256"],
                  ["Storage", "Secure biometric vault"],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3"
                  >
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
              <StatusBadge tone="info">Templates never leave your infrastructure</StatusBadge>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <Button variant="ghost" onClick={back} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button onClick={next} disabled={!isStepComplete(step)}>Continue</Button>
            ) : (
              <Button onClick={handleComplete} disabled={!isStepComplete(step)}>Complete enrollment</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
