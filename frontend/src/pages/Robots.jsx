import React, { useState, useEffect } from "react";
import { Bot, MapPin, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function Robots() {
  const [robots,  setRobots]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRobots()
      .then(setRobots)
      .catch((err) => console.error("Failed to fetch robots:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading robot fleet…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access management"
        title="Robot fleet"
        description="All robots enrolled in the AVAR authentication network."
        actions={
          <Button size="sm">
            <Plus className="mr-1.5 h-4 w-4" />
            Register robot
          </Button>
        }
      />

      {robots.length === 0 ? (
        <Card className="border-dashed border-border shadow-none">
          <CardContent className="grid place-items-center py-16 text-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
            <div className="mt-3 text-sm font-medium">No robots registered</div>
            <p className="mt-1 text-xs text-muted-foreground">Register your first robot to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {robots.map((r) => (
            <Card key={r.id} className="border-border shadow-none transition-colors hover:border-border-strong">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-md bg-accent text-accent-foreground">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.model} · {r.id}</div>
                    </div>
                  </div>
                  <StatusBadge tone={r.status === "online" ? "success" : r.status === "maintenance" ? "warning" : "neutral"}>
                    {r.status}
                  </StatusBadge>
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {r.location}
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center">
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Auth today</dt>
                    <dd className="mt-1 text-sm font-semibold tabular-nums">{r.authToday}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Last auth</dt>
                    <dd className="mt-1 text-sm font-medium">{r.lastAuth}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">Firmware</dt>
                    <dd className="mt-1 text-sm font-medium">{r.firmware}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">Details</Button>
                  <Button variant="ghost"   size="sm" className="flex-1">Configure</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
