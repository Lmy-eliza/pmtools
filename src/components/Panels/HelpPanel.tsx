import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { category: '工具切换', items: [
      { key: 'V', desc: '选择工具' },
      { key: 'D', desc: '添加节点（菱形）' },
      { key: 'T', desc: '添加三角形节点（决策点）' },
      { key: 'R', desc: '添加活动' },
      { key: 'L', desc: '连线工具' },
    ]},
    { category: '编辑操作', items: [
      { key: 'Delete / Backspace', desc: '删除选中节点' },
      { key: 'Ctrl + Z', desc: '撤销' },
      { key: 'Ctrl + Shift + Z', desc: '重做' },
      { key: 'Escape', desc: '取消选择 / 退出当前工具' },
    ]},
    { category: '文件操作', items: [
      { key: 'Ctrl + S', desc: '保存项目' },
      { key: 'Ctrl + E', desc: '导出为 DrawIO 格式' },
    ]},
  ];

  const operations = [
    { title: '添加节点', steps: [
      '方式一：点击工具栏中的图形按钮（◇ △ ▭），然后在画布上点击放置',
      '方式二：按快捷键 D/T/R 切换工具，然后在画布上点击放置',
      '节点会自动放置在对应泳道的中心轴线上',
    ]},
    { title: '添加泳道', steps: [
      '点击工具栏中的 + 按钮',
      '新泳道会添加到最下方',
      '双击泳道名称可以编辑',
    ]},
    { title: '连接节点', steps: [
      '点击工具栏中的连线按钮（—）或按 L 键',
      '依次点击起始节点和目标节点',
      '连接线会自动带箭头',
    ]},
    { title: '创建时间约束', steps: [
      '选中一个节点',
      '在右侧属性面板点击"添加约束"',
      '输入目标节点名称和时间间隔',
      '拖动源节点时，目标节点会自动移动',
    ]},
    { title: '编辑项目名称', steps: [
      '双击左上角的项目名称区域',
      '输入新的项目名称',
    ]},
    { title: '导出计划', steps: [
      '复制为图片：点击 📷 按钮，图片会复制到剪贴板',
      '导出 DrawIO：点击 ⬇ 按钮，可导入到 draw.io 或飞书',
      '保存项目：点击 💾 按钮，保存到本地浏览器',
    ]},
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-blue-500" />
            <h2 className="text-lg font-semibold">使用说明</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-auto p-6">
          {/* 快捷键 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              快捷键
            </h3>
            <div className="grid grid-cols-2 gap-6">
              {shortcuts.map((group) => (
                <div key={group.category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{group.category}</h4>
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.key} className="flex items-center gap-3">
                        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono min-w-[80px] text-center">
                          {item.key}
                        </kbd>
                        <span className="text-sm text-gray-600">{item.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 操作说明 */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
              操作指南
            </h3>
            <div className="space-y-4">
              {operations.map((op) => (
                <div key={op.title} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-800 mb-2">{op.title}</h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {op.steps.map((step, i) => (
                      <li key={i} className="text-sm text-gray-600">{step}</li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">按 <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">?</kbd> 或 <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">F1</kbd> 随时打开此帮助</p>
        </div>
      </div>
    </div>
  );
};

export default HelpPanel;
