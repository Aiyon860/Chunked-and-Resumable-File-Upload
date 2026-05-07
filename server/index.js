import fs from "node:fs";
import fsPromises from "node:fs/promises";
import express from "express";
import cors from "cors";
import multer from "multer";
import { pipeline } from "node:stream/promises";

const app = express();
const storage = multer.memoryStorage();
const upload = multer({ storage });
const port = 3000;

app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.post("/upload/chunk", upload.single("chunk"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      status: "error",
      sent: 0,
      message: "No file uploaded.",
    });
  }

  if (!req.body.uploadId || !req.body.chunkIndex) {
    return res.status(400).json({
      status: "error",
      sent: 0,
      message: "Missing required fields.",
    });
  }

  const chunkIndex = parseInt(req.body.chunkIndex);
  const totalChunks = parseInt(req.body.totalChunks);

  try {
    await fsPromises.mkdir(`uploads/temp/${req.body.uploadId}`, {
      recursive: true,
    });
    await fsPromises.writeFile(
      `uploads/temp/${req.body.uploadId}/${chunkIndex}.part`,
      req.file.buffer,
    );
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to upload chunk.",
    });
  }

  const tempDir = `uploads/temp/${req.body.uploadId}`;
  const uploadedChunks = await fsPromises.readdir(tempDir);
  if (uploadedChunks.length === totalChunks) {
    try {
      const outputPath = `uploads/final/${req.body.uploadId}-${req.body.fileName}`;

      for (let i = 0; i < uploadedChunks.length; i++) {
        const chunkPath = `uploads/temp/${req.body.uploadId}/${i}.part`;
        await pipeline(
          fs.createReadStream(chunkPath),
          fs.createWriteStream(outputPath, { flags: i === 0 ? "w" : "a" }),
        );
      }
      await fsPromises.rm(`uploads/temp/${req.body.uploadId}`, {
        recursive: true,
      });
    } catch (error) {
      console.log(error.message);
      return res.status(500).json({
        status: "error",
        message: "Failed to merge chunks.",
      });
    }
  }

  return res.status(200).json({
    status: uploadedChunks.length === totalChunks ? "completed" : "uploading",
    received: chunkIndex,
    fileName: `${req.body.uploadId}-${req.body.fileName}`,
  });
});

app.get("/upload/status/:uploadId", async (req, res) => {
  const { uploadId } = req.params;
  const tempDir = `uploads/temp/${uploadId}`;
  const uploadedChunks = await fsPromises.readdir(tempDir);
  return res.status(200).json({
    received: uploadedChunks.toSorted((a, b) => parseInt(a) - parseInt(b)),
  });
});

app.delete("/upload/:uploadId", async (req, res) => {
  const { uploadId } = req.params;

  try {
    await fsPromises.rm(`uploads/temp/${uploadId}`, {
      recursive: true,
    });
    return res.status(200).json({
      status: "success",
      message: "Upload deleted successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Failed to delete upload.",
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
