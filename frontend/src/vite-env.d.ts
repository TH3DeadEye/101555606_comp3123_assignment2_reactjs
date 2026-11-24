/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Address of the backend API, for example http://localhost:5001
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
