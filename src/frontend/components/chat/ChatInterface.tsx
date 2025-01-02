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
  onMessagesChange: React.Dispatch<React.SetStateAction<
    Array<{
      content: string;
      isBot: boolean;
    }>
  >>;
}

export function ChatInterface({ messages, onMessagesChange }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const [logs, setLogs] = useState(logger.getLogs());

  // ChatService 관련
  const chatService = useRef<ChatService | null>(null);
  const sessionId = useRef<string>(uuidv4());

  // 스크롤 관련
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [lastUserScrollTime, setLastUserScrollTime] = useState<number>(0);

  // 로그 구독
  useEffect(() => {
    const updateLogs = () => {
      setLogs(logger.getLogs());
    };
    logger.addListener(updateLogs);
    return () => {
      logger.removeListener(updateLogs);
    };
  }, []);

  // ChatService 초기화
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

  // 메시지가 추가될 때 자동 스크롤 처리
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom();
    }
  }, [messages, shouldAutoScroll]);

  // 로그 창 열릴 때 최하단 스크롤
  useEffect(() => {
    if (isLogsVisible && logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [isLogsVisible]);

  // 스크롤 위치를 맨 아래로
  const scrollToBottom = () => {
    if (!messagesEndRef.current) return;
    const now = Date.now();
    // 유저가 마지막으로 스크롤 움직인 이후 일정 시간 지났거나, 강제로 해야 하는 경우
    if (now - lastUserScrollTime > 1000 || shouldAutoScroll) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 스크롤 이벤트 핸들러
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

    if (!isAtBottom) {
      setLastUserScrollTime(Date.now());
    }
    if (isAtBottom !== shouldAutoScroll) {
      setShouldAutoScroll(isAtBottom);
    }
  };

  // 스크롤 이벤트 등록
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !chatService.current) return;

    const userMessage = input.trim();
    setInput('');
    // 새 메시지가 들어오면 기본적으로 자동 스크롤 on
    setShouldAutoScroll(true);

    // 사용자 메시지 추가 (함수형 업데이트)
    onMessagesChange(prevMessages => [
      ...prevMessages,
      { content: userMessage, isBot: false }
    ]);

    setIsLoading(true);
    try {
      let streamingMessage = '';
      let lastScrollTime = Date.now();

      // AI 응답 토큰을 스트리밍으로 처리
      const response = await chatService.current.processMessage(
        sessionId.current,
        userMessage,
        (token) => {
          if (typeof token === 'string') {
            streamingMessage += token;
            const now = Date.now();

            // 100ms마다 부분 업데이트 (함수형 업데이트)
            if (now - lastScrollTime > 100) {
              lastScrollTime = now;
              onMessagesChange(prevMessages => {
                // prevMessages의 마지막이 '스트리밍중'인 봇 메시지인지 확인
                const lastMsgIndex = prevMessages.length - 1;
                const newMessages = [...prevMessages];
                // 사용자 메시지 바로 뒤에 봇 메시지를 추가하거나 갱신
                // (직전 봇 메시지가 스트리밍 중이라면 해당 메시지를 업데이트)
                if (lastMsgIndex >= 0 && newMessages[lastMsgIndex].isBot) {
                  newMessages[lastMsgIndex] = {
                    content: streamingMessage,
                    isBot: true
                  };
                } else {
                  newMessages.push({
                    content: streamingMessage,
                    isBot: true
                  });
                }
                return newMessages;
              });
            }
          }
        }
      );

      // 스트리밍이 끝나면 최종 응답으로 갱신
      onMessagesChange(prevMessages => {
        const lastMsgIndex = prevMessages.length - 1;
        const newMessages = [...prevMessages];
        // 직전 봇 메시지가 스트리밍 중이었다면 최종 응답으로 교체
        if (lastMsgIndex >= 0 && newMessages[lastMsgIndex].isBot) {
          newMessages[lastMsgIndex] = {
            content: response,
            isBot: true
          };
        } else {
          newMessages.push({
            content: response,
            isBot: true
          });
        }
        return newMessages;
      });
    } catch (error) {
      logger.error('메시지 처리 중 오류:', error);
      onMessagesChange(prevMessages => [
        ...prevMessages,
        { content: userMessage, isBot: false },
        { content: '죄송합니다. 오류가 발생했습니다.', isBot: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // 로그 표시/숨기기
  const handleToggleLogs = () => {
    setIsLogsVisible(!isLogsVisible);
  };

  // 로그 다운로드
  const handleDownloadLogs = () => {
    logger.downloadLogs();
  };

  // 로그 지우기
  const handleClearLogs = () => {
    logger.clearLogs();
  };

  // 로그 복사
  const handleCopyLogs = async () => {
    try {
      const formattedLogs = logger
        .getLogs()
        .map(log => {
          const dataStr = log.data ? `\nData: ${JSON.stringify(log.data, null, 2)}` : '';
          return `[${log.timestamp}] ${log.level}: ${log.message}${dataStr}`;
        })
        .join('\n\n');

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

      {/* 스크롤 감시를 위한 containerRef 연결 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
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

      {/* LogViewer 컴포넌트 */}
      <LogViewer isVisible={isLogsVisible} />
    </div>
  );
}
