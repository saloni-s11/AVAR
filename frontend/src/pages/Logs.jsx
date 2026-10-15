import React, { useState, useEffect } from "react";
import { Download, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { api } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Logs() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [result,  setResult]  = useState("all");
  const [q,       setQ]       = useState("");
  const [page,    setPage]    = useState(1);
  const PAGE_SIZE = 20;

  useEffect(() => {
    api.getLogs()
      .then(setLogs)
      .catch((err) => console.error("Failed to fetch logs:", err))
      .finally(() => setLoading(false));
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [result, q]);

  const filtered = logs.filter(
    (l) =>
      (result === "all" || l.result === result) &&
      (
        (l.userName || "").toLowerCase().includes(q.toLowerCase()) ||
        (l.robotName || "").toLowerCase().includes(q.toLowerCase()) ||
        (l.id || "").toLowerCase().includes(q.toLowerCase())
      ),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    const header = "Log ID,User,User ID,Robot,Robot ID,Face %,Voice %,Fused %,Result,Reason,Device,Timestamp";
    const rows = filtered.map((l) =>
      [l.id, l.userName, l.userId, l.robotName, l.robotId,
        (l.faceScore * 100).toFixed(1), (l.voiceScore * 100).toFixed(1), (l.fusedScore * 100).toFixed(1),
        l.result, `"${(l.reason || "").replace(/"/g, '""')}"`, l.device, l.timestamp
      ].join(",")
    );
    const csv  = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `auth-logs-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Security"
        title="Authentication logs"
        description="Every authentication attempt is recorded with biometric confidence scores and device metadata."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="mr-1.5 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <Card className="border-border shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by user, robot, or log ID"
                className="h-9 bg-surface pl-8 shadow-none"
              />
            </div>
            <Select value={result} onValueChange={setResult}>
              <SelectTrigger className="h-9 w-full bg-surface shadow-none sm:w-52">
                <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All results</SelectItem>
                <SelectItem value="granted">Granted only</SelectItem>
                <SelectItem value="denied">Denied only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Log ID</th>
                  <th className="px-5 py-2.5">User</th>
                  <th className="px-5 py-2.5">Robot</th>
                  <th className="px-5 py-2.5">Face</th>
                  <th className="px-5 py-2.5">Voice</th>
                  <th className="px-5 py-2.5">Fused</th>
                  <th className="px-5 py-2.5">Result</th>
                  <th className="px-5 py-2.5">Device</th>
                  <th className="px-5 py-2.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-sm text-muted-foreground">
                      Loading logs…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-sm text-muted-foreground">
                      No log entries match your filters.
                    </td>
                  </tr>
                ) : paginated.map((l) => (
                  <tr key={l.id} className="transition-colors hover:bg-surface">
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{l.id}</td>
                    <td className="px-5 py-3"><div className="font-medium">{l.userName}</div><div className="text-xs text-muted-foreground">{l.userId}</div></td>
                    <td className="px-5 py-3"><div className="font-medium">{l.robotName}</div><div className="text-xs text-muted-foreground">{l.robotId}</div></td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{(l.faceScore  * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 tabular-nums text-muted-foreground">{(l.voiceScore * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3 tabular-nums font-medium">{(l.fusedScore * 100).toFixed(1)}%</td>
                    <td className="px-5 py-3">
                      <StatusBadge tone={l.result === "granted" ? "success" : "danger"}>
                        {l.result === "granted" ? "Granted" : "Denied"}
                      </StatusBadge>
                      {l.reason && <div className="mt-1 text-[11px] text-muted-foreground">{l.reason}</div>}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{l.device}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">{l.timestamp}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>
              Showing <span className="font-medium text-foreground">{paginated.length}</span> of {filtered.length} entries
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="tabular-nums">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
