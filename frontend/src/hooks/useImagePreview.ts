import { useEffect, useState } from 'react';

// Turns a chosen file into an address an <img> can show, before anything is
// uploaded. It returns null while the file is being read (or when there is none).
//
// A data URL from FileReader is used instead of URL.createObjectURL: object
// URLs have to be released again, and React's StrictMode runs effects twice in
// development, which would release the URL while it is still on screen.
export function useImagePreview(file: File | null): string | null {
  // Remember which file the result belongs to, so a slow read of an old file
  // can never be shown for a new one.
  const [loaded, setLoaded] = useState<{ file: File; url: string } | null>(null);

  useEffect(() => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setLoaded({ file, url: reader.result });
    };
    reader.readAsDataURL(file);

    return () => {
      reader.onload = null; // ignore the result if the file changed meanwhile
    };
  }, [file]);

  return file && loaded?.file === file ? loaded.url : null;
}
