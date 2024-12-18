import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { startTime, endTime, roomId, userId, userName, content, status } = req.body;

    // 중복 예약 확인 - String 타입으로 비교
    const existingReservation = await prisma.reservation.findFirst({
      where: {
        AND: [
          { roomId: Number(roomId) },
          { status: 1 },
          {
            OR: [
              {
                AND: [
                  { startTime: { lte: startTime } },
                  { endTime: { gt: startTime } }
                ]
              },
              {
                AND: [
                  { startTime: { lt: endTime } },
                  { endTime: { gte: endTime } }
                ]
              }
            ]
          }
        ]
      }
    });

    if (existingReservation) {
      return res.status(409).json({
        success: false,
        error: '이미 예약된 시간입니다.'
      });
    }

    // 예약 생성 - String 타입으로 저장
    const reservation = await prisma.reservation.create({
      data: {
        startTime,  // 이미 YYYYMMDDHHMM 형식의 문자열
        endTime,    // 이미 YYYYMMDDHHMM 형식의 문자열
        userName,
        content: content || "토론방 예약",
        status: 1,
        userId: 1,
        roomId: Number(roomId)
      }
    });

    return res.status(200).json({
      success: true,
      data: reservation
    });

  } catch (error) {
    logger.error('예약 생성 중 에러:', error);
    return res.status(500).json({
      success: false,
      error: '예약 생성 중 오류가 발생했습니다.'
    });
  }
} 