import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Alerts from "./pages/Alerts";
import Analytics from "./pages/Analytics";
import Authenticate from "./pages/Authenticate";
import Enroll from "./pages/Enroll";
import Logs from "./pages/Logs";
import Robots from "./pages/Robots";
import Settings from "./pages/Settings";
import Users from "./pages/Users";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="authenticate" element={<Authenticate />} />
            <Route path="enroll" element={<Enroll />} />
            <Route path="logs" element={<Logs />} />
            <Route path="robots" element={<Robots />} />
            <Route path="settings" element={<Settings />} />
            <Route path="users" element={<Users />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
