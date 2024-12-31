import { ChatOpenAI } from "@langchain/openai";
import { ChatSessionEntity, ReservationState } from '../entity/ChatSessionEntity';
import { IReservationTool } from '../tools/interfaces/IReservationTool';
import { SQLiteReservationTool } from '../tools/implementations/SQLiteReservationTool';
import { ReservationTools } from '../tools/ToolDefinitions';
import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ReservationInfo } from '../types/ReservationTypes';
import { logger } from '@/utils/logger';
import { MessageParsingTool } from '../tools/MessageParsingTool';

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

# 예약 처리 절차
1. 사용자의 요청이 "가장 빠른 시간", "최대한 빨리", "아무 때나", "빨리" 등의 표현을 포함하거나, 시간을 구체적으로 명시하지 않은 경우에는 반드시 find_next_available 도구를 먼저 사용하여 자동으로 예약 정보를 채워주세요.
2. 구체적인 시간이 명시된 경우에는 check_availability 도구로 예약 가능 여부를 먼저 확인하세요.
3. 예약 가능한 경우에만 create_reservation 도구를 사용하세요.
4. 예약 불가능한 경우 예약 가능한 다른 시간을 안내하세요.

# 주의사항
- 예약 가능 여부를 확인하지 않고 절대 답변하지 마세요.
- 모든 필수 정보가 수집되면 반드시 예약 가능 여부를 확인하세요.
- 사용자의 의도를 파악하여 자연스럽게 대화를 이어가며 필요한 정보를 수집하세요.
- "가장 빠른 시간에", "최대한 빨리" 등의 요청이 있으면 find_next_available을 사용하세요.`;

  constructor() {
    logger.log('ChatService 초기화 시작');
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
        returnIntermediateSteps: true,
        maxIterations: 5
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
        
        logger.log('메시지 처리 시작 - 현재 상태:', {
            sessionId,
            message,
            currentState: session.getReservationState(),
            currentInfo: session.getReservationInfo(),
            timestamp: new Date().toISOString()
        });

        session.addMessage('user', message);
        
        // 정보 수집 상태일 때 파싱 및 업데이트
        if (session.getReservationState() === ReservationState.COLLECTING_INFO) {
            await this.updateSessionInfo(session, message);
        }

        // Agent 컨텍스트 구성 및 호출
        const currentInfo = session.getReservationInfo();
        const agentContext = this.buildAgentContext(session);
        
        logger.log('Agent 호출 전 현재 정보:', {
            sessionId,
            info: currentInfo,
            hasDate: !!currentInfo.date,
            dateValue: currentInfo.date?.toISOString()
        });

        // Agent 호출 시 메타데이터에 현재 세션 정보 포함
        const result = await this.agent?.invoke({
            input: agentContext,
            metadata: {
                sessionInfo: currentInfo,
                sessionId: sessionId
            }
        });

        if (!result) throw new Error('Agent 응답 없음');
        
        const response = result.output;
        session.addMessage('assistant', response);

        await this.handleAgentResponse(session, response);
        await this.streamResponse(response, onStream);
        
        return response;

    } catch (error) {
        return this.handleError(error, onStream);
    }
  }

  private async updateSessionInfo(session: ChatSessionEntity, message: string): Promise<void> {
    // 날짜 파싱
    const dateResult = await MessageParsingTool.parseDateString(message);
    if (dateResult.date && dateResult.confidence >= 0.7) {
        const prevInfo = session.getReservationInfo();
        session.updateReservationInfo({ 
            ...prevInfo,
            date: dateResult.date 
        });
        
        logger.log('날짜 정보 업데이트:', {
            sessionId: session.getSessionId(),
            date: dateResult.date,
            confidence: dateResult.confidence
        });
    }
    
    // 다른 예약 정보 파싱
    const parsedInfo = await MessageParsingTool.parseReservationInfo(message);
    if (Object.keys(parsedInfo).length > 0) {
        const prevInfo = session.getReservationInfo();
        session.updateReservationInfo({
            ...prevInfo,
            ...parsedInfo
        });
        
        logger.log('예약 정보 업데이트:', {
            sessionId: session.getSessionId(),
            updatedInfo: parsedInfo
        });
    }
  }

  private buildAgentContext(session: ChatSessionEntity): string {
    const info = session.getReservationInfo();
    const recentMessages = session.getRecentMessages(5);
    
    const contextParts = [];

    if (Object.keys(info).length > 0) {
        contextParts.push('현재 예약 정보:');
        if (info.date) {
            contextParts.push(`- 날짜: ${info.date.toISOString().split('T')[0]}`);
        }
        if (info.startTime) contextParts.push(`- 시작 시간: ${info.startTime}`);
        if (info.duration) contextParts.push(`- 예약 시간: ${info.duration}시간`);
        if (info.roomId) contextParts.push(`- 방 번호: ${info.roomId}번`);
        if (info.userName) contextParts.push(`- 예약자: ${info.userName}`);
        if (info.content) contextParts.push(`- 목적: ${info.content}`);
        contextParts.push('');
    }

    contextParts.push('최근 대화:');
    recentMessages.forEach(msg => {
        contextParts.push(`${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`);
    });

    return contextParts.join('\n');
  }

  private async handleError(error: unknown, onStream: (token: string) => void): Promise<string> {
    logger.error('Error in processMessage:', error);
    let response = "송합니다. 처리 중 오류가 발생했습니다.";
    
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

  private async handleAgentResponse(session: ChatSessionEntity, agentResponse: string): Promise<void> {
    const currentInfo = session.getReservationInfo();
    const currentState = session.getReservationState();
    
    // 필수 정보 체크 로직 개선
    const hasAllRequiredInfo = this.checkRequiredInfo(currentInfo);
    
    if (currentState === ReservationState.COLLECTING_INFO && hasAllRequiredInfo) {
      logger.log('모든 필수 정보 수집 완료, CONFIRMING 상태로 전환', {
        sessionId: session.getSessionId(),
        info: currentInfo
      });
      session.setReservationState(ReservationState.CONFIRMING);
      
      // 예약 가능 여부 최종 확인
      const availability = await this.reservationTool.checkAvailability(
        currentInfo.date!,
        currentInfo.startTime,
        currentInfo.roomId
      );

      if (!availability.available) {
        session.setReservationState(ReservationState.COLLECTING_INFO);
        throw new Error('선택하신 시간은 이미 예약되었습니다.');
      }
    }
  }

  private checkRequiredInfo(info: ReservationInfo): boolean {
    return !!(
      info.date && 
      info.startTime && 
      info.duration && 
      info.roomId && 
      info.userName && 
      info.content
    );
  }
} 