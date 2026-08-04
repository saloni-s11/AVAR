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
  const [faceImages, setFaceImages] = useState([]);
  const [isScanning, setIsScanning] = useState(false);

  // Microphone States
  const [audioStream, setAudioStream] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(0);
  const [voiceAudios, setVoiceAudios] = useState([]);

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

  // Initialize/cleanup microphone for Step 2
  useEffect(() => {
    if (step === 2) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((s) => {
          setAudioStream(s);
          const recorder = new MediaRecorder(s);
          setMediaRecorder(recorder);

          let chunks = [];
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            const blob = new Blob(chunks, { type: "audio/webm" });
            chunks = [];
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const base64Audio = reader.result;
              setVoiceAudios((prev) => [...prev, base64Audio]);
              setVoiceProgress((prev) => Math.min(prev + 1, 2));
            };
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

    let captured = 0;
    const collectedImages = [];

    for (let attempt = 0; attempt < 60 && captured < 20; attempt++) {
      // Wait 250ms between frames
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
          if (result.face_detected) {
            collectedImages.push(dataUrl);
            captured++;
            setFaceImages([...collectedImages]);
            setFaceProgress(captured);
          }
        } else {
          // YOLO server error — fall back to capturing the frame anyway
          collectedImages.push(dataUrl);
          captured++;
          setFaceImages([...collectedImages]);
          setFaceProgress(captured);
        }
      } catch {
        // YOLO server unreachable — fall back to direct capture
        collectedImages.push(dataUrl);
        captured++;
        setFaceImages([...collectedImages]);
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
      const response = await fetch("http://localhost:5001/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          role,
          department,
          faceSamples: faceProgress,
          voiceSamples: voiceProgress,
          faceImages,
          voiceAudios,
        }),
      });
      if (response.ok) {
        navigate("/users");
      } else {
        const errData = await response.json();
        alert("Failed to enroll user: " + (errData.message || response.statusText));
      }
    } catch (error) {
      console.error("Error enrolling user:", error);
      alert("Error enrolling user. Please make sure the backend server is running on port 5001.");
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
                  <Button variant="ghost" size="sm" onClick={() => { setFaceProgress(0); setFaceImages([]); }}>
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
              <div className={`grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border transition-colors ${isRecording ? "bg-red-500/10 border-red-500/40 animate-pulse" : "bg-surface"}`}>
                <div className="text-center">
                  <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${isRecording ? "bg-red-500 text-white" : "bg-accent text-accent-foreground"}`}>
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium">
                    {isRecording ? `Recording... (${recordingCountdown}s)` : "Microphone input"}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isRecording ? "Read the passphrase below" : "Read the passphrase clearly in a quiet environment."}
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Voice samples</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Two 10-second clips are used to build the speaker embedding.
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
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={recordClip}
                    disabled={isRecording || voiceProgress >= 2}
                  >
                    {isRecording ? "Recording clip..." : "Record clip (10s)"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setVoiceProgress(0); setVoiceAudios([]); }}>
                    Reset
                  </Button>
                </div>
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
