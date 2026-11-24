import type { RequestHandler } from 'express';
import multer, { MulterError } from 'multer';
import { HttpError } from '../utils/HttpError';
import { detectImageType } from '../utils/imageSignature';

// The name of the form field that carries the picture.
export const PICTURE_FIELD = 'profile_picture';
export const MAX_PICTURE_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const invalidType = () =>
  new HttpError(400, 'Only JPEG, PNG and WebP images are allowed.', { code: 'INVALID_FILE_TYPE' });

const upload = multer({
  // The file is kept in memory and only written to disk after everything else
  // in the request has been validated, so rejected uploads never touch the disk.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_PICTURE_BYTES,
    files: 1,
    fields: 20,
    fieldSize: 10 * 1024,
    parts: 21,
  },
  // First, cheap check on the type the client claims the file has.
  fileFilter: (_req, file, callback) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(null, true);
    } else {
      callback(invalidType());
    }
  },
});

// Converts multer's errors into the API's standard error responses.
function toUploadError(error: unknown): unknown {
  if (error instanceof HttpError) return error;

  if (error instanceof MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return new HttpError(
          413,
          `The picture is too large. The maximum size is ${MAX_PICTURE_BYTES / 1024 / 1024} MB.`,
          { code: 'FILE_TOO_LARGE' },
        );
      case 'LIMIT_FILE_COUNT':
        return new HttpError(400, 'Only one picture can be uploaded at a time.', { code: 'TOO_MANY_FILES' });
      case 'LIMIT_UNEXPECTED_FILE':
        return new HttpError(400, `Unexpected file. Send one image in the "${PICTURE_FIELD}" field.`, {
          code: 'UNEXPECTED_FILE',
        });
      default:
        return new HttpError(400, 'The uploaded form data is not valid.', { code: 'BAD_UPLOAD' });
    }
  }

  // A malformed multipart body surfaces as a plain error from the parser.
  return new HttpError(400, 'The uploaded form data could not be read.', { code: 'BAD_UPLOAD' });
}

// Reads multipart/form-data: text fields end up in req.body and the optional
// picture in req.file. Plain JSON requests pass through untouched.
const parseForm: RequestHandler = (req, res, next) => {
  upload.single(PICTURE_FIELD)(req, res, (error: unknown) => {
    next(error ? toUploadError(error) : undefined);
  });
};

// The check above only looks at what the client *claims* the file is. This one
// looks at the bytes, so a text or script file renamed to .png is refused.
const verifyImage: RequestHandler = (req, _res, next) => {
  if (req.file && detectImageType(req.file.buffer) === null) {
    next(invalidType());
    return;
  }
  next();
};

export const profilePictureUpload: RequestHandler[] = [parseForm, verifyImage];
