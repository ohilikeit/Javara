import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { IReservationTool } from "./interfaces/IReservationTool";
import { SQLiteReservationTool } from "./implementations/SQLiteReservationTool";
import { logger } from "@/utils/logger";

export class ReservationTools {
  private reservationTool: IReservationTool;
  private activeReservations: Map<string, boolean> = new Map();
  private availabilityCache = new Map<string, {
    result: any;
    timestamp: number;
  }>();

  constructor() {
    this.reservationTool = new SQLiteReservationTool();
  }

  getTools() {
    return [
      new DynamicStructuredTool({
        name: "find_next_available",
        description: `현재 시점으로부터 가장 빠른 예약 가능한 시간과 토론방을 찾습니다.`,
        schema: z.object({
          date: z.string().optional().describe("검색할 날짜 (YYYY-MM-DD 형식)"),
          timeRange: z.enum(["morning", "afternoon", "all"]).optional()
            .describe("검색할 시간대 (morning: 09:00-12:00, afternoon: 13:00-18:00, all: 전체)"),
          preferredRoom: z.number().optional()
            .describe("선호하는 토론방 번호 (1,4,5,6 중 선택)")
        }),
        func: async ({ date, timeRange = "all", preferredRoom }) => {
          try {
            let targetDate: Date;
            
            // 날짜 문자열 처리
            if (typeof date === 'string') {
              if (date.includes("이번주") || date.includes("다음주")) {
                const weekType = date.includes("이번주") ? "this" : "next";
                const dayMatch = date.match(/(월|화|수|목|금)요일/);
                if (dayMatch) {
                  const dayMap: { [key: string]: number } = {
                    '월': 1, '화': 2, '수': 3, '목': 4, '금': 5
                  };
                  targetDate = weekType === "this" ? 
                    this.getThisWeekday(dayMap[dayMatch[1]]) : 
                    this.getNextWeekday(dayMap[dayMatch[1]]);
                } else {
                  targetDate = new Date();
                }
              } else {
                targetDate = new Date(date);
              }
            } else {
              targetDate = new Date();
            }

            // 날짜가 과거인 경우 다음 영업일로 설정
            const today = new Date();
            if (targetDate < today) {
              targetDate = this.getNextBusinessDay(today);
            }

            logger.log('검색 날짜 계산:', {
              input: date,
              calculated: targetDate.toISOString(),
              dayOfWeek: targetDate.getDay(),
              localDate: targetDate.toLocaleDateString()
            });

            const result = await this.reservationTool.findNextAvailable({
              timeRange,
              preferredRoom,
              startFrom: targetDate
            });

            // 응답 메시지 생성
            let messageComponents = {
              type: 'availability_response',
              sections: [] as {
                type: string;
                content: string;
                items?: string[];
                style?: {
                  color?: string;
                  isBold?: boolean;
                };
              }[]
            };

            const dayOfWeek = targetDate.getDay();
            
            if (dayOfWeek === 0 || dayOfWeek === 6) {
              messageComponents.sections.push({
                type: 'error',
                content: `${targetDate.toLocaleDateString()}은(는) 주말이라 예약이 불가능합니다.`,
                style: { color: '#E53E3E' }
              });
            } else {
              const timeRangeStr = timeRange === "morning" ? "오전" : 
                                  timeRange === "afternoon" ? "오후" : "전체";
              
              messageComponents.sections.push({
                type: 'header',
                content: `${targetDate.toLocaleDateString()} ${timeRangeStr}에 예약 가능한 시간이 있습니다.`,
                style: { color: '#2B6CB0', isBold: true }
              });

              if (result.availableSlots.length > 0) {
                const timeSlots = this.formatTimeSlots(result.availableSlots);
                messageComponents.sections.push({
                  type: 'list',
                  content: '가능한 시간은 다음과 같습니다:',
                  items: timeSlots
                });
              }
            }

            return JSON.stringify({
              success: true,
              data: {
                date: targetDate.toISOString(),
                timeRange,
                availableSlots: result.availableSlots,
                messageComponents
              }
            });

          } catch (error) {
            logger.error('find_next_available 에러:', error);
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
            });
          }
        }
      }),
      new DynamicStructuredTool({
        name: "check_availability",
        description: "특정 날짜와 시간의 토론방 예약 가능 여부를 확인합니다.",
        schema: z.object({
          date: z.string().describe("확인하려는 날짜 (YYYY-MM-DD 형식)"),
          startTime: z.string().describe("시작 시간 (HH:mm 형식)"),
          roomId: z.number().describe("토론방 번호 (1,4,5,6 중 하나)")
        }),
        func: async ({ date, startTime, roomId }) => {
          try {
            const parsedDate = new Date(date);
            const reservationTool = new SQLiteReservationTool();

            // 날짜 유효성 검사는 MessageParsingTool에서 이미 수행됨
            const cacheKey = `${date}_${startTime}_${roomId}`;
            const cached = this.availabilityCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < 5000) { // 5초 캐시
              return JSON.stringify(cached.result);
            }

            const result = await reservationTool.checkAvailability(
              parsedDate,
              startTime,
              roomId
            );

            this.availabilityCache.set(cacheKey, {
              result,
              timestamp: Date.now()
            });

            return JSON.stringify(result);
          } catch (error) {
            logger.error('check_availability 에러:', error);
            return JSON.stringify({
              available: false,
              error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다."
            });
          }
        }
      }),
      new DynamicStructuredTool({
        name: "create_reservation",
        description: "예약을 생성합니다.",
        schema: z.object({
          date: z.string().describe("예약 날짜 (YYYY-MM-DD 형식)"),
          startTime: z.string().describe("시작 시간 (HH:mm 형식)"),
          duration: z.number().describe("사용 시간 (시간 단위)"),
          roomId: z.number().describe("토론방 번호 (1,4,5,6 중 선택)"),
          userName: z.string().describe("예약자 이름"),
          content: z.string().describe("회의 내용")
        }),
        func: async ({ date, startTime, duration, roomId, userName, content }) => {
          try {
            logger.log('예약 생성 요청 파라미터:', {
              date,
              startTime,
              duration,
              roomId,
              userName,
              content
            });

            // 날짜 검증
            const reservationDate = new Date(date);
            if (isNaN(reservationDate.getTime())) {
              throw new Error('유효하지 않은 날짜 형식입니다.');
            }

            const result = await this.reservationTool.createReservation({
              date: reservationDate,
              startTime,
              duration,
              roomId,
              userName,
              content
            });

            return JSON.stringify({
              success: true,
              message: `예약이 완료되었습니다.`,
              reservationDetails: {
                date: reservationDate,
                startTime,
                duration,
                roomId,
                userName,
                content
              }
            });
          } catch (error) {
            logger.error('create_reservation 에러:', error);
            
            const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
            const errorType = error instanceof Error && error.message.includes('이미 예약된 시간')
              ? 'DUPLICATE_RESERVATION'
              : 'RESERVATION_CREATION_ERROR';

            return JSON.stringify({
              success: false,
              error: errorMessage,
              errorType
            });
          }
        }
      })
    ];
  }

  private getThisWeekday(targetDay: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    const distance = targetDay - currentDay;
    const result = new Date(today);
    result.setDate(today.getDate() + (distance >= 0 ? distance : distance + 7));
    return result;
  }

  private getNextWeekday(targetDay: number): Date {
    const today = new Date();
    const result = new Date(today);
    result.setDate(today.getDate() + (7 - today.getDay()) + targetDay);
    return result;
  }

  private getNextBusinessDay(date: Date): Date {
    const result = new Date(date);
    do {
      result.setDate(result.getDate() + 1);
    } while (result.getDay() === 0 || result.getDay() === 6);
    return result;
  }

  private formatTimeSlots(slots: Array<{ startTime: string; endTime: string }>): string[] {
    return slots.map(slot => `${slot.startTime}~${slot.endTime}`);
  }
} 