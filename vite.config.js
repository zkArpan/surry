import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'agent-debug-log-to-file',
      configureServer(server) {
        const logPath = path.resolve(process.cwd(), 'debug-e13454.log')
        server.middlewares.use('/__debug/ingest', (req, res, next) => {
          if (req.method !== 'POST') return next()
          let body = ''
          req.on('data', (c) => (body += c))
          req.on('end', () => {
            try {
              // Expect JSON; write NDJSON line regardless.
              const line = body && body.trim().length ? body.trim() : '{}'
              fs.appendFile(logPath, line + '\n', () => {})
            } catch {
              // ignore
            }
            res.statusCode = 204
            res.end()
          })
        })
      },
    },
  ],
})
