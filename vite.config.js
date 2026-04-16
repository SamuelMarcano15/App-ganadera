import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    loader: "jsx",
    include: /src\/.*\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [
        {
          name: "load-js-files-as-jsx",
          setup(build) {
            build.onLoad({ filter: /src\/.*\.js$/ }, async (args) => ({
              loader: "jsx",
              contents: await fs.promises.readFile(args.path, "utf8"),
            }));
          },
        },
      ],
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Esto le dice al PWA: '¡Guarda TODA la interfaz en el celular!'
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024, // Aumentado a 6MB para permitir los placeholders grandes
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          }
        ]
      },
      manifest: {
        name: 'App Ganadera',
        short_name: 'Ganadera',
        description: 'Gestión Ganadera Offline',
        theme_color: '#173418', // Usando el color primary del sistema de diseño
        background_color: '#f9faf4', // Usando el color background del sistema de diseño
        display: 'standalone',
        start_url: "/",
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
