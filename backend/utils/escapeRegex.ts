// Escapes every character that has a special meaning in a regular expression,
// so user input is matched literally. Without this, a search for ".*" would
// match everything and a crafted pattern could make the query very slow
// (ReDoS).
export function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
