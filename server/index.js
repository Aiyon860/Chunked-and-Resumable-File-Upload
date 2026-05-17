import fsPromises from "node:fs/promises";
import express from "express";
import cors from "cors";
import { PORT, TEMP_DIR, FINAL_DIR, STALE_TEMP_HOURS } from "./config.js";
import uploadRouter from "./routes/upload.js";

const app = express();

// Ensure upload directories exist on startup
await fsPromises.mkdir(TEMP_DIR, { recursive: true });
await fsPromises.mkdir(FINAL_DIR, { recursive: true });

// Cleanup stale temp uploads (older than STALE_TEMP_HOURS)
async function cleanupStale() {
  try {
    const entries = await fsPromises.readdir(TEMP_DIR, { withFileTypes: true });
    const now = Date.now();
    const maxAge = STALE_TEMP_HOURS * 60 * 60 * 1000;

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const dirPath = `${TEMP_DIR}/${entry.name}`;
      const stat = await fsPromises.stat(dirPath);
      if (now - stat.mtimeMs > maxAge) {
        await fsPromises.rm(dirPath, { recursive: true });
        console.log(`[cleanup] removed stale: ${entry.name}`);
      }
    }
  } catch {
    // Non-critical — log and continue
  }
}

await cleanupStale();
setInterval(cleanupStale, 60 * 60 * 1000); // Run every hour

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.use("/upload", uploadRouter);

// Global error handler
app.use((err, req, res, next) => {
  console.error("[unhandled]", err.message);
  res.status(500).json({ status: "error", message: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
