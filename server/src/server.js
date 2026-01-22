import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

console.log("ENV CHECK:", {
  PORT: process.env.PORT,
  FRONTEND_URL: process.env.FRONTEND_URL,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? "SET" : "MISSING",
});

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

import authRoutes from "./routes/auth.routes.js";
import protectedRoutes from "./routes/protected.routes.js";
import documentRoutes from "./routes/documents.routes.js";
import searchRoutes from "./routes/search.routes.js";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/protected", protectedRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/search", searchRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});
import chatRoutes from "./routes/chat.route.js";

app.use("/api/chat", chatRoutes);

const PORT = process.env.PORT || 5000;

connectDB();

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
