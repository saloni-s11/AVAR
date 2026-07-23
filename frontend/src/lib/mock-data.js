export const users = [
  { id: "USR-001", name: "Anika Rao", email: "anika.rao@avar.io", role: "Administrator", department: "Security Ops", enrolledAt: "2026-04-12", faceSamples: 24, voiceSamples: 8, status: "active", lastSeen: "2m ago" },
  { id: "USR-002", name: "Marcus Chen", email: "marcus.chen@avar.io", role: "Operator", department: "Warehouse A", enrolledAt: "2026-05-02", faceSamples: 18, voiceSamples: 6, status: "active", lastSeen: "12m ago" },
  { id: "USR-003", name: "Priya Nair", email: "priya.nair@avar.io", role: "Technician", department: "Robotics Lab", enrolledAt: "2026-05-14", faceSamples: 22, voiceSamples: 7, status: "active", lastSeen: "1h ago" },
  { id: "USR-004", name: "Diego Alvarez", email: "diego.alvarez@avar.io", role: "Researcher", department: "R&D", enrolledAt: "2026-06-01", faceSamples: 16, voiceSamples: 5, status: "pending", lastSeen: "—" },
  { id: "USR-005", name: "Hannah Weber", email: "hannah.weber@avar.io", role: "Operator", department: "Warehouse B", enrolledAt: "2026-06-18", faceSamples: 20, voiceSamples: 6, status: "active", lastSeen: "22m ago" },
  { id: "USR-006", name: "Kenji Watanabe", email: "kenji.w@avar.io", role: "Technician", department: "Assembly Line", enrolledAt: "2026-07-03", faceSamples: 15, voiceSamples: 5, status: "suspended", lastSeen: "3d ago" },
  { id: "USR-007", name: "Fatima Bello", email: "fatima.bello@avar.io", role: "Administrator", department: "IT Security", enrolledAt: "2026-07-09", faceSamples: 26, voiceSamples: 9, status: "active", lastSeen: "just now" },
];

export const robots = [
  { id: "RBT-A01", name: "Sentinel-01", model: "AVAR-X1", location: "Warehouse A · Bay 3", status: "online", lastAuth: "2m ago", authToday: 42, firmware: "3.4.1" },
  { id: "RBT-A02", name: "Sentinel-02", model: "AVAR-X1", location: "Warehouse A · Bay 7", status: "online", lastAuth: "8m ago", authToday: 31, firmware: "3.4.1" },
  { id: "RBT-B01", name: "Custodian-01", model: "AVAR-M2", location: "Assembly Line B", status: "online", lastAuth: "1m ago", authToday: 58, firmware: "3.4.0" },
  { id: "RBT-L01", name: "LabAssist-01", model: "AVAR-R3", location: "Robotics Lab", status: "maintenance", lastAuth: "4h ago", authToday: 6, firmware: "3.3.9" },
  { id: "RBT-L02", name: "LabAssist-02", model: "AVAR-R3", location: "R&D Lab · Room 214", status: "online", lastAuth: "18m ago", authToday: 19, firmware: "3.4.1" },
  { id: "RBT-C01", name: "Concierge-01", model: "AVAR-H1", location: "Main Reception", status: "offline", lastAuth: "1d ago", authToday: 0, firmware: "3.3.7" },
];

