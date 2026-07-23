import React, { useState } from "react";
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
  const [step, setStep] = useState(0);
  const [faceProgress, setFaceProgress] = useState(0);
  const [voiceProgress, setVoiceProgress] = useState(0);

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1));
  const back = () => setStep((s) => Math.max(s - 1, 0));

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
                <Input id="fn" placeholder="e.g. Marcus Chen" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="em">Corporate email</Label>
                <Input id="em" type="email" placeholder="name@avar.io" />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select defaultValue="Operator">
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
                <Input id="dep" placeholder="e.g. Warehouse A" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>Robot access scope</Label>
                <Select defaultValue="site">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Fleet-wide access</SelectItem>
                    <SelectItem value="site">Site-restricted access</SelectItem>
                    <SelectItem value="single">Single robot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border bg-surface">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Camera className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium">Camera preview</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Position the subject's face within the frame.
                  </p>
                </div>
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
                    onClick={() => setFaceProgress((p) => Math.min(p + 4, 20))}
                  >
                    Capture batch
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setFaceProgress(0)}>
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
              <div className="grid aspect-[4/3] place-items-center rounded-lg border border-dashed border-border bg-surface">
                <div className="text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-foreground">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-medium">Microphone input</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Read the passphrase clearly in a quiet environment.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium">Voice samples</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Six 4-second clips are used to build the speaker embedding.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-3 text-sm">
                  &ldquo;My voice is my key, verify me on AVAR.&rdquo;
                </div>
                <div>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="tabular-nums font-medium">{voiceProgress}/6</span>
                  </div>
                  <Progress value={(voiceProgress / 6) * 100} className="h-1.5" />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVoiceProgress((p) => Math.min(p + 1, 6))}
                  >
                    Record clip
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setVoiceProgress(0)}>
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
                  ["Voice samples captured", `${voiceProgress}/6`],
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
              <Button onClick={next}>Continue</Button>
            ) : (
              <Button>Complete enrollment</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
