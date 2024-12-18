// src/backend/domains/chatbot/utils/dateUtils.ts
import { format, parse, addHours } from 'date-fns';
import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { ParsedDateTime, ReservationDateString } from '../types/DateTypes';

const TIMEZONE = 'Asia/Seoul';

export class DateUtils {
  // ISO 형식(YYYY-MM-DD)과 시간(HH:mm)을 예약 시스템 형식(YYYYMMDDHHMM)으로 변환
  static toReservationDateTime(date: string | Date | number, time?: string): ReservationDateString {
    try {
      let datetime: Date;

      if (date instanceof Date) {
        datetime = date;
      } else if (typeof date === 'string') {
        if (date.length === 12 && /^\d{12}$/.test(date)) { // YYYYMMDDHHMM 형식
          const year = parseInt(date.substring(0, 4));
          const month = parseInt(date.substring(4, 6)) - 1;
          const day = parseInt(date.substring(6, 8));
          const hour = parseInt(date.substring(8, 10));
          const minute = parseInt(date.substring(10, 12));
          datetime = new Date(year, month, day, hour, minute);
        } else if (time && date.includes('-')) { // YYYY-MM-DD 형식 + HH:mm
          const [year, month, day] = date.split('-').map(Number);
          const [hour, minute] = time.split(':').map(Number);
          
          if (!year || !month || !day || isNaN(hour) || isNaN(minute)) {
            throw new Error('Invalid date or time format');
          }
          datetime = new Date(year, month - 1, day, hour, minute);
        } else {
          throw new Error('Invalid date string format');
        }
      } else if (typeof date === 'number' && date.toString().length === 12) {
        // 숫자형 YYYYMMDDHHMM 처리
        const dateStr = date.toString();
        const year = parseInt(dateStr.substring(0, 4));
        const month = parseInt(dateStr.substring(4, 6)) - 1;
        const day = parseInt(dateStr.substring(6, 8));
        const hour = parseInt(dateStr.substring(8, 10));
        const minute = parseInt(dateStr.substring(10, 12));
        datetime = new Date(year, month, day, hour, minute);
      } else {
        throw new Error('Invalid date format or type');
      }

      // 날짜가 유효한지 확인
      if (isNaN(datetime.getTime())) {
        throw new Error('Invalid datetime');
      }

      // YYYYMMDDHHMM 형식으로 변환
      return format(datetime, 'yyyyMMddHHmm');
    } catch (error) {
      console.error('Error in toReservationDateTime:', error);
      throw error;
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
}