import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import connectDB from "./config/db";

const PORT = parseInt(process.env.PORT || "5000", 10);

async function bootstrap(): Promise<void> {
  await connectDB();

  const server = app.listen(PORT, () => {
    console.log(`[SERVER] DysLex AI backend running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[SERVER] ${signal} received — shutting down gracefully`);
    server.close(async () => {
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      console.log("[DB] MongoDB connection closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
}

bootstrap();
