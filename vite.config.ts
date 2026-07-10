import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@mediapipe/hands": path.resolve(__dirname, "src/mediapipe-hands-shim.js"),
    },
  },
})
