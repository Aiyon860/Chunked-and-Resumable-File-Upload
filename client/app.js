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

let lastChunkIndex = null;

const getFileMetadata = async (e) => {
  const file = e.target.files[0];
  statusText.textContent = "";
  chunkProgress.innerHTML = "";

  // Reset phases on new file selection
  phaseTransfer.classList.add("phase-hidden");
  phaseComplete.classList.add("phase-hidden");
  resultArea.style.display = "none";
  resultArea.textContent = "";
  errorArea.style.display = "none";
  errorArea.textContent = "";
  completeNote.style.display = "";
  progressBar.value = 0;
  speedUpload.textContent = "";
  remainingTimeLabel.textContent = "";

  if (!file) {
    statusText.textContent = "No file selected";
    return;
  }

  const allowedMimeTypes = [
    "image/png",
    "image/jpeg", // Standar untuk .jpg dan .jpeg
    "application/pdf", // PDF
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
    "application/msword", // DOC
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
    "application/vnd.ms-excel", // XLS
    "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PPTX
    "application/vnd.ms-powerpoint", // PPT
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    statusText.textContent = "Unsupported file type";
    return;
  }

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 50 MB
  if (file.size > MAX_FILE_SIZE) {
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
      let response = await fetch(
        `http://localhost:3000/upload/status/${savedUploadId}`,
      );
      const data = await response.json();
      const currentChunks = data.received.length;
      lastChunkIndex = currentChunks - 1;
      statusText.textContent = `Previous upload detected (${currentChunks} chunks received). Click Upload to resume.`;
    } catch {
      // Server might be down or temp folder cleaned up
      localStorage.removeItem(`uploadId_${file.name}`);
      lastChunkIndex = null;
    }
  }
};

fileInput.addEventListener("click", () => {
  fileInput.value = "";
});
fileInput.addEventListener("change", getFileMetadata);
fileInput.addEventListener("drop", getFileMetadata);

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  uploadBtn.disabled = true;
  fileInput.disabled = true;
  resultArea.style.display = "none";

  // Fresh AbortController for each upload
  controller = new AbortController();
  signal = controller.signal;

  const cancelButton = document.createElement("button");
  cancelButton.id = "cancelUploadBtn";
  cancelButton.textContent = "Cancel Upload";

  const CHUNK_SIZE = 1 * 1024 * 1024; // 1 MB
  const file = fileInput.files[0];
  const fileName = file.name;
  const fileSize = file.size;
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const existingUploadId = localStorage.getItem(
    `uploadId_${fileInput.files[0].name}`,
  );
  let uploadId;

  const startTime = Date.now();
  let uploadedBytes = 0;

  if (existingUploadId) {
    statusText.textContent = "Resuming upload...";
    uploadId = existingUploadId;
    progressBar.value = (lastChunkIndex / totalChunks) * 100;
  } else {
    uploadId = crypto.randomUUID();
    localStorage.setItem(`uploadId_${fileName}`, uploadId);
    progressBar.value = 0;
    statusText.textContent = "Uploading...";
  }

  // Show transfer phase
  phaseTransfer.classList.remove("phase-hidden");

  cancelButton.addEventListener("click", async () => {
    const response = await fetch(`http://localhost:3000/upload/${uploadId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      return;
    }

    controller.abort();

    cancelButton.remove();
    fileInput.disabled = false;
  });
  uploadForm.after(cancelButton);

  for (
    let chunkIndex = lastChunkIndex ?? 0;
    chunkIndex < totalChunks;
    chunkIndex++
  ) {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTime) / 1000;

    if (elapsedTime > 0) {
      const speed = uploadedBytes / elapsedTime;
      const remainingTime = ((totalChunks - chunkIndex) * CHUNK_SIZE) / speed;

      speedUpload.textContent = `${(speed / 1024).toFixed(2)} KB/s`;
      remainingTimeLabel.textContent = `${remainingTime.toFixed(2)} s`;
    }

    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);

    const chunkBody = new FormData();
    chunkBody.append("chunk", chunk);
    chunkBody.append("uploadId", uploadId);
    chunkBody.append("chunkIndex", chunkIndex);
    chunkBody.append("totalChunks", totalChunks);
    chunkBody.append("fileName", fileName);

    const maxRetries = 3;
    for (let retry = 0; retry < maxRetries; retry++) {
      try {
        const response = await fetch("http://localhost:3000/upload/chunk", {
          signal: signal,
          method: "POST",
          body: chunkBody,
        });
        if (!response.ok) continue;

        const data = await response.json();
        const uploadedFileName = data.fileName;

        uploadedBytes += CHUNK_SIZE;
        chunkProgress.textContent = `Sending chunk ${chunkIndex + 1} of ${totalChunks}`;
        progressBar.value = ((chunkIndex + 1) / totalChunks) * 100;

        statusText.textContent =
          data.status === "completed"
            ? ""
            : "Uploading...";

        if (data.status === "completed") {
          localStorage.removeItem(`uploadId_${fileName}`);
          // Show phase 03 with success
          phaseComplete.classList.remove("phase-hidden");
          completeNote.style.display = "none";
          resultArea.style.display = "";
          resultArea.textContent = `File uploaded successfully: ${uploadedFileName}`;
        }
        break;
      } catch (error) {
        if (error.name === "AbortError") {
          statusText.textContent = "";
          // Show phase 03 with cancel message
          phaseComplete.classList.remove("phase-hidden");
          completeNote.style.display = "none";
          errorArea.style.display = "";
          errorArea.textContent = "Upload cancelled.";
          fileInput.disabled = false;
          cancelButton.remove();
          return;
        }

        if (retry === maxRetries - 1) {
          statusText.textContent = "";
          // Show phase 03 with error
          phaseComplete.classList.remove("phase-hidden");
          completeNote.style.display = "none";
          errorArea.style.display = "";
          errorArea.textContent = "Upload failed. Please try again.";
          fileInput.disabled = false;
          cancelButton.remove();
          return;
        }

        statusText.textContent = `Retrying... (${retry + 1}/${maxRetries})`;
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  cancelButton.remove();
  uploadBtn.disabled = false;
  fileInput.disabled = false;
});
