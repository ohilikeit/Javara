import { DateParsingTool } from './implementations/DateParsingTool';
import { logger } from '@/utils/logger';
import { ReservationInfo } from '../types/ReservationTypes';

export class MessageParsingTool {
  static async parseDateString(input: string, currentDate: Date = new Date()): Promise<{ date: Date | null; confidence: number }> {
    try {
      // DateParsingTool을 통한 날짜 파싱
      const result = await DateParsingTool.parseDateString(input, currentDate);
      return {
        date: result.date,
        confidence: result.confidence
      };
    } catch (error) {
      logger.error('날짜 파싱 실패:', error);
      return { date: null, confidence: 0 };
    }
  }

  static async parseReservationInfo(message: string): Promise<Partial<ReservationInfo>> {
    try {
      const info: Partial<ReservationInfo> = {};
      
      // 시간 파싱 개선
      const timeMatch = message.match(/(?:오전|오후)?\s*(\d{1,2})시(?:부터|까지)?/);
      if (timeMatch) {
        const hour = parseInt(timeMatch[1]);
        const isAfternoon = message.includes('오후');
        const adjustedHour = isAfternoon ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);
        if (adjustedHour >= 9 && adjustedHour <= 17) {
          info.startTime = `${adjustedHour.toString().padStart(2, '0')}:00`;
        }
      }

      // 기간 파싱 개선
      const durationMatch = message.match(/(\d+)\s*시간/);
      if (durationMatch) {
        const duration = parseInt(durationMatch[1]);
        if (duration >= 1 && duration <= 9) {
          info.duration = duration;
        }
      }

      // 방 번호 파싱
      const roomMatch = message.match(/(\d+)(?:번|호|실)?(?:\s*방)?/);
      if (roomMatch) {
        const roomId = parseInt(roomMatch[1]);
        if ([1, 4, 5, 6].includes(roomId)) {
          info.roomId = roomId;
        }
      }

      // 이름과 목적 파싱 개선
      const nameMatch = message.match(/(?:저는|난?)\s*([가-힣a-zA-Z]+)(?:이?(?:고|예요|입니다|야))/);
      if (nameMatch) {
        info.userName = nameMatch[1];
      }

      // 회의 목적 파싱 개선
      const purposeMatch = message.match(/(?:크리스마스|솔루션|전략|회의|미팅|토론|세미나|교육|강의|발표)(?:\s*(?:할(?:거야|예정|계획))?)/);
      if (purposeMatch) {
        info.content = purposeMatch[0].trim();
      }

      return info;
    } catch (error) {
      logger.error('예약 정보 파싱 실패:', error);
      return {};
    }
  }
} 