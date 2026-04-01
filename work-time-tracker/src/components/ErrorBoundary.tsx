import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-4">
            <div className="text-5xl">😵</div>
            <h1 className="text-xl font-bold text-gray-800">
              页面出错了
            </h1>
            <p className="text-sm text-gray-500">
              应用遇到了意外错误，请尝试重试或刷新页面。
            </p>
            {this.state.error && (
              <details className="text-left bg-gray-50 rounded-xl p-3 text-xs text-gray-400">
                <summary className="cursor-pointer text-gray-500 mb-1">
                  错误详情
                </summary>
                <pre className="whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={this.handleRetry}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 text-white text-sm font-medium hover:shadow-md transition-all"
              >
                🔄 重试
              </button>
              <button
                onClick={this.handleRefresh}
                className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-all"
              >
                🔃 刷新页面
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
