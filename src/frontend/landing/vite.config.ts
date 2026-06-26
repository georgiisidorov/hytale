import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [
        react(),
        svgr({
            include: '**/*.svg',
            svgrOptions: { exportType: 'default' }
        })
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src')
        }
    }
})
