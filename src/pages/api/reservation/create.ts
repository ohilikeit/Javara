import { PrismaClient, Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { startTime, endTime, roomId, userName, content, userId = 1, status = 1 } = req.body;

    // 시간 형식 검증 (YYYYMMDDHHMM)
    if (!startTime || !endTime || !/^\d{12}$/.test(startTime) || !/^\d{12}$/.test(endTime)) {
      return res.status(400).json({
        success: false,
        error: '잘못된 시간 형식입니다. YYYYMMDDHHMM 형식이어야 합니다.'
      });
    }

    // 시간 순서 검증
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        error: '종료 시간은 시작 시간보다 늦어야 합니다.'
      });
    }

    // 중복 예약 검사
    const existingReservation = await prisma.$queryRaw`
      SELECT id FROM Reservation
      WHERE roomId = ${Number(roomId)}
        AND status = 1
        AND (
          (startTime <= ${startTime} AND endTime > ${startTime})
          OR (startTime < ${endTime} AND endTime >= ${endTime})
        )
    `;

    if ((existingReservation as any[]).length > 0) {
      return res.status(409).json({
        success: false,
        error: '해당 시간에 이미 예약이 존재합니다.'
      });
    }

    // 예약 생성
    const result = await prisma.$executeRaw`
      INSERT INTO Reservation (startTime, endTime, roomId, userName, content, userId, status, createdAt, updatedAt)
      VALUES (
        ${startTime},
        ${endTime},
        ${Number(roomId)},
        ${userName},
        ${content},
        ${Number(userId)},
        ${Number(status)},
        datetime('now'),
        datetime('now')
      )
    `;

    return res.status(200).json({
      success: true,
      data: { id: result }
    });

  } catch (error) {
    logger.error('예약 생성 중 에러:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '예약 생성 중 오류가 발생했습니다.'
    });
  } finally {
    await prisma.$disconnect();
  }
} 