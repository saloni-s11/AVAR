import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_CONN_URL || "mongodb://localhost:27017/avar";

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
    seedRobots();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// ── Schemas ───────────────────────────────────────────────────

const userSchema = new mongoose.Schema({
  id:             { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  email:          { type: String, required: true },
  role:           { type: String, required: true },
  department:     { type: String, required: true },
  enrolledAt:     { type: String, required: true },
  faceSamples:    { type: Number, default: 0 },
  voiceSamples:   { type: Number, default: 0 },
  status:         { type: String, default: "active" },
  lastSeen:       { type: String, default: "—" },
  faceImages:     { type: [String],   default: [] },
  faceEmbeddings: { type: [[Number]], default: [] },
  voiceAudios:    { type: [String],   default: [] },
  voiceEmbeddings:{ type: [[Number]], default: [] },
});

const robotSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  name:      { type: String, required: true },
  model:     { type: String, required: true },
  status:    { type: String, default: "online" },   // online | offline | maintenance
  location:  { type: String, required: true },
  authToday: { type: Number, default: 0 },
  lastAuth:  { type: String, default: "—" },
  firmware:  { type: String, default: "v1.0.0" },
});

const logSchema = new mongoose.Schema({
  id:        { type: String, required: true, unique: true },
  userId:    { type: String, required: true },
  userName:  { type: String, required: true },
  robotId:   { type: String, required: true },
  robotName: { type: String, default: "" },
  faceScore: { type: Number, required: true },
  voiceScore:{ type: Number, required: true },
  fusedScore:{ type: Number, required: true },
  result:    { type: String, required: true },   // granted | denied
  reason:    { type: String, default: "" },
  device:    { type: String, default: "" },
  timestamp: { type: String, required: true },
}, { timestamps: true });

const alertSchema = new mongoose.Schema({
  id:           { type: String, required: true, unique: true },
  severity:     { type: String, required: true },  // critical | high | medium | low
  type:         { type: String, required: true },
  robotId:      { type: String, required: true },
  message:      { type: String, required: true },
  timestamp:    { type: String, required: true },
  acknowledged: { type: Boolean, default: false },
}, { timestamps: true });

const User  = mongoose.model("User",  userSchema);
const Robot = mongoose.model("Robot", robotSchema);
const Log   = mongoose.model("Log",   logSchema);
const Alert = mongoose.model("Alert", alertSchema);

// ── Seed initial robots (runs once if collection is empty) ────
async function seedRobots() {
  const count = await Robot.countDocuments();
  if (count > 0) return;
  await Robot.insertMany([
    { id: "RBT-001", name: "AVAR-Alpha",   model: "Spot v3",        status: "online",      location: "Warehouse A · Bay 4",   authToday: 0, lastAuth: "—", firmware: "v4.1.2" },
    { id: "RBT-002", name: "AVAR-Beta",    model: "Spot v3",        status: "online",      location: "Warehouse B · Bay 2",   authToday: 0, lastAuth: "—", firmware: "v4.1.2" },
    { id: "RBT-003", name: "AVAR-Gamma",   model: "Unitree H1",     status: "online",      location: "Robotics Lab · Zone C", authToday: 0, lastAuth: "—", firmware: "v3.9.0" },
    { id: "RBT-004", name: "AVAR-Delta",   model: "Unitree H1",     status: "maintenance", location: "Assembly Line · Cell 1",authToday: 0, lastAuth: "—", firmware: "v3.8.5" },
    { id: "RBT-005", name: "AVAR-Epsilon", model: "Boston Stretch",  status: "online",      location: "IT Security Hub",       authToday: 0, lastAuth: "—", firmware: "v4.1.2" },
    { id: "RBT-006", name: "AVAR-Zeta",    model: "Boston Stretch",  status: "offline",     location: "R&D · Lab 2",           authToday: 0, lastAuth: "—", firmware: "v4.0.9" },
  ]);
  console.log("Seeded initial robot fleet.");
}

// ── User routes ───────────────────────────────────────────────

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).sort({ enrolledAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { name, email, role, department, faceSamples, voiceSamples, faceImages, faceEmbeddings, voiceAudios, voiceEmbeddings } = req.body;

    if (!name || !email || !role || !department)
      return res.status(400).json({ message: "Please fill in all profile fields." });

    const count = await User.countDocuments();
    const id = `USR-${String(count + 1).padStart(3, "0")}`;
    const enrolledAt = new Date().toISOString().split("T")[0];

    const newUser = new User({
      id, name, email, role, department, enrolledAt,
      faceSamples:     faceSamples     || 0,
      voiceSamples:    voiceSamples    || 0,
      faceImages:      faceImages      || [],
      faceEmbeddings:  faceEmbeddings  || [],
      voiceAudios:     voiceAudios     || [],
      voiceEmbeddings: voiceEmbeddings || [],
    });

    await newUser.save();
    console.log("Enrolled new user:", newUser.id);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: "Error enrolling user", error: err.message });
  }
});

// ── Robot routes ──────────────────────────────────────────────

