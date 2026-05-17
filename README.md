# Chunked & Resumable File Upload

A production-grade demonstration of handling large file uploads with resilience and efficiency. Built with Vanilla JavaScript, Node.js, Express, and Multer.

## Why This Matters

Uploading large files is deceptively complex. Network interruptions, server timeouts, and bandwidth limitations can turn a simple file upload into a frustrating user experience. This project tackles these challenges head-on.

## Key Features

- **Chunked Uploads** — Files are split into 1MB chunks and uploaded sequentially, preventing server timeout issues
- **Resumability** — Upload progress persists in localStorage. If interrupted, users can resume exactly where they left off
- **Retry Logic** — Automatic retry with exponential backoff (up to 3 attempts) for failed chunks
- **Progress Tracking** — Real-time display of chunks uploaded, transfer speed, and ETA
- **Client-Side Validation** — File type and size validation before upload begins

## Technical Highlights

- Pure Vanilla JS on the client — no frameworks, just clean DOM APIs
- Express + Multer on the server for robust multipart handling
- AbortController for cancellable fetch requests
- LocalStorage for upload state persistence across sessions
- CSS-only animations with prefers-reduced-motion support

## Getting Started

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start the server
node index.js
```

Then open `http://localhost:3000` in your browser.

## Architecture

```
Client (Vanilla JS)          Server (Express)
       │                            │
       ├── POST /upload/chunk  ────►│ (stores chunk to temp)
       │◄───────────────────────────┤
       │                            │
       │    (repeat for each chunk) │
       │                            │
       ├── GET /upload/status/:id ──► (returns received chunks)
       │◄───────────────────────────┤
       │                            │
       └── Upload complete          Final assembly → /uploads/final
```

## What I Learned

Building this project deepened my understanding of:

- **HTTP Range semantics** — How to handle partial content requests
- **Stateful client-server communication** — Maintaining upload context across requests
- **UX considerations** — Progress feedback, cancellation, and error recovery
- **Browser APIs** — AbortController, FormData, Blob slicing

## Future Improvements

- Server-side chunk validation with checksums
- Concurrent chunk uploads for faster throughput
- Cloud storage integration (S3, GCS)
- Drag-and-drop multi-file support

---

Built with Node.js • Express • Vanilla JavaScript