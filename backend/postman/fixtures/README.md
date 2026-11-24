# Postman test files

Files uploaded by the Postman collection (`../COMP3123_Assignment2.postman_collection.json`).

| File | Used for | Expected result |
| --- | --- | --- |
| `profile.png` | first upload | accepted |
| `replacement.png` | replacing a picture | accepted |
| `profile.jpg` | JPEG upload | accepted |
| `profile.webp` | WebP upload | accepted |
| `invalid.txt` | text file | rejected, 400 `INVALID_FILE_TYPE` |
| `script.svg` | SVG containing a script | rejected, 400 `INVALID_FILE_TYPE` |
| `oversized.png` | 2.5 MB file (limit is 2 MB) | rejected, 413 `FILE_TOO_LARGE` |

`oversized.png` is a PNG signature followed by zeros, so it compresses to almost nothing in Git.
