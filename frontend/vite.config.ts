import tailwindcss from '@tailwindcss/postcss';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  root: 'src',
  plugins: [react(), tailwindcss()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring tauri errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 1421,
    },
    watch: {
      // 3. tell vite to ignore watching `tauri`
      ignored: ['**/tauri/**'],
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // 4. use the system webview on macOS (Safari) and Windows (WebView2)
    target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // 5. produce small builds
    minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
    // 6. produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
}));
