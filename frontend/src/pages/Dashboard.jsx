import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowUpRight, Bot, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";

export default function Dashboard() {
  const [users,     setUsers]     = useState([]);
  const [robots,    setRobots]    = useState([]);
  const [logs,      setLogs]      = useState([]);
  const [alerts,    setAlerts]    = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUsers(),
      api.getRobots(),
      api.getLogs(),
      api.getAlerts(),
      api.getAnalytics(),
    ])
      .then(([u, r, l, a, an]) => {
        setUsers(u);
        setRobots(r);
        setLogs(l);
        setAlerts(a);
        setAnalytics(an);
      })
      .catch((err) => console.error("Dashboard fetch error:", err))
      .finally(() => setLoading(false));
  }, []);

  const todayLogs   = logs.filter((l) => {
    const today = new Date().toLocaleDateString("en-GB");
    return l.timestamp && l.createdAt
      ? new Date(l.createdAt).toLocaleDateString("en-GB") === today
      : true;
  });
  const grantedToday = todayLogs.filter((l) => l.result === "granted").length;
  const totalToday   = todayLogs.length;
  const successRate  = totalToday ? ((grantedToday / totalToday) * 100).toFixed(1) + "%" : "—";
  const openAlerts   = alerts.filter((a) => !a.acknowledged);
  const recentLogs   = logs.slice(0, 5);

  const stats = [
    { label: "Authentications today", value: totalToday.toString(),                                                    icon: Activity    },
    { label: "Success rate",          value: successRate,                                                              icon: ShieldCheck  },
    { label: "Enrolled users",        value: users.length.toString(),                                                  icon: UsersIcon   },
    { label: "Active robots",         value: `${robots.filter((r) => r.status === "online").length}/${robots.length}`, icon: Bot         },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Security Operations Dashboard"
        description="Live view of multimodal authentication activity across your robotic fleet."
        actions={
          <>
            <Button variant="outline" size="sm">Export report</Button>
            <Button size="sm" asChild>
              <Link to="/authenticate">Start authentication</Link>
            </Button>
          </>
        }
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">{s.label}</div>
                <s.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="mt-3 text-2xl font-semibold tracking-tight">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Auth trend chart */}
        <Card className="border-border shadow-none lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Authentication activity</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">Granted vs. denied · last 7 days</p>
            </div>
            <StatusBadge tone="info" dot={false}>Live</StatusBadge>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics?.authTrend || []} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="var(--color-primary)" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="granted" stroke="var(--color-primary)"     strokeWidth={2}   fill="url(#g)"    />
                  <Area type="monotone" dataKey="denied"  stroke="var(--color-destructive)" strokeWidth={1.5} fill="transparent"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Open alerts */}
        <Card className="border-border shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold">Open alerts</CardTitle>
            <Link to="/alerts" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {openAlerts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No open alerts.
              </div>
            ) : openAlerts.slice(0, 4).map((a) => (
              <div key={a.id} className="rounded-lg border border-border bg-surface p-3 transition-colors hover:border-border-strong">
                <div className="flex items-center justify-between">
                  <StatusBadge tone={a.severity === "critical" ? "danger" : a.severity === "high" ? "warning" : "neutral"}>
                    {a.severity}
                  </StatusBadge>
                  <span className="text-[11px] text-muted-foreground">{a.robotId}</span>
                </div>
                <div className="mt-2 text-sm font-medium">{a.type}</div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{a.message}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent auth logs */}
      <Card className="border-border shadow-none">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">Recent authentications</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Latest verification attempts across all robots.</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/logs">Open logs</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-border bg-surface text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">User</th>
                  <th className="px-5 py-2.5">Robot</th>
                  <th className="px-5 py-2.5">Face</th>
                  <th className="px-5 py-2.5">Voice</th>
                  <th className="px-5 py-2.5">Fused</th>
                  <th className="px-5 py-2.5">Result</th>
                  <th className="px-5 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted-foreground">
                      No authentication logs yet.
                    </td>
                  </tr>
                ) : recentLogs.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-surface">
                    <td className="px-5 py-3"><div className="font-medium">{l.userName}</div><div className="text-xs text-muted-foreground">{l.userId}</div></td>
                    <td className="px-5 py-3"><div className="font-medium">{l.robotName}</div><div className="text-xs text-muted-foreground">{l.robotId}</div></td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{(l.faceScore  * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{(l.voiceScore * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 tabular-nums font-medium">{(l.fusedScore * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3"><StatusBadge tone={l.result === "granted" ? "success" : "danger"}>{l.result === "granted" ? "Granted" : "Denied"}</StatusBadge></td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Robot fleet + system health */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Robot fleet</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Status snapshot across deployment sites.</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {robots.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-accent-foreground">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.location}</div>
                  </div>
                </div>
                <StatusBadge tone={r.status === "online" ? "success" : r.status === "maintenance" ? "warning" : "neutral"}>
                  {r.status}
                </StatusBadge>
              </div>
            ))}
            {robots.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-6">No robots registered yet.</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">System health</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Model and infrastructure signals.</p>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {[
              { k: "Face model (YOLO+InsightFace)", v: "Healthy", t: "success" },
              { k: "Voice model (MFCC+SV)",         v: "Healthy", t: "success" },
              { k: "Decision engine",               v: "Healthy", t: "success" },
              { k: "Median latency",                v: "312 ms",  t: "info"    },
              { k: "FAR (7d)",                      v: "0.11%",   t: "info"    },
              { k: "FRR (7d)",                      v: "1.24%",   t: "warning" },
            ].map((x) => (
              <div key={x.k} className="rounded-lg border border-border bg-surface p-4">
                <div className="text-xs text-muted-foreground">{x.k}</div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm font-semibold">{x.v}</span>
                  <StatusBadge tone={x.t} dot>{x.t === "success" ? "OK" : x.t === "warning" ? "Watch" : "Info"}</StatusBadge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
