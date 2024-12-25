import { logger } from '@/utils/logger';
import { ReservationInfo } from '../types/ReservationTypes';


export enum ReservationState {
  COLLECTING_INFO = 'COLLECTING_INFO',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

export class ChatSessionEntity {
  private readonly sessionId: string;
  private messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }> = [];
  private reservationInfo: ReservationInfo = {};
  private reservationState: ReservationState = ReservationState.COLLECTING_INFO;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    logger.log('새로운 ChatSession 생성:', {
      sessionId,
      initialState: this.reservationState
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    this.messages.push({
      role,
      content,
      timestamp: new Date()
    });
  }

  getMessages(): Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }> {
    return [...this.messages];
  }

  getRecentMessages(count: number = 10): Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }> {
    return [...this.messages].slice(-count);
  }

  updateReservationInfo(info: Partial<ReservationInfo>): void {
    const previousInfo = { ...this.reservationInfo };
    this.reservationInfo = {
      ...this.reservationInfo,
      ...info
    };

    logger.log('예약 정보 업데이트:', {
      sessionId: this.sessionId,
      previousInfo,
      newInfo: this.reservationInfo,
      currentState: this.reservationState,
      timestamp: new Date().toISOString()
    });
  }

  getReservationInfo(): ReservationInfo {
    return this.reservationInfo;
  }

  setReservationState(state: ReservationState): void {
    const previousState = this.reservationState;
    this.reservationState = state;
    
    logger.log('예약 상태 설정:', {
      sessionId: this.sessionId,
      previousState,
      newState: state,
      currentInfo: this.getReservationInfo(),
      timestamp: new Date().toISOString()
    });
  }

  getReservationState(): ReservationState {
    return this.reservationState;
  }

  clearReservationInfo(): void {
    logger.log('예약 정보 초기화:', {
      sessionId: this.sessionId,
      previousInfo: this.reservationInfo,
      previousState: this.reservationState
    });

    this.reservationInfo = {};
    this.reservationState = ReservationState.COLLECTING_INFO;

    logger.log('예약 정보 초기화 완료:', {
      sessionId: this.sessionId,
      currentState: this.reservationState
    });
  }
} 