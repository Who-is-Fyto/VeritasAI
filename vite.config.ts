import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],

  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router',
      'lucide-react',
      'recharts',
      'motion/react',
      'clsx',
      'tailwind-merge',
      'sonner',
      'date-fns',
      'canvas-confetti',
    ],
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-charts': ['recharts'],
          'vendor-icons': ['lucide-react'],
          'vendor-motion': ['motion'],
        },
      },
    },
  },

  // ── Dev server proxy ────────────────────────────────────────────────
  // All /api/* requests are forwarded to the FastAPI backend during
  // local development, so the frontend never has to think about CORS.
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      ignored: ['**/backend/**', '**/backups/**', '**/.git/**', '**/venv/**'],
      usePolling: false,
    },
    proxy: {
      '/api': {
        target: process.env.VITE_PROXY_TARGET || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },

})
