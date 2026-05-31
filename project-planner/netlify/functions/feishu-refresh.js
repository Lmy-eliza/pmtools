// Netlify Function: 飞书 refresh_token → 刷新 user_access_token
// AppSecret 仅在服务端环境变量中

export async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { refresh_token } = JSON.parse(event.body || '{}');
    if (!refresh_token) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: '缺少 refresh_token 参数' }) };
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

    // Step 2: 刷新 user_access_token
    const refreshRes = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/refresh_access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appTokenData.app_access_token}`,
      },
      body: JSON.stringify({ grant_type: 'refresh_token', refresh_token }),
    });
    const refreshData = await refreshRes.json();

    if (refreshData.code !== 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '刷新 token 失败', detail: refreshData }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: refreshData.data.access_token,
        refresh_token: refreshData.data.refresh_token,
        token_type: refreshData.data.token_type,
        expires_in: refreshData.data.expires_in,
        refresh_expires_in: refreshData.data.refresh_expires_in,
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
