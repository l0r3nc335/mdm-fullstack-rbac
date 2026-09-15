import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { AppError } from '../utils/errors.js';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads', 'avatars');
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

const MAGIC: Array<{ mime: string; bytes: number[] }> = [
  { mime: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
];

function detectMime(buffer: Buffer): string | null {
  for (const candidate of MAGIC) {
    if (candidate.bytes.every((byte, index) => buffer[index] === byte)) {
      if (candidate.mime === 'image/webp') {
        // RIFF....WEBP
        if (buffer.length < 12 || buffer.toString('ascii', 8, 12) !== 'WEBP') {
          continue;
        }
      }
      return candidate.mime;
    }
  }
  return null;
}

export function avatarAbsolutePath(avatarKey: string): string {
  // Prevent path traversal — keys are UUID.webp only
  if (!/^[a-f0-9-]{36}\.webp$/i.test(avatarKey)) {
    throw new AppError('Invalid avatar key', 400, 'INVALID_AVATAR');
  }
  return path.join(UPLOAD_ROOT, avatarKey);
}

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_ROOT, { recursive: true });
}

export async function processAndStoreAvatar(file: Express.Multer.File): Promise<string> {
  if (!file?.buffer?.length) {
    throw new AppError('Avatar file is required', 400, 'AVATAR_REQUIRED');
  }

  if (file.size > MAX_BYTES) {
    throw new AppError('Avatar must be 2MB or smaller', 400, 'AVATAR_TOO_LARGE');
  }

  const declared = file.mimetype;
  if (!ALLOWED_MIME.has(declared)) {
    throw new AppError('Only JPEG, PNG, and WebP images are allowed', 400, 'AVATAR_TYPE');
  }

  const detected = detectMime(file.buffer);
  if (!detected || !ALLOWED_MIME.has(detected)) {
    throw new AppError('File content is not a valid image', 400, 'AVATAR_INVALID');
  }

  await ensureUploadDir();

  const avatarKey = `${randomUUID()}.webp`;
  const target = avatarAbsolutePath(avatarKey);

  // Re-encode to strip metadata / scripts and normalize size
  try {
    await sharp(file.buffer, { failOn: 'error' })
      .rotate()
      .resize(512, 512, { fit: 'cover', withoutEnlargement: false })
      .webp({ quality: 82 })
      .toFile(target);
  } catch {
    throw new AppError('Unable to process image', 400, 'AVATAR_PROCESS');
  }

  return avatarKey;
}

export async function deleteAvatarFile(avatarKey: string | null | undefined) {
  if (!avatarKey) return;
  try {
    await fs.unlink(avatarAbsolutePath(avatarKey));
  } catch {
    // ignore missing file
  }
}
