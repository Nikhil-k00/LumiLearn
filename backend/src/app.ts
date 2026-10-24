import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import authRoutes     from "./routes/authRoutes";
import studentRoutes  from "./routes/studentRoutes";
import gameRoutes     from "./routes/gameRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";

dotenv.config();

const app: Application = express();
app.set("trust proxy", 1);

// ─── Security & CORS ───────────────────────────────────────────────────────

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ─── Rate Limiting ─────────────────────────────────────────────────────────

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 500 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  // S7 — only skip rate limiting for actual localhost; staging envs stay protected
  skip: (req) => process.env.NODE_ENV !== "production" && (req.ip === "127.0.0.1" || req.ip === "::1"),
  message: { success: false, message: "Too many requests, please try again later." },
});

app.use("/api", limiter);

// ─── Body Parsing ──────────────────────────────────────────────────────────

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ─── Health Check ──────────────────────────────────────────────────────────

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "DysLex AI backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use("/api/auth",       authRoutes);
app.use("/api/students",   studentRoutes);
app.use("/api/games",      gameRoutes);
app.use("/api/analytics",  analyticsRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ─── Global Error Handler ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[ERROR]", err.message, err.stack);
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

export default app;
