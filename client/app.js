const CONFIG = {
  API_BASE: "http://localhost:3000",
  CHUNK_SIZE: 1 * 1024 * 1024, // 1 MB
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1500,
  ALLOWED_MIME_TYPES: [
    "image/png",
    "image/jpeg",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],
};

// --- Formatting helpers ---

function formatSpeed(bytesPerSec) {
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/s`;
}

function formatETA(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// --- DOM refs ---

let controller;
let signal;

const uploadForm = document.getElementById("uploadForm");
const uploadBtn = document.getElementById("uploadBtn");
const progressBar = document.getElementById("progressBar");
const statusText = document.getElementById("statusText");
const fileInput = document.getElementById("fileInput");
const fileNameLabel = document.getElementById("fileName");
const fileSizeLabel = document.getElementById("fileSize");
const fileTypeLabel = document.getElementById("fileType");
const chunkProgress = document.getElementById("chunkProgress");
const speedUpload = document.getElementById("speedUpload");
const remainingTimeLabel = document.getElementById("remainingTime");
const phaseTransfer = document.getElementById("phaseTransfer");
const phaseComplete = document.getElementById("phaseComplete");
const resultArea = document.getElementById("resultArea");
const errorArea = document.getElementById("errorArea");
const completeNote = document.getElementById("completeNote");
const cancelButton = document.getElementById("cancelUploadBtn");

let lastChunkIndex = null;

// --- UI helpers ---

function showElement(el) { el.classList.remove("phase-hidden"); el.removeAttribute("hidden"); }
function hideElement(el) { el.classList.add("phase-hidden"); el.setAttribute("hidden", ""); }

function resetUI() {
  hideElement(phaseTransfer);
  hideElement(phaseComplete);
  hideElement(resultArea);
  hideElement(errorArea);
  showElement(completeNote);
  hideElement(cancelButton);
  resultArea.textContent = "";
  errorArea.textContent = "";
  progressBar.value = 0;
  speedUpload.textContent = "";
  remainingTimeLabel.textContent = "";
  chunkProgress.textContent = "";
}

// --- File selection ---

const getFileMetadata = async (e) => {
  const file = e.target.files[0];
  statusText.textContent = "";
  lastChunkIndex = null;
  resetUI();

  if (!file) {
    statusText.textContent = "No file selected";
    return;
  }

  if (!CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
    statusText.textContent = "Unsupported file type";
    return;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    statusText.textContent = "File too large";
    return;
  }

  const lastDotIndex = file.name.lastIndexOf(".");
  if (lastDotIndex <= 0) {
    statusText.textContent = "No file extension";
    return;
  }

  fileNameLabel.textContent = file.name;
  fileSizeLabel.textContent = (file.size / (1024 * 1024)).toFixed(2) + " MB";
  fileTypeLabel.textContent = file.type;
  uploadBtn.disabled = false;

  const savedUploadId = localStorage.getItem(`uploadId_${file.name}`);
  if (savedUploadId) {
    try {
      const response = await fetch(
        `${CONFIG.API_BASE}/upload/status/${savedUploadId}`,
      );
      if (!response.ok) throw new Error("Status check failed");
      const data = await response.json();
      const currentChunks = data.received.length;
      lastChunkIndex = currentChunks;
      statusText.textContent = `Previous upload detected (${currentChunks} chunks received). Click Upload to resume.`;
    } catch {
      localStorage.removeItem(`uploadId_${file.name}`);
      lastChunkIndex = null;
    }
  }
};

fileInput.addEventListener("click", () => { fileInput.value = ""; });
fileInput.addEventListener("change", getFileMetadata);
fileInput.addEventListener("drop", getFileMetadata);

// --- Cancel handler ---

cancelButton.addEventListener("click", async () => {
  if (!controller) return;
  controller.abort();

  const uploadId = cancelButton.dataset.uploadId;
  const fileName = cancelButton.dataset.fileName;

  try {
    await fetch(`${CONFIG.API_BASE}/upload/${uploadId}`, { method: "DELETE" });
  } catch { /* best-effort */ }

  if (fileName) localStorage.removeItem(`uploadId_${fileName}`);
  hideElement(cancelButton);
  fileInput.disabled = false;
});

// --- Upload handler ---

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  uploadBtn.disabled = true;
  fileInput.disabled = true;
  hideElement(resultArea);
  hideElement(errorArea);

  controller = new AbortController();
  signal = controller.signal;

  const CHUNK_SIZE = CONFIG.CHUNK_SIZE;
  const file = fileInput.files[0];
  const fileName = file.name;
  const fileSize = file.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const existingUploadId = localStorage.getItem(`uploadId_${fileName}`);
  let uploadId;

  const startChunk = lastChunkIndex ?? 0;
  const startTime = Date.now();
  let uploadedBytes = 0;

  if (existingUploadId) {
    uploadId = existingUploadId;
    progressBar.value = (startChunk / totalChunks) * 100;
    statusText.textContent = "Resuming upload...";
  } else {
    uploadId = crypto.randomUUID();
    localStorage.setItem(`uploadId_${fileName}`, uploadId);
    progressBar.value = 0;
    statusText.textContent = "Preparing upload...";
  }

  // Show transfer phase and cancel button
  showElement(phaseTransfer);
  cancelButton.dataset.uploadId = uploadId;
  cancelButton.dataset.fileName = fileName;
  showElement(cancelButton);

  for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
    if (signal.aborted) return;

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);
    const chunkSize = end - start;

    // Update speed/ETA
    const elapsedTime = (Date.now() - startTime) / 1000;
    if (elapsedTime > 0 && uploadedBytes > 0) {
      const speed = uploadedBytes / elapsedTime;
      const remainingBytes = fileSize - (start + chunkSize);
      const eta = remainingBytes / speed;
      speedUpload.textContent = formatSpeed(speed);
      remainingTimeLabel.textContent = formatETA(eta);
    }

    statusText.textContent = "Uploading...";

    const chunkBody = new FormData();
    chunkBody.append("chunk", chunk);
    chunkBody.append("uploadId", uploadId);
    chunkBody.append("chunkIndex", chunkIndex);
    chunkBody.append("totalChunks", totalChunks);
    chunkBody.append("fileName", fileName);

    const maxRetries = CONFIG.MAX_RETRIES;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await fetch(`${CONFIG.API_BASE}/upload/chunk`, {
          signal,
          method: "POST",
          body: chunkBody,
        });

        if (!response.ok) {
          await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY_MS));
          continue;
        }

        let data;
        try {
          data = await response.json();
        } catch {
          await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY_MS));
          continue;
        }

        uploadedBytes += chunkSize;
        chunkProgress.textContent = `${chunkIndex + 1} / ${totalChunks}`;
        progressBar.value = ((chunkIndex + 1) / totalChunks) * 100;

        if (data.status === "completed") {
          statusText.textContent = "";
          localStorage.removeItem(`uploadId_${fileName}`);
          hideElement(cancelButton);
          showElement(phaseComplete);
          hideElement(completeNote);
          showElement(resultArea);
          resultArea.textContent = `File uploaded successfully: ${data.fileName}`;
        }
        break;
      } catch (error) {
        if (error.name === "AbortError") {
          statusText.textContent = "";
          showElement(phaseComplete);
          hideElement(completeNote);
          showElement(errorArea);
          errorArea.textContent = "Upload cancelled.";
          fileInput.disabled = false;
          hideElement(cancelButton);
          return;
        }

        if (retry === maxRetries - 1) {
          statusText.textContent = "";
          showElement(phaseComplete);
          hideElement(completeNote);
          showElement(errorArea);
          errorArea.textContent = "Upload failed. Please try again.";
          fileInput.disabled = false;
          hideElement(cancelButton);
          return;
        }

        statusText.textContent = `Retrying... (${retry + 1}/${maxRetries})`;
        await new Promise((r) => setTimeout(r, CONFIG.RETRY_DELAY_MS));
      }
    }
  }

  hideElement(cancelButton);
  fileInput.disabled = false;
});
