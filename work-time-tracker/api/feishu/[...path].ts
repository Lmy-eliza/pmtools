import type { VercelRequest, VercelResponse } from '@vercel/node';

// Cache tenant access tokens (they last 2 hours)
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getTenantAccessToken(
  appId: string,
  appSecret: string
): Promise<string> {
  const cacheKey = `${appId}:${appSecret}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }

  const res = await fetch(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    }
  );

  const json = await res.json();
  if (json.code !== 0) {
    throw new Error(`Failed to get token: ${json.msg}`);
  }

  const token = json.tenant_access_token;
  tokenCache.set(cacheKey, {
    token,
    expiresAt: Date.now() + (json.expire - 300) * 1000, // 5 min buffer
  });

  return token;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Feishu-App-Id, X-Feishu-App-Secret'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const appId = req.headers['x-feishu-app-id'] as string;
  const appSecret = req.headers['x-feishu-app-secret'] as string;

  if (!appId || !appSecret) {
    return res.status(400).json({ error: 'Missing Feishu credentials' });
  }

  try {
    const token = await getTenantAccessToken(appId, appSecret);

    // Build the target Feishu URL from the path
    const pathArray = req.query.path;
    const path = Array.isArray(pathArray)
      ? pathArray.join('/')
      : pathArray || '';
    const targetUrl = new URL(`https://open.feishu.cn/open-apis/${path}`);

    // Forward query params (except 'path')
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'path') {
        targetUrl.searchParams.set(key, String(value));
      }
    }

    const fetchOptions: RequestInit = {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    };

    if (req.body && ['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      fetchOptions.body = JSON.stringify(req.body);
    }

    const response = await fetch(targetUrl.toString(), fetchOptions);
    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
}
