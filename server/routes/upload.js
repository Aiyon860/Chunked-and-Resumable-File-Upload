import { Router } from "express";
import multer from "multer";
import { MAX_CHUNK_BYTES } from "../config.js";
import { sanitizeUploadId, sanitizeFileName } from "../middleware/validate.js";
import {
  writeChunk,
  getUploadedChunks,
  mergeChunks,
  deleteUpload,
} from "../services/chunks.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_CHUNK_BYTES },
});

router.post("/chunk", upload.single("chunk"), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ status: "error", message: "No file uploaded." });
  }

  const uploadId = sanitizeUploadId(req.body.uploadId);
  const fileName = sanitizeFileName(req.body.fileName);

  if (!uploadId || req.body.chunkIndex === undefined || !fileName) {
    return res.status(400).json({ status: "error", message: "Missing or invalid required fields." });
  }

  const chunkIndex = parseInt(req.body.chunkIndex, 10);
  const totalChunks = parseInt(req.body.totalChunks, 10);

  if (
    !Number.isInteger(chunkIndex) ||
    !Number.isInteger(totalChunks) ||
    totalChunks <= 0 ||
    chunkIndex < 0 ||
    chunkIndex >= totalChunks
  ) {
    return res.status(400).json({ status: "error", message: "Invalid chunk index or total chunks." });
  }

  try {
    await writeChunk(uploadId, chunkIndex, req.file.buffer);
  } catch {
    return res.status(500).json({ status: "error", message: "Failed to upload chunk." });
  }

  let uploadedChunks;
  try {
    uploadedChunks = await getUploadedChunks(uploadId);
  } catch {
    return res.status(500).json({ status: "error", message: "Failed to read temp directory." });
  }

  if (uploadedChunks.length === totalChunks) {
    try {
      await mergeChunks(uploadId, fileName, totalChunks);
    } catch (error) {
      // If rename failed, another handler already merged — return completed
      if (error.code === "ENOENT") {
        return res.status(200).json({
          status: "completed",
          received: chunkIndex,
          fileName: `${uploadId}-${fileName}`,
        });
      }
      console.error("[merge error]", error.message);
      return res.status(500).json({ status: "error", message: "Failed to merge chunks." });
    }
  }

  return res.status(200).json({
    status: uploadedChunks.length === totalChunks ? "completed" : "uploading",
    received: chunkIndex,
    fileName: `${uploadId}-${fileName}`,
  });
});

router.get("/status/:uploadId", async (req, res, next) => {
  const uploadId = sanitizeUploadId(req.params.uploadId);
  if (!uploadId) {
    return res.status(400).json({ status: "error", message: "Invalid upload ID." });
  }

  try {
    const chunks = await getUploadedChunks(uploadId);
    return res.status(200).json({
      received: chunks.toSorted((a, b) => parseInt(a, 10) - parseInt(b, 10)),
    });
  } catch {
    return res.status(404).json({ status: "error", message: "Upload not found." });
  }
});

router.delete("/:uploadId", async (req, res, next) => {
  const uploadId = sanitizeUploadId(req.params.uploadId);
  if (!uploadId) {
    return res.status(400).json({ status: "error", message: "Invalid upload ID." });
  }

  try {
    await deleteUpload(uploadId);
    return res.status(200).json({ status: "success", message: "Upload deleted successfully." });
  } catch {
    return res.status(500).json({ status: "error", message: "Failed to delete upload." });
  }
});

export default router;
