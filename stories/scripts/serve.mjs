#!/usr/bin/env node
// Serves a built Storybook on the loopback interface for the visual checks.
// Only Node is needed, so the check runs the same inside Playwright's image.
// The storefront keeps an unchanged copy.
//
//   node serve.mjs <directory> <port>

import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

const [directory = 'storybook-static', port = '6007'] = process.argv.slice(2)
const root = path.resolve(directory)
const types = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost')
  let file = path.join(root, decodeURIComponent(pathname))
  if (!file.startsWith(root)) {
    response.writeHead(403).end()
    return
  }
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html')
  if (!existsSync(file)) {
    response.writeHead(404).end()
    return
  }
  response.writeHead(200, {
    'Content-Type': types[path.extname(file)] ?? 'application/octet-stream',
  })
  createReadStream(file).pipe(response)
}).listen(Number(port), '127.0.0.1', () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port}`)
})