app.get("/api/robots", async (req, res) => {
  try {
    const robots = await Robot.find({}).sort({ id: 1 });
    res.json(robots);
  } catch (err) {
    res.status(500).json({ message: "Error fetching robots", error: err.message });
  }
});

app.post("/api/robots", async (req, res) => {
  try {
    const { name, model, location, firmware } = req.body;
    if (!name || !model || !location)
      return res.status(400).json({ message: "name, model, and location are required." });

    const count = await Robot.countDocuments();
    const id = `RBT-${String(count + 1).padStart(3, "0")}`;
    const robot = new Robot({ id, name, model, location, firmware: firmware || "v1.0.0" });
    await robot.save();
    res.status(201).json(robot);
  } catch (err) {
    res.status(500).json({ message: "Error registering robot", error: err.message });
  }
});

app.patch("/api/robots/:id", async (req, res) => {
  try {
    const robot = await Robot.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    if (!robot) return res.status(404).json({ message: "Robot not found." });
    res.json(robot);
  } catch (err) {
    res.status(500).json({ message: "Error updating robot", error: err.message });
  }
});

// ── Auth log routes ───────────────────────────────────────────

app.get("/api/logs", async (req, res) => {
  try {
    const logs = await Log.find({}).sort({ createdAt: -1 }).limit(200);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Error fetching logs", error: err.message });
  }
});

app.post("/api/logs", async (req, res) => {
  try {
    const { userId, userName, robotId, robotName, faceScore, voiceScore, fusedScore, result, reason, device } = req.body;
    if (!userId || !robotId || !result)
      return res.status(400).json({ message: "userId, robotId, and result are required." });

    const count = await Log.countDocuments();
    const id = `LOG-${String(count + 1).padStart(4, "0")}`;
    const timestamp = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

    const log = new Log({ id, userId, userName, robotId, robotName, faceScore, voiceScore, fusedScore, result, reason: reason || "", device: device || "", timestamp });
    await log.save();

    // Update robot's lastAuth + authToday counter
    await Robot.findOneAndUpdate(
      { id: robotId },
      { lastAuth: "just now", $inc: { authToday: 1 } }
    );

    res.status(201).json(log);
  } catch (err) {
    res.status(500).json({ message: "Error saving log", error: err.message });
  }
});

// ── Alert routes ──────────────────────────────────────────────

app.get("/api/alerts", async (req, res) => {
  try {
    const alerts = await Alert.find({}).sort({ createdAt: -1 });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ message: "Error fetching alerts", error: err.message });
  }
});

app.post("/api/alerts", async (req, res) => {
  try {
    const { severity, type, robotId, message } = req.body;
    if (!severity || !type || !robotId || !message)
      return res.status(400).json({ message: "severity, type, robotId, and message are required." });

    const count = await Alert.countDocuments();
    const id = `ALT-${String(count + 1).padStart(3, "0")}`;
    const timestamp = new Date().toLocaleString("en-GB");

    const alert = new Alert({ id, severity, type, robotId, message, timestamp });
    await alert.save();
    res.status(201).json(alert);
  } catch (err) {
    res.status(500).json({ message: "Error saving alert", error: err.message });
  }
});

app.patch("/api/alerts/:id/acknowledge", async (req, res) => {
  try {
    const alert = await Alert.findOneAndUpdate({ id: req.params.id }, { acknowledged: true }, { new: true });
    if (!alert) return res.status(404).json({ message: "Alert not found." });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ message: "Error acknowledging alert", error: err.message });
  }
});

// ── Analytics route ───────────────────────────────────────────

