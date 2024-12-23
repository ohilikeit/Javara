// import { logger } from '@/utils/logger';

export interface ReservationInfo {
  date?: Date;
  timeRange?: string;
  startTime?: string;
  duration?: number;
  roomId?: number;
  userName?: string;
  content?: string;
}

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
    this.reservationInfo = {
      ...this.reservationInfo,
      ...info
    };

    logger.log('예약 정보 업데이트 완료:', {
      userId: this.sessionId,
      currentState: this.reservationInfo
    });
  }

  getReservationInfo(): ReservationInfo {
    return this.reservationInfo;
  }

  setReservationState(state: ReservationState): void {
    this.reservationState = state;
  }

  getReservationState(): ReservationState {
    return this.reservationState;
  }

  clearReservationInfo(): void {
    this.reservationInfo = {};
    this.reservationState = ReservationState.COLLECTING_INFO;
  }
} 