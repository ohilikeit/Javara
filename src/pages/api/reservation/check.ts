import { PrismaClient, Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

type TimeSlot = {
  roomId: number | null;
  startTime: string;  // HH:mm 형식
  endTime: string;    // HH:mm 형식
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { startTime, roomId } = req.body;
    
    logger.log('예약 확인 요청:', { startTime, roomId });
    
    // startTime 형식 검증 (YYYYMMDDHHMM)
    if (!startTime || !/^\d{12}$/.test(startTime)) {
      return res.status(400).json({
        success: false,
        error: '올바른 시간 형식이 아닙니다. YYYYMMDDHHMM 형식이어야 합니다.'
      });
    }

    const datePrefix = startTime.substring(0, 8); // YYYYMMDD
    logger.log('datePrefix:', datePrefix);
    
    // 해당 날짜의 모든 예약 조회
    const reservations = await prisma.$queryRaw`
      SELECT roomId, startTime, endTime
      FROM Reservation
      WHERE substr(startTime, 1, 8) = ${datePrefix}
        AND status = 1
        ${roomId ? Prisma.sql`AND roomId = ${Number(roomId)}` : Prisma.sql``}
    `;

    logger.log('조회된 예약:', reservations);

    // 가용 시간대 계산 (9시 ~ 18시)
    const availableSlots: TimeSlot[] = [];
    for (let hour = 9; hour < 18; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}00`;
      const currentTimeSlot = `${datePrefix}${timeStr}`;
      
      // 현재 시간대가 예약된 시간과 겹치는지 확인
      const isTimeSlotAvailable = !(reservations as any[]).some(reservation => {
        return currentTimeSlot >= reservation.startTime && currentTimeSlot < reservation.endTime;
      });

      if (isTimeSlotAvailable) {
        availableSlots.push({
          roomId: roomId ? Number(roomId) : null,
          startTime: `${hour.toString().padStart(2, '0')}:00`,
          endTime: `${(hour + 1).toString().padStart(2, '0')}:00`
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        available: availableSlots.length > 0,
        availableSlots
      }
    });

  } catch (error) {
    logger.error('가용성 확인 중 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '가용성 확인 중 오류가 발생했습니다.'
    });
  } finally {
    await prisma.$disconnect();
  }
}