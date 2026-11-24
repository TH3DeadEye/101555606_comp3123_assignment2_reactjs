// A MongoDB ObjectId written as 24 hexadecimal characters. mongoose's own
// isValidObjectId() also accepts any 12-character string, which is too loose
// for ids that come from a URL or a token.
const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export function isObjectId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_PATTERN.test(value);
}
