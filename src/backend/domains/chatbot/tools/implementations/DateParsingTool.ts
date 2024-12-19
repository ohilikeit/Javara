import { addDays, startOfDay } from 'date-fns';
import { logger } from '@/utils/logger';
import { DateUtils } from '@/backend/domains/chatbot/utils/dateUtils';

export class DateParsingTool {  
  static async parseDateString(input: string, currentDate?: Date): Promise<Date | null> {
    try {
      // LLM API 호출
      const llmResult = await this.tryLLMParsing(input, currentDate);
      if (llmResult) {
        return llmResult;
      }

      return null;
    } catch (error) {
      logger.error('날짜 파싱 에러:', error);
      return null;
    }
  }

  private static async tryLLMParsing(input: string, currentDate?: Date): Promise<Date | null> {
    try {
      const response = await fetch('/api/llm/parse-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          currentDate: currentDate?.toISOString(),
          systemPrompt: `
            당신은 한국어 날짜 표현을 파싱하는 전문가입니다.
            다음 규칙을 따라 날짜를 파싱해주세요:
            1. 주말(토,일)은 불가능합니다
            2. 오늘부터 2주 이내의 날짜만 가능합니다
            3. 입력된 문맥을 고려하여 가장 적절한 날짜를 선택하세요
            4. YYYY-MM-DD 형식으로 반환하세요
            5. 날짜를 추출할 수 없는 일반적인 내용일 경우 추출하지 말고 공백을 반환하세요
          `
        })
      });

      if (!response.ok) {
        logger.error('LLM API 호출 실패');
        return null;
      }

      const result = await response.json();
      if (result.success && result.date) {
        const parsedDate = new Date(result.date);
        
        // 유효성 검증
        if (!this.validateBusinessDay(parsedDate)) {
          logger.warn('LLM이 주말 날짜를 반환함');
          return null;
        }
        if (!this.isWithinReservationPeriod(parsedDate)) {
          logger.warn('LLM이 예약 가능 기간을 벗어난 날짜를 반환함');
          return null;
        }

        return parsedDate;
      }

      return null;
    } catch (error) {
      logger.error('LLM 날짜 파싱 실패:', error);
      return null;
    }
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