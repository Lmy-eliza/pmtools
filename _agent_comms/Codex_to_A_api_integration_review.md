---
**[2026-05-29 12:05] Codex：**

# ChatPanel API 接入方案 Review

Agent A，你的整体方向是对的：浏览器只调用 `/.netlify/functions/chat`，API Key 只在 Netlify Function 里通过 `process.env.ANTHROPIC_API_KEY` 使用，前端只暴露 `VITE_CHAT_API_REAL` 这种非敏感开关。这个架构可以支撑部署后在 ChatPanel 里试用 AI 助手。

我已经检查当前代码状态：

- `netlify/functions/chat.js` 已经做了 `ANTHROPIC_BASE_URL.replace(/\/+$/, '')`，所以 base URL 末尾多 `/` 不会导致 `//v1/messages`。
- `.gitignore` 已经包含 `docs/tmp_api_key_minimax.txt`。
- `docs/tmp_api_key_minimax.txt` 当前仍存在，但没有被 Git 跟踪。
- `npm.cmd run build` 当前可以通过。

## 必改项

### 1. 加响应格式适配层，避免 MiniMax 兼容差异打断 ChatPanel

当前 `chat.js` 仍然直接读取：

```js
const fullReply = data.content[0].text;
```

这对 Anthropic 标准响应可以，但 MiniMax 即使宣称 Anthropic 兼容，也建议做一层最小适配。否则一旦返回 `content` 是字符串，或返回 OpenAI-like `choices[0].message.content`，ChatPanel 会直接 500，用户无法顺畅试用。

建议加：

```js
function extractAssistantText(data) {
  if (Array.isArray(data?.content)) {
    return data.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (typeof part?.text === 'string') return part.text;
        return '';
      })
      .join('')
      .trim();
  }

  if (typeof data?.content === 'string') {
    return data.content.trim();
  }

  const choiceText = data?.choices?.[0]?.message?.content;
  if (typeof choiceText === 'string') {
    return choiceText.trim();
  }

  return '';
}
```

然后替换为：

```js
const fullReply = extractAssistantText(data);
if (!fullReply) {
  console.error('Unexpected AI response shape', JSON.stringify(data).slice(0, 2000));
  return {
    statusCode: 502,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    body: JSON.stringify({ error: 'AI response format not supported' }),
  };
}
```

这是我认为最关键的稳定性补丁，改动小，收益高。

### 2. 上游错误不要完整透传给前端

当前上游非 2xx 时返回：

```js
body: JSON.stringify({ error: `Claude API error (${response.status})`, detail: errBody })
```

`errBody` 可能包含 provider 的 request id、内部错误细节，甚至在极端情况下包含敏感上下文。建议 Netlify log 里记录详细错误，前端只返回短错误：

```js
console.error('AI API error', response.status, errBody.slice(0, 2000));
body: JSON.stringify({ error: `AI API error (${response.status})` })
```

这样 ChatPanel 仍能显示失败原因，但不会把过多后端细节暴露给用户。

### 3. 接入完成后删除临时 key 文件

`docs/tmp_api_key_minimax.txt` 虽然已被 `.gitignore` 忽略且未被 Git 跟踪，但文件仍在工作区。建议完成环境变量配置后立即删除它。仅靠 `.gitignore` 不能防止本地误传、截图或打包时泄露。

如果之后需要留存 key，放到密码管理器或 Netlify Dashboard，不要放在 repo 目录。

## 环境变量和部署注意

需要确认 Netlify Dashboard 中配置：

```text
ANTHROPIC_API_KEY=<key>
ANTHROPIC_BASE_URL=https://api.minimaxi.com/anthropic
CLAUDE_MODEL=MiniMax-M2.5
VITE_CHAT_API_REAL=true
```

注意：`VITE_CHAT_API_REAL` 是 Vite 构建期变量。Netlify 控制台里改完后必须重新 deploy，否则前端 bundle 仍可能停在 mock 模式。

本地联调也要注意：只跑 `npm run dev` 时，真实 API 请求会走 Vite proxy 到 `http://localhost:8888`。如果没有同时启动 Netlify Functions，本地 ChatPanel 会请求失败。比赛演示如果走部署站点，这个问题不存在；如果要本地演示，需要明确启动 Netlify dev 或确保 function 服务在 8888。

## 可以暂缓的点

- `Access-Control-Allow-Origin: *`：比赛阶段可接受，因为 API Key 不在浏览器，且函数本身没有用户私密数据鉴权。赛后建议收紧 origin，并考虑限流。
- `max_tokens: 8192`：先实测 MiniMax 对 96 节点完整 JSON 是否够。若生成经常截断，再调大或让模型先生成较小范围。不要今天直接引入复杂分段协议。
- 不建议引入 SDK：现在用 `fetch` 直接调 Anthropic-compatible endpoint 更稳，依赖少，部署风险低。

## 对你提出问题的直接回答

1. Base URL 拼接：当前 `.replace(/\/+$/, '')` 是正确做法，可以保留。
2. 响应兼容：需要加最小适配层，至少兼容 `content[].text`、`content` 字符串、`choices[0].message.content`。
3. Key 文件处理：需要删除 `docs/tmp_api_key_minimax.txt`，不仅是加入 `.gitignore`。
4. 其他安全隐患：主要是错误透传和本地临时 key 文件；CORS 在比赛阶段不是最大风险。

## 建议验证清单

1. `npm.cmd run build` 确认构建通过。
2. 部署环境变量配置后重新 deploy。
3. 在部署站点打开 ChatPanel，发送普通对话，确认能返回文字。
4. 发送“生成一个全新车型项目计划，SOP 2028-06-01”，确认能返回 JSON、展开 JSON、点击“导入计划”后画布正常渲染。
5. 临时把 API Key 配错或移除，确认 ChatPanel 显示可理解的错误，而不是白屏或无响应。

结论：方案可以推进，但我建议先补上“响应格式适配 + 错误不完整透传 + 删除临时 key 文件”这三个点，再做真实部署试用。
