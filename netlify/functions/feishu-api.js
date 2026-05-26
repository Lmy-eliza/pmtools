// Netlify Function: 飞书 API 代理
// 前端通过此函数中转飞书 API 请求，避免 CORS 问题
// 前端传入 user_access_token，本函数透传请求到飞书

export async function handler(event) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Feishu-Path, X-Feishu-Method',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 处理 preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 从请求头获取飞书 API 路径和 token
    const feishuPath = event.headers['x-feishu-path'];
    const authorization = event.headers['authorization'];
    const feishuMethod = event.headers['x-feishu-method'] || event.httpMethod;

    if (!feishuPath) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: '缺少 X-Feishu-Path 请求头' }),
      };
    }

    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: '缺少 Authorization 请求头' }),
      };
    }

    // 构造飞书 API URL
    const feishuUrl = `https://open.feishu.cn/open-apis${feishuPath}`;

    // 透传请求到飞书
    const fetchOptions = {
      method: feishuMethod,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': authorization,
      },
    };

    // GET/DELETE 不发 body
    if (event.body && !['GET', 'DELETE'].includes(feishuMethod.toUpperCase())) {
      fetchOptions.body = event.body;
    }

    const res = await fetch(feishuUrl, fetchOptions);
    const data = await res.json();

    return {
      statusCode: res.status,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: '代理请求失败', message: error.message }),
    };
  }
}
