import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { IReservationTool } from "./interfaces/IReservationTool";
import { SQLiteReservationTool } from "./implementations/SQLiteReservationTool";
import { logger } from "@/utils/logger";
import { ReservationValidator } from "./validators/ReservationValidator";
import { ReservationInfo } from "../types/ReservationTypes";

export class ReservationTools {
  private reservationTool: IReservationTool;
  private activeReservations: Map<string, boolean> = new Map();

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
          date: z.string().describe("검색할 날짜 (YYYY-MM-DD 형)"),
          startTime: z.string().optional().describe("시작 시간 (HH:00 형식)"),
          roomId: z.number().optional().describe("토론방 번호 (1,4,5,6 중 선택)")
        }),
        func: async ({ date, startTime, roomId }) => {
          try {
            const result = await this.reservationTool.checkAvailability(
              new Date(date),
              startTime,
              roomId
            );
            return JSON.stringify(result);
          } catch (error) {
            logger.error('check_availability 에러:', error);
            return JSON.stringify({
              success: false,
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
          const reservationKey = `${date}_${startTime}_${roomId}`;
          
          try {
            const reservationDateTime = DateUtils.toReservationDateTime(date, startTime);
            const endDateTime = DateUtils.calculateEndTime(reservationDateTime, duration);

            // 중복 예약 방지를 위한 락 확인
            if (this.activeReservations.get(reservationKey)) {
              return JSON.stringify({
                success: false,
                error: "동일한 예약이 처리 중입니다.",
                errorType: 'DUPLICATE_REQUEST'
              });
            }
            
            this.activeReservations.set(reservationKey, true);

            // ���론방 번호가 없는 경우 가용한 방 찾기
            if (!roomId) {
              const availability = await this.reservationTool.checkAvailability(
                new Date(date),
                startTime
              );

              if (!availability.available) {
                return JSON.stringify({
                  success: false,
                  error: "선택한 시간에 예약 가능한 토론방이 없습니다.",
                  errorType: 'NO_AVAILABLE_ROOM'
                });
              }

              // 가용한 방 중 가장 작은 번호의 방 선택
              const availableRooms = availability.availableSlots
                .map(slot => slot.roomId)
                .filter((value, index, self) => self.indexOf(value) === index)
                .sort((a, b) => a - b);

              if (availableRooms.length === 0) {
                return JSON.stringify({
                  success: false,
                  error: "예약 가능한 토론방이 없습니다.",
                  errorType: 'NO_AVAILABLE_ROOM'
                });
              }

              roomId = availableRooms[0];
            }

            // 선택된 방에 대해 최종 가용성 체크
            const finalAvailability = await this.reservationTool.checkAvailability(
              new Date(date),
              startTime,
              roomId
            );

            if (!finalAvailability.available) {
              return JSON.stringify({
                success: false,
                error: `${roomId}번 토론방은 해당 시간에 이미 예약되어 있습니다.`,
                errorType: 'ROOM_NOT_AVAILABLE'
              });
            }

            // 예약 생성
            const result = await this.reservationTool.createReservation({
              date: new Date(date),
              startTime,
              duration,
              roomId,
              userName,
              content
            });

            // 성공 응답에 예약 완료 상태 플래그 추가
            return JSON.stringify({
              success: true,
              message: `예약이 완료되었습니다. (${roomId}번 토론방)`,
              reservationCompleted: true,  // 예약 완료 상태 표시
              reservationDetails: {
                date,
                startTime,
                duration,
                roomId,
                userName
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

          } finally {
            this.activeReservations.delete(reservationKey);
          }
        }
      }),
      new DynamicStructuredTool({
        name: "parse_reservation_info",
        description: "사용자 메시지에서 예약 관련 정보를 추출합니다.",
        schema: z.object({
          message: z.string().describe("사용자 메시지"),
          currentInfo: z.object({
            date: z.string().optional(),
            timeRange: z.string().optional()
          }).optional()
        }),
        func: async ({ message, currentInfo }) => {
          try {
            const info: Partial<ReservationInfo> = {};
            
            // 날짜 파싱
            if (message.includes('다음주')) {
              const dayMatch = message.match(/(월|화|수|목|금)요일/);
              if (dayMatch) {
                const dayMap: { [key: string]: number } = {
                  '월': 1, '화': 2, '수': 3, '목': 4, '금': 5
                };
                const targetDate = this.getNextWeekday(dayMap[dayMatch[1]]);
                info.date = targetDate;
              }
            }

            // 시간대 파싱
            if (message.includes('오전')) {
              info.timeRange = 'morning';
            } else if (message.includes('오후')) {
              info.timeRange = 'afternoon';
            }

            // 구체적인 시간 파싱
            const timeMatch = message.match(/(\d{1,2})시(?:부터|~|\s)?(\d{1,2})?시(?:까지)?/);
            if (timeMatch) {
              const startHour = parseInt(timeMatch[1]);
              info.startTime = `${startHour.toString().padStart(2, '0')}:00`;
              if (timeMatch[2]) {
                const endHour = parseInt(timeMatch[2]);
                info.duration = endHour - startHour;
              }
            }

            // 이름과 목적 파싱
            const nameMatch = message.match(/(?:나는|제?이름은)\s*([가-힣]+)(?:이고|입니다|이야|예요|이에요)/);
            if (nameMatch) {
              info.userName = nameMatch[1];
            }

            const purposeMatch = message.match(/(?:목적은|내용은)?\s*(.+?)(?:할|하려|하고|예약|어)?(?:거야|습니다|해요|해|$)/);
            if (purposeMatch) {
              info.content = purposeMatch[1].trim();
            }

            return JSON.stringify({
              success: true,
              reservationInfo: info
            });
          } catch (error) {
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : '파싱 실패'
            });
          }
        }
      }),
      new DynamicStructuredTool({
        name: "check_reservation_availability",
        description: "특정 시간의 예약 가능 여부를 확인합니다.",
        schema: z.object({
          date: z.string().describe("확인할 날짜 (YYYY-MM-DD 형)"),
          startTime: z.string().describe("시작 시간 (HH:00 형식)"),
          roomId: z.number().describe("토론방 번호")
        }),
        func: async ({ date, startTime, roomId }) => {
          try {
            const availability = await this.reservationTool.checkAvailability(
              new Date(date),
              startTime,
              roomId
            );

            return JSON.stringify({
              success: true,
              available: availability.available,
              message: availability.available 
                ? "예약 가능한 시간입니다."
                : "이미 예약된 시간입니다."
            });
          } catch (error) {
            logger.error('check_availability 에러:', error);
            return JSON.stringify({
              success: false,
              error: "가용성 확인 중 오류가 발생했습니다."
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