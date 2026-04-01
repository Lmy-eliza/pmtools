// Netlify Functions types (inline to avoid @netlify/functions dependency)
interface HandlerEvent {
  httpMethod: string
  headers: Record<string, string | undefined>
  body: string | null
  isBase64Encoded: boolean
  path: string
  rawUrl: string
  rawQuery: string
}

interface HandlerResponse {
  statusCode: number
  headers?: Record<string, string>
  body: string
}

type Handler = (
  event: HandlerEvent,
  context: unknown
) => Promise<HandlerResponse>

// Cache tenant access tokens (they last 2 hours)
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

async function getTenantAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const cacheKey = `${appId}:${appSecret}`
  const cached = tokenCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
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
    throw new Error(`Failed to get token: ${json.msg}`)
  }

  const token = json.tenant_access_token
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + (json.expire - 300) * 1000, // 5 min buffer
  })

  return token
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, X-Feishu-App-Id, X-Feishu-App-Secret, X-Feishu-App-Token',
}

const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: '',
    }
  }

  // #30: Prefer server-side env vars; fall back to request headers (dev mode)
  const appId = process.env.FEISHU_APP_ID || event.headers['x-feishu-app-id']
  const appSecret = process.env.FEISHU_APP_SECRET || event.headers['x-feishu-app-secret']

  if (!appId || !appSecret) {
    return {
      statusCode: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Missing Feishu credentials. Set FEISHU_APP_ID and FEISHU_APP_SECRET in Netlify environment variables, or pass via request headers.',
      }),
    }
  }

  try {
    const token = await getTenantAccessToken(appId, appSecret)

    // Extract the Feishu API path from the request
    // The request path is /api/feishu/bitable/v1/...
    // We need to extract everything after /api/feishu/
    const requestPath = event.path || event.rawUrl
    const feishuPathMatch = requestPath.match(/\/api\/feishu\/(.+)/)
    const feishuPath = feishuPathMatch ? feishuPathMatch[1] : ''

    // Build target URL with query string
    const queryString = event.rawQuery ? `?${event.rawQuery}` : ''
    const targetUrl = `https://open.feishu.cn/open-apis/${feishuPath}${queryString}`

    const fetchOptions: RequestInit = {
      method: event.httpMethod,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }

    if (event.body && ['POST', 'PUT', 'PATCH'].includes(event.httpMethod)) {
      fetchOptions.body = event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf-8')
        : event.body
    }

    const response = await fetch(targetUrl, fetchOptions)
    const data = await response.text()

    return {
      statusCode: response.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: data,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    }
  }
}

export { handler }
