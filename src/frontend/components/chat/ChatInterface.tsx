import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatService } from '@/backend/domains/chatbot/service/ChatService';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/utils/logger';
import { LogViewer } from '@/frontend/components/ui/LogViewer';

interface ChatInterfaceProps {
  messages: Array<{
    content: string;
    isBot: boolean;
  }>;
  onMessagesChange: (messages: Array<{
    content: string;
    isBot: boolean;
  }>) => void;
}

export function ChatInterface({ messages, onMessagesChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLogViewer, setShowLogViewer] = useState(false);
  const chatService = useRef<ChatService | null>(null);
  const sessionId = useRef<string>(uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState(logger.getLogs());
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  useEffect(() => {
    const updateLogs = () => {
      setLogs(logger.getLogs());
    };

    // 로그 업데이트 구독
    logger.addListener(updateLogs);
    
    // 컴포넌트 언마운트 시 구독 해제
    return () => {
      logger.removeListener(updateLogs);
    };
  }, []);

  useEffect(() => {
    const initService = async () => {
      try {
        if (!chatService.current) {
          chatService.current = ChatService.getInstance();
        }
      } catch (error) {
        logger.error('ChatService 초기화 실패:', error);
      }
    };

    initService();
    return () => {
      chatService.current = null;
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 로그 창이 열릴 때 스크롤을 최하단으로
    if (isLogsVisible && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [isLogsVisible]);

  const scrollToBottom = () => {
    if (shouldAutoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 50;
    
    // 사용자가 스크롤을 위로 올리면 자동 스크롤 비활성화
    setShouldAutoScroll(isAtBottom);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatService.current) return;

    const userMessage = input;
    setInput('');
    
    // 사용자 메시지 추가
    onMessagesChange([...messages, { content: userMessage, isBot: false }]);

    setIsLoading(true);
    try {
      // AI 응답 처리
      const response = await chatService.current.processMessage(
        sessionId.current,
        userMessage,
        (response) => {
          if (typeof response === 'string') {
            // 스트리밍 처리는 여기서 하지 않음
          }
        }
      );

      // AI 응답 추가
      onMessagesChange([
        ...messages,
        { content: userMessage, isBot: false },
        { content: response, isBot: true }
      ]);
    } catch (error) {
      logger.error('메시지 처리 중 오류:', error);
      onMessagesChange([
        ...messages,
        { content: userMessage, isBot: false },
        { content: "죄송합니다. 오류가 발생했습니다.", isBot: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleLogs = () => {
    setIsLogsVisible(!isLogsVisible);
  };

  const handleDownloadLogs = () => {
    logger.downloadLogs();
  };

  const handleClearLogs = () => {
    logger.clearLogs();
  };

  const handleCopyLogs = async () => {
    try {
      const formattedLogs = logger.getLogs().map(log => {
        const dataStr = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : '';
        return `[${log.timestamp}] ${log.level}: ${log.message}${dataStr}`;
      }).join('\n\n');

      await navigator.clipboard.writeText(formattedLogs);
      alert('로그가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('로그 복사 중 오류:', error);
      alert('로그 복사 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="flex flex-col h-[600px] relative">
      <div className="flex justify-between items-center p-4 border-b">
        <div>
          <h2 className="text-xl font-bold text-gray-800">대화형 예약 시스템</h2>
          <p className="text-sm text-gray-600">대화를 통해 토론방을 예약해보세요!</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleToggleLogs}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {isLogsVisible ? '로그 숨기기' : '로그 보기'}
          </button>
          <button
            onClick={handleCopyLogs}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            로그 복사
          </button>
          <button
            onClick={handleDownloadLogs}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            로그 다운로드
          </button>
          <button
            onClick={handleClearLogs}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            로그 지우기
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[80%] ${message.isBot ? 'mr-auto' : 'ml-auto'}`}>
                <ChatMessage
                  message={message.content}
                  isBot={message.isBot}
                />
              </div>
            </div>
          ))}
        </div>
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t bg-white">
        <div className="flex space-x-4 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isLoading ? '처리중...' : '전송'}
          </button>
        </div>
      </form>

      {/* LogViewer 컴포넌트 사용 */}
      <LogViewer isVisible={isLogsVisible} />
    </div>
  );
} 