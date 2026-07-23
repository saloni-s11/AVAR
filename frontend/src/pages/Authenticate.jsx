import React, { useEffect, useState } from "react";
import { Camera, CheckCircle2, Mic, Play, ShieldCheck, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { robots } from "@/lib/mock-data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Authenticate() {
  const [phase, setPhase] = useState("idle");
  const [face, setFace] = useState(0);
  const [voice, setVoice] = useState(0);

  useEffect(() => {
    if (phase !== "capturing") return;
    const id = setInterval(() => {
      setFace((f) => Math.min(f + Math.random() * 12, 96));
      setVoice((v) => Math.min(v + Math.random() * 10, 93));
    }, 220);
    const done = setTimeout(() => setPhase("processing"), 2600);
    const finish = setTimeout(() => setPhase("result"), 3400);
    return () => {
      clearInterval(id);
      clearTimeout(done);
      clearTimeout(finish);
    };
  }, [phase]);

  const start = () => {
    setFace(0);
    setVoice(0);
    setPhase("capturing");
  };
  const reset = () => {
    setFace(0);
    setVoice(0);
    setPhase("idle");
  };

  const fused = ((face + voice) / 2).toFixed(1);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Live session"
        title="Multimodal authentication"
        description="Verify a subject using synchronized face and voice capture. Fusion score is computed by the decision engine."
        actions={
          <Select defaultValue={robots[0].id}>
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
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border shadow-none lg:col-span-2">
          <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
            <div className="relative overflow-hidden rounded-lg border border-border bg-[oklch(0.20_0.02_250)]">
              <div className="aspect-[4/3] w-full">
                <div className="grid h-full place-items-center text-primary-foreground/80">
                  <div className="text-center">
                    <Camera className="mx-auto h-6 w-6 opacity-70" />
                    <div className="mt-2 text-xs opacity-70">Camera stream · Cam-01</div>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute inset-6 rounded-md border border-primary-foreground/30" />
              <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] text-white">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> LIVE
              </div>
              <div className="absolute inset-x-4 bottom-3 text-[11px] text-white/80">
                Face detection · {phase === "idle" ? "Standby" : "Tracking"}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border border-border bg-[oklch(0.20_0.02_250)] p-5">
              <div className="text-xs text-primary-foreground/70">Microphone · Mic-01</div>
              <div className="mt-8 flex h-32 items-end gap-1">
                {Array.from({ length: 40 }).map((_, i) => {
                  const active = phase === "capturing" || phase === "processing";
                  const h = active ? 20 + Math.abs(Math.sin(i * 0.7 + Date.now() * 0.002)) * 80 : 8;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary-foreground/60 transition-all"
                      style={{ height: `${h}%`, opacity: active ? 0.9 : 0.35 }}
                    />
                  );
                })}
              </div>
              <div className="mt-6 flex items-center justify-between text-[11px] text-primary-foreground/70">
                <span className="flex items-center gap-1.5">
                  <Waves className="h-3 w-3" /> Passphrase detected
                </span>
                <span>Noise: −42 dB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Confidence fusion</CardTitle>
            <p className="text-xs text-muted-foreground">
              Threshold: 0.85 · Weighted sum (0.6 face + 0.4 voice)
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <ScoreRow icon={<Camera className="h-3.5 w-3.5" />} label="Face" value={face} />
            <ScoreRow icon={<Mic className="h-3.5 w-3.5" />} label="Voice" value={voice} />
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Fused score</span>
                <span className="tabular-nums font-semibold text-foreground">{fused}%</span>
              </div>
              <Progress value={Number(fused)} className="mt-2 h-2" />
            </div>

            <div className="rounded-lg border border-border bg-surface p-4">
              {phase === "idle" && (
                <div className="text-center text-sm text-muted-foreground">
                  Session ready. Begin capture to authenticate.
                </div>
              )}
              {phase === "capturing" && (
                <StatusBadge tone="info">Capturing face &amp; voice…</StatusBadge>
              )}
              {phase === "processing" && (
                <StatusBadge tone="warning">Running decision engine…</StatusBadge>
              )}
              {phase === "result" && (
                <div className="text-center">
                  <CheckCircle2 className="mx-auto h-6 w-6 text-success" />
                  <div className="mt-2 text-sm font-semibold">Access granted</div>
                  <div className="text-xs text-muted-foreground">
                    Identified as <span className="font-medium text-foreground">Anika Rao</span> ·{" "}
                    latency 312 ms
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={start}
                disabled={phase === "capturing" || phase === "processing"}
              >
                <Play className="mr-1.5 h-4 w-4" />
                {phase === "result" ? "Run again" : "Start session"}
              </Button>
              <Button variant="outline" onClick={reset}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Session pipeline</CardTitle>
          <p className="text-xs text-muted-foreground">
            Steps executed by the AVAR authentication engine.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          {[
            "Input capture",
            "Preprocessing",
            "Feature extraction",
            "Matching",
            "Decision & logging",
          ].map((s, i) => (
            <div key={s} className="rounded-lg border border-border bg-surface p-4">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Step {i + 1}
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {s}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRow({ icon, label, value }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="tabular-nums font-medium">{value.toFixed(1)}%</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}
