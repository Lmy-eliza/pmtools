import React, { useRef, useEffect, useState } from 'react';
import { X, Send, Trash2, Loader2, Paperclip } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { useCanvasStore } from '../../stores/canvasStore';
import { ChatMessage } from './ChatMessage';

const MAX_FILE_SIZE = 50 * 1024; // 50KB
const ALLOWED_EXTENSIONS = ['.md', '.txt', '.json', '.csv'];

interface ChatPanelProps {
  onImportJSON: (json: string) => void;
  onClose: () => void;
}

const LOADING_TEXTS = ['正在思考...', '正在组织数据...', '快好了，请稍候...'];

const PROMPTS_EMPTY_CANVAS = [
  { label: '排一个示例项目的计划', message: '排一个示例项目的计划，中改车型，SOP 2027-03-01' },
  { label: '我要排一个新项目', message: '帮我排一个项目计划' },
  { label: '这个工具怎么用？', message: 'Smart Planner能帮我做什么？' },
];

const PROMPTS_WITH_DATA = [
  { label: '当前计划概况', message: '当前计划概况' },
  { label: '帮我检查计划合理性', message: '帮我检查一下这个计划有没有问题' },
  { label: '给泳道补充活动', message: '帮我给空的泳道补充典型活动' },
];

export const ChatPanel: React.FC<ChatPanelProps> = ({ onImportJSON, onClose }) => {
  const { messages, isLoading, sendMessage, clearMessages } = useChatStore();
  const canvasHasData = useCanvasStore(state => state.nodes.length > 0);
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; content: string } | null>(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // 自动滚到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // 打开面板时聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 加载状态分阶段提示
  useEffect(() => {
    if (isLoading) {
      setLoadingPhase(0);
      loadingTimerRef.current = [
        setTimeout(() => setLoadingPhase(1), 3000),
        setTimeout(() => setLoadingPhase(2), 8000),
      ];
    } else {
      loadingTimerRef.current.forEach(clearTimeout);
      loadingTimerRef.current = [];
      setLoadingPhase(0);
    }
    return () => loadingTimerRef.current.forEach(clearTimeout);
  }, [isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      alert(`不支持的文件类型。支持：${ALLOWED_EXTENSIONS.join('、')}`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      alert(`文件过大（${(file.size / 1024).toFixed(0)}KB），上限 50KB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({ name: file.name, content: reader.result as string });
    };
    reader.readAsText(file);
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed && !attachedFile) return;
    if (isLoading) return;

    let finalMessage = trimmed;
    if (attachedFile) {
      const fileBlock = `[附件: ${attachedFile.name}]\n\`\`\`\n${attachedFile.content}\n\`\`\``;
      finalMessage = finalMessage ? `${fileBlock}\n\n${finalMessage}` : fileBlock;
      setAttachedFile(null);
    }

    setInput('');
    sendMessage(finalMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* 标题栏 */}
      <div className="panel-header flex items-center justify-between shrink-0">
        <span className="font-semibold text-sm">AI 助手</span>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              title="清空对话"
            >
              <Trash2 size={14} className="text-gray-400" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="关闭"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* 大赛提示 */}
      <div className="mx-3 mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700 leading-relaxed shrink-0">
        当前为大赛作品演示版，请勿使用真实数据，正式使用另待通知。
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm mt-6 px-2">
            <p className="text-center mb-3">我是你的项目规划师，试试：</p>
            <div className="space-y-2">
              {(canvasHasData ? PROMPTS_WITH_DATA : PROMPTS_EMPTY_CANVAS).map((item) => (
                <button
                  key={item.label}
                  onClick={() => sendMessage(item.message)}
                  className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-xs leading-relaxed"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onImportJSON={onImportJSON}
          />
        ))}

        {isLoading && (
          <div className="flex justify-start mb-3">
            <div className="chat-message-ai flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm text-gray-500">{LOADING_TEXTS[loadingPhase]}</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="border-t border-gray-200 p-3 shrink-0">
        {attachedFile && (
          <div className="flex items-center gap-1 mb-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-700">
            <Paperclip size={12} />
            <span className="truncate flex-1">{attachedFile.name}</span>
            <button onClick={() => setAttachedFile(null)} className="hover:text-blue-900">
              <X size={12} />
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_EXTENSIONS.join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="self-end p-2 hover:bg-gray-100 rounded transition-colors text-gray-400 hover:text-gray-600"
            title="上传文件（.md .txt .json .csv，≤50KB）"
          >
            <Paperclip size={16} />
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onKeyUp={e => e.stopPropagation()}
            placeholder="描述你的项目需求..."
            className="input flex-1 resize-none text-sm"
            rows={2}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedFile) || isLoading}
            className="btn btn-primary self-end px-3 py-2"
            title="发送 (Enter)"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
