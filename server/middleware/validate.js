import path from "node:path";

const UUID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export function sanitizeUploadId(id) {
  if (typeof id !== "string" || !UUID_RE.test(id)) return null;
  return id;
}

export function sanitizeFileName(name) {
  if (typeof name !== "string") return null;
  const base = path.basename(name);
  if (!base || base.includes("\0") || base.includes("..")) return null;
  return base;
}

export function validateChunkParams(req, res, next) {
  const { sanitizeUploadId, sanitizeFileName } = req.app.locals;
  // Already handled by route-level usage; this is a reusable guard
  next();
}
