import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    // The backend only allows this origin through CORS, so never hop to another port.
    port: 5173,
    strictPort: true,
  },
});
