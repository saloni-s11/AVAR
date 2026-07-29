import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);
}

export default function Users() {
  const [q, setQ] = useState("");
const [role, setRole] = useState("all");
const [users, setUsers] = useState([]);
useEffect(() => {
  fetchUsers();
}, []);

const fetchUsers = async () => {
  try {
    const response = await axios.get(
      "http://127.0.0.1:8000/enroll/users"
    );

    setUsers(response.data);

  } catch (error) {
    console.error("Error fetching users:", error);
  }
};
  const filtered = users.filter(
  (u) =>
    (role === "all" || u.role === role) &&
    (
      u.full_name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.department.toLowerCase().includes(q.toLowerCase())
    )
);
console.log("Users from backend:", users);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access management"
        title="Enrolled users"
        description="Authorized individuals with active biometric templates for face and voice authentication."
        actions={
          <Button size="sm" asChild>
            <Link to="/enroll">
              <Plus className="mr-1.5 h-4 w-4" />
              Enroll user
            </Link>
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
                placeholder="Search by name, email, or department"
                className="h-9 bg-surface pl-8 shadow-none"
              />
            </div>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-9 w-full bg-surface shadow-none sm:w-52">
                <Filter className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="Administrator">Administrator</SelectItem>
                <SelectItem value="Operator">Operator</SelectItem>
                <SelectItem value="Technician">Technician</SelectItem>
                <SelectItem value="Researcher">Researcher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">User</th>
                  <th className="px-5 py-2.5">Role</th>
                  <th className="px-5 py-2.5">Department</th>
                  <th className="px-5 py-2.5">Biometrics</th>
                  <th className="px-5 py-2.5">Enrolled</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-surface">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-accent text-xs font-medium text-accent-foreground">
                            {initials(u.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{u.role}</td>
                    <td className="px-5 py-3 text-muted-foreground">{u.department}</td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">
                      <span className="tabular-nums">{u.face_samples?.length || 0}</span> face ·{" "}
                      <span className="tabular-nums">{u.voice_samples?.length || 0}</span> voice
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{u.created_at || "-"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge
                        tone={
                          u.status === "active"
                            ? "success"
                            : u.status === "pending"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {u.status}
                      </StatusBadge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground">-</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
