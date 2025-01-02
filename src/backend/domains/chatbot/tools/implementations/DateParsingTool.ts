import { addDays, startOfDay, addWeeks, getDay, format } from 'date-fns';
import { toZonedTime, formatInTimeZone } from 'date-fns-tz';
import { logger } from '@/utils/logger';
import { DateUtils } from '@/backend/domains/chatbot/utils/dateUtils';

export class DateParsingTool {  
  static async parseDateString(input: string, currentDate: Date = new Date()): Promise<{ date: Date | null; confidence: number; reasoning: string }> {
    try {      
      // 주차 정보 계산
      const currentWeekStart = startOfDay(addDays(currentDate, -getDay(currentDate))); // 일요일
      const currentWeekEnd = addDays(currentWeekStart, 6); // 토요일
      const nextWeekStart = addDays(currentWeekStart, 7);
      const nextWeekEnd = addDays(nextWeekStart, 6);
      const nextNextWeekStart = addDays(nextWeekStart, 7);
      const nextNextWeekEnd = addDays(nextNextWeekStart, 6);

      const response = await fetch('/api/llm/parse-date', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input,
          currentDate: currentDate.toISOString(),
          systemPrompt: `
            당신은 한국어 날짜 표현을 파싱하는 전문가입니다.
            현재 날짜는 ${format(currentDate, 'yyyy년 MM월 dd일')} (${format(currentDate, 'EEEE')})입니다.
            
            현재 주차 정보:
            - 이번주: ${format(currentWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(currentWeekEnd, 'yyyy년 MM월 dd일')}(토)
            - 다음주: ${format(nextWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(nextWeekEnd, 'yyyy년 MM월 dd일')}(토)
            - 다다음주: ${format(nextNextWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(nextNextWeekEnd, 'yyyy년 MM월 dd일')}(토)
            
            # 날짜 파싱 규칙
            1. "다음주"는 ${format(nextWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(nextWeekEnd, 'yyyy년 MM월 dd일')}(토) 기간입니다
            2. "이번주"는 ${format(currentWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(currentWeekEnd, 'yyyy년 MM월 dd일')}(토) 기간입니다
            3. "다다음주"는 ${format(nextNextWeekStart, 'yyyy년 MM월 dd일')}(일) ~ ${format(nextNextWeekEnd, 'yyyy년 MM월 dd일')}(토) 기간입니다
            4. 주차 정보를 기반으로 정확한 날짜를 계산하세요.
               예: "다음주 수요일"이면 다음주 기간 내의 수요일 날짜를 찾습니다.
            5. 연도가 바뀌는 경우도 정확히 처리하세요.
               예: 이번주는 2024년인데 다음주 수요일을 원하는데 다음주 수요일이 2025년에 있으면 2025년으로 조정하세요.
            
            # 응답 규칙
            1. 입력된 텍스트에 날짜 관련 정보가 없다면:
               - date: ""
               - confidence: 0
               - reasoning: "날짜 관련 정보 없음"
            2. 날짜가 모호하거나 불확실한 경우:
               - confidence를 0.5 이하로 설정
            3. 날짜가 명확한 경우:
               - confidence를 0.8 이상으로 설정
              
            # 응답 예시
            1. 사용자 입력: "다음주 목요일 예약 돼?"
            Data: {
              "date": "2025-01-09",
              "confidence": 0.9,
              "reasoning": "입력된 텍스트에서 '다음주 목욜일'이라는 표현이 있습니다. '다음주'는 2025년 1월 5일(일)부터 2025년 1월 11일(토)까지의 기간을 의미하며, 이 기간 내의 목요일은 2025년 01월 09일입니다. 따라서 날짜는 2025년 01월 09일로 설정하였습니다."
            }

            2. 사용자 입력: "오늘 가장 빠른 시간으로 예약해줘"
            Data: {
              "date": "2025-01-02",
              "confidence": 0.9,
              "reasoning": "입력된 텍스트에서 '오늘'이라는 표현이 있습니다. 오늘은 2025년 1월 2일이기 때문에 날짜는 2025년 1월 2일로 설정하였습니다."
            }

            3. 사용자 입력: "다다음주 월요일 예약 돼?"
            Data: {
              "date": "2025-01-12",
              "confidence": 0.9,
              "reasoning": "입력된 텍스트에서 '다다음주 월요일'이라는 표현이 있습니다. '다다음주'는 2025년 1월 12일(일)부터 2025년 1월 18일(토)까지의 기간을 의미하며, 이 기간 내의 월요일은 2025년 01월 13일입니다. 따라서 날짜는 2025년 01월 13일로 설정하였습니다."
            }

            # 응답 형식:
            {
              "date": "YYYY-MM-DD",  // 날짜 정보가 없으면 빈 문자열
              "confidence": number,   // 0.0 ~ 1.0
              "reasoning": string     // 날짜 선택 과정과 판단 근거 설명
            }
          `
        })
      });

      if (!response.ok) {
        logger.error('LLM API 호출 실패:', {
          status: response.status,
          statusText: response.statusText
        });
        return { date: null, confidence: 0, reasoning: "API 호출 실패" };
      }

      const responseData = await response.json();
      logger.log('API 응답 데이터:', responseData);

      // 날짜 정보가 없는 경우
      if (!responseData.date) {
        return { date: null, confidence: 0, reasoning: responseData.reasoning };
      }

      // 날짜 정보가 있는 경우 검증 진행
      const parsedDate = new Date(responseData.date);
      
      if (!this.validateBusinessDay(parsedDate) || 
          !this.isWithinReservationPeriod(parsedDate, currentDate)) {
        return {
          date: null,
          confidence: 0,
          reasoning: "유효하지 않은 날짜입니다."
        };
      }

      return {
        date: parsedDate,
        confidence: responseData.confidence,
        reasoning: responseData.reasoning
      };

    } catch (error) {
      logger.error('날짜 파싱 실패:', error);
      return { date: null, confidence: 0, reasoning: "파싱 중 오류 발생" };
    }
  }

  static validateBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6;
  }

  static isWithinReservationPeriod(date: Date, currentDate: Date): boolean {
    const TIMEZONE = 'Asia/Seoul';
    const koreanDate = toZonedTime(date, TIMEZONE);
    const koreanCurrentDate = toZonedTime(currentDate, TIMEZONE);
    
    const today = startOfDay(koreanCurrentDate);
    const targetDate = startOfDay(koreanDate);
    
    // 과거 날짜인 경우 다음 해의 같은 날짜로 조정
    if (targetDate < today) {
        targetDate.setFullYear(targetDate.getFullYear() + 1);
    }
    
    const twoWeeksLater = addWeeks(today, 2);
    
    return targetDate >= today && targetDate <= twoWeeksLater;
  }
}