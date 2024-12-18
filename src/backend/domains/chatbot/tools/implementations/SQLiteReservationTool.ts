import { IReservationTool } from '../interfaces/IReservationTool';
import { DateParsingTool } from './DateParsingTool';

import { logger } from '@/utils/logger';
import { format } from 'date-fns';
import { DateUtils } from '../../utils/dateUtils';
import { ReservationValidator } from '../validators/ReservationValidator';

export class SQLiteReservationTool implements IReservationTool {

  constructor() {
    logger.log('SQLiteReservationTool initialized');
  }

  async checkAvailability(date: Date, startTime?: string, roomId?: number) {
    try {
      logger.log('checkAvailability 호출:', { date, startTime, roomId });

      // 날짜와 시간을 YYYYMMDDHHMM 형식으로 변환
      const isoDate = format(date, 'yyyy-MM-dd');
      const reservationStartTime = DateUtils.toReservationDateTime(
        isoDate, 
        startTime || '09:00'
      );

      const response = await fetch('/api/reservation/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: reservationStartTime,
          roomId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '가용성 확인 실패');
      }

      const result = await response.json();
      logger.log('가용성 확인 결과:', result);
      
      return result.data;
    } catch (error) {
      logger.error('checkAvailability 에러:', error);
      throw error;
    }
  }

  async createReservation(info: CreateReservationParams): Promise<boolean> {
    try {
      logger.log('createReservation 호출됨:', info);

      // 날짜와 시간을 YYYYMMDDHHMM 형식으로 변환

      const reservationStartTime = DateUtils.toReservationDateTime(info.date.toISOString().split('T')[0], info.startTime);
      const reservationEndTime = DateUtils.calculateEndTime(reservationStartTime, info.duration);

      logger.log('변환된 예약 시간:', {
        startTime: reservationStartTime,
        endTime: reservationEndTime
      });


      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startTime: reservationStartTime,
          endTime: reservationEndTime,
          roomId: info.roomId,
          userId: 1,
          userName: info.userName,
          content: info.content,
          status: 1
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '예약 생성에 실패했습니다.');
      }

      const data = await response.json();
      return data.success;

    } catch (error) {
      logger.error('예약 생성 중 에러 발생:', error);
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
      const startDateTime = DateUtils.toReservationDateTime(isoDate, range.start);
      const endDateTime = DateUtils.toReservationDateTime(isoDate, range.end);

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
        throw new Error(errorData.error || '방 검색에 실패했습니다.');
      }

      const responseData = await result.json();
      return responseData.data;

    } catch (error) {
      logger.error('방 검색 중 에러 발생:', error);
      throw error;
    }
  }
} 