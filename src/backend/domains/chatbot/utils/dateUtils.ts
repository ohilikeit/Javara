// src/backend/domains/chatbot/utils/dateUtils.ts
import { format, parse, addHours, setHours, setMinutes } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ParsedDateTime, ReservationDateString } from '../types/DateTypes';
import { logger } from '@/utils/logger';

const TIMEZONE = 'Asia/Seoul';

export class DateUtils {
  // ISO 형식(YYYY-MM-DD)과 시간(HH:mm)을 예약 시스템 형식(YYYYMMDDHHMM)으로 변환
  static toReservationDateTime(date: Date | string, time?: string): string {
    try {
      const targetDate = typeof date === 'string' ? new Date(date) : date;
      const dateStr = format(targetDate, 'yyyyMMdd');
      
      // 시간이 제공된 경우 HH:mm 형식에서 HHMM 형식으로 변환
      if (time) {
        const timeStr = time.replace(':', '');
        return `${dateStr}${timeStr}`;
      }
      
      // 시간이 제공되지 않은 경우 기본값 '0900' 사용
      return `${dateStr}0900`;
    } catch (error) {
      logger.error('예약 시간 변환 실패:', {
        date,
        time,
        error
      });
      throw new Error('예약 시간 변환에 실패했습니다.');
    }
  }

  // 예약 시스템 형식을 ISO 날짜와 시간으로 분리
  static fromReservationDateTime(datetime: ReservationDateString): ParsedDateTime {
    try {
      // YYYYMMDDHHMM 형식의 문자열을 파싱
      const year = datetime.substring(0, 4);
      const month = datetime.substring(4, 6);
      const day = datetime.substring(6, 8);
      const hour = datetime.substring(8, 10);
      const minute = datetime.substring(10, 12);

      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );

      return {
        date: format(date, 'yyyy-MM-dd'),
        time: format(date, 'HH:mm')
      };
    } catch (error) {
      console.error('Error in fromReservationDateTime:', error);
      throw error;
    }
  }

  // 시작 시간과 duration으로 종료 시간 계산
  static calculateEndTime(startDateTime: ReservationDateString, durationHours: number): ReservationDateString {
    try {
      const year = parseInt(startDateTime.substring(0, 4));
      const month = parseInt(startDateTime.substring(4, 6)) - 1;
      const day = parseInt(startDateTime.substring(6, 8));
      const hour = parseInt(startDateTime.substring(8, 10));
      const minute = parseInt(startDateTime.substring(10, 12));

      const startDate = new Date(year, month, day, hour, minute);
      const endDate = addHours(startDate, durationHours);
      
      return format(endDate, 'yyyyMMddHHmm');
    } catch (error) {
      console.error('Error in calculateEndTime:', error);
      throw error;
    }
  }

  // 현재 시간을 예약 시스템 형식으로 변환
  static getCurrentDateTime(): ReservationDateString {
    const now = toZonedTime(new Date(), TIMEZONE);
    return format(now, 'yyyyMMddHHmm');
  }

  // 날짜가 한국 시간으로 오늘인지 확인
  static isToday(date: Date): boolean {
    const today = toZonedTime(new Date(), TIMEZONE);
    const targetDate = toZonedTime(date, TIMEZONE);
    return format(today, 'yyyy-MM-dd') === format(targetDate, 'yyyy-MM-dd');
  }

  // 날짜를 한국 시간 형식의 문자열로 변환
  static formatToKoreanDate(date: Date): string {
    const zonedDate = toZonedTime(date, TIMEZONE);
    return format(zonedDate, 'yyyy년 MM월 dd일');
  }

  // 시간을 한국 시간 형식의 문자열로 변환
  static formatToKoreanTime(time: string): string {
    const [hours, minutes] = time.split(':');
    return `${parseInt(hours)}시${minutes === '00' ? '' : ` ${minutes}분`}`;
  }

  static formatDateTime(date: Date | string, time: string): string {
    try {
      const targetDate = typeof date === 'string' ? new Date(date) : date;
      const [hours, minutes] = time.split(':').map(Number);
      
      const formattedDate = format(targetDate, 'yyyyMMdd');
      const formattedTime = this.formatToTimeString(hours, minutes);
      
      return `${formattedDate}${formattedTime}`;
    } catch (error) {
      logger.error('날짜/시간 형식 변환 실패:', error);
      throw new Error('날짜/시간 형식 변환에 실패했습니다.');
    }
  }

  static isValidTimeFormat(timeStr: string): boolean {
    return /^\d{12}$/.test(timeStr);  // yyyyMMddHHmm 형식 검증
  }

  static addHours(time: string, hours: number): string {
    const [h, m] = time.split(':').map(Number);
    const newHour = (h + hours) % 24;
    return `${newHour.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  static formatToTimeString(hours: number, minutes: number): string {
    return `${hours.toString().padStart(2, '0')}${minutes.toString().padStart(2, '0')}`;
  }
}