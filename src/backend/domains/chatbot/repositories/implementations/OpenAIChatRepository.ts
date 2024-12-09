import { ChatOpenAI } from "@langchain/openai";
import { IChatRepository, ChatMessage, ChatResponse, StreamCallback } from "../IChatRepository";
import { logger } from '@/utils/logger';
import { ReservationTools } from '../../tools/ToolDefinitions';
import { SQLiteReservationTool } from '../../tools/implementations/SQLiteReservationTool';
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatSessionEntity, ReservationInfo } from '../entity/ChatSessionEntity';
import { RunnableSequence } from "@langchain/core/runnables";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { AgentStep } from "@langchain/core/agents";
export class OpenAIChatRepository implements IChatRepository {
  private static instance: OpenAIChatRepository;
  private model: ChatOpenAI;
  private messageHistory: { role: 'system' | 'user' | 'assistant', content: string }[] = [];
  private agent: AgentExecutor | null = null;
  private reservationTool: SQLiteReservationTool;
  private maxRetries = 2;
  private retryCount = 0;
  private sessions: Map<string, ChatSessionEntity> = new Map();

  private constructor() {
    try {
      const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY?.trim();
      
      if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 50) {
        throw new Error('유효하지 않은 OpenAI API 키입니다. 올바른 API 키를 설정해주세요.');
      }

      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        streaming: true,
      });

      this.sessions = new Map();
      this.messageHistory = [{
        role: 'system',
        content: `당신은 토론방 예약 시스템의 상담원입니다.
        
        추가 지침:
        1. 이전 대화에서 확인된 정보를 우선적으로 활용하세요.
        2. 날짜가 이미 확인된 경우, 해당 날짜를 기준으로 예약을 진행하세요.
        3. 새로운 정보는 기존 정보를 대체하지 않고 보완하는 방식으로 처리하세요.
        4. 모든 도구 사용 시 이전 컨텍스트를 반드시 참조하세요.`
      }];
      this.reservationTool = new SQLiteReservationTool();

      this.initializeAgent();

    } catch (error) {
      console.error('OpenAIChatRepository 초기화 실패:', error);
      throw error;
    }
  }

  private async initializeAgent() {
    try {
      const tools = new ReservationTools().getTools();
      const agentWithScratchpad = RunnableSequence.from([
        {
          input: (i: { input: string; agent_scratchpad?: AgentStep[] }) => i.input,
          agent_scratchpad: (i: { input: string; agent_scratchpad?: AgentStep[] }) =>
            formatToOpenAIFunctionMessages(i.agent_scratchpad || [])
        },
        await createOpenAIFunctionsAgent({
          llm: this.model,
          tools,
          prompt: ChatPromptTemplate.fromMessages([
            ["system", this.messageHistory[0].content],
            ["human", "{input}"],
            ["assistant", "{agent_scratchpad}"]
          ])
        })
      ]);

      this.agent = AgentExecutor.fromAgentAndTools({
        agent: agentWithScratchpad,
        tools,
        verbose: true
      });

    } catch (error) {
      console.error('Agent 초기화 실패:', error);
      throw error;
    }
  }

  public static getInstance(): OpenAIChatRepository {
    logger.log('OpenAIChatRepository.getInstance 호출');
    if (!OpenAIChatRepository.instance) {
      logger.log('새 OpenAIChatRepository 인스턴스 생성');
      OpenAIChatRepository.instance = new OpenAIChatRepository();
    }
    return OpenAIChatRepository.instance;
  }

  async sendMessage(message: ChatMessage, onStream: StreamCallback): Promise<ChatResponse> {
    try {
      logger.log('sendMessage 시작', {
        userId: message.userId,
        content: message.content,
        timestamp: message.timestamp
      });

      let session = this.sessions.get(message.userId);
      if (!session) {
        logger.log('새 세션 생성');
        session = new ChatSessionEntity(message.userId);
        this.sessions.set(message.userId, session);
      }

      // 메시지 히스토리에 추가
      session.addMessage('user', message.content);
      
      // 현재 예약 정보 가져오기
      const currentInfo = session.getReservationInfo();
      
      // Agent 컨텍스트 구성
      const contextMessage = this.buildContextMessage(message.content, currentInfo, session.getRecentMessages(5));

      // Agent 실행 전 컨텍스트 로깅
      logger.log('Agent 컨텍스트:', contextMessage);

      // Agent 실행 시 로깅 추가
      const result = await this.agent?.invoke({
        input: contextMessage,
        callbacks: [{
          handleLLMNewToken: (token: string) => {
            logger.log('스트리밍 토큰:', token);
            onStream(token);
          }
        }]
      });

      logger.log('Agent 응답:', result);

      if (!result) throw new Error('Agent 응답 없음');

      // 응답 저장
      const response = {
        content: result.output,
        userId: 'bot',
        timestamp: new Date()
      };

      session.addMessage('assistant', response.content);
      return response;

    } catch (error) {
      logger.error('sendMessage 에러:', error);
      throw error;
    }
  }

  private buildContextMessage(
    message: string,
    reservationInfo: ReservationInfo,
    recentMessages: Array<{role: 'user' | 'assistant', content: string}>
  ): string {
    const contextParts = [];

    // 예약 정보 포함
    if (Object.keys(reservationInfo).length > 0) {
      contextParts.push('현재 예약 정보:');
      Object.entries(reservationInfo).forEach(([key, value]) => {
        if (value !== undefined) {
          contextParts.push(`${key}: ${value instanceof Date ? value.toLocaleDateString() : value}`);
        }
      });
      contextParts.push('');
    }

    // 최근 대화 내 포함
    contextParts.push('최근 대화:');
    recentMessages.forEach(msg => {
      contextParts.push(`${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`);
    });
    contextParts.push('');

    // 현재 메시지 추가
    contextParts.push(`현재 메시지: ${message}`);

    return contextParts.join('\n');
  }

  // 대화 히스토리 ���리 메서드 추가
  public clearHistory(): void {
    this.messageHistory = [this.messageHistory[0]]; // 시스템 프롬프트만 유지
  }

  public getHistory(): Array<{ role: 'system' | 'user' | 'assistant', content: string }> {
    return [...this.messageHistory];
  }
} 