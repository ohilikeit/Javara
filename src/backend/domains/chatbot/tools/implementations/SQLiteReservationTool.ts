import { IReservationTool } from '../interfaces/IReservationTool';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { DateUtils } from '../../utils/dateUtils';
import { CreateReservationParams } from '../../types/ReservationTypes';
import { PrismaClient } from '@prisma/client';

export class SQLiteReservationTool implements IReservationTool {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    logger.log('SQLiteReservationTool initialized');
  }

  async checkAvailability(date: Date, startTime?: string, roomId?: number) {
    try {
      logger.log('checkAvailability 상세 정보:', {
        inputDate: date,
        startTime,
        roomId
      });

      const targetDate = date && !isNaN(date.getTime()) ? date : new Date();
      
      // YYYYMMDDHHMM 형식으로 변환
      const dateStr = format(targetDate, 'yyyyMMdd');
      const timeStr = startTime ? startTime.replace(':', '') : '0900';
      const formattedDateTime = `${dateStr}${timeStr}`;

      logger.log('변환된 예약 시간:', {
        dateStr,
        timeStr,
        formattedDateTime
      });

      const response = await fetch('/api/reservation/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: formattedDateTime,  // "202412271100" 형식으로 전송
          roomId: roomId
        }),
      });

      if (!response.ok) {
          const errorData = await response.json();
          logger.error('가용성 확인 API 오류:', errorData);
          throw new Error(errorData.error || '가용성 확인 중 오류가 발생했습니다.');
      }

      const result = await response.json();
      logger.log('가용성 확인 결과:', result);

      if (!result.success) {
          throw new Error(result.error || '가용성 확인 실패');
      }

      return {
          available: result.data.available,
          availableSlots: result.data.availableSlots.map((slot: any) => ({
              roomId: slot.roomId,
              startTime: slot.startTime,
              endTime: slot.endTime
          }))
      };

    } catch (error) {
        logger.error('checkAvailability 에러:', error);
        throw error;
    }
  }

  async createReservation(info: CreateReservationParams): Promise<boolean> {
    try {
      // 날짜와 시간을 YYYYMMDDHHMM 형식으로 변환
      const dateStr = format(info.date, 'yyyyMMdd');
      const startTimeStr = info.startTime.replace(':', '');
      const startDateTime = `${dateStr}${startTimeStr}`;
      
      // 종료 시간 계산 (duration 시간 후)
      const endTimeHour = parseInt(info.startTime.split(':')[0]) + info.duration;
      const endTimeStr = `${endTimeHour.toString().padStart(2, '0')}00`;
      const endDateTime = `${dateStr}${endTimeStr}`;

      logger.log('예약 생성 요청:', {
        startDateTime,
        endDateTime,
        roomId: info.roomId,
        userName: info.userName,
        content: info.content
      });

      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: startDateTime,  // "202412271100" 형식
          endTime: endDateTime,      // "202412271300" 형식
          roomId: info.roomId,
          userName: info.userName,
          content: info.content,
          userId: 1,
          status: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error('예약 생성 API 오류:', errorData);
        throw new Error(errorData.error || '예약 생성에 실패했습니다.');
      }

      const result = await response.json();
      return result.success;

    } catch (error) {
      logger.error('예약 생성 중 에러:', error);
      throw error;
    }
  }

  async findNextAvailable(options: {
    timeRange: "morning" | "afternoon" | "all";
    preferredRoom?: number;
    startFrom: Date;
  }): Promise<{
    availableSlots: Array<{
      date: string;
      roomId: number;
      startTime: string;
      endTime: string;
    }>;
  }> {
    try {
      const isoDate = format(options.startFrom, 'yyyy-MM-dd');
      
      // 시간대별 시작/종료 시간 설정
      const timeRanges = {
        morning: { start: '09:00', end: '12:00' },
        afternoon: { start: '13:00', end: '18:00' },
        all: { start: '09:00', end: '18:00' }
      };

      const range = timeRanges[options.timeRange];
      const startDateTime = DateUtils.toReservationDateTime(new Date(isoDate), range.start);
      const endDateTime = DateUtils.toReservationDateTime(new Date(isoDate), range.end);

      const response = await fetch('/api/reservation/find-next', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startDateTime,
          endTime: endDateTime,
          preferredRoom: options.preferredRoom
        })
      });

      if (!response.ok) {
        throw new Error('가용성 확인 실패');
      }

      const result = await response.json();
      return result.data;

    } catch (error) {
      logger.error('findNextAvailable 에러:', error);
      throw error;
    }
  }

  async createButtonReservation(info: {
    date: string | Date;
    startTime: string;
    duration: number;
    roomId: number;
  }): Promise<boolean> {
    try {
      logger.log('createButtonReservation 호출됨:', info);

      const requestBody = {
        selectedDate: typeof info.date === 'string' ? info.date : info.date.toISOString().split('T')[0],
        selectedTime: info.startTime,
        duration: info.duration,
        roomId: info.roomId
      };

      logger.log('API 요청 데이터:', requestBody);

      const result = await fetch('/api/reservation/button-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.error || '예약 생성에 실패했습니다.');
      }

      const responseData = await result.json();
      return responseData.success;

    } catch (error) {
      logger.error('예약 버튼 생성 중 에러 발생:', error);
      throw error;
    }
  }

  async searchAvailableRooms(info: {
    date: string | Date;
    startTime: string;
  }): Promise<Array<{ roomId: number; roomName: string; capacity: number }>> {
    try {
      logger.log('searchAvailableRooms 호출됨:', info);

      const requestBody = {
        selectedDate: typeof info.date === 'string' ? info.date : info.date.toISOString().split('T')[0],
        selectedTime: info.startTime
      };

      logger.log('API 요청 데이터:', requestBody);

      const result = await fetch('/api/reservation/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!result.ok) {
        const errorData = await result.json();
        throw new Error(errorData.error || '방 검색에 실패���습니다.');
      }

      const responseData = await result.json();
      return responseData.data;

    } catch (error) {
      logger.error('방 검색 중 에러 발생:', error);
      throw error;
    }
  }
} 