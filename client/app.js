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

let lastChunkIndex = null;

const getFileMetadata = async (e) => {
  const file = e.target.files[0];
  statusText.textContent = "";
  chunkProgress.innerHTML = "";

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

  const savedUploadId = localStorage.getItem(`uploadId_${file.name}`);
  if (savedUploadId) {
    let response = await fetch(
      `http://localhost:3000/upload/status/${savedUploadId}`,
    );
    const data = await response.json();
    const currentChunks = data.received.length;
    lastChunkIndex = currentChunks - 1;
    statusText.textContent = `Please insert the file again to resume the upload...`;
  }
};

fileInput.addEventListener("change", getFileMetadata);
fileInput.addEventListener("drop", getFileMetadata);

uploadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  uploadBtn.disabled = true;

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

  for (
    let chunkIndex = lastChunkIndex ?? 0;
    chunkIndex < totalChunks;
    chunkIndex++
  ) {
    uploadedBytes += CHUNK_SIZE;

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
          method: "POST",
          body: chunkBody,
        });
        if (!response.ok) {
          statusText.textContent = "Upload failed";
          uploadBtn.disabled = false;
          return;
        }
        const data = await response.json();
        const uploadedFileName = data.fileName;

        chunkProgress.textContent = `Sending chunk ${chunkIndex + 1} of ${totalChunks}`;
        progressBar.value = ((chunkIndex + 1) / totalChunks) * 100;

        statusText.textContent =
          data.status === "completed"
            ? `Upload complete! - File uploaded successfully: ${uploadedFileName}`
            : "Uploading...";

        if (data.status === "completed") {
          localStorage.removeItem(`uploadId_${fileName}`);
        }
        break;
      } catch (error) {
        if (retry === maxRetries - 1) {
          statusText.textContent = "Upload failed";
          uploadBtn.disabled = false;
          return;
        }
      }
    }
  }

  uploadBtn.disabled = false;
});
