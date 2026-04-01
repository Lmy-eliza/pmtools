import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'http'

// Token cache for local dev proxy
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getTenantAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const cacheKey = `${appId}:${appSecret}`
  const cached = tokenCache.get(cacheKey)
  // Reuse token if it has at least 30 minutes remaining
  if (cached && cached.expiresAt > Date.now() + 30 * 60 * 1000) {
    return cached.token
  }

  const res = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  )

  const json = (await res.json()) as {
    code: number
    msg?: string
    tenant_access_token: string
    expire: number
  }
  if (json.code !== 0) {
    throw new Error(`Failed to get tenant_access_token: ${json.msg}`)
  }

  const token = json.tenant_access_token
  // Cache token: expire = json.expire seconds from now, with 5-min safety buffer
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + (json.expire - 300) * 1000,
  })

  return token
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString()
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

function feishuProxyPlugin() {
  return {
    name: 'feishu-proxy',
    configureServer(server: { middlewares: { use: (fn: (req: IncomingMessage & { url?: string; originalUrl?: string }, res: ServerResponse, next: () => void) => void) => void } }) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.originalUrl || req.url || ''

        // Only handle /api/feishu/* requests
        if (!url.startsWith('/api/feishu/')) {
          return next()
        }

        try {
          // 1. Read credentials from custom headers
          const appId = req.headers['x-feishu-app-id'] as string
          const appSecret = req.headers['x-feishu-app-secret'] as string

          if (!appId || !appSecret) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Missing Feishu credentials in headers' }))
            return
          }

          // 2. Exchange for tenant access token (with caching)
          const token = await getTenantAccessToken(appId, appSecret)

          // 3. Build the target Feishu URL
          // /api/feishu/bitable/v1/... -> https://open.feishu.cn/open-apis/bitable/v1/...
          const feishuPath = url.replace(/^\/api\/feishu\//, '')
          const targetUrl = `https://open.feishu.cn/open-apis/${feishuPath}`

          // 4. Build fetch options
          const method = req.method || 'GET'
          const fetchHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          }

          const fetchOptions: RequestInit = {
            method,
            headers: fetchHeaders,
          }

          // Read and forward body for POST/PUT/PATCH
          if (['POST', 'PUT', 'PATCH'].includes(method)) {
            const body = await readBody(req)
            if (body) {
              fetchOptions.body = body
            }
          }

          // 5. Forward to Feishu API
          const response = await fetch(targetUrl, fetchOptions)
          const data = await response.text()

          // 6. Return Feishu response
          res.writeHead(response.status, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          })
          res.end(data)
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          console.error('[feishu-proxy]', message)
          res.writeHead(500, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ code: -1, msg: message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), feishuProxyPlugin()],
})
