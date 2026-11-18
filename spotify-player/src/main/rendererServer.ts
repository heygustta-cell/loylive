import { createServer, type Server } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm'
}

/**
 * Em produção servimos o front-end em http://127.0.0.1 (mesma origem do modo de desenvolvimento).
 * O Web Playback SDK e o EME funcionam de forma confiável numa origem http(s) "segura" como o loopback,
 * enquanto file:// tem origem "null" e quebra a comunicação com o iframe do SDK.
 */
export function startRendererServer(root: string, preferredPort: number): Promise<{ url: string; server: Server }> {
  const base = resolve(root)
  const server = createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405).end()
      return
    }
    let pathname = '/'
    try {
      pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname)
    } catch {
      res.writeHead(400).end()
      return
    }
    let file = normalize(join(base, pathname))
    if (!file.startsWith(base + sep) && file !== base) {
      res.writeHead(403).end()
      return
    }
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(base, 'index.html') // SPA fallback
    const type = MIME[extname(file).toLowerCase()] ?? 'application/octet-stream'
    const immutable = file.includes(`${sep}assets${sep}`)
    res.writeHead(200, {
      'Content-Type': type,
      'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache',
      'X-Content-Type-Options': 'nosniff'
    })
    if (req.method === 'HEAD') {
      res.end()
      return
    }
    createReadStream(file).pipe(res)
  })

  const listen = (port: number): Promise<number> =>
    new Promise((ok, fail) => {
      const onError = (err: NodeJS.ErrnoException): void => {
        server.off('listening', onListening)
        fail(err)
      }
      const onListening = (): void => {
        server.off('error', onError)
        const addr = server.address()
        ok(typeof addr === 'object' && addr ? addr.port : port)
      }
      server.once('error', onError)
      server.once('listening', onListening)
      server.listen(port, '127.0.0.1')
    })

  return listen(preferredPort)
    .catch(() => listen(0)) // porta ocupada: usa uma porta livre qualquer
    .then((port) => ({ url: `http://127.0.0.1:${port}`, server }))
}
