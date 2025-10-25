import { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Check, AlertCircle } from 'lucide-react';
import { useAnalysisWebSocket, type LogEntry } from '@/hooks/useAnalysisWebSocket';

interface ProcessingPanelProps {
  analysisId: string | null;
  onCompletion: (result: any) => void;
}

export default function ProcessingPanel({ analysisId, onCompletion }: ProcessingPanelProps) {
  const { socket, logs, progress, result, error } = useAnalysisWebSocket(analysisId);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [isProcessing, setIsProcessing] = useState(false);

  // Debug: Log when analysisId changes
  useEffect(() => {
    console.log('🔄 ProcessingPanel analysisId changed:', analysisId);
    setIsProcessing(!!analysisId);
  }, [analysisId]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Handle analysis completion
  useEffect(() => {
    if (result) {
      console.log('Analysis completed with result:', result);
      setIsProcessing(false);
      onCompletion(result);
    }
  }, [result, onCompletion]);

  // Monitor WebSocket connection status
  useEffect(() => {
    if (!analysisId) {
      setConnectionStatus('disconnected');
      return;
    }

    if (!socket) {
      setConnectionStatus('connecting');
      return;
    }

    switch (socket.readyState) {
      case WebSocket.CONNECTING:
        setConnectionStatus('connecting');
        break;
      case WebSocket.OPEN:
        setConnectionStatus('connected');
        break;
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        setConnectionStatus('disconnected');
        break;
      default:
        setConnectionStatus('error');
    }
  }, [socket, analysisId]);

  const getLogIcon = (log: LogEntry) => {
    const message = log.message;
    if (message.includes('✅') || message.includes('complete') || message.includes('success') || message.includes('completed')) {
      return <Check className="w-3 h-3 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />;
    } else if (message.includes('❌') || message.includes('error') || message.includes('failed') || message.includes('Error')) {
      return <AlertCircle className="w-3 h-3 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />;
    } else if (message.includes('🚀') || message.includes('Starting') || message.includes('initializing')) {
      return <Play className="w-3 h-3 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />;
    } else {
      return <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full flex-shrink-0 mt-1"></div>;
    }
  };

  const getLogColor = (log: LogEntry) => {
    const message = log.message;
    if (message.includes('❌') || message.includes('error') || message.toLowerCase().includes('failed')) {
      return "text-red-600 dark:text-red-400 break-words";
    } else if (message.includes('✅') || message.includes('success') || message.toLowerCase().includes('complete')) {
      return "text-green-600 dark:text-green-400 break-words";
    } else if (message.includes('⚠️') || message.includes('warning')) {
      return "text-yellow-600 dark:text-yellow-400 break-words";
    } else {
      return "text-gray-700 dark:text-gray-300 break-words";
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connecting': return 'Connecting...';
      case 'connected': return 'Connected';
      case 'error': return 'Connection Error';
      default: return 'Disconnected';
    }
  };

  if (!analysisId) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Real-Time Processing</h2>
          </div>
        </div>
        <div className="text-gray-500 dark:text-gray-400 italic text-center py-6">
          Start an analysis to see real-time processing...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Real-Time Processing
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {Math.round(progress)}% Complete
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700' 
              : connectionStatus === 'connecting' 
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
          }`}>
            {getConnectionStatusText()}
          </span>
        </div>
      </div>

      {/* Terminal Output - Clean white/grey styling */}
      <div className="terminal-output min-h-[200px] max-h-[300px] overflow-y-auto rounded-md p-3 text-xs font-mono border bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        {logs.length === 0 ? (
          <div className="italic text-center py-8 text-gray-500 dark:text-gray-400">
            {connectionStatus === 'connecting' ? 'Establishing connection to analysis server...' : 'Waiting for analysis logs...'}
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 mb-1.5 animate-fade-in">
              {getLogIcon(log)}
              <span className={getLogColor(log)}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={logsEndRef} />
        
        {connectionStatus === 'connected' && progress < 100 && !error && logs.length > 0 && (
          <div className="flex items-center space-x-2 animate-pulse text-gray-600 dark:text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
            <span>Processing analysis...</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs mt-1 text-gray-500 dark:text-gray-400">
            <span>Starting...</span>
            <span>{Math.round(progress)}%</span>
            <span>Complete</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs text-red-600 dark:text-red-400 border border-red-200 dark:border-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Success Display */}
      {result && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs text-green-600 dark:text-green-400 border border-green-200 dark:border-green-700">
          <strong>Analysis Complete!</strong> Check the results panel for details.
        </div>
      )}
    </div>
  );
}