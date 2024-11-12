import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

interface SearchRequest {
  selectedDate: string;     // "YYYY-MM-DD" 형식
  selectedTime: string;     // "HH:00" 형식
}

// 타입 추가
interface ReservedRoom {
  roomId: number;
}

// Room 타입 정의 추가
interface Room {
  roomId: number;
  roomName: string;
  capacity: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { selectedDate, selectedTime } = req.body as SearchRequest;

    // 입력값 유효성 검사
    if (!selectedDate || !selectedTime) {
      return res.status(400).json({
        success: false,
        error: '필수 입력값이 누락되었습니다.'
      });
    }

    // 날짜와 시간 파싱
    const parsedDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    
    // 시작 시간 설정
    const startDateTime = new Date(parsedDate);
    startDateTime.setHours(hours, minutes || 0, 0, 0);
    
    // 종료 시간 계산 (1시간 단위로 계산)
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 1);

    // 해당 시간에 예약된 방 조회
    const reservedRooms = await prisma.reservation.findMany({
      where: {
        AND: [
          { status: 1 },
          {
            OR: [
              {
                AND: [
                  { startTime: { lte: startDateTime } },
                  { endTime: { gt: startDateTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: endDateTime } },
                  { endTime: { gte: endDateTime } }
                ]
              }
            ]
          }
        ]
      },
      select: {
        roomId: true
      }
    });

    // 예약된 방 ID 목록
    const reservedRoomIds = reservedRooms.map((r: ReservedRoom) => r.roomId);

    // 모든 방 조회
    const allRooms = await prisma.room.findMany({
      where: {
        roomId: {
          notIn: reservedRoomIds
        }
      },
      orderBy: {
        roomId: 'asc'
      }
    }) as Room[];

    // 사용 가능한 방 목록 반환 형식 정
    return res.status(200).json({
      success: true,
      data: allRooms.map((room: Room) => ({
        roomId: room.roomId,
        roomName: room.roomName,
        capacity: room.capacity
      }))
    });

  } catch (error) {
    logger.error('방 검색 중 에러:', error);
    
    return res.status(500).json({
      success: false,
      error: "방 검색 중 오류가 발생했습니다."
    });
  }
} 