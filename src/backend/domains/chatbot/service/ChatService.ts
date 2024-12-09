import { ChatOpenAI } from "@langchain/openai";
import { ChatSessionEntity } from '../entity/ChatSessionEntity';
import { IReservationTool } from '../tools/interfaces/IReservationTool';
import { SQLiteReservationTool } from '../tools/implementations/SQLiteReservationTool';
import { ReservationTools } from '../tools/ToolDefinitions';
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ReservationState } from '../entity/ChatSessionEntity';
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { formatToOpenAIFunctionMessages } from "langchain/agents/format_scratchpad";
import { ReservationInfo } from '../types/ReservationTypes';
import { AgentStep } from 'langchain/agents';
import { logger } from '@/utils/logger';
import { DateParsingTool } from '../tools/implementations/DateParsingTool';

type StreamCallback = (token: string) => void;

export class ChatService {
  private static instance: ChatService | null = null;
  private model: ChatOpenAI;
  private reservationTool: IReservationTool;
  private sessions: Map<string, ChatSessionEntity>;
  private agent: AgentExecutor | null = null;
  private isCreatingReservation: boolean = false;
  private readonly systemPrompt = `당신은 토론방 예약 시스템의 상담원입니다. 항상 친절하게 응답해주세요.

  # 예약 관련 준수사항
  - 예약에 필요한 정보: 날짜(필수), 사용시간대(필수), 토론방번호(1,4,5,6중 선택), 예약자이름(필수), 회의내용(필수)
  - 예약 가능 시간: 평일 9시~18시
  - 시간 단위: 1시간
  - 토론방 예약과 관련없는 질문에는 친절하게 토론방과 관련된 문의를 부탁드린다고 응답하고 원하는 정보를 유도해주세요.
  - 모든 필수 정보가 수집되면 예약 가능 여부를 확인하고 예약을 진행하세요.
  - 사용자의 의도를 파악하여 자연스럽게 대화를 이어가며 필요한 정보를 수집하세요.
  - 방 번호는 1,4,5,6 중 하나 중 아무거나 상관없이 비어있다면 자유롭게 선택해주세요.`;

  constructor() {
    console.log('ChatService 초기화 시작');
    const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    
    if (!apiKey || !apiKey.startsWith('sk-')) {
      throw new Error('유효한 OpenAI API 키가 필요합니다.');
    }

    this.sessions = new Map();
    
    try {
      this.model = new ChatOpenAI({
        openAIApiKey: apiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.7,
        streaming: true,
      });
      logger.log('ChatOpenAI 모델 초기화 성공');

      this.reservationTool = new SQLiteReservationTool();
      logger.log('SQLiteReservationTool 초기화 성공');

      this.initializeAgent().then(() => {
        logger.log('Agent 초기화 완료');
      }).catch(error => {
        logger.error('Agent 초기화 실패:', error);
      });
    } catch (error) {
      logger.error('ChatService 초기화 실패:', error);
      throw error;
    }
  }

  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  private async initializeAgent() {
    try {
      logger.log('Agent 초기화 시작');
      const tools = new ReservationTools().getTools();
      logger.log('Tools 생성 완료:', tools.map(t => t.name));
      
      const agent = await createOpenAIFunctionsAgent({
        llm: this.model,
        tools,
        prompt: ChatPromptTemplate.fromMessages([
          ["system", this.systemPrompt],
          ["human", "{input}"],
          ["assistant", "{agent_scratchpad}"]
        ])
      });

      this.agent = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        verbose: true,
        maxIterations: 3,
        returnIntermediateSteps: true
      });

