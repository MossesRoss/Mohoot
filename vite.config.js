/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// Changed as per our webhost, Vercel and GitHub Pages compatibility
export default defineConfig({
  base: process.env.VERCEL === '1' ? '/' : '/Mohoot/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    base: '/mohoot-player/',
  },
})
