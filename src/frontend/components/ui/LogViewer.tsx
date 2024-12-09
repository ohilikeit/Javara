import { useEffect, useState, useRef } from 'react';
import { logger } from '@/utils/logger';

interface LogViewerProps {
  isVisible: boolean;
  onClose?: () => void;
}

export function LogViewer({ isVisible, onClose }: LogViewerProps) {
  const [logs, setLogs] = useState(logger.getLogs());
  const logsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(logger.getLogs());
    };

    logger.addListener(updateLogs);
    const interval = setInterval(updateLogs, 1000);
    
    return () => {
      logger.removeListener(updateLogs);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (isVisible && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [isVisible, logs]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-50">
      <div className="flex justify-between items-center p-2 bg-gray-100 border-b">
        <h3 className="text-sm font-semibold">로그 뷰어</h3>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
        )}
      </div>
      <div
        ref={logsRef}
        className="h-48 overflow-y-auto p-4 text-xs font-mono"
      >
        {logs.map((log, index) => (
          <div
            key={index}
            className="mb-2"
          >
            <div className="flex items-start gap-2">
              <span className="text-gray-500 shrink-0">[{log.timestamp}]</span>
              <span className={`font-semibold shrink-0 ${
                log.level === 'ERROR' ? 'text-red-600' :
                log.level === 'WARN' ? 'text-yellow-600' :
                'text-blue-600'
              }`}>
                {log.level}:
              </span>
              <span className="break-all">{log.message}</span>
            </div>
            {log.data && (
              <div className="mt-1 ml-4 bg-gray-50 p-2 rounded overflow-x-auto">
                <code className="text-gray-600">
                  {JSON.stringify(log.data, null, 2)}
                </code>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 