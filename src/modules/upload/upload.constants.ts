export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",

  "application/pdf",

  "audio/mpeg",
  "audio/wav",

  "video/mp4",
] as const;
export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
