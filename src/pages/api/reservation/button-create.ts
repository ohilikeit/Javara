import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '@/utils/logger';
import { format } from 'date-fns';

const prisma = new PrismaClient();

interface ButtonReservationRequest {
  selectedDate: string;     // "YYYY-MM-DD" 형식
  selectedTime: string;     // "HH:00" 형식
  duration: number;         // 시간 단위
  roomId: number;          // 방 번호
  userName: string;         // 예약자 이름
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { selectedDate, selectedTime, duration, roomId, userName } = req.body as ButtonReservationRequest;

    // 입력값 유효성 검사
    if (!selectedDate || !selectedTime || !duration || !roomId || !userName) {
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
    
    // 종료 시간 계산
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + Number(duration));

    // 트랜잭션 실행
    const reservation = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 중복 예약 확인
      const existingReservation = await tx.reservation.findFirst({
        where: {
          AND: [
            { roomId: Number(roomId) },
            { status: 1 },
            {
              OR: [
                {
                  AND: [
                    { startTime: { lte: format(startDateTime, 'yyyyMMddHHmm') } },
                    { endTime: { gt: format(startDateTime, 'yyyyMMddHHmm') } }
                  ]
                },
                {
                  AND: [
                    { startTime: { lt: format(endDateTime, 'yyyyMMddHHmm') } },
                    { endTime: { gte: format(endDateTime, 'yyyyMMddHHmm') } }
                  ]
                }
              ]
            }
          ]
        }
      });

      if (existingReservation) {
        throw new Error('이미 예약된 시간입니다.');
      }

      // 예약 생성 (userId 하드코딩)
      return await tx.reservation.create({
        data: {
          startTime: format(startDateTime, 'yyyyMMddHHmm'),
          endTime: format(endDateTime, 'yyyyMMddHHmm'),
          content: "회의",
          status: 1,
          userName: userName,
          roomId: Number(roomId),
          userId: 1
        }
      });
    });

    return res.status(200).json({
      success: true,
      data: reservation
    });

  } catch (error) {
    logger.error('예약 생성 중 에러:', error);
    
    if (error instanceof Error) {
      const statusCode = error.message.includes('이미 예약된 시간') ? 409 : 500;
      return res.status(statusCode).json({
        success: false,
        error: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      error: "예약 생성 중 오류가 발생했습니다."
    });
  }
} 