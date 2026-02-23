import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

/** Build content script as a single self-contained file (no shared chunks). */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/content/content.tsx'),
      output: {
        entryFileNames: 'content.js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (name.endsWith('.css')) return 'content.css'
          return 'assets/[name]-[hash][extname]'
        },
        inlineDynamicImports: true,
      },
    },
  },
})
