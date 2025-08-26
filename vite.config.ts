import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        background: resolve(__dirname, 'src/background/service-worker.ts'),
        content: resolve(__dirname, 'src/content/content-script-standalone.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name
          if (name === 'background') {
            return 'background/background.js'
          }
          if (name === 'content') {
            return 'content/content.js'
          }
          return 'popup/[name].js'
        },
        assetFileNames: (assetInfo) => {
          // Handle HTML files specifically
          if (assetInfo.name?.endsWith('.html')) {
            return 'popup/[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        manualChunks: (id) => {
          // Don't create shared chunks for content script - inline everything
          if (id.includes('content-script') || id.includes('src/shared')) {
            return undefined;
          }
          // Allow shared chunks for popup and background
          if (id.includes('node_modules') && !id.includes('content-script')) {
            return 'vendor';
          }
        }
      },
      external: (id) => {
        // Don't externalize anything for content script
        return false;
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})