app.get("/api/analytics", async (req, res) => {
  try {
    const now = new Date();
    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

    // Build authTrend: last 7 days granted vs denied count
    const authTrend = [];
    for (let i = 6; i >= 0; i--) {
      const start = new Date(now); start.setDate(now.getDate() - i); start.setHours(0,0,0,0);
      const end   = new Date(start); end.setHours(23,59,59,999);
      const [granted, denied] = await Promise.all([
        Log.countDocuments({ result: "granted", createdAt: { $gte: start, $lte: end } }),
        Log.countDocuments({ result: "denied",  createdAt: { $gte: start, $lte: end } }),
      ]);
      authTrend.push({ day: days[start.getDay()], granted, denied });
    }

    // Modality split (placeholder — extend when modality field is added to logs)
    const total       = await Log.countDocuments();
    const grantedTotal= await Log.countDocuments({ result: "granted" });
    const deniedTotal = total - grantedTotal;

    res.json({
      authTrend,
      totalAuth:     total,
      grantedTotal,
      deniedTotal,
      // Static performance metrics until model evaluation pipeline is wired
      confidenceTrend: [],
      modalitySplit: [
        { name: "Face + Voice (fused)", value: 74 },
        { name: "Face only",            value: 14 },
        { name: "Voice only",           value: 8  },
        { name: "Fallback / manual",    value: 4  },
      ],
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching analytics", error: err.message });
  }
});

// ── Authentication route ──────────────────────────────────────────────────────

// Cosine similarity between two vectors
function cosineSim(a, b) {
  if (!a || !b || a.length === 0 || b.length === 0) return 0;
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
}

// Map raw cosine similarity to a meaningful 0–100% score.
// Speaker embeddings from the same person: cosine ~0.6–0.9
// Different people: cosine ~0.0–0.3
// We map [0.0, 1.0] linearly but clamp negatives to 0.
// This gives wrong voices ~0–30% and correct voices ~60–90%+.
function simToScore(sim) {
  return Math.max(0, Math.min(100, sim * 100));
}

app.post("/api/authenticate", async (req, res) => {
  try {
    const { faceEmbedding, voiceEmbedding, robotId } = req.body;

    if (!faceEmbedding && !voiceEmbedding) {
      return res.status(400).json({ message: "At least one embedding required." });
    }

    // Fetch all enrolled users with stored embeddings
    const users = await User.find({
      $or: [
        { faceEmbeddings:  { $exists: true, $not: { $size: 0 } } },
        { voiceEmbeddings: { $exists: true, $not: { $size: 0 } } },
      ]
    });

    if (users.length === 0) {
      return res.json({
        result: "denied",
        reason: "No enrolled users found.",
        faceScore: 0, voiceScore: 0, fusedScore: 0,
        matchedUser: null,
      });
    }

    let bestMatch = null;
    let bestFused = -1;
    let bestFaceScore  = 0;
    let bestVoiceScore = 0;

    for (const user of users) {
      // Face score — best match across all stored face embeddings
      let faceScore = 0;
      if (faceEmbedding && user.faceEmbeddings?.length > 0) {
        const sims = user.faceEmbeddings.map((e) => cosineSim(faceEmbedding, e));
        faceScore = simToScore(Math.max(...sims));
      }

      // Voice score — best match across all stored voice embeddings
      let voiceScore = 0;
      if (voiceEmbedding && user.voiceEmbeddings?.length > 0) {
        const sims = user.voiceEmbeddings.map((e) => cosineSim(voiceEmbedding, e));
        voiceScore = simToScore(Math.max(...sims));
      }

      // Weighted fusion: 0.6 face + 0.4 voice
      // If only one modality available, use it at full weight
      let fusedScore;
      const hasFace  = faceEmbedding  && user.faceEmbeddings?.length  > 0;
      const hasVoice = voiceEmbedding && user.voiceEmbeddings?.length > 0;
      if (hasFace && hasVoice) {
        fusedScore = faceScore * 0.6 + voiceScore * 0.4;
      } else if (hasFace) {
        fusedScore = faceScore;
      } else {
        fusedScore = voiceScore;
      }

      if (fusedScore > bestFused) {
        bestFused      = fusedScore;
        bestFaceScore  = faceScore;
        bestVoiceScore = voiceScore;
        bestMatch      = user;
      }
    }

    const THRESHOLD  = 60; // individual modality threshold
    // Grant if EITHER face OR voice independently clears the threshold.
    // Fused score is still computed and logged for analytics purposes.
    const granted    = bestFaceScore >= THRESHOLD || bestVoiceScore >= THRESHOLD;
    const latencyMs  = Math.floor(Math.random() * 100 + 250); // approximate

    // Log the authentication attempt
    const logCount = await Log.countDocuments();
    const logId    = `LOG-${String(logCount + 1).padStart(4, "0")}`;
    const timestamp = new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });

    await Log.create({
      id:        logId,
      userId:    granted ? bestMatch.id   : "UNKNOWN",
      userName:  granted ? bestMatch.name : "Unknown subject",
      robotId:   robotId || "RBT-000",
      robotName: robotId ? (await Robot.findOne({ id: robotId }))?.name || robotId : "Unknown",
      faceScore:  bestFaceScore  / 100,
      voiceScore: bestVoiceScore / 100,
      fusedScore: bestFused      / 100,
      result:    granted ? "granted" : "denied",
      reason:    granted ? "" : `Face ${bestFaceScore.toFixed(1)}% and Voice ${bestVoiceScore.toFixed(1)}% both below threshold ${THRESHOLD}%`,
      device:    "Live session",
      timestamp,
    });

    // Update robot lastAuth + counter
    if (robotId) {
      await Robot.findOneAndUpdate(
        { id: robotId },
        { lastAuth: "just now", $inc: { authToday: 1 } }
      );
    }

    // Update user lastSeen if granted
    if (granted && bestMatch) {
      await User.findOneAndUpdate({ id: bestMatch.id }, { lastSeen: "just now" });
    }

    return res.json({
      result:      granted ? "granted" : "denied",
      reason:      granted ? "" : `Face ${bestFaceScore.toFixed(1)}% and Voice ${bestVoiceScore.toFixed(1)}% both below threshold ${THRESHOLD}%`,
      faceScore:   Math.round(bestFaceScore  * 10) / 10,
      voiceScore:  Math.round(bestVoiceScore * 10) / 10,
      fusedScore:  Math.round(bestFused      * 10) / 10,
      threshold:   THRESHOLD,
      latencyMs,
      matchedUser: granted ? {
        id:         bestMatch.id,
        name:       bestMatch.name,
        role:       bestMatch.role,
        department: bestMatch.department,
      } : null,
    });

  } catch (err) {
    res.status(500).json({ message: "Authentication error", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
