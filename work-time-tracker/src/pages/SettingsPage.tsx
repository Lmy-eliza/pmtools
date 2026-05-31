import { useState, useEffect } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useTagStore } from '../stores/tagStore';
import { feishuApi } from '../services/feishuApi';
import type { Tag } from '../types';
import { getNextMacaronColor } from '../types';
import Button from '../components/ui/Button';
import { Check, AlertCircle, Trash2, Plus, RefreshCw, Pencil, X, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import ConfirmDialog from '../components/ui/ConfirmDialog';

// A4: Mask a value
function maskValue(val: string | undefined | null): string {
  if (!val) return '';
  if (val.length <= 10) return val;
  return val.slice(0, 4) + '••••••' + val.slice(-4);
}

// URL 自动提取：从粘贴的 URL 中提取 table ID 或 app token
function extractTableId(input: string): string {
  // 匹配 table=tblXXXXX
  const tableMatch = input.match(/table=(tbl\w+)/);
  if (tableMatch) return tableMatch[1];
  return input;
}

function extractAppToken(input: string): { token: string; isWiki: boolean; tableId?: string } {
  // 先尝试从 URL 中提取 table=tblXXX（wiki/base URL 都可能带）
  const tableMatch = input.match(/table=(tbl\w+)/);
  const tableId = tableMatch ? tableMatch[1] : undefined;

  // /base/bascXXXXX 格式 → 直接提取 App Token
  const baseMatch = input.match(/\/base\/(\w+)/);
  if (baseMatch) return { token: baseMatch[1], isWiki: false, tableId };

  // /wiki/XXXXX 格式 → 提取 wiki node token，需调 API 换取真正 App Token
  const wikiMatch = input.match(/\/wiki\/(\w+)/);
  if (wikiMatch) return { token: wikiMatch[1], isWiki: true, tableId };

  return { token: input, isWiki: false, tableId };
}

export default function SettingsPage() {
  const { feishu, pomodoro, setFeishu, setPomodoro, loadFromStorage } =
    useSettingsStore();
  const { tags, fetchTags, addTag, deleteTag, updateTag, ensurePresets } = useTagStore();
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testError, setTestError] = useState('');
  const [tagError, setTagError] = useState('');

  const [tagSubmitting, setTagSubmitting] = useState(false);
  const [presetSubmitting, setPresetSubmitting] = useState(false);
  const [presetSuccess, setPresetSuccess] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // New tag form
  const [newTagName, setNewTagName] = useState('');
  const [newTagEmoji, setNewTagEmoji] = useState('🏷️');
  const [newTagColor, setNewTagColor] = useState('#6366F1');
  const [showTagForm, setShowTagForm] = useState(false);

  // #22b: tag editing in settings
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagEmoji, setEditTagEmoji] = useState('');
  const [editTagColor, setEditTagColor] = useState('');

  // Delete confirmation
  const [pendingDeleteTagId, setPendingDeleteTagId] = useState<string | null>(null);

  // 字段说明手风琴展开状态
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  // Wiki URL 换取 App Token 状态
  const [wikiConverting, setWikiConverting] = useState(false);
  const [wikiConvertMsg, setWikiConvertMsg] = useState('');
  // 高级凭据折叠状态（已填 appId 时默认展开）
  const [showCredentials, setShowCredentials] = useState(false);

  useEffect(() => {
    loadFromStorage();
  }, []);

  // 已填 appId 时默认展开凭据区域
  useEffect(() => {
    if (feishu.appId) setShowCredentials(true);
  }, [feishu.appId]);

  useEffect(() => {
    if (feishu.tagTableId) {
      fetchTags();
    }
  }, [feishu.tagTableId]);

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError('');
    try {
      const ok = await feishuApi.testConnection();
      setTestStatus(ok ? 'success' : 'error');
      if (!ok) setTestError('连接失败，请检查凭证');
    } catch (e) {
      setTestStatus('error');
      setTestError(e instanceof Error ? e.message : '连接失败');
    }
  };

  const handleCreatePresets = async () => {
    if (tags.length > 0) {
      setTagError('已有标签，无需重复初始化预设');
      return;
    }
    setTagError('');
    setPresetSuccess('');
    setPresetSubmitting(true);
    try {
      await ensurePresets();
      await fetchTags();
      setPresetSuccess('预设标签初始化成功！');
      setTimeout(() => setPresetSuccess(''), 3000);
    } catch (e) {
      setTagError(e instanceof Error ? e.message : '初始化预设失败');
    } finally {
      setPresetSubmitting(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagName.trim()) return;
    setTagError('');
    setTagSubmitting(true);
    try {
      await addTag({
        name: newTagName.trim(),
        emoji: newTagEmoji,
        color: newTagColor,
        is_preset: false,
      });
      setNewTagName('');
      setNewTagEmoji('🏷️');
      setNewTagColor(getNextMacaronColor([...tags.map(t => t.color), newTagColor]));
      setShowTagForm(false);
    } catch (e) {
      setTagError(e instanceof Error ? e.message : '添加标签失败');
    } finally {
      setTagSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!pendingDeleteTagId) return;
    setTagError('');
    try {
      await deleteTag(pendingDeleteTagId);
    } catch (e) {
      setTagError(e instanceof Error ? e.message : '删除标签失败');
    }
    setPendingDeleteTagId(null);
  };

  // #22b: start editing a tag
  const startEditTag = (tag: Tag) => {
    setEditingTagId(tag.id);
    setEditTagName(tag.name);
    setEditTagEmoji(tag.emoji);
    setEditTagColor(tag.color);
  };

  const saveEditTag = async () => {
    if (!editingTagId || !editTagName.trim()) return;
    setTagError('');
    try {
      await updateTag(editingTagId, {
        name: editTagName.trim(),
        emoji: editTagEmoji,
        color: editTagColor,
      });
      setEditingTagId(null);
    } catch (e) {
      setTagError(e instanceof Error ? e.message : '更新标签失败');
    }
  };

  // 表 ID onChange 处理器（自动从 URL 提取 table=tblXXX）
  const handleTableIdChange = (key: string, value: string) => {
    setFeishu({ [key]: extractTableId(value) });
  };

  // App Token onChange 处理器（自动从 URL 提取，wiki URL 自动调 API 换取）
  const handleAppTokenChange = async (value: string) => {
    const { token, isWiki, tableId } = extractAppToken(value);

    // 如果 URL 中带 table=tblXXX，自动填充到第一个空的表 ID 字段（通常是 noteTableId 或用户自行填）
    // 这里不自动填充，避免覆盖已有配置，仅在 wiki 成功换取后作为提示

    if (isWiki) {
      // 调飞书 wiki API，用 node token 换取真正的 bitable App Token
      setWikiConverting(true);
      setWikiConvertMsg('正在从 Wiki 链接获取多维表格 Token...');
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (feishu.appId && feishu.appSecret) {
          headers['X-Feishu-App-Id'] = feishu.appId;
          headers['X-Feishu-App-Secret'] = feishu.appSecret;
        }
        if (feishu.appToken) {
          headers['X-Feishu-App-Token'] = feishu.appToken;
        }

        const res = await fetch(`/api/feishu/wiki/v2/spaces/get_node?token=${token}`, { headers });
        const json = await res.json();

        if (json.code === 0 && json.data?.node?.obj_token) {
          setFeishu({ appToken: json.data.node.obj_token });
          setWikiConvertMsg(`✅ 已从 Wiki 获取 App Token: ${json.data.node.obj_token.slice(0, 6)}...`);
          // 如果 URL 中有 tableId，提示用户
          if (tableId) {
            setWikiConvertMsg(prev => prev + ` (检测到表 ID: ${tableId}，请在下方对应字段填入)`);
          }
        } else {
          // API 返回错误，fallback 到原始 token
          console.warn('[Wiki] API 返回:', json);
          setFeishu({ appToken: token });
          setWikiConvertMsg('⚠️ Wiki 换取失败，已使用原始 Token（可能不正确，请检查权限或手动输入）');
        }
      } catch (e) {
        console.error('[Wiki] 换取 App Token 失败:', e);
        setFeishu({ appToken: token });
        setWikiConvertMsg('⚠️ Wiki 换取失败，已使用原始 Token（请检查网络或手动输入 App Token）');
      } finally {
        setWikiConverting(false);
        setTimeout(() => setWikiConvertMsg(''), 8000);
      }
    } else {
      setFeishu({ appToken: token });
      setWikiConvertMsg('');
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">

        {/* 两栏布局 */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左栏：配置指引（常驻展开） */}
          <aside className="lg:w-72 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
            <section className="bg-blue-50/60 rounded-2xl p-4 shadow-sm border border-blue-100/50">
              <div className="font-semibold text-blue-700 mb-3 flex items-center gap-2">
                📖 配置指引
              </div>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="space-y-1">
                  <div className="font-medium text-gray-700">1. App ID / App Secret</div>
                  <div className="pl-3 text-xs">
                    飞书开放平台 → 创建/选择应用 → 凭证与基础信息 → 复制
                  </div>
                  <a
                    href="https://open.feishu.cn/app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 pl-3 text-xs text-blue-500 hover:text-blue-600"
                  >
                    <ExternalLink size={11} /> 飞书开放平台
                  </a>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-gray-700">2. 添加应用到多维表格</div>
                  <div className="pl-3 text-xs">
                    多维表格 → 右上角「...」→ 更多 → 添加文档应用 → 选择你的应用 → 勾选「可编辑」
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-gray-700">3. App Token</div>
                  <div className="pl-3 text-xs">
                    多维表格地址栏 <code className="bg-white/80 px-1 rounded">/base/</code> 或 <code className="bg-white/80 px-1 rounded">/wiki/</code> 后的字符串
                  </div>
                  <div className="pl-3 text-[10px] text-gray-400">
                    支持粘贴完整 URL，自动提取（Wiki 链接会自动换取真实 Token）
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-gray-700">4. 表 ID</div>
                  <div className="pl-3 text-xs">
                    表标签页地址栏 <code className="bg-white/80 px-1 rounded">table=</code> 后的 tblXXXXX
                  </div>
                  <div className="pl-3 text-[10px] text-gray-400">
                    支持粘贴完整 URL，自动提取
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-medium text-gray-700">📎 快速开始</div>
                  <a href="https://xiaopeng.feishu.cn/wiki/KnjUwLbKOi3y68kP6fncP9eQnbd?table=ldxWGWN82t4uPRwd"
                     target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1 pl-3 text-xs text-blue-500 hover:text-blue-600 font-medium">
                    <ExternalLink size={11} /> 使用模板
                  </a>
                </div>

                <div className="space-y-2">
                  <div className="font-medium text-gray-700">5. 各表字段说明</div>
                  <div className="pl-1 text-xs space-y-1">
                    {[
                      {
                        key: 'tags',
                        label: '标签表 (tags)',
                        fields: [
                          ['name', '文本', '标签名称'],
                          ['emoji', '文本', '标签图标'],
                          ['color', '文本', '颜色'],
                          ['is_preset', '复选框', '是否预设'],
                          ['created_at', '日期', '创建时间'],
                        ],
                      },
                      {
                        key: 'todos',
                        label: '待办表 (todos)',
                        fields: [
                          ['title', '文本', '任务标题'],
                          ['description', '文本', '任务描述'],
                          ['status', '文本', '状态'],
                          ['tag_id', '文本', '标签ID'],
                          ['tag_name', '文本', '标签名称'],
                          ['color', '文本', '颜色'],
                          ['date', '日期', '所属日期'],
                          ['created_at', '日期', '创建时间'],
                        ],
                      },
                      {
                        key: 'time_blocks',
                        label: '时间块表 (time_blocks)',
                        fields: [
                          ['todo_id', '文本', '待办ID'],
                          ['todo_title', '文本', '任务标题'],
                          ['tag_id', '文本', '标签ID'],
                          ['tag_name', '文本', '标签名称'],
                          ['color', '文本', '颜色'],
                          ['date', '日期', '所属日期'],
                          ['start_time', '文本', '开始时间'],
                          ['end_time', '文本', '结束时间'],
                          ['duration_minutes', '数字', '时长(分钟)'],
                          ['source', '文本', '来源'],
                        ],
                      },
                      {
                        key: 'notes',
                        label: '随笔表 (daily_notes)',
                        fields: [
                          ['date', '日期', '所属日期'],
                          ['content', '文本', '随笔内容'],
                          ['created_at', '日期', '创建时间'],
                        ],
                      },
                      {
                        key: 'mood_log',
                        label: '心情日志表 (mood_log)',
                        fields: [
                          ['date', '日期', '所属日期'],
                          ['emoji', '文本', '心情emoji'],
                          ['score', '数字', '心情分数0-5'],
                          ['time', '文本', '记录时间 HH:MM'],
                          ['created_at', '日期', '创建时间'],
                        ],
                      },
                    ].map(({ key, label, fields }) => (
                      <div key={key}>
                        <div
                          className="flex items-center gap-1 text-gray-500 font-medium cursor-pointer select-none hover:text-gray-700 transition-colors py-0.5"
                          onClick={() => setExpandedTable(expandedTable === key ? null : key)}
                        >
                          {expandedTable === key ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          {label}
                        </div>
                        {expandedTable === key && (
                          <table className="w-full border-collapse ml-3 mt-0.5">
                            <tbody>
                              {fields.map(([field, type, desc]) => (
                                <tr key={field} className="border-b border-gray-100">
                                  <td className="py-0.5 pr-1 font-mono text-blue-600">{field}</td>
                                  <td className="py-0.5 pr-1 text-gray-400">{type}</td>
                                  <td className="py-0.5 text-gray-500">{desc}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </aside>

          {/* 右栏：功能区 */}
          <div className="flex-1 space-y-6">
            {/* Feishu Connection */}
            <section className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 space-y-4">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                🔗 飞书连接
              </h2>

              <div className="grid grid-cols-1 gap-3">
                {/* App Token 始终显示 */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">App Token (多维表格)</label>
                  <input
                    type="text"
                    value={focusedField === 'appToken' ? feishu.appToken : maskValue(feishu.appToken)}
                    onChange={(e) => handleAppTokenChange(e.target.value)}
                    onFocus={() => setFocusedField('appToken')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="bascxxxxx 或粘贴完整 URL"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  <div className="text-[10px] text-gray-400 mt-0.5">支持粘贴 /base/ 或 /wiki/ 格式 URL，自动提取 App Token</div>
                  {wikiConverting && (
                    <div className="text-[10px] text-blue-500 mt-0.5 animate-pulse">⏳ {wikiConvertMsg || '正在获取...'}</div>
                  )}
                  {!wikiConverting && wikiConvertMsg && (
                    <div className={`text-[10px] mt-0.5 ${wikiConvertMsg.startsWith('✅') ? 'text-green-500' : 'text-amber-500'}`}>{wikiConvertMsg}</div>
                  )}
                </div>

                {/* App ID / App Secret 折叠区域 */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowCredentials(!showCredentials)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-500 hover:bg-gray-50/50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      {!feishu.appId ? (
                        <>✅ 应用凭据已通过服务端配置</>
                      ) : (
                        <>🔑 已配置自定义应用凭据</>
                      )}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      {showCredentials ? '收起' : '自定义配置'}
                      {showCredentials ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </span>
                  </button>
                  {showCredentials && (
                    <div className="px-3 pb-3 space-y-2 border-t border-gray-100 pt-2">
                      {[
                        { key: 'appId' as const, label: 'App ID', placeholder: 'cli_xxxxx', hint: '飞书开放平台 → 应用凭证' },
                        { key: 'appSecret' as const, label: 'App Secret', placeholder: '密钥...', hint: '与 App ID 在同一页面获取' },
                      ].map(({ key, label, placeholder, hint }) => (
                        <div key={key}>
                          <label className="text-xs text-gray-500 block mb-1">{label}</label>
                          <input
                            type={key === 'appSecret' ? 'password' : 'text'}
                            value={key === 'appSecret' ? feishu[key] : focusedField === key ? feishu[key] : maskValue(feishu[key])}
                            onChange={(e) => setFeishu({ [key]: e.target.value })}
                            onFocus={() => setFocusedField(key)}
                            onBlur={() => setFocusedField(null)}
                            placeholder={placeholder}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                          <div className="text-[10px] text-gray-400 mt-0.5">{hint}</div>
                        </div>
                      ))}
                      <div className="text-[10px] text-amber-500 mt-1">留空则使用服务端环境变量（推荐）</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button onClick={handleTestConnection} disabled={testStatus === 'testing'}>
                  {testStatus === 'testing' ? '测试中...' : '🔌 测试连接'}
                </Button>
                {testStatus === 'success' && (
                  <span className="text-green-500 flex items-center gap-1 text-sm">
                    <Check size={16} /> 连接成功
                  </span>
                )}
                {testStatus === 'error' && (
                  <span className="text-red-500 flex items-center gap-1 text-sm">
                    <AlertCircle size={16} /> {testError}
                  </span>
                )}
              </div>
            </section>

            {/* Table IDs */}
            <section className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 space-y-4">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                📋 表 ID 配置
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'tagTableId' as const, label: '标签表 (tags)', placeholder: 'tblxxxxx 或粘贴 URL' },
                  { key: 'todoTableId' as const, label: '待办表 (todos)', placeholder: 'tblxxxxx 或粘贴 URL' },
                  { key: 'timeBlockTableId' as const, label: '时间块表 (time_blocks)', placeholder: 'tblxxxxx 或粘贴 URL' },
                  { key: 'noteTableId' as const, label: '随笔表 (daily_notes)', placeholder: 'tblxxxxx 或粘贴 URL' },
                  { key: 'moodLogTableId' as const, label: '心情日志表 (可选)', placeholder: 'tblxxxxx 或粘贴 URL' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-500 block mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={
                        focusedField === key
                          ? feishu[key]
                          : maskValue(feishu[key])
                      }
                      onChange={(e) => handleTableIdChange(key, e.target.value)}
                      onFocus={() => setFocusedField(key)}
                      onBlur={() => setFocusedField(null)}
                      placeholder={placeholder}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Tag Management */}
            <section className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                  🏷️ 标签管理
                </h2>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={handleCreatePresets} disabled={presetSubmitting}>
                    <RefreshCw size={14} className={presetSubmitting ? 'animate-spin' : ''} /> {presetSubmitting ? '初始化中...' : '初始化预设'}
                  </Button>
                  <Button size="sm" onClick={() => {
                    setNewTagColor(getNextMacaronColor(tags.map(t => t.color)));
                    setShowTagForm(true);
                  }}>
                    <Plus size={14} /> 新建
                  </Button>
                </div>
              </div>

              {/* Tag error */}
              {tagError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                  <AlertCircle size={14} />
                  {tagError}
                </div>
              )}

              {/* Preset success feedback */}
              {presetSuccess && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-600 text-sm">
                  <Check size={14} />
                  {presetSuccess}
                </div>
              )}

              {/* Tag list */}
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/60 border border-gray-100"
                  >
                    {editingTagId === tag.id ? (
                      /* #22b: inline edit form */
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editTagEmoji}
                          onChange={(e) => setEditTagEmoji(e.target.value)}
                          className="w-10 px-1 py-1 rounded-lg border border-gray-200 text-center text-lg"
                        />
                        <input
                          type="text"
                          value={editTagName}
                          onChange={(e) => setEditTagName(e.target.value)}
                          className="flex-1 px-2 py-1 rounded-lg border border-gray-200 text-sm"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditTag();
                            if (e.key === 'Escape') setEditingTagId(null);
                          }}
                        />
                        <input
                          type="color"
                          value={editTagColor}
                          onChange={(e) => setEditTagColor(e.target.value)}
                          className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer p-0"
                        />
                        <button onClick={saveEditTag} className="p-1 rounded-lg hover:bg-green-50">
                          <Check size={14} className="text-green-500" />
                        </button>
                        <button onClick={() => setEditingTagId(null)} className="p-1 rounded-lg hover:bg-gray-100">
                          <X size={14} className="text-gray-400" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-lg">{tag.emoji}</span>
                          <span className="text-sm text-gray-700">{tag.name}</span>
                          {tag.is_preset && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded-full">
                              预设
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEditTag(tag)}
                            className="p-1 rounded-lg hover:bg-blue-50 transition-colors"
                            title="编辑标签"
                          >
                            <Pencil size={14} className="text-gray-400 hover:text-blue-400" />
                          </button>
                          <button
                            onClick={() => setPendingDeleteTagId(tag.id)}
                            className="p-1 rounded-lg hover:bg-red-50 transition-colors"
                            title="删除标签"
                          >
                            <Trash2 size={14} className="text-gray-400 hover:text-red-400" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                {tags.length === 0 && (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    还没有标签，点击「初始化预设」创建默认标签
                  </div>
                )}
              </div>

              {/* New tag form */}
              {showTagForm && (
                <div className="space-y-3 p-3 rounded-xl bg-gray-50/80 border border-gray-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagEmoji}
                      onChange={(e) => setNewTagEmoji(e.target.value)}
                      className="w-16 px-2 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                      placeholder="🏷️"
                    />
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="标签名称"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <input
                      type="color"
                      value={newTagColor}
                      onChange={(e) => setNewTagColor(e.target.value)}
                      className="w-7 h-7 rounded-full border border-gray-200 cursor-pointer p-0"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleAddTag} disabled={tagSubmitting}>
                      {tagSubmitting ? '添加中...' : '添加'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowTagForm(false)}
                    >
                      取消
                    </Button>
                  </div>
                </div>
              )}
            </section>

            {/* Pomodoro Settings */}
            <section className="bg-white/60 rounded-2xl p-5 shadow-sm border border-white/50 space-y-4">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                🍅 番茄钟设置
              </h2>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    默认专注时长（分钟）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={pomodoro.defaultMinutes}
                    onChange={(e) =>
                      setPomodoro({ defaultMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    休息时长（分钟）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={pomodoro.breakMinutes}
                    onChange={(e) =>
                      setPomodoro({ breakMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!pendingDeleteTagId}
        title="删除标签"
        message="确定要删除这个标签吗？已使用该标签的待办和时间块不会受影响。"
        onConfirm={handleDeleteTag}
        onCancel={() => setPendingDeleteTagId(null)}
        confirmText="删除"
      />
    </div>
  );
}
