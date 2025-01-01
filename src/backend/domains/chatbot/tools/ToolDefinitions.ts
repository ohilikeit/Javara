import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { IReservationTool } from "./interfaces/IReservationTool";
import { SQLiteReservationTool } from "./implementations/SQLiteReservationTool";
import { logger } from "@/utils/logger";
import { ReservationInfo } from "../types/ReservationTypes";

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
        description: `현재 시점 또는 특정 날짜에서 가장 빠른 예약 가능한 시간과 토론방을 찾고, 예약 정보를 자동으로 채웁니다.`,
        schema: z.object({
          date: z.string().optional().describe("검색할 날짜 (YYYY-MM-DD 형식)"),
          timeRange: z.enum(["morning", "afternoon", "all"]).optional()
            .describe("검색할 시간대 (morning: 09:00-12:00, afternoon: 13:00-18:00, all: 전체)"),
          preferredRoom: z.number().optional()
            .describe("선호하는 토론방 번호 (1,4,5 중 선택)"),
          userName: z.string().optional().describe("예약자 이름"),
          duration: z.number().optional().default(1).describe("예약 시간 (시간 단위)")
        }),
        func: async ({ date, timeRange = "all", preferredRoom, userName, duration = 1 }) => {
          try {
            // 날짜 처리 (이미 파싱된 날짜 사용)
            const targetDate = date ? new Date(date) : new Date();

            logger.log('자동 예약 검색 시작:', {
              targetDate: targetDate.toISOString(),
              timeRange,
              preferredRoom,
              userName,
              duration
            });

            // 가장 빠른 예약 가능 시간 검색
            const result = await this.reservationTool.findNextAvailable({
              timeRange,
              preferredRoom,
              startFrom: targetDate
            });

            if (!result.availableSlots.length) {
              return JSON.stringify({
                success: false,
                message: "현재 및 다음 영업일에 예약 가능한 시간이 없습니다."
              });
            }

            // 가장 빠른 시간대 선택
            const firstSlot = result.availableSlots[0];
            
            // 선호하는 방이 없는 경우 랜덤으로 방 선택
            const availableRooms = [...new Set(result.availableSlots
              .filter(slot => slot.startTime === firstSlot.startTime)
              .map(slot => slot.roomId))];
            
            const roomId = preferredRoom || availableRooms[Math.floor(Math.random() * availableRooms.length)];

            // 선택된 시간의 실제 가용성 재확인
            const availability = await this.reservationTool.checkAvailability(
              new Date(firstSlot.date),
              firstSlot.startTime,
              roomId
            );

            if (!availability.available) {
              // 해당 시간이 이미 예약된 경우, 다음으로 가능한 시간 검색
              const nextSlots = result.availableSlots.slice(1);
              if (nextSlots.length > 0) {
                const nextSlot = nextSlots[0];
                const nextAvailableRooms = [...new Set(nextSlots
                  .filter(slot => slot.startTime === nextSlot.startTime)
                  .map(slot => slot.roomId))];
                
                const nextRoomId = preferredRoom || nextAvailableRooms[Math.floor(Math.random() * nextAvailableRooms.length)];

                return JSON.stringify({
                  success: true,
                  data: {
                    date: nextSlot.date,
                    timeRange,
                    availableSlots: nextSlots,
                    messageComponents: {
                      type: 'auto_reservation_suggestion',
                      sections: [
                        {
                          type: 'header',
                          content: `첫 번째 시간이 이미 예약되어 다음으로 가능한 시간을 찾았습니다. 예약하시겠습니까?`,
                          style: { color: '#2B6CB0', isBold: true }
                        },
                        {
                          type: 'details',
                          items: [
                            `날짜: ${nextSlot.date}`,
                            `시간: ${nextSlot.startTime}`,
                            `토론방: ${nextRoomId}번`,
                            `예약자: ${userName || "윤지환"}`,
                            `사용시간: 1시간`,
                            `회의내용: 자동예약`
                          ]
                        }
                      ]
                    },
                    reservationInfo: {
                      date: new Date(nextSlot.date),
                      dateStr: nextSlot.date,
                      startTime: nextSlot.startTime,
                      duration: 1,
                      roomId: nextRoomId,
                      userName: userName || "윤지환",
                      content: "자동예약"
                    },
                    isNextDay: nextSlot.date !== targetDate.toISOString().split('T')[0]
                  }
                });
              } else {
                // 더 이상 가능한 시간이 없는 경우
                return JSON.stringify({
                  success: false,
                  message: "현재 및 다음 영업일에 예약 가능한 시간이 없습니다."
                });
              }
            }

            // ReservationInfo 생성
            const reservationInfo: ReservationInfo = {
              date: new Date(firstSlot.date),
              dateStr: firstSlot.date,
              startTime: firstSlot.startTime,
              duration, // 사용자가 지정한 시간 사용
              roomId,
              userName: userName || "윤지환",
              content: "자동예약"
            };

            // 응답 메시지 생성
            const messageComponents = {
              type: 'auto_reservation_suggestion',
              sections: [
                {
                  type: 'header',
                  content: `가장 빠른 예약 가능 시간을 찾았습니다. 다음과 같이 예약하시겠습니까?`,
                  style: { color: '#2B6CB0', isBold: true }
                },
                {
                  type: 'details',
                  items: [
                    `날짜: ${reservationInfo.dateStr}`,
                    `시간: ${reservationInfo.startTime}`,
                    `토론방: ${reservationInfo.roomId}번`,
                    `예약자: ${reservationInfo.userName}`,
                    `사용시간: ${reservationInfo.duration}시간`,
                    `회의내용: ${reservationInfo.content}`
                  ]
                }
              ]
            };

            return JSON.stringify({
              success: true,
              data: {
                date: firstSlot.date,
                timeRange,
                availableSlots: result.availableSlots,
                messageComponents,
                reservationInfo,
                isNextDay: firstSlot.date !== targetDate.toISOString().split('T')[0]
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
} 