export const logs = [
  { id: "AUTH-9821", userId: "USR-007", userName: "Fatima Bello", timestamp: "2026-07-23 14:22:08", result: "granted", faceScore: 0.98, voiceScore: 0.95, fusedScore: 0.97, robotId: "RBT-A01", robotName: "Sentinel-01", device: "Cam-01 / Mic-01" },
  { id: "AUTH-9820", userId: "USR-001", userName: "Anika Rao", timestamp: "2026-07-23 14:20:41", result: "granted", faceScore: 0.96, voiceScore: 0.93, fusedScore: 0.95, robotId: "RBT-B01", robotName: "Custodian-01", device: "Cam-03 / Mic-03" },
  { id: "AUTH-9819", userId: "UNKNOWN", userName: "Unknown subject", timestamp: "2026-07-23 14:18:12", result: "denied", faceScore: 0.42, voiceScore: 0.31, fusedScore: 0.37, robotId: "RBT-A02", robotName: "Sentinel-02", device: "Cam-02 / Mic-02", reason: "Low fusion confidence" },
  { id: "AUTH-9818", userId: "USR-002", userName: "Marcus Chen", timestamp: "2026-07-23 14:11:55", result: "granted", faceScore: 0.94, voiceScore: 0.88, fusedScore: 0.91, robotId: "RBT-A01", robotName: "Sentinel-01", device: "Cam-01 / Mic-01" },
  { id: "AUTH-9817", userId: "USR-003", userName: "Priya Nair", timestamp: "2026-07-23 13:58:30", result: "granted", faceScore: 0.91, voiceScore: 0.86, fusedScore: 0.89, robotId: "RBT-L02", robotName: "LabAssist-02", device: "Cam-05 / Mic-05" },
  { id: "AUTH-9816", userId: "UNKNOWN", userName: "Unknown subject", timestamp: "2026-07-23 13:44:02", result: "denied", faceScore: 0.55, voiceScore: 0.24, fusedScore: 0.40, robotId: "RBT-B01", robotName: "Custodian-01", device: "Cam-03 / Mic-03", reason: "Voice mismatch" },
  { id: "AUTH-9815", userId: "USR-005", userName: "Hannah Weber", timestamp: "2026-07-23 13:31:19", result: "granted", faceScore: 0.93, voiceScore: 0.90, fusedScore: 0.92, robotId: "RBT-A02", robotName: "Sentinel-02", device: "Cam-02 / Mic-02" },
  { id: "AUTH-9814", userId: "USR-006", userName: "Kenji Watanabe", timestamp: "2026-07-23 13:12:47", result: "denied", faceScore: 0.71, voiceScore: 0.62, fusedScore: 0.67, robotId: "RBT-B01", robotName: "Custodian-01", device: "Cam-03 / Mic-03", reason: "Account suspended" },
  { id: "AUTH-9813", userId: "USR-001", userName: "Anika Rao", timestamp: "2026-07-23 12:58:03", result: "granted", faceScore: 0.97, voiceScore: 0.94, fusedScore: 0.96, robotId: "RBT-A01", robotName: "Sentinel-01", device: "Cam-01 / Mic-01" },
  { id: "AUTH-9812", userId: "USR-007", userName: "Fatima Bello", timestamp: "2026-07-23 12:41:22", result: "granted", faceScore: 0.98, voiceScore: 0.96, fusedScore: 0.97, robotId: "RBT-L02", robotName: "LabAssist-02", device: "Cam-05 / Mic-05" },
];

export const alerts = [
  { id: "ALT-401", severity: "critical", type: "Intruder detected", message: "Two consecutive failed authentications on Sentinel-02 within 60 seconds.", robotId: "RBT-A02", timestamp: "2026-07-23 14:18:44", acknowledged: false },
  { id: "ALT-400", severity: "high", type: "Possible replay attack", message: "Repeated identical audio waveform observed on Custodian-01.", robotId: "RBT-B01", timestamp: "2026-07-23 13:44:20", acknowledged: false },
  { id: "ALT-399", severity: "medium", type: "Suspended account", message: "USR-006 attempted access on Custodian-01.", robotId: "RBT-B01", timestamp: "2026-07-23 13:12:47", acknowledged: true },
  { id: "ALT-398", severity: "low", type: "Firmware out of date", message: "Concierge-01 is running firmware 3.3.7 (latest 3.4.1).", robotId: "RBT-C01", timestamp: "2026-07-23 09:04:11", acknowledged: false },
  { id: "ALT-397", severity: "medium", type: "Camera degradation", message: "Sentinel-01 face confidence trending below 0.85 for 30 min.", robotId: "RBT-A01", timestamp: "2026-07-23 08:41:02", acknowledged: true },
];

export const authTrend = [
  { day: "Mon", granted: 182, denied: 9 },
  { day: "Tue", granted: 201, denied: 12 },
  { day: "Wed", granted: 174, denied: 7 },
  { day: "Thu", granted: 219, denied: 14 },
  { day: "Fri", granted: 240, denied: 11 },
  { day: "Sat", granted: 96, denied: 4 },
  { day: "Sun", granted: 82, denied: 3 },
];

export const confidenceTrend = [
  { hour: "08:00", face: 0.94, voice: 0.90, fused: 0.93 },
  { hour: "09:00", face: 0.95, voice: 0.91, fused: 0.94 },
  { hour: "10:00", face: 0.93, voice: 0.89, fused: 0.92 },
  { hour: "11:00", face: 0.96, voice: 0.92, fused: 0.95 },
  { hour: "12:00", face: 0.95, voice: 0.90, fused: 0.93 },
  { hour: "13:00", face: 0.92, voice: 0.87, fused: 0.90 },
  { hour: "14:00", face: 0.96, voice: 0.93, fused: 0.95 },
];

export const modalitySplit = [
  { name: "Face + Voice", value: 78 },
  { name: "Face only fallback", value: 14 },
  { name: "Voice only fallback", value: 5 },
  { name: "Denied", value: 3 },
];
