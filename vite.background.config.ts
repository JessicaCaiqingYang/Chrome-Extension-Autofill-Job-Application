import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/background/service-worker-minimal.ts'),
      name: 'ServiceWorker',
      fileName: 'background',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'background.js',
        inlineDynamicImports: true
      },
      external: () => false
    },
    outDir: 'dist/background',
    emptyOutDir: false,
    target: 'es2020'
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  }
})