import React, { useState } from 'react';
import { Download, ChevronDown, ChevronUp } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../api/chatApi';

interface ChatMessageProps {
  message: ChatMessageType;
  onImportJSON?: (json: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onImportJSON }) => {
  const [showJson, setShowJson] = useState(false);
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={isUser ? 'chat-message-user' : 'chat-message-ai'}>
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans m-0">
          {message.content}
        </pre>

        {message.projectData && (
          <div className="mt-2 pt-2 border-t border-gray-200/50">
            <button
              onClick={() => onImportJSON?.(message.projectData!)}
              className="btn btn-primary text-xs px-3 py-1.5 w-full flex items-center justify-center gap-1.5"
            >
              <Download size={14} />
              导入计划
            </button>
            <button
              onClick={() => setShowJson(!showJson)}
              className="mt-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mx-auto"
            >
              {showJson ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showJson ? '收起 JSON' : '查看 JSON'}
            </button>
            {showJson && (
              <pre className="mt-1.5 text-xs bg-gray-800 text-green-300 rounded-lg p-3 max-h-48 overflow-auto font-mono">
                {message.projectData}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
