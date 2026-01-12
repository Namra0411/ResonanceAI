import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load ENV (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// IMPORTANT: load env BEFORE any other imports
dotenv.config({ path: path.join(__dirname, "../.env") });

// One-time debug (remove later)
console.log("ENV CHECK:", {
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  SUPABASE_URL: process.env.SUPABASE_URL,
});

// App Imports
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import protectedRoutes from "./routes/protected.routes.js";
import documentRoutes from "./routes/documents.routes.js";

// App Setup
const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/documents", documentRoutes);

// Health Check (optional but good)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start Server
const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