      logger.log('Agent 초기화 완료');
    } catch (error) {
      logger.error('Agent 초기화 실패:', error);
      throw error;
    }
  }

  private getOrCreateSession(sessionId: string): ChatSessionEntity {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, new ChatSessionEntity(sessionId));
    }
    return this.sessions.get(sessionId)!;
  }

  async processMessage(sessionId: string, message: string, onStream: (token: string) => void): Promise<string> {
    try {
        const session = this.getOrCreateSession(sessionId);
        session.addMessage('user', message);

        // 날짜 파싱
        const date = await DateParsingTool.parseDateString(message);
        
        if (date) {
            // 주말 체크
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                const response = "죄송합니다. 주말은 예약이 불가능합니다. 평일(월~금)에 예약해주시겠어요?";
                await this.streamResponse(response, onStream);
                return response;
            }

            // 날짜가 유효한 경우 예약 정보 업데이트
            session.updateReservationInfo({ date });
        }

        // 나머지 예약 처리 로직...
        const agentContext = this.buildAgentContext(session);
        const result = await this.agent?.invoke({
            input: agentContext
        });

        if (!result) throw new Error('Agent 응답 없음');

        const response = result.output;
        session.addMessage('assistant', response);
        await this.streamResponse(response, onStream);
        return response;

    } catch (error) {
        return this.handleError(error, onStream);
    }
  }

  private buildAgentContext(session: ChatSessionEntity): string {
    const info = session.getReservationInfo();
    const recentMessages = session.getRecentMessages(5);
    
    const contextParts = [];

    // 예약 정보 컨텍스트
    if (Object.keys(info).length > 0) {
      contextParts.push('현재까지 확인된 예약 정보:');
      if (info.date) contextParts.push(`- 날짜: ${info.date instanceof Date ? info.date.toLocaleDateString() : new Date(info.date).toLocaleDateString()}`);
      if (info.timeRange) contextParts.push(`- 시간대: ${info.timeRange}`);
      if (info.startTime) contextParts.push(`- 시작 시간: ${info.startTime}`);
      if (info.duration) contextParts.push(`- 사용 시간: ${info.duration}시간`);
      if (info.roomId) contextParts.push(`- 토론방: ${info.roomId}번`);
      if (info.userName) contextParts.push(`- 예약자: ${info.userName}`);
      if (info.content) contextParts.push(`- 목적: ${info.content}`);
      contextParts.push('');
    }

    // 최근 대화 이력
    contextParts.push('최근 대화 내역:');
    recentMessages.forEach(msg => {
      contextParts.push(`${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`);
    });
    contextParts.push('');

    return contextParts.join('\n');
  }

  private async parseReservationInfo(message: string, currentInfo: ReservationInfo): Promise<Partial<ReservationInfo>> {
    try {
      const parsedInfo: Partial<ReservationInfo> = {};
      
      // 날짜 파싱
      const date = await DateParsingTool.parseDateString(message, 
        "사용자의 메시지에서 토론방 예약을 위한 날짜 정보를 추출해주세요.");
      
      if (date) {
        // 영업일 및 예약 기간 검증
        if (!DateParsingTool.validateBusinessDay(date)) {
          throw new Error("주말은 예약이 불가능합니다.");
        }
        if (!DateParsingTool.isWithinReservationPeriod(date)) {
          throw new Error("예약은 오늘부터 2주 이내만 가능합니다.");
        }
        parsedInfo.date = date;
      }

      // 나머지 정보 파싱 로직...
      
      return parsedInfo;
    } catch (error) {
      logger.log('예약 정보 파싱 실패:', error);
      throw error;
    }
  }

  private async handleGeneralConversation(
    session: ChatSessionEntity,
    message: string,
    onStream: (token: string) => void
  ): Promise<string> {
    try {
      // 현재 예약 정보를 컨텍스트에 포함
      const reservationInfo = session.getReservationInfo();
      const contextMessage = this.buildContextMessage(message, reservationInfo);

      const result = await this.agent?.invoke({
        input: contextMessage
      });

      if (!result) throw new Error('Agent 응답 없음');

      // 응답 처리
      const response = {
        type: 'text',
        content: result.output
      };
      
      session.addMessage('assistant', JSON.stringify(response));
      return JSON.stringify(response);
    } catch (error) {
      logger.error('일반 대화 처리 중 오류:', error);
      throw error;
    }
  }

  private buildContextMessage(message: string, reservationInfo: ReservationInfo): string {
    const context = [];
    
    if (reservationInfo.date) {
      const dateObj = reservationInfo.date instanceof Date ? reservationInfo.date : new Date(reservationInfo.date);
      context.push(`예약 날짜: ${dateObj.toLocaleDateString()}`);
    }
    if (reservationInfo.timeRange) {
      context.push(`시간대: ${reservationInfo.timeRange === 'morning' ? '오전' : '오후'}`);
    }
    if (reservationInfo.startTime) {
      context.push(`시작 시간: ${reservationInfo.startTime}`);
    }
    if (reservationInfo.duration) {
      context.push(`사용 시간: ${reservationInfo.duration}시간`);
    }
    if (reservationInfo.roomId) {
      context.push(`회의실: ${reservationInfo.roomId}번`);
    }
    if (reservationInfo.userName) {
      context.push(`예약자: ${reservationInfo.userName}`);
    }
    if (reservationInfo.content) {
      context.push(`목적: ${reservationInfo.content}`);
    }

    const contextStr = context.length > 0 ? 
      `현재까지 확인된 예약 정보:\n${context.join('\n')}\n\n` : '';

    return `${contextStr}사자 메시지: ${message}`;
  }

  private async handleError(error: unknown, onStream: (token: string) => void): Promise<string> {
    logger.error('Error in processMessage:', error);
    let response = "죄송합니다. 처리 중 오류가 발생했습니다.";
    
    if (error instanceof Error) {
        if (error.message.includes('2주')) {
            response = "예약은 오늘부터 2주 이내만 가능합니다. 다른 날짜를 선택해주세요.";
        }
    }

    await this.streamResponse(response, onStream);
    return response;
  }

  private async streamResponse(response: string, onStream: (token: string) => void): Promise<void> {
    for (const char of response) {
      onStream(char);
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }

  private async createReservation(
    session: ChatSessionEntity,
    onStream: (token: string) => void
  ): Promise<string> {
    const info = session.getReservationInfo();
    const reservationKey = `${info.date?.toISOString()}_${info.startTime}_${info.roomId}`;
    
    try {
      // 예약 정보 유효성 검증
      if (!info.date || !info.startTime || !info.duration || 
          !info.roomId || !info.userName || !info.content) {
        throw new Error('필수 예약 정보가 누락되었습니다.');
      }

      // 중복 예약 방지를 위한 락 확인
      if (this.isCreatingReservation) {
        const response = "이미 예약 처리가 진행 중입니다. 잠시만 기다려주세요.";
        await this.streamResponse(response, onStream);
        return response;
      }

      this.isCreatingReservation = true;
      logger.log(`예약 생성 시작: ${reservationKey}`);

      try {
        // 세션 상태 확인
        if (session.getReservationState() !== ReservationState.CONFIRMING) {
          throw new Error('잘못된 예약 상태입니다.');
        }

        // 최종 가용성 재확인
        const availability = await this.reservationTool.checkAvailability(
          info.date,
          info.startTime,
          info.roomId
        );

        if (!availability.available) {
          throw new Error('선택하신 시간대는 이미 예되었습니다.');
        }

        // 예약 생성 시도
        const success = await this.reservationTool.createReservation({
          date: info.date,
          startTime: info.startTime,
          duration: info.duration,
          roomId: info.roomId,
          userName: info.userName,
          content: info.content
        });

        if (!success) {
          throw new Error('예약 생성에 실패했습니다.');
        }

        // 예약 성공 처리
        const response = `예약이 완료되었습니다! \n\n` +
          `- **예약자 이름:** ${info.userName}\n` +
          `- **회의 목적:** ${info.content}\n` +
          `- **예약 날짜:** ${info.date.toLocaleDateString('ko-KR')}\n` +
          `- **예약 시간:** ${info.startTime} - ${this.calculateEndTime(info.startTime, info.duration)}\n` +
          `- **방 번호:** ${info.roomId}번 방\n\n` +
          `추가로 궁금한 점이 있으시면 언제든지 문의해 주세요!`;
        
        await this.streamResponse(response, onStream);
        
        // 세션 초기화
        session.clearReservationInfo();
        session.setReservationState(ReservationState.COLLECTING_INFO);
        
        logger.log(`예약 생성 완료: ${reservationKey}`);
        return response;

      } catch (error) {
        logger.error(`예약 생성 실패: ${reservationKey}`, error);
        throw error;
      } finally {
        this.isCreatingReservation = false;
        logger.log(`예약 처리 종료: ${reservationKey}`);
      }
    } catch (error) {
      return await this.handleError(error, onStream);
    }
  }

  private calculateEndTime(startTime: string, duration: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endHour = hours + duration;
    return `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  async handleReservationResponse(response: any, onStream: StreamCallback) {
    const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;

    if (parsedResponse.success && parsedResponse.reservationCompleted) {
      // 예약이 완료된 경우, 추가 요청을 하지 않고 성공 메시지만 표시
      const details = parsedResponse.reservationDetails;
      const successMessage = `예약이 완료되었습니다!\n\n` +
        `- **예약자 이름:** ${details.userName}\n` +
        `- **예약 날짜:** ${new Date(details.date).toLocaleDateString('ko-KR')}\n` +
        `- **예약 시간:** ${details.startTime} (${details.duration}시간)\n` +
        `- **방 번호:** ${details.roomId}번 방\n\n` +
        `추가로 궁금 점이 있으시면 언제든지 문의해 주세요!`;

      await this.streamResponse(successMessage, onStream);
      return successMessage;
    }

    // 예약이 완료되지 않은 경우 기존 로직 수행
    return await this.handleError(parsedResponse, onStream);
  }

  // 헬퍼 메소드 추가
  private getThisWeekday(targetDay: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    const distance = targetDay - currentDay;
    const result = new Date(today);
    result.setDate(today.getDate() + distance);
    return result;
  }

  private getNextWeekday(targetDay: number): Date {
    const today = new Date();
    const result = new Date(today);
    result.setDate(today.getDate() + (7 - today.getDay()) + targetDay);
    return result;
  }
} 