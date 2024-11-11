import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import { IReservationTool } from "./interfaces/IReservationTool";
import { SQLiteReservationTool } from "./implementations/SQLiteReservationTool";
import { logger } from "@/utils/logger";
import { ReservationValidator } from "./validators/ReservationValidator";
import { ChatOpenAI } from "@langchain/openai";

interface ReservationInfo {
  date?: string;
  startTime?: string;
  duration?: number;
  roomId?: number;
  userName?: string;
  content?: string;
  timeRange?: string;
}

export class ReservationTools {
  private reservationTool: IReservationTool;
  private activeReservations: Map<string, boolean> = new Map();
  private model: ChatOpenAI;

  constructor(model: ChatOpenAI) {
    this.reservationTool = new SQLiteReservationTool();
    this.model = model;
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
            // 날짜가 지정되지 않은 경우 먼저 날짜를 물어보도록 함
            if (!date) {
              return JSON.stringify({
                success: true,
                needDate: true,
                message: "예약하실 날짜를 먼저 말씀해 주시겠어요? (예: 이번주 금요일, 다음주 월요일 등)"
              });
            }

            let targetDate: Date;
            
            // 날짜 문자열 처리
            if (typeof date === 'string') {
              try {
                // parse_date 도구 직접 호출
                const parseResult = await this.getTools()
                  .find(t => t.name === "parse_date")
                  ?.invoke({ dateString: date } as any);

                if (!parseResult) {
                  return JSON.stringify({
                    success: false,
                    error: "날짜 파싱에 실패했습니다.",
                    needDate: true,
                    message: "예약하실 날짜를 다시 말씀해 주시겠어요? (예: 이번주 금요일, 다음주 월요일 등)"
                  });
                }

                const parsedDate = JSON.parse(parseResult);
                if (!parsedDate.success) {
                  return JSON.stringify({
                    success: false,
                    error: parsedDate.error,
                    needDate: true,
                    message: `${parsedDate.error} 다른 날짜를 선택해 주세요.`
                  });
                }

                targetDate = new Date(parsedDate.date);
                logger.log('LLM이 파싱한 날짜:', {
                  input: date,
                  parsed: parsedDate,
                  targetDate: targetDate.toISOString()
                });
              } catch (error) {
                logger.error('날짜 파싱 에러:', error);
                return JSON.stringify({
                  success: false,
                  error: "날짜 파싱 중 오류가 발생했습니다.",
                  needDate: true
                });
              }
            } else {
              return JSON.stringify({
                success: true,
                needDate: true,
                message: "예약하실 날짜를 먼저 말씀해 주시겠어요? (예: 이번주 금요일, 다음주 월요일 등)"
              });
            }

            // 날짜가 과거인 경우 다음 영업일로 설정
            const today = new Date();
            if (targetDate < today) {
              targetDate = this.getNextBusinessDay(today);
            }

            logger.log('검색 날 계산:', {
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
          date: z.string().describe("검색할 날짜 (YYYY-MM-DD 형식)"),
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
          startTime: z.string().describe("시작 시간 (HH:00 형식)"),
          duration: z.number().describe("사용 시간 (시간 단위)"),
          roomId: z.number().describe("토론방 번호 (1,4,5,6 중 선택)"),
          userName: z.string().describe("예약자 이름"),
          content: z.string().describe("회의 내용")
        }),
        func: async ({ date, startTime, duration, roomId, userName, content }) => {
          const reservationKey = `${date}_${startTime}_${roomId}`;
          
          try {
            // 1. 먼저 최종 가용성 체크
            const availability = await this.reservationTool.checkAvailability(
              new Date(date),
              startTime,
              roomId
            );

            if (!availability.available) {
              return JSON.stringify({
                success: false,
                error: "선택하신 시간은 이미 예약되었습니다.",
                needInfo: false
              });
            }

            // 2. 필수 정보 체크
            if (!userName || userName === "unknown") {
              return JSON.stringify({
                success: false,
                error: "예약자 이름이 필요합니다.",
                needInfo: true,
                requiredInfo: "userName"
              });
            }

            if (!content || content === "회의 목적 미정") {
              return JSON.stringify({
                success: false,
                error: "회의 목적이 필요합니다.",
                needInfo: true,
                requiredInfo: "content"
              });
            }

            // 3. 예약 생성 시도
            const result = await this.reservationTool.createReservation({
              date: new Date(date),
              startTime,
              duration,
              roomId,
              userName,
              content
            });

            return JSON.stringify({
              success: true,
              message: `예약이 완료되었습니다. (${roomId}번 토론방)`,
              reservationCompleted: true,
              reservationDetails: {
                date,
                startTime,
                duration,
                roomId,
                userName,
                content
              }
            });

          } catch (error) {
            logger.error('create_reservation 에러:', error);
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "예약 생성 중 오류가 발생했습니다.",
              needInfo: false
            });
          }
        }
      }),
      new DynamicStructuredTool({
        name: "parse_date",
        description: "날짜 문자열을 파싱하여 실제 달력 기반의 날짜 정보를 반환합니다.",
        schema: z.object({
          dateString: z.string().describe("파싱할 날짜 문자열 (예: '다음주 화요일', '내일', 'YYYY-MM-DD')")
        }),
        func: async ({ dateString }) => {
          try {
            // LLM에게 날짜 파싱을 요청하는 프롬프트
            const prompt = `현재 날짜는 ${new Date().toLocaleDateString('ko-KR')} 입니다.
            다음 자연어 날짜 표현을 YYYY-MM-DD 형식의 구체적인 날짜로 변환해주세요:
            "${dateString}"
            
            JSON 형식으로만 응답해주세요:
            {
              "date": "YYYY-MM-DD",
              "dayOfWeek": "요일",
              "isWeekend": boolean,
              "isPast": boolean,
              "description": "날짜에 대한 설명"
            }
            
            규칙:
            1. "이번주"는 현재 날짜가 포함된 주의 해당 요일을 의미합니다.
            2. "다음주"는 다음 주 월요일부터 시작하는 주의 해당 요일을 의미합니다.
            3. 주말(토,일)인 경우 isWeekend를 true로 설정합니다.
            4. 과거 날짜인 경우 isPast를 true로 설정합니다.
            
            마크다운이나 다른 형식 없이 순수 JSON으로만 응답해주세요.`;

            const response = await this.model.invoke([
              { 
                role: 'system', 
                content: '당신은 날짜 변환 전문가입니다. JSON 형식으로만 응답하세요.' 
              },
              { role: 'user', content: prompt }
            ]);

            // 응답에서 JSON 부분만 추출
            const jsonStr = response.content.toString()
              .replace(/```json\n?|\n?```/g, '')  // 마크다운 코드 블록 제거
              .trim();  // 앞뒤 공백 제거

            const parsedResponse = JSON.parse(jsonStr);
            
            // 유효성 검사
            const targetDate = new Date(parsedResponse.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // 2주 이후 체크
            const twoWeeksLater = new Date(today);
            twoWeeksLater.setDate(today.getDate() + 14);

            if (targetDate > twoWeeksLater) {
              return JSON.stringify({
                success: false,
                error: '2주 이후의 날짜는 예약할 수 없습니다.',
                date: parsedResponse.date,
                description: parsedResponse.description
              });
            }

            // 과거 날짜 체크
            if (parsedResponse.isPast || targetDate < today) {
              return JSON.stringify({
                success: false,
                error: '과거 날짜는 예약할 수 없습니다.',
                date: parsedResponse.date,
                description: parsedResponse.description
              });
            }

            // 주말 체크
            if (parsedResponse.isWeekend) {
              return JSON.stringify({
                success: false,
                error: '주말은 예약할 수 없습니다.',
                date: parsedResponse.date,
                description: parsedResponse.description
              });
            }

            return JSON.stringify({
              success: true,
              date: parsedResponse.date,
              dayOfWeek: parsedResponse.dayOfWeek,
              description: parsedResponse.description,
              formattedDate: new Date(parsedResponse.date).toLocaleDateString('ko-KR')
            });

          } catch (error) {
            logger.error('날짜 파싱 에러:', error);
            return JSON.stringify({
              success: false,
              error: '날짜 파싱 중 오류가 발생했습니다.',
              originalInput: dateString
            });
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
                info.date = targetDate.toISOString().split('T')[0];
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
        name: "extract_conversation_date",
        description: "대화 내역과 현재 쿼리에서 예약 날짜 정보를 추출합니다.",
        schema: z.object({
          currentQuery: z.string().describe("현재 사용자의 쿼리"),
          messageHistory: z.array(z.object({
            role: z.enum(['system', 'user', 'assistant']),
            content: z.string()
          })).describe("이전 대화 내역"),
          currentDate: z.string().optional().describe("현재 저장된 날짜 정보")
        }),
        func: async ({ currentQuery, messageHistory, currentDate }) => {
          try {
            // 날짜 관련 키워드 추출
            const dateKeywords = messageHistory
              .filter(msg => msg.role !== 'system')
              .map(msg => msg.content)
              .concat(currentQuery);

            let targetDate: Date | null = null;
            
            // 현재 저장된 날짜가 있다면 우선 사용
            if (currentDate) {
              targetDate = new Date(currentDate);
            }

            // 새로운 날짜 정보가 있는지 확인
            for (const content of dateKeywords.reverse()) { // 최신 메시지부터 확인
              if (content.includes('다음주')) {
                const dayMatch = content.match(/(월|화|수|목|금)요일/);
                if (dayMatch) {
                  const dayMap: { [key: string]: number } = {
                    '월': 1, '화': 2, '수': 3, '목': 4, '금': 5
                  };
                  targetDate = this.getNextWeekday(dayMap[dayMatch[1]]);
                  break;
                }
              }
              // 다른 날짜 패턴들도 여기서 처리
            }

            if (!targetDate) {
              return JSON.stringify({
                success: false,
                error: "날짜 정보를 찾을 수 없습니다."
              });
            }

            return JSON.stringify({
              success: true,
              date: targetDate.toISOString(),
              formattedDate: targetDate.toLocaleDateString('ko-KR'),
              dayOfWeek: ['일', '월', '화', '수', '목', '금', '토'][targetDate.getDay()]
            });
          } catch (error) {
            logger.error('날짜 추출 실패:', error);
            return JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : "날짜 추출 중 오류가 발생했습니다."
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
    let distance = targetDay - currentDay;
    
    // 만약 찾는 요일이 이미 지났다면, 다음 주의 해당 요일로 설정
    if (distance < 0) {
        distance += 7;
    }
    
    const result = new Date(today);
    result.setDate(today.getDate() + distance);
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