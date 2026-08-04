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
app.use(express.json({ limit: "50mb" })); // Increase limit for base64 image/audio files
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("Connected to MongoDB successfully!");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// User Schema
const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  department: { type: String, required: true },
  enrolledAt: { type: String, required: true },
  faceSamples: { type: Number, default: 0 },
  voiceSamples: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  lastSeen: { type: String, default: "—" },
  faceImages: { type: [String], default: [] },
  voiceAudios: { type: [String], default: [] },
});

const User = mongoose.model("User", userSchema);

// Routes
// 1. Get all users
app.get("/api/users", async (req, res) => {
  try {
    const users = await User.find({}).sort({ enrolledAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users", error: err.message });
  }
});

// 2. Enroll a new user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, role, department, faceSamples, voiceSamples, faceImages, voiceAudios } = req.body;

    if (!name || !email || !role || !department) {
      return res.status(400).json({ message: "Please fill in all profile fields." });
    }

    // Generate a unique ID (e.g. USR-008)
    const count = await User.countDocuments();
    const nextNum = String(count + 1).padStart(3, "0");
    const id = `USR-${nextNum}`;

    const enrolledAt = new Date().toISOString().split("T")[0];

    const newUser = new User({
      id,
      name,
      email,
      role,
      department,
      enrolledAt,
      faceSamples: faceSamples || 0,
      voiceSamples: voiceSamples || 0,
      status: "active",
      lastSeen: "just now",
      faceImages: faceImages || [],
      voiceAudios: voiceAudios || [],
    });

    await newUser.save();
    console.log("Enrolled new user successfully:", newUser.id);
    res.status(201).json(newUser);
  } catch (err) {
    res.status(500).json({ message: "Error enrolling user", error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
