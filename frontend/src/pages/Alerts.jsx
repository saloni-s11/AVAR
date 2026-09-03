import React, { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

const toneFor = (s) =>
  s === "critical" ? "danger" : s === "high" ? "warning" : s === "medium" ? "info" : "neutral";

export default function Alerts() {
  const [alerts,  setAlerts]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts()
      .then(setAlerts)
      .catch((err) => console.error("Failed to fetch alerts:", err))
      .finally(() => setLoading(false));
  }, []);

  const acknowledge = async (id) => {
    try {
      const updated = await api.acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    }
  };

  const open   = alerts.filter((a) => !a.acknowledged);
  const closed = alerts.filter((a) =>  a.acknowledged);

  const summaryStats = [
    { k: "Open critical",  v: open.filter((a) => a.severity === "critical").length, tone: "danger"  },
    { k: "Open high",      v: open.filter((a) => a.severity === "high").length,     tone: "warning" },
    { k: "Acknowledged",   v: closed.length,                                        tone: "success" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading alerts…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security"
        title="Alerts & incidents"
        description="Events raised by the intruder detection layer and system monitors."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {summaryStats.map((s) => (
          <Card key={s.k} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground">{s.k}</div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-2xl font-semibold tabular-nums">{s.v}</span>
                <StatusBadge tone={s.tone}>
                  {s.tone === "danger" ? "Attention" : s.tone === "warning" ? "Watch" : "OK"}
                </StatusBadge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Open alerts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <Card className="border-dashed border-border shadow-none">
            <CardContent className="grid place-items-center py-16 text-center">
              <ShieldCheck className="h-8 w-8 text-success" />
              <div className="mt-3 text-sm font-medium">No open alerts</div>
              <p className="mt-1 text-xs text-muted-foreground">All security events have been acknowledged.</p>
            </CardContent>
          </Card>
        ) : open.map((a) => (
          <Card key={a.id} className="border-border shadow-none">
            <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={toneFor(a.severity)}>{a.severity}</StatusBadge>
                  <span className="text-sm font-semibold">{a.type}</span>
                  <span className="text-xs text-muted-foreground">· {a.robotId}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.message}</p>
                <div className="mt-2 text-[11px] text-muted-foreground">{a.timestamp}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm">Investigate</Button>
                <Button size="sm" onClick={() => acknowledge(a.id)}>Acknowledge</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Acknowledged alerts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Acknowledged ({closed.length})
        </h2>
        {closed.length === 0 ? (
          <div className="text-sm text-muted-foreground">No acknowledged alerts.</div>
        ) : closed.map((a) => (
          <Card key={a.id} className="border-border bg-surface shadow-none">
            <CardContent className="flex items-center gap-4 p-4">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{a.type}</div>
                <div className="truncate text-xs text-muted-foreground">{a.message}</div>
              </div>
              <span className="text-[11px] text-muted-foreground">{a.timestamp}</span>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
