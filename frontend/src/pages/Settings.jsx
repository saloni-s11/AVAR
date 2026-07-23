import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { PageHeader } from "@/components/page-header";

function Row({ title, hint, children }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Global configuration for the AVAR authentication platform."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <nav className="space-y-1 text-sm">
          {["Authentication policy", "Security", "Notifications", "Data & storage"].map((s, i) => (
            <a
              key={s}
              href={`#${s.toLowerCase().replace(/\s/g, "-")}`}
              className={`block rounded-md px-3 py-2 transition-colors ${
                i === 0
                  ? "bg-accent font-medium text-accent-foreground"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground"
              }`}
            >
              {s}
            </a>
          ))}
        </nav>

        <div className="space-y-6 lg:col-span-2">
          <Card id="authentication-policy" className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Authentication policy</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border py-0">
              <Row title="Fusion threshold" hint="Minimum combined confidence to grant access.">
                <Input defaultValue="0.85" className="h-9 w-28 text-right tabular-nums" />
              </Row>
              <Row
                title="Face weight"
                hint="Weight applied to the face score in the weighted-sum decision."
              >
                <Input defaultValue="0.60" className="h-9 w-28 text-right tabular-nums" />
              </Row>
              <Row
                title="Session timeout"
                hint="Idle duration before an authenticated session expires."
              >
                <Input defaultValue="15 min" className="h-9 w-28 text-right" />
              </Row>
              <Row title="Require liveness challenge" hint="Randomized head-pose or spoken phrase.">
                <Switch defaultChecked />
              </Row>
            </CardContent>
          </Card>

          <Card id="security" className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Security</CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border py-0">
              <Row title="Encrypt biometric templates at rest" hint="AES-256 with rotating keys.">
                <Switch defaultChecked />
              </Row>
              <Row title="Block after failed attempts" hint="Temporarily block user after N failures.">
                <Input defaultValue="3" className="h-9 w-28 text-right tabular-nums" />
              </Row>
              <Row title="Deepfake / voice-clone detector">
                <Switch defaultChecked />
              </Row>
              <Row title="Role-based access control">
                <Switch defaultChecked />
              </Row>
            </CardContent>
          </Card>

          <Card id="notifications" className="border-border shadow-none">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Admin email</Label>
                  <Input defaultValue="security@avar.io" />
                </div>
                <div className="space-y-1.5">
                  <Label>Webhook URL</Label>
                  <Input placeholder="https://…" />
                </div>
              </div>
              <Separator />
              <Row title="Email me on critical alerts">
                <Switch defaultChecked />
              </Row>
              <Row title="Daily digest">
                <Switch />
              </Row>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button>Save changes</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
