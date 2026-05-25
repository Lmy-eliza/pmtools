// Netlify Function: 飞书 OAuth code → user_access_token 中转
// AppSecret 仅在服务端环境变量中，前端不可见

export async function handler(event) {
  // 只允许 POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // CORS 头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  // 处理 preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { code } = JSON.parse(event.body || '{}');
    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 code 参数' }) };
    }

    const appId = process.env.VITE_FEISHU_APP_ID || process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;

    if (!appId || !appSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '服务器未配置飞书应用凭证' }),
      };
    }

    // Step 1: 获取 app_access_token
    const appTokenRes = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    });
    const appTokenData = await appTokenRes.json();

    if (appTokenData.code !== 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: '获取 app_access_token 失败', detail: appTokenData }),
      };
    }

    // Step 2: 用 code 换取 user_access_token
    const userTokenRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appTokenData.app_access_token}`,
      },
      body: JSON.stringify({ grant_type: 'authorization_code', code }),
    });
    const userTokenData = await userTokenRes.json();

    if (userTokenData.code !== 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '换取 user_access_token 失败', detail: userTokenData }),
      };
    }

    // 返回 token 信息（不含 app_secret）
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: userTokenData.data.access_token,
        refresh_token: userTokenData.data.refresh_token,
        token_type: userTokenData.data.token_type,
        expires_in: userTokenData.data.expires_in,
        refresh_expires_in: userTokenData.data.refresh_expires_in,
        open_id: userTokenData.data.open_id,
        union_id: userTokenData.data.union_id,
        name: userTokenData.data.name,
        avatar_url: userTokenData.data.avatar_url,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '服务器内部错误', message: error.message }),
    };
  }
}
