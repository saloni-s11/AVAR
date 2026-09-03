// Centralised fetch helpers — all calls go through the Vite proxy to port 5001

async function get(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
  return res.json();
}

async function patch(path, body) {
  const res = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
  return res.json();
}

export const api = {
  getUsers:           ()      => get("/api/users"),
  getRobots:          ()      => get("/api/robots"),
  getLogs:            ()      => get("/api/logs"),
  getAlerts:          ()      => get("/api/alerts"),
  getAnalytics:       ()      => get("/api/analytics"),
  enrollUser:         (b)     => post("/api/users", b),
  registerRobot:      (b)     => post("/api/robots", b),
  acknowledgeAlert:   (id)    => patch(`/api/alerts/${id}/acknowledge`),
  updateRobot:        (id, b) => patch(`/api/robots/${id}`, b),
  postLog:            (b)     => post("/api/logs", b),
  postAlert:          (b)     => post("/api/alerts", b),
  authenticate:       (b)     => post("/api/authenticate", b),
};
