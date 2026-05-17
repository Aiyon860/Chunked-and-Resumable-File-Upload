import fs from "node:fs";
import fsPromises from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { TEMP_DIR, FINAL_DIR } from "../config.js";

export async function writeChunk(uploadId, chunkIndex, buffer) {
  const dir = `${TEMP_DIR}/${uploadId}`;
  await fsPromises.mkdir(dir, { recursive: true });
  await fsPromises.writeFile(`${dir}/${chunkIndex}.part`, buffer);
}

export async function getUploadedChunks(uploadId) {
  return fsPromises.readdir(`${TEMP_DIR}/${uploadId}`);
}

export async function mergeChunks(uploadId, fileName, totalChunks) {
  const tempDir = `${TEMP_DIR}/${uploadId}`;
  const mergingDir = `${TEMP_DIR}/${uploadId}.merging`;

  // Atomic rename — if this fails, another handler already claimed the merge
  await fsPromises.rename(tempDir, mergingDir);

  const outputPath = `${FINAL_DIR}/${uploadId}-${fileName}`;
  for (let i = 0; i < totalChunks; i++) {
    await pipeline(
      fs.createReadStream(`${mergingDir}/${i}.part`),
      fs.createWriteStream(outputPath, { flags: i === 0 ? "w" : "a" }),
    );
  }
  await fsPromises.rm(mergingDir, { recursive: true });
}

export async function deleteUpload(uploadId) {
  await fsPromises.rm(`${TEMP_DIR}/${uploadId}`, { recursive: true });
}
