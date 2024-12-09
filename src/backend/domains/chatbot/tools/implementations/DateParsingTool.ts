import { addDays, startOfDay, format, parse } from 'date-fns';
import { ko } from 'date-fns/locale';
import { logger } from '@/utils/logger';

export class DateParsingTool {
  private static DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
  private static DAY_KEYWORDS = {
    '오늘': 0,
    '내일': 1,
    '모레': 2,
    '글피': 3,
    '이번주': 'this_week',
    '다음주': 'next_week',
    '다다음주': 'after_next_week'
  };

  private static RELATIVE_DAY_PATTERNS = [
    /(?:이번|다음|다다음)주\s*(?:월|화|수|목|금)요일/,
    /(?:월|화|수|목|금)요일/,
    /오늘|내일|모레|글피/,
    /(\d{1,2})월\s*(\d{1,2})일/,
    /(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/,
    /(\d{2,4})-(\d{1,2})-(\d{1,2})/
  ];

  static async parseDateString(input: string, systemPrompt?: string): Promise<Date | null> {
    try {
      logger.log('날짜 파싱 시작:', { input, systemPrompt });

      // LLM을 통한 날짜 정보 추출
      const dateInfo = await this.extractDateWithLLM(input, systemPrompt);
      if (dateInfo) {
        logger.log('LLM이 추출한 날짜 정보:', dateInfo);
        return dateInfo;
      }

      // 패턴 매칭을 통한 날짜 파싱
      for (const pattern of this.RELATIVE_DAY_PATTERNS) {
        const match = input.match(pattern);
        if (match) {
          const parsedDate = this.parsePatternMatch(match, pattern);
          if (parsedDate) {
            logger.log('패턴 매칭으로 파싱된 날짜:', parsedDate);
            return parsedDate;
          }
        }
      }

      // 상대적 날짜 키워드 처리
      for (const [keyword, value] of Object.entries(this.DAY_KEYWORDS)) {
        if (input.includes(keyword)) {
          const date = this.handleRelativeDate(value);
          if (date) {
            logger.log('상대적 날짜 키워드로 파싱된 날짜:', date);
            return date;
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('날짜 파싱 에러:', error);
      return null;
    }
  }

  private static async extractDateWithLLM(input: string, systemPrompt?: string): Promise<Date | null> {
    try {
        // 로컬 파싱 먼저 시도
        const localDate = this.parseLocalDate(input);
        if (localDate) return localDate;
        
        // API 호출은 백업으로 사용
        const response = await fetch('/api/llm/parse-date', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input, systemPrompt })
        });

        if (!response.ok) {
            logger.error('LLM API 호출 실패:', await response.text());
            return null;
        }

        const result = await response.json();
        return result.success && result.date ? new Date(result.date) : null;
    } catch (error) {
        logger.error('날짜 추출 실패:', error);
        return null;
    }
  }

  // 로컬 날짜 파싱 로직 추가
  private static async parseLocalDate(input: string): Promise<Date | null> {
    const today = new Date();
    
    if (input.includes('이번주')) {
        const dayMatch = input.match(/(월|화|수|목|금)요일/);
        if (dayMatch) {
            const dayMap: { [key: string]: number } = {
                '월': 1, '화': 2, '수': 3, '목': 4, '금': 5
            };
            return this.getThisWeekday(dayMap[dayMatch[1]]);
        }
    }
    
    return null;
  }

  private static parsePatternMatch(match: RegExpMatchArray, pattern: RegExp): Date | null {
    const today = startOfDay(new Date());
    
    if (pattern.source.includes('년')) {
      const [_, year, month, day] = match;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }
    
    if (pattern.source.includes('월')) {
      const [_, month, day] = match;
      const year = today.getFullYear();
      return new Date(year, parseInt(month) - 1, parseInt(day));
    }
    
    if (pattern.source.includes('요일')) {
      const dayText = match[0].match(/(월|화|수|목|금)요일/)?.[1];
      if (dayText) {
        const targetDay = this.DAYS_KR.indexOf(dayText);
        if (match[0].includes('다음주')) {
          return this.getNextWeekday(targetDay);
        } else if (match[0].includes('다다음주')) {
          return this.getAfterNextWeekday(targetDay);
        } else {
          return this.getThisWeekday(targetDay);
        }
      }
    }

    return null;
  }

  private static handleRelativeDate(baseType: string | number, dayOffset: number = 0): Date | null {
    const today = startOfDay(new Date());

    if (typeof baseType === 'number') {
      return addDays(today, baseType);
    }

    switch (baseType) {
      case 'this_week':
        return this.getThisWeekday(dayOffset);
      case 'next_week':
        return this.getNextWeekday(dayOffset);
      case 'after_next_week':
        return this.getAfterNextWeekday(dayOffset);
      default:
        return null;
    }
  }

  private static getThisWeekday(targetDay: number): Date {
    const today = startOfDay(new Date());
    const currentDay = today.getDay();
    const distance = targetDay - currentDay;
    return addDays(today, distance >= 0 ? distance : distance + 7);
  }

  private static getNextWeekday(targetDay: number): Date {
    const thisWeekday = this.getThisWeekday(targetDay);
    return addDays(thisWeekday, 7);
  }

  private static getAfterNextWeekday(targetDay: number): Date {
    const nextWeekday = this.getNextWeekday(targetDay);
    return addDays(nextWeekday, 7);
  }

  static formatToSQLite(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  static validateBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  static isWithinReservationPeriod(date: Date): boolean {
    const today = startOfDay(new Date());
    const twoWeeksLater = addDays(today, 14);
    return date >= today && date <= twoWeeksLater;
  }
} 