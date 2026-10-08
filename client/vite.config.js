import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const clientRoot = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(clientRoot, '..')
const cesiumSource = 'node_modules/cesium/Build/Cesium'
const cesiumBaseUrl = 'cesiumStatic'

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: `${cesiumSource}/ThirdParty`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Workers`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Assets`, dest: cesiumBaseUrl },
        { src: `${cesiumSource}/Widgets`, dest: cesiumBaseUrl }
      ]
    })
  ],
  resolve: {
    alias: {
      events: 'events',
      stream: 'stream-browserify',
      buffer: 'buffer/'
    }
  },
  define: {
    global: 'globalThis',
    CESIUM_BASE_URL: JSON.stringify(`/${cesiumBaseUrl}`)
  },
  server: {
    // Matches a redirect URI already registered on the World View application.
    port: 8088,
    open: true,
    strictPort: true,
    fs: {
      allow: [clientRoot, repoRoot]
    }
  },
  preview: {
    port: 8088,
    strictPort: true
  }
})
