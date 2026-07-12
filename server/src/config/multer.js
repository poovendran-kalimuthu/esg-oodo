const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10');

// Ensure upload subdirectories exist
const dirs = ['banners', 'proofs', 'certificates', 'avatars'];
dirs.forEach((dir) => {
  const fullPath = path.join(process.cwd(), UPLOAD_DIR, dir);
  if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    // Determine sub-folder from route hint
    const folder = req.uploadFolder || 'misc';
    const dest = path.join(process.cwd(), UPLOAD_DIR, folder);
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (allowedTypes) => (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

// ── Image uploader (banners / avatars) ────────────────────────────────────────
const imageUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: fileFilter(['image/jpeg', 'image/png', 'image/webp']),
});

// ── Document uploader (proofs / certificates) ─────────────────────────────────
const documentUpload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
  fileFilter: fileFilter([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
  ]),
});

module.exports = { imageUpload, documentUpload };
