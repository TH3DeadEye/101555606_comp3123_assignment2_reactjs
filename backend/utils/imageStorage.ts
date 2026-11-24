import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { HttpError } from './HttpError';
import { detectImageType, type ImageType } from './imageSignature';

// The URL path the pictures are served from (see app.ts).
export const UPLOADS_URL_PATH = '/uploads';

// The extension comes from what the file really is, never from its name.
const EXTENSIONS: Record<ImageType, string> = { jpeg: 'jpg', png: 'png', webp: 'webp' };

// The only file names this module ever creates, and therefore the only ones it
// will ever delete: <random uuid>.<jpg|png|webp>
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

// Writes the uploaded picture to UPLOAD_DIR and returns the public path to
// store in MongoDB (for example /uploads/3f2b....png).
export async function saveImage(file: Express.Multer.File): Promise<string> {
  const type = detectImageType(file.buffer);
  if (!type) {
    throw new HttpError(400, 'Only JPEG, PNG and WebP images are allowed.', { code: 'INVALID_FILE_TYPE' });
  }

  // A random name: the original file name (which could be "../../x.php") is
  // never used, so there is nothing to traverse and nothing to overwrite.
  const filename = `${randomUUID()}.${EXTENSIONS[type]}`;

  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });
  // flag "wx" fails instead of overwriting; mode 0o644 means the file is not executable
  await fs.writeFile(path.join(env.UPLOAD_DIR, filename), file.buffer, { flag: 'wx', mode: 0o644 });

  return `${UPLOADS_URL_PATH}/${filename}`;
}

// Removes a stored picture. It never throws: a leftover file is harmless and
// must not make an otherwise successful request fail.
export async function deleteImage(publicPath: string | null | undefined): Promise<void> {
  if (!publicPath) return;

  // basename() drops any directory part, and the pattern only lets through
  // names this module generated, so a tampered database value cannot point
  // the delete at another file.
  const filename = path.basename(publicPath);
  if (!STORED_NAME.test(filename)) {
    logger.warn('Refused to delete a file with an unexpected name', { event: 'image_delete_refused' });
    return;
  }

  try {
    await fs.unlink(path.join(env.UPLOAD_DIR, filename));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      logger.warn('Could not delete a stored picture', {
        event: 'image_delete_failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
