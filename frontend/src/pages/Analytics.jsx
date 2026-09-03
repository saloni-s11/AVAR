import React, { useState, useEffect } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { api } from "@/lib/api";

const chartColors = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
];

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch((err) => console.error("Failed to fetch analytics:", err))
      .finally(() => setLoading(false));
  }, []);

  const authTrend     = data?.authTrend      || [];
  const modalitySplit = data?.modalitySplit   || [];
  const total         = data?.totalAuth       ?? 0;
  const granted       = data?.grantedTotal    ?? 0;
  const denied        = data?.deniedTotal     ?? 0;
  const successRate   = total ? ((granted / total) * 100).toFixed(1) + "%" : "—";

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Loading analytics…
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Insights"
        title="Analytics"
        description="Model accuracy, error rates, and confidence trends across the AVAR platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Total authentications", v: total.toString()  },
          { k: "Granted",               v: granted.toString()},
          { k: "Denied",                v: denied.toString() },
          { k: "Success rate",          v: successRate       },
        ].map((s) => (
          <Card key={s.k} className="border-border shadow-none">
            <CardContent className="p-5">
              <div className="text-xs font-medium text-muted-foreground">{s.k}</div>
              <div className="mt-3 text-2xl font-semibold tabular-nums">{s.v}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Granted vs denied bar chart */}
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Granted vs. denied</CardTitle>
            <p className="text-xs text-muted-foreground">Weekly volume by result.</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {authTrend.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No data yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={authTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis dataKey="day" fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                    <YAxis fontSize={11} tickLine={false} axisLine={false} stroke="var(--color-muted-foreground)" />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="granted" fill="var(--color-primary)"     radius={[4, 4, 0, 0]} />
                    <Bar dataKey="denied"  fill="var(--color-destructive)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modality split pie chart */}
        <Card className="border-border shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Modality distribution</CardTitle>
            <p className="text-xs text-muted-foreground">Share of sessions per decision path.</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[1fr_auto] items-center gap-6">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={modalitySplit} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="var(--color-background)">
                      {modalitySplit.map((_, i) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-2 text-sm">
                {modalitySplit.map((m, i) => (
                  <li key={m.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: chartColors[i % chartColors.length] }} />
                    <span className="text-muted-foreground">{m.name}</span>
                    <span className="ml-2 tabular-nums font-medium">{m.value}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Model performance table */}
        <Card className="border-border shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Model performance</CardTitle>
            <p className="text-xs text-muted-foreground">Latest evaluation of face and voice models.</p>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <th className="pb-2">Metric</th>
                  <th className="pb-2">Face (YOLO + InsightFace)</th>
                  <th className="pb-2">Voice (MFCC + SV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ["Precision",    "0.982", "0.964"],
                  ["Recall",       "0.977", "0.951"],
                  ["F1 score",     "0.979", "0.957"],
                  ["FAR",          "0.09%", "0.14%"],
                  ["FRR",          "0.98%", "1.62%"],
                  ["Avg. latency", "148 ms","164 ms"],
                ].map(([k, a, b]) => (
                  <tr key={k}>
                    <td className="py-2.5 text-muted-foreground">{k}</td>
                    <td className="py-2.5 tabular-nums font-medium">{a}</td>
                    <td className="py-2.5 tabular-nums font-medium">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
